-- SONAA — 0015 : le plafond de taille suit le demenagement vers R2.
--
-- APPLIQUÉE.
--
-- Les fichiers de sets ne vivent plus sur Supabase mais sur Cloudflare R2,
-- derriere un Worker qui verifie le jeton (voir worker/src/index.ts). La
-- raison est mesuree : le plan Supabase gratuit refusait tout objet au-dessus
-- de 50 Mo, plafond de compte et non reglage de bucket, verifie en portant le
-- bucket a 500 Mo et en recevant quand meme un 413 sur 60 Mo. Or un set d'une
-- heure sans perte pese 300 a 600 Mo.
--
-- La contrainte de taille disait « au plus 52428800 octets ». Laisser cette
-- valeur aurait fait echouer l'ecriture de la LIGNE apres un envoi de 400 Mo
-- deja termine : le fichier serait sur R2, facture, et rien dans l'interface
-- ne le montrerait. Elle passe donc a 1 Go, borne desormais budgetaire et non
-- technique, R2 acceptant jusqu'a 5 To par objet. 1 Go couvre 90 minutes de
-- WAV ou plus de trois heures de FLAC, et garde lisible le total gratuit de
-- 10 Go.

alter table public.dj_sets drop constraint if exists dj_sets_taille_o_check;
alter table public.dj_sets add constraint dj_sets_taille_o_check
  check (taille_o is null or taille_o between 1 and 1073741824);
