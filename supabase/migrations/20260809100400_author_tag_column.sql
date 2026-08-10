-- SONAA — 0005 : correction de 0004. Le tag devient une COLONNE.
--
-- CE QUI N'ALLAIT PAS EN 0004, constaté au banc et non deviné :
-- la vue proposals_public était déclarée `security_invoker = on`, ce qui
-- est la bonne option (la vue applique alors la RLS de l'APPELANT au lieu
-- de l'esquiver) — mais elle implique aussi que l'appelant doit posséder
-- le droit SELECT sur la table sous-jacente. Or 0004 révoquait ce droit
-- pour anon dans la même migration. Les deux gestes se contredisaient :
-- un anonyme n'obtenait pas un tag pseudonyme, il obtenait
-- « permission denied for table proposals », c'est-à-dire rien.
--
-- On ne peut pas non plus s'en sortir par un droit colonne par colonne
-- tant que la vue calcule le tag DEPUIS author_id : lire cette colonne
-- resterait nécessaire pour produire le tag.
--
-- LA CORRECTION : le tag cesse d'être calculé à la lecture et devient une
-- colonne posée à l'écriture par un trigger. Plus rien n'a besoin de lire
-- author_id pour afficher une proposition, et le droit de lecture d'anon
-- peut donc être accordé colonne par colonne, author_id exclu.
--
-- NOTE SUR LA PORTÉE RÉELLE DU GAIN, pour ne pas la surestimer : l'email
-- n'était de toute façon pas accessible (auth.users n'est pas exposé par
-- PostgREST, vérifié). author_id est un UUID aléatoire ; le masquer évite
-- de publier un identifiant de compte, mais ne rend pas les propositions
-- moins corrélables — un pseudonyme stable l'est par définition, c'est ce
-- qui est demandé de lui.

-- --------------------------------------------------------- la colonne

alter table public.proposals add column author_tag text;

create or replace function public.set_author_tag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Écrasement systématique : la valeur envoyée par le client, s'il en
  -- envoie une, n'est jamais retenue.
  new.author_tag := public.author_tag(new.author_id);
  return new;
end;
$$;

create trigger proposals_set_author_tag
  before insert or update of author_id on public.proposals
  for each row execute function public.set_author_tag();

update public.proposals set author_tag = public.author_tag(author_id)
 where author_tag is null;

alter table public.proposals alter column author_tag set not null;

comment on column public.proposals.author_tag is
  'Pseudonyme public, pose par trigger depuis author_id. C''est cette colonne que lisent les anonymes ; author_id ne leur est pas accorde.';

-- ------------------------------------------------- droits colonne par colonne

revoke select on public.proposals from anon;

-- author_id et moderated_by restent hors de portée : ce sont des
-- identifiants de comptes. Le reste est public, la RLS de 0003 décidant
-- toujours QUELLES LIGNES sont rendues.
grant select (
  id, created_at, updated_at, kind, genre_id, payload,
  status, score, moderated_at, moderation_note, author_tag
) on public.proposals to anon;

-- ------------------------------------------------------------- la vue

-- Reconstruite : create or replace refuse de retirer une colonne.
drop view if exists public.proposals_public;

create view public.proposals_public
with (security_invoker = on)
as
  select
    p.id, p.created_at, p.updated_at,
    p.kind, p.genre_id, p.payload,
    p.status, p.score,
    p.moderated_at, p.moderation_note,
    p.author_tag
  from public.proposals p;

comment on view public.proposals_public is
  'Surface de lecture publique : aucune colonne d''identifiant de compte. security_invoker : la RLS de proposals s''applique a l''appelant.';

grant select on public.proposals_public to anon, authenticated;

-- --------------------------------------------- « est-ce ma proposition ? »

-- 0004 répondait à cette question par une colonne is_own calculée depuis
-- author_id, ce qui obligeait la vue à lire author_id. L'interface compare
-- désormais author_tag au sien, obtenu ici.
create or replace function public.my_tag()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then null
    else public.author_tag((select auth.uid()))
  end;
$$;

comment on function public.my_tag() is
  'Tag pseudonyme de l''appelant, ou null s''il n''est pas connecte. Permet a l''interface de reconnaitre ses propres propositions sans jamais manipuler d''UUID.';

revoke all on function public.my_tag() from public;
grant execute on function public.my_tag() to anon, authenticated;

-- author_tag(uuid) n'a plus d'appelant côté client : seul my_tag et le
-- trigger s'en servent, tous deux security definer. On referme.
revoke execute on function public.author_tag(uuid) from anon, authenticated;
