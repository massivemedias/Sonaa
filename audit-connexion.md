# Audit de la connexion des utilisateurs

> **État au 6 septembre 2026, 17 h.** Les points 2, 3 et 4 sont corrigés et en
> ligne (`2f84a4f`), le point 6 est corrigé en base, et une fuite trouvée en
> cours de route est bouchée (voir « Ce qui a été corrigé » en fin de
> document). Les points 1 et 7 attendent la console Supabase, donc toi.

Fait le 6 septembre 2026 sur `sonaa.ca` en production et sur le projet Supabase
`pqgapyfqkjzvwkulxnhv`. Chaque constat ci-dessous a été mesuré, jamais déduit :
les sondes HTTP, les requêtes SQL et les clics réels sont indiqués à chaque fois.

## Le verdict en une ligne

Ça fonctionne mal, et pas pour une seule raison. La porte principale est
condamnée, la porte de secours ne dit rien quand elle refuse, et derrière les
deux, trois des quatre actions qu'un compte permet sont refusées par la base.

Depuis l'ouverture, la base compte **deux comptes**, tous les deux à toi
(`mauditemachine@gmail.com` le 10 août, `massivemedias@gmail.com` le 18 août),
**zéro commentaire, zéro vote de commentaire, zéro signalement, zéro vote de
morceau, zéro profil**. Une seule proposition. Ce n'est pas un site sans
visiteurs, c'est un site dont personne ne peut franchir la porte.

---

## 1. « Continue with Google » ne peut pas fonctionner

**Gravité : haute.** C'est le chemin présenté EN PREMIER, et le panneau explique
à la personne que c'est le chemin sans limite.

Sonde directe sur le point d'entrée d'autorisation :

```
GET /auth/v1/authorize?provider=google&redirect_to=https://sonaa.ca/
400 {"code":400,"error_code":"validation_failed",
     "msg":"Unsupported provider: missing OAuth secret"}
```

`GET /auth/v1/settings` répond pourtant `"google": true`. Le fournisseur est
donc **activé côté Supabase, mais sans secret client**. Un interrupteur allumé
sur un fil qui n'est pas branché.

Confirmé au clic réel sur sonaa.ca : le panneau affiche « Google sign-in is not
configured on this site yet. Use your email below. » Le garde-fou écrit dans
`src/lib/auth.ts` fait donc son travail, la sonde lit bien le 400 (Supabase
renvoie `access-control-allow-origin: https://sonaa.ca` sur cette réponse), et
personne ne tombe sur du JSON brut. Mais il n'y a rien derrière.

Confirmé en base : `select provider, count(*) from auth.identities` rend
**`email: 2`** et rien d'autre. Aucune identité Google n'a jamais été créée.

**Ce qu'il faut faire, et c'est toi :** créer un identifiant OAuth dans la
console Google Cloud, puis coller l'identifiant ET le secret dans Supabase,
Authentication > Providers > Google. L'URL de redirection autorisée côté Google
est `https://pqgapyfqkjzvwkulxnhv.supabase.co/auth/v1/callback`.

---

## 2. Un lien de courriel périmé revient sans un mot

**Gravité : haute.** C'est le défaut le plus probable derrière ton impression.

Supabase renvoie ses erreurs de connexion **dans le fragment**, pas dans la
requête. Mesuré avec un jeton volontairement faux :

```
GET /auth/v1/verify?token=jetonbidon&type=magiclink&redirect_to=...
302 -> https://sonaa.ca/#error=access_denied&error_code=otp_expired
        &error_description=Email+link+is+invalid+or+has+expired
```

Or `nettoyerUrlDeRetour()` dans `src/lib/auth.ts` ne lit que
`window.location.search`. Le fragment lui est invisible. Et `routeDe()` dans
`src/main.tsx` ne reconnaît pas `#error=...`, donc il retombe sur son défaut,
la vue Parcourir.

Vérifié dans un navigateur, sur l'adresse exacte ci-dessus : on arrive sur la
grille des familles, déconnecté, **sans un seul mot d'explication**, avec le
`#error=access_denied...` qui reste dans la barre d'adresse.

Pourquoi ça arrive souvent : un lien magique est à usage unique et expire. Les
antivirus de messagerie et les aperçus de Gmail suivent les liens avant que la
personne ne clique, ce qui consomme le jeton. Elle clique ensuite sur un lien
déjà brûlé et le site lui répond en ne répondant rien.

