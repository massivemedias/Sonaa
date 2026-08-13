# SONAA, reprise de session

Document de continuité. Écrit pour qu'une session Claude Code ouverte depuis
`~/Dev/Sonaa` reprenne le travail sans rien redécouvrir et sans rouvrir des
débats déjà tranchés.

À lire en entier avant la première action. À mettre à jour à chaque phase.

**Dernière remise à l'état réel : 11 août 2026.** Le document avait menti sur
sept points, dont le nombre de genres, la lecture des morceaux et la vue
liste. Tout ce qui suit a été mesuré ce jour-là, pas recopié. Les chiffres
portent la commande qui les rend.

---

## 0. Les quatre règles de vérification

**Elles valent plus que les ADR.** Chacune a été payée par plusieurs tours
perdus, et chacune produit le même genre de panne : une mesure juste, des
chiffres cohérents, et un défaut bien réel que personne ne voit venir. Les
lire avant de mesurer quoi que ce soit.

### 1. Mesurer avant de corriger

Le scintillement a reçu six corrections fondées sur des hypothèses plausibles.
Deux l'ont aggravé. La septième a commencé par construire l'instrument, et
elle a trouvé en un tour. Une hypothèse sur une cause de rendu ne vaut rien
tant qu'un compte ne l'a pas confirmée. Voir ADR-065.

### 2. Mesurer la BONNE situation

La septième mesure du scintillement était juste et portait sur la vue
d'ensemble, alors que le défaut vivait dans l'état déployé. Un instrument
correct braqué au mauvais endroit rend zéro avec la même assurance qu'un
instrument cassé. Il a fallu l'information manquante, « ça apparaît quand je
clique sur un genre », pour conclure.

### 3. Vérifier par de VRAIS événements de pointeur, sur le chemin le plus court

**La plus coûteuse des quatre.** Le mode focus ne s'armait pas quand on ouvre
un genre d'un seul clic depuis la vue d'ensemble. Mes vérifications
appelaient les fonctions internes du moteur, et passaient toujours par la
famille avant d'ouvrir un genre : deux raccourcis qui, ensemble, contournaient
exactement le code défaillant. J'ai produit des chiffres justes sur une
situation que personne ne rencontre, pendant que le défaut était visible du
premier coup d'oeil sur l'écran de Mika.

Donc, sans exception : **on simule de vrais événements de pointeur sur le
canvas, et on emprunte le chemin le plus court qu'un visiteur emprunterait.**
Piloter l'application par ses fonctions internes ne prouve rien sur ce que
vit quelqu'un. `scripts` de capture : voir la mécanique CDP d'ADR-066, un
clic se dispatche par `Input.dispatchMouseEvent`.

### 4. Une page en arrière-plan ne rend AUCUNE image

`requestAnimationFrame` y est suspendu, pas ralenti. Toutes les mesures
automatisées lisaient un moteur à l'arrêt et rendaient des chiffres
parfaitement cohérents entre eux. Trois fois j'ai conclu à une régression de
rendu qui n'existait pas. Une capture d'écran force une image : **il en faut
donc deux de suite**, la première montrant l'état précédent. Ce qui est réglé
par le TEMPS arrive à l'heure, ce qui est lissé PAR IMAGE n'avance pas : les
deux se désynchronisent et l'écart ressemble à un bug.

---

## Regle permanente : le second bloc de rapport

**A la fin de CHAQUE mission**, apres le rapport habituel, ajouter un SECOND
bloc separe, destine a etre copie tel quel dans une conversation avec un
Claude qui n'a AUCUN contexte du projet.

Cette regle avait ete suivie au debut du projet, puis abandonnee. Retablie
a la demande de Mika.

**Le bloc doit etre autosuffisant.** Quelqu'un qui n'a jamais entendu parler
du projet doit pouvoir le lire et conseiller utilement. Donc :

- aucun « comme on a dit », aucun renvoi a une conversation anterieure
- aucun acronyme non explique
- aucun renvoi a un fichier du depot : si un chiffre compte, il est dans le
  bloc, pas dans un fichier que le lecteur n'a pas
- **aucune valeur de secret, jamais** : ni cle, ni jeton, ni identifiant de
  connexion, meme partiel, meme « publique ». On nomme la variable, jamais
  sa valeur

Format exact, separateurs compris :

