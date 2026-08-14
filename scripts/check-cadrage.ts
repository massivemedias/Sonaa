/* GARDE-FOU : TOUT RECADRAGE A UNE FIN DÉCLARÉE.
 *
 * UNE RÈGLE QUE J'AI VIOLÉE DEUX FOIS N'EST PAS UNE RÈGLE, C'EST UN SOUHAIT.
 *
 * « Le cadrage est un geste, pas un asservissement permanent. » Je l'ai écrite
 * après avoir cherché six tours une carte qui dérivait à chaque clic. Trois
 * jours plus tard, en corrigeant un débordement, j'ai réintroduit exactement le
 * même défaut sous une autre forme : un bloc qui recentrait la caméra à chaque
 * image, indéfiniment. La règle était écrite, relue, citée dans des rapports,
 * et elle n'a pas empêché sa propre violation.
 *
 * D'où ce contrôle. Il ne juge pas ce que le recadrage FAIT, il exige qu'il
 * dise QUAND IL S'ARRÊTE.
 *
 * Un geste a trois choses : un début, une fin, et une durée déclarée. Un
 * asservissement n'a que le début, et c'est ce qui le rend invisible : rien
 * dans le code ne dit « ceci ne s'arrêtera jamais », il faut le déduire de
 * l'absence d'une condition, et on ne remarque pas une absence.
 *
 * CE QU'IL ACCEPTE COMME FIN :
 *   - une comparaison de temps écoulé, `now - depart < DUREE_MS` ;
 *   - une constante en _MS dans la garde ;
 *   - un drapeau à un coup, remis à faux par le bloc lui-même.
 *
 * Usage : npm run check:cadrage
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MOTEUR = fileURLToPath(new URL('../src/atlas/webgl-orbit.ts', import.meta.url));
const source = readFileSync(MOTEUR, 'utf8');

const debut = source.indexOf('const avancer = (now: number): void => {');
if (debut < 0) {
  console.error('CADRAGE : la boucle de rendu est introuvable.');
  process.exit(1);
}
const fin = source.indexOf('\n  };', debut);
const lignes = source.slice(debut, fin > 0 ? fin : source.length).split('\n');
const ligneDepart = source.slice(0, debut).split('\n').length;

/* Ce qui constitue un recadrage : une ecriture sur la cible ou la distance de
   la camera. L'orientation n'y est pas : elle ne se corrige jamais toute
   seule dans ce moteur, seuls les gestes la touchent. */
const RECADRAGE = /\b(target|targetSmooth)\.(copy|set|lerp|add|addScaledVector)\b|\bdistance\s*(=[^=]|\+=|-=|\*=)/;

/* Ce qui n'est pas un recadrage continu : un vol, qui a sa propre fin, et
   l'inertie, qui decroit vers zero. */
const HORS_SUJET = /flying|startFly|Vel|traceDistance|Math\.exp\(dolly|recenter|setOrbit|pinch/i;

/* Ce qui declare une FIN : un temps ecoule, une duree nommee, ou un drapeau a
   un coup. */
const FIN_DECLAREE = /now\s*-\s*\w+\s*<|\b\w+_MS\b|cadrageOuvert|une seule fois|un coup/i;

interface Bloc {
  ligne: number;
  texte: string;
  garde: string;
  bornee: boolean;
}

const blocs: Bloc[] = [];

lignes.forEach((ligne, i) => {
  const nu = ligne.trim();
  if (nu.startsWith('//') || nu.startsWith('*') || nu.startsWith('/*')) return;
  if (!RECADRAGE.test(nu)) return;

  const contexte = lignes.slice(Math.max(0, i - 25), i + 1).join('\n');
  if (HORS_SUJET.test(nu) || HORS_SUJET.test(contexte)) return;

  /* La garde : la condition `if` la plus proche au-dessus, moins indentee que
     la ligne qui ecrit. C'est elle qui doit porter la fin. */
  /* TOUTE LA CHAINE DE GARDES, pas seulement la plus proche.

     Premiere version : on ne lisait que le `if` immediatement au-dessus. Or la
     duree qui borne un bloc vit souvent sur le `if` EXTERIEUR, cent lignes plus
     haut, tandis que le `if` interieur ne porte qu'une condition de contenu.
     Le controle accusait donc un bloc parfaitement borne, ce qui aurait fait
     exactement ce qu'on lui reproche a lui : crier a tort, donc se faire
     ignorer. On remonte desormais toute la chaine d'englobants. */
  const indentEcriture = ligne.length - ligne.trimStart().length;
  const gardes: string[] = [];
  let indentCourante = indentEcriture;
  for (let j = i - 1; j >= 0; j -= 1) {
    const l = lignes[j] ?? '';
    if (l.trim().length === 0) continue;
    const indent = l.length - l.trimStart().length;
    if (indent < indentCourante && /^\s*(if|for|while)\s*\(/.test(l)) {
      gardes.push(l.trim());
      indentCourante = indent;
      if (indent <= 4) break;
    }
  }
  const garde = gardes.join('  <-  ') || '(aucune garde trouvee)';

  blocs.push({
    ligne: ligneDepart + i,
    texte: nu.length > 80 ? `${nu.slice(0, 78)}…` : nu,
    garde: garde || '(aucune garde trouvee)',
    bornee: FIN_DECLAREE.test(garde) || FIN_DECLAREE.test(contexte)
  });
});

const sansFin = blocs.filter((b) => !b.bornee);

if (sansFin.length > 0) {
  console.error(`\nCADRAGE SANS FIN : ${sansFin.length} ecriture(s) sur la camera sans duree declaree.\n`);
  for (const b of sansFin) {
    console.error(`  ligne ${b.ligne} : ${b.texte}`);
    console.error(`    garde : ${b.garde}\n`);
  }
  console.error(
    "  Un recadrage a un DEBUT, une FIN et une DUREE DECLAREE. Un asservissement n'a que\n" +
      "  le debut, et rien dans le code ne dit qu'il ne s'arretera jamais : il faut le\n" +
      "  deduire d'une absence, et on ne remarque pas une absence.\n\n" +
      "  Cette regle a ete ecrite apres six tours de recherche, puis violee trois jours\n" +
      "  plus tard en corrigeant autre chose. D'ou ce controle.\n\n" +
      '  Ajouter a la garde un temps ecoule, une constante en _MS, ou un drapeau a un coup.\n'
  );
  process.exit(1);
}

console.log(
  `Cadrage : ${blocs.length} ecriture(s) de recadrage, toutes bornees par une duree declaree.`
);
