/* Remplacer les intégrales d'album, en mesurant la durée canonique.

   ═══ LA PREMIÈRE RÈGLE ÉTAIT FAUSSE ═══

   Elle disait : « si une version de moins de quinze minutes existe et passe
   le matcher, l'entrée longue était une intégrale ». Trente-six
   remplacements ont dû être annulés. Une pièce de trente-cinq minutes a
   toujours des extraits, des éditions radio et des captations qui
   circulent : l'existence d'un fragment ne prouve rien sur la durée de
   l'œuvre. Les remplaçants obtenus comprenaient une interview de
   Stockhausen, une bande-annonce d'album et une vidéo sur des brevets
   d'OVNI.

   ═══ LA MESURE JUSTE ═══

   La durée canonique d'une piste se lit sur la fiche Discogs de la sortie,
   piste par piste. C'est une donnée, pas une inférence.

     Ed Rush & Optical, Wormhole : Discogs dit 6:49, la vidéo fait 70 min
       -> intégrale de l'album, à remplacer.
     Klaus Schulze, Bayreuth Return : Discogs dit 30:25, la vidéo fait 30 min
       -> la pièce dure vraiment cela, à garder.

   Deux entrées que la règle précédente traitait de la même façon, et que
   celle-ci sépare sans avoir à juger les disques un par un.

   ═══ CE QUI N'EST PAS MESURÉ N'EST PAS TOUCHÉ ═══

   Toutes les sorties n'ont pas de durées sur Discogs : « Kontakte » et
   « Higher EP » n'en portent aucune. Ces entrées sont laissées telles
   quelles et déclarées comme non mesurées. Ne pas confondre « la vidéo est
   correcte » avec « je n'ai pas pu vérifier » est le fil conducteur de tout
   ce chantier.

   Le remplaçant, lui, doit approcher la durée canonique à 25 % près. Un
   extrait de 3 minutes pour une pièce de 30 est rejeté au même titre qu'une
   intégrale de 70.

   Usage : npm run reparer:parutions -- --cibles=<fichier.json>
           npm run reparer:parutions -- --cibles=... --dry-run */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { transaction } from './lib/corpus-store.ts';
import { judge, oembed, searchYouTube, sleep } from './lib/match.ts';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const DRY = process.argv.includes('--dry-run');

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

const DISCOGS = process.env['DISCOGS_TOKEN'] ?? lireEnv('DISCOGS_TOKEN');
if (!DISCOGS) {
  console.error(
    "DISCOGS_TOKEN absent. C'est la seule source de duree canonique : sans lui " +
      "ce script ne peut RIEN decider, et il s'arrete plutot que de deviner."
  );
  process.exit(1);
}

/** Ecart tolere entre la duree Discogs et celle de la video retenue. */
const TOLERANCE = 0.25;

const UA = { headers: { 'User-Agent': 'SONAA/1.0 +https://sonaa.ca/' } };

