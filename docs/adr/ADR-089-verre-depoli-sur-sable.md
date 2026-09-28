# ADR-089 : verre dépoli sur sable, ou le site quitte le mauve

Date : 28 septembre 2026. Statut : accepté, en production.

Les ADR-001 à ADR-083 vivent dans [ARCHITECTURE.md](../../ARCHITECTURE.md).
Ce document remplace la direction visuelle d'[ADR-086](ADR-086-la-v2.md)
(la maille des trois accents, le dégradé, la lueur, le chrome qui flotte) et
met à jour [DESIGN.md](../../DESIGN.md) sur la palette et sur la section 10.

## Ce qui est décidé

SONAA est posé sur du sable, et tout ce qui se pose sur le sable est en
verre dépoli. Il n'y a plus de mauve, de violet, de fuchsia ni de cyan : les
seules couleurs vives du site sont les quatorze teintes de famille du corpus,
et un accent, un terracotta, pour les boutons, les états actifs et les liens.

### La palette

| Rôle | Clair | Sombre |
|---|---|---|
| Fond | sable de plage, `oklch(0.96 0.02 85)`, #f8f1e3 | sable gris profond, `oklch(0.22 0.012 80)`, #1e1a14 |
| Texte principal | `#3C3C3C` exactement | sable très pâle, `oklch(0.94 0.01 85)`, #eeebe4 |
| Texte secondaire | `#3C3C3C` à 75 % | l'encre à 65 % |
| Accent | terracotta, `oklch(0.54 0.13 45)`, #aa5224 | le même, remonté, `oklch(0.74 0.12 50)`, #e79363 |
| Sur l'accent | `oklch(0.99 0.005 85)` | le fond, `oklch(0.22 0.012 80)` |

Pas de blanc pur, pas de noir pur, nulle part. Le fond porte une texture
de bois très fine, en SVG écrit dans les jetons, répétée en tuiles de 400 px
sur un pseudo-élément fixe de `body` : voir « Retouches du même jour ». Elle
ne bouge pas au défilement, et elle reste quand le mouvement est réduit,
parce qu'elle ne bouge jamais.

**Deux valeurs demandées ont été mesurées avant d'être écartées.** Le texte
secondaire à 65 % donnait 3,75 pour 1 sur le sable, sous le AA ; à 75 % il
donne 4,87. L'accent à 0,62 de clarté donnait 3,37 pour 1 comme lien sur le
sable et 3,79 sous du texte blanc, sous le AA dans les deux rôles ; à 0,54 il
donne 4,74 et 5,33. Le sombre n'avait pas ce problème : 6,8 pour le texte
secondaire à 65 %, 7,2 pour l'accent. Les mesures viennent de
`scripts/audit-contraste.ts`, qui lit chaque texte visible de neuf pages
dans les deux thèmes, compose sa couleur sur ce qu'il recouvre réellement,
et rend le minimum.

### Le verre

Une surface de verre est la surface levée du thème à 40 % en sombre et 55 %
en clair, un flou de 24 px avec une saturation de 1,4 sur ce qui passe
dessous, et un filet intérieur blanc à 8 % ou 12 %, posé en ombre interne.

**La surface levée, et non le fond exact.** Le premier essai prenait la
couleur exacte du fond : en clair, un verre de sable à 55 % posé sur le même
sable ne se voyait plus du tout dès qu'il n'avait rien dessous, et le second
bouton de la bannière se lisait comme du texte nu. Le verre prend donc la
surface levée du thème, un cran plus claire que la page : `oklch(0.995 0.008
85)` en clair, `oklch(0.27 0.012 80)` en sombre. Aucune bordure
extérieure, aucun filet coloré, aucune ombre dure. Les surfaces qui
flottent, les deux barres, la surcouche du micro, le menu Plus, la feuille
d'une soirée, portent en plus une ombre très diffuse, et elles seules.

La recette vit une fois, dans `src/design/verre.css`, sur la liste des
surfaces qui la portent : les deux barres de navigation, le bouton de
compte, les tuiles de famille et de genre, les cartes de soirée, de news et
de mixtape, la fiche technique d'un genre, la fiche du morceau reconnu, la
surcouche du micro, les sélecteurs du calendrier, le mini lecteur et le pied
de page.

