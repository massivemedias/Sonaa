# ADR-087 : la racine de /styles/ est un nuage de bulles

**Date** : 22 septembre 2026
**Statut** : en vigueur
**Remplace** : la grille des quatorze tuiles de famille, posée le 21 septembre
2026 et redessinée le 22 au matin.

## La décision

En haut de `/styles/`, les quatorze familles ne sont plus une grille de
tuiles rectangulaires mais quatorze cercles de verre empilés, un par famille.
Le diamètre porte l'information : il suit la racine du nombre de genres.

## Pourquoi la racine et non le nombre

C'est l'aire du disque qu'on lit, pas son rayon, et l'aire va comme le carré
du rayon. À rayon proportionnel au compte, House (24 genres) couvrirait seize
fois la surface de Minimal (11), ce qui ne dit plus rien de juste. À rayon
proportionnel à la racine, elle en couvre 2,2 fois, ce qui est le rapport
réel.

## Pourquoi un empilement calculé

`packSiblings` de d3-hierarchy range des cercles de rayons donnés en les
rendant tangents. C'est la seule dépendance ajoutée, et seule cette fonction
est importée. Le calcul est déterministe : à même entrée, même sortie, donc le
nuage ne tremble pas d'un rendu à l'autre et ne change qu'avec la largeur.

La hauteur du conteneur vient du calcul, pas d'une valeur écrite. Personne ne
la maintient.

## Ce que la largeur impose, et qu'on ne corrigera pas

L'amas est rond : sa largeur et sa hauteur vont ensemble. Les bornes demandées
étaient 120 à 220 px sur ordinateur, 90 à 160 sur téléphone. Sur ordinateur
elles tiennent exactement : mesuré, 149 à 220 px dans un amas de 749 × 800.

Sur téléphone elles ne peuvent pas tenir, et c'est de l'arithmétique. Quatorze
disques de 90 px couvrent 89 000 px² ; un empilement rond en demande environ
111 000, soit un amas de 376 px de large. Un iPhone en offre 343. Les rayons
cèdent donc tous ensemble, dans le même rapport : mesuré, 70 à 103 px.

Un test fixe ce comportement (`NuageFamilles.test.ts`), précisément pour que
personne ne le « répare » plus tard en laissant le nuage déborder de l'écran.

## Le corps du texte suit le diamètre, pas l'écran

Une taille choisie par media query irait bien à la plus grosse bulle et
déborderait de la plus petite, qui dans le même écran fait moitié moins. Le
diamètre est donc passé à la feuille de style en variable, et le nom comme le
compte s'y règlent. Vérifié : aucun des quatorze noms ne dépasse son cercle,
ni sur ordinateur ni sur téléphone.

## Le pré-rendu ne change pas de rôle

La liste des quatorze familles reste dans le HTML statique de `/styles/`, en
liens simples. C'est ce que lit un moteur, et ce que voit quelqu'un qui arrive
avant que le bundle soit là. Le nuage s'y substitue à l'hydratation.

Le lien vers l'index à plat est parti de cette page, HTML statique compris.
La route `#/index` reste servie par l'application.
