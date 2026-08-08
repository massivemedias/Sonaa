# SONAA, décisions d'architecture

Format ADR court. Chaque décision : contexte, décision, conséquences.
Statut global : proposition, en attente de validation. Aucun code écrit.

---

## ADR-001 : Le layout est calculé au build, jamais au chargement

**Contexte.** 180 noeuds, un ordonnancement de Sugiyama avec 8 à 12 passes puis jusqu'à
300 itérations de relaxation. C'est de l'ordre de la seconde de calcul, sur le thread
principal, avant le premier pixel.

**Décision.** `scripts/build-index.ts` exécute le moteur de layout et sérialise les
positions dans `layout.json`. Le runtime charge des coordonnées, il ne les calcule pas.
Le moteur ne tourne à l'exécution que si un filtre modifie le sous-graphe visible, et
alors uniquement dans un Web Worker.

**Conséquences.** Le premier rendu est immédiat. Le layout devient testable par
comparaison exacte : même entrée, mêmes coordonnées, sinon le test échoue. En revanche
toute modification des données impose de relancer le build, ce qui doit être câblé dans
le script `dev` pour ne pas produire de positions périmées en développement.

---

## ADR-002 : Un layout maison, aucune librairie de graphes

**Contexte.** react-flow, cytoscape et vis-network sont interdits par le brief, et à
raison : leur rendu est identifiable au premier coup d'oeil. Mais il y a une raison plus
forte.

**Décision.** Moteur dédié dans `src/graph/layout/`. Y est contraint : `y = timeScale(year)`.
Seul X est résolu, par barycentre pondéré des parents puis relaxation avec répulsion
intra-bande et biais de couloir par famille.

**Conséquences.** Aucune librairie ne sait faire ça, parce qu'aucune n'accepte un axe
déjà contraint : elles veulent placer les deux dimensions. Le coût est un moteur à écrire
et à tester nous-mêmes. En contrepartie, l'axe temporel est exact plutôt qu'approximé,
ce qui est la promesse même du produit.

---

## ADR-003 : Le noeud est un segment, pas un point

**Contexte.** Voir DESIGN.md section 2. Un genre occupe `[yearStart, yearEnd]` sur l'axe Y.

**Décision.** Le layout produit pour chaque genre `{ x, yTop, yBottom, yPeak }` et non un
simple `{ x, y }`. Les arêtes s'ancrent au `yTop` de l'enfant et à la hauteur
`timeScale(enfant.yearStart)` sur le corps du parent.

**Conséquences.** Cela remonte dans tout le système. La répulsion intra-bande doit tenir
compte de segments qui se chevauchent verticalement sur plusieurs décennies, pas de
points isolés dans une bande de deux ans. Le hit-testing porte sur des segments, donc le
quadtree indexe des boîtes, pas des points. C'est plus de travail que le cas classique,
et c'est à budgéter en P2.

---

## ADR-004 : SVG jusqu'à 600 noeuds visibles, Canvas au-delà

**Contexte.** Le SVG donne l'accessibilité, le focus clavier et le CSS gratuitement.
Il s'effondre en pan et zoom au-delà de quelques centaines de noeuds animés.

**Décision.** Rendu SVG par défaut. Bascule automatique sur Canvas 2D avec hit-testing
`d3-quadtree` quand le sous-graphe visible dépasse 600 noeuds.

**Conséquences.** Deux chemins de rendu à maintenir en cohérence visuelle, ce qui est un
risque de dérive réel. Mitigation : les deux lisent les mêmes tokens CSS, résolus une
fois via `getComputedStyle` et passés au renderer Canvas. Le mode Canvas perd le focus
clavier natif, ce qui est couvert par ADR-008.

---

## ADR-005 : Zod valide au build et en développement, jamais en production

**Contexte.** Zod sur 180 genres en trois langues au démarrage, c'est du temps de parsing
et environ 14 Ko gzip pour valider des données qui sont figées à la publication.

**Décision.** `scripts/validate-data.ts` fait autorité et bloque la CI. En développement,
validation runtime active pour attraper une erreur de saisie immédiatement. En production,
les schémas sont exclus du bundle par `import.meta.env.DEV`.

**Conséquences.** Une donnée invalide ne peut pas atteindre la production, puisque la CI
échoue avant le build. Corollaire à assumer : personne ne doit pouvoir committer des JSON
sans passer par la CI.

---

## ADR-006 : La vérification YouTube est un filtre de build, pas un contrôle de qualité

**Contexte.** Le brief interdit tout identifiant non vérifié en production. Un contrôle
qui se contenterait d'avertir serait ignoré au bout de trois semaines.

**Décision.** `scripts/verify-youtube.ts` interroge l'endpoint oEmbed, compare le titre
retourné à `artist` et `title` par similarité, écrit le champ `verified` et produit
`reports/youtube-verification.md`. Le build de production **retire** les morceaux
`verified: false` du bundle. Un genre sans aucun morceau vérifié affiche « Sélection en
cours de vérification. »

