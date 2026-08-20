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
import vuesBrutes from '../data/vues.json' with { type: 'json' };
import type { Corpus } from '../data/schema.ts';

const CORPUS = corpus as unknown as Corpus;
/* PAR `unknown`, ET C'EST LA RETOMBEE QUI L'EXIGE.

   Un transtypage direct fait promettre au compilateur une forme que le
   FICHIER ne garantit pas. Teste en vidant le fichier de vues pour verifier
   la retombee : la construction a echoue, `releve: null` n'etant pas
   compatible avec `string`. Autrement dit, le chemin de secours cassait le
   build au lieu de fonctionner, ce qui est le contraire d'un chemin de
   secours.

   On passe donc par `unknown` et on verifie a l'execution. Le fichier est une
   donnee, pas un contrat. */
const VUES = vuesBrutes as unknown as { releve?: unknown; genres?: unknown };

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


/* ═══════════════════════════════════════════════════════════════════════
   LA POPULARITE, ET POURQUOI ELLE EST UN RANG ET NON UNE VALEUR
   ═══════════════════════════════════════════════════════════════════════

   La mesure est la MEDIANE des vues des morceaux du genre, relevee par
   `npm run fetch:vues`. Le choix de la mediane est explique dans ce script :
   une somme mesure surtout le morceau viral, et elle est biaisee par le
   nombre de morceaux choisis, qui est une decision editoriale.

   MAIS LA MEDIANE BRUTE NE PEUT PAS DIMENSIONNER. Mesure : un rapport de
   222 235 entre Synth-pop, mediane 154 millions, et Skweee, mediane 463. Sur
   quatorze paves de famille a 320 px, la mediane brute donne un plus petit
   pave de 27 px de cote, sur lequel aucun nom ne tient.

   ON CONVERTIT DONC EN RANG, de 1 a 12. Mesure : 78 px pour le plus petit
   pave, c'est-a-dire exactement l'equilibre du poids genealogique, qui donne
   77.

   C'EST UN CHOIX EDITORIAL ET IL DOIT SE DIRE. Ecraser un facteur deux cent
   mille en douze crans n'est pas une mise a l'echelle, c'est une decision.
   La vue l'ecrit sous son curseur, en toutes lettres. Un site qui dit ses
   methodes partout doit dire celle-la aussi.

   LE RANG EST CALCULE ICI ET PAS DANS LA VUE, contrairement a ce que
   j'envisageais : deux vues qui le referaient chacune a leur maniere, c'est
   le motif des deux sources de verite, et ce projet l'a paye assez souvent. */

const CRANS = 12;

/* LA RETOMBEE, ET ELLE EST SILENCIEUSE POUR LE CALCUL, PAS POUR L'OEIL.

   Si le fichier de vues manque, est vide, ou ne couvre pas assez de genres
   pour qu'un classement ait un sens, la popularite n'existe pas et tout doit
   retomber sur le poids genealogique. Le seuil est aux deux tiers du corpus :
   classer 219 genres sur une mesure qui n'en couvre que trente donnerait un
   rang faux pour tous les autres, ce qui est pire que pas de rang du tout.

   La vue lit `populariteDisponible` et le dit discretement. Une donnee absente
   qui ne se signale pas est une donnee inventee. */
const MESURES: Record<string, number> =
  VUES.genres !== null && typeof VUES.genres === 'object' ? (VUES.genres as Record<string, number>) : {};
const COUVERTS = Object.keys(MESURES).length;
export const populariteDisponible = COUVERTS >= Math.floor(CORPUS.genres.length * 0.66);
export const releveDu = typeof VUES.releve === 'string' ? VUES.releve : null;

const RANGS = new Map<string, number>();
if (populariteDisponible) {
  const tries = CORPUS.genres
    .map((g) => ({ id: g.id, v: MESURES[g.id] ?? 0 }))
    .sort((a, b) => a.v - b.v);
  const dernier = Math.max(1, tries.length - 1);
  tries.forEach((x, i) => RANGS.set(x.id, 1 + ((CRANS - 1) * i) / dernier));
}

/* Le rang de popularite, de 1 a 12. Vaut 1 quand la mesure manque.

   PAS EXPORTE : il ne sert qu'a `poidsCompose`, juste en dessous. Le controle
   des exports orphelins l'a signale, et il avait raison : une fonction
   publiee que personne n'appelle du dehors a l'air d'une porte alors que
   c'est un mur. */
const rangPopularite = (id: string): number => RANGS.get(id) ?? 1;

/* LE POIDS COMPOSE : `t` a zero donne la genealogie, `t` a un donne la
   popularite, et entre les deux une moyenne geometrique.

   GEOMETRIQUE ET NON ARITHMETIQUE, parce que les deux echelles n'ont pas la
   meme unite : une moyenne arithmetique laisserait le plus grand des deux
   ecraser l'autre des que `t` s'ecarte un peu de zero, et le curseur
   basculerait d'un coup au lieu de glisser. */
export const poidsCompose = (id: string, t: number): number => {
  const g = poidsDe(id).poids;
  if (t <= 0 || !populariteDisponible) return g;
  const p = rangPopularite(id);
  if (t >= 1) return p;
  return Math.pow(g, 1 - t) * Math.pow(p, t);
};
