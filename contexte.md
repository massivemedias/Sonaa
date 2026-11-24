# CONTEXTE : sonaa.ca

Fichier maître des chantiers en cours, chargé par `CLAUDE.md` au début de chaque
conversation. Mis à jour le 23 novembre 2026 (atlas étendu à 257 styles et 2 644 morceaux
vérifiés ; 1 529 labels électroniques dont 128 québécois avec carte des maisons mères ;
678 festivals actifs et séparation clubs/salles ; moisson automatique des salles électro
de Montréal via Squarespace JSON et WordPress REST).

Règle : quand un chantier change ce qui est décrit ici, mettre ce fichier à jour dans le
même commit. Ce qui n'est écrit nulle part est perdu à la conversation suivante. Claude
Code et Antigravity le lisent en ouvrant une session et le mettent à jour à la fin de
chaque mission : l'état de publication, le chantier touché, une ligne de journal.

---

## ÉTAT DE PUBLICATION (24 nov 2026)

- **En ligne sur `main`** : la carte des labels par ville et la liste qui remplace la
  carte au zoom d'une ville (`81ab4f6`, 24 novembre 2026, vérifiée sur sonaa.ca), puis
  la ville de 274 labels de plus, complétée le même jour (voir la section des labels).
- **Si Mika voit encore l'ancienne carte** : la page est en cache (dix minutes chez GitHub
  Pages). Recharger avec `?nocache=1`.
- **En attente depuis le 5 septembre 2026** : `claude/check-app-status-01H3QrBXLzaoFc4cruoVJ4mX`,
  389 commits du jeu SONAA DJ Tycoon, jamais fusionnés.
- **Une session cloud peut publier** depuis `566f1af` : `check:mobile` ne bloque plus sur le
  calendrier quand le build n'a pas les variables Supabase. `check:pied` dépend du réseau
  et peut échouer sur un délai dépassé : le relancer avant de conclure à un vrai défaut.
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
- **Carte des maisons mères par ville** (`src/atlas/CarteLabels.tsx`, `src/atlas/label.css`),
  décrite ci-dessous.

### Carte par ville et liste d'une ville (23 et 24 nov 2026)

Les règles de Mika : « les adresses exactes on s'en fout, l'important ce sont les villes et
pays » (23 nov) ; « dès que nous zoomons pour arriver à cette vue, au lieu de cette vue je
veux juste une liste » (24 nov, devant le nuage de points de Montréal). **La carte ne
dessine jamais un point par label, et ne montre jamais les rues.**

- Un point par ville, posé au point médian de ses labels, dont la taille suit le nombre de
  labels ; à l'échelle du monde, les villes proches se regroupent.
- **Zoomer jusqu'à une ville (zoom 7,5, le maximum) ou la toucher remplace la carte par la
  liste de ses labels**, en colonnes, du plus connu au moins connu, avec logo, année et
  morceaux dans l'atlas. « Retour à la carte » la ramène sur la région de la ville.
- À côté de la carte (dessous sur téléphone), un index classe les villes par nombre de
  labels ; « Montréal & Québec » ouvre directement la liste de Montréal ; le lien « Voir la
  maison mère sur la carte » d'une fiche ouvre la liste de sa ville et y marque le label.