**Conséquences.** Un morceau retiré de YouTube fait rétrécir la sélection au prochain
build, sans jamais casser le site. Point de vigilance : oEmbed sur 700 morceaux est
sujet à la limitation de débit, donc appels séquentiels avec temporisation et cache local
des résultats. Ce n'est pas un script à relancer à chaque build.

---

## ADR-007 : Routeur en mode hash

**Contexte.** GitHub Pages sert du statique et renvoie 404 sur toute route profonde qui
ne correspond pas à un fichier.

**Décision.** React Router en `HashRouter`. Forme des URL : `#/fr/genre/acid-house`.
La langue est un segment du fragment, pas un préfixe de chemin.

**Conséquences.** Aucune configuration serveur, aucun `404.html` de contournement.
Coût réel : les crawlers ignorent le fragment, donc chaque genre n'aura pas d'URL
indexable. Si le référencement par genre devient un objectif, il faudra pré-rendre des
pages statiques en P7, ce que le brief mentionne déjà comme optionnel.

---

## ADR-008 : L'accessibilité passe par une vue parallèle, pas par le SVG

**Contexte.** Un graphe zoomable de 180 noeuds n'est pas rendu accessible par des attributs
ARIA. En mode Canvas, il n'y a même plus de DOM à annoter.

**Décision.** `#/index` sert une **vue liste hiérarchique** avec le même contenu, les
mêmes liens et la même navigation, entièrement au clavier et au lecteur d'écran. Elle est
un chemin de première classe, annoncée en début de document, pas un repli caché.

**Conséquences.** Un second rendu du même modèle à maintenir. C'est le prix d'une
accessibilité réelle plutôt que déclarative. Le SVG garde `role="application"`, un
`aria-label` explicite et un focus visible sur les noeuds, mais ce n'est pas là-dessus
que repose la conformité.

---

## ADR-009 : Les traductions vivent dans les données, pas dans des fichiers de langue

**Contexte.** Une description de genre est une donnée éditoriale de 400 à 800 signes,
pas une chaîne d'interface.

**Décision.** `description` et `Edge.note` sont des `Record<Lang, string>` dans les JSON
de genres. `src/i18n/` ne contient que les chaînes d'interface. Aucune traduction générée
à l'exécution.

**Conséquences.** Ajouter un genre veut dire écrire trois descriptions, ce qui est
volontairement contraignant : un genre à moitié traduit se voit tout de suite. Le
validateur vérifie que les trois langues sont présentes et non vides.

---

## ADR-010 : L'ancien site est un build figé, committé une seule fois

> **CADUC.** L'agrégateur RSS a été abandonné. Il n'y a ni archive, ni
> `public/OLD/`, ni build figé. Le dépôt a été supprimé et recréé vierge.
> Conservé pour mémoire du raisonnement, ne pas appliquer.

**Contexte.** Le site actuel est un SPA Vite qui charge `/index.tsx`, donc du TypeScript
avec JSX. Le déplacer tel quel dans `public/OLD/` produirait une page blanche : aucun
navigateur n'exécute ce fichier.

**Décision.** L'agrégateur RSS actuel est bâti une fois avec `base: '/Sonaa/OLD/'`, sa
sortie `dist/` est committée dans `public/OLD/`, et ses sources sont retirées de la racine.
Elles restent accessibles par l'historique git et par un tag `v0-rss-aggregator`.

**Conséquences.** L'ancienne version est gelée, définitivement. Aucun second `package.json`,
aucun second arbre de dépendances, aucun double build en CI. Elle ne recevra plus de
correctif, ce qui est le comportement attendu d'une archive.

**Contrôle bloquant avant le gel.** L'ancien code contient un mot de passe administrateur
en clair dans `App.tsx` et une injection de clé Gemini dans le bundle. Le build figé est
produit **après** retrait des deux, et le gel n'a lieu que si ces trois commandes ne
sortent rien :

```
grep -rEi 'ghp_|github_pat_|AIza|sk-[A-Za-z0-9]{16}' dist/
```

Si le contrôle remonte quoi que ce soit, le commit est reporté. Graver un secret
dans une archive figée, c'est le graver pour toujours. Voir ADR-011.

Une valeur de secret ne s'écrit jamais dans un document du dépôt, pas même à
titre d'exemple dans une commande de contrôle : le document est poussé, donc la
valeur le serait aussi.

---

## ADR-011 : Aucun secret ne traverse le build

**Contexte.** Trois fuites constatées dans l'état actuel du repo :
un jeton GitHub personnel en clair dans `.git/config`, un mot de passe administrateur
en dur dans `App.tsx`, et `vite.config.ts` qui injecte `GEMINI_API_KEY` dans le bundle
client via `define`.

**Décision.** Le nouveau projet n'a aucun secret, par construction : pas de backend, pas
de clé, pas d'authentification, pas d'analytique. Le `define` d'injection de clé disparaît.
Le jeton du remote est révoqué et remplacé. Le mot de passe est retiré avant le gel de
`public/OLD/`.

