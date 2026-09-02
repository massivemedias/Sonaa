/* EST-CE QUE CHAQUE MORCEAU EST DANS LE BON STYLE ?

   LE DEFAUT EST REEL ET IL A ETE VU A L'OEIL. Garage House, un genre ne au
   Paradise Garage au milieu des annees 1980, ouvre sur MFSB « Love Is The
   Message » (1973), Fern Kinney (1979), Delegation (1979), THP Orchestra
   (1979) : quatre disques de disco de Philadelphie. Plus bas dans la meme
   liste, Ariana Grande et Bebe Rexha. Progressive House ouvre sur Happy
   Mondays et The Farm, qui sont du baggy de Manchester.

   POURQUOI CE CONTROLE NE PEUT PAS SE FAIRE SUR LES DATES. La verification
   par anachronisme a ete essayee : 14 morceaux sur 2417 sortent avant la date
   de leur genre, et la plupart sont voulus (« Amen Brother » comme source du
   break, « Autobahn » comme proto-techno). MFSB passait le controle parce que
   la date de depart de Garage House est notee 1977. Une date juste ne dit
   rien du son.

   CE QU'ON INTERROGE A LA PLACE : LES ETIQUETTES DE L'ARTISTE. Last.fm expose
   les etiquettes que les auditeurs posent sur un artiste, avec un poids de 0 a
   100. Ce n'est pas un jugement de valeur, c'est une mesure d'usage : si
   personne, sur des millions d'ecoutes, n'a jamais associe MFSB au mot
   « house », c'est un fait sur le monde, pas une opinion du script.

   TROIS NIVEAUX, ET LE SCRIPT NE TRANCHE PAS.
     ACCORD      une etiquette de l'artiste nomme le genre lui-meme.
     FAMILLE     aucune ne nomme le genre, mais une nomme sa famille.
     HORS CHAMP  aucune des deux. Le morceau est signale, pas supprime.

   IL N'ECRIT RIEN DANS LE CORPUS. Il produit un rapport a lire, parce que le
   dernier mot sur ce qui appartient a un genre revient a Mika et non a une
   somme d'etiquettes d'auditeurs.

   Usage :
     npx tsx scripts/audit-coherence.ts
     npx tsx scripts/audit-coherence.ts --only=house
*/

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const RAPPORT = fileURLToPath(new URL('../audit-coherence.md', import.meta.url));
const CACHE = fileURLToPath(new URL('../.audit-coherence-cache.json', import.meta.url));

const only = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);

const CLE = (() => {
  const env = fileURLToPath(new URL('../.env', import.meta.url));
  if (!existsSync(env)) return '';
  const m = readFileSync(env, 'utf8').match(/^LASTFM_API_KEY=(.+)$/m);
  return m?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
})();
if (!CLE) {
  console.error("Pas de LASTFM_API_KEY dans .env. Rien n'a ete fait.");
  process.exit(1);
}

/* On compare des mots, pas des chaines : « deep house », « deephouse » et
   « Deep-House » sont le meme mot pour un auditeur qui etiquette. */
const norm = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

type Cache = Record<string, { tags: [string, number][]; quand: number }>;
const cache: Cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tagsDe(artiste: string): Promise<[string, number][]> {
  const cle = norm(artiste);
  const enCache = cache[cle];
  if (enCache) return enCache.tags;
  const url =
    'https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=' +
    encodeURIComponent(artiste) +
    '&autocorrect=1&api_key=' +
    CLE +
    '&format=json';
  let tags: [string, number][] = [];
  for (let essai = 0; essai < 3; essai++) {
    try {
      const r = await fetch(url);
      if (r.status === 429) {
        await dormir(2000 * (essai + 1));
        continue;
      }
      const j = (await r.json()) as { toptags?: { tag?: { name: string; count: number }[] } };
      const brut = j.toptags?.tag ?? [];
      /* LE SEUIL DE 10 SUR 100 ECARTE LE BRUIT SANS ECARTER LE SIGNAL. En
         dessous, une etiquette a ete posee par une poignee de personnes sur
         des millions d'ecoutes ; elle ferait passer n'importe quel artiste
         pour n'importe quel genre. */
      tags = brut.filter((t) => t.count >= 10).map((t) => [t.name, t.count] as [string, number]);
      break;
    } catch {
      await dormir(1500);
    }
  }
  cache[cle] = { tags, quand: Date.now() };
  /* LA PAUSE EST ICI ET NON DANS LA BOUCLE : elle protege Last.fm d'un
     rythme trop rapide, or un artiste deja en cache ne l'appelle pas. La
     mettre dans la boucle ajoutait huit minutes d'attente pour rien lors
     d'une seconde passe. */
  await dormir(210);
  return tags;
}

type Track = { artist?: string; title?: string; year?: number };
type Genre = {
  id: string;
  label: string;
  family: string;
  aliases?: string[];
  parents?: { id: string }[] | string[];
  tracks: Track[];
};
type Corpus = { genres: Genre[]; families: { id: string; label: string }[] };

