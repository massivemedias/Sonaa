-- ═══ LA VILLE D'ATTACHE DANS LA LISTE DES COMPTES ═══
--
-- Mika, 4 octobre 2026 : « je voudrais savoir d'où ils viennent, je veux
-- voir la ville affichée ». La ville d'attache, choisie par la personne
-- elle-même depuis son profil (profiles.home_city_id), devient visible de
-- la moderation, compte par compte, dans la liste des comptes. La politique
-- de confidentialite le dit desormais (src/langue/langue.ts,
-- confidentialiteCollecteCorps).
--
-- RIEN N'EST DEVINE. Sans ville choisie, les deux colonnes restent vides :
-- ni adresse IP, ni mesure d'audience, ni croisement d'heures. Localiser une
-- personne identifiee sans l'en avoir informee au prealable et sans son
-- accord est ce que la Loi 25 interdit ; la ville d'attache, elle, est
-- donnee, et effacable a tout moment par la personne.
--
-- La table profiles reste fermee : les moderateurs n'y lisent toujours
-- aucune ligne. Seule la fonction admin_membres, en security definer et
-- gardee par is_moderator(), rend la ville de chaque compte.

-- Le type de retour change : la fonction se recree.
drop function if exists public.admin_membres();

create function public.admin_membres()
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
  moderateur boolean,
  ville text,
  pays text
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
    exists (select 1 from public.moderators m where m.user_id = u.id),
    v.name,
    v.country_code::text
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  left join public.villes v on v.id = p.home_city_id
  where public.is_moderator()
  order by u.created_at desc;
$$;

comment on function public.admin_membres() is
  'La liste des comptes, moderateurs seulement, avec la ville d''attache que chacun a choisie (vide sinon, jamais devinee). Rend zero ligne a tout autre appelant.';

revoke all on function public.admin_membres() from public;
grant execute on function public.admin_membres() to authenticated;

comment on table public.profiles is
  'Localisation FACULTATIVE, declaree par la personne elle-meme : la ville d''attache (home_city_id). Lisible et modifiable par son seul proprietaire ; la moderation la voit compte par compte par la fonction admin_membres (4 octobre 2026), la politique de confidentialite le dit. Jamais devinee.';
