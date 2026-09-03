-- LES VILLES, ET LA VILLE D'ATTACHE D'UN COMPTE.
--
-- Le calendrier interrogeait Resident Advisor avec un identifiant de zone
-- venu de chez eux. Cela marchait tant qu'il n'y avait qu'une source. Des
-- qu'il y en a plusieurs, il faut un referentiel a nous : une ville existe
-- independamment de qui publie ses soirees, et un identifiant RA ne dit ni le
-- fuseau, ni les coordonnees, ni la population.
--
-- CE QUE CETTE TABLE PORTE, ET POURQUOI CHAQUE COLONNE EST LA
--
--   slug          l'adresse partageable, /calendrier?city=montreal-ca
--   name          le nom local, avec ses accents : on est a Montréal
--   name_ascii    le meme sans accents, pour que « montreal » trouve
--                 « Montréal » sans que la recherche ait a normaliser
--   admin_region  pour lever l'ambiguite, Paris en Ontario contre Paris
--   latitude,     le geocodage a venir en aura besoin, et le fuseau se
--   longitude     deduit des coordonnees quand une source ne le donne pas
--   timezone      IANA : les heures s'affichent dans le fuseau du LIEU
--   population    sert au tri des resultats de recherche, rien d'autre
--   ra_area_id    la correspondance chez Resident Advisor, nullable :
--                 une ville peut exister ici sans que RA la couvre
--
-- LES DONNEES NE SONT PAS INVENTEES. Population et coordonnees viennent de
-- Wikidata, relevees le 3 septembre 2026, identifiant Q conserve dans
-- `wikidata` pour pouvoir les rafraichir. Deux identifiants etaient faux au
-- premier jet, Calgary pointait sur La Haye et Halifax sur un temple : un
-- controle de bornes par pays les a trouves. Voir scripts/seed-villes.ts.

create table if not exists public.villes (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  name_ascii    text not null,
  admin_region  text,
  country_code  char(2) not null,
  latitude      numeric(9, 6) not null,
  longitude     numeric(9, 6) not null,
  timezone      text not null,
  population    integer,
  ra_area_id    integer,
  wikidata      text,
  -- Seules les villes actives sont proposees. Retirer une ville de la
  -- recherche ne doit pas casser les liens deja partages qui la nomment.
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- La recherche se fait sur le nom sans accents, en minuscules. L'index le dit
-- explicitement, sinon un `lower(name_ascii) like` balaierait la table.
create index if not exists villes_recherche on public.villes (lower(name_ascii) text_pattern_ops);
create index if not exists villes_population on public.villes (population desc nulls last);

-- LECTURE PUBLIQUE. La liste des villes n'appartient a personne : un visiteur
-- sans compte doit pouvoir choisir la sienne. ECRITURE PAR PERSONNE, sauf le
-- seed, qui passe par la cle de service.
alter table public.villes enable row level security;

drop policy if exists villes_select on public.villes;
create policy villes_select on public.villes for select to anon, authenticated using (true);

revoke all on public.villes from anon, authenticated;
grant select on public.villes to anon, authenticated;

-- ═══ LA VILLE D'ATTACHE D'UN COMPTE ═══
--
-- NULLABLE A DESSEIN. Un compte sans ville choisie est un etat valide, pas
-- une erreur : on ne devine pas, et on n'oblige pas a repondre pour entrer.
--
-- La table `profiles` portait deja `ville` et `pays`, en texte libre, que
-- RIEN dans le code ne lisait ni n'ecrivait. Un vestige. On ne les supprime
-- pas dans la meme migration que l'ajout : si quelque chose les lisait sans
-- qu'on l'ait vu, la panne serait immediate et la cause melangee avec une
-- nouveaute. Elles seront retirees une fois la nouvelle colonne en service.
alter table public.profiles add column if not exists home_city_id uuid references public.villes (id) on delete set null;

comment on column public.profiles.home_city_id is
  'Ville d''attache, choisie explicitement depuis le profil. Nullable : aucune ville est un etat valide. Effacable par la personne elle-meme a tout moment.';

-- Chacun ne voit et ne modifie que sa ligne. Les politiques existantes de
-- `profiles` couvrent deja la colonne ; on verifie seulement que la table est
-- bien fermee, et on accorde la colonne au meme titre que les autres.
grant select (user_id, home_city_id), update (home_city_id) on public.profiles to authenticated;
