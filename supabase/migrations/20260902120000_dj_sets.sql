-- SONAA — 0013 : deposer un set DJ, et l'ecouter.
--
-- ÉCRIT, NON APPLIQUÉ AU MOMENT DE LA REDACTION. Montre avant application.
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QUE LE PLAN GRATUIT AUTORISE, MESURE AVANT D'ECRIRE
-- ─────────────────────────────────────────────────────────────────────────
--
-- L'organisation est en plan gratuit et AUCUN bucket n'existait : le
-- stockage n'avait jamais servi sur ce projet. Trois plafonds en decoulent,
-- et ils commandent la conception :
--
--   50 Mo par fichier   -> environ 52 minutes en 128 kbps, 35 en 192 kbps
--   1 Go au total       -> une vingtaine de sets
--   5 Go de sortie/mois -> environ 100 ecoutes completes par mois
--
-- Le plafond de 50 Mo est ECRIT DANS LE BUCKET et non seulement dans
-- l'interface. Une limite qui ne vit que dans le navigateur se contourne
-- avec la console du navigateur ; celle-ci est appliquee par le serveur de
-- stockage, qui refuse l'objet.
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI UNE TABLE `artistes` SEPAREE DE `profiles`
-- ─────────────────────────────────────────────────────────────────────────
--
-- La migration 0011 pose une regle : AUCUNE JOINTURE NE DOIT RELIER UNE
-- VILLE A UN PSEUDONYME PUBLIC. C'est pour cela que `profiles` n'est lisible
-- que par son proprietaire, moderateurs compris.
--
-- Une page de set doit pourtant afficher publiquement un nom et une photo.
-- Il aurait ete plus court d'ajouter deux colonnes a `profiles` et d'exposer
-- une vue par-dessus. On ne le fait pas : le jour ou quelqu'un ajoute une
-- colonne a cette vue par distraction, ou ecrit `select *`, la ville de tout
-- le monde sort avec le nom. La table qui contient une donnee privee ne doit
-- jamais etre la source d'une vue publique.
--
-- Deux tables, deux natures. `profiles` reste prive et ne bouge pas.
-- `artistes` est public par construction et ne contient rien qu'on regrette
-- de publier.

-- ═════════════════════════════════════════════════════════════════════════
-- 1. L'IDENTITE PUBLIQUE
-- ═════════════════════════════════════════════════════════════════════════

create table if not exists public.artistes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nom text not null check (char_length(btrim(nom)) between 1 and 60),
  -- Chemin dans le bucket `avatars`, jamais une URL complete : l'adresse du
  -- service peut changer, le chemin non.
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 300),
  bio text check (bio is null or char_length(bio) <= 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.artistes is
  'Identite publique de qui depose des sets : nom affiche, photo, presentation. Lisible par tous, par construction. Volontairement distincte de profiles, qui porte la ville et reste prive : une table publique et une table privee ne se melangent pas, meme derriere une vue.';

alter table public.artistes enable row level security;

create policy "artiste : tout le monde lit"
  on public.artistes for select
  to anon, authenticated
  using (true);

create policy "artiste : je cree le mien"
  on public.artistes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "artiste : je modifie le mien"
  on public.artistes for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "artiste : je supprime le mien"
  on public.artistes for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ═════════════════════════════════════════════════════════════════════════
-- 2. LES SETS
-- ═════════════════════════════════════════════════════════════════════════

create table if not exists public.dj_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titre text not null check (char_length(btrim(titre)) between 1 and 120),
  description text check (description is null or char_length(description) <= 2000),
  -- Chemin dans le bucket `sets`. Contraint a commencer par l'identifiant du
  -- deposant : c'est ce prefixe que les politiques de stockage verifient, et
  -- une ligne qui pointerait ailleurs designerait le fichier de quelqu'un
  -- d'autre.
  audio_path text not null check (char_length(audio_path) <= 300),
  duree_s integer check (duree_s is null or duree_s between 1 and 86400),
  taille_o bigint check (taille_o is null or taille_o between 1 and 52428800),

  -- LA FORME D'ONDE, EN BASE64 D'UN TABLEAU D'OCTETS.
  --
  -- Un set d'une heure fait 160 millions d'echantillons. On n'en garde que
  -- l'enveloppe, reduite a 800 barres de 0 a 255, soit 800 octets bruts et
  -- environ 1,1 ko une fois encodes. C'est ce qui permet de dessiner la
  -- forme d'onde SANS telecharger l'audio : la page de liste en montre dix
  -- pour 11 ko, la ou dix fichiers feraient 500 Mo.
  onde text check (onde is null or char_length(onde) <= 4000),

  -- Un set non publie n'est visible que de son auteur. C'est le brouillon :
  -- on depose, on ecoute, on publie quand on veut.
  publie boolean not null default false,
  ecoutes integer not null default 0 check (ecoutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.dj_sets is
  'Un set depose par un compte. Le fichier vit dans le bucket sets ; cette table porte le titre, la duree, la forme d''onde reduite et l''etat de publication. Lecture publique des seuls sets publies.';

alter table public.dj_sets enable row level security;

create index if not exists dj_sets_publies_idx
  on public.dj_sets (created_at desc)
  where publie;

create index if not exists dj_sets_par_auteur_idx
  on public.dj_sets (user_id, created_at desc);

-- LECTURE : le public ne voit que ce qui est publie. L'auteur voit tout ce
-- qui est a lui, publie ou non. Deux politiques et non une seule avec un
-- `or` : on veut lire dans le schema qui voit quoi.
create policy "set : le public lit les sets publies"
  on public.dj_sets for select
  to anon, authenticated
  using (publie);

create policy "set : je lis les miens, publies ou non"
  on public.dj_sets for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "set : je depose le mien"
  on public.dj_sets for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    -- Le chemin doit etre dans MON dossier. Sans cette clause, une ligne
    -- pourrait pointer vers le fichier d'un autre compte et le republier
    -- sous son nom.
    and audio_path like (select auth.uid())::text || '/%'
  );

create policy "set : je modifie le mien"
  on public.dj_sets for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and audio_path like (select auth.uid())::text || '/%'
  );

