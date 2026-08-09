/* Garde-fou des écritures du corpus (ADR-044).

   fetch-covers a écrasé des données concurrentes deux fois en réécrivant son
   instantané de démarrage. Le module scripts/lib/corpus-store.ts est
   désormais LE SEUL chemin d'écriture : il relit le disque, applique les
   champs possédés ou rejoue une transaction, et n'accepte jamais un objet
   corpus complet.

   Ce contrôle échoue si un script fait autrement :

   1. Aucun fichier de scripts/ hors lib/corpus-store.ts ne contient à la
      fois une référence à corpus.json et un appel writeFileSync.
   2. Aucun fichier ne sérialise un corpus vers writeFileSync directement
      (motif JSON.stringify(corpus ou stringify(fresh hors du module).

   Usage : npm run check:writes */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SCRIPTS = fileURLToPath(new URL('.', import.meta.url));
const STORE = 'lib/corpus-store.ts';

const errors: string[] = [];

const walk = (dir: string, prefix = ''): string[] => {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = `${dir}/${name}`;
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(path).isDirectory()) out.push(...walk(path, rel));
    else if (/\.ts$/.test(name)) out.push(rel);
  }
  return out;
};

for (const rel of walk(SCRIPTS.replace(/\/$/, ''))) {
  if (rel === STORE || rel.startsWith('check-')) continue;
  const content = readFileSync(`${SCRIPTS}/${rel}`, 'utf8');
  const code = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const touchesCorpus = /corpus\.json/.test(code);
  const writes = /writeFileSync\s*\(\s*CORPUS/.test(code);
  if (touchesCorpus && writes) {
    errors.push(
      `${rel} : écrit corpus.json par writeFileSync. Toute écriture passe par ` +
        `scripts/lib/corpus-store.ts (patchTracks ou transaction), sans exception.`
    );
  }
  if (/writeFileSync\s*\([^)]*JSON\.stringify\(\s*corpus\b/.test(code)) {
    errors.push(
      `${rel} : sérialise son instantané de corpus vers le disque. C'est la ` +
        `classe d'erreur qui a écrasé les charnières Windowlicker : interdite.`
    );
  }
}

if (errors.length > 0) {
  for (const e of errors) console.error(`ERREUR ${e}`);
  process.exit(1);
}
console.log('Écritures du corpus : un seul chemin, scripts/lib/corpus-store.ts.');
