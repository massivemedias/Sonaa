# SONAA, décisions d'architecture

Format ADR court. Chaque décision : contexte, décision, conséquences.
Statut global : proposition, en attente de validation. Aucun code écrit.

---

## ADR-001 : Le layout est calculé au build, jamais au chargement

> **CADUC.** Il n'y a plus de layout timeline à sérialiser. Les positions sont
> dérivées de la filiation et calculées au chargement, en quelques millisecondes
> pour 60 genres. Remplacé par ADR-028.

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

> **PARTIELLEMENT CADUC.** La décision de ne prendre aucune librairie de graphes
> tient. La justification, un axe Y contraint par le temps, ne tient plus : le
> placement est une disposition en couronnes dérivée de la filiation.

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

> **CADUC.** Le noeud est une sphère dont le rayon est indexé sur la profondeur
> dans l'arbre de filiation. Plus aucun segment de durée, plus aucun `yearStart`.

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

> **REMPLACÉ par ADR-018.** Le rendu principal passe en WebGL, avec une
> répartition en trois couches. Le repli SVG survit, mais comme filet de
> sécurité (ADR-020), plus comme mode nominal.

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

**Décision.** L'endpoint oEmbed public fait autorité, sans clé : un 200 signifie
que la vidéo existe **et** qu'elle est intégrable, ce qui est exactement la
condition de l'iframe. La comparaison du titre et de l'artiste est faite par le
matcher partagé de `scripts/lib/match.ts` (ADR-035).

> **Corrigé.** La version précédente annonçait un script `verify-youtube.ts` qui
> écrirait `verified: false` sur les identifiants douteux. Il n'a jamais existé et
> n'existera pas : un identifiant qui ne passe pas la vérification est **retiré**,
> jamais conservé avec un drapeau. `verified` ne peut donc valoir que `true`, et le
> schéma Zod l'impose littéralement. Un genre sans morceau vérifié garde une liste
> vide, et l'interface le dit.

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

> **Budget révisé par ADR-021**, porté à 420 Ko gzip. La règle des modules
> ciblés reste entière et s'étend à Three.js (ADR-019).

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

> **CADUC.** Il n'y a plus d'échelle de temps, donc plus de rupture à déclarer.

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

## ADR-017 : L'avis esbuild sur Vite 5 est accepté, pas corrigé

**Contexte.** `npm audit` remonte GHSA-67mh-4wv8-2f99 sur esbuild, tiré par Vite 5.
La faille permet à n'importe quel site web d'envoyer des requêtes au serveur de
développement et d'en lire la réponse. Le correctif impose Vite 8, un saut de trois
majeures qui contredit la stack imposée.

**Décision.** On reste sur Vite 5 et on n'applique pas le correctif.

**Pourquoi c'est sans conséquence ici.** La faille ne touche que `vite dev`, un
serveur qui ne tourne que sur un poste de développement. SONAA publie des fichiers
statiques sur GitHub Pages : il n'y a aucun serveur de développement en production,
et le build lui-même n'est pas affecté. La surface d'attaque se limite à une machine
de développement qui visiterait un site hostile pendant que `npm run dev` tourne.

**Conséquences.** `npm audit` restera bruyant tant que la stack sera en Vite 5, ce
qui est acceptable mais doit être connu pour ne pas être re-diagnostiqué à chaque
installation. À réévaluer si Vite 5 reçoit un correctif rétroporté, ou au moment
où une montée de version majeure sera de toute façon nécessaire.

---

## ADR-018 : Rendu hybride en trois couches, remplace ADR-004

**Contexte.** Un seul moteur de rendu ne sait pas bien faire les trois choses que
SONAA demande simultanément : de la matière dense et animée sur des milliers
d'entités, du texte accessible et sélectionnable, et des repères géométriques
parfaitement stables.

**Décision.** Trois couches superposées, chacune cantonnée à ce qu'elle fait le
mieux.

1. **WebGL (Three.js, caméra orthographique).** Noeuds et arêtes, en deux
   `InstancedMesh`, donc deux appels de dessin pour le graphe entier. Shaders
   écrits à la main. Capsules tracées par fonction de distance signée, pas de
   géométrie par noeud. Fond en shader plein écran.
2. **DOM en overlay.** Tout le texte, positionné par projection des coordonnées
   WebGL à chaque image. Plafond de 60 labels, pool de noeuds recyclés.
3. **SVG.** Axe temporel gradué et minimap uniquement.

**Pourquoi orthographique.** La perspective déformerait l'axe du temps. Deux
segments de même durée doivent avoir la même longueur à l'écran quelle que soit
leur position, sinon la lecture comparative des longévités, qui est la promesse
du produit (ADR-003), devient fausse.

**Conséquences.** La couche DOM devient le porteur unique de l'accessibilité, ce
qui simplifie ADR-008 : il n'y a plus de texte inatteignable dans un canvas. En
contrepartie, la projection des coordonnées doit tourner à chaque image sans
provoquer de recalcul de mise en page, donc positionnement par `transform`
uniquement, jamais par `top` et `left`.

---

## ADR-019 : Three.js en modules ciblés, deux appels de dessin, aucun asset

**Contexte.** Three.js complet pèse de l'ordre de 170 Ko gzip. Un `import * as
THREE` embarque tout, y compris les chargeurs et les géométries dont on n'aura
jamais l'usage.

**Décision.** Imports nommés exclusivement, jamais d'espace de noms. Aucun modèle
3D, aucune texture bitmap, aucun asset externe : toute la matière est générée par
shader. Le graphe reste à deux appels de dessin.

**Conséquence sur le bloom.** Un bloom sélectif par post-traitement imposerait un
`EffectComposer`, plusieurs cibles de rendu et des passes supplémentaires, ce qui
contredit frontalement la contrainte des deux appels de dessin. Le halo de la
lignée active est donc produit **dans le shader des noeuds et des arêtes**, en
additif, piloté par un attribut d'instance. Même lecture à l'écran, sans passe
supplémentaire et sans cible de rendu intermédiaire.

**À vérifier.** Le tree-shaking doit être contrôlé sur le bundle réel, pas
supposé. Un contrôle de taille en CI échoue au-dessus du budget d'ADR-021.

---

## ADR-020 : Repli SVG obligatoire et garde de performance

**Contexte.** WebGL peut être indisponible, désactivé par politique d'entreprise,
ou perdu en cours de route sur un `webglcontextlost`. Un atlas qui devient une
page blanche dans ces cas-là n'est pas un site, c'est une démo.

**Décision.** Un rendu SVG complet et fonctionnel prend le relais si WebGL
manque ou si le contexte est perdu. Il n'est pas dégradé sur le plan de
l'information : mêmes noeuds, mêmes arêtes, mêmes liens, même navigation. Il perd
la matière, pas le contenu.

Trois gardes complémentaires :
- rapport de pixels plafonné à 2, quel que soit l'écran ;
- images par seconde mesurées sur 2 secondes glissantes, halo coupé sous 40 ;
- cibles : 60 images par seconde sur poste de bureau, 40 minimum sur mobile de
  milieu de gamme.

**Conséquences.** Deux chemins de rendu à maintenir, comme dans l'ancien ADR-004,
mais avec une répartition plus saine : le SVG n'est plus un mode nominal à tenir
au même niveau de finition, c'est un filet. Il doit rester correct, pas beau.

---

## ADR-021 : Budget porté à 420 Ko gzip, WebGL en import dynamique

**Contexte.** ADR-013 fixait 250 Ko gzip. Three.js, même en imports ciblés, ne
tient pas dans cette enveloppe avec le reste.

**Décision.** Budget relevé à 420 Ko gzip pour le JS, hors données. La couche
WebGL est chargée en **import dynamique après le premier rendu** : le squelette
de la carte, l'axe, l'interface et le repli SVG s'affichent d'abord, la matière
arrive ensuite.

**Conséquences.** La cible de 2 secondes en 4G porte sur le premier rendu utile,
pas sur l'arrivée de la couche WebGL. Corollaire à assumer : le repli SVG n'est
pas seulement un filet, c'est aussi le premier état visible de toute visite. Il
doit donc être correct dès la première image, pas seulement en cas de panne.

---

## ADR-022 : La pulsation vient du BPM déclaré, jamais de l'audio

**Contexte.** Faire battre la lignée active au rythme du morceau en cours suppose
d'analyser le son. L'iframe YouTube est servie depuis un autre domaine : la Web
Audio API ne peut pas s'y brancher, et toute tentative de contournement relèverait
de l'extraction de flux, ce que le projet s'interdit.

**Décision.** Le battement est calculé à partir du champ `bpm` du genre en cours
de lecture. Il pilote l'intensité du halo de la lignée active et le grain du fond,
à faible amplitude. Coupé par `prefers-reduced-motion`.

**Conséquences.** Le battement est juste en tempo mais pas en phase avec le
morceau : il ne peut pas l'être. C'est assumé, et c'est une raison de plus pour
garder l'amplitude basse. Un genre sans `bpm` renseigné ne pulse pas, ce qui est
préférable à une valeur inventée.

---

## ADR-023 : Budget de rendu révisé pour le volumétrique, et mode réduit

> Remplace les cibles de performance d'ADR-020 pour la couche WebGL.

**Contexte.** Le passage à l'espace habitable remplace des rubans et des
capsules par du raymarching volumétrique. Sur le prototype, le coût est passé
d'environ 0,16 ms au pire à 6,6 ms, soit un facteur quarante. Desktop tenait,
mobile non : l'estimation donnait 33 à 66 ms contre 25 ms de budget pour 40
images par seconde.

**Décision.** Deux dégradations, appliquées ensemble, toutes deux dans le
shader et sans cible de rendu intermédiaire.

1. **Pas adaptatifs, en continu.** Le nombre de pas de marche est interpolé
   entre 22 en vue d'ensemble et 10 quand une masse remplit l'écran. La
   couverture se déduit du rayon angulaire. Aucun palier : une transition par
   seuils se verrait comme un claquement de qualité pendant le dolly.
2. **Plein régime sur les trois masses les plus proches seulement.** Les autres
   passent par une approximation analytique sans boucle, un seul échantillon au
   milieu de la corde. À quelques dizaines de pixels, personne ne lit une
   densité interne. La masse ouverte reste toujours au plein régime.

**Mode réduit choisi au démarrage, pas après une chute.** Un détecteur de
capacité inspecte l'agent utilisateur, le nombre de coeurs et la chaîne du
renderer WebGL. Sur mobile ou GPU faible, le rendu démarre directement en
réduit : 12 pas maximum, plage 12 à 6, deux masses au plein régime, rapport de
pixels plafonné à 1,5. Attendre une chute de fps garantirait une première
seconde mauvaise sur exactement les machines qui en ont le moins besoin.

**Ce qui n'est pas fait.** La passe volumétrique en demi-résolution, qui
diviserait encore le coût par quatre, casserait la contrainte de cible de rendu
unique. Elle reste en réserve, à rouvrir seulement si les deux dégradations
ci-dessus ne suffisent pas une fois mesurées ensemble.

---

## ADR-024 : La vue liste devient un chemin de première classe

> **Toujours en vigueur.** La route est `#/index`. La racine du site ouvre
> désormais l'atlas et non une page d'accueil, voir ADR-031 et ADR-034.

> Précise ADR-008 et remplace la notion de repli graphique.

**Contexte.** Le repli sans WebGL dessinait la frise en SVG. La frise n'existe
plus, et redessiner un espace volumétrique en SVG n'a aucun sens.

**Décision.** `#/index` sert une navigation hiérarchique complète, familles puis
genres, avec le même contenu et les mêmes liens que l'espace. Elle n'est pas un
repli : c'est l'index accessible du produit, annoncé et utilisable par tout le
monde. Sans WebGL, l'espace y renvoie au lieu d'afficher une demi-carte.

