# SONAA, clôture du chantier téléphone

**20 août 2026.** Dernier commit publié : `5982c0e`. Dépôt propre, rien en
attente. `https://sonaa.ca`, GitHub Pages, déploiement automatique à chaque
poussée sur `main`.

Ce document et `HANDOFF.md` doivent suffire à reprendre dans six mois sans
rien redécouvrir. Ce qui suit est mesuré, pas supposé ; ce qui ne l'est pas
est dit comme tel.

---

## 1. L'état du produit

**219 genres, 14 familles, 1783 morceaux vérifiés**, dont 1 marqué comme
origine et 1216 comme canon. 40 filiations débattues, 95 greffes entre
familles. Aucun morceau sans date affichable.

React 19, Vite 5, TypeScript strict, three.js. Cent pour cent statique :
aucun serveur, aucune base au moment du rendu. Supabase sert uniquement aux
contributions, commentaires et propositions, jamais à l'affichage de la carte.

### Sur ordinateur

Rien n'a changé de ce chantier, et c'était une contrainte explicite. Vue
d'ensemble des quatorze familles, colonne de lecteur à droite avec grande
pochette, carte à gauche. Vérifié à 1280 x 800 : canvas 896 x 800, colonne
384 x 800.

### Sur téléphone, sous 768 px

**Démarrage sur la carte en trois dimensions**, quatorze familles en plaques.
Les listes de navigation existent toujours dans le code mais sont masquées :
la couche ne garde que son fil d'Ariane, sa loupe et le bouton de compte, et
le canvas vit dessous en recevant les touchers.

**Le canvas coïncide avec la zone utile**, entre le bas du fil d'Ariane et le
haut du lecteur. Il ne déborde plus derrière les deux bandes. La zone est
décalée vers le haut de 2,5 % de sa hauteur pour compenser le fait que les
noms se dessinent SOUS les sphères : sans cela tout le vide s'entassait en
haut.

**Marge de cadrage à 5 % en portrait**, 12 % ailleurs. Le critère est le
format, pas une largeur en pixels.

**Le lecteur a deux états, et deux seulement.**

- Fermé : une barre de 56 px, soit 6 à 10 % de l'écran selon le modèle.
  Pochette de 48 px à 12 px du bord, titre sur une ligne, artiste dessous,
  transport en icônes, et un rond blanc de 44 px portant un chevron noir qui
  ouvre le lecteur.
- Ouvert : une feuille du bas à 50 % exactement. La carte garde la moitié
  haute comme repère. Fermeture par le chevron vers le bas ou par un
  glissement vertical.

**Mesures du lecteur ouvert, morceaux visibles sans défiler :**

| écran | part de l'écran | morceaux visibles |
|---|---|---|
| 320 x 568 | 50 % | 3 |
| 390 x 844 | 50 % | 6 |
| 430 x 932 | 50 % | 6 |

**Mesures du remplissage de la carte, vue des quatorze familles :**

| écran | remplissage vertical | vide haut / bas |
|---|---|---|
| 320 x 568 | 75 % | 78 / 37 |
| 390 x 844 | 82 % | 83 / 50 |
| 430 x 932 | 82 % | 96 / 55 |

**La hauteur ne se remplira jamais entièrement en portrait, et ce n'est pas
un défaut.** C'est la largeur qui commande le cadrage : avec un rapport
d'écran de 0,46, la contrainte de largeur vaut plus du double de celle de
hauteur. Remplir 90 % de la hauteur demanderait d'agrandir de 48 %, ce qui
ferait sortir 94 px de chaque côté. C'est une forme, pas un réglage. Ne pas
rouvrir ce sujet sans avoir refait ce calcul.

**L'en-tête** porte, de gauche à droite : un rond blanc de 44 px avec un
chevron noir pour remonter, le fil d'Ariane, la loupe, le bouton de compte.
Trois zones qui ne se touchent jamais, vérifié aux trois largeurs. La zone
sûre du haut est respectée par `env(safe-area-inset-top)`.

**Le fil d'Ariane tronque les segments intermédiaires, jamais la
destination.** Dès qu'un genre est ouvert, tout ce qui précède fusionne en un
seul point de suspension, entier et touchable, qui remonte aux familles. Le
chemin complet reste dans l'étiquette d'accessibilité.

**Le bouton de compte** affiche l'initiale du prénom dans un rond de 44 px
quand on est connecté, et l'invitation entière quand on ne l'est pas. Le
prénom vient des métadonnées Google, sinon du premier mot du nom complet,
sinon de la partie de l'adresse avant l'arobase.

**Ce nom ne sort jamais du bouton et du menu de la personne elle-même.**
Vérifié par recherche dans tout le code : `user_metadata` n'apparaît nulle
part ailleurs. Dans les propositions et les commentaires, l'identité visible
reste le pseudonyme non réversible calculé par le serveur.

