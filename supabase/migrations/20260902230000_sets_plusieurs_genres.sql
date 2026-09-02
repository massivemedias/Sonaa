-- SONAA — 0018 : un set peut declarer plusieurs styles.
--
-- APPLIQUÉE.
--
-- Un set de DJ traverse rarement un seul genre : une heure de mix passe de
-- l'indie dance au dub techno sans changer de disque. La colonne unique
-- obligeait a choisir, et le choix etait faux dans les deux sens.
--
-- BORNE A CINQ. Un set qui revendique dix styles n'en revendique aucun : il
-- apparaitrait sur toutes les fiches et ne dirait rien nulle part.
--
-- LA VALIDATION TIENT EN UNE SEULE EXPRESSION REGULIERE sur le tableau
-- recolle. Une contrainte de verification ne peut pas contenir de
-- sous-requete, donc pas de boucle sur les elements : on colle le tableau avec
-- des virgules et on decrit la forme attendue de la chaine entiere. Le motif
-- borne du meme coup le nombre d'elements. Premiere tentative refusee par
-- Postgres avec « cannot use subquery in check constraint ».
--
-- L'ORDRE COMPTE, et la deuxieme tentative l'a appris : la vue depend de
-- l'ancienne colonne, elle doit tomber AVANT elle.

drop view if exists public.sets_publics;

alter table public.dj_sets add column if not exists genre_ids text[]
  check (
    genre_ids is null
    or array_to_string(genre_ids, ',') ~ '^[a-z0-9]{2,40}(,[a-z0-9]{2,40}){0,4}$'
  );

comment on column public.dj_sets.genre_ids is
  'Identifiants de genres du corpus, tels qu''ecrits dans corpus.json. Cinq au plus. Pas de cle etrangere, les genres vivent dans le depot et non en base.';

update public.dj_sets set genre_ids = array[genre_id]
  where genre_id is not null and genre_ids is null;

alter table public.dj_sets drop column if exists genre_id;

drop index if exists dj_sets_par_genre_idx;
-- Index GIN : le seul qui sache repondre a « quels sets contiennent ce
-- genre » sur un tableau. Un index classique ne servirait a rien ici.
create index if not exists dj_sets_par_genres_idx
  on public.dj_sets using gin (genre_ids)
  where publie;

create view public.sets_publics
with (security_invoker = on) as
  select
    s.id, s.titre, s.description, s.audio_path, s.duree_s, s.onde, s.ecoutes,
    s.created_at, s.user_id, s.genre_ids,
    a.nom as artiste_nom, a.avatar_path as artiste_avatar
  from public.dj_sets s
  left join public.artistes a on a.user_id = s.user_id
  where s.publie;

comment on view public.sets_publics is
  'Sets publies, avec les styles declares et l''auteur. security_invoker = on : les politiques de dj_sets s''appliquent, les brouillons ne sortent pas.';
