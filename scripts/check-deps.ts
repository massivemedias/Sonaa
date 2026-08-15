/* GARDE-FOU : UNE DÉPENDANCE DE DÉVELOPPEMENT EN PRODUCTION.
 *
 * Playwright a été installé par mégarde en dépendance de production (npm
 * install sans -D depuis un script de test). Le bundle en ligne n'utilise pas
 * ces paquets, mais ils traînent dans node_modules, et npm audit les compte.
 * Plus grave : un `npm ci --production` les installerait, ce qui gonfle le
 * déploiement et peut casser si le paquet a des binaires natifs.
 *
 * Ce script échoue si une dépendance connue pour être de développement se
 * retrouve en production. La liste est explicite et non heuristique : mieux
 * vaut ajouter un cas que rater un faux négatif.
 *
 * Usage : npm run check:deps
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(`${RACINE}/package.json`, 'utf-8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const deps = Object.keys(pkg.dependencies ?? {});

const DEV_PATTERNS: RegExp[] = [
  /^@types\//,
  /^typescript$/,
  /^tsx$/,
  /^vite$/,
  /^@vitejs\//,
  /^vite-plugin-/,
  /^playwright/,
  /^@playwright\//,
  /^eslint/,
  /^@eslint\//,
  /^prettier$/,
  /^@prettier\//,
  /^jest$/,
  /^@jest\//,
  /^vitest$/,
  /^@vitest\//,
  /^mocha$/,
  /^chai$/,
  /^sinon$/,
  /^cypress$/,
  /^puppeteer/,
  /^@testing-library\//,
  /^webpack$/,
  /^webpack-/,
  /^rollup$/,
  /^@rollup\//,
  /^esbuild$/,
  /^swc$/,
  /^@swc\//,
  /^babel$/,
  /^@babel\//,
  /^postcss$/,
  /^autoprefixer$/,
  /^tailwindcss$/,
  /^sass$/,
  /^less$/,
  /^stylus$/,
];

const erreurs: string[] = [];

for (const dep of deps) {
  for (const pattern of DEV_PATTERNS) {
    if (pattern.test(dep)) {
      erreurs.push(`  ${dep} (pattern: ${pattern.source})`);
      break;
    }
  }
}

if (erreurs.length > 0) {
  console.error('❌ Dépendances de développement trouvées en production :\n');
  for (const e of erreurs) console.error(e);
  console.error('\n→ Déplacer vers devDependencies ou retirer.\n');
  process.exit(1);
} else {
  console.log('✓ Aucune dépendance de développement en production.');
}
