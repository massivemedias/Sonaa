# SONAA marchand : inspection et plan par phases

Étape 0 de la mission « marketplace et distribution numérique », 17 septembre
2026. Aucune ligne de code n'a été écrite. Ce document dit ce qui existe, ce
qui manque, ce qui ne tient pas dans le prompt tel qu'il est écrit, et dans
quel ordre construire. Les arbitrages qui reviennent à Mika sont dans
[HANDOFF.md](../HANDOFF.md), section « Mission marchande ».

---

## 1. Ce qui existe aujourd'hui

### Le front

React 19, Vite, TypeScript strict. Le routeur lit l'ancre dans
`src/main.tsx:158` (`routeOf`), tous les écrans sont chargés à la demande.
Environ 34 000 lignes dans `src/`, 92 composants, 38 modules de bibliothèque.

`src/langue/langue.ts` fait 1 846 lignes : une interface `Dictionnaire` de
**538 clés**, puis deux objets complets, `FR` et `EN`. Le type interdit un
objet partiel, donc une clé oubliée ne compile pas, et `npm run check:langue`
refuse en plus tout libellé français rendu hors du dictionnaire. **Aucune clé
commerciale n'existe** : ni panier, ni prix, ni acheter, ni vendeur, dans
aucune des deux langues. Tout le vocabulaire marchand est à créer, en double.

### Les routes et le pré-rendu

Seize préfixes d'ancre, dont `#/calendrier` (aussi la racine), `#/news`,
`#/parcourir`, `#/sets`, `#/profil`, `#/admin`. `#/sets` n'est qu'une route :
ses trois écrans internes (liste des artistes, un artiste, un set) sont décidés
dans `src/atlas/SetsPage.tsx:48` par `ecranDeLAdresse()`, et la page écoute
elle-même `hashchange`. Même chose pour les trois onglets de `#/profil`.

Depuis le 14 septembre, chaque contenu a aussi une vraie adresse HTML écrite à
la construction par `scripts/prerender.ts`, avec la correspondance chemin vers
ancre dans `src/lib/chemins.ts:63` : `/styles/...`, `/en/styles/...`,
`/soirees/...`, `/sons/`, `/sons/<id>/`, `/news/`. Au total 780 pages, plan du
site soumis à Google et à Bing, IndexNow à chaque publication. **Toute nouvelle
sorte de page se déclare aux deux endroits**, sinon l'application ne sait pas
l'ouvrir.

Conséquence directe : les pages `/sons/` sont indexées depuis trois jours.
Elles ne peuvent pas disparaître au profit de `/mixtapes/`, elles doivent
rester et pointer vers les nouvelles.

### Le menu

En tête, `src/atlas/SiteNav.tsx` rend quatre icônes plus « À propos », le nom
de la page en infobulle au survol. La loupe, la langue, le thème et le bouton
de compte vivent à part, dans `src/atlas/AuthButton.tsx`, en haut à droite.

Sur téléphone, `src/atlas/BarreBas.tsx` rend cinq onglets en bas : Calendrier,
News, Styles, Sons, Profil. Un détail décide de tout le reste : sous 768 px,
`barre-bas.css:36` cache le menu du haut. **La barre du bas ne s'ajoute pas au
menu, elle le remplace.** Ce qui sort de ces cinq onglets n'est plus atteignable
sur téléphone, sauf par le coin du compte. C'est pourquoi en sortir Styles et
Profil, comme le propose le prompt, n'est pas un réglage de goût.

### La base

Supabase, projet `pqgapyfqkjzvwkulxnhv`, 38 migrations dont 12 pour le jeu
Isoku. Les tables du produit : `profiles`, `artistes`, `dj_sets` et sa vue
`sets_publics`, `soirees_manuelles`, `villes`, `comments` et ses trois
satellites, `proposals`, `votes`, `track_votes`, `moderators`, `site_authors`,
`quotas`.

Le modèle de sécurité est constant et sévère, et c'est une bonne nouvelle : RLS
activée avant toute politique, droits révoqués puis accordés colonne par
colonne, vues en `security_invoker` pour que les politiques de la table
continuent de s'appliquer, tables de rôles sans aucun droit d'écriture par
l'interface, et une vingtaine de fonctions `security definer` pour tout ce qui
doit voir plus que l'appelant. La couche marchande n'a rien à inventer, elle
n'a qu'à suivre.

Trois points relevés au passage :

