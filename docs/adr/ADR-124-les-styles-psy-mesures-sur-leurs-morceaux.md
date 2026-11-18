# ADR-124 : les styles psy, mesurés sur leurs morceaux

Date : 18 novembre 2026. Statut : accepté. Étend ADR-123 (le hi-tech) à
toute la famille psy.

## Pourquoi

Mika, après le hi-tech : « fais pareil pour tous les styles psy ».

## Comment

Claude n'entend pas : il mesure. Pour chaque style, des morceaux et des mix
libres d'archive.org, lus par extraits de 40 secondes, pour l'analyse
seulement : rien n'est redistribué. Un extrait ne compte que si son kick est
régulier (au moins 60 % des temps à 5 % près). Le tempo retenu est la
médiane des tempos par référence, pour qu'un long mix ne pèse pas plus
qu'un morceau. L'outil est dans le bloc-notes de session ; la méthode est
celle d'ADR-123.

L'étalonnage d'abord : un rendu connu à une note de basse par double croche
donne 5,5 attaques mesurées par temps, trois notes en donnent 11,4. D'où :
moins de 7,5 attaques, une note par double croche ; de 7,5 à 10, deux.

## Ce qui a été mesuré

| style | extraits | tempo | fondamentale de basse | attaques par temps | charleys |
|---|---|---|---|---|---|
| goa | 13 | 143 | 48 Hz | 8,0 | toutes les doubles croches |
| neo-goa | 11 | 146 | 48 Hz | 6,4 | surtout le contretemps |
| psytrance | 11 | 138, ramené à 140 | 59 Hz | 5,9 | le temps et le contretemps |
| full-on | 26 | 145 | 55 Hz | 7,3 | toutes les doubles croches |
| morning full-on | 25 | 145 | 58 Hz | 7,9 | toutes les doubles croches |
| progressive psy | 9 | 140 | 57 Hz | 9,1 | le contretemps seul |
| suomisaundi | 5 | 145 | 81 Hz | 8,2 | la double croche après le temps |
| forest | 19 | 145 | 48 Hz | 7,9 | toutes les doubles croches |
| darkpsy | 14 | 150 | 46 Hz | 8,0 | toutes les doubles croches |
| twilight | 8 | 150 | 47 Hz | 7,7 | toutes les doubles croches |
| psycore | 15 | 160 | 83 Hz | 4,7 | toutes, plus clairsemées |
| psytech | 10 | 126 | 47 Hz | 5,9 | le contretemps seul |
| zenonesque | 16 | 126 | 41 Hz | 7,1 | clairsemés |

## Ce qui est décidé

- **Les tempos** des motifs suivent les mesures. Le psytrance est à 140, le
  bas de la fourchette du corpus, et non à 138.
- **La basse descend d'une octave** (registre `sub`, de 41 à 59 Hz) partout
  où les références la placent là. Le psycore et le suomisaundi gardent le
  registre `bass`, autour de 80 Hz.
- **Chaque style a sa basse et son kick**, construits par
  `scripts/sons/construire.py` : `basse-<style>` est une double croche au
  tempo du style, relancée une ou deux fois, avec l'éclat de filtre mesuré.
  `kick-<style>` reprend la courbe du hi-tech, accordée sur la tonique,
  avec un corps qui tient une demi-double croche.
- **Les motifs** prennent la place mesurée de la basse : trois doubles
  croches après le kick, ou deux (zenonesque, psytech). Ils prennent aussi
  la place des charleys : contretemps seul pour le prog et le psytech, la
  double croche après le temps pour le suomisaundi. Le goa et le neo-goa
  reçoivent une vraie basse sous leurs 303.
- **Le mix de la famille psy se fait sur le grave** : charleys, caisses,
  mélodies et ligne acide descendent d'un cran (`DOSAGE_DE_FAMILLE`).
  Mesuré au même analyseur, le rendu ne place plus que 12 % de son énergie
  dans la mauvaise bande, en moyenne sur 14 styles.

## Ce qui n'a pas pu être mesuré

- **La courbe du kick, style par style** : la basse qui passe sous le kick
  brouille la mesure. Tous les kicks reprennent la courbe propre du hi-tech.
- **La caisse sur 2 et 4** : le détecteur ne la voit pas, même sur un rendu
  qui en a une. Les motifs gardent leurs caisses et leurs claps.
- **Le nitzhonot** : aucune référence libre exploitable. Il ne reçoit qu'un
  kick accordé.
- **Le psydub** : deux extraits seulement. Il garde son tempo de 90 et sa
  basse de dub, et reçoit un kick accordé.
