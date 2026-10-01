#!/bin/sh
# LES ICONES DE SONAA : UN EGALISEUR, DESSINE UNE FOIS EN VECTEUR.
#
# Usage : npm run favicon
#
# ═══ POURQUOI PLUS LE S DU LOGO ═══
#
# L'onglet portait le S du logo, decoupe dans le lettrage de script, blanc
# fin sur un carre presque noir. Mika, le 30 septembre 2026 : « je voudrais
# un meilleur logo favicon, il est pas beau celui present ». Mesure a la
# taille reelle : a seize pixels, une lettre de script se lit comme un « @ »
# ou un « f », et le blanc fin sur le noir n'y laissait qu'une trace grise.
#
# Le nouveau signe est un egaliseur : trois barres claires sur une tuile
# terracotta, la couleur d'accent du site. Il dit « son » a toutes les
# tailles, il reprend le motif du bouton « Track ID », et la tuile
# coloree se detache aussi bien d'une barre d'onglets claire que d'une
# sombre : il n'y a plus besoin d'une variante sombre a
# filet.
#
# ═══ UNE GRILLE DE TRENTE-DEUX, ET C'EST TOUT LE SECRET ═══
#
# Le dessin (public/brand/favicon.svg) est pose sur une grille de 32 unites :
# des barres de 4 unites, espacees de 4, aux bords pairs. A seize pixels,
# chaque barre tombe pile sur deux pixels pleins ; un premier essai a quatre
# barres de 60 sur 512 tombait entre deux pixels et devenait flou. Chaque
# taille est rasterisee directement depuis le vecteur, a la densite qui la
# donne exactement, jamais reduite depuis une grande image.
#
# ═══ LES GRANDES ICONES ═══
#
# apple-touch-icon et la version masquable sont pleines, sans coins : iOS et
# Android appliquent leur propre masque, et des coins dessines s'y
# verraient en double. Les barres restent dans la zone sure de 80 %.

set -eu

cd "$(dirname "$0")/.."
SORTIE=public/brand
SVG=$SORTIE/favicon.svg
TEMPO=$(mktemp -d)
trap 'rm -rf "$TEMPO"' EXIT

if ! command -v magick > /dev/null 2>&1; then
  echo "ImageMagick est necessaire : brew install imagemagick" >&2
  exit 1
fi

# La meme tuile, sans coins arrondis, pour les icones que le systeme masque.
sed 's/ rx="7" fill/ fill/' "$SVG" > "$TEMPO/plein.svg"

# Le vecteur est lu a 96 points par pouce : 32 unites a la densite 3 x N
# donnent exactement N pixels.
rendre() { # $1 = svg, $2 = taille, $3 = fichier
  magick -background none -density $(( 3 * $2 )) "$1" -strip "$3"
}

rendre "$SVG" 16 "$SORTIE/favicon-16.png"
rendre "$SVG" 32 "$SORTIE/favicon-32.png"
rendre "$SVG" 48 "$TEMPO/48.png"
rendre "$SVG" 192 "$SORTIE/icon-192.png"
rendre "$SVG" 512 "$SORTIE/icon-512.png"
rendre "$TEMPO/plein.svg" 180 "$SORTIE/apple-touch-icon.png"
rendre "$TEMPO/plein.svg" 512 "$SORTIE/icon-maskable-512.png"

# Le .ico, trois tailles dans un fichier, pour les vieux navigateurs et
# Windows, qui choisit selon le contexte.
magick "$SORTIE/favicon-16.png" "$SORTIE/favicon-32.png" "$TEMPO/48.png" "$SORTIE/favicon.ico"

# Les anciennes variantes sombres a filet n'ont plus lieu d'etre.
rm -f "$SORTIE/favicon-dark-16.png" "$SORTIE/favicon-dark-32.png"

echo "Icones refaites a partir de $SVG :"
for f in favicon-16 favicon-32 apple-touch-icon icon-192 icon-512 icon-maskable-512; do
  printf '  %-22s %s\n' "$f.png" "$(magick identify -format '%wx%h, %B octets' "$SORTIE/$f.png")"
done
printf '  %-22s %s\n' 'favicon.ico' "$(magick identify -format '%wx%h ' "$SORTIE/favicon.ico")"
