# SONAA, clôture. Trois vues, sept dettes, dix contrôles.

**20 août 2026.** Dernier commit publié : `773c3e5`. Dépôt propre.
`https://sonaa.ca`, GitHub Pages, déploiement automatique à chaque poussée sur
`main`.

**Ce document remplace le précédent.** Il est écrit pour quelqu'un qui arrive
dans six mois et ne doit rien redécouvrir. Ce qui y est mesuré l'est ; ce qui
ne l'est pas est dit comme tel.

---

## 0. Les trois gestes d'ouverture de session

1. `npm run check:orphelins` : révèle le travail vivant hors de `main`. Onze
   commits ont déjà vécu ainsi.
2. Lire la section 2 de ce document, les dettes.
3. **Si le sujet touche au téléphone :** toucher une famille sur la carte, sur
   un vrai téléphone, puis lire `window.__atlas.journalTaps()`. C'est la seule
   dette dont la vérification n'a jamais pu être faite ici.

**Publier uniquement par `npm run publier`.** Elle enchaîne les dix contrôles,
refuse en code non nul si l'un échoue ou si le dépôt n'est pas propre, et ne
pousse que si tout passe. Elle a refusé quatre fois pendant la dernière
session, quatre fois à raison.

---

## 1. L'état du produit

**219 genres, 14 familles, 1783 morceaux vérifiés.** 1 morceau marqué comme
origine, 1216 comme canon. 40 filiations débattues, 95 greffes entre familles.
Aucun morceau sans date affichable, aucun morceau mort.

React 19, Vite 5, TypeScript strict, three.js. Cent pour cent statique :
Supabase ne sert qu'aux contributions, jamais à l'affichage.

### Les trois vues

**La carte en trois dimensions.** Vue d'ensemble des quatorze familles, un
genre ouvert montre sa sphère au centre et ses dérivés en plaques. Sur
téléphone elle démarre directement sur la carte, les listes de navigation
étant masquées : la couche ne garde que son fil d'Ariane, sa loupe et le
bouton de compte.

**La chronologie.** Frise des genres dans le temps, par famille. Route
`#/chronologie`. Non touchée depuis longtemps.

**La carte de chaleur.** Route `#/heatmap`. Des rectangles imbriqués, la
taille dit le poids, la couleur dit la famille, tout tient sur un écran sans
zoom ni déplacement.

Le sélecteur des trois vues vit dans le pied de page et reste touchable sur
téléphone, vérifié par `elementFromPoint`.

### Ce que la carte de chaleur mesure, et ce qu'elle n'est pas

**Par défaut, le poids généalogique** : le nombre de genres qui descendent
d'un genre dans l'arbre structurel, **plus le genre lui-même**. Ce « plus un »
n'est pas du confort : 139 genres sur 219, soit 63 %, sont des feuilles et
pèsent zéro. Sans lui, les deux tiers de l'atlas n'auraient aucun rectangle.

**Un curseur glisse vers la popularité**, mesurée par la **médiane** des vues
des morceaux du genre, et non leur somme. La médiane parce que dans presque
deux tiers des genres un seul morceau viral pèse plus que tous les autres
réunis, et parce qu'une somme est biaisée par le nombre de morceaux choisis,
qui est une décision éditoriale. Corrélation entre ce nombre et la mesure :
0,38 avec la somme, **0,14 avec la médiane**.

**La popularité est convertie en rang de 1 à 12, et c'est un choix éditorial,
pas une mesure.** L'écart réel entre le genre le plus écouté et le moins
écouté est de **222 235**. La vue l'écrit sous son curseur, avec la date du
relevé.

**Un troisième chiffre est affiché mais ne dimensionne rien** : la descendance
dans le DAG entier, greffes comprises. C'est le plus juste et le plus
frappant, Musique concrète passant de 13 à 174, Funk de 1 à 168, Philly Soul
de 0 à 130. Il a été écarté de la géométrie sur mesure : il donne 50 % de
l'écran à la famille roots et 1 % à downtempo, ce qui tue la vue au premier
niveau.

### La subdivision est conditionnelle, et il faut savoir pourquoi

Une famille ne se subdivise en ses enfants directs **que si son plus petit
morceau réellement pavé** fait au moins 34 px de côté et 2200 px d'aire. Sur
téléphone aucune ne se subdivise, sur ordinateur deux ou trois le font.

