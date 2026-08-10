-- SONAA — 0003 : politiques RLS et droits de table.
--
-- Principe : on part de zéro droit et on ouvre le strict nécessaire. Les
-- rôles concernés sont ceux de PostgREST : `anon` (visiteur non connecté)
-- et `authenticated` (session magic link). RLS est déjà activée en 0001.
--
-- Rappel de lecture : une politique `using` filtre les lignes VUES par
-- select/update/delete ; `with check` valide les lignes ÉCRITES par
-- insert/update. Une écriture sans `with check` correspondant est refusée.

-- ------------------------------------------------------------------ droits

-- On révoque d'abord ce que « Automatically expose new tables » a pu
-- accorder, puis on donne explicitement. Sans RLS derrière, ces GRANT ne
-- suffiraient à rien : les deux couches sont nécessaires.
revoke all on public.proposals from anon, authenticated;
revoke all on public.votes from anon, authenticated;
revoke all on public.moderators from anon, authenticated;

grant select on public.proposals to anon, authenticated;
grant insert, update, delete on public.proposals to authenticated;

grant select on public.votes to anon, authenticated;
grant insert, update, delete on public.votes to authenticated;

-- moderators : lecture seule pour les connectés, AUCUNE écriture par l'API.
grant select on public.moderators to authenticated;

-- --------------------------------------------------------------- proposals

-- Lecture. Le site est public : les propositions se lisent sans compte,
-- SAUF les rejetées, qui ne sont visibles que de leur auteur et de la
-- modération. Une proposition rejetée reste une trace de travail, pas un
-- pilori.
create policy proposals_select_public
  on public.proposals for select
  to anon, authenticated
  using (status <> 'rejected');

create policy proposals_select_own_rejected
  on public.proposals for select
  to authenticated
  using (author_id = (select auth.uid()));

create policy proposals_select_moderator
  on public.proposals for select
  to authenticated
  using (public.is_moderator());

-- Écriture. On ne peut proposer QUE pour soi-même : author_id est imposé
-- égal à l'appelant, ce qui empêche de signer au nom d'un autre. Le statut
-- de départ est forcé à 'pending' et le score à 0 : le client ne décide ni
-- de sa propre acceptation ni de son score.
create policy proposals_insert_self
  on public.proposals for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and status = 'pending'
    and score = 0
    and moderated_by is null
    and moderated_at is null
  );

-- Correction par l'auteur, tant que rien n'est tranché. Il ne peut changer
-- ni le propriétaire, ni le statut, ni le score, ni la modération : le
-- `with check` compare aux valeurs existantes de la ligne.
create policy proposals_update_own_pending
  on public.proposals for update
  to authenticated
  using (author_id = (select auth.uid()) and status = 'pending')
  with check (
    author_id = (select auth.uid())
    and status = 'pending'
    and score = (select p.score from public.proposals p where p.id = proposals.id)
    and moderated_by is null
    and moderated_at is null
  );

-- Modération : peut tout changer sur la ligne, y compris le statut. Le
-- score reste hors de portée, il appartient au trigger.
create policy proposals_update_moderator
  on public.proposals for update
  to authenticated
  using (public.is_moderator())
  with check (
    public.is_moderator()
    and score = (select p.score from public.proposals p where p.id = proposals.id)
  );

-- Retrait. L'auteur peut retirer ce qui n'a pas encore été tranché ; la
-- modération peut retirer n'importe quoi.
create policy proposals_delete_own_pending
  on public.proposals for delete
  to authenticated
  using (author_id = (select auth.uid()) and status = 'pending');

create policy proposals_delete_moderator
  on public.proposals for delete
  to authenticated
  using (public.is_moderator());

-- ------------------------------------------------------------------- votes

-- Les compteurs sont publics : le score doit être vérifiable sans compte.
create policy votes_select_public
  on public.votes for select
  to anon, authenticated
  using (true);

-- On vote pour soi, sur une proposition encore ouverte, et JAMAIS sur la
-- sienne. Le dernier point est une sous-requête : une contrainte CHECK ne
-- peut pas interroger une autre table, une politique le peut.
create policy votes_insert_self
  on public.votes for insert
  to authenticated
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.proposals p
       where p.id = votes.proposal_id
         and p.status = 'pending'
         and p.author_id <> (select auth.uid())
    )
  );

-- Changer d'avis : oui, sur son propre vote, tant que la proposition est
-- ouverte. Le votant ne peut pas se transférer le vote d'un autre.
create policy votes_update_own
  on public.votes for update
  to authenticated
  using (voter_id = (select auth.uid()))
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.proposals p
       where p.id = votes.proposal_id and p.status = 'pending'
    )
  );

create policy votes_delete_own
  on public.votes for delete
  to authenticated
  using (voter_id = (select auth.uid()));

-- -------------------------------------------------------------- moderators

-- Chacun voit sa propre ligne, ce qui suffit à l'interface pour savoir si
-- elle doit afficher les outils de modération. Les modérateurs voient la
-- liste entière. AUCUNE politique insert/update/delete : même avec des
-- GRANT, l'écriture est impossible par l'API. On ajoute un modérateur par
-- SQL depuis la console, délibérément.
create policy moderators_select_self
  on public.moderators for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy moderators_select_moderator
  on public.moderators for select
  to authenticated
  using (public.is_moderator());
