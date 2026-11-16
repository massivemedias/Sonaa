# ADR-123 : le hi-tech, mesuré sur ses morceaux

Date : 16 novembre 2026. Statut : accepté. Complète ADR-122.

## Pourquoi

Mika, devant l'affiche du hi-tech : « écoute les meilleurs tracks dans le
style et fais quelque chose de simple et relativement similaire en utilisant
les bons sons ». Le motif avait une caisse claire sur 2 et 4, une basse
syncopée une octave trop haute et les charleys d'une TR-909.

## Comment

Claude n'entend pas : il mesure. Trois références libres, téléchargées
d'archive.org pour l'analyse seulement, rien n'est redistribué : Unreal Sign,
Hitech Transmitter (180 BPM), Gotavat, Paradigma (182 BPM), et un mix
hi-tech à 200 BPM. Ektoplazm, le netlabel de référence, refuse les robots.
Chaque temps est calé sur le clic de son kick, puis on compte où tombent les
attaques, bande par bande, sur des centaines de temps.

## Ce qui a été mesuré

- **Le kick** part d'environ 360 Hz, passe 200 Hz à 18 ms, 120 Hz à 40 ms
  et 60 Hz vers 100 ms ; son corps tient jusque vers 55 ms.
- **La basse** a sa fondamentale entre 42 et 60 Hz et roule en
  micro-attaques de 8 à 9 ms, environ douze par temps, muette sur le kick :
  c'est la mitraille.
- **Les charleys et les percussions** tombent sur le contretemps ; aucune
  caisse claire sur 2 et 4.
- **L'équilibre** : de 42 à 58 % de l'énergie entre 60 et 120 Hz, moins de
  3 % au-dessus de 6 kHz.

## Ce qui est décidé

- Le motif : kick à la noire, charleys FM sur les doubles croches paires,
  charley ouvert au contretemps, basse sur les trois doubles croches après
  chaque kick, laser FM en 3 contre 4. Gamme phrygienne de fa dièse, la
  basse monte d'un demi-ton à la troisième mesure.
- Les sons, fabriqués pour lui (`scripts/sons/construire.py`) : `kick-hitech`
  sur la courbe mesurée, `basse-hitech` (une double croche à 180 BPM : la
  sous-basse et trois attaques de filtre en triple croche de triolet, une
  zone par demi-ton pour ne jamais changer son débit), `charley-fm`,
  `charley-fm-ouvert`, `lead-zap`.
- Vérifié au même analyseur : le rendu de SONAA met 44 % de son énergie
  entre 60 et 120 Hz et 1,4 % au-dessus de 6 kHz.
