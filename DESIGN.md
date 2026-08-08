# SONAA, direction artistique

Document de cadrage. Rédigé avant toute ligne de code d'interface, comme demandé.
Statut : proposition, en attente de validation.

---

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
   6 px, en noir à 70 pour cent. C'est le traitement des quatorze noms de
   familles en 3D.
2. **Contour de la même couleur que le fond** sur le texte de l'arbre 2D, tracé
   sous le remplissage sur 3,5 px. En 2D la position du texte est connue, donc un
   contour suffit et rien n'a besoin d'être assombri.

> **Caduc.** L'assombrissement local de la sphère dans le shader, qui baissait sa
> moitié droite à 62 pour cent sous un label, est retiré : au niveau atlas aucune
> sphère n'est plus étiquetée, et les noms de genres ne vivent plus qu'en 2D.

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

## 5. Le partage : atlas en 3D, filiation en 2D

> **Ce qui a changé, et pourquoi.** La descente en 3D est abandonnée. Une
> disposition en couronnes dans l'espace ne peut pas rendre une filiation
> lisible : en perspective, la taille apparente d'un noeud dépend de sa distance
> à la caméra, donc elle ne peut pas encoder la génération ; deux sphères
> éloignées se touchent à l'écran ; les liens partent dans toutes les
> directions. Le principe était faux, pas son exécution. La 3D reste pour ce
> qu'elle fait bien, l'ensemble ; la hiérarchie descend en 2D, où la mise en
> page est calculée.

Deux niveaux, deux techniques, une frontière nette.

### 5a. Le niveau atlas, en 3D

Quatorze amas de sphères flottent dans le vide, un par grande famille. Chacun
porte sa teinte et un volume proportionnel au nombre de genres qu'il contient.
Les familles proches stylistiquement sont proches spatialement, et des liens
fins relient celles qui se sont nourries l'une de l'autre. Rien d'autre : pas de
grille, pas de repère, pas de sol.

À ce niveau, **aucun label de genre, aucun anneau, aucune sphère étiquetée**.
Uniquement les quatorze noms de familles. On voit des corps colorés, point.

La navigation est une orbite : glisser tourne, la molette avance réellement dans
l'espace, tout porte de l'inertie. Les flèches tournent, plus et moins zooment,
0 recentre.

### 5b. Le passage à la famille

Cliquer un amas fait deux choses ensemble : la caméra vole vers lui en 600 ms, et
l'arbre 2D de la famille prend la place, en surimpression, comme la vue morceaux
le fait déjà. La 3D reste derrière, atténuée à 28 pour cent, jamais supprimée :
on ne perd pas le nord, mais on ne la lit plus.

Échap ou le fil d'Ariane ramènent à l'atlas, et la 3D revient au premier plan.

### 5c. L'arbre 2D, la seule vue de la filiation

Le fondateur est en haut. Ses enfants sur la ligne suivante, et ainsi de suite.
La profondeur se lit sur l'axe vertical, une génération par ligne, 116 px de pas.

**Les liens sont nets et visibles en permanence**, jamais révélés au survol : la
filiation est l'information principale du projet, pas un détail à découvrir.

**Le nom de chaque genre est toujours lisible.** Aucun masquage, aucune collision
possible : les feuilles visibles se rangent de gauche à droite à pas fixe et
chaque parent se centre sur ses enfants. La mise en page est calculée, pas
négociée. C'est exactement ce que la 3D ne pouvait pas garantir.

**La taille du noeud dit l'importance**, pas la génération : le diamètre va de 26
à 56 px selon l'importance du genre. La génération, elle, est déjà portée par la
ligne. Chaque noeud est rond, dans la teinte de sa famille.

**Un noeud qui a des sous-genres se distingue d'une feuille** : il porte un
anneau fin, en pointillé quand il est replié, en trait plein quand il est
déployé, et il affiche en son centre le nombre de ses dérivés.

Cliquer un noeud le développe sur place, ses enfants apparaissent en dessous,
l'arbre se réorganise en 260 ms. Cliquer une feuille ouvre la vue morceaux.

**Les parents venus d'une autre famille** apparaissent en haut, hors de l'arbre,
reliés en pointillé et portant le nom de leur famille. C'est la greffe : elle dit
que la généalogie est un graphe sans casser la lecture en arbre.

Le déplacement est un pan et un zoom dans le plan, comme sur une carte. Aucune
orbite, aucune perspective à ce niveau.

### 5d. La vue morceaux

Entrer dans les morceaux suspend la 3D : elle recule, se floute légèrement, et
un panneau 2D plein passe devant. Pas de sphères, pas de caméra, pas de
profondeur. Choisir un morceau est une tâche de liste.

Grille de pochettes carrées. Sur chaque carte : pochette, artiste, titre, label,
bouton de lecture au survol. Lecteur persistant en bas, avec barre de défilement
cliquable. Deux onglets : **Actuel**, les sorties récentes triées par écoutes, et
**Essentiel**, les fondateurs du genre.

Les pochettes ne sont jamais des assets du dépôt : elles sont figées au build
depuis une source tierce, ou générées.

---

## 5 bis. Le cadre de la planche

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
> plus rien, donc cette mécanique n'existe pas. La diffusion en cascade d'une
> famille en 3D est également caduque : il n'y a plus de position déployée en 3D.
> Le mouvement signature est désormais le **vol de caméra vers une famille** et
> le **développement en place d'un noeud dans l'arbre 2D**, décrits en 5b et 5c.


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

### Couche 2, DOM : le texte de l'atlas et l'interface

Positionné par projection des coordonnées WebGL, à chaque image. **Aucun texte
n'est rendu en WebGL.** C'est cette couche qui porte l'accessibilité, le focus
clavier et la sélection de texte, et une police rastérisée par le navigateur
reste plus lisible que n'importe quel atlas de glyphes.

Au niveau atlas elle ne porte que **les quatorze noms de familles**, plus le fil
d'Ariane et les contrôles. Les noeuds DOM sont recyclés dans un pool de taille
fixe, jamais créés ni détruits pendant le déplacement.

> **Caduc.** Le plafond de 60 labels et la sélection par distance à la caméra
> n'ont plus d'objet : il n'y a plus que quatorze candidats, et aucun label de
> genre en 3D. Reste un test de chevauchement entre les quatorze, qui masque le
> nom de la famille la plus lointaine en cas de conflit, avec 4 px de tolérance.

### Couche 3, SVG : l'arbre 2D

L'arbre de filiation d'une famille, et rien d'autre. C'est le bon outil : la mise
en page est calculée côté JavaScript, le tracé doit être net à toute échelle, et
chaque noeud doit être un élément focalisable au clavier. Il ne passe pas par le
rendu temps réel.

> **Caduc.** L'axe temporel gradué et la minimap, qui occupaient cette couche,
> n'existent plus : le temps ne structure plus l'espace.

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
