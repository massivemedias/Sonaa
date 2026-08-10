-- SONAA — 0001 : tables proposals, votes, moderators.
--
-- Contexte : le projet a « Automatically expose new tables » activé. Toute
-- table créée ici est donc atteignable par PostgREST dès sa création :
-- RLS est activée dans CETTE migration, pas dans une suivante, pour qu'il
-- n'existe aucune fenêtre pendant laquelle une table est lisible sans
-- politique. Les politiques elles-mêmes sont en 0003 ; d'ici là, RLS
-- activée sans politique = tout est refusé, ce qui est le bon défaut.
--
-- Les identifiants de genre (genre_id) sont ceux du corpus JSON du site
-- (« darkdisco », « progpsy »…). Ils ne sont PAS une clé étrangère : le
-- corpus vit dans le dépôt, pas en base, et on ne veut pas dupliquer 218
-- lignes qui divergeraient. La cohérence est vérifiée côté application.

-- gen_random_uuid() : présent nativement en PG 13+, l'extension est là par
-- défaut sur Supabase. Déclarée pour que la migration soit rejouable ailleurs.
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- proposals

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- L'auteur. Suppression du compte = suppression de ses propositions.
  author_id uuid not null references auth.users (id) on delete cascade,

  -- Ce que la proposition demande. Le payload attendu dépend de ce champ,
  -- et les contraintes de longueur plus bas s'appliquent par type.
  kind text not null check (kind in ('track', 'genre_edit', 'filiation')),

  -- Identifiant du genre visé dans le corpus. Longueur bornée, minuscules
  -- et chiffres seulement, comme les identifiants du corpus.
  genre_id text not null
    check (char_length(genre_id) between 2 and 40)
    check (genre_id ~ '^[a-z0-9]+$'),

  -- Le contenu. jsonb pour ne pas figer un schéma à chaque type de
  -- proposition, mais BORNÉ : voir les contraintes ci-dessous.
  payload jsonb not null,

  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'merged')),

  -- Recalculé par trigger depuis votes. Jamais écrit par le client :
  -- la politique d'écriture de 0003 ne l'autorise pas.
  score integer not null default 0,

  -- Décision de modération. Renseignés ensemble ou pas du tout.
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamptz,
  moderation_note text check (moderation_note is null or char_length(moderation_note) <= 500),

  -- CONTRAINTES DE LONGUEUR SUR LE PAYLOAD.
  -- Plafond global d'abord : 4 Ko de JSON, un ordre de grandeur au-dessus
  -- du besoin réel, très en dessous de ce qui permettrait d'abuser du
  -- stockage. octet_length et non char_length : ce sont des octets qui
  -- transitent et qui sont stockés.
  constraint proposals_payload_is_object
    check (jsonb_typeof(payload) = 'object'),
  constraint proposals_payload_size
    check (octet_length(payload::text) <= 4096),

  -- Puis par type. Un champ absent est refusé, un champ trop long aussi.
  constraint proposals_track_payload check (
    kind <> 'track' or (
      payload ? 'artist'
      and payload ? 'title'
      and jsonb_typeof(payload -> 'artist') = 'string'
      and jsonb_typeof(payload -> 'title') = 'string'
      and char_length(payload ->> 'artist') between 1 and 120
      and char_length(payload ->> 'title') between 1 and 160
      and (not payload ? 'url' or char_length(payload ->> 'url') <= 300)
      and (not payload ? 'note' or char_length(payload ->> 'note') <= 500)
    )
  ),
  constraint proposals_genre_edit_payload check (
    kind <> 'genre_edit' or (
      payload ? 'field'
      and payload ? 'value'
      and char_length(payload ->> 'field') between 1 and 40
      and char_length(payload ->> 'value') between 1 and 2000
    )
  ),
  constraint proposals_filiation_payload check (
    kind <> 'filiation' or (
      payload ? 'parent_id'
      and char_length(payload ->> 'parent_id') between 2 and 40
      and (payload ->> 'parent_id') ~ '^[a-z0-9]+$'
      and (not payload ? 'reason' or char_length(payload ->> 'reason') <= 1000)
    )
  ),

  -- Une décision de modération ne se raconte pas à moitié.
  constraint proposals_moderation_coherent check (
    (moderated_by is null and moderated_at is null)
    or (moderated_by is not null and moderated_at is not null)
  )
);

comment on table public.proposals is
  'Propositions du public : ajout de track, correction de fiche, correction de filiation. Le corpus lui-même reste dans le depot ; cette table est la file d''attente.';
comment on column public.proposals.genre_id is
  'Identifiant de genre du corpus JSON. Volontairement PAS une cle etrangere : le corpus vit dans le depot.';
comment on column public.proposals.score is
  'Somme des votes, recalculee par trigger. Jamais ecrit par le client.';

create index proposals_genre_status_idx on public.proposals (genre_id, status);
create index proposals_author_created_idx on public.proposals (author_id, created_at desc);
create index proposals_status_score_idx on public.proposals (status, score desc);

-- RLS DÈS MAINTENANT. Sans politique, tout est refusé : c'est voulu.
alter table public.proposals enable row level security;

-- -------------------------------------------------------------------- votes

create table public.votes (
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  voter_id uuid not null references auth.users (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),

  -- Un vote par personne et par proposition. C'est la clé primaire qui le
  -- garantit, pas une vérification applicative.
  primary key (proposal_id, voter_id)
);

comment on table public.votes is
  'Un vote par personne et par proposition, garanti par la cle primaire. Voter sur sa propre proposition est refuse par la politique d''insertion.';

create index votes_proposal_idx on public.votes (proposal_id);
create index votes_voter_idx on public.votes (voter_id);

alter table public.votes enable row level security;

-- --------------------------------------------------------------- moderators

create table public.moderators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  -- Qui a nommé ce modérateur. Nul pour la première ligne, posée à la main.
  added_by uuid references auth.users (id) on delete set null,
  note text check (note is null or char_length(note) <= 200)
);

comment on table public.moderators is
  'Liste des moderateurs. AUCUNE politique d''ecriture : cette table ne se modifie que par SQL depuis la console, jamais par l''API. Ajouter un moderateur est un acte delibere.';

alter table public.moderators enable row level security;
