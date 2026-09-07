-- ISOKU : le jeu Mahjong remplace Gratte-ciel. Appliquee le 7 septembre 2026.
-- La valeur 'tours' reste admise pour d'eventuelles lignes existantes ; le
-- bareme apprend 'mahjong'.

alter table public.isoku_scores drop constraint if exists isoku_scores_mode_check;
alter table public.isoku_scores add constraint isoku_scores_mode_check check (mode in ('sudoku','tours','cube','mahjong'));

create or replace function public.isoku_calculer_points(mode text, difficulte text, secondes integer, erreurs integer, indices integer)
returns integer language sql immutable as $$
  select round(
    (case difficulte when 'facile' then 100 when 'moyen' then 250 when 'difficile' then 500 else 1000 end)
    * (case mode when 'tours' then 0.6 when 'cube' then 0.4 when 'mahjong' then 0.5 else 1.0 end)
    * least(2.0, greatest(0.5,
        (case mode
           when 'tours'   then (case difficulte when 'facile' then 200 when 'moyen' then 320 when 'difficile' then 480 else 720 end)
           when 'cube'    then (case difficulte when 'facile' then 100 when 'moyen' then 160 when 'difficile' then 240 else 360 end)
           when 'mahjong' then (case difficulte when 'facile' then 90  when 'moyen' then 240 when 'difficile' then 360 else 600 end)
           else                (case difficulte when 'facile' then 360 when 'moyen' then 600 when 'difficile' then 900 else 1500 end)
         end)::numeric
        / greatest(secondes, 1)))
    * greatest(0.1, 1 - least(0.5, erreurs * 0.1) - least(0.6, indices * 0.15))
  )::integer
$$;
