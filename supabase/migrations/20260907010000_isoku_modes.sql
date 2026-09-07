-- ISOKU : LES SCORES PORTENT LE JEU (sudoku, gratte-ciel ou cube).
-- Appliquee le 7 septembre 2026 par l'outil Supabase de Claude Code.
-- Le bareme depend du jeu : un facteur et des temps de reference par jeu.

alter table public.isoku_scores
  add column if not exists mode text not null default 'sudoku'
  check (mode in ('sudoku','tours','cube'));

create or replace function public.isoku_calculer_points(mode text, difficulte text, secondes integer, erreurs integer, indices integer)
returns integer language sql immutable as $$
  select round(
    (case difficulte when 'facile' then 100 when 'moyen' then 250 when 'difficile' then 500 else 1000 end)
    * (case mode when 'tours' then 0.6 when 'cube' then 0.4 else 1.0 end)
    * least(2.0, greatest(0.5,
        (case mode
           when 'tours' then (case difficulte when 'facile' then 200 when 'moyen' then 320 when 'difficile' then 480 else 720 end)
           when 'cube'  then (case difficulte when 'facile' then 100 when 'moyen' then 160 when 'difficile' then 240 else 360 end)
           else              (case difficulte when 'facile' then 360 when 'moyen' then 600 when 'difficile' then 900 else 1500 end)
         end)::numeric
        / greatest(secondes, 1)))
    * greatest(0.1, 1 - least(0.5, erreurs * 0.1) - least(0.6, indices * 0.15))
  )::integer
$$;

create or replace function public.isoku_avant_insertion()
returns trigger language plpgsql as $$
begin
  new.user_id := auth.uid();
  new.points := public.isoku_calculer_points(new.mode, new.difficulte, new.secondes, new.erreurs, new.indices);
  new.created_at := now();
  return new;
end $$;

drop function if exists public.isoku_calculer_points(text, integer, integer, integer);

drop view if exists public.isoku_meilleurs_temps;
create view public.isoku_meilleurs_temps with (security_invoker = true) as
  select distinct on (s.mode, s.difficulte, s.user_id)
         s.mode, s.difficulte, p.pseudo, s.user_id, s.secondes, s.erreurs, s.indices, s.points, s.created_at
  from public.isoku_scores s
  join public.isoku_players p on p.user_id = s.user_id
  order by s.mode, s.difficulte, s.user_id, s.secondes asc;

grant select on public.isoku_meilleurs_temps to anon, authenticated;