**Ce qu'il faut faire, et c'est moi :** lire aussi le fragment, effacer les
paramètres, et afficher le message qui va avec, avec un bouton pour redemander
un lien. Une trentaine de lignes, plus un test.

---

## 3. La promesse « je te ramène où tu étais » n'est pas tenue

`AuthButton.tsx:137` écrit `memoriserIntention({ route: iciMeme() })`, et
`connexionGoogle` fait pareil. Mais le seul endroit qui relit une intention,
`PropositionsPage.tsx:59`, ne lit que `intention.brouillon` et **ignore
`intention.route`**. Le champ est écrit partout et lu nulle part.

Conséquence concrète : qui se connecte depuis le calendrier, depuis une fiche de
genre ou depuis la page d'un style se retrouve sur la page des propositions et
y reste. Le commentaire d'en-tête de `auth.ts` décrit pourtant ce retour comme
acquis.

**Ce qu'il faut faire, et c'est moi :** relire `route` et y renvoyer, ou retirer
le champ. Un champ écrit et jamais lu fait croire à une capacité qu'on n'a pas.

---

## 4. Une fois connecté, trois actions sur quatre sont refusées par la base

**Gravité : haute.** C'est ce qui produisait le `permission denied for table
comments` déjà vu.

Les droits SQL de la table `comments` pour le rôle `authenticated` :

```
comments        authenticated = d          (SUPPRIMER seulement)
comment_votes   authenticated = rd         (LIRE, SUPPRIMER)
comment_reports authenticated = rd         (LIRE, SUPPRIMER)
```

Aucun `INSERT`. Les politiques RLS, elles, sont écrites et correctes :
`comments_insert` avec `author_id = auth.uid()`, etc. Mais **une politique sans
le droit correspondant ne sert à rien** : PostgreSQL vérifie le droit AVANT la
politique. On a donc écrit la serrure sans percer la porte.

Ce que ça casse, pour quelqu'un de connecté :

- publier un commentaire : refusé
- voter sur un commentaire : refusé
- signaler un commentaire : refusé
- lire `comments` directement : refusé (mesuré, `401` sur l'API REST)

Ce qui marche : proposer (`proposals` a bien `ard`), voter sur une proposition,
voter sur un morceau, écrire son profil, ajouter une soirée manuelle.

**Le correctif, trois lignes**, à passer en migration :

```sql
grant select, insert on public.comments to authenticated;
grant select on public.comments to anon;
grant insert, update on public.comment_votes to authenticated;
grant insert on public.comment_reports to authenticated;
```

À vérifier avant de le passer : que `comments_public` reste la seule lecture
publique, et que le masquage tienne toujours.

---

## 5. Ce qui va bien

- **La session tient et se renouvelle.** Ta ligne dans `auth.sessions` a été
  rafraîchie aujourd'hui à 19 h 36 sans nouvelle connexion. Le réglage
  `persistSession` + `autoRefreshToken` fait ce qu'il promet.
- **Une seule origine.** `www.sonaa.ca` renvoie un 301 vers `sonaa.ca`, et
  `massivemedias.github.io` ne sert rien. Il n'y a donc pas de second domaine où
  le vérificateur PKCE serait rangé au mauvais endroit.
- **L'escalade de droits n'est pas possible.** `nommer_moderateur` et
  `revoquer_moderateur` sont bien gardées par `is_moderator()`, vérifié dans le
  corps des fonctions. `revoquer_moderateur` refuse même de vider la liste.
- **Le pseudonyme n'est pas réversible.** `author_tag` hache l'identifiant avec
  un sel rangé dans un schéma privé.
- **Le lien Modération** pointe bien sur `#/moderation` depuis la correction
  d'août.

---

## 6. Hygiène de droits, sans conséquence aujourd'hui

À corriger un jour, mais rien de tout cela n'est exploitable en l'état.

- `moderator_log` accorde INSERT, UPDATE, DELETE et TRUNCATE au rôle **anonyme**.
  RLS n'a qu'une politique de lecture, donc les écritures sont refusées ; et
  PostgREST n'expose aucun verbe TRUNCATE. À révoquer quand même.
- `track_scores` et `comments_moderation` sont des vues SECURITY DEFINER avec
  des droits d'écriture accordés. Ni l'une ni l'autre n'est modifiable
  automatiquement (agrégat, sous-requête), donc les écritures échouent.
