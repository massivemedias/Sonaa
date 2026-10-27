-- LA MESURE DU SITE ET DES ECOUTES. Mika, le 27 octobre 2026 : « je veux des
-- stats completes de consultation du site dans mon interface admin », et pour
-- chaque artiste qui depose une mixtape « combien de listens, d'ou viennent
-- ses listeners, toutes les infos pour lui ».
--
-- SANS COOKIE ET SANS ADRESSE IP. Le navigateur envoie la page vue (ou les
-- secondes ecoutees) a la passerelle Cloudflare (worker, route api/mesure) ;
-- elle y ajoute le pays, la region et la ville qu'elle lit dans la requete,
-- le type d'appareil, et un identifiant de visiteur qui est l'empreinte
-- (SHA-256) de l'adresse, du navigateur, du jour et d'un sel tire au sort
-- chaque jour. Le sel disparait le surlendemain : l'empreinte ne se relie a
-- personne, ni d'un jour a l'autre. C'est la methode de Plausible.
--
-- PERSONNE N'ECRIT ICI PAR L'API PUBLIQUE, sauf par `mesurer`, qui exige le
-- secret de la passerelle (son empreinte seule est en base). Les lectures
-- passent par deux fonctions : `stats_site` pour la moderation, et
-- `stats_mes_mixtapes` pour un artiste, sur ses seules mixtapes.

create table if not exists public.mesure_visites (
  id bigserial primary key,
  quand timestamptz not null default now(),
  visiteur text not null check (char_length(visiteur) between 8 and 64),
  chemin text not null check (char_length(chemin) between 1 and 200),
  referent text check (referent is null or char_length(referent) <= 120),
  pays text check (pays is null or char_length(pays) <= 2),
  region text check (region is null or char_length(region) <= 80),
  ville text check (ville is null or char_length(ville) <= 80),
  appareil text check (appareil is null or appareil in ('mobile', 'tablette', 'ordinateur')),
  langue text check (langue is null or char_length(langue) <= 12),
  entree boolean not null default false
);
create index if not exists mesure_visites_quand_idx on public.mesure_visites (quand desc);
alter table public.mesure_visites enable row level security;

-- Une ligne par jour, par auditeur et par mixtape : les secondes s'ajoutent.
create table if not exists public.mesure_ecoutes (
  jour date not null,
  visiteur text not null check (char_length(visiteur) between 8 and 64),
  set_id uuid not null references public.dj_sets(id) on delete cascade,
  secondes integer not null default 0 check (secondes between 0 and 172800),
  referent text check (referent is null or char_length(referent) <= 120),
  pays text check (pays is null or char_length(pays) <= 2),
  region text check (region is null or char_length(region) <= 80),
  ville text check (ville is null or char_length(ville) <= 80),
  appareil text check (appareil is null or appareil in ('mobile', 'tablette', 'ordinateur')),
  premier timestamptz not null default now(),
  dernier timestamptz not null default now(),
  primary key (jour, visiteur, set_id)
);
create index if not exists mesure_ecoutes_set_idx on public.mesure_ecoutes (set_id, jour);
alter table public.mesure_ecoutes enable row level security;

-- L'empreinte du secret de la passerelle, et rien d'autre.
create table if not exists public.mesure_cle (empreinte text primary key);
alter table public.mesure_cle enable row level security;

-- ═══ L'ECRITURE ═══
create or replace function public.mesurer(secret text, evenements jsonb)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb;
  n integer := 0;
begin
  if not exists (
    select 1 from public.mesure_cle c
     where c.empreinte = encode(extensions.digest(coalesce(secret, ''), 'sha256'), 'hex')
  ) then
    raise exception 'secret refuse' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(evenements) <> 'array' or jsonb_array_length(evenements) > 50 then
    raise exception 'lot invalide' using errcode = 'check_violation';
  end if;
  for e in select * from jsonb_array_elements(evenements) loop
    if e->>'type' = 'vue' then
      insert into public.mesure_visites (visiteur, chemin, referent, pays, region, ville, appareil, langue, entree)
      values (
        e->>'visiteur', left(e->>'chemin', 200), nullif(left(e->>'referent', 120), ''),
        nullif(left(e->>'pays', 2), ''), nullif(left(e->>'region', 80), ''), nullif(left(e->>'ville', 80), ''),
        nullif(e->>'appareil', ''), nullif(left(e->>'langue', 12), ''), coalesce((e->>'entree')::boolean, false)
      );
      n := n + 1;
    elsif e->>'type' = 'ecoute' and (e->>'set_id') ~ '^[0-9a-f-]{36}$' then
      insert into public.mesure_ecoutes as m (jour, visiteur, set_id, secondes, referent, pays, region, ville, appareil)
      select (now() at time zone 'America/Toronto')::date, e->>'visiteur', (e->>'set_id')::uuid,
             least(greatest(coalesce((e->>'secondes')::integer, 0), 0), 7200),
             nullif(left(e->>'referent', 120), ''), nullif(left(e->>'pays', 2), ''),
             nullif(left(e->>'region', 80), ''), nullif(left(e->>'ville', 80), ''), nullif(e->>'appareil', '')
       where exists (select 1 from public.dj_sets s where s.id = (e->>'set_id')::uuid and s.publie)
      on conflict (jour, visiteur, set_id) do update
        set secondes = least(m.secondes + excluded.secondes, 172800),
            dernier = now(),
            referent = coalesce(m.referent, excluded.referent);
      n := n + 1;
    end if;
  end loop;
  return n;
