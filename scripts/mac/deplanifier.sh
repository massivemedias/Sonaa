#!/bin/bash
# RETIRER LA MOISSON DU MAC (ADR-119). Usage : npm run deplanifier:mac
# L'agent launchd est arrete et efface. La cle reste dans le trousseau ; pour
# l'effacer aussi : security delete-generic-password -s sonaa-supabase-service

set -u
ETIQUETTE="ca.sonaa.moissons"
launchctl bootout "gui/$(id -u)/$ETIQUETTE" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/$ETIQUETTE.plist"
echo "Moisson du Mac retiree."
