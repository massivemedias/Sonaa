/* GARDE-FOU : UNE FONCTION EXPORTÉE ET APPELÉE NULLE PART.
 *
 * CELUI QUI A LE PLUS COÛTÉ, et de loin.
 *
 * `purgerSiDemande` était écrite, documentée sur trente lignes, exportée, et
 * appelée par personne. Le paramètre `?nocache=1` qu'elle servait n'a donc
 * RIEN FAIT pendant des semaines, alors qu'il était la sortie de secours pour
 * échapper à une version en cache. Des corrections ont très probablement été
 * jugées sur des versions jamais chargées, et plusieurs allers-retours de
 * cette semaine s'expliquent par là.
 *
 * Le défaut est indétectable à la lecture : le fichier qui définit la fonction
 * est parfaitement cohérent, il explique même longuement à quoi elle sert. Ce
 * qui manque n'est pas DANS ce fichier, c'est l'absence d'une ligne ailleurs.
 * On ne remarque pas une absence.
 *
 * Le compilateur ne dit rien non plus : une fonction exportée est publique par
 * définition, et son absence d'appel est légitime pour une bibliothèque. Ici
 * ce n'en est pas une : tout ce qui est exporté doit servir.
 *
 * PAS ENCORE BRANCHE EN CI, ET DELIBEREMENT.
 *
 * Son premier passage rend neuf signalements, et je ne les ai pas tries. Les
 * brancher tels quels ferait echouer toute publication sur des cas dont je ne
 * sais pas s'ils sont des defauts : plusieurs sont des schemas de validation
 * dont l'usage passe par une methode et non par un appel direct, ce que cette
 * heuristique ne voit pas.
 *
 * Un garde-fou qui bloque sur des faux positifs se fait desactiver, et c'est
 * exactement le reproche fait au controle du plafond anti-parution. On le
 * branche APRES le tri, pas avant.
 *
 * Usage : npm run check:exports
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));

const fichiers: string[] = [];
const parcourir = (dossier: string): void => {
  for (const nom of readdirSync(dossier)) {
    if (nom === 'node_modules' || nom === 'dist' || nom.startsWith('.')) continue;
    const chemin = `${dossier}/${nom}`;
    if (statSync(chemin).isDirectory()) parcourir(chemin);
    else if (/\.(ts|tsx|mjs)$/.test(nom)) fichiers.push(chemin);
  }
};
parcourir(`${RACINE}src`);

/* HYPOTHESE : le parcours a trouve des sources a lire.

   Regle posee apres le quatrieme outil faux de la semaine : un controle qui
   ne trouve rien a lire rend un vert parfait, indistinguable d'un controle
   qui a tout lu et n'a rien trouve. C'est le pire des faux verts, parce
   qu'il survit a la suppression de ce qu'il devait surveiller. */
if (fichiers.length === 0) { console.error('EXPORTS : HYPOTHESE TOMBEE, aucune source parcourue.'); process.exit(1); }

parcourir(`${RACINE}scripts`);

const sources = new Map<string, string>();
for (const f of fichiers) sources.set(f, readFileSync(f, 'utf8'));

/* Ce qui a le droit d'être exporté sans être appelé :
   - les TYPES, qui ne s'appellent pas ;
   - les composants React, appelés par le JSX et non par leur nom nu ;
   - les points d'entrée, appelés par le navigateur ou par npm. */
const EXEMPT = /^(type|interface|const [A-Z]\w* =|function [A-Z])/;

interface Orpheline {
  fichier: string;
  nom: string;
  ligne: number;
}

const orphelines: Orpheline[] = [];
let exportsVus = 0;

for (const [fichier, texte] of sources) {
  if (fichier.endsWith('main.tsx')) continue; // point d'entrée
  const lignes = texte.split('\n');

  lignes.forEach((ligne, i) => {
    const m = /^export\s+(?:async\s+)?(?:const|function)\s+([a-z]\w*)/.exec(ligne.trim());
    if (!m?.[1]) return;
    if (EXEMPT.test(ligne.trim().replace(/^export\s+/, ''))) return;
    const nom = m[1];
    exportsVus += 1;

    /* Appelé ailleurs ? On cherche le nom suivi d'une parenthèse, ou importé
       nommément, dans TOUS les autres fichiers. Une occurrence dans son
       propre fichier ne compte pas : une fonction qui ne sert qu'à elle-même
       n'a pas à être exportée. */
    let utilisee = false;
    for (const [autre, contenu] of sources) {
      if (autre === fichier) continue;
      const appel = new RegExp(`\\b${nom}\\s*\\(`);
      const importe = new RegExp(`\\b${nom}\\b[^\\n]*from`);
      if (appel.test(contenu) || importe.test(contenu)) {
        utilisee = true;
        break;
      }
    }
    if (!utilisee) orphelines.push({ fichier: fichier.replace(RACINE, ''), nom, ligne: i + 1 });
  });
}

if (orphelines.length > 0) {
  console.error(`\nEXPORTS ORPHELINS : ${orphelines.length} fonction(s) exportee(s) et appelee(s) nulle part.\n`);
  for (const o of orphelines) {
    console.error(`  ${o.fichier}:${o.ligne}  ${o.nom}()`);
  }
  console.error(
    "\n  Une fonction exportee que personne n'appelle est du code qui a l'air de servir.\n" +
      "  C'est exactement ce qui est arrive a purgerSiDemande : ecrite, documentee sur\n" +
      "  trente lignes, exportee, jamais appelee. Le parametre ?nocache=1 qu'elle servait\n" +
      "  n'a rien fait pendant des semaines, et des corrections ont ete jugees sur des\n" +
      "  versions jamais chargees.\n\n" +
      '  Soit on la branche, soit on la retire. La laisser est le pire des trois.\n'
  );
  process.exit(1);
}

console.log(`Exports : ${exportsVus} fonction(s) exportee(s), toutes appelees quelque part.`);
