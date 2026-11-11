# ADR-117 : l'affiche de club

Date : 11 novembre 2026. Statut : accepté.

## Pourquoi

Mika veut un site « plus attrayant, moins IA de base ». Il a classé trois sites
qu'il aime : Kraken Industries en tête, puis Giga, puis Mizal. Leur fil commun,
relevé sur les captures : une condensée grasse en capitales pour les titres,
une mono pour tout ce qui est petit, une seule couleur d'accent posée en aplats
francs, des coins droits, des filets fins qui structurent, et des étapes
numérotées 01, 02, 03. Mizal est clair et en serif : ces deux traits restent
interdits par DESIGN.md et ne sont pas repris.

## Ce qui est décidé

- Deux polices s'ajoutent, libres (OFL) et auto-hébergées par Fontsource :
  Big Shoulders Display, condensée industrielle, pour les titres en capitales,
  et Geist Mono pour les libellés, dates, menus et boutons. Inter reste pour le
  texte qu'on lit longtemps.
- Les deux rôles sont déclarés une seule fois, dans `src/design/base.css` ;
  les feuilles de page ne règlent plus que la taille et l'interligne.
- Les coins passent à 2 px partout où ils lisent les jetons (`--rayon-carte`,
  `--rayon-affiche`, `--rayon-pilule`).
- L'accueil prend la mise en page de Kraken : le titre à gauche, le mur de
  pochettes à droite et droit, cinq portes en grille numérotée, chaque
  section numérotée en mono orange sous un filet, et Track ID en aplat
  orange plein.
- Le noir, l'orange et le jaune d'ADR-110 restent : ce choix de Mika n'est
  pas rouvert ici.

## Ce que cela engage

Les pages hors de l'accueil héritent des polices, des titres en capitales et
des coins droits, mais gardent leur mise en page. Elles seront reprises une à
une si la direction est validée sur l'accueil.
