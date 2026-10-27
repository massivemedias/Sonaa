-- LA TRACKLIST D'UNE MIXTAPE. Mika, le 27 octobre 2026 : « l'affichage est
-- bon, mais il y a des infos en plus qu'il faudrait ». La premiere que
-- cherche quelqu'un qui ecoute un mix : ce qui joue, et quand. Un texte
-- libre, une ligne par morceau ; une ligne qui commence par un temps
-- (« 12:34 » ou « 1:02:03 ») devient, sur la page, un bouton qui y mene.
alter table public.dj_sets
  add column if not exists tracklist text
    check (tracklist is null or char_length(tracklist) <= 6000);

create or replace view public.sets_publics as
  select s.id,
         s.titre,
         s.description,
         s.audio_path,
         s.cover_path,
         s.duree_s,
         s.onde,
         s.ecoutes,
         s.created_at,
         s.user_id,
         s.genre_ids,
         a.nom as artiste_nom,
         a.avatar_path as artiste_avatar,
         s.audio_aac_path,
         s.tracklist
    from public.dj_sets s
    left join public.artistes a on a.user_id = s.user_id
   where s.publie;
