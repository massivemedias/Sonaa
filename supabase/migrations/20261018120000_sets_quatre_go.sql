-- UN SET JUSQU'A 4 GO, et non plus 2. Mika, le 18 octobre 2026, n'a pas pu
-- deposer un WAV de 3,5 Go. 4 Go est la limite du format WAV lui-meme (sa
-- taille est ecrite sur 32 bits) ; R2 accepte bien plus. Le meme plafond est
-- ecrit dans src/lib/sets.ts (TAILLE_MAX).
alter table public.dj_sets drop constraint dj_sets_taille_o_check;
alter table public.dj_sets add constraint dj_sets_taille_o_check
  check (taille_o is null or (taille_o >= 1 and taille_o <= 4294967296));