**Conséquences.** Construite sur `details` et `summary` natifs, donc atteignable
au clavier et correctement annoncée sans un seul `aria-expanded` à maintenir à
la main, donc sans occasion de mentir au lecteur d'écran. Le coût est un second
rendu du même modèle, déjà acté en ADR-008.

---

## ADR-025 : Navigation à trois niveaux, jamais sans vol de caméra

**Contexte.** Un espace 3D sans repères se traverse à l'aveugle. Le prototype
volumétrique n'avait qu'une entrée par proximité, invisible et indevinable.

**Décision.** Trois niveaux, atlas puis famille puis genre, et une règle unique :
**aucun changement de niveau ne se fait sans que la caméra vole vers la cible**,
600 ms, easing doux, cadrage calculé pour que le noeud et ses enfants directs
tiennent dans le champ. Le noeud atteint devient le centre d'orbite.

Trois moyens d'y parvenir, tous équivalents : le clic sur une sphère, le fil
d'Ariane permanent en haut à gauche dont chaque segment remonte, et le clavier.
Échap et le clic dans le vide remontent d'un niveau, toujours avec vol.

**Accessibilité de la commande.** Le trackpad seul ne suffit pas. Le glissement
souris tourne, la molette zoome, les flèches tournent, plus et moins zooment,
0 recentre. Des contrôles visibles en permanence en bas à droite doublent tout
cela. Une ligne d'aide s'affiche au premier chargement, disparaît à la première
interaction et ne revient plus, mémorisée dans `localStorage`.

**Conséquences.** Le vol doit se terminer même si l'image suivante arrive après
la fin de l'intervalle, sinon la caméra n'atteint jamais sa destination sur une
machine lente. Un simple test « temps écoulé inférieur à la durée » ne suffit
pas, il faut un drapeau et une fin forcée.

---

## ADR-026 : La vue tracks est une vue 2D, pas une surcouche 3D

**Contexte.** Choisir un morceau est une tâche de liste, pas d'espace. La
maintenir dans la scène 3D reviendrait à faire de la lecture de texte une
question de caméra.

**Décision.** Entrer dans les morceaux **suspend la 3D** : le canvas recule,
se floute légèrement, cesse de recevoir les gestes, et un panneau 2D plein
passe devant. Grille de pochettes carrées, 3 à 5 colonnes selon la largeur.
Lecteur persistant en bas : pochette, artiste, titre, transport, barre de
défilement cliquable, volume. Retour au graphe par bouton explicite et par Échap.

Deux onglets, deux sélections : **Actuel**, les sorties des cinq dernières
années triées par vues décroissantes, et **Essentiel**, les fondateurs du genre
toutes époques.

**Conséquences.** La lecture réelle passera par l'iframe YouTube pilotée par
notre propre interface, jamais par les commandes de YouTube. Dans le prototype,
le transport est **simulé et étiqueté comme tel** : les données sont factices,
et le projet s'interdit d'inventer un identifiant (ADR-006). Le branchement de
l'iframe se fait en P3, sur des identifiants vérifiés.

---

## ADR-027 : Morceaux et pochettes figés au build, aucune clé côté client

**Contexte.** Il faut des morceaux récents et populaires par genre, et des
pochettes. Les deux viennent d'API tierces. Aucune ne doit être appelée depuis
le navigateur d'un visiteur, et aucune clé ne doit approcher le bundle.

**Décision.** Deux scripts qui ne tournent qu'au build.

`scripts/fetch-tracks.ts` interroge YouTube Data API v3 avec une clé lue dans
`process.env.YOUTUBE_API_KEY`, fournie par un secret GitHub Actions. Deux appels
par genre : une recherche filtrée sur les cinq dernières années et sur les
vidéos intégrables, puis un appel sur les identifiants pour récupérer le nombre
de vues, qui n'est pas dans la recherche. Les résultats passent par le matcher
partagé puis par un contrôle oEmbed, parce qu'une vidéo trouvée par l'API peut
refuser l'iframe et qu'une recherche par mot-clé rapporte beaucoup de bruit. Ce
qui ne passe pas n'est pas écrit.

`scripts/fetch-covers.ts` interroge l'API iTunes Search, gratuite et sans clé,
sur artiste plus titre, et fige l'URL d'artwork carré en 600 pixels. La
correspondance est exigeante sur l'artiste ET le titre : une pochette fausse est
pire qu'aucune. Repli sur la miniature YouTube sinon.

**Conséquences.** Au runtime, le seul appel tiers restant est l'iframe YouTube.
Le contrôle anti-secret de la CI (ADR-011) couvre déjà le cas où une clé
fuiterait dans `dist/`. Contrepartie à assumer : les données vieillissent entre
deux builds, et l'onglet « Actuel » n'est actuel qu'à la date du dernier build.

---

## ADR-028 : Séparation garantie des familles, et écartement dynamique

**Contexte.** Les centres de familles étaient écrits à la main pour encoder la
proximité stylistique, sans aucune garantie de non-chevauchement. Résultat
constaté à l'écran : Breaks passait devant Disco, House débordait sur Electro, et
on ne savait plus quelle sphère appartenait à quelle famille.

**Décision.** Deux relaxations au chargement, puis un écartement dynamique.

1. **Séparation en volume.** Les positions éditoriales servent de point de
   départ, puis on impose une distance minimale égale à la somme des rayons
   compacts plus une marge de 14 unités.
2. **Séparation en projection.** La séparation en volume ne suffit pas : deux
   familles éloignées mais alignées avec l'axe de vue se recouvrent à l'écran.
   Une seconde passe les écarte dans le plan de l'écran à l'angle par défaut,
   sans toucher à leur profondeur, avec une marge de 10 unités. La passe 1 est
   ensuite rejouée pour ne rien casser.
3. **Écartement dynamique.** Garantir la séparation à l'état déployé imposerait
   un atlas quatre fois plus large et des amas minuscules. À l'ouverture d'une
   famille, les autres sont donc **poussées radialement** pour laisser la place
   réellement occupée, et rejoignent leur cible avec amortissement.

**Conséquences.** La séparation en projection n'est garantie qu'à l'angle par
défaut : c'est une limite inhérente à une projection, une rotation peut recréer
des recouvrements. `DEFAULT_AZIMUTH` et `DEFAULT_ELEVATION` sont une seule
source de vérité partagée entre les données et le moteur, parce que la relaxation
en dépend.

Mesuré après les trois passes : séparation minimale de 14,0 en volume et de 9,7
en projection, aucun chevauchement.

---

## ADR-029 : Une seule famille déployée à la fois, anneaux limités au niveau navigable

**Contexte.** Rien n'interdisait plusieurs familles ouvertes simultanément, et
les anneaux indicateurs s'affichaient sur les 204 sphères de l'atlas, y compris
sur des familles compactes où l'on ne peut pas encore descendre. L'ensemble se
lisait comme un éparpillement.

**Décision.** Ouvrir une famille referme automatiquement toute autre famille
ouverte. Au niveau Atlas, toutes sont compactes. Les anneaux n'apparaissent que
sur les sphères du **niveau actuellement navigable**, c'est-à-dire celles de la
famille déployée : au niveau Atlas, aucun anneau.

Les liens entre familles passent à **10 pour cent d'opacité** par défaut et ne
s'allument qu'au survol ou à la sélection de l'une de leurs deux extrémités. Ils
traversaient l'écran en diagonale et brouillaient toute lecture.

**Conséquences.** L'état de l'atlas devient déterministe : zéro ou une famille
ouverte, jamais deux. La comparaison de deux familles déployées côte à côte
devient impossible, ce qui est un renoncement assumé au profit de la lisibilité.

---

## ADR-030 : Le DAG est la vérité, l'arbre est une vue

**Contexte.** La généalogie musicale est un graphe orienté acyclique : la deep
house descend de la house de Chicago et du garage de New York. Le rendu en
couronnes suppose un parent unique pour positionner un noeud. C'est la
contradiction de fond du projet, et la contourner en ne gardant qu'un parent
reviendrait à mentir sur le contenu pour arranger le rendu.

**Décision.** Les données portent **tous** les parents, le layout n'en utilise
qu'un, désigné **explicitement**.

```
parents: Edge[]              la vérité généalogique, un DAG, aucune limite
structuralParent?: GenreId   celui qui positionne, doit être l'un des parents
                             et appartenir à la même famille
```

Le choix est nommé, pas déduit : ni « le premier de la liste », qu'un
réordonnancement de JSON casserait, ni « celui de plus fort poids », qu'on règle
pour d'autres raisons. Il est visible à la relecture et tranché genre par genre.

Un genre sans `structuralParent` est le **fondateur de sa famille**. Il peut
avoir des parents, mais dans d'autres familles. Exactement un par famille.

Les autres parents deviennent des **greffes** : trait plus fin, sans effilement,
opacité basse, autorisées à traverser d'une famille à l'autre, allumées au
survol ou à la sélection d'une extrémité. La double ascendance cesse d'être un
problème de layout pour devenir une couche d'information.

**Conséquences.** Les liens entre familles ne sont plus déclarés à la main : ils
se **dérivent** des parentés qui traversent une frontière de famille. Une seule
source de vérité. Le validateur doit exiger `structuralParent` dès qu'un genre a
un parent dans sa propre famille, vérifier qu'il en fait bien partie, et
contrôler qu'il existe exactement un fondateur par famille.

---

## ADR-031 : L'arbre 2D est écrit, essayé, puis suspendu

**Contexte.** Après trois passes d'affinage restées insuffisantes, la hiérarchie
en couronnes 3D a été remplacée par un arbre 2D à plat : atlas en 3D, famille et
en dessous en 2D. Le code a été écrit, construit et déployé, puis annulé par un
`git revert` du commit `d6d6684`.

**Pourquoi l'annulation.** Le diagnostic portait sur la mise en page, alors que
le prototype affichait des noeuds nommés `disco-1`, `disco-2`, `techno-3`. Des
étiquettes factices de longueur uniforme et sans signification ne permettent pas
de juger la lisibilité d'une filiation : on ne peut pas voir si une couronne
« se lit » quand rien de ce qu'elle porte n'a de sens. L'ordre de travail était
inversé.

**Décision.** Retour à l'atlas 3D en couronnes. Le corpus de noms réels passe
avant toute nouvelle passe graphique, et la question du 2D contre 3D sera
rejugée sur des vrais noms, pas avant.

**Ce qui reste valable de l'analyse, à ne pas réécrire.** Trois limites de la
représentation 3D sont structurelles et ne dépendent pas des noms :

1. En perspective, le rayon apparent d'un noeud est son rayon divisé par sa
   distance à la caméra. Un enfant proche paraît plus gros qu'un parent lointain,
   donc la taille ne peut pas encoder la génération de façon fiable.
2. Une séparation garantie en volume ne garantit rien à l'écran : deux noeuds
   alignés avec l'axe de vue se touchent. Corrigeable à un angle donné, pas à
   tous.
3. Un arbre lu dans un volume n'a pas de sens de lecture imposé.

Si l'essai sur vrais noms confirme le problème, le commit `d6d6684` contient
l'implémentation complète de l'arbre 2D et peut être remis par un revert du
revert. Ne pas le réécrire de zéro.

**Conséquences.** ADR-025, ADR-028 et ADR-029 redeviennent pleinement en vigueur.
DESIGN.md décrit de nouveau les couronnes et la descente 3D.

---

## ADR-032 : Le corpus passe avant le graphisme, et les identifiants se verifient sans cle

