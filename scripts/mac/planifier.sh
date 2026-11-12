#!/bin/bash
# PLANIFIER LA MOISSON DU MAC (ADR-119). Usage : npm run planifier:mac
#
# 1. Range la cle service_role de Supabase dans le trousseau de macOS, une
#    seule fois. Elle se colle a l'invite et ne s'affiche pas.
# 2. Ecrit l'agent launchd ~/Library/LaunchAgents/ca.sonaa.moissons.plist,
#    qui lance scripts/mac/moissonner.sh chaque matin a 6 h 43. Un Mac en
#    veille a cette heure-la le lance a son reveil.
# 3. Le charge, et lance une premiere moisson tout de suite.
#
# Pour tout retirer : npm run deplanifier:mac

set -euo pipefail

if [ "$(uname)" != "Darwin" ]; then
  echo "Ce script est pour macOS."
  exit 1
fi

DEPOT="$(cd "$(dirname "$0")/../.." && pwd)"
ETIQUETTE="ca.sonaa.moissons"
AGENT="$HOME/Library/LaunchAgents/$ETIQUETTE.plist"
NODE="$(command -v node || true)"

if [ -z "$NODE" ]; then
  echo "Node introuvable dans ce terminal : installer Node 22, puis relancer."
  exit 1
fi
if [ ! -d "/Applications/Google Chrome.app" ]; then
  echo "Google Chrome est absent de /Applications : Shotgun en a besoin."
  exit 1
fi

# 1. La cle, une seule fois.
if security find-generic-password -s sonaa-supabase-service >/dev/null 2>&1; then
  echo "Cle deja dans le trousseau."
else
  echo "Colle la cle service_role de Supabase (Project Settings, API Keys),"
  echo "puis Entree, deux fois. Elle ne s'affiche pas."
  security add-generic-password -a "$USER" -s sonaa-supabase-service -l "SONAA, cle service Supabase" -w
fi

# 2. L'agent launchd. Le PATH est celui de ce terminal : launchd n'en donne
#    presque aucun, et npx doit trouver le Node qui a installe le depot.
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
CHEMIN="$(dirname "$NODE"):/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
cat >"$AGENT" <<FIN
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$ETIQUETTE</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$DEPOT/scripts/mac/moissonner.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$CHEMIN</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>6</integer>
    <key>Minute</key>
    <integer>43</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/sonaa-moissons.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/sonaa-moissons.log</string>
</dict>
</plist>
FIN

# 3. Le charger (en remplacant une version precedente) et lancer une moisson.
launchctl bootout "gui/$(id -u)/$ETIQUETTE" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$AGENT"
launchctl kickstart "gui/$(id -u)/$ETIQUETTE"

echo ""
echo "Planifie : chaque matin a 6 h 43, Eventbrite (20 villes) et Shotgun (5 villes)."
echo "Premiere moisson lancee. Suivre : tail -f ~/Library/Logs/sonaa-moissons.log"
