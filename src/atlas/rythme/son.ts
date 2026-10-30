/* LE MOTIF JOUE PAR UN PETIT SYNTHETISEUR, SANS AUCUN ECHANTILLON.

   Chaque voix est fabriquee avec les oscillateurs et le bruit du navigateur :
   un kick est une sinusoide qui plonge, un charley un souffle filtre dans
   l'aigu, une 303 une dent de scie dans un filtre resonant qui se referme.
   Pas un fichier a telecharger, pas une licence a tenir. Le son est celui
   d'une boite a rythmes d'ecole, et c'est ce qu'on lui demande : faire
   entendre OU tombent les frappes.

   L'HORLOGE EST CELLE DE L'AUDIO. Les notes sont programmees un peu en
   avance sur l'horloge du contexte audio, jamais sur un minuteur de page :
   un minuteur derive des qu'un onglet ralentit, l'audio non. Le dessin lit
   la meme horloge, si bien que l'image et le son ne se decalent pas. */

import type { Motif, Voix } from '../../lib/rythmes.ts';

const AVANCE = 0.12;
const PERIODE_MS = 25;

/* LA FONDAMENTALE, un la grave : la page ne connait pas la tonalite des
   morceaux, et une seule note tenue ne trompe personne. */
const LA1 = 55;

export interface Lecteur {
  /** La position en pas fractionnaires, lue sur l'horloge audio. */
  position(): number;
  arreter(): void;
  /** La sortie, pour l'enregistrer en meme temps que l'image. */
  readonly sortie: MediaStreamAudioDestinationNode | null;
}

function bruit(ac: BaseAudioContext): AudioBuffer {
  const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  return b;
}

function enveloppe(ac: BaseAudioContext, t: number, crete: number, attaque: number, chute: number): GainNode {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, crete), t + attaque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attaque + chute);
  return g;
}

function souffle(ac: BaseAudioContext, buffer: AudioBuffer, sortie: AudioNode, t: number, crete: number, chute: number, type: BiquadFilterType, f: number, q = 1): void {
  const s = ac.createBufferSource();
  s.buffer = buffer;
  const filtre = ac.createBiquadFilter();
  filtre.type = type;
  filtre.frequency.value = f;
  filtre.Q.value = q;
  const g = enveloppe(ac, t, crete, 0.002, chute);
  s.connect(filtre).connect(g).connect(sortie);
  s.start(t, Math.random() * 0.5);
  s.stop(t + chute + 0.05);
}

function ton(ac: BaseAudioContext, sortie: AudioNode, t: number, forme: OscillatorType, de: number, a: number, crete: number, chute: number, glisse = 0.08): void {
  const o = ac.createOscillator();
  o.type = forme;
  o.frequency.setValueAtTime(de, t);
  if (a !== de) o.frequency.exponentialRampToValueAtTime(a, t + glisse);
  const g = enveloppe(ac, t, crete, 0.003, chute);
  o.connect(g).connect(sortie);
  o.start(t);
  o.stop(t + chute + 0.05);
}

