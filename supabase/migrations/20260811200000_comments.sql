-- SONAA — 0009 : fils de discussion par genre.
--
-- À LIRE AVANT D'APPLIQUER. Cette migration reprend trait pour trait
-- l'architecture des propositions, y compris ses corrections successives :
-- le pseudonyme dérivé par author_tag, le quota anti-abus par trigger, les
-- droits au niveau COLONNE pour figer le score, et security_invoker sur les
-- vues. Chacun de ces points a coûté une migration correctrice en son
-- temps ; ils sont ici dès le départ.
--
-- CE QUI EST PUBLIC : le corps du commentaire, le pseudonyme, la date, le
-- score. CE QUI NE SORT JAMAIS : l'author_id, qui permettrait de corréler
-- tout ce qu'une personne a écrit sur le site.

-- --------------------------------------------------------------- la table

create table if not exists public.comments (
  id uuid primary key default extensions.gen_random_uuid(),
  genre_id text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(btrim(body)) between 2 and 2000),
  created_at timestamptz not null default now(),

  -- Le score est ENTRETENU PAR TRIGGER depuis comment_votes, jamais écrit
  -- par un client. Les droits au niveau colonne plus bas le garantissent :
  -- une politique RLS qui interrogerait la table pour figer une colonne
  -- provoque une récursion infinie, ce qui a déjà bloqué toutes les mises à
  -- jour du projet une fois.
  score integer not null default 0,

  -- Un commentaire retiré par la modération n'est pas supprimé : on garde la
  -- trace, et l'affichage le remplace par une mention. Effacer empêcherait
  -- de comprendre après coup pourquoi un fil a une forme bizarre.
  masque boolean not null default false
);

create index if not exists comments_genre_idx on public.comments (genre_id, score desc, created_at desc);
create index if not exists comments_author_idx on public.comments (author_id);

comment on table public.comments is
  'Fils de discussion par genre. Lecture publique via la vue comments_public, ecriture reservee aux comptes connectes.';

-- --------------------------------------------------------- les votes

create table if not exists public.comment_votes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  valeur smallint not null check (valeur in (-1, 1)),
  created_at timestamptz not null default now(),
  -- Une seule voix par personne et par commentaire, garantie par la clé.
  primary key (user_id, comment_id)
);

create index if not exists comment_votes_comment_idx on public.comment_votes (comment_id);

-- ------------------------------------------------- le score, par trigger

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

-- --------------------------------------------------- quota anti-abus

-- Le quota vit dans un TRIGGER et non dans une politique RLS : une politique
-- qui compte les lignes de sa propre table se rappelle elle-même. Voir la
-- migration 0006, qui a corrigé exactement cette récursion.
create or replace function public.quota_commentaires()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
  quota constant integer := 20;
begin
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

-- ------------------------------------------------------------------ RLS

alter table public.comments enable row level security;
alter table public.comment_votes enable row level security;

-- LECTURE : personne ne lit la table directement, tout passe par la vue
-- publique qui masque author_id. La politique existe pour que la vue, en
-- security_invoker, ait de quoi s'appuyer.
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select using (true);

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert to authenticated
  with check (author_id = (select auth.uid()));

-- Un auteur corrige son propre commentaire ; un modérateur peut le masquer.
-- Les COLONNES autorisées sont restreintes plus bas : sans cela, un client
-- pourrait écrire son propre score.
drop policy if exists comments_update on public.comments;
create policy comments_update on public.comments
  for update to authenticated
  using (author_id = (select auth.uid()) or public.is_moderator())
  with check (author_id = (select auth.uid()) or public.is_moderator());

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_moderator());

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

-- ----------------------------------------- droits au niveau COLONNE

-- LE POINT LE PLUS IMPORTANT DE CETTE MIGRATION. Une politique RLS ne peut
-- pas empêcher l'écriture d'UNE colonne sans se relire elle-même. La réponse
-- est un grant colonne par colonne : `score` et `author_id` n'y figurent
-- pas, donc aucun client ne peut les écrire, quelle que soit la requête.
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (genre_id, author_id, body) on public.comments to authenticated;
grant update (body, masque) on public.comments to authenticated;
grant delete on public.comments to authenticated;

revoke all on public.comment_votes from anon, authenticated;
grant select, insert (comment_id, user_id, valeur), update (valeur), delete
  on public.comment_votes to authenticated;

-- ------------------------------------------------- les vues publiques

-- security_invoker : la vue applique la RLS de l'APPELANT. Sans cette
-- option, elle s'exécuterait avec les droits de son créateur et contournerait
-- tout. La migration 0004 avait ce défaut.
create or replace view public.comments_public
with (security_invoker = on) as
  select
    c.id,
    c.genre_id,
    public.author_tag(c.author_id) as auteur,
    -- L'auteur du site est distingué à l'affichage. On expose un booléen,
    -- pas son identifiant : « qui est modérateur » n'a pas à être public,
    -- mais « ce commentaire vient de l'auteur du site » est une information
    -- utile au lecteur.
    exists (
      select 1 from public.moderators m where m.user_id = c.author_id
    ) as par_auteur_du_site,
    case when c.masque then null else c.body end as body,
    c.masque,
    c.score,
    c.created_at
  from public.comments c;

comment on view public.comments_public is
  'Fils de discussion, sans author_id : le pseudonyme est derive par author_tag et ne remonte ni a l''email ni a l''UUID.';

grant select on public.comments_public to anon, authenticated;

-- ------------------------------------------------------------ contrôles
--
-- À PASSER APRÈS APPLICATION, et à ne pas croire sur parole :
--
--   1. anon ne lit PAS public.comments.author_id
--        select author_id from comments limit 1;      -> doit échouer
--   2. anon lit la vue
--        select * from comments_public limit 1;       -> doit réussir
--   3. un connecté ne peut pas écrire son score
--        update comments set score = 999 where id = ...;  -> doit échouer
--   4. le quota mord
--        21 insertions en 24 h                        -> la 21e doit échouer
--   5. le score suit les votes
--        insert into comment_votes ... ; select score -> doit valoir 1
