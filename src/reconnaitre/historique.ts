/* LES VINGT DERNIERES RECONNAISSANCES, DANS LE NAVIGATEUR.
 *
 * Elles ne partent nulle part : ni base, ni passerelle, ni compte. C'est une
 * memoire locale, pour retrouver le style entendu la veille dans un bar, et
 * elle s'efface d'un bouton. La modale de consentement le promet, ce module
 * est l'endroit ou cette promesse est tenue ou trahie.
 *
 * VINGT, ET PAS PLUS. Une liste qui grandit sans fin finit par peser dans le
 * stockage local, qui est partage avec le panier, le theme et la langue. */

export const CLE_HISTORIQUE = 'sonaa.reconnaissances.v1';
export const MAX_HISTORIQUE = 20;

export interface Reconnaissance {
  /** Millisecondes depuis 1970, pour trier et afficher. */
  readonly quand: number;
  /** Les trois meilleurs styles, etiquettes brutes du modele. */
  readonly styles: readonly { readonly discogs: string; readonly score: number }[];
  /** Le morceau, quand AudD l'a reconnu. */
  readonly artiste?: string | undefined;
  readonly titre?: string | undefined;
}

const vide: Reconnaissance[] = [];

function estReconnaissance(x: unknown): x is Reconnaissance {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return typeof r['quand'] === 'number' && Array.isArray(r['styles']);
}

export function lireHistorique(): readonly Reconnaissance[] {
  try {
    const brut = localStorage.getItem(CLE_HISTORIQUE);
    if (!brut) return vide;
    const lu: unknown = JSON.parse(brut);
    return Array.isArray(lu) ? lu.filter(estReconnaissance).slice(0, MAX_HISTORIQUE) : vide;
  } catch {
    return vide;
  }
}

/** Range une reconnaissance en tete, et rend la liste telle qu'elle est
    desormais. La plus ancienne tombe au-dela de vingt. */
export function ajouterAlHistorique(r: Reconnaissance): readonly Reconnaissance[] {
  const liste = [r, ...lireHistorique()].slice(0, MAX_HISTORIQUE);
  try {
    localStorage.setItem(CLE_HISTORIQUE, JSON.stringify(liste));
  } catch {
    /* Stockage plein ou refuse : la reconnaissance s'affiche quand meme, elle
       ne survivra pas au rechargement. */
  }
  return liste;
}

export function viderHistorique(): readonly Reconnaissance[] {
  try {
    localStorage.removeItem(CLE_HISTORIQUE);
  } catch {
    /* Rien a faire : il n'y avait de toute facon rien de range. */
  }
  return vide;
}
