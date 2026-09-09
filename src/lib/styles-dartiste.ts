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

import { FAMILIES, STRUCTURES } from '../atlas/structures.ts';
import { ranger, vocabulaire, type Vocabulaire } from './correspondance-styles.ts';

let index: Record<string, string[]> | null = null;
let enCours: Promise<Record<string, string[]>> | null = null;

/* ═══ LE REPLI EN DIRECT, PAR LA PASSERELLE ═══

   Quand l'index ne connait pas le nom, on demande a Discogs, par le Worker
   (route api/artiste), qui porte le jeton et garde la reponse un jour. Le
   Worker rend les styles bruts de Discogs avec leur poids ; c'est ICI qu'on
   les range dans notre vocabulaire, avec la table que la moisson emploie.

   ON N'INTERROGE QU'UN NOM QUI A FINI D'ETRE TAPE. Chaque lettre relance la
   recherche ; sans pause, « l », « le », « lea »... partiraient tous vers la
   passerelle. On attend un demi-seconde de silence, et on n'envoie que si la
   requete n'a pas change entre-temps. */
const PASSERELLE = 'https://sonaa-sets.massivemedias.workers.dev';
const PAUSE_MS = 500;
let derniereRequete = 0;
const memoireDirecte = new Map<string, Promise<ArtisteTrouve | null>>();

let voc: Vocabulaire | null = null;
const vocabulaireDuSite = (): Vocabulaire => {
  if (voc) return voc;
  const genres = STRUCTURES.flatMap((s) => s.genres.map((g) => ({ id: g.id, label: g.label })));
  voc = vocabulaire(genres, FAMILIES.map((f) => ({ id: f.id, label: f.label })));
  return voc;
};

/** Les styles bruts de Discogs, ranges dans le vocabulaire de SONAA et
    ordonnes du plus present au moins. Six au plus, comme dans l'index. */
export function stylesVersSonaa(bruts: Record<string, number>): string[] {
  const v = vocabulaireDuSite();
  const poids = new Map<string, number>();
  for (const [style, n] of Object.entries(bruts)) {
    const cible = ranger(style, v);
    if (!cible) continue;
    poids.set(cible.id, (poids.get(cible.id) ?? 0) + n);
  }
  return [...poids.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id]) => id);
}

async function enDirect(requete: string): Promise<ArtisteTrouve | null> {
  const cle = requete.toLowerCase();
  const deja = memoireDirecte.get(cle);
  if (deja) return deja;
  const p = (async (): Promise<ArtisteTrouve | null> => {
    try {
      const r = await fetch(`${PASSERELLE}/api/artiste?q=${encodeURIComponent(requete)}`);
      if (!r.ok) return null;
      const j = (await r.json()) as {
        trouve: boolean;
        nom: string | null;
        styles: Record<string, number>;
        source?: 'discogs' | 'lastfm';
      };
      if (!j.trouve) return null;
      const genres = stylesVersSonaa(j.styles);
      if (genres.length === 0) return null;
      return { nom: j.nom ?? enNomPropre(requete), genres, enDirect: true, source: j.source ?? 'discogs' };
    } catch {
      return null;
    }
  })();
  memoireDirecte.set(cle, p);
  return p;
}

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
  /** Vrai quand la reponse vient de Discogs a l'instant, pas de l'index. */
  readonly enDirect?: boolean;
  /** D'ou viennent les styles : l'index moissonne, ou une source en direct. */
  readonly source?: 'index' | 'discogs' | 'lastfm';
}

/* LE NOM S'ECRIT COMME UN NOM, PAS COMME ON L'A TAPE. Quand la source ne
   rend pas le nom (Discogs a repondu pour les sorties mais pas pour la
   fiche), on garde ce qui a ete tape, avec une majuscule a chaque mot :
   « laurent garnier » devient « Laurent Garnier ». Ce n'est pas la graphie
   officielle, mais c'est un nom, et la fiche ne se lit plus comme une
   faute de frappe. Vu par Mika le 9 septembre 2026. */
const enNomPropre = (s: string): string =>
  s
    .trim()
    .split(/\s+/)
    .map((m) => (m.length > 0 ? m.charAt(0).toUpperCase() + m.slice(1) : m))
    .join(' ');

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
    if (plat === q || plat.startsWith(q)) debuts.push({ nom, genres, source: 'index' });
    else if (plat.includes(q)) dedans.push({ nom, genres, source: 'index' });
    if (debuts.length >= combien) break;
  }
  const trouves = [...debuts, ...dedans].slice(0, combien);
  if (trouves.length > 0) return trouves;

  /* Rien dans l'index : on demande a Discogs, apres un silence, et
     seulement si personne n'a tape autre chose entre-temps. */
  const jeton = Date.now();
  derniereRequete = jeton;
  await new Promise((r) => setTimeout(r, PAUSE_MS));
  if (derniereRequete !== jeton) return [];
  const direct = await enDirect(requete.trim());
  return direct ? [direct] : [];
}
