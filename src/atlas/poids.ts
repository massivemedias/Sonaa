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
import lastfmBrutes from '../data/lastfm.json' with { type: 'json' };
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
const LASTFM = lastfmBrutes as unknown as { releve?: unknown; genres?: unknown };

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
   LA POPULARITE NE DIMENSIONNE PLUS RIEN. ELLE S'AFFICHE, ET C'EST TOUT.
   ═══════════════════════════════════════════════════════════════════════

   DEUX SOURCES ONT ETE MESUREES ET TOUTES DEUX ECARTEES DE LA GEOMETRIE.

   LAST.FM, `tag.getInfo`, champ `reach`, le nombre d'utilisateurs DISTINCTS
   ayant pose le tag. Couverture excellente : 219 genres sur 219, dont 216 sur
   le nom exact. Et pourtant inutilisable pour dimensionner :

     il mesure la GENERALITE DU MOT, pas la notoriete du genre. Les vingt-six
     termes parapluies du corpus, Ambient, Trance, Funk, Reggae, pesent en
     moyenne 43 126 contre 2 879 pour les cent quatre-vingt-treize termes
     specifiques. Facteur QUINZE sur les moyennes, QUARANTE-TROIS sur les
     medianes. Seize des vingt plus hauts reach sont des parapluies alors
     qu'ils ne sont que 12 % du corpus ;

     normaliser DANS chaque famille, ce qui met les genres au meme niveau de
     precision, ramene la surrepresentation de 15 a 2,5. La piste etait bonne.
     Elle meurt sur autre chose : TRENTE-SEPT genres sur 219 ont moins de cent
     utilisateurs distincts, quinze en ont moins de trente, et huit des seize
     genres techno sont sous ce seuil. Cinq familles sur quatorze ont leurs
     deuxieme et troisieme indiscernables a moins de 10 %. Dans la famille
     techno, Ambient Techno, Dub Techno et Detroit Techno tiennent en trois
     pour cent : ce n'est pas un classement, c'est de l'arrondi ;

     et les noms de familles sont des HOMONYMES, verifie dans les definitions
     de Last.fm lui-meme : `hardcore` y designe d'abord le hardcore punk,
     `roots` le reggae roots, `bass` « la basse, la voix de basse, plusieurs
     choses ».

   YOUTUBE, mediane des vues des morceaux du genre. Elle mesure la popularite
   DES MORCEAUX CHOISIS, pas celle du genre. La mediane corrige le biais du
   nombre de morceaux retenus, correlation qui tombe de 0,38 a 0,14, mais elle
   ne corrige pas celui du choix lui-meme.

   LES DEUX NE SE CONFIRMENT PAS : correlation des logarithmes de 0,27.

   CONCLUSION, ET ELLE EST LA RAISON D'ETRE DE CE BLOC : aucune source publique
   ne mesure la notoriete d'un genre PRECIS. La carte dimensionne donc par la
   descendance, seule grandeur qui vienne du corpus lui-meme et ne depende
   d'aucun service. Les deux mesures d'ecoute restent affichees sur la fiche du
   genre, en clair et datees, parce qu'une donnee biaisee pour dimensionner
   peut rester lisible comme information. */

const MESURES_VUES: Record<string, number> =
  VUES.genres !== null && typeof VUES.genres === 'object' ? (VUES.genres as Record<string, number>) : {};
const MESURES_REACH: Record<string, number> =
  LASTFM.genres !== null && typeof LASTFM.genres === 'object' ? (LASTFM.genres as Record<string, number>) : {};

export const releveVues = typeof VUES.releve === 'string' ? VUES.releve : null;
export const releveReach = typeof LASTFM.releve === 'string' ? LASTFM.releve : null;

/* SOUS CENT AUDITEURS DISTINCTS, ON N'ECRIT PAS LE CHIFFRE.

   Trente-sept genres sont dans ce cas. Ecrire « connu de 24 auditeurs »
   donnerait a vingt-quatre personnes l'autorite d'un releve, alors que c'est
   du bruit. On dit donc que la source est pauvre sur ce genre, ce qui est
   l'information vraie. */
export const SEUIL_REACH = 100;

export interface Ecoute {
  /** Utilisateurs distincts ayant tague ce genre sur Last.fm. 0 si inconnu. */
  readonly reach: number;
  /** Mediane des vues YouTube des morceaux du genre. 0 si inconnue. */
  readonly vues: number;
}

export const ecouteDe = (id: string): Ecoute => ({
  reach: MESURES_REACH[id] ?? 0,
  vues: MESURES_VUES[id] ?? 0
});