```
------------------------------------------------------------
POUR CLAUDE DESKTOP - <nom de la mission> - <date>

Contexte du projet
<3 lignes: ce qu'est SONAA, ou on en est>

Ce que je viens de faire
<liste factuelle, une ligne par changement, avec les chiffres>

Ce que j'ai mesure
<les chiffres bruts>

Ce qui a casse ou surpris
<les erreurs trouvees, les regressions, les limites atteintes>

Ce qui reste ouvert
<les arbitrages non tranches, avec les options>

Ce que je propose de faire ensuite
<une seule prochaine etape, precise>

Ce dont j'ai besoin de Mika
<uniquement ce qu'il doit faire lui-meme, ou "rien">
------------------------------------------------------------
```

La section « Ce qui a casse ou surpris » n'est pas optionnelle et ne se
remplit pas par politesse : c'est celle qui a le plus de valeur pour un
lecteur exterieur, et c'est aussi celle qu'on est le plus tente d'alleger.
Une mission sans surprise s'ecrit « rien », pas une reformulation flatteuse
de ce qui a marche.

---

## 1. Où on en est

**LE PROJET EST GELÉ depuis le 12 août 2026** (ADR-078), sur décision de Mika :
plus de fonctionnalité, plus d'optimisation. Ce qui reste est de l'entretien et
de la correction de défauts. Une session qui reprend ce document ne propose
donc rien de neuf sans que Mika le demande.


**Le site est en ligne, complet et publié sur `https://sonaa.ca`.** Ce n'est
plus un prototype, plus une phase, plus un périmètre réduit. Ce qui reste est
de l'affinage et de l'écriture.

**Le corpus est complet.** 14 familles, 218 genres, 1763 morceaux, **tous
vérifiés** : aucun identifiant non vérifié ne subsiste. Chaque genre a au
moins un morceau, 1197 dans l'onglet Essentiel et 566 dans l'onglet Actuel.
40 filiations portent `confidence: "debated"`, 73 genres sont marqués `major`,
et les 218 descriptions sont écrites. `npm run validate:data` rend « Corpus
valide » et signale un seul genre sous la cible de trois morceaux, `psycore`,
qui en a deux.

**Deux vues, pas quatre** (ADR-060). **3D LIBRE** par défaut et **COLONNES**.
La 3D fixe et la vue linéaire sont supprimées, code compris. Le sélecteur est
une bascule qui nomme sa destination.

**La lecture des morceaux est réelle**, par le lecteur officiel YouTube dans
une iframe qui survit à la navigation. Le transport simulé n'existe plus.

**La vue liste `#/index` lit le corpus réel.** Les données factices ont
disparu du projet.

**Le site est installable et se consulte hors ligne** (ADR-059), vérifié en
production sur sonaa.ca. Précache de 41 entrées, 2217 Ko : le code, les
styles, la police, les icônes. Les 1263 pochettes (39 Mo) et les 26 écrans de
lancement iOS (2,9 Mo) sont gardés à l'usage et non préchargés. YouTube et
Supabase sont en `NetworkOnly`, et c'est une règle, pas un réglage.

**Les fils de discussion sont en place.** Commentaires par genre, réponses,
votes, signalements et modération, sur Supabase, avec dix migrations
appliquées. Les propositions de contribution vivent à côté, sur `#/propositions`.

**Le scintillement est résolu** (ADR-065), après sept signalements et six
corrections ratées. Trois causes mesurées, toutes supprimées : le grain animé
du fond, la respiration des sphères, et le flux lumineux des liens. Zéro pixel
instable partout, y compris dans l'état déployé où le défaut vivait. Les
crochets de mesure restent sous `window.__atlas.mesurerScintillement()`.

**L'image de partage montre l'atlas** (ADR-066), plus le logotype seul. Elle
se refait par `npm run capture:og`.