end; $$;
revoke all on function public.mesurer(text, jsonb) from public;
grant execute on function public.mesurer(text, jsonb) to anon, authenticated;

-- ═══ LES STATISTIQUES DU SITE, POUR LA MODERATION ═══
create or replace function public.stats_site(jours integer default 30)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  depuis timestamptz := now() - make_interval(days => greatest(1, least(jours, 400)));
  avant timestamptz := depuis - make_interval(days => greatest(1, least(jours, 400)));
  r jsonb;
begin
  if not public.is_moderator() then
    raise exception 'reserve a la moderation' using errcode = 'insufficient_privilege';
  end if;
  with v as (select * from public.mesure_visites where quand >= depuis),
       va as (select * from public.mesure_visites where quand >= avant and quand < depuis)
  select jsonb_build_object(
    'visiteurs', (select count(distinct (visiteur, (quand at time zone 'America/Toronto')::date)) from v),
    'visiteurs_avant', (select count(distinct (visiteur, (quand at time zone 'America/Toronto')::date)) from va),
    'vues', (select count(*) from v),
    'vues_avant', (select count(*) from va),
    'sessions', (select count(*) from v where entree),
    'par_jour', (
      select coalesce(jsonb_agg(jsonb_build_object('jour', d.jour::date, 'visiteurs', coalesce(x.visiteurs, 0), 'vues', coalesce(x.vues, 0)) order by d.jour), '[]'::jsonb)
        from generate_series((depuis at time zone 'America/Toronto')::date, (now() at time zone 'America/Toronto')::date, interval '1 day') as d(jour)
        left join (
          select (quand at time zone 'America/Toronto')::date as jour, count(distinct visiteur) as visiteurs, count(*) as vues
            from v group by 1
        ) x on x.jour = d.jour::date
    ),
    'pages', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
      select chemin, count(*) as vues, count(distinct visiteur) as visiteurs from v group by chemin order by count(*) desc limit 25) p),
    'referents', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
      select coalesce(referent, '') as referent, count(*) as sessions from v where entree group by 1 order by 2 desc limit 20) p),
    'pays', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
      select coalesce(pays, '') as pays, count(distinct (visiteur, (quand at time zone 'America/Toronto')::date)) as visiteurs from v group by 1 order by 2 desc limit 25) p),
    'villes', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
      select ville, coalesce(pays, '') as pays, count(distinct (visiteur, (quand at time zone 'America/Toronto')::date)) as visiteurs
        from v where ville is not null group by 1, 2 order by 3 desc limit 25) p),
    'appareils', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
      select coalesce(appareil, '') as appareil, count(distinct (visiteur, (quand at time zone 'America/Toronto')::date)) as visiteurs from v group by 1 order by 2 desc) p),
    'langues', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
      select coalesce(split_part(langue, '-', 1), '') as langue, count(distinct (visiteur, (quand at time zone 'America/Toronto')::date)) as visiteurs from v group by 1 order by 2 desc limit 10) p),
    'heures', (select coalesce(jsonb_agg(p order by p.heure), '[]'::jsonb) from (
      select extract(hour from quand at time zone 'America/Toronto')::int as heure, count(*) as vues from v group by 1) p),
    'mixtapes', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
      select s.id, s.titre, count(*) as auditeurs, round(sum(e.secondes) / 60.0) as minutes
        from public.mesure_ecoutes e join public.dj_sets s on s.id = e.set_id
       where e.jour >= (depuis at time zone 'America/Toronto')::date
       group by s.id, s.titre order by count(*) desc limit 15) p)
  ) into r;
  return r;
end; $$;
revoke all on function public.stats_site(integer) from public;
grant execute on function public.stats_site(integer) to authenticated;

