/* LE SON DES AFFICHES DE RYTHME : UN PETIT STUDIO, SANS AUCUN ECHANTILLON.

   Mika, le 30 octobre 2026, apres la premiere version : « c'est bien, mais
   avec les sons, parce que c'est ca qui fait la difference ». La premiere
   version jouait la batterie et une basse sur une seule note : un metronome.
   Celle-ci joue de la musique : la tonalite et la gamme du style, ses
   accords, une basse qui bouge, une melodie, une reverberation et un echo
   dosés par style, la pompe du kick sur tout ce qui est tenu, et la forme
   d'un morceau de club (rythme/arrangement.ts).

   TOUT EST FABRIQUE ICI, avec les oscillateurs et le bruit du navigateur :
   pas un fichier a telecharger, pas une licence a tenir, pas un son emprunte
   a quelqu'un. Un charley est six ondes carrees desaccordees dans un filtre,
   comme dans une 808 ; un Rhodes est une sinusoide modulee par une autre ;
   une 303 est une dent de scie dans un filtre resonant qui se referme.

   L'HORLOGE EST CELLE DE L'AUDIO. Les notes sont programmees un peu en
   avance sur l'horloge du contexte, jamais sur un minuteur de page : un
   minuteur derive des qu'un onglet ralentit, l'audio non. Le dessin lit la
   meme horloge. Et parce que la programmation ne depend que du contexte, la
   meme fonction remplit un contexte hors ligne : c'est ainsi que le test
   mesure le niveau de sortie de chaque style sans haut-parleur. */

import type { Motif, Piste, Voix } from '../../lib/rythmes.ts';
import { VOIX_D_ACCORD, VOIX_MELODIQUES } from '../../lib/rythmes.ts';
import { accord, degre, demiTons, frequence } from './theorie.ts';
import { dureeDuPas, etatAu, pasParTemps, plan, type Cycle } from './arrangement.ts';
import { accordeDe, charger, fichierDe, fichiersDuMotif, kitDeFamille, plusProche, type Kit } from './echantillons.ts';

export { dureeDuPas } from './arrangement.ts';

const AVANCE = 0.12;
const PERIODE_MS = 25;

export interface Lecteur {
  /** La position en pas fractionnaires depuis le debut, lue sur l'horloge audio. */
  position(): number;
  arreter(): void;
  /** La sortie, pour l'enregistrer en meme temps que l'image. */
  readonly sortie: MediaStreamAudioDestinationNode | null;
}

type Canal = 'kick' | 'caisse' | 'metal' | 'percu' | 'basse' | 'accords' | 'lead' | 'fx';

const CANAL: Record<Voix, Canal> = {
  kick: 'kick', snare: 'caisse', clap: 'caisse', rim: 'caisse', tom: 'caisse',
  hat: 'metal', openhat: 'metal', ride: 'metal', shaker: 'metal', cowbell: 'metal', metal: 'metal',
  perc: 'percu', conga: 'percu', bongo: 'percu', clave: 'percu',
  bass: 'basse', sub: 'basse', reese: 'basse', logdrum: 'basse', acid: 'basse',
  stab: 'accords', chord: 'accords', rhodes: 'accords', piano: 'accords', strings: 'accords', organ: 'accords', pad: 'accords',
  pluck: 'lead', arp: 'lead', lead: 'lead', hoover: 'lead', vocal: 'lead',
};

/* LE DOSAGE DE CHAQUE CANAL : son niveau, et ce qu'il envoie dans la
   reverberation et l'echo quand le style a tout son espace. Le kick et la
   basse restent secs : un grave reverbere devient une bouillie. */
const DOSAGE: Record<Canal, { niveau: number; reverb: number; echo: number; pompe: boolean }> = {
  kick: { niveau: 0.95, reverb: 0.02, echo: 0, pompe: false },
  caisse: { niveau: 0.55, reverb: 0.35, echo: 0.08, pompe: false },
  metal: { niveau: 0.42, reverb: 0.18, echo: 0.1, pompe: false },
  percu: { niveau: 0.45, reverb: 0.3, echo: 0.2, pompe: false },
  basse: { niveau: 0.4, reverb: 0.02, echo: 0, pompe: true },
  accords: { niveau: 0.32, reverb: 0.55, echo: 0.3, pompe: true },
  lead: { niveau: 0.3, reverb: 0.45, echo: 0.4, pompe: true },
  fx: { niveau: 0.35, reverb: 0.6, echo: 0, pompe: false },
};