**Mode focus** (ADR-067, révisé par ADR-069, ADR-070 et ADR-074). Entrer dans
un genre ferme l'écran. **Le clic ouvre une GÉNÉRATION, pas un chemin** : la
racine de la vue reste au centre, ses dérivés restent en couronne, et chacun
d'eux déploie ses propres sous-genres en éventail vers l'extérieur ; le noeud
cliqué est simplement sélectionné. **Chaque sphère visible porte son nom** (ADR-075) : la
hiérarchie se lit par la taille, 22 px pour la racine, 16 pour ses dérivés,
13 pour la génération suivante, plancher 12. Aucun masquage, jamais ; en cas
de collision le nom se décale, ce qui renverse la règle inverse d'ADR-040.
L'ensemble occupe 86 % de l'écran à deux générations, 60 % à une. Ce qui est dans la zone reste net et cliquable, tout le reste est **réellement défocalisé** par
cinq passes de gaussienne séparable au quart de résolution, textes DOM
compris (16 px de flou CSS), et **ne répond plus au clic**. Mesuré : 12 fois
moins d'inversions de gradient sur une ligne d'écran, à géométrie identique. Les dérivés sont redisposés en couronne dans le plan de la caméra à
chaque descente. **Un genre sans dérivés ne déplace pas la caméra** : on reste
dans le contexte de son parent. **Le focus s'arme à CHAQUE ouverture de
genre, quel que soit le chemin**, y compris d'un seul clic depuis la vue
d'ensemble (ADR-072). Un nom dont la sphère est cachée derrière une autre est
masqué, jamais atténué. Échap remonte d'un cran, un second Échap ou un
clic dans le flou sort du mode.

**La colonne du lecteur ne se ferme plus** (ADR-068). Elle se réduit, elle se
rappelle, elle montre un genre tiré au sort avant le premier clic, et aucune
lecture ne démarre jamais seule.

**80 ADR** dans `ARCHITECTURE.md`. Aucun point ouvert déclaré à la fin du
fichier.

---

## 2. Le projet en une phrase

Un atlas généalogique interactif des musiques électroniques. Un espace 3D
habitable où chaque famille est une structure de sphères reliées par leur
filiation, dans lequel on descend par niveaux jusqu'aux morceaux.

Site statique, publié par GitHub Actions sur GitHub Pages, servi sur le
domaine **sonaa.ca**, base `/` et non plus `/Sonaa/`. Aucune clé au runtime.
Deux variables publiques par conception, `VITE_SUPABASE_URL` et
`VITE_SUPABASE_ANON_KEY`, et un contrôle de CI vérifie qu'aucun secret n'a
traversé le build.

---

## 3. Décisions validées, à ne plus rediscuter

### Infrastructure

| Décision | Raison |
|---|---|
| Le projet vit dans `~/Dev/Sonaa`, jamais dans iCloud | iCloud avait déjà corrompu le `.git` : `git fsck` remontait des objets manquants |
| Remote en SSH | un jeton en clair dans `.git/config` a été révoqué, plus jamais de jeton dans un remote |
| React 19, contre le brief qui disait 18 | aucune dépendance à une lib de graphe tierce, donc aucun risque d'incompatibilité. ADR-012 |
| Vite 5, avis esbuild accepté sans correctif | la faille ne touche que `vite dev`, jamais le site publié. ADR-017 |
| Le dépôt a été supprimé et recréé vierge | l'ancien historique contenait un mot de passe en clair dans un dépôt public |
| Supabase pour les contributions et les fils | seule partie non statique du projet, et elle est facultative : sans les deux variables, l'interface le dit et le reste fonctionne |

### Rendu

| Décision | Raison |
|---|---|
| Three.js, pas PixiJS ni regl | mesuré sur des bundles réels : three 167 K gzip, pixi 165 K, regl 47 K. Pixi ne pèse pas moins et son instanciation est moins bonne |
| Halo dans le shader, aucun post-traitement **sauf le flou de mise au point** | la règle tient toujours pour le halo (ADR-019). Elle a été levée une fois, explicitement, pour le mode focus : un flou demande de mélanger des pixels voisins, ce qu'aucun fragment ne peut faire. Huit appels de dessin au lieu de trois, et seulement dans cet état. ADR-069 |
| Sphères en imposteurs billboard, normale analytique | pas de géométrie de sphère, pas d'asset, un seul appel de dessin |
| Lambert plus liseré, aucune spéculaire | ni chrome, ni vernis, ni plastique |
| Rubans de liens élargis en **espace monde** | l'élargissement en espace écran s'est révélé impossible à fiabiliser aux largeurs réalistes. Documenté comme piège |
| Tout le texte en DOM projeté, jamais en WebGL | c'est la couche qui porte l'accessibilité, et le navigateur rastérise mieux que n'importe quel atlas de glyphes. **Conséquence pratique** : une capture du tampon WebGL ne contient aucun nom, il faut photographier la page (ADR-066) |
| Labels : masquage du plus lointain en cas de collision, **jamais de décalage** | règle posée par Mika. Seule exception documentée : les labels d'ensembles, supprimés depuis avec le niveau zéro |
| Aucune plaque sous les labels | deux ombres portées plus assombrissement local de la sphère dans le shader. **A déjà régressé une fois**, contrôler par `grep background` dans les feuilles de l'atlas |
| Une seule famille déployée à la fois, un seul niveau déployé à la fois | plusieurs familles ouvertes se lisaient comme un éparpillement. ADR-029, durci par ADR-056 |
| **Aucun mouvement permanent dans la scène** | le grain, la respiration et le flux des liens ont été supprimés après mesure : ils produisaient du scintillement. Ne pas réintroduire d'animation continue sans mesurer avec `mesurerScintillement()`. ADR-065 |
| Rayon de sphère indexé sur la profondeur | c'est ce qui rend la hiérarchie lisible sans cliquer |
| Liens effilés du parent vers l'enfant, arrêtés à la surface des sphères | la direction de la filiation se lit sans flèche ; s'arrêter au centre passait sous la sphère |
| Cadrage calculé sur l'étendue **mesurée** du nuage | la sphère englobante est presque vide, deux familles excentrées en fixaient le rayon |

