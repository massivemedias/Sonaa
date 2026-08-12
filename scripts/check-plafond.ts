/* LE GARDE-FOU DU GARDE-FOU.

   Le plafond de quinze minutes a cessé de mordre sans que rien ne le dise.
   Il n'est pas tombé en panne bruyamment : l'expression qui lit la durée
   dans la page de résultats a cessé de correspondre, `seconds` est devenu
   `null` partout, et `isFullRelease` ne rejette QUE sur une durée connue.
   Résultat : un contrôle qui rendait toujours « rien à signaler », et
   quarante-cinq intégrales d'album entrées dans le corpus.

   Ce fichier vérifie DEUX choses, et la seconde est la vraie leçon :

   1. Que la règle rejette ce qu'elle doit rejeter. Cas de table, sans
      réseau : titres marqueurs, durées au-dessus et en dessous du plafond,
      exceptions nommées.

   2. QUE LA DURÉE ARRIVE ENCORE. Un appel réseau réel sur une vidéo dont
      la durée est connue et stable. Si l'extraction se remet à rendre
      `null`, ce contrôle échoue et la CI s'arrête. C'est exactement
      l'alerte qui a manqué : la règle était juste, c'est sa DONNÉE
      D'ENTRÉE qui avait disparu.

   Usage : npm run check:plafond
           npm run check:plafond -- --hors-ligne   (saute le point 2) */

import { isFullRelease, MAX_TRACK_SECONDS, searchYouTube } from './lib/match.ts';

const erreurs: string[] = [];
const HORS_LIGNE = process.argv.includes('--hors-ligne');

/* ---------------------------------------------- 1. La règle, sans réseau */

interface Cas {
  titre: string;
  secondes: number | null;
  exempt?: boolean;
  attendu: boolean;
  pourquoi: string;
}

const CAS: readonly Cas[] = [
  // Les marqueurs de parution, quelle que soit la durée.
  { titre: 'Artist - Album Name (Full Album)', secondes: 200, attendu: true, pourquoi: 'marqueur full album' },
  { titre: 'Various - Compilation 1995', secondes: 120, attendu: true, pourquoi: 'marqueur compilation' },
  { titre: 'DJ Mix continuous mix', secondes: 300, attendu: true, pourquoi: 'marqueur continuous mix' },
  { titre: 'Album completo de la banda', secondes: 100, attendu: true, pourquoi: 'marqueur en espagnol' },

  // Le plafond de durée.
  { titre: 'Artist - Track', secondes: MAX_TRACK_SECONDS + 1, attendu: true, pourquoi: 'une seconde au-dessus du plafond' },
  { titre: 'Artist - Track', secondes: MAX_TRACK_SECONDS, attendu: false, pourquoi: 'pile au plafond, accepté' },
  { titre: 'Artist - Track', secondes: 240, attendu: false, pourquoi: 'quatre minutes, accepté' },

  // Les vrais cas qui sont passés pendant la panne.
  { titre: 'Bernard Parmegiani: De Natura Sonorum (1975)', secondes: 2905, attendu: true, pourquoi: 'De Natura Sonorum, 48 min' },
  { titre: 'Noisekick & Paranoizer - Terrordrang', secondes: 8555, attendu: true, pourquoi: 'Terrordrang, 142 min' },
  { titre: 'Charlotte de Witte - Formula', secondes: 5346, attendu: true, pourquoi: 'Formula, EP de 89 min' },

  // Les exceptions nommées, et leur limite.
  { titre: 'Brian Eno - 1/1', secondes: 1042, exempt: true, attendu: false, pourquoi: 'exception nommée, 17 min' },
  { titre: 'Brian Eno - 1/1 (Full Album)', secondes: 1042, exempt: true, attendu: true, pourquoi: 'un marqueur prime sur une exception' },

  /* LE PIÈGE QUI A LAISSÉ PASSER QUARANTE-CINQ ALBUMS. Durée inconnue et
     titre sans marqueur : la règle ne PEUT pas rejeter, elle n'a rien pour
     décider. C'est le comportement correct de la fonction, et c'est
     pourquoi le contrôle réseau ci-dessous existe : il vérifie que ce cas
     reste théorique. */
  { titre: 'Artist - Some Very Long Piece', secondes: null, attendu: false, pourquoi: 'durée inconnue, la règle est aveugle' }
];

