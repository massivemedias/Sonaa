#!/bin/sh
# LE FAVICON DE L'ONGLET : LE S DE SONAA, DECOUPE DANS LE LOGO.
#
# Usage : npm run favicon
#
# ═══ DEUX TENTATIVES, ET CE QUE LA SECONDE A APPRIS ═══
#
# Au depart, les icones venaient toutes du logo rond, disque ENTIER, favicons
# compris. A seize pixels le lettrage n'etait plus qu'une virgule claire qui
# ressemblait a une croche. Premiere correction : un carre a coins arrondis au
# lieu du cercle, et le mot entier epaissi. On lisait « Sonaa » a trente-deux
# pixels, ce qui etait deja mieux, mais Mika a mis le doigt sur ce qui restait
# faux : le mot est LARGE ET COURT, donc dans une tuile carree il occupe une
# bande au milieu et laisse le haut et le bas vides. Trop petit.
#
# LE S, LUI, EST PLUS HAUT QUE LARGE. Il epouse la tuile au lieu de flotter
# dedans. A trente-deux pixels il fait vingt-neuf pixels de haut au lieu de
# sept : quatre fois plus de matiere pour le meme carre. Et c'est une lettre
# du logo, pas un dessin nouveau.
#
# ═══ LA DECOUPE, ET POURQUOI ELLE N'EST PAS UN SIMPLE RECADRAGE ═══
#
# Le S de ce script ne s'arrete pas net : sa barre traversante file vers la
# droite et rejoint le « o ». Couper a la verticale donnait soit un « d »,
# quand on coupait avant la boucle du haut, soit un morceau de « o » colle au
# bord, quand on coupait apres.
#
# On coupe donc en DEUX temps : une verticale a 530 pixels, qui garde la
# boucle du haut, puis un effacement du coin en bas a droite, ou trainait le
# bas du « o ». Les composantes connexes ne servent a rien ici, la barre
# traversante relie le S au « o » : c'est une seule forme au sens du pixel,
# deux lettres au sens de la lecture.
#
# ═══ L'EPAISSISSEMENT ═══
#
# Le logo est un script en trait fin. Reduit sans rien faire, il devient un
# gris sale. Les fondeurs epaississent aux petits corps depuis toujours. Un
# pixel de dilatation sur une reduction intermediaire suffit ; deux soudent
# les boucles entre elles. Compare a trois epaisseurs, retenu : un.
#
# ═══ LES GRANDES ICONES NE SONT PAS TOUCHEES ═══
#
# apple-touch-icon, icon-192, icon-512 et la version masquable gardent le
# disque et le mot entier : a cette taille il est parfaitement lisible, et iOS
# comme Android y appliquent leur propre masque. Le probleme etait celui de
# l'onglet, la correction reste dans l'onglet.

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

FOND='#0a0c10'
# Le filet de la variante sombre : la tuile est presque noire, donc invisible
# sur une barre d'onglets sombre. Un liseré clair sur le bord la detache.
FILET='#8b8f98'

# ── 1. Le S, isole ────────────────────────────────────────────────────────
magick "$LOGO" -alpha extract \
  -crop 530x783+0+0 +repage \
  -fill black -draw 'rectangle 430,640 530,783' \
  -trim +repage -resize x300 "$TEMPO/s.png"
magick "$TEMPO/s.png" -morphology Dilate Disk:1 -trim +repage "$TEMPO/s-gras.png"

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
  # LA LETTRE SE CALE SUR LA HAUTEUR, pas sur la largeur : c'est tout
  # l'interet du S. 94 % laisse juste ce qu'il faut pour que les coins
  # arrondis ne rognent pas la boucle du bas.
  hauteur=$(( taille * 94 / 100 ))
  carre "$taille" "$3"
  magick "$TEMPO/s-gras.png" -resize "x${hauteur}" "$TEMPO/g.png"
  magick "$TEMPO/fond.png" \
    \( "$TEMPO/g.png" -background none -alpha copy -fill white -colorize 100 \) \
    -gravity center -composite -strip "$2"
}

icone 16 "$SORTIE/favicon-16.png" ''
icone 32 "$SORTIE/favicon-32.png" ''
icone 48 "$TEMPO/48.png" ''
icone 16 "$SORTIE/favicon-dark-16.png" "$FILET"
icone 32 "$SORTIE/favicon-dark-32.png" "$FILET"

# ── 4. Le .ico, trois tailles dans un fichier ─────────────────────────────
# Il sert aux vieux navigateurs et a Windows, qui choisit selon le contexte.
magick "$SORTIE/favicon-16.png" "$SORTIE/favicon-32.png" "$TEMPO/48.png" \
  "$SORTIE/favicon.ico"

echo "Favicon refait a partir du S de $LOGO :"
for f in favicon-16 favicon-32 favicon-dark-16 favicon-dark-32; do
  printf '  %-20s %s\n' "$f.png" "$(magick identify -format '%wx%h, %B octets' "$SORTIE/$f.png")"
done
printf '  %-20s %s\n' 'favicon.ico' "$(magick identify -format '%wx%h ' "$SORTIE/favicon.ico")"
