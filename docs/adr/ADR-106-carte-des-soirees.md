# ADR-106 : la carte des soirées, sur OpenStreetMap

Date : 27 octobre 2026. Statut : accepté.

## Pourquoi

Mika : « une carte avec OpenStreetMap, un truc simple mais cool, une carte
des events », pour Montréal et chaque ville que SONAA propose.

## Ce qui est décidé

- Un bouton « Carte » dans la barre du calendrier remplace la liste par une
  carte, avec les mêmes filtres (la tranche, les styles, la recherche). Le
  choix est gardé sur la machine.
- La carte montre des salles, pas des soirées : une pastille par salle, son
  nombre de soirées dedans, et celles où il se joue quelque chose ce soir
  battent. Un clic ouvre la salle (adresse, soirées, itinéraire), un clic sur
  une soirée ouvre sa fiche habituelle.
- Leaflet, chargé seulement quand on ouvre la carte (46 ko compressés). Les
  tuiles sont celles d'OpenStreetMap, passées en négatif par un filtre CSS
  pour tenir dans le site sombre. Aucune clé, aucun compte.
- Les positions : Resident Advisor donne celle de ses salles, et son
  adresse, que la fiche affiche maintenant. Une soirée d'une autre source
  dans une salle que RA connaît prend sa position. Le reste est situé par la
  passerelle (route `api/lieux`) avec Nominatim, le géocodeur
  d'OpenStreetMap, et gardé dans KV : une clé par ville, une lecture par
  carte ouverte.

## La règle de Nominatim, et comment on la tient

Une requête par seconde au plus, un agent qui se nomme, un cache. La page
n'attend jamais : la passerelle rend ce qu'elle connaît et cherche au plus
huit formulations inconnues en arrière-plan, espacées de 1,1 s. Une salle
introuvable est retentée après deux semaines.

## Ce que cela ne sait pas faire

- Une soirée sans adresse ni salle reconnue n'est pas sur la carte, et la
  page dit combien il en manque au lieu de les placer au hasard.
- Ouvrir la carte charge des tuiles depuis openstreetmap.org : le serveur
  d'OpenStreetMap voit l'adresse du visiteur, comme pour toute image tierce.
  La politique de confidentialité doit le mentionner.
