/* CE QUE L'AFFICHE DE RYTHME ET LE REEL DU JEUDI PARTAGENT : les formats
   video essayes, les textes de l'affiche, le telechargement. Le reel du
   jeudi (ADR-115) se termine par l'affiche du style de son label : il a
   besoin des memes textes que la page du style. */

import { langue, t } from '../../langue/langue.ts';
import type { Motif } from '../../lib/rythmes.ts';
import type { TextesAffiche } from './dessin.ts';

/** Les formats essayes dans l'ordre : le MP4, qu'Instagram accepte tel
    quel, puis le WebM la ou le MP4 n'existe pas. */
export const TYPES = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];

/* La tonalite s'ecrit avec les vrais signes : Eb devient E♭, F#m devient F♯m. */
const tonaliteLisible = (x: string): string => x.replace(/^([A-G])b/, '$1♭').replace('#', '♯');

export function textesDe(motif: Motif, titre: string, famille: string): TextesAffiche {
  const l = langue === 'fr' ? 'fr' : 'en';
  return {
    titre,
    devise: motif.devise[l],
    entete: `${famille.toUpperCase()} · ${motif.bpm} BPM · ${motif.instruments[l]}`,
    resume: motif.resume[l],
    racine: motif.racine[l],
    mesure: `BPM · ${t.rythmeMesure} ${motif.mesure}${motif.tonalite ? ` · ${tonaliteLisible(motif.tonalite)}` : ''}`,
    signature: 'SONAA.CA',
    langue: l,
    sections: t.rythmeSections,
  };
}

export function telecharger(blob: Blob, nom: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
