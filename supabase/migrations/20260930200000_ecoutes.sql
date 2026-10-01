-- LES ECOUTES D'UN COMPTE : ce que le micro a reconnu, garde pour son seul
-- proprietaire.
--
-- Mika, le 30 septembre 2026 : « quand la personne est log je voudrais que
-- les recherches historique s'affichent ». L'historique vivait dans le
-- navigateur seulement (sonaa.reconnaissances.v1) : il ne suivait pas d'un
-- telephone a un ordinateur. Connecte, il vit ici ; sans compte, il reste
-- dans le navigateur, comme avant.
--
-- CE QUI EST GARDE, ET RIEN D'AUTRE : la date, les styles reconnus avec leur
-- confiance, et le morceau quand AudD l'a nomme. Jamais le son.
--
-- PERSONNE D'AUTRE NE LIT CES LIGNES, pas meme la moderation : une ecoute
-- dit ou l'on etait et ce qu'on entendait. Les scans publics sont une autre
-- table (scans), anonyme et moderee.

create table public.ecoutes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quand timestamptz not null default now(),
  styles jsonb not null default '[]'::jsonb
    check (jsonb_typeof(styles) = 'array' and jsonb_array_length(styles) <= 5),
  artiste text check (char_length(artiste) <= 300),
  titre text check (char_length(titre) <= 300),
  pochette text check (pochette is null or (pochette like 'https://%' and char_length(pochette) <= 1000))
);

comment on table public.ecoutes is
  'Reconnaissances du micro, par compte. Lisibles, ecrites et effacees par leur seul proprietaire. Jamais le son : la date, les styles, le morceau.';

create index ecoutes_par_compte on public.ecoutes (user_id, quand desc);

alter table public.ecoutes enable row level security;

create policy "ecoutes lues par leur proprietaire" on public.ecoutes
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "ecoutes ajoutees par leur proprietaire" on public.ecoutes
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "ecoutes effacees par leur proprietaire" on public.ecoutes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Aucune politique de mise a jour : une ecoute ne se reecrit pas.
-- Aucun droit pour anon : sans compte, l'historique reste dans le navigateur.
revoke all on public.ecoutes from anon;

-- « SUPPRIMER MES DONNEES » LES EMPORTE AUSSI. La fonction efface ce que le
-- compte a ecrit ; une table qu'elle oublierait serait une promesse a moitie
-- tenue. Meme corps qu'avant, plus une ligne.
create or replace function public.supprimer_mes_donnees()
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  moi uuid := (select auth.uid());
begin
  if moi is null then
    raise exception 'Non connecte.';
  end if;
  delete from public.comment_votes where user_id = moi;
  delete from public.comment_reports where reporter_id = moi;
  delete from public.comments where author_id = moi;
  delete from public.track_votes where user_id = moi;
  delete from public.votes where voter_id = moi;
  delete from public.proposals where author_id = moi;
  delete from public.profiles where user_id = moi;
  delete from public.ecoutes where user_id = moi;
end;
$function$;
