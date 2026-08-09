/* Garde-fou des labels : le label affiche le NOM SEUL.

   L'information de dérivés vit dans la fiche, jamais dans le label. Un suffixe
   « · 3 » a déjà été pris pour un identifiant technique resté d'un jeu de
   données factice, et il a fallu une capture d'écran pour s'en apercevoir. Ce
   contrôle rend la récidive impossible : il échoue si un site d'appel compose
   le texte d'un label au lieu de passer le nom nu.

   Trois contrôles, tous bloquants en CI :

   1. Dans webgl.ts, chaque appel à add() doit passer exactement `slot.label`,
      `family.label` ou `anchor.label` comme texte. Ni gabarit, ni
      concaténation, ni appel.
   2. Aucun fichier de src/atlas ne contient les marqueurs de l'ancien
      suffixe : « ♪ », ou un « · » interpolé dans un gabarit de chaîne.
   3. L'OPACITÉ d'un label ne dépend JAMAIS d'un état de survol ou de focus
      (quatrième signalement de la règle : le survol met en valeur, il ne
      révèle rien). La passe de labels de webgl.ts ne doit contenir aucune
      référence au survol, et chaque add() passe une opacité littérale.

   Usage : npm run check:labels */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ATLAS = fileURLToPath(new URL('../src/atlas', import.meta.url));

const errors: string[] = [];

// --- 1. Les sites d'appel de add() -----------------------------------------

/* DEUX moteurs depuis le multi-vues : la vue fixe et la vue libre. Les deux
   passent les mêmes contrôles, un moteur ressuscité n'a pas de passe-droit. */
const ENGINES = ['webgl.ts', 'webgl-orbit.ts'];
const webgl = ENGINES.map((f) => readFileSync(`${ATLAS}/${f}`, 'utf8')).join('\n');

/* On repère chaque appel `add(` puis on lit son deuxième argument. L'analyse
   est volontairement naïve : les appels sont sur une ou plusieurs lignes, mais
   les arguments sont simples. Si la forme du code change au point de casser ce
   parseur, c'est le moment de re-regarder les labels de toute façon. */
const callSites = [...webgl.matchAll(/\badd\(\s*([\s\S]{0,200}?)\)/g)];
// Plus d'ensembles (ADR-053) : familles et genres seulement, noms nus.
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

// --- 2. L'opacité ne dépend jamais du survol ni du focus ---------------------

/* On isole la passe de labels : de sa déclaration au marqueur de section
   suivant. Toute mention du survol dedans est une régression de la règle.
   Le focus a le droit d'AJOUTER des noms (le sous-arbre courant est nommé),
   jamais d'en moduler l'opacité : on vérifie donc aussi que chaque add()
   passe l'opacité 1, littérale. */
for (const engine of ENGINES) {
  const source = readFileSync(`${ATLAS}/${engine}`, 'utf8');
  const start = source.indexOf('const projectLabels');
  const end = source.indexOf('rendu', start);
  if (start < 0 || end < 0) {
    errors.push(`${engine} : la passe de labels est introuvable, le contrôle est cassé.`);
    continue;
  }
  const pass = source.slice(start, end);
  if (/hover/i.test(pass)) {
    errors.push(
      `${engine} : la passe de labels mentionne le survol. ` +
        'Le survol met en valeur, il ne révèle ni ne masque JAMAIS un nom.'
    );
  }
  /* L'opacité est LITTÉRALE à chaque site d'appel : la position de
     l'argument diffère entre moteurs, on exige simplement qu'aucun argument
     d'opacité ne soit une expression. Repérage : l'argument juste après le
     genre ('family'/'genre'/'ensemble'/lhWorld) qui n'est ni un nombre ni
     un identifiant simple de slot déclenche l'erreur s'il contient un
     opérateur ou un accès d'état. */
  for (const call of pass.matchAll(/\badd\(\s*([\s\S]{0,260}?)\)/g)) {
    const args = (call[1] ?? '').split(',').map((p) => p.trim());
    for (const arg of args) {
      if (/hovered|highlighted/.test(arg)) {
        errors.push(`${engine} : un add() de label lit l'état de survol : « ${arg} ».`);
      }
    }
    const suspicious = args.filter((a) => /opacity|\?\s*1\s*:/.test(a));
    for (const a of suspicious) {
      errors.push(`${engine} : un label reçoit une opacité calculée (« ${a} »).`);
    }
  }
}

// --- 3. Les marqueurs de l'ancien suffixe -----------------------------------

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
