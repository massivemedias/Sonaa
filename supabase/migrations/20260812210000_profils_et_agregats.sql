-- SONAA — 0011 : localisation facultative, et agrégats d'administration.
--
-- APPLIQUÉ le 12 août 2026, SAUF la section 4, qui attend que le second
-- courriel ait un compte. Cette section se rejoue seule.
--
-- Deux chantiers dans un seul fichier parce qu'ils partagent une contrainte,
-- et que cette contrainte est la seule chose difficile ici :
--
--   AUCUNE JOINTURE NE DOIT RELIER UNE VILLE À UN PSEUDONYME PUBLIC.
--
-- ─────────────────────────────────────────────────────────────────────────
-- LE PIÈGE, ET POURQUOI LES MODÉRATEURS NE LISENT PAS CETTE TABLE
-- ─────────────────────────────────────────────────────────────────────────
--
-- La demande disait : « les modérateurs en lecture seule pour l'agrégat ».
-- Une politique de lecture sur les LIGNES de profiles la trahirait pourtant,
-- et il faut le voir avant de l'écrire.
--
-- Le pseudonyme public d'une personne est `author_tag(user_id)`, une fonction
-- exécutable par tout compte authentifié (migration 0004). Un modérateur qui
-- peut lire `(user_id, ville)` n'a donc qu'à appeler author_tag sur chaque
-- user_id pour obtenir la table `(pseudonyme public, ville)`. La jointure
-- interdite ne serait pas dans le schéma, elle serait à trois lignes de SQL.
--
-- Les modérateurs n'ont donc AUCUN accès aux lignes. Ils appellent des
-- fonctions qui ne rendent que des COMPTES, et le seuil d'anonymat est
-- appliqué À L'INTÉRIEUR de la fonction, là où personne ne peut le contourner.
-- C'est plus strict que ce qui était demandé, et c'est la seule façon de tenir
-- la promesse.

