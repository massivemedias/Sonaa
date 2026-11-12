-- VINGT VILLES, LES PLUS GRANDES, depuis le 12 novembre 2026 (ADR-118).
--
-- Mika : « reduis beaucoup les villes, garde Montreal, Montpellier, Toulouse
-- et beaucoup d'autres grandes villes, vingt en tout ; les plus petites, tu
-- les flushes ». Huit villes sortent du calendrier, cinq y entrent.
--
-- RIEN N'EST SUPPRIME : une ville qui sort est desactivee (is_active), ses
-- lignes de soirees_manuelles restent, et elle revient d'une ligne si on
-- change d'avis.
--
-- Les zones Resident Advisor des cinq nouvelles ont ete trouvees en
-- interrogeant la passerelle zone par zone et en lisant les adresses des
-- soirees rendues : 337 Lyon (Super5, Le Sucre, 110.Club), 338 Marseille
-- (Unite.22, Cabaret Aleatoire), 62 Belgique (Bruxelles en tete), 41 Madrid,
-- 38 Miami.

update public.villes
set is_active = false
where slug in ('vancouver-ca', 'quebec-ca', 'ottawa-ca', 'calgary-ca', 'winnipeg-ca', 'halifax-ca', 'detroit-us', 'melbourne-au');

insert into public.villes (slug, name, name_ascii, admin_region, country_code, latitude, longitude, timezone, population, ra_area_id, is_active)
values
  ('lyon-fr', 'Lyon', 'Lyon', 'Auvergne-Rhône-Alpes', 'FR', 45.7640, 4.8357, 'Europe/Paris', 522250, 337, true),
  ('marseille-fr', 'Marseille', 'Marseille', 'Provence-Alpes-Côte d''Azur', 'FR', 43.2965, 5.3698, 'Europe/Paris', 873076, 338, true),
  ('bruxelles-be', 'Bruxelles', 'Bruxelles', 'Bruxelles-Capitale', 'BE', 50.8503, 4.3517, 'Europe/Brussels', 1222637, 62, true),
  ('madrid-es', 'Madrid', 'Madrid', 'Communauté de Madrid', 'ES', 40.4168, -3.7038, 'Europe/Madrid', 3332035, 41, true),
  ('miami-us', 'Miami', 'Miami', 'Floride', 'US', 25.7617, -80.1918, 'America/New_York', 449514, 38, true)
on conflict (slug) do update
set is_active = true, ra_area_id = excluded.ra_area_id;
