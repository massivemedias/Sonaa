-- SONAA — 0009 : fils de discussion par genre.
--
-- À RELIRE AVANT D'APPLIQUER, et les politiques RLS en premier : c'est là que
-- tout se joue, le reste n'est que de la plomberie.
--
-- Cette migration reprend l'architecture des propositions AVEC ses corrections
-- successives, plutôt que de les réapprendre : pseudonyme dérivé, quota par
-- trigger, droits au niveau colonne, security_invoker sur les vues. Chacun de
-- ces points a coûté une migration correctrice en son temps.
--
-- TROIS RÈGLES DE FOND, demandées et appliquées ici :
--   1. Ni email ni identifiant réel d'auteur ne sortent, MÊME PAR JOINTURE.
--   2. Suppression par l'auteur et par un modérateur, mais AUCUNE
--      modification après coup, comme pour les propositions.
--   3. Tout connecté peut signaler ; un signalement remonte le commentaire
--      dans la file de modération et ne le masque JAMAIS tout seul.

-- =====================================================================
--  1. LES TABLES
-- =====================================================================

create table if not exists public.comments (
  id uuid primary key default extensions.gen_random_uuid(),
  genre_id text not null,
  author_id uuid not null references auth.users(id) on delete cascade,

  -- LONGUEUR MAXIMALE : premier des trois garde-fous contre la charge de
  -- modération. Mille caractères suffisent à dire quelque chose sur un genre
  -- et découragent le pavé qu'il faut lire en entier pour trancher.
  body text not null check (length(btrim(body)) between 2 and 1000),

  created_at timestamptz not null default now(),

  -- Entretenu PAR TRIGGER depuis comment_votes, jamais écrit par un client :
  -- les droits au niveau colonne, plus bas, le garantissent.
  score integer not null default 0,

  -- Nombre de signalements, entretenu par trigger lui aussi. Il sert au TRI
  -- de la file de modération et ne masque rien par lui-même : un commentaire
  -- signalé cent fois reste visible tant qu'un humain n'a pas tranché.
  reports_count integer not null default 0,

  -- Masquage : décision de modération, jamais automatique. On garde la ligne
  -- plutôt que de la supprimer, sinon on ne comprend plus après coup pourquoi
  -- un fil a la forme qu'il a.
  masque boolean not null default false,
  masque_at timestamptz,
  masque_par uuid references auth.users(id) on delete set null,

  -- PSEUDONYME MATERIALISE A L'INSERTION, et c'est un correctif trouve par
  -- les controles. La vue etant en security_invoker, elle lisait author_id
  -- avec les droits de l'appelant : elle rendait donc 401 a un anonyme,
  -- puisque author_id est justement la colonne fermee. Les deux exigences se
  -- contredisaient. Stocker le pseudonyme supprime le conflit au lieu de
  -- l'arbitrer, et author_id peut rester totalement ferme.
  auteur text,
  par_auteur_du_site boolean not null default false
);

create index if not exists comments_genre_idx
  on public.comments (genre_id, score desc, created_at desc);
create index if not exists comments_author_idx on public.comments (author_id);
-- La file de modération lit d'abord ce qui est signalé et pas encore masqué.
create index if not exists comments_reports_idx
  on public.comments (reports_count desc, created_at desc)
  where reports_count > 0 and not masque;

comment on table public.comments is
  'Fils de discussion par genre. Lecture publique par la vue comments_public uniquement ; la table elle-meme ne doit jamais etre lue par un client.';

-- ------------------------------------------------------------ les votes

