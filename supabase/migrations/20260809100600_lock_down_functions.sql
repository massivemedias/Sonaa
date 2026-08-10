-- SONAA — 0007 : refermer l'exécution des fonctions internes.
--
-- CONSTAT : l'analyseur de sécurité de Supabase signale que les six
-- fonctions du schéma public sont appelables en RPC par `anon`, y compris
-- les quatre fonctions de trigger, et vérification faite au catalogue
-- (has_function_privilege) c'est exact.
--
-- POURQUOI le revoke de 0002 n'a pas suffi : il visait le pseudo-rôle
-- PUBLIC. Or Supabase installe des privilèges par défaut qui accordent
-- EXECUTE nominativement à anon et authenticated sur toute fonction créée
-- dans le schéma public. Révoquer PUBLIC laisse donc intacts deux GRANT
-- nominatifs — c'est pour cette raison que is_moderator() restait ouvert
-- à l'anonyme alors que 0002 croyait l'avoir fermé.
--
-- Révoquer EXECUTE ne désarme pas les triggers : PostgreSQL contrôle ce
-- privilège au moment où le trigger est CRÉÉ, pas à chaque déclenchement.
-- Le point est vérifié au banc après application.

-- Fonctions de trigger : rien ni personne ne doit les appeler directement.
revoke execute on function public.recalc_proposal_score()      from public, anon, authenticated;
revoke execute on function public.enforce_proposal_rate_limit() from public, anon, authenticated;
revoke execute on function public.touch_updated_at()            from public, anon, authenticated;
revoke execute on function public.set_author_tag()              from public, anon, authenticated;

-- is_moderator() : l'interface s'en sert pour décider d'afficher les
-- outils de modération. Un anonyme n'en est jamais, la réponse serait
-- toujours fausse ; on lui retire l'appel plutôt que de lui répondre.
revoke execute on function public.is_moderator() from public, anon;
grant  execute on function public.is_moderator() to authenticated;

-- my_tag() : renvoie null hors session, donc sans intérêt pour l'anonyme.
revoke execute on function public.my_tag() from public, anon;
grant  execute on function public.my_tag() to authenticated;

-- Et pour que la prochaine fonction créée ici ne rouvre pas la porte
-- toute seule, on change le défaut au lieu de compter sur la vigilance.
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke execute on functions from authenticated;