-- ═══ LES STATISTIQUES D'UN ARTISTE, SUR SES SEULES MIXTAPES ═══
-- Un « auditeur » est un visiteur d'un jour : l'empreinte change chaque
-- jour, deux jours d'ecoute font deux auditeurs. Une ecoute « complete »
-- couvre au moins 90 % de la mixtape.
create or replace function public.stats_mes_mixtapes(jours integer default 30)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  depuis date := ((now() at time zone 'America/Toronto')::date - greatest(1, least(jours, 400)) + 1);
  r jsonb;
begin
  if moi is null then
    raise exception 'connexion requise' using errcode = 'insufficient_privilege';
  end if;
  with miens as (select id, titre, duree_s, ecoutes, created_at from public.dj_sets where user_id = moi),
       e as (select x.* from public.mesure_ecoutes x join miens m on m.id = x.set_id where x.jour >= depuis),
       pages as (
         select v.* from public.mesure_visites v
          where v.quand >= depuis
            and (v.chemin = '#/mixtapes/a/' || moi::text
                 or exists (select 1 from miens m where v.chemin = '#/mixtapes/' || m.id::text))
       )
  select jsonb_build_object(
    'ecoutes_total', (select coalesce(sum(ecoutes), 0) from miens),
    'auditeurs', (select count(*) from e),
    'minutes', (select round(coalesce(sum(secondes), 0) / 60.0) from e),
    'moyenne_s', (select round(coalesce(avg(secondes), 0)) from e where secondes > 0),
    'completes', (select count(*) from e join miens m on m.id = e.set_id where m.duree_s > 0 and e.secondes >= m.duree_s * 0.9),
    'vues_pages', (select count(*) from pages),
    'visiteurs_pages', (select count(distinct (visiteur, (quand at time zone 'America/Toronto')::date)) from pages),
    'likes', (select count(*) from public.set_likes l join miens m on m.id = l.set_id),
    'commentaires', (select count(*) from public.set_commentaires c join miens m on m.id = c.set_id where not c.masque),
    'par_jour', (
      select coalesce(jsonb_agg(jsonb_build_object('jour', d.jour::date, 'auditeurs', coalesce(x.n, 0), 'minutes', coalesce(x.minutes, 0)) order by d.jour), '[]'::jsonb)
        from generate_series(depuis, (now() at time zone 'America/Toronto')::date, interval '1 day') as d(jour)
        left join (select jour, count(*) as n, round(sum(secondes) / 60.0) as minutes from e group by jour) x on x.jour = d.jour::date
    ),
    'pays', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
      select coalesce(pays, '') as pays, count(*) as auditeurs, round(sum(secondes) / 60.0) as minutes from e group by 1 order by 2 desc limit 20) p),
    'villes', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
      select ville, coalesce(pays, '') as pays, count(*) as auditeurs from e where ville is not null group by 1, 2 order by 3 desc limit 20) p),
    'sources', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
      select coalesce(referent, '') as source, count(*) as auditeurs from e group by 1 order by 2 desc limit 12) p),
    'appareils', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
      select coalesce(appareil, '') as appareil, count(*) as auditeurs from e group by 1 order by 2 desc) p),
    'mixtapes', (select coalesce(jsonb_agg(p order by p.auditeurs desc, p.ecoutes desc), '[]'::jsonb) from (
      select m.id, m.titre, m.duree_s, m.ecoutes,
             (select count(*) from e where e.set_id = m.id) as auditeurs,
             (select round(coalesce(sum(secondes), 0) / 60.0) from e where e.set_id = m.id) as minutes,
             (select round(coalesce(avg(secondes), 0)) from e where e.set_id = m.id and secondes > 0) as moyenne_s,
             (select count(*) from public.set_likes l where l.set_id = m.id) as likes,
             (select count(*) from public.set_commentaires c where c.set_id = m.id and not c.masque) as commentaires
        from miens m) p)
  ) into r;
  return r;
end; $$;
revoke all on function public.stats_mes_mixtapes(integer) from public;
grant execute on function public.stats_mes_mixtapes(integer) to authenticated;

-- ═══ CE QUE LA PAGE D'UNE MIXTAPE MONTRE A TOUS ═══ Des totaux, jamais un
-- auditeur : combien, combien de minutes, combien de pays.
create or replace function public.stats_publiques_set(set_id uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'auditeurs', count(*),
    'minutes', round(coalesce(sum(e.secondes), 0) / 60.0),
    'pays', count(distinct e.pays)
  )
    from public.mesure_ecoutes e
    join public.dj_sets s on s.id = e.set_id and s.publie
   where e.set_id = stats_publiques_set.set_id;
$$;
revoke all on function public.stats_publiques_set(uuid) from public;
grant execute on function public.stats_publiques_set(uuid) to anon, authenticated;
