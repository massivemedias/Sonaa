# ADR-125 : l'affiche de club sur toutes les pages, et plus de boîtes

Date : 23 novembre 2026. Statut : accepté.

## Pourquoi

Mika : « je voudrais que tu corriges le site et que tu en fasses quelque
chose de très attrayant ». ADR-117 avait posé l'affiche de club sur
l'accueil, ADR-121 sur l'Atlas, et laissé les autres pages « reprises une à
une si la direction est validée ». Elle l'a été. Mixtapes, News, Labels,
Styles, Calendrier et Track ID gardaient pourtant les deux choses que Mika
déteste sur tous ses sites (CLAUDE.md) : des boîtes partout, et des formes
de gabarit d'IA.

Relevé page par page, le 23 novembre 2026, sur le site en ligne et en local
avec les vraies données :

- chaque carte de contenu était une boîte de verre cernée d'un filet :
  tuiles de styles, soirées, articles, mixtapes, fiche d'un genre, pied de
  page ;
- 176 arrondis étaient écrits en dur et avaient échappé aux jetons de coins
  droits d'ADR-117 : pilules à 999 px, cartes à 12, 16, 20 ou 22 px ;
- la page des styles ouvrait sur le bandeau jaune de Track ID, en double
  du bouton de la barre du haut, puis sur trois boîtes à grand chiffre et
  petit mot ;
- la page d'un style, celle qui porte le référencement des 219 styles, était
  la plus « gabarit » du site : bandeau en dégradé de la couleur de la
  famille, pastille du nom de famille, titre à 26 px, bouton pilule blanc,
  fiche technique dans une boîte ;
- les tuiles de famille portaient un bandeau de couleur de 6 px sur leur
  bord supérieur, de la même famille que le crochet ;
- des points ronds colorés dans le défilé des styles et une pastille
  lumineuse dans le pied.

Et des défauts francs :

- sur l'accueil, l'affiche dessinée d'une soirée sans image débordait de
  son cadre : le mois, la salle et le style étaient coupés ;
- « Downtempo » et « Industrial » dépassaient de leur tuile sur l'accueil ;
- le pied de page se décollait du bas des pages courtes d'une bande noire
  de 64 px, et collait à la dernière mixtape sur les pages longues ;
- la moitié droite du bandeau du calendrier restait vide à Montréal, faute
  de soirées avec affiche ;
- les petits libellés des portes de l'accueil se lisaient sur des pochettes
  claires à moitié voilées.

## Ce qui est décidé

- **Le verre ne sert plus qu'à ce qui flotte** : la barre du haut, le menu
  du compte, la feuille d'une soirée, la surcouche du micro, le mini-lecteur.
  Le contenu est posé sur le fond et séparé par des filets, comme sur
  l'Atlas.
- **Tous les arrondis lisent les jetons**, à 2 px. Restent ronds les vrais
  cercles : portraits, boutons de lecture, poignée de la feuille.
- **Un titre de page en capitales d'affiche**, une seule grandeur
  (`--titre-page`, plafonnée à 6 rem) : Mixtapes, News, Labels, Track ID,
  les pages document, le nom d'une famille et celui d'un style.
- **Un intertitre sous un filet**, une seule grandeur
  (`--titre-intertitre`) : Artistes, Dernières mixtapes, 12 morceaux,
  Calendrier, Labels du Québec, Vos dernières écoutes.
- **Les listes deviennent des rangées sur filets** : mixtapes avec leur
  pochette en grand, genres d'une famille en index (le nom, puis l'année
  dans la couleur de la famille), fiche technique d'un style.
- **Les filtres deviennent des mots soulignés et des champs à simple
  trait** : catégories des News, tri et pays des Labels, ville et date du
  Calendrier.
- **La couleur d'une famille passe dans un petit carré**, jamais dans un
  bord : tuiles, défilé, lien de retour d'un style.
- **La page des styles** ouvre sur « 219 styles, 14 familles » et une
  phrase qui donne le nombre de morceaux. Le bandeau de Track ID en part :
  le bouton jaune de la barre du haut le porte sur toutes les pages.
- **La page d'un style** ouvre sur une bande de ses pochettes, carrées,
  calée à droite et voilée de noir du côté du texte, son nom à la taille
  d'un titre de page, et un bouton Écouter jaune comme les autres appels du
  site.
- **Le bandeau du calendrier** se complète avec les prochaines soirées dans
  leur affiche dessinée quand les vraies manquent.
- **Le pied** est sur le fond, sous un filet, et touche toujours le bas de
  la fenêtre.

