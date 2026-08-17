# Les opérations qui peuvent échouer sans le dire

Revue demandée après deux incidents de même nature : la commande d'ajout de
modérateur, qui affichait « Success » sans rien insérer, et le plafond
anti-parution, qui répondait « rien à signaler » alors qu'il ne recevait
plus sa donnée d'entrée.

**Le défaut de fond n'est pas la panne, c'est le verdict rassurant.** Un
script qui plante se voit. Un script qui rend « tout va bien » sans avoir
rien vérifié ne se voit jamais, et son résultat est utilisé comme une
preuve. C'est ce qui a laissé entrer quarante-cinq intégrales d'album.

Trois questions posées à chaque script :

1. Peut-il rendre un verdict positif sans avoir rien vérifié ?
2. Distingue-t-il « rien trouvé » de « je n'ai pas pu chercher » ?
3. Écrit-il en croyant écrire, alors que la cible a disparu ?

---

## LA RÈGLE QUI PRIME SUR TOUTES LES AUTRES

**Ne jamais déclarer un comportement acquis sans l'avoir observé tourner.**

Lire le code prouve qu'il EXISTE, pas qu'il S'EXÉCUTE. J'ai signalé deux fois
comme terminé ce qui ne l'était pas, et les deux fois de la même façon : en
lisant l'intention dans le code sans vérifier son exécution.

La première : le retour visuel au survol. Le code qui l'applique au nom était
bien écrit, mais placé dans une portion qui ne s'exécute que lorsqu'un
emplacement de texte change de contenu. Survoler n'en change aucun : la ligne
n'était jamais atteinte. Trois signalements ont été nécessaires.

La seconde : « la caméra ne bouge pas au clic ». Le chemin de sélection ne
volait effectivement pas, je l'avais lu et j'ai répondu que c'était réglé. Le
mouvement venait d'ailleurs, d'une boucle qui corrigeait en continu.

Cette règle et le sixième motif sont les deux faces du même défaut : chercher
dans le texte du programme ce qui ne se voit qu'à l'exécution. Un crochet de
diagnostic qui rend l'état réel du moteur tranche en une mesure ce que la
lecture ne tranche jamais.

---

## Quatre contrôles statiques à écrire, et le défaut que chacun aurait attrapé

Sans navigateur, sans exécution, sans mise en scène. Les deux qui existent déjà
(doublons CSS, corrections continues sur la caméra) ont chacun trouvé quelque
chose dès leur premier passage. Ces quatre-là sont écrits ici pour qu'ils
existent ailleurs que dans une intention.

**1. Une même constante définie dans deux fichiers avec des valeurs
différentes.** `44`, la cible tactile, vit dans le moteur et dans deux feuilles
de style ; `768`, le seuil du mobile, dans le moteur et quatre media queries.
Les deux ont divergé au moins une fois. Le contrôle relève les littéraux
numériques répétés portant le même nom de constante ou le même commentaire, et
signale les valeurs qui ne s'accordent pas.

**2. Une valeur écrite et jamais lue.** `focusGenerations` a survécu plusieurs
tours après que le modèle soit passé à l'arbre entier : elle était encore
assignée partout, et plus personne ne la consultait. Une variable qu'on
entretient sans la lire coûte une lecture à chaque personne qui passe.

**3. Une fonction exportée et appelée nulle part.** `purgerSiDemande` était
écrite, documentée, exportée, et jamais appelée : `?nocache=1` n'a rien fait
pendant des semaines, alors que le fichier expliquait longuement à quoi elle
servait. C'est probablement par cette porte murée que des corrections ont été
jugées sur des versions jamais chargées.

**4. Une écriture placée dans une branche qui ne s'exécute pas dans le cas
visé.** Le plus difficile des quatre à détecter, et le plus rentable : c'est le
défaut du survol. `data-survol` était posé dans le bloc « la clé a changé », que
survoler ne déclenche jamais. Trois tours perdus, et deux affirmations fausses
de ma part. Une heuristique praticable : repérer les attributs ou propriétés
dont le nom évoque un état d'interaction, et vérifier qu'ils sont écrits hors
de tout bloc conditionnel qui les rendrait inatteignables.

---

## Les sept motifs, et les deux derniers sont les deux faces d'un même défaut

Ils reviennent, et toujours déguisés. Les nommer est la seule défense.

