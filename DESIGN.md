# SONAA, direction artistique

Document de cadrage. Rédigé avant toute ligne de code d'interface, comme demandé.
Statut : proposition, en attente de validation.

---

---

## 0. Statut de ce document

> **L'atlas n'est plus un prototype.** Il vit dans `src/atlas/` et la racine du
> site l'ouvre directement. Partout où ce document, ou ARCHITECTURE.md, parle
> d'un prototype jetable, c'est caduc : voir ADR-034. Les sections marquées
> CADUC décrivent des concepts abandonnés et sont conservées pour mémoire, afin
> qu'on ne les repropose pas sans raison neuve.


## 1. L'objet de référence

SONAA n'est pas un site de musique. C'est **une planche de relevé**.

Les objets qui font autorité ici sont le log stratigraphique d'un carottage géologique,
la planche gravée d'un atlas historique, et la face avant d'un synthétiseur modulaire.
Trois objets qui ont en commun d'être des instruments de lecture : chaque trait y porte
une mesure, aucun n'est là pour décorer.

Conséquence directe, et c'est la règle qui gouverne tout le reste :

> **Rien à l'écran n'a le droit d'être uniquement esthétique.
> Une épaisseur, une teinte, une longueur ou une durée encode une donnée, ou n'existe pas.**

---

## 2. L'idée structurante : le genre est une durée, pas un point

> **CADUC.** Le temps ne structure plus l'espace. L'axe temporel, le layout
> timeline-DAG et la lecture à plat sont abandonnés. L'année reste une donnée
> affichée dans le panneau de détail, elle n'a plus de géométrie.
> Remplacé par la section 5, l'espace habitable.

C'est la décision qui différencie SONAA de tout autre graphe.

Dans une carte de genres classique, un genre est un cercle. Ici, un genre est **un trait
vertical qui va de son année d'apparition à son année de mort**, posé sur l'axe du temps.

- Un genre né en 1988 et éteint en 1993 est une marque courte.
- Un genre né en 1987 et toujours vivant est un long trait qui descend jusqu'au bas de la planche.
- `yearPeak` est une **encoche**, un léger renflement du trait à l'année de son apogée.
- Le nom du genre s'inscrit **en haut du trait**, donc à son année d'apparition.

**Un genre vivant n'a pas de fin de trait.** `yearEnd: null` ne se rend pas par une
terminaison nette au niveau de l'année en cours : ça se lirait comme une mort en 2026.
Le trait se dissout sur ses trente derniers pixels et sort du cadre par le bas. Un genre
éteint s'arrête franchement, sur une barre transversale à son année de fin. La différence
entre « c'est fini » et « ça continue » doit se voir sans lire une date.

Ce que ça change concrètement :

1. Lire la planche de haut en bas, c'est lire l'histoire dans l'ordre d'apparition, sans effort.
2. La longévité devient visible d'un coup d'oeil. Le gabber et la deep house cessent d'avoir
   le même poids visuel, ce qui est la vérité historique.
3. **Une filiation part du corps du parent, à la hauteur exacte de l'année où elle a eu lieu.**
   L'arête qui relie la disco à la house de Chicago ne quitte pas « la disco » en général,
   elle quitte la disco en 1984. Le graphe raconte le moment, pas seulement le lien.

Les champs `yearStart`, `yearPeak` et `yearEnd` du modèle de données cessent d'être
des métadonnées de panneau et deviennent la géométrie même de la carte.

---

## 3. Palette

### 3.1 Le fond

Pas de noir. Un graphite froid légèrement désaturé, qui laisse respirer trois niveaux
de surface sans jamais passer au gris de dashboard.

| Rôle | OKLCH | Usage |
|---|---|---|
| `--surface-plate` | `oklch(0.17 0.012 250)` | le fond de la planche |
| `--surface-margin` | `oklch(0.14 0.010 250)` | marges, colonne de temps, dock |
| `--surface-raised` | `oklch(0.21 0.014 250)` | bloc d'annotation, modales |
| `--rule-hairline` | `oklch(0.30 0.010 250)` | grille, filets, cadre |
| `--rule-strong` | `oklch(0.42 0.012 250)` | graduations de décennie |
| `--ink-primary` | `oklch(0.93 0.008 250)` | texte de lecture |
| `--ink-secondary` | `oklch(0.68 0.010 250)` | données mono, légendes |

### 3.2 Les familles

