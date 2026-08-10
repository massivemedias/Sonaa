-- SONAA — 0004 : pseudonyme public, et aucun author_id exposé à l'anonyme.
--
-- CE QUI EST DÉJÀ VRAI SANS CETTE MIGRATION, et qu'il faut savoir avant de
-- lire la suite : l'email n'est PAS exposé. Il vit dans auth.users, et le
-- schéma `auth` n'est pas publié par PostgREST — un anonyme ne peut pas
-- l'interroger, quelle que soit la politique de public.proposals. La table
-- proposals ne contient aucun email : elle ne porte qu'un UUID opaque.
--
-- CE QUE CETTE MIGRATION CORRIGE quand même :
--   1. author_id, même sans email, permet de CORRÉLER toutes les
--      propositions d'une même personne. C'est un identifiant stable rendu
--      à un inconnu ; il n'a aucune raison de sortir.
--   2. l'interface a besoin d'un pseudonyme AFFICHABLE et stable, qu'il
--      valait mieux dériver en base une fois pour toutes que réinventer
--      dans chaque écran.
--
-- La réponse est une vue publique qui ne rend qu'un tag court dérivé de
-- l'UUID, et le retrait du droit de lecture directe pour l'anonyme.

-- Le sel casse la correspondance « je connais un author_id, donc je
-- reconnais son tag ». Il vit dans le schéma privé, jamais exposé.
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.tag_salt (
  id boolean primary key default true check (id),
  salt text not null default encode(extensions.gen_random_bytes(32), 'hex')
);
insert into private.tag_salt (id) values (true) on conflict (id) do nothing;

-- Tag court, stable, non réversible : huit caractères hexadécimaux tirés
-- d'un SHA-256 salé. Stable pour une même personne, donc l'interface peut
-- écrire « proposé par a3f9c1d0 » et regrouper ses propositions, sans que
-- personne ne remonte au compte.
create or replace function public.author_tag(uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select substr(
    encode(
      extensions.digest(uid::text || (select s.salt from private.tag_salt s limit 1), 'sha256'),
      'hex'
    ),
    1, 8
  );
$$;

comment on function public.author_tag(uuid) is
  'Pseudonyme court, stable et non reversible, derive de l''UUID auteur avec un sel prive. Ne revele ni l''email ni l''UUID.';

revoke all on function public.author_tag(uuid) from public;
grant execute on function public.author_tag(uuid) to anon, authenticated;

-- ------------------------------------------------------- la vue publique

-- security_invoker : la vue applique la RLS de l'APPELANT sur la table
-- sous-jacente, elle ne l'esquive pas. Sans cette option, une vue s'exécute
-- avec les droits de son propriétaire et contournerait silencieusement les
-- politiques de 0003 — c'est le piège classique des vues sur table protégée.
create or replace view public.proposals_public
with (security_invoker = on)
as
  select
    p.id,
    p.created_at,
    p.updated_at,
    p.kind,
    p.genre_id,
    p.payload,
    p.status,
    p.score,
    public.author_tag(p.author_id) as author_tag,
    -- Permet à l'interface de marquer « votre proposition » sans jamais
    -- recevoir l'UUID de qui que ce soit.
    (p.author_id = (select auth.uid())) as is_own
  from public.proposals p;

comment on view public.proposals_public is
  'Lecture publique des propositions SANS author_id : un tag pseudonyme le remplace. security_invoker : la RLS de proposals s''applique normalement.';

-- L'anonyme perd la lecture directe de la table et lit la vue à la place.
-- Les connectés gardent la table : ils en ont besoin pour leurs propres
-- lignes et pour la modération, et un UUID d'auteur ne leur apprend rien
-- de plus qu'un tag.
revoke select on public.proposals from anon;
grant select on public.proposals_public to anon, authenticated;