**Contexte.** Trois passes d'affinage graphique ont echoue sur un prototype
peuple de noeuds nommes `disco-1`, `disco-2`, `techno-3`. Des etiquettes
factices, toutes de meme longueur et sans signification, ne permettent pas de
juger la lisibilite d'une filiation. L'ordre de travail etait inverse.

**Decision 1 : le corpus d'abord.** 60 genres reels, six familles, filiations
sourcees, branches dans le prototype 3D existant a la place des donnees
generees. La question du rendu se rejuge sur ces noms, pas avant.

**Sources et arbitrage.** Le dataset Ishkur's Guide v3 d'igorbrigadir est le
point de depart : 166 genres, 352 aretes dirigees avec annees. Recoupe avec
Ishkur v2.5, Wikipedia et Discogs. Deux constats a ne pas repayer :

- **Les aretes de v2.5 ne sont pas des filiations.** Elles encodent l'arbre de
  navigation du guide, pas la causalite. `house -> disco`, `goatrance ->
  psychedelictrance` et `hinrg <- italodisco` sont tous chronologiquement
  inverses. Seul v3 porte des aretes dirigees datees, exploitables.
- **Ishkur a des lectures minoritaires assumees.** Hi-NRG et Italo Disco y
  descendent de Spacesynth, qui leur est posterieur de cinq ans ; Trance et Goa
  Trance y descendent de l'EBM. Ces filiations sont marquees `debated` avec la
  source suivie inscrite dans la note, jamais tranchees en silence.

**Decision 2 : la verification des identifiants YouTube ne demande aucune cle.**
L'endpoint oEmbed public repond 200 uniquement si la video existe **et** est
embarquable, ce qui est exactement la condition de l'iframe. Un 403 ou un 400
suffit a rejeter. La chaine est : recherche YouTube reelle pour obtenir des
identifiants candidats, puis oEmbed, puis controle que le titre renvoye partage
du vocabulaire avec l'artiste et le titre cherches. Aucun identifiant n'est
ecrit de memoire, et un genre sans identifiant verifiable garde une liste vide.

Consequence directe : le transport simule de la vue morceaux est remplace par
l'iframe officielle sur `youtube-nocookie.com`. C'est le seul appel tiers du
runtime, et il ne se declenche qu'a la lecture.

**Decision 3 : les liens entre familles sont deduits, jamais ecrits.** Ils
viennent des ascendances qui traversent une famille dans le corpus, conformement
a ADR-030. Une seule source de verite, donc la carte ne peut pas contredire les
donnees.

**Mesure.** 60 genres, 178 identifiants verifies sur 180 vises, 58 genres sur 60
a trois morceaux, aucun genre vide. 15 filiations marquees `debated`, 11 greffes
resolues, 4 greffes vers l'EBM laissees non resolues faute de famille
industrial dans ce corpus v1.

---

## ADR-033 : Le panneau morceaux est un objet de la scene, l'iframe le suit

**Contexte.** La vue morceaux etait un panneau 2D plein ecran qui suspendait la
3D. Sortir de l'espace pour ecouter cassait la continuite : on quittait l'atlas
au moment precis ou l'on arrivait a destination.

**Decision.** La plaque est rendue en WebGL, dans la scene, devant la sphere du
genre : face camera, inclinee de 9 degres, suivi amorti, aucune rotation propre.
La 3D n'est plus suspendue, on continue d'orbiter et de zoomer.

**Contrainte technique inevitable.** Une iframe ne peut pas se rendre dans une
texture WebGL. La fenetre video est donc un element HTML superpose au canvas,
positionne par projection de la plaque et portant la meme inclinaison en CSS.
C'est le seul element qui ne pouvait pas etre peint en WebGL.

**Trois pieges payes sur cette illusion, a ne pas repayer.**

1. **`Float32BufferAttribute` recopie le tableau qu'on lui passe.** Ecrire dans
   le `Float32Array` d'origine n'atteint jamais la geometrie : le quad restait
   degenere a l'origine et la plaque etait simplement invisible, sans aucune
   erreur. Utiliser `BufferAttribute`, qui garde la reference.
2. **Deux projections separees pour la largeur et la hauteur donnent un rapport
   faux.** Hors de l'axe optique, projeter le bord haut puis le bord droit
   produit des demi-tailles qui ne sont pas dans le rapport de la plaque. Une
   plaque face camera se reduit a une seule echelle, calculee depuis la
   profondeur : `hauteurPx = hauteurMonde * hauteurEcran / (2 tan(fov/2) * d)`.
3. **Viser la position de la sphere au moment du clic ne suffit pas.** La
   descente sur un genre repositionne les spheres apres le clic, donc la cible
   est perimee d'une image. La camera suit la sphere a chaque image tant que le
   panneau est ouvert.

**Persistance de la lecture.** L'iframe n'est jamais demontee ni reparentee :
reparenter une iframe la recharge, donc la lecture s'arrete. Elle vit dans un
conteneur de premier niveau qu'on deplace par transformation vers la fenetre de
la plaque ou vers le mini-lecteur. La geometrie ne passe pas par un etat React,
qui provoquerait un rendu complet a chaque image pendant un vol de camera : elle
transite par un bus imperatif, et React ne se rerend que quand le genre change.

**Transport reel.** L'API IFrame Player officielle porte lecture, pause,
deplacement, volume et duree. Elle remplace le transport simule, qui n'avait de
sens que tant qu'aucun identifiant n'etait verifie.

**Pochettes.** iTunes Search au build, correspondance exigeante sur l'artiste ET
le titre, repli sur la vignette de la video. Les images sont telechargees dans
`public/covers/` et servies par le site : une balise `img` vers un domaine tiers
est un appel tiers au runtime, et la regle dit qu'il n'y en a aucun hors iframe.
iTunes limite par adresse IP sur une longue fenetre et repond 403 pendant des
heures : le script accepte `--covers-only` pour ne faire que le telechargement
quand le quota est epuise.

**Typographie.** Les alias `--font-display`, `--font-reading` et `--font-mono`
sont supprimes. Une seule variable, `--font-ui`. Un nom de variable qui annonce
une chasse fixe finit par en ramener une.

**Mesure.** 4 appels de dessin, image complete a 0,081 ms pour un budget de
16,67 ms.

---

## ADR-034 : L'atlas est le produit, la famille industrial ferme les greffes

**Contexte.** `src/proto/` etait declare jetable, et le depot servait une page
d'accueil P0 devant l'atlas. Les deux etaient vrais tant que la direction
n'etait pas tranchee. Elle l'est : c'est l'atlas qu'on regarde, qu'on navigue et
qu'on ecoute.

**Decision 1 : plus de prototype.** `src/proto/` devient `src/atlas/`, et la
racine du site ouvre l'atlas directement. La page d'accueil P0 et `src/app/`
sont supprimees. `#/index` reste la vue liste accessible, chemin de premiere
classe et non repli (ADR-024). Renommages internes : `ProtoPage` devient
`AtlasPage`, `masses.ts` devient `structures.ts`, les classes `proto-*`
deviennent `atlas-*`, `window.__proto` devient `window.__atlas`.

Tout ce qui, dans DESIGN.md, ARCHITECTURE.md et HANDOFF.md, decrivait ce code
comme jetable est caduc. Le nom `masses` l'etait deja : il venait des masses
volumetriques abandonnees.

**Decision 2 : la famille industrial entre dans le corpus.** Huit genres,
d'Industrial a Neue Deutsche Haerte. Elle resout les quatre greffes vers l'EBM
qui restaient declarees mais non resolues, faute de cible : Dark Disco,
Industrial Techno, Trance et Goa Trance. Le corpus passe de 60 a 68 genres, de 6
a 7 familles, de 11 a 15 greffes, et il n'en reste aucune en suspens.

Teinte 60, laiton oxyde. Ecart de 45 degres avec le disco, de 136 avec le
minimal, et hors de la zone olive-kaki interdite entre 90 et 120 degres.

**Decision 3 : le test de correspondance des morceaux exigeait l'artiste OU le
titre, il exige maintenant les deux.** L'ancienne regle acceptait un mot commun
sur trois : une recherche « Phase Fatale Reproduction » renvoyait « Velvet
Imprints », du bon artiste et du mauvais morceau, et passait. Le cas inverse
existe aussi, une reprise du meme titre par quelqu'un d'autre. La regle est
maintenant couverture du titre superieure a 0,6 ET couverture de l'artiste
superieure a 0,34, sur des jetons replies pour les accents et les
transcriptions allemandes, avec correspondance par prefixe de quatre lettres.

Cout de cette rigueur, mesure : 41 morceaux sur 202 rejetes a la revision. Apres
choix de meilleurs candidats sur les genres de niche, 190 morceaux verifies sur
204 vises, aucun genre vide. C'est le prix d'un corpus dont chaque ligne est
vraie.

**Decision 4 : trois niveaux de repli pour les pochettes.** Pochette iTunes,
sinon vignette de la video, sinon pochette dessinee. Les vignettes YouTube en
`hqdefault` et `sddefault` sont en 4:3 avec des bandes noires : on retire les
bandes AVANT le recadrage carre, sinon le carre est a moitie noir. Le recadrage
part du centre, jamais du haut. En dernier recours, `ProceduralCover` dessine un
carre avec la teinte de la famille et les initiales de l'artiste, en SVG,
`preserveAspectRatio="xMidYMid slice"` pour remplir la fenetre 16:9 sans bandes.

**Decision 5 : le champ affiche s'appelle album, pas label.** iTunes ne donne
que l'album ; le label de disque demanderait un jeton Discogs. L'interface
ecrit « Album X » plutot que de laisser croire a un label.

**Titre et partage.** `document.title` suit la navigation, en point median et non
en tiret cadratin. L'image de partage est generee depuis la palette reelle du
corpus, 1200 x 630. Les metadonnees Open Graph exigent une URL ABSOLUE par
specification : c'est la seule exception a la regle du chemin relatif, declaree
une fois dans `index.html`.

---

## ADR-035 : Le matcher est un module partage, et le corpus accepte une source humaine

**Contexte.** Le durcissement du matcher a rejete 41 morceaux sur 202, un sur
cinq. Il a aussi mis en evidence sa limite : sur les scenes de niche, la
recherche automatique ne trouve pas parce que les morceaux ne sont pas sur
YouTube sous le nom cherche, pas parce que le test est trop strict. Suomisaundi,
cosmic disco, indie dance, dark disco, nitzhonot, techno body music restent a un
ou deux morceaux.

**Decision 1 : une seule definition de la rigueur.** `scripts/lib/match.ts` fait
autorite sur « est-ce bien ce morceau », et tout script qui ecrit un identifiant
YouTube passe par lui. Le seuil est couverture du titre a 0,6 ET couverture de
l'artiste a 0,34, sur des jetons replies pour les accents, les transcriptions
allemandes et les prefixes de quatre lettres. Le module porte l'historique du
rejet en commentaire, pour qu'on ne l'assouplisse pas par ignorance.

Le module expose aussi `searchYouTube` et `oembed`. Aucun identifiant n'est
jamais construit : il vient d'une recherche reelle, puis il est verifie.

**Decision 2 : une source humaine, verifiee comme les autres.**
`scripts/import-tracks.ts` lit `tracks-canon.md`, un tableau markdown par genre,
et NE FAIT PAS CONFIANCE au fichier sur les identifiants. Il lit des noms,
cherche lui-meme, et n'ecrit que ce qui passe le matcher. Un identifiant present
dans le fichier serait quand meme reverifie.

Fusion sans ecrasement : un morceau deja present, identifie par son couple
artiste et titre normalise, n'est jamais reecrit. Le corpus verifie fait foi.

