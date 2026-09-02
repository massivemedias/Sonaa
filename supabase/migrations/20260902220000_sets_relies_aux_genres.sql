-- SONAA — 0017 : un set declare son genre, et un artiste a une page.
--
-- APPLIQUÉE.
--
-- CE QUI REND CE SITE DIFFERENT D'UNE PLATEFORME DE DEPOT. Le corpus porte
-- 219 genres decrits, dates, avec leurs machines et leurs morceaux de
-- reference. Un set depose sans genre n'est qu'un fichier de plus dans une
-- liste ; le meme set range sous « Dub Techno » apparait sur la fiche du
-- genre, sous les morceaux qui l'ont fait. Aucune plateforme generaliste ne
-- peut faire cela, parce qu'aucune ne porte les fiches.
--
-- POURQUOI PAS DE CLE ETRANGERE SUR LE GENRE. Les genres ne vivent pas en
-- base : ils sont dans le depot, dans corpus.json, versionnes avec le site.
-- Les copier ici creerait deux verites qui divergeraient au premier
-- renommage. La colonne porte l'identifiant tel qu'il est ecrit dans le
-- corpus, avec un motif contraint pour qu'elle n'accepte pas n'importe quelle
-- chaine, et c'est l'interface qui ne propose que des genres existants.

alter table public.dj_sets add column if not exists genre_id text
  check (genre_id is null or genre_id ~ '^[a-z0-9]{2,40}$');

comment on column public.dj_sets.genre_id is
  'Identifiant d''un genre du corpus, tel qu''ecrit dans corpus.json. Pas de cle etrangere : les genres vivent dans le depot, pas en base, et les dupliquer creerait deux verites.';

create index if not exists dj_sets_par_genre_idx
  on public.dj_sets (genre_id, created_at desc)
  where publie and genre_id is not null;

drop view if exists public.sets_publics;
create view public.sets_publics
with (security_invoker = on) as
  select
    s.id, s.titre, s.description, s.audio_path, s.duree_s, s.onde, s.ecoutes,
    s.created_at, s.user_id, s.genre_id,
    a.nom as artiste_nom, a.avatar_path as artiste_avatar
  from public.dj_sets s
  left join public.artistes a on a.user_id = s.user_id
  where s.publie;

comment on view public.sets_publics is
  'Sets publies, avec le genre declare et l''auteur. security_invoker = on : les politiques de dj_sets s''appliquent, les brouillons ne sortent pas.';

-- La table `artistes` contient aussi ceux qui ont rempli leur profil sans rien
-- deposer. Une page « Artistes » qui les listerait tous serait pleine de noms
-- sans son derriere. Cette vue ne garde que ceux dont au moins un set est
-- publie, et porte le compte, ce qui evite une requete par carte.
create or replace view public.artistes_publics
with (security_invoker = on) as
  select
    a.user_id, a.nom, a.avatar_path, a.bio,
    count(s.id) as n_sets,
    coalesce(sum(s.ecoutes), 0) as ecoutes,
    max(s.created_at) as dernier_set
  from public.artistes a
  join public.dj_sets s on s.user_id = a.user_id and s.publie
  group by a.user_id, a.nom, a.avatar_path, a.bio;

comment on view public.artistes_publics is
  'Artistes ayant au moins un set publie, avec le nombre de sets et le total d''ecoutes.';
