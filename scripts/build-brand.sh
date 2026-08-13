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
# LES FAVICONS SONT LE S SEUL, en blanc. Le disque entier a ete essaye et
# mesure illisible a 16 px : voir la section des favicons plus bas, qui porte
# les chiffres et le raisonnement. Le disque reste partout ailleurs.
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

# ═══════════════════════════════════════════════════════════════════════
# FAVICONS : LE S SEUL, EN BLANC. Ce n'est plus le disque entier.
# ═══════════════════════════════════════════════════════════════════════
#
# CE CHOIX EN REMPLACE UN AUTRE, ET IL FAUT SAVOIR LEQUEL. Les favicons
# etaient le DISQUE ENTIER, sur demande : « on reconnait une pastille avant de
# lire un lettrage ». Le cout etait declare : a 16 px le lettrage n'est plus
# qu'une trace claire au centre.
#
# Constat, en agrandissant les fichiers reellement produits : ce n etait pas une
# trace claire, c etait une BAVURE GRISE. Le mot entier « Sonaa », cinq lettres
# calligraphiees, etait reduit dans seize pixels : aucun trait ne survivait, et
# dans un onglet on voyait une pastille sombre sans forme identifiable.
#
# On recadre donc sur le S initial, sa grande boucle et sa hampe, en BLANC sur
# le fond du site. Une forme, pas un mot. Le disque reste partout ailleurs :
# icones d'application, ecran de lancement, image de partage.
#
# LA DILATATION N'EST PAS UN ORNEMENT. Les delies de cette calligraphie font
# moins d'un pixel une fois reduits : sans epaississement ils disparaissent par
# endroits et la forme se casse. On dilate donc avant de reduire, et PLUS FORT
# a 16 px qu'a 32, parce que le probleme y est deux fois pire.
S_SOURCE="/tmp/sonaa-s.png"
magick "$LOGO" -trim +repage -crop 26%x100%+0+0 +repage -trim +repage \
  -resize 900x900\> "$S_SOURCE"

# 32 et 48 px : dilatation moderee, les contreformes de la boucle restent
# ouvertes et la forme se lit entierement.
for T in 32 48; do
  magick "$S_SOURCE" -alpha extract -morphology Dilate Disk:14 \
    -resize $((T * 90 / 100))x$((T * 90 / 100)) \
    -background none -gravity center -extent ${T}x${T} miff:- |
  magick -size ${T}x${T} xc:"$FOND" - -compose over -composite -alpha off -strip \
    "/tmp/sonaa-fav-$T.png"
done
cp /tmp/sonaa-fav-32.png "$B/favicon-32.png"

# 16 px : dilatation FRANCHE. Les contreformes se ferment, et c'est assume :
# a cette taille une forme pleine et reconnaissable vaut mieux qu'un dessin
# fidele et illisible.
magick "$S_SOURCE" -alpha extract -morphology Dilate Disk:22 \
  -resize 14x14 -background none -gravity center -extent 16x16 miff:- |
magick -size 16x16 xc:"$FOND" - -compose over -composite -alpha off -strip \
  "$B/favicon-16.png"

# L'ICO porte les trois tailles : le navigateur choisit celle qui lui va.
magick "$B/favicon-16.png" "$B/favicon-32.png" /tmp/sonaa-fav-48.png "$B/favicon.ico"

# Variante servie sous prefers-color-scheme: dark. Le filet suit le bord du
# disque : un disque noir se perd dans une barre d'onglets sombre, et un
# cadre rectangulaire autour d'une forme ronde se verrait comme une erreur.
# Le disque est circonscrit a l'image : centre (2308,2308), rayon 2308. Le
# filet est pose a 2280 pour rester dans le pixel du bord apres reduction.
# Le S blanc se detache aussi bien d'une barre claire que d'une barre sombre :
# la variante de theme n'a plus d'objet, les deux fichiers reprennent le meme
# dessin pour ne pas casser les liens qui les declarent.
cp "$B/favicon-16.png" "$B/favicon-dark-16.png"
cp "$B/favicon-32.png" "$B/favicon-dark-32.png"

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