Quatorze familles, quatorze teintes, et trois règles qui rendent l'échelle
utilisable au lieu d'être un arc-en-ciel ou une bouillie.

**Chroma soutenue, jamais fluo.** Entre `C 0.13` et `C 0.18`, plafond absolu à
`0.20`. La version précédente plafonnait à `0.10` et le résultat était terne :
les familles se confondaient et l'olive tirait vers le sale.

**Luminosité entre `L 0.60` et `L 0.75`.** C'est la plage dans laquelle une
sphère ressort franchement d'un fond à `L 0.16`. Le fondateur d'une famille
monte à `0.75`, ses dérivés vivent entre `0.60` et `0.72`.

**Écart minimal de 22 degrés entre deux teintes, et rien entre 90 et 120
degrés.** C'est la zone olive-kaki, celle qui salit tout ce qu'elle touche.
Elle est purement et simplement exclue de l'échelle.

```
disco         15      techno       218
roots         40      psy          240
industrial    62      trance       262
electro      130      hardcore     284
downtempo    152      breaks       306
ambient      174      bass         328
minimal      196      house        350
                            (90 à 120 : interdit)
```

### 3.3 Le contraste des labels, mesuré et non supposé

Un label blanc sur le fond donne **19,4:1**. Le même label blanc posé sur une
sphère claire tombe entre **1,96 et 2,52:1**, ce qui est inutilisable.

**La réponse n'est pas une plaque.** Une première version posait un rectangle
sombre derrière chaque label : ça réglait le contraste et ça masquait l'objet,
donc c'était pire. Deux mécanismes le remplacent, et aucun n'ajoute de bloc
opaque :

1. **Double ombre portée** sur le texte, une nette de 1 px et une diffuse de
   6 px, en noir à 70 pour cent.
2. **Assombrissement local de la sphère dans le shader.** Quand une sphère est
   étiquetée, sa moitié droite, celle où le label se pose, descend à 62 pour
   cent. C'est fait par le rendu, jamais par un élément DOM.

Cette règle a déjà régressé une fois, par une substitution de texte qui n'a rien
remplacé et que je n'avais pas vérifiée. Toute modification du style des labels
doit être contrôlée par un `grep` sur `background` dans `proto.css`.

---

## 4. Typographie

**Une seule famille, SF Pro Display**, avec la pile
`-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif`.

Le trio Archivo, Literata et IBM Plex Mono est abandonné. Trois familles pour
une interface aussi dense produisaient un patchwork, et le mono sur les BPM
faisait ressembler chaque étiquette à une sortie de terminal.

La hiérarchie passe désormais par la **graisse**, pas par la famille :

| Rôle | Graisse | Traitement |
|---|---|---|
| Nom de famille | 600 | capitales, interlettrage ouvert à `0.14em` |
| Nom de genre | 500 | casse normale |
| Données, BPM, mesures | 400 | casse normale, plus de mono |

**Taille des labels : plancher et plafond stricts.** La compensation de distance
seule donnerait 5 pixels au loin et 60 au premier plan. Bornes : jamais en
dessous de **13 px** sur poste de bureau, **15 px** sur mobile, jamais au-dessus
de **22 px**. En dehors de ces bornes, un label ne se lit pas ou écrase la carte.

---

## 5. L'espace habitable, ce qui remplace la planche

> **Mise à jour.** Les masses volumétriques diffuses sont abandonnées. Une
> famille est désormais une STRUCTURE de sphères nettes reliées par des liens
> fins, référence moléculaire, et l'ouverture est une diffusion animée. Le
> détail des morceaux se lit dans une vue 2D dédiée, décrite en section 5c.
> Les années ne structurent plus rien et ne sont plus affichées.

SONAA n'est plus une planche qu'on lit, c'est un espace qu'on habite.

**Le niveau 1, l'espace.** Quatorze masses volumétriques flottent dans le vide,
une par grande famille. Chacune porte sa teinte, sa densité et un volume
proportionnel au nombre de genres qu'elle contient. Les familles proches
stylistiquement sont proches spatialement, et des liens rares et épais relient
celles qui sont nées l'une de l'autre. Rien d'autre : pas de grille, pas de
repère, pas de sol.

**Le niveau 2, dans la masse.** Approcher suffit. Franchir le seuil de proximité
ouvre la masse, qui perd sa densité pendant qu'on traverse sa paroi et révèle
son amas interne de sous-genres. Les autres masses reculent et s'estompent sans
disparaître : on ne perd jamais le nord. Reculer ressort, symétriquement.

