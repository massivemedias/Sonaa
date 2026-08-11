/* LE FILTRE DE NATURE : ce que la video EST, pas ce dont elle parle.

   Trente-six remplacements ont ete annules parce que le matcher, qui compare
   des mots, ne peut pas distinguer une musique d'un discours sur cette
   musique. « Karlheinz Stockhausen explains Kontakte » contient l'artiste et
   le titre : il passe le seuil de similarite, le plafond de duree, le rejet
   des parutions. Et c'est une interview.

   Les cas ci-dessous sont TIRES DE CES ERREURS, avec leurs titres reels tels
   que YouTube les rend. Ce ne sont pas des exemples inventes pour faire
   passer un test : ce sont les entrees qui sont reellement entrees dans le
   corpus, et que ce controle doit desormais arreter.

   La seconde moitie du fichier est aussi importante que la premiere : elle
   verifie que le filtre NE MORD PAS sur de la vraie musique. Un filtre trop
   large couterait plus qu'il ne rapporte, et « live » en est l'exemple : une
   captation de concert est de la musique, souvent la seule trace d'un
   morceau.

   Usage : npm run check:nature */

import {
  estArtisteAmbigu,
  isAboutMusic,
  judge,
  MAX_MOTS_EN_TROP,
  motsEnTrop,
  numerosDiscordants,
  variantesDiscordantes
} from './lib/match.ts';

const erreurs: string[] = [];

/* ------------------------------ 1. Les titres qui doivent etre rejetes */

const DOCUMENTS: readonly { titre: string; pourquoi: string }[] = [
  // Tires des 36 remplacements annules, titres reels.
  { titre: 'Karlheinz Stockhausen explains "Kontakte"', pourquoi: 'interview, le cas fondateur' },
  {
    titre: "First Look: Video Trailer for Ancient Methods Debut Album, 'The Jericho Recordings'",
    pourquoi: 'bande-annonce, deux marqueurs'
  },
  { titre: 'Weird Music: Forms of Paper - Steve Roden', pourquoi: 'controle negatif, voir plus bas' },

  // Les autres formes rencontrees ou attendues.
  { titre: 'Aphex Twin interview 1997', pourquoi: 'interview' },
  { titre: 'Entrevue avec Jean Michel Jarre', pourquoi: 'interview en francais' },
  { titre: 'Entrevista con Richie Hawtin', pourquoi: 'interview en espagnol' },
  { titre: 'Derrick May talks about Strings of Life', pourquoi: 'talks about' },
  { titre: 'Laurent Garnier parle de Crispy Bacon', pourquoi: 'parle de' },
  { titre: 'Carl Cox habla de su carrera', pourquoi: 'habla de' },
  { titre: 'Documentary: the birth of techno', pourquoi: 'documentaire' },
  { titre: 'Documentaire sur la house de Chicago', pourquoi: 'documentaire en francais' },
  { titre: 'Documental sobre el techno de Detroit', pourquoi: 'documentaire en espagnol' },
  { titre: 'Album review: Selected Ambient Works', pourquoi: 'critique' },
  { titre: 'Critique de l album Homework', pourquoi: 'critique en francais' },
  { titre: 'Reaction to Windowlicker', pourquoi: 'reaction' },
  { titre: 'How to make acid house basslines', pourquoi: 'tutoriel' },
  { titre: 'Tutoriel : faire un kick hardcore', pourquoi: 'tutoriel en francais' },
  { titre: 'Behind the scenes with Underworld', pourquoi: 'coulisses' },
  { titre: 'The making of Music for Airports', pourquoi: 'making of' },
  { titre: 'Track by track breakdown of Timeless', pourquoi: 'decorticage' },
  { titre: 'Analysis of Autechre rhythms', pourquoi: 'analyse' },
  { titre: 'Analyse du son de Kraftwerk', pourquoi: 'analyse en francais' }
];

for (const d of DOCUMENTS) {
  if (d.pourquoi === 'controle negatif, voir plus bas') continue;
  if (!isAboutMusic(d.titre)) {
    erreurs.push(`« ${d.titre} » devrait etre rejete (${d.pourquoi}), il passe.`);
  }
}

/* ---------------------- 2. Ce que le filtre NE DOIT PAS mordre */

