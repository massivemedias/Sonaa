-- SONAA — 0014 : les formats sans perte entrent dans le bucket des sets.
--
-- APPLIQUÉE. Demande : pouvoir deposer un fichier non compresse, sans aucune
-- perte de qualite.
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QUE LA MESURE A DIT, ET QUI CHANGE LA REPONSE
-- ─────────────────────────────────────────────────────────────────────────
--
-- Le plafond de 50 Mo par fichier n'est PAS un reglage du bucket. Verifie :
-- le bucket a ete porte a 500 Mo, et un envoi de 60 Mo a ete refuse avec
-- « 413 Payload too large, EntityTooLarge ». C'est un plafond du plan
-- gratuit, applique en amont du bucket. Le bucket a ete remis a 50 Mo pour
-- que la limite soit ecrite la ou elle vit.
--
-- Ce que 50 Mo representent, mesure a 44,1 kHz 16 bits stereo avec ffmpeg :
--
--   WAV et AIFF                  10,09 Mo/min  ->   5 minutes
--   FLAC, signal tonal            3,02 Mo/min  ->  16 minutes
--   FLAC, master bruite           3,87 Mo/min  ->  12 minutes
--   FLAC, stereo decorrele        9,87 Mo/min  ->   5 minutes
--   MP3 320                       2,29 Mo/min  ->  21 minutes
--
-- La musique de club reelle tombe vers 5 a 6 Mo/min en FLAC, soit environ
-- 9 minutes. UN SET D'UNE HEURE SANS PERTE PESE ENTRE 300 ET 600 Mo. Aucun
-- reencodage ne change cela : c'est l'hebergement qu'il faut changer.
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI LA LISTE ACCEPTE DES TYPES GENERIQUES
-- ─────────────────────────────────────────────────────────────────────────
--
-- Le navigateur ne sait pas nommer un fichier sans perte. Mesure : Chrome
-- rend une chaine VIDE pour un FLAC et pour un AIFF, Firefox rend
-- « application/octet-stream ». Une liste stricte aurait refuse des masters
-- valides avec un message incomprehensible.
--
-- La liste accepte donc les deux types generiques, et c'est l'EXTENSION qui
-- decide cote formulaire, la ou on la connait. Le client, lui, REEMBALLE le
-- fichier avec son vrai type avant l'envoi : sans cela le stockage
-- enregistrait « application/octet-stream » et la balise audio refusait de
-- lire un fichier qu'on ne lui annoncait pas comme de l'audio. Verifie :
-- l'objet est desormais servi en « audio/flac » et « audio/wav ».
--
-- AIFF ET ALAC SONT ECARTES cote formulaire, malgre leur presence ici pour
-- les envois deja faits : canPlayType rend une chaine vide pour l'AIFF dans
-- Chromium. Les accepter aurait produit des sets muets pour la plupart des
-- auditeurs, sans aucun message.

update storage.buckets
set allowed_mime_types = array[
  'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-m4a',
  'audio/flac', 'audio/x-flac',
  'audio/x-wav', 'audio/wave', 'audio/vnd.wave',
  'audio/aiff', 'audio/x-aiff',
  'application/octet-stream', ''
]
where id = 'sets';

-- ─────────────────────────────────────────────────────────────────────────
-- SUITE, LE MEME JOUR : LES FICHIERS ONT DEMENAGE SUR CLOUDFLARE R2
-- ─────────────────────────────────────────────────────────────────────────
--
-- Voir la migration 0015. Le bucket `sets` de Supabase n'est plus alimente ;
-- il reste en place pour les objets deja deposes, que `urlAudio` sait encore
-- servir grace au prefixe « supabase: ».
