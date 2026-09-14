/* LES NOMS D'ARTISTES, RAMENES A UNE SEULE FORME.
 *
 * Le releve vient de trois sources qui n'ecrivent pas un nom de la meme
 * facon : « Boney M. » et « Boney M », « Lil' Louis » et « Lil Louis »,
 * « Hernan Cattaneo » et « Hernán Cattáneo ». Scan du 13 septembre 2026 :
 * 122 noms en double dans l'index, 38 avec des styles differents selon la
 * forme. La recherche aplatit les noms (sans accent, sans ponctuation, en
 * minuscules) : c'est cette forme aplatie qui dit que deux noms sont le
 * meme artiste, et c'est elle qu'on prend pour les fusionner.
 *
 * LE NOM AFFICHE EST LA FORME LA PLUS DOCUMENTEE : celle dont les styles
 * pesent le plus, donc celle que les sources connaissent le mieux. A poids
 * egal, la premiere rencontree.
 */

/** La forme aplatie d'un nom : la meme regle que la recherche et que la
    passerelle, sans quoi un nom se trouverait d'un cote et pas de l'autre. */
export const aplatirNom = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export type Styles = Record<string, number>;

/** Fusionne les entrees dont le nom aplati est le meme : styles additionnes,
    nom affiche le plus lourd. L'ordre des entrees est conserve. */
export function fusionnerDoublons(parArtiste: Record<string, Styles>): Record<string, Styles> {
  const groupes = new Map<string, { nom: string; poidsDuNom: number; styles: Styles }>();
  for (const [nom, styles] of Object.entries(parArtiste)) {
    const cle = aplatirNom(nom);
    if (cle === '') continue;
    const poids = Object.values(styles).reduce((a, b) => a + b, 0);
    const g = groupes.get(cle);
    if (!g) {
      groupes.set(cle, { nom, poidsDuNom: poids, styles: { ...styles } });
      continue;
    }
    for (const [s, n] of Object.entries(styles)) g.styles[s] = (g.styles[s] ?? 0) + n;
    if (poids > g.poidsDuNom) {
      g.nom = nom;
      g.poidsDuNom = poids;
    }
  }
  const out: Record<string, Styles> = {};
  for (const g of groupes.values()) out[g.nom] = g.styles;
  return out;
}

/** Enleve, d'une liste de noms, ceux qui ne sont que le debut d'un autre :
    « Digital c », « Digital com » quand « Digital committee » est la. Ce sont
    des frappes en cours, notees par la passerelle parce que la recherche
    part apres une pause de frappe, pas des artistes. */
export function sansPrefixes(noms: readonly string[]): string[] {
  const plats = noms.map(aplatirNom);
  return noms.filter((_, i) => {
    const p = plats[i] ?? '';
    if (p === '') return false;
    return !plats.some((q, j) => j !== i && q.length > p.length && q.startsWith(p));
  });
}
