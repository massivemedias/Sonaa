# ADR-113 : une affiche de rythme par style, et ses couleurs dans tout le site

Date : 30 octobre 2026. Statut : accepté.

## Pourquoi

Mika a montré une publication Instagram : le nom d'un style en grand, une
devise en italique, le tempo, un cercle où chaque instrument dessine un
polygone, et une grille de pas dessous, sur un fond brun presque noir éclairé
d'ambre. Sa demande : « je veux la même chose dans chaque style de sonaa.ca,
je vais en faire la pub, et je veux les couleurs de ces publications dans tout
sonaa ».

## Ce qui est décidé

- Chaque page de style porte, sous la fiche technique, une affiche animée au
  format portrait d'Instagram (1080 x 1350). Le tour du cercle est une
  mesure, le haut est le premier temps. Chaque piste a son anneau, et ses
  frappes en sont les sommets. Une tête de lecture tourne au tempo du style.
  La grille du bas dit la même chose à plat.
- Le motif se joue dans la page, par un petit synthétiseur fait
  d'oscillateurs et de bruit, sans aucun échantillon. L'horloge est celle de
  l'audio, et le dessin la lit aussi.
- L'affiche se télécharge en image PNG et en vidéo MP4 de douze secondes
  environ, son compris, signée sonaa.ca. C'est ce que Mika publiera.
- Les 219 motifs sont dans `src/data/rythmes.json`. Ils ont été écrits à
  partir de la section « Rythme » du cours de chaque style et de la
  fourchette de tempo du corpus. Ce sont des motifs d'école, la forme la plus
  reconnaissable du style, et non le relevé d'un morceau. Un test vérifie que
  chaque style en a un, qu'il est bien formé, que son tempo reste dans la
  fourchette du corpus et que deux styles n'ont jamais le même motif.
- La palette du site prend les couleurs de ces affiches. Le granite se
  réchauffe (chroma 0,014 au lieu de 0,004), l'encre vire à la crème,
  l'accent passe de l'orange #FF7A1A à l'ambre #E9A23B, le jaune #FFD75E au
  sable #E8CF8A. Une lueur ambre très faible éclaire le haut des pages. Les
  cinq teintes de piste sont des jetons, `--piste-1` à `--piste-5`, dans un
  ordre fixe : ambre, vert, orange brûlé, sable, brun.
- Le titre et la devise de l'affiche sont en serif. L'interdit du serif à
  fort contraste tient pour l'interface, qui reste en Inter. Il est levé pour
  cette image, qui est faite pour Instagram.

## Le son, seconde passe

Mika, après la première version : « renseigne-toi sur cette page pour avoir le
complet, avec les sons, parce que c'est ça qui fait la différence ». Les
légendes de la série qui l'inspire disent ce qui fait la différence : de
vrais accords (Rhodes en neuvièmes, Am F C G), une basse qui joue des notes,
une mélodie dans la gamme du style, et la forme d'un morceau de club, avec
une montée, un temps de silence et le drop. Rien n'est repris de cette série :
ni ses sons, ni ses images. Tout est fabriqué ici.

- Chaque style reçoit une tonalité, une gamme (mineure, dorienne,
  phrygienne, pentatonique, hirajoshi...), de un à quatre accords qui
  tournent une mesure chacun, des notes en degrés pour ses voix mélodiques,
  et trois réglages de caractère : le swing, l'espace (réverbération et
  écho) et le grain (saturation). Une piste secondaire peut céder sa place à
  l'instrument qui signe le style : le Rhodes de la deep house, les cordes de
  la Detroit techno, le log drum de l'amapiano.
- Le synthétiseur a 32 voix, toutes fabriquées avec des oscillateurs et du
  bruit : charleys en six carrés désaccordés comme une 808, Rhodes en
  modulation de fréquence, 303 avec glissando, reese désaccordée, hoover qui
  monte de deux demi-tons. Une réverbération générée, un écho à la croche
  pointée, la pompe du kick sur tout ce qui est tenu, une saturation dosée
  par style.
- « Écouter » et la vidéo jouent un morceau construit : les pistes entrent
  une à une et leur anneau se dessine, la montée retire le kick, roule la
  caisse et ouvre un bruit blanc, un temps de silence, puis le drop deux
  fois. Le fond de chaque affiche prend la teinte de la famille du style.

Mesuré hors ligne sur les 219 styles, six secondes chacun : aucune valeur
invalide, crête maximale 0,77, niveau moyen médian -16 dB, et 80 % des
styles entre -19 et -12 dB. Les styles saturés sortaient jusqu'à 10 dB
au-dessus des autres : le volume général baisse avec le grain.

## Ce qui a été mesuré

Dans un Chromium 152, `MediaRecorder.isTypeSupported` répond oui pour le MP4
avec son AAC, et l'enregistrement rend 12 ko, une seule image : l'encodeur
AAC manque. L'export juge donc le fichier sur pièces. Sous 100 ko, il le
refait avec le format suivant. Le MP4 du navigateur a alors rendu 7,8 Mo,
11,6 secondes, en 1080 x 1350.

## Ce que cela ne fait pas

- L'affiche n'est pas encore l'image de partage des pages pré-rendues. Il
  faudrait la dessiner au moment de la construction.
