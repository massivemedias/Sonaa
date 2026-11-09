/* Garde-fou des labels : le label affiche le NOM SEUL.

   L'information de dérivés vit dans la fiche, jamais dans le label. Un suffixe
   « · 3 » a déjà été pris pour un identifiant technique resté d'un jeu de
   données factice, et il a fallu une capture d'écran pour s'en apercevoir. Ce
   contrôle rend la récidive impossible : il échoue si un site d'appel compose
   le texte d'un label au lieu de passer le nom nu.

   Un contrôle, bloquant en CI (les deux premiers portaient sur le moteur de
   la carte en trois dimensions, supprimé le 9 novembre 2026) :

   1. Dans le moteur, chaque appel à add() doit passer exactement `slot.label`,
      `family.label` ou `anchor.label` comme texte. Ni gabarit, ni
      concaténation, ni appel.
   2. Aucun fichier de src/atlas ne contient les marqueurs de l'ancien
      suffixe : « ♪ », ou un « · » interpolé dans un gabarit de chaîne.
   3. L'OPACITÉ d'un label ne dépend JAMAIS d'un état de survol ou de focus
      (quatrième signalement de la règle : le survol met en valeur, il ne
      révèle rien). La passe de labels du moteur ne doit contenir aucune
      référence au survol, et chaque add() passe une opacité littérale.

   Usage : npm run check:labels */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ATLAS = fileURLToPath(new URL('../src/atlas', import.meta.url));

const errors: string[] = [];

/* LES REGLES 1 ET 2 PORTAIENT SUR LE MOTEUR DE LA CARTE EN TROIS DIMENSIONS,
   supprime le 9 novembre 2026 (ADR-116) : ses appels add() et l'opacite de
   ses labels. Reste la regle 3, qui vaut pour tout src/atlas. */

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
console.log('Labels : aucun ancien suffixe dans src/atlas, nom nu partout.');