function jouerVoix(ac: BaseAudioContext, buffer: AudioBuffer, sortie: AudioNode, voix: Voix, t: number, force: number, rang: number): void {
  const v = force === 2 ? 1 : 0.45;
  switch (voix) {
    case 'kick':
      ton(ac, sortie, t, 'sine', 160, 42, 1.1 * v, 0.42, 0.11);
      break;
    case 'snare':
      souffle(ac, buffer, sortie, t, 0.55 * v, 0.18, 'bandpass', 1900, 0.8);
      ton(ac, sortie, t, 'triangle', 220, 160, 0.35 * v, 0.1, 0.05);
      break;
    case 'clap':
      for (const d of [0, 0.011, 0.022]) souffle(ac, buffer, sortie, t + d, 0.5 * v, d === 0.022 ? 0.2 : 0.02, 'bandpass', 1200, 1.2);
      break;
    case 'rim':
      ton(ac, sortie, t, 'square', 1700, 1700, 0.18 * v, 0.03);
      break;
    case 'hat':
      souffle(ac, buffer, sortie, t, 0.28 * v, 0.045, 'highpass', 7500);
      break;
    case 'openhat':
      souffle(ac, buffer, sortie, t, 0.25 * v, 0.28, 'highpass', 6500);
      break;
    case 'ride':
      souffle(ac, buffer, sortie, t, 0.16 * v, 0.45, 'bandpass', 8500, 0.7);
      break;
    case 'shaker':
      souffle(ac, buffer, sortie, t, 0.2 * v, 0.06, 'bandpass', 6000, 1.5);
      break;
    case 'conga':
      ton(ac, sortie, t, 'sine', 240, 200, 0.6 * v, 0.2, 0.03);
      break;
    case 'bongo':
      ton(ac, sortie, t, 'sine', 380, 330, 0.5 * v, 0.12, 0.03);
      break;
    case 'perc':
      ton(ac, sortie, t, 'sine', 520, 440, 0.4 * v, 0.1, 0.02);
      break;
    case 'clave':
      ton(ac, sortie, t, 'sine', 2500, 2500, 0.35 * v, 0.05);
      break;
    case 'cowbell':
      ton(ac, sortie, t, 'square', 540, 540, 0.12 * v, 0.2);
      ton(ac, sortie, t, 'square', 800, 800, 0.12 * v, 0.2);
      break;
    case 'tom':
      ton(ac, sortie, t, 'sine', 140, 90, 0.7 * v, 0.3, 0.12);
      break;
    case 'sub':
      ton(ac, sortie, t, 'sine', LA1, LA1, 0.8 * v, 0.28);
      break;
    case 'bass': {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = LA1 * (force === 2 ? 1 : 2);
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(180, t + 0.18);
      const g = enveloppe(ac, t, 0.4 * v, 0.004, 0.22);
      o.connect(f).connect(g).connect(sortie);
      o.start(t);
      o.stop(t + 0.3);
      break;
    }
    case 'acid': {
      /* La 303 : dent de scie, filtre resonant qui se referme, et l'octave
         au-dessus sur les accents, comme les lignes qui sautent. */
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = LA1 * 2 * (force === 2 && rang % 3 === 0 ? 2 : 1);
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = 14;
      f.frequency.setValueAtTime(force === 2 ? 2600 : 1200, t);
      f.frequency.exponentialRampToValueAtTime(260, t + 0.16);
      const g = enveloppe(ac, t, 0.22 * v, 0.003, 0.18);
      o.connect(f).connect(g).connect(sortie);
      o.start(t);
      o.stop(t + 0.25);
      break;
    }
    case 'stab':
    case 'chord':
      for (const m of [1, 1.189, 1.498]) {
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = LA1 * 8 * m;
        const f = ac.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = voix === 'stab' ? 2400 : 1400;
        const g = enveloppe(ac, t, 0.07 * v, 0.004, voix === 'stab' ? 0.14 : 0.35);
        o.connect(f).connect(g).connect(sortie);
        o.start(t);
        o.stop(t + 0.45);
      }
      break;
    case 'pad':
      for (const m of [1, 1.189, 1.498, 2]) {
        const o = ac.createOscillator();
        o.type = 'triangle';
        o.frequency.value = LA1 * 4 * m;
        const g = enveloppe(ac, t, 0.06 * v, 0.35, 1.6);
        o.connect(g).connect(sortie);
        o.start(t);
        o.stop(t + 2.1);
      }
      break;
    case 'pluck':
      ton(ac, sortie, t, 'triangle', LA1 * 8, LA1 * 8, 0.25 * v, 0.22);
      break;
    case 'vocal': {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = LA1 * 4;
      const f = ac.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 800;
      f.Q.value = 6;
      const g = enveloppe(ac, t, 0.3 * v, 0.02, 0.25);
      o.connect(f).connect(g).connect(sortie);
      o.start(t);
      o.stop(t + 0.32);
      break;
    }
  }
}

/** La duree d'un pas, en secondes : un double-croche en 16 et 32 pas, un
    croche de mesure ternaire en 12. */
export function dureeDuPas(motif: Motif): number {
  const noire = 60 / motif.bpm;
  return motif.pas === 12 ? noire / 3 : noire / 4;
}

/** Joue le motif en boucle. `enregistrer` ajoute une sortie lisible par
    MediaRecorder, en plus des haut-parleurs. */
export function jouer(motif: Motif, enregistrer = false): Lecteur {
  const ac = new AudioContext();
  const buffer = bruit(ac);
  const compresseur = ac.createDynamicsCompressor();
  compresseur.threshold.value = -14;
  compresseur.ratio.value = 4;
  const maitre = ac.createGain();
  maitre.gain.value = 0.7;
  maitre.connect(compresseur).connect(ac.destination);
  const sortie = enregistrer ? ac.createMediaStreamDestination() : null;
  if (sortie) compresseur.connect(sortie);

  const duree = dureeDuPas(motif);
  const debut = ac.currentTime + 0.08;
  let prochain = 0;
  const programmer = (): void => {
    while (debut + prochain * duree < ac.currentTime + AVANCE) {
      const t = debut + prochain * duree;
      const i = prochain % motif.pas;
      motif.pistes.forEach((p) => {
        const force = p.pas[i] ?? 0;
        if (force > 0) jouerVoix(ac, buffer, maitre, p.voix, t, force, i);
      });
      prochain += 1;
    }
  };
  programmer();
  const minuteur = window.setInterval(programmer, PERIODE_MS);
  if (ac.state === 'suspended') void ac.resume();

  return {
    position: () => Math.max(0, (ac.currentTime - debut) / duree),
    arreter: () => {
      window.clearInterval(minuteur);
      void ac.close();
    },
    sortie,
  };
}