interface Studio {
  readonly ac: BaseAudioContext;
  readonly bruit: AudioBuffer;
  readonly canaux: Record<Canal, GainNode>;
  readonly pompe: GainNode;
  /** La derniere hauteur jouee par piste, pour les glissandos de la 303. */
  readonly derniere: Map<number, number>;
  /** Les sons enregistres decodes (echantillons.ts), et le kit du style. */
  readonly banque: Map<string, AudioBuffer>;
  readonly kit: Kit;
}

function bruitBlanc(ac: BaseAudioContext): AudioBuffer {
  const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  return b;
}

/* LA REVERBERATION : une reponse impulsionnelle fabriquee, du bruit stereo
   qui decroit en exponentielle. Assez pour une salle, sans fichier. */
function salle(ac: BaseAudioContext, secondes: number): AudioBuffer {
  const n = Math.round(ac.sampleRate * secondes);
  const b = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c += 1) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i += 1) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
  }
  return b;
}

function courbe(k: number): Float32Array<ArrayBuffer> {
  const n = 2048;
  const c = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return c;
}

function monterStudio(ac: BaseAudioContext, motif: Motif, sortie: AudioNode, banque: Map<string, AudioBuffer>, kit: Kit): Studio {
  const espace = motif.espace ?? 0.4;
  const grain = motif.grain ?? 0.2;

  const sature = ac.createWaveShaper();
  sature.curve = courbe(1 + grain * 3);
  sature.oversample = '2x';
  const compresseur = ac.createDynamicsCompressor();
  compresseur.threshold.value = -16;
  compresseur.knee.value = 8;
  compresseur.ratio.value = 4;
  compresseur.attack.value = 0.004;
  compresseur.release.value = 0.12;
  const maitre = ac.createGain();
  /* Plus un style est sature, plus il est dense et sonne fort a crete
     egale : le gabber sortait 10 dB au-dessus de la deep house. Le volume
     general baisse avec le grain pour que passer d'un style a l'autre ne
     surprenne pas l'oreille. */
  maitre.gain.value = 0.95 * (1 - grain * 0.4);
  sature.connect(compresseur).connect(maitre).connect(sortie);

  const reverb = ac.createConvolver();
  reverb.buffer = salle(ac, 1.6 + espace * 2.2);
  const retourReverb = ac.createGain();
  retourReverb.gain.value = 0.5;
  reverb.connect(retourReverb).connect(sature);

  /* L'ECHO a la croche pointee, filtre dans sa boucle pour que chaque
     repetition soit plus sombre que la precedente. */
  const echo = ac.createDelay(2);
  echo.delayTime.value = Math.min(1.9, (60 / motif.bpm) * 0.75);
  const boucle = ac.createGain();
  boucle.gain.value = 0.32 + espace * 0.18;
  const sombre = ac.createBiquadFilter();
  sombre.type = 'lowpass';
  sombre.frequency.value = 2800;
  echo.connect(sombre).connect(boucle).connect(echo);
  const retourEcho = ac.createGain();
  retourEcho.gain.value = 0.55;
  sombre.connect(retourEcho).connect(sature);

  const pompe = ac.createGain();
  pompe.connect(sature);

  const canaux = {} as Record<Canal, GainNode>;
  for (const nom of Object.keys(DOSAGE) as Canal[]) {
    const d = DOSAGE[nom];
    const g = ac.createGain();
    g.gain.value = d.niveau;
    let sortieCanal: AudioNode = g;
    /* Le kick des styles durs passe par sa propre saturation, bien plus
       forte que celle du bus : c'est le kick de gabber, pas tout le mix. */
    if (nom === 'kick' && grain > 0.45) {
      const dur = ac.createWaveShaper();
      dur.curve = courbe(2 + grain * 14);
      const apres = ac.createGain();
      apres.gain.value = 0.6;
      g.connect(dur).connect(apres);
      sortieCanal = apres;
    }
    sortieCanal.connect(d.pompe ? pompe : sature);
    const envoiR = ac.createGain();
    envoiR.gain.value = d.reverb * (0.25 + espace);
    sortieCanal.connect(envoiR).connect(reverb);
    const envoiE = ac.createGain();
    envoiE.gain.value = d.echo * espace;
    sortieCanal.connect(envoiE).connect(echo);
    canaux[nom] = g;
  }
  return { ac, bruit: bruitBlanc(ac), canaux, pompe, derniere: new Map(), banque, kit };
}

