# ADR-085 : la largeur des textes, decidee par le contenu et non par une mesure

Date : 21 septembre 2026. Statut : accepté, en production.

Les ADR-001 à ADR-083 vivent dans [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Le problème : une valeur rejugée quatre fois en sept jours

La description d'un genre a porté quatre largeurs en une semaine.

| Date | Mesure | Qui, et pourquoi |
|---|---|---|
| avant le 14 septembre 2026 | 62 signes | mesure de lecture classique |
| 14 septembre | 120 signes | Mika, sur capture : « prends la largeur qu'il faut, t'es en desktop » |
| 18 septembre | 70 signes | Mika, après mesure sur un écran de 2560 px : 120 signes donnaient 137 caractères par ligne |
| 21 septembre | la largeur du contenu | le présent document |

Les trois premières ont la même forme : une mesure de lecture cherchée au
jugement, sur un écran, puis corrigée sur un autre. Aucune n'était fausse sur
l'écran où elle avait été choisie, et aucune ne tenait sur le suivant.

**Une valeur qu'on rejuge trois fois n'est pas une valeur, c'est un symptôme.**
Le vrai défaut n'était pas le nombre, c'était l'existence d'un nombre : une
borne posée à côté du titre et de la grille, qui, eux, vont au bord de la
colonne, et qui ne bougeait pas quand la colonne bougeait.

## La décision

**Sur ordinateur, les descriptions prennent la largeur du contenu**, c'est-à-dire
exactement celle de la grille de tuiles au-dessus d'elles, 1240 px sur la
colonne de page actuelle. Le jour où la colonne change, elles suivent seules.

Cela concerne trois textes, et seulement eux :

- la description d'un genre, `.pv-description` ;
- le texte d'une famille, `.pv-description-famille`, qui porte les deux classes ;
- la description d'une mixtape et la bio d'un artiste, `.sp-description`.

**Le corps descend d'un pixel** : 17 px à 16 px pour les fiches de styles,
16 px à 15 px pour les mixtapes. C'est le prix de la pleine largeur, et c'est
ce qui la rend lisible : une dizaine de signes de plus par ligne sans que le
texte devienne petit.

**Sur téléphone, rien ne change.** Les deux règles sont dans une media query à
partir de 700 px, le seuil des fiches de styles. À 375 px, les 70 signes ne
mordaient déjà pas et le corps courant y est la bonne taille.

## Ce que cela coûte, et qui est assumé

Sur un très grand écran, une ligne passe les cent signes, au-dessus de la
fourchette de confort habituelle. C'est la conséquence directe et connue de la
décision, elle a été posée en la prenant, et le pixel retiré au corps est ce
qui la compense.

## Ce que cette décision ne touche pas

**Les chapeaux de section restent à cent signes**, portés par `.intro-page`
dans `design/base.css` : ce sont deux lignes sous un titre, pas un texte qu'on
lit d'un trait.

**Le texte d'auteur de la page À propos reste à 32 rem**, mesuré et décidé en
ADR-076 pour une raison qui lui appartient : il est en italique, dans une
colonne étroite par nature, et il a été borné à 68 signes après mesure.

**La page du micro garde ses 70 signes** sur son chapeau, `reconnaitre.css` :
elle n'a ni grille ni colonne de contenu à suivre.

## Où c'est écrit

- `src/atlas/parcourir.css`, dans la media query à partir de 700 px.
- `src/atlas/sets.css`, même seuil, et le seuil est cité comme venant de
  `parcourir.css` : deux seuils pour une même décision finiraient par diverger.
