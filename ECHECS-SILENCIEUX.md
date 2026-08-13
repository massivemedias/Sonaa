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

## Les quatre motifs, et le quatrième est le plus récent

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

Le dernier en date, et le plus coûteux à voir. Le rayon d'une sphère servait à
trois choses à la fois : la dessiner, calculer la disposition, et calculer le
cadrage. En le séparant en deux valeurs pour qu'un grossissement se voie
enfin, j'ai mis à jour deux usages sur trois. Le troisième, les écarts
minimaux entre voisins, a continué de travailler sur l'ancienne valeur : il
autorisait donc **quarante pour cent de recouvrement, par construction**, et
le défaut est apparu là où deux sphères étaient déjà proches.

Rien n'a plante, rien n'a rendu de verdict faux. Le code était cohérent avec
lui-même, simplement il ne parlait plus de la même grandeur d'un endroit à
l'autre.

**La règle : quand tu sépares une grandeur en deux, tu listes ses appelants
AVANT de changer quoi que ce soit,** et tu décides pour chacun laquelle des
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