- Neuf fonctions de déclencheur (`touch_profile`, `verifier_quota`,
  `rafraichir_signalements`, ...) sont exposées comme points d'appel publics.
  Elles échouent hors contexte de déclencheur, mais elles n'ont rien à faire là.
- La protection contre les mots de passe éventés est désactivée. Sans objet ici :
  il n'y a pas de mot de passe sur SONAA.

---

## 7. Ce que je n'ai pas pu vérifier

**Si un lien magique arrive vraiment dans la boîte de quelqu'un d'autre que
toi.** Les deux seules adresses inscrites sont les tiennes. Si le service
d'envoi intégré de Supabase est encore en place, sa limite est de deux courriels
par heure pour le projet entier, et il ne dessert pas les adresses étrangères au
projet. Le vérifier demande d'envoyer un vrai courriel, ce que je n'ai pas fait
de mon propre chef.

Deux façons de trancher : regarder Authentication > Emails dans Supabase pour
voir si un SMTP est configuré, ou me dire de demander un lien à une adresse test
et de regarder ce qui revient.


---

## Ce qui a été corrigé, et comment ça a été vérifié

### En base, par deux migrations

`droits_manquants_sous_les_politiques`, puis `droits_par_colonne_et_masquage_reel`.

- **Les droits qui manquaient sous les politiques.** `comments`,
  `comment_votes`, `comment_reports` et `genre_comment_settings` reçoivent les
  droits d'écriture que leurs politiques RLS attendaient depuis le début.
  Accordés **par colonne**, comme le reste du schéma : une personne connectée
  peut poser `body`, pas `score` ni `reports_count`. La première migration les
  avait donnés sur la table entière, ce qui était trop large ; la seconde les
  a resserrés.
- **Parcours complet rejoué en base** sous l'identité d'un compte connecté :
  publier, voter, signaler, masquer, régler un genre, lire la file de
  modération. Six sur six passent. Les lignes d'essai ont été effacées, la
  base est revenue à zéro commentaire.
- **Le journal de modération n'est plus écrivable depuis le navigateur.**
  Écriture forgée tentée après coup : refusée, `42501`.
- **Les vues ne sont plus des portes d'écriture**, et les onze fonctions de
  déclencheur ne sont plus des points d'appel publics. Vérifié :
  `POST /rest/v1/rpc/touch_profile` rend maintenant `404`.

### Une fuite trouvée en chemin, et bouchée

Le masquage d'un commentaire masquait la vue, pas le texte. Mesuré : un
commentaire masqué, lu par un visiteur anonyme sur
`/rest/v1/comments?select=id,body,masque`, rendait **son texte en clair**. La
vue `comments_public` remplaçait bien le corps par `NULL`, mais elle était
`security_invoker`, donc le visiteur devait pouvoir lire `body` lui-même pour
que la vue le lise à sa place, et il le pouvait. Le détour par la vue était
donc facultatif.

`body` a été retiré au navigateur et la vue passée en `security_invoker = off`.
Vérifié après coup : la table rend `401`, la vue rend `body: null` avec
`masque: true`, donc l'écriteau « commentaire masqué » tient toujours.

### Dans le site, commit `2f84a4f`

- **Un lien périmé le dit maintenant.** `echecDansLAdresse()` lit l'échec dans
  le fragment comme dans la requête, `lireRetourDeConnexion()` l'efface et le
  fait remonter, et le panneau de connexion s'ouvre tout seul avec la phrase
  et le champ pour redemander un lien. Vérifié dans un navigateur sur
  l'adresse exacte que Supabase renvoie : le panneau s'ouvre, la barre
  d'adresse est propre, le message est là.
- **Les deux chemins ont été déclenchés**, celui du bouton qui lit au montage
  et celui de la reprise de session qui lit en nettoyant. Un chemin de secours
  jamais emprunté n'est pas un chemin.
- **La reprise ramène où l'on était.** `intention.route` est enfin relu.
  Vérifié dans un navigateur : une intention posée sur `#/calendrier` renvoie
  bien au calendrier depuis `#/propositions`, et une intention vieille de deux
  heures ne renvoie plus nulle part.
- **15 tests** dans `src/lib/auth.test.ts`, 70 au total dans le dépôt.

### Ce qui reste, et qui ne dépend que de la console

1. Le secret client Google (point 1).
2. Le service d'envoi de courriels (point 7).

Tant que ces deux-là ne sont pas faits, les corrections ci-dessus sont des
portes en état de marche derrière une entrée fermée à clé.
