# Rapport de clôture finale, 17 août 2026

SONAA, atlas généalogique des musiques électroniques. 219 genres, 14 familles,
publié sur https://sonaa.ca.

Ce document complète celui du 16 août. Il couvre ce qui a été fait depuis, et
surtout la dernière leçon, qui est la plus applicable de toutes.

---

## 1. Ce qui a été livré depuis la clôture précédente

**La chronologie**, en deux vues. Par famille, quatorze colonnes où les cartes
d'une même décennie s'empilent sans jamais se recouvrir. Par époque, un axe
unique de 1948 à aujourd'hui, les genres de part et d'autre, rangés en couloirs
pour que rien ne se chevauche : 2828 recouvrements sans la règle, zéro avec.
Sur téléphone, la même géométrie tournée d'un quart de tour.

**Les dates réelles.** La déduction par le plus ancien enregistrement se
trompait dans les deux sens : trop tard sur les fondateurs, dont le corpus n'a
pas les enregistrements d'origine, et trop tôt sur les genres bâtis sur un
matériau ancien, où le morceau de référence est un ancêtre samplé. Vingt-trois
dates saisies à la main, et la règle qui les gouverne : **un genre naît quand la
scène le produit, pas quand son matériau existe.**

**Elektronische Musik**, Cologne 1951, créée : son absence était un trou réel
dans l'atlas. Racine parallèle à la musique concrète, pas descendante.

**L'ordre chronologique des dérivés**, du plus ancien au plus récent dans le
sens horaire. Une lecture de plus, gratuite.

**L'interface de connexion**, qui manquait entièrement alors que tout le reste
existait : bouton, menu, panneau, connexion Google jamais appelée jusque-là.

**Resend**, pour lever le plafond de deux courriels par heure du SMTP de
développement.

---

## 2. La dernière leçon, et c'est la plus utile

### Un verdict qu'on peut ignorer finira par être ignoré

Le motif 16 demandait de **lire** la sortie des contrôles avant de publier. Je
l'ai écrit, je l'ai lu, et j'ai publié quand même un dépôt dont un contrôle
échouait, avec un message affirmant le contraire.

Ce n'était pas de la négligence : l'échec s'imprimait au milieu d'un long flot,
la commande enchaînait, et rien ne s'opposait au geste suivant.

**La correction n'est pas une règle de plus, c'est une barrière.** `npm run
publier` lance tous les contrôles, refuse en code non nul si l'un échoue, refuse
aussi si le dépôt n'est pas propre, et ne pousse que si tout passe. La
différence n'est pas de ton, elle est de nature : un avertissement se lit, une
barrière s'ouvre ou ne s'ouvre pas.

**C'est la forme aboutie de ce que ce projet a appris.** Les vingt motifs
décrivent des façons de se tromper ; les contrôles automatiques transforment
quelques-unes en refus. Une règle qu'on doit se rappeler est une règle qu'on
oubliera un jour de fatigue. Une règle qui bloque n'a pas besoin qu'on s'en
souvienne.

### Ce que la barrière a révélé d'elle-même

Testée avec une erreur de type introduite exprès, elle refuse. Testée avec un
doublon CSS introduit exprès, elle laisse passer : `check:css` ne l'a pas vu.

Ce n'est pas un défaut de la barrière, c'est une limite du contrôle qu'elle
appelle, et elle est notée en dette plutôt que corrigée en fin de session. **Le
fait de l'avoir découverte en testant la barrière dans les deux sens, plutôt
qu'en la croyant, est exactement la méthode que ce projet a mis une semaine à
acquérir.**

---

## 3. Ce qu'un lecteur devrait retenir de tout le projet

Les vingt motifs de `ECHECS-SILENCIEUX.md` sont vingt variantes d'une seule
faute : **ne pas confronter la mesure et le raisonnement.**

Elle a deux faces. Croire le raisonnement contre la mesure, qui donne des
comportements déclarés acquis sans avoir été vus s'exécuter. Croire la mesure
contre le raisonnement, plus rare et plus coûteuse, qui a produit une fausse
alerte de régression complète avec bissection et coupable désigné, sur un
serveur qui était simplement mort en cours de série.

Les deux se corrigent par la même question, formulée dans les deux sens :
*qu'est-ce qui prouve que cela s'exécute*, et *par quel chemin cette cause
produirait-elle ce symptôme*.
