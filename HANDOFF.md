# SONAA, reprise de session

Document de continuité. Écrit pour qu'une session Claude Code ouverte depuis
`~/Dev/Sonaa` reprenne le travail sans rien redécouvrir et sans rouvrir des
débats déjà tranchés.

À lire en entier avant la première action. À mettre à jour à chaque phase.

---

## 1. Où on en est

**Phase P0 terminée et en ligne.** Fondations, CI, déploiement GitHub Pages
fonctionnel. Deux commits sur `main` après la recréation du dépôt.

**Phase P1 non commencée.** Le prochain livrable est le schéma Zod et
`validate-data`, montrés avant d'écrire le moindre genre. Voir section 7.

**Un prototype jetable vit dans `src/proto/`.** Il n'est pas le produit : c'est
l'instrument qui sert à valider la direction avant d'écrire le corpus. Il est
volontairement inclus dans le build de production pendant la phase de
validation, pour être regardable en ligne.

- `https://massivemedias.github.io/Sonaa/#/proto` l'espace 3D
- `https://massivemedias.github.io/Sonaa/#/index` la vue liste accessible
- `https://massivemedias.github.io/Sonaa/` la page d'accueil P0

Le prototype et `src/proto/` seront **supprimés** quand le vrai moteur sera
écrit. Rien de ce qu'il contient n'est du code de production.

---

## 2. Le projet en une phrase

Un atlas généalogique interactif des musiques électroniques. Un espace 3D
habitable où chaque famille est une structure de sphères reliées par leur
filiation, dans lequel on descend par niveaux jusqu'aux morceaux.

100 % statique, aucun backend, aucune clé, GitHub Pages, base `/Sonaa/`.

---

## 3. Décisions validées, à ne plus rediscuter

### Infrastructure

| Décision | Raison |
|---|---|
| Le projet vit dans `~/Dev/Sonaa`, jamais dans iCloud | iCloud avait déjà corrompu le `.git` : `git fsck` remontait des objets manquants |
| Remote en SSH | un jeton en clair dans `.git/config` a été révoqué, plus jamais de jeton dans un remote |
| React 19, contre le brief qui disait 18 | aucune dépendance à une lib de graphe tierce, donc aucun risque d'incompatibilité. Écart documenté ADR-012 |
| Vite 5, avis esbuild accepté sans correctif | la faille ne touche que `vite dev`, jamais le site publié. ADR-017 |
| Le dépôt a été supprimé et recréé vierge | l'ancien historique contenait un mot de passe en clair dans un dépôt public |

### Rendu

| Décision | Raison |
|---|---|
| Three.js, pas PixiJS ni regl | mesuré sur des bundles réels : three 167 K gzip, pixi 165 K, regl 47 K. Pixi ne pèse pas moins et son instanciation est moins bonne. regl reste la sortie de secours budgétaire si on approche 420 K |
| Halo dans le shader, aucun post-traitement | un bloom sélectif imposerait plusieurs cibles de rendu et casserait la contrainte de peu d'appels de dessin. ADR-019 |
| Sphères en imposteurs billboard, normale analytique | pas de géométrie de sphère, pas d'asset, un seul appel de dessin pour les 204 sphères |
| Lambert plus liseré, aucune spéculaire | ni chrome, ni vernis, ni plastique |
| Rubans de liens élargis en **espace monde** | l'élargissement en espace écran s'est révélé impossible à fiabiliser aux largeurs réalistes. Documenté comme piège |
| Tout le texte en DOM projeté, jamais en WebGL | c'est la couche qui porte l'accessibilité, et le navigateur rastérise mieux que n'importe quel atlas de glyphes |
| Labels : masquage du plus lointain en cas de collision, **jamais de décalage** | règle posée par Mika |
| Aucune plaque sous les labels | deux ombres portées plus assombrissement local de la sphère dans le shader. **A déjà régressé une fois**, contrôler par `grep background` dans proto.css |
| Séparation des familles garantie par deux relaxations, en volume et en projection | les centres écrits à la main se chevauchaient. ADR-028 |
| Une seule famille déployée à la fois, aucun anneau au niveau Atlas | plusieurs familles ouvertes et 204 anneaux se lisaient comme un éparpillement. ADR-029 |
| Liens entre familles à 10 % d'opacité, allumés au survol | ils traversaient l'écran en diagonale. ADR-029 |
| Anneau discret sur les noeuds à dérivés | indice, pas cadre : tiers d'épaisseur, teinte de la famille, 35 % d'opacité max |
| Rayon de sphère indexé sur la profondeur | c'est ce qui rend la hiérarchie lisible sans cliquer |
| Liens effilés du parent vers l'enfant | la direction de la filiation se lit sans flèche |
| Disposition en couronnes | les enfants s'organisent autour de leur parent, jamais dans un tas commun |
| Cadrage de l'atlas calculé sur l'étendue verticale **mesurée** | la sphère englobante est presque vide, deux familles excentrées en fixaient le rayon et la scène apparaissait deux fois trop petite |

