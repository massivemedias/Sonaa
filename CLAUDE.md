# SONAA, conventions de travail

Ce fichier est lu à l'ouverture de chaque session. Il porte ce qui ne se
redemande pas.

## Le rapport de fin de mission

À la fin de CHAQUE mission, phase, sous-phase ou correctif, la sortie se
termine par un bloc sous ce titre exact :

`Rapport CLAUDE DESKTOP - <nom de la mission>`

Ce bloc est la dernière chose écrite. Rien en dessous, pas une phrase, pas une
question, pas une offre. Mika le copie tel quel dans Claude Desktop.

Structure obligatoire, dans cet ordre :

- **État** : une ligne. Publié, En attente ou Bloqué, avec la raison.
- **Ce qui a été fait** : 3 à 7 puces, un livrable observable par puce.
- **Ce que Mika doit faire** : numéroté, uniquement ce qui exige son compte,
  son argent, sa signature ou sa validation visuelle.
- **Arbitrages en attente** : 0 à 3 questions fermées, avec deux options
  nommées chacune.
- **Points d'attention** : 0 à 3 puces, pour les choix qui divergent du prompt
  reçu et pour les dépendances externes.
- **Fichiers touchés** : liste brute, un par ligne, au format `chemin +N/-N`.
- **Prochaine phase suggérée** : une ligne, avec sa condition de démarrage.

Règles d'écriture du bloc : français direct, aucun tiret cadratin ni
demi-cadratin, aucun emoji, aucune auto-évaluation, une phrase par puce.

Le texte qui précède le bloc reste ce qu'il a toujours été : court, un
paragraphe, et seulement ce que Mika doit faire lui-même.

## Publier

Uniquement par `npm run publier`. Il refuse si l'arbre git n'est pas propre ou
si l'un des vingt et un contrôles échoue. Ensuite, vérifier que le
déploiement est vert, puis vérifier en ligne avec `?nocache=1`. Ne jamais
revenir à un ancien commit.

## Écriture

- Aucun tiret cadratin ni demi-cadratin, nulle part. Virgule ou trait d'union.
- Prose française avec accents. Commentaires de code en français sans accents.
- Tout libellé affiché passe par `src/langue/langue.ts`, en français et en
  anglais dès la première version.

## Données

- Le corpus ne s'écrit que par `scripts/lib/corpus-store.ts`.
- Aucun secret dans le dépôt ni dans le bundle.
- Claude ne tape ni ne colle jamais une clé ou un mot de passe de Mika. Il
  peut cliquer un bouton « copier » et coller sans lire la valeur.

## Où lire le reste

- `ARCHITECTURE.md` : les décisions ADR-001 à ADR-083.
- `docs/adr/` : une décision par fichier, à partir d'ADR-084.
- `DESIGN.md` : la direction artistique et ses interdits.
- `docs/MARCHAND-INSPECTION.md` : le plan de la couche marchande.
- `HANDOFF.md` : les arbitrages en attente, en fin de fichier.
