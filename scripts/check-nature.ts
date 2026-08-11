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

import { isAboutMusic, judge } from './lib/match.ts';

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

/* ------------------------------------------------------------- verdict */

if (erreurs.length > 0) {
  console.error(`\nFILTRE DE NATURE : ${erreurs.length} probleme(s).\n`);
  for (const e of erreurs) console.error('  - ' + e);
  process.exit(1);
}

console.log(
  `Nature : ${DOCUMENTS.length - 1} documents rejetes, ${MUSIQUE.length} musiques acceptees, ` +
    'et le filtre est bien branche dans judge().'
);
