# SONAA, décisions d'architecture

Format ADR court. Chaque décision : contexte, décision, conséquences.
Statut global : proposition, en attente de validation. Aucun code écrit.

---

## ADR-001 : Le layout est calculé au build, jamais au chargement

**Contexte.** 180 noeuds, un ordonnancement de Sugiyama avec 8 à 12 passes puis jusqu'à
300 itérations de relaxation. C'est de l'ordre de la seconde de calcul, sur le thread
principal, avant le premier pixel.

**Décision.** `scripts/build-index.ts` exécute le moteur de layout et sérialise les
positions dans `layout.json`. Le runtime charge des coordonnées, il ne les calcule pas.
Le moteur ne tourne à l'exécution que si un filtre modifie le sous-graphe visible, et
alors uniquement dans un Web Worker.

**Conséquences.** Le premier rendu est immédiat. Le layout devient testable par
comparaison exacte : même entrée, mêmes coordonnées, sinon le test échoue. En revanche
toute modification des données impose de relancer le build, ce qui doit être câblé dans
le script `dev` pour ne pas produire de positions périmées en développement.

---

## ADR-002 : Un layout maison, aucune librairie de graphes

**Contexte.** react-flow, cytoscape et vis-network sont interdits par le brief, et à
raison : leur rendu est identifiable au premier coup d'oeil. Mais il y a une raison plus
forte.

**Décision.** Moteur dédié dans `src/graph/layout/`. Y est contraint : `y = timeScale(year)`.
Seul X est résolu, par barycentre pondéré des parents puis relaxation avec répulsion
intra-bande et biais de couloir par famille.

**Conséquences.** Aucune librairie ne sait faire ça, parce qu'aucune n'accepte un axe
déjà contraint : elles veulent placer les deux dimensions. Le coût est un moteur à écrire
et à tester nous-mêmes. En contrepartie, l'axe temporel est exact plutôt qu'approximé,
ce qui est la promesse même du produit.

---

## ADR-003 : Le noeud est un segment, pas un point

**Contexte.** Voir DESIGN.md section 2. Un genre occupe `[yearStart, yearEnd]` sur l'axe Y.

**Décision.** Le layout produit pour chaque genre `{ x, yTop, yBottom, yPeak }` et non un
simple `{ x, y }`. Les arêtes s'ancrent au `yTop` de l'enfant et à la hauteur
`timeScale(enfant.yearStart)` sur le corps du parent.

**Conséquences.** Cela remonte dans tout le système. La répulsion intra-bande doit tenir
compte de segments qui se chevauchent verticalement sur plusieurs décennies, pas de
points isolés dans une bande de deux ans. Le hit-testing porte sur des segments, donc le
quadtree indexe des boîtes, pas des points. C'est plus de travail que le cas classique,
et c'est à budgéter en P2.

---

## ADR-004 : SVG jusqu'à 600 noeuds visibles, Canvas au-delà

> **REMPLACÉ par ADR-018.** Le rendu principal passe en WebGL, avec une
> répartition en trois couches. Le repli SVG survit, mais comme filet de
> sécurité (ADR-020), plus comme mode nominal.

**Contexte.** Le SVG donne l'accessibilité, le focus clavier et le CSS gratuitement.
Il s'effondre en pan et zoom au-delà de quelques centaines de noeuds animés.

**Décision.** Rendu SVG par défaut. Bascule automatique sur Canvas 2D avec hit-testing
`d3-quadtree` quand le sous-graphe visible dépasse 600 noeuds.

**Conséquences.** Deux chemins de rendu à maintenir en cohérence visuelle, ce qui est un
risque de dérive réel. Mitigation : les deux lisent les mêmes tokens CSS, résolus une
fois via `getComputedStyle` et passés au renderer Canvas. Le mode Canvas perd le focus
clavier natif, ce qui est couvert par ADR-008.

---

## ADR-005 : Zod valide au build et en développement, jamais en production

