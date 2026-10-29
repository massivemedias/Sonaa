# ADR-111 : des liens d'affiliation à la place de la publicité

Date : 28 octobre 2026. Statut : accepté.

## Pourquoi

Mika veut gagner de l'argent avec « de la pub bien placée et dans le thème du
site, musique électronique et matériel de production ». Une bannière paie au
nombre de vues, et SONAA en a peu. Un lien d'achat posé là où l'on parle déjà
d'une machine paie à la vente, et il se lit comme un renseignement plutôt que
comme une réclame.

## Ce qui est décidé

- Chaque outil d'un cours « Produire ce style » porte un lien « Voir chez … »,
  quand une boutique branchée le vend. Il y a 1 651 mentions pour 515 outils.
  La page de chaque marque et de chaque machine des news par marque porte le
  même lien, à côté du site officiel.
- Les plugins, les logiciels et les banques de sons mènent à une recherche
  sur Plugin Boutique, avec le paramètre `a_aid`. Les machines et le matériel,
  neufs ou d'occasion, mènent à une recherche sur Reverb, en passant par le
  réseau Awin (`cread.php`, avec la recherche dans `ued`).
- Les modules livrés avec Ableton Live (Operator, Simpler, Echo…) n'ont pas
  de lien : ils ne s'achètent pas séparément.
- Les liens portent `rel="sponsored"`, comme le demande Google. Une ligne
  dessous dit ce qu'ils sont : un achat fait par eux rapporte une petite
  commission à SONAA, sans frais pour l'acheteur.
- Sans identifiant, il n'y a pas de lien. Les identifiants sont dans
  `src/lib/affiliation.ts`. Ce ne sont pas des secrets, puisqu'ils figurent
  en clair dans chaque lien. Tant qu'ils sont vides, rien ne s'affiche : un
  lien qui fait sortir du site sans rien rapporter n'a pas sa place.
- Ajout du 28 octobre 2026, à la demande de Mika : Amazon.ca vient en
  second lien sur les machines et le matériel, après Reverb, avec une
  recherche `amazon.ca/s?k=` et son identifiant `tag`. Amazon vend le
  matériel neuf et livre vite au Canada. Il ne vend presque pas de plugins,
  donc il n'a pas de lien sur eux. Dès qu'un lien Amazon est affiché, la
  ligne d'aveu reprend mot pour mot la phrase qu'exige le contrat des
  Partenaires Amazon.

## Ce que cela ne fait pas

- Le lien mène à une recherche, pas à une fiche produit. Une recherche reste
  juste si le catalogue change, et elle évite de tenir à jour 515 adresses.
- Thomann n'est pas branché : il demande 500 visites par jour. Sweetwater non
  plus, parce qu'il vend surtout aux États-Unis.
- Les pages pré-rendues pour les moteurs de recherche ne portent pas ces
  liens. Ils ne s'affichent que dans l'application.
