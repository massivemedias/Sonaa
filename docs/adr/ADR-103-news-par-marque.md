# ADR-103 : les news par marque et par machine

Date : 18 octobre 2026. Statut : accepté.

## Pourquoi

Mika : « si je suis fan d'une machine, je vais chercher ses news un peu
partout, des vidéos, des articles, des discussions. J'ai acheté une Elektron
Analog Rytm, je veux toutes les news là-dessus. Le panneau News sert à ça :
la liste de toutes les news par constructeur, éditeur, et pareil pour les
fabricants de plugins. »

## Ce qui est décidé

- Un catalogue de marques et de machines, en quatre rayons (synthés et
  machines, matériel DJ, éditeurs de logiciels, plugins), dans
  `src/data/marques.ts`, avec la manière de reconnaître chaque machine dans
  un titre. Un nom de machine qui est aussi un mot courant ne compte que si la
  marque est nommée dans le même texte.
- Une archive en base, `actu_marques`, qui ne se vide pas. Le fil du jour
  reste `news.json` ; l'archive, elle, grossit et se cherche par marque, par
  machine et par genre (article, vidéo, discussion).
- Une moisson deux fois par jour (`scripts/moissonner-marques.ts`, action
  `actu-marques.yml`) : les flux des magazines du matériel et des plugins, la
  recherche que ces sites offrent eux-mêmes en flux, les chaînes YouTube des
  marques et des testeurs, la recherche YouTube par machine (budget fixe),
  les forums des marques et Reddit. Elle repasse dès que le catalogue change,
  et fait d'elle-même la passe complète tant que l'archive est presque vide.
- Les suivis, `suivis_marques` : un compte suit une marque entière ou une
  seule machine, et retrouve tout dans « Mes machines ».

## Ce qui est écarté

- Google News et Bing News. Leurs flux de recherche seraient la source la
  plus large, mais leurs conditions interdisent d'en republier les résultats
  ailleurs que dans un lecteur personnel.
- Un fichier par marque commis dans le dépôt : soixante-dix fichiers réécrits
  deux fois par jour alourdiraient l'historique, et on n'y chercherait pas
  par machine.

## Ce qui reste fragile

Reddit refuse vite les lectures anonymes (429). La moisson s'arrête après
trois refus et ne compte pas sur lui ; les forums des marques portent les
discussions.
