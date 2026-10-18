-- LES MIXTAPES DEVIENNENT SOCIALES. Mika, le 18 octobre 2026, devant la page
-- d'une mixtape : « proposer aux users loggés de faire des likes et mettre des
-- commentaires », et dans les profils « des liens de réseaux sociaux », comme
-- sur SoundCloud.
--
-- Trois choses :
--   1. le profil d'artiste gagne un lieu public, une bannière et des liens ;
--   2. les « j'aime » d'une mixtape (un par compte) ;
--   3. les commentaires d'une mixtape, au moment du mix si l'on veut.

-- ═══ 1. LE PROFIL D'ARTISTE ═══
-- Le lieu est un texte libre et PUBLIC (« Montréal, Canada »), distinct de la
-- ville d'attache du profil, qui reste privée. Les liens sont un objet
-- { instagram, soundcloud, ... } d'adresses, borné en taille.
alter table public.artistes
  add column if not exists lieu text
    check (lieu is null or char_length(lieu) <= 80),
  add column if not exists banniere_path text
    check (banniere_path is null or char_length(banniere_path) <= 300),
  add column if not exists liens jsonb not null default '{}'::jsonb
    check (jsonb_typeof(liens) = 'object' and pg_column_size(liens) <= 4000);

create or replace view public.artistes_publics
  with (security_invoker = on) as
  select a.user_id,
         a.nom,
         a.avatar_path,
         a.bio,
         count(s.id) as n_sets,
         coalesce(sum(s.ecoutes), 0::bigint) as ecoutes,
         max(s.created_at) as dernier_set,
         a.lieu,
         a.banniere_path,
         a.liens
    from public.artistes a
    join public.dj_sets s on s.user_id = a.user_id and s.publie
   group by a.user_id, a.nom, a.avatar_path, a.bio, a.lieu, a.banniere_path, a.liens;

-- ═══ 2. LES J'AIME ═══
create table if not exists public.set_likes (
  set_id uuid not null references public.dj_sets(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (set_id, user_id)
);
alter table public.set_likes enable row level security;

create policy "like : je vois les miens"
  on public.set_likes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "like : j'aime une mixtape publiée"
  on public.set_likes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.dj_sets s where s.id = set_id and s.publie)
  );
create policy "like : je retire le mien"
  on public.set_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Le compte des j'aime est public ; qui a aimé ne l'est pas.
create or replace function public.likes_des_sets(ids uuid[])
returns table (set_id uuid, n bigint)
language sql stable security definer set search_path = '' as $$
  select l.set_id, count(*)::bigint
    from public.set_likes l
   where l.set_id = any(ids)
   group by l.set_id;
$$;
grant execute on function public.likes_des_sets(uuid[]) to anon, authenticated;

-- ═══ 3. LES COMMENTAIRES ═══
-- `position_s` : l'instant du mix auquel le commentaire se rapporte, comme
-- sur SoundCloud ; nul pour un commentaire sur l'ensemble. `auteur` est le
-- pseudonyme non réversible, figé à la publication (author_tag), affiché
-- quand la personne n'a pas de profil d'artiste.
create table if not exists public.set_commentaires (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.dj_sets(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  texte text not null check (char_length(btrim(texte)) between 1 and 1000),
  position_s integer check (position_s is null or position_s between 0 and 86400),
  auteur text,
  masque boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists set_commentaires_set_idx on public.set_commentaires (set_id, created_at desc);
alter table public.set_commentaires enable row level security;

create policy "commentaire : lu s'il est visible"
  on public.set_commentaires for select to anon, authenticated
  using (
    (not masque and exists (select 1 from public.dj_sets s where s.id = set_id and s.publie))
    or user_id = (select auth.uid())
    or public.is_moderator()
  );
create policy "commentaire : j'écris sur une mixtape publiée"
  on public.set_commentaires for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.dj_sets s where s.id = set_id and s.publie)
  );
create policy "commentaire : j'efface le mien, ou le modérateur"
  on public.set_commentaires for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_moderator());
create policy "commentaire : le modérateur masque"
  on public.set_commentaires for update to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

create or replace function public.preparer_commentaire_set()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recent integer; quota constant integer := 30;
begin
  new.auteur := public.author_tag(new.user_id);
  select count(*) into recent from public.set_commentaires c
   where c.user_id = new.user_id and c.created_at > now() - interval '24 hours';
  if recent >= quota then
    raise exception 'Limite atteinte : % commentaires par 24 heures. Reessayez plus tard.', quota
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;

drop trigger if exists preparer_commentaire_set on public.set_commentaires;
create trigger preparer_commentaire_set
  before insert on public.set_commentaires
  for each row execute function public.preparer_commentaire_set();

-- La lecture publique d'un commentaire, avec le nom et le portrait de son
-- auteur s'il a un profil d'artiste, son pseudonyme sinon. L'identifiant du
-- compte n'est donné que pour un artiste (sa page publique le porte déjà).
create or replace view public.set_commentaires_publics
  with (security_invoker = on) as
  select c.id,
         c.set_id,
         c.texte,
         c.position_s,
         c.created_at,
         coalesce(a.nom, c.auteur) as nom,
         a.avatar_path,
         case when a.user_id is not null then c.user_id end as artiste_id,
         (c.user_id = (select auth.uid())) as a_moi
    from public.set_commentaires c
    left join public.artistes a on a.user_id = c.user_id
   where not c.masque;
grant select on public.set_commentaires_publics to anon, authenticated;
