-- UN COURRIEL A MIKA quand quelqu'un s'inscrit ou depose un set.
--
-- Mika, le 14 septembre 2026 : « quand un nouvel utilisateur s'inscrit
-- j'aimerais recevoir un courriel a massivemedias@gmail.com, pareil quand
-- un user upload un set ».
--
-- COMMENT CA MARCHE. Deux declencheurs, sur auth.users et sur dj_sets,
-- appellent la passerelle sonaa-sets (route api/notifier) par pg_net, avec
-- un secret partage garde dans le coffre (vault, nom « sonaa_notifier »).
-- La passerelle envoie le courriel par l'envoi de Cloudflare (Email
-- Sending), depuis bonjour@sonaa.ca. Un courriel qui ne part pas ne bloque
-- jamais l'inscription ni le depot : la fonction avale l'erreur.
--
-- LE SECRET N'EST PAS ICI. Il a ete pose une fois dans le coffre et sur la
-- passerelle (wrangler secret put NOTIFIER_SECRET). Pour le changer :
--   select vault.update_secret(id, '<nouveau>') from vault.secrets where name = 'sonaa_notifier';
-- puis le meme sur la passerelle.

create extension if not exists pg_net with schema extensions;

-- select vault.create_secret('<secret>', 'sonaa_notifier', 'Secret partage avec la passerelle sonaa-sets, route api/notifier');

create or replace function public.notifier_mika(sujet text, texte text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'sonaa_notifier' limit 1;
  if secret is null then return; end if;
  perform net.http_post(
    url := 'https://sonaa-sets.massivemedias.workers.dev/api/notifier',
    headers := jsonb_build_object('content-type', 'application/json', 'x-sonaa-secret', secret),
    body := jsonb_build_object('sujet', sujet, 'texte', texte),
    timeout_milliseconds := 8000
  );
exception when others then
  null;
end;
$$;

revoke all on function public.notifier_mika(text, text) from public;

create or replace function public.notifier_inscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notifier_mika(
    'SONAA : nouveau membre ' || coalesce(new.email, '?'),
    'Un nouveau compte vient d''etre cree sur sonaa.ca.' || E'\n\n'
      || 'Courriel : ' || coalesce(new.email, '?') || E'\n'
      || 'Moyen : ' || coalesce(new.raw_app_meta_data->>'provider', '?') || E'\n'
      || 'Quand : ' || to_char(now() at time zone 'America/Montreal', 'YYYY-MM-DD HH24:MI') || ' (Montreal)' || E'\n\n'
      || 'La liste des membres : https://sonaa.ca/#/admin'
  );
  return new;
end;
$$;

drop trigger if exists notifier_inscription on auth.users;
create trigger notifier_inscription
  after insert on auth.users
  for each row execute function public.notifier_inscription();

create or replace function public.notifier_set()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  courriel text;
  artiste text;
begin
  select u.email into courriel from auth.users u where u.id = new.user_id;
  select a.nom into artiste from public.artistes a where a.user_id = new.user_id;
  perform public.notifier_mika(
    'SONAA : nouveau set « ' || coalesce(new.titre, '?') || ' » par ' || coalesce(artiste, courriel, '?'),
    'Un set vient d''etre depose sur sonaa.ca.' || E'\n\n'
      || 'Titre : ' || coalesce(new.titre, '?') || E'\n'
      || 'Artiste : ' || coalesce(artiste, '(sans nom d''artiste)') || E'\n'
      || 'Compte : ' || coalesce(courriel, '?') || E'\n'
      || 'Duree : ' || coalesce((new.duree_s / 60)::text || ' min', '?') || E'\n'
      || 'Publie : ' || case when new.publie then 'oui' else 'non, brouillon' end || E'\n'
      || 'Quand : ' || to_char(now() at time zone 'America/Montreal', 'YYYY-MM-DD HH24:MI') || ' (Montreal)' || E'\n\n'
      || 'Ecouter : https://sonaa.ca/#/sets/' || new.id::text || E'\n'
      || 'Tous les sets : https://sonaa.ca/#/admin/sets'
  );
  return new;
end;
$$;

drop trigger if exists notifier_set on public.dj_sets;
create trigger notifier_set
  after insert on public.dj_sets
  for each row execute function public.notifier_set();
