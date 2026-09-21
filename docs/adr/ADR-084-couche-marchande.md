# ADR-084 : SONAA ouvre une couche marchande

Date : 17 septembre 2026. Statut : accepté, phase 0 livrée, mise en ligne
marchande suspendue au drapeau `MARCHAND_ACTIF` depuis le 21 septembre 2026.

Les ADR-001 à ADR-083 vivent dans [ARCHITECTURE.md](../../ARCHITECTURE.md).
Celui-ci ouvre un dossier séparé parce qu'il gouverne un chantier de plusieurs
mois, avec ses propres phases et ses propres bloquants hors code.

## Décision

SONAA cesse d'être seulement un site de découverte. Il devient une plateforme
où un artiste vend ses morceaux, reçoit des pourboires, où un organisateur
dépose ses soirées et vend ses billets, et où un label gère son catalogue et
ses parts. Six phases, chacune close par une publication en production et un
point d'arrêt : 0 préparation, A les vendeurs, B la marchandise, C les
événements, D la billetterie, D.5 le label. Une septième, E, la distribution
numérique vers les magasins, ne commence pas avant que les six premières
tournent et que les décisions d'affaires soient prises.

Le relevé de l'existant, les douze contradictions et le plan détaillé sont
dans [docs/MARCHAND-INSPECTION.md](../MARCHAND-INSPECTION.md). Les arbitrages
qui reviennent à Mika sont en fin de [HANDOFF.md](../../HANDOFF.md).

## Le nommage, et pourquoi il fallait le trancher d'abord

**Mixtapes** remplace **Sons** : ce sont les sets de DJ déposés par les
membres, longs, continus, gratuits. **Tracks** est la nouvelle section, les
morceaux vendus à l'unité.

Le mot « track » était déjà pris. Le corpus appelle `tracks` les 2 382 morceaux
de référence des genres, dans `corpus.json`, dans `track_votes`, dans
`track_scores`, dans `tracks-canon.md` et dans `npm run check:matcher`. Laisser
le même mot désigner deux choses aurait produit, à terme, une fonction
`tracksDuGenre` dont personne n'aurait su si elle rendait des références ou de
la marchandise.

L'arbitrage tient en une ligne : **le public voit « Tracks », le code et la
base écrivent `tracks_vendues` pour la marchandise, et `morceaux` reste le mot
du corpus, inchangé.** Les deux listes ne se croisent jamais.

## Ce que la phase 0 a livré

Le dictionnaire renommé, dans les deux langues, clés et valeurs : vingt-deux
clés passent de `set` à `mixtape`, et une douzaine de phrases sont réécrites.
Les routes `#/mixtapes`, `#/tracks`, `#/panier`, `#/conditions`,
`#/confidentialite`, `#/mentions`, et leurs chemins pré-rendus. Le magasin du
panier et son écran, vides. Les trois pages légales, en place, structurées,
sans texte. Le menu refondu.

## Les quatre contraintes retenues du rapport d'inspection

Elles ne sont pas des préférences, elles sont mesurées, et elles décident de
la forme des phases suivantes.

**1. Un paiement Stripe, un seul destinataire.** `transfer_data[destination]`
n'accepte qu'un compte connecté. Un panier qui mélange deux artistes impose
d'encaisser sur le compte de la plateforme puis de créer un virement par
vendeur sous un `transfer_group` commun. Conséquence d'affaires, pas
technique : SONAA devient le vendeur officiel, donc le percepteur de la TPS et
de la TVQ.

**2. Les masters payants sortent de la lecture publique.** Le Worker sert
aujourd'hui tout objet du seau R2 dont la clé ne commence pas par `api/`, et
c'est juste pour une mixtape gratuite : le commentaire du code dit que ce qui
protège un brouillon n'est pas le secret du chemin mais le fait que la base ne
le donne à personne. Un morceau payant renverse l'hypothèse, puisque la base
donnera son chemin à l'acheteur. Les fichiers vendus vivront derrière un
préfixe que cette route refuse, et ne sortiront que par un lien signé de courte
durée.

**3. Pas de MP3 fabriqué par le serveur.** La passerelle est un Worker : 128 Mo
de mémoire, pas de binaire natif, et le chargement de WebAssembly depuis une
source distante y est interdit. Encoder à la demande est impossible. L'artiste
fournira ses formats. L'étiquetage des métadonnées à la volée, lui, reste
possible : écrire un bloc de tags n'est pas réencoder.

**4. `soirees_manuelles` sera réparée avant la phase C.** La table porte des
politiques, un déclencheur, cinq adaptateurs et une route de la passerelle,
mais aucune migration ne la crée : sa forme n'existe que dans la base de
production. Les événements de la communauté s'y rattachent.

## La mise en ligne est conditionnée à un drapeau

**Ajouté le 21 septembre 2026.** La phase 0 avait ouvert les portes avant la
boutique : Tracks et Panier étaient dans le menu du bureau, dans la barre du
téléphone, et Tracks était même indexable. La raison écrite alors se tenait,
« une adresse apprise aujourd'hui est une adresse déjà classée le jour de
l'ouverture », mais elle supposait une date d'ouverture. Il n'y en a pas.

**`MARCHAND_ACTIF`, dans `src/config.ts`, est à `false`.** Tant qu'il y est :

- Tracks et Panier sortent du menu du bureau, de la barre du téléphone, du
  bouton « Plus » et du pied de page, qui ne les portait déjà pas ;
- `#/tracks` et `#/panier` répondent toujours, et rendent une page « Bientôt »
  dans les deux langues, avec un retour au calendrier ;
