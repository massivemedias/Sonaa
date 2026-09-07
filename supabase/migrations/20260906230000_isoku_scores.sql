-- ISOKU : LE TABLEAU DES SCORES DU SUDOKU EN 3D (sonaa.ca/games/isoku).
--
-- Appliquee le 6 septembre 2026 par l'outil Supabase de Claude Code, sous
-- le nom « isoku_scores ». Copie ici pour que le depot reste la reference.
--
-- Deux tables et deux vues, toutes prefixees isoku_ pour ne rien melanger
-- avec l'atlas. Un compte Supabase (courriel + mot de passe, confirmation
-- automatique) choisit un pseudo public ; chaque grille terminee ajoute une
-- ligne de score. Les points sont RECALCULES EN BASE par un declencheur :
-- le client envoie la difficulte, le temps, les erreurs et les indices, et
-- la base decide des points. Un client modifie peut mentir sur son temps,
-- pas sur le bareme.
--
-- LECTURE PUBLIQUE, ECRITURE PAR SON PROPRIETAIRE SEULEMENT. Le pseudo est
-- public par construction (c'est un classement). Aucune autre donnee
-- personnelle n'est stockee ici : le courriel reste dans auth.users.

create table if not exists public.isoku_players (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  pseudo     text not null check (char_length(pseudo) between 2 and 20),
  created_at timestamptz not null default now()
);
create unique index if not exists isoku_players_pseudo_unique on public.isoku_players (lower(pseudo));
comment on table public.isoku_players is 'Pseudo public des joueurs d''Isoku. Une ligne par compte, choisie par la personne elle-meme.';

create table if not exists public.isoku_scores (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  difficulte text not null check (difficulte in ('facile','moyen','difficile','expert')),
  secondes   integer not null check (secondes between 10 and 86400),
  erreurs    integer not null default 0 check (erreurs between 0 and 999),
  indices    integer not null default 0 check (indices between 0 and 81),
  points     integer not null default 0 check (points between 0 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists isoku_scores_user on public.isoku_scores (user_id, created_at desc);
comment on table public.isoku_scores is 'Une ligne par grille terminee. Les points sont calcules par le declencheur isoku_calculer_points, jamais par le client.';

-- Le bareme : base par difficulte, multiplie par le rapport temps de
-- reference / temps reel (borne entre 0,5 et 2), moins 10 % par erreur
-- (au plus 50 %) et 15 % par indice (au plus 60 %), plancher a 10 %.
create or replace function public.isoku_calculer_points(difficulte text, secondes integer, erreurs integer, indices integer)
returns integer language sql immutable as $$
  select round(
    (case difficulte when 'facile' then 100 when 'moyen' then 250 when 'difficile' then 500 else 1000 end)
    * least(2.0, greatest(0.5,
        (case difficulte when 'facile' then 360 when 'moyen' then 600 when 'difficile' then 900 else 1500 end)::numeric
        / greatest(secondes, 1)))
    * greatest(0.1, 1 - least(0.5, erreurs * 0.1) - least(0.6, indices * 0.15))
  )::integer
$$;

create or replace function public.isoku_avant_insertion()
returns trigger language plpgsql as $$
begin
  new.user_id := auth.uid();
  new.points := public.isoku_calculer_points(new.difficulte, new.secondes, new.erreurs, new.indices);
  new.created_at := now();
  return new;
end $$;

drop trigger if exists isoku_scores_avant_insertion on public.isoku_scores;
create trigger isoku_scores_avant_insertion
  before insert on public.isoku_scores
  for each row execute function public.isoku_avant_insertion();

alter table public.isoku_players enable row level security;
alter table public.isoku_scores  enable row level security;

drop policy if exists isoku_players_lecture on public.isoku_players;
create policy isoku_players_lecture on public.isoku_players for select to anon, authenticated using (true);
drop policy if exists isoku_players_insertion on public.isoku_players;
create policy isoku_players_insertion on public.isoku_players for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists isoku_players_modification on public.isoku_players;
create policy isoku_players_modification on public.isoku_players for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists isoku_scores_lecture on public.isoku_scores;
create policy isoku_scores_lecture on public.isoku_scores for select to anon, authenticated using (true);
drop policy if exists isoku_scores_insertion on public.isoku_scores;
create policy isoku_scores_insertion on public.isoku_scores for insert to authenticated with check (auth.uid() = user_id);

-- Le classement : total des points par joueur.
create or replace view public.isoku_classement with (security_invoker = true) as
  select p.user_id, p.pseudo,
         coalesce(sum(s.points), 0)::integer as total,
         count(s.id)::integer as grilles,
         max(s.created_at) as derniere
  from public.isoku_players p
  left join public.isoku_scores s on s.user_id = p.user_id
  group by p.user_id, p.pseudo;

-- Les meilleurs temps, par difficulte.
create or replace view public.isoku_meilleurs_temps with (security_invoker = true) as
  select distinct on (s.difficulte, s.user_id)
         s.difficulte, p.pseudo, s.user_id, s.secondes, s.erreurs, s.indices, s.points, s.created_at
  from public.isoku_scores s
  join public.isoku_players p on p.user_id = s.user_id
  order by s.difficulte, s.user_id, s.secondes asc;

grant select on public.isoku_players, public.isoku_scores, public.isoku_classement, public.isoku_meilleurs_temps to anon, authenticated;
grant insert, update on public.isoku_players to authenticated;
grant insert on public.isoku_scores to authenticated;
grant usage, select on sequence public.isoku_scores_id_seq to authenticated;
