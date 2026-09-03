-- LA FILE DE MODÉRATION DES COMMENTAIRES N'A JAMAIS PU ÊTRE LUE.
--
-- Symptôme : « permission denied for table comments », en rouge, sur
-- #/moderation, pour un modérateur authentifié. Reproduit dans le navigateur
-- avec un compte de banc inscrit dans public.moderators.
--
-- Cause. La vue comments_moderation est en security_invoker, donc exécutée
-- avec les droits de l'appelant, et elle sélectionne c.reports_count. Or la
-- migration 20260811200000 accorde le select COLONNE PAR COLONNE sur
-- public.comments et exclut délibérément reports_count : le laisser lisible
-- montrait à tout le monde quels commentaires sont signalés, ce qui invite au
-- pilonnage. Les deux décisions étaient bonnes séparément et incompatibles
-- ensemble.
--
-- Correction. La vue passe en security_invoker = off. Ce n'est pas un
-- relâchement : ce qui protégeait cette vue n'a jamais été la RLS de
-- l'appelant, mais sa clause `where public.is_moderator()`, qui rend zéro
-- ligne à qui n'est pas modérateur et qui repose sur auth.uid(), donc sur le
-- jeton de l'appelant, security_invoker ou non. La vue ne porte toujours pas
-- author_id, et reports_count reste refusé sur la table elle-même : un
-- non-modérateur n'apprend rien de plus qu'avant.

create or replace view public.comments_moderation
with (security_invoker = off) as
  select
    c.id,
    c.genre_id,
    c.auteur,
    c.body,
    c.score,
    c.reports_count,
    c.masque,
    c.created_at,
    (select array_agg(r.motif) from public.comment_reports r where r.comment_id = c.id) as motifs
  from public.comments c
  where public.is_moderator()
    and (c.reports_count > 0 or c.masque)
  order by c.reports_count desc, c.created_at desc;

comment on view public.comments_moderation is
  'File de moderation : signales et masques. Rend zero ligne a qui n''est pas moderateur (clause where, is_moderator). En security_invoker = off parce que reports_count n''est pas lisible sur la table. author_id n''y figure pas.';

grant select on public.comments_moderation to authenticated;
revoke all on public.comments_moderation from anon;
