/* Intégrité du corpus SONAA.
   Ce script fait autorité et bloque la CI : une donnée invalide ne peut pas
   atteindre la production. Voir ARCHITECTURE.md ADR-005.

   Le schéma Zod porte l'essentiel des contrôles structurels (références
   résolues, parent structurel dans la même famille, un fondateur par famille,
   absence de cycle, trois générations minimum). Ce script y ajoute les
   contrôles de forme qui ne relèvent pas du typage, et le décompte. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { FAMILY_IDS, corpusSchema } from '../src/data/schema.ts';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));

const foldName = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const errors: string[] = [];
const warnings: string[] = [];

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(CORPUS, 'utf8'));
} catch (error) {
  console.error(`Corpus illisible : ${(error as Error).message}`);
  process.exit(1);
}

const parsed = corpusSchema.safeParse(raw);
if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    errors.push(`${issue.path.join('.') || '(racine)'} : ${issue.message}`);
  }
} else {
  const doc = parsed.data;

  // Les teintes de familles doivent rester lisibles : écart minimal de 22
  // degrés, et rien dans la zone olive-kaki entre 90 et 120 degrés.
  const hues = doc.families.map((f) => f.hue).sort((a, b) => a - b);
  hues.forEach((h, i) => {
    const next = hues[(i + 1) % hues.length] ?? h;
    const gap = i === hues.length - 1 ? 360 - h + (hues[0] ?? 0) : next - h;
    if (gap < 22) errors.push(`teintes trop proches : ${h} et ${next}, écart ${gap} degrés`);
    if (h >= 90 && h <= 120) errors.push(`teinte ${h} dans la zone olive-kaki interdite`);
  });

  /* Un alias qui est le nom d'un AUTRE genre fait sauter la recherche sur le
     mauvais noeud. Le cas est apparu en grandissant : « Footwork » était un
     alias de Hard House tant que le genre Footwork n'existait pas. */
  const labelToId = new Map(doc.genres.map((g) => [foldName(g.label), g.id]));
  for (const g of doc.genres) {
    for (const alias of g.aliases ?? []) {
      const owner = labelToId.get(foldName(alias));
      if (owner !== undefined && owner !== g.id) {
        errors.push(`${g.id} : l'alias « ${alias} » est le nom du genre ${owner}`);
      }
    }
  }

  for (const g of doc.genres) {
    if (g.bpm !== null) {
      const [lo, hi] = g.bpm;
      if (lo > hi) errors.push(`${g.id} : intervalle de BPM inversé, ${lo} à ${hi}`);
    }

    // Une filiation débattue doit être argumentée, sinon le doute est muet.
    if (g.confidence === 'debated' && g.note.trim().length < 40) {
      errors.push(`${g.id} : confidence "debated" sans note expliquant le désaccord`);
    }

    const ids = new Set<string>();
    for (const t of g.tracks) {
      if (ids.has(t.youtubeId)) errors.push(`${g.id} : identifiant YouTube en double, ${t.youtubeId}`);
      ids.add(t.youtubeId);
    }
    if (ids.size === 0) warnings.push(`${g.id} : aucun morceau vérifié`);
  }

  // Décompte, pour que la CI dise ce qu'elle a validé.
  const perFamily = FAMILY_IDS.map((f) => {
    const n = doc.genres.filter((g) => g.family === f).length;
    return `${f} ${n}`;
  }).join(', ');
  const countOf = (g: (typeof doc.genres)[number]): number =>
    g.tracks.length;
  const tracks = doc.genres.reduce((n, g) => n + countOf(g), 0);
  const origine = doc.genres.reduce((n, g) => n + g.tracks.filter((t) => t.role === 'origine').length, 0);
  const canon = doc.genres.reduce((n, g) => n + g.tracks.filter((t) => t.role === 'canon').length, 0);
  const debated = doc.genres.filter((g) => g.confidence === 'debated').length;
  const grafts = doc.genres.reduce(
    (n, g) => n + g.parents.filter((p) => p.family !== g.family).length,
    0
  );

  console.log(`Corpus : ${doc.genres.length} genres (${perFamily})`);
  console.log(
    `Morceaux vérifiés : ${tracks} dont ${origine} d'origine et ${canon} canon | ` +
      `filiations débattues : ${debated} | greffes : ${grafts}`
  );

  /* Où sont les trous. Classé du plus pauvre au plus riche : c'est la liste de
     travail pour tracks-canon.md, pas une statistique décorative. */
  const CIBLE = 3;
  const ranked = [...doc.genres].sort((a, b) => countOf(a) - countOf(b) || a.id.localeCompare(b.id));
  const sous = ranked.filter((g) => countOf(g) < CIBLE);

  console.log('');
  console.log(`Couverture par genre, du plus faible au plus fort (cible ${CIBLE}) :`);
  console.log('  genre                famille      orig  can.  total');
  for (const g of ranked) {
    const total = countOf(g);
    const flag = total === 0 ? ' VIDE' : total < CIBLE ? ' à compléter' : '';
    console.log(
      `  ${g.id.padEnd(20)} ${g.family.padEnd(12)} ` +
        `${String(g.tracks.filter((t) => t.role === 'origine').length).padStart(4)}  ` +
        `${String(g.tracks.filter((t) => t.role === 'canon').length).padStart(4)}  ` +
        `${String(total).padStart(5)}${flag}`
    );
  }
  console.log('');
  console.log(
    `${sous.length} genre(s) sous la cible de ${CIBLE} : ` +
      (sous.length > 0 ? sous.map((g) => `${g.id} (${countOf(g)})`).join(', ') : 'aucun')
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   UN GENRE NE PEUT PAS NAITRE AVANT SON PARENT.

   C'est une impossibilite LOGIQUE et non une invraisemblance : si un genre
   descend d'un autre, il ne peut pas lui preexister. Elle merite donc un
   controle et non un coup d'oeil.

   POURQUOI SEULEMENT ENTRE DATES SAISIES, et c'est le point important.

   Compare sur les dates DEDUITES, la regle rend cinquante-huit violations, et
   presque toutes sont du bruit : « Florida Breaks 1987 avant Breakbeat 1988 »
   ne dit rien d'autre que le plus ancien morceau de l'un precede d'un an le
   plus ancien morceau de l'autre. La deduction n'affirme pas une date de
   naissance, elle rapporte un enregistrement.

   Une date SAISIE, elle, est une affirmation. Deux affirmations qui se
   contredisent sont une faute, et c'est cela qu'on attrape. Un controle qui
   crie cinquante-huit fois sur du bruit se fait desactiver dans la semaine :
   c'est le reproche deja fait au plafond anti-parution, et il vaut ici. */
const genresLus = parsed.success ? parsed.data.genres : [];
const parId = new Map(genresLus.map((g) => [g.id, g]));
for (const g of genresLus) {
  if (g.yearStart === undefined) continue;
  const parents = new Set((g.parents ?? []).map((p) => p.id));
  /* Le parent STRUCTUREL ne compte que s'il est une vraie filiation :
     `structuralOnly` declare justement les rattachements de convention, comme
     le funk sous la musique concrete, ou aucune descendance n'est affirmee. */
  if (g.structuralParent && !g.structuralOnly) parents.add(g.structuralParent);
  for (const pid of parents) {
    const pg = parId.get(pid);
    if (!pg || pg.yearStart === undefined) continue;
    if (g.yearStart < pg.yearStart) {
      errors.push(
        `${g.id} nait en ${g.yearStart}, avant son parent ${pg.id} (${pg.yearStart}) : ` +
          'un genre ne peut pas preceder celui dont il descend.'
      );
    }
  }
}

for (const w of warnings) console.warn(`AVERTISSEMENT ${w}`);
for (const e of errors) console.error(`ERREUR ${e}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} erreur(s), le déploiement est bloqué.`);
  process.exit(1);
}
console.log('Corpus valide.');
