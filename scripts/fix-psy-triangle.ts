/* Correction de filiation sur le triangle psy-prog / psytech / zenonesque,
   remontée par la scène. Écriture par corpus-store, comme tout le reste.

   Ce que la correction dit, et pourquoi :

   - ZENONESQUE ne descend pas du psy-prog. Le rattachement au psy-prog est
     une erreur commune qui vient du tempo voisin ; le son n'a pas la même
     origine. Il est rattaché au DARK PSY (branche sombre et profonde,
     ralentie) et greffé sur la techno hypnotique, le psy-prog et le glitch.
   - PSYTECH n'est pas un dérivé linéaire du psy-prog : c'est un carrefour
     entre techno et psytrance. Le rattachement d'arbre reste conventionnel
     (le schéma impose un parent structurel unique) mais la note le déclare,
     et les greffes vers la famille techno sont explicites.
   - PSY-PROG vient de la rencontre entre progressive trance et psytrance,
     pas seulement du goa : la greffe vers la progressive trance est ajoutée.

   Les trois restent EN BROUILLON : leurs descriptions sont relues par Mika.

   Usage : npx tsx scripts/fix-psy-triangle.ts */

import { transaction } from './lib/corpus-store.ts';

interface Parent {
  id: string;
  family: string;
  confidence: string;
}
interface Genre {
  id: string;
  structuralParent: string | null;
  parents: Parent[];
  confidence: string;
  note?: string;
  [k: string]: unknown;
}

const ZENON_NOTE =
  "Australie, Zenon Records, milieu des annees 2000. FILIATION CORRIGEE (remontee par la scene) : le zenonesque ne descend PAS du psy-prog. Le rattachement au psy-prog est une erreur commune, nee du tempo voisin ; le son vient du dark psy ralenti croise a la techno hypnotique. Rattachement d'arbre : dark psy. CONTROVERSE ASSUMEE : certains le tiennent pour une branche du psy-prog, la scene Zenon le revendique comme autre chose.";

const PSYTECH_NOTE =
  "Hambourg puis les netlabels, debut des annees 2000. FILIATION CORRIGEE (remontee par la scene) : le psytech n'est pas un derive lineaire du psy-prog, c'est un CARREFOUR entre la techno et la psytrance. Le rattachement d'arbre au psy-prog est CONVENTIONNEL, le schema imposant un parent structurel unique ; les greffes vers la famille techno disent la filiation reelle. La frontiere avec psy-prog et zenonesque est contestee dans la scene elle-meme.";

const PROGPSY_NOTE =
  "Scandinavie, fin des annees 1990. La psytrance ralentie et creusee. ASCENDANCE COMPLETEE : le psy-prog naît de la RENCONTRE entre la progressive trance et la psytrance, pas du goa seul. La greffe vers la progressive trance est declaree.";

let done: string[] = [];
transaction((corpus) => {
  const genres = (corpus as unknown as { genres: Genre[] }).genres;
  const find = (id: string): Genre => {
    const g = genres.find((x) => x.id === id);
    if (!g) throw new Error(`genre inconnu : ${id}`);
    return g;
  };

  // --- ZENONESQUE : sort de l'ombre du psy-prog.
  const zen = find('zenonesque');
  zen.structuralParent = 'darkpsy';
  zen.parents = [
    { id: 'darkpsy', family: 'psy', confidence: 'debated' },
    { id: 'hypnotictechno', family: 'techno', confidence: 'established' },
    { id: 'progpsy', family: 'psy', confidence: 'debated' },
    { id: 'glitch', family: 'ambient', confidence: 'debated' }
  ];
  zen.confidence = 'debated';
  zen.note = ZENON_NOTE;
  done.push('zenonesque');

  // --- PSYTECH : carrefour déclaré, greffes techno explicites.
  const pt = find('psytech');
  pt.structuralParent = 'progpsy';
  pt.parents = [
    { id: 'progpsy', family: 'psy', confidence: 'debated' },
    { id: 'hypnotictechno', family: 'techno', confidence: 'established' },
    { id: 'minimaltechno', family: 'minimal', confidence: 'established' },
    { id: 'techhouse', family: 'minimal', confidence: 'debated' }
  ];
  pt.confidence = 'debated';
  pt.note = PSYTECH_NOTE;
  done.push('psytech');

  // --- PSY-PROG : la progressive trance rejoint l'ascendance.
  const pp = find('progpsy');
  pp.parents = [
    { id: 'psychedelictrance', family: 'psy', confidence: 'debated' },
    { id: 'progressivetrance', family: 'trance', confidence: 'established' }
  ];
  pp.note = PROGPSY_NOTE;
  done.push('progpsy');
});

console.log(`Filiations corrigées : ${done.join(', ')}.`);
