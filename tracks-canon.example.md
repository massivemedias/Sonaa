# Exemple de format pour tracks-canon.md

Copier ce fichier en `tracks-canon.md` à la racine, puis remplacer le contenu.
`npm run import:tracks` ne lit que `tracks-canon.md`, jamais cet exemple.

Un tableau par genre. Le titre de section porte l'identifiant du genre entre
accents graves, tel qu'il figure dans `src/data/corpus.json`. Les colonnes sont
repérées par leur en-tête et non par leur position : l'ordre est libre.

`annee` et `role` sont facultatifs. `role` est documentaire, sauf la valeur
`actuel`, qui range le morceau dans l'onglet Actuel au lieu d'Essentiel.

Les genres à compléter sont nommés en fin de `npm run validate:data`.

## `suomisaundi`

| artiste       | titre               | annee | role      |
|---------------|---------------------|-------|-----------|
| Texas Faggott | Kinnostus           | 1999  | fondateur |
| Texas Faggott | Polina In The Fog   | 2000  | essentiel |
| Haltya        | Groovymeisseli      | 2001  | essentiel |

## `cosmic`

| titre        | artiste      | annee |
|--------------|--------------|-------|
| Future Times | Ilija Rudman | 2010  |
| Come Closer  | Ilija Rudman | 2012  |