-- ═════════════════════════════════════════════════════════════════════════
-- 1. LE PROFIL
-- ═════════════════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Saisie libre, bornée. Ni coordonnées, ni adresse, ni code postal : on
  -- demande une ville et un pays, et le schéma ne peut pas stocker mieux.
  ville text check (ville is null or char_length(btrim(ville)) between 1 and 80),
  -- Code ISO 3166-1 alpha-2, en majuscules. Deux lettres : un sélecteur de
  -- pays remplit ce champ, il ne se tape pas à la main.
  pays char(2) check (pays is null or pays ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Localisation FACULTATIVE, declaree par la personne elle-meme. Ville et pays seulement, jamais de coordonnees ni d''adresse. Lisible et modifiable par son seul proprietaire : meme les moderateurs n''ont pas acces aux lignes, seulement a des agregats seuillees (voir stats_villes).';

comment on column public.profiles.pays is
  'Code ISO 3166-1 alpha-2. Nul tant que la personne n''a rien declare.';

alter table public.profiles enable row level security;

-- Chacun chez soi, et personne d'autre. Quatre politiques explicites plutôt
-- qu'une politique « for all » : on veut lire dans le schéma ce qui est permis.
create policy "profil : je lis le mien"
  on public.profiles for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "profil : je cree le mien"
  on public.profiles for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "profil : je modifie le mien"
  on public.profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "profil : je supprime le mien"
  on public.profiles for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- `updated_at` tenu par la base : une horloge cliente ne se vérifie pas.
create or replace function public.touch_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.user_id := old.user_id; -- on ne déplace pas un profil d'un compte à l'autre
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_profile();

-- Normalisation à l'écriture : « MONTRÉAL », « montréal  » et « Montréal »
-- sont la même ville, et sans cela le classement des dix premières villes
-- compterait trois lignes différentes.
create or replace function public.normalise_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.ville := nullif(btrim(regexp_replace(coalesce(new.ville, ''), '\s+', ' ', 'g')), '');
  new.pays := nullif(upper(btrim(coalesce(new.pays, ''))), '');
  return new;
end;
$$;

drop trigger if exists profiles_normalise on public.profiles;
create trigger profiles_normalise
  before insert or update on public.profiles
  for each row execute function public.normalise_profile();

-- Suppression complète du compte et de ses contributions, demandée depuis le
-- profil. Elle est irréversible et le dit : aucune corbeille, aucune copie.
--
-- Ce qui part : le profil, les propositions, les votes, les commentaires, les
-- signalements. Ce qui reste : rien qui porte l'identifiant. La ligne
-- auth.users elle-meme n'est PAS supprimee ici, l'API d'administration seule
-- peut le faire ; le compte devient donc un compte vide, sans aucune trace.
create or replace function public.supprimer_mes_donnees()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  moi uuid := (select auth.uid());
begin
  if moi is null then
    raise exception 'Non connecte.';
  end if;
  delete from public.comment_votes where user_id = moi;
  delete from public.comment_reports where reporter_id = moi;
  delete from public.comments where author_id = moi;
  delete from public.track_votes where user_id = moi;
  delete from public.votes where voter_id = moi;
  delete from public.proposals where author_id = moi;
  delete from public.profiles where user_id = moi;
end;
$$;

comment on function public.supprimer_mes_donnees() is
  'Efface le profil et TOUTES les contributions de l''appelant. Irreversible.';

revoke all on function public.supprimer_mes_donnees() from public;
grant execute on function public.supprimer_mes_donnees() to authenticated;

-- ═════════════════════════════════════════════════════════════════════════
-- 2. LES AGRÉGATS D'ADMINISTRATION
-- ═════════════════════════════════════════════════════════════════════════
--
-- Toutes en `security definer` : elles lisent des tables auxquelles l'appelant
-- n'a pas accès, et c'est le but. Toutes commencent par vérifier que
-- l'appelant est modérateur, sinon la fonction devient une porte dérobée.

-- LE SEUIL D'ANONYMAT. En dessous, on n'affiche rien : une ville a un seul
-- membre designe une personne. Le seuil vit ici, dans la fonction, jamais
-- dans l'interface : une valeur de confidentialite appliquee cote client
-- n'est pas une protection, c'est une politesse.
create or replace function public.stats_membres()
returns table (
  comptes bigint,
  avec_localisation bigint,
  pays_distincts bigint,
  villes_distinctes bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from auth.users),
    (select count(*) from public.profiles p where p.ville is not null or p.pays is not null),
    (select count(distinct p.pays) from public.profiles p where p.pays is not null),
    (select count(distinct (p.pays, lower(p.ville))) from public.profiles p where p.ville is not null)
  where public.is_moderator();
$$;

comment on function public.stats_membres() is
  'Comptes globaux, moderateurs seulement. Rend zero ligne a tout autre appelant.';

-- Répartition par pays. Un pays est moins identifiant qu'une ville, mais le
-- seuil s'applique quand même : un seul membre dans un pays le désigne autant.
create or replace function public.stats_pays(seuil integer default 3)
returns table (pays char(2), membres bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.pays, count(*) as membres
  from public.profiles p
  where public.is_moderator() and p.pays is not null
  group by p.pays
  having count(*) >= greatest(seuil, 3)
  order by count(*) desc, p.pays;
$$;

-- Les villes les plus représentées. Le seuil est plancher a 3 par
-- `greatest` : un appelant qui passerait seuil = 1 n'obtient pas mieux qu'un
-- appelant honnete. Un parametre de confidentialite qu'on peut baisser
-- depuis l'exterieur n'est pas un parametre, c'est un trou.
create or replace function public.stats_villes(seuil integer default 3, combien integer default 10)
returns table (ville text, pays char(2), membres bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (array_agg(p.ville order by p.updated_at desc))[1] as ville,
    p.pays,
    count(*) as membres
  from public.profiles p
  where public.is_moderator() and p.ville is not null
  group by p.pays, lower(p.ville)
  having count(*) >= greatest(seuil, 3)
  order by count(*) desc, 1
  limit least(greatest(combien, 1), 100);
$$;

comment on function public.stats_villes(integer, integer) is
  'Villes les plus representees, JAMAIS en dessous de trois membres. Le plancher est dans la fonction : le passer a 1 depuis l''appelant ne change rien.';

-- Activité : propositions par statut, contributions, contributeurs distincts.
create or replace function public.stats_activite(jours integer default 30)
returns table (
  propositions_en_attente bigint,
  propositions_acceptees bigint,
  propositions_refusees bigint,
  commentaires bigint,
  commentaires_masques bigint,
  votes_propositions bigint,
  votes_tracks bigint,
  contributeurs_distincts bigint,
  propositions_periode bigint,
  commentaires_periode bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with borne as (select now() - make_interval(days => greatest(jours, 1)) as depuis)
  select
    (select count(*) from public.proposals where status = 'pending'),
    (select count(*) from public.proposals where status = 'accepted'),
    (select count(*) from public.proposals where status = 'rejected'),
    (select count(*) from public.comments),
    (select count(*) from public.comments where masque),
    (select count(*) from public.votes),
    (select count(*) from public.track_votes),
    (select count(*) from (
      select author_id as qui from public.proposals
      union select author_id from public.comments
      union select voter_id from public.votes
      union select user_id from public.track_votes
    ) t where t.qui is not null),
    (select count(*) from public.proposals, borne where created_at >= borne.depuis),
    (select count(*) from public.comments, borne where created_at >= borne.depuis)
  where public.is_moderator();
$$;

-- Santé : dernières activités, pour voir d'un coup d'oeil si le site vit.
create or replace function public.stats_sante()
returns table (
  derniere_proposition timestamptz,
  dernier_commentaire timestamptz,
  dernier_vote timestamptz,
  signalements_ouverts bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select max(created_at) from public.proposals),
    (select max(created_at) from public.comments),
    (select max(created_at) from public.track_votes),
    (select count(*) from public.comment_reports r
      join public.comments c on c.id = r.comment_id
      where not c.masque)
  where public.is_moderator();
$$;

revoke all on function public.stats_membres() from public;
revoke all on function public.stats_pays(integer) from public;
revoke all on function public.stats_villes(integer, integer) from public;
revoke all on function public.stats_activite(integer) from public;
revoke all on function public.stats_sante() from public;
grant execute on function public.stats_membres() to authenticated;
grant execute on function public.stats_pays(integer) to authenticated;
grant execute on function public.stats_villes(integer, integer) to authenticated;
grant execute on function public.stats_activite(integer) to authenticated;
grant execute on function public.stats_sante() to authenticated;

-- ═════════════════════════════════════════════════════════════════════════
-- 3. GESTION DES MODÉRATEURS
-- ═════════════════════════════════════════════════════════════════════════
--
-- LA RÈGLE ÉVOLUE, ELLE N'EST PAS CONTREDITE EN SILENCE.
--
-- La table moderators portait ceci depuis sa création : « AUCUNE politique
-- d'ecriture : cette table ne se modifie que par SQL depuis la console, jamais
-- par l'API. Ajouter un moderateur est un acte delibere. »
--
-- Ce que cette règle protégeait : qu'on ne devienne pas modérateur par
-- accident, ni par une faille d'interface. Ce qu'elle coûtait : ouvrir une
-- console de base de données pour nommer quelqu'un, ce qui n'est tenable que
-- tant qu'on est seul.
--
-- CE QUI CHANGE, ET CE QUI NE CHANGE PAS. La table n'a toujours AUCUNE
-- politique d'écriture : elle reste inaccessible en écriture par l'API. On
-- passe par deux fonctions `security definer`, ce qui donne trois choses
-- qu'une politique ne donnerait pas : la vérification que l'appelant est déjà
-- modérateur, la trace de QUI a nommé QUI, et un JOURNAL horodaté.
--
-- Trois garde-fous, demandés :
--   1. seul un modérateur nomme ou révoque ;
--   2. on ne se révoque pas soi-même, et jamais le dernier ;
--   3. chaque ajout et chaque retrait est journalisé : qui, quand, sur qui.
--
-- Le commentaire de la table est réécrit plus bas pour dire l'état réel : un
-- commentaire qui décrit une règle abandonnée est pire que pas de commentaire.

-- LE JOURNAL. Il ne s'efface pas, il ne se modifie pas : aucune politique
-- d'update ni de delete, et les fonctions n'en écrivent qu'en insertion. Un
-- journal qu'on peut réécrire ne prouve rien.
create table if not exists public.moderator_log (
  id bigserial primary key,
  action text not null check (action in ('nomme', 'revoque')),
  cible uuid not null,
  par uuid,
  au timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 200)
);

comment on table public.moderator_log is
  'Journal des nominations et revocations de moderateurs. En insertion seule : ni update ni delete, par aucune politique. Lisible par les moderateurs.';

alter table public.moderator_log enable row level security;

create policy "journal : lecture par les moderateurs"
  on public.moderator_log for select
  to authenticated
  using (public.is_moderator());

create or replace function public.nommer_moderateur(courriel text, motif text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  cible uuid;
begin
  if not public.is_moderator() then
    raise exception 'Reserve aux moderateurs.';
  end if;
  select u.id into cible from auth.users u where lower(u.email) = lower(btrim(courriel));
  if cible is null then
    raise exception 'Aucun compte pour ce courriel. La personne doit s''etre connectee au moins une fois.';
  end if;
  insert into public.moderators (user_id, added_by, note)
  values (cible, (select auth.uid()), left(coalesce(motif, ''), 200))
  on conflict (user_id) do nothing;
  insert into public.moderator_log (action, cible, par, note)
  values ('nomme', cible, (select auth.uid()), left(coalesce(motif, ''), 200));
  return cible;
end;
$$;

create or replace function public.revoquer_moderateur(cible uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Reserve aux moderateurs.';
  end if;
  if cible = (select auth.uid()) then
    raise exception 'On ne se revoque pas soi-meme.';
  end if;
  if (select count(*) from public.moderators) <= 1 then
    raise exception 'Il doit rester au moins un moderateur.';
  end if;
  delete from public.moderators where user_id = cible;
  insert into public.moderator_log (action, cible, par)
  values ('revoque', cible, (select auth.uid()));
end;
$$;

-- Le commentaire de la table dit desormais l'etat reel de la regle.
comment on table public.moderators is
  'Liste des moderateurs. Toujours AUCUNE politique d''ecriture : l''API ne touche pas cette table directement. Les nominations et revocations passent par nommer_moderateur et revoquer_moderateur, reservees aux moderateurs, qui journalisent dans moderator_log. Regle assouplie le 12 aout 2026 : la console SQL restait tenable tant qu''on etait seul.';

-- La lecture du journal, pour l'onglet Gestion. Courriels absents, comme
-- pour la liste : le pseudonyme public suffit a distinguer les personnes.
create or replace function public.journal_moderation(combien integer default 50)
returns table (action text, cible_tag text, par_tag text, au timestamptz, note text)
language sql
stable
security definer
set search_path = ''
as $$
  select l.action, public.author_tag(l.cible),
         case when l.par is null then null else public.author_tag(l.par) end,
         l.au, l.note
  from public.moderator_log l
  where public.is_moderator()
  order by l.au desc
  limit least(greatest(combien, 1), 200);
$$;

revoke all on function public.journal_moderation(integer) from public;
grant execute on function public.journal_moderation(integer) to authenticated;

-- La liste, pour l'onglet Gestion. Le courriel n'y figure PAS : un modérateur
-- n'a pas à voir le courriel des autres. Le pseudonyme public suffit à les
-- distinguer, et c'est déjà l'identité que le site affiche partout.
create or replace function public.liste_moderateurs()
returns table (user_id uuid, tag text, added_at timestamptz, note text, c_est_moi boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, public.author_tag(m.user_id), m.added_at, m.note,
         m.user_id = (select auth.uid())
  from public.moderators m
  where public.is_moderator()
  order by m.added_at;
$$;

revoke all on function public.nommer_moderateur(text, text) from public;
revoke all on function public.revoquer_moderateur(uuid) from public;
revoke all on function public.liste_moderateurs() from public;
grant execute on function public.nommer_moderateur(text, text) to authenticated;
grant execute on function public.revoquer_moderateur(uuid) to authenticated;
grant execute on function public.liste_moderateurs() to authenticated;

-- ═════════════════════════════════════════════════════════════════════════
-- 4. LE SECOND MODÉRATEUR
-- ═════════════════════════════════════════════════════════════════════════
--
-- VÉRIFIÉ SUR LA BASE, le 12 août 2026 :
--   mauditemachine@gmail.com : compte existant, DEJA moderateur depuis le
--                              10 aout 2026.
--   massivemedias@gmail.com  : AUCUN COMPTE dans auth.users.
--
-- La seconde ligne ne peut donc pas etre ajoutee : la cle etrangere pointe
-- auth.users, et il n'y a rien a pointer. Ce courriel doit d'abord se
-- connecter une fois au site, par Google ou par lien magique. Le bloc
-- ci-dessous echoue bruyamment tant que ce n'est pas fait, plutot que de ne
-- rien inserer en silence.

do $$
declare
  cible uuid;
begin
  select u.id into cible from auth.users u
   where lower(u.email) = 'massivemedias@gmail.com';
  if cible is null then
    raise exception
      'massivemedias@gmail.com n''a pas de compte : qu''il se connecte une fois au site, puis rejouer ce bloc seul.';
  end if;
  insert into public.moderators (user_id, note)
  values (cible, 'Second moderateur, pose a la main.')
  on conflict (user_id) do nothing;
end;
$$;
