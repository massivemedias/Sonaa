# ADR-099 : mes morceaux, glissés sur les platines

Date : 3 octobre 2026. Statut : accepté.

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

**Les tags d'abord, l'oreille ensuite.** Titre, artiste, label, genre, BPM,
tonalité et pochette viennent des tags ID3 quand ils existent
(`tags.ts`) : rekordbox, Serato et Mixed In Key y écrivent le BPM et la
tonalité. Sinon, le nom « Artiste - Titre » donne l'artiste et le titre, et
le BPM est estimé par autocorrélation de l'enveloppe d'amplitude
(`estimerBpm`). La tonalité n'est pas devinée.

**Un quart d'heure au plus** par fichier : il est décodé en entier.

## La suite : SoundCloud

L'API de SoundCloud ne filtre pas la recherche par licence, et ne sert plus
que des flux HLS en AAC depuis août 2026. Le tri se fera côté Worker, qui
gardera la clé de l'application et ne laissera passer que les licences qui
autorisent les œuvres dérivées. Ce sera une décision à part, quand l'accès
aura été vérifié avec la clé de Mika.
