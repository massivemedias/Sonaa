-- ISOKU : NOUVEAU JEU « CHARTRAND » (rami 500 contre un adversaire), a la place du Demineur.
-- Appliquee le 8 septembre 2026 par l'outil Supabase de Claude Code sous le nom « isoku_chartrand ».
-- Le mode est accepte par la table des scores et le bareme lui donne un facteur 0,6 et des temps de
-- reference de 7 a 20 minutes (une partie va jusqu'a 500 points, en plusieurs manches).
alter table public.isoku_scores drop constraint if exists isoku_scores_mode_check;
alter table public.isoku_scores add constraint isoku_scores_mode_check
  check (mode in ('sudoku','tours','cube','mahjong','deux','picross','mines','blocs','chute','trio','tetris','serpent','chartrand'));
-- isoku_calculer_points : ajout de « when 'chartrand' then 0.6 » au facteur et
-- « when 'chartrand' then (facile 420, moyen 600, difficile 900, expert 1200) » aux temps de reference.