**Le niveau 3, le genre.** Le détail, les morceaux, les filiations.

Il n'y a **aucun changement d'écran** entre ces niveaux, et aucun bouton pour
passer de l'un à l'autre. On avance, on entre. C'est la seule mécanique.

### La matière d'une masse

Une masse doit avoir l'air d'un **corps**, pas d'un ballon. Volume translucide,
densité interne visible, silhouette qui bouge légèrement. La référence est un
corps organique dense, pas un nuage de particules ni une sphère lissée.
Techniquement : imposteur billboard et raymarching d'un champ de distance signé,
avec bruit 3D à deux octaves. Tout est calculé, aucun asset.

### La navigation, qui est le coeur

Le pincement à deux doigts est un **dolly**, pas un zoom d'échelle : on avance
réellement dans l'espace. Le glissement à deux doigts orbite. Tout porte de
l'inertie et de l'amortissement, rien ne s'arrête net. Le geste doit avoir du
poids, sinon l'espace n'a pas de volume.

### 5b. La diffusion, animation signature

À l'ouverture d'une famille, ses sphères s'écartent de leur position compacte
vers leur position déployée **en cascade**, du fondateur vers les dérivés, en
suivant les liens de filiation. 480 ms au total, 40 ms de décalage par niveau,
easing à léger dépassement. Les liens se tracent en même temps, du parent vers
l'enfant, avec une tête de propagation plus vive juste derrière le front.

Les labels n'apparaissent qu'après, une fois les positions stabilisées, jamais
pendant le mouvement : sinon ils traînent derrière les sphères et la propagation
devient une bouillie. La fermeture est la même cascade inversée, en 300 ms.

Ce doit se lire comme une propagation, pas comme un fondu. `prefers-reduced-motion`
remplace le tout par une apparition directe.

### 5b bis. La descente, et comment la hiérarchie se lit

La descente n'est pas une mise en évidence, c'est un **déplacement**. Cliquer un
genre qui a des dérivés fait trois choses ensemble :

1. La caméra vole sur lui, il devient le centre d'orbite.
2. Ses dérivés s'écartent **de lui**, en cascade par génération, 400 ms, 45 ms
   de décalage par niveau, même easing à dépassement que la diffusion de famille.
3. Le reste de la famille recule et tombe à 12 pour cent, et perd ses labels.
   Le contexte reste visible, il n'est plus lisible.

Au niveau genre, **tous les dérivés sont étiquetés, sans exception**. Le filtre
des majeurs ne vaut qu'au niveau famille. On est descendu dans le détail, on ne
cache plus rien. Le noeud focalisé garde son label, en graisse renforcée.

Les liens du sous-arbre passent au premier plan et s'épaississent, les autres
liens de la famille tombent à un dixième.

Un second clic sur le même genre, ou un clic sur une feuille, ouvre les morceaux.
Échap remonte d'un cran dans le chemin, pas directement à la famille.

### Trois signes qui rendent la hiérarchie lisible sans cliquer

**La taille dit la génération.** Le rayon est indexé sur la profondeur, pas sur
une notion vague d'importance : 3,2 pour une racine, 2,05 pour ses genres, 1,4
pour les sous-genres, 1,05 au-delà. Une racine domine visiblement ses dérivés.

**Le lien dit le sens.** Il s'effile du parent vers l'enfant, de pleine épaisseur
à 42 pour cent, et son dégradé va de la couleur du parent à celle de l'enfant.
On voit qui descend de qui sans une seule flèche.

**L'anneau dit qu'il y a quelque chose dessous.** Une sphère qui a des dérivés
porte une couronne fine hors de sa silhouette, et son label annonce le compte,
« 3 dérivés ». Une feuille n'a pas d'anneau et son label dit « morceaux ».
On sait donc, avant de cliquer, si le clic descend ou s'il ouvre le lecteur.

**Et la disposition dit la filiation.** Les enfants d'un noeud s'organisent en
couronne autour de lui, dans un disque perpendiculaire à la direction qui vient
de son propre parent. Chaque génération forme un anneau identifiable. La
relaxation anti-chevauchement ne déplace que les feuilles, et faiblement : elle
corrige les collisions sans détruire la structure.

### 5c. La vue morceaux : un panneau flottant, dans la scène

