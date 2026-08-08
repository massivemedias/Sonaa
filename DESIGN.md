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

Quatorze familles, quatorze teintes. Mais la teinte seule ne suffit pas : quatorze couleurs
réparties sur la roue donnent un arc-en-ciel, c'est-à-dire du bruit.

Deux disciplines empêchent ça :

**Chroma plafonné.** Toutes les familles vivent entre `C 0.05` et `C 0.10`. À l'écran, ce
sont des graphites teintés, pas des bonbons. La planche reste lisible comme un ensemble.

**La couleur pleine est réservée à la lignée active.** C'est la règle qui fait tenir tout
le système : au repos, rien n'est saturé. Quand une lignée s'allume, elle est le seul
endroit de l'écran où la chroma monte à `C 0.16`. La saturation devient un événement,
pas un décor.

Attribution des teintes, par adjacence généalogique, pour que les couloirs voisins sur la
carte soient aussi voisins en couleur :

```
roots        H  70   C 0.015   quasi achromatique, c'est le substrat
disco        H  55
house        H  30
bass         H 355
breaks       H 330
hardcore     H 300
trance       H 275
psy          H 250
techno       H 225
minimal      H 205
ambient      H 185
downtempo    H 160
electro      H 135
industrial   H 105
```

### 3.3 La luminosité encode l'ancienneté

`L` varie de `0.86` pour les genres les plus anciens à `0.62` pour les plus récents.

Le sens de la variation est délibéré et il est l'inverse de l'intuition « vieux = sombre ».
Sur une planche d'archive, **c'est l'encre ancienne qui a passé** : elle est plus claire,
plus délavée, moins chromatique. L'encre récente est dense et franche. Un genre de 1977
est donc un trait pâle et fin, un genre de 2015 un trait sombre et net.

Bénéfice non négociable : la plage `L 0.62 → 0.86` sur un fond à `L 0.17` garantit un
contraste supérieur à 7:1 partout. Aucun noeud n'est illisible, quelle que soit son époque.
L'inverse (ancien = sombre) aurait enterré les racines dans le fond.

---

## 4. Typographie

Trois familles, toutes en woff2, sous-ensemble latin étendu pour le français et l'espagnol,
`font-display: swap`.

**Display, `Archivo` variable.** Choisie pour son axe de largeur : un seul fichier donne
le condensé et l'étendu. Elle sert à une seule chose, et c'est un idiome de cartographie :
**les noms de familles sont posés à plat derrière la carte**, en capitales très étendues,
très interlettrées, à faible contraste, exactement comme le nom d'une région sur une carte
IGN. Ils appartiennent au fond, pas à l'interface. On ne les clique pas, on se repère avec.

**Lecture, `Literata`.** Un serif à faible contraste, robuste sur fond sombre, pour les
descriptions de genres. Le choix du serif est assumé : SONAA est un ouvrage de référence,
pas un magazine. Ses empattements tiennent la ligne sur 400 à 800 signes là où une
grotesque de plus fatiguerait. Corps de texte à `L 0.93`, ratio AAA.

**Données, `IBM Plex Mono`.** Toute donnée mesurée passe en mono, sans exception : années,
BPM, identifiants, sources, compteurs du lecteur, graduations de l'axe. C'est la voix de
l'instrument. Sa couverture diacritique est complète, ce qui compte pour trois langues.

Règle d'application : si une valeur pourrait figurer dans un tableau, elle est en mono.
Si elle relève de la prose, elle est en Literata. Si c'est un nom de famille de genres,
elle est en Archivo. Aucun autre cas.

---

## 5. Le cadre de la planche

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

## 7. Écriture d'interface

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

## 8. Interdits, rappelés pour qu'on puisse me les opposer

Dégradé violet-bleu. Cartes arrondies à ombre portée. Glassmorphism. Fond crème avec serif
à fort contraste et accent terracotta. Emoji dans l'interface. Illustration 3D. Hero avec
un gros chiffre et un petit label. Un accent acide unique sur fond noir pur.

---

## 9. Révision critique du premier jet

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