### Navigation

- Trois niveaux : atlas, famille, genre. Le niveau zéro des grands ensembles a
  été supprimé (ADR-053).
- **Aucun changement de niveau sans vol de caméra**, easing doux, le noeud
  atteint devient le centre d'orbite.
- **Le clic sur un genre ouvre directement ses morceaux**, la fiche vit dans
  la colonne (ADR-046).
- Suivi direct des gestes : le glissement tourne pendant le geste, l'inertie
  n'existe qu'au relâchement, le pincement est ancré au milieu des doigts,
  double tap pour zoomer (ADR-051).
- Contrôles en haut à droite, trois ronds de 44 px, estompés après 3 s
  d'inactivité et réveillés au moindre geste.
- Fil d'Ariane permanent, chemin **recalculé depuis la racine** à chaque clic :
  il ne peut pas mentir.
- Le logotype ramène à la vue d'ensemble sans couper la lecture en cours.
- `prefers-reduced-motion` remplace toute animation par une apparition directe.

### Typographie et couleur

- **Inter variable**, un seul woff2 servi depuis `public/fonts/`. La pile
  SF Pro a été abandonnée : elle ne garantissait rien hors Apple.
- Hiérarchie par graisse, pas par famille. Plus aucun mono, BPM compris.
- Labels bornés : **plancher de 9 px** au niveau d'ensemble, réglage demandé
  explicitement et gelé (ADR-058). Il coûte 8 points de SEO mobile à
  Lighthouse, c'est assumé.
- 14 teintes, chroma 0,13 à 0,18, luminosité 0,60 à 0,75, écart minimal de
  22 degrés, **rien entre 90 et 120 degrés**, la zone olive-kaki qui salit.
- Contraste **mesuré** : blanc sur le fond 19,4:1, blanc sur une sphère claire
  1,96 à 2,52:1. C'est ce qui justifie les ombres et l'assombrissement local.

### Ce qui a été abandonné, et pourquoi

Ne pas ressusciter sans raison neuve.

1. **La planche de relevé et la 3D à axe temporel.** Le temps ne structure
   plus l'espace ; l'année est une donnée de panneau, sans géométrie.
2. **Les masses volumétriques par raymarching.** 6,64 ms au pire, quarante
   fois le rendu retenu, et un rendu « brume » alors qu'on veut des corps.
3. **L'archive de l'ancien agrégateur RSS.** L'agrégateur est mort, ADR-010
   est caduc.
4. **Les grands ensembles et le niveau zéro** (ADR-053).
5. **La 3D fixe et la vue linéaire** (ADR-060), avec `webgl.ts`, 1894 lignes.
6. **Le mini-jeu de devinettes** (ADR-064), jamais terminé, jamais importé,
   migrations jamais appliquées.
7. **Le grain, la respiration et le flux des liens** (ADR-065).

---

## 4. Ce qui reste ouvert

**LES QUATRE TEXTES SONT ÉCRITS ET EN LIGNE** (ADR-076). L'accroche d'accueil,
le texte d'auteur de la page À propos, et le mot de l'auteur sur `darkdisco`,
`indiedance` et `progpsy`. Le champ `motDeLAuteur` reste absent des 215 autres
genres, délibérément : une voix qui parle partout ne dit plus rien.

**`check:plafond` ne bloque plus les publications sans rapport avec lui**
(ADR-073) : il ne s'exécute que si les données ont bougé, et il retente une
fois avant de conclure.