- leurs pages pré-rendues portent `noindex, follow` et sortent donc du plan du
  site et d'IndexNow ;
- le panier persistant garde ce qu'il contient, mais plus personne ne le lit :
  le compteur n'est plus rendu, donc le stockage local n'est plus ouvert.

**Rien n'est supprimé.** Ni code, ni route, ni migration, ni test. `TracksPage`
et `PanierEcran` existent, restent chargés à la demande, et reviennent en
remettant le drapeau à `true`. C'est le même mécanisme que
`PROPOSITIONS_OUVERTES`, et pour la même raison : ce qui se ferme, ce sont les
portes.

### Les deux conditions qui le remettent à `true`, et elles sont cumulatives

1. **Le compte Stripe Connect est actif**, pas seulement créé. Sans lui aucune
   vente n'est encaissable, et une page qui annonce une vente qu'on ne peut
   pas encaisser est une promesse qu'on ne tient pas.
2. **Les conditions de vente sont en ligne et écrites**, pas seulement
   structurées. Les trois pages légales existent depuis le 17 septembre 2026
   avec leurs titres et sans leur texte ; vendre avant qu'elles soient
   remplies expose Mika personnellement.

**Le drapeau seul suffit à rouvrir**, et c'est ce que vérifie
`src/marchand/marchand-ferme.test.tsx` : il relit les trois menus d'un coup,
parce que fermer quatre portes à la main, c'est en fermer trois et découvrir
la quatrième en production.

## Le menu, et ce qu'il coûte sur téléphone

**Sur ordinateur, les mots reviennent.** Le menu a porté des icônes avec le nom
au survol du 14 au 17 septembre 2026. Cinq portes se devinent en dessins, sept
ne se devinent plus, et les deux nouvelles sont justement celles qu'un visiteur
ne cherchera pas s'il doit deviner : un panier se reconnaît, une section de
vente appelée Tracks, non. Calendrier, News, Styles, Mixtapes, Tracks, puis, à
part, Panier et Profil.

**Sur téléphone, il faut dire ce qu'on perd.** Sous 900 px, la barre du bas ne
s'ajoute pas au menu du haut, elle le remplace : `barre-bas.css` efface la
rangée de mots. Ce qui sort des cinq onglets n'est donc plus atteignable, et le
rapport d'inspection l'avait dit avant qu'on y touche. La barre porte
désormais Calendrier, Tracks, Mixtapes, News, Panier ; **Styles et Profil en
sortent.** Ils ne disparaissent pas : un bouton « Plus » apparaît dans
l'en-tête sous 900 px et les porte, avec « À propos » et les trois pages
légales.

**Validé par Mika le 17 septembre 2026** : Styles reste dans le bouton
« Plus » sur téléphone.

C'est un compromis, et il est assumé. Styles reste la section qui porte les 219
genres et presque tout le référencement ; la sortir de la barre du bas est le
prix de deux portes marchandes. Si les mesures montrent que les visites de
Styles s'effondrent sur téléphone, la décision se rouvre : c'est une liste de
cinq entrées dans un fichier.

**Rouverte le 21 septembre 2026, et plus tôt que prévu.** Pas par une mesure
de fréquentation, par une autre raison : Tracks et le Panier ne s'annoncent
plus tant que rien ne se vend, donc la place qu'ils prenaient est libre et la
contrepartie n'a plus d'objet. Styles reprend la sienne dans la barre, et sort
du bouton « Plus » pour ne pas y être deux fois. La barre tombe à quatre
onglets : Calendrier, Styles, Mixtapes, News.

« Plus » n'entre pas dans la barre pour autant. Il vit déjà dans l'en-tête sur
téléphone, et deux portes vers le même menu à deux endroits du même écran se
cherchent au lieu de se trouver. Quatre onglets sont aussi plus larges que
cinq, donc plus faciles à viser.

Le seuil monte de 768 à 900 px, et c'est le seul endroit du site où cette
frontière-là vaut 900 : entre les deux, sept mots tombaient à la ligne sous le
logo.

## Les anciennes adresses ne sont pas retirées

`#/sets` et `/sons/` répondent toujours. Ces adresses ont été publiques du 2 au
17 septembre, elles vivent dans des liens partagés, et leurs pages ont été
soumises à Google et à Bing le 14 septembre. GitHub Pages ne sait pas répondre
301 : la seule redirection possible est une page qui se sert elle-même et qui
déclare, par un canonique, où est la bonne adresse. C'est ce qui est fait, et
le corps de la page porte en tête un lien cliquable vers la nouvelle.

**Elles sortent en revanche du plan du site.** Un plan de site ne liste que des
canoniques ; y laisser une adresse qui déclare elle-même qu'une autre fait
autorité demande au moteur d'arbitrer une contradiction qu'on a créée soi-même.

## Impacts hors code, qui bloquent des phases entières

- **Incorporation.** Encaisser pour des tiers fait de SONAA un intermédiaire,
  et la contrainte 1 en fait le vendeur officiel. Incorporer avant la phase B.2
  n'est pas une précaution, c'est la condition.
- **Textes légaux.** Conditions de vente, politique de remboursement,
  déclaration de droits de l'artiste, politique de confidentialité. Les pages
  existent depuis aujourd'hui ; leur texte vient d'un avocat, pas du code.
- **Stripe Connect.** Aucune vente sans compte activé. C'est le premier geste
  de la phase A.

## Ce que la phase 0 n'a pas fait

Aucune migration, aucun appel Stripe, aucun secret nouveau, aucun fichier
vendu, aucune écriture dans la page Tracks, qui affiche « bientôt » et le dit.
