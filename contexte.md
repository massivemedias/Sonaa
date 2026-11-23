# CONTEXTE : sonaa.ca

Fichier maître des chantiers en cours, chargé par `CLAUDE.md` au début de chaque
conversation. Mis à jour le 23 novembre 2026 (atlas étendu à 257 styles et 2 644 morceaux
vérifiés ; 1 454 labels électroniques avec carte des maisons mères ; 678 festivals actifs
et séparation clubs/salles ; cartographie des 33 calendriers et comptes Instagram des
salles électro de Montréal).

Règle : quand un chantier change ce qui est décrit ici, mettre ce fichier à jour dans le
même commit. Ce qui n'est écrit nulle part est perdu à la conversation suivante. Claude
Code et Antigravity le lisent en ouvrant une session et le mettent à jour à la fin de
chaque mission : l'état de publication, le chantier touché, une ligne de journal.

---

## ÉTAT DE PUBLICATION (23 nov 2026, fin de journée)

- **En ligne sur `main`** : `0f89230`, la création de ce fichier. Vérifié dans le bundle
  servi par sonaa.ca : la page des labels montre encore **l'ancienne carte, un point par
  label**.
- **En attente sur `claude/stoic-noether-wde808`** : la carte des labels par ville (voir
  la section des labels) et ce fichier mis à jour. La branche contient `main` : sa
  fusion est une avance rapide, à publier depuis le Mac.
- **En attente depuis le 5 septembre 2026** : `claude/check-app-status-01H3QrBXLzaoFc4cruoVJ4mX`,
  389 commits du jeu SONAA DJ Tycoon, jamais fusionnés.
- **Une session cloud ne peut pas publier** tant que son environnement n'a pas
  `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` : sans eux, le site construit n'a pas de
  base, le calendrier n'affiche pas sa bannière et `check:mobile` refuse. `check:pied`
  dépend aussi du réseau et peut échouer sur un délai dépassé : le relancer avant de
  conclure à un vrai défaut.
- **Des robots poussent sur `main` chaque jour** : moissons de la nuit (6 h 17 UTC), news
  (0 h 17 et 12 h 17 UTC), news par marque (11 h 47 et 23 h 47 UTC), relevé des vues (4 h
  UTC). Toujours faire `git pull` avant de fusionner une branche.

---

## ATLAS DES STYLES (23 nov 2026, commit `198c263`)

Revue complète des 14 familles demandée par Mika : l'atlas passe de **219 à 257 styles**
et **2 644 morceaux YouTube vérifiés** (0 vidéo morte, 0 style sous 3 morceaux, minimum 5
morceaux par style).

- **38 styles ajoutés** dans `src/data/corpus.json` (écrit via `scripts/lib/corpus-store.ts`),
  avec leurs cours FR/EN (`src/data/cours.json`, `cours-en.json`, `cours-ids.json`,
  `motifs-cours.json`), textes anglais (`src/data/textes-en.json`) et motifs audio
  (`src/data/rythmes.json`, `src/atlas/rythme/instruments.ts`, `echantillons.ts`) :
  - les **6 trous Discogs** documentés dans `src/lib/correspondance-styles.ts` (`TROUS` est
    maintenant vide) : `Synthwave`, `Eurodance`, `Vaporwave`, `Italodance`, `Hands Up`,
    `Eurobeat` ;
  - **32 autres styles** : `Italo Body Music`, `Organic House`, `Afro Tech`, `Big Room House`,
    `Ballroom`, `Guaracha`, `Hardgroove`, `Free Tekno`, `Neo-Rave`, `Slow House`, `Neo-Trance`,
    `Witch House`, `Minimalisme`, `Digital Dancehall`, `Autonomic`, `Sambass`, `Glitch Hop`,
    `Tearout`, `Colour Bass`, `Wave`, `Drift Phonk`, `Kuduro`, `Moombahton`, `Baile Funk`,
    `Darksynth`, `Hyperpop`, `Rawstyle`, `Industrial Hardcore`, `Singeli`, `Hauntology`,
    `Dreampunk`, `Digital Cumbia`.
- **Réparations sur les 219 fiches existantes** : `psycore`, `hitech`, `twilightpsy` et
  `psytech` montés à 6 morceaux chacun (les 16 kicks/basses mesurés d'ADR-124 restent
  intacts), 4 vidéos YouTube mortes remplacées, et labels historiques/actuels complétés
  sur 32 fiches.
- **Comptes dynamiques** : `scripts/prerender.ts` et `src/atlas/AProposPage.tsx` calculent
  le nombre de styles depuis `STRUCTURES` ; `src/langue/langue.ts` affiche 257.

---

## LABELS ÉLECTRONIQUES ET CARTE DES MAISONS MÈRES (23 nov 2026, commit `8a74cda`)