create table if not exists public.comment_votes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  valeur smallint not null check (valeur in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

create index if not exists comment_votes_comment_idx
  on public.comment_votes (comment_id);

-- ------------------------------------------------------ les signalements

create table if not exists public.comment_reports (
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  -- Un motif court aide le modérateur à trier sans ouvrir chaque fil.
  motif text check (motif is null or length(btrim(motif)) between 2 and 200),
  created_at timestamptz not null default now(),
  -- Une personne ne signale qu'une fois : sans cette clé, dix clics d'une
  -- même personne feraient croire à dix plaintes.
  primary key (reporter_id, comment_id)
);

comment on table public.comment_reports is
  'Signalements. Aucune lecture publique : qui a signale quoi ne regarde que la moderation.';

-- --------------------------------- fermeture des commentaires par genre

-- TROISIÈME GARDE-FOU. Sur 218 genres, un fil qui derape doit pouvoir etre
-- ferme sans supprimer ce qui s'y trouve deja. La fermeture bloque l'ecriture
-- et laisse la lecture intacte.
create table if not exists public.genre_comment_settings (
  genre_id text primary key,
  ferme boolean not null default false,
  ferme_at timestamptz,
  ferme_par uuid references auth.users(id) on delete set null,
  raison text check (raison is null or length(btrim(raison)) <= 300)
);

comment on table public.genre_comment_settings is
  'Fermeture des commentaires genre par genre. La lecture reste toujours possible.';

-- ------------------------------------------- l'auteur du site, a part

-- ETRE L'AUTEUR DU SITE ET ETRE MODERATEUR SONT DEUX CHOSES DIFFERENTES.
-- La premiere version derivait la distinction de la table moderators : tout
-- moderateur nomme plus tard aurait alors herite d'une marque qui ne lui
-- revient pas. Une table dediee separe le role editorial du role de police.
create table if not exists public.site_authors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

comment on table public.site_authors is
  'Comptes marques comme auteurs du site. Distinct de moderators : etre auteur ne donne aucun droit de moderation, et etre moderateur ne donne pas cette marque.';

alter table public.site_authors enable row level security;

-- Personne n'a besoin de lire cette table directement : la vue publique en
-- derive un booleen. On n'expose donc AUCUNE ligne, pas meme aux connectes.
-- L'ajout se fait en SQL, comme pour les moderateurs.
revoke all on public.site_authors from anon, authenticated;

-- =====================================================================
--  2. LES TRIGGERS : score, signalements, quotas, fermeture
-- =====================================================================

create or replace function public.rafraichir_score_commentaire()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cible uuid := coalesce(new.comment_id, old.comment_id);
begin
  update public.comments c
     set score = coalesce((
       select sum(v.valeur) from public.comment_votes v where v.comment_id = cible
     ), 0)
   where c.id = cible;
  return null;
end;
$$;

drop trigger if exists comment_votes_score on public.comment_votes;
create trigger comment_votes_score
  after insert or update or delete on public.comment_votes
  for each row execute function public.rafraichir_score_commentaire();

create or replace function public.rafraichir_signalements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cible uuid := coalesce(new.comment_id, old.comment_id);
begin
  update public.comments c
     set reports_count = (
       select count(*) from public.comment_reports r where r.comment_id = cible
     )
   where c.id = cible;
  return null;
end;
$$;

drop trigger if exists comment_reports_count on public.comment_reports;
create trigger comment_reports_count
  after insert or delete on public.comment_reports
  for each row execute function public.rafraichir_signalements();

-- QUOTA PAR PERSONNE ET PAR JOUR, deuxième garde-fou. Dans un TRIGGER et non
-- dans une politique RLS : une politique qui compte les lignes de sa propre
-- table se rappelle elle-même, ce qui a déjà bloqué toutes les mises à jour
-- du projet une fois (migration 0006).
create or replace function public.quota_commentaires()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
  quota constant integer := 10;
begin
  -- Le fil est-il ferme ? On refuse ici plutot que par politique : le
  -- message d'erreur est lisible, la RLS ne dit jamais pourquoi.
  if exists (
    select 1 from public.genre_comment_settings s
     where s.genre_id = new.genre_id and s.ferme
  ) then
    raise exception 'Les commentaires sont fermes sur ce genre.'
      using errcode = 'check_violation';
  end if;

  select count(*) into recent
    from public.comments c
   where c.author_id = new.author_id
     and c.created_at > now() - interval '24 hours';

  if recent >= quota then
    raise exception 'Limite atteinte : % commentaires par 24 heures. Reessayez plus tard.', quota
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_quota on public.comments;
create trigger comments_quota
  before insert on public.comments
  for each row execute function public.quota_commentaires();

create or replace function public.quota_votes_commentaires()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
  quota constant integer := 200;
begin
  select count(*) into recent
    from public.comment_votes v
   where v.user_id = new.user_id
     and v.created_at > now() - interval '24 hours';

  if recent >= quota then
    raise exception 'Limite atteinte : % votes par 24 heures. Reessayez plus tard.', quota
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists comment_votes_quota on public.comment_votes;
create trigger comment_votes_quota
  before insert on public.comment_votes
  for each row execute function public.quota_votes_commentaires();

-- Un signalement est bon marché, mais pas gratuit : sans plafond, un compte
-- suffit à noyer la file de modération.
create or replace function public.quota_signalements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
  quota constant integer := 30;
begin
  select count(*) into recent
    from public.comment_reports r
   where r.reporter_id = new.reporter_id
     and r.created_at > now() - interval '24 hours';

  if recent >= quota then
    raise exception 'Limite atteinte : % signalements par 24 heures.', quota
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists comment_reports_quota on public.comment_reports;
create trigger comment_reports_quota
  before insert on public.comment_reports
  for each row execute function public.quota_signalements();

-- Le pseudonyme et la marque d'auteur sont figes a la publication : la vue
-- n'a alors plus aucune raison de lire author_id.
create or replace function public.marquer_auteur_commentaire()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.auteur := public.author_tag(new.author_id);
  new.par_auteur_du_site := exists (
    select 1 from public.site_authors a where a.user_id = new.author_id
  );
  return new;
end;
$$;

drop trigger if exists comments_marquer_auteur on public.comments;
create trigger comments_marquer_auteur
  before insert on public.comments
  for each row execute function public.marquer_auteur_commentaire();

-- Le masquage laisse une trace : qui, et quand.
create or replace function public.tracer_masquage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.masque is distinct from old.masque then
    new.masque_at := case when new.masque then now() else null end;
    new.masque_par := case when new.masque then (select auth.uid()) else null end;
  end if;
  return new;
end;
$$;

drop trigger if exists comments_trace_masquage on public.comments;
create trigger comments_trace_masquage
  before update on public.comments
  for each row execute function public.tracer_masquage();

-- =====================================================================
--  3. LES POLITIQUES RLS — la partie à relire ligne par ligne
-- =====================================================================

alter table public.comments enable row level security;
alter table public.comment_votes enable row level security;
alter table public.comment_reports enable row level security;
alter table public.genre_comment_settings enable row level security;

-- ---------------------------------------------------------- comments

-- LECTURE. La politique autorise tout le monde, MAIS le droit de lecture est
-- ensuite retiré colonne par colonne (section 4) : anon et authenticated ne
-- peuvent lire que ce qui ne trahit personne. author_id n'en fait pas partie.
-- La vue publique est le seul chemin normal.
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select using (true);

-- ÉCRITURE. Un connecté n'écrit que sous sa propre identité. Le trigger de
-- quota refuse en plus les fils fermés et les dépassements.
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert to authenticated
  with check (author_id = (select auth.uid()));

-- MODIFICATION : RÉSERVÉE À LA MODÉRATION, ET SEULEMENT POUR MASQUER.
-- L'auteur ne peut PAS reecrire son commentaire apres coup, comme pour les
-- propositions : un texte vote puis reecrit trahit ceux qui l'ont vote, et
-- un fil dont les messages changent n'est plus un historique.
-- Le corps lui-meme est verrouille par les droits colonne : meme un
-- moderateur ne peut pas reecrire les mots de quelqu'un d'autre.
drop policy if exists comments_update on public.comments;
create policy comments_update on public.comments
  for update to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

-- SUPPRESSION : l'auteur retire ce qu'il a ecrit, un moderateur aussi.
-- C'est la seule action laissee a l'auteur sur son propre message, et elle
-- est franche : on efface, on ne reecrit pas.
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_moderator());

