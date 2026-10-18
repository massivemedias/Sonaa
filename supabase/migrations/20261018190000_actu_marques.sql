-- LES NEWS PAR MARQUE ET PAR MACHINE. Mika, le 18 octobre 2026 : « si je
-- suis fan d'une machine, je vais chercher ses news un peu partout, des
-- vidéos, des articles, des discussions. J'ai acheté une Elektron Analog
-- Rytm, je veux toutes les news là-dessus. Je veux la liste de toutes les
-- news par constructeur, éditeur, et pareil pour les fabricants de plugins. »
--
-- Deux tables :
--   1. actu_marques, l'archive : un article, une vidéo ou une discussion par
--      ligne, avec les marques et les machines qu'il nomme. Elle grossit à
--      chaque moisson (scripts/moissonner-marques.ts) et ne se vide pas :
--      c'est ce qui la distingue de news.json, qui ne garde que le jour.
--   2. suivis_marques, ce que chaque compte suit : une marque entière, ou une
--      machine précise.

-- ═══ 1. L'ARCHIVE ═══
-- `marques` porte des identifiants de src/data/marques.ts (« elektron »),
-- `produits` des identifiants qualifiés (« elektron:analog-rytm ») pour
-- qu'un même nom de modèle chez deux marques ne se confonde pas.
create table if not exists public.actu_marques (
  lien text primary key check (lien ~ '^https?://' and char_length(lien) <= 1000),
  genre text not null check (genre in ('article', 'video', 'discussion')),
  titre text not null check (char_length(titre) between 1 and 400),
  source text not null check (char_length(source) between 1 and 120),
  date timestamptz,
  image text check (image is null or (image ~ '^https://' and char_length(image) <= 1000)),
  resume text not null default '' check (char_length(resume) <= 400),
  marques text[] not null default '{}',
  produits text[] not null default '{}',
  vu_le timestamptz not null default now()
);
create index if not exists actu_marques_marques_idx on public.actu_marques using gin (marques);
create index if not exists actu_marques_produits_idx on public.actu_marques using gin (produits);
create index if not exists actu_marques_date_idx on public.actu_marques (date desc nulls last);
alter table public.actu_marques enable row level security;

-- Tout le monde lit ; personne n'écrit par l'API publique. La moisson écrit
-- avec la clé de service, par la fonction ci-dessous.
create policy "actu marques : lecture publique"
  on public.actu_marques for select to anon, authenticated
  using (true);

-- VERSER, SANS PERDRE CE QU'ON SAVAIT. Un même article peut revenir par deux
-- chemins (le flux du magazine, puis la recherche d'une machine) : on garde
-- l'union des marques et des machines, et la première image et la première
-- date connues.
create or replace function public.verser_actu_marques(lignes jsonb)
returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.actu_marques as a (lien, genre, titre, source, date, image, resume, marques, produits)
  select x.lien, x.genre, left(x.titre, 400), left(x.source, 120), x.date, x.image, left(coalesce(x.resume, ''), 400),
         coalesce(x.marques, '{}'), coalesce(x.produits, '{}')
    from jsonb_to_recordset(lignes) as x(
      lien text, genre text, titre text, source text, date timestamptz, image text, resume text,
      marques text[], produits text[]
    )
   where x.lien ~ '^https?://' and coalesce(btrim(x.titre), '') <> ''
  on conflict (lien) do update set
    marques = array(select distinct m from unnest(a.marques || excluded.marques) as m order by m),
    produits = array(select distinct p from unnest(a.produits || excluded.produits) as p order by p),
    image = coalesce(a.image, excluded.image),
    date = coalesce(a.date, excluded.date),
    resume = case when a.resume = '' then excluded.resume else a.resume end;
  get diagnostics n = row_count;
  return n;
end; $$;
revoke all on function public.verser_actu_marques(jsonb) from public, anon, authenticated;
grant execute on function public.verser_actu_marques(jsonb) to service_role;

-- Les chiffres de l'annuaire : combien en tout, combien ces trente derniers
-- jours, et la date de la plus récente, par marque.
create or replace function public.compte_actu_marques()
returns table (marque text, n bigint, n30 bigint, dernier timestamptz)
language sql stable set search_path = '' as $$
  select m, count(*), count(*) filter (where a.date > now() - interval '30 days'), max(a.date)
    from public.actu_marques a, unnest(a.marques) as m
   group by m;
$$;
grant execute on function public.compte_actu_marques() to anon, authenticated;

-- ═══ 2. LES SUIVIS ═══
-- `produit` vide : toute la marque.
create table if not exists public.suivis_marques (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  marque text not null check (marque ~ '^[a-z0-9-]{1,60}$'),
  produit text not null default '' check (produit ~ '^[a-z0-9-]{0,60}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, marque, produit)
);
alter table public.suivis_marques enable row level security;

create policy "suivi : je vois les miens"
  on public.suivis_marques for select to authenticated
  using (user_id = (select auth.uid()));
create policy "suivi : je suis"
  on public.suivis_marques for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "suivi : je ne suis plus"
  on public.suivis_marques for delete to authenticated
  using (user_id = (select auth.uid()));

-- Deux cents suivis par compte : assez pour un studio entier, pas assez pour
-- remplir la table par jeu.
create or replace function public.borner_suivis_marques()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.suivis_marques s where s.user_id = new.user_id) >= 200 then
    raise exception 'Limite atteinte : 200 marques ou machines suivies.' using errcode = 'check_violation';
  end if;
  return new;
end; $$;
drop trigger if exists borner_suivis_marques on public.suivis_marques;
create trigger borner_suivis_marques
  before insert on public.suivis_marques
  for each row execute function public.borner_suivis_marques();