**Deux pièges de la physique du filtre, trouvés à la vérification.** Un
élément flouté devient le cadre de ses descendants fixes : la loupe d'une
pochette, ouverte depuis une carte de mixtape en verre, se serait ouverte
dans la carte. Elle et la fenêtre de contribution passent donc par un
portail sous `body` ; la fenêtre de consentement du micro éteint le flou de
son panneau pendant qu'elle est ouverte. Et un flou posé dans un élément
flouté ne voit que l'intérieur de son parent : le menu Plus, qui s'ouvre
depuis la barre du bas, ne flouterait rien de la page. Il prend un panneau
presque opaque du thème, avec le même filet et la même ombre. Les feuilles des composants ne réécrivent ni
fond, ni bordure, ni ombre sur ces sélecteurs ; un survol surcharge
`--verre-fond`.

**Deux niveaux, jamais trois.** La surcouche du micro porte la fiche du
morceau : c'est un verre sur un verre, et cela se lit encore. Un troisième
flou fait de la bouillie ; la feuille retire le flou au troisième niveau par
construction. Le rideau derrière la surcouche a perdu son flou pour la même
raison : un rideau flouté est un niveau. Il est aussi passé du noir au fond
du thème à 70 % : un rideau noir sous un verre de sable donnait, en clair,
un gris sale sur toute la surcouche.

**Le repli.** Sans filtre d'arrière-plan, les surfaces prennent un fond
opaque du thème, par `@supports not`. Même chose quand le système demande
moins de transparence.

### Le hero

Cinq affiches en une rangée droite, même taille, coins à 16 px, aucune
rotation ; le texte à gauche sur ordinateur. Sur téléphone, la rangée devient
un défilement horizontal qui montre deux affiches et demie : trois de front
sur 390 px feraient 109 px de large, et à cette taille un flyer n'est plus
qu'une tache. La règle anti-doublon d'affiches reste, et elle se renforce :
une affiche par salle. Deux soirées d'une même salle portaient le même
programme du mois sous deux adresses d'image, et la rangée de bureau le
montrait deux fois.

### Le téléphone

- Gouttière de 20 px sur téléphone, 32 px à partir de 768 px, par
  `--marge-page`, lue partout.
- Barre du haut fixée, 56 px plus la zone de sécurité ; barre du bas fixée,
  64 px plus la zone de sécurité. Chaque hauteur est un jeton lu deux fois,
  par la barre et par le retrait du corps de page : le contenu ne peut pas
  passer dessous, parce que c'est le même nombre.
- Cibles tactiles de 44 px sous 900 px. Dans Safari, une liste déroulante
  native garde 20 px de haut quoi qu'on lui demande : les listes du
  calendrier perdent l'apparence du système, et leur chevron est dessiné en
  CSS, à la couleur du texte.
- Le groupe du compte, en haut à droite, devient quatre ronds de 44 px :
  la loupe, l'autre langue seulement, le thème, et le compte, dont « Se
  connecter » devient une icône qui garde le mot comme nom accessible. Le mot
  entier faisait 111 px en français, et à 320 px le groupe recouvrait le
  logo. À 320 px, le titre de la barre des styles se coupe en points de
  suspension : il n'y a pas la place de l'écrire à côté de quatre ronds.
- Le pied reste une ligne à partir de 1024 px, mesuré par `check:pied`.

Tout cela est mesuré par `scripts/check-mobile.ts`, sur neuf pages à huit
largeurs, et ce contrôle entre dans la barrière de publication.

### L'espacement

Huit pas, `--espace-4` à `--espace-64`, et plus une valeur en clair dans les
feuilles, sauf exception commentée. Une valeur entre deux pas a pris le pas
le plus proche.

## Retouches du même jour, après la première mise en ligne

Mika, sur ses captures de bureau : « vraiment bon, j'aimerais les fonts plus
petites, le hover et focus du menu quelque chose de différent, les titres du
menu à droite en desktop, garder les icônes en mobile », puis « que le
background soit texturé », et enfin « plutôt une texture de bois très fine ».

