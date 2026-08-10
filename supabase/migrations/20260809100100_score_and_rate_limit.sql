-- SONAA — 0002 : recalcul du score, garde anti-abus, horodatage.
--
-- Toutes les fonctions sont `security definer` avec `set search_path = ''`
-- et des noms de tables entièrement qualifiés. Sans ce search_path vide,
-- un rôle appelant peut créer un schéma temporaire contenant une table
-- « proposals » et détourner la fonction ; c'est la recommandation de
-- durcissement de Supabase, et elle coûte une ligne.

-- ------------------------------------------------- score, depuis les votes

create or replace function public.recalc_proposal_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  -- Sur DELETE, la ligne concernée est dans OLD ; ailleurs dans NEW.
  target := coalesce(new.proposal_id, old.proposal_id);

  update public.proposals p
     set score = coalesce((
           select sum(v.value) from public.votes v where v.proposal_id = target
         ), 0)
   where p.id = target;

  return null; -- trigger AFTER : la valeur de retour est ignorée.
end;
$$;

comment on function public.recalc_proposal_score() is
  'Recalcule proposals.score comme la somme des votes. Recalcul complet et non increment : un increment se desynchronise au premier evenement manque.';

-- Un seul trigger pour les trois evenements : le score est toujours vrai,
-- y compris apres un changement de vote (+1 vers -1) ou une suppression.
create trigger votes_recalc_score
  after insert or update or delete on public.votes
  for each row execute function public.recalc_proposal_score();

-- ------------------------------------------ anti-abus : 10 propositions/24 h

create or replace function public.enforce_proposal_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
  quota constant integer := 10;
begin
  -- Fenêtre GLISSANTE de 24 h, pas un compteur journalier : sinon on peut
  -- en poster 10 à 23 h 59 et 10 à 00 h 01.
  select count(*) into recent
    from public.proposals p
   where p.author_id = new.author_id
     and p.created_at > now() - interval '24 hours';

  if recent >= quota then
    -- Message destiné à être affiché tel quel : l'interface le relaie.
    raise exception 'Limite atteinte : % propositions par 24 heures. Reessayez plus tard.', quota
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.enforce_proposal_rate_limit() is
  'Refuse une 11e proposition dans une fenetre glissante de 24 heures. Compte par auteur, pas par adresse IP : l''adresse n''est pas fiable et n''est pas dans le corps de la requete.';

create trigger proposals_rate_limit
  before insert on public.proposals
  for each row execute function public.enforce_proposal_rate_limit();

-- ------------------------------------------------------------- updated_at

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger proposals_touch_updated_at
  before update on public.proposals
  for each row execute function public.touch_updated_at();

-- ------------------------------------ appartenance a la moderation, sans boucle

-- Lue depuis les politiques de moderators elle-même : sans security definer,
-- la politique interrogerait la table qu'elle protège et provoquerait une
-- récursion infinie. C'est le piège classique des RLS sur table de rôles.
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.moderators m where m.user_id = (select auth.uid())
  );
$$;

comment on function public.is_moderator() is
  'Vrai si l''appelant est moderateur. security definer pour eviter la recursion RLS sur la table moderators.';

-- Exécutable par les rôles de l'API, et par personne d'autre.
revoke all on function public.is_moderator() from public;
grant execute on function public.is_moderator() to authenticated;
