# Reconnaître : ce que la page fait, ce qu'elle coûte, ce qu'elle vaut

Page `/reconnaitre/`, ouverte le 19 septembre 2026. Elle écoute dix secondes
par le micro et rend deux résultats indépendants : le **style**, calculé sur
l'appareil du visiteur, et le **morceau**, qui passe par un service payant et
peut être absent.

Le code vit dans `src/reconnaitre/`, la route de la passerelle dans
`worker/src/index.ts`.

## 1. Le modèle

| Mesure | Valeur |
|---|---|
| Réseau | DiscogsResNet, le modèle de la démonstration officielle d'Essentia |
| Entrée | 128 trames de 96 bandes mel, à 16 000 Hz |
| Sortie | 400 styles Discogs |
| Poids | 45 483 872 octets, soit **43,4 Mo**, en 11 fichiers plus un descripteur |
| Paramètres | 11 370 968 |

**Il est servi par notre propre passerelle.** Le serveur d'Essentia ne pose
aucun en-tête CORS, vérifié le 19 septembre 2026 : un navigateur refuse de le
lire depuis sonaa.ca. Les douze fichiers sont donc rangés dans R2, sous
`modele/discogs-resnet/`, et servis par la route publique du Worker avec un
cache d'un an.

**Rien ne se télécharge avant que le visiteur appuie sur Écouter.** La page
annonce le poids avant, en toutes lettres.

## 2. Ce qui a été mesuré, et sur quoi

Toutes les mesures ci-dessous viennent d'un **portable Mac, sous Chrome, le
19 septembre 2026**, sur dix secondes de signal de synthèse.

| Étape | Durée |
|---|---|
| Chargement depuis IndexedDB, deuxième visite | 0,12 à 0,16 s |
| Préchauffage du réseau, première inférence de la session | 0,5 s |
| Inférence sur dix secondes, réseau chaud | 0,2 à 0,6 s |

**Le préchauffage est masqué.** La première inférence d'une session coûtait
4,3 secondes : ce n'est pas le calcul, c'est la compilation des noyaux par
TensorFlow.js. Elle est maintenant lancée pendant que le micro écoute, donc
l'utilisateur ne l'attend jamais.

**Les quatre fenêtres partent en un seul appel.** Quatre appels séparés
prenaient 5,5 secondes pour le même travail ; en un lot, 0,2. Le réseau est
fait pour traiter un lot.

### Ce qui n'a pas été mesuré, et qui reste à faire

**Le temps d'inférence sur un téléphone de milieu de gamme.** Il n'y a pas de
téléphone dans cet environnement de développement, et publier une estimation
calculée depuis un portable serait un chiffre inventé. À faire sur un vrai
appareil, avec le relevé déjà en place : la page mesure le temps, il suffit de
l'afficher. Ordre de grandeur attendu, sans valeur de preuve : un téléphone de
milieu de gamme est trois à dix fois plus lent qu'un portable sur ce genre de
réseau, et le téléchargement de 43 Mo pèsera plus lourd que le calcul.

**La précision sur vingt extraits.** Elle demande vingt fichiers audio
choisis, dix électroniques et dix hors électronique, écoutés et étiquetés à la
main. Le dépôt n'en contient aucun et en fabriquer serait sans valeur. La seule
vérification faite est que la chaîne rend un résultat plausible : sur un signal
de synthèse à quatre temps avec une nappe, le modèle répond Garage House 49 %,
Tech House 29 %, Disco 18 %, ce qui est cohérent avec ce qu'on lui a donné.
C'est un test de tuyauterie, pas une mesure de précision, et cela ne doit pas
être présenté autrement.

## 3. Les 400 styles, ramenés à l'atlas

La table est dans `src/reconnaitre/discogs-vers-sonaa.ts`, écrite à la main,
vérifiée par huit tests.

| | Nombre |
|---|---|
| Étiquettes du modèle | 400 |
| Styles électroniques | 106 |
| Électroniques avec un genre SONAA exact | 87 |
| Électroniques sans genre exact, rattachés à une famille | 19 |
| Non électroniques que SONAA couvre quand même | 12 |
| Non électroniques sans équivalent, affichés en gris | 282 |

### Les dix-neuf styles électroniques sans genre SONAA

Ils sont trop larges pour un genre, ou absents de l'atlas. Chacun garde une
famille SONAA, donc le lecteur est envoyé quelque part de juste.

| Style Discogs | Famille SONAA proposée |
|---|---|
| Abstract, Chiptune, Experimental, Leftfield, Modern Classical | ambient |
| Dance-pop, Disco Polo, Eurodance, Italodance | disco |
| Euro House, House, Tropical House | house |
| Neofolk, New Wave, Noise | industrial |
| Hands Up | hardcore |
| Synthwave | electro |
| Techno | techno |
| Vaporwave | downtempo |

**« House » et « Techno » tout court sont les deux cas qui comptent**, parce
que ce sont des réponses fréquentes du modèle. L'atlas ne connaît pas de genre
nommé simplement House : il connaît Chicago House, Deep House, Garage House.
Renvoyer vers la famille est la seule réponse honnête.

## 4. Le morceau, et ce qu'il coûte

La route `POST /api/reconnaitre-track` relaie huit secondes à AudD et rend cinq
champs. **Sans la clé `AUDD_API_KEY`, elle répond 503 et la page masque toute
la section** : vérifié en production le 19 septembre 2026.

Tarifs AudD relevés le 19 septembre 2026 : 300 requêtes gratuites, puis 5 USD
par millier à l'usage, et des forfaits à partir de 450 USD pour 100 000.

| Reconnaissances par mois | Coût mensuel |
|---|---|
| 100 | 0 USD, sous le palier gratuit |
| 1 000 | environ 5 USD |
| 10 000 | environ 50 USD |

**La limite de trente par adresse et par heure existe pour cela.** Une page
laissée ouverte avec un minuteur coûterait un abonnement ; le compteur vit dans
le même KV que la file des artistes, sous le préfixe `reco:`, et expire seul.

## 5. Ce que la page promet, et où c'est tenu

- **Le son ne sort pas de l'appareil pour le style.** Tout se passe dans
  `src/reconnaitre/modele.ts`, il n'y a aucun appel réseau après le
  téléchargement du modèle.
- **Le micro se referme.** `capture.ts` arrête chaque piste dans un `finally`,
  donc même quand tout a échoué.
- **Rien n'est conservé côté serveur.** La route de la passerelle garde l'audio
  dans la mémoire de la requête, ne l'écrit ni dans R2 ni dans KV, et ne
  journalise pas son contenu.
- **Deux consentements distincts**, comme la loi 25 le demande par finalité :
  écouter sur l'appareil, et envoyer huit secondes à un tiers. Le second est
  une case décochée, et on peut refuser l'un sans l'autre.
- **L'historique est local**, vingt entrées dans le stockage du navigateur,
  effaçable par un bouton.

## 6. Ce que la page ne promet pas

Elle ne dit nulle part qu'elle reconnaît tout, ni qu'elle couvre un catalogue
underground. Le style est présenté comme une estimation faite sur dix
secondes, et la phrase est à l'écran, sous le résultat : une voix, une
publicité ou un enchaînement le trompent. Le modèle a été entraîné sur des
morceaux entiers, pas sur dix secondes de radio avec un animateur par-dessus.
