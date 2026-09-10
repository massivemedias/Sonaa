/* CE QUE L'ADMINISTRATION LIT, ET RIEN D'AUTRE.
 *
 * Trois lectures reservees a la moderation, toutes gardees COTE BASE par
 * is_moderator() dans des fonctions en security definer : un compte qui
 * n'est pas moderateur recoit zero ligne, pas une erreur, et rien ici ne
 * pourrait lui en montrer davantage. La page d'administration est une
 * commodite ; la serrure est en base. Voir la migration du 10 septembre
 * 2026, admin_et_sets_moderation. */

import { supabase } from './supabase.ts';

export interface Membre {
  readonly user_id: string;
  readonly courriel: string;
  readonly inscrit_le: string;
  readonly derniere_connexion: string | null;
  readonly fournisseurs: string | null;
  readonly artiste_nom: string | null;
  readonly n_sets: number;
  readonly n_sets_publies: number;
  readonly n_soirees: number;
  readonly moderateur: boolean;
}

export interface SetAdmin {
  readonly id: string;
  readonly titre: string;
  readonly audio_path: string;
  readonly cover_path: string | null;
  readonly duree_s: number | null;
  readonly ecoutes: number;
  readonly created_at: string;
  readonly publie: boolean;
  readonly genre_ids: string[] | null;
  readonly user_id: string;
  readonly artiste_nom: string | null;
  readonly courriel: string | null;
}

export async function listerMembres(): Promise<Membre[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_membres');
  if (error) throw new Error(error.message);
  return (data as Membre[] | null) ?? [];
}

export async function listerTousLesSets(): Promise<SetAdmin[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_sets');
  if (error) throw new Error(error.message);
  return (data as SetAdmin[] | null) ?? [];
}

/** Les noms d'artistes cherches sur le site qu'aucune source ne connaissait.
    La passerelle les tient dans sa file ; la moisson de la nuit les
    redemande. Liste publique, sans secret. */
export async function artistesDemandes(): Promise<string[]> {
  const r = await fetch('https://sonaa-sets.massivemedias.workers.dev/api/artistes-demandes');
  if (!r.ok) throw new Error(String(r.status));
  const j = (await r.json()) as unknown;
  return Array.isArray(j) ? j.filter((x): x is string => typeof x === 'string') : [];
}