interface Cible {
  genre: string;
  champ: 'essentiel' | 'actuel';
  id: string;
  artiste: string;
  titre: string;
  min: number;
}
interface Track {
  youtubeId: string;
  [k: string]: unknown;
}
interface Genre {
  id: string;
  tracks: { essentiel: Track[]; actuel: Track[] };
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

const corpus = JSON.parse(readFileSync(`${RACINE}src/data/corpus.json`, 'utf8')) as {
  genres: Genre[];
};
const pris = new Set<string>();
for (const g of corpus.genres) {
  for (const t of [...g.tracks.essentiel, ...g.tracks.actuel]) pris.add(t.youtubeId);
}

/* --------------------------------------------- la duree canonique, Discogs */

const enSecondes = (mmss: string): number | null => {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(mmss.trim());
  if (!m) return null;
  return (+(m[1] ?? 0)) * 3600 + +(m[2] ?? 0) * 60 + +(m[3] ?? 0);
};

const motsCles = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

/** Duree de la piste sur la fiche Discogs, ou null si Discogs ne la donne pas. */
async function dureeCanonique(artiste: string, titre: string): Promise<number | null> {
  try {
    const q = encodeURIComponent(`${artiste} ${titre}`);
    const s = (await (
      await fetch(
        `https://api.discogs.com/database/search?q=${q}&type=release&per_page=3&token=${DISCOGS}`,
        UA
      )
    ).json()) as { results?: { id: number }[] };
    await sleep(1200);

    for (const r of (s.results ?? []).slice(0, 2)) {
      const rel = (await (
        await fetch(`https://api.discogs.com/releases/${r.id}?token=${DISCOGS}`, UA)
      ).json()) as { tracklist?: { title?: string; duration?: string }[] };
      await sleep(1200);

      const mots = motsCles(titre);
      for (const p of rel.tracklist ?? []) {
        if (!p.duration || !p.title) continue;
        const t = p.title.toLowerCase();
        /* La piste doit porter TOUS les mots significatifs du titre : une
           correspondance partielle ferait passer « Wormhole » pour « The
           Wormhole Sequence ». */
        if (!mots.every((w) => t.includes(w))) continue;
        const sec = enSecondes(p.duration);
        if (sec && sec > 0) return sec;
      }
    }
  } catch {
    /* Discogs injoignable : on ne sait pas, et on le dira. */
  }
  return null;
}

/* ------------------------------------------ MusicBrainz, en repli gratuit

   Discogs ne porte pas de duree pour toutes les sorties : 24 des 49 entrees
   longues n'ont rien pu etre mesurees par lui. MusicBrainz couvre une
   partie de ce trou, sans cle et sans quota, a une requete par seconde.

   Taux mesure avant de lancer, sur huit de ces cas : SIX trouves, soit
   75 %. La requete stricte par champs n'en rendait que deux ; la requete
   libre, filtree localement sur les mots du titre, fait le reste. Les deux
   echecs restants sont des sorties de tres petits labels que MusicBrainz
   ne connait pas davantage que Discogs.

   Ce qui compte : Kontakte de Stockhausen y figure a 34 min 51, ce qui
   rend enfin mesurable, et donc legitime, une video de 35 minutes que la
   premiere regle avait remplacee par une interview. */

const MB_UA = { headers: { 'User-Agent': 'SONAA/1.0 (https://sonaa.ca)' } };

async function dureeMusicBrainz(artiste: string, titre: string): Promise<number | null> {
  try {
    const q = encodeURIComponent(`${artiste} ${titre}`);
    const r = (await (
      await fetch(
        `https://musicbrainz.org/ws/2/recording?query=${q}&fmt=json&limit=5`,
        MB_UA
      )
    ).json()) as { recordings?: { title?: string; length?: number }[] };
    await sleep(1100); // MusicBrainz demande une requete par seconde

    const mots = motsCles(titre);
    for (const rec of r.recordings ?? []) {
      if (!rec.length || !rec.title) continue;
      const t = rec.title.toLowerCase();
      if (!mots.every((w) => t.includes(w))) continue;
      return Math.round(rec.length / 1000);
    }
  } catch {
    /* MusicBrainz injoignable : l'entree restera non mesuree, et le dira. */
  }
  return null;
}

/* ------------------------------------------------------------- la passe */

const remplaces: string[] = [];
const legitimes: string[] = [];
const nonMesures: string[] = [];
const sansRemplacant: string[] = [];

for (const cible of cibles) {
  let canonique = await dureeCanonique(cible.artiste, cible.titre);
  let source = 'Discogs';
  if (canonique === null) {
    canonique = await dureeMusicBrainz(cible.artiste, cible.titre);
    source = 'MusicBrainz';
  }
  const etiquette = `${cible.genre} | ${cible.artiste} - ${cible.titre} | video ${cible.min} min`;

  if (canonique === null) {
    nonMesures.push(etiquette);
    continue;
  }

  const canonMin = Math.round(canonique / 60);

  /* La video est-elle conforme a la duree canonique ? Si oui, l'entree est
     legitime malgre sa longueur : Bayreuth Return dure vraiment 30 minutes. */
  /* UNE VIDEO PLUS COURTE QUE L'OEUVRE N'EST PAS UNE INTEGRALE.
     « Basic Channel, Quadrant Dub I » dure 15 minutes en video pour 21
     minutes au catalogue : c'est peut-etre une edition, ce n'est en aucun
     cas un album entier, et la remplacer par un morceau encore plus court
     n'aurait aucun sens. Seul un DEPASSEMENT signale une integrale. */
  const secondes = cible.min * 60;
  if (secondes < canonique) {
    legitimes.push(
      `${etiquette}, ${source} ${canonMin} min, video plus courte que l'oeuvre, pas une integrale`
    );
    continue;
  }

  const ecart = Math.abs(secondes - canonique) / canonique;
  if (ecart <= TOLERANCE) {
    legitimes.push(`${etiquette}, ${source} ${canonMin} min, conforme`);
    continue;
  }

  /* Sinon c'est une integrale : on cherche une video dont la duree approche
     la duree canonique. Le filtre de nature ecarte desormais interviews,
     bandes-annonces et documentaires. */
  let remplacant: string | null = null;
  let dureeRet = 0;
  for (const h of await searchYouTube(`${cible.artiste} ${cible.titre}`, 10)) {
    if (h.id === cible.id || pris.has(h.id)) continue;
    if (h.seconds == null) continue;
    if (Math.abs(h.seconds - canonique) / canonique > TOLERANCE) continue;
    const cand = await oembed(h.id);
    if (!cand) continue;
    if (judge(cand, cible.artiste, cible.titre, h.seconds).ok) {
      remplacant = h.id;
      dureeRet = h.seconds;
      break;
    }
    await sleep(250);
  }

  if (remplacant) {
    remplaces.push(
      `${etiquette}, ${source} ${canonMin} min -> ${remplacant} (${Math.round(dureeRet / 60)} min)`
    );
    pris.add(remplacant);
    if (!DRY) {
      transaction((frais) => {
        const g = (frais.genres as unknown as Genre[]).find((x) => x.id === cible.genre);
        const t = g?.tracks[cible.champ].find((x) => x.youtubeId === cible.id);
        if (t) t.youtubeId = remplacant;
      });
    }
  } else {
    sansRemplacant.push(`${etiquette}, ${source} ${canonMin} min, aucune video conforme`);
  }
  await sleep(300);
}

/* ------------------------------------------------------------- rapport */

console.log(`\n${remplaces.length} integrale(s) remplacee(s) :`);
for (const r of remplaces) console.log('  ' + r);
console.log(`\n${legitimes.length} entree(s) longue(s) mais CONFORMES a Discogs, gardees :`);
for (const l of legitimes) console.log('  ' + l);
console.log(`\n${sansRemplacant.length} integrale(s) sans remplacant conforme, laissee(s) :`);
for (const s of sansRemplacant) console.log('  ' + s);
console.log(`\n${nonMesures.length} entree(s) NON MESUREE(S), Discogs ne donne pas de duree :`);
for (const n of nonMesures) console.log('  ' + n);

if (!DRY) {
  writeFileSync(
    `${RACINE}PARUTIONS-COMPLETES.md`,
    `# Parutions completes : ce qui a ete mesure, et ce qui ne l'a pas ete\n\n` +
      `La duree canonique vient de la fiche Discogs de la sortie, piste par\n` +
      `piste. Une video conforme a cette duree est legitime, quelle que soit sa\n` +
      `longueur ; une video qui la depasse de plus de ${TOLERANCE * 100} % est une integrale.\n\n` +
      `La regle precedente, « une version courte existe donc l'entree est une\n` +
      `integrale », etait fausse : une piece de 35 minutes a toujours des\n` +
      `extraits qui circulent. Elle avait produit 36 remplacements annules.\n\n` +
      `## Integrales remplacees (${remplaces.length})\n\n` +
      (remplaces.map((r) => `- ${r}`).join('\n') || '_aucune_') +
      `\n\n## Longues mais conformes a Discogs, gardees (${legitimes.length})\n\n` +
      (legitimes.map((l) => `- ${l}`).join('\n') || '_aucune_') +
      `\n\n## Integrales sans remplacant conforme (${sansRemplacant.length})\n\n` +
      `Aucune video ne correspond a la duree canonique. Le defaut reste, il est\n` +
      `connu et mesure.\n\n` +
      (sansRemplacant.map((s) => `- ${s}`).join('\n') || '_aucune_') +
      `\n\n## Non mesurees (${nonMesures.length})\n\n` +
      `Ni Discogs ni MusicBrainz ne donnent de duree pour ces pistes. Rien n'a\n` +
      `ete touche : ` +
      `« je n'ai pas pu verifier » n'est pas « c'est correct ».\n\n` +
      (nonMesures.map((n) => `- ${n}`).join('\n') || '_aucune_') +
      `\n`
  );
}
