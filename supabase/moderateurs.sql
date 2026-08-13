-- SONAA — Les deux modérateurs, et la réparation si un compte se dédouble.
--
-- CE FICHIER N'EST PAS UNE MIGRATION. Il se joue à la main, dans l'éditeur SQL
-- de la console, quand il y a une raison de le jouer. Une migration s'applique
-- une fois et pour toutes ; ceci se rejoue.
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QUI A ÉTÉ VÉRIFIÉ EN BASE, le 12 août 2026
-- ─────────────────────────────────────────────────────────────────────────
--
--   mauditemachine@gmail.com
--     email_confirmed_at = 2026-08-10 03:23:53 UTC, donc VÉRIFIÉ
--     une seule identité, fournisseur « email »
--     déjà modérateur
--
--   massivemedias@gmail.com
--     AUCUN COMPTE dans auth.users
--
-- Conséquence sur la liaison des identités. Supabase lie automatiquement deux
-- identités qui partagent une adresse À CONDITION que l'adresse soit vérifiée,
-- et refuse de lier sinon, pour empêcher qu'on prenne un compte en s'inscrivant
-- avec l'adresse de quelqu'un d'autre avant lui. Un compte créé par lien
-- magique est vérifié par le clic sur le lien : le champ le confirme.
--
-- Ajouter Google sur mauditemachine@gmail.com attachera donc une seconde
-- identité au MÊME user_id. Le statut de modérateur, qui pend au user_id, ne
-- bouge pas.

-- ═════════════════════════════════════════════════════════════════════════
-- 1. LES DEUX MODÉRATEURS, SANS HIÉRARCHIE
-- ═════════════════════════════════════════════════════════════════════════
--
-- Le bloc échoue bruyamment sur une adresse sans compte plutôt que de n'insérer
-- rien en silence. Un script qui rend « tout va bien » sans avoir rien fait est
-- le premier motif d'ECHECS-SILENCIEUX.md.

do $$
declare
  courriels text[] := array['mauditemachine@gmail.com', 'massivemedias@gmail.com'];
  c text;
  cible uuid;
  manquants text[] := '{}';
begin
  foreach c in array courriels loop
    select u.id into cible from auth.users u where lower(u.email) = lower(c);
    if cible is null then
      manquants := manquants || c;
    else
      insert into public.moderators (user_id, note)
      values (cible, 'Moderateur, pose a la main.')
      on conflict (user_id) do nothing;
      raise notice 'moderateur pose : % (%)', c, cible;
    end if;
  end loop;

  if array_length(manquants, 1) is not null then
    raise exception
      'Aucun compte pour : %. Ces adresses doivent se connecter une fois au site, puis rejouer ce bloc.',
      array_to_string(manquants, ', ');
  end if;
end;
$$;

-- ═════════════════════════════════════════════════════════════════════════
-- 2. APRÈS LA PREMIÈRE CONNEXION GOOGLE : LA VÉRIFICATION
-- ═════════════════════════════════════════════════════════════════════════
--
-- À jouer juste après. Ce qu'on veut lire : UNE SEULE LIGNE par adresse,
-- `nb_identites` à 2, `fournisseurs` valant « email, google », et
-- `moderateur` à vrai. Deux lignes pour une même adresse = dédoublement, et
-- c'est la section 3 qui s'applique.

select u.email,
       u.id,
       u.email_confirmed_at is not null as email_verifie,
       u.created_at,
       (select count(*) from auth.identities i where i.user_id = u.id) as nb_identites,
       (select string_agg(i.provider, ', ' order by i.provider)
          from auth.identities i where i.user_id = u.id) as fournisseurs,
       exists (select 1 from public.moderators m where m.user_id = u.id) as moderateur
from auth.users u
where lower(u.email) in ('massivemedias@gmail.com', 'mauditemachine@gmail.com')
order by u.email, u.created_at;

-- Le compte des lignes par adresse, en une valeur qu'on ne peut pas mal lire.
select lower(email) as courriel, count(*) as comptes
from auth.users
where lower(email) in ('massivemedias@gmail.com', 'mauditemachine@gmail.com')
group by 1
having count(*) > 1;
-- ZÉRO LIGNE = tout va bien. Une ligne = dédoublement.

-- ═════════════════════════════════════════════════════════════════════════
-- 3. RÉPARATION, SI UN DÉDOUBLEMENT SE PRODUIT QUAND MÊME
-- ═════════════════════════════════════════════════════════════════════════
--
-- Ce qu'on ne peut PAS faire : fusionner deux lignes de auth.users. Rien dans
-- Supabase ne le permet, et le tenter à la main casserait les clés étrangères
-- des jetons de session. Ce qu'on fait à la place : on choisit le compte qui
-- RESTE, on lui rapatrie les contributions de l'autre, et on supprime l'autre.
--
-- LE COMPTE QUI RESTE EST LE PLUS ANCIEN. C'est lui qui porte l'historique, le
-- statut de modérateur, et le pseudonyme public sous lequel les contributions
-- ont été signées. Garder le nouveau changerait le pseudonyme de tout ce qui a
-- déjà été publié.
--
-- REMPLACER LES DEUX UUID CI-DESSOUS avant de jouer quoi que ce soit. Ils ne
-- sont pas devinés par le script exprès : une réparation d'identité se fait les
-- yeux ouverts, en ayant lu la requête de la section 2.

/*
begin;

-- \set garde  '00000000-0000-0000-0000-000000000000'   -- le plus ANCIEN
-- \set doublon '11111111-1111-1111-1111-111111111111'  -- celui qu'on supprime

-- Les contributions changent de main. `on conflict do nothing` partout : si la
-- personne a voté depuis les deux comptes, un seul vote survit, et c'est la
-- seule issue possible pour une contrainte d'unicité.
update public.proposals      set author_id  = :'garde' where author_id  = :'doublon';
update public.comments       set author_id  = :'garde' where author_id  = :'doublon';
update public.votes          set voter_id   = :'garde' where voter_id   = :'doublon'
  and not exists (select 1 from public.votes v2
                  where v2.proposal_id = votes.proposal_id and v2.voter_id = :'garde');
delete from public.votes where voter_id = :'doublon';
update public.track_votes    set user_id    = :'garde' where user_id    = :'doublon'
  and not exists (select 1 from public.track_votes t2
                  where t2.genre_id = track_votes.genre_id
                    and t2.video_id = track_votes.video_id
                    and t2.user_id = :'garde');
delete from public.track_votes where user_id = :'doublon';
update public.comment_votes  set user_id    = :'garde' where user_id    = :'doublon'
  and not exists (select 1 from public.comment_votes c2
                  where c2.comment_id = comment_votes.comment_id and c2.user_id = :'garde');
delete from public.comment_votes where user_id = :'doublon';
update public.comment_reports set reporter_id = :'garde' where reporter_id = :'doublon'
  and not exists (select 1 from public.comment_reports r2
                  where r2.comment_id = comment_reports.comment_id and r2.reporter_id = :'garde');
delete from public.comment_reports where reporter_id = :'doublon';

-- Le profil : on garde celui du compte conservé s'il existe, sinon on rapatrie.
insert into public.profiles (user_id, ville, pays)
select :'garde', p.ville, p.pays from public.profiles p where p.user_id = :'doublon'
on conflict (user_id) do nothing;
delete from public.profiles where user_id = :'doublon';

delete from public.moderators where user_id = :'doublon';

-- Le compte en trop. La cascade emporte ses identités et ses sessions.
delete from auth.users where id = :'doublon';

-- RELIRE la section 2 AVANT de valider. Si quelque chose surprend : rollback.
commit;
*/
