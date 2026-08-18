/* Ajout ponctuel de deux POINTS D'ANCRAGE à la famille roots (verdict) :
   Hip-Hop et Reggae. Pas des branches à développer : aucun sous-genre,
   aucune descendance propre, uniquement des parents supplémentaires posés
   sur des genres électroniques existants. Le périmètre de SONAA est la
   musique électronique ; aucune autre famille non électronique ne sera
   ajoutée, c'est acté.

   Même patron que Funk : rattachement conventionnel à la racine de
   l'arbre roots (structuralOnly), la note dit qu'aucune filiation n'est
   affirmée par ce rattachement.

   Usage : npx tsx scripts/add-roots-anchors.ts */

import { transaction } from './lib/corpus-store.ts';

interface Parent {
  id: string;
  family: string;
  confidence: string;
}
interface GenreEntry {
  id: string;
  family: string;
  parents: Parent[];
  [k: string]: unknown;
}

const ANCHORS: GenreEntry[] = [
  {
    id: 'hiphop',
    label: 'Hip-Hop',
    family: 'roots',
    structuralParent: 'musiqueconcrete',
    parents: [],
    confidence: 'established',
    bpm: [85, 105],
    major: false,
    structuralOnly: true,
    aliases: ['Rap', 'Hip Hop'],
    note:
      "Bronx, 1973. RATTACHEMENT CONVENTIONNEL : le hip-hop ne descend pas de la musique concrete, c'est une racine parallele accrochee a l'arbre pour tenir dans le schema, sans qu'aucune filiation soit affirmee. POINT D'ANCRAGE sans descendance developpee ici : le perimetre de SONAA est la musique electronique.",
    description:
      "Racine d'ancrage, pas une branche. Le hip-hop du Bronx invente le break isolé et bouclé, le sampling comme écriture et le DJ comme instrumentiste : tout ce que les musiques électroniques lui reprennent est là. SONAA ne développe pas cette lignée, son périmètre étant la musique électronique ; le hip-hop figure ici comme parent de ce qu'il a donné aux machines, du breakbeat hardcore au footwork.",
    machines: [
      'Deux platines et une table de mixage',
      'Échantillonneur (SP-1200, MPC60)',
      'Boîte à rythmes TR-808',
      'Micro et MC',
      'Breaks de funk bouclés'
    ],
    labelsHistoriques: ['Sugar Hill', 'Def Jam', 'Tommy Boy'],
    labelsActuels: [],
    artistesCles: [
      'DJ Kool Herc',
      'Grandmaster Flash',
      'Afrika Bambaataa',
      'Run-DMC',
      'Eric B. & Rakim',
      'Public Enemy'
    ],
    tracks: []
  },
  {
    id: 'reggae',
    label: 'Reggae',
    family: 'roots',
    structuralParent: 'musiqueconcrete',
    parents: [],
    confidence: 'established',
    bpm: [60, 90],
    major: false,
    structuralOnly: true,
    aliases: [],
    note:
      "Jamaique, 1968. RATTACHEMENT CONVENTIONNEL : le reggae ne descend pas de la musique concrete, c'est une racine parallele accrochee a l'arbre pour tenir dans le schema, sans qu'aucune filiation soit affirmee. POINT D'ANCRAGE sans descendance developpee ici : le perimetre de SONAA est la musique electronique.",
    description:
      "Racine d'ancrage, pas une branche. Le reggae jamaïcain apporte le sound system, la basse comme fondation, la version instrumentale et la culture du remix avant le mot : le dub en sort directement, et avec lui la moitié des musiques de basse britanniques. SONAA ne développe pas cette lignée, son périmètre étant la musique électronique ; le reggae figure ici comme parent de ce qu'il a donné, du dub à l'UK funky.",
    machines: [
      'Sound system et caisson de basse',
      'Console de studio (King Tubby, Lee Perry)',
      'Chambre d’écho et réverbération à ressort',
      'Basse électrique en fondation',
      'Version instrumentale sur face B'
    ],
    labelsHistoriques: ['Studio One', 'Treasure Isle', 'Island', 'Trojan'],
    labelsActuels: [],
    artistesCles: [
      'Bob Marley',
      'Toots & The Maytals',
      'Lee « Scratch » Perry',
      'King Tubby',
      'Junior Murvin',
      'Burning Spear'
    ],
    tracks: []
  }
];

/** Genres qui reçoivent le nouvel ancêtre en parent supplémentaire. */
const GRAFTS: Record<string, string[]> = {
  hiphop: [
    'breakbeathardcore',
    'electrofunk',
    'triphop',
    'trapedm',
    'footwork',
    'juke',
    'jerseyclub',
    'baltimoreclub'
  ],
  reggae: ['dub', 'jungle', 'dubstep', 'raggacore', 'ukfunky']
};

let added = 0;
let grafted = 0;
transaction((corpus) => {
  const c = corpus as unknown as { genres: GenreEntry[] };
  for (const anchor of ANCHORS) {
    if (c.genres.some((g) => g.id === anchor.id)) continue;
    // Inséré après les autres racines parallèles de roots, ordre stable.
    const lastRoots = c.genres.reduce(
      (acc, g, i) => (g.family === 'roots' ? i : acc),
      -1
    );
    c.genres.splice(lastRoots + 1, 0, anchor);
    added += 1;
  }
  for (const [pid, targets] of Object.entries(GRAFTS)) {
    for (const gid of targets) {
      const g = c.genres.find((x) => x.id === gid);
      if (!g) throw new Error(`cible inconnue : ${gid}`);
      if (g.parents.some((p) => p.id === pid)) continue;
      g.parents.push({ id: pid, family: 'roots', confidence: 'established' });
      grafted += 1;
    }
  }
});

console.log(`${added} ancre(s) ajoutée(s), ${grafted} greffe(s) posée(s).`);