**Contexte.** Zod sur 180 genres en trois langues au démarrage, c'est du temps de parsing
et environ 14 Ko gzip pour valider des données qui sont figées à la publication.

**Décision.** `scripts/validate-data.ts` fait autorité et bloque la CI. En développement,
validation runtime active pour attraper une erreur de saisie immédiatement. En production,
les schémas sont exclus du bundle par `import.meta.env.DEV`.

**Conséquences.** Une donnée invalide ne peut pas atteindre la production, puisque la CI
échoue avant le build. Corollaire à assumer : personne ne doit pouvoir committer des JSON
sans passer par la CI.

---

## ADR-006 : La vérification YouTube est un filtre de build, pas un contrôle de qualité

**Contexte.** Le brief interdit tout identifiant non vérifié en production. Un contrôle
qui se contenterait d'avertir serait ignoré au bout de trois semaines.

**Décision.** `scripts/verify-youtube.ts` interroge l'endpoint oEmbed, compare le titre
retourné à `artist` et `title` par similarité, écrit le champ `verified` et produit
`reports/youtube-verification.md`. Le build de production **retire** les morceaux
`verified: false` du bundle. Un genre sans aucun morceau vérifié affiche « Sélection en
cours de vérification. »

**Conséquences.** Un morceau retiré de YouTube fait rétrécir la sélection au prochain
build, sans jamais casser le site. Point de vigilance : oEmbed sur 700 morceaux est
sujet à la limitation de débit, donc appels séquentiels avec temporisation et cache local
des résultats. Ce n'est pas un script à relancer à chaque build.

---

## ADR-007 : Routeur en mode hash

**Contexte.** GitHub Pages sert du statique et renvoie 404 sur toute route profonde qui
ne correspond pas à un fichier.

**Décision.** React Router en `HashRouter`. Forme des URL : `#/fr/genre/acid-house`.
La langue est un segment du fragment, pas un préfixe de chemin.

**Conséquences.** Aucune configuration serveur, aucun `404.html` de contournement.
Coût réel : les crawlers ignorent le fragment, donc chaque genre n'aura pas d'URL
indexable. Si le référencement par genre devient un objectif, il faudra pré-rendre des
pages statiques en P7, ce que le brief mentionne déjà comme optionnel.

---

## ADR-008 : L'accessibilité passe par une vue parallèle, pas par le SVG

**Contexte.** Un graphe zoomable de 180 noeuds n'est pas rendu accessible par des attributs
ARIA. En mode Canvas, il n'y a même plus de DOM à annoter.

**Décision.** `#/index` sert une **vue liste hiérarchique** avec le même contenu, les
mêmes liens et la même navigation, entièrement au clavier et au lecteur d'écran. Elle est
un chemin de première classe, annoncée en début de document, pas un repli caché.

**Conséquences.** Un second rendu du même modèle à maintenir. C'est le prix d'une
accessibilité réelle plutôt que déclarative. Le SVG garde `role="application"`, un
`aria-label` explicite et un focus visible sur les noeuds, mais ce n'est pas là-dessus
que repose la conformité.

---

## ADR-009 : Les traductions vivent dans les données, pas dans des fichiers de langue

**Contexte.** Une description de genre est une donnée éditoriale de 400 à 800 signes,
pas une chaîne d'interface.

**Décision.** `description` et `Edge.note` sont des `Record<Lang, string>` dans les JSON
de genres. `src/i18n/` ne contient que les chaînes d'interface. Aucune traduction générée
à l'exécution.

**Conséquences.** Ajouter un genre veut dire écrire trois descriptions, ce qui est
volontairement contraignant : un genre à moitié traduit se voit tout de suite. Le
validateur vérifie que les trois langues sont présentes et non vides.

---

## ADR-010 : L'ancien site est un build figé, committé une seule fois

> **CADUC.** L'agrégateur RSS a été abandonné. Il n'y a ni archive, ni
> `public/OLD/`, ni build figé. Le dépôt a été supprimé et recréé vierge.
> Conservé pour mémoire du raisonnement, ne pas appliquer.

