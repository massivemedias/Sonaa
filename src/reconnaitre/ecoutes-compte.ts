/* LES ECOUTES D'UN COMPTE, dans la table ecoutes.
 *
 * Mika, le 30 septembre 2026 : connecte, l'historique des reconnaissances
 * suit le compte d'un appareil a l'autre. Sans compte, il reste dans le
 * navigateur (historique.ts), et ce module ne sert pas.
 *
 * LA TABLE NE REND QUE LES LIGNES DE QUI DEMANDE : la politique de lecture
 * compare user_id a auth.uid(). Le filtre ecrit ici en plus n'est pas une
 * securite, c'est ce que supabase-js exige pour effacer.
 *
 * LES DEUX MEMOIRES SE LISENT ENSEMBLE. Ce qui a ete reconnu avant la
 * connexion reste dans le navigateur et n'est pas envoye au compte sans
 * qu'on le demande : on l'affiche a cote, trie par date, et « Effacer »
 * vide les deux. Voir fusionner. */

import { supabase } from '../lib/supabase.ts';
import { MAX_HISTORIQUE, type Reconnaissance } from './historique.ts';

interface Ligne {
  readonly quand: string;
  readonly styles: unknown;
  readonly artiste: string | null;
  readonly titre: string | null;
  readonly pochette: string | null;
}

function versReconnaissance(l: Ligne): Reconnaissance {
  const styles = Array.isArray(l.styles)
    ? l.styles.filter(
        (s): s is { discogs: string; score: number } =>
          typeof s === 'object' && s !== null && typeof (s as { discogs?: unknown }).discogs === 'string'
      )
    : [];
  return {
    quand: Date.parse(l.quand),
    styles: styles.map((s) => ({ discogs: s.discogs, score: Number(s.score) || 0 })),
    ...(l.artiste ? { artiste: l.artiste } : {}),
    ...(l.titre ? { titre: l.titre } : {}),
    ...(l.pochette ? { pochette: l.pochette } : {}),
  };
}

/** Les vingt dernieres ecoutes du compte, ou null sans base ou sur erreur :
    la page retombe alors sur la memoire du navigateur seule. */
export async function lireEcoutesDuCompte(): Promise<readonly Reconnaissance[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('ecoutes')
    .select('quand, styles, artiste, titre, pochette')
    .order('quand', { ascending: false })
    .limit(MAX_HISTORIQUE);
  if (error || !data) return null;
  return (data as Ligne[]).map(versReconnaissance);
}

/** Range une ecoute dans le compte. L'echec est silencieux : l'ecoute est
    deja a l'ecran, et la memoire du navigateur la garde (voir l'appelant). */
export async function ajouterEcouteAuCompte(r: Reconnaissance): Promise<boolean> {
  if (!supabase) return false;
  const pochette = r.pochette?.startsWith('https://') ? r.pochette : null;
  const { error } = await supabase.from('ecoutes').insert({
    quand: new Date(r.quand).toISOString(),
    styles: r.styles.slice(0, 5),
    artiste: r.artiste?.slice(0, 300) ?? null,
    titre: r.titre?.slice(0, 300) ?? null,
    pochette,
  });
  return !error;
}

/** Efface toutes les ecoutes du compte. */
export async function viderEcoutesDuCompte(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('ecoutes').delete().eq('user_id', userId);
}

/** Les deux memoires en une liste : la plus recente d'abord, sans doublon
    (une meme ecoute a la meme milliseconde), vingt au plus. */
export function fusionner(
  compte: readonly Reconnaissance[],
  local: readonly Reconnaissance[]
): readonly Reconnaissance[] {
  const vues = new Set<number>();
  return [...compte, ...local]
    .sort((a, b) => b.quand - a.quand)
    .filter((r) => (vues.has(r.quand) ? false : (vues.add(r.quand), true)))
    .slice(0, MAX_HISTORIQUE);
}
