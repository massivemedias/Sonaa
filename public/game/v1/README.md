# SONAA · Label Tycoon

Jeu de gestion / tamagotchi en **vue isométrique**, jouable au doigt sur mobile.
Tu commences avec 260 $, un casque cassé et un 3½ sur Marquette. Tu finis (ou pas)
dans la tour de verre d'un major.

Destination de prod prévue : `https://sonaa.ca/game`

---

## Lancer en local

```bash
cd game && python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000`. **Un serveur est obligatoire** (modules ES) -
ouvrir `index.html` en `file://` ne marchera pas.

## Déployer

Le dossier est **100 % statique** : pas de build, pas de dépendances, pas d'API.
Il suffit de copier le contenu de `game/` dans le dossier `/game` du site.

- Apache / Nginx / OVH : copier le dossier tel quel dans `public_html/game/`
- Vercel / Netlify / Cloudflare Pages : déployer ce dossier comme site statique,
  avec `/game` comme chemin de base (tous les chemins internes sont **relatifs**,
  donc ça marche à n'importe quelle profondeur d'URL)
- Une seule ressource externe : la police Google Fonts (Baloo 2). Si tu veux du
  100 % offline, retire le `<link>` dans `index.html` · la police de repli reste correcte.

## Direction artistique

Rendu « mini world » : des tuiles-cubes arrondies posées côte à côte, dessus pâle
et flancs saturés, volumes doux, aucun contour dur. Tout est dessiné en canvas 2D
avec un mini-moteur iso 2:1, sans aucune image.

- **Le sol** est une grille de cubes (`drawCube`) espacés de 5 %, avec un joint
  sombre, deux flancs en dégradé saturé et un dessus arrondi avec arête de
  lumière. Trois niveaux : le gazon est surélevé, la rue est creusée, le
  trottoir est au milieu · ça crée du relief sans rien coder de plus.
- **La lumière** est traitée façon TUNIC : un soleil chaud en haut à gauche
  (`SUN`) réchauffe les faces éclairées, une teinte froide (`SHADE_TINT`)
  refroidit les faces à l'ombre. Le dessus est éclairci et désaturé, les flancs
  assombris et sursaturés (`hsl(couleur, dLuminosité, dSaturation)`).
- **Les ombres portées** sont le vrai marqueur du style : chaque volume projette
  son empreinte au sol dans la direction du soleil (`castBox`, `castBlob`),
  avant que quoi que ce soit d'autre ne soit dessiné. Pas de `ctx.filter`
  (bien trop lent) : trois polygones concentriques à faible opacité suffisent
  à faire un bord doux.
- **Brume et vignette** en fin de rendu : le haut de l'écran se fond dans le
  ciel, les bords s'assombrissent légèrement.
