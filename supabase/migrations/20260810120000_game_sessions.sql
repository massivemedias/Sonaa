-- SONAA — jeu : sessions, destructions, arbre de référence.
--
-- CE QUE CE SCHÉMA PEUT ET NE PEUT PAS FAIRE, dit franchement parce qu'il
-- y a un prix au bout.
--
-- La simulation tourne dans le navigateur. Aucun schéma ne peut donc
-- PROUVER qu'un humain a joué : un script qui rejoue une partie plausible
-- en temps réel est indétectable par construction. Ce que ce schéma fait,
-- c'est rendre la triche AUSSI COÛTEUSE QUE JOUER, et rejeter tout ce qui
-- est plus rapide ou plus simple que jouer.
--
-- Le levier décisif est l'HORODATAGE SERVEUR. Chaque destruction est une
-- ligne insérée avec `now()` posé par la base, jamais par le client. Un
-- tricheur ne peut donc pas compresser le temps : il doit étaler ses
-- requêtes exactement comme un joueur. Il lui reste à respecter l'ordre de
-- l'arbre, le compte exact, et une cadence humaine. À ce prix, écrire le
-- script coûte plus cher que de jouer, ce qui est l'objectif réel.
--
-- Le second levier est que LE CLIENT N'ÉCRIT JAMAIS LE STATUT. Il ouvre
-- une session, déclare ses destructions, puis appelle terminer_partie().
-- C'est le serveur qui vérifie et qui décide. Aucune politique RLS
-- n'autorise le client à poser 'gagnee' lui-même.

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------- l'arbre, référence du serveur

/* Projection en lecture seule de corpus.json, écrite par
   scripts/build-game-tree.ts. Sans elle, le serveur ne connaît pas l'arbre
   et ne peut vérifier ni l'ordre des destructions ni leur nombre. */
create table public.game_familles (
  id text primary key check (id ~ '^[a-z0-9]+$'),
  label text not null
);

create table public.game_genres (
  id text primary key check (id ~ '^[a-z0-9]+$'),
  famille text not null references public.game_familles (id) on delete cascade,
  /* Parent DANS LA MÊME FAMILLE, nul pour les fondateurs. Les greffes
     inter-familles ne sont pas ici : un astéroïde appartient à un seul
     arbre, sinon un genre serait libéré deux fois et le compte de 218 ne
     tomberait jamais juste. */
  parent text references public.game_genres (id) on delete cascade,
  profondeur smallint not null check (profondeur between 0 and 10)
);

create index game_genres_famille_idx on public.game_genres (famille);
create index game_genres_parent_idx on public.game_genres (parent);

comment on table public.game_genres is
  'Projection en lecture seule de l''arbre du corpus. Regeneree par scripts/build-game-tree.ts, jamais editee a la main. Le corpus reste l''autorite.';

alter table public.game_familles enable row level security;
alter table public.game_genres enable row level security;

-- ------------------------------------------------------------- les parties

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  /* HORODATÉ PAR LA BASE. Le client n'a aucun moyen de reculer ce moment,
     donc aucun moyen de se fabriquer une partie plus longue qu'elle ne
     l'a été. */
  started_at timestamptz not null default now(),
  ended_at timestamptz,

  statut text not null default 'en_cours'
    check (statut in ('en_cours', 'perdue', 'abandonnee', 'gagnee', 'a_verifier')),

  /* Recalculé par trigger depuis game_kills. Jamais écrit par le client :
     aucune politique ne le lui accorde. */
  genres_detruits integer not null default 0,
  vies_restantes smallint not null default 3 check (vies_restantes between 0 and 3),

  /* Ce que la vérification a trouvé. Rendu à l'intéressé, pour qu'une
     partie mise de côté ne le soit pas sans explication. */
  verdict text,

  constraint game_sessions_fin_coherente check (
    (statut = 'en_cours' and ended_at is null)
    or (statut <> 'en_cours' and ended_at is not null)
  )
);

create index game_sessions_user_idx on public.game_sessions (user_id, started_at desc);
create index game_sessions_statut_idx on public.game_sessions (statut, ended_at desc);

/* UN SEUL GAIN PAR COMPTE, garanti par l'index et non par une vérification
   applicative qu'on pourrait oublier d'appeler. */
create unique index game_sessions_un_seul_gain
  on public.game_sessions (user_id)
  where statut = 'gagnee';

comment on index game_sessions_un_seul_gain is
  'Un compte ne peut avoir qu''une seule partie gagnee. Garanti par l''index, pas par du code applicatif.';

alter table public.game_sessions enable row level security;

-- --------------------------------------------------------- les destructions

create table public.game_kills (
  session_id uuid not null references public.game_sessions (id) on delete cascade,
  /* Rang dans la partie, imposé par le client mais contraint : la clé
     primaire interdit deux fois le même rang. */
  ordre integer not null check (ordre >= 1),
  genre_id text not null references public.game_genres (id) on delete restrict,

  /* LE CŒUR DE L'ANTI-TRICHE. Posé par la base, pas par le client. */
  at timestamptz not null default now(),

  primary key (session_id, ordre),
  /* Un genre ne se détruit qu'une fois par partie. */
  unique (session_id, genre_id)
);

create index game_kills_session_at_idx on public.game_kills (session_id, at);

alter table public.game_kills enable row level security;

-- ------------------------------------------------------- compteur et garde

create or replace function public.game_recalc_detruits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cible uuid;
begin
  cible := coalesce(new.session_id, old.session_id);
  update public.game_sessions s
     set genres_detruits = (
           select count(*) from public.game_kills k where k.session_id = cible
         )
   where s.id = cible;
  return null;
end;
$$;

create trigger game_kills_recalc
  after insert or delete on public.game_kills
  for each row execute function public.game_recalc_detruits();

/* Une destruction ne s'enregistre que dans une partie EN COURS et qui vous
   appartient. La politique RLS le dit déjà ; ce trigger le redit à
   l'intérieur de la transaction, parce qu'une partie terminée qui
   continuerait de recevoir des kills serait la faille la plus évidente. */
create or replace function public.game_kill_valide()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.game_sessions where id = new.session_id;
  if s is null then
    raise exception 'Partie inconnue.' using errcode = 'check_violation';
  end if;
  if s.statut <> 'en_cours' then
    raise exception 'Cette partie est terminee.' using errcode = 'check_violation';
  end if;
  /* Plafond dur : on ne peut pas détruire plus de genres qu'il n'en
     existe. Sans ce garde-fou, un client pourrait gonfler le compteur avec
     des rangs arbitraires. */
  if (select count(*) from public.game_kills where session_id = new.session_id)
     >= (select count(*) from public.game_genres) then
    raise exception 'Toutes les destructions possibles sont deja enregistrees.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger game_kills_garde
  before insert on public.game_kills
  for each row execute function public.game_kill_valide();