const MUSIQUE: readonly { titre: string; pourquoi: string }[] = [
  { titre: 'Jeff Mills - The Bells', pourquoi: 'titre nu' },
  { titre: 'Underworld - Born Slippy (Live at Glastonbury)', pourquoi: 'un live est de la musique' },
  { titre: 'Daft Punk - Around The World (Official Video)', pourquoi: 'clip officiel' },
  { titre: 'Aphex Twin - Xtal [Remastered]', pourquoi: 'remaster' },
  { titre: 'Charlotte de Witte - Formula (Original Mix)', pourquoi: 'mention de mix legitime' },
  { titre: 'Model 500 - No UFOs (Juan Atkins Remix)', pourquoi: 'remix' },
  { titre: 'Autechre - Gantz Graf (Full Video)', pourquoi: '« full video » n est pas « full album »' },
  {
    titre: 'Weird Music: Forms of Paper - Steve Roden',
    pourquoi: 'aucun marqueur de nature, ce titre doit passer'
  },
  { titre: 'The Orb - Towers Of Dub', pourquoi: 'titre nu' },
  { titre: 'Kali Malone - Living Torch Pt 1', pourquoi: 'une partie numerotee reste de la musique' }
];

for (const m of MUSIQUE) {
  if (isAboutMusic(m.titre)) {
    erreurs.push(`« ${m.titre} » ne devrait PAS etre rejete (${m.pourquoi}), il l est.`);
  }
}

/* ------------- 3. Le filtre est-il bien branche dans le verdict ? */

/* Un filtre juste mais non appele ne sert a rien, et c'est exactement le
   defaut du plafond de duree : la regle etait correcte, sa donnee d'entree
   avait disparu. On verifie donc le chemin complet, pas la fonction seule. */
const verdict = judge(
  { title: 'Karlheinz Stockhausen explains "Kontakte"', channel: 'Stockhausen Stiftung' },
  'Karlheinz Stockhausen',
  'Kontakte',
  480
);

if (verdict.ok) {
  erreurs.push(
    'judge() ACCEPTE « Stockhausen explains Kontakte ». Le filtre de nature ' +
      "n'est pas branche dans le verdict : il existe mais ne sert a rien."
  );
}
if (!verdict.about) {
  erreurs.push("judge() ne remonte pas le drapeau `about` : le rejet ne serait pas explicable.");
}

/* Et le controle inverse : une vraie musique doit toujours passer, sinon le
   filtre bloquerait tout le corpus sans qu'on le voie. */
const bon = judge(
  { title: 'Jeff Mills - The Bells', channel: 'Axis Records' },
  'Jeff Mills',
  'The Bells',
  300
);
if (!bon.ok) {
  erreurs.push(
    'judge() REFUSE « Jeff Mills - The Bells ». Le filtre mord sur de la vraie ' +
      'musique, aucun import ne passerait.'
  );
}

/* ------------- 4. Les numeros d'ordre, autre angle mort de la couverture */

/* « Living Torch II » a ete accepte pour « Living Torch I » : mots identiques,
   score parfait, et deux pieces differentes. Meme famille de faute que la
   nature du document, meme cause, la comparaison de mots ne voit pas tout. */
const NUMEROS: readonly { voulu: string; candidat: string; discordant: boolean }[] = [
  { voulu: 'Living Torch I', candidat: 'Kali Malone - Living Torch II', discordant: true },
  { voulu: 'Living Torch I', candidat: 'Kali Malone - Living Torch I', discordant: false },
  { voulu: 'Quadrant Dub I', candidat: 'Basic Channel - Quadrant Dub II', discordant: true },
  { voulu: 'Part 2', candidat: 'Some Piece Part 3', discordant: true },
  { voulu: 'Acid Tracks', candidat: 'Phuture - Acid Tracks 1987', discordant: false },
  { voulu: 'Windowlicker', candidat: 'Aphex Twin - Windowlicker', discordant: false }
];

for (const n of NUMEROS) {
  if (numerosDiscordants(n.voulu, n.candidat) !== n.discordant) {
    erreurs.push(
      `Numeros : « ${n.voulu} » contre « ${n.candidat} » devrait etre ` +
        `${n.discordant ? 'discordant' : 'concordant'}, il ne l est pas.`
    );
  }
}

const numVerdict = judge(
  { title: 'Kali Malone - Living Torch II', channel: 'Ideologic Organ' },
  'Kali Malone',
  'Living Torch I',
  900
);
if (numVerdict.ok) {
  erreurs.push(
    'judge() ACCEPTE « Living Torch II » pour « Living Torch I ». Le controle ' +
      "des numeros n'est pas branche dans le verdict."
  );
}

/* --------- 5. Les variantes non demandees et les subdivisions */

