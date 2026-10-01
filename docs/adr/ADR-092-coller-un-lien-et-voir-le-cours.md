# ADR-092 : ajouter une soirée en collant son lien, et un cours qui se voit

Date : 1er octobre 2026. Statut : accepté.

## Ajouter une soirée

Le formulaire d'ajout commence par une seule case : le lien de la soirée.
Coller suffit, la lecture part toute seule. La passerelle lit la page
(route `api/lire-soiree`) et `src/lib/lire-soiree.ts` la comprend :

- une page qui publie un JSON-LD « Event » (Eventbrite, beaucoup de salles)
  donne tout, heure comprise ;
- Facebook ne montre une soirée qu'à un lecteur d'aperçu de liens : titre,
  affiche, jour, ville, organisateurs, et l'adresse écrite dans son URL
  canonique, jamais l'heure ni le nom de la salle. La salle est retrouvée
  quand une soirée déjà rangée porte la même adresse ;
- Resident Advisor se lit par son API, comme l'agenda ;
- Lepointdevente par son og:title structuré ;
- Ticketmaster et Shotgun bloquent les robots : il reste ce que dit leur
  adresse.

Une soirée Facebook déjà rangée par la passe quotidienne est rendue telle
qu'elle est en base, heure et salle comprises, et le formulaire prévient
qu'elle est déjà au calendrier.

La route est réservée aux comptes connectés et comptée par heure : une route
qui lit n'importe quelle page pour n'importe qui serait un relais offert. Elle
rend l'affiche en base64 ; le navigateur la dépose comme une affiche choisie
à la main. Aucune route ne sert d'images d'ailleurs.

Le même formulaire vit dans la feuille « Ajouter » du calendrier et dans
l'onglet Événements du profil. Cet onglet ne garde que deux blocs, ajouter et
à venir ; la liste de modération de tous les comptes vit dans
l'administration.

## Produire ce style

Le cours se dessine avant de se lire : le tempo sur une règle, la batterie
sur une grille de seize pas qu'une petite boîte à rythmes joue dans le
navigateur, les machines en photo libre avec leur crédit. Le texte tient
dans une colonne de 68 signes, la planche à côté sur ordinateur, devant sur
téléphone.

Les grilles ont été lues dans le texte de chaque cours, puis relues contre
lui par un second lecteur : 185 cours sur 219 en ont une. Un cours qui ne
place aucun coup n'a pas de grille, et aucune grille n'est montrée sans
kick : quand un cours de techno, de house, de trance ou de psy décrit le son
du kick sans écrire sa place, il est posé en quatre temps, la règle de ces
familles.

Les photos viennent de Wikimedia Commons, sous licence libre vérifiée, et
chaque récolte se regarde sur une planche contact avant publication : quatre
images fausses ont été refusées le 1er octobre (voir `REFUSEES` dans
`scripts/images-machines.ts`).
