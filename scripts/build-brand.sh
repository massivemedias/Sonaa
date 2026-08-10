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
# TOUS les favicons sont le disque entier, utilise tel quel. Une version
# precedente les recadrait sur le S initial pour gagner en lisibilite a
# 16 px ; ce n'est plus le cas, sur demande. Le disque est la forme que la
# marque doit avoir partout, y compris dans un onglet : on reconnait une
# pastille avant de lire un lettrage, et une icone qui ne ressemble a
# aucune autre declinaison ne sert pas la marque, meme lisible.
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

# Favicons : le disque entier, reduit et rien d'autre.
#
# Une version intermediaire dilatait le lettrage avant reduction, pour que
# les delies ne tombent pas sous le pixel. Mesure faite sur six reglages de
# Disk:0 a Disk:12, l'ecart est nul : la luminance maximale est deja a 255
# sans dilatation, et la moyenne passe de 106 a 109. Elle epaississait le
# trait sans rien apporter, elle est donc retiree.
magick "$CIRCLE" -resize 16x16 -strip "$B/favicon-16.png"
magick "$CIRCLE" -resize 32x32 -strip "$B/favicon-32.png"
magick "$CIRCLE" -resize 48x48 -strip /tmp/sonaa-48.png
magick "$B/favicon-16.png" "$B/favicon-32.png" /tmp/sonaa-48.png "$B/favicon.ico"

# Variante servie sous prefers-color-scheme: dark. Le filet suit le bord du
# disque : un disque noir se perd dans une barre d'onglets sombre, et un
# cadre rectangulaire autour d'une forme ronde se verrait comme une erreur.
# Le disque est circonscrit a l'image : centre (2308,2308), rayon 2308. Le
# filet est pose a 2280 pour rester dans le pixel du bord apres reduction.
magick "$CIRCLE" -fill none -stroke "#f2f4f8" -strokewidth 100 \
  -draw "circle 2308,2308 2308,28" miff:- > /tmp/sonaa-disque-filet.miff
magick /tmp/sonaa-disque-filet.miff -resize 16x16 -strip "$B/favicon-dark-16.png"
magick /tmp/sonaa-disque-filet.miff -resize 32x32 -strip "$B/favicon-dark-32.png"

# Partage : le disque et son filet, centres sur le fond du site.
magick -size 1200x630 xc:"$FOND" \
  \( "$CIRCLE" -resize 470x470 \) -gravity center -composite \
  -fill none -stroke "rgba(242,244,248,0.28)" -strokewidth 3 \
  -draw "circle 600,315 600,80" -alpha off "public/og.png"

rm -f /tmp/sonaa-disque-filet.miff /tmp/sonaa-48.png
echo "Declinaisons regenerees depuis $LOGO et $CIRCLE."
