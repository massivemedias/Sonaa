#!/usr/bin/env bash
# Déclinaisons de l'identité, générées depuis les DEUX sources livrées.
#
# Sources, à la racine du dépôt, jamais modifiées :
#   SonaaLogo.png        9260 x 4028, le logotype seul, blanc casse sur
#                        transparence. Le fond transparent et les lettres
#                        opaques sont ce qui fait marcher le masque du
#                        balayage lumineux : ne pas y toucher.
#   SonaaLogoCircle.png  4617 carre, le meme logotype dans un disque noir
#                        opaque, transparent hors du disque. Source de tout
#                        ce qui est carre ou rond, utilise TEL QUEL.
#
# Le disque noir contre le fond du site ne donne que 1,07:1 de contraste :
# c'est pourquoi le partage passe par une capture (voir plus bas).
#
# LES ICONES NE VIENNENT PLUS DE CES SOURCES. Voir scripts/refaire-favicon.sh.
#
# Usage : bash scripts/build-brand.sh   (depuis la racine du depot)

set -euo pipefail

LOGO="SonaaLogo.png"
CIRCLE="SonaaLogoCircle.png"
B="public/brand"
FOND="#0a0c10"

test -f "$LOGO" || { echo "source absente : $LOGO"; exit 1; }
test -f "$CIRCLE" || { echo "source absente : $CIRCLE"; exit 1; }
mkdir -p "$B"

# Logotype servi : seul fichier de logotype du projet.
magick "$LOGO" -resize 1800x -strip "$B/sonaa-logo.png"

# Disque servi, source des carres.
magick "$CIRCLE" -resize 1024x1024 -strip "$B/sonaa-logo-circle.png"

# LES ICONES NE SORTENT PLUS D'ICI. Favicons, icone Apple, icones de
# l'application : un seul ecrivain, scripts/refaire-favicon.sh, qui les tire
# du logotype depuis le 1er octobre 2026. Ce script les ecrivait depuis le
# disque et le S ; les laisser ici, c'etait remettre l'ancien S au prochain
# lancement.
sh scripts/refaire-favicon.sh

# L'IMAGE DE PARTAGE N'EST PLUS ECRITE ICI. Elle l'a ete : le disque et son
# filet, centres sur le fond du site. Elle disait qui publie, jamais ce qu'on
# publie. C'est desormais une capture de l'atlas, produite par
# scripts/capture-og.mjs (npm run capture:og), qui reste le SEUL ecrivain de
# public/og.png. Deux scripts qui ecrivent le meme fichier, c'est une image
# qui change selon celui qu'on a lance en dernier.

rm -f /tmp/sonaa-disque-filet.miff /tmp/sonaa-48.png
echo "Declinaisons regenerees depuis $LOGO et $CIRCLE."

# ---------------------------------------------------------------- iOS splash
#
# Safari n'affiche un ecran de lancement que s'il existe un fichier a la
# resolution EXACTE de l'appareil, en pixels physiques, avec la bonne
# media query. Aucune mise a l'echelle : une taille manquante donne un
# ecran blanc, pas une image redimensionnee. D'ou cette liste, qui couvre
# les iPhone et iPad en service, dans les deux orientations.
#
# Le contenu est le disque centre sur le fond du site, a un huitieme de la
# plus petite dimension : la meme image que l'ecran de chargement HTML, pour
# qu'on ne voie aucune rupture entre le lancement et l'application.

SPLASH="$B/splash"
mkdir -p "$SPLASH"

# largeur hauteur (pixels physiques)
TAILLES="
1179 2556
2556 1179
1290 2796
2796 1290
1170 2532
2532 1170
1284 2778
2778 1284
1125 2436
2436 1125
1242 2688
2688 1242
828 1792
1792 828
750 1334
1334 750
1640 2360
2360 1640
1668 2388
2388 1668
1536 2048
2048 1536
1620 2160
2160 1620
2048 2732
2732 2048
"

echo "$TAILLES" | while read -r W H; do
  [ -z "$W" ] && continue
  # Le disque occupe un quart de la plus petite dimension.
  if [ "$W" -lt "$H" ]; then D=$((W / 3)); else D=$((H / 3)); fi
  magick -size "${W}x${H}" xc:"$FOND" \
    \( "$CIRCLE" -resize "${D}x${D}" \) -gravity center -composite \
    -alpha off -strip "$SPLASH/splash-${W}x${H}.png"
done

echo "Ecrans de lancement iOS : $(ls "$SPLASH" | wc -l | tr -d ' ') fichiers."
