# ADR-088 : les familles prennent la tuile des genres, sans rien y ajouter

**Date** : 22 septembre 2026
**Statut** : en vigueur
**Remplace** : ADR-087, le nuage de bulles, publié le matin même. Et avec lui
les deux dessins de la veille : la tuile teintée à filet gauche, puis la tuile
à lueur radiale et chiffres fantômes.

## La décision

En haut de `/styles/`, les quatorze familles sont quatorze tuiles rigoureusement
identiques à celles des genres : mêmes classes `pv-tuile pv-tuile-genre` dans
la même `pv-grille`, même fond, mêmes coins, même hauteur de 112 px, même
survol en dégradé mauve à texte inversé.

Rien n'est ajouté. Pas de teinte de famille, pas de filet, pas de lueur, pas
de chiffre fantôme, pas de flottement, pas de tuile d'index.

La ligne sous le nom suit le même moule que celle d'un genre :
`1994 · 3 dérivés` pour un genre, `Années 1980 · 23 genres` pour une famille.
Quand, puis combien.

L'intro reprend celle d'une page de famille : « 14 familles. Appuyez pour
ouvrir. », en regard de « 16 genres. Appuyez pour ouvrir. »

## Pourquoi, après quatre essais en deux jours

Les trois premiers dessins cherchaient chacun à faire dire à la tuile de
famille qu'une famille n'est pas un genre. C'était la mauvaise question.

Sur cette page, une famille et un genre sont exactement la même chose : quelque
chose qu'on ouvre d'un doigt pour descendre d'un niveau. La grille des familles
et la grille des genres sont le même geste à deux hauteurs. Leur donner deux
apparences demandait au lecteur d'apprendre deux fois une interface qu'il
connaît déjà.

Ce n'est donc pas une économie de moyens, c'est ce que la page dit : le niveau
au-dessus se parcourt comme le niveau en dessous.

## Ce que cela retire

`d3-hierarchy` sort des dépendances : elle n'était là que pour l'empilement des
bulles. Le projet revient à son compte de dépendances de la veille.

Trois jeux de règles CSS sont partis avec leurs dessins, et `.pv-index`, qui
habillait le lien vers l'index à plat retiré la veille, est parti avec eux :
il ne restait plus rien pour le porter.

## Ce qui reste ouvert

Les familles s'affichent dans l'ordre du corpus, qui n'est pas l'ordre des
décennies : Roots, née dans les années 1940, vient en huitième position.
Personne n'a demandé de trier, et trier changerait un ordre que les autres vues
de l'atlas partagent. La question est posée dans le rapport du 22 septembre.
