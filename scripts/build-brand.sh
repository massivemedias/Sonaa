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
# Deux points mesures qui expliquent des choix qui pourraient surprendre :
#   - le disque noir contre le fond du site (#0a0c10) ne donne que 1,07:1 de
#     contraste, donc l'image de partage porte un filet ivoire, sinon le
#     disque est invisible et le lettrage flotte ;
#   - la variante de theme du favicon va dans le sens SOMBRE et non clair :
#     un disque noir se detache tres bien d'une barre d'onglets claire, et
#     se perd dans une barre sombre.
#
# Les favicons 16 et 32 sont recadres sur le S initial : le mot entier
# ferait cinq lettres dans dix pixels de large, donc rien de lisible.
#
# Usage : bash scripts/build-brand.sh   (depuis la racine du depot)

set -euo pipefail

LOGO="SonaaLogo.png"
CIRCLE="SonaaLogoCircle.png"
B="public/brand"
FOND="#0a0c10"

# Cadrage du S initial dans le disque, mesure une fois sur la source.
S_CROP="1150x1150+790+1650"

test -f "$LOGO" || { echo "source absente : $LOGO"; exit 1; }
test -f "$CIRCLE" || { echo "source absente : $CIRCLE"; exit 1; }
mkdir -p "$B"

# Logotype servi : seul fichier de logotype du projet.
magick "$LOGO" -resize 1800x -strip "$B/sonaa-logo.png"

# Disque servi, source des carres.
magick "$CIRCLE" -resize 1024x1024 -strip "$B/sonaa-logo-circle.png"

# iOS : coins remplis, opacite totale exigee par Apple.
magick -size 180x180 xc:"$FOND" \
  \( "$CIRCLE" -resize 180x180 \) -composite -alpha off "$B/apple-touch-icon.png"

# Application : le disque tel quel, transparence hors disque conservee.
magick "$CIRCLE" -resize 192x192 -strip "$B/icon-192.png"
magick "$CIRCLE" -resize 512x512 -strip "$B/icon-512.png"

# Maskable : marge de securite de 20 pour cent, fond opaque.
magick -size 512x512 xc:"$FOND" \
  \( "$CIRCLE" -resize 410x410 \) -gravity center -composite -alpha off \
  "$B/icon-maskable-512.png"

# Favicons : le S initial. Dilatation au 16 seulement, sinon les delies
# disparaissent.
magick "$CIRCLE" -crop "$S_CROP" +repage miff:- > /tmp/sonaa-s.miff
magick /tmp/sonaa-s.miff -morphology Dilate Disk:14 -resize 16x16 -strip "$B/favicon-16.png"
magick /tmp/sonaa-s.miff -resize 32x32 -strip "$B/favicon-32.png"
magick /tmp/sonaa-s.miff -resize 48x48 -strip /tmp/sonaa-s48.png
magick "$B/favicon-16.png" "$B/favicon-32.png" /tmp/sonaa-s48.png "$B/favicon.ico"

# Variante servie sous prefers-color-scheme: dark, avec son filet clair.
magick /tmp/sonaa-s.miff -fill none -stroke "#f2f4f8" -strokewidth 26 \
  -draw "rectangle 13,13 1137,1137" miff:- > /tmp/sonaa-s-ring.miff
magick /tmp/sonaa-s-ring.miff -morphology Dilate Disk:14 -resize 16x16 -strip "$B/favicon-dark-16.png"
magick /tmp/sonaa-s-ring.miff -resize 32x32 -strip "$B/favicon-dark-32.png"

# Partage : le disque et son filet, centres sur le fond du site.
magick -size 1200x630 xc:"$FOND" \
  \( "$CIRCLE" -resize 470x470 \) -gravity center -composite \
  -fill none -stroke "rgba(242,244,248,0.28)" -strokewidth 3 \
  -draw "circle 600,315 600,80" -alpha off "public/og.png"

rm -f /tmp/sonaa-s.miff /tmp/sonaa-s-ring.miff /tmp/sonaa-s48.png
echo "Declinaisons regenerees depuis $LOGO et $CIRCLE."
