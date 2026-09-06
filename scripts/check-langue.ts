/* LE CONTROLE QUI EMPECHE UNE INTERFACE A MOITIE TRADUITE.
 *
 * ═══ POURQUOI IL EXISTE ═══
 *
 * Le selecteur de langue a ete pose le 6 septembre 2026, verifie dans les
 * deux sens, et publie. Mika a teste en anglais, ouvert une page de famille,
 * et vu du francais partout. Le selecteur marchait ; il ne traversait
 * simplement pas les cent cinquante libelles ecrits en dur dans vingt-trois
 * composants.
 *
 * C'est le motif exact que ce depot connait deja par coeur : une valeur
 * ecrite a cent cinquante endroits finit par n'etre changee qu'a cent. La
 * reponse n'est jamais de mieux relire, c'est de rendre l'oubli detectable.
 *
 * ═══ CE QU'IL REGARDE ═══
 *
 * Le texte rendu dans du JSX, et les attributs que quelqu'un LIT : le
 * libelle d'accessibilite, l'invite d'un champ, l'infobulle, le texte de
 * remplacement d'une image. Rien d'autre : ni les commentaires, ni les noms
 * de classes, ni les identifiants.
 *
 * ═══ CE QU'IL LAISSE PASSER, ET POURQUOI ═══
 *
 * LE CORPUS N'EST PAS DE L'INTERFACE. Les 219 descriptions de genres, les 14
 * textes de familles et leurs articles sont un texte d'auteur, ecrit en
 * francais, avec des choix de formulation qui portent des nuances de
 * filiation. Les faire traduire par une machine reviendrait a publier sous le
 * nom de Mika des phrases qu'il n'a pas ecrites. Le site le DIT, sur la fiche
 * d'un genre comme sur la page d'une famille, au lieu de le laisser deviner.
 *
 * Les pages A propos et Credits sont dans le meme cas : de la prose
 * d'auteur, pas des libelles. Elles sont exemptees NOMMEMENT, une par une,
 * et non par un motif : une exemption large finirait par couvrir un fichier
 * qu'on n'a pas voulu exempter.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/* Ces deux pages sont de la prose d'auteur. Les traduire est un travail
   d'ecriture, pas de developpement, et ce n'est pas a une machine de le
   faire. La liste est nominative pour que l'ajout d'une exemption soit un
   geste visible dans un diff. */
const PAGES_DAUTEUR = new Set(['AProposPage.tsx', 'CreditsPage.tsx']);

/* Un accent, ou un mot outil francais entoure de limites de mot. Les deux
   ensemble : « Techno » n'a pas d'accent et n'est pas un mot outil, donc un
   nom de genre ne declenche rien. */
const FRANCAIS =
  /[àâäéèêëîïôöùûüçœÀÂÄÉÈÊËÎÏÔÖÙÛÜÇŒ]|\b(le|la|les|des|une|un|dans|pour|avec|sur|par|qui|que|quoi|vos|votre|ce|cette|aucun|aucune|tout|tous|sont|est|pas|ne|plus|puis|donc|ici|vers)\b/i;

const ATTRIBUTS_LUS = /(?:aria-label|placeholder|title|alt)="([^"]{4,})"/g;
const TEXTE_JSX = /> *([^<>{}\n]{4,}?) *</g;

/** Les commentaires deviennent des espaces : les positions restent justes,
    donc les numeros de ligne aussi. Un commentaire francais n'est pas un
    defaut, c'est la convention de ce depot. */
function sansCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (bloc) => ' '.repeat(bloc.length))
    .replace(/^([ \t]*)\/\/.*$/gm, (ligne, creux: string) => creux + ' '.repeat(ligne.length - creux.length));
}

function fichiers(racine: string): string[] {
  const out: string[] = [];
  for (const nom of readdirSync(racine)) {
    const chemin = join(racine, nom);
    if (statSync(chemin).isDirectory()) out.push(...fichiers(chemin));
    else if (nom.endsWith('.tsx')) out.push(chemin);
  }
  return out;
}

interface Trouvaille {
  readonly fichier: string;
  readonly ligne: number;
  readonly texte: string;
}

const trouves: Trouvaille[] = [];
let relus = 0;

for (const chemin of fichiers('src')) {
  const nom = chemin.split('/').pop() ?? '';
  if (PAGES_DAUTEUR.has(nom)) continue;
  const net = sansCommentaires(readFileSync(chemin, 'utf8'));
  relus += 1;

  const noter = (indice: number, texte: string): void => {
    if (!FRANCAIS.test(texte)) return;
    trouves.push({ fichier: chemin, ligne: net.slice(0, indice).split('\n').length, texte });
  };

  for (const m of net.matchAll(TEXTE_JSX)) noter(m.index ?? 0, (m[1] ?? '').trim());
  for (const m of net.matchAll(ATTRIBUTS_LUS)) noter(m.index ?? 0, (m[1] ?? '').trim());
}

if (trouves.length === 0) {
  console.log(
    `Langue : ${relus} composants relus, aucun libelle francais rendu hors du dictionnaire.`
  );
  process.exit(0);
}

console.log(`\nLIBELLES NON TRADUITS : ${trouves.length} fragment(s) rendus en francais en dur.\n`);
for (const t of trouves) {
  console.log(`  ${t.fichier}:${t.ligne}`);
  console.log(`     ${t.texte.slice(0, 90)}`);
}
console.log(`
  Chacun de ces textes sort en francais meme quand le site est en anglais, et
  le selecteur de langue ne peut rien y faire : il ne voit que le
  dictionnaire. Ajoutez la cle dans src/langue/langue.ts, dans les DEUX
  langues, puis remplacez le texte par « {t.laCle} ».

  Le type Dictionnaire rend l'oubli impossible dans l'autre sens : une cle
  ajoutee d'un seul cote ne compile pas.
`);
process.exit(1);