## Ce qui a été vérifié

Les 21 contrôles de `npm run publier` passent, construction faite avec la
configuration publique de la base, comme en intégration continue. Le
contrôle mobile mesure maintenant le repli du verre sur les seules surfaces
qui flottent : le pied et les cartes n'en sont plus. Captures à 1440 et
390 px de l'accueil, du calendrier, des styles, d'une famille, de deux
styles, des mixtapes, des news, des labels et de Track ID.

## Seconde passe, le même jour : une mixtape, un label, le profil

Mika : « reprends le profil, la page d'une mixtape et d'un label ».

- **Une mixtape** : plus de surtitre « Mixtape » ni de pochette floutée en
  fond. Le titre en capitales d'affiche, l'artiste en libellé jaune, les
  styles en mono séparés par des barres obliques, la pochette nette à
  droite. La fiche passe de huit boîtes à chiffre à des lignes sur filets,
  l'invitation à créer un compte perd son aplat brun, la carte de l'artiste
  sa boîte, et ses chiffres tiennent sur une ligne.
- **Un label** : ses disques les plus connus, nets et carrés, calés à
  droite sous un voile noir, au lieu d'une lueur floutée. « Les labels »
  devient un lien de retour fléché, ses styles des mots soulignés, ses
  morceaux et ses news des rangées sur filets, la colonne des disques sort
  de sa boîte.
- **Le profil** : plus de surtitre « Mon profil », le nom en capitales
  d'affiche, des onglets soulignés au lieu d'une piste grise, des blocs
  ouverts par un filet au lieu de boîtes de verre (la même classe sert aux
  soirées du profil et à l'administration), des champs à trait, la règle du
  dépôt sans aplat teinté. Sans compte, le bouton de connexion est jaune.
- **La page publique d'un artiste** sans bannière : sa dernière pochette,
  nette et voilée, au lieu d'une lueur floutée.

Corrigé en passant : au téléphone, le texte d'un label sortait de l'écran
à droite. La rangée défilante de ses cinq dernières sorties élargissait la
colonne à 724 px ; la colonne ne s'élargit plus à son contenu.

## Troisième passe : l'administration, la modération, le formulaire

Mika : « reprends l'administration, la modération et le formulaire d'une
soirée ».

- **L'administration** : le menu de gauche n'est plus une boîte de verre à
  entrée jaune. C'est une colonne d'entrées sur filets, l'entrée courante
  à l'accent précédée d'un petit carré. Au téléphone, ce sont des onglets
  soulignés. L'étiquette « Modération » devient un petit libellé jaune, et
  les liens du tableau perdent le violet du navigateur.
- **Les soirées** (administration et « Mes soirées ») : les rangées sont
  sur filets et le nom est en capitales d'affiche. Une soirée sans image
  prend l'affiche dessinée du calendrier au lieu d'un rectangle vide.
  « Image pour Instagram » est en jaune, et c'était le seul bouton blanc.
- **Le formulaire d'une soirée** : des champs à trait, des libellés en
  capitales espacées, et un bouton « Remplir » inactif dessiné en contour.
  À demi-opacité, le jaune devenait un brun sale. Le bilan de lecture perd
  son aplat.
- **La modération** : l'intertitre sous un filet, le formulaire de
  fermeture hors de sa boîte. Les boutons nus, gris clair du navigateur,
  prennent le contour des boutons du site.

Corrigé en passant :

- Le menu du haut soulignait « Styles » sur l'administration.
- Sur la modération et sur la page « Tracks, bientôt », le pied débordait
  de 100 px à droite : il était posé à côté de la page au lieu d'en faire
  partie.
- Au téléphone, « Administration » sortait de l'écran. Le titre de page a
  désormais un plancher de 2,5 rem et suit 10 % de la largeur de l'écran.

Vérifié avec une session de modérateur fictive et des données inventées,
dans le seul navigateur de test. Aucune écriture n'est partie vers la base.

## Ce que cela ne fait pas

- La page des propositions reste fermée (`PROPOSITIONS_OUVERTES`). Elle
  prend les rangées sur filets, mais ses filtres n'ont pas été revus.
- Les libellés écrits en dur dans la modération des commentaires
  (« Fermer », « Rouvrir », « Classer sans suite ») ne passent pas encore
  par `langue.ts`.
- Les titres d'articles des News restent en casse normale : ce sont des
  phrases qu'on lit.
- Aucune couleur, aucune police n'est ajoutée : tout vient des jetons
  existants.