- `genre_id` n'est jamais une clé étrangère : le corpus vit dans le dépôt, pas
  dans la base. `comments` et `proposals` ont déjà tranché ainsi.
- Le quota de 2 Go par compte n'est pas dans la passerelle, il est dans un
  déclencheur (`verifier_quota`, migration `20260903020000`), et le compte de
  Mika y est exempté par une ligne de donnée.
- **`soirees_manuelles` n'a aucune migration de création.** Elle porte des
  politiques, un déclencheur, cinq adaptateurs et une route de la passerelle,
  mais sa forme n'existe que dans la base de production. À réparer avant la
  phase C, qui s'y rattache.

Aucune table ne parle d'argent. Le mot « stripe » n'apparaît nulle part dans le
dépôt.

### La passerelle

Un Worker Cloudflare, `sonaa-sets`. Le mur d'authentification est à la ligne
825 de `worker/src/index.ts` : avant, tout est public ; après, `qui()` vérifie
la signature du jeton Supabase en ECDSA P-256 et `aMoi()` enferme chaque membre
dans le dossier qui porte son identifiant. Les routes publiques servent le
calendrier, les artistes, la ville du visiteur, les affiches, la lecture d'un
article de magazine et les courriels.

**Le point le plus important de toute cette inspection est à la ligne 788** :
tout objet du seau R2 dont le chemin ne commence pas par `api/` se télécharge
publiquement, par simple adresse. C'est délibéré, et c'est juste pour un set
gratuit. Un morceau payant renverse l'hypothèse, puisque la base donnera son
chemin à l'acheteur. Les masters vendus devront vivre derrière un préfixe que
cette route refuse.

Deux autres limites décident d'une partie de l'architecture : 128 Mo de mémoire
par requête, et l'interdiction de charger du WebAssembly depuis une source
distante. La passerelle sait étiqueter un fichier au passage, elle ne sait pas
le réencoder.

### La publication

`npm run publier` enchaîne 21 contrôles et refuse si l'un échoue ou si l'arbre
git n'est pas propre. Il refuse aussi si le déploiement lance une commande
absente de sa propre liste : ajouter une étape au workflow sans l'y déclarer
bloque la publication. 18 fichiers de tests, 162 cas. Rien ne teste
`sets.ts`, ni `chemins.ts`, et la mesure de couverture n'est pas installée.
Dernière décision d'architecture écrite : ADR-083.

### Ce qui n'existe pas du tout

Paiement, panier, prix, vendeur, commande, billet, label, part d'ayant droit,
distribution. Ni dans le code, ni dans la base, ni dans la documentation. Il
n'y a pas non plus de page de conditions, de politique de confidentialité ni de
mentions légales. La mission part d'une page blanche, ce qui est une bonne
nouvelle : il n'y a rien à défaire.

---

## 2. Ce qui ne tient pas dans le prompt

Douze points, détaillés dans `HANDOFF.md`. Les quatre qui changent la façon de
construire :

1. **Un paiement, un seul destinataire.** `transfer_data[destination]` ne
   répartit pas entre plusieurs vendeurs. Un panier qui mélange deux artistes
   impose d'encaisser sur le compte de la plateforme puis de virer à chacun.
   SONAA devient alors le vendeur officiel, donc le percepteur de la TPS et de
   la TVQ, ce qui renforce la nécessité d'incorporer avant la première vente.
2. **Les fichiers payants ne peuvent pas vivre là où vivent les mixtapes**,
   pour la raison donnée plus haut.
3. **Pas de MP3 fabriqué à la volée** : impossible dans un Worker, mesuré.
   Commencer par vendre WAV et FLAC, et demander le MP3 à l'artiste.
4. **Le mot « track » est déjà pris** par les 2 382 morceaux de référence du
   corpus, dans le code comme dans la base.

---

## 3. Le plan, phase par phase

Chaque phase se termine par une publication en production et un point d'arrêt.
La suivante ne commence pas avant.

### Phase 0, préparation. Deux à trois jours

Aucune vente, aucun compte Stripe requis.

- Renommer Sons en Mixtapes dans le dictionnaire, ouvrir `#/mixtapes` et
  `/mixtapes/`, garder `#/sets` et `/sons/` vivants et canoniques vers les
  nouvelles adresses, mettre à jour le plan du site.
- Refondre le menu selon l'arbitrage C1 et C2 du `HANDOFF.md`, poser le panier
  vide avec son compteur.
