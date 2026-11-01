# ADR-115 : le reel du jeudi

Date : 31 octobre 2026. Statut : accepté.

## Pourquoi

Mika veut un reel chaque jeudi pour Instagram. Il doit montrer les soirées
de la fin de semaine, les grosses news, les nouvelles mixtapes qui marchent
sur SONAA, le label de la semaine qui a le plus fonctionné et le style qui
va avec, et se télécharger depuis l'administration.

## Ce qui est décidé

- Un onglet « Reel du jeudi » s'ajoute à l'administration (#/admin/reel).
  À l'ouverture, il rassemble les données et propose une sélection. Mika
  coche, décoche, change de label ou de style, regarde un aperçu muet,
  puis fabrique la vidéo.
- La vidéo fait 1080 x 1920, environ quarante secondes, en MP4. Elle est
  fabriquée dans le navigateur, comme les affiches de rythme (ADR-113). Les
  scènes se suivent dans cet ordre : la ville et les dates, les soirées
  trois par trois, une news par scène, les mixtapes, le label, puis
  l'affiche de rythme du style du label. La musique est ce rythme, du
  début à la fin. Le texte reste dans la bande qu'Instagram ne recouvre
  pas.
- La fabrication est muette : le son va dans le fichier, pas dans les
  haut-parleurs.
- Les soirées viennent de Montréal, la ville du compte Instagram, du
  vendredi au dimanche. Les mises en avant passent d'abord, puis celles
  qui intéressent le plus de monde chez Resident Advisor. Une soirée qui a
  commencé la veille n'est pas retenue.
- Une grosse news est une histoire que plusieurs sites racontent dans la
  semaine : on compte les articles d'autres sources qui partagent un nom
  propre avec elle. On garde une news par source.
- Les mixtapes se classent d'abord par auditeurs, puis par minutes
  écoutées dans la semaine. Une mixtape de moins d'un mois passe devant à
  chiffres égaux.
- Le label de la semaine se mesure à deux choses : ses pages vues sur
  SONAA et les news de la semaine qui le nomment. Un nom qui est aussi un
  mot courant ne compte pas : le premier essai désignait « Logic Records »
  à cause de Logic Pro. Sans aucun chiffre, le choix tourne chaque semaine
  parmi les cinquante labels les plus présents dans l'atlas, sans les
  majors. Le style est celui de l'atlas où le label a le plus de morceaux.
- Les chiffres du site viennent d'une fonction de la base, `reel_semaine`,
  réservée à la modération. Les images d'autres sites passent par la
  passerelle (`api/image-reel`, réservée à la modération), sans quoi le
  canvas serait « sali » et l'enregistreur refuserait de filmer.

## Ce que cela engage

La mesure du site date du 27 octobre 2026. Tant que les chiffres restent
maigres, les classements s'appuient surtout sur Resident Advisor et la
presse, et le choix de Mika compte plus que le calcul.
