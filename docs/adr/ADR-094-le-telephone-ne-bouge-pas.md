# ADR-094 : sur téléphone, le site ne bouge pas

Date : 2 octobre 2026. Statut : accepté.

## Le signalement

Mika : « quand on change de bouton en bas, des fois le menu remonte et ça
casse la navigation. Je veux que le site soit totalement fonctionnel en
mobile, qu'il ne bouge pas et qu'il prenne tout l'espace possible. »

## Ce qui a été mesuré

À 390 px, en enchaînant les onglets de la barre du bas après avoir fait
défiler chaque page :

1. La page suivante héritait de la position de défilement de la précédente.
   De News descendu à 1 500 px, le calendrier s'ouvrait à 391 px.
2. L'accueil (Parcourir) était la seule page à défiler dans une boîte, une
   vue fixe sur tout l'écran dont seul le corps défile. Les autres pages font
   défiler le document. Sur iPhone, Safari ne replie sa barre d'adresse que
   quand le document défile : sur l'accueil elle restait dépliée, et elle se
   repliait ou se redépliait à chaque changement d'onglet, en faisant monter
   et descendre la barre du bas.
3. Les champs de moins de 16 px (recherche des labels, menus du calendrier)
   font zoomer iPhone au toucher, et la page reste agrandie et décalée.
4. Le bandeau « écran d'accueil » d'iPhone prenait 137 px au-dessus de la
   barre du bas, sur chaque page, tant qu'on ne l'avait pas fermé.

## Ce qui est décidé

- Un changement de page s'ouvre en haut, avant la peinture
  (`useLayoutEffect` dans `main.tsx`). Toucher l'onglet de la page où l'on
  est ramène en haut, comme dans une application.
- Sous 900 px, Parcourir défile avec le document, comme toutes les pages :
  son en-tête devient fixe et sa réserve basse est celle de `body`.
  L'ordinateur garde sa vue en boîte, sa barre d'adresse ne bougeant pas.
- Sous 900 px, tout champ fait au moins 16 px, et le rebond en haut et en bas
  de page est coupé (`overscroll-behavior-y: none`).
- La hauteur minimale des pages est `100svh` (écran barre d'adresse dépliée)
  et non `100vh`, qui faisait défiler une page courte de la différence.
- L'invite d'iPhone tient sur une ligne et demie, son bouton à droite :
  72 px au lieu de 137.
- La galerie des labels se déroule par paquets de soixante cartes au lieu de
  mille trois cent soixante-dix d'un coup.

Le portail `mobile` de `npm run publier` vérifie les deux premiers points à
chaque publication : de News descendu, le calendrier doit s'ouvrir à 0 px, et
l'accueil doit défiler avec le document.

## Ce qui reste à voir sur un vrai iPhone

Le simulateur iOS n'est pas installé sur le Mac de développement, et
l'émulation d'un navigateur ne reproduit pas la barre d'adresse de Safari.
Le comportement de cette barre se confirme donc sur un vrai téléphone.