- Créer les pages Conditions, Confidentialité et Mentions légales, en place et
  reliées au pied, prêtes à recevoir le texte juridique.
- ADR-084 : pourquoi une couche marchande, et les quatre contraintes qui la
  bornent.

**Arrêt.** Validation de Mika sur le menu et sur le nommage.

### Phase A, les vendeurs. Trois à quatre jours

- Migration `artistes_vendeurs`, RLS selon le motif maison : lecture publique
  seulement si le compte Stripe est actif, écriture au propriétaire, et une
  fonction `security definer` pour la vue du modérateur.
- Route d'embarquement Stripe Connect Express sur la passerelle, écran
  « Devenir vendeur » dans le profil, retour d'état.
- Déclaration de droits, horodatée, obligatoire avant toute mise en vente.
- Page artiste publique, encore vide : bannière, portrait, biographie.

**Arrêt.** Mika fait son propre embarquement Stripe en vrai, sous l'entité
retenue en B2 du `HANDOFF.md`.

### Phase B, la marchandise. Une à deux semaines

**B.1, déposer et montrer.** Migrations `morceaux_vendus`, `releases`,
`release_morceaux`. Nouveau préfixe R2 hors lecture publique pour les masters.
Dépôt par l'artiste, forme d'onde calculée dans le navigateur comme
aujourd'hui, pochette, genre pris dans le corpus, BPM, tonalité, prix plancher
et prix suggéré. Grille publique et fiche de morceau, reliée au genre de
l'atlas, avec un extrait écoutable sans quitter la page. Rien ne se vend
encore.

**B.2, encaisser.** Migrations `paniers`, `panier_items`, `commandes`,
`commande_items`, `pourboires`, `stripe_events`. Panier persistant, fusion à la
connexion. Taxes calculées côté serveur. Paiement encaissé par la plateforme,
virements par vendeur sous un groupe commun. Webhook signé, journal de tous les
événements Stripe, courriels de confirmation, liens de téléchargement de courte
durée avec l'empreinte de l'acheteur écrite dans les métadonnées. Pourboires
sur la page artiste et sur la fiche. Tests de bout en bout en mode test Stripe,
couverture mesurée sur les modules de calcul, ce qui suppose d'installer
l'outil de couverture.

**Arrêt.** Mika fait une première vente réelle, sur son propre compte, avant la
bascule en mode réel pour les autres.

### Phase C, les événements de la communauté. Une semaine

D'abord la migration qui déclare `soirees_manuelles` telle qu'elle est.
Ensuite migrations `organisateurs` et `evenements_communaute`, dépôt en
plusieurs étapes, file de modération dans la page Admin existante, fusion avec
les moissons actuelles et pastille « soumis par l'organisateur ».
L'identification Stripe n'est demandée que si l'organisateur veut vendre des
billets.

**Arrêt.** Un vrai organisateur dépose une vraie soirée.

### Phase D, la billetterie. Une à deux semaines

Migrations `types_billets` et `billets`. Achat par le panier, billet en PDF
avec code QR signé, courriel, page de scan protégée, tableau de bord de
l'organisateur avec export. Question ouverte à trancher ici : le scan doit-il
fonctionner sans réseau à la porte d'une salle.

**Arrêt.** Un premier événement complet, petit volume.

### Phase D.5, le label. Une semaine

Migrations `labels`, `label_membres`, `label_artistes`, `splits`. Somme des
parts à 100 garantie par contrainte et par déclencheur, vente bloquée si les
parts sont mal réglées, invitation par courriel pour un ayant droit sans
compte, virements par ayant droit, tableau de bord du label.

**Arrêt.** VRSTL Records tourne dans SONAA, parts testées à deux ayants droit.

### Phase E, la distribution. Non planifiée

Ne commence pas tant que A à D.5 ne tournent pas en production et tant que Mika
n'a pas tranché les décisions de la section B6 du `HANDOFF.md`. Le premier
livrable n'est pas du code, c'est le rapport de recherche en treize points
demandé dans le prompt. C'est une mission à part entière, à lancer séparément.

---

## 4. Ordre de grandeur, et où est le vrai chemin critique

Les phases 0 à D.5 représentent environ six à huit semaines de travail suivi,
si les arbitrages ne bloquent pas. Le chemin critique n'est pas technique : il
passe par le compte Stripe, l'entité juridique et les textes légaux. Tant que
ces trois-là ne sont pas réglés, le code peut avancer jusqu'à la fin de la
phase B.1, et pas plus loin.
