# ADR-095 : le résumé SONAA des articles en extrait

Date : 2 octobre 2026. Statut : accepté.

## La demande

Devant un article de MusicRadar coupé après son chapeau, Mika voulait
l'article entier sur sonaa.ca, la source restant citée. Recopier le texte
d'un magazine sur le site, c'est le republier sans son accord, que la source
soit citée ou non. Mika a choisi l'autre voie : un résumé écrit par SONAA.

## Ce qui est décidé

Pour chaque article dont le flux ne donne qu'un extrait (moins de mille
signes dans `content:encoded`, la règle de la lecture), la moisson des news :

1. lit une fois la page de l'article, et n'en garde que les paragraphes ;
2. demande à Claude (`claude-opus-5-5`, effort bas) un résumé original en
   français et en anglais : trois à cinq paragraphes, 150 à 250 mots, tous
   les faits utiles, aucune phrase recopiée, aucune citation de plus de dix
   mots ;
3. compare le résumé au texte de la page : une suite de dix mots identiques,
   et il est redemandé une fois, puis abandonné ;
4. range le résumé dans `public/news.json` avec l'article. Le texte de la
   page n'est pas conservé.

La vue de lecture affiche ce résumé à la place de l'extrait, sous la marque
« Résumé SONAA », avec une note qui dit d'où il vient et le bouton vers
l'article complet chez le magazine.

Une page qu'on ne peut pas lire (mur payant, blocage des robots comme celui
de Bedroom Producers Blog, texte trop court) ne produit rien : l'extrait et
le bouton restent, comme avant. On ne contourne pas un blocage.

## Ce que cela change

Le 21 septembre 2026, Mika avait demandé de ne jamais aller chercher le
corps d'un article sur la page du magazine. La page est maintenant lue, une
fois, pour en tirer les faits ; son texte n'est ni affiché ni conservé.

## Coût

Environ trois centimes par résumé. La première passe en écrit au plus
quarante pour rattraper les articles déjà moissonnés ; ensuite, une dizaine
par passe, deux passes par jour : de l'ordre d'un dollar par jour. Chaque
passe écrit sa facture dans le journal de la moisson.