create policy "set : je supprime le mien"
  on public.dj_sets for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- `updated_at` tenu par la base, jamais par une horloge cliente.
create or replace function public.touch_dj_set()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists dj_sets_touch on public.dj_sets;
create trigger dj_sets_touch
  before update on public.dj_sets
  for each row execute function public.touch_dj_set();

drop trigger if exists artistes_touch on public.artistes;
create trigger artistes_touch
  before update on public.artistes
  for each row execute function public.touch_dj_set();

-- ═════════════════════════════════════════════════════════════════════════
-- 3. LA VUE PUBLIQUE : UN SET ET SON AUTEUR EN UNE SEULE REQUETE
-- ═════════════════════════════════════════════════════════════════════════
--
-- `security_invoker` a `on` : la vue ne contourne rien, elle s'execute avec
-- les droits de qui la lit et les politiques ci-dessus s'appliquent
-- normalement. Une vue en `security definer` aurait publie les brouillons.

create or replace view public.sets_publics
with (security_invoker = on) as
  select
    s.id,
    s.titre,
    s.description,
    s.audio_path,
    s.duree_s,
    s.onde,
    s.ecoutes,
    s.created_at,
    s.user_id,
    a.nom as artiste_nom,
    a.avatar_path as artiste_avatar
  from public.dj_sets s
  left join public.artistes a on a.user_id = s.user_id
  where s.publie;

comment on view public.sets_publics is
  'Sets publies, avec le nom et la photo de leur auteur. security_invoker = on : les politiques de dj_sets s''appliquent, les brouillons ne sortent pas.';

-- ═════════════════════════════════════════════════════════════════════════
-- 4. LES DEUX BUCKETS
-- ═════════════════════════════════════════════════════════════════════════
--
-- Publics en LECTURE tous les deux : un set qu'on ne peut pas ecouter sans
-- jeton ne s'integre nulle part, et une photo d'artiste est faite pour etre
-- vue. Ce qui est protege, c'est l'ECRITURE, et elle l'est par le prefixe de
-- chemin.
--
-- Les limites de taille et de type sont posees ICI, dans le bucket, et non
-- seulement dans le formulaire. Le serveur de stockage refuse l'objet ; une
-- garde qui ne vit que dans le navigateur se contourne avec la console.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sets', 'sets', true, 52428800,
  array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-m4a']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- LE PREFIXE DE CHEMIN EST LA SERRURE. Un objet s'appelle
-- « <identifiant du compte>/<nom de fichier> », et chaque politique verifie
-- que le premier dossier est bien celui de qui ecrit. Personne ne peut donc
-- ecraser ni supprimer le fichier d'un autre, alors que tout le monde peut
-- le lire.

create policy "avatars : lecture publique"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "avatars : je depose dans mon dossier"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars : je remplace le mien"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars : je supprime le mien"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "sets : lecture publique"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'sets');

create policy "sets : je depose dans mon dossier"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'sets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "sets : je remplace le mien"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'sets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "sets : je supprime le mien"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'sets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ═════════════════════════════════════════════════════════════════════════
-- 5. LE COMPTEUR D'ECOUTES
-- ═════════════════════════════════════════════════════════════════════════
--
-- Incremente par fonction et non par `update` direct : sans cela il faudrait
-- une politique de mise a jour ouverte a tous sur dj_sets, et n'importe qui
-- pourrait alors changer le titre d'un set qui n'est pas le sien.

create or replace function public.compter_ecoute(set_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.dj_sets set ecoutes = ecoutes + 1 where id = set_id and publie;
$$;

revoke all on function public.compter_ecoute(uuid) from public;
grant execute on function public.compter_ecoute(uuid) to anon, authenticated;

-- L'anonyme n'a aucun droit de table la ou il n'a rien a faire, meme si
-- aucune politique ne le viserait. Ceinture et bretelle, comme en 0012.
revoke insert, update, delete on public.dj_sets from anon;
revoke insert, update, delete on public.artistes from anon;
