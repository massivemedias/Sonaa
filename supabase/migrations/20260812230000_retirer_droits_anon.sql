-- SONAA — 0012 : l'anonyme n'a plus aucun droit de table sur les profils.
--
-- ÉCRIT, NON APPLIQUÉ. Montré avant application, comme d'habitude.
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QUE LE BANC DE SÉCURITÉ A TROUVÉ
-- ─────────────────────────────────────────────────────────────────────────
--
-- Les neuf contrôles de comportement passent : un anonyme lit zéro ligne de
-- `profiles`, ne peut rien y écrire, et ne peut pas se nommer modérateur. La
-- protection tient.
--
-- Mais elle ne tient QUE par la sécurité au niveau des lignes. Le rôle `anon`
-- possède **sept droits de table** sur `profiles` : Supabase accorde par
-- défaut tous les droits à `anon` et `authenticated` sur le schéma public, et
-- la table hérite de ce défaut à sa création.
--
-- Aujourd'hui, aucune politique ne s'applique à `anon` : il ne correspond donc
-- à rien et n'obtient rien. C'est correct, et c'est fragile. Le jour où
-- quelqu'un désactive la sécurité au niveau des lignes une minute pour
-- déboguer, ou ajoute une politique `to public` par distraction, la table
-- devient lisible par le monde entier, avec les villes de tout le monde.
--
-- DEUX VERROUS VALENT MIEUX QU'UN, et le second ne coûte rien : on retire les
-- droits de table à l'anonyme. La sécurité au niveau des lignes reste la
-- protection principale ; ceci est la ceinture qui double la bretelle.
--
-- Ce que cela NE change pas : un anonyme n'a jamais eu de profil à lire, et il
-- ne peut pas s'en créer un, puisqu'un profil pend à un compte.

revoke all on table public.profiles from anon;

comment on table public.profiles is
  'Localisation FACULTATIVE, declaree par la personne elle-meme. Ville et pays seulement, jamais de coordonnees ni d''adresse. Lisible et modifiable par son seul proprietaire : meme les moderateurs n''ont pas acces aux lignes, seulement a des agregats seuillees (voir stats_villes). Le role anonyme n''a AUCUN droit de table dessus, en plus de la securite au niveau des lignes.';

-- Contrôle : doit rendre zéro. À lire avant de considérer la migration faite.
select count(*) as droits_anon_restants
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public' and table_name = 'profiles';