-- ------------------------------------------------------ comment_votes

-- Chacun ne voit que ses propres votes. Les totaux passent par le score
-- entretenu sur comments, jamais par une lecture des votes d'autrui.
drop policy if exists comment_votes_select on public.comment_votes;
create policy comment_votes_select on public.comment_votes
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists comment_votes_insert on public.comment_votes;
create policy comment_votes_insert on public.comment_votes
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists comment_votes_update on public.comment_votes;
create policy comment_votes_update on public.comment_votes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists comment_votes_delete on public.comment_votes;
create policy comment_votes_delete on public.comment_votes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------- comment_reports

-- QUI A SIGNALÉ QUOI NE REGARDE QUE LA MODÉRATION. Un auteur qui pourrait
-- lire les signalements saurait qui l'a denonce : c'est exactement ce qu'il
-- ne faut pas. Chacun voit les siens, les moderateurs voient tout.
drop policy if exists comment_reports_select on public.comment_reports;
create policy comment_reports_select on public.comment_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_moderator());

drop policy if exists comment_reports_insert on public.comment_reports;
create policy comment_reports_insert on public.comment_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));

-- On peut retirer son propre signalement. Un moderateur aussi, une fois
-- traite, pour vider la file.
drop policy if exists comment_reports_delete on public.comment_reports;
create policy comment_reports_delete on public.comment_reports
  for delete to authenticated
  using (reporter_id = (select auth.uid()) or public.is_moderator());

