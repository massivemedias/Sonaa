# ADR-101 : les Decks partent sur mauditemachine.com

Date : 4 octobre 2026. Statut : accepté. Remplace [ADR-097](ADR-097-les-platines.md), [ADR-099](ADR-099-mes-morceaux.md) et [ADR-100](ADR-100-un-peu-de-3d.md).

## Pourquoi

Mika, le 4 octobre 2026 : « je veux bouger Deck dans mauditemachine.com », puis « en 3D ». Les deux platines et le mixer y sont devenus MM-DECKS, une troisième machine en trois dimensions à côté du MM-RYTM et du MM-ARP, avec le moteur audio, la liste Audius, les fichiers de l'appareil, la forme d'onde et la playlist. Le même jour, Mika : « retire maintenant Deck de Sonaa ».

## Ce qui est décidé

- La page Decks, son code (`src/platines/`), ses entrées de menu, ses libellés en français et en anglais, sa page du contrôle mobile et le logotype de Maudite Machine qui coiffait ses plaques quittent Sonaa.
- Une adresse publiée ne se retire pas, elle se redirige : `#/decks` et l'ancienne `#/platines` mènent à https://mauditemachine.com/. Le site n'a pas d'adresse par machine : on y arrive sur la vue d'ensemble, où MM-DECKS se voit.
- L'accent orange et jaune ([ADR-098](ADR-098-l-orange-et-le-jaune.md)) reste : il est né des Decks, il vit désormais dans tout Sonaa.
- Les morceaux copiés par la caisse des Decks restent dans le navigateur de ceux qui en avaient ajouté (base `sonaa-caisse`) : Sonaa ne les lit plus. Les effacer est un choix laissé à Mika.

## Ce que cela lève

L'exception de [ADR-100](ADR-100-un-peu-de-3d.md) à l'interdit de l'illustration 3D disparaît avec les machines qu'elle concernait : l'interdit de DESIGN.md tient de nouveau partout.
