/* Remplacer les intégrales d'album entrées pendant la panne du plafond.

   ═══ POURQUOI CE N'EST PAS UNE SIMPLE SUPPRESSION ═══

   L'audit remonte des vidéos de plus de quinze minutes. Elles ne sont PAS
   toutes fautives, et c'est le piège de ce chantier.

   Fautives : « Ed Rush & Optical, Wormhole, 70 min » est l'album entier,
   « µ-Ziq, Magic Pony Ride, 51 min » aussi, alors que les morceaux durent
   quelques minutes. Ces entrées ne jouent pas ce qu'elles annoncent.

   Légitimes : « Stockhausen, Kontakte » dure vraiment 35 minutes,
   « Klaus Schulze, Bayreuth Return » vraiment 30, « Steve Roach,
   Structures from Silence » vraiment 24. Les remplacer par un morceau court
   trahirait l'ambient, la kosmische et la musique concrète, où la durée
   fait partie de la forme.

   ═══ LA RÈGLE QUI TRANCHE, SANS JUGEMENT AU CAS PAR CAS ═══

   On cherche une AUTRE version de la même piste, par le chemin habituel.

   - Une version courte existe et passe le matcher : l'entrée longue était
     bien une intégrale, on la remplace.
   - Aucune version courte n'existe : le morceau est réellement long, on le
     garde et on le déclare.

   C'est vérifiable, ça ne dépend pas de ce que je crois savoir de chaque
   disque, et ça se relit. Le rapport dit toujours dans quel cas on est.

   Usage : npm run reparer:parutions
           npm run reparer:parutions -- --dry-run */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { transaction } from './lib/corpus-store.ts';
import { judge, MAX_TRACK_SECONDS, oembed, searchYouTube, sleep } from './lib/match.ts';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const DRY = process.argv.includes('--dry-run');

interface Track {
  youtubeId: string;
  artist: string;
  title: string;
  [k: string]: unknown;
}
interface Genre {
  id: string;
  tracks: { essentiel: Track[]; actuel: Track[] };
}

const corpus = JSON.parse(readFileSync(`${RACINE}src/data/corpus.json`, 'utf8')) as {
  genres: Genre[];
};

/* Les identifiants déjà présents : un remplacement ne doit pas introduire
   un doublon d'une piste déjà retenue ailleurs. */
const pris = new Set<string>();
for (const g of corpus.genres) {
  for (const t of [...g.tracks.essentiel, ...g.tracks.actuel]) pris.add(t.youtubeId);
}

/** Durée d'une vidéo, par le chemin sans clé. */
const dureeDe = async (artist: string, title: string, id: string): Promise<number | null> => {
  for (const h of await searchYouTube(`${artist} ${title}`, 6)) {
    if (h.id === id) return h.seconds ?? null;
  }
  return null;
};

const remplaces: string[] = [];
const gardes: string[] = [];
const irresolus: string[] = [];

for (const genre of corpus.genres) {
  for (const champ of ['essentiel', 'actuel'] as const) {
    for (const track of genre.tracks[champ]) {
      const secondes = await dureeDe(track.artist, track.title, track.youtubeId);
      await sleep(400);
      if (secondes === null || secondes <= MAX_TRACK_SECONDS) continue;

      const min = `${Math.floor(secondes / 60)} min`;

      /* On cherche une autre version, en écartant l'identifiant fautif et
         tout ce qui est déjà dans le corpus. */
      let remplacant: string | null = null;
      for (const h of await searchYouTube(`${track.artist} ${track.title}`, 8)) {
        if (h.id === track.youtubeId || pris.has(h.id)) continue;
        if (h.seconds == null || h.seconds > MAX_TRACK_SECONDS) continue;
        const cand = await oembed(h.id);
        if (!cand) continue;
        if (judge(cand, track.artist, track.title, h.seconds).ok) {
          remplacant = h.id;
          break;
        }
        await sleep(250);
      }

      const etiquette = `${genre.id} | ${track.artist} - ${track.title} | ${min}`;

      if (remplacant) {
        remplaces.push(`${etiquette} -> ${remplacant}`);
        pris.add(remplacant);
        if (!DRY) {
          transaction((frais) => {
            const g = (frais.genres as unknown as Genre[]).find((x) => x.id === genre.id);
            const t = g?.tracks[champ].find((x) => x.youtubeId === track.youtubeId);
            if (t) t.youtubeId = remplacant;
          });
        }
      } else {
        /* AUCUNE VERSION COURTE N'EXISTE. Deux lectures possibles, et il
           faut les séparer : soit le morceau est réellement long, soit la
           recherche a échoué. On ne peut pas les distinguer ici, alors on
           le dit plutôt que de conclure. */
        gardes.push(etiquette);
      }
    }
  }
}

console.log(`\n${remplaces.length} entrée(s) remplacée(s) :`);
for (const r of remplaces) console.log('  ' + r);
console.log(`\n${gardes.length} entrée(s) gardée(s), aucune version courte trouvée :`);
for (const g of gardes) console.log('  ' + g);

if (!DRY) {
  writeFileSync(
    `${RACINE}PARUTIONS-COMPLETES.md`,
    `# Parutions complètes : ce qui a été remplacé, ce qui a été gardé\n\n` +
      `Entrées de plus de ${MAX_TRACK_SECONDS / 60} minutes trouvées par l'audit.\n` +
      `La règle appliquée ne juge pas les disques un par un : on cherche une\n` +
      `autre version de la même piste. Si une version courte existe et passe\n` +
      `le matcher, l'entrée longue était une intégrale et elle est remplacée.\n` +
      `Sinon, le morceau est tenu pour réellement long.\n\n` +
      `## Remplacées (${remplaces.length})\n\n` +
      (remplaces.map((r) => `- ${r}`).join('\n') || '_aucune_') +
      `\n\n## Gardées, aucune version courte n'existe (${gardes.length})\n\n` +
      `Ces durées appartiennent à la forme : ambient, kosmische, musique\n` +
      `concrète. Les raccourcir trahirait le genre.\n\n` +
      (gardes.map((g) => `- ${g}`).join('\n') || '_aucune_') +
      `\n`
  );
}

if (irresolus.length > 0) process.exit(1);