Il refuse aussi un identifiant deja utilise ailleurs dans le corpus : le meme
identifiant sur deux genres est presque toujours une compilation ou un mix pris
pour un morceau. Le schema controle desormais la meme chose.

Le rapport `tracks-canon-report.md` liste chaque ligne non resolue avec les
candidats refuses et leurs deux scores. Un score de titre bas dit que la video
est un autre morceau, un score d'artiste bas dit que c'est une reprise. C'est ce
qui permet une correction a la main sans deviner.

**Decision 3 : deux listes par genre, des maintenant.** `tracks.essentiel` porte
les fondateurs du genre, `tracks.actuel` les sorties recentes. Tout l'existant
est passe dans `essentiel` : ce sont des fondateurs trouves par recherche, pas
des sorties recentes. `actuel` demande la YouTube Data API et reste vide.

L'onglet ne s'affiche que si `actuel` a du contenu. Un onglet vide promet une vue
qui n'existe pas ; mieux vaut ne pas l'afficher que de le montrer mort. La
lecture retient de quelle liste vient le morceau en cours, pour que changer
d'onglet ne coupe pas le son.

**Decision 4 : la validation dit ou sont les trous.** `validate-data` affiche la
couverture par genre, classee du plus pauvre au plus riche, et nomme les genres
sous la cible de trois morceaux. C'est la liste de travail pour
`tracks-canon.md`, pas une statistique decorative.

---

## ADR-036 : Fiche de genre, recherche, accueil, et deux ecritures sur un meme fichier

**Contexte.** L'atlas se navigue et s'ecoute, mais il ne se LIT pas : cliquer une
sphere tombait directement dans un lecteur, sans jamais dire de quoi on parle ni
d'ou ca vient. Et rien ne permettait d'atteindre un genre dont on connait le nom.

**Decision 1 : le clic ouvre une FICHE, pas un lecteur.** Cliquer une sphere vole
dessus, deploie ses derives, et ouvre sa fiche : nom, famille, intervalle de BPM,
parent cliquable, greffes avec leur famille, derives cliquables, alias, et le
badge de filiation debattue avec la note qui dit quelles sources se contredisent.
Ecouter est une action de la fiche.

La fiche est en DOM plat, pas en plaque 3D : c'est du texte a lire. La plaque
reste reservee aux morceaux, qui sont un objet a contempler.

**Piege paye.** Le bouton d'ecoute de la fiche appelait le rappel React
`onTracks` directement. Le moteur n'etait donc jamais prevenu, la plaque n'etait
pas posee, et la fenetre video se retrouvait sans geometrie : un panneau sans
plaque ni video, visible seulement sur mobile ou le debordement sautait aux yeux.
Ecouter doit passer par `openPanel` du moteur, qui appelle `onTracks` lui-meme.

**Decision 2 : recherche sur barre oblique.** Nom, alias, nom de famille. Le
resultat fait VOLER la camera, il ne teleporte pas.

Les alias viennent du champ `aka` d'Ishkur v3, filtres par une regle : un alias
qui est le nom d'un AUTRE genre du corpus est ecarte. Ishkur donne « Detroit
Techno » comme alias de Minimal Techno, alors que c'est son ancetre ; taper le
nom aurait envoye sur le mauvais noeud. Vingt alias ecartes sur cent
trente-neuf, plus deux corrections a la main : une plaisanterie de l'auteur et un
alias ambigu entre deux genres de la meme famille. 119 alias sur 48 genres.

**Decision 3 : voler vers un genre demande d'attendre le deploiement.** Tant que
sa famille est compacte, la sphere visee est rangee dans l'amas et le cadrage
calcule sur cette position colle la camera a quelques unites du noeud. La cible
est donc memorisee et la boucle de rendu la consomme quand la diffusion depasse
90 pour cent.

**Decision 4 : ecran d'accueil, une seule fois.** Le nom, une phrase, les sept
familles avec leur teinte, et cinq gestes. Il disparait au premier clic et ne
revient plus. Il marque aussi la ligne d'aide comme vue : repeter la meme chose
juste apres serait du bruit.

**Decision 5, la plus importante : deux scripts n'ecrivent pas le meme fichier
en aveugle.** `fetch-covers` tourne des heures a cause du quota iTunes. Il
chargeait le corpus au demarrage et le reecrivait entier a chaque trouvaille :
une passe d'alias faite pendant ce temps a ete effacee en silence, et le symptome
observe etait « la recherche ne trouve rien ».

L'ecriture RELIT desormais le fichier et n'y applique QUE les champs dont le
script est proprietaire, `cover` et `album`, indexes par identifiant de video.
Tout script long doit suivre cette regle.

**Mobile, mesure sur 390 par 844.** Quatre defauts trouves et corriges :

1. Le panneau morceaux etait cadre sur la HAUTEUR seulement. En portrait, une
   plaque remplissant 52 pour cent de la hauteur faisait une fois et demie la
   largeur de l'ecran. Le cadrage tient maintenant les deux axes, et il compte le
   decalage de la plaque vers la camera, qui la rapproche de 14 pour cent.
2. Les noms de familles se posaient a droite de la sphere et « MINIMAL » sortait
   du cadre. Sur mobile ils passent dessous et centres. C'est une regle de
   gabarit, pas un decalage au cas par cas : aucun label n'est deplace
   individuellement, la regle d'ADR-029 tient.
3. La ligne d'aide etait en `nowrap` centree : elle depassait des deux cotes et
   passait sous les controles. Elle se replie au-dessus d'eux.
4. Le cadrage de l'atlas remplissait 70 pour cent de la largeur en portrait, ce
   qui laissait les deux tiers de la hauteur vides. On monte a 90 pour cent quand
   l'ecran est plus haut que large.

Ajout au passage : deux bandes reservees a l'interface, 64 pixels en haut et 74
en bas, ou aucun label ne se place. Ils se superposaient au fil d'Ariane.

---

## ADR-037 : Le corpus passe de 68 a 216 genres, en quatre vagues

**Contexte.** Le comparatif de couverture fourni par Mika, croisant Wikipedia,
Ishkur, le wiki Electronic Music et Discogs, montrait que SONAA racontait une
histoire uniquement continentale et americaine : pas de racine commune, pas de
lignee britannique, pas de hardcore, pas d'ambient.

**Decision.** Quatre vagues, deployees chacune sitot verte : roots en premier,
breaks et bass ensuite, puis electro, hardcore, ambient et downtempo, puis les
complements des sept familles d'origine. 216 genres, 14 familles, 76 greffes,
40 filiations debattues.

**Trois regles nees de la croissance, a garder.**

1. **`structuralOnly`.** Le funk et le dub ne descendent pas de la musique
   concrete, ce sont des racines paralleles ; le schema exige pourtant un
   fondateur unique par famille. Plutot qu'inventer une arete fausse, le
   rattachement est declare conventionnel : `parents` reste vide de ce lien, et
   la fiche ecrit « rattache a » suivi de « ce n'est pas une filiation ».
   Trois cas : Funk, Dub, Baltimore Club, Minimal Wave.

2. **`bpm` nullable.** La musique concrete, l'ambient ou le drone ne se comptent
   pas en battements par minute. Un intervalle invente serait une fausse donnee.
   L'interface ecrit « sans tempo ».

3. **Un alias qui devient un genre doit disparaitre comme alias.** A 68 genres,
   « Footwork » etait un alias de Hard House ; a 216, c'est un genre, et la
   recherche sautait sur le mauvais noeud. Quinze alias retires, et la regle est
   un controle bloquant de validate-data.

**Palette.** Quatorze teintes OKLCH, ecart minimal de 22 degres verifie par
calcul, zone olive-kaki 90-120 exclue.

**Mesure a 216 genres.** L'instancing tient sans effort : 3 appels de dessin
inchanges, 246 liens, 6338 triangles, image complete a 0,053 ms sur 16,67. La
lisibilite de l'atlas tient parce qu'au niveau atlas rien d'autre que les 14
noms de familles ne s'affiche (ADR-031/034) : la densite interne des amas ne
coute rien tant qu'on n'y est pas descendu.

**Ce qui n'est pas fait.** Les 148 genres nouveaux n'ont aucun morceau : les
listes partent vides et l'interface le dit. Ils se remplissent par
tracks-canon.md et import-tracks, jamais par lot invente.

---

## ADR-038 : La source ne s'affiche jamais, les credits citent des categories

**Contexte.** Les notes du corpus, affichees dans les fiches, nommaient une
cartographie particuliere une quarantaine de fois. Et `corpus.json` entre dans
le bundle : ce qui est dans les donnees est dans l'interface.

**Decision 1.** Aucune source documentaire particuliere n'est nommee dans
l'interface : labels, fiches, notes, code embarque. Les 46 notes concernees sont
reformulees en references neutres, « une cartographie de reference ». Les alias
repris de ces sources restent utilisables pour la recherche : c'est la
provenance qui ne s'affiche pas, pas la donnee. Les documents du depot,
ARCHITECTURE.md et CORPUS.md, continuent de nommer leurs sources : ils sont
l'appareil critique, pas l'interface.

**Decision 2.** Une page de credits, route `#/credits`, accessible par un lien
discret en pied d'atlas et depuis la vue liste. Elle cite des CATEGORIES,
encyclopedies, bases discographiques, cartographies historiques, communautes
d'auditeurs, sans hierarchie de dette et sans nommer un guide en particulier.
Elle dit que les morceaux sont lus par le lecteur officiel YouTube, qu'aucun
audio n'est heberge, et que les filiations sont une lecture, pas une verite.
Francais seul : l'internationalisation n'est pas en place, on n'en simule pas.

**Decision 3, le garde-fou des labels.** Un suffixe « · 3 » sur les labels avait
ete supprime puis a ete revu sur une capture, en fait un bundle en cache : le
code et le bundle en ligne etaient propres. Peu importe, la parole ne suffit
pas : `scripts/check-labels.ts` verifie en CI que chaque site d'appel de label
passe exactement `slot.label` ou `family.label`, ni gabarit ni concatenation, et
qu'aucun marqueur de l'ancien suffixe ne revient. Le label affiche le nom seul,
l'information de derives vit dans la fiche.

**Decision 4.** Deezer devient la premiere source de pochettes, iTunes le
repli : iTunes limite par adresse IP sur des heures et a coupe trois campagnes
de suite, Deezer tolere cinquante requetes par cinq secondes. Meme matcher
exigeant pour les deux : une pochette fausse est pire qu'aucune, quelle que soit
la source.

---

## ADR-039 : Les morceaux charnieres, et le cadrage qui suit le nuage

**Contexte.** L'anti-doublon refusait « Acperience 1 » en acid techno parce
qu'il etait deja en acid trance. Mika a tranche : ce ne sont pas des erreurs, ce
sont des morceaux CHARNIERES, et l'appartenance multiple est precisement ce qui
les rend interessants.

**Decision 1.** `shared: GenreId[]` sur un morceau liste les AUTRES genres qui
le revendiquent. La validation exige la reciprocite : le meme identifiant dans
plusieurs genres sans declaration des deux cotes reste une erreur, et une
declaration vers un genre qui ne porte pas le morceau aussi. Le partage se
declare, il ne se tolere pas en silence. L'interface l'affiche : « aussi
revendique par X », cliquable, dans le panneau morceaux et dans la fiche.
L'import accepte une colonne `partage` pour le declarer a la source.

Trois charnieres fondatrices : Acperience 1 entre acid trance et acid techno,
Spastik entre acid techno et minimal techno, Da Funk entre french house et
disco house.

**Decision 2, les fondateurs ne sont plus muets.** Les 19 fondateurs nommes par
Mika ont recu chacun trois evidences documentees, proposees par la machine dans
`tracks-founders.md` et verifiees par le matcher comme tout le reste : 57 sur
57 resolus. Les sous-genres de niche restent a Mika. 339 morceaux verifies.