/* ── Les briques ─────────────────────────────────────────────────────── */

function enveloppe(s: Studio, t: number, crete: number, attaque: number, chute: number, sortie: AudioNode): GainNode {
  const g = s.ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, crete), t + attaque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attaque + chute);
  g.connect(sortie);
  return g;
}

function souffle(s: Studio, sortie: AudioNode, t: number, crete: number, chute: number, type: BiquadFilterType, f: number, q = 1, attaque = 0.001): void {
  const src = s.ac.createBufferSource();
  src.buffer = s.bruit;
  const filtre = s.ac.createBiquadFilter();
  filtre.type = type;
  filtre.frequency.value = f;
  filtre.Q.value = q;
  src.connect(filtre).connect(enveloppe(s, t, crete, attaque, chute, sortie));
  src.start(t, Math.random() * 1.5);
  src.stop(t + attaque + chute + 0.05);
}

function oscillateur(s: Studio, forme: OscillatorType, f: number, t: number, fin: number, sortie: AudioNode, detune = 0): OscillatorNode {
  const o = s.ac.createOscillator();
  o.type = forme;
  o.frequency.setValueAtTime(f, t);
  o.detune.value = detune;
  o.connect(sortie);
  o.start(t);
  o.stop(fin);
  return o;
}

function filtre(s: Studio, type: BiquadFilterType, f: number, q: number, sortie: AudioNode): BiquadFilterNode {
  const b = s.ac.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  b.connect(sortie);
  return b;
}

/* Les six carres d'un charley de 808, desaccordes en rapports non
   harmoniques : un metal, pas une note. */
const CARRES = [2, 3, 4.16, 5.43, 6.79, 8.21];
function metallique(s: Studio, sortie: AudioNode, t: number, crete: number, chute: number, passeHaut: number): void {
  const hp = filtre(s, 'highpass', passeHaut, 0.7, enveloppe(s, t, crete, 0.001, chute, sortie));
  const bp = filtre(s, 'bandpass', 10000, 0.8, hp);
  for (const r of CARRES) oscillateur(s, 'square', 40 * r, t, t + chute + 0.05, bp);
}

/* ── Les voix ────────────────────────────────────────────────────────── */

interface Coup {
  readonly t: number;
  readonly force: number;
  /** La duree de la note jusqu'a la frappe suivante de la piste, en s. */
  readonly duree: number;
  /** Les hauteurs MIDI : une note, ou l'accord. */
  readonly midi: readonly number[];
  readonly piste: number;
  readonly p: Piste;
}

/* LES SONS ENREGISTRES passent avant le synthetiseur quand ils sont la. Une
   frappe joue son fichier tel quel, a la force du pas ; un instrument
   accorde (piano, piano FM, marimba) joue la note enregistree la plus
   proche, accelere ou ralenti jusqu'a la hauteur voulue, et s'eteint a la
   frappe suivante de sa piste. */
function lireFichier(s: Studio, nom: string, sortie: AudioNode, t: number, niveau: number, vitesse = 1, fin?: number): boolean {
  const b = s.banque.get(nom);
  if (!b) return false;
  const src = s.ac.createBufferSource();
  src.buffer = b;
  src.playbackRate.value = vitesse;
  const g = s.ac.createGain();
  g.gain.setValueAtTime(niveau, t);
  if (fin !== undefined) {
    g.gain.setValueAtTime(niveau, fin);
    g.gain.exponentialRampToValueAtTime(0.0001, fin + 0.25);
  }
  src.connect(g).connect(sortie);
  src.start(t);
  if (fin !== undefined) src.stop(fin + 0.3);
  return true;
}

