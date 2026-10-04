# ADR-100 : un peu de 3D pour les machines

Date : 3 octobre 2026. Statut : accepté.

## Pourquoi

Mika, devant les Decks : « je voudrais vraiment que ce soit un peu en 3D
pour les decks et le mixer, et appuie-toi sur ce design », en montrant la
MM-808 de mauditemachine.com, vue légèrement de face, avec son épaisseur.

## Ce qui est décidé

- Chaque machine s'incline vers l'arrière (`rotateX`, 11 degrés sur
  ordinateur, 7 sur téléphone) sous une perspective de 2 400 px prise
  au-dessus d'elle. Son arête avant accroche la lumière, sa face avant se
  voit, épaisse, et son ombre tombe sur la table.
- C'est du CSS. Il n'y a ni WebGL, ni caméra qui bouge, ni parallaxe.
- Les gestes restent justes : les écrans lisent la position du doigt dans
  leur propre repère (`offsetX`), pas dans celui de la fenêtre.

## Ce que cela lève

DESIGN.md interdisait l'illustration 3D et la perspective. Cet interdit est
levé pour les machines des Decks, et pour elles seules, à la demande de
Mika. Il tient pour le reste du site, et pour la couche WebGL.