### Navigation

- Trois niveaux : atlas, famille, genre. Un quatrième écran pour les morceaux.
- **Aucun changement de niveau sans vol de caméra**, 600 ms, easing doux, le
  noeud atteint devient le centre d'orbite.
- Molette et pincement zooment. Glissement tourne. Flèches tournent, `+` et `−`
  zooment, `0` recentre, `Échap` remonte d'un cran.
- Contrôles visibles en permanence en bas à droite. Cibles de 44 px sur mobile.
- Fil d'Ariane permanent, chemin **recalculé depuis la racine** à chaque clic,
  jamais accumulé depuis l'historique : il ne peut pas mentir.
- Ligne d'aide au premier chargement, effacée à la première interaction,
  mémorisée dans `localStorage`, ne revient plus.
- La diffusion d'une famille est l'animation signature : cascade du fondateur
  vers les dérivés le long des liens, 480 ms, 40 ms par niveau, easing à léger
  dépassement. Fermeture inversée en 300 ms.
- La descente sur un genre est la même grammaire un cran plus bas, 400 ms,
  45 ms par génération. Tous les dérivés du noeud focalisé sont étiquetés, sans
  filtre. Le reste de la famille recule à 12 % et perd ses labels.
- `prefers-reduced-motion` remplace toute animation par une apparition directe.

### Typographie et couleur

- **SF Pro Display partout**, pile
  `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif`.
  Le trio Archivo, Literata, IBM Plex Mono est abandonné. Plus aucun mono, y
  compris pour les BPM.
- Hiérarchie par graisse : 600 familles en capitales interlettrées, 500 genres,
  400 données.
- Labels bornés : plancher 13 px sur poste de bureau, 15 px sur mobile, plafond
  22 px. Les noms de familles au niveau Atlas descendent à 10 px et grandissent
  quand on approche.
- 14 teintes, chroma 0,13 à 0,18, luminosité 0,60 à 0,75, écart minimal de
  22 degrés, **rien entre 90 et 120 degrés**, la zone olive-kaki qui salit.
- Contraste **mesuré** : blanc sur le fond 19,4:1, blanc sur une sphère claire
  1,96 à 2,52:1. C'est ce qui justifie les ombres et l'assombrissement local.

### Ce qui a été abandonné, et pourquoi

Quatre concepts se sont succédé. Ne pas les ressusciter sans raison neuve.

1. **La planche de relevé, temps en axe vertical, genre = segment de durée.**
   Abandonné : le temps ne structure plus l'espace. L'année reste une donnée de
   panneau, elle n'a plus de géométrie. Sections marquées CADUC dans DESIGN.md.
2. **La 3D avec Y le temps, X la proximité, Z le BPM.** Abandonné avec le point
   précédent. Mesuré et fonctionnel à l'époque : 0,165 ms au pire.
3. **Les masses volumétriques par raymarching.** Abandonné pour deux raisons :
   coût, 6,64 ms au pire soit 40 fois le rendu précédent et intenable sur
   mobile, et rendu « brume » alors qu'on veut des corps construits.
4. **L'archive de l'ancien agrégateur RSS dans `public/OLD/`.** Abandonnée,
   l'agrégateur est mort. ADR-010 est marqué CADUC.

Autre annulation : le `git mv` de l'ancien site vers `public/OLD/` décrit dans le
brief était impossible, l'app chargeait du TypeScript JSX qu'aucun navigateur
n'exécute.

---

## 4. Ce qui reste ouvert

**structuralParent validé par Mika.** Le DAG est la vérité, l'arbre est une vue,
désignation explicite genre par genre, greffes visibles au survol, liens entre
familles dérivés. Documenté ADR-030, **pas encore codé** : le schéma P1 attend.

