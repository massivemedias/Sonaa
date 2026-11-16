# ADR-122 : des sons enregistrés pour chaque sous-style

Date : 16 novembre 2026. Statut : accepté. Remplace la partie synthèse
d'ADR-113.

## Pourquoi

Mika : « les sons sont horribles et ne reflètent pas du tout le style ;
prends de bons one-shots pour tous les sous-styles », puis : « remplace aussi
les accords et les basses par des samples, refais la totale ». Le moteur
d'ADR-113 jouait les batteries enregistrées, mais fabriquait tout le reste
avec les oscillateurs du navigateur : basses, accords, nappes, mélodies,
voix. Une même dent de scie filtrée servait de basse à la deep house et à la
psytrance.

## Ce qui est décidé

- **Le navigateur ne fabrique plus aucun son.** Chaque frappe et chaque note
  lit un fichier de `public/sons`. Le studio ne garde que les traitements :
  réverbération (deux salles rendues en fichiers), écho, pompe, saturation,
  compresseur et un limiteur final à -2 dB.
- **Une bibliothèque de 80 instruments**, construite par
  `scripts/sons/construire.py` et décrite dans
  `src/data/instruments-sons.json`. Trois provenances libres :
  enregistrements CC0 (VCSL, VSCO-2-CE, Sonic Pi) pour le piano, les cordes,
  les cuivres, la harpe, le marimba, les percussions ; synthétiseurs écrits
  en Faust (`scripts/sons/faust.py`) et rendus une fois pour toutes pour la
  303, la reese, la basse Juno, la basse roulante de psytrance, l'accord de
  dub techno, l'orgue M1, les nappes, le hoover, les kicks de gabber et de
  hardstyle.
- **Des zones** : chaque instrument accordé est enregistré une note toutes
  les six ou sept demi-tons. Le moteur prend la plus proche et ne la
  transpose jamais de plus de quatre demi-tons ; un test le vérifie pour les
  219 styles.
- **Le choix par sous-style** (`src/atlas/rythme/instruments.ts`) : d'abord
  ce que la piste nomme (WOBBLE, REESE, PIANO DX7, ORGUE M1...), puis une
  table par style pour la basse, puis la famille. Les kicks des styles durs
  ont les leurs (`echantillons.ts`).
- **Un style ne charge que ses fichiers** : les zones que ses notes
  atteignent sur toute sa grille d'accords, de 3 à 13 fichiers.
- **L'équilibre se règle au banc d'essai**, rendu hors ligne sans
  haut-parleur : un kick devant, la basse deux ou trois dB dessous, les
  accords six à huit dB dessous. Les gains par son sont dans `GAIN_SON`
  (`son.ts`).

## Contrôles

- Chaque zone est mesurée par la méthode YIN à la construction : la note
  enregistrée est accordée sur sa hauteur mesurée, et les erreurs d'octave
  des collections sont ramenées par la convention majoritaire de chacune.
- `echantillons.test.ts` : tous les fichiers existent, chaque piste de
  chaque style a un son, aucune transposition au-delà de quatre demi-tons,
  chaque WAV a un bloc de données lisible, les choix clés par style.

## Ce qui reste ouvert

- Le poids de `public/sons` passe de 2,8 Mo à 28 Mo ; un style en charge
  quelques centaines de kilo-octets.
- La voix hachée (VOIX) est synthétisée par formants, faute d'enregistrement
  CC0 de voix chantée ; c'est le son le moins naturel de la bibliothèque.