- **1 454 labels 100 % musique électronique** publiés sur `sonaa.ca/labels/` (`src/data/labels.json`,
  `src/data/labels-index.json`, `scripts/moissonner-labels.ts`), dont **1 441 géolocalisés**
  dans 49 pays et **72 labels québécois** (`q: 1`, dont **VRSTL Records** basé à Montréal).
- **222 labels généralistes / majors** masqués par le drapeau réversible `horsElectronique: true`
  (aucune suppression).
- **Carte interactive mondiale** (`src/atlas/CarteLabels.tsx`) affichant la maison mère de
  chaque label, alignée sur la charte affiche de club d'ADR-125 (`src/atlas/label.css`).
  En ligne, elle pose encore un point par label ; la carte par ville ci-dessous la remplace
  dès sa publication.

### Carte par ville (commit `bf536d8`, en attente sur `claude/stoic-noether-wde808`)

La règle de Mika, le 23 novembre 2026 : « les adresses exactes on s'en fout, l'important ce
sont les villes et pays ». **La carte ne dessine jamais un point par label.**

- Un point par ville, posé au point médian de ses labels, dont la taille suit le nombre de
  labels ; à l'échelle du monde, les villes proches se regroupent.
- Le zoom s'arrête à l'échelle d'une agglomération (zoom 8) : on ne voit pas les rues.
- Une colonne à droite de la carte (sous la carte sur téléphone) classe les villes ; un
  clic sur une ville ouvre la liste de ses labels, du plus connu au moins connu, avec logo,
  année et morceaux dans l'atlas. « Montréal & Québec » ouvre directement Montréal.
- Regroupement dans `src/lib/villes-des-labels.ts` (avec ses tests), rendu dans
  `src/atlas/CarteLabels.tsx`. Les noms moissonnés sont unifiés (Toronto, Ontario devient
  Toronto ; Brooklyn devient New York ; Francfort-sur-le-Main devient Francfort).
- **Les coordonnées de `labels.json` ne sont pas des adresses** : elles ont été posées en
  nuage autour du centre-ville, ou autour de la capitale quand la ville manque. Elles ne
  servent qu'à retrouver la ville et ne s'affichent jamais telles quelles.
- **770 labels dans 146 villes de 43 pays.** Les 670 labels sans ville connue sont rangés
  sous leur pays dans la colonne (« Ville non renseignée »), sans point sur la carte.
- À faire : compléter dans `scripts/moissonner-labels.ts` la ville des 670 labels qui n'en
  ont pas.
- **À faire (demandé par Mika, interrompu par un quota 429)** :
  - ajouter les petits micro-labels québécois manquants, à commencer par **SOAME Records**
    (`soamerecords.bandcamp.com`, minimal techno / microhouse / électroacoustique à Montréal,
    Youg, Pheek, Simon Chioini, Maraud), plus **Lazy Days Recordings**, **SPF Infini**,
    **Fixture Records**, **Tona Serenad**, **Techsafari Records**, **Slugz Music**,
    **Voyage Funktastique**, **Kohlenstoff Records**, **Moderna Records**, **Daps Records**,
    **Lillerne Tapes**, **Audio Research**, etc. ;
  - corriger la ville de `NAFF` (`naff`) actuellement indiquée à Toronto au lieu de Montréal.

---

## ATLAS CLUBS, SALLES ET FESTIVALS (23 nov 2026, commit `672bc23`)

- **678 festivals électroniques actifs** dans 75 pays (dont **65 au Canada**) dans
  `src/data/lieux-et-festivals.ts` ; **67 festivals disparus** (dont Eclipse Festival)
  masqués de l'affichage et de la carte via le drapeau réversible `inactif: true`.
- **Séparation clubs / salles** : les clubs et bars musicaux (`estSalle` absent) sont mis en
  avant ; les salles à louer / salles de spectacle généralistes (`estSalle: true`) sont
  séparées et affichées avec leurs prochains événements.
- **Identité visuelle** : palette inspirée de `breakbeat.co.uk`, police **Google Sans Flex**,
  et esthétique affiche de club (ADR-125, aucun crochet sur bord gauche, aucune pilule IA).

---

## CALENDRIER DES SOIRÉES ET MOISSONS AUTOMATIQUES (23 nov 2026)

### Ce qui tourne automatiquement aujourd'hui
- **Resident Advisor** : lu en direct par le Worker Cloudflare `sonaa-sets.massivemedias.workers.dev`.
- **Ticketmaster (20 villes)** et **Lepointdevente (Grand Montréal)** : chaque nuit à 1 h 17
  via `.github/workflows/moissons.yml`.
