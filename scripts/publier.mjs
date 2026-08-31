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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CONTROLES = [
  ['compilation', 'npx tsc --noEmit'],
  ['corpus', 'npm run validate:data --silent'],
  ['css', 'npm run check:css --silent'],
  ['camera', 'npm run check:camera --silent'],
  ['cadrage', 'npm run check:cadrage --silent'],
  ['constantes', 'npm run check:constantes --silent'],
  /* BLOQUANT DEPUIS QUE SA DETECTION EST JUSTE. Il est reste rouge pendant des
     jours parce qu'il accusait a tort : il enumerait des FORMES d'appel et
     manquait l'import dynamique, l'import sur plusieurs lignes et l'usage
     comme valeur. Un controle qu'on peut ignorer finit par etre ignore, et un
     controle qui crie a tort se fait desactiver. Repare, il entre ici. */
  ['exports', 'npm run check:exports --silent'],
  ['ecritures', 'npm run check:ecritures --silent'],
  ['tirets', 'npm run check:tirets --silent'],
  /* VENU DU DEPLOIEMENT, ou il ne pouvait pas passer : il sonde YouTube et
     YouTube bloque les adresses de centre de donnees. Il a bloque un commit
     valide, le site a servi l'ancien bundle, et rien ne l'a dit.
     Ici il fonctionne : trois sondes sur trois, en quelques secondes.

     ET SON ARRIVEE CORRIGE UN ECART PLUS GRAVE : cette barriere lancait dix
     controles quand le deploiement en lancait douze. Deux listes pour une
     seule notion de « pret a publier », c'est le motif des deux sources de
     verite, et il m'a coute exactement ce qu'il coute toujours. */
  ['plafond', 'npm run check:plafond --silent'],
  /* LES CINQ QUI MANQUAIENT, ET CE N'EST PAS UNE OMISSION SANS SUITE.

     Le deploiement lancait matcher, labels, writes, nature et superposition ;
     cette barriere ne les lancait pas. Elle a donc autorise une publication
     que le deploiement a refusee : quinze commits pousses, le site restant
     sur l'ancienne version, et rien pour le dire sur le moment.

     C'est le MEME defaut qu'en aout, quand le plafond vivait cote deploiement
     et pas ici. On avait alors ecrit, dans ce fichier meme, que deux listes
     pour une seule notion de « pret a publier » etaient le motif des deux
     sources de verite. La lecon avait ete tiree dans un sens et pas dans
     l'autre : on avait rapatrie le controle manquant sans verifier qu'il
     etait le seul.

     LA REGLE MAINTENANT : cette liste doit contenir TOUT ce que le
     deploiement lance. Un controle ajoute a .github/workflows/deploy.yml et
     pas ici rouvre exactement la meme porte. */
  ['matcher', 'npm run check:matcher --silent'],
  ['labels', 'npm run check:labels --silent'],
  ['writes', 'npm run check:writes --silent'],
  ['nature', 'npm run check:nature --silent'],
  ['superposition', 'npm run check:superposition --silent'],
  ['construction', 'npm run build --silent']
];

/* LA BARRIERE VERIFIE QU'ELLE COUVRE LE DEPLOIEMENT, et elle le fait toute
   seule.

   Rapatrier les cinq controles manquants a la main reglait le cas du jour,
   pas la cause : rien n'empechait le prochain controle ajoute au deploiement
   d'etre absent d'ici, et c'est deja arrive deux fois. Une comparaison faite
   par un humain une fois est une comparaison qui derive.

   On lit donc le fichier de deploiement au moment de publier, et on REFUSE
   si l'une de ses etapes n'a pas d'equivalent dans cette liste. La divergence
   devient impossible a introduire sans que la publication s'arrete dessus. */
const DEPLOIEMENT = fileURLToPath(new URL('../.github/workflows/deploy.yml', import.meta.url));

function verifierCouverture() {
  let yml;
  try {
    yml = readFileSync(DEPLOIEMENT, 'utf8');
  } catch {
    /* Pas de fichier de deploiement : rien a couvrir, on continue. */
    return;
  }
  const attendus = [...yml.matchAll(/run:\s*npm run ([a-z:]+)/g)]
    .map((m) => m[1])
    .filter((x) => x !== 'build');
  const lances = CONTROLES.map(([, cmd]) => {
    const m = cmd.match(/npm run ([a-z:]+)/);
    return m ? m[1] : null;
  }).filter(Boolean);
  const manquants = [...new Set(attendus.filter((x) => !lances.includes(x)))];
  if (manquants.length > 0) {
    console.error(
      'PUBLICATION REFUSEE : le deploiement lance des controles que cette\n' +
        "barriere ignore. Elle autoriserait donc une publication que le\n" +
        'deploiement refusera, et le site resterait sur son ancienne version\n' +
        'sans que rien ne le dise.\n\n' +
        manquants.map((c) => `  ${c}`).join('\n') +
        '\n\n  Les ajouter a CONTROLES, dans ce fichier.\n'
    );
    process.exit(1);
  }
}

verifierCouverture();

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
