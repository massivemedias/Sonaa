# SONAA

Atlas généalogique des musiques électroniques. Un graphe orienté acyclique où
chaque genre est un noeud relié à ses ancêtres et à ses descendants, navigable
en 3D, et écoutable par le lecteur officiel YouTube.

Publié sur https://sonaa.ca

La racine ouvre l'atlas. `#/index` ouvre la vue liste accessible, qui porte le
même contenu sans WebGL.

## Deux documents à lire avant de toucher au code

- [DESIGN.md](DESIGN.md), la direction artistique. La règle qui gouverne tout :
  une épaisseur, une teinte, une longueur ou une durée encode une donnée, ou
  n'existe pas.
- [ARCHITECTURE.md](ARCHITECTURE.md), les décisions techniques au format ADR.

Et [CORPUS.md](CORPUS.md), l'arbre des genres, à relire filiation par filiation.

## Lancer en local

```
npm install
npm run dev
```

Aucune configuration, aucun fichier `.env`, aucune clé pour faire tourner le
site. Les scripts de données appellent des services tiers, mais seulement au
build et jamais depuis le navigateur d'un visiteur.

## Scripts

| Script | Effet |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | contrôle TypeScript puis build de production dans `dist/` |
| `npm run preview` | sert le build de production en local |
| `npm run validate:data` | valide le corpus et affiche la couverture par genre |
| `npm run import:tracks` | injecte les morceaux sourcés à la main de `tracks-canon.md` |
| `npm run fetch:covers` | pochettes iTunes, puis téléchargement local |
| `npm run check:matcher` | garde-fou du matcher, dix cas réels, tourne en CI |
| `npm run check:labels` | garde-fou des labels : le nom seul, rien d'autre, tourne en CI |
| `npm run fetch:tracks` | sorties récentes par YouTube Data API, demande une clé |

## Le corpus

`src/data/corpus.json`, validé par `src/data/schema.ts`. Sept familles, et pour
chaque genre : toutes ses ascendances, celle qui le positionne dans l'arbre, un
intervalle de BPM, une note qui dit ce que disent les sources, et deux listes de
morceaux.

**Deux listes par genre.** `essentiel` porte les fondateurs du genre, toutes
époques : c'est ce qu'on sait remplir sans clé. `actuel` porte les sorties
récentes triées par écoutes, ce qui demande la YouTube Data API. L'onglet Actuel
ne s'affiche que si la liste a du contenu.

**Aucun identifiant YouTube inventé, jamais.** Un identifiant non vérifié n'a
pas le droit d'exister dans le fichier. La vérification passe par l'endpoint
oEmbed public, sans clé : un 200 signifie que la vidéo existe **et** qu'elle est
embarquable, ce qui est exactement la condition de l'iframe.

**Le matcher fait autorité**, dans `scripts/lib/match.ts`. Le titre ET l'artiste
doivent correspondre. Ne pas assouplir : une version plus permissive a laissé
passer 41 faux sur 202 morceaux, un sur cinq, en général le bon artiste avec le
mauvais morceau.

### Injecter des morceaux sourcés à la main

La recherche automatique plafonne sur les scènes de niche : suomisaundi, cosmic
disco, indie dance, dark disco, nitzhonot, techno body music. Les morceaux
existent, ils ne sont simplement pas sur YouTube sous le nom qu'on cherche.

Écrire `tracks-canon.md` à la racine, un tableau markdown par genre. Le titre de
section porte l'identifiant du genre entre accents graves, tel qu'il figure dans
`corpus.json`. Le format est reproduit dans
[tracks-canon.example.md](tracks-canon.example.md), et
`npm run validate:data` nomme en fin de rapport les genres à compléter.

```markdown
## `suomisaundi`

| artiste       | titre       | annee | role      |
|---------------|-------------|-------|-----------|
| Texas Faggott | Konnichi Wa | 1999  | fondateur |
| Haltya        | Hoi Hoi     | 2001  | essentiel |
```

