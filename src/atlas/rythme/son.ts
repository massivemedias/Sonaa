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
import { accordeDe, charger, fichierDe, fichiersDuMotif, kitDuMotif, plusProche, type Kit } from './echantillons.ts';

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
  readonly motif: Motif;
  readonly famille: string;
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

function monterStudio(ac: BaseAudioContext, motif: Motif, famille: string, sortie: AudioNode, banque: Map<string, AudioBuffer>, kit: Kit): Studio {
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
  return { ac, motif, famille, bruit: bruitBlanc(ac), canaux, pompe, derniere: new Map(), banque, kit };
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
  const nom = fichierDe(voix, s.kit, c.p);
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
  const grain = s.motif.grain ?? 0.2;
  const inst = `${s.motif.instruments.fr} ${s.motif.instruments.en} ${s.motif.resume.fr} ${s.motif.resume.en}`.toUpperCase();
  const etik = `${c.p.fr} ${c.p.en}`.toUpperCase();
  const est808 = /808/.test(inst) || /808/.test(etik) || s.famille === 'electro';
  const estBreak = /BREAK|AMEN/.test(etik) || /AMEN/.test(inst);

  switch (voix) {
    case 'kick': {
      if (s.famille === 'hardcore' || /GABBER|HARDCORE|TERROR|UPTEMPO|SPEEDCORE/.test(etik) || grain >= 0.8) {
        /* Le kick gabber / hardcore : attaque percante qui plonge de 340 Hz
           vers un corps carre/sinus distordu qui gronde sur toute la noire. */
        const tenue = Math.min(0.46, Math.max(0.24, duree * 0.92));
        const g = enveloppe(s, t, 0.95 * force, 0.001, tenue, sortie);
        const o = oscillateur(s, 'sine', 340, t, t + tenue + 0.05, g);
        o.frequency.exponentialRampToValueAtTime(95, t + 0.028);
        o.frequency.exponentialRampToValueAtTime(52, t + tenue);
        const carre = oscillateur(s, 'square', 110, t, t + tenue + 0.04, filtre(s, 'lowpass', 420, 2.8, enveloppe(s, t, 0.38 * force, 0.002, tenue * 0.85, sortie)));
        carre.frequency.exponentialRampToValueAtTime(52, t + 0.04);
        souffle(s, sortie, t, 0.35 * force, 0.014, 'bandpass', 2800, 1.5);
        break;
      }
      if (s.famille === 'psy') {
        /* Le kick psytrance : un balayage sinusoidal ultra-propre et tendu,
           de 280 Hz a 46 Hz en 55 ms, avec un clic sec au sommet. */
        const g = enveloppe(s, t, force, 0.001, 0.22, sortie);
        const o = oscillateur(s, 'sine', 280, t, t + 0.25, g);
        o.frequency.exponentialRampToValueAtTime(46, t + 0.055);
        souffle(s, sortie, t, 0.18 * force, 0.006, 'highpass', 4800);
        break;
      }
      if (est808) {
        /* Le kick TR-808 : attaque douce et longue fondamentale ronde. */
        const tenue = Math.min(0.65, Math.max(0.38, duree * 1.1));
        const g = enveloppe(s, t, force, 0.003, tenue, sortie);
        const o = oscillateur(s, 'sine', 130, t, t + tenue + 0.06, g);
        o.frequency.exponentialRampToValueAtTime(43, t + 0.09);
        oscillateur(s, 'triangle', 86, t, t + 0.05, enveloppe(s, t, 0.22 * force, 0.001, 0.04, sortie));
        break;
      }
      /* Le kick TR-909 (house, techno, trance) : punch franc a 185 Hz,
         descente rapide a 49 Hz et clic d'attaque net. */
      const g = enveloppe(s, t, force, 0.0015, 0.38, sortie);
      const o = oscillateur(s, 'sine', 185, t, t + 0.44, g);
      o.frequency.exponentialRampToValueAtTime(49, t + 0.075);
      oscillateur(s, 'triangle', 120, t, t + 0.06, enveloppe(s, t, 0.25 * force, 0.001, 0.045, sortie));
      souffle(s, sortie, t, 0.24 * force, 0.01, 'highpass', 3600);
      break;
    }
    case 'snare': {
      if (/BALAIS|BRUSH/.test(etik)) {
        souffle(s, sortie, t, 0.48 * force, 0.28, 'bandpass', 2600, 0.9, 0.018);
        break;
      }
      if (/BRUIT|NOISE|IMPACT/.test(etik)) {
        souffle(s, sortie, t, 0.78 * force, 0.26, 'bandpass', 1600, 0.8);
        const o = oscillateur(s, 'sine', 140, t, t + 0.22, enveloppe(s, t, 0.55 * force, 0.001, 0.18, sortie));
        o.frequency.exponentialRampToValueAtTime(58, t + 0.14);
        break;
      }
      if (estBreak || s.famille === 'breaks' || s.famille === 'bass') {
        /* Caisse claire de breakbeat / Amen : fondamentale haute a 235 Hz,
           timbre sec et claquant. */
        const o = oscillateur(s, 'triangle', 235, t, t + 0.16, enveloppe(s, t, 0.65 * force, 0.001, 0.1, sortie));
        o.frequency.exponentialRampToValueAtTime(175, t + 0.04);
        souffle(s, sortie, t, 0.78 * force, 0.17, 'bandpass', 2900, 0.85);
        souffle(s, sortie, t, 0.35 * force, 0.09, 'highpass', 5800);
        break;
      }
      if (est808) {
        /* Caisse claire 808 : deux oscillateurs accordes et un souffle court. */
        oscillateur(s, 'triangle', 180, t, t + 0.14, enveloppe(s, t, 0.5 * force, 0.001, 0.1, sortie));
        oscillateur(s, 'sine', 330, t, t + 0.1, enveloppe(s, t, 0.3 * force, 0.001, 0.07, sortie));
        souffle(s, sortie, t, 0.65 * force, 0.15, 'highpass', 2400);
        break;
      }
      /* Caisse claire 909 : deux tons qui tombent et un timbre large. */
      const o1 = oscillateur(s, 'triangle', 205, t, t + 0.2, enveloppe(s, t, 0.52 * force, 0.001, 0.12, sortie));
      o1.frequency.exponentialRampToValueAtTime(145, t + 0.05);
      const o2 = oscillateur(s, 'sine', 340, t, t + 0.12, enveloppe(s, t, 0.28 * force, 0.001, 0.08, sortie));
      o2.frequency.exponentialRampToValueAtTime(220, t + 0.04);
      souffle(s, sortie, t, 0.72 * force, 0.2, 'bandpass', 2200, 0.7);
      souffle(s, sortie, t, 0.28 * force, 0.13, 'highpass', 5800);
      break;
    }
    case 'clap':
      /* Le clap 909 / 808 : quatre micro-impulsions serrees puis la traine. */
      for (const d of [0, 0.008, 0.016, 0.025]) souffle(s, sortie, t + d, 0.75 * force, 0.011, 'bandpass', 1250, 1.3);
      souffle(s, sortie, t + 0.028, 0.85 * force, est808 ? 0.26 : 0.19, 'bandpass', 1350, 1.1);
      break;
    case 'rim':
      if (/CLIC|CLICK|IMPULS|SNAP|CLAQUEMENT/.test(etik)) {
        souffle(s, sortie, t, 0.5 * force, 0.012, 'bandpass', 4200, 2.5);
        oscillateur(s, 'sine', 2400, t, t + 0.018, enveloppe(s, t, 0.35 * force, 0.0005, 0.014, sortie));
        break;
      }
      /* Rimshot 909 / 808 : deux frequences boisees tres courtes. */
      oscillateur(s, 'triangle', 1680, t, t + 0.045, filtre(s, 'bandpass', 1750, 3.5, enveloppe(s, t, 0.42 * force, 0.0008, 0.03, sortie)));
      oscillateur(s, 'square', 460, t, t + 0.035, filtre(s, 'bandpass', 500, 2.5, enveloppe(s, t, 0.22 * force, 0.0008, 0.022, sortie)));
      break;
    case 'tom': {
      const fTom = /AIGU|HIGH/.test(etik) ? 230 : /GRAVE|LOW|TIMBALE|TIMPANI|IMPACT/.test(etik) ? 105 : f0 * 2 > 60 ? Math.min(210, f0 * 2) : 145;
      const tenue = /TIMBALE|TIMPANI|IMPACT/.test(etik) ? 0.55 : 0.34;
      const o = oscillateur(s, 'sine', fTom, t, t + tenue + 0.08, enveloppe(s, t, 0.8 * force, 0.002, tenue, sortie));
      o.frequency.exponentialRampToValueAtTime(fTom * 0.58, t + tenue * 0.75);
      break;
    }
    case 'hat':
      if (/BRUIT|NOISE|ROBINET|TAP/.test(etik)) {
        souffle(s, sortie, t, 0.42 * force, 0.08, 'bandpass', 3800, 1.2);
        break;
      }
      if (/CLIC|CLICK/.test(etik)) {
        souffle(s, sortie, t, 0.45 * force, 0.01, 'highpass', 8500);
        break;
      }
      if (estBreak) {
        souffle(s, sortie, t, 0.48 * force, 0.055, 'bandpass', 8200, 1.1);
        metallique(s, sortie, t, 0.25 * force, 0.04, 7200);
        break;
      }
      metallique(s, sortie, t, 0.42 * force, est808 ? 0.038 : 0.048, est808 ? 7600 : 6800);
      souffle(s, sortie, t, 0.16 * force, 0.035, 'highpass', 8500);
      break;
    case 'openhat':
      metallique(s, sortie, t, 0.36 * force, est808 ? 0.36 : 0.28, 6500);
      souffle(s, sortie, t, 0.18 * force, 0.24, 'highpass', 8000);
      break;
    case 'ride':
      metallique(s, sortie, t, 0.22 * force, 0.65, 4500);
      souffle(s, sortie, t, 0.1 * force, 0.48, 'bandpass', 8800, 0.8);
      break;
    case 'shaker':
      souffle(s, sortie, t, 0.4 * force, 0.07, 'bandpass', 7500, 1.6, 0.012);
      break;
    case 'cowbell': {
      /* La cloche 808 : 540 Hz et 800 Hz en ondes carrees filtrees. */
      const bp = filtre(s, 'bandpass', 1950, 1.6, enveloppe(s, t, 0.32 * force, 0.001, 0.24, sortie));
      oscillateur(s, 'square', 540, t, t + 0.3, bp);
      oscillateur(s, 'square', 800, t, t + 0.3, bp);
      break;
    }
    case 'metal': {
      /* Impact metallique ou gong (industrie, techno, ambient). */
      const tenue = /GONG/.test(etik) ? 1.1 : 0.45;
      const base = /GONG/.test(etik) ? 190 : 310;
      const g = enveloppe(s, t, 0.35 * force, 0.001, tenue, sortie);
      const porteuse = oscillateur(s, 'sine', base, t, t + tenue + 0.05, filtre(s, 'bandpass', base * 6.5, 1.2, g));
      const mod = s.ac.createOscillator();
      mod.frequency.value = base * 2.76;
      const indice = s.ac.createGain();
      indice.gain.setValueAtTime(900, t);
      indice.gain.exponentialRampToValueAtTime(40, t + tenue * 0.85);
      mod.connect(indice).connect(porteuse.frequency);
      mod.start(t);
      mod.stop(t + tenue + 0.05);
      souffle(s, sortie, t, 0.2 * force, 0.15, 'highpass', 4000);
      break;
    }
    case 'conga':
    case 'bongo':
    case 'perc': {
      if (/AMEN|BREAK/.test(etik)) {
        /* Tranche de breakbeat : alternance de caisse fantome et de charley. */
        if (force > 0.75) {
          const o = oscillateur(s, 'triangle', 225, t, t + 0.12, enveloppe(s, t, 0.48 * force, 0.001, 0.08, sortie));
          o.frequency.exponentialRampToValueAtTime(165, t + 0.035);
          souffle(s, sortie, t, 0.55 * force, 0.12, 'bandpass', 2800, 0.9);
        } else {
          souffle(s, sortie, t, 0.38 * force, 0.045, 'bandpass', 7200, 1.2);
        }
        break;
      }
      if (/CLIC|CLICK|GLITCH|MICRO|GRAIN|IMPULS|PAPIER|PAPER/.test(etik)) {
        const fClic = 2200 + ((c.piste * 977) % 3600);
        souffle(s, sortie, t, 0.45 * force, 0.016, 'bandpass', fClic, 3.2);
        oscillateur(s, 'sine', fClic * 0.8, t, t + 0.02, enveloppe(s, t, 0.28 * force, 0.0005, 0.015, sortie));
        break;
      }
      if (/GRINCEMENT|SQUEAK/.test(etik)) {
        /* Le bed squeak du Jersey club : un glissando aigu qui couine. */
        const g = enveloppe(s, t, 0.32 * force, 0.008, 0.14, sortie);
        const o = oscillateur(s, 'sawtooth', 620, t, t + 0.16, filtre(s, 'bandpass', 1450, 4.5, g));
        o.frequency.exponentialRampToValueAtTime(980, t + 0.07);
        o.frequency.exponentialRampToValueAtTime(540, t + 0.14);
        break;
      }
      if (/SCRATCH/.test(etik)) {
        const g = enveloppe(s, t, 0.42 * force, 0.004, 0.12, sortie);
        const o = oscillateur(s, 'sawtooth', 320, t, t + 0.14, filtre(s, 'bandpass', 1800, 2.2, g));
        o.frequency.exponentialRampToValueAtTime(1100, t + 0.06);
        o.frequency.exponentialRampToValueAtTime(260, t + 0.12);
        souffle(s, sortie, t, 0.25 * force, 0.09, 'bandpass', 2600, 1.5);
        break;
      }
      const f = voix === 'conga' ? 210 : voix === 'bongo' ? 380 : /TABLA/.test(etik) ? 260 : 540;
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
      if (/WOBBLE|GROWL|WARP|MARTEAU|HAMMER/.test(etik)) {
        /* Basse dubstep / brostep / speed garage : modulation d'ouverture de
           filtre et de timbre FM au tempo du pas. */
        const lp = s.ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 5.5;
        lp.frequency.setValueAtTime(180, t);
        lp.frequency.exponentialRampToValueAtTime(2400 * force, t + duree * 0.45);
        lp.frequency.exponentialRampToValueAtTime(210, fin);
        const g = s.ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.55 * force, t + 0.008);
        g.gain.setValueAtTime(0.55 * force, fin - 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, fin + 0.04);
        lp.connect(g).connect(sortie);
        const p = oscillateur(s, 'sawtooth', f0, t, fin + 0.05, lp);
        const mod = s.ac.createOscillator();
        mod.type = 'sine';
        mod.frequency.value = f0 * 2;
        const idx = s.ac.createGain();
        idx.gain.setValueAtTime(f0 * 3.5 * force, t);
        idx.gain.exponentialRampToValueAtTime(f0 * 0.4, fin);
        mod.connect(idx).connect(p.frequency);
        mod.start(t);
        mod.stop(fin + 0.05);
        oscillateur(s, 'sine', f0 / 2, t, fin + 0.05, g);
        break;
      }
      if (/REVERSE/.test(etik)) {
        /* Reverse bass (hardstyle / hard trance) : le volume et le filtre
           montent vers le contretemps au lieu de decroitre. */
        const lp = s.ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 4;
        lp.frequency.setValueAtTime(180, t);
        lp.frequency.exponentialRampToValueAtTime(1900, fin - 0.01);
        const g = s.ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.62 * force, fin - 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, fin + 0.025);
        lp.connect(g).connect(sortie);
        oscillateur(s, 'sawtooth', f0, t, fin + 0.04, lp, -6);
        oscillateur(s, 'sawtooth', f0, t, fin + 0.04, lp, 6);
        break;
      }
      if (/DONK|FM|DX7/.test(etik) || (/ORGUE M1|M1 ORGAN/.test(inst) && s.famille === 'house')) {
        /* Basse FM percussive (DX7 / Korg M1 Organ 2 / Donk) : fondamentale
           modulee a l'attaque avec un rapport 1:2 ou 1:3. */
        const g = enveloppe(s, t, 0.58 * force, 0.002, Math.max(0.16, duree * 0.85), sortie);
        const p = oscillateur(s, 'sine', f0, t, fin + 0.05, g);
        const mod = s.ac.createOscillator();
        mod.frequency.value = f0 * (/DONK/.test(etik) ? 3 : 2);
        const idx = s.ac.createGain();
        idx.gain.setValueAtTime(f0 * 2.8 * force, t);
        idx.gain.exponentialRampToValueAtTime(f0 * 0.1, t + 0.14);
        mod.connect(idx).connect(p.frequency);
        mod.start(t);
        mod.stop(fin + 0.05);
        break;
      }
      if (s.famille === 'psy' || /SLAP|SÉQUENCE|SEQUENCE|SH-101|ARP/.test(etik)) {
        /* Basse roulante (psytrance KBBB, SH-101, EBM) : attaque ultra-nette,
           une seule dent de scie + sous-octave, enveloppe de filtre rapide. */
        const tenue = Math.max(0.08, duree * 0.78);
        const lp = s.ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 3.5;
        lp.frequency.setValueAtTime(320 + 2100 * force, t);
        lp.frequency.exponentialRampToValueAtTime(160, t + tenue);
        const g = enveloppe(s, t, 0.62 * force, 0.002, tenue, sortie);
        lp.connect(g);
        oscillateur(s, 'sawtooth', f0, t, t + tenue + 0.03, lp);
        oscillateur(s, 'square', f0 / 2, t, t + tenue + 0.03, lp);
        break;
      }
      if (/SAW/.test(etik) || grain >= 0.55) {
        /* Basse electro house / industrial saturee : trois dents de scie
           desaccordees et filtre mordant. */
        const lp = s.ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 4.2;
        lp.frequency.setValueAtTime(420 + 2200 * force, t);
        lp.frequency.exponentialRampToValueAtTime(260, t + 0.18);
        const g = s.ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.55 * force, t + 0.004);
        g.gain.setValueAtTime(0.55 * force, fin - 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, fin + 0.04);
        lp.connect(g).connect(sortie);
        for (const d of [-10, 0, 10]) oscillateur(s, 'sawtooth', f0, t, fin + 0.05, lp, d);
        oscillateur(s, 'square', f0 / 2, t, fin + 0.05, lp);
        break;
      }
      if (s.famille === 'disco' || s.famille === 'downtempo' || /DUB/.test(etik)) {
        /* Basse ronde et chaude (basse electrique disco, dub bass, Juno) :
           triangle + dent de scie filtree bas, peu de resonance. */
        const lp = s.ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 1.6;
        lp.frequency.setValueAtTime(/DUB/.test(etik) ? 280 : 520 + 600 * force, t);
        lp.frequency.exponentialRampToValueAtTime(180, t + 0.22);
        const g = s.ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.6 * force, t + 0.006);
        g.gain.setValueAtTime(0.6 * force, fin - 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, fin + 0.05);
        lp.connect(g).connect(sortie);
        oscillateur(s, 'triangle', f0, t, fin + 0.06, lp);
        oscillateur(s, 'sawtooth', f0, t, fin + 0.06, lp, 4);
        break;
      }
      /* Basse synth analogique classique (Juno-106 / Minimoog). */
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
      if (/RUMBLE/.test(etik)) {
        /* Le rumble techno : un grave sourd et filtre qui roule sous le kick. */
        const lp = filtre(s, 'lowpass', 140, 2.2, enveloppe(s, t, 0.55 * force, 0.015, Math.max(0.16, duree), sortie));
        oscillateur(s, 'sawtooth', f0, t, fin + 0.06, lp);
        oscillateur(s, 'sine', f0, t, fin + 0.06, lp);
        break;
      }
      const g = s.ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.6 * force, t + 0.01);
      g.gain.setValueAtTime(0.6 * force, fin - 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, fin + 0.05);
      g.connect(sortie);
      oscillateur(s, 'sine', f0, t, fin + 0.06, g);
      /* Un leger harmonique second pour qu'on entende le sub sur petit haut-parleur. */
      oscillateur(s, 'triangle', f0 * 2, t, fin + 0.06, filtre(s, 'lowpass', 190, 1, enveloppe(s, t, 0.16 * force, 0.01, Math.max(0.12, duree * 0.8), sortie)));
      break;
    }
    case 'reese': {
      const fin = t + Math.max(0.2, duree * 0.95);
      const lp = s.ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 2.6;
      const g = s.ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.42 * force, t + 0.02);
      g.gain.setValueAtTime(0.42 * force, fin - 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, fin + 0.06);
      lp.connect(g).connect(sortie);
      lp.frequency.setValueAtTime(340, t);
      lp.frequency.linearRampToValueAtTime(1050, fin);
      for (const d of [-16, 0, 15]) oscillateur(s, 'sawtooth', f0, t, fin + 0.08, lp, d);
      oscillateur(s, 'sine', f0 / 2, t, fin + 0.08, g);
      break;
    }
    case 'logdrum': {
      /* Le log drum de l'amapiano : une note grave qui tombe d'une quarte
         en vingt millisecondes, courte, legerement saturee. */
      const g = enveloppe(s, t, 0.9 * force, 0.002, Math.min(0.32, duree + 0.08), sortie);
      const o = oscillateur(s, 'sine', f0 * 1.34, t, t + 0.4, g);
      o.frequency.exponentialRampToValueAtTime(f0, t + 0.02);
      oscillateur(s, 'triangle', f0 * 2, t, t + 0.12, enveloppe(s, t, 0.18 * force, 0.001, 0.06, sortie));
      break;
    }
    case 'acid': {
      const fin = t + Math.max(0.1, duree * 0.85);
      const lp = s.ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 16;
      lp.frequency.setValueAtTime(force > 0.8 ? 3400 : 1350, t);
      lp.frequency.exponentialRampToValueAtTime(240, t + 0.18);
      const g = s.ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32 * force, t + 0.004);
      g.gain.setValueAtTime(0.32 * force, fin - 0.01);
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
      const estSupersaw = /SUPERSAW|JP-8000|VIRUS/.test(etik) || (s.famille === 'trance' && (voix === 'chord' || voix === 'stab'));
      const estDub = /DUB/.test(etik);
      const reglages = {
        stab: { forme: 'sawtooth' as const, attaque: 0.003, tenue: estDub ? 0.12 : 0.16, coupe: estDub ? 1900 : 2800, niveau: 0.11 },
        chord: { forme: 'sawtooth' as const, attaque: 0.01, tenue: Math.max(0.25, duree), coupe: estSupersaw ? 3400 : 1600, niveau: 0.09 },
        organ: { forme: 'sine' as const, attaque: 0.005, tenue: Math.max(0.18, duree * 0.88), coupe: 4200, niveau: 0.085 },
        strings: { forme: 'sawtooth' as const, attaque: 0.18, tenue: Math.max(0.6, duree), coupe: 2200, niveau: 0.07 },
        pad: { forme: 'sawtooth' as const, attaque: 0.35, tenue: Math.max(1.2, duree), coupe: 1150, niveau: 0.08 },
      }[voix];
      const fin = t + reglages.attaque + reglages.tenue;
      const lp = s.ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = estDub ? 4.5 : 1.4;
      lp.frequency.setValueAtTime(voix === 'stab' ? reglages.coupe * 1.6 : reglages.coupe, t);
      if (voix === 'stab') lp.frequency.exponentialRampToValueAtTime(estDub ? 480 : 700, t + 0.14);
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
          /* L'orgue M1 / House : fondamentale, octave et quinte (tirette 1, 2, 3). */
          for (const [h, niv] of [[1, 1], [2, 0.75], [3, 0.55]] as const) {
            oscillateur(s, 'sine', f * h, t, stop, enveloppe(s, t, niv, 0.003, reglages.tenue + 0.06, lp));
          }
        } else if (estSupersaw) {
          for (const d of [-18, -7, 0, 7, 18]) oscillateur(s, 'sawtooth', f, t, stop, lp, d);
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
      if (/BLEEP|CARILLON|MUSIC BOX|CLOCHE|BELL/.test(etik)) {
        /* Le bleep de Sheffield ou la cloche FM : sinusoide pure ou FM cristalline. */
        const tenue = 0.22;
        const g = enveloppe(s, t, 0.34 * force, 0.002, tenue, sortie);
        const p = oscillateur(s, 'sine', f0, t, t + tenue + 0.05, g);
        if (/CLOCHE|BELL|CARILLON|MUSIC BOX/.test(etik)) {
          const mod = s.ac.createOscillator();
          mod.frequency.value = f0 * 3.5;
          const idx = s.ac.createGain();
          idx.gain.setValueAtTime(f0 * 1.8, t);
          idx.gain.exponentialRampToValueAtTime(10, t + tenue);
          mod.connect(idx).connect(p.frequency);
          mod.start(t);
          mod.stop(t + tenue + 0.05);
        }
        break;
      }
      if (/CHIPTUNE/.test(etik)) {
        const tenue = 0.14;
        oscillateur(s, 'square', f0, t, t + tenue + 0.03, enveloppe(s, t, 0.3 * force, 0.001, tenue, sortie));
        break;
      }
      const tenue = voix === 'arp' ? 0.15 : 0.24;
      const lp = s.ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 2.4;
      lp.frequency.setValueAtTime(voix === 'arp' ? 5400 : 4200, t);
      lp.frequency.exponentialRampToValueAtTime(520, t + tenue);
      lp.connect(enveloppe(s, t, 0.36 * force, 0.002, tenue, sortie));
      oscillateur(s, 'sawtooth', f0, t, t + tenue + 0.05, lp, -5);
      oscillateur(s, 'sawtooth', f0, t, t + tenue + 0.05, lp, 5);
      oscillateur(s, 'triangle', f0 * 2, t, t + tenue + 0.05, lp);
      break;
    }
    case 'lead':
    case 'hoover':
    case 'vocal': {
      const fin = t + Math.max(0.12, duree * 0.9);
      const g = s.ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      const estScreech = /SCREECH/.test(etik);
      const estSupersaw = /SUPERSAW/.test(etik) || s.famille === 'trance';
      const niveau = (voix === 'hoover' ? 0.13 : voix === 'vocal' ? 0.6 : estScreech ? 0.18 : 0.15) * force;
      g.gain.exponentialRampToValueAtTime(niveau, t + 0.01);
      g.gain.setValueAtTime(niveau, fin - 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, fin + 0.08);
      g.connect(sortie);
      if (voix === 'vocal') {
        if (/SCRATCH/.test(etik)) {
          const bp = filtre(s, 'bandpass', 1700, 2.5, g);
          const o = oscillateur(s, 'sawtooth', f0, t, fin + 0.08, bp);
          o.frequency.exponentialRampToValueAtTime(f0 * 2.2, t + 0.05);
          o.frequency.exponentialRampToValueAtTime(f0 * 0.7, fin);
          break;
        }
        /* Une voix hachee : deux formants de « a » sur une dent de scie. */
        const f1 = filtre(s, 'bandpass', 750, 7, g);
        const f2 = filtre(s, 'bandpass', 1200, 7, g);
        const o = oscillateur(s, 'sawtooth', f0, t, fin + 0.1, f1);
        o.connect(f2);
        break;
      }
      if (estScreech) {
        /* Le screech hardcore : dents de scie tres desaccordees dans un filtre
           passe-bande resonant qui glisse vers le haut. */
        const bp = filtre(s, 'bandpass', 1900, 3.8, g);
        for (const d of [-35, -14, 14, 35]) {
          const o = oscillateur(s, 'sawtooth', f0 * 1.5, t, fin + 0.08, bp, d);
          o.frequency.exponentialRampToValueAtTime(f0 * 1.85, t + 0.07);
        }
        break;
      }
      const lp = filtre(s, 'lowpass', voix === 'hoover' ? 2400 : estSupersaw ? 4400 : 3200, estSupersaw ? 1.8 : 1, g);
      const ecarts = voix === 'hoover' ? [-28, -9, 9, 28] : estSupersaw ? [-22, -10, 0, 10, 22] : [-6, 6];
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
  const kit = kitDuMotif(motif, options.famille);
  const banque = await charger(ac, fichiersDuMotif(motif, kit));
  /* L'ENREGISTREMENT SE FAIT EN SILENCE : le son va dans la video, pas dans
     les haut-parleurs. Mika, le 30 octobre 2026 : « arrete de jouer la
     musique dans les speakers ». La sortie d'enregistrement suffit a faire
     tourner le graphe audio. */
  const sortie = options.enregistrer ? ac.createMediaStreamDestination() : null;
  const bus = ac.createGain();
  bus.connect(sortie ?? ac.destination);
  const s = monterStudio(ac, motif, options.famille, bus, banque, kit);
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
  const kit = kitDuMotif(motif, famille);
  const s = monterStudio(ac, motif, famille, ac.destination, await charger(ac, fichiersDuMotif(motif, kit)), kit);
  const cycles = construire ? plan(motif) : null;
  const duree = dureeDuPas(motif);
  for (let p = 0; p * duree < secondes; p += 1) programmerLePas(s, motif, cycles, p, 0.05 + p * duree);
  return ac.startRendering();
}
