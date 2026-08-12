/* AUCUNE SPHÈRE VISIBLE NE DOIT EN CHEVAUCHER UNE AUTRE.

   ═══ CE QUE CE CONTRÔLE AURAIT ÉVITÉ ═══

   Un scintillement a été signalé six fois et cherché cinq fois au mauvais
   endroit. La cause était géométrique : en vue d'ensemble, les 130 genres de
   profondeur 2 et plus sont repliés EXACTEMENT sur leur ancêtre, ce qui fait
   499 paires de sphères à distance 0.000. Deux surfaces confondues, le GPU
   ne peut pas trancher laquelle est devant, et son arbitrage change à chaque
   image.

   Le repli lui-même est VOULU, et ce contrôle ne le remet pas en cause :
   écarter ces sphères ferait passer la vue d'ensemble de 88 à 218 corps,
   soit 148 % de plus, et détruirait la lecture en système solaire. La
   superposition est inoffensive tant que les sphères repliées sont
   invisibles.

   Le défaut était donc dans le SEUIL D'APPARITION. Le moteur cachait bien
   ces sphères, son commentaire disait même que les montrer « ferait des
   sphères doubles », mais il les révélait dès 12,5 % du déploiement, quand
   elles n'avaient parcouru que 12,5 % du chemin. Mesuré sur Bristol Sound :
   séparation réelle 0,59 pour une marge nécessaire de 1,97.

   Un garde-fou mal réglé est plus trompeur qu'un garde-fou absent : on le
   lit, on le croit suffisant, et on cherche ailleurs pendant trois jours.

   ═══ CE QUE CE FICHIER VÉRIFIE ═══

   Pour chaque sphère repliée, le déploiement auquel elle devient visible,
   puis la distance qui la sépare alors de son ancêtre. Cette distance doit
   dépasser la somme des deux rayons : au-delà, les surfaces ne peuvent plus
   se couper, quel que soit l'angle de la caméra.

   Usage : npm run check:superposition */

import { STRUCTURES } from '../src/atlas/structures.ts';

interface Genre {
  id: string;
  label: string;
  depth: number;
  parent: number;
  radius: number;
  compact: [number, number, number];
  deployed: [number, number, number];
}

const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

/* LA FORMULE DU MOTEUR, RECOPIÉE ICI. C'est volontaire : si quelqu'un la
   change dans webgl-orbit.ts sans toucher à ce fichier, les deux divergent
   et le contrôle échoue en le disant. Un contrôle qui importerait la vraie
   formule validerait n'importe quel réglage, y compris un mauvais. */
const presence = (parcouru: number, marge: number): number =>
  marge <= 0.001 ? 1 : clamp((parcouru - marge) / marge, 0, 1);

const erreurs: string[] = [];
let repliees = 0;
let verifiees = 0;
let pireMarge = Infinity;
let pireNom = '';

for (const famille of STRUCTURES as unknown as { genres: Genre[] }[]) {
  for (const g of famille.genres) {
    if (g.depth < 2) continue;
    repliees += 1;

    const parent = famille.genres[g.parent];
    if (!parent) continue;

    const trajet = Math.hypot(
      g.deployed[0] - g.compact[0],
      g.deployed[1] - g.compact[1],
      g.deployed[2] - g.compact[2]
    );
    const marge = g.radius + parent.radius;

    /* LE CAS QUI REND LE CONTRÔLE AVEUGLE. Une sphère dont le trajet est plus
       court que la marge ne pourra JAMAIS s'écarter assez : elle chevauchera
       son ancêtre même entièrement déployée. C'est un défaut de layout, pas
       de seuil, et il doit se voir. */
    if (trajet <= marge) {
      erreurs.push(
        `${g.label} ne peut pas s'ecarter assez de ${parent.label} : trajet ${trajet.toFixed(2)}, ` +
          `marge necessaire ${marge.toFixed(2)}. Meme entierement deployee elle chevauche son ancetre.`
      );
      continue;
    }

    /* Le premier instant où le moteur la montre. On balaie finement plutôt
       que d'inverser la formule : l'inverse d'une formule qu'on veut tester
       est le meilleur moyen de tester son inverse au lieu d'elle. */
    let pVisible = -1;
    for (let p = 0; p <= 1.0001; p += 0.001) {
      if (presence(trajet * p, marge) > 0.01) {
        pVisible = p;
        break;
      }
    }
    if (pVisible < 0) continue; // jamais visible, donc jamais superposee

    const separation = trajet * pVisible;
    verifiees += 1;
    const rapport = separation / marge;
    if (rapport < pireMarge) {
      pireMarge = rapport;
      pireNom = `${g.label} sous ${parent.label}`;
    }

    if (separation < marge) {
      erreurs.push(
        `${g.label} devient visible a ${(pVisible * 100).toFixed(0)} % du deploiement, ` +
          `separee de ${separation.toFixed(2)} seulement, alors que ${marge.toFixed(2)} est ` +
          `necessaire pour que les surfaces ne se coupent plus. Superposition VISIBLE.`
      );
    }
  }
}

/* ------------------------------------------------------------- verdict */

if (erreurs.length > 0) {
  console.error(`\nSUPERPOSITION : ${erreurs.length} sphere(s) visible(s) en chevauchent une autre.\n`);
  for (const e of erreurs.slice(0, 12)) console.error('  - ' + e);
  if (erreurs.length > 12) console.error(`  ... et ${erreurs.length - 12} autres.`);
  console.error(
    '\nDeux surfaces confondues font scintiller le rendu : le GPU tranche\n' +
      "differemment a chaque image. Corriger le SEUIL d'apparition dans\n" +
      'webgl-orbit.ts, pas le repli lui-meme, qui est voulu.'
  );
  process.exit(1);
}

/* Rendre « rien a signaler » sans avoir rien mesure est le defaut que ce
   projet traque partout ailleurs : on dit donc ce qui a ete verifie. */
if (verifiees === 0) {
  console.error(
    "SUPERPOSITION : aucune sphere n'a pu etre verifiee. Le layout a change " +
      "de forme, ou les positions sont vides : ce controle ne prouve plus rien."
  );
  process.exit(1);
}

console.log(
  `Superposition : ${repliees} spheres repliees, ${verifiees} verifiees a leur ` +
    `apparition, aucune ne chevauche son ancetre.\n` +
    `  La plus juste : ${pireNom}, ecartee de ${pireMarge.toFixed(2)} fois la marge necessaire.`
);
