#!/bin/bash
# LA MOISSON DU MAC : Eventbrite et Shotgun, chaque matin (ADR-119).
#
# Ces deux sources refusent les machines de GitHub (Eventbrite rend 405
# depuis la fin d'octobre 2026, Shotgun arrete tout au controle Vercel depuis
# septembre) mais laissent passer une adresse de maison. Ce script tourne
# donc sur le Mac de Mika, lance par launchd, et ecrit dans Supabase comme la
# moisson de la nuit.
#
# Installe par : npm run planifier:mac
# Lance a la main : bash scripts/mac/moissonner.sh
# Journal : ~/Library/Logs/sonaa-moissons.log

set -u

DEPOT="$(cd "$(dirname "$0")/../.." && pwd)"
JOURNAL="$HOME/Library/Logs/sonaa-moissons.log"
mkdir -p "$(dirname "$JOURNAL")"
exec >>"$JOURNAL" 2>&1

echo ""
echo "=== $(date '+%Y-%m-%d %H:%M') ==="
cd "$DEPOT" || { echo "Depot introuvable : $DEPOT"; exit 1; }

# LA CLE DE SERVICE VIT DANS LE TROUSSEAU, jamais dans un fichier du depot.
# Elle n'existe que le temps de la moisson, dans l'environnement du script.
CLE="$(security find-generic-password -s sonaa-supabase-service -w 2>/dev/null)"
if [ -z "$CLE" ]; then
  echo "Cle absente du trousseau : relancer npm run planifier:mac."
  exit 1
fi
export SUPABASE_SERVICE_ROLE_KEY="$CLE"
unset CLE

# A JOUR, MAIS SANS RIEN CASSER. On ne tire main que si c'est la branche
# ouverte et que rien n'est en cours : un travail en cours n'est jamais
# touche, la moisson tourne alors avec la version locale.
if [ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] && git diff --quiet && git diff --cached --quiet; then
  AVANT="$(git rev-parse HEAD:package-lock.json 2>/dev/null)"
  # Sans terminal, git ne doit rien demander : il echoue et on continue.
  GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND="ssh -o BatchMode=yes" git pull --ff-only -q origin main \
    || echo "main n'a pas pu avancer, version locale gardee."
  if [ "$AVANT" != "$(git rev-parse HEAD:package-lock.json 2>/dev/null)" ] || [ ! -d node_modules ]; then
    npm ci --silent || echo "npm ci en echec."
  fi
else
  echo "Travail en cours dans le depot : version locale gardee."
fi

echo "--- Eventbrite"
npx tsx scripts/ingerer-eventbrite.ts --toutes --pages=4 || echo "Eventbrite en echec."

echo "--- Shotgun"
npx tsx scripts/ingerer-shotgun.ts || echo "Shotgun en echec."

echo "=== fini a $(date '+%H:%M') ==="