const corpus: Corpus = JSON.parse(readFileSync(CORPUS, 'utf8'));
const familleLabel = new Map(corpus.families.map((f) => [f.id, f.label]));
const genreParId = new Map(corpus.genres.map((g) => [g.id, g]));

/* LE VOCABULAIRE ATTENDU D'UN GENRE, du plus precis au plus large : son nom,
   ses alias, le nom de ses parents directs, celui de sa famille. Un morceau
   qui ne touche aucun de ces mots n'a rien qui le rattache a la page ou il
   est pose. */
function vocabulaire(g: Genre): { propre: Set<string>; large: Set<string> } {
  const propre = new Set<string>([norm(g.label)]);
  for (const a of g.aliases ?? []) propre.add(norm(a));
  const large = new Set<string>();
  const fam = familleLabel.get(g.family);
  if (fam) large.add(norm(fam));
  large.add(norm(g.family));
  for (const p of g.parents ?? []) {
    const pid = typeof p === 'string' ? p : p.id;
    const pg = genreParId.get(pid);
    if (pg) large.add(norm(pg.label));
  }
  return { propre, large };
}

const touche = (tags: string[], mots: Set<string>): string | null => {
  for (const t of tags) {
    for (const m of mots) {
      if (!m) continue;
      if (t === m || t.includes(m) || m.includes(t)) return t;
    }
  }
  return null;
};

const cible = only ? corpus.genres.filter((g) => norm(g.label).includes(norm(only))) : corpus.genres;

const lignes: string[] = [];
let nTotal = 0;
let nHors = 0;
let nSansTag = 0;

type Signal = { artist: string; title: string; year?: number; tags: string[] };

const parGenre: { g: Genre; hors: Signal[]; famille: Signal[]; muets: Signal[] }[] = [];

for (const [i, g] of cible.entries()) {
  const { propre, large } = vocabulaire(g);
  const hors: Signal[] = [];
  const famille: Signal[] = [];
  const muets: Signal[] = [];
  for (const tr of g.tracks) {
    nTotal++;
    if (!tr.artist) continue;
    const brut = await tagsDe(tr.artist);
    const tags = brut.map(([n]) => norm(n));
    const s: Signal = {
      artist: tr.artist,
      title: tr.title ?? '',
      ...(tr.year ? { year: tr.year } : {}),
      tags: brut.slice(0, 6).map(([n]) => n),
    };
    if (tags.length === 0) {
      nSansTag++;
      muets.push(s);
      continue;
    }
    if (touche(tags, propre)) continue;
    if (touche(tags, large)) {
      famille.push(s);
      continue;
    }
    nHors++;
    hors.push(s);
  }
  parGenre.push({ g, hors, famille, muets });
  process.stderr.write(
    `\r${i + 1}/${cible.length}  ${g.label.padEnd(26).slice(0, 26)} hors champ: ${hors.length}   `
  );
  writeFileSync(CACHE, JSON.stringify(cache));
}
process.stderr.write('\n');

parGenre.sort((a, b) => b.hors.length - a.hors.length);

lignes.push('# Est-ce que chaque morceau est dans le bon style ?');
lignes.push('');
lignes.push(
  `Mesure sur ${nTotal} morceaux. ${nHors} n'ont AUCUNE etiquette d'auditeur qui touche ` +
    `ni leur genre, ni sa famille, ni ses parents. ${nSansTag} artistes n'ont aucune etiquette ` +
    `au dessus du seuil : Last.fm ne les connait pas assez, ce n'est pas une faute du corpus.`
);
lignes.push('');
lignes.push(
  "Le script ne supprime rien. Un morceau signale peut etre juste : une reference d'avant le " +
    'genre, un disque que les auditeurs etiquettent autrement que les historiens. Le dernier ' +
    'mot revient a la lecture.'
);
lignes.push('');

for (const { g, hors, famille, muets } of parGenre) {
  if (hors.length === 0 && famille.length === 0) continue;
  const fam = familleLabel.get(g.family) ?? g.family;
  lignes.push(`## ${g.label}  (famille ${fam}, ${g.tracks.length} morceaux)`);
  lignes.push('');
  if (hors.length) {
    lignes.push(`### Hors champ : ${hors.length}`);
    for (const s of hors) {
      lignes.push(
        `- **${s.artist} - ${s.title}**${s.year ? ` (${s.year})` : ''} : ${s.tags.join(', ') || 'aucune etiquette'}`
      );
    }
    lignes.push('');
  }
  if (famille.length) {
    lignes.push(`### Famille seulement : ${famille.length}`);
    for (const s of famille) {
      lignes.push(
        `- ${s.artist} - ${s.title}${s.year ? ` (${s.year})` : ''} : ${s.tags.join(', ')}`
      );
    }
    lignes.push('');
  }
  if (muets.length) lignes.push(`_${muets.length} artistes sans etiquette mesurable._`, '');
}

writeFileSync(RAPPORT, lignes.join('\n'), 'utf8');
console.log(`\n${nTotal} morceaux mesures. ${nHors} hors champ. Rapport : audit-coherence.md`);
