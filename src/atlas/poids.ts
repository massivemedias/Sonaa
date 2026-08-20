/* LE POIDS D'UN GENRE, POUR LA CARTE DE CHALEUR.

   ═══════════════════════════════════════════════════════════════════════
   POURQUOI DEUX POIDS ET PAS UN, ET POURQUOI CELUI QUI DIMENSIONNE N'EST
   PAS CELUI QUI EST LE PLUS JUSTE.
   ═══════════════════════════════════════════════════════════════════════

   Trois definitions de l'importance ont ete mesurees avant de choisir.

   LE POIDS GENEALOGIQUE, `poids` : le nombre de genres qui descendent d'un
   genre dans l'ARBRE structurel, plus le genre lui-meme. C'est lui qui donne
   la taille des rectangles.

   Le « plus un » n'est pas un detail de confort : SOIXANTE-TROIS POUR CENT du
   corpus, 139 genres sur 219, sont des feuilles et pesent donc zero. Sans
   lui, les deux tiers de l'atlas n'auraient aucun rectangle.

   LA DESCENDANCE TOTALE, `descendance` : le nombre de genres atteignables en
   suivant TOUTES les filiations declarees, greffes entre familles comprises,
   c'est-a-dire le DAG et non l'arbre. C'est le chiffre le plus juste, et de
   loin le plus parlant :

       Musique concrete   13 dans l'arbre  ->  174 dans le DAG
       Funk                1               ->  168
       Philly Soul         0               ->  130
       Elektronische Musik 0               ->  109

   Deux racines de l'atlas pesent litteralement ZERO dans l'arbre.

   POURQUOI CE N'EST PAS LUI QUI DIMENSIONNE, alors qu'il est plus juste.
   Mesure faite : au niveau des familles, il donne CINQUANTE POUR CENT de
   l'ecran a la famille roots et un pour cent a downtempo, un rapport de 49,
   avec un pave de 54 px pour la plus petite. La vue est morte au premier
   niveau. Le poids d'arbre donne 15 % au plus gros et 4 % au plus petit,
   rapport 4, et 103 px pour le plus petit pave. C'est la seule des deux qui
   tient a l'ecran.

   ET LA DOCTRINE N'EST PAS TRAHIE. L'ADR-030 dit que le DAG est la verite et
   que l'arbre est une VUE. Une carte de chaleur imbriquee EST une vue :
   s'appuyer sur l'arbre pour la geometrie est coherent, a condition de dire
   le chiffre du DAG en clair, ce que fait la fiche du genre.

   LES DEUX SONT DONC EXPOSES, et l'ecart entre eux raconte quelque chose :
   un genre a peu de derives directs et une descendance immense quand son
   influence a saute les frontieres de famille. */

import corpus from '../data/corpus.json' with { type: 'json' };
import type { Corpus } from '../data/schema.ts';

const CORPUS = corpus as unknown as Corpus;

/* ── L'arbre structurel : un parent au plus, celui qui positionne ────────── */

const enfantsArbre = new Map<string, string[]>();
for (const g of CORPUS.genres) enfantsArbre.set(g.id, []);
for (const g of CORPUS.genres) {
  if (g.structuralParent) enfantsArbre.get(g.structuralParent)?.push(g.id);
}

/* Memoise : l'arbre est parcouru une fois, pas une fois par rectangle. */
const memoArbre = new Map<string, number>();
const descendanceArbre = (id: string): number => {
  const vu = memoArbre.get(id);
  if (vu !== undefined) return vu;
  let n = 0;
  for (const e of enfantsArbre.get(id) ?? []) n += 1 + descendanceArbre(e);
  memoArbre.set(id, n);
  return n;
};

/* ── Le DAG : toutes les filiations declarees, greffes comprises ─────────── */

const enfantsDag = new Map<string, string[]>();
for (const g of CORPUS.genres) enfantsDag.set(g.id, []);
for (const g of CORPUS.genres) {
  for (const p of g.parents) enfantsDag.get(p.id)?.push(g.id);
}

/* PAS DE MEMOISATION ICI, et c'est voulu. Un DAG n'est pas un arbre : deux
   branches partagent des descendants, et additionner leurs comptes les
   compterait deux fois. On parcourt donc en marquant les visites, ce qui rend
   un ENSEMBLE et non une somme. Le cout est paye une fois au chargement. */
const descendanceDag = (id: string): number => {
  const vus = new Set<string>();
  const pile = [...(enfantsDag.get(id) ?? [])];
  while (pile.length > 0) {
    const x = pile.pop();
    if (x === undefined || x === id || vus.has(x)) continue;
    vus.add(x);
    for (const y of enfantsDag.get(x) ?? []) if (!vus.has(y)) pile.push(y);
  }
  return vus.size;
};

export interface PoidsGenre {
  /** Descendance dans l'arbre PLUS le genre lui-meme. Donne la taille. */
  readonly poids: number;
  /** Enfants directs dans l'arbre structurel. */
  readonly derivesDirects: number;
  /** Descendance dans le DAG entier, greffes comprises. Se dit en clair. */
  readonly descendance: number;
}

const TABLE = new Map<string, PoidsGenre>(
  CORPUS.genres.map((g) => [
    g.id,
    {
      poids: descendanceArbre(g.id) + 1,
      derivesDirects: (enfantsArbre.get(g.id) ?? []).length,
      descendance: descendanceDag(g.id)
    }
  ])
);

/** Les trois comptes d'un genre. Jamais nul : un genre inconnu pese 1. */
export const poidsDe = (id: string): PoidsGenre =>
  TABLE.get(id) ?? { poids: 1, derivesDirects: 0, descendance: 0 };
