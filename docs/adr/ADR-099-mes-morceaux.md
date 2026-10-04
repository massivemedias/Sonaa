# ADR-099 : mes morceaux, glissés sur les platines

Date : 3 octobre 2026. Statut : remplacé par [ADR-101](ADR-101-les-decks-partent.md) : les Decks ont quitté Sonaa le 4 octobre 2026.

## Pourquoi

Audius n'a pas assez de musique. Mika veut que les gens mixent ce qu'ils
veulent. Les grands catalogues (Spotify, Apple Music, Deezer, YouTube)
verrouillent leur son et interdisent le mixage ; SoundCloud ne permet de
modifier que les morceaux dont l'artiste l'a autorisé par une licence
Creative Commons. Un fichier que l'on possède, lui, se mixe librement.

## Ce qui est décidé

**Mes morceaux.** Un second onglet du navigateur des platines. On y glisse
ses fichiers (MP3, WAV, AIFF, FLAC, M4A), ou on les choisit. On peut aussi
lâcher un fichier directement sur une platine, qui le charge.

**Rien ne quitte l'appareil.** Les fichiers sont gardés dans le navigateur
(IndexedDB, `src/platines/caisse.ts`). Il n'y a ni compte, ni serveur, ni
envoi. Le même fichier glissé deux fois est le même morceau, avec ses cues.

**Un gros dossier entre en quelques secondes** (3 octobre 2026, Mika : « il
se passe quoi si je glisse un dossier de 1 800 tracks ? »). À l'entrée, on
ne lit que les tags, dans les premiers octets du fichier. La durée, et le
BPM quand le tag n'en donne pas, se calculent ensuite en fond, un morceau à
la fois, tant que la page est visible ; un morceau qu'on charge avant son
tour est analysé tout de suite. Au-delà de 2 Go, la page dit combien
l'import pèse et demande avant de copier ; s'il n'y a pas la place que le
navigateur accorde, elle refuse. Elle demande aussi que la caisse ne soit
pas vidée quand l'appareil manque de place. Un fichier de plus de 200 Mo est
refusé : décodé en entier, il pèserait trop sur un téléphone.

**Sur Chrome et Edge, un dossier est relié, pas copié** (3 octobre 2026,
Mika : « oui, relie sur Chrome »). Le sélecteur de dossier du navigateur
(File System Access) rend une poignée sur le dossier ; la caisse garde
celle du dossier et celle de chaque son, sous-dossiers compris, et lit les
fichiers là où ils sont. 1 800 morceaux n'y prennent que quelques
kilo-octets. Après un rechargement, Chrome redemande l'accès au dossier une
fois, au premier morceau qu'on charge ; d'ici là, les analyses en fond de
ce dossier attendent. Un dossier lâché sur la zone de dépôt est relié de
même ; un fichier seul, lui, est copié. Safari et Firefox n'ont pas ce
sélecteur : ils copient, comme avant. La base passe en version 2, avec un
magasin `racines` pour les dossiers reliés.

**Trop gros pour être copié, il se relie pour la visite** (3 octobre 2026,
Mika glisse 86,7 Go dans un navigateur qui en accorde 1,9). Sans le
sélecteur de Chrome, les fichiers d'un dossier lâché ne restent que des
références en mémoire : rien n'est copié. Leurs tags, leurs BPM et leurs
cues sont gardés ; à la visite suivante, ces morceaux s'affichent « à
relier », et glisser à nouveau le dossier les rend aussitôt lisibles. Entre
2 Go et la place disponible, on choisit entre copier et relier pour la
visite. Les listes montrent au plus 200 lignes, avec une recherche dans
Mes morceaux ; les analyses en fond relisent la caisse une fois par tour,
pas une fois par morceau.

**Un dossier retenu qui n'a plus de morceau montre tout** : la liste ne
reste plus vide quand la caisse ne l'est pas.

**Les tags d'abord, l'oreille ensuite.** Titre, artiste, label, genre, BPM,
tonalité et pochette viennent des tags ID3 quand ils existent
(`tags.ts`) : rekordbox, Serato et Mixed In Key y écrivent le BPM et la
tonalité. Sinon, le nom « Artiste - Titre » donne l'artiste et le titre, et
le BPM est estimé par autocorrélation de l'enveloppe d'amplitude
(`estimerBpm`). La tonalité n'est pas devinée.

**Les dossiers** (3 octobre 2026). Mika range ses morceaux en dossiers dans
Fichiers, sur son iPhone. Chaque morceau porte le nom de son dossier, et les
dossiers s'affichent en onglets ; la caisse et le dossier ouvert sont les
mêmes pour les deux decks. Sur ordinateur, « + Dossier » ouvre le sélecteur
de dossiers du navigateur, et on peut aussi lâcher un dossier entier sur la
zone de dépôt. L'iPhone et l'iPad n'ont pas de sélecteur de dossier : on y
nomme le dossier, puis on choisit tous ses morceaux dans Fichiers. Retirer
un dossier demande deux pressions.

## La suite : SoundCloud

L'API de SoundCloud ne filtre pas la recherche par licence, et ne sert plus
que des flux HLS en AAC depuis août 2026. Le tri se fera côté Worker, qui
gardera la clé de l'application et ne laissera passer que les licences qui
autorisent les œuvres dérivées. Ce sera une décision à part, quand l'accès
aura été vérifié avec la clé de Mika.
