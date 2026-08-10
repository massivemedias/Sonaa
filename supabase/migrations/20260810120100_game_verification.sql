-- SONAA — jeu : la vérification d'une partie, et les politiques.
--
-- Cinq contrôles. Deux sont DURS (leur échec interdit la victoire), trois
-- sont MOUS (leur échec met la partie « à vérifier », jamais rejetée). La
-- distinction n'est pas une politesse : un contrôle mou porte sur ce qui
-- est improbable, pas sur ce qui est impossible, et refuser sèchement une
-- partie improbable revient à punir le très bon joueur.

-- Les seuils, isolés pour être relus et discutés sans lire le code.
create table public.game_reglages (
  id boolean primary key default true check (id),
  /* Durée plancher d'une victoire. 218 astéroïdes : même en enchaînant
     sans une erreur, il faut le temps que les tirs voyagent. Calculé sur
     une base d'environ 1,1 s par astéroïde, arrondi vers le bas. */
  duree_min_secondes integer not null default 240,
  /* Intervalle sous lequel deux destructions consécutives ne sont plus
     humaines. La cadence de tir plafonne autour de quatre par seconde. */
  intervalle_min_ms integer not null default 120,
  /* Part tolérée d'intervalles sous le seuil : un joueur qui prend deux
     astéroïdes coup sur coup est normal, la moitié de la partie ne l'est
     pas. */
  part_rafales_toleree numeric not null default 0.05
);
insert into public.game_reglages (id) values (true) on conflict (id) do nothing;

alter table public.game_reglages enable row level security;

-- ------------------------------------------------------------ vérification

