/* LE CATALOGUE DU JEU EST TIRE DU CORPUS, JAMAIS ECRIT A LA MAIN.

   Les disques que le joueur achete chez les disquaires sont ceux de l'atlas :
   memes familles, memes genres, memes morceaux, memes pochettes. Ce script
   lit src/data/corpus.json et ecrit public/game/src/data/catalogue.js. On le
   relance quand le corpus change :

     node scripts/game-catalogue.mjs

   Tout ce qui est « jeu » (rarete, prix, energie) est DEDUIT du corpus par
   des regles fixes et une graine deterministe : deux lancements donnent le
   meme catalogue, et un morceau garde sa rarete d'une partie a l'autre. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const corpus = JSON.parse(readFileSync(join(RACINE, 'src/data/corpus.json'), 'utf8'));

/* Un hachage stable par chaine : la meme rarete pour le meme identifiant. */
function graine(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

/* L'ENERGIE D'UNE FAMILLE, de 1 (on s'allonge) a 5 (on ne s'entend plus). */
const ENERGIE = {
  ambient: 1, downtempo: 2, roots: 2, disco: 3, house: 3, minimal: 3, electro: 3,
  breaks: 4, bass: 4, techno: 4, trance: 4, industrial: 4, psy: 5, hardcore: 5,
};

const familles = corpus.families.map((f) => ({
  id: f.id, label: f.label, hue: f.hue,
  genres: corpus.genres.filter((g) => g.family === f.id).map((g) => g.id),
}));

const genres = corpus.genres.map((g) => ({
  id: g.id, label: g.label, family: g.family, bpm: g.bpm, major: !!g.major,
}));

const disques = [];
const parArtiste = new Map();
for (const g of corpus.genres) {
  const bpm = g.bpm || [120, 130];
  for (const t of g.tracks || []) {
    if (!t.youtubeId || !t.artist || !t.title) continue;
    const id = t.youtubeId;
    const r = graine(id);
    const age = Math.max(0, Math.min(1, (2026 - (t.year || 2000)) / 50));
    /* Rarete : l'age compte pour moitie, le hasard fixe pour l'autre. Un
       disque de 1978 est rarement commun, un disque de 2023 rarement rare. */
    const rarity = Math.max(1, Math.min(5, Math.round(0.7 + age * 2.4 + r * 2.6)));
    const energy = Math.max(1, Math.min(5, ENERGIE[g.family] + (r > 0.7 ? 1 : r < 0.25 ? -1 : 0)));
    const local = t.cover && t.cover.local && existsSync(join(RACINE, 'public', t.cover.local)) ? t.cover.local : null;
    disques.push({
      id, genre: g.id, family: g.family,
      artist: t.artist, title: t.title, year: t.year || null,
      label: t.release && t.release.label ? t.release.label : null,
      bpm: Math.round(bpm[0] + (bpm[1] - bpm[0]) * graine(id + 'bpm')),
      energy, rarity,
      price: Math.round([9, 16, 28, 48, 85][rarity - 1] * (0.8 + graine(id + 'px') * 0.5)),
      cover: local,
    });
    const a = parArtiste.get(t.artist) || { name: t.artist, tracks: 0, familles: new Map(), genres: new Set(), annees: [] };
    a.tracks += 1; a.familles.set(g.family, (a.familles.get(g.family) || 0) + 1); a.genres.add(g.id); if (t.year) a.annees.push(t.year);
    parArtiste.set(t.artist, a);
  }
}

/* LES ARTISTES SIGNABLES : les noms qui reviennent le plus dans le corpus.
   La notoriete est le nombre de morceaux retenus par l'atlas, ce qui est la
   seule mesure que le corpus porte honnetement. Trois morceaux ou plus pour
   entrer dans la liste. Les fictifs de la scene locale (ceux que Mika a
   inventes) restent dans monde.js : ils sont les premiers qu'on signe. */
const artistes = [...parArtiste.values()]
  .filter((a) => a.tracks >= 3)
  .sort((a, b) => b.tracks - a.tracks)
  .map((a, i, tous) => {
    const rang = i / tous.length;                 // 0 = la tete d'affiche
    const tier = rang < 0.06 ? 6 : rang < 0.15 ? 5 : rang < 0.3 ? 4 : rang < 0.55 ? 3 : 2;
    const familleDom = [...a.familles.entries()].sort((x, y) => y[1] - x[1])[0][0];
    const quality = Math.round(58 + (1 - rang) * 40);
    return {
      id: 'ar_' + a.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      name: a.name, real: true, family: familleDom, familles: [...a.familles.keys()],
      tracks: a.tracks, tier, quality,
      advance: Math.round([0, 0, 1800, 6000, 18000, 45000, 120000][tier] * (0.85 + graine(a.name) * 0.3)),
      fee: [0, 0, 0.4, 0.45, 0.5, 0.55, 0.6][tier],
      reach: Math.round([0, 0, 9000, 60000, 300000, 1200000, 3500000][tier] * (0.7 + graine(a.name + 'r') * 0.6)),
      depuis: a.annees.length ? Math.min(...a.annees) : null,
    };
  });

const entete = `/* CATALOGUE ENGENDRE PAR scripts/game-catalogue.mjs. NE PAS EDITER A LA MAIN.
   Source : src/data/corpus.json (version ${corpus.version || '?'}).
   ${familles.length} familles, ${genres.length} genres, ${disques.length} disques, ${artistes.length} artistes signables. */
`;
const sortie = entete
  + 'export const FAMILLES = ' + JSON.stringify(familles) + ';\n'
  + 'export const GENRES = ' + JSON.stringify(genres) + ';\n'
  + 'export const DISQUES = ' + JSON.stringify(disques) + ';\n'
  + 'export const ARTISTES = ' + JSON.stringify(artistes) + ';\n'
  + 'export const genreParId = (id) => GENRES.find((g) => g.id === id);\n'
  + 'export const familleParId = (id) => FAMILLES.find((f) => f.id === id);\n'
  + 'export const disqueParId = (id) => DISQUES.find((d) => d.id === id);\n'
  + 'export const artisteParId = (id) => ARTISTES.find((a) => a.id === id);\n';

writeFileSync(join(RACINE, 'public/game/src/data/catalogue.js'), sortie);
console.log(`catalogue.js : ${familles.length} familles, ${genres.length} genres, ${disques.length} disques, ${artistes.length} artistes, ${disques.filter((d) => d.cover).length} pochettes locales.`);
