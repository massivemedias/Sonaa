/* LES NEWS PAR MARQUE, COTE PAGE : lire l'archive, et suivre.
 *
 * L'archive (table actu_marques) est remplie deux fois par jour par
 * scripts/moissonner-marques.ts ; la page la lit directement, sans passer
 * par un fichier : elle grossit sans fin, et on y cherche par marque, par
 * machine et par genre. Les suivis (table suivis_marques) sont ceux du
 * compte connecte : une marque entiere, ou une machine. */

import { supabase } from './supabase.ts';

export type GenreActu = 'article' | 'video' | 'discussion';

export interface ActuMarque {
  readonly lien: string;
  readonly genre: GenreActu;
  readonly titre: string;
  readonly source: string;
  readonly date: string | null;
  readonly image: string | null;
  readonly resume: string;
  readonly marques: readonly string[];
  readonly produits: readonly string[];
}

export interface CompteMarque {
  readonly n: number;
  readonly n30: number;
  readonly dernier: string | null;
}

/** Ce qu'on suit : `produit` vide pour la marque entiere. */
export interface Suivi {
  readonly marque: string;
  readonly produit: string;
}

export const cleDeSuivi = (s: Suivi): string => `${s.marque}:${s.produit}`;

export async function comptesDesMarques(): Promise<Map<string, CompteMarque>> {
  if (!supabase) return new Map();
  const { data } = await supabase.rpc('compte_actu_marques');
  return new Map(((data ?? []) as { marque: string; n: number; n30: number; dernier: string | null }[]).map((x) => [x.marque, { n: Number(x.n), n30: Number(x.n30), dernier: x.dernier }]));
}

export interface Filtre {
  readonly marque?: string;
  /** Identifiant qualifie : « elektron:analog-rytm ». */
  readonly produit?: string;
  readonly genre?: GenreActu;
  /** Pour « Mes machines » : la reunion de tout ce qu'on suit. */
  readonly suivis?: readonly Suivi[];
  readonly depuis?: number;
  readonly combien?: number;
}

/** Une page de l'archive, la plus recente d'abord. */
export async function actus(f: Filtre): Promise<ActuMarque[]> {
  if (!supabase) return [];
  const depuis = f.depuis ?? 0;
  let q = supabase
    .from('actu_marques')
    .select('lien, genre, titre, source, date, image, resume, marques, produits')
    .order('date', { ascending: false, nullsFirst: false })
    .range(depuis, depuis + (f.combien ?? 24) - 1);
  if (f.marque) q = q.contains('marques', [f.marque]);
  if (f.produit) q = q.contains('produits', [f.produit]);
  if (f.genre) q = q.eq('genre', f.genre);
  if (f.suivis) {
    const marques = f.suivis.filter((s) => !s.produit).map((s) => s.marque);
    const produits = f.suivis.filter((s) => s.produit).map((s) => `"${s.marque}:${s.produit}"`);
    const ou = [
      ...(marques.length ? [`marques.ov.{${marques.join(',')}}`] : []),
      ...(produits.length ? [`produits.ov.{${produits.join(',')}}`] : []),
    ];
    if (ou.length === 0) return [];
    q = q.or(ou.join(','));
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as ActuMarque[];
}

export async function mesSuivis(): Promise<Suivi[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('suivis_marques').select('marque, produit').order('created_at');
  return (data ?? []) as Suivi[];
}

export async function suivre(s: Suivi, oui: boolean): Promise<void> {
  if (!supabase) throw new Error('base indisponible');
  const { error } = oui
    ? await supabase.from('suivis_marques').insert({ marque: s.marque, produit: s.produit })
    : await supabase.from('suivis_marques').delete().eq('marque', s.marque).eq('produit', s.produit);
  /* Deja suivi (deux onglets, deux clics) : c'est le resultat voulu. */
  if (error && error.code !== '23505') throw new Error(error.message);
}

/** L'identifiant d'une video YouTube dans son adresse, pour la lire ici. */
export function idVideo(lien: string): string | null {
  return lien.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)?.[1] ?? null;
}
