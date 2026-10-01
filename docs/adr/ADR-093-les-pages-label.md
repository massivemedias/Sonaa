# ADR-093 : une page par label

Date : 1er octobre 2026. Statut : accepté.

## Ce qui est décidé

Chaque label que l'atlas connaît a une page, `#/labels/<slug>`, et une vraie
page HTML pour les moteurs, `/labels/<slug>/`. Quand on tape son nom dans la
recherche, sa fiche sort en tête, avant les genres et les morceaux.

Une page dit, dans cet ordre :

1. qui : le nom, le pays, l'année de fondation, les fondateurs, le site, et
   la présentation de Wikipédia avec son lien et sa licence ;
2. ce qui s'en écoute ici : ses morceaux dans l'atlas, jouables dans le
   mini lecteur, chacun avec son style, et ses styles en pastilles ;
3. ce qui a compté : ses sorties que le plus de collectionneurs possèdent
   chez Discogs, en pochettes.

## Quels labels

Tous ceux que le corpus cite, à condition d'avoir au moins trois morceaux
dans l'atlas ou une page Wikipédia : 393 le 1er octobre 2026. Le nombre seul
ne suffisait pas, F Communications, Kompakt et Ostgut Ton n'ont qu'un morceau
chacun dans le corpus.

## D'où viennent les données

- Wikidata (CC0) pour les faits, interrogé en exigeant que l'élément soit un
  label : « Tresor » est aussi un club.
- Wikipédia (CC BY-SA) pour la présentation, citée par un lien.
- Discogs pour les sorties les plus possédées, électroniques d'abord : chez un
  label généraliste comme Columbia, Miles Davis passerait avant Daft Punk.

Les morceaux de l'atlas ne sont pas recopiés dans la fiche : la page les
retrouve dans le corpus par le nom du label (`cleDeLabel`).

## Coût

Aucun coût récurrent : la moisson (`npm run moissonner:labels`) tourne avec
les clés déjà posées, et les pages sont générées au déploiement. La moisson
de la nuit ajoute les nouveaux labels chaque nuit et refait tout le premier
du mois.
