# ADR-126 : l'affiche de rythme quitte les pages de style

Date : 23 novembre 2026. Statut : accepté. Remplace en partie ADR-113.

## Pourquoi

Mika, une capture du séquenceur de la page Tech House à l'appui (126 BPM,
la grille kick, clap, charley, voix et basse, « Écouter le motif » et
« Télécharger l'image » dessous) : « enlève ça de tous les styles ».

## Ce qui est décidé

- Les pages de style ne portent plus l'affiche de rythme : ni la toile du
  séquenceur, ni ses quatre boutons (écouter, image, vidéo 4:5, vidéo 9:16).
  La fiche technique reprend seule sa place, sous la description et avant les
  morceaux, sur toute la largeur de la colonne.
- Le composant `RythmeDuStyle.tsx` est supprimé, avec ce qui ne servait qu'à
  lui : le format de dessin `'page'` et sa hauteur de 580 px dans
  `rythme/dessin.ts`, la durée du morceau construit (`dureeDuPlan`), la mise
  en page côte à côte `.pv-fiche-et-rythme`, la toile et la rangée de boutons
  de `rythme.css`, et neuf libellés de `langue.ts` en français et en anglais.
- Les pages pré-rendues ne portent plus « Le motif rythmique » en texte
  (`motifEnTexte` dans `scripts/prerender.ts`). Ce texte décrivait pour les
  moteurs une toile que la page ne montre plus ; le garder aurait fait dire
  au code source autre chose que l'écran.

## Ce qui reste

- Le moteur de rythme (`src/atlas/rythme/`), les motifs
  (`src/data/rythmes.json`) et les sons (`public/sons/`) restent : le Reel du
  jeudi (ADR-115) les joue et les dessine au format `'reel'`.
- Les cartes de partage des styles (ADR-114) gardent leur grille de pas
  dessinée au moment de la construction. Elles ne s'affichent pas dans la
  page, seulement dans les aperçus de lien.
- La palette née d'ADR-113, les cinq teintes de piste comprises, ne bouge
  pas.