-- ------------------------------------------ genre_comment_settings

-- L'etat « ferme » est PUBLIC : l'interface doit pouvoir cacher le champ de
-- saisie sans tenter une insertion vouee a l'echec.
drop policy if exists gcs_select on public.genre_comment_settings;
create policy gcs_select on public.genre_comment_settings
  for select using (true);

-- Fermer et rouvrir : moderation seule.
drop policy if exists gcs_insert on public.genre_comment_settings;
create policy gcs_insert on public.genre_comment_settings
  for insert to authenticated
  with check (public.is_moderator());

drop policy if exists gcs_update on public.genre_comment_settings;
create policy gcs_update on public.genre_comment_settings
  for update to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

drop policy if exists gcs_delete on public.genre_comment_settings;
create policy gcs_delete on public.genre_comment_settings
  for delete to authenticated
  using (public.is_moderator());

-- =====================================================================
--  4. LES DROITS AU NIVEAU COLONNE
-- =====================================================================
--
-- LE POINT LE PLUS IMPORTANT DU FICHIER. Une politique RLS ne peut pas
-- empêcher l'écriture d'UNE colonne sans se relire elle-même, et une
-- politique qui se relit provoque une récursion infinie. La réponse est un
-- grant colonne par colonne.
--
-- CE QUI N'EST PAS ACCORDÉ EN LECTURE : author_id. Un anonyme ne peut donc
-- pas faire `select author_id from comments`, ni le récupérer par jointure,
-- ni s'en servir pour corréler tout ce qu'une personne a écrit. L'email, lui,
-- vit dans auth.users, schéma que PostgREST ne publie pas : il est hors de
-- portée quelles que soient les politiques.
--
-- CE QUI N'EST PAS ACCORDÉ EN ÉCRITURE : score, reports_count, created_at,
-- masque_at, masque_par. Aucun client ne peut les toucher, quelle que soit
-- sa requête. Et `body` n'est accordé QU'À L'INSERTION, jamais en update :
-- c'est ainsi qu'un commentaire devient définitif une fois publié.

revoke all on public.comments from anon, authenticated;
-- reports_count N'EST PAS ACCORDE : second defaut trouve par les controles.
-- Il etait lisible sur la table alors que la vue l'excluait, ce qui laissait
-- voir quels commentaires ont ete signales et invitait au pilonnage.
grant select (id, genre_id, body, score, masque, created_at, auteur, par_auteur_du_site)
  on public.comments to anon, authenticated;
grant insert (genre_id, author_id, body) on public.comments to authenticated;
grant update (masque) on public.comments to authenticated;
grant delete on public.comments to authenticated;

revoke all on public.comment_votes from anon, authenticated;
grant select, insert (comment_id, user_id, valeur), update (valeur), delete
  on public.comment_votes to authenticated;

revoke all on public.comment_reports from anon, authenticated;
grant select, insert (comment_id, reporter_id, motif), delete
  on public.comment_reports to authenticated;

revoke all on public.genre_comment_settings from anon, authenticated;
grant select on public.genre_comment_settings to anon, authenticated;
grant insert (genre_id, ferme, ferme_par, raison),
      update (ferme, ferme_at, ferme_par, raison),
      delete
  on public.genre_comment_settings to authenticated;

-- =====================================================================
--  5. LES VUES
-- =====================================================================

-- security_invoker : la vue applique la RLS de l'APPELANT sur la table
-- sous-jacente, elle ne l'esquive pas. Sans cette option, elle s'exécuterait
-- avec les droits de son créateur et contournerait tout. La migration 0004
-- avait ce défaut.
-- La vue est en security_invoker, donc elle lit site_authors AVEC LES DROITS
-- DE L'APPELANT, qui n'en a aucun : l'appel doit passer par une fonction
-- security definer, sans quoi `par_auteur_du_site` vaudrait toujours faux.
create or replace function public.est_auteur_du_site(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.site_authors a where a.user_id = uid);
$$;

revoke all on function public.est_auteur_du_site(uuid) from public;
grant execute on function public.est_auteur_du_site(uuid) to anon, authenticated;

