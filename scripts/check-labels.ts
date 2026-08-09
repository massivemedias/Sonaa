/* Garde-fou des labels : le label affiche le NOM SEUL.

   L'information de dérivés vit dans la fiche, jamais dans le label. Un suffixe
   « · 3 » a déjà été pris pour un identifiant technique resté d'un jeu de
   données factice, et il a fallu une capture d'écran pour s'en apercevoir. Ce
   contrôle rend la récidive impossible : il échoue si un site d'appel compose
   le texte d'un label au lieu de passer le nom nu.

   Deux contrôles, tous deux bloquants en CI :

   1. Dans webgl.ts, chaque appel à add() doit passer exactement `slot.label`
      ou `family.label` comme texte. Ni gabarit, ni concaténation, ni appel.
   2. Aucun fichier de src/atlas ne contient les marqueurs de l'ancien
      suffixe : « ♪ », ou un « · » interpolé dans un gabarit de chaîne.

   Usage : npm run check:labels */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ATLAS = fileURLToPath(new URL('../src/atlas', import.meta.url));

const errors: string[] = [];

// --- 1. Les sites d'appel de add() -----------------------------------------

const webgl = readFileSync(`${ATLAS}/webgl.ts`, 'utf8');

/* On repère chaque appel `add(` puis on lit son deuxième argument. L'analyse
   est volontairement naïve : les appels sont sur une ou plusieurs lignes, mais
   les arguments sont simples. Si la forme du code change au point de casser ce
   parseur, c'est le moment de re-regarder les labels de toute façon. */
const callSites = [...webgl.matchAll(/\badd\(\s*([\s\S]{0,200}?)\)/g)];
const ALLOWED_TEXT = new Set(['slot.label', 'family.label']);

let checked = 0;
for (const call of callSites) {
  const args = call[1] ?? '';
  // Découpe grossière au premier niveau : les arguments ne contiennent pas de
  // parenthèses imbriquées sauf new Vector3(), qu'on neutralise d'abord.
  const flat = args.replace(/new Vector3\([^)]*\)/g, 'VEC');
  const parts = flat.split(',').map((p) => p.trim());
  if (parts.length < 2) continue;
  const text = parts[1] ?? '';
  checked += 1;
  if (!ALLOWED_TEXT.has(text)) {
    errors.push(
      `webgl.ts : un label est composé au lieu d'être le nom nu : « ${text} ». ` +
        `Le label affiche le nom seul, l'information vit dans la fiche.`
    );
  }
}
if (checked === 0) {
  errors.push('webgl.ts : aucun site d\'appel add() trouvé, le parseur du contrôle est cassé.');
}

// --- 2. Les marqueurs de l'ancien suffixe -----------------------------------

for (const name of readdirSync(ATLAS)) {
  if (!/\.(ts|tsx)$/.test(name)) continue;
  const content = readFileSync(`${ATLAS}/${name}`, 'utf8');
  // On ignore les commentaires : l'histoire du suffixe y est racontée exprès.
  const code = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  if (code.includes('♪')) {
    errors.push(`${name} : le marqueur « ♪ » de l'ancien suffixe est revenu.`);
  }
  // « ... · ${expr} » dans un gabarit qui touche un label.
  for (const m of code.matchAll(/`[^`]*·\s*\$\{[^}]*\}[^`]*`/g)) {
    const snippet = m[0];
    if (/label/i.test(snippet)) {
      errors.push(`${name} : un gabarit compose « · » avec un label : ${snippet.slice(0, 60)}`);
    }
  }
}

if (errors.length > 0) {
  for (const e of errors) console.error(`ERREUR ${e}`);
  process.exit(1);
}
console.log(`Labels : ${checked} site(s) d'appel vérifiés, nom nu partout.`);
