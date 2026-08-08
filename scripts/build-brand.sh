#!/usr/bin/env bash
# Déclinaisons de l'identité, générées depuis une seule source.
#
# Source : public/brand/sonaa-logo.png, le fichier d'origine, jamais modifié.
# C'est un logotype calligraphique de 11104 x 4808, en NOIR sur transparence.
#
# Deux conséquences qui dictent tout ce script :
#
# 1. Noir sur transparence est invisible sur le fond du site. Le logo étant
#    monochrome, on le recolore dans la couleur du TEXTE, jamais dans une teinte
#    de famille : celles-ci sont porteuses de sens et le logo n'appartient à
#    aucune famille.
#
# 2. Le logotype fait 2,31 pour 1. Réduit dans un carré de 16 pixels, le mot
#    devient une bavure de 16 par 7. Les icônes carrées sont donc taillées dans
#    le « S » initial et son parafe, qui est l'élément reconnaissable, et non
#    dans le mot entier.
#
# Aucun effet : pas d'ombre, pas de halo, pas de contour. Le fond opaque des
# icônes n'est pas un effet, c'est une nécessité : une icône transparente et
# claire disparaît sur une barre d'onglets claire.
#
# Usage : bash scripts/build-brand.sh

set -euo pipefail

cd "$(dirname "$0")/.."

SRC="public/brand/sonaa-logo.png"
OUT="public/brand"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Couleur du texte du site, --ink-primary, oklch(0.93 0.008 250).
INK="#E4E8ED"
# Fond du site, oklch(0.16 0.012 250). Sert de fond aux icônes opaques.
BG="#090E12"
# Fond de l'image de partage, aligné sur celui déjà en place.
OG_BG="#0A0C10"

if [ ! -f "$SRC" ]; then
  echo "Source absente : $SRC" >&2
  exit 1
fi

echo "Source : $(magick identify -format '%wx%h' "$SRC")"

# --- Recolorisation ---------------------------------------------------------
# On ne « colorise » pas le noir, ce qui salirait les bords antialiasés : on
# prend le canal alpha comme forme et on le remplit d'une couleur pleine.
recolour() { # $1 source, $2 couleur, $3 sortie
  magick "$1" -alpha extract "$TMP/mask.png"
  magick -size "$(magick identify -format '%wx%h' "$1")" "xc:$2" \
    "$TMP/mask.png" -alpha off -compose CopyOpacity -composite "$3"
}

# --- 1. Logotype pour l'interface -------------------------------------------
recolour "$SRC" "$INK" "$TMP/wordmark-full.png"
magick "$TMP/wordmark-full.png" -trim +repage -resize 1600x \
  -strip "$OUT/sonaa-wordmark.png"
echo "logotype : $(magick identify -format '%wx%h' "$OUT/sonaa-wordmark.png")"

# --- 2. Marque carrée, taillée dans le S ------------------------------------
# 2700 pixels et pas un de plus : c'est la largeur qui contient le S entier,
# bouclé et hampe comprises, sans ramasser de fragment de la lettre suivante.
# Mesuré en comparant 2500, 2700, 2900 et 3050 : 2500 coupe la hampe, 2900 et
# au-delà ramènent un éclat du « o » en bas à droite.
magick "$TMP/wordmark-full.png" -crop 2700x4808+0+0 +repage -trim +repage \
  "$TMP/mark.png"
echo "marque   : $(magick identify -format '%wx%h' "$TMP/mark.png")"

# Marque sur transparence, pour un usage libre.
magick "$TMP/mark.png" -resize 1024x1024 -background none -gravity center \
  -extent 1024x1024 -strip "$OUT/sonaa-mark.png"

# $1 taille, $2 part occupée par la marque, $3 fond, $4 sortie, $5 dilatation
#
# La dilatation compense l'optique des petites tailles : les déliés de cette
# calligraphie sont des traits d'un pixel et disparaissent sous 32 pixels. Ce
# n'est pas un effet ajouté au logo, c'est la seule façon qu'il survive à la
# réduction. Elle vaut zéro dès que la place le permet.
square() {
  local size="$1" ratio="$2" bg="$3" dest="$4" grow="${5:-0}"
  local inner
  inner=$(python3 -c "print(round($size * $ratio))")
  if [ "$grow" != "0" ]; then
    magick "$TMP/mark.png" -resize "${inner}x${inner}" \
      -channel A -morphology Dilate "Disk:$grow" +channel \
      -background "$bg" -gravity center -extent "${size}x${size}" \
      -strip "$dest"
  else
    magick "$TMP/mark.png" -resize "${inner}x${inner}" \
      -background "$bg" -gravity center -extent "${size}x${size}" \
      -strip "$dest"
  fi
}

# --- 3. Favicons ------------------------------------------------------------
# Fond opaque : le site est sombre, la barre d'onglets ne l'est pas toujours.
square 32 0.80 "$BG" "$OUT/favicon-32.png" 0.6
square 16 0.88 "$BG" "$OUT/favicon-16.png" 0.8
square 48 0.78 "$BG" "$TMP/favicon-48.png" 0.4
magick "$OUT/favicon-16.png" "$OUT/favicon-32.png" "$TMP/favicon-48.png" \
  "$OUT/favicon.ico"

# --- 4. Apple touch ---------------------------------------------------------
# Apple ignore la transparence et pose du noir : on fournit le fond nous-mêmes.
square 180 0.7 "$BG" "$OUT/apple-touch-icon.png"

# --- 5. Icônes d'application ------------------------------------------------
square 192 0.72 "$BG" "$OUT/icon-192.png"
square 512 0.72 "$BG" "$OUT/icon-512.png"
# Maskable : le système rogne jusqu'à 20 pour cent de chaque côté. La marque
# n'occupe donc que 60 pour cent du carré, tout le reste est du fond.
square 512 0.6 "$BG" "$OUT/icon-maskable-512.png"

# --- 6. Image de partage ----------------------------------------------------
# Le logotype centré sur le fond du site, sans rien d'autre : c'est une carte de
# visite, pas une infographie.
magick -size 1200x630 "xc:$OG_BG" \
  \( "$TMP/wordmark-full.png" -trim +repage -resize 760x \) \
  -gravity center -composite -strip "public/og.png"

echo ""
echo "Écrit dans $OUT :"
magick identify -format '  %f  %wx%h\n' "$OUT"/*.png "$OUT"/*.ico
magick identify -format '  %f  %wx%h\n' public/og.png
