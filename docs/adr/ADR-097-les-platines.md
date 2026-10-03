# ADR-097 : les platines, sur Audius, dans le langage des machines

Date : 3 octobre 2026. Statut : accepté.

## Pourquoi

Mika veut mixer sur sonaa.ca : deux platines façon CDJ et une table façon
Xone au milieu sur ordinateur, trois panneaux qu'on fait glisser sur
téléphone. Sur chaque platine : charger un morceau, avancer à la souris, un
cue, lecture et pause, un pitch à 3, 6 ou 12 %, le BPM, la pochette, le
titre, l'artiste et la tonalité à l'écran, un jog, quatre hot cues gardés en
mémoire, pas de bouton Sync. Sur la table : quatre voies dont deux servent,
un filtre d'une autre couleur au-dessus de chaque fader, des effets globaux.

## Ce qui est décidé

**Le son vient d'Audius, pas de YouTube.** Le lecteur YouTube est une iframe
d'un autre site : le navigateur interdit à la page de toucher à son son, donc
ni égaliseur, ni filtre, ni effet, ni jog. Son pitch ne connaît que des pas
de 5 %, vérifié le 3 octobre (1,03 devient 1, 1,06 devient 1,05). Audius sert
ses MP3 avec les en-têtes CORS, donne le BPM et la tonalité, et ne demande
aucune clé. Mika a choisi Audius ce jour-là.

**Le son est calculé dans le navigateur** (`src/platines/moteur.ts`) : le
morceau entier est décodé, le pitch et le jog passent par la vitesse de
lecture, le jog en pause fait entendre des grains de 65 ms. Chaque voie a son
gain, trois bandes d'égaliseur, son filtre et son fader. Les effets sont sept
potards sur le bus maître, comme les GLOBAL FX de la MM-808 : disto, crush,
chorus, flanger, trans, delay et reverb, tous utilisables en même temps.
Chacun mêle son sec et son traité selon sa dose (`dosage`) ; à zéro, il
laisse passer le son tel quel. Le delay, le flanger et le trans suivent le
tempo de la platine qu'on entend le plus, à la division choisie. Un limiteur
protège la sortie.

**On zoome dans l'onde** de 32 secondes à une seule (molette ou touches de
l'écran), avec 400 pics par seconde. En pause, on tire l'onde pour se
placer en entendant des grains de son, puis CUE pose le point.

**Les morceaux d'un style** : la recherche Audius par le nom du style, plus
le palmarès du mois du genre Audius le plus proche (`genreAudius`). Une
recherche libre permet de charger n'importe quel morceau du catalogue.

**Les cues** sont gardés dans le navigateur, par morceau
(`sonaa-cues-<id>`), sans compte.

**Le dessin reprend les machines de mauditemachine.com.** Le guide
`docs/design/MACHINES-DESIGN-SYSTEM.md` du dépôt MauditeMachine2025, écrit
pour ce projet, donne les matières et les teintes de la MM-808 : graphite
anodisé brossé, chanfrein, caoutchouc, potards à collerette et repère os,
sérigraphie en capitales espacées, crochets sous les groupes, écran OLED en
monospace, VU de quinze LED. Mika veut peu de couleurs : l'orange de la
machine (l'accent du site depuis l'ADR-098) pour ce qui joue, le cue, la
tête de lecture et le capuchon du filtre ; le jaune vif pour les hot cues,
tous de la même couleur ; l'os pour l'onde et la sérigraphie. CUE et PLAY
sont de grosses touches de caoutchouc comme RUN/STOP ; en lecture, PLAY
s'allume en entier, et rien ne clignote.

**Tout tient dans l'écran.** La scène se réduit à la hauteur de la fenêtre,
jamais sous 72 %, pour que le crossfader reste visible sur un portable.

## Ce que cela lève

DESIGN.md interdit l'illustration 3D, la perspective et la caméra. Les
platines restent à plat, vues de dessus : le relief n'est fait que d'ombres
et de dégradés de matière. Le guide des machines décrit une scène three.js ;
elle n'est pas reprise ici.

## Limites connues

- Un morceau de plus de 12 minutes n'est pas proposé : décodé en entier, il
  pèserait trop sur un téléphone.
- La recherche par style remonte aussi des morceaux amateurs : Audius est
  ouvert à tous.
