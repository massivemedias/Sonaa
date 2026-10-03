# ADR-096 : l'accent devient vert

Date : 2 octobre 2026. Statut : remplacé le 3 octobre 2026 par
[ADR-098](ADR-098-l-orange-et-le-jaune.md).

## Pourquoi

Un visiteur a reconnu tout de suite un site « fait avec Claude ». L'analyse
du 2 octobre a désigné d'abord la palette : un accent terracotta sur un noir
chaud et un texte crème, c'est l'identité visuelle de claude.ai. Mika a
tranché : l'accent passe à #00FF62.

## Ce qui est décidé

- `--accent` vaut `#00ff62` (oklch 0,87 0,26 147). Comme texte sur le
  granite, il dépasse 14 pour 1.
- `--sur-accent` reste presque noir : un fond vert porte du texte sombre.
- `--accent-voile` est ce vert à 16 %.
- Le dégradé du geste Track ID mélangeait l'accent avec un rouge ; avec du
  vert, ce mélange aurait donné du kaki. Son second ton devient un jeton,
  `--accent-degrade`, un vert d'eau de même clarté.

Les couleurs d'alerte (ambre, rouge) ne changent pas : elles disent un état,
pas la marque.

## Ce que cela lève

DESIGN.md interdisait « un accent acide unique sur fond noir pur ». Le fond
reste du granite, ni noir pur ni uni, mais l'accent est désormais acide : la
moitié de cet interdit est levée par Mika le 2 octobre 2026.
