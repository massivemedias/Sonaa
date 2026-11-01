# ADR-114 : une carte de partage pour chaque page qui n'a pas d'image

Date : 31 octobre 2026. Statut : accepté.

## Pourquoi

Mika a partagé /soirees/montreal-ca/ sur Facebook : « l'image est sacrément
pourrie ». La page n'avait pas d'og:image. Facebook a donc pris la première
image du corps, le logotype blanc, et l'a posée sur un fond gris clair.

## Ce qui est décidé

- Le pré-rendu fabrique une carte de 1200 x 630 dans le thème du site : fond
  brun presque noir, lueur ambre, Inter, un grand titre et une phrase. En
  dessous, la grille de pas d'un motif de rythme, dans les cinq teintes de
  l'outil (ADR-113).
- Chaque ville a sa carte, tout comme chaque page « soirées de tel style
  dans telle ville » et l'index des soirées. La grille vient de la famille
  la plus jouée dans la ville, ou de la famille de la page.
- Une page de style par famille et par ville prend la carte plutôt que
  l'affiche d'une de ses soirées : avec l'affiche d'une seule date, on
  croirait que la page ne parle que de cette soirée.
- Chaque page de style, en français et en anglais, a sa carte : le nom du
  style, la devise de son motif, sa grille, ses instruments et son tempo.
  Elle passe devant la pochette du morceau de référence, qui ne disait pas
  de quel style on parle (Mika, le 31 octobre 2026 : « fais pareil pour
  les pages de style avec leur rythme »). Chaque famille a la sienne.
- Toute autre page sans image prend une carte de repli SONAA, en français
  ou en anglais selon la page.
- La carte ne dit rien qui vieillit : ni nombre de soirées, ni jour.
  Facebook la garde en cache des semaines. Son nom de fichier porte une
  empreinte de son contenu, si bien qu'une carte modifiée change d'adresse.

## Ce que cela engage

Les deux fichiers d'Inter (licence OFL) sont versés dans
scripts/donnees/polices. La machine de déploiement n'a pas Inter, et sharp
ne lit pas le woff2 du site. Un test fabrique une carte et vérifie que son
titre s'est bien rendu. Si une carte ne se fabrique pas, la page garde
l'image de repli.