function jouerEnregistre(s: Studio, voix: Voix, c: Coup): boolean {
  const sortie = s.canaux[CANAL[voix]];
  const a = accordeDe(c.p);
  if (a) {
    let joue = false;
    const niveau = (0.55 / Math.sqrt(c.midi.length)) * c.force;
    for (const m of c.midi) {
      const n = plusProche(a, m);
      joue = lireFichier(s, n.nom, sortie, c.t, niveau, n.vitesse, c.t + Math.min(n.tenue, Math.max(0.3, c.duree * 1.5))) || joue;
    }
    return joue;
  }
  const nom = fichierDe(voix, s.kit);
  if (!nom) return false;
  const niveau = (voix === 'hat' || voix === 'shaker' ? 0.7 : 0.9) * c.force;
  if (!lireFichier(s, nom, sortie, c.t, niveau)) return false;
  /* Le kick enregistre de la LinnDrum ou de la CR-78 est maigre dans le
     grave : une sinusoide courte le double, sous lui. */
  if (voix === 'kick') {
    const o = oscillateur(s, 'sine', 110, c.t, c.t + 0.4, enveloppe(s, c.t, 0.55 * c.force, 0.003, 0.3, sortie));
    o.frequency.exponentialRampToValueAtTime(46, c.t + 0.08);
  }
  return true;
}

