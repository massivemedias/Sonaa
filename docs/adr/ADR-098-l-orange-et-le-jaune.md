# ADR-098 : l'accent devient orange, avec du jaune

Date : 3 octobre 2026. Statut : accepté. Remplace [ADR-096](ADR-096-l-accent-vert.md).

## Pourquoi

En voyant les platines dessinées comme la MM-808 de mauditemachine.com, Mika
a demandé : « passe tout Sonaa au lieu du vert, je veux du orange et aussi
du jaune, mais garde bien sûr le dark mode ». Le site et la machine
partagent déjà leur fond de granite ; ils partagent maintenant leurs
couleurs d'action.

## Ce qui est décidé

- `--accent` vaut `#ff6a13`, l'orange de navigation de la MM-808. Il est
  vif et acide : ce n'est pas le terracotta sourd de claude.ai que l'ADR-096
  avait chassé.
- `--accent-jaune` vaut `#ffd75e`, le jaune vif de la machine, pour
  l'élément actif.
- `--accent-degrade`, le second ton du dégradé de Track ID, devient ce
  jaune : le bouton passe de l'orange à l'ambre.
- `--accent-voile` est l'orange à 16 %.
- `--sur-accent` reste presque noir.

Le site reste sombre seulement. Les couleurs d'alerte ne changent pas.

## Sur les platines

Mika veut peu de couleurs : l'orange pour ce qui joue et pour le cue, le
jaune pour ce qui est posé (hot cues, repères), l'os de la sérigraphie et le
graphite. Les hot cues n'ont plus chacun leur couleur. Voir ADR-097.
