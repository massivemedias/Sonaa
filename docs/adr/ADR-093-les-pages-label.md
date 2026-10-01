# ADR-093 : une page par label

Date : 1er octobre 2026. Statut : accepté.

## Ce qui est décidé

Chaque label que l'atlas connaît a une page, `#/labels/<slug>`, et une vraie
page HTML pour les moteurs, `/labels/<slug>/`. Quand on tape son nom dans la
recherche, sa fiche sort en tête, avant les genres et les morceaux.

Une page dit, dans cet ordre :

1. qui : le nom, le pays, l'année de fondation, les fondateurs, le site, et
   la présentation de Wikipédia avec son lien et sa licence ;
2. ce qui s'en écoute ici : ses morceaux dans l'atlas, jouables dans le
   mini lecteur, chacun avec son style, et ses styles en pastilles ;
3. ce qui a compté : ses sorties que le plus de collectionneurs possèdent
   chez Discogs, en pochettes.

## Quels labels

Tous ceux que le corpus cite, à condition d'avoir au moins trois morceaux
dans l'atlas ou une page Wikipédia : 393 le 1er octobre 2026. Le nombre seul
ne suffisait pas, F Communications, Kompakt et Ostgut Ton n'ont qu'un morceau
chacun dans le corpus.

## D'où viennent les données

- Wikidata (CC0) pour les faits, interrogé en exigeant que l'élément soit un
  label : « Tresor » est aussi un club.
- Wikipédia (CC BY-SA) pour la présentation, citée par un lien.
- Discogs pour les sorties les plus possédées, électroniques d'abord : chez un
  label généraliste comme Columbia, Miles Davis passerait avant Daft Punk.

Les morceaux de l'atlas ne sont pas recopiés dans la fiche : la page les
retrouve dans le corpus par le nom du label (`cleDeLabel`).

## Coût

Aucun coût récurrent : la moisson (`npm run moissonner:labels`) tourne avec
les clés déjà posées, et les pages sont générées au déploiement. La moisson
de la nuit ajoute les nouveaux labels chaque nuit et refait tout le premier
du mois.

## La galerie et les logos (ajout du 1er octobre 2026)

`#/labels` est une galerie, ouverte depuis la barre de navigation (après
Styles) et le menu « Plus » sur téléphone. Elle se cherche, se trie par
succès ou de A à Z, et se filtre par pays. En tête, huit incontournables :
les labels qui marchent le mieux, tous styles confondus, sans les majors ni
leurs filiales (décision de Mika, 1er octobre 2026). Le succès d'un label est
la somme des collectionneurs de ses sorties électroniques les plus possédées
chez Discogs : un catalogue qui marche compte plus qu'un tube isolé, et un
label de rap ne passe pas devant grâce à ses disques de rap.

Chaque label porte son logo :

- celui de Wikimedia Commons d'abord, quand sa licence est libre (domaine
  public, CC0, CC BY), avec son crédit sur la fiche ;
- l'image du label chez Discogs sinon, comme ses pochettes ;
- à défaut, un monogramme teinté par le nom, pour que la galerie reste
  une grille de visuels et non une liste de trous.

Le pays, moissonné en français, s'affiche dans la langue du site.

## VRSTL Records, ajouté à la main (1er octobre 2026)

Le corpus ne cite aucun morceau de Maudite Machine (ADR-050), donc aucun de
VRSTL Records, et la galerie ne le listait pas. Mika veut y trouver son
label : la moisson a une liste de labels ajoutés à la main, absents du
corpus, dont la fiche vient de Discogs comme les autres. Le canon des genres
reste sans l'auteur ; seule la galerie, qui est un annuaire, le liste.

## Les labels d'un style, et le style ouvert (1er octobre 2026)

La ligne « Labels » de la fiche d'un style croise deux sources
(`labelsDuStyle`) : les labels que la fiche nomme, choisis à la main, rangés
par leurs morceaux du style dans l'atlas ; puis ceux que l'atlas y ajoute à
partir de deux morceaux, hors majors et filiales. Chacun porte son logo et
ouvre sa page avec ce style déjà choisi : `#/labels/warp-records?style=idm`
montre les morceaux d'IDM de Warp, et un bouton rend les autres. Sur la page
d'un label, les pastilles de styles font la même chose sur place, et
l'adresse suit. Les pages HTML des styles lient ces labels à leurs pages.