function jouerVoix(s: Studio, voix: Voix, c: Coup): void {
  if (jouerEnregistre(s, voix, c)) return;
  const { t, force, duree } = c;
  const sortie = s.canaux[CANAL[voix]];
  const f0 = frequence(c.midi[0] ?? 45);
  switch (voix) {
    case 'kick': {
      const g = enveloppe(s, t, force, 0.002, 0.42, sortie);
      const o = oscillateur(s, 'sine', 165, t, t + 0.5, g);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
      souffle(s, sortie, t, 0.25 * force, 0.012, 'highpass', 3500);
      break;
    }
    case 'snare': {
      const o = oscillateur(s, 'triangle', 190, t, t + 0.2, enveloppe(s, t, 0.5 * force, 0.001, 0.12, sortie));
      o.frequency.exponentialRampToValueAtTime(150, t + 0.05);
      souffle(s, sortie, t, 0.7 * force, 0.2, 'bandpass', 2200, 0.7);
      souffle(s, sortie, t, 0.25 * force, 0.12, 'highpass', 6000);
      break;
    }
    case 'clap':
      for (const d of [0, 0.009, 0.018]) souffle(s, sortie, t + d, 0.8 * force, 0.012, 'bandpass', 1300, 1.4);
      souffle(s, sortie, t + 0.027, 0.85 * force, 0.22, 'bandpass', 1300, 1.2);
      break;
    case 'rim':
      oscillateur(s, 'square', 1750, t, t + 0.06, filtre(s, 'bandpass', 1800, 4, enveloppe(s, t, 0.35 * force, 0.001, 0.035, sortie)));
      break;
    case 'tom': {
      const o = oscillateur(s, 'sine', f0 * 2 > 60 ? Math.min(220, f0 * 2) : 140, t, t + 0.45, enveloppe(s, t, 0.8 * force, 0.002, 0.35, sortie));
      o.frequency.exponentialRampToValueAtTime(o.frequency.value * 0.62, t + 0.25);
      break;
    }
    case 'hat':
      metallique(s, sortie, t, 0.45 * force, 0.045, 7000);
      break;
    case 'openhat':
      metallique(s, sortie, t, 0.38 * force, 0.32, 6500);
      break;
    case 'ride':
      metallique(s, sortie, t, 0.2 * force, 0.7, 4500);
      souffle(s, sortie, t, 0.08 * force, 0.5, 'bandpass', 9000, 0.8);
      break;
    case 'shaker':
      souffle(s, sortie, t, 0.4 * force, 0.07, 'bandpass', 7500, 1.6, 0.012);
      break;
    case 'cowbell': {
      const bp = filtre(s, 'bandpass', 2000, 1.5, enveloppe(s, t, 0.3 * force, 0.001, 0.22, sortie));
      oscillateur(s, 'square', 540, t, t + 0.3, bp);
      oscillateur(s, 'square', 800, t, t + 0.3, bp);
      break;
    }
    case 'metal': {
      /* Un impact d'usine : une modulation de frequence tres inharmonique. */
      const g = enveloppe(s, t, 0.35 * force, 0.001, 0.45, sortie);
      const porteuse = oscillateur(s, 'sine', 310, t, t + 0.5, filtre(s, 'bandpass', 2400, 1.2, g));
      const mod = s.ac.createOscillator();
      mod.frequency.value = 310 * 2.76;
      const indice = s.ac.createGain();
      indice.gain.setValueAtTime(900, t);
      indice.gain.exponentialRampToValueAtTime(40, t + 0.4);
      mod.connect(indice).connect(porteuse.frequency);
      mod.start(t);
      mod.stop(t + 0.5);
      souffle(s, sortie, t, 0.2 * force, 0.15, 'highpass', 4000);
      break;
    }
    case 'conga':
    case 'bongo':
    case 'perc': {
      const f = voix === 'conga' ? 210 : voix === 'bongo' ? 380 : 560;
      const o = oscillateur(s, 'sine', f * 1.25, t, t + 0.3, enveloppe(s, t, 0.7 * force, 0.002, voix === 'conga' ? 0.22 : 0.14, sortie));
      o.frequency.exponentialRampToValueAtTime(f, t + 0.025);
      souffle(s, sortie, t, 0.12 * force, 0.01, 'bandpass', 3000, 1);
      break;
    }
    case 'clave':
      oscillateur(s, 'sine', 2500, t, t + 0.08, enveloppe(s, t, 0.45 * force, 0.001, 0.05, sortie));
      break;

    case 'bass': {
      const fin = t + Math.max(0.12, duree * 0.9);
      const lp = s.ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 3;
      lp.frequency.setValueAtTime(260 + 1500 * force, t);
      lp.frequency.exponentialRampToValueAtTime(220, t + 0.16);
      const g = s.ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.55 * force, t + 0.005);
      g.gain.setValueAtTime(0.55 * force, fin - 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, fin + 0.04);
      lp.connect(g).connect(sortie);
      oscillateur(s, 'sawtooth', f0, t, fin + 0.05, lp);
      oscillateur(s, 'square', f0 / 2, t, fin + 0.05, lp);
      break;
    }
    case 'sub': {
      const fin = t + Math.max(0.15, duree * 0.95);
      const g = s.ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.6 * force, t + 0.01);
      g.gain.setValueAtTime(0.6 * force, fin - 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, fin + 0.05);
      g.connect(sortie);
      oscillateur(s, 'sine', f0, t, fin + 0.06, g);
      break;
    }
    case 'reese': {
      const fin = t + Math.max(0.2, duree * 0.95);
      const lp = s.ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 2;
      const g = s.ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.4 * force, t + 0.02);
      g.gain.setValueAtTime(0.4 * force, fin - 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, fin + 0.06);
      lp.connect(g).connect(sortie);
      lp.frequency.setValueAtTime(380, t);
      lp.frequency.linearRampToValueAtTime(900, fin);
      for (const d of [-14, 0, 13]) oscillateur(s, 'sawtooth', f0, t, fin + 0.08, lp, d);
      break;
    }
    case 'logdrum': {
      /* Le log drum de l'amapiano : une note grave qui tombe d'une quarte
         en vingt millisecondes, courte, legerement saturee. */
      const g = enveloppe(s, t, 0.9 * force, 0.002, Math.min(0.32, duree + 0.08), sortie);
      const o = oscillateur(s, 'sine', f0 * 1.34, t, t + 0.4, g);
      o.frequency.exponentialRampToValueAtTime(f0, t + 0.02);
      oscillateur(s, 'triangle', f0 * 2, t, t + 0.12, enveloppe(s, t, 0.15 * force, 0.001, 0.06, sortie));
      break;
    }
    case 'acid': {
      const fin = t + Math.max(0.1, duree * 0.85);
      const lp = s.ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 16;
      lp.frequency.setValueAtTime(force > 0.8 ? 3200 : 1300, t);
      lp.frequency.exponentialRampToValueAtTime(240, t + 0.18);
      const g = s.ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3 * force, t + 0.004);
      g.gain.setValueAtTime(0.3 * force, fin - 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, fin + 0.03);
      lp.connect(g).connect(sortie);
      const o = oscillateur(s, 'sawtooth', s.derniere.get(c.piste) ?? f0, t, fin + 0.05, lp);
      /* Le glissando de la 303 : on part de la note precedente. */
      o.frequency.exponentialRampToValueAtTime(f0, t + 0.045);
      s.derniere.set(c.piste, f0);
      break;
    }

    case 'stab':
    case 'chord':
    case 'organ':
    case 'strings':
    case 'pad': {
      const reglages = {
        stab: { forme: 'sawtooth' as const, attaque: 0.004, tenue: 0.16, coupe: 2600, niveau: 0.11 },
        chord: { forme: 'sawtooth' as const, attaque: 0.01, tenue: Math.max(0.25, duree), coupe: 1500, niveau: 0.09 },
        organ: { forme: 'sine' as const, attaque: 0.01, tenue: Math.max(0.2, duree * 0.9), coupe: 4000, niveau: 0.08 },
        strings: { forme: 'sawtooth' as const, attaque: 0.18, tenue: Math.max(0.6, duree), coupe: 2200, niveau: 0.07 },
        pad: { forme: 'sawtooth' as const, attaque: 0.35, tenue: Math.max(1.2, duree), coupe: 1100, niveau: 0.08 },
      }[voix];
      const fin = t + reglages.attaque + reglages.tenue;
      const lp = s.ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(voix === 'stab' ? reglages.coupe * 1.6 : reglages.coupe, t);
      if (voix === 'stab') lp.frequency.exponentialRampToValueAtTime(700, t + 0.14);
      const g = s.ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(reglages.niveau * force, t + reglages.attaque);
      g.gain.setValueAtTime(reglages.niveau * force, fin);
      g.gain.exponentialRampToValueAtTime(0.0001, fin + (voix === 'pad' || voix === 'strings' ? 0.6 : 0.08));
      lp.connect(g).connect(sortie);
      for (const m of c.midi) {
        const f = frequence(m);
        const stop = fin + 0.7;
        if (voix === 'organ') {
          for (const h of [1, 2, 3]) oscillateur(s, 'sine', f * h, t, stop, lp);
        } else {
          oscillateur(s, reglages.forme, f, t, stop, lp, -7);
          if (voix !== 'stab') oscillateur(s, reglages.forme, f, t, stop, lp, 7);
        }
      }
      break;
    }
    case 'rhodes':
    case 'piano':
      /* Le Rhodes : une sinusoide modulee par une autre, dont l'indice
         retombe vite ; c'est la cloche de l'attaque puis le rond qui reste.
         Le piano prend une modulation plus dure et plus courte. */
      for (const m of c.midi) {
        const f = frequence(m);
        const tenue = voix === 'rhodes' ? Math.max(0.6, duree * 1.2) : Math.max(0.5, duree);
        const g = enveloppe(s, t, (voix === 'rhodes' ? 0.17 : 0.16) * force, 0.003, tenue, sortie);
        const p = oscillateur(s, 'sine', f, t, t + tenue + 0.1, g);
        const mod = s.ac.createOscillator();
        mod.frequency.value = f * (voix === 'rhodes' ? 1 : 2);
        const indice = s.ac.createGain();
        indice.gain.setValueAtTime(f * (voix === 'rhodes' ? 1.6 : 2.4), t);
        indice.gain.exponentialRampToValueAtTime(f * 0.05, t + (voix === 'rhodes' ? 0.5 : 0.25));
        mod.connect(indice).connect(p.frequency);
        mod.start(t);
        mod.stop(t + tenue + 0.1);
      }
      break;

    case 'pluck':
    case 'arp': {
      const tenue = voix === 'arp' ? 0.14 : 0.24;
      const lp = s.ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 2;
      lp.frequency.setValueAtTime(voix === 'arp' ? 5200 : 4000, t);
      lp.frequency.exponentialRampToValueAtTime(500, t + tenue);
      lp.connect(enveloppe(s, t, 0.36 * force, 0.002, tenue, sortie));
      oscillateur(s, 'sawtooth', f0, t, t + tenue + 0.05, lp);
      oscillateur(s, 'triangle', f0 * 2, t, t + tenue + 0.05, lp);
      break;
    }
    case 'lead':
    case 'hoover':
    case 'vocal': {
      const fin = t + Math.max(0.12, duree * 0.9);
      const g = s.ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      const niveau = (voix === 'hoover' ? 0.13 : voix === 'vocal' ? 0.6 : 0.15) * force;
      g.gain.exponentialRampToValueAtTime(niveau, t + 0.01);
      g.gain.setValueAtTime(niveau, fin - 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, fin + 0.08);
      g.connect(sortie);
      if (voix === 'vocal') {
        /* Une voix hachee : deux formants de « a » sur une dent de scie. */
        const f1 = filtre(s, 'bandpass', 750, 7, g);
        const f2 = filtre(s, 'bandpass', 1200, 7, g);
        const o = oscillateur(s, 'sawtooth', f0, t, fin + 0.1, f1);
        o.connect(f2);
        break;
      }
      const lp = filtre(s, 'lowpass', voix === 'hoover' ? 2400 : 3200, 1, g);
      const ecarts = voix === 'hoover' ? [-28, -9, 9, 28] : [-6, 6];
      for (const d of ecarts) {
        const o = oscillateur(s, 'sawtooth', voix === 'hoover' ? f0 * 0.89 : f0, t, fin + 0.1, lp, d);
        /* Le hoover monte de deux demi-tons a l'attaque, sa signature. */
        if (voix === 'hoover') o.frequency.exponentialRampToValueAtTime(f0, t + 0.08);
      }
      oscillateur(s, 'square', f0 / 2, t, fin + 0.1, lp);
      break;
    }
  }
}