**Contexte.** Le site actuel est un SPA Vite qui charge `/index.tsx`, donc du TypeScript
avec JSX. Le déplacer tel quel dans `public/OLD/` produirait une page blanche : aucun
navigateur n'exécute ce fichier.

**Décision.** L'agrégateur RSS actuel est bâti une fois avec `base: '/Sonaa/OLD/'`, sa
sortie `dist/` est committée dans `public/OLD/`, et ses sources sont retirées de la racine.
Elles restent accessibles par l'historique git et par un tag `v0-rss-aggregator`.

**Conséquences.** L'ancienne version est gelée, définitivement. Aucun second `package.json`,
aucun second arbre de dépendances, aucun double build en CI. Elle ne recevra plus de
correctif, ce qui est le comportement attendu d'une archive.

**Contrôle bloquant avant le gel.** L'ancien code contient un mot de passe administrateur
en clair dans `App.tsx` et une injection de clé Gemini dans le bundle. Le build figé est
produit **après** retrait des deux, et le gel n'a lieu que si ces trois commandes ne
sortent rien :

```
grep -rEi 'ghp_|github_pat_|AIza|sk-[A-Za-z0-9]{16}' dist/
```

Si le contrôle remonte quoi que ce soit, le commit est reporté. Graver un secret
dans une archive figée, c'est le graver pour toujours. Voir ADR-011.

Une valeur de secret ne s'écrit jamais dans un document du dépôt, pas même à
titre d'exemple dans une commande de contrôle : le document est poussé, donc la
valeur le serait aussi.

---

## ADR-011 : Aucun secret ne traverse le build

**Contexte.** Trois fuites constatées dans l'état actuel du repo :
un jeton GitHub personnel en clair dans `.git/config`, un mot de passe administrateur
en dur dans `App.tsx`, et `vite.config.ts` qui injecte `GEMINI_API_KEY` dans le bundle
client via `define`.

**Décision.** Le nouveau projet n'a aucun secret, par construction : pas de backend, pas
de clé, pas d'authentification, pas d'analytique. Le `define` d'injection de clé disparaît.
Le jeton du remote est révoqué et remplacé. Le mot de passe est retiré avant le gel de
`public/OLD/`.

**Conséquences.** Un contrôle de CI qui échoue si `dist/` contient un motif ressemblant à
une clé (`ghp_`, `AIza`, `sk-`) coûte cinq lignes et interdit la récidive. À câbler en P0.

---

## ADR-012 : React 19, en écart assumé avec le brief

**Contexte.** Le brief impose React 18. Le repo est déjà en React 19.

**Décision.** React 19. Le seul risque d'incompatibilité en React 19 vient des librairies
de graphes tierces, et il n'y en a aucune ici puisque le layout est maison (ADR-002).
Zustand 5, React Router 7 et les modules d3 sont alignés sur 19. Régresser en 18
n'achèterait rien.

**Conséquences.** Écart documenté par rapport à la section 2 du brief, validé
explicitement. Aucune autre décision de ce document n'en dépend.

---

## ADR-013 : D3 en modules ciblés, jamais le paquet complet

> **Budget révisé par ADR-021**, porté à 420 Ko gzip. La règle des modules
> ciblés reste entière et s'étend à Three.js (ADR-019).

**Contexte.** Budget de 250 Ko gzip pour le JS initial, hors données.

**Décision.** Uniquement `d3-zoom`, `d3-selection`, `d3-scale`, `d3-shape`, `d3-interpolate`
et `d3-quadtree`. Un contrôle de taille de bundle en CI échoue au-dessus du budget.

**Conséquences.** `d3-shape` sert au tracé des courbes de Bézier des arêtes, mais s'il
s'avère qu'on n'utilise qu'un générateur de chemin, l'écrire à la main retire une
dépendance. À réévaluer en fin de P2, pas avant.

---

## ADR-014 : Les données sont découpées par famille, chargées à la demande

