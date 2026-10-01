#!/bin/sh
# LES ICONES DE SONAA : LE LOGOTYPE « Sonaa », LE PLUS GROS POSSIBLE.
#
# Usage : npm run favicon
#
# ═══ L'HISTOIRE COURTE ═══
#
# Le S seul du logotype jusqu'au 30 septembre 2026, puis un egaliseur de trois
# barres (« il est pas beau celui present »), puis, le 1er octobre 2026, le
# logotype entier : Mika, « pour le favicon essaie de mettre ca, et je le
# veux le plus gros possible pour un favicon ».
#
# ═══ LE PLUS GROS POSSIBLE, ET CE QUE CA VEUT DIRE ═══
#
# Le logotype est deux fois et quart plus large que haut, et le S monte du
# haut au bas de l'image : on ne peut rien rogner en hauteur sans couper une
# lettre. On rogne donc en largeur, les arabesques de gauche et de droite,
# et on garde les cinq lettres entieres : le mot occupe alors 56 % de la
# hauteur du carre, au lieu de 43 % avec le logotype entier. Le fond est un
# carre plein, sans coins arrondis : un coin arrondi est de la place perdue.
#
# A SEIZE PIXELS, AUCUNE ECRITURE CURSIVE NE SE LIT, c'est une tache blanche
# en forme de mot. Les onglets des ecrans Retina prennent la version 32 px,
# ou « Sonaa » se lit. Les traits sont epaissis avant la reduction, un peu
# plus pour les petites tailles, sinon le blanc fin se dissout dans le noir.
#
# Les icones d'application (Apple, Android) gardent une marge : le systeme
# arrondit les coins, et l'icone « maskable » doit tenir dans le cercle de
# securite (80 % du carre).
#
# Il n'y a plus de favicon.svg : le logotype n'existe qu'en image, et un SVG
# qui emballerait une image ne serait net a aucune taille de plus.

set -eu

cd "$(dirname "$0")/.."
SOURCE="SonaaLogo.png"
SORTIE="public/brand"
FOND="#0c0b09"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

test -f "$SOURCE" || { echo "source absente : $SOURCE"; exit 1; }

# Le logotype a 2048 px de large, rogne aux cinq lettres : de 200 a 1800 en
# largeur, toute la hauteur (le S la touche aux deux bouts).
magick "$SOURCE" -resize 2048x "$TMP/base.png"
magick "$TMP/base.png" -crop 1600x890+200+0 +repage "$TMP/mot.png"

# icone TAILLE LARGEUR_DU_MOT EPAISSISSEMENT FICHIER
icone() {
  magick "$TMP/mot.png" -channel A -morphology Dilate "Disk:$3" +channel \
    -filter Lanczos -resize "$2x$2" \
    -background "$FOND" -gravity center -extent "$1x$1" -alpha remove -strip "$4"
}

# Les favicons : le mot de bord a bord.
icone 16 16 40 "$TMP/16.png"
icone 32 32 22 "$TMP/32.png"
icone 48 48 14 "$TMP/48.png"
cp "$TMP/16.png" "$SORTIE/favicon-16.png"
cp "$TMP/32.png" "$SORTIE/favicon-32.png"
magick "$TMP/16.png" "$TMP/32.png" "$TMP/48.png" "$SORTIE/favicon.ico"

# Les icones d'application : une marge, le systeme arrondit les coins.
icone 180 158 4 "$SORTIE/apple-touch-icon.png"
icone 192 168 4 "$SORTIE/icon-192.png"
icone 512 448 2 "$SORTIE/icon-512.png"
icone 512 380 2 "$SORTIE/icon-maskable-512.png"

rm -f "$SORTIE/favicon.svg"

echo "Icones refaites depuis $SOURCE :"
for f in favicon-16.png favicon-32.png favicon.ico apple-touch-icon.png icon-192.png icon-512.png icon-maskable-512.png; do
  magick identify -format "  $f %wx%h %b\n" "$SORTIE/$f" | head -3
done
