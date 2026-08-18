/* LA BARRIERE DE PUBLICATION : elle REFUSE, elle n'avertit pas.
 *
 * POURQUOI ELLE EXISTE, et c'est un cas reel et recent. Le motif 16 disait de
 * LIRE la sortie des controles avant de publier. Je l'ai lue, et j'ai publie
 * quand meme : l'echec s'imprimait au milieu d'un long flot, la commande
 * enchainait, et le message de publication affirmait « cinq verts » alors que
 * l'un d'eux etait rouge.
 *
 * LA LECON, POSEE PAR MIKA : un verdict qu'on peut ignorer finira par etre
 * ignore. Afficher un echec et continuer, c'est deleguer a la vigilance ce qui
 * devrait etre delegue a la machine, et la vigilance se fatigue.
 *
 * Cette commande ne rend donc pas un avis. Elle sort en code non nul et rien
 * ne se publie. La difference n'est pas de ton, elle est de nature : un
 * avertissement se lit, une barriere s'ouvre ou ne s'ouvre pas.
 *
 * Usage : npm run publier
 */

import { execSync } from 'node:child_process';

const CONTROLES = [
  ['compilation', 'npx tsc --noEmit'],
  ['corpus', 'npm run validate:data --silent'],
  ['css', 'npm run check:css --silent'],
  ['camera', 'npm run check:camera --silent'],
  ['cadrage', 'npm run check:cadrage --silent'],
  ['constantes', 'npm run check:constantes --silent'],
  ['ecritures', 'npm run check:ecritures --silent'],
  ['tirets', 'npm run check:tirets --silent'],
  ['construction', 'npm run build --silent']
];

const echecs = [];

for (const [nom, commande] of CONTROLES) {
  process.stdout.write(`  ${nom.padEnd(14)}`);
  try {
    execSync(commande, { stdio: 'pipe' });
    console.log('ok');
  } catch (e) {
    console.log('ECHEC');
    /* On garde la sortie du controle fautif : un « ECHEC » sans sa raison
       oblige a relancer pour savoir, et c'est le genre de friction qui fait
       contourner un garde-fou. */
    const sortie = [e.stdout?.toString() ?? '', e.stderr?.toString() ?? ''].join('').trim();
    echecs.push({ nom, sortie });
  }
}

console.log('');

if (echecs.length > 0) {
  for (const { nom, sortie } of echecs) {
    console.error(`--- ${nom} ---`);
    console.error(sortie.split('\n').slice(0, 20).join('\n'));
    console.error('');
  }
  console.error(
    `PUBLICATION REFUSEE : ${echecs.length} controle(s) en echec.\n\n` +
      "  Rien n'a ete pousse. Corriger, puis relancer cette commande.\n\n" +
      "  Cette barriere existe parce qu'un verdict affiche a deja ete ignore : un\n" +
      "  echec au milieu d'un long flot se lit et se depasse. Un refus, non.\n"
  );
  process.exit(1);
}

/* LE DEPOT DOIT ETRE PROPRE. Publier avec des modifications non validees
   pousserait un etat different de celui qui vient d'etre verifie. */
const sale = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
if (sale) {
  console.error(
    'PUBLICATION REFUSEE : des modifications ne sont pas validees.\n\n' +
      sale.split('\n').slice(0, 10).map((l) => `  ${l}`).join('\n') +
      "\n\n  Ce qui serait pousse ne serait pas ce qui vient d'etre verifie.\n"
  );
  process.exit(1);
}

console.log('Tous les controles passent, le depot est propre. Publication autorisee.');
execSync('git push origin main', { stdio: 'inherit' });
console.log('\nPousse.');