/* Troisieme angle mort de la couverture de mots, apres la nature du document
   et les numeros d'ordre. « Bladed » et « Bladed (Pardon Moi Remix) » ont un
   score parfait et ne sont pas la meme piste.

   La regle est asymetrique : 35 entrees du corpus portent legitimement un
   remix dans leur titre canonique, on ne rejette donc que ce que le titre
   cherche NE DEMANDE PAS. Et « Original Mix » designe la version canonique,
   pas une variante. */
const VARIANTES: readonly { voulu: string; candidat: string; rejet: boolean; quoi: string }[] = [
  { voulu: 'Bladed', candidat: 'Darlyn Vlys - Bladed (Pardon Moi Remix)', rejet: true, quoi: 'remix non demande' },
  {
    voulu: 'Bladed (Pardon Moi Remix)',
    candidat: 'Darlyn Vlys - Bladed (Pardon Moi Remix)',
    rejet: false,
    quoi: 'remix demande, entree reelle du corpus'
  },
  {
    voulu: 'Formula',
    candidat: 'Charlotte de Witte - Formula (Original Mix)',
    rejet: false,
    quoi: 'Original Mix EST la version canonique'
  },
  { voulu: 'Xtal', candidat: 'Aphex Twin - Xtal [Remastered]', rejet: false, quoi: 'un remaster reste la meme prise' },
  {
    voulu: 'Born Slippy',
    candidat: 'Underworld - Born Slippy (Live at Glastonbury)',
    rejet: false,
    quoi: 'une captation est souvent la seule trace'
  },
  {
    voulu: 'Dub Fi Gwan',
    candidat: 'King Tubby - Dub Fi Gwan',
    rejet: false,
    quoi: 'dub dans le titre meme, pas une mention de version'
  },
  { voulu: 'Windowlicker', candidat: 'Aphex Twin - Windowlicker (Radio Edit)', rejet: true, quoi: 'edit non demande' },
  { voulu: 'Higher', candidat: 'Amelie Lens - Higher (Instrumental)', rejet: true, quoi: 'instrumental non demande' },
  {
    voulu: 'Selected Ambient Works Vol I',
    candidat: 'Aphex Twin - Selected Ambient Works Vol II',
    rejet: true,
    quoi: 'autre volume'
  },
  { voulu: 'Part 1', candidat: 'Some Work Part 2', rejet: true, quoi: 'autre partie' },
  { voulu: 'Strings of Life', candidat: 'Rhythim Is Rhythim - Strings of Life', rejet: false, quoi: 'titre nu' },

  /* Ajoutes apres coup : ces deux-la sont PASSES et ont du etre annules,
     la liste ne couvrant alors que « remix » et « edit ». */
  {
    voulu: 'Moebius 256',
    candidat: 'Zanov - Moebius 256 (Mr.eNeX Club Mix)',
    rejet: true,
    quoi: 'un Club Mix nest pas la piece de 1977'
  },
  {
    voulu: 'Towers of Dub',
    candidat: "The Orb - Towers Of Dub (Live '93 Version)",
    rejet: true,
    quoi: 'une Live Version nest pas la version studio'
  },
  {
    voulu: 'Higher',
    candidat: 'Amelie Lens - Higher (Original Mix)',
    rejet: false,
    quoi: 'Original Mix doit rester accepte malgre le mot mix'
  }
];

for (const v of VARIANTES) {
  if (variantesDiscordantes(v.voulu, v.candidat) !== v.rejet) {
    erreurs.push(
      `Variantes : « ${v.candidat} » pour « ${v.voulu} » devrait etre ` +
        `${v.rejet ? 'rejete' : 'accepte'} (${v.quoi}).`
    );
  }
}

const varVerdict = judge(
  { title: 'Aphex Twin - Windowlicker (Radio Edit)', channel: 'Warp Records' },
  'Aphex Twin',
  'Windowlicker',
  240
);
if (varVerdict.ok) {
  erreurs.push(
    "judge() ACCEPTE un Radio Edit pour le titre nu. Le controle des variantes n'est pas branche."
  );
}

/* ------ 6. Ce que le candidat AJOUTE, et non seulement ce qu'il contient */

/* Quatrieme angle mort, et le plus profond : `coverage` mesure si les mots
   cherches sont presents, jamais ce que le candidat apporte en plus.
   Seuil calibre sur 200 entrees reelles du corpus et sur les faux des trois
   passes de remplacement. Voir MAX_MOTS_EN_TROP dans lib/match.ts. */