**Decision 3, trois correctifs de cadrage mesures sur Breaks a 23 genres.**

1. La camera vise le CENTROIDE du nuage deploye, plus la racine : la couronne
   pousse vers le haut et cadrer le pied coupait la tete.
2. L'ecart d'une couronne grandit avec la taille du sous-arbre, racine carree
   plafonnee a 1,9 : la grappe drum and bass s'ecrasait sur ses voisines.
3. `frameDistance` tient les deux axes, comme le cadrage de l'atlas : en fenetre
   etroite, une famille cadree sur la hauteur debordait des cotes.

Verdict apres correctifs : lisible a une vingtaine de genres par famille. La
grappe drum and bass reste dense au niveau famille, mais la descente-focus la
deplie. Au-dela d'une trentaine de genres par famille, il faudra soit scinder la
famille, soit n'etiqueter au niveau famille que la premiere generation.

---

## ADR-040 : Le lot d'interface d'aout, dix decisions en une passe

**Vocabulaire.** « Morceaux » devient « tracks » partout dans l'interface, au
feminin, usage de la scene. Un seul mot dans tout le site.

**Parutions completes.** Le matcher refuse les albums entiers : marqueurs de
titre (full album, album completo, LP, megamix, compilation, mix complet) et
duree au-dela de quinze minutes. La duree vient de la page de resultats de
recherche, oEmbed ne la donne pas ; l'audit des tracks en place la lit sur la
page de lecture. Les 339 tracks ont ete relues : 14 albums remplaces, 2 retraits
a la main dont le 1/1 d'Eno, 17 minutes reelles, que la regle refusera
toujours ; c'est un cout assume de la regle sur l'ambient. Garde-fou CI etendu.

**Systeme planetaire.** Ecarts de taille MARQUES entre generations, 4.6 puis
1.35 puis 0.5 puis 0.28 ; enfants sur un ANNEAU dans un plan proche de
l'horizontale, incline par famille ; l'etat compact montre deja la planete et
son premier anneau, les sous-satellites surgissent au deploiement.
L'appartenance se lit sans un seul label.

**Intro.** Naissance des familles en expansion RADIALE, camera immobile au
cadrage par defaut, 6 secondes, 350 ms par famille, liens traces depuis la
famille d'origine via l'avancement aMeta.z deja present dans le shader. Ordre
verifie contre le corpus : l'Ambient, nomme en 1978, nait avant l'Electro,
correction assumee de la liste de depart. Interruptible par tout geste, jouee
une fois, rejouable depuis les credits.

**Logo.** Double a 44 px. Balayage lumineux par masque en degrade respectant la
transparence : le PNG n'a pas de trace vectoriel, et la lumiere n'existant que
sur les pixels du glyphe, le point suit le trait. Arret onglet cache,
prefers-reduced-motion respecte.

**Labels.** Montserrat Black majuscules livree pour le deuxieme niveau,
auto-hebergee, 15,7 Ko. Le nom de famille passe avant tout, et le chevauchement
masque TOUJOURS : l'epinglage donnait un passe-droit, c'est ce qui superposait
Disco et Spacesynth.

**Navigation.** L'espace ouvre la recherche, la barre oblique reste en second ;
l'espace revient au lecteur quand le panneau tracks est ouvert. Une feuille
lance le lecteur directement ; la fiche reste accessible par le nom du genre,
desormais en evidence sur le panneau et cliquable.

---

## ADR-041 : Exceptions nommees, grands ensembles, Inter, cadrage mobile

> CADUC EN PARTIE (ADR-053) : la section « Grands ensembles, niveau zero »
> est annulée, le niveau zéro est supprimé. Le reste tient toujours.

**Exceptions de duree.** La regle des quinze minutes tuait des pieces uniques
legitimes. Une liste NOMMEE dans scripts/lib/match.ts, trois entrees maximum,
uniquement des pieces uniques jamais des albums : Brian Eno 1/1, Kraftwerk
Autobahn, Tangerine Dream Phaedra. Les marqueurs de titre (full album,
compilation...) refusent TOUJOURS, meme une piece exemptee. Le 1/1 d'Eno est
revenu dans le corpus par cette porte, documentee et testee dans check:matcher.

**Canon des genres muets.** 128 genres muets remplis par le meme pipeline que
les fondateurs (matcher durci, parutions completes refusees, rapport des refus
dans tracks-canon-report.md). Les genres ou le jugement compte restent a Mika,
liste dans tracks-muets.md.

**Grands ensembles, niveau zero.** Cinq super-familles (Quatre-temps,
Breakbeat, Racines et Disco, Atmosphere, Machine) dans structures.ts. De loin,
seuls leurs cinq noms s'affichent ; les familles se nomment en zoomant
(seuil : distance > 0,72 fois le cadrage par defaut). Leurs labels s'ancrent en
ESPACE ECRAN sous le membre le plus bas, chute bornee a 22 pour cent de la
hauteur, et remontent par pas de 24 px en cas de collision : un label
d'ensemble designe une region, le decaler ne le fait pas mentir, contrairement
a un label de genre qui se masque.

**Placement par proximite stylistique.** Les centres de familles ne sont plus
editoriaux : affinite = greffes croisees ponderees + proximite de tempo.
(Revu par l'ADR-053 : plus d'ensembles, l'anneau est celui des quatorze
familles directement.) Dans une famille, l'anneau se range par tempo
croissant.

**Labels toujours poses.** Le survol ne revele plus JAMAIS un nom : a chaque
niveau de zoom, tout ce qui est visible est nomme, et quand il y a trop de
monde on ne nomme que la generation courante, les suivantes apparaissent en
descendant. Regle : au niveau famille, la generation 1 ; en focus, le genre et
ses enfants directs.

**Inter partout.** Une seule fonte variable auto-hebergee (48 Ko) remplace
Montserrat ET la pile systeme : 700 familles, 600 genres, 500 tracks, 400
donnees, capitale initiale sauf les familles de tete en majuscules. Les poids
vivent dans tokens.css (--weight-*).

**Cadrage mobile.** Quatre causes reelles au mobile casse, quatre corrections :
1. MAX_DISTANCE etait a 520 alors que le portrait demande environ 800 unites
   de recul depuis que la relaxation ecarte les familles ; le plafond passe a
   1200, c'etait LE blocage que deux heuristiques successives ont masque.
2. Le cadrage par defaut est un drapeau EXPLICITE (cameraAtDefault), plus une
   comparaison de distances : on sort du cadrage en zoomant ou en volant, on y
   revient par recentrer ou remonter. Les heuristiques echouaient sur l'ordre
   d'initialisation.
3. En portrait l'atlas pivote de 90 degres dans le plan de l'ecran PUIS
   s'etire verticalement du facteur byWidth/byHeight (borne a 2,2) : la
   rotation seule laissait un atlas presque carre dans un ecran deux fois plus
   haut que large. L'etirement ne fait qu'augmenter les separations.
4. La correction MESUREE : la camera se pose au cadrage analytique, projette
   les quatorze familles avec leur rayon, et corrige la distance du facteur
   d'excedent en une passe. Gardee par engineReady contre la zone morte
   temporelle de l'initialisation.
Marges labels : 70 px lateraux, 48 px verticaux (96 mangeait la moitie d'un
telephone en paysage). Fil d'Ariane sous 600 px : deux segments et un chevron,
le chemin deplie DEFILE sur une ligne, il ne passe jamais a deux. Canvas en
dvh, controles a 16 px des bords avec env(safe-area-inset), cibles 44 px.
Verifie a 320, 390, 430 en portrait et paysage, et 1280 en repere.

---

## ADR-042 : Disposition fixe, lecteur droit, second corpus, donnees de sortie

**Disposition fixe.** L'orbite libre est ABANDONNEE. L'atlas est un arbre
genealogique couche : sur poste, familles de gauche a droite, une generation
par colonne ; sur mobile, la meme chose pivotee, une generation par rangee.
Positions deterministes au pixel pres, calculees par src/atlas/layout.ts
depuis le seul corpus. La camera ne fait plus que pan et zoom (zoom vers le
curseur) ; champ de 14 degres, quasi orthographique : la perspective ne
fausse jamais la lecture des tailles. Le Z ne sert qu'a la hierarchie : le
sous-arbre courant vient a plus 3 unites, le reste recule et s'estompe, les
positions dans le plan ne bougent JAMAIS. Les liens sont des Bezier cubiques
en S, points de controle calcules a la mise en page ; les liens entre
familles arquent dans la marge amont pour ne pas traverser les blocs.

**Croisements.** Les liens structurels forment un arbre par famille, dessine
en intervalles imbriques : ils ne PEUVENT pas se croiser. Les croisements
restants viennent des liens entre familles : l'ordre des familles se calcule
a la mediane des partenaires de greffe, par passes, a l'interieur des grands
ensembles ; l'ordre des enfants d'un parent utilise la meme mediane sur les
greffes externes, a defaut le tempo croissant.

**Labels garantis par la mise en page.** Chaque noeud possede un CRENEAU qui
comprend sa sphere et son nom : deux noms ne peuvent pas se recouvrir parce
que deux creneaux ne se recouvrent pas. Une generation s'affiche ENTIERE
quand son pas minimal projete depasse la hauteur de label, sinon elle attend
le zoom suivant ; en focus, le sous-arbre courant est toujours nomme.
Plancher 11 px, plafond 22 px, jamais de troncature. Le survol met en valeur
(halo de sphere), il ne revele NI ne masque JAMAIS un nom : check:labels
echoue desormais si la passe de labels mentionne le survol ou si un add()
recoit une opacite calculee. Le test de chevauchement au rendu reste comme
filet de securite ; mesure a la refonte : 36 labels, 0 collision.

**Cadrage par defaut : une PAGE.** Faire tenir la carte entiere donnait un
filet de poussiere. On cadre l'axe des generations en entier et la vue
s'ouvre sur la premiere tete de section, en haut sur poste, a gauche sur
mobile ; le reste se parcourt au pan. La borne haute reserve la marge du fil
d'Ariane, sinon la premiere tete de section disparaissait dessous.

**Lecteur.** La plaque inclinee dans la scene est abandonnee, avec son bus
de geometrie par image. Panneau DOM rectangulaire droit, voile qui estompe
la 3D derriere : pochette carree a gauche (la video prend sa place en
lecture), titre, artiste, GENRE en couleur de famille cliquable vers la
fiche, annee, label, catalogue, pays, format, tonalite et BPM quand ils
existent, liste verticale des tracks du genre ; transport pleine largeur
avec plein ecran et lien YouTube. L'iframe n'est toujours jamais demontee.