**Ne pas remplacer ce test par une moyenne.** Il l'a été, et une moyenne ne
dit rien de la queue de distribution : elle laissait passer des pavés de
21 x 16 dans une famille dont le fondateur pèse vingt fois ses feuilles.

**Et ne pas le ramener au seuil d'une cible tactile**, 22 px. Il l'a été
aussi : « Florida Breaks » se retrouvait sur 30 x 32. **Un pavé cliquable
n'est pas un pavé lisible**, et cette vue existe pour être lue.

### Mesures, carte de chaleur, premier niveau

| écran | pavés | plus petit | noms entiers |
|---|---|---|---|
| 320 x 568 | 14 | 83 x 71 | 14 |
| 390 x 844 | 14 | 75 x 147 | 14 |
| 430 x 932 | 14 | 83 x 164 | 14 |
| 1280 x 800 | 29 dont 15 genres | 40 x 56 | 23 sur 29 |

Aux trois positions du curseur, à 320 : côté minimal de 71, 77 et 71 px.

### Le lecteur sur téléphone

Deux états. **Fermé**, une barre de 56 px, pochette de 48 à 12 px du bord,
transport en icônes, rond blanc de 44 px pour ouvrir. **Ouvert**, une feuille
du bas à **50 % exactement**, trois morceaux visibles à 320 et six ailleurs.

**L'iframe YouTube est rangée derrière la barre**, en `z-index` 1 contre 12,
et calée à l'intérieur. Elle ne peut pas être masquée : une iframe en
`display: none` se fait suspendre et la lecture s'arrête.

---

## 2. Les sept dettes, et la raison de chacune

**1. Le toucher d'une famille sur la carte n'a jamais été vu tourner.**
Établi par lecture du code, chaîne complète : `goToFamily(-1)` passe par
`sortirDuFocus` et `recenter`, qui posent `level = 'atlas'` ; à ce niveau
`zoneActive` est faux donc `nomTouche` renvoie les noms de famille ;
`performTapAction` teste `kind === 'family'` et `level === 'atlas'` et appelle
`selectFamily`.

*La raison :* aucun instrument de geste ne fonctionne dans l'environnement de
vérification. Le clic réel expire, et les événements fabriqués ne parviennent
pas au moteur, ce qui a été établi en constatant que le journal des décisions
reste vide après chacun.

**2. Psybreaks reste à 6 morceaux sur 10.** Discogs ignore le style et trois
de ses artistes de référence. Aucune source ne permet de compléter sans
inventer. État jugé acceptable.

**3. Les quatre genres psychédéliques pauvres restent en l'état.** Psycore 2,
Hi-Tech 3, Twilight Psy 3, Psytech 4. Mika les remplit lui-même. **Ne rien y
proposer.**

**4. Le rôle `origine` n'est renseigné que sur un morceau sur 219 genres.**
Kraftwerk, Trans-Europe Express. Deux autres avaient été proposés sur le seul
indice d'une année égale à la naissance du genre, et refusés à la relecture :
un succès du genre n'est pas sa fondation, un fait de format non plus. **C'est
l'état normal, pas un trou.**

**5. Onze scripts recopient à la main la forme des données** au lieu de la
lire du schéma. Corrects aujourd'hui, mais tout changement de forme devra être
répercuté onze fois.

**6. Le balayage des autres rejets silencieux n'est pas fait.** La règle est
écrite après le plancher d'année à 1960 qui jetait en silence toute date
antérieure ; la recherche d'autres endroits similaires a été remise.

**7. L'ordre horaire des dérivés n'a jamais été revérifié par mesure.** Le tri
existe dans le code, il n'a pas été confirmé à l'écran. Aucun symptôme
signalé.

**Ce qui n'est plus une dette :** les recouvrements de plaques, contrôle vert
sur 130 sphères ; le contrôle des exports, réparé et devenu bloquant ; le
démarrage sur la carte en 3D, livré.

---

## 3. Les dix contrôles de la barrière

| # | contrôle | ce qu'il protège |
|---|---|---|
| 1 | `compilation` | Le typage strict, scripts compris. |
| 2 | `corpus` | Identifiants uniques, parents résolus, un fondateur par famille, aucun cycle, réciprocité des charnières, au plus une origine par genre. |
| 3 | `css` | La même propriété déclarée deux fois avec deux valeurs. |
| 4 | `camera` | Les invariants de cadrage du moteur. |
| 5 | `cadrage` | Le débordement des étiquettes hors du cadre. |
| 6 | `constantes` | Une grandeur de mise en page écrite en clair dans deux fichiers, et la conversion fenêtre vers canvas refaite à la main. |
| 7 | `exports` | Une fonction exportée que personne n'appelle. Reconnaît l'import dynamique, l'accès par membre et l'usage en position de type. |
| 8 | `ecritures` | Une valeur écrite depuis plusieurs endroits sans ordre déclaré. |
| 9 | `tirets` | Aucun cadratin ni demi-cadratin. |
| 10 | `construction` | La construction complète du site. |

