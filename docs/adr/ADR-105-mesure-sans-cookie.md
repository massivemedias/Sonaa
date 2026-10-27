# ADR-105 : la mesure du site et des écoutes, sans cookie

Date : 27 octobre 2026. Statut : accepté.

## Pourquoi

Mika : « je veux des stats complètes de consultation du site dans mon
interface admin », et pour chaque artiste qui dépose une mixtape « combien de
listens, d'où viennent ses listeners, toutes les infos pour lui ». Le site
n'avait aucune mesure : seulement le nombre d'onglets ouverts en ce moment.

## Ce qui est décidé

- Le navigateur envoie chaque page vue, et les secondes réellement écoutées
  d'une mixtape (jamais les sauts), à la passerelle Cloudflare (route
  `api/mesure`), seulement depuis sonaa.ca.
- La passerelle ajoute le pays, la région et la ville que Cloudflare lit
  dans la requête, le type d'appareil, et un identifiant de visiteur :
  l'empreinte SHA-256 de l'adresse, du navigateur, du jour et d'un sel tiré
  au sort chaque jour et oublié le surlendemain. L'adresse IP n'est ni
  gardée ni transmise ; aucun cookie n'est posé.
- Les robots déclarés ne sont pas comptés.
- La base n'accepte ces lignes que de la passerelle (fonction `mesurer`,
  qui exige un secret dont seule l'empreinte est en base).
- Deux lectures : `stats_site` pour la modération (onglet Statistiques de
  l'administration), `stats_mes_mixtapes` pour un artiste, sur ses seules
  mixtapes (onglet Statistiques du profil). La page d'une mixtape montre à
  tous des totaux (auditeurs, minutes, pays), jamais un auditeur.

## Ce que cela ne sait pas faire

Un visiteur est une personne d'un jour : la même personne trois jours de
suite compte pour trois. C'est le prix de ne rien garder qui la suive.

## À faire

La politique de confidentialité doit le dire, quand le texte de l'avocat
arrive.