**Second corpus.** tracks-canon-2.md (Last.fm x RYM x Discogs) importe par
le pipeline durci : 142 tracks ajoutees, 814 au total. Charnieres declarees
avec reciprocite (Windowlicker en drill and bass, braindance et glitch,

etc.), resolution darkcore appliquee (sens breakbeat 92-93, le corpus la
portait deja, seul Doc Scott manquait). Les doublons NON declares (Block
Rockin' Beats en breakbeat quand bigbeat le tient) sont refuses et listes
dans tracks-canon-report.md : le partage se declare, il ne se devine pas.

**Donnees de sortie.** scripts/fetch-release-data.ts remplace l'album iTunes
par la sortie originale Discogs (label, catalogue, pays, annee, format),
correspondance exigeante : artiste conforme ET track presente dans la liste
de titres de la sortie relue en detail. scripts/fetch-key.ts releve la
tonalite sur GetSongKey, correspondance exacte, jamais deduite. Les deux
chantiers SE SAUTENT proprement sans jeton (DISCOGS_TOKEN, GETSONGKEY_KEY) ;
le panneau n'affiche que les champs presents, aucun gabarit vide.

---

## ADR-043 : Multi-vues, fiches enrichies, lecteur en colonne, animations

**Quatre vues au choix, des l'entree.** Le debat lineaire contre radial est
tranche par le haut : on ne choisit pas a la place de l'utilisateur. L'ecran
d'accueil propose quatre lectures de la meme carte, memorisees et
commutables a tout moment par le selecteur en haut d'ecran :
- 3D LIBRE : le moteur orbital d'avant ADR-042, ressuscite depuis git
  (webgl-orbit.ts). Systeme planetaire, orbite, deploiement. Adapte : types
  partages avec webgl.ts, plaque retiree, liens en Bezier (controles au
  tiers = segment droit), et le survol ne touche plus aux labels.
- 3D FIXE : l'arbre genealogique d'ADR-042, rangs RESSERRES d'un tiers
  (mission : « on scroll trop »).
- LINEAIRE : le corpus en document DOM dense, ensembles en sections,
  familles en blocs teintes, rangees indentees par generation.
- COLONNES : les memes blocs en maconnerie multi-colonnes, quatorze cartes.
Les vues DOM n'ont pas de moteur : fiche et lecteur y fonctionnent pareil.
check:labels couvre LES DEUX moteurs, un ressuscite n'a pas de passe-droit.

**Fiches enrichies, le vrai contenu du site.** Cinq champs par genre au
schema : description (3-5 phrases, ton d'auteur), machines (precises :
TB-303, Amen break, log drum...), labelsHistoriques, labelsActuels (VIDE =
genre eteint, 33 cas, l'interface l'ecrit), artistesCles. Les 216 genres
sont remplis ; 11 fiches sur les terrains reserves a Mika portent
redaction: 'brouillon' et un badge « a relire ». La fiche (GenreCard) est
remise en page : en-tete, description a 65ch, machines, labels en deux
colonnes, artistes, filiations, ecoute.

**Lecteur en colonne laterale.** La carte reste VIVANTE : colonne droite de
clamp(380px, 30vw, 420px), le canvas se recadre en douceur (largeur
explicite : un element remplace ne s'etire pas entre left et right, piege
CSS reel). Cliquer un autre genre remplace le contenu de la colonne, la
lecture ne s'arrete jamais ; fermer la reduit en barre discrete. Mobile :
feuille du bas a trois positions (barre, moitie, plein ecran) au glissement
vertical. La colonne embarque les infos du genre, repliables et ouvertes
par defaut. La duree n'est affichee que pour la track en cours : c'est la
seule que le lecteur connait, on n'invente pas les autres.

**Animations sobres.** Respiration des spheres 2 pour cent, phase decalee
par noeud ; survol +8 pour cent lisse (~150 ms) et liens du noeud eclaires ;
fondu-glissement 12 px / 200 ms a l'ouverture de fiche ; flux lumineux lent
le long des liens du chemin actif (bande de 7 s dans le shader, uFlowTime) ;
transitions en easing doux. Tout coupe par prefers-reduced-motion. Piege
GLSL de plus : `active` est un mot RESERVE, le flux s'appelle onPath.

**Charnieres tranchees.** Block Rockin' Beats, Hyph Mngo, Little Fluffy
Clouds, Space Invaders Are Smoking Grass, Pacific State : declarees des deux
cotes. Do You Mind est un cas interne a ukfunky (meme video que la version
Kyla), rien a declarer.

**Regression trouvee et reparee.** fetch-covers.ts gardait DEUX ecritures
brutes de son instantane de demarrage en plus de l'ecriture par fusion :
elles ont efface le lot de charnieres Windowlicker importe pendant que la
passe tournait. Les deux ecritures passent desormais par la fusion, et le
lot a ete reimporte. Regle confirmee : AUCUNE ecriture du corpus sans
relecture du disque.

**Discogs et tonalite.** DISCOGS_TOKEN attendu de Mika : fetch-release-data
est pret a lancer tel quel. GetSongKey est abandonne pour l'instant
(couverture insuffisante pour le cout) ; le script et le champ conditionnel
restent.

---

## ADR-044 : Un seul chemin d'ecriture, noms toujours poses, genres eteints

**Le corpus n'a plus qu'UN chemin d'ecriture.** Apres le deuxieme ecrasement
de donnees par fetch-covers (meme cause : reecriture de l'instantane de
demarrage), la classe d'erreur est interdite structurellement.
scripts/lib/corpus-store.ts est le seul module qui ecrit corpus.json :
patchTracks(champs, patches) relit le disque et n'applique que les champs
possedes par videoId ; transaction(fn) relit le disque et fait REJOUER les
ecritures structurelles sur l'etat frais (import, audit, fetch-tracks ont
ete convertis en journaux d'operations rejouees, preconditions
reverifiees). Aucune API n'accepte un objet corpus complet.
check:writes echoue en CI si un script fait autrement.

**Noms toujours poses (quatrieme durcissement de la regle labels).** Plus
aucune porte de zoom, dans AUCUN moteur : les noms des styles sont toujours
candidats, familles et satellites visibles compris. Quand la place manque
physiquement, le placement garde ensembles, puis familles, puis generations
hautes, et masque le reste : on ne superpose jamais, on n'exige jamais un
zoom pour qu'un nom existe. Deux corrections l'ont rendu tenable : la
largeur des labels est MESUREE (canvas 2D, fonte reelle, interlettrage
ajoute ; l'estimation au glyphe moyen sous-estimait les capitales espacees
de moitie), et la tolerance de chevauchement passe de 4 px a 1 px. Mesure
au moment du changement : 41 noms poses, 0 recouvrement.

**Genres eteints visibles dans la carte.** labelsActuels vide = genre
eteint (33 cas). La sphere devient plus mate et moins lumineuse (attribut
aExtinct : liseret presque eteint, desaturation 42 pour cent, luminosite
-16 pour cent), la pastille des vues DOM devient un anneau. Discret : on
voit d'un coup d'oeil ce qui vit encore, sans marquage brutal.

**Vue par defaut : 3D libre** (verdict de Mika). Les quatre vues restent,
un choix memorise est respecte.

---

## ADR-045 : Placement par niveaux, Discogs en valeur, recherche outil

**Placement des labels PAR NIVEAUX.** Verification demandee par Mika : la
boucle gourmande masquait bien un nom parce que son voisin etait passe
avant lui, la logique refusee. Remplacee dans les deux moteurs par un
placement par niveaux (ensembles, familles, puis generations) : un nom ne
cede qu'a un nom de NIVEAU SUPERIEUR deja pose (sa sphere est un objet de
lecture plus petit a ce zoom), et a NIVEAU EGAL deux noms qui se chevauchent
cedent TOUS LES DEUX, personne ne gagne par ordre d'arrivee. Deterministe et
independant de l'ordre de parcours. (L'exception des grands ensembles est
caduque depuis l'ADR-053 : ils n'existent plus.)

**Discogs.** Passe lancee par Mika a travers corpus-store, pendant que la
mission ecrivait ailleurs : zero conflit, le verrou a fait ses preuves le
jour de sa pose. Couverture 86 pour cent (712/824), aucune famille sous
75 : pas de probleme de correspondance systemique. Les 112 echecs sont des
titres a suffixe de mix et des artistes a creditation multiple ;
fetch-release-data a recu des REPLIS de recherche (titre sans parentheses,
artiste sans feat/and/vs) qui elargissent la recherche sans assouplir
l'acceptation. A relancer pour tenter le reliquat.