create or replace function public.game_verifier(session uuid)
returns table (statut text, verdict text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  r record;
  total_genres integer;
  kills integer;
  orphelins integer;
  desordre integer;
  duree numeric;
  rafales integer;
  intervalles integer;
  motifs text[] := array[]::text[];
begin
  select * into s from public.game_sessions where id = session;
  select * into r from public.game_reglages limit 1;
  select count(*) into total_genres from public.game_genres;
  select count(*) into kills from public.game_kills where session_id = session;

  -- ---------------------------------------------------------- DUR 1 : le compte
  -- Une victoire, c'est TOUT le corpus détruit. Pas un de moins.
  if kills < total_genres then
    return query select 'perdue'::text,
      format('Partie incomplete : %s genres sur %s.', kills, total_genres);
    return;
  end if;

  -- ---------------------------------------------- DUR 2 : l'ordre suit l'arbre
  /* Un genre ne peut être détruit qu'après son parent : c'est la
     fragmentation qui le libère. Une partie qui détruit un sous-genre
     avant son parent n'a pas été jouée, elle a été fabriquée. */
  select count(*) into desordre
    from public.game_kills k
    join public.game_genres g on g.id = k.genre_id
    join public.game_kills kp on kp.session_id = k.session_id and kp.genre_id = g.parent
   where k.session_id = session
     and g.parent is not null
     and kp.ordre > k.ordre;

  select count(*) into orphelins
    from public.game_kills k
    join public.game_genres g on g.id = k.genre_id
   where k.session_id = session
     and g.parent is not null
     and not exists (
       select 1 from public.game_kills kp
        where kp.session_id = k.session_id and kp.genre_id = g.parent
     );

  if desordre > 0 or orphelins > 0 then
    return query select 'a_verifier'::text,
      format('Ordre incoherent avec l''arbre : %s enfant(s) avant leur parent, %s sans parent detruit.',
             desordre, orphelins);
    return;
  end if;

  -- --------------------------------------------------------- MOU 1 : la durée
  duree := extract(epoch from (now() - s.started_at));
  if duree < r.duree_min_secondes then
    motifs := motifs || format('duree de %s s, sous le plancher de %s s',
                               round(duree), r.duree_min_secondes);
  end if;

  -- ------------------------------------------------------- MOU 2 : la cadence
  select count(*) filter (where ecart < r.intervalle_min_ms), count(*)
    into rafales, intervalles
    from (
      select extract(epoch from (at - lag(at) over (order by at))) * 1000 as ecart
        from public.game_kills where session_id = session
    ) e
   where ecart is not null;

  if intervalles > 0 and rafales::numeric / intervalles > r.part_rafales_toleree then
    motifs := motifs || format('%s intervalles sur %s sous %s ms',
                               rafales, intervalles, r.intervalle_min_ms);
  end if;

  -- --------------------------------------------- MOU 3 : la partie a une fin
  /* Un client qui n'a jamais signalé la moindre perte de vie sur 218
     astéroïdes n'est pas impossible, il est remarquable. On le note. */
  if s.vies_restantes = 3 and duree < r.duree_min_secondes * 2 then
    motifs := motifs || 'aucune vie perdue sur la partie entiere';
  end if;

  if array_length(motifs, 1) > 0 then
    return query select 'a_verifier'::text,
      'A verifier : ' || array_to_string(motifs, ' ; ') || '.';
    return;
  end if;

  return query select 'gagnee'::text,
    format('Partie complete en %s s, ordre conforme a l''arbre.', round(duree));
end;
$$;

comment on function public.game_verifier(uuid) is
  'Verifie une partie et rend le statut qu''elle merite. Deux controles durs (compte, ordre), trois mous (duree, cadence, vies). Ne modifie rien.';

-- --------------------------------------------------- clôture par le serveur

/* LE SEUL CHEMIN par lequel une partie se termine. Le client ne peut pas
   écrire 'gagnee' : aucune politique ne le lui permet, et cette fonction
   est la seule à en avoir le droit. Elle appelle la vérification et pose
   ce que celle-ci a décidé. */
create or replace function public.game_terminer(session uuid, abandon boolean default false)
returns table (statut text, verdict text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  v record;
begin
  select * into s from public.game_sessions where id = session;
  if s is null then
    raise exception 'Partie inconnue.' using errcode = 'check_violation';
  end if;
  if s.user_id <> (select auth.uid()) then
    raise exception 'Cette partie n''est pas la votre.' using errcode = 'insufficient_privilege';
  end if;
  if s.statut <> 'en_cours' then
    -- Rejouer la clôture ne doit rien changer, ni lever d'erreur.
    return query select s.statut, coalesce(s.verdict, '');
    return;
  end if;

  if abandon then
    update public.game_sessions
       set statut = 'abandonnee', ended_at = now(), verdict = 'Partie quittee.'
     where id = session;
    return query select 'abandonnee'::text, 'Partie quittee.'::text;
    return;
  end if;

  select * into v from public.game_verifier(session);

  /* L'index unique interdit un second gain. On l'anticipe plutôt que de
     laisser remonter une erreur de contrainte : la deuxième victoire est
     réelle, elle ne donne simplement pas droit deux fois. */
  if v.statut = 'gagnee'
     and exists (select 1 from public.game_sessions
                  where user_id = s.user_id and statut = 'gagnee' and id <> session) then
    update public.game_sessions
       set statut = 'a_verifier', ended_at = now(),
           verdict = 'Partie gagnee, mais ce compte a deja une victoire enregistree.'
     where id = session;
    return query select 'a_verifier'::text,
      'Partie gagnee, mais ce compte a deja une victoire enregistree.'::text;
    return;
  end if;

  update public.game_sessions
     set statut = v.statut, ended_at = now(), verdict = v.verdict
   where id = session;

  return query select v.statut, v.verdict;
end;
$$;

comment on function public.game_terminer(uuid, boolean) is
  'Seul chemin de cloture d''une partie. Le client ne pose jamais le statut lui-meme.';

-- -------------------------------------------------------------- les droits

revoke all on public.game_familles from anon, authenticated;
revoke all on public.game_genres from anon, authenticated;
revoke all on public.game_sessions from anon, authenticated;
revoke all on public.game_kills from anon, authenticated;
revoke all on public.game_reglages from anon, authenticated;

-- L'arbre est public en lecture : il est déjà dans le bundle du site.
grant select on public.game_familles to anon, authenticated;
grant select on public.game_genres to anon, authenticated;

/* Sur les sessions, le client n'obtient QUE ce dont il a besoin : ouvrir
   une partie et lire les siennes. Ni update, ni delete : une partie ne se
   corrige pas, elle se termine par la fonction. */
grant select on public.game_sessions to authenticated;
grant insert (user_id) on public.game_sessions to authenticated;
grant update (vies_restantes) on public.game_sessions to authenticated;

grant select on public.game_kills to authenticated;
grant insert (session_id, ordre, genre_id) on public.game_kills to authenticated;

-- ----------------------------------------------------------- les politiques

create policy game_sessions_select_own
  on public.game_sessions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy game_sessions_insert_self
  on public.game_sessions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

/* La seule mise à jour permise est la perte d'une vie, et seulement sur
   une partie en cours. Le grant de colonne fait déjà l'essentiel ; la
   politique ajoute que la partie doit être à soi et vivante. */
create policy game_sessions_update_own_en_cours
  on public.game_sessions for update
  to authenticated
  using (user_id = (select auth.uid()) and statut = 'en_cours')
  with check (user_id = (select auth.uid()) and statut = 'en_cours');

create policy game_kills_select_own
  on public.game_kills for select
  to authenticated
  using (exists (
    select 1 from public.game_sessions s
     where s.id = game_kills.session_id and s.user_id = (select auth.uid())
  ));

create policy game_kills_insert_own_en_cours
  on public.game_kills for insert
  to authenticated
  with check (exists (
    select 1 from public.game_sessions s
     where s.id = game_kills.session_id
       and s.user_id = (select auth.uid())
       and s.statut = 'en_cours'
  ));

-- L'arbre se lit, ne s'écrit pas par l'API. Il vient du script.
create policy game_genres_select_public
  on public.game_genres for select to anon, authenticated using (true);
create policy game_familles_select_public
  on public.game_familles for select to anon, authenticated using (true);

-- game_reglages : aucune politique. Les seuils ne se lisent que côté serveur.

revoke all on function public.game_verifier(uuid) from public, anon, authenticated;
revoke all on function public.game_terminer(uuid, boolean) from public, anon;
grant execute on function public.game_terminer(uuid, boolean) to authenticated;

-- ------------------------------------------------- le tableau des scores

/* Pseudonyme haché, jamais l'email : la même règle que pour les
   propositions, et la même fonction. */
create or replace view public.game_scores
with (security_invoker = off)
as
  select
    public.author_tag(s.user_id) as joueur,
    count(*) filter (where s.statut = 'gagnee') as victoires,
    min(extract(epoch from (s.ended_at - s.started_at)))
      filter (where s.statut = 'gagnee') as meilleur_temps_s,
    max(s.genres_detruits) as meilleur_score,
    count(*) as parties
  from public.game_sessions s
  where s.statut in ('gagnee', 'perdue', 'abandonnee')
  group by s.user_id
  having count(*) filter (where s.statut = 'gagnee') > 0
      or max(s.genres_detruits) > 0;

/* security_invoker = OFF ici, à l'inverse de proposals_public, et c'est
   délibéré : le tableau des scores agrège les parties de TOUT LE MONDE,
   alors que la RLS de game_sessions ne montre à chacun que les siennes.
   Une vue qui appliquerait la RLS de l'appelant n'afficherait donc que son
   propre score, ce qui n'est pas un classement. La vue ne rend que des
   agrégats et un pseudonyme haché : aucune ligne individuelle, aucun
   identifiant de compte, aucune partie « à vérifier » (elle n'est pas dans
   la liste des statuts retenus). */

comment on view public.game_scores is
  'Classement public : pseudonyme hache, victoires, meilleur temps. Agrege, jamais nominatif. Les parties a_verifier en sont exclues.';

grant select on public.game_scores to anon, authenticated;