/* ── La partition ────────────────────────────────────────────────────── */

/** La hauteur de base de chaque registre, a partir de la tonique. */
function registres(motif: Motif): { grave: number; medium: number; aigu: number } {
  /* La basse entre la1 et sol#2 : assez grave pour un club, assez haute pour
     un haut-parleur de telephone. */
  const grave = 33 + ((demiTons(motif.tonique) - 9 + 12) % 12);
  return { grave, medium: grave + 24, aigu: grave + 36 };
}

function hauteurs(motif: Motif, piste: Piste, pas: number, mesure: number): number[] {
  const gamme = motif.gamme ?? 'mineure';
  const r = registres(motif);
  if (VOIX_D_ACCORD.includes(piste.voix)) {
    const a = motif.accords?.[mesure % (motif.accords.length || 1)] ?? { degre: 1, couleur: 'triade' as const };
    const base = piste.voix === 'pad' || piste.voix === 'strings' ? r.medium : r.medium + 12;
    return accord(a, gamme).map((x) => base + x);
  }
  if (VOIX_MELODIQUES.includes(piste.voix)) {
    /* LES BASSES SUIVENT L'ACCORD. Leur ligne est ecrite autour de la
       tonique ; quand l'accord de la mesure est bati sur un autre degre, la
       ligne glisse d'autant dans la gamme, comme un bassiste qui suit la
       grille. Les voix aigues gardent leur ligne : un lead ou une 303 qui
       tourne sur la tonique pendant que l'harmonie bouge, c'est voulu. */
    const suit = piste.voix === 'bass' || piste.voix === 'sub' || piste.voix === 'reese' || piste.voix === 'logdrum';
    const a = motif.accords?.[mesure % (motif.accords.length || 1)];
    const d = (piste.notes?.[pas] || 1) + (suit && a ? a.degre - 1 : 0);
    const base =
      piste.voix === 'sub' ? r.grave - 12 :
      piste.voix === 'bass' || piste.voix === 'reese' || piste.voix === 'logdrum' ? r.grave :
      piste.voix === 'acid' ? r.grave + 12 :
      r.aigu;
    return [base + degre(d, gamme)];
  }
  return [r.grave];
}