**Contexte.** 180 genres avec trois descriptions de 800 signes, plus les morceaux et les
sources, c'est de l'ordre de 400 à 600 Ko de JSON avant compression.

**Décision.** Un fichier par famille dans `src/data/genres/`. Le chargement initial ne
prend que le squelette du graphe, c'est-à-dire l'identifiant, le nom, les années, la
famille, les arêtes et les positions. Les descriptions, morceaux et sources sont chargés
par famille au premier besoin.

**Conséquences.** La carte complète s'affiche avec un squelette léger, conforme à la
cible de 2 secondes en 4G. Le premier clic sur un genre déclenche une requête, à masquer
par un préchargement au survol.

---

## ADR-015 : Une seule rupture d'échelle, déclarée à l'écran

**Contexte.** Le linéaire strict de 1948 à aujourd'hui laisse une vingtaine d'années
quasi vides entre la musique concrète et le krautrock, ce qui étire la planche sans rien
apporter. Mais ADR-003 vient de faire du noeud un segment dont la **longueur est une
donnée** : toute déformation locale de l'échelle fausse la comparaison des longévités.

**Décision.** Échelle linéaire stricte de 1969 à aujourd'hui. Un seul segment compressé,
l'avant-1969, et rien d'autre. La rupture est rendue visible sur la colonne de temps par
une zone hachurée, et un bouton « échelle réelle » rétablit le linéaire intégral.

**Conséquences.** Toute comparaison de durée à partir de 1969 est exacte, ce qui couvre
la quasi-totalité du corpus. Les genres de la famille `roots` antérieurs à 1969 ont une
longueur non comparable au reste, et c'est précisément ce que la hachure signale. Le
`timeScale` devient une échelle par morceaux à deux segments, et le test de déterminisme
du layout doit couvrir les deux modes.

---

## ADR-016 : Reclonage propre hors d'iCloud, historique repris à zéro

> **APPLIQUÉ, sous une forme plus radicale.** Le projet vit désormais dans
> `~/Dev/Sonaa`, hors d'iCloud. Le dépôt GitHub n'a pas été force-pushé mais
> supprimé et recréé vierge, et l'agrégateur RSS n'a pas été archivé.

**Contexte.** Deux faits établis à l'inspection. `git fsck` remonte des objets manquants
et des liens cassés sur au moins quatre commits : le dépôt local est **déjà corrompu**
par l'éviction iCloud. Et le repo est public, donc le mot de passe de `App.tsx` est
lisible de tous sur `main`.

**Décision.** Clone neuf depuis GitHub vers `~/Dev/Sonaa`, hors d'iCloud. Le nouvel atlas
démarre sur une **branche orpheline** qui devient `main`, l'ancien historique n'est pas
conservé : il ne contient que 22 fichiers d'un agrégateur RSS qui sera de toute façon gelé
en sortie de build, et il porte un secret dans chacune de ses révisions.

**Conséquences.** L'historique du mot de passe disparaît de GitHub après force push. Le
mot de passe reste compromis pour autant : il a été public, il doit être changé partout
où il a été réutilisé, indépendamment de cette opération. Le clone iCloud actuel n'est
plus une source fiable et ne doit servir qu'à récupérer `DESIGN.md`, `ARCHITECTURE.md`
et les logos, par copie de fichiers, jamais par opération git.

---

## ADR-017 : L'avis esbuild sur Vite 5 est accepté, pas corrigé

**Contexte.** `npm audit` remonte GHSA-67mh-4wv8-2f99 sur esbuild, tiré par Vite 5.
La faille permet à n'importe quel site web d'envoyer des requêtes au serveur de
développement et d'en lire la réponse. Le correctif impose Vite 8, un saut de trois
majeures qui contredit la stack imposée.

**Décision.** On reste sur Vite 5 et on n'applique pas le correctif.

