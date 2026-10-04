/* LES CALCULS DES PLATINES, sans son ni ecran : ce qui se teste.
 *
 * Tout ce qui transforme une position de bouton en grandeur (un pitch en
 * BPM, un filtre en frequence, un fader en gain) vit ici, pour que la table
 * et les tests lisent la meme regle. Voir PlatinesPage.tsx. */

/* ═══ LA TONALITE ═══ Audius l'ecrit en toutes lettres (« D flat minor »).
   Un DJ la lit en notation courte (Dbm) et en roue de Camelot (12A), qui
   dit d'un coup d'oeil quels morceaux se melangent : meme numero, ou un de
   plus ou de moins. */
const NOTES: Readonly<Record<string, string>> = {
  'c': 'C', 'c sharp': 'C#', 'd flat': 'Db', 'd': 'D', 'd sharp': 'D#', 'e flat': 'Eb', 'e': 'E', 'f': 'F', 'f sharp': 'F#',
  'g flat': 'Gb', 'g': 'G', 'g sharp': 'G#', 'a flat': 'Ab', 'a': 'A', 'a sharp': 'A#', 'b flat': 'Bb', 'b': 'B',
};
const ENHARMONIE: Readonly<Record<string, string>> = { 'C#': 'Db', 'D#': 'Eb', 'Gb': 'F#', 'G#': 'Ab', 'A#': 'Bb' };
const CAMELOT_MINEUR: Readonly<Record<string, string>> = {
  Ab: '1A', Eb: '2A', Bb: '3A', F: '4A', C: '5A', G: '6A', D: '7A', A: '8A', E: '9A', B: '10A', 'F#': '11A', Db: '12A',
};
const CAMELOT_MAJEUR: Readonly<Record<string, string>> = {
  B: '1B', 'F#': '2B', Db: '3B', Ab: '4B', Eb: '5B', Bb: '6B', F: '7B', C: '8B', G: '9B', D: '10B', A: '11B', E: '12B',
};

/* Les fichiers des DJ l'ecrivent autrement : « Am », « F#m », « Dbmin »,
   « C maj », ou directement en Camelot (« 8A ») quand Mixed In Key est
   passe par la. Toutes ces formes donnent la meme reponse. */