**Donnees de sortie en valeur.** Dans la colonne du lecteur : ligne dediee
label + numero de catalogue avec du poids typographique (le label de disque
compte autant que l'artiste pour du digging), pays et format en dessous,
plus discrets. Chaque champ seulement s'il existe.

**Recherche etendue.** Genres, ARTISTES, TITRES et LABELS de disque,
resultats groupes par type. Un artiste ou un label ouvre la liste de ses
tracks au corpus avec le genre de chacun : la rangee ouvre le lecteur, la
pastille de genre vole vers la carte. Les labels viennent des donnees de
sortie : un track sans sortie relevee n'apparait pas cote labels.

**Credits.** Les bases sont nommees : Discogs, Last.fm, RateYourMusic,
Deezer, iTunes, YouTube. Toujours aucun guide de cartographie nomme.

---

## ADR-046 : Le clic ouvre directement les tracks, la fiche vit dans la colonne

**Plus de panneau de fiche flottant.** Cliquer une sphere ouvre immediatement
la colonne de droite, prete a jouer, dans TOUTES les vues. Le contenu de la
fiche demenage dans la colonne. Hierarchie, de haut en bas : nom du genre en
grand, famille en couleur, BPM, badges debattu et brouillon ; pochette,
titre, artiste, transport (desormais dans le flux) ; la liste des tracks ;
les infos du genre, ouvertes par defaut ; les FILIATIONS, qui survivent au
demenagement : vient de, a donne, greffes, charnieres, aussi appele, toutes
cliquables, un clic fait voler la camera et remplace le contenu de la
colonne. Un genre a derives deploie son sous-arbre sur la carte en meme
temps : ouvrir les tracks n'empeche jamais de descendre. Aucun geste cache.
GenreCard et genre-card.css sont supprimes, onGenreInfo retire de l'API des
moteurs.

**Revue de finition.** Un vrai bug attrape : PlayerLayer etait demonte
pendant la transition de vue (mode attente), ce qui detruisait l'iframe et
coupait la lecture. Le lecteur est desormais monte EN PERMANENCE, sans
condition de mode. Verifie apres correction : la lecture survit au
changement de vue, de genre, a la fermeture de colonne (barre discrete) et
a la reouverture ; les quatre vues passent a 390 px sans debordement ; la
colonne du lecteur survit au changement de vue.

**Discogs.** Le jeton annonce n'est arrive ni dans l'environnement ni dans
un fichier : la relance avec les replis n'a pas pu etre lancee, le taux
reste 86 pour cent (712/824). Le script est pret, la commande est
DISCOGS_TOKEN=... npm run fetch:release.

---

## ADR-047 : Etat de chargement, erreurs YouTube, revue de sincerite

**Etat de chargement.** Un splash inline dans index.html (logotype, ligne de
progression, styles inline) est visible des le premier octet et remplace le
noir pendant le chargement du corpus et de la 3D. React l'efface au montage.

**Erreurs YouTube.** onError du lecteur officiel : video retiree (100) ou
bloquee a l'integration ou par pays (101, 150) affiche un message honnete et
passe a la suivante apres 1,6 s ; un tour complet d'echecs arrete la lecture
au lieu de boucler. Le message vit dans la colonne et dans la barre.
Chemin de code NON testable a la demande (impossible de forcer un blocage) :
verifie par lecture, assume comme tel.

**Credits et index.** Les deux liens vivent dans un pied commun rendu dans
TOUTES les vues, moteur ou DOM.

**Revue de sincerite (demandee apres le bug du lecteur demonte).** Les
verifications qui testaient la mauvaise chose ont ete REFAITES en mesurant
la bonne : la lecture qui survit se prouve par le temps ecoule qui avance
apres la bascule de vue ; la carte vivante par un zoom qui agit colonne
ouverte ; le deploiement des derives par leurs labels de generation 2
presents apres le clic ; la position barre de la feuille par un glissement
synthetique. Reste NON prouve visuellement, dit tel quel : la matite des
spheres eteintes, la respiration et le survol, le flux dans les liens, le
deroule image par image de l'intro, le toucher physique reel de la feuille,
et la gestion d'erreur YouTube. Le detail est dans le rapport de mission.

**Jeton Discogs.** Toujours introuvable sur cette machine (ni environnement
ni .env, cherche jusque dans le dossier parent et le home). Les scripts a
jeton lisent desormais AUSSI un .env a la racine (parseur minimal sans
dependance) : des que le fichier existe reellement, la relance part.

---

## ADR-048 : Quand on ne peut pas voir, on mesure (verify:visual)

**Le principe.** Les effets visuels non verifiables a l'oeil par la machine
sont MESURES : npm run verify:visual documente la marche (ouvrir l'app avec
?verify, vue 3D libre), le module src/atlas/verify-visual.ts fait quatre
controles et affiche le JSON. Pas en CI : il faudrait embarquer un
navigateur headless ; execution manuelle documentee, ~50 secondes.

**Les quatre mesures et ce qu'elles ont attrape.**
1. MATITE DES ETEINTS : deux spheres cote a cote dans un canvas de test,
   lecture des pixels. Premiere mesure : -27,5 / -26,4 au lieu de -42 /
   -16 ; les coefficients du shader etaient deduits, pas calibres. Ils sont
   desormais CALIBRES par la mesure (mix 0.64, assombrissement 0.04, le
   lisere reduit pesant deja douze points) : -48,2 / -16,1, dans la
   tolerance.
2. RESPIRATION / SURVOL / FLUX : la respiration mesuree a 0,13 % par un
   test dont la fenetre (2 s) etait courte devant la periode (14 s) : le
   TEST etait faux, pas l'effet ; corrige, 2,00 % mesure. Le survol :
   +8,56 %. Le flux : le max global etait la tete de propagation, fixe ;
   le test soustrait desormais un profil de reference sans flux, et la
   bande se deplace de 32 px entre deux instants.
3. INTRO : 39 spheres a 1 s, 139 a 3 s, 216 a 5 s : la progressivite
   existe.
4. RECOUVREMENT SOUS ROTATION : 12 azimuts x 3 distances. La mesure a
   attrape une paire reelle (Disco / Disco Dub, 3 px) : la hauteur de
   ligne HERITEE du body (1.65) rendait la boite reelle plus haute que la
   boite estimee (1.45). line-height: 1.3 explicite sur les labels, et le
   pire cas est retombe a ZERO paire sur les 36 poses.

**Lecon consignee.** Deux des quatre echecs initiaux etaient des tests qui
mesuraient mal, deux etaient des effets mal calibres. Les deux se corrigent,
et on dit lequel etait lequel.

**Discogs.** Relance executee avec les replis (jeton via .env, lu par le
script depuis cette mission) : +25 sorties sur les 109 interrogees, 737/824
au total, 86 vers 89 pour cent. Le reliquat (87) est essentiellement des
white labels, des editions confidentielles et des credits introuvables sur
Discogs par ces requetes.

---

## Pièges GLSL rencontrés, à ne pas repayer

Trois erreurs coûteuses rencontrées sur le prototype de rendu. Elles ne
produisent aucun message clair et se diagnostiquent mal : autant les écrire.

**`half` est un mot réservé en GLSL.** `vec2 half = ...` échoue à la
compilation avec « Illegal use of reserved word ». Le message pointe la bonne
ligne, mais on cherche ailleurs parce que le mot paraît anodin.

**`fwidth` renvoie 0 dans le chemin GLSL 1.0 que three utilise par défaut**,
même sur un contexte WebGL 2. Conséquence indirecte et silencieuse :
`smoothstep(a, a, x)` avec `a` identique des deux côtés est **indéfini** et
produit un NaN. Aucun `discard` ne se déclenche, aucune erreur n'est levée, et
rien ne s'écrit à l'écran. Ne jamais dériver un seuil de `fwidth` sans plancher.
Pour l'antialiasing d'un ruban, la couverture analytique à partir de la largeur
connue est plus sûre et plus rapide.

**`camera.matrixWorldInverse` n'est mis à jour que par le rendu.** Appeler
`Vector3.project(camera)` juste après avoir déplacé la caméra, mais avant
`renderer.render`, projette avec la matrice de l'image précédente. Les labels
DOM dérivent d'une image, ce qui se voit surtout en rotation rapide. Il faut
`camera.updateMatrixWorld()` **puis**
`camera.matrixWorldInverse.copy(camera.matrixWorld).invert()`.

**Corollaire de méthode.** Un ruban élargi en espace écran, par conversion
pixels vers NDC, s'est révélé impossible à faire fonctionner de façon fiable aux
largeurs réalistes. L'élargissement en espace monde, perpendiculairement à la
tangente et face à la caméra, avec un plancher exprimé en pixels converti en
unités monde, fonctionne du premier coup et se raisonne bien mieux.

---

## ADR-049 : Dark disco vérifiée, confort de lecture, identité d'écran d'accueil

**Date** : 2026-08-09.

**Contexte.** Mission en cinq chantiers : intégrer les données dark disco /
indie dance vérifiées à la main par Mika (le seul chemin qui permette de
compléter une fiche de genre : les fiches restent en brouillon tant que lui
seul ne les a pas tranchées), améliorer trois points de confort du lecteur et
de la carte, et donner au site une identité d'écran d'accueil correcte sur
iOS.

**Décisions.**

1. **Dark disco et indie dance sortent du brouillon.** Cinq tracks ajoutées
   par le matcher autoritaire (5/5 à 1.00/1.00, aucune exception) : Pardon
   Moi « Power To The People (Damon Jee Remix) » (2017, rôle origine),
   Damon Jee « Bladed », Darlyn Vlys « Modelo 303 », Freudenthal remix de
   « Missing Love », AFFKT « Revolte ». Descriptions, artistes et labels
   fournis par Mika, recopiés tels quels. `redaction` retiré des deux
   fiches ; il en reste neuf en brouillon dans `fiches-brouillon.md`.

2. **Curseur de progression saisissable.** 8 px au repos, 12 px au survol,
   poignée visible, zone cliquable étendue à 24 px par un `::before` ; en
   mobile 10 px et zone tactile 44 px. La zone d'interaction est plus large
   que le dessin : c'est elle qui compte, pas l'épaisseur visuelle.

3. **Chaque rangée de la liste porte tout ce qu'on sait** : titre, artiste,
   puis année · label · catalogue quand ils existent (`pcol-row-meta`,
   chiffres tabulaires, ellipse). La track en cours reste distinguée.

4. **Vol de caméra 600 → 850 ms**, sortie cubique douce `1-(1-t)³`, sans
   rebond, dans les deux moteurs. Piège récidivant : les deux moteurs
   (webgl.ts et webgl-orbit.ts) ont chacun leur copie de l'easing et de la
   durée ; un patch sur un seul des deux passe inaperçu à l'œil pressé.

5. **Icônes iOS opaques.** L'apple-touch-icon précédent portait un canal
   alpha mais était déjà entièrement opaque (mesuré : `opaque: True`).
   Régénéré quand même sans canal alpha (`-alpha off`), fond `#0a0c10`,
   S du monogramme à 70 % de la largeur, coins carrés (iOS applique son
   propre masque). Favicons 16/32/.ico refaits depuis la même source à
   85 %, icônes PWA 192/512 + maskable (S à 55 %, marge de sécurité 20 %).
   `apple-mobile-web-app-capable` + `status-bar-style black-translucent`
   ajoutés ; manifest : `start_url` et `scope` absolus `/Sonaa/`,
   `background_color` aligné sur `#0a0c10`. Les `env(safe-area-inset-*)`
   étaient déjà posés sur les contrôles, le sélecteur de vues et la feuille
   du lecteur — vérifiés, pas retouchés.

---

## ADR-050 : Le corpus complet, la signature aux crédits, la colonne réglable

**Date** : 2026-08-09.

**Contexte.** Verdict de Mika sur l'intégration de sa propre musique, et
mission d'ampleur : aucun genre vide, les meilleures tracks de chaque style
et les meilleures récentes, la colonne réglable à la souris, le tout vérifié.

**Décisions.**

1. **Aucune track de Maudite Machine dans les listes canoniques, jamais.**
   Un atlas qui cite son auteur parmi les canons des genres perd sa
   crédibilité. La signature du projet vit dans les crédits, section
   L'auteur : Michael Sanchez, alias Maudite Machine, fondateur de VRSTL
   Records, avec les liens. C'est la seule place du site où l'auteur existe.
   L'assemblage du canon jette mécaniquement toute ligne « Maudite Machine »
   avant même le matcher.

2. **L'onglet Actuel existe enfin dans les données.** Avant cette mission,
   216 genres sur 216 avaient un onglet Actuel vide. Recherche par familles
   (Reddit, RYM, presse spécialisée, croisée avec la connaissance des
   scènes), candidates 2019-2026, puis LE MÊME matcher autoritaire que tout
   le reste : rien n'entre sans correspondance titre ET artiste sur YouTube.
   Les genres historiquement éteints gardent un Actuel court ou vide, c'est
   un fait documentaire et non un manque.

3. **Plus aucun genre vide.** Les sept genres à zéro track (psybreaks,
   psycore, rominimal, skweee, suomisaundi, twilightpsy, zenonesque) et les
   vingt-trois à une ou deux reçoivent un canon sourcé, au matcher toujours.
   La déduplication contre le corpus ET intra-fichier se fait avant import :
   une track déjà présente dans un autre genre n'est pas dupliquée sans
   déclaration de charnière (règle des doublons, ADR antérieur).

4. **La colonne se règle à la souris.** La largeur vit déjà dans la variable
   --player-w que la carte recadrée et la colonne partagent : la poignée
   (bord gauche, zone de 10 px, curseur col-resize, clavier flèches) ne fait
   que régler la variable, bornée à [320 px, min(640 px, 50 vw)], retenue
   par localStorage. Piège mesuré : la transition de 300 ms sur la carte
   GÈLE sa largeur quand seule la variable change ; toute écriture de
   largeur coupe donc la transition (attribut data-player-resizing), le
   drag pour sa durée, le pas clavier pour deux frames.

5. **Boîte testée = boîte rendue, prouvé par la machine.** Nouveau crochet
   labelSnapshot() dans LES DEUX moteurs 3D : les boîtes que l'arbitrage a
   réellement testées. Nouveau contrôle verify:visual « boites » : chaque
   boîte testée est confrontée à la boîte DOM affichée (position au pixel
   près, l'estimation doit majorer la réalité). Les vues Linéaire et
   Colonnes n'ont pas de passe de placement : leurs noms sont en flux de
   document, le recouvrement y est impossible par construction.

---

## ADR-051 : Le doigt commande, l'interface s'efface

**Date** : 2026-08-09.

**Contexte.** Trois verdicts d'un coup : les gestes tactiles sont nerveux et
le pincement ne marche pas ; l'écran se lit mal quand les tracks sont
ouvertes ; le chrome (sélecteur de vues, contrôles, HUD Mesures) encombre.

**Décisions.**

1. **Suivi direct des gestes.** L'ancien modèle accumulait de la VÉLOCITÉ à
   chaque événement de glissement : la carte dépassait le doigt. Désormais
   le glissement tourne l'orbite PENDANT le geste (gain 0,013 rad/px, la
   moitié de l'effectif d'avant), l'inertie n'existe qu'au relâchement,
   courte et vite amortie. Le pincement à deux doigts existe enfin : dolly
   continu au rapport d'écartement (exposant 0,55), ANCRÉ au milieu des
   doigts (le point du monde sous ce milieu y reste, résolu sur le plan de
   la cible face caméra), inertie légère au relâchement. Double tap : zoom
   sur le point touché, second double tap revient au cadrage d'avant ; le
   tap simple attend 280 ms sur tactile, comme une carte native. Molette
   divisée par deux dans les deux moteurs. Piège de test : setPointerCapture
   JETTE sur un pointeur synthétique et coupait l'initialisation du geste,
   la capture est blindée.

2. **Vue dédoublée.** Feuille mobile à mi-hauteur : la carte vit dans la
   zone haute (48 dvh, hauteur EXPLICITE, canvas est un élément remplacé) et
   se recadre sur la FAMILLE ENTIÈRE du genre ouvert, pas le genre seul ;
   le genre reste marqué par son halo et son label épinglé. Même logique en
   desktop avec la colonne. Le suivi de cible du panneau vise le centre de
   famille, plus la sphère du genre. Le recadrage se rejoue quand la zone
   change (ouverture, position de feuille), après que l'observateur de
   taille du moteur a vu la nouvelle zone. Feuille en barre ou fermée :
   pleine hauteur sans changer de cadrage.

3. **Le chrome s'efface.** Plus de barre de vues permanente : le choix vit
   au pied de page avec Crédits et Index. Les contrôles passent en HAUT
   DROIT : trois ronds blancs de 44 px à glyphes noirs (plus, moins,
   recentrer), ombre douce, sans bordure, estompés à 60 % après 3 s
   d'inactivité, réveillés au moindre geste, sous env(safe-area-inset-top).
   Le HUD Mesures est retiré (le système ?verify reste l'appareil de
   mesure). Le logotype ramène à l'accueil : cadrage d'ensemble, fil
   d'Ariane remis à zéro, et la lecture en cours passe en barre discrète au
   lieu de se couper (événement sonaa:home, tranché par le lecteur).

4. **Favicon calligraphique.** Le recadrage du monogramme se lisait « d » à
   16 px quelle que soit l'épaisseur : la topologie était le problème, pas
   le trait. Nouveau S à TOPOLOGIE DE S, plume large simulée (double trait
   décalé en diagonale), penche cursive, testé au rendu à 16, 32 et 180 px.
   Clair sur sombre et sombre sur clair, basculés par prefers-color-scheme.

---

## ADR-052 : Le favicon est le S du logo, littéralement

**Date** : 2026-08-09.

**Contexte.** Verdict : le S vectoriel « inspiré » du logo n'est pas le
logo. La consigne est littérale : découper le S calligraphique de
sonaa-logo.png, aucun redessin, aucune interprétation.

**Décisions.**

1. **Des pixels du logo, rien d'autre.** Découpe de sonaa-logo.png
   (11104×4808) : boîte 0,0 à 3710,4808, puis gommage des SEULS fragments
   étrangers entrés dans la boîte (flanc gauche du o, pointe du parafe
   final du mot) — de l'effacement, jamais un tracé. Le trait de liaison
   vers le o et l'attaque haute sont coupés au bord : c'est la découpe.
   Glyphe teinté ivoire (#f2f4f8) par recoloration du masque, formes
   intactes, sur carré opaque #0a0c10, S à 80 % de la hauteur.

2. **Dilatation sous 32 px, seule retouche autorisée.** Les déliés cassent
   à 32 et 16 (mesuré au rendu) : dilatation morphologique du découpage
   (Disk:12 pour 32 et 48, Disk:22 pour 16). Le 180 et les icônes PWA
   restent purs. RÉSERVE ENREGISTRÉE : à 16 px la calligraphie reste
   difficile à lire ; l'identité visuelle prime sur la lisibilité à très
   petite taille, verdict de l'auteur, on n'y revient plus.

3. **À propos (#/a-propos)** : ce que c'est, comment le lire, l'auteur, la
   méthode ; comptes calculés du corpus. **Icônes des contrôles** : Font
   Awesome Free en SVG inline (free-solid-svg-icons importé à la pièce),
   crosshairs pour recentrer (house ferait doublon avec le logo-accueil),
   attribution CC BY 4.0 aux crédits, aucun appel tiers au runtime.

---

## ADR-053 : Plus de niveau zéro, l'atlas a trois niveaux

**Date** : 2026-08-09.

**Contexte.** Verdict : les grands ensembles (Quatre-temps, Breakbeat,
Racines et Disco, Atmosphère, Machine) n'apportent rien et leurs noms sont
artificiels.

**Décisions.**

1. **Trois niveaux, et seulement trois** : les quatorze familles, les
   genres, les sous-genres. SUPERFAMILIES disparaît du modèle, du layout,
   des deux moteurs 3D et des vues document. Au premier affichage, les
   quatorze familles sont directement nommées ; le fil d'Ariane va d'ATLAS
   à la famille. Le cadrage par défaut montre les quatorze familles
   entières (il était déjà calculé sur l'étendue réelle).

2. **L'anneau des quatorze remplace l'anneau des cinq.** Même affinité
   (greffes croisées pondérées + proximité de tempo), mais les voisinages
   EXIGÉS portent un bonus explicite pour être garantis et non espérés :
   Hardcore-Techno, Hardcore-Breaks, Psy-Trance, Minimal-Techno,
   Minimal-House, Bass-Breaks, Downtempo-Ambient, Disco-House, Disco-Roots.
   Quatorze départs gloutons affinés par 2-opt, meilleur anneau gardé,
   départages alphabétiques : déterministe. Un seul départ laissait le
   2-opt dans un optimum local qui éloignait Hardcore de Techno (mesuré) ;
   avec quatorze départs, LES NEUF PAIRES EXIGÉES SONT TOUTES VOISINES
   DIRECTES. La vue fixe et les vues document empilent les familles dans
   l'ordre du même anneau.

3. **Simplifications en cascade.** Plus de labels ancrés en écran
   (screenDy), plus d'exception au placement par niveaux (les familles
   cèdent entre elles comme tout le monde), plus de kind « ensemble »,
   check:labels passe de six à quatre sites d'appel. Les sections
   d'ensemble des vues Linéaire et Colonnes deviennent une liste de
   familles dans l'ordre de l'anneau.

**Caducité.** ADR-041, section « Grands ensembles, niveau zero » : annulée.
Les mentions d'exception des ensembles dans le placement par niveaux :
annulées.

---

## ADR-054 : Hip-Hop et Reggae, ancres de la famille roots

**Date** : 2026-08-09.

**Décisions.** Deux points d'ancrage ajoutés à roots, SANS descendance ni
sous-genres : ce sont des racines que l'électronique cite, pas des
branches que l'atlas développe. Même patron que Funk : rattachement
conventionnel à la racine de l'arbre (structuralOnly), note explicite,
description qui dit le rôle d'ancre ET le périmètre. Hip-Hop est parent
supplémentaire de Breakbeat Hardcore, Electro Funk, Trip-Hop, Trap,
Footwork, Juke, Jersey Club et Baltimore Club ; Reggae de Dub, Jungle,
Dubstep, Raggacore et UK Funky. Huit tracks au matcher (8/8 exact).
AUCUNE AUTRE FAMILLE NON ÉLECTRONIQUE NE SERA AJOUTÉE : acté.

---

## ADR-055 : Étalement du déploiement, chiffres exacts plutôt que promesse

**Date** : 2026-08-09.

**Décisions.**

1. **L'anneau se dimensionne pour les NOMS.** Pas minimal par enfant en
   unités monde (7 en première génération, 8 en profondeur), orbite liée à
   la population du sous-arbre, deux rangs quand la couronne dépasse sept
   (majeurs dedans, angles décalés d'un demi-pas). Les GÉNÉRATIONS
   S'ÉTIRENT VERS L'EXTÉRIEUR : les enfants d'un noeud en orbite occupent
   l'arc qui tourne le dos au centre — sans ça, les lignées profondes
   s'enroulaient en grappe (mesuré : 4 genres de Breaks nommés sur 23).
   La caméra recule seule (cadrage mesuré) et les voisines s'écartent
   seules (poussée indexée sur le rayon déployé mesuré, lerp doux).

2. **La famille ouverte est l'objet de lecture.** Ses genres passent avant
   ceux des familles fermées entrées dans le champ (niveau déclaré). Son
   NOM descend sous le système déployé : posé au centre, il écrasait
   systématiquement le fondateur (Chicago House, Breakbeat, mesuré).

3. **Résultat mesuré, pas promis.** À 1280 px colonne ouverte :
   House 9 → 14 sur 24, Breaks 4 → 10 sur 23. À 390 px feuille à
   mi-hauteur : House 8 sur 24, Breaks 2 sur 23. L'OBJECTIF DE 100 % N'EST
   PAS ATTEINT. Cause structurelle : dans un layout planétaire, les
   dérivés d'un même parent partagent un petit anneau ; la couronne de
   Drum and Bass (8 noms, ~600 px de texte) tient sur ~150 px d'écran au
   cadrage famille. Aucune police ≥ 9 px ni étalement raisonnable ne
   résout ça sans casser la lecture d'appartenance. Pistes tranchables :
   lignes de rappel en éventail (le nom s'éloigne, un trait le relie),
   ou accepter que la colonne — qui nomme déjà 100 % des genres — est la
   liste exhaustive, la carte étant le paysage.

---

## ADR-056 : Un seul niveau déployé à la fois

**Date** : 2026-08-09.

**Contexte.** Le diagnostic de l'ADR-055 (cause géométrique, pas
typographique) a été accepté : on arrête d'optimiser la taille et on change
la règle.

**Décisions.**

1. **Un seul niveau déployé.** Ouvrir une famille déploie SES ENFANTS
   DIRECTS, pas les petits-enfants. Les sous-genres restent repliés sur
   leur parent, signalés par l'anneau indicateur et le compteur de la
   fiche. Cliquer un genre à dérivés descend d'un cran : ses enfants se
   déploient, la génération du dessus se resserre et s'estompe (grammaire
   de focus existante). Un genre SUR le chemin ouvert reste toujours
   déployé — sans cette exception, le genre cliqué disparaissait quand il
   vivait en profondeur 2.

2. **Le cadrage suit le niveau, pas l'arbre.** Nouveau `crownRadius`
   (fondateur + première génération) : c'est lui que la caméra cadre à
   l'ouverture. `frameCurrent()` remplace `frameFamily()` côté coquille :
   re-cadrer la famille écrasait le cadrage de descente. Le rayon de
   descente se mesure sur les positions DÉPLOYÉES et non courantes : au
   moment du clic les enfants sont encore repliés, et mesurer là collait
   la caméra au genre.

3. **Labels de genres posés vers l'extérieur de leur anneau.** Centrés sur
   la sphère, huit noms d'une couronne se battaient contre le fondateur au
   centre et six tombaient. Repoussés radialement depuis le centre de leur
   système (rayon projeté + demi-boîte), leur écart angulaire les sépare de
   lui-même. Bandes de chrome amincies (64/74 → 44/36) : les contrôles sont
   partis en haut à droite, elles mangeaient une demi-couronne à 390 px.

4. **Chiffres mesurés, enfants directs nommés.**
   1280 px, colonne ouverte : **House 9/9, Breaks 6/6 — 100 %**.
   390 px, feuille à mi-hauteur : House 6/9, Breaks 3/6 (contre 3/9 et 2/6
   avant les labels radiaux). LA DESCENTE D'UN CRAN N'EST PAS ENCORE
   FONCTIONNELLE : sur Drum and Bass, 0 enfant sur 6 nommé, le vol de
   descente et le suivi de cible du panneau se contredisent quand un
   panneau est déjà ouvert sur un autre genre de la famille. À reprendre
   isolément.

---

## Points ouverts

Aucun. Les trois arbitrages en attente ont été tranchés : React 19 (ADR-012), échelle
à rupture unique déclarée (ADR-015), sortie d'iCloud avec historique neuf (ADR-016).