**Labels au niveau famille.** 3 labels de genres visibles sur 6 candidats à
l'angle par défaut. L'objectif fixé était 5. Padding réduit, tolérance de
chevauchement de 4 px, cadrage resserré et suffixes compactés ont fait passer de
2 à 3. Le blocage restant : les six labels de première génération partent tous
vers la droite depuis des sphères distantes de 60 px. **Le seul levier efficace
est de décaler un label du côté libre de sa sphère, ce que la règle « jamais de
décalage » interdit.** Arbitrage attendu de Mika.

**Retours visuels de Mika jamais formulés.** Trois demandes de verdict sont
restées en gabarit non rempli : sensation de navigation, lisibilité de la
descente, rendu visuel après correction des plaques. À redemander.

**Lecture réelle des morceaux.** Le transport de la vue morceaux est **simulé**
et étiqueté comme tel. L'iframe YouTube se branche en P3 sur des identifiants
vérifiés au build.

**Mobile jamais mesuré sur appareil réel.** Toutes les estimations mobiles sont
des extrapolations depuis un M4 Max. Le mode réduit et le détecteur de capacité
existent mais sont devenus superflus depuis l'abandon du raymarching, conservés
car sans coût.

**Polices.** SF Pro est une pile système, aucun woff2 n'est embarqué. À trancher
en P6 si on veut garantir le rendu hors Apple.

**Captures d'écran.** L'environnement de la session précédente avait un panneau
navigateur à 0×0, ce qui rendait toute capture en fichier impossible. Mika
regarde directement en ligne.

**Vue liste `#/index`.** Elle existe et fonctionne, mais elle est branchée sur
les données factices du prototype. À rebrancher sur le corpus réel en P1.

---

## 5. Règles de travail, non négociables

**Une étape à la fois.** On termine, on rend compte, on s'arrête. On n'enchaîne
jamais sur l'étape suivante sans feu vert.

**Format de rapport imposé.** Dernière chose de chaque réponse, délimitée par des
lignes de tirets, jamais par des backticks :

```
------------------------------------------------------------
ÉTAPE X - <nom de l'étape> - <FAIT | BLOQUÉ | EN ATTENTE>

Fait
<2 lignes maximum, factuel, pas de prose>

Vérifié
<la commande de contrôle exécutée et son résultat brut>

Risque ou surprise
<ce qui n'était pas prévu, ou "aucun">

Action attendue de moi
<une seule action concrète>

Prochaine étape
<numéro et nom>
------------------------------------------------------------
```

Règles du rapport : aucune valeur de secret, jamais, même partielle. Si une
étape échoue, le statut est BLOQUÉ et « Action attendue de moi » contient la
décision précise à prendre, pas une question ouverte.

**Commit et push à chaque étape validée.** Message conventionnel, une ligne de
description claire. Après chaque push, donner **le lien du run GitHub Actions et
l'URL à ouvrir**, et vérifier que l'asset servi en ligne correspond au build
local.

**Avant toute commande destructive, demander.**

**Écriture française** : pas de tiret cadratin, virgule ou trait d'union simple.

**Ne jamais écrire une valeur de secret dans un document du dépôt**, pas même en
exemple dans une commande de contrôle. C'est arrivé une fois, un mot de passe
s'est retrouvé dans `ARCHITECTURE.md` et n'a été rattrapé qu'avant le push.

---

## 6. Règles sur les données, elles priment sur tout

**Mika ne délègue pas le corpus.** L'agent ne remplit pas les 60 genres seul.
Il produit **un brouillon par lignée**, et Mika relit **chaque filiation** avant
qu'elle entre dans le dépôt.

**Sur le dark disco, l'indie dance et le psy-prog, Mika est la source.** Ne rien
inventer sur ces trois sujets, demander.

**Filiation incertaine : `confidence: "debated"`**, avec la controverse
expliquée dans les notes et une source. Une filiation musicale est une
interprétation, pas un fait.

**Aucun identifiant YouTube inventé, jamais.** Un identifiant non vérifié n'a
pas le droit d'exister. `scripts/verify-youtube.ts` fait autorité sur le champ
`verified`, et le build de production retire les morceaux non vérifiés. Un genre
sans morceau vérifié affiche « Sélection en cours de vérification. »

**Aucune clé côté client.** `scripts/fetch-tracks.ts` lit `YOUTUBE_API_KEY` dans
l'environnement, fourni par un secret GitHub Actions, et ne tourne qu'au build.
`scripts/fetch-covers.ts` interroge l'API iTunes, sans clé. Les URLs sont figées
dans le JSON. Au runtime, le seul appel tiers est l'iframe YouTube.

---

## 7. La prochaine étape : P1

