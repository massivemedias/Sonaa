# CORPUS SONAA v1

Six familles, 60 genres. L'indentation est la filiation structurelle, celle
qui positionne le noeud dans l'arbre. Les autres ascendances sont notees en
greffe.

Notation :

- `[fondateur]` racine de la famille
- `[greffe: X, famille Y]` parent supplementaire dans une autre famille
- `(?)` filiation marquee `debated`, je ne suis pas sur, a trancher
- `(source: ...)` quand deux sources divergent, celle que j'ai suivie
- `n morceaux` identifiants YouTube verifies un par un par oEmbed

Sources croisees : dataset Ishkur's Guide v3 (igorbrigadir), Ishkur v2.5,
Wikipedia, Discogs. Les 60 notes detaillees sont dans `src/data/corpus.json`,
champ `note`.

## DISCO

- Disco  [fondateur]  3 morceaux
  - Euro Disco  3 morceaux
    - Hi-NRG  (?)  3 morceaux
    - Italo Disco  3 morceaux
      - Spacesynth  (?)  3 morceaux
  - Cosmic Disco  3 morceaux
  - Boogie  3 morceaux
  - Nu-Disco  3 morceaux
    - Indie Dance  (?)  3 morceaux
    - Dark Disco  (?)  2 morceaux

## HOUSE

- Chicago House  [fondateur]  [greffe: Disco, famille disco]  3 morceaux
  - Acid House  3 morceaux
  - Garage House  [greffe: Disco, famille disco]  (?)  3 morceaux
    - Deep House  3 morceaux
  - Hip House  3 morceaux
  - UK House  3 morceaux
    - Italo House  [greffe: Italo Disco, famille disco]  (?)  3 morceaux
    - Hard House  3 morceaux
    - Progressive House  3 morceaux
  - Disco House  [greffe: Disco, famille disco]  3 morceaux
    - French House  3 morceaux
      - Electro House  (?)  3 morceaux

## TECHNO

- Detroit Techno  [fondateur]  3 morceaux
  - Bleep Techno  3 morceaux
  - Acid Techno  [greffe: Acid House, famille house]  3 morceaux
  - Euro Techno  3 morceaux
    - Hard Techno  (?)  3 morceaux
      - Schranz  2 morceaux
      - Industrial Techno  3 morceaux
      - Banging Techno  3 morceaux
  - Dub Techno  3 morceaux
  - Ambient Techno  3 morceaux

## MINIMAL

- Minimal Techno  [fondateur]  [greffe: Detroit Techno, famille techno]  3 morceaux
  - Tech House  [greffe: UK House, famille house]  (?)  3 morceaux
    - Microhouse  3 morceaux
      - Clicks & Cuts  3 morceaux
      - Minimal Tech  3 morceaux
        - Minimal Prog  [greffe: Psy-Prog, famille psy]  (?)  3 morceaux
    - Deep Tech  3 morceaux
    - Fidget House  3 morceaux

## TRANCE

- Trance  [fondateur]  (?)  3 morceaux
  - Acid Trance  [greffe: Acid House, famille house]  3 morceaux
  - Balearic Trance  3 morceaux
    - Dream Trance  3 morceaux
  - Progressive Trance  [greffe: Progressive House, famille house]  3 morceaux
    - Tech Trance  3 morceaux
    - Uplifting Trance  3 morceaux
      - Vocal Trance  (?)  3 morceaux
  - German Trance  3 morceaux
    - Hard Trance  3 morceaux

## PSY

- Goa Trance  [fondateur]  [greffe: Acid Trance, famille trance]  (?)  3 morceaux
  - Psychedelic Trance  3 morceaux
    - Full-On  3 morceaux
      - Nitzhonot  (?)  3 morceaux
    - Dark Psy  3 morceaux
      - Forest Psy  3 morceaux
      - Hi-Tech Psy  3 morceaux
    - Psy-Prog  (?)  3 morceaux
    - Suomisaundi  3 morceaux
  - Psydub  3 morceaux

---

## Les 15 filiations que je n'ai pas tranchees seul