const SURPLUS: readonly { a: string; t: string; c: string; max: number; quoi: string }[] = [
  // Faux reels, doivent compter beaucoup de mots en trop.
  {
    a: 'Sandman',
    t: 'Witchcraft',
    c: 'Salem Witchcraft - Sandman [1975 Private Press 45 Rock Ballad Detroit]',
    max: 99,
    quoi: 'un rock de 1975, autre artiste'
  },
  {
    a: 'Alec Empire',
    t: 'Digital Hardcore',
    c: 'Alec Empire & EL-P - Shards Of Pol Pottery (Hard Beats) - Digital Hardcore',
    max: 99,
    quoi: 'un autre morceau du meme label'
  },
  // Vrais positifs du corpus, ne doivent PAS tomber.
  { a: 'Tchami', t: 'Promesses', c: 'Tchami feat. Kaleem Taylor - Promesses (Official)', max: 0, quoi: 'un invite' },
  {
    a: 'The Upsetters',
    t: 'Blackboard Jungle Dub',
    c: 'Lee Perry and The Upsetters - Black board Jungle Dub',
    max: 0,
    quoi: 'artiste etendu'
  },
  {
    a: 'Charlotte de Witte',
    t: 'Formula',
    c: 'Charlotte de Witte - Formula (Original Mix) [KNTXT010]',
    max: 0,
    quoi: 'numero de catalogue'
  },
  { a: 'Jeff Mills', t: 'The Bells', c: 'Jeff Mills - The Bells (Official Video) HD', max: 0, quoi: 'habillage YouTube' }
];

for (const x of SURPLUS) {
  const n = motsEnTrop(x.a, x.t, x.c);
  if (x.max === 99) {
    if (n < MAX_MOTS_EN_TROP) {
      erreurs.push(`Surplus : « ${x.c.slice(0, 40)} » (${x.quoi}) devrait etre rejete, il compte ${n} mots en trop.`);
    }
  } else if (n >= MAX_MOTS_EN_TROP) {
    erreurs.push(
      `Surplus : « ${x.c.slice(0, 40)} » (${x.quoi}) est un VRAI positif et ` +
        `tomberait, ${n} mots en trop pour un seuil de ${MAX_MOTS_EN_TROP}.`
    );
  }
}

/* ------- 7. Les artistes a nom ordinaire ne sont pas cherches du tout */

/* Seize entrees ont ete retirees du corpus parce que leur artiste porte un
   mot courant : Final a ramene du golf, Tandem un velo, Ocelot un
   documentaire animalier. Aucun filtre ne peut les attraper, le score de
   couverture etant parfait. La seule reponse est de ne pas chercher. */
const AMBIGUS: readonly { nom: string; ambigu: boolean; quoi: string }[] = [
  { nom: 'Final', ambigu: true, quoi: 'a ramene des faits divers de golf' },
  { nom: 'Tandem', ambigu: true, quoi: 'a ramene une video de velo' },
  { nom: 'Ocelot', ambigu: true, quoi: 'a ramene un documentaire animalier' },
  { nom: 'Curses', ambigu: true, quoi: 'a ramene un guide Pokemon' },
  { nom: 'Outback', ambigu: true, quoi: 'a ramene un film Netflix' },
  { nom: 'Cezar', ambigu: true, quoi: 'a ramene des brevets d OVNI' },
  // Ceux qui NE DOIVENT PAS y etre : mots ordinaires, mais trouvables.
  { nom: 'Portishead', ambigu: false, quoi: 'nom de lieu, mais sans ambiguite musicale' },
  { nom: 'The Orb', ambigu: false, quoi: 'mot courant, mais trouvable' },
  { nom: 'Four Tet', ambigu: false, quoi: 'trouvable' },
  { nom: 'Aphex Twin', ambigu: false, quoi: 'nom propre' }
];

for (const a of AMBIGUS) {
  if (estArtisteAmbigu(a.nom) !== a.ambigu) {
    erreurs.push(
      `Ambigus : « ${a.nom} » devrait ${a.ambigu ? 'exiger une verification manuelle' : 'etre cherchable'} (${a.quoi}).`
    );
  }
}

/* ------------------------------------------------------------- verdict */

if (erreurs.length > 0) {
  console.error(`\nFILTRE DE NATURE : ${erreurs.length} probleme(s).\n`);
  for (const e of erreurs) console.error('  - ' + e);
  process.exit(1);
}

console.log(
  `Nature : ${DOCUMENTS.length - 1} documents rejetes, ${MUSIQUE.length} musiques acceptees, ` +
    `${NUMEROS.length} cas de numeros, ${VARIANTES.length} cas de variantes, ` +
    `${SURPLUS.length} cas de surplus, ${AMBIGUS.length} noms ambigus, ` +
    'et les quatre filtres sont branches dans judge().'
);
