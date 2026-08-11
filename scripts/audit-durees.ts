/* Le corpus contient-il des parutions complètes ?

   Question ouverte par la panne du plafond de durée : pendant qu'il ne
   s'appliquait pas, une intégrale d'album sans le mot « album » dans son
   titre passait le matcher. Ce contrôle relit chaque track du corpus et
   mesure sa durée réelle.

   Usage : npx tsx scripts/audit-durees.ts [--depuis=N] [--jusqua=N] */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { searchYouTube, sleep, MAX_TRACK_SECONDS } from './lib/match.ts';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as {
  genres: { id: string; tracks?: { essentiel?: T[]; actuel?: T[] } }[];
};
interface T { youtubeId: string; artist: string; title: string }

const arg = (n: string, d: number): number => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`));
  return a ? Number(a.slice(n.length + 3)) : d;
};

const toutes: { genre: string; t: T }[] = [];
for (const g of corpus.genres) {
  for (const t of g.tracks?.essentiel ?? []) toutes.push({ genre: g.id, t });
  for (const t of g.tracks?.actuel ?? []) toutes.push({ genre: g.id, t });
}

const depuis = arg('depuis', 0);
const jusqua = arg('jusqua', toutes.length);
const lot = toutes.slice(depuis, jusqua);

console.log(`Audit de ${lot.length} tracks (sur ${toutes.length}), plafond ${MAX_TRACK_SECONDS / 60} min.`);

const longues: string[] = [];
let mesurees = 0;
let inconnues = 0;

for (const [i, { genre, t }] of lot.entries()) {
  const hits = await searchYouTube(`${t.artist} ${t.title}`, 4);
  const exact = hits.find((h) => h.id === t.youtubeId);
  if (!exact) { inconnues += 1; }
  else if (exact.seconds == null) { inconnues += 1; }
  else {
    mesurees += 1;
    if (exact.seconds > MAX_TRACK_SECONDS) {
      const mn = `${Math.floor(exact.seconds / 60)} min ${exact.seconds % 60} s`;
      longues.push(`${genre} | ${t.artist} - ${t.title} | ${mn} | ${t.youtubeId}`);
      console.log(`  LONGUE  ${genre} | ${t.artist} - ${t.title} | ${mn}`);
    }
  }
  if ((i + 1) % 25 === 0) console.log(`  ... ${i + 1}/${lot.length}, ${longues.length} trouvée(s)`);
  await sleep(150);
}

console.log(`\nMesurées : ${mesurees}, non mesurables : ${inconnues}.`);

/* CE SCRIPT AVAIT LE DÉFAUT QU'IL TRAQUE.

   Il annonçait « aucune parution complète détectée » aussi bien quand il
   n'y en avait pas que quand il n'avait RIEN PU MESURER. Si l'extraction
   de durée retombe en panne, un audit muet ressemblerait à un corpus
   propre, et c'est précisément l'erreur qui a laissé entrer quarante-cinq
   albums. On refuse donc de conclure sous la moitié de mesures. */
const part = mesurees + inconnues === 0 ? 0 : mesurees / (mesurees + inconnues);
if (part < 0.5) {
  console.error(
    `\nAUDIT NON CONCLUANT : seulement ${Math.round(part * 100)} % des tracks ont ` +
      `pu être mesurées. L'absence de parution complète ci-dessus ne prouve RIEN. ` +
      `Vérifier l'extraction de durée : npm run check:plafond.`
  );
  process.exit(1);
}

console.log(longues.length === 0
  ? `Aucune parution complète dans ce lot, sur ${mesurees} tracks réellement mesurées.`
  : `${longues.length} track(s) au-dessus du plafond :\n  ${longues.join('\n  ')}`);