for (const c of CAS) {
  const obtenu = isFullRelease(c.titre, c.secondes, c.exempt ?? false);
  if (obtenu !== c.attendu) {
    erreurs.push(
      `Règle : « ${c.pourquoi} » devrait ${c.attendu ? 'être rejeté' : 'passer'}, ` +
        `isFullRelease a rendu ${obtenu}.`
    );
  }
}

/* ------------------------------------- 2. La durée arrive-t-elle encore ? */

/* Trois vidéos aux durées connues, stables et très différentes. On ne
   vérifie pas la valeur exacte, qui dépendrait d'un montage : on vérifie
   que la durée EST LUE, et qu'elle tombe dans une fourchette plausible.
   Une seule suffirait ; trois évitent qu'une vidéo retirée fasse échouer
   la CI pour rien. */
const SONDES: readonly { requete: string; minSec: number; maxSec: number }[] = [
  { requete: 'Rammstein Sonne official video', minSec: 180, maxSec: 360 },
  { requete: 'Daft Punk Around The World official', minSec: 180, maxSec: 500 },
  { requete: 'Kraftwerk Autobahn full', minSec: 120, maxSec: 3000 }
];

/* UNE SECONDE TENTATIVE AVANT D'ACCUSER.

   Ce contrôle a fait échouer une publication qui ne touchait pas au corpus :
   les trois sondes n'avaient rien rendu sur le runner, et le même contrôle
   rejoué dans la minute rendait trois durées sur trois. La cause n'était pas
   l'extraction mais le transport, qui répond ou ne répond pas selon le moment
   et l'adresse appelante.

   Un contrôle qui bloque des publications sans rapport avec lui détruit la
   confiance dans toute la chaîne : on finit par le contourner, et le jour où
   il a raison personne ne l'écoute. On lui laisse donc une seconde chance,
   après une pause, avant de conclure. Ce qu'il protège reste intact : il
   n'échoue toujours que si AUCUNE sonde ne rend de durée, deux fois de
   suite. */
const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const sonder = async (): Promise<{ lues: number; detail: string[] }> => {
  let lues = 0;
  const detail: string[] = [];
  for (const s of SONDES) {
    const hits = await searchYouTube(s.requete, 4);
    const avecDuree = hits.filter((h) => h.seconds != null);
    if (avecDuree.length > 0) {
      lues += 1;
      const sec = avecDuree[0]?.seconds ?? 0;
      detail.push(`${s.requete.slice(0, 28)} : ${Math.floor(sec / 60)} min ${sec % 60} s`);
    } else {
      detail.push(`${s.requete.slice(0, 28)} : AUCUNE DURÉE`);
    }
  }
  return { lues, detail };
};

if (!HORS_LIGNE) {
  let { lues, detail } = await sonder();

  if (lues === 0) {
    console.log('Aucune durée au premier passage. Seconde tentative dans 20 s.');
    await dormir(20000);
    ({ lues, detail } = await sonder());
  }

  if (lues === 0) {
    erreurs.push(
      "LA DURÉE N'EST PLUS LUE. Aucune des trois sondes n'a rendu de durée, " +
        'DEUX FOIS DE SUITE à vingt secondes d\'intervalle : le ' +
        'plafond de quinze minutes est donc inopérant, et des intégrales ' +
        "d'album vont entrer dans le corpus sans que rien ne le signale. " +
        'Réparer scrape() dans scripts/lib/match.ts avant tout import.\n    ' +
        detail.join('\n    ')
    );
  } else {
    console.log(`Durée lue sur ${lues} sonde(s) sur ${SONDES.length} :`);
    for (const d of detail) console.log('  ' + d);
  }
}

/* ------------------------------------------------------------- verdict */

if (erreurs.length > 0) {
  console.error('\nPLAFOND ANTI-PARUTION : ' + erreurs.length + ' problème(s).\n');
  for (const e of erreurs) console.error('  - ' + e);
  process.exit(1);
}

console.log(
  `Plafond : ${CAS.length} cas de règle conformes` +
    (HORS_LIGNE ? ', contrôle réseau sauté.' : ', et la durée arrive toujours.')
);
