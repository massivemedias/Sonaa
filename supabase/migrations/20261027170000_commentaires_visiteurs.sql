-- LES VISITEURS NE VOYAIENT AUCUN COMMENTAIRE. Releve le 27 octobre 2026 :
-- la page d'une mixtape recevait un refus 401 sur set_commentaires_publics
-- pour toute personne non connectee. La regle de lecture appelait
-- is_moderator(), que le role anon n'a pas le droit d'executer : Postgres
-- refuse toute la requete au lieu de juger la condition fausse.
--
-- La regle se coupe en deux. Le visiteur lit ce qui est visible sur une
-- mixtape publiee ; le membre connecte garde la regle complete (les siens,
-- et tout pour le moderateur). On n'ouvre pas is_moderator() a anon : une
-- fonction SECURITY DEFINER de moins appelable sans compte.
drop policy if exists "commentaire : lu s'il est visible" on public.set_commentaires;

create policy "commentaire : le visiteur lit ce qui est visible"
  on public.set_commentaires for select to anon
  using (not masque and exists (select 1 from public.dj_sets s where s.id = set_id and s.publie));

create policy "commentaire : lu s'il est visible"
  on public.set_commentaires for select to authenticated
  using (
    (not masque and exists (select 1 from public.dj_sets s where s.id = set_id and s.publie))
    or user_id = (select auth.uid())
    or public.is_moderator()
  );