- **Le fond est un bois très fin.** Le premier grain, un bruit gris à 5 %,
  ne variait que d'un demi-niveau de gris sur le sable : mesuré en pixels,
  il était invisible. Mika a demandé une texture, puis « plutôt une texture
  de bois très fine ». C'est un veinage en SVG : un bruit étiré en largeur
  donne des fibres longues et fines, un second bruit très lent les fait
  onduler, et les deux passent par `feTile` avant le déplacement, sans quoi
  une couture verticale apparaissait tous les 400 px. Fibres brunes sur le
  sable clair à 40 %, crème sur le sable sombre à 26 %. Le fond moyen passe
  de #f8f1e3 à #f1e9d9 en clair et de #1e1a14 à #29251f en sombre. Trois
  couleurs claires ont été foncées d'un cran pour tenir le AA sur ce fond :
  l'accent passe à 0,52 de clarté, le texte secondaire à 80 %, les encres
  les plus pâles d'un cran. L'audit de contraste mesure désormais le fond
  en pixels, texture comprise.
- **Les textes sont plus petits** : titres de section de 45 à 36 px au plus,
  titre de la bannière de 70 à 56 px, chapeau de la bannière de 17 à 15 px,
  boutons et menu à 14 et 13 px, listes du calendrier à 13,6 px.
- **Le menu est à droite sur ordinateur**, contre les réglages du compte, et
  il n'a plus de pastille : un trait terracotta de 2 px naît sous le mot au
  survol et au focus du clavier, et reste sous la page courante. Aucun
  contour, conformément à la règle du 7 septembre. La langue active parle
  de la même façon.
- **Le téléphone garde sa barre d'icônes**, sans changement.

## Ce qui est supprimé

Les jetons `--accent-a`, `--accent-b`, `--accent-c`, `--degrade`, `--lueur`
et `--maille`, et avec eux `--accent-a-profond`, `--accent-a-clair`,
`--sur-degrade`, `--verre-bord`, `--verre-bord-fort`, `--verre-fond-fort` et
`--ombre-carte`. Les utilitaires Tailwind `verre-fort`, `lueur` et `maille`.
La pilule flottante du haut et la capsule flottante du bas. Les affiches
inclinées. La maille des bannières.

## Ce qui ne change pas

Inter reste la police, auto-hébergée. La mission demandait Larsseit, mais
Larsseit a été essayée le 22 septembre et écartée par Mika le 23 (« j'aimais
bien l'ancienne police finalement ») ; ses fichiers sont partis avec ce
choix. Les quatorze teintes de famille restent. La structure, les routes, le
contenu, les composants, le geste d'apparition de Motion, la carte en trois
dimensions qui reste sombre : rien ne bouge.

## Ce que cela coûte, et qui est assumé

- Le veinage ajoute 1840 octets à la feuille de style construite, 440 une
  fois compressés, sous les 2 Ko demandés, et aucune requête : deux tuiles,
  une par thème.
- Le flou de 24 px est demandé sur téléphone aussi ; Safari le rend en
  matériel. Si un téléphone ancien peine, le jeton `--verre-flou` se baisse
  d'un geste.
- Le contrôle `check:mobile` ajoute environ une minute à la publication.

## Mesures, le 28 septembre 2026, sur le site construit

| Mesure | Résultat |
|---|---|
| Contraste minimum, thème sombre | 6,17 pour 1, sur 1110 textes de neuf pages à 390 et 1440 px, mesuré sur le fond réel grain compris |
| Contraste minimum, thème clair | 4,67 pour 1, même relevé |
| Débordement horizontal | aucun, neuf pages à 320, 375, 390, 430, 768, 1024, 1440 et 1920 px, en français et en anglais sur téléphone |
| Barre du haut | 56 px partout, fixée, floutée à 24 px |
| Barre du bas | 64 px sous 900 px, au bord, et le corps réserve cette place |
| Cibles tactiles | aucune sous 44 px sous 900 px |
| Repli sans filtre | huit surfaces de verre mesurées en ligne, cartes de soirée comprises, toutes opaques |
| Moteur de Safari | le même contrôle passe dans WebKit, en ligne, après un correctif : les listes Ville et Quand y restaient à 20 px de haut tant qu'elles gardaient l'apparence du système |
| Pied de page | une ligne de 1024 à 1440 px dans les deux langues |
| Texture de bois | 1840 octets bruts, 440 compressés, deux tuiles |

Soixante-six textes posés sur une image (pochettes, affiches, bannières de
genre) ne sont pas mesurables et ne comptent pas dans les minimums.
Chrome refuse de se lancer sans filtre d'arrière-plan : le repli est
mesuré en remplaçant, à sa place dans la feuille construite, la règle
`@supports not` par son contenu.
