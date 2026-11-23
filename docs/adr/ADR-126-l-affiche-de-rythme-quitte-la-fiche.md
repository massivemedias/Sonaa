# ADR-126 : l'affiche de rythme quitte la fiche d'un style

Date : 23 novembre 2026. Statut : accepté. Remplace en partie ADR-113.

## Pourquoi

Mika, devant la fiche d'un style : « Je t'ai demandé tout à l'heure de
désactiver ça ! Enlève-le ! ». Le bloc visé est l'affiche de rythme posée à
côté de la fiche technique : la grille de pas, le tempo, les sections, et les
quatre boutons « Écouter le motif », « Télécharger l'image », « Vidéo 4:5 pour
le fil » et « Vidéo 9:16 pour les Reels ».

## Ce qui est décidé

- La fiche d'un style ne porte plus l'affiche de rythme, ni ses boutons. La
  fiche technique reprend toute la largeur de la colonne.
- Le composant `RythmeDuStyle.tsx`, ses neuf libellés FR et EN, et le CSS qui
  ne servait qu'à lui sont retirés. `dureeDuPlan`, qu'il était seul à appeler,
  part avec lui.
- Le moteur de rythme (`src/atlas/rythme/`, `src/lib/rythmes.ts`, les sons de
  `public/sons/`) reste en place : le Reel du jeudi (ADR-115) le dessine et le
  joue toujours.

## Ce qui reste d'ADR-113

Les couleurs de l'affiche, adoptées dans tout le site, ne bougent pas. Seule
la présence de l'affiche sur chaque page de style est abandonnée.
