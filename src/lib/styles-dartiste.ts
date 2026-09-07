/* LES STYLES D'UN ARTISTE, CHARGES SEULEMENT QUAND ON CHERCHE.
 *
 * ═══ POURQUOI CE FICHIER N'EST PAS IMPORTE NORMALEMENT ═══
 *
 * L'index inverse pese 636 ko bruts, 134 une fois compresses : 9 334 noms
 * d'artistes avec leurs styles. C'est peu pour qui tape un nom dans la
 * recherche ; c'est beaucoup pour qui vient lire une fiche de genre et ne
 * cherchera jamais personne.
 *
 * Il est donc charge par `import()` au premier usage de la recherche, une
 * seule fois, et garde en memoire ensuite. Le reste du site ne le voit pas.
 *
 * ═══ CE QU'IL NE COUVRE PAS, ET IL FAUT LE DIRE ═══
 *
 * Les 9 334 noms viennent des classements de Last.fm, filtres par Discogs.
 * Un artiste trop peu ecoute pour figurer dans un classement n'y est PAS :
 * Lealtica, Maudite Machine et FM Radio Gods, les trois exemples de Mika,
 * n'y sont pas. Eux se resolvent en direct chez Discogs, en 250 ms, par la
 * passerelle. Cet index est le chemin rapide, pas le chemin complet.
 */

let index: Record<string, string[]> | null = null;
let enCours: Promise<Record<string, string[]>> | null = null;

/* La forme sur laquelle on compare : sans accent, sans ponctuation. La meme
   que celle du moissonneur, pour que « Rhythim Is Rhythim » se trouve quelle
   que soit la facon dont on l'ecrit.

   ELLE N'EST PAS EXPORTEE. Elle l'a ete, et le controle des exports l'a
   signalee : personne d'autre ne s'en sert. Une fonction exportee que rien
   n'appelle a l'air de faire partie d'une interface publique, et on finit par
   la croire utilisee ailleurs. */
const aplatirNom = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Charge l'index une fois. Les appels suivants rendent la meme promesse :
    deux frappes rapprochees ne doivent pas telecharger deux fois. */
async function charger(): Promise<Record<string, string[]>> {
  if (index) return index;
  enCours ??= import('../data/artistes-index.json').then((m) => {
    index = m.default as Record<string, string[]>;
    return index;
  });
  return enCours;
}

export interface ArtisteTrouve {
  readonly nom: string;
  readonly genres: readonly string[];
}

/** Les artistes dont le nom contient la requete, les mieux places d'abord.
    Rend un tableau vide tant que l'index n'est pas charge : la recherche
    affiche le reste sans attendre, et l'artiste apparait au rendu suivant. */
export async function chercherArtistes(requete: string, combien = 4): Promise<ArtisteTrouve[]> {
  const q = aplatirNom(requete);
  if (q.length < 3) return [];
  const idx = await charger();

  const debuts: ArtisteTrouve[] = [];
  const dedans: ArtisteTrouve[] = [];
  for (const [nom, genres] of Object.entries(idx)) {
    const plat = aplatirNom(nom);
    if (plat === q || plat.startsWith(q)) debuts.push({ nom, genres });
    else if (plat.includes(q)) dedans.push({ nom, genres });
    if (debuts.length >= combien) break;
  }
  return [...debuts, ...dedans].slice(0, combien);
}
