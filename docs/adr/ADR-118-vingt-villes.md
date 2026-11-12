# ADR-118 : vingt villes, et plus complètes

Date : 12 novembre 2026. Statut : accepté.

## Pourquoi

Mika : « réduis beaucoup les villes, garde Montréal, Montpellier, Toulouse et
beaucoup d'autres grandes villes, vingt en tout ; les plus petites, tu les
flushes. Scanne vraiment beaucoup mieux les vingt, ça doit être bien plus
complet. »

Le calendrier comptait vingt-trois villes, l'atlas trente-cinq. Plusieurs
villes de l'atlas n'avaient que deux ou trois clubs, et plusieurs villes du
calendrier n'avaient qu'une source vivante.

## Ce qui est décidé

- **Une seule liste de vingt villes**, la même pour le calendrier et l'atlas :
  Montréal, Toronto, New York, Los Angeles, Chicago, Miami, Mexico, São Paulo,
  Londres, Paris, Lyon, Marseille, Toulouse, Montpellier, Berlin, Amsterdam,
  Bruxelles, Barcelone, Madrid, Tokyo.
- **Huit villes sortent** du calendrier : Vancouver, Québec, Ottawa, Calgary,
  Winnipeg, Halifax, Detroit, Melbourne. Elles sont désactivées
  (`is_active = false`), pas supprimées : leurs soirées restent en base et une
  ville revient d'une ligne. **Cinq entrent** : Lyon, Marseille, Bruxelles,
  Madrid, Miami, avec leur zone Resident Advisor (337, 338, 62, 41, 38).
- **L'atlas ne garde que les clubs des vingt villes.** Les clubs des autres
  villes sortent ; les festivals restent tous, ils sont classés par pays.
- **L'atlas est densifié** par une recherche ville par ville : chaque lieu
  ajouté a été vérifié ouvert en 2025 ou 2026, sur son site, sur Resident
  Advisor ou dans la presse locale.
- **Les moissons couvrent les vingt villes.** Ticketmaster en lit dix-neuf
  (il ne vend pas au Japon), deux fois par graphie : toute la musique, puis le
  seul genre Dance/Electronic pour dépasser la limite de mille fiches de son
  API. Eventbrite en lit vingt, avec un premier tri sur la liste avant de lire
  chaque fiche.

## Ce que cela engage

- Eventbrite refuse les machines de GitHub depuis la fin d'octobre 2026 (405)
  et Shotgun les arrête à un contrôle Vercel depuis septembre. Ces deux
  sources ne se moissonnent plus que depuis une adresse ordinaire : le Mac de
  Mika, ou une session de Claude. La moisson de la nuit le dit en échouant.
- Le prérendu des pages `/soirees/<ville>/` suit la table `villes` : les cinq
  nouvelles villes ont leur page dès la publication suivante.