**Hors barrière :** `npm run check:orphelins` à l'ouverture de session, et
`npm run fetch:vues` pour relever les écoutes.

**Le relevé quotidien** est une tâche planifiée, `.github/workflows/vues.yml`,
4 h UTC, déclenchable à la main. Elle exige un secret de dépôt nommé
**`YOUTUBE_API_KEY`**. Sans lui elle échoue sans rien écrire, et la carte
continue avec la dernière mesure datée.

---

## 4. Les motifs d'échec

Le journal complet est `ECHECS-SILENCIEUX.md`, vingt-six motifs, avec en tête
la leçon qui les résume.

### Une sonde ne mesure pas le produit, elle mesure sa propre idée du produit

Son sélecteur, son repère, sa conversion, sa séquence d'événements : chacune
peut être fausse indépendamment du produit. La capture d'écran, elle, ne
suppose rien.

**Onze sondes ont contredit un oeil sur ce projet. Les onze avaient tort.**

**Et la douzième fois, c'est la capture qui trompait** : à la clôture, la
version ordinateur semblait cassée alors que la mesure établissait que tout
allait bien. Ce cas compte plus que les onze autres : une règle qui n'admet
aucune exception finit appliquée mécaniquement, ce qui est une autre façon de
ne plus confronter les deux.

**La règle n'est donc pas « l'oeil gagne ».** C'est : *quand une sonde et un
oeil se contredisent, on cherche laquelle des deux mesures est fausse, et on
ne conclut pas avant de le savoir. Le plus souvent c'est la sonde. Pas
toujours.*

### Un chemin de secours jamais déclenché n'est pas un chemin de secours

Le repli de la carte de chaleur était écrit et commenté. Déclenché pour de
vrai, en vidant le fichier de mesures, **il cassait la construction du site**.
Le chemin prévu pour survivre à une panne détruisait le produit, et il
n'aurait été découvert que le jour de la panne.

Quatre chemins ont été éprouvés à la clôture en cassant réellement ce qu'ils
protègent : la carte sans mesure d'écoute, le contexte WebGL perdu, le repère
sans canvas, la pochette absente. **Deux ne l'ont pas été et il faut le
savoir :** le mode sans Supabase et le bandeau hors ligne.

### Les autres, en une ligne chacun

Un élément invisible qui intercepte un clic. Un élément déshabillé qui
s'affiche nu parce qu'on a retiré son style sans retirer l'élément. Une règle
supprimée qui retombe sur un défaut pire. Une transition vers une valeur en
unités de fenêtre qui ne converge jamais et bat le style en ligne. Une valeur
par défaut prise pour une absence de valeur. Une valeur refusée effacée en
silence. Un test qui attend un délai fixe et confond lent et cassé. Une sortie
tronquée dont on conclut comme si elle était complète. Une recherche par nom
qui ne prouve jamais une absence. Une grandeur compensée par un régulateur.
Une moyenne qui cache la queue de distribution.

---

## 5. Les règles de travail

1. **Publier uniquement par `npm run publier`.**
2. **Lire la sortie d'un contrôle en entier**, pas seulement la lancer :
   compter ce qu'elle annonce et vérifier qu'on a lu ce nombre.
3. **Ne jamais déclarer un comportement acquis sans l'avoir vu tourner.**
4. **Ne jamais rembobiner sur un ancien commit.** Réparer vers l'avant.
5. **Dire en tête de chaque rapport ce qui n'est pas publié.**
6. **Ne rien inventer dans les données.** Un trou vaut mieux qu'une entrée
   fausse, et l'outil d'import refuse plutôt qu'il n'approche.
7. **Ne pas commencer un lot sans la marge de le finir.**
8. **Tout ce qui passe par un geste se vérifie par un événement réel du
   navigateur**, jamais par un événement fabriqué.
9. **Tout chemin de secours doit avoir été déclenché au moins une fois**, en
   supprimant réellement ce dont il protège l'absence.