**Hi-NRG** (rattache a Euro Disco) : Ishkur v3 fait descendre Hi-NRG de Spacesynth (1977). Wikipedia et Discogs le font descendre directement du disco europeen, via Patrick Cowley et Giorgio Moroder. J'ai suivi Wikipedia : Spacesynth est posterieur (1983) et ne peut pas etre l'ancetre d'un genre de 1977.

**Spacesynth** (rattache a Italo Disco) : Ishkur v3 en fait l'ancetre de l'Italo et du Hi-NRG. Discogs et la scene le decrivent comme une branche instrumentale de l'Italo, posterieure (Laserdance, 1984). J'ai inverse le lien par rapport a Ishkur.

**Indie Dance** (rattache a Nu-Disco) : Terrain de Mika, a corriger. Je l'ai rattache au nu-disco, mais on le rattache aussi souvent a l'electroclash et au dark disco.

**Dark Disco** (rattache a Nu-Disco) : Terrain de Mika, a corriger. Greffe EBM posee par defaut, la famille industrial n'existe pas dans ce corpus v1 : la greffe est donc declaree mais non resolue.

**Garage House** (rattache a Chicago House) : Paradise Garage, New York. Ishkur v3 lui donne aucun parent et le date de la fin des annees 70, donc anterieur a la house de Chicago. Wikipedia le presente comme contemporain et parallele. Rattachement structurel a Chicago House par commodite de lecture, la double ascendance disco est portee par la greffe.

**Italo House** (rattache a UK House) : Ishkur v3 le fait descendre de Hard House (1987). Discogs et la scene le rattachent au piano house britannique et a l'heritage italo. J'ai suivi la seconde lecture.

**Electro House** (rattache a French House) : Ishkur v3 le fait descendre de French House (2001). D'autres sources le font descendre de l'electroclash. Desaccord non tranche.

**Hard Techno** (rattache a Euro Techno) : Ishkur v3 le fait descendre de Bleep Techno (1992). L'usage courant le rattache a la techno europeenne dure de Berlin et Francfort. Desaccord non tranche.

**Tech House** (rattache a Minimal Techno) : Ishkur v3 lui donne deux parents, UK House (1992) et Progressive House (1991), et le range dans sa propre scene. Je l'ai rattache au minimal pour la lisibilite de cette famille, avec greffe vers la house. Arbitrage discutable.

**Minimal Prog** (rattache a Minimal Tech) : Ishkur v3 le range dans sa scene Progressive et le fait descendre de Progressive (2003). Il est a la frontiere du minimal et du psy progressif : greffe declaree vers le psy-prog. Terrain de Mika, a corriger.

**Trance** (rattache a aucun) : Fondateur de la famille. Francfort, 1990, Dance 2 Trance et Sven Vath. Ishkur v3 le fait descendre de l'EBM (1987), lecture minoritaire. Wikipedia et Discogs le font naitre de la techno et de la house acide. Greffe EBM declaree mais non resolue.

**Vocal Trance** (rattache a Uplifting Trance) : Ishkur v3 le fait descendre de l'Eurodance (1996) et le range dans Europop. Je l'ai rattache au trance uplifting, plus proche de l'usage courant.

**Goa Trance** (rattache a aucun) : Fondateur de la famille. Goa, Inde, 1991-1994. Ishkur v3 le fait descendre de l'EBM (1990). Wikipedia le fait naitre de l'acid trance, de la new beat et de l'industriel. Les deux ascendances sont portees en greffes.

**Nitzhonot** (rattache a Full-On) : Israel, 1996-1998. Certaines sources le placent avant le full-on plutot qu'apres. Absent d'Ishkur v3.

**Psy-Prog** (rattache a Psychedelic Trance) : Terrain de Mika, a corriger. Ishkur v3 le fait descendre de Psychedelic Trance (1995), ce qui est tres tot. La scene le date plutot de 1999-2002.

---

## Greffes declarees mais non resolues

Quatre genres descendent de l'EBM, qui appartient a une famille industrial
absente de ce corpus v1 : Dark Disco, Industrial Techno, Trance, Goa Trance.
La reference ne peut donc pas etre resolue et n'est pas ecrite dans `parents`.
Elle est conservee dans la note de chaque genre, et reviendra quand la famille
industrial entrera dans le corpus.
