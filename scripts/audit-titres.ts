/* Audit du corpus entier : quelles entrées ne jouent pas ce qu'elles annoncent.

   ═══ POURQUOI CET AUDIT ═══

   Une mesure sur 200 entrées a révélé des fautes déjà présentes dans le
   corpus, entrées lors de campagnes antérieures : « Hux Flux, Somnambulant
   (Cortex Remix) » enregistré comme « Cortex », « Ghosts (Seekers
   International VIP) » comme « Ghosts ». Elles ont passé les contrôles de
   l'époque, qui ne regardaient que la présence des mots cherchés.

   Cet audit lit le VRAI titre de chaque vidéo et le confronte à ce que le
   corpus annonce. LECTURE SEULE : il ne corrige rien, il compte et classe.
   La décision vient après la mesure, jamais avant.

   ═══ CE QUI COÛTE, ET CE QUI NE COÛTE RIEN ═══

   `videos.list` rend cinquante titres par appel pour une unité de quota.
   1760 entrées coûtent donc 36 unités sur les 10 000 quotidiennes. Aucune
   recherche n'est faite : on ne cherche pas de remplaçant, on regarde.

   Usage : npm run audit:titres */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { isAboutMusic, MAX_MOTS_EN_TROP, motsEnTrop, numerosDiscordants, variantesDiscordantes } from './lib/match.ts';

const RACINE = fileURLToPath(new URL('..', import.meta.url));

const lireEnv = (nom: string): string | undefined => {
  try {
    return readFileSync(`${RACINE}.env`, 'utf8')
      .split('\n')
      .find((l) => l.startsWith(`${nom}=`))
      ?.slice(nom.length + 1)
      .trim();
  } catch {
    return undefined;
  }
};

const CLE = process.env['YOUTUBE_API_KEY'] ?? lireEnv('YOUTUBE_API_KEY');
if (!CLE) {
  console.error(
    "YOUTUBE_API_KEY absente. Cet audit lit le titre reel de chaque video : sans " +
      "elle il n'a rien a comparer, et il s'arrete plutot que de rendre une liste vide."
  );
  process.exit(1);
}

interface Track {
  youtubeId: string;
  artist: string;
  title: string;
  dureeNonVerifiee?: true;
}
interface Genre {
  id: string;
  family: string;
  tracks: { essentiel: Track[]; actuel: Track[] };
}

const corpus = JSON.parse(readFileSync(`${RACINE}src/data/corpus.json`, 'utf8')) as {
  genres: Genre[];
};

const entrees: { genre: string; famille: string; champ: string; t: Track }[] = [];
for (const g of corpus.genres) {
  for (const champ of ['essentiel', 'actuel'] as const) {
    for (const t of g.tracks[champ]) entrees.push({ genre: g.id, famille: g.family, champ, t });
  }
}

/* ------------------------------------------------------- classification

   La NATURE dit de quel genre de faute il s'agit, la GRAVITE dit ce qu'elle
   coute a l'ecoute. Les deux sont demandees separement parce qu'elles ne se
   deduisent pas l'une de l'autre : une « Extended Mix » est une variante,
   donc benigne ; un « Live » est aussi une variante et peut etre le seul
   enregistrement existant. */

type Nature =
  | 'remix pris pour l original'
  | 'version alternative'
  | 'autre morceau'
  | 'album deguise'
  | 'document sur la musique'
  | 'partie ou numero different';

type Gravite = 'faute' | 'ecart' | 'detail';

const REMIX = /\b(?:remix|rmx|rework|bootleg|vip|mashup)\b/i;
const ALTERNATIVE = /\b(?:edit|version|mix|radio|club|extended|instrumental|acapella|acoustic|live|dub)\b/i;
const ALBUM = /\b(?:full\s*album|album\s+complet|compilation|megamix|continuous|full\s*ep|full\s*lp)\b/i;

const mention = (titre: string, re: RegExp): boolean => {
  for (const m of titre.matchAll(/[([]([^)\]]+)[)\]]/g)) {
    if (re.test(m[1] ?? '')) return true;
  }
  return false;
};

interface Suspect {
  genre: string;
  famille: string;
  champ: string;
  artiste: string;
  titre: string;
  reel: string;
  nature: Nature;
  gravite: Gravite;
  surplus: number;
  id: string;
}

const suspects: Suspect[] = [];
let lus = 0;
let absents = 0;