### La recherche

Elle répond en texte et n'emmène nulle part. Une ligne de résultat affiche le
ou les genres qui revendiquent le morceau, en grand et en couleur, puis le
titre, l'artiste, la mention du désaccord quand plusieurs genres le
revendiquent, la parution. Cliquer la ligne ne fait rien : les deux sorties
sont nommées à l'intérieur, le nom du genre mène à la carte, un bouton mène au
lecteur. Aucune iframe n'est chargée pendant la consultation.

---

## 2. Les sept dettes, et la raison de chacune

**1. Le toucher d'une famille sur la carte n'a jamais été vu tourner.**
Établi par lecture du code, et la chaîne est complète : `goToFamily(-1)` passe
par `sortirDuFocus` et `recenter`, qui posent tous deux `level = 'atlas'` ; à
ce niveau `zoneActive` est faux, donc `nomTouche` ne filtre pas les noms de
famille ; `performTapAction` teste `kind === 'family'` et `level === 'atlas'`,
les deux sont vrais, et appelle `selectFamily`.

*La raison :* aucun instrument de geste ne fonctionne dans l'environnement de
vérification. Le clic réel du navigateur expire, et les événements fabriqués
ne parviennent pas au moteur, ce qui a été établi en constatant que le journal
des décisions du moteur reste vide après chacun. **Le premier geste à faire en
reprenant : toucher une famille sur un vrai téléphone, et lire
`window.__atlas.journalTaps()`.**

**2. Psybreaks reste à 6 morceaux sur 10.**
*La raison :* Discogs ne connaît ni le style Psybreaks, ni les artistes
Kalimist, Tetrameth et Zen Baboon. Aucune source ne permet de compléter sans
inventer. Mika a jugé cet état acceptable.

**3. Les quatre genres psychédéliques pauvres restent en l'état.**
Psycore 2, Hi-Tech 3, Twilight Psy 3, Psytech 4. *La raison :* Mika les remplit
lui-même, c'est son terrain. Ne rien y proposer.

**4. Le rôle `origine` n'est renseigné que sur un morceau, sur 219 genres.**
Kraftwerk, Trans-Europe Express, pour Proto-Techno. *La raison :* ce rôle
relève du jugement et ne se déduit d'aucune règle. Deux autres avaient été
proposés sur le seul indice d'une année égale à la date de naissance du genre,
et tous deux ont été refusés à la relecture : un succès du genre n'est pas sa
fondation, un fait de format non plus. Mika le renseignera au fil du temps, et
les visiteurs pourront le proposer. **C'est l'état normal, pas un trou.**

**5. Onze scripts recopient à la main la forme des données au lieu de la lire
du schéma.** *La raison :* travail explicitement remis après le remplissage,
puis passé en dette. Ils sont corrects aujourd'hui, mais tout changement de
forme devra être répercuté onze fois. C'est le motif des deux sources de
vérité, à l'échelle des scripts.

**6. Le balayage des autres rejets silencieux n'est pas fait.**
*La raison :* la règle est écrite après le plancher d'année à 1960, qui jetait
en silence toute date antérieure. Le balayage du reste du projet, à la
recherche d'autres endroits où une donnée hors plage serait effacée sans
avertissement, a été remis puis passé en dette.

**7. L'ordre horaire des dérivés n'a jamais été revérifié par mesure.**
*La raison :* les dérivés d'un genre sont disposés dans le sens des aiguilles
d'une montre par date croissante. Le tri existe dans le code, il n'a jamais
été confirmé à l'écran depuis. Aucun symptôme signalé.

**Ce qui n'est plus une dette :** les recouvrements de plaques. Le contrôle
rend 130 sphères repliées, 130 vérifiées à leur apparition, aucune ne
chevauche son ancêtre, la plus juste étant Krautrock sous Électroacoustique à
1,01 fois la marge nécessaire.

---

## 3. Les dix contrôles de la barrière

`npm run publier` les enchaîne, **refuse en code non nul** si l'un échoue ou si
le dépôt n'est pas propre, et ne pousse que si tout passe. Ne jamais pousser à
la main.

| # | contrôle | ce qu'il protège |
|---|---|---|
| 1 | `compilation` | Le typage strict, scripts compris. Un arbre à moitié migré ne compile pas, donc ne se publie pas. |
| 2 | `corpus` | Le schéma des données : identifiants uniques, parents résolus, un fondateur par famille, aucun cycle, réciprocité des morceaux charnières, au plus une origine par genre. |
| 3 | `css` | La même propriété déclarée deux fois avec deux valeurs dans la même règle. |
| 4 | `camera` | Les invariants de cadrage du moteur. |
| 5 | `cadrage` | Le débordement des étiquettes hors du cadre. |
| 6 | `constantes` | Une grandeur de mise en page écrite en clair dans deux fichiers, et la conversion fenêtre vers canvas refaite à la main. |
| 7 | `exports` | Une fonction exportée que personne n'appelle. **Bloquant depuis que sa détection reconnaît l'import dynamique, l'accès par membre et l'usage en position de type.** |
| 8 | `ecritures` | Une valeur écrite depuis plusieurs endroits sans ordre déclaré. |
| 9 | `tirets` | Aucun cadratin ni demi-cadratin dans le code ni les pages. |
| 10 | `construction` | La construction complète du site. |

