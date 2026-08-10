-- SONAA — vote du public sur les tracks d'un genre.
--
-- CE QUE LE VOTE FAIT ET NE FAIT PAS. Il réordonne l'AFFICHAGE d'une liste,
-- il ne touche jamais au corpus. Une track mal classée reste dans le genre ;
-- une track plébiscitée ne devient pas canonique. Le corpus se modifie par
-- commit, avec ses sources : c'est la même règle que pour les propositions,
-- et le vote n'y fait pas exception.
--
-- LA CLÉ EST COMPOSITE, ET LE GENRE EN FAIT PARTIE. Une même track est
-- parfois revendiquée par deux genres (les « charnières » du corpus). Elle
-- se vote alors séparément dans chacun : « Acperience 1 » peut être la
-- meilleure entrée en acid trance et une entrée secondaire en acid techno,
-- et ces deux jugements sont légitimes en même temps.

-- ------------------------------------------------------------------ table

create table public.track_votes (
  user_id uuid not null references auth.users (id) on delete cascade,
  genre_id text not null
    check (char_length(genre_id) between 2 and 40)
    check (genre_id ~ '^[a-z0-9]+$'),
  /* Identifiant de vidéo YouTube : onze caractères de l'alphabet base64
     URL. Borné pour que la table ne serve pas de dépotoir. */
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),

  primary key (user_id, genre_id, video_id)
);

comment on table public.track_votes is
  'Un vote par personne, par track ET par genre. Le genre fait partie de la cle : une track charniere se vote separement dans chaque genre qui la revendique.';

create index track_votes_cible_idx on public.track_votes (genre_id, video_id);
create index track_votes_user_idx on public.track_votes (user_id, created_at desc);

alter table public.track_votes enable row level security;

-- --------------------------------------------------------- quota anti-abus

/* Même garde que pour les propositions, même raison : une fenêtre
   GLISSANTE de 24 heures, sinon on vote cinquante fois à 23 h 59 et
   cinquante fois à 00 h 01. Le plafond est plus haut que celui des
   propositions parce que voter coûte moins cher qu'écrire : parcourir un
   genre et classer ses dix tracks est un usage normal. */
create or replace function public.enforce_track_vote_rate_limit()
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
    from public.track_votes v
   where v.user_id = new.user_id
     and v.created_at > now() - interval '24 hours';

  if recent >= quota then
    raise exception 'Limite atteinte : % votes par 24 heures. Reessayez plus tard.', quota
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.enforce_track_vote_rate_limit() is
  'Refuse un 201e vote dans une fenetre glissante de 24 heures.';

create trigger track_votes_rate_limit
  before insert on public.track_votes
  for each row execute function public.enforce_track_vote_rate_limit();

revoke all on function public.enforce_track_vote_rate_limit() from public, anon, authenticated;

-- ------------------------------------------------------------ le classement

/* LE SCORE EST AGRÉGÉ ICI, JAMAIS COMPTÉ PAR LE CLIENT. Une somme calculée
   dans le navigateur serait aussi fiable que le navigateur qui la calcule.

   security_invoker = off, comme pour game_scores et pour la même raison :
   la vue agrège les votes de TOUT LE MONDE, alors que la RLS de
   track_votes montre à chacun les siens. Elle ne rend que des totaux et
   aucun identifiant de compte. */
create view public.track_scores
with (security_invoker = off)
as
  select
    genre_id,
    video_id,
    sum(value)::integer as score,
    count(*)::integer as votes
  from public.track_votes
  group by genre_id, video_id;

comment on view public.track_scores is
  'Score agrege par track et par genre. Aucun identifiant de compte, jamais de ligne nominative.';

-- ------------------------------------------------------------- les droits

revoke all on public.track_votes from anon, authenticated;

/* Lecture publique des votes bruts : ils ne portent qu'un identifiant de
   compte, aucune donnée personnelle, et c'est ce qui permet à l'interface
   de savoir ce qu'on a soi-même voté. Le classement passe par la vue. */
grant select on public.track_votes to anon, authenticated;
grant insert, update, delete on public.track_votes to authenticated;
grant select on public.track_scores to anon, authenticated;

create policy track_votes_select_public
  on public.track_votes for select
  to anon, authenticated
  using (true);

/* On vote pour soi, et pour personne d'autre. C'est la seule chose que
   cette politique a besoin de dire : la clé primaire garantit déjà l'unicité
   et le trigger garantit le quota. */
create policy track_votes_insert_self
  on public.track_votes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy track_votes_update_own
  on public.track_votes for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy track_votes_delete_own
  on public.track_votes for delete
  to authenticated
  using (user_id = (select auth.uid()));