for (let i = 0; i < entrees.length; i += 50) {
  const lot = entrees.slice(i, i + 50);
  const url =
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=` +
    `${lot.map((e) => e.t.youtubeId).join(',')}&key=${CLE}`;
  let par = new Map<string, string>();
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Lot ${i / 50 + 1} : HTTP ${res.status}. Audit interrompu.`);
      process.exit(1);
    }
    const j = (await res.json()) as { items?: { id: string; snippet?: { title?: string } }[] };
    par = new Map((j.items ?? []).map((v) => [v.id, v.snippet?.title ?? '']));
  } catch (e) {
    console.error(`Lot ${i / 50 + 1} : ${(e as Error).message}. Audit interrompu.`);
    process.exit(1);
  }

  for (const e of lot) {
    const reel = par.get(e.t.youtubeId);
    /* VIDEO DISPARUE. Ce n'est pas « rien a signaler », c'est une entree
       qui ne joue plus rien du tout. Comptee a part. */
    if (reel === undefined) {
      absents += 1;
      continue;
    }
    lus += 1;

    const surplus = motsEnTrop(e.t.artist, e.t.title, reel);
    const varDiscord = variantesDiscordantes(e.t.title, reel);
    const numDiscord = numerosDiscordants(e.t.title, reel);
    const doc = isAboutMusic(reel);

    if (!varDiscord && !numDiscord && !doc && surplus < MAX_MOTS_EN_TROP) continue;

    let nature: Nature;
    let gravite: Gravite;

    if (doc) {
      nature = 'document sur la musique';
      gravite = 'faute';
    } else if (mention(reel, ALBUM) || ALBUM.test(reel)) {
      nature = 'album deguise';
      gravite = 'faute';
    } else if (numDiscord) {
      nature = 'partie ou numero different';
      gravite = 'faute';
    } else if (varDiscord && mention(reel, REMIX)) {
      nature = 'remix pris pour l original';
      /* Un remix reste le meme theme, joue autrement : l'ecoute n'est pas
         trahie, la reference l'est. */
      gravite = 'ecart';
    } else if (varDiscord && mention(reel, ALTERNATIVE)) {
      nature = 'version alternative';
      gravite = 'detail';
    } else {
      /* Ni variante declaree ni document : ce sont les mots en trop seuls
         qui ont alerte. C'est le cas le plus grave, celui de « The Ride,
         Alec Empiree DIGITAL HARDCORE ». */
      nature = 'autre morceau';
      gravite = 'faute';
    }

    suspects.push({
      genre: e.genre,
      famille: e.famille,
      champ: e.champ,
      artiste: e.t.artist,
      titre: e.t.title,
      reel,
      nature,
      gravite,
      surplus,
      id: e.t.youtubeId
    });
  }
}

/* ------------------------------------------------------------- rapport */

const compte = <T extends string>(cle: (s: Suspect) => T): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const s of suspects) out[cle(s)] = (out[cle(s)] ?? 0) + 1;
  return out;
};

const parNature = compte((s) => s.nature);
const parGravite = compte((s) => s.gravite);
const parFamille = compte((s) => s.famille);

const totalParFamille: Record<string, number> = {};
for (const e of entrees) totalParFamille[e.famille] = (totalParFamille[e.famille] ?? 0) + 1;

console.log(`\n${lus} entrees lues, ${absents} video(s) disparue(s), ${suspects.length} suspecte(s).\n`);

console.log('PAR NATURE');
for (const [k, v] of Object.entries(parNature).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(30)} ${v}`);
}
console.log('\nPAR GRAVITE');
for (const k of ['faute', 'ecart', 'detail']) {
  console.log(`  ${k.padEnd(30)} ${parGravite[k] ?? 0}`);
}
console.log('\nPAR FAMILLE, part des entrees de la famille');
for (const [k, v] of Object.entries(parFamille).sort((a, b) => b[1] / (totalParFamille[b[0]] ?? 1) - a[1] / (totalParFamille[a[0]] ?? 1))) {
  const tot = totalParFamille[k] ?? 1;
  console.log(`  ${k.padEnd(20)} ${String(v).padStart(3)} / ${String(tot).padStart(4)}   ${Math.round((100 * v) / tot)} %`);
}

const ordre: Record<Gravite, number> = { faute: 0, ecart: 1, detail: 2 };
suspects.sort((a, b) => ordre[a.gravite] - ordre[b.gravite] || b.surplus - a.surplus);

writeFileSync(
  `${RACINE}AUDIT-TITRES.md`,
  `# Audit des titres : ce que les entrees annoncent, ce qu'elles jouent\n\n` +
    `Lecture seule. ${lus} entrees lues, ${absents} video(s) disparue(s),\n` +
    `**${suspects.length} suspecte(s)**.\n\n` +
    `La gravite ne se deduit pas de la nature : un remix garde le theme et\n` +
    `trahit la reference, une version alternative ne trahit presque rien, un\n` +
    `autre morceau ne joue pas du tout ce qui est annonce.\n\n` +
    `## Par gravite\n\n` +
    `| gravite | nombre |\n| --- | --- |\n` +
    ['faute', 'ecart', 'detail'].map((k) => `| ${k} | ${parGravite[k] ?? 0} |`).join('\n') +
    `\n\n## Par nature\n\n| nature | nombre |\n| --- | --- |\n` +
    Object.entries(parNature)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `| ${k} | ${v} |`)
      .join('\n') +
    `\n\n## Par famille\n\n| famille | suspectes | total | part |\n| --- | --- | --- | --- |\n` +
    Object.entries(parFamille)
      .sort((a, b) => b[1] / (totalParFamille[b[0]] ?? 1) - a[1] / (totalParFamille[a[0]] ?? 1))
      .map(([k, v]) => `| ${k} | ${v} | ${totalParFamille[k] ?? 0} | ${Math.round((100 * v) / (totalParFamille[k] ?? 1))} % |`)
      .join('\n') +
    `\n\n## Le detail\n\n` +
    suspects
      .map(
        (s) =>
          `### ${s.gravite.toUpperCase()} , ${s.nature}\n\n` +
          `- genre : ${s.genre} (${s.famille}, onglet ${s.champ})\n` +
          `- annonce : ${s.artiste} , ${s.titre}\n` +
          `- joue : ${s.reel}\n` +
          `- mots en trop : ${s.surplus}\n`
      )
      .join('\n') +
    `\n`
);

console.log(`\nDetail complet dans AUDIT-TITRES.md`);
