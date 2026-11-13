# ADR-120 : une page de clubs par ville

Date : 13 novembre 2026. Statut : accepté.

## Pourquoi

Mika : « je veux plus de référencement pour mon site ». L'atlas des clubs
tenait ses vingt villes sur une seule adresse, `/clubs/`. Une recherche comme
« clubs techno Berlin » ou « best clubs Madrid » n'avait aucune page qui lui
réponde en propre, alors que l'atlas compte maintenant plus de 400 lieux
vérifiés.

## Ce qui est décidé

- **Quarante pages de plus** : `/clubs/<ville>/` et `/en/clubs/<ville>/` pour
  chacune des vingt villes, avec les clubs classés par capacité, les salles,
  les festivals de la ville et le lien vers son calendrier.
- **Des données structurées de lieu** : une `ItemList` dont chaque élément
  est un `NightClub` (ou une `MusicVenue` pour une salle), avec la position,
  la capacité, l'année d'ouverture et le site.
- **Un maillage dans les deux sens** : `/clubs/` renvoie à chaque ville, la
  page des soirées d'une ville renvoie à ses clubs, et chaque page de ville
  renvoie aux dix-neuf autres.
- **L'atlas ouvert sur une ville porte son adresse** : `#/clubs?city=berlin-de`
  s'écrit `/clubs/berlin-de/` dans la barre, et cette adresse rouvre l'atlas
  sur Berlin.
- Les quatorze pages de famille de styles déclarent enfin leur version
  anglaise (hreflang), qu'elles avaient sans le dire.