**Pourquoi c'est sans conséquence ici.** La faille ne touche que `vite dev`, un
serveur qui ne tourne que sur un poste de développement. SONAA publie des fichiers
statiques sur GitHub Pages : il n'y a aucun serveur de développement en production,
et le build lui-même n'est pas affecté. La surface d'attaque se limite à une machine
de développement qui visiterait un site hostile pendant que `npm run dev` tourne.

**Conséquences.** `npm audit` restera bruyant tant que la stack sera en Vite 5, ce
qui est acceptable mais doit être connu pour ne pas être re-diagnostiqué à chaque
installation. À réévaluer si Vite 5 reçoit un correctif rétroporté, ou au moment
où une montée de version majeure sera de toute façon nécessaire.

---

## ADR-018 : Rendu hybride en trois couches, remplace ADR-004

**Contexte.** Un seul moteur de rendu ne sait pas bien faire les trois choses que
SONAA demande simultanément : de la matière dense et animée sur des milliers
d'entités, du texte accessible et sélectionnable, et des repères géométriques
parfaitement stables.

**Décision.** Trois couches superposées, chacune cantonnée à ce qu'elle fait le
mieux.

1. **WebGL (Three.js, caméra orthographique).** Noeuds et arêtes, en deux
   `InstancedMesh`, donc deux appels de dessin pour le graphe entier. Shaders
   écrits à la main. Capsules tracées par fonction de distance signée, pas de
   géométrie par noeud. Fond en shader plein écran.
2. **DOM en overlay.** Tout le texte, positionné par projection des coordonnées
   WebGL à chaque image. Plafond de 60 labels, pool de noeuds recyclés.
3. **SVG.** Axe temporel gradué et minimap uniquement.

**Pourquoi orthographique.** La perspective déformerait l'axe du temps. Deux
segments de même durée doivent avoir la même longueur à l'écran quelle que soit
leur position, sinon la lecture comparative des longévités, qui est la promesse
du produit (ADR-003), devient fausse.

**Conséquences.** La couche DOM devient le porteur unique de l'accessibilité, ce
qui simplifie ADR-008 : il n'y a plus de texte inatteignable dans un canvas. En
contrepartie, la projection des coordonnées doit tourner à chaque image sans
provoquer de recalcul de mise en page, donc positionnement par `transform`
uniquement, jamais par `top` et `left`.

---

## ADR-019 : Three.js en modules ciblés, deux appels de dessin, aucun asset

