/* LES LIENS D'ACHAT DU MATERIEL, ET CE QU'ILS RAPPORTENT. Voir
 * docs/adr/ADR-111-liens-d-affiliation.md.
 *
 * Mika, le 27 octobre 2026 : « de la pub bien placee et dans le theme du
 * site, musique electronique et materiel de production ». Pas de banniere :
 * un lien d'achat la ou l'on parle deja d'une machine ou d'un plugin, dans
 * les 219 cours « Produire ce style » et sur la page de chaque machine des
 * news par marque. Un achat fait par ce lien rapporte une commission a Mika,
 * sans rien couter de plus a l'acheteur.
 *
 * DEUX BOUTIQUES, CHACUNE POUR CE QU'ELLE VEND LE MIEUX. Plugin Boutique
 * pour les plugins, les logiciels et les banques de sons. Reverb pour les
 * machines, neuves ou d'occasion : la TR-909, le Juno-106 ou l'Akai S950
 * des cours ne se trouvent plus que la.
 *
 * SANS IDENTIFIANT, PAS DE LIEN. Un lien qui fait sortir du site sans rien
 * rapporter n'a pas sa place (Mika, le 27 octobre : « je veux pas que les
 * gens sortent du site »). Les identifiants ne sont pas des secrets : ils
 * sont ecrits en clair dans chaque lien. Mika les obtient en s'inscrivant
 * lui-meme aux deux programmes. */

export type Boutique = 'pluginboutique' | 'reverb' | 'amazon';

export interface Identifiants {
  /** L'identifiant d'affilie Plugin Boutique, le parametre `a_aid` de ses liens. */
  readonly pluginboutique: string;
  /** Reverb passe par le reseau Awin : l'identifiant d'editeur de Mika chez Awin. */
  readonly awinEditeur: string;
  /** Et l'identifiant de Reverb comme annonceur chez Awin (`awinmid`). */
  readonly awinReverb: string;
  /** L'identifiant de suivi Partenaires Amazon.ca de Mika, le parametre `tag`
      (de la forme `xxxx-20`). */
  readonly amazon: string;
}

export const IDENTIFIANTS: Identifiants = {
  pluginboutique: '',
  awinEditeur: '3138255',
  awinReverb: '67144',
  amazon: 'sonaa-20',
};

export interface LienDAchat {
  readonly boutique: Boutique;
  readonly url: string;
}

/* LES MODULES D'ABLETON NE S'ACHETENT PAS A PART : Operator, Simpler ou
   Echo viennent avec Live. Les proposer menerait a une recherche vide. */
const LIVRE_AVEC_LIVE = /^Ableton (?!Live\b|Push\b)/i;

/** Le lien d'achat d'un outil, selon son type, ou null si la boutique qui
    le vend n'est pas encore branchee. */
export function lienDAchat(nom: string, type: string, ids: Identifiants = IDENTIFIANTS): LienDAchat | null {
  const q = nom.trim();
  if (!q) return null;
  if (type === 'plugin' || type === 'daw' || type === 'samples') {
    if (!ids.pluginboutique || LIVRE_AVEC_LIVE.test(q)) return null;
    return {
      boutique: 'pluginboutique',
      url: `https://www.pluginboutique.com/search?q=${encodeURIComponent(q)}&a_aid=${encodeURIComponent(ids.pluginboutique)}`,
    };
  }
  if (type === 'machine' || type === 'materiel') {
    if (!ids.awinEditeur || !ids.awinReverb) return null;
    const cible = `https://reverb.com/marketplace?query=${encodeURIComponent(q)}`;
    return {
      boutique: 'reverb',
      url: `https://www.awin1.com/cread.php?awinmid=${encodeURIComponent(ids.awinReverb)}&awinaffid=${encodeURIComponent(ids.awinEditeur)}&ued=${encodeURIComponent(cible)}`,
    };
  }
  return null;
}

/* AMAZON.CA EN SECOND, POUR LES MACHINES SEULEMENT. Mika, le 28 octobre
   2026 : « branche aussi Amazon.ca ». Reverb reste le premier lien, parce
   que les machines des cours sont souvent vintage ; Amazon vend le materiel
   neuf (controleurs, interfaces, casques, synthes actuels) et livre vite au
   Canada. Il ne vend presque pas de plugins : pas de lien Amazon pour eux. */
export function lienAmazon(nom: string, type: string, ids: Identifiants = IDENTIFIANTS): LienDAchat | null {
  const q = nom.trim();
  if (!q || !ids.amazon) return null;
  if (type !== 'machine' && type !== 'materiel') return null;
  return {
    boutique: 'amazon',
    url: `https://www.amazon.ca/s?k=${encodeURIComponent(q)}&tag=${encodeURIComponent(ids.amazon)}`,
  };
}

/** Tous les liens d'achat d'un outil, la boutique principale d'abord. */
export function liensDAchat(nom: string, type: string, ids: Identifiants = IDENTIFIANTS): LienDAchat[] {
  return [lienDAchat(nom, type, ids), lienAmazon(nom, type, ids)].filter((l): l is LienDAchat => l !== null);
}

/** Le type d'outil d'une marque des news : les editeurs de plugins et de
    logiciels vendent des plugins, les autres des machines. */
export function typeDuGroupe(groupe: string): 'plugin' | 'machine' {
  return groupe === 'plugins' || groupe === 'logiciels' ? 'plugin' : 'machine';
}

export const NOM_DE_BOUTIQUE: Record<Boutique, string> = {
  pluginboutique: 'Plugin Boutique',
  reverb: 'Reverb',
  amazon: 'Amazon',
};
