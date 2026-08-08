/* Intégrité du graphe SONAA.
   Ce script fait autorité et bloque la CI : une donnée invalide ne peut pas
   atteindre la production. Voir ARCHITECTURE.md ADR-005.

   Deux niveaux de sortie :
   - ERREUR, le script sort en 1 et le déploiement s'arrête.
   - AVERTISSEMENT, le script sort en 0 mais la ligne doit être traitée. Elle
     signale une donnée douteuse plutôt qu'invalide, typiquement une date de
     filiation incohérente qui demande soit une correction, soit une source. */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PARENT_YEAR_TOLERANCE,
  ROOT_FAMILY,
  genreFileSchema,
  type Genre
} from '../src/data/schema.ts';

const GENRES_DIR = fileURLToPath(new URL('../src/data/genres', import.meta.url));

const errors: string[] = [];
const warnings: string[] = [];

const fail = (message: string): void => {
  errors.push(message);
};
const warn = (message: string): void => {
  warnings.push(message);
};

// --- Chargement -------------------------------------------------------------

let files: string[] = [];
try {
  files = readdirSync(GENRES_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();
} catch {
  console.log('Aucun dossier src/data/genres, rien à valider pour l\'instant.');
  process.exit(0);
}

if (files.length === 0) {
  console.log('Aucun fichier de genres, rien à valider pour l\'instant.');
  process.exit(0);
}

const genres: Genre[] = [];
const fileOf = new Map<string, string>();

for (const file of files) {
  const raw = readFileSync(join(GENRES_DIR, file), 'utf8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(`${file} : JSON illisible, ${(error as Error).message}`);
    continue;
  }

  const result = genreFileSchema.safeParse(parsed);
  if (!result.success) {
    for (const issue of result.error.issues) {
      fail(`${file} → ${issue.path.join('.')} : ${issue.message}`);
    }
    continue;
  }

  for (const genre of result.data) {
    if (fileOf.has(genre.id)) {
      fail(`identifiant en double : ${genre.id}, dans ${fileOf.get(genre.id)} et ${file}`);
      continue;
    }
    fileOf.set(genre.id, file);
    genres.push(genre);
  }
}

const byId = new Map(genres.map((genre) => [genre.id, genre]));

// --- Références -------------------------------------------------------------

for (const genre of genres) {
  for (const key of ['parents', 'influences', 'rejects'] as const) {
    for (const edge of genre[key] ?? []) {
      if (!byId.has(edge.to)) {
        fail(`${genre.id} → ${key} pointe vers ${edge.to}, qui n'existe pas`);
      }
    }
  }

  // Le fichier doit porter le nom de la famille des genres qu'il contient.
  const expected = `${genre.family}.json`;
  const actual = fileOf.get(genre.id);
  if (actual !== expected) {
    fail(`${genre.id} est de la famille ${genre.family} mais vit dans ${actual}`);
  }
}

// --- Racines ----------------------------------------------------------------

for (const genre of genres) {
  if (genre.parents.length === 0 && genre.family !== ROOT_FAMILY) {
    fail(
      `${genre.id} n'a aucun parent alors qu'il n'est pas de la famille ${ROOT_FAMILY}. ` +
        `Seules les racines peuvent être orphelines.`
    );
  }
}

// --- Acyclicité -------------------------------------------------------------
// Seules les arêtes de filiation forment le DAG. Les influences et les rejets
// sont latéraux et peuvent légitimement boucler.

const VISITING = 1;
const DONE = 2;
const state = new Map<string, number>();

const walk = (id: string, trail: string[]): void => {
  const current = state.get(id);
  if (current === DONE) return;

  if (current === VISITING) {
    const start = trail.indexOf(id);
    const cycle = [...trail.slice(start === -1 ? 0 : start), id].join(' → ');
    fail(`cycle de filiation : ${cycle}`);
    return;
  }

  state.set(id, VISITING);
  for (const edge of byId.get(id)?.parents ?? []) {
    if (byId.has(edge.to)) {
      walk(edge.to, [...trail, id]);
    }
  }
  state.set(id, DONE);
};

for (const genre of genres) {
  walk(genre.id, []);
}

// --- Cohérence des dates ----------------------------------------------------

for (const genre of genres) {
  const parentYears = genre.parents
    .map((edge) => byId.get(edge.to)?.yearStart)
    .filter((year): year is number => year !== undefined);

  if (parentYears.length === 0) continue;

  const oldest = Math.min(...parentYears);
  if (genre.yearStart < oldest - PARENT_YEAR_TOLERANCE) {
    warn(
      `${genre.id} apparaît en ${genre.yearStart}, soit ${oldest - genre.yearStart} ans ` +
        `avant son parent le plus ancien (${oldest}). Corriger la date ou justifier dans sources.`
    );
  }

  // Un parent éteint avant la naissance de son enfant est possible, mais assez
  // rare pour mériter une relecture.
  for (const edge of genre.parents) {
    const parent = byId.get(edge.to);
    if (parent?.yearEnd != null && parent.yearEnd < genre.yearStart) {
      warn(
        `${genre.id} (${genre.yearStart}) descend de ${parent.id}, éteint en ${parent.yearEnd}. ` +
          `Filiation posthume, à vérifier.`
      );
    }
  }
}

// --- Morceaux ---------------------------------------------------------------

for (const genre of genres) {
  if (genre.tracks.every((track) => !track.verified)) {
    warn(`${genre.id} n'a aucun morceau vérifié, il affichera "Sélection en cours de vérification."`);
  }
}

// --- Rapport ----------------------------------------------------------------

console.log(`${genres.length} genre(s) dans ${files.length} fichier(s).`);

for (const message of warnings) {
  console.log(`AVERTISSEMENT  ${message}`);
}
for (const message of errors) {
  console.error(`ERREUR         ${message}`);
}

if (errors.length > 0) {
  console.error(`\n${errors.length} erreur(s). Validation en échec.`);
  process.exit(1);
}

console.log(
  warnings.length > 0
    ? `\nValidation réussie, ${warnings.length} avertissement(s) à traiter.`
    : '\nValidation réussie, aucun avertissement.'
);
