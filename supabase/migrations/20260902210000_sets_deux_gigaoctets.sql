-- SONAA — 0016 : le plafond passe a 2 Go.
--
-- APPLIQUÉE. Mika a bute sur 1,2 Go des le premier vrai set : un WAV de deux
-- heures pese exactement cela. R2 accepte 5 To par objet, la borne est donc
-- budgetaire. Au-dela des 10 Go gratuits, R2 facture 1,5 cent par gigaoctet
-- et par mois, soit une quinzaine de cents pour dix sets de plus. Ce plafond
-- ne protege plus une facture, il attrape le fichier depose par erreur.
alter table public.dj_sets drop constraint if exists dj_sets_taille_o_check;
alter table public.dj_sets add constraint dj_sets_taille_o_check
  check (taille_o is null or taille_o between 1 and 2147483648);