**Périmètre réduit à 60 genres sur six familles** : disco, house, techno,
minimal, trance, psy. Complet et exact sur 60 vaut mieux qu'approximatif sur 180.
Les huit autres familles arrivent après la v1, une par une.

**Livrable immédiat, et rien d'autre : le schéma Zod et `validate-data`.**
À montrer à Mika **avant** d'écrire le moindre genre.

Le schéma doit porter :

- `discogsStyles: string[]`, au moins une entrée, passerelle vers un classifieur
  audio en v1.1
- `rejects?: Edge[]`, le lien de rupture, un genre qui se définit contre un autre
- un flag `major`
- `bpm` **obligatoire**, avec une **règle documentée pour les tempos variables**
  (à définir avec Mika : plage, valeur médiane, ou marqueur explicite)
- **deux listes de morceaux** par genre, `tracksCurrent` et `tracksEssential`
- **aucun champ année structurant**
- **profondeur et position calculées depuis la filiation, jamais stockées**

`validate-data` doit vérifier :

- absence de cycle dans la filiation
- toutes les références d'arêtes résolues
- **trois niveaux minimum par famille**
- **au moins un genre `major` par famille**

Un schéma existe déjà dans `src/data/schema.ts`, écrit pour l'ancien modèle
temporel. Il faut le reprendre : retirer `yearStart`, `yearPeak`, `yearEnd` et
les contrôles de cohérence de dates, ajouter les deux listes de morceaux, rendre
`bpm` obligatoire, et retirer tout ce qui stockait une position.

`scripts/validate-data.ts` existe aussi et fonctionne, testé sur une fixture
volontairement fautive : il attrape cycles, références mortes, orphelins et
incohérences. Ses contrôles de dates sont à remplacer par les contrôles de
profondeur et de `major`.

---

## 7 bis. Dette documentaire réglée

DESIGN.md sections 3.3, 6 et 7 et les ADR 001, 002, 003 et 015 décrivaient
l'ancien modèle temporel sans être marqués caducs. C'est corrigé : 3.3 et 7 sont
réécrits sur l'état réel, 6 est marqué caduc, les quatre ADR portent une note.
Un document qui mentait sur quatre points a été rendu exact.

---

## 8. Repères techniques utiles

**Mesurer une performance GPU.** `gl.finish()` ne synchronise pas de façon fiable
sous ANGLE/Metal, les temps relevés étaient absurdes avec des deltas négatifs.
Utiliser `EXT_disjoint_timer_query_webgl2`, une requête `TIME_ELAPSED` encadrant
150 à 200 rendus, médiane de 3 campagnes. Attendre le résultat avec
`MessageChannel`, jamais `setTimeout` ni `requestAnimationFrame` : les deux sont
bridés à 1 Hz dans un onglet en arrière-plan, ce qui rend aussi toute mesure par
temps d'image inexploitable.

**Pièges GLSL déjà payés**, détaillés dans `ARCHITECTURE.md` :
`half` est un mot réservé, `fwidth` renvoie 0 dans le chemin GLSL 1.0 de three
ce qui produit un NaN via `smoothstep(a, a, x)`, et `camera.matrixWorldInverse`
n'est mis à jour que par le rendu donc `project()` utilise une matrice périmée
d'une image si on ne l'inverse pas à la main.

**Une animation doit se terminer même si l'image suivante arrive après sa fin.**
Un test « temps écoulé inférieur à la durée » ne suffit pas, il faut un drapeau
et une fin forcée, sinon la caméra n'atteint jamais sa destination sur une
machine lente.

**Budget.** 420 Ko gzip pour le JS hors données, couche WebGL en import
dynamique après le premier rendu. Actuellement : index 62 K, webgl 137 K,
proto 4 K. Marge confortable.

**Performance actuelle** du prototype, mesurée : 0,10 ms au pire sur les 16,67 ms
d'un budget 60 images par seconde, 3 appels de dessin, 204 sphères, 204 liens.

---

## 9. Cartographie des fichiers

```
DESIGN.md          direction artistique, sections CADUC conservées pour mémoire
ARCHITECTURE.md    27 ADR, plus une section « pièges GLSL »
HANDOFF.md         ce document
src/app/           page d'accueil P0
src/design/        tokens.css et base.css
src/data/schema.ts schéma Zod, à reprendre pour P1
src/proto/         PROTOTYPE JETABLE, à supprimer après validation
scripts/           validate-data, verify-youtube à écrire, fetch-tracks, fetch-covers
.github/workflows/ deploy.yml, fonctionnel
```