**1. Le verdict rassurant.** Un contrôle qui rend « rien à signaler » alors
qu'il n'a pas reçu sa donnée d'entrée. Quarante-cinq intégrales d'album sont
entrées ainsi.

**2. L'instrument braqué au mauvais endroit.** Une mesure juste, sur une
situation que personne ne rencontre. Le scintillement a été mesuré à zéro
pendant qu'il était visible à l'écran, parce que la mesure portait sur la vue
d'ensemble et le défaut sur l'état déployé.

**3. L'appariement par le texte.** Deux objets portent le même nom, le contrôle
compare l'un à la boîte de l'autre et invente un écart. Payé deux fois : sur le
contrôle des boîtes de labels, puis, sans que la leçon serve, sur le contrôle
de distance nom-sphère, qui accusait 93 px là où il y en avait 17.

**4. DÉCOUPLER UNE GRANDEUR SANS LISTER SES APPELANTS.**

Le plus coûteux à voir. Le rayon d'une sphère servait à
trois choses à la fois : la dessiner, calculer la disposition, et calculer le
cadrage. En le séparant en deux valeurs pour qu'un grossissement se voie
enfin, j'ai mis à jour deux usages sur trois. Le troisième, les écarts
minimaux entre voisins, a continué de travailler sur l'ancienne valeur : il
autorisait donc **quarante pour cent de recouvrement, par construction**, et
le défaut est apparu là où deux sphères étaient déjà proches.

Rien n'a plante, rien n'a rendu de verdict faux. Le code était cohérent avec
lui-même, simplement il ne parlait plus de la même grandeur d'un endroit à
l'autre.

**5. LA SONDE QUI S'INTERROGE ELLE-MÊME.**

Le plus retors des cinq, parce que son chiffre est rassurant.

Le survol et le clic désignaient parfois deux objets différents au même endroit
de l'écran. J'ai fusionné les deux chemins en une seule fonction, puis écrit
une sonde qui parcourt une grille de dix mille points et compare, pour chacun,
ce que voit le survol et ce que voit le clic. Elle rend **zéro désaccord**.

Ce zéro ne prouve rien. La sonde appelle la fonction commune DEUX FOIS : elle
compare une valeur à elle-même. Elle rendrait zéro même si la fusion était
fausse, même si la fonction se trompait sur toute la ligne. Elle ne mesure pas
l'accord entre le survol et le clic, elle mesure que `x === x`.

Elle garde une utilité, et c'est pour cela qu'elle reste : le jour où quelqu'un
rouvrira un second chemin de ciblage, elle cessera de rendre zéro. C'est un
garde-fou contre une régression future, pas une preuve de correction présente,
et il faut écrire lequel des deux on tient.

**7. DEUX COMPOSANTS QUI MESURENT LA MEME CHOSE DANS DES UNITES DIFFERENTES.**

Le plus recent, et il m'a fait accuser le produit deux tours de suite.

Le moteur calcule les positions a l'ecran dans un repere : la taille du canvas
en pixels CSS, telle qu'il la connait. Mon script de mesure, lui, recalculait
cette taille depuis le DOM en divisant par `devicePixelRatio`. Or le moteur
plafonne son propre ratio de rendu a 1,5 en mode reduit : les deux valeurs
different d'un tiers, 672 contre 896.

Aucun des deux n'avait tort dans son coin. Simplement ils ne parlaient pas de
la meme chose, et rien ne le signalait : les nombres restaient plausibles, du
meme ordre de grandeur, et la comparaison rendait un debordement de 451 pixels
qui n'existait peut-etre pas.

**La regle : celui qui PRODUIT une valeur publie l'unite dans laquelle elle
vit, et tous les autres la lisent chez lui.** Une dimension recalculee ailleurs
est une seconde source de verite, donc une occasion de divergence. Ici le
moteur expose `dimensions()`, et les scripts n'ont plus le droit de deduire
quoi que ce soit du DOM.

Le signe qui aurait du alerter : deux mesures du meme objet dont le rapport est
une constante ronde, ici exactement 1,333. Un vrai defaut donne des ecarts
irreguliers ; un facteur constant est une conversion oubliee.

**6. L'ASSERVISSEMENT PERMANENT PRIS POUR UN GESTE.**

Celui qui m'a échappé le plus longtemps, six tours durant.

