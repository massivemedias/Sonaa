# ADR-109 : la mise en avant payante d'une soirée

Date : 27 octobre 2026. Statut : accepté.

## Pourquoi

Mika : « actuellement c'est gratuit mais peut-être je peux me faire un peu
d'argent avec ce site ». La mesure des visites venait de commencer : la
publicité n'aurait rien rapporté. Entre la mise en avant payée par les
organisateurs et un abonnement de soutien des membres, Mika a choisi la
première.

## Ce qui est décidé

- Un organisateur met sa soirée en avant depuis la fiche de la soirée. Le
  lien « Vous organisez cette soirée ? Mettez-la en avant » ouvre un
  formulaire qui dit ce qui est acheté, jusqu'à quand et à quel prix, puis
  demande un nom, un courriel et un mot facultatif.
- Une soirée mise en avant apparaît à trois endroits. Elle est dans la bande
  « À l'affiche », en tête de la liste, quelle que soit la tranche regardée.
  Elle passe en premier dans sa journée et dans la bannière d'accueil. Sur la
  carte, sa salle porte un anneau jaune. Partout, elle porte la mention
  « Mise en avant » : le visiteur doit savoir qu'elle est en tête parce que
  l'organisateur a payé.
- La mise en avant dure jusqu'à douze heures après le début de la soirée.
- Le prix est en base, dans la table `mise_en_avant_tarif`, et non dans le
  code. Au départ, c'est 2 $ par jour entamé, avec un minimum de 5 $ et un
  maximum de 30 $.
- Le paiement passe par Stripe Checkout, avec le compte Stripe de Mika et
  sans Stripe Connect : SONAA vend ici un service à l'organisateur et
  n'encaisse pas pour le compte d'un tiers. Les obstacles d'ADR-084 ne
  s'appliquent donc pas (l'intermédiaire, le partage entre vendeurs,
  `MARCHAND_ACTIF`).
- Il n'y a pas de webhook. Au retour du paiement, la page renvoie à la
  passerelle l'identifiant de session écrit par Stripe dans l'adresse. La
  passerelle demande à Stripe, avec sa propre clé, si la session est payée en
  dollars canadiens et pour au moins le montant dû. Ce n'est qu'à ce moment
  que la soirée passe en tête. Il n'y a qu'un secret à poser, et personne ne
  peut activer une mise en avant en inventant un identifiant.
- Tant que la clé Stripe n'est pas posée, le même formulaire envoie une
  demande. Elle est écrite en base et part par courriel à Mika, avec
  l'adresse de l'organisateur en réponse. Mika se fait payer comme il veut,
  puis l'active avec « Offrir » dans `#/admin/mises`.
- L'admin a un onglet « Mises en avant ». « Offrir » active sans paiement en
  ligne, « Retirer » enlève la mise en avant du calendrier, et « Vérifier le
  paiement » est fait pour celui qui a payé puis fermé l'onglet avant le
  retour.
- La base ne s'écrit que par la passerelle. Celle-ci présente le secret de la
  mesure, dont seule l'empreinte est en base, par la fonction
  `secret_de_la_passerelle`. Le visiteur ne lit, par
  `mises_en_avant_de(ville)`, que l'identifiant des soirées actives et leur
  fin. Il ne voit ni nom, ni courriel, ni montant.

## Ce que cela ne fait pas

- Rien ne vérifie que la personne qui paie est l'organisateur. Payer pour
  une soirée qui n'est pas la sienne ne fait que la mettre en avant, et Mika
  peut retirer et rembourser.
- Aucune taxe n'est perçue : on suppose Massive Medias sous le seuil du petit
  fournisseur. À revoir avec le comptable avant de dépasser 30 000 $ de
  ventes par an.
- Le remboursement se fait dans le tableau de bord de Stripe, pas dans
  l'admin.
- Les conditions de vente restent à écrire. Le formulaire en donne
  l'essentiel en une phrase : paiement unique, fin après la soirée, refus
  possible et remboursé.

## Où

- Base : `supabase/migrations/20261027200000_mise_en_avant.sql`.
- Passerelle : `worker/src/mise-en-avant.ts`, avec les routes
  `api/mise-en-avant/devis`, `api/mise-en-avant/demande` et
  `api/mise-en-avant/confirmer`.
- Session Stripe : `src/lib/stripe-session.ts`.
- Page : `src/lib/mise-en-avant.ts`, `src/atlas/MettreEnAvant.tsx`,
  `src/atlas/MisesAdmin.tsx`, et les ajouts dans `CalendrierPage.tsx` et
  `CarteDesSoirees.tsx`.
