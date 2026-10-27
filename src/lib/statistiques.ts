/* LES STATISTIQUES, LUES DANS LA BASE. Voir lib/mesure.ts pour ce qui est
 * mesure, et supabase/migrations/20261027120000_mesure.sql pour les deux
 * fonctions : `stats_site` (moderation seulement) et `stats_mes_mixtapes`
 * (un artiste, sur ses seules mixtapes). Un « visiteur » ou un « auditeur »
 * est une personne d'un jour : l'identifiant change chaque jour. */

import { supabase } from './supabase.ts';

export interface StatsSite {
  readonly visiteurs: number;
  readonly visiteurs_avant: number;
  readonly vues: number;
  readonly vues_avant: number;
  readonly sessions: number;
  readonly par_jour: readonly { jour: string; visiteurs: number; vues: number }[];
  readonly pages: readonly { chemin: string; vues: number; visiteurs: number }[];
  readonly referents: readonly { referent: string; sessions: number }[];
  readonly pays: readonly { pays: string; visiteurs: number }[];
  readonly villes: readonly { ville: string; pays: string; visiteurs: number }[];
  readonly appareils: readonly { appareil: string; visiteurs: number }[];
  readonly langues: readonly { langue: string; visiteurs: number }[];
  readonly heures: readonly { heure: number; vues: number }[];
  readonly mixtapes: readonly { id: string; titre: string; auditeurs: number; minutes: number }[];
}

export interface StatsArtiste {
  readonly ecoutes_total: number;
  readonly auditeurs: number;
  readonly minutes: number;
  readonly moyenne_s: number;
  readonly completes: number;
  readonly vues_pages: number;
  readonly visiteurs_pages: number;
  readonly likes: number;
  readonly commentaires: number;
  readonly par_jour: readonly { jour: string; auditeurs: number; minutes: number }[];
  readonly pays: readonly { pays: string; auditeurs: number; minutes: number }[];
  readonly villes: readonly { ville: string; pays: string; auditeurs: number }[];
  readonly sources: readonly { source: string; auditeurs: number }[];
  readonly appareils: readonly { appareil: string; auditeurs: number }[];
  readonly mixtapes: readonly {
    id: string;
    titre: string;
    duree_s: number | null;
    ecoutes: number;
    auditeurs: number;
    minutes: number;
    moyenne_s: number;
    likes: number;
    commentaires: number;
  }[];
}

export async function statsSite(jours: number): Promise<StatsSite> {
  if (!supabase) throw new Error('base indisponible');
  const { data, error } = await supabase.rpc('stats_site', { jours });
  if (error) throw new Error(error.message);
  return data as StatsSite;
}

export async function statsMesMixtapes(jours: number): Promise<StatsArtiste> {
  if (!supabase) throw new Error('base indisponible');
  const { data, error } = await supabase.rpc('stats_mes_mixtapes', { jours });
  if (error) throw new Error(error.message);
  return data as StatsArtiste;
}

/* D'OU VIENT UNE VISITE, EN CLAIR. Les adresses de renvoi sont des noms
   d'hote (l.facebook.com, m.facebook.com, www.google.ca...) : on les range
   sous le nom du service, et on additionne. */
const SERVICES: readonly [RegExp, string][] = [
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)google\.[a-z.]+$/, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'X'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)reddit\.com$/, 'Reddit'],
  [/(^|\.)soundcloud\.com$/, 'SoundCloud'],
  [/(^|\.)linktr\.ee$/, 'Linktree'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'WhatsApp'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, 'ChatGPT'],
  [/(^|\.)claude\.ai$/, 'Claude'],
];

export function nomDeSource(referent: string, direct: string): string {
  if (!referent) return direct;
  for (const [motif, nom] of SERVICES) if (motif.test(referent)) return nom;
  return referent;
}

/** Les lignes regroupees sous un meme nom, additionnees, de la plus forte a
    la plus faible. */
export function regrouper<T>(lignes: readonly T[], nom: (x: T) => string, valeur: (x: T) => number): { nom: string; valeur: number }[] {
  const m = new Map<string, number>();
  for (const x of lignes) m.set(nom(x), (m.get(nom(x)) ?? 0) + valeur(x));
  return [...m.entries()].map(([n, v]) => ({ nom: n, valeur: v })).sort((a, b) => b.valeur - a.valeur);
}