**Aucune mesure instrumentée sur appareil réel.** Les verdicts tactiles de
Mika ont été rendus sur un vrai téléphone et ont produit ADR-051, et la PWA a
été vérifiée en production. Mais aucun relevé GPU n'a jamais été pris
ailleurs que sur un M4 Max : toutes les valeurs de performance mobiles restent
des extrapolations.

**Le mode réduit n'est PAS du code mort** (ADR-077). Sa justification
d'origine a disparu avec le raymarching, son effet est intact : il plafonne le
rapport de pixels à 1,5 au lieu de 2 sur téléphone, sur processeur à quatre
coeurs et sur les GPU mobiles connus. Le retirer coûterait, précisément là où
rien n'a jamais été mesuré.

**Les points de Lighthouse qui manquent sont connus et assumés.** « Bonnes
pratiques » perd 4 points sur un avertissement de cookie émis par l'iframe
YouTube elle-même, déjà servie depuis `youtube-nocookie.com` ; « SEO » mobile
perd 8 points sur le plancher de 9 px des labels, qui est un réglage demandé.
Les corriger reviendrait à défaire des décisions prises.

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

**Second bloc, pour Claude Desktop.** Voir la règle permanente en tête de
document. Autosuffisant, sans renvoi à un fichier, sans valeur de secret.

**Commit et push à chaque étape validée.** Message conventionnel, une ligne de
description claire. Après chaque push, donner **le lien du run GitHub Actions et
l'URL à ouvrir**, et vérifier que l'asset servi en ligne correspond au build
local.

**Avant toute commande destructive, demander.**

**Écriture française** : pas de tiret cadratin, virgule ou trait d'union simple.
`npm run check:tirets` le vérifie en CI.

**Ne jamais écrire une valeur de secret dans un document du dépôt**, pas même en
exemple dans une commande de contrôle. C'est arrivé une fois, un mot de passe
s'est retrouvé dans `ARCHITECTURE.md` et n'a été rattrapé qu'avant le push.

**Les quatre règles de vérification sont en tête de ce document, section 0.**
Elles ne sont pas un rappel de bonnes intentions : chacune vient d'un défaut
livré. À relire avant de mesurer quoi que ce soit.

---

## 6. Règles sur les données, elles priment sur tout

**Les vrais noms avant le graphisme.** On ne juge pas une mise en page avec des
noeuds nommés `disco-1`. Fait depuis longtemps.

**Mika ne délègue pas le corpus.** L'agent produit un brouillon par lignée,
Mika relit chaque filiation avant qu'elle entre dans le dépôt.

**Sur le dark disco, l'indie dance et le psy-prog, Mika est la source.** Ne rien
inventer sur ces trois sujets, demander.

**Filiation incertaine : `confidence: "debated"`**, avec la controverse
expliquée dans les notes et une source. Une filiation musicale est une
interprétation, pas un fait. 40 genres portent la mention.

**Aucun identifiant YouTube inventé, jamais.** `scripts/lib/match.ts` fait
autorité sur le champ `verified`, et le build de production retire les
morceaux non vérifiés. Les 1763 morceaux du corpus sont tous vérifiés.

**Un seul chemin d'écriture du corpus** (ADR-044), contrôlé en CI par
`npm run check:writes`. Deux scripts qui écrivent le même fichier produisent
un fichier qui dépend de l'ordre de lancement. La même règle vaut pour
`public/og.png`, dont `capture-og.mjs` est désormais le seul écrivain.

**Aucune clé côté client.** Les scripts qui demandent une clé la lisent dans
l'environnement et ne tournent qu'au build ou à la main. Au runtime, les seuls
appels tiers sont l'iframe YouTube et Supabase.

**Les genres réservés ne sont pas cherchés automatiquement.** darkpsy, hitech,
psycore, zenonesque, twilightpsy et neogoa : les nomenclatures de référence ne
les connaissent pas, et les campagnes automatiques n'y produisaient que des
refus ou, pire, des acceptations fautives.

**Aucune source documentaire n'est nommée dans l'interface** (ADR-038), notes
du corpus comprises. La page `#/credits` cite des catégories. Les documents du
dépôt, eux, nomment leurs sources : ils sont l'appareil critique, pas
l'interface.

---

## 7. Repères techniques utiles

**Tailles réelles au build du 11 août 2026**, gzip :