Elle ne remplace plus la 3D par un panneau plat. Arriver sur un genre feuille
fait voler la caméra vers sa sphère, et une PLAQUE apparaît devant, dans
l'espace : un plan incliné de 9 degrés, face caméra, qui suit la caméra en
amorti et ne tourne jamais sur lui-même. La sphère du genre reste visible
derrière et en dessous, avec sa couleur de famille, qui est aussi celle du
liseré de la plaque.

Sur la plaque, de haut en bas :

- une **fenêtre vidéo 16:9**. Au repos elle montre la **pochette** du morceau,
  pas la vignette YouTube. En lecture, la vidéo prend sa place, au même
  gabarit : rien ne saute au démarrage ;
- **artiste, titre, album, année**. Le label de disque demanderait un jeton
  Discogs, donc c'est l'album qui est affiché, nommé pour ce qu'il est ;
- la **bande des autres morceaux du genre**, en pochettes carrées cliquables ;
- le **transport complet** : lecture et pause, précédent, suivant, barre de
  défilement cliquable, volume, et un bouton qui agrandit la vidéo à toute la
  plaque.

**Pourquoi la fenêtre vidéo est en DOM.** Une iframe ne peut pas se rendre dans
une texture WebGL. La plaque est donc peinte en WebGL, et tout le reste est un
élément HTML superposé au canvas, positionné par projection de la plaque et
portant la même inclinaison en CSS. L'illusion tient parce que la plaque est
face caméra : sa projection reste un rectangle, jamais un quadrilatère
quelconque.

**Ce qui a été mesuré et corrigé sur cette illusion.** Mesurer séparément la
demi-largeur et la demi-hauteur par deux projections donne des rapports faux dès
que la plaque s'écarte de l'axe optique : le DOM ne collait plus au rendu. Une
plaque face caméra se réduit à une seule échelle, calculée depuis la
profondeur. De même, viser la position de la sphère au moment du clic ne suffit
pas : la descente sur un genre repositionne les sphères après coup. La caméra
suit donc la sphère à chaque image tant que le panneau est ouvert.

**La lecture survit à la fermeture.** L'iframe n'est jamais démontée ni
reparentée, sinon la lecture s'arrête. Elle vit dans un conteneur de premier
niveau qu'on déplace vers la fenêtre de la plaque ou vers le mini-lecteur, en
bas de l'écran, qui apparaît quand on remonte dans l'atlas. Un clic dessus
ramène au panneau du genre.

Échap ferme la plaque et remonte d'un niveau.

**Les pochettes.** Récupérées au build par l'API iTunes Search, gratuite et sans
clé, sur artiste plus titre, avec une correspondance exigeante : l'artiste ET le
titre doivent tenir après normalisation. Une pochette fausse est pire
qu'aucune. Sans correspondance, repli sur la vignette de la vidéo, marquée comme
telle. Les images sont ensuite **téléchargées et servies par le site** : « aucun
appel tiers au runtime » se prend au mot, une balise `img` vers un domaine
tiers en est un. Il ne reste que l'iframe YouTube, et seulement à la lecture.

---

## 5b bis. Le cadre de la planche

> **CADUC.** Il n'y a plus de planche, plus de cadre, plus de colonne de temps,
> plus de croix de repérage. Voir la section 5.

L'interface est **une seule planche encadrée**, pas un empilement de cartes.

- Un cadre en filet fin délimite la planche entière. Les panneaux ne flottent pas
  au-dessus : ils occupent une **marge à l'intérieur du cadre**, séparés par le même filet
  que la grille. Aucune ombre portée, aucun angle arrondi, aucun flou d'arrière-plan.
- **Marge gauche : la colonne de temps.** Graduée par décennie, gravée dans le fond,
  visible à tous les niveaux de zoom. Les années en mono, alignées sur les filets.
  L'échelle est linéaire de 1969 à aujourd'hui. Le seul segment compressé est
  l'avant-1969, et **la rupture est déclarée** : une zone hachurée en travers de la
  colonne, plus un bouton « échelle réelle » qui rétablit le linéaire strict. Maintenant
  qu'un genre est un segment de durée, une échelle déformée fausserait la comparaison
  des longévités. Aucune compression ailleurs, aucune compression silencieuse.
- **Marge droite : le bloc d'annotation.** Le détail d'un genre s'y inscrit comme une
  notice, pas comme une fiche produit.
- **Bandeau bas : le lecteur.** Une bande étroite, métadonnées en mono, l'allure d'un
  compteur de bande plutôt que d'un player de streaming.