function noteEtMode(cle: string): { note: string; mineur: boolean } | null {
  const longue = /^\s*([a-g](?:\s+(?:flat|sharp))?)\s+(major|minor)\s*$/i.exec(cle);
  if (longue) {
    const note = NOTES[(longue[1] ?? '').toLowerCase().replace(/\s+/g, ' ')];
    return note ? { note, mineur: (longue[2] ?? '').toLowerCase() === 'minor' } : null;
  }
  const camelot = /^\s*(1[0-2]|[1-9])\s*([ab])\s*$/i.exec(cle);
  if (camelot) {
    const code = `${camelot[1]}${(camelot[2] ?? '').toUpperCase()}`;
    const table = code.endsWith('A') ? CAMELOT_MINEUR : CAMELOT_MAJEUR;
    const note = Object.keys(table).find((n) => table[n] === code);
    return note ? { note, mineur: code.endsWith('A') } : null;
  }
  const courte = /^\s*([a-g])\s*([#b♯♭])?\s*(m|min|minor|maj|major)?\s*$/i.exec(cle);
  if (courte) {
    const alteration = courte[2] === '♯' ? '#' : courte[2] === '♭' ? 'b' : (courte[2] ?? '');
    const note = `${(courte[1] ?? '').toUpperCase()}${alteration}`;
    const mode = courte[3] ?? '';
    return { note, mineur: mode === 'm' || /^min/i.test(mode) };
  }
  return null;
}

export function tonaliteCourte(cle: string | null | undefined): { nom: string; camelot: string } | null {
  const lu = noteEtMode(cle ?? '');
  if (!lu) return null;
  const canon = ENHARMONIE[lu.note] ?? lu.note;
  const camelot = (lu.mineur ? CAMELOT_MINEUR : CAMELOT_MAJEUR)[canon];
  if (!camelot) return null;
  return { nom: `${lu.note.replace('b', '♭').replace('#', '♯')}${lu.mineur ? 'm' : ''}`, camelot };
}

/* ═══ LE PITCH ═══ Le fader va de -1 a +1 ; la plage (3, 6 ou 12 %) dit ce
   que vaut son bout. Comme sur une CDJ, tirer le fader vers soi accelere. */
export const PLAGES_PITCH = [6, 12, 3] as const;

export const pitchEnPourcent = (fader: number, plage: number): number => Math.round(fader * plage * 100) / 100;

export const vitesse = (pitch: number): number => 1 + pitch / 100;

export const bpmAffiche = (bpm: number | null, pitch: number): string => (bpm && bpm > 0 ? (bpm * vitesse(pitch)).toFixed(1) : '---.-');

/* ═══ LE FILTRE ═══ Un seul bouton par voie, comme sur une Xone : au milieu
   il ne fait rien ; a gauche il ferme les aigus (passe-bas), a droite il
   coupe les basses (passe-haut). La course est exponentielle, parce que
   l'oreille entend les octaves, pas les hertz. */
export function filtreDuBouton(v: number): { type: 'aucun' | 'bas' | 'haut'; frequence: number } {
  if (Math.abs(v) < 0.03) return { type: 'aucun', frequence: 0 };
  const x = Math.min(1, Math.abs(v));
  if (v < 0) return { type: 'bas', frequence: 20000 * (150 / 20000) ** x };
  return { type: 'haut', frequence: 20 * (6000 / 20) ** x };
}

/* ═══ L'EGALISEUR ═══ De -1 a +1 : la gauche coupe presque tout (-26 dB),
   la droite pousse de 6 dB. Le milieu est neutre. */
export const decibelsEq = (v: number): number => (v < 0 ? v * 26 : v * 6);

export const gainDesDecibels = (db: number): number => 10 ** (db / 20);

/* ═══ LES FADERS ═══ La voie suit une courbe douce (le haut du fader garde
   l'essentiel du volume) ; le crossfader garde une puissance constante au
   milieu, pour qu'un enchainement ne creuse pas. */
export const gainDuFader = (x: number): number => Math.max(0, Math.min(1, x)) ** 2;

export function crossfader(x: number): { a: number; b: number } {
  const t = (Math.max(-1, Math.min(1, x)) + 1) / 2;
  return { a: Math.cos((t * Math.PI) / 2), b: Math.sin((t * Math.PI) / 2) };
}

/* ═══ LE TEMPS ═══ L'ecran d'une CDJ montre le temps restant, au dixieme. */
export function tempsAffiche(secondes: number): string {
  const s = Math.max(0, secondes);
  const min = Math.floor(s / 60);
  const reste = s - min * 60;
  return `${String(min).padStart(2, '0')}:${reste.toFixed(1).padStart(4, '0')}`;
}

/* La duree d'un nombre de temps a un tempo donne : ce que lisent le delay
   et le gate pour tomber sur la mesure. */
export const dureeDesTemps = (bpm: number, temps: number): number => (60 / (bpm > 0 ? bpm : 120)) * temps;

/* ═══ LA DOSE D'UN EFFET ═══ Ce qu'un potard d'effet fait au son sec et au
   son traite. La disto, le crush et le trans remplacent le son sec a mesure
   qu'on monte ; le chorus et le flanger s'y melangent ; le delay et la
   reverb s'y ajoutent, comme des envois, et le son sec reste entier. */
export function dosage(nom: string, dose: number): { sec: number; humide: number } {
  const d = Math.max(0, Math.min(1, dose));
  if (nom === 'delay') return { sec: 1, humide: d * 0.8 };
  if (nom === 'reverb') return { sec: 1, humide: d * 0.9 };
  if (nom === 'chorus' || nom === 'flanger') return { sec: 1 - d * 0.5, humide: d * 0.8 };
  return { sec: 1 - d, humide: d };
}

/* ═══ LA FORME D'ONDE ═══ Le maximum absolu par tranche, sur tous les
   canaux : de quoi dessiner l'onde a n'importe quel zoom sans relire les
   millions d'echantillons a chaque image. */
export function pics(canaux: readonly Float32Array[], tranches: number): Float32Array {
  const longueur = canaux[0]?.length ?? 0;
  const sortie = new Float32Array(tranches);
  if (longueur === 0 || tranches <= 0) return sortie;
  const pas = longueur / tranches;
  for (let i = 0; i < tranches; i += 1) {
    const debut = Math.floor(i * pas);
    const fin = Math.min(longueur, Math.floor((i + 1) * pas));
    let max = 0;
    /* Un echantillon sur plusieurs dans les longues tranches : l'onde reste
       juste a l'oeil, et le calcul ne fige pas un telephone. */
    const saut = Math.max(1, Math.floor((fin - debut) / 256));
    for (const c of canaux) {
      for (let j = debut; j < fin; j += saut) {
        const v = Math.abs(c[j] ?? 0);
        if (v > max) max = v;
      }
    }
    sortie[i] = max;
  }
  return sortie;
}

/* ═══ LES LED DU VU-METRE ═══ Quinze segments, comme la colonne de la
   DJM-1000 decrite dans le guide des machines : de -36 dB pour le premier a
   0 dB pour le dernier, le rouge. Une crete lineaire ne se lit pas en
   segments egaux, l'oreille entend en decibels. */
export const LED_DU_VU = 15;
export function ledsAllumees(crete: number, segments: number = LED_DU_VU): number {
  if (!(crete > 0)) return 0;
  const db = 20 * Math.log10(crete);
  const part = (db + 36) / 36;
  return Math.max(0, Math.min(segments, Math.ceil(part * segments)));
}

/* ═══ LE BPM D'UN FICHIER ═══ Audius donne le tempo ; un fichier glisse
   par un DJ ne le donne pas toujours. On l'ecoute : l'amplitude du son monte
   a chaque coup (l'enveloppe d'attaques), et cette enveloppe se ressemble
   a elle-meme quand on la decale d'un temps. L'amplitude, et non son
   logarithme : en logarithme, un charley pese autant qu'une grosse caisse,
   et le tempo glisse aux deux tiers. On cherche le decalage qui lui
   ressemble le plus, entre 78 et 180 BPM, sur une minute prise au milieu du
   morceau, la ou il tourne. Le resultat se cale a l'entier quand il en est
   tout proche : la musique de club est presque toujours a un BPM rond. */
export function estimerBpm(signal: Float32Array, frequence: number): number | null {
  const pas = Math.max(1, Math.round(frequence / 200));
  const images = Math.floor(signal.length / pas);
  if (images < 400) return null;
  const debut = Math.max(0, Math.floor(images / 2) - 6000);
  const fin = Math.min(images, debut + 12000);
  const energie = new Float32Array(fin - debut);
  for (let k = 0; k < energie.length; k += 1) {
    let e = 0;
    const o = (debut + k) * pas;
    for (let i = 0; i < pas; i += 1) {
      const v = signal[o + i] ?? 0;
      e += v * v;
    }
    energie[k] = Math.sqrt(e / pas);
  }
  const attaques = new Float32Array(energie.length);
  for (let k = 1; k < energie.length; k += 1) attaques[k] = Math.max(0, (energie[k] ?? 0) - (energie[k - 1] ?? 0));
  const imagesParSeconde = frequence / pas;
  const decalageMin = Math.floor((60 / 180) * imagesParSeconde);
  const decalageMax = Math.ceil((60 / 78) * imagesParSeconde);
  const scores = new Float32Array(decalageMax + 2);
  for (let d = decalageMin - 1; d <= decalageMax + 1; d += 1) {
    let s = 0;
    for (let k = d; k < attaques.length; k += 1) s += (attaques[k] ?? 0) * (attaques[k - d] ?? 0);
    scores[d] = s / (attaques.length - d);
  }
  let meilleur = -1;
  for (let d = decalageMin; d <= decalageMax; d += 1) if (meilleur < 0 || (scores[d] ?? 0) > (scores[meilleur] ?? 0)) meilleur = d;
  if (meilleur < 0 || !((scores[meilleur] ?? 0) > 0)) return null;
  /* Le sommet entre deux images, par une parabole. */
  const a = scores[meilleur - 1] ?? 0;
  const b = scores[meilleur] ?? 0;
  const c = scores[meilleur + 1] ?? 0;
  const courbure = a - 2 * b + c;
  const decalage = meilleur + (courbure !== 0 ? (0.5 * (a - c)) / courbure : 0);
  const bpm = (60 * imagesParSeconde) / decalage;
  const rond = Math.round(bpm);
  return Math.abs(bpm - rond) < 0.3 ? rond : Math.round(bpm * 10) / 10;
}
