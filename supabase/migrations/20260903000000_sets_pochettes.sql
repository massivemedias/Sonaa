-- SONAA — 0019 : une pochette par set.
--
-- APPLIQUÉE.
--
-- LE BUCKET EST BORNE A 2 Mo, ET C'EST VOULU MEME SI ON DEPOSE 2 Go. L'image
-- est recompressee dans le navigateur AVANT l'envoi : 1200 px sur le cote le
-- plus long, en WebP. Un fichier de deux gigaoctets n'arrive donc jamais ici,
-- il arrive a quelques dizaines de kilo-octets. Mesure : un PNG de 8000 par
-- 8000 et 23 Mo ressort a 12 ko, un PNG detaille de 6000 ressort a 40 ko, un
-- JPEG de 3000 a 44 ko.
--
-- La borne du bucket n'est donc pas la pour refuser le gros fichier : elle
-- est la pour attraper le cas ou la compression aurait echoue sans qu'on s'en
-- apercoive, et ou l'original partirait tel quel.
--
-- POURQUOI UN BUCKET SEPARE DES AVATARS. Meme taille, memes politiques, meme
-- proprietaire : on aurait pu tout mettre ensemble. Mais un avatar pend a un
-- compte et une pochette pend a un set ; le jour ou l'un des deux change de
-- regle, de duree de vie ou d'hebergement, deux buckets se separent en une
-- ligne et un bucket melange se demele a la main.

drop view if exists public.sets_publics;

alter table public.dj_sets add column if not exists cover_path text
  check (cover_path is null or char_length(cover_path) <= 300);

comment on column public.dj_sets.cover_path is
  'Chemin de la pochette dans le bucket covers. L''image est recompressee dans le navigateur avant l''envoi : ce qui arrive ici fait toujours moins de 2 Mo, quelle que soit la taille du fichier choisi.';

create view public.sets_publics
with (security_invoker = on) as
  select
    s.id, s.titre, s.description, s.audio_path, s.cover_path, s.duree_s,
    s.onde, s.ecoutes, s.created_at, s.user_id, s.genre_ids,
    a.nom as artiste_nom, a.avatar_path as artiste_avatar
  from public.dj_sets s
  left join public.artistes a on a.user_id = s.user_id
  where s.publie;

comment on view public.sets_publics is
  'Sets publies, avec pochette, styles declares et auteur. security_invoker = on : les politiques de dj_sets s''appliquent, les brouillons ne sortent pas.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "covers : lecture publique"
  on storage.objects for select to anon, authenticated using (bucket_id = 'covers');
create policy "covers : je depose dans mon dossier"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "covers : je remplace la mienne"
  on storage.objects for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "covers : je supprime la mienne"
  on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