- **Aux quatre coins, des croix de repérage**, l'idiome de l'imprimeur. Elles ne sont pas
  qu'un signe : celle du coin supérieur gauche est le bouton « recadrer ». Identité et
  fonction dans le même trait.

---

## 6. L'élément signature : la propagation

> **CADUC.** Cette section décrit une propagation indexée sur l'écart d'années
> réel entre deux genres. Les années n'ont plus de géométrie et ne structurent
> plus rien, donc cette mécanique n'existe pas. L'animation signature est
> désormais la **diffusion d'une famille**, décrite en section 5b, et la
> **descente sur un genre**, décrite en 5b bis.


Le brief impose une seule orchestration mémorable, l'illumination de la lignée. Voici sa
forme précise.

À la sélection d'un genre, une impulsion lumineuse part des racines et **descend** le long
des arêtes jusqu'au genre sélectionné.

Ce qui la rend singulière : **elle voyage à la vitesse du temps réel de l'histoire.**
La durée d'animation de chaque segment est proportionnelle à l'écart d'années qu'il
franchit. Un saut de 1977 à 1981 met quatre unités de temps, un saut de 1988 à 1989 en met
une. On ne regarde pas un effet, on **entend le tempo d'une histoire** : certaines lignées
sont des cascades brèves, d'autres des lentes dérives sur trente ans.

C'est aussi le seul moment où la chroma monte au maximum. Le reste de la planche descend
à `L 0.30` et `C 0.02`, sans disparaître : les repères tiennent, le contexte reste.

`prefers-reduced-motion` supprime la propagation et la remplace par un simple contraste
appliqué d'un coup, sans transition. La lignée reste identifiable, elle n'est plus racontée.

Tout le reste du mouvement est fonctionnel et discret : 300 ms sur le zoom, pas de
parallaxe, pas d'apparition en fondu, pas de ressort.

---

## 7. Le rendu, trois couches

La carte n'est pas dessinée par une seule technologie. Chaque couche fait ce
qu'elle fait le mieux, et rien d'autre.

### Couche 1, WebGL : la matière

> **Corrigé.** La version précédente de cette section imposait une caméra
> orthographique et des capsules étirées sur l'axe du temps. Les deux sont
> caduques : l'espace est habitable donc la perspective est le sujet, et les
> noeuds sont des sphères.

Three.js, **caméra perspective** à 40 degrés de champ. La perspective est
assumée : on avance réellement dans l'espace, c'est ce qui donne le volume.
Élévation bornée de -10 à +85 degrés, azimut libre, aucune translation latérale.

- Les noeuds sont des **sphères**, rendues en imposteurs billboard dont la
  normale est reconstruite analytiquement depuis le disque. Aucune géométrie de
  sphère, aucun asset. Un seul appel de dessin pour toutes les sphères de
  l'atlas.
- Les liens sont un second appel de dessin, rubans tessellés élargis **en espace
  monde** perpendiculairement à la tangente.
- Ombrage lambertien plus un liseré, **aucune composante spéculaire** : ni
  chrome, ni vernis, ni plastique.
- **Halo calculé dans le shader**, jamais par une passe de post-traitement, et
  il sature au lieu de blanchir : une couleur lavée perd la teinte de famille,
  donc l'information.
- Le fond est un shader plein écran, grain d'émulsion très fin et dégradé de
  profondeur froid. Ni espace, ni nébuleuse, ni dégradé indigo-violet.

**Trois appels de dessin au total**, fond compris.

### Couche 2, DOM : tout le texte

Positionné par projection des coordonnées WebGL, à chaque image.

Labels de genres, années, BPM, panneau de détail, interface. **Aucun texte n'est
rendu en WebGL.** C'est cette couche qui porte l'accessibilité, le focus clavier
et la sélection de texte, et une police rastérisée par le navigateur reste plus
lisible que n'importe quel atlas de glyphes.

Plafond de **60 labels affichés simultanément**, choisis par niveau de zoom puis
par distance au centre du viewport. Les noeuds DOM sont recyclés dans un pool de
taille fixe, jamais créés ni détruits pendant le déplacement.

### Couche 3, SVG : les repères

L'axe temporel gradué et la minimap, rien d'autre. Statiques, nets, lisibles.
Ce sont les deux éléments qui doivent rester parfaitement stables pendant qu'on
navigue, donc ils ne passent pas par le rendu temps réel.

---

## 8. La pulsation

Pendant la lecture d'un morceau, la lignée active bat.