**Conséquences.** Un contrôle de CI qui échoue si `dist/` contient un motif ressemblant à
une clé (`ghp_`, `AIza`, `sk-`) coûte cinq lignes et interdit la récidive. À câbler en P0.

---

## ADR-012 : React 19, en écart assumé avec le brief

**Contexte.** Le brief impose React 18. Le repo est déjà en React 19.

**Décision.** React 19. Le seul risque d'incompatibilité en React 19 vient des librairies
de graphes tierces, et il n'y en a aucune ici puisque le layout est maison (ADR-002).
Zustand 5, React Router 7 et les modules d3 sont alignés sur 19. Régresser en 18
n'achèterait rien.

**Conséquences.** Écart documenté par rapport à la section 2 du brief, validé
explicitement. Aucune autre décision de ce document n'en dépend.

---

## ADR-013 : D3 en modules ciblés, jamais le paquet complet

**Contexte.** Budget de 250 Ko gzip pour le JS initial, hors données.

**Décision.** Uniquement `d3-zoom`, `d3-selection`, `d3-scale`, `d3-shape`, `d3-interpolate`
et `d3-quadtree`. Un contrôle de taille de bundle en CI échoue au-dessus du budget.

**Conséquences.** `d3-shape` sert au tracé des courbes de Bézier des arêtes, mais s'il
s'avère qu'on n'utilise qu'un générateur de chemin, l'écrire à la main retire une
dépendance. À réévaluer en fin de P2, pas avant.

---

## ADR-014 : Les données sont découpées par famille, chargées à la demande

**Contexte.** 180 genres avec trois descriptions de 800 signes, plus les morceaux et les
sources, c'est de l'ordre de 400 à 600 Ko de JSON avant compression.

**Décision.** Un fichier par famille dans `src/data/genres/`. Le chargement initial ne
prend que le squelette du graphe, c'est-à-dire l'identifiant, le nom, les années, la
famille, les arêtes et les positions. Les descriptions, morceaux et sources sont chargés
par famille au premier besoin.

**Conséquences.** La carte complète s'affiche avec un squelette léger, conforme à la
cible de 2 secondes en 4G. Le premier clic sur un genre déclenche une requête, à masquer
par un préchargement au survol.

---

## ADR-015 : Une seule rupture d'échelle, déclarée à l'écran

**Contexte.** Le linéaire strict de 1948 à aujourd'hui laisse une vingtaine d'années
quasi vides entre la musique concrète et le krautrock, ce qui étire la planche sans rien
apporter. Mais ADR-003 vient de faire du noeud un segment dont la **longueur est une
donnée** : toute déformation locale de l'échelle fausse la comparaison des longévités.

**Décision.** Échelle linéaire stricte de 1969 à aujourd'hui. Un seul segment compressé,
l'avant-1969, et rien d'autre. La rupture est rendue visible sur la colonne de temps par
une zone hachurée, et un bouton « échelle réelle » rétablit le linéaire intégral.

**Conséquences.** Toute comparaison de durée à partir de 1969 est exacte, ce qui couvre
la quasi-totalité du corpus. Les genres de la famille `roots` antérieurs à 1969 ont une
longueur non comparable au reste, et c'est précisément ce que la hachure signale. Le
`timeScale` devient une échelle par morceaux à deux segments, et le test de déterminisme
du layout doit couvrir les deux modes.

---

## ADR-016 : Reclonage propre hors d'iCloud, historique repris à zéro

> **APPLIQUÉ, sous une forme plus radicale.** Le projet vit désormais dans
> `~/Dev/Sonaa`, hors d'iCloud. Le dépôt GitHub n'a pas été force-pushé mais
> supprimé et recréé vierge, et l'agrégateur RSS n'a pas été archivé.

**Contexte.** Deux faits établis à l'inspection. `git fsck` remonte des objets manquants
et des liens cassés sur au moins quatre commits : le dépôt local est **déjà corrompu**
par l'éviction iCloud. Et le repo est public, donc le mot de passe de `App.tsx` est
lisible de tous sur `main`.

**Décision.** Clone neuf depuis GitHub vers `~/Dev/Sonaa`, hors d'iCloud. Le nouvel atlas
démarre sur une **branche orpheline** qui devient `main`, l'ancien historique n'est pas
conservé : il ne contient que 22 fichiers d'un agrégateur RSS qui sera de toute façon gelé
en sortie de build, et il porte un secret dans chacune de ses révisions.

**Conséquences.** L'historique du mot de passe disparaît de GitHub après force push. Le
mot de passe reste compromis pour autant : il a été public, il doit être changé partout
où il a été réutilisé, indépendamment de cette opération. Le clone iCloud actuel n'est
plus une source fiable et ne doit servir qu'à récupérer `DESIGN.md`, `ARCHITECTURE.md`
et les logos, par copie de fichiers, jamais par opération git.

---

## Points ouverts

Aucun. Les trois arbitrages en attente ont été tranchés : React 19 (ADR-012), échelle
à rupture unique déclarée (ADR-015), sortie d'iCloud avec historique neuf (ADR-016).