/** La duree jusqu'a la frappe suivante de la piste, au plus quatre pas. */
function jusquALaSuivante(piste: Piste, pas: number, duree: number): number {
  const n = piste.pas.length;
  for (let k = 1; k <= 4; k += 1) if ((piste.pas[(pas + k) % n] ?? 0) > 0) return k * duree;
  return 4 * duree;
}

/** Programme tout ce qui sonne au pas global `p`, a l'instant `t`. */
function programmerLePas(s: Studio, motif: Motif, cycles: readonly Cycle[] | null, p: number, t: number): void {
  const n = motif.pas;
  const duree = dureeDuPas(motif);
  const pas = p % n;
  const mesure = Math.floor(p / (n === 12 ? 12 : 16));
  const etat = cycles ? etatAu(motif, cycles, p) : null;
  if (etat?.silence) return;
  const swing = n !== 12 && pas % 2 === 1 ? (motif.swing ?? 0) * duree : 0;

  if (etat?.impact) {
    /* L'impact du drop : un souffle large et un sub qui tombe. */
    souffle(s, s.canaux.fx, t, 0.6, 1.4, 'highpass', 900);
    const o = oscillateur(s, 'sine', 90, t, t + 1.2, enveloppe(s, t, 0.7, 0.003, 1, s.canaux.fx));
    o.frequency.exponentialRampToValueAtTime(32, t + 0.9);
  }
  if (etat?.section === 'montee' && pas === 0) {
    /* La montee : un bruit blanc dont le filtre s'ouvre jusqu'au silence. */
    const longueur = (n - pasParTemps(motif)) * duree;
    const src = s.ac.createBufferSource();
    src.buffer = s.bruit;
    src.loop = true;
    const bp = s.ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(350, t);
    bp.frequency.exponentialRampToValueAtTime(7000, t + longueur);
    const g = s.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + longueur);
    g.gain.setValueAtTime(0.0001, t + longueur + 0.001);
    src.connect(bp).connect(g).connect(s.canaux.fx);
    src.start(t);
    src.stop(t + longueur + 0.05);
  }

  const roulement = etat?.section === 'montee' ? motif.pistes.findIndex((x) => x.voix === 'snare' || x.voix === 'clap') : -1;
  motif.pistes.forEach((piste, i) => {
    if (etat && !etat.actives[i]) return;
    let v = piste.pas[pas] ?? 0;
    let force = v === 2 ? 1 : 0.5;
    if (i === roulement) {
      /* Le roulement de la montee : en croches, puis en doubles croches, de
         plus en plus fort. */
      const avance = pas / n;
      v = avance < 0.5 ? (pas % 2 === 0 ? 1 : 0) : 1;
      force = 0.3 + 0.7 * avance;
    }
    if (v === 0) return;
    const coup: Coup = {
      t: t + swing,
      force,
      duree: jusquALaSuivante(piste, pas, duree),
      midi: hauteurs(motif, piste, pas, mesure),
      piste: i,
      p: piste,
    };
    jouerVoix(s, piste.voix, coup);
    if (piste.voix === 'kick') {
      /* La pompe : tout ce qui est tenu s'efface sous le kick et revient. */
      s.pompe.gain.cancelScheduledValues(coup.t);
      s.pompe.gain.setValueAtTime(0.45, coup.t);
      s.pompe.gain.linearRampToValueAtTime(1, coup.t + Math.min(0.32, (60 / motif.bpm) * 0.6));
    }
  });
}

