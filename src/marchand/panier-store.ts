/* LE PANIER, ET RIEN QUE LE PANIER.
 *
 * Phase 0 de la couche marchande, 17 septembre 2026 : rien ne se vend encore.
 * Ce module existe quand meme, et vide, parce que le panier est le seul objet
 * que toutes les phases suivantes vont toucher. L'ecrire une fois, seul, avec
 * son test, coute moins cher que de le faire naitre au milieu du paiement.
 *
 * IL VIT DANS LE NAVIGATEUR, PAS EN BASE. Un panier anonyme doit survivre a
 * un rechargement sans exiger de compte : c'est `localStorage`, sous une cle
 * versionnee. Quand la phase B ouvrira la vente, le panier d'un visiteur qui
 * se connecte sera FUSIONNE avec celui de son compte, et c'est la cle
 * versionnee qui rendra cette fusion lisible.
 *
 * TOUTE LECTURE PEUT ECHOUER. Navigation privee, stockage refuse, quota
 * plein : chaque acces est garde, et l'echec rend un panier vide plutot que
 * de casser la page. Meme regle que le theme dans index.html.
 *
 * UN SEUL EVENEMENT. Le badge du menu, l'ecran du panier et n'importe quel
 * bouton « ajouter » lisent le meme etat ; ils le relisent quand cet
 * evenement passe. Sans lui, le badge afficherait le compte d'hier. */

export const CLE_PANIER = 'sonaa.panier.v1';

/** L'evenement emis a chaque changement du panier, sur `window`. */
export const EVENEMENT_PANIER = 'sonaa:panier';

/* LES SORTES D'ARTICLES SONT DECLAREES MAINTENANT, meme si une seule servira
   d'abord. Elles viennent du plan des phases : un morceau, une sortie, une
   mixtape, un billet, un pourboire. Le jour ou la billetterie arrive, le
   panier n'a pas a changer de forme. */
export type SorteArticle = 'track' | 'release' | 'mixtape' | 'billet' | 'pourboire';

export interface ArticlePanier {
  readonly sorte: SorteArticle;
  /** L'identifiant de la chose achetee, dans sa propre table. */
  readonly ref: string;
  readonly titre: string;
  readonly artiste?: string | undefined;
  /** En unites de la devise, jamais en cents : la base stockera du numeric. */
  readonly prix: number;
  readonly devise: string;
  readonly quantite: number;
}

const vide: ArticlePanier[] = [];

/* UNE LIGNE EST IDENTIFIEE PAR SA SORTE ET SA REFERENCE, pas par sa seule
   reference : rien n'interdit qu'un billet et un morceau portent le meme
   identifiant, ils ne vivent pas dans la meme table. */
const memeLigne = (a: ArticlePanier, sorte: SorteArticle, ref: string): boolean =>
  a.sorte === sorte && a.ref === ref;

function estArticle(x: unknown): x is ArticlePanier {
  if (typeof x !== 'object' || x === null) return false;
  const a = x as Record<string, unknown>;
  return (
    typeof a['sorte'] === 'string' &&
    typeof a['ref'] === 'string' &&
    typeof a['titre'] === 'string' &&
    typeof a['prix'] === 'number' &&
    Number.isFinite(a['prix']) &&
    typeof a['devise'] === 'string' &&
    typeof a['quantite'] === 'number' &&
    Number.isFinite(a['quantite']) &&
    (a['quantite'] as number) > 0
  );
}

/** Le panier tel qu'il est range. Rend une liste vide si rien n'est lisible :
    un stockage refuse n'est pas une erreur, c'est un panier vide. */
export function lirePanier(): readonly ArticlePanier[] {
  try {
    const brut = localStorage.getItem(CLE_PANIER);
    if (!brut) return vide;
    const lu: unknown = JSON.parse(brut);
    if (!Array.isArray(lu)) return vide;
    /* ON FILTRE AU LIEU DE FAIRE CONFIANCE. Ce qui est dans le stockage a pu
       etre ecrit par une version precedente, ou a la main par curiosite. */
    return lu.filter(estArticle);
  } catch {
    return vide;
  }
}

function ecrire(articles: readonly ArticlePanier[]): readonly ArticlePanier[] {
  try {
    if (articles.length === 0) localStorage.removeItem(CLE_PANIER);
    else localStorage.setItem(CLE_PANIER, JSON.stringify(articles));
  } catch {
    /* Stockage plein ou refuse : le panier reste celui de cette page, et il
       ne survivra pas au rechargement. Mieux vaut cela qu'une page cassee. */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENEMENT_PANIER));
  } catch {
    /* Hors navigateur, au pre-rendu : il n'y a personne a prevenir. */
  }
  return articles;
}

/** Ajoute un article, ou augmente la quantite de celui qui est deja la. */
export function ajouterAuPanier(article: ArticlePanier): readonly ArticlePanier[] {
  const actuels = lirePanier();
  const deja = actuels.find((a) => memeLigne(a, article.sorte, article.ref));
  if (!deja) return ecrire([...actuels, article]);
  return ecrire(
    actuels.map((a) =>
      memeLigne(a, article.sorte, article.ref) ? { ...a, quantite: a.quantite + article.quantite } : a
    )
  );
}

/** Retire une ligne entiere, quelle que soit sa quantite. */
export function retirerDuPanier(sorte: SorteArticle, ref: string): readonly ArticlePanier[] {
  return ecrire(lirePanier().filter((a) => !memeLigne(a, sorte, ref)));
}

export function viderLePanier(): readonly ArticlePanier[] {
  return ecrire([]);
}

/** Le nombre d'articles, quantites comprises. C'est ce que porte le badge. */
export function compterLePanier(articles: readonly ArticlePanier[] = lirePanier()): number {
  return articles.reduce((n, a) => n + a.quantite, 0);
}

/* LE SOUS-TOTAL SE CALCULE EN CENTS, PAS EN NOMBRES A VIRGULE. 0,1 + 0,2 ne
   fait pas 0,3 en virgule flottante, et un panier de trois morceaux a 1,10
   afficherait 3,3000000000000003. On multiplie par cent, on additionne des
   entiers, on redivise a la fin. */
export function sousTotal(articles: readonly ArticlePanier[] = lirePanier()): number {
  const cents = articles.reduce((n, a) => n + Math.round(a.prix * 100) * a.quantite, 0);
  return cents / 100;
}

/** La devise du panier, ou null s'il est vide. Une seule devise a la fois :
    un panier qui melangerait deux monnaies ne saurait pas s'additionner. */
export function deviseDuPanier(articles: readonly ArticlePanier[] = lirePanier()): string | null {
  return articles[0]?.devise ?? null;
}
