# ADR-116 : un seul menu au téléphone, et plus de carte en trois dimensions

Date : 9 novembre 2026. Statut : accepté.

## Pourquoi

Mika, sur son téléphone, le 9 novembre 2026 : « je veux plus voir les icônes
dans le bas, je veux juste voir tout dans le menu hamburger en haut à
droite », « enlève la carte 3D, supprime-la d'ailleurs, je veux plus la
voir », et « la carte est un peu grande en mobile, faut scroller pas mal pour
voir les events ; montre-moi les trois plus pertinents, ensuite la carte,
ensuite les autres ».

## Ce qui est décidé

- La barre d'onglets du bas est retirée, avec son bouton « Plus » et le petit
  panneau qu'il ouvrait. Sous 900 px, toute la navigation passe par le menu
  hamburger de l'en-tête : les sept pages, le profil, À propos, la recherche,
  la langue et les pages légales. Seul le mini-lecteur reste fixé en bas, et
  le corps de page lui réserve sa hauteur (mini-lecteur.css).
- La carte en trois dimensions est supprimée : la page, son moteur WebGL,
  son lecteur plein écran, ses vues colonnes et niveaux, son intro, et la
  dépendance three.js. Son adresse, #/carte, mène aux styles. Les vues
  secondaires (index, chronologie, chaleur, arbre) ouvrent un genre dans sa
  page de style au lieu de la carte.
- Les commentaires et les votes sur les morceaux n'étaient affichés que dans
  cette carte : leur interface part avec elle. Les tables en base ne sont pas
  touchées, et la modération des commentaires reste dans l'administration.
- En mode Carte, le calendrier montre d'abord trois soirées « À ne pas
  manquer » (les mises en avant, puis les plus suivies chez Resident Advisor,
  puis la plus proche), puis la carte, plus basse au téléphone, puis toutes
  les autres soirées.

## Ce que cela engage

Le contrôle mobile (scripts/check-mobile.ts) exige maintenant l'absence de
barre du bas et la présence du bouton hamburger sous 900 px. Il change de
page par le menu hamburger pour vérifier qu'une page s'ouvre en haut.
