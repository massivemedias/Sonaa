/* Le mécanisme du jeu est-il gagnable, et exactement une fois ?

   Quatre questions auxquelles il faut répondre AVANT de dessiner quoi que
   ce soit, parce qu'une réponse fausse rend le jeu ingagnable et que ça ne
   se verrait qu'après des heures de partie :

   1. En détruisant tout ce qui se présente, atteint-on 218 genres ?
   2. Un genre peut-il apparaître deux fois ? (le compte ne tomberait plus juste)
   3. Un genre peut-il n'apparaître jamais ? (la partie serait ingagnable)
   4. L'ordre produit passe-t-il le contrôle « parent avant enfant » du
      serveur ? Si le jeu produit un ordre que la base refuse, toute
      victoire honnête serait classée « à vérifier ».

   Usage : npx tsx scripts/check-game-rules.ts */

import {
  flotteInitiale,
  fragmenter,
  generateur,
  profilDeFamille,
  rayonDuNiveau,
  vitesseDuNiveau,
  TOTAL_GENRES,
  type Asteroide
} from '../src/jeu/regles.ts';
import { FAMILIES, STRUCTURES } from '../src/atlas/structures.ts';

const monde = { largeur: 1280, hauteur: 800 };
const erreurs: string[] = [];

/* --- Simulation : on détruit tout, dans l'ordre où ça se présente ------- */

const simuler = (graine: number): { ordre: string[]; vagues: number } => {
  const hasard = generateur(graine);
  let flotte: Asteroide[] = flotteInitiale(monde, graine);
  const ordre: string[] = [];
  let vagues = 0;

  while (flotte.length > 0 && vagues < 100) {
    vagues += 1;
    const suivante: Asteroide[] = [];
    for (const a of flotte) {
      ordre.push(a.genreId);
      suivante.push(...fragmenter(a, monde, hasard));
    }
    flotte = suivante;
  }
  return { ordre, vagues };
};

const { ordre, vagues } = simuler(12345);

// 1. Le compte
if (ordre.length !== TOTAL_GENRES) {
  erreurs.push(`Une partie complète détruit ${ordre.length} genres, le corpus en a ${TOTAL_GENRES}.`);
}

// 2. Les doublons
const vus = new Set<string>();
const doublons = ordre.filter((id) => (vus.has(id) ? true : (vus.add(id), false)));
if (doublons.length > 0) {
  erreurs.push(`${doublons.length} genre(s) libéré(s) deux fois : ${doublons.slice(0, 5).join(', ')}.`);
}

// 3. Les inatteignables
const tous = STRUCTURES.flatMap((s) => s.genres.map((g) => g.id));
const jamais = tous.filter((id) => !vus.has(id));
if (jamais.length > 0) {
  erreurs.push(`${jamais.length} genre(s) INATTEIGNABLE(S), la partie serait ingagnable : ${jamais.slice(0, 8).join(', ')}.`);
}

// 4. L'ordre que le serveur exigera
const rang = new Map(ordre.map((id, i) => [id, i]));
let desordre = 0;
for (const s of STRUCTURES) {
  for (const g of s.genres) {
    if (g.parent < 0) continue;
    const parent = s.genres[g.parent];
    if (!parent) continue;
    const rg = rang.get(g.id);
    const rp = rang.get(parent.id);
    if (rg === undefined || rp === undefined || rp > rg) desordre += 1;
  }
}
if (desordre > 0) {
  erreurs.push(`${desordre} enfant(s) libéré(s) avant leur parent : le contrôle serveur refuserait la victoire.`);
}

/* --- Ce que ça donne, pour le réglage de la difficulté ------------------ */

console.log('=== Une partie complète ===');
console.log(`  ${ordre.length} astéroïdes de genre détruits, en ${vagues} vagues.`);
console.log(`  ${FAMILIES.length} astéroïdes au départ.`);
console.log();

console.log('=== Les familles, de la plus redoutable à la plus douce ===');
const profils = FAMILIES.map((f, i) => ({ label: f.label, ...profilDeFamille(i) })).sort(
  (a, b) => b.total - a.total
);
for (const p of profils) {
  console.log(
    `  ${p.label.padEnd(12)} ${String(p.total).padStart(3)} astéroïdes au total, ` +
      `${p.premiereVague} au premier éclat, ${p.vagues} vagues`
  );
}
console.log();

console.log('=== Taille et vitesse par niveau ===');
for (let n = 0; n <= 7; n += 1) {
  console.log(
    `  niveau ${n} : rayon ${rayonDuNiveau(n).toFixed(1)} px, ` +
      `vitesse ${vitesseDuNiveau(n).toFixed(0)} px/s`
  );
}
console.log();

/* --- Déterminisme : deux fois la même graine, deux fois la même partie -- */
const a = simuler(999).ordre.join(',');
const b = simuler(999).ordre.join(',');
if (a !== b) erreurs.push('La même graine ne produit pas la même partie : le jeu n\'est pas rejouable.');

if (erreurs.length > 0) {
  console.error('MÉCANISME INVALIDE :');
  for (const e of erreurs) console.error('  - ' + e);
  process.exit(1);
}

console.log(
  `Mécanisme valide : ${TOTAL_GENRES} genres tous atteignables, une seule fois chacun, ` +
    `ordre conforme au contrôle serveur, partie déterministe à graine égale.`
);
