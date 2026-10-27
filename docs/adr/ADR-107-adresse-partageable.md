# ADR-107 : l'adresse affichée est celle de la page ouverte

Date : 27 octobre 2026. Statut : accepté.

## Pourquoi

Mika a partagé la mixtape « Versatile Events Lobby » sur Facebook en copiant
la barre d'adresse : `sonaa.ca/#/mixtapes/<id>`. Facebook ne lit jamais ce
qui suit le croisillon, il a donc lu l'accueil, et l'aperçu ne montrait ni le
titre ni la pochette. La page à partager existait pourtant,
`/mixtapes/<id>/`, avec son titre, sa description et sa pochette.

## Ce qui est décidé

- À chaque changement d'ancre, l'app remplace le chemin par celui de la page
  ouverte (`cheminAligne` dans `src/lib/chemins.ts`). L'adresse copiée
  devient `sonaa.ca/mixtapes/<id>/#/mixtapes/<id>`, et Facebook lit la page
  de la mixtape. Il en va de même pour les styles, les labels, les news et
  les pages fixes.
- Un chemin qui ouvre déjà la même page reste : `/sons/<id>/`, `/en/styles/`
  et la page d'une soirée arrivée d'un moteur ne sont pas réécrits.
- Le calendrier, et toute ancre sans page à elle, rendent la racine.
  Changer de ville depuis `/soirees/montreal-ca/` met le chemin de la
  nouvelle ville.
- `dist/404.html` est la coquille de l'app, hors index. Une mixtape déposée
  après la dernière construction n'a pas encore sa page : recharger son
  adresse ouvre quand même le site au lieu de la 404 de GitHub.

## Ce que cela ne sait pas faire

- L'ancre reste dans l'adresse : le routage de l'app vit dessus. La retirer
  demanderait de réécrire le routage entier.
- Une mixtape n'a d'aperçu Facebook qu'après la construction suivante, qui
  a lieu plusieurs fois par jour (moissons et news la relancent).
