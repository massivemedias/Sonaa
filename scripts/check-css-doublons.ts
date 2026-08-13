/* GARDE-FOU : une propriété déclarée deux fois pour le même sélecteur.
 *
 * POURQUOI CE CONTRÔLE EXISTE. La zone de saisie de la barre de lecture
 * annonçait 44 px dans le code et en mesurait 24 à l'écran : deux règles
 * `.pcol-bar::before` cohabitaient dans le même fichier, et c'est la seconde
 * qui gagnait, par simple ordre d'écriture. Sans une mesure au navigateur, la
 * valeur fausse serait passée pour vraie.
 *
 * C'est le motif qui revient le plus souvent dans ce projet, sous des formes
 * différentes : deux sources de vérité pour une même valeur, et celle qui
 * s'applique n'est pas celle qu'on lit. Il a déjà coûté un instrument de
 * mesure faux, deux corrections de caméra qui se combattaient, et cette zone
 * de saisie.
 *
 * CE QUE LE CONTRÔLE NE FAIT PAS. Il ne comprend pas la cascade : deux règles
 * dans des media queries différentes sont légitimes, et il les ignore. Il ne
 * juge que ce qui est indéfendable, à savoir la même propriété déclarée deux
 * fois pour le même sélecteur dans le même contexte.
 *
 * Usage : npm run check:css
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DOSSIERS = ['../src/atlas', '../src/design'];

interface Doublon {
  fichier: string;
  selecteur: string;
  propriete: string;
  valeurs: string[];
  lignes: number[];
}

const doublons: Doublon[] = [];
let reglesVues = 0;

for (const dossier of DOSSIERS) {
  const base = fileURLToPath(new URL(dossier, import.meta.url));
  for (const nom of readdirSync(base).filter((f) => f.endsWith('.css'))) {
    const texte = readFileSync(`${base}/${nom}`, 'utf8');

    /* Découpage naïf en règles. Le CSS du projet n'imbrique pas, sauf les
       media queries, dont on suit la profondeur pour ne pas comparer deux
       contextes différents. */
    const lignes = texte.split('\n');
    let contexte = '';
    let selecteurCourant: string | null = null;
    let debutRegle = 0;
    let declarations: { propriete: string; valeur: string; ligne: number }[] = [];

    const cle = (sel: string): string => `${contexte}||${sel.replace(/\s+/g, ' ').trim()}`;
    const vues = new Map<string, { propriete: string; valeur: string; ligne: number }[]>();

    lignes.forEach((ligne, i) => {
      const nu = ligne.replace(/\/\*.*?\*\//g, '').trim();
      if (nu.startsWith('@media') || nu.startsWith('@supports')) {
        contexte = nu;
        return;
      }
      if (nu === '}' && selecteurCourant === null) {
        contexte = '';
        return;
      }
      if (nu.endsWith('{')) {
        selecteurCourant = nu.slice(0, -1).trim();
        debutRegle = i + 1;
        declarations = [];
        return;
      }
      if (nu === '}' && selecteurCourant !== null) {
        reglesVues += 1;
        const k = cle(selecteurCourant);
        const dejaVu = vues.get(k) ?? [];
        vues.set(k, [...dejaVu, ...declarations]);
        selecteurCourant = null;
        return;
      }
      if (selecteurCourant !== null) {
        const m = /^([a-z-]+)\s*:\s*(.+?);?$/i.exec(nu);
        if (m?.[1] && m[2]) declarations.push({ propriete: m[1], valeur: m[2], ligne: i + 1 });
      }
    });

    for (const [k, decls] of vues) {
      const parPropriete = new Map<string, { valeur: string; ligne: number }[]>();
      for (const d of decls) {
        /* Les propriétés qui s'ACCUMULENT légitimement ne comptent pas : une
           règle peut poser plusieurs ombres ou plusieurs transitions. */
        if (['box-shadow', 'text-shadow', 'transition', 'background', 'animation'].includes(d.propriete)) continue;
        parPropriete.set(d.propriete, [...(parPropriete.get(d.propriete) ?? []), d]);
      }
      for (const [propriete, occurrences] of parPropriete) {
        if (occurrences.length < 2) continue;
        const valeurs = [...new Set(occurrences.map((o) => o.valeur))];
        /* Deux fois la MÊME valeur est une redite sans conséquence : on ne
           signale que les valeurs qui divergent, c'est-à-dire les cas où la
           lecture du code peut tromper. */
        if (valeurs.length < 2) continue;
        const [, selecteur = k] = k.split('||');
        doublons.push({
          fichier: nom,
          selecteur,
          propriete,
          valeurs,
          lignes: occurrences.map((o) => o.ligne)
        });
      }
    }
    void debutRegle;
  }
}

if (doublons.length > 0) {
  console.error(`\nDOUBLONS CSS : ${doublons.length} propriete(s) declaree(s) deux fois avec des valeurs differentes.\n`);
  for (const d of doublons) {
    console.error(`  ${d.fichier} : ${d.selecteur}`);
    console.error(`    ${d.propriete} = ${d.valeurs.join('  PUIS  ')}   (lignes ${d.lignes.join(', ')})`);
    console.error(`    C'est la DERNIERE qui s'applique. Retirer celle qui ne sert plus.\n`);
  }
  process.exit(1);
}

console.log(`CSS : ${reglesVues} regles lues, aucune propriete declaree deux fois avec des valeurs differentes.`);
