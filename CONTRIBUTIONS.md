# Propositions du public

Comment le public propose, comment on tranche, et ce qui protège quoi.

## Le principe

Le corpus de SONAA **vit dans le dépôt**, pas en base. Un genre, une track,
une filiation se modifient par commit, avec leurs sources, et passent par les
contrôles de CI comme le reste. La base Supabase ne contient donc pas l'atlas :
elle contient une **file d'attente** de propositions et les votes qui les
accompagnent.

Cette séparation est délibérée et ne doit pas être contournée. Elle a une
conséquence qu'il faut assumer partout, jusque dans le vocabulaire de
l'interface : **accepter une proposition ne publie rien**. Le statut
`accepted` signifie « la proposition est jugée fondée » ; `merged` signifie
« le travail a été fait dans le corpus ». Seul le second change ce que voit un
lecteur de l'atlas.

## Ce que le public peut déposer

| Type | Ce qu'il vise | Où le bouton apparaît |
|---|---|---|
| `track` | une track qui manque au genre | toutes les fiches |
| `genre_edit` | un champ de la fiche à corriger | toutes les fiches |
| `filiation` | un autre parent que celui affiché | **seulement** les fiches marquées « filiation débattue » |

Le troisième bouton est conditionnel à dessein : inviter à contester un
rattachement qui fait consensus fabriquerait du doute au lieu d'en recueillir.

Toute proposition porte une **justification d'au moins 40 caractères**. Cette
règle est écrite dans la base (contrainte `proposals_justification`), pas
seulement dans le formulaire : l'API REST est publique et la clé est dans le
bundle, une règle qui ne vivrait que dans le navigateur serait contournable en
une requête.

## Ce qui protège les données

La clé embarquée dans le site est la clé **publishable**, publique par
conception. Elle n'est pas un secret et n'a jamais eu vocation à en être un.
Ce qui protège les données, ce sont les politiques RLS, vérifiées au banc
avant mise en service :

- un anonyme lit les propositions non refusées, et rien d'autre ;
- il ne peut pas lire `author_id` · le droit est accordé colonne par colonne,
  cette colonne exclue · et les propositions sont signées d'un **pseudonyme**
  dérivé par hachage salé (`author_tag`) ;
- il ne peut ni écrire, ni voter ;
- un connecté ne peut proposer que pour lui-même, ne peut pas s'auto-accepter,
  ne peut pas voter sur sa propre proposition, ne peut pas modifier un score ;
- `score` et `author_id` ne figurent dans aucun droit d'écriture : ils sont
  hors de portée au niveau du privilège, avant même toute politique ;
- la table `moderators` n'a **aucune politique d'écriture**. On y ajoute
  quelqu'un par SQL, délibérément (voir plus bas).

L'email ne quitte jamais `auth.users`, qui n'est pas exposé par PostgREST.
Aucune clé de service n'existe dans le dépôt, et la CI refuse le déploiement
si un motif de clé secrète ou un JWT apparaît dans `dist/`.

## Nommer un modérateur

**Les deux modérateurs du projet, sans hiérarchie entre eux :**
`mauditemachine@gmail.com` et `massivemedias@gmail.com`. Le SQL prêt à jouer
est dans `supabase/moderateurs.sql`, avec la vérification d'après connexion et
la réparation en cas de dédoublement de compte.

La personne doit **s'être connectée au moins une fois** · c'est cette connexion
qui crée son compte, et la clé étrangère n'a rien à pointer avant.

**Une interface de gestion existe désormais**, et cela revient sur une règle
écrite ici même : « il n'y a pas d'interface pour cela, et il n'y en aura
pas ». La table n'a toujours **aucune politique d'écriture** ; les ajouts et
retraits passent par deux fonctions `security definer` réservées aux
modérateurs. Ce qui a fait changer d'avis : passer par la console pour chaque
nomination rendait l'acte si coûteux qu'on le remettait, et le projet a tourné
des semaines avec un seul modérateur. Les garde-fous remplacent la friction :
seul un modérateur nomme, personne ne se retire soi-même, il doit toujours en
rester un, et chaque acte porte `added_by` et `added_at`.

## Liaison des identités, et pourquoi elle ne casse rien

Supabase lie automatiquement deux identités qui partagent une adresse, **à la
condition que l'adresse soit vérifiée**. Ce n'est pas un réglage, c'est un
comportement natif, et le refus sur une adresse non vérifiée est une protection
contre la prise de compte par inscription anticipée.

