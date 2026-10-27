-- LA MISE EN AVANT PAYANTE D'UNE SOIREE. Mika, le 27 octobre 2026, a choisi
-- de faire payer les organisateurs plutot que les visiteurs : une soiree
-- mise en avant passe en tete du calendrier de sa ville, dans la banniere
-- d'accueil et sur la carte, avec la mention « Mise en avant », jusqu'au
-- jour de la soiree. Voir docs/adr/ADR-109-mise-en-avant-payante.md.
--
-- PERSONNE N'ECRIT ICI PAR L'API PUBLIQUE. La demande et le paiement passent
-- par la passerelle (worker, routes api/mise-en-avant/*), qui presente son
-- secret : c'est celui de la mesure, dont seule l'empreinte est en base
-- (table mesure_cle). Le visiteur ne lit que ce qui est actif, et sans le
-- nom ni le courriel de l'organisateur. La moderation voit tout et peut
-- offrir ou retirer.
--
-- LE PRIX EST EN BASE, PAS DANS LE CODE : une ligne de tarif, en cents
-- canadiens, que la fonction `devis_mise_en_avant` applique au nombre de
-- jours restant jusqu'a la soiree.

create table if not exists public.mise_en_avant_tarif (
  id boolean primary key default true check (id),
  prix_jour integer not null check (prix_jour between 0 and 100000),
  minimum integer not null check (minimum between 0 and 100000),
  maximum integer not null check (maximum between 0 and 100000),
  check (minimum <= maximum)
);
alter table public.mise_en_avant_tarif enable row level security;
insert into public.mise_en_avant_tarif (prix_jour, minimum, maximum)
values (200, 500, 3000)
on conflict (id) do nothing;

create table if not exists public.mises_en_avant (
  id uuid primary key default gen_random_uuid(),
  cree timestamptz not null default now(),
  -- L'identifiant de la soiree dans le calendrier : celui de Resident
  -- Advisor, ou « main:<uuid> » pour les autres sources.
  soiree_id text not null check (char_length(soiree_id) between 1 and 120),
  ville text not null check (ville ~ '^[a-z0-9-]{2,60}$'),
  titre text not null check (char_length(titre) between 1 and 200),
  quand timestamptz not null,
  fin timestamptz not null,
  jours integer not null check (jours between 1 and 400),
  montant integer not null check (montant between 0 and 100000),
  nom text not null check (char_length(nom) between 1 and 120),
  courriel text not null check (char_length(courriel) between 3 and 200 and courriel ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text check (message is null or char_length(message) <= 1000),
  langue text not null default 'fr' check (langue in ('fr', 'en')),
  statut text not null default 'demandee' check (statut in ('demandee', 'payee', 'offerte', 'retiree')),
  stripe_session text unique check (stripe_session is null or char_length(stripe_session) <= 200),
  payee timestamptz
);
create index if not exists mises_en_avant_ville_idx on public.mises_en_avant (ville, fin);
alter table public.mises_en_avant enable row level security;
revoke all on public.mises_en_avant from anon, authenticated;
revoke all on public.mise_en_avant_tarif from anon, authenticated;

-- ═══ LA SERRURE DE LA PASSERELLE ═══
create or replace function public.secret_de_la_passerelle(secret text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mesure_cle c
     where c.empreinte = encode(extensions.digest(coalesce(secret, ''), 'sha256'), 'hex')
  );
$$;
revoke all on function public.secret_de_la_passerelle(text) from public, anon, authenticated;

-- ═══ LE DEVIS ═══ La mise en avant court jusqu'a douze heures apres le debut
-- de la soiree. Le prix est le nombre de jours entames jusque-la, au tarif du
-- jour, borne par le minimum et le maximum.
--
-- Le debut arrive souvent sans fuseau (Resident Advisor donne l'heure de la
-- salle) et la base le lit en UTC : a Montreal, quatre ou cinq heures plus
-- tot qu'en vrai. Les douze heures couvrent l'ecart, et la soiree reste en
-- tete jusqu'a sa fin.
create or replace function public.devis_mise_en_avant(quand timestamptz)
returns table (jours integer, montant integer, fin timestamptz)
language sql stable security definer set search_path = '' as $$
  with f as (select quand + interval '12 hours' as fin),
       j as (select greatest(1, ceil(extract(epoch from (f.fin - now())) / 86400.0)::integer) as jours, f.fin from f)
  select j.jours,
         least(t.maximum, greatest(t.minimum, j.jours * t.prix_jour)),
         j.fin
    from j, public.mise_en_avant_tarif t
   where j.fin > now();
$$;
revoke all on function public.devis_mise_en_avant(timestamptz) from public;
grant execute on function public.devis_mise_en_avant(timestamptz) to anon, authenticated;

-- ═══ LA DEMANDE, par la passerelle ═══
create or replace function public.demander_mise_en_avant(
  secret text, soiree_id text, ville text, titre text, quand timestamptz,
  nom text, courriel text, message text, langue text
)
returns table (id uuid, jours integer, montant integer, fin timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  d record;
  nouvel uuid;
begin
  if not public.secret_de_la_passerelle(secret) then
    raise exception 'secret refuse' using errcode = 'insufficient_privilege';
  end if;
  -- Un plafond global contre l'inondation : chaque demande ecrit a Mika.
  if (select count(*) from public.mises_en_avant m where m.cree > now() - interval '1 hour') >= 30 then
    raise exception 'trop de demandes' using errcode = 'program_limit_exceeded';
  end if;
  select * into d from public.devis_mise_en_avant(quand);
  if not found then
    raise exception 'soiree passee' using errcode = 'check_violation';
  end if;
  insert into public.mises_en_avant (soiree_id, ville, titre, quand, fin, jours, montant, nom, courriel, message, langue)
  values (
    left(trim(soiree_id), 120), ville, left(trim(titre), 200), quand, d.fin, d.jours, d.montant,
    left(trim(nom), 120), lower(trim(courriel)), nullif(left(trim(coalesce(message, '')), 1000), ''),
    case when langue = 'en' then 'en' else 'fr' end
  )
  returning mises_en_avant.id into nouvel;
  return query select nouvel, d.jours, d.montant, d.fin;
end; $$;
revoke all on function public.demander_mise_en_avant(text, text, text, text, timestamptz, text, text, text, text) from public;
grant execute on function public.demander_mise_en_avant(text, text, text, text, timestamptz, text, text, text, text) to anon, authenticated;

-- La session de paiement ouverte chez Stripe pour cette demande.
create or replace function public.noter_session_mise_en_avant(secret text, mise uuid, session text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.secret_de_la_passerelle(secret) then
    raise exception 'secret refuse' using errcode = 'insufficient_privilege';
  end if;
  update public.mises_en_avant set stripe_session = session where id = mise and statut = 'demandee';
end; $$;
revoke all on function public.noter_session_mise_en_avant(text, uuid, text) from public;
grant execute on function public.noter_session_mise_en_avant(text, uuid, text) to anon, authenticated;

-- ═══ LE PAIEMENT, constate par la passerelle chez Stripe ═══ Rend la ligne
-- quand elle vient de passer a « payee », rien si elle l'etait deja : la
-- passerelle n'ecrit a Mika qu'une fois.
create or replace function public.payer_mise_en_avant(secret text, session text, paye integer)
returns table (id uuid, titre text, ville text, montant integer, nom text, courriel text, fin timestamptz, langue text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.secret_de_la_passerelle(secret) then
    raise exception 'secret refuse' using errcode = 'insufficient_privilege';
  end if;
  return query
  update public.mises_en_avant m
     set statut = 'payee', payee = now()
   where m.stripe_session = session and m.statut = 'demandee' and paye >= m.montant
  returning m.id, m.titre, m.ville, m.montant, m.nom, m.courriel, m.fin, m.langue;
end; $$;
revoke all on function public.payer_mise_en_avant(text, text, integer) from public;
grant execute on function public.payer_mise_en_avant(text, text, integer) to anon, authenticated;

-- ═══ CE QUE LE VISITEUR LIT ═══ Les soirees mises en avant d'une ville, en
-- ce moment. Ni nom, ni courriel, ni montant.
create or replace function public.mises_en_avant_de(ville text)
returns table (soiree_id text, fin timestamptz)
language sql stable security definer set search_path = '' as $$
  select distinct on (m.soiree_id) m.soiree_id, m.fin
    from public.mises_en_avant m
   where m.ville = mises_en_avant_de.ville
     and m.statut in ('payee', 'offerte')
     and m.fin > now()
   order by m.soiree_id, m.fin desc;
$$;
revoke all on function public.mises_en_avant_de(text) from public;
grant execute on function public.mises_en_avant_de(text) to anon, authenticated;

-- ═══ LA MODERATION ═══
create or replace function public.mises_en_avant_admin()
returns setof public.mises_en_avant
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_moderator() then
    raise exception 'reserve a la moderation' using errcode = 'insufficient_privilege';
  end if;
  return query select * from public.mises_en_avant order by cree desc limit 200;
end; $$;
revoke all on function public.mises_en_avant_admin() from public;
grant execute on function public.mises_en_avant_admin() to authenticated;

-- Offrir (sans paiement, ou paye autrement que par Stripe) ou retirer.
create or replace function public.regler_mise_en_avant(mise uuid, statut text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_moderator() then
    raise exception 'reserve a la moderation' using errcode = 'insufficient_privilege';
  end if;
  if statut not in ('offerte', 'retiree') then
    raise exception 'statut refuse' using errcode = 'check_violation';
  end if;
  update public.mises_en_avant m set statut = regler_mise_en_avant.statut where m.id = mise;
end; $$;
revoke all on function public.regler_mise_en_avant(uuid, text) from public;
grant execute on function public.regler_mise_en_avant(uuid, text) to authenticated;
