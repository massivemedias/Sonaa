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
| Réseau | DiscogsResNet, le modèle tfjs de la démonstration `discogs-autotagging` du dépôt MTG/essentia.js, au même octet près |
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
| Styles électroniques | 107 |
| Électroniques avec un genre SONAA exact | 87 |
| Électroniques sans genre exact, rattachés à une famille | 20 |
| Non électroniques que SONAA couvre quand même | 12 |
| Non électroniques sans équivalent, affichés en gris | 281 |

### Les vingt styles électroniques sans genre SONAA

Ils sont trop larges pour un genre, ou absents de l'atlas. Chacun garde une
famille SONAA, donc le lecteur est envoyé quelque part de juste.

| Style Discogs | Famille SONAA proposée |
|---|---|
| Abstract, Chiptune, Experimental, Leftfield, Modern Classical | ambient |
| Dance-pop, Disco Polo, Eurodance, Italodance | disco |
| Euro House, House, Tropical House | house |
| Neofolk, New Wave, Noise | industrial |
| Hands Up | hardcore |
| Neo Trance | trance |
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

## 7. L'audit du 22 septembre 2026 : ce qui était faux, et ce qui a été mesuré

Constat en production : deep house et hypnotic techno donnaient le même trio
« Hi NRG / Dance-pop / Hardstyle », et aucun morceau ne s'affichait.

**Le banc.** `scripts/banc-reconnaitre.mjs` lance Chrome avec un faux micro
qui lit un fichier WAV, pilote la page comme un visiteur, et rend ce que le
visiteur aurait vu plus les mesures que la page expose en développement.
Rien n'est contourné : getUserMedia, MediaRecorder, décodage, rééchantillonnage,
fenêtres, réseau, envoi à la passerelle.

**Le morceau.** AudD répond `status: error`, code 902, « authorization failed:
the limit was reached », pour trois extraits de morceaux publiés, en WebM/Opus
comme en WAV 16 kHz. Le quota du jeton est épuisé. La route rendait `null`
dans ce cas comme dans « rien reconnu » ; elle rend maintenant `raison`, et la
page l'affiche sous « Morceau non identifié ». Le format envoyé est mesuré :
`audio/webm;codecs=opus`, 8 tranches d'une seconde, 130 684 octets, reçus tels
quels par la passerelle. La conversion en WAV n'a pas été faite : elle ne se
justifie que si AudD refuse le format, et il refuse avant de le lire.

**Le style.** Le chemin est fidèle : décodé à 48 000 Hz, ramené à 160 320
échantillons à 16 000 Hz pour 10,02 s ; un appel groupé et quatre appels
séparés donnent les mêmes 400 sorties à 0 près ; le même fichier passé sans
micro donne le même top 3 à 0,02 à 0,12 près. Les paramètres suivent la fiche
officielle, TensorflowInputMusiCNN à 16 kHz, trames de 512, saut de 256, 96
bandes, fenêtres de 128 trames, à un écart près : le saut entre fenêtres est
de 128 trames ici, 62 dans l'algorithme d'Essentia et 64 dans la démonstration.

**La cause était l'ordre des étiquettes.** La table suivait l'ordre des classes
d'un autre modèle, la tête discogs400 pour EffnetDiscogs. La démonstration
d'où vient le réseau range les mêmes noms autrement, et sept diffèrent. À 268
index sur 400, le nom affiché était celui d'une autre classe : « Hi NRG »
était House, « Dance-pop » était Deep House, « Hardstyle » était Hip-House.
Le trio vu sur de la deep house était donc juste, et mal nommé. L'ordre vit
maintenant dans `etiquettes-modele.ts`, copié de la démonstration, et un test
tient les deux listes ensemble.

| Extrait | Avant | Après |
|---|---|---|
| Extrawelt, Herz aus Blech | Tech House 82, Hi NRG 67, Dark Ambient 27 | Techno 82, House 67, Deep Techno 27 |
| Biesmans, On the Run | Minimal Techno 38, Tech House 34, Hi NRG 34 | Neo Trance 38, Techno 34, House 34 |
| Affkt, Roommush | Power Electronics 36, Hi NRG 19, Minimal Techno 8 | Progressive House 36, House 19, Neo Trance 8 |
| Pardon Moi, Damon Jee remix | Minimal Techno 46, Power Electronics 39, Tech House 35 | Neo Trance 46, Progressive House 39, Techno 35 |

**Le niveau.** Musique : 0,15 à 0,37 de niveau efficace. Sinusoïde à -44 dBFS :
0,006, et le réseau répondait quand même « Euro-Disco 19 % ». Silence : 0, et
Essentia levait une exception brute dans le WASM. Sous 0,01 la page dit « Son
trop faible » et ne classe pas. Le seuil est provisoire : aucun vrai
enregistrement de pièce n'a pu être fait sur ce poste.

**Ce que les pourcentages sont.** La sortie du réseau est une sigmoïde par
classe, pas une distribution : « Techno 82 % » et « House 67 % » ne se
partagent rien. La jauge les présente comme des parts, et c'est trompeur.
