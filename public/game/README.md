# SONAA · DJ Tycoon

Un jeu de gestion en vue isométrique, jouable au doigt. Tu commences avec
40 $ et pas de matériel. Tu finis, ou pas, en closing set devant un stade.

Adresse : `https://sonaa.ca/game/`

## La boucle

1. **Travailler** au casse-croûte (plonge, livraison, cuisine) pour gagner
   ses premiers dollars.
2. **Construire le studio** chez Massive Machines, pièce par pièce et dans
   l'ordre : casque, platine, cellule et aiguille, deuxième platine, table
   de mixage, câbles, enceintes. Rien ne sonne tant que tout n'est pas
   branché. Chaque pièce apparaît dans la chambre, qui devient un studio.
3. **Remplir ses bacs** chez les sept disquaires. Les disques sont les
   2 382 morceaux de l'atlas SONAA, dans leurs 14 familles, avec leurs
   vraies pochettes. Chaque disque a un tempo, une énergie et une rareté.
4. **Décrocher des dates** sur le tableau, chez soi. Chaque salle veut une
   famille et une montée d'énergie. On choisit quatre disques dans l'ordre ;
   le score dit combien la salle a dansé. La hype fait monter les cachets.
5. **Se faire connaître** à Radio Machine : des campagnes qui rapportent
   de la hype et des fans sur plusieurs jours.
6. **Produire** ses propres morceaux dès qu'on a un laptop, et les sortir.
7. **Ouvrir un label** au niveau 8, signer d'abord la scène locale, puis
   les artistes de l'atlas, par paliers. Ils sortent des disques tout seuls
   et l'argent tombe chaque nuit.

Six rivaux vivent leur vie en parallèle : ils raflent les disques rares,
signent les artistes qu'on hésitait à signer et tiennent les résidences.

## Le personnage

Un niveau et une barre d'expérience. Tout donne de l'expérience : un
quart de travail, un disque, un set, une campagne, une signature. Chaque
niveau ouvre quelque chose de visible : un lieu en chantier devient un
bâtiment, une salle plus grande entre au tableau des dates.

## Direction artistique

Petit monde en volume : cubes arrondis, faces en dégradé, contours épais,
couleurs saturées, reflets. Tout est dessiné en canvas 2D une fois
(`src/world/dessin.js`), puis affiché par Phaser en WebGL, qui apporte la
caméra, les particules, les tweens et le glow des néons. L'interface est
en DOM par-dessus, avec des cartes rondes, des boutons qui s'enfoncent et
des pièces qui volent vers le porte-monnaie.

Les personnages sont ceux d'origine : la créature à grosse tête, oreilles
tombantes, antenne et sacoche de disques, et ses voisins de la même espèce
dans d'autres couleurs. Les six rivaux et les six habitants se promènent
dans la ville.

## Structure

```
game/
  index.html            HUD, barre du bas, feuille des panneaux, écran titre
  styles.css            toute l'interface
  vendor/phaser.min.js  Phaser 3.90
  src/
    main.js             assemblage
    data/catalogue.js   ENGENDRÉ depuis src/data/corpus.json (ne pas éditer)
    data/monde.js       matériel, boulots, salles, campagnes, label, niveaux,
                        rivaux, habitants, plan de la ville, quête
    game/etat.js        état, économie, journée, sauvegarde
    world/carte.js      grille, obstacles, chemin (A*), marcheur
    world/dessin.js     tout le dessin : sol, bâtiments, chantiers,
                        personnages, studio, pochettes
    scenes/ville.js     la scène Phaser
    ui/ui.js            HUD, panneaux, animations
  v1/                   l'ancienne version (canvas, pixel art), conservée
```

## Scripts

- `node scripts/game-catalogue.mjs` : régénère `catalogue.js` depuis le
  corpus. À relancer quand le corpus change.
- `node scripts/game-sim.mjs [jours] [parties]` : un joueur mécanique joue
  des journées entières et imprime le rythme (kit complet, premier set,
  label, niveaux). Sert à régler les prix.
- `node scripts/game-capture.mjs [largeur] [hauteur]` : captures d'écran
  du titre, de la ville et des panneaux, avec le serveur de développement
  lancé (`npm run dev`).

## Déployer

Le dossier est 100 % statique et servi par le réseau, hors du cache de
l'application (voir `vite.config.ts`). Un doute sur la version qui tourne :
`/game/?nocache=1` vide les caches et recharge.