**Vérifié en base le 12 août 2026** : `mauditemachine@gmail.com`, créé par lien
magique, porte `email_confirmed_at` rempli à la seconde de sa création. Le clic
sur le lien magique vaut vérification. Ajouter Google sur cette adresse attache
donc une seconde identité au **même** `user_id`, et le statut de modérateur,
qui pend au `user_id`, ne bouge pas.

Le réglage « Confirm email » du projet est désactivé : il concerne l'inscription
par mot de passe, que ce site n'utilise pas.

Dans l'éditeur SQL de la console Supabase :

```sql
do $$
declare cible uuid;
begin
  select id into cible from auth.users
   where email = 'REMPLACER@PAR.LE.COURRIEL';

  if cible is null then
    raise exception 'Aucun compte pour cette adresse. Connectez-vous une premiere fois sur le site, PUIS relancez cette commande.';
  end if;

  insert into public.moderators (user_id, note)
  values (cible, 'fondateur')
  on conflict (user_id) do nothing;

  raise notice 'Moderateur ajoute.';
end $$;
```

**Pourquoi ce détour plutôt qu'un simple `insert … select`.** Un
`insert into … select … where email = …` n'insère rien quand le compte
n'existe pas encore · et ne lève **aucune erreur**. La console affiche
« Success », alors que rien n'a été fait. Le cas s'est produit : la commande
a été lancée avant la première connexion, elle a paru réussir, et personne
n'était modérateur. Le bloc ci-dessus échoue bruyamment à la place.

Vérifier :

```sql
select u.email, m.added_at, m.note
  from public.moderators m
  join auth.users u on u.id = m.user_id;
```

Retirer quelqu'un :

```sql
delete from public.moderators
 where user_id = (select id from auth.users where email = 'REMPLACER@PAR.LE.COURRIEL');
```

## La limite d'envoi de courriels

Le service intégré de Supabase n'expédie que **deux messages par heure pour le
projet entier**, tous utilisateurs confondus. Trois décisions en découlent :

1. La session est persistée et renouvelée automatiquement. On ne redemande
   jamais une connexion qu'on peut éviter.
2. Le formulaire est mis de côté **avant** l'envoi du lien et rejoué au
   retour, sur `#/propositions`. Perdre un brouillon coûterait un second lien,
   soit la moitié du quota horaire.
3. Quand la limite est atteinte, le message le dit franchement, avec le délai
   renvoyé par le serveur, plutôt qu'un « une erreur est survenue » devant
   quelqu'un qui réessaiera aussitôt.

Le code ne connaît pas le fournisseur d'envoi : passer à Resend se fait
entièrement dans la console, le quota change, rien à modifier ici. C'est
pourquoi aucune limite n'est écrite en dur dans `lib/auth.ts`.

## Si la base n'est pas configurée

`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` absentes : le client vaut
`null`, tous les boutons de contribution disparaissent, les deux routes
affichent un message sobre, et **l'atlas fonctionne exactement comme avant**.
La contribution est un ajout, jamais une dépendance.

Le client Supabase pèse 224 ko. Il n'est chargé qu'à l'ouverture d'une modale
ou d'une des deux routes : le compteur « N propositions en attente » de la
fiche de genre passe par `lib/compte.ts`, un `fetch` sans dépendance. Sans
cette précaution, quiconque ouvrait une fiche pour écouter une track payait
le client entier.

## Les migrations

Dans `supabase/migrations/`, appliquées dans l'ordre. Les migrations 0005 à
0007 corrigent des défauts des précédentes ; elles ont été gardées plutôt que
fondues dans les originales, pour que l'historique dise ce qui s'est passé.

| Fichier | Ce qu'il fait |
|---|---|
| `…100000_proposals_votes_moderators` | les trois tables, RLS activée dès la création |
| `…100100_score_and_rate_limit` | recomptage du score, quota de 10 par 24 h, `is_moderator()` |
| `…100200_rls_policies` | droits et politiques |
| `…100300_public_author_tag` | pseudonyme et vue publique |
| `…100400_author_tag_column` | corrige 0004 : le tag devient une colonne, droits par colonne |
| `…100500_fix_update_recursion` | corrige une récursion RLS qui bloquait **tout** update |
| `…100600_lock_down_functions` | referme l'exécution des fonctions internes, et le défaut du schéma |
| `…100700_justification` | justification obligatoire, champs éditables énumérés |
