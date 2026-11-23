# SONAA, le contexte courant

Ce fichier dit où en est SONAA aujourd'hui : ce qui est en ligne, ce qui
attend sur une branche, les chantiers ouverts, les arbitrages et le journal
des missions. Claude Code et Antigravity le lisent en ouvrant une session et
le mettent à jour à la fin de chaque mission, dans le même commit que le
travail.

Ce qui est stable vit ailleurs et n'est pas recopié ici : les règles dans
`CLAUDE.md`, les décisions dans `ARCHITECTURE.md` et `docs/adr/`, la
direction artistique dans `DESIGN.md`, les arbitrages de fond en fin de
`HANDOFF.md`.

Dernière mise à jour : 23 novembre 2026, Claude Code.

## État de publication

- En ligne sur `main` : `d263289`, la moisson de la nuit du 23 novembre 2026.
- En attente sur une branche, donc pas encore visible sur sonaa.ca :
  - `claude/stoic-noether-wde808` : la carte des labels par ville et ce
    fichier. Tant qu'elle n'est pas fusionnée, le site montre encore un point
    par label.
  - `claude/check-app-status-01H3QrBXLzaoFc4cruoVJ4mX` : 389 commits du jeu
    SONAA DJ Tycoon, le dernier du 5 septembre 2026, jamais fusionnés.
- Publier se fait uniquement par `npm run publier`, depuis le Mac. Ses
  contrôles `pied` et `mobile` ouvrent Chrome sur le site entier : ils
  échouent dans un conteneur cloud sans réseau complet, et une session cloud
  ne peut donc pas publier.
- Des robots poussent sur `main` chaque jour : moissons de la nuit (artistes
  et labels, 6 h 17 UTC), news (0 h 17 et 12 h 17 UTC), news par marque
  (11 h 47 et 23 h 47 UTC), relevé des vues (4 h UTC). Toujours faire
  `git pull` avant de fusionner une branche.

## Chantiers ouverts

### La carte des labels (`#/labels`)

La règle de Mika, le 23 novembre 2026 : « les adresses exactes on s'en fout,
l'important ce sont les villes et pays ». La carte ne dessine jamais un point
par label.

- Un point par ville, posé au point médian de ses labels, dont la taille suit
  le nombre de labels. À l'échelle du monde, les villes proches se regroupent.
- Le zoom s'arrête à l'échelle d'une agglomération (zoom 8) : on ne voit pas
  les rues.
- Une colonne à droite de la carte (sous la carte sur téléphone) classe les
  villes. Un clic sur une ville ouvre la liste de ses labels, du plus connu
  au moins connu, avec logo, année et morceaux dans l'atlas.
- Le regroupement vit dans `src/lib/villes-des-labels.ts`, le rendu dans
  `src/atlas/CarteLabels.tsx`.
- Les coordonnées de `src/data/labels.json` ne sont pas des adresses : elles
  ont été posées en nuage autour du centre-ville, ou autour de la capitale
  quand la ville manque. Elles ne servent qu'à retrouver la ville et ne
  s'affichent jamais telles quelles.
- 770 labels se répartissent dans 146 villes de 43 pays. Les 670 labels sans
  ville connue sont rangés sous leur pays dans la colonne, sans point sur la
  carte.
- Reste à faire : compléter dans la moisson (`scripts/moissonner-labels.ts`)
  la ville des 670 labels qui n'en ont pas.

## Arbitrages en attente

- Labels sans ville connue : les garder seulement dans la colonne (état
  actuel), ou les poser au centre de leur pays avec un point d'une autre
  forme.
- Clic sur une ville : zoomer à l'échelle de la région (6,5, état actuel), ou
  centrer sans changer le zoom.
- Coordonnées inventées de `labels.json` : les laisser (la carte ne s'en sert
  que pour trouver la ville), ou les remplacer dans les données par le centre
  de la ville.

## Journal des missions

Le plus récent en haut. Une ligne par mission : la date, l'auteur, ce qui a
changé, où en est la publication.

- 23 novembre 2026, Claude Code : création de ce fichier, avec la règle de
  mise à jour dans `CLAUDE.md` et `docs/ANTIGRAVITY.md`. En attente sur
  `claude/stoic-noether-wde808`.
- 23 novembre 2026, Claude Code : carte des labels par ville (`bf536d8`). En
  attente sur `claude/stoic-noether-wde808`.
- 23 novembre 2026 : carte mondiale des maisons mères et 165 labels
  électroniques (`8a74cda`), avec un point par label. Publiée, remplacée par
  la carte par ville dès sa fusion.
- 23 novembre 2026 : l'atlas passe de 219 à 257 styles (`198c263`). Publié.
- 23 novembre 2026 : administration, modération et formulaire d'une soirée
  en affiche (ADR-125, `8983daa`). Publié.