/** Joue le motif. Avec `construire`, il suit la forme d'un morceau (entrees,
    montee, silence, drop) puis tourne sur le drop ; sans, il boucle tel
    quel. `enregistrer` ajoute une sortie lisible par MediaRecorder. */
export async function jouer(motif: Motif, options: { famille: string; enregistrer?: boolean; construire?: boolean }): Promise<Lecteur> {
  /* Le contexte nait et reprend dans le geste du visiteur, avant toute
     attente : Safari refuse de faire sonner un contexte cree apres. */
  const ac = new AudioContext({ latencyHint: 'playback' });
  if (ac.state === 'suspended') void ac.resume();
  const kit = kitDeFamille(options.famille);
  const banque = await charger(ac, fichiersDuMotif(motif, kit));
  /* L'ENREGISTREMENT SE FAIT EN SILENCE : le son va dans la video, pas dans
     les haut-parleurs. Mika, le 30 octobre 2026 : « arrete de jouer la
     musique dans les speakers ». La sortie d'enregistrement suffit a faire
     tourner le graphe audio. */
  const sortie = options.enregistrer ? ac.createMediaStreamDestination() : null;
  const bus = ac.createGain();
  bus.connect(sortie ?? ac.destination);
  const s = monterStudio(ac, motif, bus, banque, kit);
  const cycles = options.construire ? plan(motif) : null;

  const duree = dureeDuPas(motif);
  const debut = ac.currentTime + 0.1;
  let prochain = 0;
  const programmer = (): void => {
    while (debut + prochain * duree < ac.currentTime + AVANCE) {
      programmerLePas(s, motif, cycles, prochain, debut + prochain * duree);
      prochain += 1;
    }
  };
  programmer();
  const minuteur = window.setInterval(programmer, PERIODE_MS);

  return {
    position: () => Math.max(0, (ac.currentTime - debut) / duree),
    arreter: () => {
      window.clearInterval(minuteur);
      void ac.close();
    },
    sortie,
  };
}

/** Le meme morceau rendu hors ligne, pour mesurer ce qui sort. */
export async function rendre(motif: Motif, secondes: number, famille: string, construire = true): Promise<AudioBuffer> {
  const ac = new OfflineAudioContext(2, Math.round(44100 * secondes), 44100);
  const kit = kitDeFamille(famille);
  const s = monterStudio(ac, motif, ac.destination, await charger(ac, fichiersDuMotif(motif, kit)), kit);
  const cycles = construire ? plan(motif) : null;
  const duree = dureeDuPas(motif);
  for (let p = 0; p * duree < secondes; p += 1) programmerLePas(s, motif, cycles, p, 0.05 + p * duree);
  return ac.startRendering();
}
