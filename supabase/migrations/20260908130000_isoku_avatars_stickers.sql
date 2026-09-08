-- ISOKU : les avatars peuvent aussi etre des stickers Massive Medias.
-- Appliquee le 8 septembre 2026 par l'outil Supabase de Claude Code sous le
-- nom « isoku_avatars_stickers ». Un sticker = identifiant en minuscules et
-- tirets (ex. « crow ») ; une icone au trait garde la forme « icone.couleur ».
alter table public.isoku_players drop constraint if exists isoku_players_avatar_check;
alter table public.isoku_players add constraint isoku_players_avatar_check
  check (avatar is null or avatar ~ '^[a-z0-9-]{2,40}(\.[0-7])?$');