- **Eventbrite** et **Shotgun (5 villes françaises)** : chaque matin à 6 h 43 sur le Mac de
  Mika via `scripts/mac/planifier.sh` (`launchd`, ADR-119) car ces plateformes bloquent
  les IP GitHub Actions.
- **Facebook** : passe manuelle guidée dans `docs/ANTIGRAVITY.md` (aucune API publique).

### Angles morts identifiés sur les 33 salles/clubs électro de Montréal (à brancher)
Audit réalisé suite à l'oubli de la soirée techno **GUAIYARU + CHINAMITO & DEIKER MORA** du
samedi 28 novembre 2026 au **Blue Room** (3956 boul. Saint-Laurent, 3e étage), publiée sur
Instagram `@theblueroommtl` avant Resident Advisor (`ra.co/clubs/290582`) :

1. **Tixr (`tixr.com/groups/...`)** : non branché. Couvre **7 clubs majeurs** : `Stereo`,
   `StereoBar`, `SAT`, `New City Gas`, `La Voûte`, `Soubois`, `Yoko Luna`.
2. **Squarespace JSON (`?format=json`) / WordPress REST** : non branchés. Flux JSON directs
   HTTP 200 sans CAPTCHA sur `Newspeak` (`newspeakmtl.com/evenements?format=json`),
   `Bar Le Ritz PDB`, `Théâtre Fairmount`, `Ausgang Plaza` (+ DICE) et `New City Gas`.
3. **Instagram-first** : 8 lieux underground publient leurs flyers d'abord ou uniquement sur
   Instagram (`@theblueroommtl`, `@systeme.mtl`, `@sanssoleilbar`, `@cabaretberlinmtl`,
   `@vinodiscobar`, `@nwhr.mtl`, `@esc.mtl`, `@lesalondaome`).

Prochaine étape calendario : coder et planifier les adaptateurs **Tixr** et **Squarespace JSON
/ WordPress** dans `.github/workflows/moissons.yml` (et `scripts/mac/` si nécessaire), et
stocker les comptes `@instagram` officiels sur chaque lieu de `lieux-et-festivals.ts`.

---

## RAPPELS DE PUBLICATION ET GARDE-FOUS

- **Publier uniquement via `npm run publier`** (21 contrôles bloquants : `tsc`, `validate:data`,
  `css`, `crochets`, `constantes`, `exports`, `tirets`, `plafond`, `matcher`, `labels`,
  `writes`, `nature`, `superposition`, `genres RA`, `accents`, `langue`, `vitest`, `build` +
  `prerender`, `secrets`, `pied`, `mobile`).
- **ADR-050** : aucun morceau de Maudite Machine dans `src/data/corpus.json` (son label
  `VRSTL Records` est dans l'annuaire `labels.json` uniquement).
- **ADR-124** : les 16 genres de la famille `psy` ont des kicks/basses WAV mesurés dans
  `public/sons/` et vérifiés par `src/atlas/rythme/echantillons.test.ts`.
- **Zéro tiret cadratin (`U+2014`) ni demi-cadratin (`U+2013`)** partout dans le dépôt.

---

## ARBITRAGES EN ATTENTE

- Labels sans ville connue : les garder seulement dans la colonne (état actuel), ou les
  poser au centre de leur pays avec un point d'une autre forme.
- Clic sur une ville de la carte : zoomer à l'échelle de la région (6,5, état actuel), ou
  centrer sans changer le zoom.
- Coordonnées inventées de `labels.json` : les laisser (la carte ne s'en sert que pour
  trouver la ville), ou les remplacer dans les données par le centre de la ville.
- Sessions cloud : ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` aux variables de
  l'environnement cloud pour qu'elles puissent publier, ou publier toujours depuis le Mac.

---

## JOURNAL DES MISSIONS

Le plus récent en haut. Une ligne par mission : la date, l'auteur, ce qui a changé, où en
est la publication.

- 23 nov 2026, Claude Code : `CONTEXTE.md` de la branche fondu dans ce fichier, règle de
  mise à jour ajoutée dans `CLAUDE.md` et `docs/ANTIGRAVITY.md`. En attente sur
  `claude/stoic-noether-wde808`.
- 23 nov 2026 : création de ce fichier (`0f89230`). Publié.
- 23 nov 2026, Claude Code : publication de la carte par ville demandée par Mika, refusée
  par `npm run publier` dans le conteneur cloud (variables Supabase absentes). Rien n'a
  été poussé sur `main`.
- 23 nov 2026, Claude Code : carte des labels par ville (`bf536d8`). En attente sur
  `claude/stoic-noether-wde808`.
- 23 nov 2026 : carte mondiale des maisons mères et 165 labels électroniques (`8a74cda`),
  un point par label. Publié.
- 23 nov 2026 : atlas étendu de 219 à 257 styles (`198c263`). Publié.
