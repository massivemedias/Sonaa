# Les opérations qui peuvent échouer sans le dire

Revue demandée après deux incidents de même nature : la commande d'ajout de
modérateur, qui affichait « Success » sans rien insérer, et le plafond
anti-parution, qui répondait « rien à signaler » alors qu'il ne recevait
plus sa donnée d'entrée.

**Le défaut de fond n'est pas la panne, c'est le verdict rassurant.** Un
script qui plante se voit. Un script qui rend « tout va bien » sans avoir
rien vérifié ne se voit jamais, et son résultat est utilisé comme une
preuve. C'est ce qui a laissé entrer quarante-cinq intégrales d'album.

Trois questions posées à chaque script :

1. Peut-il rendre un verdict positif sans avoir rien vérifié ?
2. Distingue-t-il « rien trouvé » de « je n'ai pas pu chercher » ?
3. Écrit-il en croyant écrire, alors que la cible a disparu ?

---

## Corrigés dans cette passe

### `lib/match.ts`, `searchYouTube` — GRAVE

Rendait un tableau vide dans deux cas que rien ne distinguait : la requête
ne donne vraiment rien, ou quatre tentatives ont été refusées. L'appelant
concluait « non résolu » dans les deux cas.

**Conséquence réelle** : un blocage complet de YouTube produisait un rapport
d'import parfaitement normal, du genre « 0 ajouté, 60 non résolus ». On
aurait conclu que le fichier de candidats était mauvais.

**Corrigé** : compteur `reseau.requetes` / `reseau.echecs`, exposé par
`tauxEchecReseau()`.

### `import-tracks.ts` — GRAVE, même cause

Le rapport final ne pouvait pas distinguer un lot douteux d'un réseau
tombé.

**Corrigé** : au-delà d'un quart de requêtes perdues, le script refuse de
conclure et sort en erreur, en disant que les « non résolus » ne veulent
rien dire.

### `lib/corpus-store.ts`, `patchTracks` — GRAVE

Un correctif visant une track retirée du corpus entre-temps ne trouvait
aucune cible et disparaissait sans un mot. `fetch-covers` pouvait annoncer
cinquante pochettes posées en n'en ayant écrit que vingt. C'est le module
central d'écriture : son silence se propage à tous ses appelants.

**Corrigé** : rend `{ appliques, orphelins }` et prévient sur la sortie
d'erreur. Les orphelins ne sont pas une faute — le corpus bouge, c'est la
raison d'être du module — ils doivent seulement être vus.

### `audit-durees.ts` — GRAVE, et c'est le script d'audit lui-même

Annonçait « aucune parution complète détectée » aussi bien quand il n'y en
avait pas que quand il n'avait rien pu mesurer. Le script écrit pour
traquer le défaut en était atteint.

**Corrigé** : sous 50 % de tracks réellement mesurées, il sort en erreur et
renvoie vers `check:plafond`.

### `lib/match.ts`, le plafond — GRAVE, corrigé précédemment

Documenté dans le commit du garde-fou. `check:plafond` vérifie désormais la
règle ET que la durée arrive encore, en CI.

---

## Risque moyen, laissés en l'état avec leur raison

### `fetch-key.ts` et `fetch-release-data.ts`

Sortent en **code 0** quand leur clé d'API est absente, après un message
explicite sur la sortie d'erreur.

Le message est clair et la sortie zéro est délibérée : ces chantiers sont
facultatifs, et les faire échouer casserait une chaîne qui n'en dépend pas.
Le risque n'apparaît que si on les enchaîne dans un script qui teste les
codes de sortie : l'absence de clé passerait alors pour un succès. Aucun
script ne le fait aujourd'hui.

### `fetch-covers.ts`

Compte ses échecs d'appel et les affiche à la fin (« N appels en échec »).
Il **dit** ce qui a raté, il ne le masque pas. Il ne va pas jusqu'à refuser
de conclure, mais l'information est là.

### `audit-tracks.ts`

`catch` silencieux sur la résolution d'une track, mais il travaille sur un
corpus déjà constitué et annonce chaque entrée retirée. Le silence porte
sur un cas, pas sur le verdict.

---

## Sans risque

Les contrôles de CI sortent tous en code 1 quand ils échouent, et aucun ne
peut rendre un verdict positif sans avoir travaillé :

`check-matcher`, `check-labels`, `check-corpus-writes`, `check-tirets`,
`check-game-rules`, `check-plafond`, `validate-data`, `build-game-tree
--check`.

`check-matcher` mérite une mention : son verdict est
`process.exit(fails === 0 ? 0 : 1)`, et non un `process.exit(1)` littéral.
Une recherche naïve du motif le fait passer pour muet, il ne l'est pas.

---

## La règle qui en sort

Un contrôle doit pouvoir échouer de deux façons distinctes : **la chose
vérifiée est fausse**, et **je n'ai pas pu vérifier**. Confondre les deux
transforme une panne en satisfecit.

Quand un contrôle dépend d'une donnée qu'il ne produit pas lui-même —
une durée extraite d'une page, une réponse réseau, une ligne à mettre à
jour — il doit vérifier que cette donnée est bien arrivée, et le dire quand
elle manque.
