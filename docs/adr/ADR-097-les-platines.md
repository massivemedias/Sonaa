# ADR-097 : les platines, sur Audius, dans le langage des machines

Date : 3 octobre 2026. Statut : remplacé par [ADR-101](ADR-101-les-decks-partent.md) : les Decks ont quitté Sonaa le 4 octobre 2026.

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

**Le logotype de Maudite Machine** (la marque de la MM-808,
`public/brand/mauditemachine-logotype.png`, en entier : le rognage
automatique l'avait d'abord coupé, le blanc de ses bords pris pour du fond) remplace « SONAA » en tête des
trois machines ; il sert de masque et prend l'encre de la finition.

**Le navigateur s'ouvre dans la platine** dont on presse la touche de
chargement, comme l'écran de navigation d'une CDJ. Il n'y a plus de liste
sous les machines.

**Le jog** : un puits, une bague d'aluminium poli, un anneau de lumière
orange allumé en lecture, un plateau noir à sillons concentriques et à
tranche crantée (lui seul tourne), un reflet fixe, et un écran rond avec la
pochette, l'anneau d'avancement du morceau et une aiguille. À ses deux coins
bas, deux touches de pitch bend, pour caler les temps : tenues en lecture,
elles freinent ou poussent le morceau (1,5 % d'abord, jusqu'à 6 % si on
insiste) ; en pause, elles font glisser la tête de lecture tout doucement.

**Deux finitions** : noire, et blanche comme la MM-808 claire. Les matières
passent par des variables `--m-*` ; les écrans, les capuchons et le plateau
restent sombres dans les deux. Le site, lui, reste sombre.

**« Deck », partout** (3 octobre 2026) : Mika veut ce mot en français
comme en anglais. L'adresse devient `#/decks` ; `#/platines` y mène
toujours. Le code garde ses noms de fichiers.

**Les potards**, en rotary control : un anneau de valeur autour, dont la
partie allumée en orange part du neutre (égaliseur, filtre) ou du minimum
(dose, master) ; un corps lisse au dessus concave, dont la lumière ne
tourne pas ; un repère os. Ils tournent pour de vrai : on les attrape et
on tourne autour, la valeur suit l'angle du pointeur (270 degrés pour la
course) ; tout près du centre, le glisser vertical prend le relais. Partout
où quelque chose bouge (potards, faders, jog, onde), le curseur est la main
d'un lien, plus les doubles flèches.

**L'égaliseur est un isolateur** (3 octobre 2026, Mika : « des EQ qui
fonctionnent parfaitement »). Le son se sépare en trois bandes par des
filtres de Linkwitz-Riley du quatrième ordre, à 250 Hz et 2,5 kHz, plus un
passe-tout sur les graves pour la phase. Mesuré sur la voie même : plat à
±0,4 dB de 40 Hz à 12 kHz au centre ; à gauche, chaque bande disparaît
(-63 dB à 40 Hz pour les basses, -30 dB au cœur des médiums, -62 dB à
12 kHz pour les aigus) ; à droite, +6 dB. Piège noté dans le code : dans
Web Audio, le Q d'un passe-bas ou d'un passe-haut est en décibels. Le
filtre de voie est plat au repos et ne résonne qu'en balayage. Les coupures à
250 Hz et 2,5 kHz, celles des isolateurs de club, sont confirmées par Mika
le 4 octobre 2026, de préférence à celles d'une DJM (70 Hz et 13 kHz).

**Les noms au-dessus** des potards, des hot cues, de CUE et de PLAY.

**Les plaques**, comme celle du MM-ARP : « DECK A », « DECK B » et « MIXER »
en capitales grasses très espacées à gauche ; à droite, une ligne
descriptive plus pâle (« Table de mixage 4 voies ») puis le logotype.

**La tonalité en Camelot seulement** (9A) sur l'écran des decks : c'est elle
qui dit ce qui se mélange.

**« Mixer »**, et non « Table », en français comme en anglais.

**Une petite playlist** en bas de chaque deck (`PlaylistVue.tsx`) : ce que
montre le navigateur, le style d'Audius ou le dossier de Mes morceaux, en
lignes courtes avec la touche qui charge. Une ligne ne charge pas au
toucher : en plein mix, un doigt qui fait défiler ne doit pas remplacer le
morceau qui joue. La sélection (source, style, dossier) est commune au
navigateur et aux deux playlists (`selection.ts`). Le jog a perdu 32 px
pour lui faire de la place.

**Un peu de 3D** : voir ADR-100.

**Sur téléphone, une machine par écran, sans défiler** (3 octobre 2026).
Chaque machine prend la hauteur visible (`100dvh` moins l'en-tête, les
onglets et la barre du bas) ; dans un deck, tout est à taille fixe sauf la
playlist, qui prend le reste et défile seule, et dont une touche l'agrandit
par-dessus le jog. Chaque ligne a ses touches A et B. Les chiffres de l'écran
perdent leurs noms, le jog et le pitch suivent la hauteur de l'écran, et on
zoome dans l'onde en la pinçant à deux doigts. Les machines y restent à
plat : inclinées, elles rognaient leurs touches sous les 44 px du doigt. Le
titre de la page se cache (il reste pour les lecteurs d'écran) et la
finition tient en deux pastilles à côté des onglets.

**Tout tient dans l'écran, à toutes les largeurs.** Un deck ne descend pas
sous 420 px et la table fait 460 px. Sur ordinateur, quand la fenêtre est
trop étroite ou trop basse, la scène se réduit en entier (jamais sous 55 %)
au lieu d'écraser les machines. Sous 900 px, les trois machines glissent une
à une, chacune limitée à 520 px. Chaque machine se lit à sa propre largeur
(requêtes de conteneur) : un deck étroit met le jog en grand, le pitch à
droite, CUE et PLAY dessous. Les Decks font partie du contrôle mobile de
publication, à huit largeurs.

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