La carte se déplaçait à chaque clic. J'ai cherché le vol de caméra dans le
chemin de sélection, je ne l'y ai pas trouvé, et j'ai répondu que le point
était réglé. Il ne l'était pas : le déplacement ne venait pas d'un vol mais
d'un SUIVI, une boucle qui rapprochait la caméra du cadrage voulu à chaque
image, indéfiniment, tant qu'un verrou désignait un noeud. Le vol d'entrée se
terminait ; le suivi, lui, ne s'arrêtait jamais.

Ce qui l'a rendu invisible : je cherchais un ÉVÉNEMENT, un appel qui bouge la
caméra au moment du clic. Il n'y en avait pas. La cause était un ÉTAT, et un
état ne se trouve pas en lisant le chemin d'un clic.

**Le cadrage est un GESTE, pas un asservissement permanent.** Un recadrage a un
début et une fin ; une fois arrivé, il rend la main. Toute boucle qui continue
de corriger « vers ce qu'il faudrait » transforme chaque changement de données
en mouvement de caméra, et l'utilisateur voit la carte dériver sans avoir rien
demandé.

La règle générale : quand quelque chose bouge sans qu'on l'ait demandé,
chercher l'état qui se corrige en boucle avant de chercher l'événement qui
déclenche. Et se demander, pour toute correction continue : quand s'arrête-
t-elle ?

**La règle : une sonde doit interroger deux chemins qui peuvent DIVERGER.**
Si les deux branches de la comparaison passent par le même code, le résultat
est une tautologie. Avant d'écrire un contrôle, demander : « quel changement
du produit ferait échouer cette mesure ? » Si la réponse est « aucun », la
mesure ne dit rien.

**La règle du motif 4 : quand tu sépares une grandeur en deux, tu listes ses
appelants AVANT de changer quoi que ce soit,** et tu décides pour chacun laquelle des
deux valeurs il doit prendre. Un `grep` du nom de la variable est le minimum,
et il prend une minute. Ce qui est en jeu n'est pas une panne, c'est une
incohérence silencieuse entre deux moitiés d'un même calcul.

---

## Corrigés dans cette passe

### `lib/match.ts`, `searchYouTube` — GRAVE

Rendait un tableau vide dans deux cas que rien ne distinguait : la requête
ne donne vraiment rien, ou quatre tentatives ont été refusées. L'appelant
concluait « non résolu » dans les deux cas.

**Conséquence réelle** : un blocage complet de YouTube produisait un rapport
d'import parfaitement normal, du genre « 0 ajouté, 60 non résolus ». On
aurait conclu que le fichier de candidats était mauvais.

**Corrigé** : compteur `reseau.requetes` / `reseau.echecs`, exposé par
`tauxEchecReseau()`.

### `import-tracks.ts` — GRAVE, même cause

Le rapport final ne pouvait pas distinguer un lot douteux d'un réseau
tombé.

**Corrigé** : au-delà d'un quart de requêtes perdues, le script refuse de
conclure et sort en erreur, en disant que les « non résolus » ne veulent
rien dire.

### `lib/corpus-store.ts`, `patchTracks` — GRAVE

Un correctif visant une track retirée du corpus entre-temps ne trouvait
aucune cible et disparaissait sans un mot. `fetch-covers` pouvait annoncer
cinquante pochettes posées en n'en ayant écrit que vingt. C'est le module
central d'écriture : son silence se propage à tous ses appelants.

**Corrigé** : rend `{ appliques, orphelins }` et prévient sur la sortie
d'erreur. Les orphelins ne sont pas une faute — le corpus bouge, c'est la
raison d'être du module — ils doivent seulement être vus.

### `audit-durees.ts` — GRAVE, et c'est le script d'audit lui-même

Annonçait « aucune parution complète détectée » aussi bien quand il n'y en
avait pas que quand il n'avait rien pu mesurer. Le script écrit pour
traquer le défaut en était atteint.

**Corrigé** : sous 50 % de tracks réellement mesurées, il sort en erreur et
renvoie vers `check:plafond`.

### `lib/match.ts`, le plafond — GRAVE, corrigé précédemment

Documenté dans le commit du garde-fou. `check:plafond` vérifie désormais la
règle ET que la durée arrive encore, en CI.

---

## Risque moyen, laissés en l'état avec leur raison

### `fetch-key.ts` et `fetch-release-data.ts`

