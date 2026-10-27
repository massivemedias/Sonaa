# ADR-104 : l'accent devient plus clair

Date : 27 octobre 2026. Statut : accepté. Modifie [ADR-102](ADR-102-orange-sanguin.md).

## Pourquoi

Mika, devant la page d'une mixtape : « le rouge est vraiment trop rouge,
peut-être faire plus clair, moins flashy ». L'orange sanguin `#e8441e`
tirait trop vers le rouge et criait sur le fond sombre.

## Ce qui est décidé

- `--accent` vaut `#f07a50` : plus clair, un peu plus orange.
- `--accent-voile` est cet orange à 16 %.
- Les deux couleurs écrites en dur (le reel, la forme d'onde en repli)
  suivent.

## Ce qui est évité

Plus clair et moins saturé, l'orange devient vite terracotta, que Mika a
refusé. La saturation reste haute : la teinte est claire mais vive.

## Le contraste, mesuré

La luminance relative de `#f07a50` est d'environ 0,33. Comme texte sur le
granite, le rapport est d'environ 7 pour 1 ; sous l'encre presque noire de
`--sur-accent`, aussi. C'est mieux qu'avant (4,9 pour 1).