**Hors barrière, à lancer à l'ouverture de session :**
`npm run check:orphelins`, deux lignes qui révèlent le travail vivant hors de
`main`. Onze commits ont déjà vécu ainsi.

---

## 4. Les motifs d'échec

Le journal complet est dans `ECHECS-SILENCIEUX.md`, vingt-cinq motifs. Ce qui
suit est la leçon qui les résume, et elle est en tête de ce fichier.

### Une sonde ne mesure pas le produit, elle mesure sa propre idée du produit

Son sélecteur, son repère, sa conversion, sa séquence d'événements : chacune de
ces idées peut être fausse indépendamment du produit. La capture d'écran, elle,
ne suppose rien.

**Sur ce projet, onze sondes ont contredit un oeil. Les onze avaient tort.**
Une conversion de repère refaite à la main, un sélecteur CSS invalide dont le
`null` se lisait comme une absence, une sonde de règles qui rendait vide aussi
bien en succès qu'en échec, deux sondes de navigation qui déclaraient cassé ce
que la capture montrait entier, une sonde de gestes fabriqués qui marchait une
passe sur deux, une mesure annonçant 98 % de remplissage là où l'oeil voyait un
cinquième parce qu'elle prenait la sentinelle `-9999` pour une position.

**Ce que les onze ont en commun :** aucune ne mesurait le produit. Chacune
mesurait une reconstruction du produit. Le produit n'a jamais menti.

### Le douzième cas, et pourquoi il compte plus que les onze

**À la clôture, la capture de la version ordinateur avait l'air complètement
cassée : le contenu tenait dans le coin haut gauche.** La mesure a établi que
tout allait bien, fenêtre 1280 x 800, canvas 896 x 800, colonne 384 x 800.
C'était l'image qui trompait, à cause du rapport de pixels.

**Ce cas mérite d'être noté à côté des onze autres, et pas en dessous.** Une
règle qui n'admet aucune exception finit par être appliquée mécaniquement, et
appliquer mécaniquement « l'oeil a raison » est une autre façon de ne plus
confronter les deux. La règle n'est pas *l'oeil gagne*, c'est **quand les deux
se contredisent, on cherche laquelle des deux mesures est fausse, et on ne
conclut pas avant de le savoir.**

### Les autres motifs, en une ligne chacun

Un élément invisible qui intercepte un clic. Un élément déshabillé qui
s'affiche nu parce qu'on a retiré son style sans retirer l'élément. Une règle
supprimée qui retombe sur un défaut pire, `transition-property` revenant à
`all`. Une transition vers une valeur en unités de fenêtre qui ne converge
jamais et tient la valeur animée contre le style en ligne. Une valeur par
défaut prise pour une absence de valeur, l'ordre déclaré sur deux enfants de
cinq. Une valeur refusée effacée en silence au lieu d'être signalée. Un test
qui attend un délai fixe et ne peut pas distinguer lent de cassé. Une sortie
tronquée dont on conclut comme si elle était complète. Une recherche par nom
qui ne prouve jamais une absence. Une grandeur compensée par un régulateur, sur
laquelle agir ne produit rien.

---

## 5. Les règles de travail

1. **Publier uniquement par `npm run publier`.** Un verdict qu'on peut ignorer
   finira par être ignoré, et c'est arrivé.
2. **Lire la sortie d'un contrôle, pas seulement la lancer.** Et la lire en
   entier : compter ce qu'elle annonce et vérifier qu'on a lu ce nombre.
3. **Ne jamais déclarer un comportement acquis sans l'avoir vu tourner.**
4. **Ne jamais rembobiner sur un ancien commit.** Réparer vers l'avant.
5. **Dire en tête de chaque rapport ce qui n'est pas publié.**
6. **Ne rien inventer dans les données.** Pas d'identifiant vidéo, pas de
   titre approché, pas de date déduite. Un trou vaut mieux qu'une entrée
   fausse, et l'outil d'import refuse plutôt qu'il n'approche.
7. **Ne pas commencer un lot sans la marge de le finir.** Une refonte
   interrompue au milieu laisse le produit dans un état où rien ne peut être
   publié.
8. **Tout ce qui passe par un geste se vérifie par un événement réel du
   navigateur, jamais par un événement fabriqué.** Les gestes simulés peuvent
   piloter un scénario, ils ne peuvent jamais en constituer la preuve.
