/* LA TEINTE D'UNE SOIREE, LUE DANS SES STYLES.
 *
 * Une soiree sans affiche recoit une affiche dessinee a partir de ses
 * donnees (voir AfficheGeneree.tsx), et cette affiche prend la teinte de la
 * famille de son style : la couleur dit quelque chose, comme partout dans
 * l'atlas. Resident Advisor annonce ses styles par leur nom affiche,
 * « Techno », « Progressive House », « Drum & Bass », « Funk / Soul » ; il
 * faut les ramener a l'une des quatorze familles du corpus.
 *
 * TROIS ESSAIS, DANS CET ORDRE, pour chaque style annonce :
 * 1. le nom EST une famille (« Techno », « House », « Trance ») ;
 * 2. le nom est un genre du corpus (« Progressive House », « Dubstep »),
 *    et sa famille est celle du corpus ;
 * 3. le nom CONTIENT une famille (« Acid House », « Hard Techno »).
 * Le premier style qui repond donne la teinte. Aucun ne repond (« Funk /
 * Soul » seul, ou une soiree sans style) : pas de teinte, l'affiche reste
 * dans le granite du site plutot que d'inventer une famille. */

import { FAMILIES, STRUCTURES } from './structures.ts';

const cle = (nom: string): string =>
  nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');

/* Les genres du corpus, par identifiant, avec l'indice de leur famille. */
const FAMILLE_DU_GENRE = new Map<string, number>();
STRUCTURES.forEach((s, fi) => {
  for (const g of s.genres) FAMILLE_DU_GENRE.set(g.id, fi);
});
/* Les familles, les noms les plus longs d'abord : « hardcore » doit passer
   avant « core » s'il en existait un, et « downtempo » ne doit pas se lire
   « tempo ». */
const FAMILLES_PAR_LONGUEUR = FAMILIES.map((f, fi) => ({ id: f.id, fi })).sort((a, b) => b.id.length - a.id.length);

function familleDuStyle(nom: string): number | null {
  const id = cle(nom);
  if (!id) return null;
  const exacte = FAMILIES.findIndex((f) => f.id === id);
  if (exacte >= 0) return exacte;
  const duCorpus = FAMILLE_DU_GENRE.get(id);
  if (duCorpus !== undefined) return duCorpus;
  const contenue = FAMILLES_PAR_LONGUEUR.find((f) => id.includes(f.id));
  return contenue ? contenue.fi : null;
}

/** La teinte de la famille du premier style reconnu, ou `null`. */
export function teinteDesStyles(styles: readonly string[]): number | null {
  for (const s of styles) {
    const fi = familleDuStyle(s);
    if (fi !== null) return FAMILIES[fi]?.hue ?? null;
  }
  return null;
}
