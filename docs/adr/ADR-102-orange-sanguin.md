# ADR-102 : l'accent devient orange sanguin

Date : 10 octobre 2026. Statut : accepté. Modifie [ADR-098](ADR-098-l-orange-et-le-jaune.md).

## Pourquoi

Mika, devant le nouvel accueil : « la couleur orange est cool mais je
préfère orange sanguin ». L'orange vif de la MM-808 (`#ff6a13`) tirait vers
le jaune ; il le veut plus rouge, plus sombre.

## Ce qui est décidé

- `--accent` vaut `#e8441e`, un orange sanguin.
- `--accent-voile` est cet orange à 16 %.
- `--accent-jaune` (`#ffd75e`) et `--sur-accent` (encre presque noire) ne
  changent pas.

## Le contraste, mesuré

La luminance relative de `#e8441e` est d'environ 0,21. Comme texte sur le
granite (luminance proche de 0,003), le rapport est d'environ 4,9 pour 1 ;
sous l'encre presque noire de `--sur-accent`, aussi. Les deux rôles restent
au niveau AA pour le texte courant.

## Ce qui ne change pas

Le site reste sombre seulement. Le jaune dit toujours l'élément actif. Les
couleurs d'alerte et les teintes des familles ne bougent pas.
