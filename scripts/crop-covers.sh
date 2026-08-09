#!/usr/bin/env bash
# Recadrage carre des pochettes telechargees. Idempotent : ne touche que ce qui
# n'est pas deja en 400x400.
#
# Les vignettes YouTube 4:3 (hqdefault 480x360, sddefault 640x480) portent des
# bandes noires qu'il faut retirer AVANT le carre, sinon le carre est a moitie
# noir. Tout le reste (16:9, 500x500 Deezer, 600x600 iTunes) se recadre depuis
# le CENTRE, jamais depuis le haut.
set -euo pipefail
cd "$(dirname "$0")/../public/covers"
n43=0; nsq=0; skip=0
for f in *.jpg; do
  dim=$(magick identify -format '%wx%h' "$f")
  case "$dim" in
    400x400) skip=$((skip+1)); continue ;;
    480x360) magick "$f" -crop 480x270+0+45 +repage -resize 400x400^ -gravity center -extent 400x400 -quality 78 -strip "$f"; n43=$((n43+1)) ;;
    640x480) magick "$f" -crop 640x360+0+60 +repage -resize 400x400^ -gravity center -extent 400x400 -quality 78 -strip "$f"; n43=$((n43+1)) ;;
    *) magick "$f" -resize 400x400^ -gravity center -extent 400x400 -quality 78 -strip "$f"; nsq=$((nsq+1)) ;;
  esac
done
echo "$n43 vignettes 4:3 debandees, $nsq recadrees au centre, $skip deja en 400x400"
