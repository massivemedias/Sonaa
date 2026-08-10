-- SONAA — 0006 : correction d'une récursion infinie sur update.
--
-- CONSTAT AU BANC : sous le rôle `authenticated`, tout UPDATE sur
-- public.proposals échouait avec
--   « infinite recursion detected in policy for relation "proposals" ».
-- Aucune mise à jour n'était donc possible : ni la correction d'une
-- proposition par son auteur, ni l'acceptation par la modération. La
-- fonctionnalité entière était morte, pas seulement dégradée.
--
-- CAUSE : les politiques d'update de 0003 figeaient le score en le
-- comparant à sa valeur en base :
--     and score = (select p.score from public.proposals p where p.id = ...)
-- Une politique de proposals qui interroge proposals rappelle la politique,
-- qui interroge à nouveau la table. C'est le même piège que sur la table
-- moderators, désamorcé là-bas par une fonction security definer — et
-- reproduit ici sans l'être.
--
-- CORRECTION : on ne surveille pas une colonne qu'on peut simplement ne
-- pas accorder. Le droit UPDATE passe de la table aux colonnes, et score,
-- author_id, author_tag et created_at n'en font pas partie. Postgres refuse
-- alors l'écriture au niveau du privilège, avant toute politique — c'est
-- plus tôt, plus lisible, et sans risque de récursion.

-- ------------------------------------------------- droits d'écriture ciblés

revoke update on public.proposals from authenticated;

-- Ce qu'un connecté peut écrire. Absents et donc intouchables :
--   score        — appartient au trigger de recomptage des votes
--   author_id    — la paternité ne se transfère pas
--   author_tag   — dérivé d'author_id, posé par trigger
--   created_at   — l'horodatage d'origine ne se réécrit pas
-- updated_at est absent aussi : c'est le trigger qui le pose.
grant update (
  kind, genre_id, payload, status,
  moderated_by, moderated_at, moderation_note
) on public.proposals to authenticated;

-- ---------------------------------------------------- politiques réécrites

drop policy if exists proposals_update_own_pending on public.proposals;
drop policy if exists proposals_update_moderator on public.proposals;

-- L'auteur corrige sa proposition tant qu'elle n'est pas tranchée. Le
-- `with check` ne parle plus que de la ligne en cours d'écriture : plus
-- aucune lecture de la table, donc plus aucune récursion possible.
create policy proposals_update_own_pending
  on public.proposals for update
  to authenticated
  using (author_id = (select auth.uid()) and status = 'pending')
  with check (
    author_id = (select auth.uid())
    and status = 'pending'
    and moderated_by is null
    and moderated_at is null
  );

create policy proposals_update_moderator
  on public.proposals for update
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());
