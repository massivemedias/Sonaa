-- ISOKU : AVATAR PUBLIC DES JOUEURS.
-- Appliquee le 8 septembre 2026 par l'outil Supabase de Claude Code sous le
-- nom « isoku_avatars ». Copie ici pour que le depot reste la reference.
-- L'avatar est « icone.couleur » (ex. « chat.3 ») : une icone au trait parmi
-- une quinzaine et un indice de couleur de 0 a 7. Choisi par la personne,
-- public comme le pseudo.

alter table public.isoku_players add column if not exists avatar text
  check (avatar is null or avatar ~ '^[a-z]{2,12}\.[0-7]$');
comment on column public.isoku_players.avatar is 'Avatar public : nom d''icone au trait et indice de couleur (0 a 7), choisi par la personne.';

drop view if exists public.isoku_classement;
create view public.isoku_classement with (security_invoker = true) as
  select p.user_id, p.pseudo, p.avatar,
         coalesce(sum(s.points), 0)::integer as total,
         count(s.id)::integer as grilles,
         max(s.created_at) as derniere
  from public.isoku_players p
  left join public.isoku_scores s on s.user_id = p.user_id
  group by p.user_id, p.pseudo, p.avatar;

drop view if exists public.isoku_meilleurs_temps;
create view public.isoku_meilleurs_temps with (security_invoker = true) as
  select distinct on (s.mode, s.difficulte, s.user_id)
         s.mode, s.difficulte, p.pseudo, p.avatar, s.user_id, s.secondes, s.erreurs, s.indices, s.points, s.created_at
  from public.isoku_scores s
  join public.isoku_players p on p.user_id = s.user_id
  order by s.mode, s.difficulte, s.user_id, s.secondes asc;

grant select on public.isoku_classement, public.isoku_meilleurs_temps to anon, authenticated;