Le battement est **calculé à partir du champ `bpm` du genre en cours**, pas
analysé depuis le son. L'iframe YouTube est cross-origin : la Web Audio API ne
peut pas en lire le signal, et aucun contournement n'est tenté.

Il agit sur deux choses seulement, l'intensité du bloom de la lignée active et
le grain du fond. Amplitude faible. SONAA n'est pas un visualiseur de boîte de
nuit : c'est un métronome discret qui rappelle qu'on écoute quelque chose.

Coupé par `prefers-reduced-motion`.

---

## 9. Écriture d'interface

Voix d'archiviste. Phrases courtes, voix active, un libellé égale une action, même mot du
bouton jusqu'au message de confirmation.

- « Recadrer », pas « Réinitialiser la vue ».
- « Écouter la lignée », pas « Lancer la lecture généalogique ».
- Filiation débattue : le badge dit `débattue`, en mono, en clair. On n'euphémise pas.
- Vide : « Aucun genre ne correspond. Essaie un artiste ou un label. »
- Morceau mort : « Ce morceau n'est plus disponible sur YouTube. Passage au suivant. »
- Sélection non vérifiée : « Sélection en cours de vérification. »

Pas d'emoji. Pas de tiret cadratin. Pas de superlatif.

---

## 10. Interdits, rappelés pour qu'on puisse me les opposer

Dégradé violet-bleu. Cartes arrondies à ombre portée. Glassmorphism. Fond crème avec serif
à fort contraste et accent terracotta. Emoji dans l'interface. Illustration 3D. Hero avec
un gros chiffre et un petit label. Un accent acide unique sur fond noir pur.

Et pour la couche WebGL, qui est l'endroit où l'on dérape le plus vite :
perspective, caméra qui orbite, parallaxe au mouvement de souris, noeuds
sphériques brillants, particules flottant sans raison, tunnel, wireframe néon,
ciel étoilé, nébuleuse, scroll qui pilote une animation cinématique.

Et depuis le passage à l'espace habitable : frise chronologique, grille de fond,
planche technique, vol libre sans contrainte, caméra qui orbite toute seule,
parallaxe au mouvement de souris, particules décoratives sans fonction.

La 3D est ici au service de la densité d'information et de la profondeur de
lecture. Dès qu'elle devient un spectacle, elle est à retirer.

---

## 11. Révision critique du premier jet

Le brief demande de relire ce document et de réécrire ce qui ressemblerait à n'importe
quel projet. Voici ce que j'ai effectivement changé, et pourquoi.

**Les noeuds étaient des cercles.** Premier jet : cercle dont le rayon encode l'importance,
label à droite. C'est le graphe par défaut de la Terre entière, et surtout ça gaspillait
`yearEnd` et `yearPeak` en les reléguant au panneau. Remplacé par le trait de durée
(section 2). C'est devenu l'idée principale du projet, pas un détail de rendu.

**Le panneau de détail était un drawer flottant avec ombre.** C'est-à-dire le composant
que je produirais pour n'importe quelle application. Remplacé par la marge d'annotation
à l'intérieur du cadre. Le glissement conceptuel compte : ce n'est plus une surcouche
d'application, c'est une zone de la planche.

**La luminosité allait du sombre pour l'ancien vers le clair pour le récent.** Intuitif
sur le moment, mais ça enterrait littéralement les racines dans le fond et cassait le
contraste sur les genres les plus importants du document. Inversé, avec la justification
de l'encre passée qui rend l'inversion lisible plutôt qu'arbitraire.

**La propagation durait 600 ms au total, à vitesse constante.** C'était une transition
comme une autre. En l'indexant sur l'écart d'années réel, elle cesse d'être un effet et
devient une lecture. C'est le seul endroit où j'ai ajouté de la complexité plutôt que d'en
retirer, et c'est justifié : c'est le geste que le brief demande de rendre mémorable.

**Les couleurs de familles étaient saturées.** Quatorze teintes franches, donc un
arc-en-ciel, donc du bruit. Le plafond de chroma plus la réservation de la couleur pleine
à la lignée active transforment la palette en système hiérarchisé au lieu d'une liste.

Ce qui reste à éprouver, honnêtement : les couloirs de familles risquent de rendre les
genres hybrides visuellement instables, puisqu'ils sont attirés par plusieurs couloirs
à la fois. Ça se tranchera sur les 25 genres pilotes de la phase P1, pas sur le papier.