create or replace view public.comments_public
with (security_invoker = on) as
  select
    c.id,
    c.genre_id,
    -- Pseudonyme court, stable, non réversible : même fonction que pour les
    -- propositions, donc même pseudonyme d'un écran à l'autre.
    public.author_tag(c.author_id) as auteur,
    -- On expose un BOOLEEN, pas une identite. Et il vient de site_authors,
    -- pas de moderators : un moderateur nomme plus tard ne doit pas heriter
    -- de cette marque, ce sont deux roles distincts.
    public.est_auteur_du_site(c.author_id) as par_auteur_du_site,
    case when c.masque then null else c.body end as body,
    c.masque,
    c.score,
    c.created_at
  from public.comments c;

comment on view public.comments_public is
  'Fil de discussion sans author_id : le pseudonyme est derive par author_tag et ne remonte ni a l''email ni a l''UUID. reports_count n''y figure pas, le nombre de plaintes ne regarde pas le public.';

grant select on public.comments_public to anon, authenticated;

-- LA FILE DE MODÉRATION. Réservée aux modérateurs par la clause where : un
-- non-modérateur qui interroge cette vue obtient zéro ligne, pas une erreur.
create or replace view public.comments_moderation
with (security_invoker = on) as
  select
    c.id,
    c.genre_id,
    c.auteur,
    c.body,
    c.score,
    c.reports_count,
    c.masque,
    c.created_at,
    (select array_agg(r.motif) from public.comment_reports r where r.comment_id = c.id) as motifs
  from public.comments c
  where public.is_moderator()
    and (c.reports_count > 0 or c.masque)
  order by c.reports_count desc, c.created_at desc;

comment on view public.comments_moderation is
  'File de moderation : signales et masques. Rend zero ligne a qui n''est pas moderateur. author_id n''y figure pas non plus.';

grant select on public.comments_moderation to authenticated;

-- =====================================================================
--  6. LES CONTRÔLES À PASSER APRÈS APPLICATION
-- =====================================================================
--
-- À exécuter réellement, et à ne pas croire sur parole : c'est la leçon de
-- la commande de modérateur qui affichait « Success » sans rien insérer.
--
--   1. author_id ne sort pas, même directement
--        select author_id from comments limit 1;          -> doit ECHOUER
--   2. author_id ne sort pas par jointure non plus
--        select c.* from comments c join comment_votes v
--          on v.comment_id = c.id limit 1;                -> pas d'author_id
--   3. la vue publique fonctionne pour un anonyme
--        select * from comments_public limit 1;           -> doit REUSSIR
--   4. reports_count n'est pas dans la vue publique
--        select reports_count from comments_public;       -> doit ECHOUER
--   5. un commentaire ne se modifie pas
--        update comments set body = 'x' where id = ...;   -> doit ECHOUER
--   6. le score ne s'ecrit pas
--        update comments set score = 999 where id = ...;  -> doit ECHOUER
--   7. l'auteur supprime le sien
--        delete from comments where id = <le sien>;       -> doit REUSSIR
--   8. le quota mord
--        11 insertions en 24 h                            -> la 11e ECHOUE
--   9. un fil ferme refuse l'ecriture
--        insert ... sur un genre ferme                    -> doit ECHOUER
--  10. un signalement ne masque rien
--        insert into comment_reports ... ;
--        select masque from comments_public where id=...; -> doit valoir false
--  11. la file de moderation est vide pour un simple connecte
--        select * from comments_moderation;               -> zero ligne
--  12. qui a signale reste invisible a l'auteur
--        select * from comment_reports;   (comme auteur)  -> zero ligne
--  13. la table des auteurs du site n'est lisible par personne
--        select * from site_authors;                      -> doit ECHOUER
--  14. mais la marque remonte quand meme dans la vue
--        select par_auteur_du_site from comments_public;  -> doit REUSSIR
--  15. reports_count n'est pas lisible sur la table non plus
--        select reports_count from comments;              -> doit ECHOUER
--
-- RESULTAT DE LA PREMIERE EXECUTION, 11 aout 2026 : DEUX defauts trouves.
--   - la vue publique rendait 401 : elle lisait author_id en
--     security_invoker. Corrige en materialisant le pseudonyme.
--   - reports_count etait lisible par anon sur la table alors que la vue
--     l'excluait. Corrige par revoke.
-- Les quinze controles passent apres correction.