| Fichier | brut | gzip |
|---|---|---|
| structures (le corpus compilé) | 724,6 K | 207,0 K |
| shaders et couche WebGL | 515,7 K | 131,6 K |
| index | 200,8 K | 63,4 K |
| supabase | 216,9 K | 57,2 K |
| AtlasPage | 53,4 K | 17,4 K |
| webgl-orbit | 32,2 K | 13,6 K |

Le corpus est le premier poste, loin devant le code. Il est importé en JSON et
donc compilé dans le bundle : c'est pour cela qu'il n'est pas préchargé
séparément.

**Mesurer une performance GPU.** `gl.finish()` ne synchronise pas de façon
fiable sous ANGLE/Metal, les temps relevés étaient absurdes avec des deltas
négatifs. Utiliser `EXT_disjoint_timer_query_webgl2`, une requête
`TIME_ELAPSED` encadrant 150 à 200 rendus, médiane de 3 campagnes. Attendre le
résultat avec `MessageChannel`, jamais `setTimeout` ni `requestAnimationFrame` :
les deux sont bridés à 1 Hz dans un onglet en arrière-plan.

**Mesurer un scintillement.** `window.__atlas.mesurerScintillement()`, avec
`composante(nom, actif)` pour éteindre une composante à la fois. Deux pièges
déjà payés : dessiner deux fois le même état rend zéro parce qu'un GPU est
déterministe, et un seuil trop haut ne retient que quelques pixels sur trois
millions. Et surtout : mesurer **la situation où le défaut se produit**, pas la
vue d'ensemble par confort.

**Pièges GLSL déjà payés**, détaillés dans `ARCHITECTURE.md` :
`half` est un mot réservé, `fwidth` renvoie 0 dans le chemin GLSL 1.0 de three
ce qui produit un NaN via `smoothstep(a, a, x)`, et `camera.matrixWorldInverse`
n'est mis à jour que par le rendu donc `project()` utilise une matrice périmée
d'une image si on ne l'inverse pas à la main.

**Une animation doit se terminer même si l'image suivante arrive après sa fin.**
Un test « temps écoulé inférieur à la durée » ne suffit pas, il faut un drapeau
et une fin forcée, sinon la caméra n'atteint jamais sa destination sur une
machine lente.

**`verify:visual` est un pilote, il tourne seul.** `npm run verify:visual`
lance Chrome en headless, passe aux quatre largeurs (390, 700, 1024, 1440 px)
et arme le mode focus **par un vrai clic** sur le canvas à chaque fois. Il ne
tourne pas en CI, la décision d'ADR-048 tient. Pour une image, c'est
`npm run capture:og` (ADR-066).

---

## 8. Cartographie des fichiers

```
ARCHITECTURE.md    66 ADR, plus une section « pièges GLSL »
DESIGN.md          direction artistique, sections CADUC conservées pour mémoire
HANDOFF.md         ce document
CORPUS.md          l'appareil critique du corpus, sources nommées
ECHECS-SILENCIEUX.md  les verdicts rassurants qui ont menti, à relire avant
                      d'écrire un rapport

src/main.tsx       routeur en mode hash : atlas, index, credits, a-propos,
                   propositions, moderation
src/atlas/         TOUT le produit
  AtlasPage.tsx      la page, l'état de navigation, le choix de vue
  webgl-orbit.ts     LE moteur 3D, seul survivant, expose window.__atlas
  ColumnsView.tsx    la vue Colonnes
  PlayerLayer.tsx    le lecteur, la colonne, la fiche de genre
  structures.ts      le corpus chargé et mis en forme pour le rendu
  CommentsSection.tsx, ProposalCard.tsx, ContributeDialog.tsx  contributions
  verify-visual.ts   les mesures, dans le navigateur, jamais en CI
src/data/          corpus.json (218 genres) et schema.ts (Zod)
src/lib/           supabase, auth, comments, proposals, pwa, config
src/design/        tokens.css et base.css

scripts/lib/match.ts   LE matcher, autorité sur « est-ce bien ce morceau »
scripts/validate-data  intégrité du corpus et couverture par genre
scripts/import-tracks  injection d'une source humaine dans le corpus
scripts/build-brand.sh identité : favicons, icônes, écrans de lancement iOS
scripts/capture-og.mjs SEUL écrivain de public/og.png (Chrome headless, CDP)
scripts/check-*        les garde-fous, tous lancés par la CI

supabase/migrations/   dix migrations appliquées : propositions, votes,
                       modération, votes de morceaux, commentaires
.github/workflows/deploy.yml  huit contrôles, build, contrôle anti-secret,
                              puis publication sur GitHub Pages
```
