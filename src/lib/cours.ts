/* LES COURS « PRODUIRE CE STYLE », UN PAR GENRE.
 *
 * Mika, le 14 septembre 2026 : « un bouton pour lire des cours sur la
 * musique quand on clique sur un style ». Les textes sont ecrits en francais
 * pour SONAA, a partir du livre que Mika a scanne (The Secrets of Techno
 * Production, Attack Magazine) pour les genres qu'il couvre, et de sources
 * publiques pour les autres. Ce sont des reformulations, jamais des
 * copies : le livre est cite en source, pas reproduit.
 *
 * LE FICHIER EST CHARGE A LA DEMANDE. 219 cours font plusieurs centaines de
 * kilo-octets ; ils ne pesent sur personne tant qu'on n'ouvre pas le
 * bouton. La liste des identifiants, elle, est minuscule et embarquee : c'est
 * elle qui dit si le bouton doit exister. */

import IDS from '../data/cours-ids.json';

export interface Cours {
  readonly tempo: string;
  readonly rythme: string;
  readonly basse: string;
  readonly sons: string;
  readonly arrangement: string;
  readonly mix: string;
  readonly etapes: readonly string[];
  readonly reperes: readonly string[];
  readonly sources: readonly string[];
  /** Les outils les plus utilises pour ce style, du plus determinant au plus accessoire. */
  readonly outils?: readonly { nom: string; type: 'machine' | 'plugin' | 'daw' | 'samples' | 'materiel'; pourquoi: string }[];
  readonly sourcesOutils?: readonly string[];
}

const DISPONIBLES: ReadonlySet<string> = new Set(IDS as string[]);

export function aUnCours(genreId: string): boolean {
  return DISPONIBLES.has(genreId);
}

let chargement: Promise<Record<string, Cours>> | null = null;

export function coursDuGenre(genreId: string): Promise<Cours | null> {
  chargement ??= import('../data/cours.json').then((m) => (m.default ?? m) as Record<string, Cours>);
  return chargement.then((tous) => tous[genreId] ?? null);
}