Sortent en **code 0** quand leur clé d'API est absente, après un message
explicite sur la sortie d'erreur.

Le message est clair et la sortie zéro est délibérée : ces chantiers sont
facultatifs, et les faire échouer casserait une chaîne qui n'en dépend pas.
Le risque n'apparaît que si on les enchaîne dans un script qui teste les
codes de sortie : l'absence de clé passerait alors pour un succès. Aucun
script ne le fait aujourd'hui.

### `fetch-covers.ts`

Compte ses échecs d'appel et les affiche à la fin (« N appels en échec »).
Il **dit** ce qui a raté, il ne le masque pas. Il ne va pas jusqu'à refuser
de conclure, mais l'information est là.

### `audit-tracks.ts`

`catch` silencieux sur la résolution d'une track, mais il travaille sur un
corpus déjà constitué et annonce chaque entrée retirée. Le silence porte
sur un cas, pas sur le verdict.

---

## Sans risque

Les contrôles de CI sortent tous en code 1 quand ils échouent, et aucun ne
peut rendre un verdict positif sans avoir travaillé :

`check-matcher`, `check-labels`, `check-corpus-writes`, `check-tirets`,
`check-plafond`, `check-nature`, `validate-data`.

`check-matcher` mérite une mention : son verdict est
`process.exit(fails === 0 ? 0 : 1)`, et non un `process.exit(1)` littéral.
Une recherche naïve du motif le fait passer pour muet, il ne l'est pas.

---

## La règle qui en sort

Un contrôle doit pouvoir échouer de deux façons distinctes : **la chose
vérifiée est fausse**, et **je n'ai pas pu vérifier**. Confondre les deux
transforme une panne en satisfecit.

Quand un contrôle dépend d'une donnée qu'il ne produit pas lui-même —
une durée extraite d'une page, une réponse réseau, une ligne à mettre à
jour — il doit vérifier que cette donnée est bien arrivée, et le dire quand
elle manque.

---

## Deuxieme motif : le rapport qui affirme ce que le script n'a pas fait

Revue demandee apres un troisieme incident, de nature differente des deux
premiers. `import-tracks` a annonce **« 105 lignes lues dans
tracks-canon.md »** alors qu'on lui avait demande `tracks-lot7.md`.
L'argument, mal ecrit, avait ete ignore ; le script avait relu sa source par
defaut, et son compte-rendu nommait un fichier en dur.

Le rapport etait donc exact sur le fond et faux sur les faits : 105 lignes
avaient bien ete lues, mais pas celles qu'on croyait. Le verdict final,
« tous les genres atteignent la cible », etait vrai pour l'ancien fichier et
sans aucun rapport avec le travail demande.

**Ce motif est distinct du verdict rassurant.** Le premier ment sur le
RESULTAT : « rien a signaler » sans avoir rien verifie. Celui-ci ment sur
les FAITS : le script a bien travaille, mais pas sur ce qu'il affirme. Il
est plus difficile a voir, parce que tout, dans la sortie, a l'air
coherent.

Trois questions posees a chaque script :

1. Le rapport nomme-t-il une source, une cible ou un chemin en dur, plutot
   que la valeur reellement utilisee ?
2. Un argument mal ecrit est-il ignore en silence, avec repli sur un defaut ?
3. Les comptes affiches viennent-ils de ce qui a ete fait, ou d'une
   constante ?

### Corrige