**Contexte.** Three.js complet pèse de l'ordre de 170 Ko gzip. Un `import * as
THREE` embarque tout, y compris les chargeurs et les géométries dont on n'aura
jamais l'usage.

**Décision.** Imports nommés exclusivement, jamais d'espace de noms. Aucun modèle
3D, aucune texture bitmap, aucun asset externe : toute la matière est générée par
shader. Le graphe reste à deux appels de dessin.

**Conséquence sur le bloom.** Un bloom sélectif par post-traitement imposerait un
`EffectComposer`, plusieurs cibles de rendu et des passes supplémentaires, ce qui
contredit frontalement la contrainte des deux appels de dessin. Le halo de la
lignée active est donc produit **dans le shader des noeuds et des arêtes**, en
additif, piloté par un attribut d'instance. Même lecture à l'écran, sans passe
supplémentaire et sans cible de rendu intermédiaire.

**À vérifier.** Le tree-shaking doit être contrôlé sur le bundle réel, pas
supposé. Un contrôle de taille en CI échoue au-dessus du budget d'ADR-021.

---

## ADR-020 : Repli SVG obligatoire et garde de performance

**Contexte.** WebGL peut être indisponible, désactivé par politique d'entreprise,
ou perdu en cours de route sur un `webglcontextlost`. Un atlas qui devient une
page blanche dans ces cas-là n'est pas un site, c'est une démo.

**Décision.** Un rendu SVG complet et fonctionnel prend le relais si WebGL
manque ou si le contexte est perdu. Il n'est pas dégradé sur le plan de
l'information : mêmes noeuds, mêmes arêtes, mêmes liens, même navigation. Il perd
la matière, pas le contenu.

Trois gardes complémentaires :
- rapport de pixels plafonné à 2, quel que soit l'écran ;
- images par seconde mesurées sur 2 secondes glissantes, halo coupé sous 40 ;
- cibles : 60 images par seconde sur poste de bureau, 40 minimum sur mobile de
  milieu de gamme.

**Conséquences.** Deux chemins de rendu à maintenir, comme dans l'ancien ADR-004,
mais avec une répartition plus saine : le SVG n'est plus un mode nominal à tenir
au même niveau de finition, c'est un filet. Il doit rester correct, pas beau.

---

## ADR-021 : Budget porté à 420 Ko gzip, WebGL en import dynamique

**Contexte.** ADR-013 fixait 250 Ko gzip. Three.js, même en imports ciblés, ne
tient pas dans cette enveloppe avec le reste.

**Décision.** Budget relevé à 420 Ko gzip pour le JS, hors données. La couche
WebGL est chargée en **import dynamique après le premier rendu** : le squelette
de la carte, l'axe, l'interface et le repli SVG s'affichent d'abord, la matière
arrive ensuite.

**Conséquences.** La cible de 2 secondes en 4G porte sur le premier rendu utile,
pas sur l'arrivée de la couche WebGL. Corollaire à assumer : le repli SVG n'est
pas seulement un filet, c'est aussi le premier état visible de toute visite. Il
doit donc être correct dès la première image, pas seulement en cas de panne.

---

## ADR-022 : La pulsation vient du BPM déclaré, jamais de l'audio

**Contexte.** Faire battre la lignée active au rythme du morceau en cours suppose
d'analyser le son. L'iframe YouTube est servie depuis un autre domaine : la Web
Audio API ne peut pas s'y brancher, et toute tentative de contournement relèverait
de l'extraction de flux, ce que le projet s'interdit.

**Décision.** Le battement est calculé à partir du champ `bpm` du genre en cours
de lecture. Il pilote l'intensité du halo de la lignée active et le grain du fond,
à faible amplitude. Coupé par `prefers-reduced-motion`.

**Conséquences.** Le battement est juste en tempo mais pas en phase avec le
morceau : il ne peut pas l'être. C'est assumé, et c'est une raison de plus pour
garder l'amplitude basse. Un genre sans `bpm` renseigné ne pulse pas, ce qui est
préférable à une valeur inventée.

---

## ADR-023 : Budget de rendu révisé pour le volumétrique, et mode réduit

> Remplace les cibles de performance d'ADR-020 pour la couche WebGL.

**Contexte.** Le passage à l'espace habitable remplace des rubans et des
capsules par du raymarching volumétrique. Sur le prototype, le coût est passé
d'environ 0,16 ms au pire à 6,6 ms, soit un facteur quarante. Desktop tenait,
mobile non : l'estimation donnait 33 à 66 ms contre 25 ms de budget pour 40
images par seconde.

**Décision.** Deux dégradations, appliquées ensemble, toutes deux dans le
shader et sans cible de rendu intermédiaire.

1. **Pas adaptatifs, en continu.** Le nombre de pas de marche est interpolé
   entre 22 en vue d'ensemble et 10 quand une masse remplit l'écran. La
   couverture se déduit du rayon angulaire. Aucun palier : une transition par
   seuils se verrait comme un claquement de qualité pendant le dolly.
2. **Plein régime sur les trois masses les plus proches seulement.** Les autres
   passent par une approximation analytique sans boucle, un seul échantillon au
   milieu de la corde. À quelques dizaines de pixels, personne ne lit une
   densité interne. La masse ouverte reste toujours au plein régime.

**Mode réduit choisi au démarrage, pas après une chute.** Un détecteur de
capacité inspecte l'agent utilisateur, le nombre de coeurs et la chaîne du
renderer WebGL. Sur mobile ou GPU faible, le rendu démarre directement en
réduit : 12 pas maximum, plage 12 à 6, deux masses au plein régime, rapport de
pixels plafonné à 1,5. Attendre une chute de fps garantirait une première
seconde mauvaise sur exactement les machines qui en ont le moins besoin.

**Ce qui n'est pas fait.** La passe volumétrique en demi-résolution, qui
diviserait encore le coût par quatre, casserait la contrainte de cible de rendu
unique. Elle reste en réserve, à rouvrir seulement si les deux dégradations
ci-dessus ne suffisent pas une fois mesurées ensemble.

---

## ADR-024 : La vue liste devient un chemin de première classe

> Précise ADR-008 et remplace la notion de repli graphique.

**Contexte.** Le repli sans WebGL dessinait la frise en SVG. La frise n'existe
plus, et redessiner un espace volumétrique en SVG n'a aucun sens.

**Décision.** `#/index` sert une navigation hiérarchique complète, familles puis
genres, avec le même contenu et les mêmes liens que l'espace. Elle n'est pas un
repli : c'est l'index accessible du produit, annoncé et utilisable par tout le
monde. Sans WebGL, l'espace y renvoie au lieu d'afficher une demi-carte.

