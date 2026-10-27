# ADR-108 : un plan de rues, et l'itinéraire sans quitter le site

Date : 27 octobre 2026. Statut : accepté.

## Pourquoi

Mika, sur la carte des soirées : « plus visible, plus par rue que par
satellite », et pouvoir zoomer en pinçant directement dans la carte. Puis,
sur la fiche d'une soirée : « un bouton où on peut avoir la direction mais
que nous restions directement dans le site ! je veux pas que les gens
sortent du site ».

## Ce qui est décidé

- Le fond de carte est celui d'OpenFreeMap : des tuiles vectorielles libres,
  sans clé, sans limite et permises en usage commercial, affichées par
  MapLibre dans leur style sombre. Les teintes sont retouchées dans
  `src/atlas/fond-de-carte.ts` : rues en gris par ordre d'importance, eau en
  bleu nuit, parcs en vert éteint, fond à la teinte du site. Leaflet est
  retiré.
- Le pincement zoome dans la carte, au trackpad comme au doigt. La molette
  fait défiler la page, et zoome avec ⌘ ou Ctrl. Au doigt, deux doigts
  déplacent la carte et un seul fait défiler la page.
- L'itinéraire remplace le lien vers Google Maps : dans le panneau d'une
  salle sur la carte, et sous l'adresse dans la fiche d'une soirée. Le trajet
  part de la position du visiteur, à pied, à vélo ou en voiture, avec la
  durée, la distance et les étapes. La position suit le visiteur tant que le
  trajet est ouvert ; le trajet est recalculé s'il s'éloigne de plus de
  300 mètres de son point de départ.
- Le calcul est fait par les serveurs OSRM de FOSSGIS
  (routing.openstreetmap.de), ceux qu'utilise openstreetmap.org. Ils ne
  demandent pas de clé ; un trajet n'est demandé que pour le mode choisi.
- Une salle située à partir d'une adresse doit tomber dans le secteur de son
  code postal (Canada et France). Subterra, au 25 rue Saint-Jacques dans le
  Vieux-Montréal, était placé à Lachine.

## Ce que cela ne sait pas faire

- Pas de transport en commun : aucun service libre ne le calcule pour toutes
  les villes de SONAA.
- La position du visiteur part chez FOSSGIS pour le calcul, et sa carte
  charge les tuiles depuis tiles.openfreemap.org. SONAA ne garde ni l'une ni
  l'autre, et la politique de confidentialité doit le dire.
- Les serveurs de FOSSGIS sont prévus pour un usage modéré. Si SONAA grossit
  beaucoup, il faudra un serveur de calcul à soi.