- Les dalles sont **plates** (17 % d'épaisseur) : on lit un sol, pas une pile
  de cubes. Trois niveaux très rapprochés donnent juste ce qu'il faut de relief.
- Le sol est **de l'herbe** par défaut, avec des parvis de pierre autour des
  bâtiments (mélangés à de l'herbe aux angles), des chemins de pierre creusés,
  et quelques **ruines** · un arceau de pierre et des colonnes brisées.
- Fleurs et cailloux sont semés sur les tuiles par une fonction de hachage
  déterministe : le motif ne bouge pas d'une partie à l'autre.
- Un grain léger est appliqué sur toute l'image en fin de rendu.

- `src/core/art.js` : les primitives. `box()` construit un volume avec silhouette
  arrondie, trois faces en dégradé et arête de lumière ; `gableRoof()`, `awning()`,
  `plant()`, `tree()`, `signboard()`… Les dégradés sont exprimés en coordonnées
  monde et mis en cache, donc ils suivent la caméra sans coût par image
  (≈5 ms/image en 750×1624 sur un Mac récent, avec cull des tuiles hors écran).
- Palette : sable pour les dalles, vert vif pour le gazon, gris-bleu pour la rue,
  terre chaude pour le socle de l'îlot, bleu nuit pour le ciel.

### Ce qui bouge

Ciel qui change de couleur avec l'heure, nuages qui dérivent, étoiles qui
scintillent la nuit, oiseaux, voitures qui traversent la ville, sept passants qui
se promènent (chacun avec sa couleur, son rythme, sa destination), feuillages et
plantes qui ondulent, festons d'auvents, drapeaux, ventilateurs de clim, grue de
chantier, guirlandes, néon du Bunker qui grésille, faisceaux de lumière la nuit,
notes de musique au-dessus du bar et du club, statue de vinyle qui tourne,
lampadaires qui s'allument au crépuscule, et le héros qui marche avec un vrai
cycle de jambes, de bras et de poussière sous les pieds.

## Se déplacer et entrer

Une seule règle : **on tape sur un bâtiment, le personnage y va et entre tout
seul** en arrivant. Le bandeau d'objectif est cliquable (il emmène au lieu de la
quête en cours), la carte 🗺️ fait du déplacement rapide, et le bouton vert en bas
à droite ouvre le lieu quand on est déjà devant la porte. Le stick sert au
déplacement libre. Si le bâtiment est verrouillé, on y va quand même et le
panneau explique le palier qui manque.

## La couche financière

Bouton 📊 dans le HUD. C'est le tableau de bord du label :

- **Compte de résultat du jour** : ventes physiques, numérique, boutique,
  cachets de shows d'un côté ; loyer, marketing, intérêts, pressage, matériel,
  avances, promo, disques achetés, vie quotidienne de l'autre.
- **Graphe des 14 derniers jours** (recettes contre dépenses) et **autonomie**
  en jours de trésorerie au rythme actuel.
- **Politique de prix** : de 70 % à 135 % du prix conseillé. Baisser vend plus
  d'exemplaires et gagne des fans, monter améliore la marge et freine les ventes
  (élasticité appliquée à toute la demande).
- **Budget marketing quotidien** : de 0 à 6 000 $ par jour, débloqué par palier,
  qui achète un filet de hype et de fans tous les matins.
- **Emprunts** : 2 000 / 10 000 / 50 000 $, 5 % de frais de dossier et 0,5 %
  d'intérêts par jour. La dette est déduite de la valeur du label · s'endetter
  pour signer un gros artiste est un pari, pas un cadeau.

Tout est enregistré jour par jour dans `s.history` (45 jours glissants), ce qui
rend le jeu lisible comme un tableur : on voit exactement ce qui rapporte.

## Pochettes et écoute

`src/data/covers.js`. Le projet **ne contient aucune image de pochette** : elles
sont cherchées au moment où le disque apparaît, via l'API de recherche publique
d'Apple (aucune clé, appel en JSONP donc pas de problème de CORS), puis mises en
cache dans le navigateur pour un mois.

- **Pochette réelle** en fond de la carte du bac, et en vignette dans la
  collection et sur la platine.
- **Extrait de 30 s** officiel jouable dans le jeu (`previewUrl` d'Apple). La
  boucle techno procédurale se coupe pendant l'écoute et repart après.
- **Bouton YouTube** sur chaque disque : ouvre la recherche du morceau dans un
  nouvel onglet, pour écouter la version complète.

La correspondance est **stricte** : un résultat n'est accepté que si l'artiste
*et* le titre collent. Sans ça on récupérait un autre disque du même artiste, ce
qui est pire que pas de pochette. Quand rien ne colle · beaucoup de 12" techno
des années 90 ne sont pas au catalogue · le jeu retombe sur la pochette générée
procéduralement, qui reste jolie. Environ trois quarts des disques trouvent leur
pochette et leur extrait.

Un échec réseau n'est jamais mis en cache comme un « pas trouvé » : il est
réessayé au bout de trois minutes. Pour forcer une correspondance récalcitrante,
il suffit d'ajouter un champ `search:` sur le disque dans `content.js`.

Côté droits : rien n'est stocké ni redistribué, on affiche des images et des
extraits servis par Apple avec un lien vers la source, ce qui est l'usage prévu
de cette API. À revérifier si le jeu devient commercial.

## La quête d'ouverture

Le jeu commence par une histoire courte, guidée par un bandeau d'objectif et une
flèche dorée plantée au-dessus du lieu à rejoindre :

1. **Va au Vinyl Cave** · le disquaire.
2. **Fouille les bacs** · un disque à la fois, pochette en gros, prix, BPM,
   énergie, rareté. Tu choisis : acheter ou continuer de fouiller (chaque
   fouille coûte quelques minutes de jeu).
3. **Trouve « I Was in Ecstasy » de Laurent Garnier (F Communications)** · il est
   glissé quelque part dans le bac, toujours présent tant que tu ne l'as pas.
4. **Rentre chez toi et pose-le sur la platine** · scène de découverte,
   inspiration au maximum, +2,5 de skill. C'est là que la carrière commence.

Ensuite le jeu de gestion s'ouvre normalement. La quête vit dans
`src/game/quest.js` : une liste d'étapes et quatre crochets (`onEnter`, `onDig`,
`onBuy`, `onListen`). Pour en ajouter, il suffit d'allonger `STEPS`.

## Structure

```
game/
  index.html            écran titre + HUD + feuille de panneaux
  styles.css            toute l'UI (mobile-first, safe-areas iOS)
  manifest.webmanifest  installable sur l'écran d'accueil
  assets/               icônes générées (vinyle)
  src/
    core/iso.js         maths iso 2:1 + caméra
    core/art.js         primitives de dessin (boîtes, toits, auvents, décalques de façade)
    core/input.js       stick virtuel, tap-to-move, pinch, clavier
    data/content.js     ⚠️ TOUT le contenu : disques, artistes, matos, campagnes, paliers
    world/city.js       plan de la ville, collisions, A*
    world/architecture.js  recettes de dessin des bâtiments et du sol
    world/life.js       passants, voitures, oiseaux, notes de musique
    game/quest.js       la quête d'ouverture
    game/state.js       état, horloge, besoins, économie de fin de journée, sauvegarde
    game/actions.js     logique de chaque action (digging, prod, show, signature…)
    game/player.js      personnage et déplacement
    game/render.js      fond, tri en profondeur, marqueurs
    ui/ui.js            HUD + panneaux de chaque bâtiment
    audio/music.js      boucle techno procédurale (coupée par défaut, menu ☰)
    data/covers.js      pochettes réelles, extraits 30 s, liens YouTube
    main.js             assemblage + boucle de jeu
  tools/sim.mjs         simulateur d'équilibrage (voir plus bas)
```

## Boucle de jeu

1. **Vinyl Cave** · fouiller le bac disque par disque (renouvelé chaque jour, trouvailles à -50 %)
2. **Le Bunker** · jouer un set : tu choisis 4 disques, la salle veut une montée d'énergie
   précise, le score dépend du match d'énergie + de la continuité de BPM + de ta forme
3. **Studio** (chez toi puis en vrai) · produire des tracks ; la qualité dépend du skill,
   du matos, de l'inspiration, de la diversité de ta collection et de ton état physique
4. **Pressage & Distro** · presser (numérique / 300 / 1 000 / 5 000 copies) → ventes quotidiennes
5. **Radio Machine** · campagnes de promo (hype + fans étalés sur plusieurs jours)
6. **Massive Machines** · matos (909, 303, Juno, modulaire, console, mastering)
7. **Bureau du label** · signer des artistes, gérer le moral, ils sortent des disques tout seuls
8. **Sonaa Shop** · ta boutique de disques, revenus passifs
9. **Tour Major** · fin du jeu

Entre tout ça : manger, boire, dormir, réseauter au bar (rencontres aléatoires :
promoteur, journaliste, producteur…). Les besoins bas font chuter la qualité des prods
et la réaction du public.

**7 paliers** calculés sur la « valeur du label » (cash + matos + fans + hype + roster + catalogue).

## Équilibrage

`tools/sim.mjs` fait tourner une partie complète sans navigateur, avec un joueur
« optimal », et affiche à quel jour chaque palier tombe :

```bash
node tools/sim.mjs
```

Réglage actuel : un très bon joueur termine autour du **jour 60-90**.
Les leviers sont dans `src/data/content.js` (prix, cachets, paliers, campagnes)
et dans `endOfDay()` / `empire` de `src/game/state.js`.

## Noms réels

Tous les vrais noms (Jeff Mills, Laurent Garnier, Aphex Twin, Nina Kraviz…) sont
**regroupés dans `src/data/content.js`**. Ils donnent énormément de saveur, mais si le
jeu devient commercial ou public à grande échelle, les droits à l'image / au nom
peuvent poser problème : il suffit alors de remplacer ce seul fichier par des noms
parodiques, rien d'autre dans le code ne dépend de ces chaînes.

## Debug

En console : `__sonaa` expose `game`, `player`, `city`, `renderer`, `ui`, `music`.

```js
__sonaa.game.s.cash = 100000      // triche
__sonaa.game.s.minutes = 22*60    // passer en mode nuit
__sonaa.ui.open('label')          // ouvrir un panneau
```