- Regroupement dans `src/lib/villes-des-labels.ts` (avec ses tests). Les noms moissonnés
  sont unifiés (Toronto, Ontario devient Toronto ; Brooklyn devient New York ;
  Francfort-sur-le-Main devient Francfort) ; une région prise pour une ville (coordonnées
  rondes, comme l'Ohio) est rangée sous son pays. **Une ville à moins de 12 km d'une
  ville qui a plus de labels rejoint sa liste** (Neuilly-sur-Seine dans Paris) ; la fiche
  du label garde sa commune.
- **Les coordonnées des labels moissonnés avant le 24 novembre ne sont pas des adresses** :
  elles ont été posées en nuage autour du centre-ville, ou autour de la capitale quand la
  ville manque. Elles ne servent qu'à retrouver la ville et ne s'affichent jamais telles
  quelles. Celles des villes complétées sont le centre de la ville chez Wikidata.
- **1 099 labels dans 224 villes de 46 pays** (Londres 168, Montréal 120, Berlin 77, New
  York 63, Paris 47). Les 409 labels sans ville connue sont rangés sous leur pays dans
  l'index (« Ville non renseignée »), sans point sur la carte ; 21 n'ont aucune
  coordonnée.

### Complétion des villes (24 nov 2026, `npm run completer:villes-labels`)

Mika : « complète les villes des 671 labels ». `scripts/completer-villes-labels.ts` a
trouvé la ville de **274 labels sur 703** (219 par l'adresse de contact Discogs, 40 par la
zone MusicBrainz, 14 par une phrase de présentation, 1 par le siège Wikidata).

- **Ordre des sources** : siège ou lieu de fondation chez Wikidata (P159, P740), adresse
  de contact Discogs (la première adresse d'une fiche), zone MusicBrainz, puis une
  tournure de présentation (« based in Leeds », « basé à Lyon »), jamais un nom cité au
  passage.
- **Une ville n'est retenue que si** c'est une localité GeoNames (cities5000) de plus de
  5 000 habitants dans le pays du label ; un quartier compte pour sa ville (« Hollywood »
  est Los Angeles) ; nom français et anglais et coordonnées viennent de Wikidata (CC0).
  `villeSource` dit d'où vient chaque ville ; la moisson la conserve.
- **Pièges réglés, avec leurs tests** (`scripts/lib/villes-labels.test.ts`) : « York »
  dans « New York », « Springfield, Ohio », « Quebec » qui est la province, un mois
  (« March »), un immeuble (« Sakura Bld. »), un État (« Oregon »), un pays
  (« Greece »), un homonyme lointain (London, Kentucky), un ancien nom (« Northampton »
  pour Allentown), un élément Wikidata parasite (« lsjbot Duisburg »).
- **Les 429 restants n'ont aucune source sûre** : pas d'adresse Discogs, ou une adresse
  sans ville reconnue, ou un nom ambigu. Les relancer ne trouvera rien de plus sans
  nouvelle source ; le cache est dans `.villes-labels-cache/` (ignoré par git).
- **Les sources sont lentes** : Discogs sans jeton (25 requêtes par minute), MusicBrainz
  (une par seconde), et le SPARQL de Wikidata bridé à une requête par minute le 24
  novembre ; une passe complète a pris environ une heure.

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

---

## ARBITRAGES EN ATTENTE

- Les 409 labels sans ville connue : les garder seulement dans l'index (état actuel), ou
  les poser au centre de leur pays avec un point d'une autre forme.
- Coordonnées inventées des labels moissonnés avant le 24 novembre : les laisser (la carte
  ne s'en sert que pour trouver la ville), ou les remplacer par le centre de la ville.
- Nouveaux labels : lancer `npm run completer:villes-labels` à chaque moisson de nuit, ou
  seulement à la main.

---

## JOURNAL DES MISSIONS

Le plus récent en haut. Une ligne par mission : la date, l'auteur, ce qui a changé, où en
est la publication.

- 24 nov 2026, Claude Code : ville complétée pour 274 labels sur 703 sans ville
  (`scripts/completer-villes-labels.ts`), carte à 224 villes ; proches banlieues jointes
  à leur grande ville sur la carte. Publié.
- 24 nov 2026, Claude Code : ce fichier passe la carte par ville en « publiée », vérifiée
  en ligne.
- 24 nov 2026, Claude Code : zoomer jusqu'à une ville ou la toucher remplace la carte par
  la liste de ses labels (`e88ea82`). Publié avec `81ab4f6`.
- 24 nov 2026 : `check:mobile` passe sans les variables Supabase (`566f1af`), ce qui permet
  de publier depuis une session cloud. Publié.
- 23 nov 2026 : 56 petits labels électroniques québécois, dont SOAME Records (`0d4d685`).
  Publié.
- 23 nov 2026, Claude Code : carte des labels par ville (`bf536d8`). Publiée avec
  `81ab4f6`.
- 23 nov 2026 : création de ce fichier (`0f89230`). Publié.
- 23 nov 2026 : carte mondiale des maisons mères, un point par label (`8a74cda`).
  Remplacée par la carte par ville.
