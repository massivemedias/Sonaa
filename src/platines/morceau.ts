/* UN MORCEAU SUR LES PLATINES, d'ou qu'il vienne : du catalogue d'Audius,
 * ou des fichiers que le DJ a glisses lui-meme (voir caisse.ts). Les
 * platines, la table et le navigateur ne connaissent que ce type ; seule
 * l'adresse du son depend de la source. */

import { adresseDuSon } from './audius.ts';
import { fichierDe } from './caisse.ts';

export type SourceMorceau = 'audius' | 'fichier';

export interface Morceau {
  readonly id: string;
  readonly source: SourceMorceau;
  readonly titre: string;
  readonly artiste: string;
  readonly genre: string;
  readonly label?: string;
  readonly bpm: number | null;
  readonly tonalite: string | null;
  /** En secondes. */
  readonly duree: number;
  readonly pochette: string | null;
  /** La page du morceau chez sa source ; aucune pour un fichier. */
  readonly lien: string | null;
}

/** L'adresse ou la platine va chercher le son, et de quoi la liberer. */
export async function adresseDuMorceau(m: Morceau): Promise<{ adresse: string; liberer: () => void }> {
  if (m.source === 'fichier') {
    const fichier = await fichierDe(m.id);
    if (!fichier) throw new Error('fichier absent');
    const adresse = URL.createObjectURL(fichier);
    return { adresse, liberer: () => URL.revokeObjectURL(adresse) };
  }
  return { adresse: await adresseDuSon(m.id), liberer: () => undefined };
}
