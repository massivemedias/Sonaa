/* LA TABLE DES CHEMINS DE STYLES, ECRITE AU BUILD.
 *
 * DEFAUT MESURE LE 21 SEPTEMBRE 2026, ET C'EN EST UN GROS. `chemins.ts`
 * importait `structures.ts` pour traduire /styles/techno/dub-techno/ en
 * ancre, et `main.tsx` importe `chemins.ts` au demarrage. Consequence : le
 * corpus entier, 1254 Ko minifies, entrait dans le bundle d'entree de CHAQUE
 * page du site, soit 72 pour cent de son poids, pour une fonction qui ne lit
 * que des noms de dossiers.
 *
 * Ce script sort la table une fois pour toutes : 234 lignes, une dizaine de
 * kilo-octets, et le corpus reste ou il doit etre, dans le morceau charge a
 * la demande par la page des styles.
 *
 * IL TOURNE AVANT CHAQUE BUILD, et c'est ce qui empeche la table de deriver :
 * elle ne se maintient pas a la main, elle se regenere. Si un genre change de
 * nom, la table suit sans que personne y pense. */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FAMILIES, STRUCTURES } from '../src/atlas/structures.ts';
import { slug } from '../src/lib/chemins.ts';

const SORTIE = fileURLToPath(new URL('../src/data/chemins-styles.json', import.meta.url));

const table: Record<string, string> = {};
FAMILIES.forEach((f, fi) => {
  table[`/styles/${slug(f.label)}/`] = `#/parcourir/${fi}`;
  (STRUCTURES[fi]?.genres ?? []).forEach((g, gl) => {
    table[`/styles/${slug(f.label)}/${slug(g.label)}/`] = `#/parcourir/${fi}/${gl}`;
  });
});

writeFileSync(SORTIE, `${JSON.stringify(table, null, 0)}\n`, 'utf8');
console.log(`Chemins de styles : ${Object.keys(table).length} adresses ecrites dans src/data/chemins-styles.json.`);
