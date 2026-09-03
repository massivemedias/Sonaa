#!/bin/sh
# LE FAVICON DE L'ONGLET, REFAIT A PARTIR DU LOGO.
#
# Usage : npm run favicon
#
# ═══ CE QU'IL Y AVAIT, ET POURQUOI CA NE MARCHAIT PAS ═══
#
# Les icones venaient toutes du logo rond, disque ENTIER, favicons compris.
# A seize pixels le lettrage n'etait plus qu'une trace claire, et c'etait
# assume : « c'est le disque qui identifie ». A l'usage, non. Dans un onglet
# on ne voit ni disque ni lettrage : on voit une virgule blanche qui ressemble
# a une croche, et Mika l'a dit sans detour, ca ne reflete pas le logo.
#
# Deux causes, mesurees plutot que supposees.
#
#   1. LE DISQUE MANGE LES COINS. Le lettrage est large et court ; inscrit
#      dans un cercle il perd un bon tiers de sa taille pour rien. Un carre
#      a coins arrondis lui rend cette place.
#
#   2. LE FILET NE SURVIT PAS A LA REDUCTION. Le logo est un script en trait
#      fin. Reduit a trente-deux pixels sans rien faire, il devient un gris
#      sale. Les fondeurs de caracteres connaissent le remede depuis
#      toujours : aux petits corps, on epaissit. Un pixel d'epaississement
#      sur une reduction intermediaire suffit, et deux commencent a souder
#      les lettres entre elles. Compare a trois epaisseurs, retenu : un.
#
# ═══ CE QUI RESTE VRAI, ET QU'IL FAUT DIRE ═══
#
# A SEIZE PIXELS, LE MOT NE PASSE PAS. Essaye a quatre epaisseurs, de un a
# quarante sur l'original : c'est un gris sale a chaque fois. Ce n'est pas un
# defaut de fabrication, c'est la physique d'un script de cinq lettres dans
# seize pixels. On garde quand meme LE MEME dessin a toutes les tailles,
# plutot qu'un second signe pour les seuls ecrans non retina : une icone
# d'onglet qui change de forme selon la machine est pire qu'une icone dense.
# Les navigateurs modernes prennent le trente-deux ou le quarante-huit, ce
# qui est ce que tout le monde voit en pratique.
#
# ═══ LES GRANDES ICONES NE SONT PAS TOUCHEES ═══
#
# apple-touch-icon, icon-192, icon-512 et la version masquable gardent le
# disque et le lettrage entier : a cette taille il est parfaitement lisible,
# et iOS comme Android y appliquent leur propre masque. Le probleme etait
# celui de l'onglet, la correction reste dans l'onglet.

set -eu

cd "$(dirname "$0")/.."
LOGO=public/brand/sonaa-logo.png
SORTIE=public/brand
TEMPO=$(mktemp -d)
trap 'rm -rf "$TEMPO"' EXIT

if ! command -v magick > /dev/null 2>&1; then
  echo "ImageMagick est necessaire : brew install imagemagick" >&2
  exit 1
fi

# Le fond du site, pour que l'icone appartienne visiblement au meme objet.
FOND='#0a0c10'
# Le filet de la variante sombre : le fond de l'icone est presque noir, donc
# invisible sur une barre d'onglets sombre. Un liset clair sur le bord suffit
# a la detacher, et c'est ce que faisait deja l'ancienne version.
FILET='#8b8f98'

# ── 1. Le lettrage, epaissi une fois pour toutes ──────────────────────────
# On reduit AVANT d'epaissir : un disque de 1 pixel sur une image de 320 de
# large equivaut a un disque de 6 sur l'original, et coute mille fois moins.
magick "$LOGO" -alpha extract -trim +repage -resize 320x "$TEMPO/mot.png"
magick "$TEMPO/mot.png" -morphology Dilate Disk:1 -trim +repage "$TEMPO/mot-gras.png"

# ── 2. Le fond, carre a coins arrondis ────────────────────────────────────
# Dessine grand puis reduit : c'est ce qui donne des coins lisses. Le rayon
# vaut 19 % du cote, la proportion habituelle des icones d'application.
carre() { # $1 = taille, $2 = couleur de filet ou vide
  if [ -n "$2" ]; then
    magick -size 512x512 xc:none \
      -fill "$FOND" -stroke "$2" -strokewidth 14 \
      -draw 'roundrectangle 7,7 504,504 96,96' \
      -resize "$1x$1" "$TEMPO/fond.png"
  else
    magick -size 512x512 xc:none -fill "$FOND" -stroke none \
      -draw 'roundrectangle 0,0 511,511 96,96' \
      -resize "$1x$1" "$TEMPO/fond.png"
  fi
}

# ── 3. Une icone ──────────────────────────────────────────────────────────
icone() { # $1 = taille, $2 = fichier, $3 = couleur de filet ou vide
  taille=$1
  # Le lettrage occupe 94 % de la largeur : les coins arrondis laissent la
  # place, et le mot n'a aucune raison de flotter au milieu d'une marge.
  largeur=$(( taille * 94 / 100 ))
  carre "$taille" "$3"
  magick "$TEMPO/mot-gras.png" -resize "${largeur}x" "$TEMPO/m.png"
  magick "$TEMPO/fond.png" \
    \( "$TEMPO/m.png" -background none -alpha copy -fill white -colorize 100 \) \
    -gravity center -composite -strip "$2"
}

icone 16 "$SORTIE/favicon-16.png" ''
icone 32 "$SORTIE/favicon-32.png" ''
icone 48 "$TEMPO/48.png" ''
icone 16 "$SORTIE/favicon-dark-16.png" "$FILET"
icone 32 "$SORTIE/favicon-dark-32.png" "$FILET"
icone 48 "$TEMPO/48-dark.png" "$FILET"

# ── 4. Le .ico, trois tailles dans un fichier ─────────────────────────────
# Il sert aux vieux navigateurs et a Windows, qui choisit selon le contexte.
magick "$SORTIE/favicon-16.png" "$SORTIE/favicon-32.png" "$TEMPO/48.png" \
  "$SORTIE/favicon.ico"

echo "Favicon refait a partir de $LOGO :"
for f in favicon-16 favicon-32 favicon-dark-16 favicon-dark-32; do
  printf '  %-18s %s\n' "$f.png" "$(magick identify -format '%wx%h, %B octets' "$SORTIE/$f.png")"
done
printf '  %-18s %s\n' 'favicon.ico' "$(magick identify -format '%wx%h ' "$SORTIE/favicon.ico")"
