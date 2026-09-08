-- LES MEMBRES AJOUTENT LEURS SOIREES.
--
-- Jusqu'ici seule l'ecriture des moderateurs etait permise (soirees_ecriture).
-- Demande de Mika du 7 septembre 2026 : un membre connecte peut deposer une
-- soiree, avec affiche, date, heure et lien de billets. Elle porte la source
-- « membre » et son auteur ; il ne gere que les siennes. Les moderateurs
-- gardent tout par la politique existante.

create policy soirees_membre_insert on public.soirees_manuelles
  for insert to authenticated
  with check (source = 'membre' and ajoutee_par = (select auth.uid()));

create policy soirees_membre_update on public.soirees_manuelles
  for update to authenticated
  using (source = 'membre' and ajoutee_par = (select auth.uid()))
  with check (source = 'membre' and ajoutee_par = (select auth.uid()));

create policy soirees_membre_delete on public.soirees_manuelles
  for delete to authenticated
  using (source = 'membre' and ajoutee_par = (select auth.uid()));

-- Un membre voit les siennes meme si un moderateur les a depubliees : il
-- doit pouvoir les retrouver pour les corriger ou les retirer.
create policy soirees_membre_lecture on public.soirees_manuelles
  for select to authenticated
  using (ajoutee_par = (select auth.uid()));

-- PLAFOND : vingt soirees par membre et par jour. Ce n'est pas une limite
-- d'usage, personne n'en depose vingt ; c'est une limite de degats si un
-- compte est detourne pour remplir le calendrier.
create or replace function public.plafond_soirees_membre()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source = 'membre' and (
    select count(*) from public.soirees_manuelles
    where ajoutee_par = new.ajoutee_par
      and created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'Trop de soirées ajoutées aujourd’hui. Réessayez demain.';
  end if;
  return new;
end
$$;

revoke all on function public.plafond_soirees_membre() from public;

create trigger soirees_membre_plafond
  before insert on public.soirees_manuelles
  for each row execute function public.plafond_soirees_membre();
