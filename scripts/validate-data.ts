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

  for (const g of doc.genres) {
    const [lo, hi] = g.bpm;
    if (lo > hi) errors.push(`${g.id} : intervalle de BPM inversé, ${lo} à ${hi}`);

    // Une filiation débattue doit être argumentée, sinon le doute est muet.
    if (g.confidence === 'debated' && g.note.trim().length < 40) {
      errors.push(`${g.id} : confidence "debated" sans note expliquant le désaccord`);
    }

    const ids = new Set<string>();
    for (const t of g.tracks) {
      if (ids.has(t.youtubeId)) errors.push(`${g.id} : identifiant YouTube en double, ${t.youtubeId}`);
      ids.add(t.youtubeId);
    }
    if (g.tracks.length === 0) warnings.push(`${g.id} : aucun morceau vérifié`);
  }

  // Décompte, pour que la CI dise ce qu'elle a validé.
  const perFamily = FAMILY_IDS.map((f) => {
    const n = doc.genres.filter((g) => g.family === f).length;
    return `${f} ${n}`;
  }).join(', ');
  const tracks = doc.genres.reduce((n, g) => n + g.tracks.length, 0);
  const debated = doc.genres.filter((g) => g.confidence === 'debated').length;
  const grafts = doc.genres.reduce(
    (n, g) => n + g.parents.filter((p) => p.family !== g.family).length,
    0
  );

  console.log(`Corpus : ${doc.genres.length} genres (${perFamily})`);
  console.log(`Morceaux vérifiés : ${tracks} | filiations débattues : ${debated} | greffes : ${grafts}`);
}

for (const w of warnings) console.warn(`AVERTISSEMENT ${w}`);
for (const e of errors) console.error(`ERREUR ${e}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} erreur(s), le déploiement est bloqué.`);
  process.exit(1);
}
console.log('Corpus valide.');
