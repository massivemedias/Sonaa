-- L'ADMINISTRATION DU SITE, POUR LE COMPTE DE MIKA.
--
-- Mika, le 10 septembre 2026 : « je veux une interface admin quand je me log
-- avec mauditemachine@gmail.com ». Ce compte est moderateur depuis le 10 aout
-- (table moderators) : c'est ce statut qui ouvre l'administration, pas
-- l'adresse. Une adresse ecrite en dur dans une politique serait a changer
-- le jour ou il en nomme un second, et is_moderator() existe deja.
--
-- DEUX CHOSES MANQUAIENT.
--
-- 1. Les sets. Les politiques de dj_sets ne connaissaient que le proprietaire :
--    un moderateur ne pouvait ni voir un brouillon, ni depublier, ni retirer un
--    set qui pose probleme. Il faut pouvoir le faire le jour ou quelqu'un
--    depose n'importe quoi, et ce jour arrive avec le premier inscrit.
--
-- 2. Les membres. auth.users n'est lisible par aucun role de l'API, et c'est
--    bien. Une fonction en security definer, gardee par is_moderator(), rend
--    la liste : qui s'est inscrit, quand, par quel moyen, avec quel nom
--    d'artiste et combien de sets. Zero ligne a tout autre appelant, comme
--    stats_membres.

-- ═══ 1. LA MODERATION VOIT ET RETIRE LES SETS ═══

create policy "set : la moderation lit tout"
  on public.dj_sets for select
  to authenticated
  using (public.is_moderator());

create policy "set : la moderation modifie"
  on public.dj_sets for update
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

create policy "set : la moderation supprime"
  on public.dj_sets for delete
  to authenticated
  using (public.is_moderator());

-- ═══ 2. LA LISTE DES MEMBRES ═══

create or replace function public.admin_membres()
returns table (
  user_id uuid,
  courriel text,
  inscrit_le timestamptz,
  derniere_connexion timestamptz,
  fournisseurs text,
  artiste_nom text,
  n_sets bigint,
  n_sets_publies bigint,
  n_soirees bigint,
  moderateur boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    (select string_agg(i.provider, ', ' order by i.provider) from auth.identities i where i.user_id = u.id),
    (select a.nom from public.artistes a where a.user_id = u.id),
    (select count(*) from public.dj_sets s where s.user_id = u.id),
    (select count(*) from public.dj_sets s where s.user_id = u.id and s.publie),
    (select count(*) from public.soirees_manuelles m where m.ajoutee_par = u.id),
    exists (select 1 from public.moderators m where m.user_id = u.id)
  from auth.users u
  where public.is_moderator()
  order by u.created_at desc;
$$;

comment on function public.admin_membres() is
  'La liste des comptes, moderateurs seulement. Rend zero ligne a tout autre appelant.';

revoke all on function public.admin_membres() from public;
grant execute on function public.admin_membres() to authenticated;

-- ═══ 3. TOUS LES SETS, PUBLIES OU NON, AVEC LEUR AUTEUR ═══
--
-- La vue sets_publics ne montre que les publies, par construction. La
-- moderation a besoin de l'autre moitie, avec le nom et le courriel de qui a
-- depose : c'est a lui qu'on ecrit si quelque chose cloche.

create or replace function public.admin_sets()
returns table (
  id uuid,
  titre text,
  audio_path text,
  cover_path text,
  duree_s integer,
  ecoutes integer,
  created_at timestamptz,
  publie boolean,
  genre_ids text[],
  user_id uuid,
  artiste_nom text,
  courriel text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id, s.titre, s.audio_path, s.cover_path, s.duree_s, s.ecoutes, s.created_at,
    s.publie, s.genre_ids, s.user_id,
    (select a.nom from public.artistes a where a.user_id = s.user_id),
    (select u.email::text from auth.users u where u.id = s.user_id)
  from public.dj_sets s
  where public.is_moderator()
  order by s.created_at desc;
$$;

comment on function public.admin_sets() is
  'Tous les sets avec leur auteur, moderateurs seulement. Rend zero ligne a tout autre appelant.';

revoke all on function public.admin_sets() from public;
grant execute on function public.admin_sets() to authenticated;
