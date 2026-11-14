# ADR-121 : l'atlas en deux colonnes, en affiche de club

Date : 13 novembre 2026. Statut : accepté.

## Pourquoi

Mika : « je suis pas fan, j'y arrive pas, peut-être la carte prend trop
d'espace en desktop, peut-être faire plusieurs colonnes ; les couleurs aussi,
ça fait trop IA ». L'atlas avait gardé la mise en page d'avant ADR-117 : une
carte pleine largeur, puis une pile de cartes arrondies avec des pilules, des
pastilles lumineuses, un vert menthe pour les festivals et des jauges en
dégradé.

## Ce qui est décidé

- **Deux colonnes dès 1 100 px** : les filtres et la liste à gauche, la carte
  à droite, fixe et à hauteur d'écran. Au téléphone, la page reste une pile :
  filtres, carte de 300 px, liste.
- **Trois couleurs, celles du site** : l'ambre pour les clubs, le sable pour
  les festivals, l'encre effacée pour les salles. Le vert sort de l'atlas.
- **Des formes au lieu de pastilles** : un carré pour un club, un losange
  pour un festival, un petit carré pour une salle, sur la carte comme dans la
  légende.
- **Des rangées en filets, plus des cartes** : le rang en grands chiffres
  condensés, ambre pour le podium, le nom en capitales, les styles en mono
  séparés par des barres obliques, une jauge de 3 px en aplat.
- **Les sections numérotées 01, 02, 03** sous un filet épais, comme
  l'accueil.
- **Le fond de carte en monochrome** : l'eau plus sombre que la terre, les
  parcs à peine plus chauds. Le bleu et le vert du style d'origine sortent
  aussi de la carte du calendrier, qui partage ce fond.

## Révisé le 14 novembre 2026

Mika : « dans atlas mobile, je trouve ça vraiment trop carré, épure un peu la
page ; je veux pouvoir zoomer sur la carte sans me prendre la tête avec deux
doigts, je veux que ça fonctionne comme Google Maps ».

- **Les gestes coopératifs sont retirés** de toutes les cartes du site : un
  doigt déplace, le pincement, le double tap et la molette zooment.
- **Au téléphone, l'atlas s'allège** : les types deviennent des onglets
  soulignés sur une ligne, les champs n'ont plus qu'un filet dessous, la
  carte va d'un bord à l'autre, la légende part, et « Chercher dans cette
  zone » se pose sur la carte.
- **Un bouton plein écran**, en icône, ouvre la carte sur tout l'écran ; la
  page ne défile plus dessous tant qu'elle est ouverte.
- **Toutes les fiches sont fermées au départ**, et le restent quand on
  change de ville (13 novembre 2026).
- **Moins de bordures, aussi sur ordinateur** (14 novembre 2026, « encore
  vraiment trop carré, enlève juste certaines lignes de bordure ») : les
  types en onglets soulignés, les champs à simple trait, les boutons de zone
  en texte, la carte sans contour, plus de trait sous l'en-tête ni de filet
  épais au-dessus des sections, et la légende retirée. Les filets fins entre
  les rangées du classement restent.
