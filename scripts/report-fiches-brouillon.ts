/* Reporte fiches-brouillon.md dans le corpus, via corpus-store.

   Le fichier à la racine est l'espace de travail de Mika sur les terrains
   réservés : la machine y propose, lui corrige. Ce script recopie chaque
   fiche (description, machines, labels historiques et actuels, artistes
   clés) dans corpus.json. LE BADGE BROUILLON RESTE, sauf --lever-brouillon,
   à n'utiliser que sur validation explicite de Mika.

   Usage :
     npx tsx scripts/report-fiches-brouillon.ts
     npx tsx scripts/report-fiches-brouillon.ts --lever=progpsy,zenonesque
     npx tsx scripts/report-fiches-brouillon.ts --lever-brouillon   (toutes)

   La levée est SÉLECTIVE par défaut : Mika valide fiche par fiche, et une
   validation ne s'étend jamais aux autres. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { transaction } from './lib/corpus-store.ts';

const LEVER_ALL = process.argv.includes('--lever-brouillon');
const leverArg = process.argv.find((a) => a.startsWith('--lever='));
const LEVER_IDS = new Set(
  leverArg ? leverArg.slice('--lever='.length).split(',').map((x) => x.trim()).filter(Boolean) : []
);
const leve = (id: string): boolean => LEVER_ALL || LEVER_IDS.has(id);

interface Fiche {
  id: string;
  description: string;
  machines: string[];
  labelsHistoriques: string[];
  labelsActuels: string[];
  artistesCles: string[];
}

const text = readFileSync(
  fileURLToPath(new URL('../fiches-brouillon.md', import.meta.url)),
  'utf8'
);

const fiches: Fiche[] = [];
const sections = text.split(/^## /m).slice(1);
for (const section of sections) {
  const lines = section.split('\n');
  const head = lines[0] ?? '';
  const idMatch = /\(([a-z0-9]+)\)/.exec(head);
  if (!idMatch?.[1]) continue;

  const paragraphs = section
    .split('\n\n')
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('##') && !p.startsWith('- '));
  const description = paragraphs.find((p) => !/^[A-Za-zÀ-ÿ' -]+\(/.test(p) && p.length > 80) ?? '';

  const list = (name: string): string[] => {
    const line = lines.find((l) => l.trim().startsWith(`- ${name} :`));
    if (!line) return [];
    return line
      .slice(line.indexOf(':') + 1)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  };

  fiches.push({
    id: idMatch[1],
    description,
    machines: list('Machines'),
    labelsHistoriques: list('Labels historiques'),
    labelsActuels: list('Labels actuels').filter((x) => !/^Aucun/.test(x)),
    artistesCles: list('Artistes clés')
  });
}

if (fiches.length === 0) {
  console.error('Aucune fiche lue : rien à reporter.');
  process.exit(1);
}

let updated = 0;
transaction((corpus) => {
  const genres = (corpus as unknown as { genres: Record<string, unknown>[] }).genres;
  for (const f of fiches) {
    const g = genres.find((x) => x['id'] === f.id);
    if (!g) throw new Error(`genre inconnu : ${f.id}`);
    if (!f.description || f.machines.length === 0) throw new Error(`fiche incomplète : ${f.id}`);
    g['description'] = f.description;
    g['machines'] = f.machines;
    g['labelsHistoriques'] = f.labelsHistoriques;
    g['labelsActuels'] = f.labelsActuels;
    g['artistesCles'] = f.artistesCles;
    if (leve(f.id)) delete g['redaction'];
    updated += 1;
  }
});

const levees = LEVER_ALL ? 'toutes' : LEVER_IDS.size > 0 ? [...LEVER_IDS].join(', ') : 'aucune';
console.log(`${updated} fiche(s) reportée(s), badge levé sur : ${levees}.`);
