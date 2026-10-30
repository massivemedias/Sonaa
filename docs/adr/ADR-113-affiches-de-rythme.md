# ADR-113 : une affiche de rythme par style, et ses couleurs dans tout le site

Date : 30 octobre 2026. Statut : accepté.

## Pourquoi

Mika a montré une publication Instagram : le nom d'un style en grand, une
devise en italique, le tempo, un cercle où chaque instrument dessine un
polygone, et une grille de pas dessous, sur un fond brun presque noir éclairé
d'ambre. Sa demande : « je veux la même chose dans chaque style de sonaa.ca,
je vais en faire la pub, et je veux les couleurs de ces publications dans tout
sonaa ».

## Ce qui est décidé

- Chaque page de style porte, sous la fiche technique, une affiche animée au
  format portrait d'Instagram (1080 x 1350). Le tour du cercle est une
  mesure, le haut est le premier temps. Chaque piste a son anneau, et ses
  frappes en sont les sommets. Une tête de lecture tourne au tempo du style.
  La grille du bas dit la même chose à plat.
- Le motif se joue dans la page, par un petit synthétiseur fait
  d'oscillateurs et de bruit, sans aucun échantillon. L'horloge est celle de
  l'audio, et le dessin la lit aussi.
- L'affiche se télécharge en image PNG et en vidéo MP4 de douze secondes
  environ, son compris, signée sonaa.ca. C'est ce que Mika publiera.
- Les 219 motifs sont dans `src/data/rythmes.json`. Ils ont été écrits à
  partir de la section « Rythme » du cours de chaque style et de la
  fourchette de tempo du corpus. Ce sont des motifs d'école, la forme la plus
  reconnaissable du style, et non le relevé d'un morceau. Un test vérifie que
  chaque style en a un, qu'il est bien formé, que son tempo reste dans la
  fourchette du corpus et que deux styles n'ont jamais le même motif.
- La palette du site prend les couleurs de ces affiches. Le granite se
  réchauffe (chroma 0,014 au lieu de 0,004), l'encre vire à la crème,
  l'accent passe de l'orange #FF7A1A à l'ambre #E9A23B, le jaune #FFD75E au
  sable #E8CF8A. Une lueur ambre très faible éclaire le haut des pages. Les
  cinq teintes de piste sont des jetons, `--piste-1` à `--piste-5`, dans un
  ordre fixe : ambre, vert, orange brûlé, sable, brun.
- Le titre et la devise de l'affiche sont en serif. L'interdit du serif à
  fort contraste tient pour l'interface, qui reste en Inter. Il est levé pour
  cette image, qui est faite pour Instagram.

## Ce qui a été mesuré

Dans un Chromium 152, `MediaRecorder.isTypeSupported` répond oui pour le MP4
avec son AAC, et l'enregistrement rend 12 ko, une seule image : l'encodeur
AAC manque. L'export juge donc le fichier sur pièces. Sous 100 ko, il le
refait avec le format suivant. Le MP4 du navigateur a alors rendu 7,8 Mo,
11,6 secondes, en 1080 x 1350.

## Ce que cela ne fait pas

- La fondamentale du synthétiseur est un la grave pour tous les styles : la
  page ne connaît pas la tonalité des morceaux.
- L'affiche n'est pas encore l'image de partage des pages pré-rendues. Il
  faudrait la dessiner au moment de la construction.