**Conséquences.** Construite sur `details` et `summary` natifs, donc atteignable
au clavier et correctement annoncée sans un seul `aria-expanded` à maintenir à
la main, donc sans occasion de mentir au lecteur d'écran. Le coût est un second
rendu du même modèle, déjà acté en ADR-008.

---

## ADR-025 : Navigation à trois niveaux, jamais sans vol de caméra

**Contexte.** Un espace 3D sans repères se traverse à l'aveugle. Le prototype
volumétrique n'avait qu'une entrée par proximité, invisible et indevinable.

**Décision.** Trois niveaux, atlas puis famille puis genre, et une règle unique :
**aucun changement de niveau ne se fait sans que la caméra vole vers la cible**,
600 ms, easing doux, cadrage calculé pour que le noeud et ses enfants directs
tiennent dans le champ. Le noeud atteint devient le centre d'orbite.

Trois moyens d'y parvenir, tous équivalents : le clic sur une sphère, le fil
d'Ariane permanent en haut à gauche dont chaque segment remonte, et le clavier.
Échap et le clic dans le vide remontent d'un niveau, toujours avec vol.

**Accessibilité de la commande.** Le trackpad seul ne suffit pas. Le glissement
souris tourne, la molette zoome, les flèches tournent, plus et moins zooment,
0 recentre. Des contrôles visibles en permanence en bas à droite doublent tout
cela. Une ligne d'aide s'affiche au premier chargement, disparaît à la première
interaction et ne revient plus, mémorisée dans `localStorage`.

**Conséquences.** Le vol doit se terminer même si l'image suivante arrive après
la fin de l'intervalle, sinon la caméra n'atteint jamais sa destination sur une
machine lente. Un simple test « temps écoulé inférieur à la durée » ne suffit
pas, il faut un drapeau et une fin forcée.

---

## ADR-026 : La vue tracks est une vue 2D, pas une surcouche 3D

**Contexte.** Choisir un morceau est une tâche de liste, pas d'espace. La
maintenir dans la scène 3D reviendrait à faire de la lecture de texte une
question de caméra.

**Décision.** Entrer dans les morceaux **suspend la 3D** : le canvas recule,
se floute légèrement, cesse de recevoir les gestes, et un panneau 2D plein
passe devant. Grille de pochettes carrées, 3 à 5 colonnes selon la largeur.
Lecteur persistant en bas : pochette, artiste, titre, transport, barre de
défilement cliquable, volume. Retour au graphe par bouton explicite et par Échap.

Deux onglets, deux sélections : **Actuel**, les sorties des cinq dernières
années triées par vues décroissantes, et **Essentiel**, les fondateurs du genre
toutes époques.

**Conséquences.** La lecture réelle passera par l'iframe YouTube pilotée par
notre propre interface, jamais par les commandes de YouTube. Dans le prototype,
le transport est **simulé et étiqueté comme tel** : les données sont factices,
et le projet s'interdit d'inventer un identifiant (ADR-006). Le branchement de
l'iframe se fait en P3, sur des identifiants vérifiés.