Les colonnes sont repérées par leur en-tête, pas par leur position, et l'ordre
est libre. `annee` et `role` sont facultatifs. `role` est documentaire, sauf la
valeur `actuel` qui range le morceau dans l'onglet Actuel.

Puis :

```
npm run import:tracks -- --dry-run
npm run import:tracks
npm run import:tracks -- --only=suomisaundi,darkdisco
```

Le script ne fait jamais confiance au fichier pour un identifiant : il lit des
noms, cherche lui-même, et n'écrit que ce qui passe le matcher. Un morceau déjà
présent dans le corpus n'est jamais réécrit, on ajoute sans remplacer.

Il produit `tracks-canon-report.md`, qui liste chaque ligne non résolue avec les
candidats refusés et leurs deux scores. Un score de titre bas veut dire que la
vidéo trouvée est un autre morceau ; un score d'artiste bas veut dire que c'est
une reprise ou une autre version. Cela suffit à corriger l'orthographe sans
deviner.

### Les pochettes

Quatre niveaux de repli, dans cet ordre : pochette Deezer si l'artiste **et** le
titre correspondent, sinon pochette iTunes au même critère, sinon vignette de la
vidéo recadrée en carré depuis le centre, sinon pochette dessinée en SVG avec la
teinte de la famille et les initiales de l'artiste. Deezer passe en premier
parce qu'iTunes limite par adresse IP sur des heures et a coupé trois campagnes
de suite.

`npm run fetch:covers` cherche puis télécharge dans `public/covers/`. Les images
sont servies par le site : une balise `img` vers un domaine tiers serait un
appel tiers au runtime, et il n'y en a aucun hors l'iframe YouTube.

iTunes limite par adresse IP sur une fenêtre longue et répond 403 pendant des
heures. Le script recule exponentiellement jusqu'à quatre minutes de pause et
est fait pour tourner en tâche de fond.

Il écrit le corpus après chaque trouvaille, donc il est interruptible sans rien
perdre. Cela n'a pas toujours été le cas : une première version n'écrivait qu'à
la fin, et un arrêt en cours de route a coûté 109 pochettes déjà trouvées.

Modes :

| Option | Effet |
|---|---|
| aucune | ne cherche que les morceaux sans pochette iTunes |
| `-- --only-missing` | idem, explicite, à relancer tant que le quota bloque |
| `-- --force` | recherche tout à nouveau, sans jamais dégrader une pochette existante |
| `-- --covers-only` | pas de recherche, seulement le téléchargement local |

Après téléchargement, recadrer avec `npm run crop:covers`. Le script est
idempotent et sait que les vignettes 4:3 portent des bandes noires à retirer
**avant** le carré, sinon le carré est à moitié noir.

## Contraintes du projet

- Aucun secret dans le dépôt, aucun dans le bundle. `YOUTUBE_API_KEY` est un
  secret d'intégration continue, lu au build seulement.
- Aucune librairie de graphe tierce : le moteur de layout est écrit ici
  (ADR-002). React Flow, Cytoscape et vis-network sont exclus.
- Base `/` partout. Seule exception, les métadonnées Open Graph, dont la
  spécification exige une URL absolue.
- Au runtime, le seul appel tiers est l'iframe YouTube, et seulement à la
  lecture.
- Pas de tiret cadratin dans le texte d'interface français.

## Règle d'affichage des sources

Aucune source documentaire particulière n'est nommée dans l'interface : ni dans
les labels, ni dans les fiches, ni dans les notes. La page `#/credits` cite des
catégories, encyclopédies, bases de données discographiques, cartographies
historiques, jamais un guide en particulier. Les notes de `corpus.json` sont
affichées dans les fiches et suivent la même règle.

## Déploiement

Chaque push sur `main` déclenche `.github/workflows/deploy.yml` : `npm ci`,
`npm run validate:data`, `npm run build`, contrôle anti-secret sur `dist/`, puis
publication sur GitHub Pages. Le build échoue si le contrôle remonte quoi que ce
soit, ou si le corpus est invalide.
