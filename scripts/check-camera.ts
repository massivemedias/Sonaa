/* GARDE-FOU : UNE SEULE CORRECTION CONTINUE SUR LA CAMÉRA.
 *
 * POURQUOI CE CONTRÔLE EXISTE, et pourquoi il est statique.
 *
 * Deux fois en deux jours, la carte s'est mise à dériver sans qu'on ait rien
 * demandé. Les deux fois, la cause était la même : DEUX mécanismes corrigeaient
 * la caméra à chaque image, chacun vers sa propre idée du bon cadrage, et ils
 * se tiraient dessus. Le premier ramenait la cible sur le centre de la famille,
 * le second la recentrait sur le groupe déployé.
 *
 * CE MOTIF EST INVISIBLE À LA LECTURE, et c'est ce qui le rend redoutable :
 * chaque correcteur, pris seul, est parfaitement raisonnable. On ne peut le
 * voir qu'en les comptant, ce que personne ne fait spontanément parce qu'il
 * faut d'abord soupçonner qu'il y en a plusieurs.
 *
 * Un contrôle au navigateur ne l'attraperait qu'en le reproduisant. Celui-ci
 * le rend structurellement impossible : toute écriture sur l'état de caméra
 * DANS la boucle de rendu doit être déclarée ici, avec sa raison. Une écriture
 * non déclarée fait échouer la CI, et il faut alors se demander si elle doit
 * exister, pas comment la faire passer.
 *
 * Usage : npm run check:camera
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MOTEUR = fileURLToPath(new URL('../src/atlas/webgl-orbit.ts', import.meta.url));
const source = readFileSync(MOTEUR, 'utf8');

/* L'ÉTAT DE CAMÉRA, c'est-à-dire ce dont un mouvement non demandé peut venir.
   `azVel` et consorts en sont exclus : ce sont des vitesses d'inertie, elles
   décroissent vers zéro et ne poursuivent aucune cible. */
const ETAT = ['distance', 'target', 'targetSmooth', 'azimuth', 'elevation'];

/* LES CORRECTIONS CONTINUES AUTORISÉES, avec leur raison d'être. Il ne doit y
   en avoir QU'UNE. Toute ligne de la boucle qui écrit l'état de caméra sans
   correspondre à l'une de ces empreintes fait échouer le contrôle. */
const AUTORISEES: { empreinte: RegExp; nom: string; raison: string }[] = [
  {
    empreinte: /LE GROUPE TIENT, MAIS IL EST DECENTRE|SEUIL A 1,00|debordement|recentre/i,
    nom: 'cadrage du mode focus',
    raison:
      "recentre et recule pour que l'arbre tienne dans le cadre. C'est la SEULE correction continue autorisee."
  }
];

/* Ce qui n'est PAS une correction continue, et n'a donc pas à être déclaré :
   un vol a un début et une fin, l'inertie décroît vers zéro, et le
   redimensionnement répond à un événement. */
const GESTES = [
  /traceDistance\.push/,          // journal de diagnostic, il LIT la valeur
  /azimuth \+= azVel/,            // application de l'inertie, elle decroit vers zero
  /elevation \+ elVel/,
  /Math\.exp\(dollyVel/,
  /flying/,
  /startFly/,
  /applyOrientation/,
  /const resize =/,
  /pinch/i,
  /dragV/,
  /Vel [-+*]?=/,
  /tapZoom/,
  /recenter/,
  /setOrbit/
];

/* Le corps de la boucle de rendu : de `const avancer =` à sa fermeture, au
   niveau d'indentation deux. Découpage naïf assumé, comme pour le contrôle des
   labels : si la forme du code change au point de le casser, c'est le moment
   de re-regarder la camera de toute facon. */
const debut = source.indexOf('const avancer = (now: number): void => {');
if (debut < 0) {
  console.error("CAMERA : la boucle de rendu est introuvable, le controle ne peut rien verifier.");
  process.exit(1);
}
const fin = source.indexOf('\n  };', debut);
const boucle = source.slice(debut, fin > 0 ? fin : source.length);
const lignesBoucle = boucle.split('\n');
const ligneDepart = source.slice(0, debut).split('\n').length;

interface Ecriture {
  ligne: number;
  texte: string;
  contexte: string;
}

const ecritures: Ecriture[] = [];

lignesBoucle.forEach((ligne, i) => {
  const nu = ligne.trim();
  if (nu.startsWith('//') || nu.startsWith('*') || nu.startsWith('/*')) return;

  const ecrit = ETAT.some((nom) => {
    const affectation = new RegExp(`\\b${nom}\\s*(=[^=]|\\+=|-=|\\*=)`);
    const methode = new RegExp(`\\b${nom}\\.(copy|set|lerp|add|addScaledVector|sub|multiplyScalar)\\b`);
    return affectation.test(nu) || methode.test(nu);
  });
  if (!ecrit) return;

  /* Les vingt lignes qui précèdent servent de contexte : un correcteur
     continu porte son commentaire juste au-dessus, c'est la convention du
     projet et elle est ici mise à profit. */
  const contexte = lignesBoucle.slice(Math.max(0, i - 20), i + 1).join('\n');
  if (GESTES.some((g) => g.test(contexte) || g.test(nu))) return;

  ecritures.push({ ligne: ligneDepart + i, texte: nu, contexte });
});

const declarees = new Set<string>();
const orphelines: Ecriture[] = [];

for (const e of ecritures) {
  const trouvee = AUTORISEES.find((a) => a.empreinte.test(e.contexte));
  if (trouvee) declarees.add(trouvee.nom);
  else orphelines.push(e);
}

const erreurs: string[] = [];

if (declarees.size > 1) {
  erreurs.push(
    `DEUX CORRECTIONS CONTINUES OU PLUS agissent sur la camera : ${[...declarees].join(', ')}.\n` +
      "    Elles se tireront dessus, chacune vers sa propre idee du bon cadrage, et la carte\n" +
      "    derivera sans que personne ne l'ait demande. C'est arrive deux fois."
  );
}

if (orphelines.length > 0) {
  erreurs.push(
    `${orphelines.length} ecriture(s) NON DECLAREE(S) sur l'etat de camera, dans la boucle de rendu :\n` +
      orphelines.map((o) => `      ligne ${o.ligne} : ${o.texte}`).join('\n') +
      '\n    Si c\'est une correction continue, la declarer dans AUTORISEES avec sa raison,\n' +
      "    APRES s'etre demande si elle doit coexister avec celle qui existe deja.\n" +
      "    Si c'est un geste ponctuel, l'ecrire de facon a ce que le controle le reconnaisse."
  );
}

if (erreurs.length > 0) {
  console.error('\nCAMERA : ' + erreurs.length + ' probleme(s).\n');
  for (const e of erreurs) console.error('  - ' + e + '\n');
  process.exit(1);
}

console.log(
  `Camera : ${lignesBoucle.length} lignes de boucle lues, ${ecritures.length} ecriture(s) sur l'etat, ` +
    `${declarees.size} correction continue declaree (${[...declarees].join(', ') || 'aucune'}).`
);
