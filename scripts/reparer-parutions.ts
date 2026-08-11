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

   Les cibles viennent du fichier produit par l'audit, et non d'un nouveau
   balayage : mesurer une deuxieme fois la duree des 1431 entrees couterait
   une heure pour retrouver exactement la meme liste.

   Usage : npm run reparer:parutions -- --cibles=<fichier.json>
           npm run reparer:parutions -- --cibles=... --dry-run */

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

interface Cible {
  genre: string;
  champ: 'essentiel' | 'actuel';
  id: string;
  artiste: string;
  titre: string;
  min: number;
}

const fichier = process.argv.find((a) => a.startsWith('--cibles='))?.slice(9);
if (!fichier) {
  console.error(
    'Aucun fichier de cibles. Ce script ne redecouvre pas les entrees longues, ' +
      "il repare celles que l'audit a deja trouvees.\n" +
      '  npm run reparer:parutions -- --cibles=chemin/cibles.json'
  );
  process.exit(1);
}

const cibles = JSON.parse(readFileSync(fichier, 'utf8')) as Cible[];
if (cibles.length === 0) {
  console.error('Le fichier de cibles est vide. Rien a reparer, ou audit non abouti.');
  process.exit(1);
}

const remplaces: string[] = [];
const gardes: string[] = [];
const irresolus: string[] = [];

for (const cible of cibles) {
  /* On cherche une autre version, en écartant l'identifiant fautif et tout
     ce qui est déjà dans le corpus. */
  let remplacant: string | null = null;
  let vues = 0;
  for (const h of await searchYouTube(`${cible.artiste} ${cible.titre}`, 10)) {
    vues += 1;
    if (h.id === cible.id || pris.has(h.id)) continue;
    if (h.seconds == null || h.seconds > MAX_TRACK_SECONDS) continue;
    const cand = await oembed(h.id);
    if (!cand) continue;
    if (judge(cand, cible.artiste, cible.titre, h.seconds).ok) {
      remplacant = h.id;
      break;
    }
    await sleep(250);
  }

  const etiquette = `${cible.genre} | ${cible.artiste} - ${cible.titre} | ${cible.min} min`;

  if (remplacant) {
    remplaces.push(`${etiquette} -> ${remplacant}`);
    pris.add(remplacant);
    if (!DRY) {
      transaction((frais) => {
        const g = (frais.genres as unknown as Genre[]).find((x) => x.id === cible.genre);
        const t = g?.tracks[cible.champ].find((x) => x.youtubeId === cible.id);
        if (t) t.youtubeId = remplacant;
      });
    }
  } else if (vues === 0) {
    /* LA RECHERCHE N'A RIEN RENDU. Ce n'est pas « le morceau est long »,
       c'est « je n'ai pas pu regarder ». Les deux ne doivent jamais etre
       confondus, c'est la faute qui a laisse entrer ces entrees. */
    irresolus.push(etiquette);
  } else {
    gardes.push(etiquette);
  }
  await sleep(300);
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

if (irresolus.length > 0) {
  console.error(
    `\n${irresolus.length} entrée(s) sur lesquelles la recherche n'a RIEN rendu. ` +
      `Ce n'est pas un verdict, c'est une absence de mesure. A relancer :`
  );
  for (const i of irresolus) console.error('  ' + i);
  process.exit(1);
}