**`import-tracks.ts`, le nom de la source** : `${'`'}${'{'}rows.length${'}'} lignes lues dans
tracks-canon.md${'`'}` nommait un fichier fixe. Le message affiche desormais la
source reellement lue.

**`import-tracks.ts`, l'argument positionnel** : `-- tracks-lot7.md` etait
ignore, la syntaxe attendue etant `--file=`. Un fichier passe en positionnel
ARRETE maintenant le script, au lieu de le laisser continuer sur une autre
source. C'est le correctif qui compte le plus : le nom affiche aurait revele
l'erreur apres coup, le refus l'empeche.

**`import-tracks.ts`, le nom du rapport** : `Rapport ecrit dans
tracks-canon-report.md` etait en dur. Vient desormais de la constante.

### Verifie et sain

Les comptes affiches par tous les scripts derivent des donnees traitees,
aucun n'est une constante. `CIBLE` dans `import-tracks` est bien interpole,
le message ne peut pas se desynchroniser de la valeur.

### Un ecart signale, qui n'est pas un bogue

`import-tracks` travaille avec une cible de **trois** morceaux, tandis que
l'enrichissement vise **cinq**. Son « tous les genres atteignent la cible »
est donc exact, et trompeur si on le lit avec l'objectif du chantier en
tete. Ce n'est pas une valeur en dur mal rapportee, c'est un desaccord de
definition entre deux outils, laisse en l'etat et note ici.

### La regle qui en sort

Un rapport ne doit affirmer que ce que le script a REELLEMENT fait. Tout ce
qu'il nomme, source, cible, chemin, compte, doit venir de la valeur
utilisee, jamais d'un litteral ecrit a cote. Et un argument que le script ne
comprend pas doit l'arreter, pas le renvoyer a son comportement par defaut :
un repli silencieux transforme une faute de frappe en travail fait ailleurs.

---

## Troisieme motif : la tache interrompue rapportee comme accomplie

Un import de soixante candidats a ete tue apres SIX. Son fichier de sortie
s'arretait au milieu, sans marqueur de fin, et le programme charge de
surveiller sa fin a expire avant de le voir. Je l'ai rapporte comme fait.

Ce motif n'est ni le verdict rassurant ni le fait mal nomme. Ici, **rien
n'est faux dans ce qui a ete ecrit** : les six candidats ont bien ete
traites, le fichier dit vrai sur ces six. C'est l'ABSENCE de la suite qui
n'a produit aucun signal. Une tache de fond qui meurt ne dit rien, par
construction : c'est justement ce qu'on lui demande, de ne pas encombrer.

### La regle

**Une tache de fond n'est jamais declaree terminee sans que son compte final
soit lu et compare au compte attendu.**

Si l'ecart depasse dix pour cent, la tache est declaree INTERROMPUE, pas
terminee.

Concretement, avant d'annoncer qu'un lot est passe :

1. Le nombre d'entrees traitees est-il lisible dans la sortie ?
2. Correspond-il, a dix pour cent pres, au nombre soumis ?
3. Le marqueur de fin que le script ecrit lui-meme est-il present ?

Trois reponses oui, la tache est terminee. Une seule non, elle est
interrompue, et on le dit avant de rapporter quoi que ce soit d'autre.

### Ce qui aurait suffi

Le fichier comptait 370 octets pour un lot de soixante lignes, et ne portait
pas la ligne de fin. Les deux se voyaient en une seconde. Le defaut n'est pas
dans l'outillage, il est dans l'ordre des operations : j'ai rapporte avant de
lire.

### Pourquoi la surveillance ne suffit pas

Le programme de surveillance avait ete arme correctement, avec une condition
de sortie sur l'echec autant que sur le succes. Il a simplement expire :
sa duree maximale etait plus courte que la tache. Un surveillant qui rend la
main sans verdict doit compter comme un echec, jamais comme un silence
rassurant , c'est le premier motif de ce document, applique aux taches de
fond.


## 8. Examiner les échecs sans examiner les réussites

**Le motif.** On tient trois cas qui ratent, on cherche ce qu'ils ont en
commun, on trouve une propriété partagée, et on croit tenir un indice. Sauf
qu'on ne l'a jamais cherchée chez les cas qui réussissent.

**Ce qu'il a coûté.** Trois échecs du banc partageaient une signature : tous
ouvraient la racine, et tous avaient exactement le rayon minimal, 18 px. Deux
tours d'enquête ont été bâtis là-dessus, dont une hypothèse détaillée sur une
zone cliquable calculée avant le plancher de taille. Mesure faite sur la
population entière :

```
par rayon : {"r=18": {"total": 15, "rates": 0}}
```

Les **quinze** dérivés ont ce rayon, pas seulement les trois échecs. À ce
niveau de zoom, tous les nœuds sont au plancher. La signature ne distinguait
rien, elle décrivait la population.

**Pourquoi on ne le voit pas.** Un indice tiré des seuls échecs est toujours
vrai des échecs, par construction. Il ne devient une information qu'une fois
confronté aux réussites. Sans ce second relevé, on ne mesure pas une cause, on
mesure une coïncidence, et l'enquête part avec confiance dans la mauvaise
direction.

**C'est le pendant logique du motif des outils faux.** Là, l'instrument mesurait
autre chose que ce qu'on croyait. Ici, l'instrument est juste, mais on ne l'a
pointé que sur la moitié du problème. Dans les deux cas, la conclusion est
solide en apparence et sans rapport avec le réel.

**La règle.** Toute propriété présentée comme la signature d'un défaut doit être
mesurée sur les cas qui réussissent AVANT d'orienter la recherche. Si elle y
est aussi fréquente, ce n'est pas un indice.

**Pas de contrôle automatique pour celui-ci**, et c'est délibéré : ce n'est pas
un motif de code, c'est un motif de raisonnement. Il s'écrit, il ne se compile
pas.

## 9. Une vraie régression ne se range pas d'un seul côté d'un seuil

**Le signal.** Cinq nouveaux échecs sont apparus à 390 et 700 px. Zéro à
1024 px. Le seuil des règles mobiles est à 700 px.

Un défaut de produit ne connaît pas les seuils de la feuille de style. Il se
distribue selon la géométrie, la densité, le hasard des positions, jamais
proprement selon une condition d'environnement. Quand la répartition des
échecs épouse exactement une condition, ce n'est pas le produit qui a changé
sous cette condition, c'est l'outil qui a cessé d'être valide sous elle.

**Ce que ça donne comme réflexe.** Avant d'ouvrir le code du produit, regarder
la RÉPARTITION des échecs. Si elle suit une frontière déclarée quelque part,
largeur, plateforme, drapeau, mode de rendu, commencer par l'outil.

Ce signal a fait gagner tout un tour d'enquête sur le cas du repère décalé,
motif 8 ci-dessus.

## 10. Un outil qui ne déclare pas ses hypothèses ne peut pas les voir tomber

**Le motif.** `testCadre` reposait sur « la zone de dessin occupe tout
l'écran ». Vraie depuis toujours, jamais écrite. Le jour où le canvas mobile a
été décalé sous le fil d'Ariane, elle est devenue fausse, et rien nulle part ne
l'a signalé : la suite s'est contentée de rendre cinq échecs de plus, tous
accusant le produit.

Une hypothèse tacite ne peut pas être invalidée, puisqu'elle n'existe pas dans
le texte. C'est ce qui distingue ce cas des trois autres outils faux de la
semaine : l'outil n'était pas mal écrit, il était devenu inapplicable.

**Troisième occurrence, et la règle qui en sort.** Le même décalage de repère a
faussé trois instruments : `testCadre`, `testBoites`, puis la sonde des plaques
qui a rendu « 0 sur 16 cliquables » à 390 px sur un produit parfaitement
correct. Chaque fois la conversion était refaite sur place, un peu différemment.

Une règle qu'on réapplique à la main est une règle qu'on oubliera. Elle est
donc définie **une seule fois**, dans `src/atlas/repere-canvas.ts`, et exposée
par le moteur sous `window.__atlas.repereCanvas` : les sondes extérieures, qui
vivent hors du dépôt et disparaissent entre deux sessions, n'ont pas d'autre
moyen de l'obtenir que de la demander. C'est ce qui distingue une convention
d'une contrainte. `check:constantes` refuse toute nouvelle copie.

**Et le contrôle lui-même a dû être corrigé deux fois, dans les deux sens.**
D'abord trop étroit : testé sur un fichier écrit exprès, il rendait vert, parce
qu'il exigeait les deux marqueurs sans point-virgule entre eux, ce qui exclut le
cas normal en deux instructions. C'est le faux vert, le pire résultat possible
pour un garde-fou. Puis trop large : il accusait un fichier qui interroge
légitimement le canvas sans jamais mesurer sa boîte. **On ne branche pas un
contrôle sans l'avoir vu refuser quelque chose ET accepter le dépôt.**

**La règle, posée par Mika.** Tout outil de mesure déclare en tête les
hypothèses sur lesquelles il repose, et vérifie avant de mesurer celles qui
sont vérifiables. Un test qui suppose que deux repères coïncident doit le
contrôler, pas l'espérer. Quand une hypothèse tombe, la suite le DIT, au lieu
de rendre des échecs qui accusent le produit.

Appliquée à `verify:visual` : trois hypothèses déclarées et contrôlées,
l'origine du canvas, l'accord entre les dimensions annoncées et le canvas
réel, et l'immobilité de la caméra au moment de la mesure.

## 11. Une référence se prend sur plusieurs passages, et c'est la médiane

**Le motif.** J'ai rapporté « sept échecs » comme référence d'avant le chantier
mobile. Sept était le meilleur des passages observés, pas le chiffre habituel.
Toute comparaison ultérieure partait donc d'un point trop bas, et une suite
parfaitement stable ressemblait à une dégradation.

Le biais est naturel et il n'a pas besoin de mauvaise foi : la mesure la plus
favorable est celle qui ressemble le plus au résultat qu'on espérait, donc
c'est celle qu'on retient sans y penser, et on retient le nombre sans retenir
qu'il y en avait d'autres.

**La règle, posée par Mika.** Une référence se prend sur plusieurs passages,
jamais sur un seul, et l'on retient la MÉDIANE, pas la meilleure. La médiane et
non la moyenne : un passage aberrant, un serveur qui meurt, un vol de caméra
interrompu, déplace une moyenne et laisse une médiane intacte.

**Corollaire.** Quand on annonce une référence, annoncer aussi l'étendue. « Neuf,
sur cinq passages allant de huit à onze » se compare ; « neuf » ne se compare
pas, parce que le lecteur ne sait pas ce qu'un écart de un veut dire.

**Signe qu'on vient de commettre la faute.** On corrige quelque chose, le compte
ne bouge pas, et l'on se surprend à relancer « pour voir ». C'est le moment
exact où l'on choisit un chiffre au lieu de le mesurer.

**La mesure qui a tranché.** Cinq passages sur du code strictement identique :

```
8, 10, 8, 9, 8   ->   mediane 8, etendue 8 a 10
```

Le sept que j'avais annoncé comme référence est **sous l'étendue entière**. Ce
n'était donc pas seulement le plus flatteur des passages observés, c'était une
valeur qu'aucun des cinq passages n'a reproduite.

Et le « neuf » que j'y opposais est un tirage ordinaire de cette même
distribution. **Il n'y avait aucun écart à expliquer.** J'ai passé deux échanges
à chercher la cause d'une dégradation de sept à neuf qui n'a jamais existé :
deux tirages d'une grandeur bruitée, présentés comme deux mesures. C'est le
coût réel de ce motif, et il est plus élevé que celui des trois précédents.

## 12. Aucune mesure de ce projet ne s'annonce en valeur unique

**La règle, posée par Mika.** On rapporte la MÉDIANE et la PLAGE sur cinq
passages. Un chiffre isolé n'est jamais une référence, et il ne peut jamais
prouver une amélioration ni une régression. Seul un déplacement HORS PLAGE le
peut.

C'est la généralisation du motif 11. Là, on retenait la mesure la plus
flatteuse. Ici, on reconnaît que la question ne se pose même pas : la grandeur
mesurée n'a pas de valeur, elle a une distribution. Un projet où le rendu, la
caméra, le réseau et l'animation interviennent dans chaque mesure ne produit
pas de nombres, il produit des tirages.

**Ce que ça interdit concrètement.** Écrire « le compte est passé de sept à
neuf ». Écrire « la correction fait tomber deux échecs ». Écrire « c'est
stable maintenant ». Aucune de ces trois phrases n'est vérifiable à partir d'un
passage, et j'ai écrit les trois cette semaine.

**Ce que ça impose de dire à la place.** « Médiane 8, plage 8 à 10, sur cinq
passages. » Et pour une amélioration : « la plage était 10 à 12, elle est
maintenant 8 à 10, les deux ne se recouvrent pas. » Un recouvrement de plages
n'est pas une preuve, c'est une coïncidence en attente d'être démentie.

**Application rétroactive.** Toute mesure citée dans ce document ou dans un
rapport est à relire sous cette règle. Celles qui reposent sur un passage
unique ne prouvent rien et doivent être annoncées comme telles jusqu'à
nouvelle mesure.

## 13. Une suite qui varie sur du code identique contient des tests instables

**Le raisonnement.** Si le compte va de huit à dix sans qu'une ligne ne change,
ce ne sont pas tous les tests qui bougent : ce sont quelques-uns, toujours les
mêmes, et les autres sont parfaitement stables. Chercher un huitième défaut
dans le produit pendant que deux tests tirent à pile ou face est du travail
perdu, et pire, du travail dont on ne saura jamais s'il a servi.

**La règle.** Identifier les tests qui varient d'un passage à l'autre. Puis
choisir explicitement, jamais implicitement : soit on les stabilise, en
attendant l'état qu'ils supposent au lieu de l'espérer, soit on les MARQUE
comme non déterministes pour qu'ils cessent de polluer le compte.

Un test instable non marqué est pire qu'un test absent : il donne au compte une
précision qu'il n'a pas, et il consomme l'attention qu'on devrait porter aux
tests qui, eux, disent la vérité.

**Le relevé, cinq passages sur code identique, par test et par largeur.**

| largeur | test | passages en échec |
|---|---|---|
| 390 | survol, focus, cadre | 5 sur 5 |
| 700 | focus, cadre, cameraFixe | 5 sur 5 |
| 1024 | focus | **4 sur 5** |
| 1440 | survol, focus | 5 sur 5 |

**Un seul test varie : `focus` à 1024 px.** Les huit autres échecs sont d'une
régularité parfaite, cinq fois sur cinq, à la même largeur, sous le même nom.
La suite n'est donc pas « globalement bruitée » : elle est stable à huit
échecs, plus une pièce jetée en l'air.

C'est exactement ce que le motif prédisait, et le rapport de force est plus
net que prévu : **un test sur trente-deux** produisait à lui seul toute la
variation qui a fait dérailler deux échanges d'enquête. On a cherché la cause
d'un écart de deux sur un total, alors qu'un seul test valait zéro ou un.

**Et le relevé s'est corrigé lui-même au premier usage.** Branché dans le
pilote, son tout premier passage a rendu sept échecs, en nommant lesquels :
`cadre@700` avait disparu de la liste, en plus de `focus@1024`. Il y a donc
**deux** tests non déterministes, pas un, et ma conclusion « un seul test
varie » était elle-même tirée d'un échantillon trop court.

C'est le motif qui s'applique à sa propre découverte : cinq passages suffisent
à voir qu'il y a du bruit, pas à en dresser la liste complète. Le relevé par
identité ne supprime pas ce besoin, il le rend visible, ce qui est déjà tout
ce qu'on lui demande.

Ce que ça vaut comme méthode : relever l'IDENTITÉ des échecs et pas leur
NOMBRE. Le nombre est une somme, et une somme perd l'information qui permet de
savoir d'où vient sa variation. Cinq passages qui rendent « 9, 9, 8, 9, 9 » ne
disent rien ; les mêmes cinq passages détaillés par test désignent le coupable
en une lecture.

## 14. Un contrôle qu'on ne relance pas ne sert qu'une fois

**Le motif.** Un contrôle bloque la publication. On corrige. On republie. Le
contrôle échouait encore, parce que la correction ne portait pas au bon
endroit, et on ne l'a pas su faute de l'avoir relancé.

C'est arrivé sur `check:ecritures` : la déclaration d'ordre avait bien été
réécrite, mais hors de la fenêtre de quatorze lignes que le contrôle lit. La
correction était juste dans l'intention et fausse dans le placement, ce qu'une
relance disait en deux secondes.

**Ce qu'on perd.** Un contrôle a deux valeurs : détecter, et confirmer que le
remède a agi. Sans relance, la seconde disparaît, et c'est précisément celle
dont on a besoin au moment où l'on est le plus pressé.

**La règle.** Contrôle rouge, correction, **contrôle relancé**, publication.
Sans exception, y compris pour une correction d'une ligne, surtout pour une
correction d'une ligne : c'est là qu'on se croit assez sûr pour sauter l'étape.

## 15. Le travail peut exister sans être rattaché à quoi que ce soit

**Le motif.** On vérifie ce qui n'est pas PUBLIÉ. On ne vérifie pas ce qui
n'est pas RATTACHÉ. Onze commits, dont une fonctionnalité entière, ont vécu
au-dessus de `main` sans appartenir à aucune branche, faits dans une session
parallèle sur le même dépôt.

Pendant ce temps, « rien en attente » était vrai de `main` et faux du dépôt.
Les essais portaient sur un code qui ne contenait pas le travail dont il était
question, et la conversation a tourné autour d'un écart qui n'existait que là.

**Le réflexe, deux lignes en ouverture de session :**

```bash
git log --oneline --all --not main
git fsck --lost-found 2>/dev/null | grep "dangling commit"
```

**Il a payé à son premier emploi**, en trouvant un commit qui refaisait un
travail déjà livré et vérifié.
