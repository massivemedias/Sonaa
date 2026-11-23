# CONTEXTE : sonaa.ca

Fichier maître des chantiers en cours, chargé par `CLAUDE.md` au début de chaque
conversation. Mis à jour le 23 novembre 2026 (atlas étendu à 257 styles et 2 644 morceaux
vérifiés ; 1 529 labels électroniques dont 128 québécois avec carte des maisons mères ;
678 festivals actifs et séparation clubs/salles ; moisson automatique des salles électro
de Montréal via Squarespace JSON et WordPress REST).

Règle : quand un chantier change ce qui est décrit ici, mettre ce fichier à jour dans le
même commit. Ce qui n'est écrit nulle part est perdu à la conversation suivante.

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

## LABELS ÉLECTRONIQUES ET CARTE DES MAISONS MÈRES (23 nov 2026)

- **1 529 labels 100 % musique électronique** publiés sur `sonaa.ca/labels/` (`src/data/labels.json`,
  `src/data/labels-index.json`, `scripts/moissonner-labels.ts`), dont **128 labels québécois**
  (`q: 1`, dont **VRSTL Records**, **SOAME Records**, **Lazy Days Recordings**, **AlpaKa MuziK**,
  **Tech Safari Records**, **SPF Infini**, **Voyage Funktastique**, **Kohlenstoff Records**,
  **Moderna Records**, **Slugz Music**, **OCTOV**, **Detuned Transmissions**, **Epsilonlab**,
  **Complot**, **Default Recordings**, **idioms**, **wave logs**, **Gravecult Records**,
  **Monkey Dub Recording**, **Quantum Digits Recordings**, **Alterflow** à Québec et
  **Tour de Bras** à Rimouski).
- **Correction de `NAFF`** (`naff`) : maison mère replacée de Toronto à Montréal, Québec.
- **222 labels généralistes / majors** masqués par le drapeau réversible `horsElectronique: true`
  (aucune suppression).
- **Carte interactive mondiale** (`src/atlas/CarteLabels.tsx`) affichant la maison mère de
  chaque label, alignée sur la charte affiche de club d'ADR-125 (`src/atlas/label.css`).

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
- **Ticketmaster (20 villes)**, **Lepointdevente (Grand Montréal)** et **Salles de Montréal (`scripts/ingerer-salles-mtl.ts`)** : chaque nuit à 1 h 17 via `.github/workflows/moissons.yml`. L'adaptateur `salles-mtl` lit directement les flux JSON publics (HTTP 200 sans CAPTCHA) de **Newspeak**, **New City Gas** (WordPress REST `ncgevent`), **Ausgang Plaza**, **Bar Le Ritz PDB** et **Théâtre Fairmount**, filtre les soirées électroniques pour les salles généralistes, et verse en idempotent dans Supabase `soirees_manuelles` (`source = 'salles-mtl'`).
- **Eventbrite**, **Shotgun (5 villes françaises)** et **Salles de Montréal (relais du matin)** : chaque matin à 6 h 43 sur le Mac de Mika via `scripts/mac/planifier.sh` (`launchd`, ADR-119) car Eventbrite et Shotgun bloquent les IP GitHub Actions.
- **Facebook** : passe manuelle guidée dans `docs/ANTIGRAVITY.md` (aucune API publique).

### Angles morts restants sur les 33 salles/clubs électro de Montréal
Audit réalisé suite à l'oubli de la soirée techno **GUAIYARU + CHINAMITO & DEIKER MORA** du
samedi 28 novembre 2026 au **Blue Room** (3956 boul. Saint-Laurent, 3e étage), publiée sur
Instagram `@theblueroommtl` avant Resident Advisor (`ra.co/clubs/290582`) :

1. **Tixr (`tixr.com/groups/...`)** : bloqué par un défi anti-bot Cloudflare (`HTTP 403`), donc non contourné. **New City Gas** est déjà couvert autrement via son API WordPress REST ; `Stereo`, `StereoBar`, `SAT`, `La Voûte`, `Soubois` et `Yoko Luna` restent suivis via Resident Advisor et Lepointdevente lorsqu'ils y publient.
2. **Instagram-first** : 8 lieux underground publient leurs flyers d'abord ou uniquement sur
   Instagram (`@theblueroommtl`, `@systeme.mtl`, `@sanssoleilbar`, `@cabaretberlinmtl`,
   `@vinodiscobar`, `@nwhr.mtl`, `@esc.mtl`, `@lesalondaome`).

Prochaine étape optionnelle : stocker les comptes `@instagram` officiels sur chaque lieu de
`lieux-et-festivals.ts` pour afficher un lien direct vers leur calendrier Instagram sur
chaque fiche club/salle.

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