---

## ADR-027 : Morceaux et pochettes figés au build, aucune clé côté client

**Contexte.** Il faut des morceaux récents et populaires par genre, et des
pochettes. Les deux viennent d'API tierces. Aucune ne doit être appelée depuis
le navigateur d'un visiteur, et aucune clé ne doit approcher le bundle.

**Décision.** Deux scripts qui ne tournent qu'au build.

`scripts/fetch-tracks.ts` interroge YouTube Data API v3 avec une clé lue dans
`process.env.YOUTUBE_API_KEY`, fournie par un secret GitHub Actions. Deux appels
par genre : une recherche filtrée sur les cinq dernières années et sur les
vidéos intégrables, puis un appel sur les identifiants pour récupérer le nombre
de vues, qui n'est pas dans la recherche. Titre, chaîne, date et vues sont figés
dans le JSON. Le champ `verified` reste faux : `verify-youtube.ts` garde
l'autorité dessus (ADR-006).

`scripts/fetch-covers.ts` interroge l'API iTunes Search, gratuite et sans clé,
sur artiste plus titre, et fige l'URL d'artwork carré en 600 pixels. La
correspondance est exigeante sur l'artiste ET le titre : une pochette fausse est
pire qu'aucune. Repli sur la miniature YouTube sinon.

**Conséquences.** Au runtime, le seul appel tiers restant est l'iframe YouTube.
Le contrôle anti-secret de la CI (ADR-011) couvre déjà le cas où une clé
fuiterait dans `dist/`. Contrepartie à assumer : les données vieillissent entre
deux builds, et l'onglet « Actuel » n'est actuel qu'à la date du dernier build.

---

## Pièges GLSL rencontrés, à ne pas repayer

Trois erreurs coûteuses rencontrées sur le prototype de rendu. Elles ne
produisent aucun message clair et se diagnostiquent mal : autant les écrire.

**`half` est un mot réservé en GLSL.** `vec2 half = ...` échoue à la
compilation avec « Illegal use of reserved word ». Le message pointe la bonne
ligne, mais on cherche ailleurs parce que le mot paraît anodin.

**`fwidth` renvoie 0 dans le chemin GLSL 1.0 que three utilise par défaut**,
même sur un contexte WebGL 2. Conséquence indirecte et silencieuse :
`smoothstep(a, a, x)` avec `a` identique des deux côtés est **indéfini** et
produit un NaN. Aucun `discard` ne se déclenche, aucune erreur n'est levée, et
rien ne s'écrit à l'écran. Ne jamais dériver un seuil de `fwidth` sans plancher.
Pour l'antialiasing d'un ruban, la couverture analytique à partir de la largeur
connue est plus sûre et plus rapide.

**`camera.matrixWorldInverse` n'est mis à jour que par le rendu.** Appeler
`Vector3.project(camera)` juste après avoir déplacé la caméra, mais avant
`renderer.render`, projette avec la matrice de l'image précédente. Les labels
DOM dérivent d'une image, ce qui se voit surtout en rotation rapide. Il faut
`camera.updateMatrixWorld()` **puis**
`camera.matrixWorldInverse.copy(camera.matrixWorld).invert()`.

**Corollaire de méthode.** Un ruban élargi en espace écran, par conversion
pixels vers NDC, s'est révélé impossible à faire fonctionner de façon fiable aux
largeurs réalistes. L'élargissement en espace monde, perpendiculairement à la
tangente et face à la caméra, avec un plancher exprimé en pixels converti en
unités monde, fonctionne du premier coup et se raisonne bien mieux.

---

## Points ouverts

Aucun. Les trois arbitrages en attente ont été tranchés : React 19 (ADR-012), échelle
à rupture unique déclarée (ADR-015), sortie d'iCloud avec historique neuf (ADR-016).
