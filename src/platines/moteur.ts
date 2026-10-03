/* LE MOTEUR DES PLATINES : le son, entierement dans le navigateur.
 *
 * Chaque platine decode son morceau en entier (un AudioBuffer) : c'est ce
 * qui permet de partir de n'importe quel point a l'echantillon pres, de
 * changer la vitesse finement et de faire entendre le jog en pause. Le son
 * passe ensuite par sa voie de table (gain, trois bandes, filtre, fader,
 * crossfader), puis par le bus maitre ou vivent les effets, tous globaux
 * comme l'a voulu Mika, et enfin par un limiteur qui protege les oreilles.
 *
 *   platine A -> voie 1 \
 *                        > somme -> effets -> volume maitre -> limiteur -> sortie
 *   platine B -> voie 2 /
 *
 * Voir calculs.ts pour les courbes, et PlatinesPage.tsx pour l'interface. */

import { crossfader, decibelsEq, dosage, dureeDesTemps, filtreDuBouton, gainDesDecibels, gainDuFader, pics, vitesse } from './calculs.ts';

const LISSAGE = 0.015;
/* La finesse de l'onde detaillee : 400 pics par seconde, soit un par pixel
   quand on zoome sur une seconde. C'est ce qui permet de poser un cue sur
   l'attaque d'une grosse caisse. */
export const DETAIL_PAR_SECONDE = 400;

/* ═══ UNE VOIE DE TABLE ═══ */
export class Voie {
  readonly entree: GainNode;
  private readonly bas: BiquadFilterNode;
  private readonly medium: BiquadFilterNode;
  private readonly aigu: BiquadFilterNode;
  private readonly passeBas: BiquadFilterNode;
  private readonly passeHaut: BiquadFilterNode;
  private readonly fader: GainNode;
  readonly croise: GainNode;
  private readonly mesure: AnalyserNode;
  private readonly tampon: Float32Array<ArrayBuffer>;

  constructor(private readonly ctx: AudioContext, sortie: AudioNode) {
    this.entree = ctx.createGain();
    this.bas = new BiquadFilterNode(ctx, { type: 'lowshelf', frequency: 120 });
    this.medium = new BiquadFilterNode(ctx, { type: 'peaking', frequency: 1000, Q: 0.8 });
    this.aigu = new BiquadFilterNode(ctx, { type: 'highshelf', frequency: 7000 });
    this.passeBas = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 20000, Q: 1.1 });
    this.passeHaut = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 10, Q: 1.1 });
    this.fader = new GainNode(ctx, { gain: gainDuFader(0.8) });
    this.croise = new GainNode(ctx, { gain: 0.707 });
    this.mesure = new AnalyserNode(ctx, { fftSize: 1024 });
    this.tampon = new Float32Array(this.mesure.fftSize);
    this.entree.connect(this.bas).connect(this.medium).connect(this.aigu).connect(this.passeBas).connect(this.passeHaut).connect(this.fader);
    this.fader.connect(this.mesure);
    this.fader.connect(this.croise).connect(sortie);
  }

  private regler(p: AudioParam, v: number): void {
    p.setTargetAtTime(v, this.ctx.currentTime, LISSAGE);
  }

  gain(v: number): void {
    this.regler(this.entree.gain, gainDesDecibels(decibelsEq(v)));
  }

  egaliseur(bande: 'aigu' | 'medium' | 'bas', v: number): void {
    this.regler(this[bande].gain, decibelsEq(v));
  }

  filtre(v: number): void {
    const f = filtreDuBouton(v);
    this.regler(this.passeBas.frequency, f.type === 'bas' ? f.frequence : 20000);
    this.regler(this.passeHaut.frequency, f.type === 'haut' ? f.frequence : 10);
  }

  volume(x: number): void {
    this.regler(this.fader.gain, gainDuFader(x));
  }

  /** Le niveau de crete, de 0 a 1, pour le VU-metre. */
  niveau(): number {
    this.mesure.getFloatTimeDomainData(this.tampon);
    let max = 0;
    for (const v of this.tampon) if (Math.abs(v) > max) max = Math.abs(v);
    return max;
  }
}

/* ═══ LES EFFETS ═══ Un potard par effet, tous globaux, comme les GLOBAL
   FX de la MM-808 : Mika les voulait « en knob ». Les sept effets sont en
   serie sur le bus maitre ; chacun a son son sec et son son traite, et sa
   dose les melange (voir dosage dans calculs.ts). A zero, un effet laisse
   passer le son tel quel. Le delay, le flanger et le trans suivent le tempo
   de la platine qu'on entend le plus, a la division choisie. */
export const EFFETS = ['disto', 'crush', 'chorus', 'flanger', 'trans', 'delay', 'reverb'] as const;
export type NomEffet = (typeof EFFETS)[number];
export const DIVISIONS = [0.25, 0.5, 0.75, 1, 2, 4] as const;

interface Etage {
  readonly nom: NomEffet;
  readonly sec: GainNode;
  readonly humide: GainNode;
}

export class UniteEffets {
  readonly entree: GainNode;
  readonly sortie: GainNode;
  private readonly etages: Etage[] = [];
  private readonly retard: DelayNode;
  private readonly balayage: OscillatorNode;
  private readonly hachoir: OscillatorNode;
  private bpm = 120;
  private division = 1;

  constructor(private readonly ctx: AudioContext) {
    this.entree = ctx.createGain();
    this.sortie = ctx.createGain();
    const temps = dureeDesTemps(this.bpm, this.division);

    this.retard = new DelayNode(ctx, { maxDelayTime: 8, delayTime: temps });
    this.balayage = new OscillatorNode(ctx, { frequency: 1 / (temps * 4) });
    this.hachoir = new OscillatorNode(ctx, { type: 'square', frequency: 2 / temps });

    let precedent: AudioNode = this.entree;
    for (const nom of EFFETS) {
      const sec = new GainNode(ctx, { gain: 1 });
      const humide = new GainNode(ctx, { gain: 0 });
      const somme = ctx.createGain();
      precedent.connect(sec).connect(somme);
      this.traitement(nom, precedent).connect(humide).connect(somme);
      this.etages.push({ nom, sec, humide });
      precedent = somme;
    }
    precedent.connect(this.sortie);
    this.balayage.start();
    this.hachoir.start();
  }

  /** Le son traite d'un effet, branche sur `source`. */
  private traitement(nom: NomEffet, source: AudioNode): AudioNode {
    const ctx = this.ctx;
    switch (nom) {
      case 'disto': {
        const pousse = new GainNode(ctx, { gain: 6 });
        const forme = new WaveShaperNode(ctx, { curve: courbe((x) => Math.tanh(x)), oversample: '4x' });
        const rendu = new GainNode(ctx, { gain: 0.35 });
        source.connect(pousse).connect(forme).connect(rendu);
        return rendu;
      }
      case 'crush': {
        const pas = 2 ** 5;
        const forme = new WaveShaperNode(ctx, { curve: courbe((x) => Math.round(x * pas) / pas) });
        source.connect(forme);
        return forme;
      }
      case 'chorus': {
        const d = new DelayNode(ctx, { maxDelayTime: 0.1, delayTime: 0.022 });
        const lfo = new OscillatorNode(ctx, { frequency: 0.8 });
        lfo.connect(new GainNode(ctx, { gain: 0.004 })).connect(d.delayTime);
        lfo.start();
        source.connect(d);
        return d;
      }
      case 'flanger': {
        const d = new DelayNode(ctx, { maxDelayTime: 0.05, delayTime: 0.004 });
        const retour = new GainNode(ctx, { gain: 0.6 });
        d.connect(retour).connect(d);
        this.balayage.connect(new GainNode(ctx, { gain: 0.0032 })).connect(d.delayTime);
        source.connect(d);
        return d;
      }
      case 'trans': {
        /* Une porte qui coupe le son au rythme : le carre va de -1 a 1, la
           porte de 0 a 1. */
        const porte = new GainNode(ctx, { gain: 0.5 });
        this.hachoir.connect(new GainNode(ctx, { gain: 0.5 })).connect(porte.gain);
        source.connect(porte);
        return porte;
      }
      case 'delay': {
        const retour = new GainNode(ctx, { gain: 0.45 });
        const assourdi = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 5000 });
        this.retard.connect(assourdi).connect(retour).connect(this.retard);
        source.connect(this.retard);
        return this.retard;
      }
      case 'reverb': {
        const c = new ConvolverNode(ctx, { buffer: reponseDeSalle(ctx, 2.8) });
        source.connect(c);
        return c;
      }
    }
  }

  /** La dose d'un effet, de 0 (coupe) a 1. */
  dose(nom: NomEffet, v: number): void {
    const e = this.etages.find((x) => x.nom === nom);
    if (!e) return;
    const m = dosage(nom, v);
    const t = this.ctx.currentTime;
    e.sec.gain.setTargetAtTime(m.sec, t, LISSAGE);
    e.humide.gain.setTargetAtTime(m.humide, t, LISSAGE);
  }

  /** Le tempo des effets rythmiques : le BPM entendu et la division. */
  tempo(o: { bpm?: number; division?: number }): void {
    if (o.bpm !== undefined && o.bpm > 0) this.bpm = o.bpm;
    if (o.division !== undefined) this.division = o.division;
    const temps = dureeDesTemps(this.bpm, this.division);
    const t = this.ctx.currentTime;
    this.retard.delayTime.setTargetAtTime(Math.min(8, temps), t, 0.05);
    this.balayage.frequency.setValueAtTime(1 / Math.max(0.1, temps * 4), t);
    this.hachoir.frequency.setValueAtTime(2 / Math.max(0.05, temps), t);
  }
}

const courbe = (f: (x: number) => number): Float32Array<ArrayBuffer> => {
  const n = 2048;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i += 1) c[i] = f((i / (n - 1)) * 2 - 1);
  return c;
};

/* Une salle synthetique : du bruit qui decroit. Pas besoin d'un fichier de
   reponse impulsionnelle a telecharger. */
function reponseDeSalle(ctx: AudioContext, secondes: number): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * secondes);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c += 1) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
  }
  return b;
}

/* ═══ LA TABLE ═══ Deux voies, le crossfader, les effets, le maitre. */
export class Table {
  readonly ctx: AudioContext;
  readonly voies: readonly [Voie, Voie];
  readonly effets: UniteEffets;
  private readonly maitre: GainNode;
  private readonly mesure: AnalyserNode;
  private readonly tampon: Float32Array<ArrayBuffer>;

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    const somme = this.ctx.createGain();
    this.effets = new UniteEffets(this.ctx);
    this.maitre = new GainNode(this.ctx, { gain: 0.85 });
    const limiteur = new DynamicsCompressorNode(this.ctx, { threshold: -2, knee: 0, ratio: 20, attack: 0.002, release: 0.12 });
    this.mesure = new AnalyserNode(this.ctx, { fftSize: 1024 });
    this.tampon = new Float32Array(this.mesure.fftSize);
    somme.connect(this.effets.entree);
    this.effets.sortie.connect(this.maitre).connect(limiteur).connect(this.mesure).connect(this.ctx.destination);
    this.voies = [new Voie(this.ctx, somme), new Voie(this.ctx, somme)];
    this.crossfader(0);
  }

  crossfader(x: number): void {
    const g = crossfader(x);
    const t = this.ctx.currentTime;
    this.voies[0].croise.gain.setTargetAtTime(g.a, t, LISSAGE);
    this.voies[1].croise.gain.setTargetAtTime(g.b, t, LISSAGE);
  }

  volumeMaitre(x: number): void {
    this.maitre.gain.setTargetAtTime(gainDuFader(x) * 1.1, this.ctx.currentTime, LISSAGE);
  }

  niveauMaitre(): number {
    this.mesure.getFloatTimeDomainData(this.tampon);
    let max = 0;
    for (const v of this.tampon) if (Math.abs(v) > max) max = Math.abs(v);
    return max;
  }
}


/* ═══ UNE PLATINE ═══ */
export class Platine {
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private jeton = 0;
  private positionDepart = 0;
  private instantDepart = 0;
  private pitch = 0;
  private courbure = 0;
  /** L'onde entiere, 1 200 tranches : la vue d'ensemble. */
  apercu: Float32Array = new Float32Array(0);
  /** L'onde fine, cent tranches par seconde : l'ecran qui defile. */
  detail: Float32Array = new Float32Array(0);
  enLecture = false;
  onFin: (() => void) | null = null;

  constructor(private readonly table: Table, private readonly voie: Voie) {}

  get duree(): number {
    return this.buffer?.duration ?? 0;
  }

  get charge(): boolean {
    return this.buffer !== null;
  }

  /** Telecharge et decode ; `progres` recoit la part telechargee, de 0 a 1. */
  async charger(adresse: string, progres: (part: number) => void, signal: AbortSignal): Promise<void> {
    this.pause();
    this.buffer = null;
    this.positionDepart = 0;
    const r = await fetch(adresse, { signal });
    if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
    const total = Number(r.headers.get('content-length') ?? 0);
    const lecteur = r.body.getReader();
    const morceaux: Uint8Array[] = [];
    let recu = 0;
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      morceaux.push(value);
      recu += value.length;
      if (total > 0) progres(Math.min(1, recu / total));
    }
    const octets = new Uint8Array(recu);
    let i = 0;
    for (const m of morceaux) {
      octets.set(m, i);
      i += m.length;
    }
    const buffer = await this.table.ctx.decodeAudioData(octets.buffer);
    if (signal.aborted) return;
    const canaux = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
    this.apercu = pics(canaux, 1200);
    this.detail = pics(canaux, Math.max(1, Math.floor(buffer.duration * DETAIL_PAR_SECONDE)));
    this.buffer = buffer;
  }

  private vitesseEffective(): number {
    return vitesse(this.pitch) * (1 + this.courbure);
  }

  position(): number {
    if (!this.enLecture) return this.positionDepart;
    const p = this.positionDepart + (this.table.ctx.currentTime - this.instantDepart) * this.vitesseEffective();
    return Math.min(p, this.duree);
  }

  private reancrer(): void {
    this.positionDepart = this.position();
    this.instantDepart = this.table.ctx.currentTime;
  }

  jouer(): void {
    if (!this.buffer || this.enLecture) return;
    if (this.positionDepart >= this.duree - 0.05) return;
    const s = new AudioBufferSourceNode(this.table.ctx, { buffer: this.buffer, playbackRate: this.vitesseEffective() });
    s.connect(this.voie.entree);
    const jeton = ++this.jeton;
    s.onended = () => {
      if (jeton !== this.jeton) return;
      this.positionDepart = this.duree;
      this.enLecture = false;
      this.source = null;
      this.onFin?.();
    };
    this.instantDepart = this.table.ctx.currentTime;
    s.start(0, this.positionDepart);
    this.source = s;
    this.enLecture = true;
  }

  pause(): void {
    if (!this.enLecture) return;
    this.positionDepart = this.position();
    this.jeton += 1;
    this.source?.stop();
    this.source?.disconnect();
    this.source = null;
    this.enLecture = false;
  }

  aller(secondes: number): void {
    const t = Math.max(0, Math.min(this.duree, secondes));
    if (this.enLecture) {
      this.pause();
      this.positionDepart = t;
      this.jouer();
    } else {
      this.positionDepart = t;
    }
  }

  regler(pitch: number): void {
    this.reancrer();
    this.pitch = pitch;
    this.source?.playbackRate.setValueAtTime(this.vitesseEffective(), this.table.ctx.currentTime);
  }

  /** Le jog en lecture : il accelere ou freine un instant, comme une main
      posee sur le bord du plateau. `f` vaut -0,5 a +0,5. */
  courber(f: number): void {
    this.reancrer();
    this.courbure = Math.max(-0.5, Math.min(0.5, f));
    this.source?.playbackRate.setTargetAtTime(this.vitesseEffective(), this.table.ctx.currentTime, 0.01);
  }

  /** Le jog en pause : on deplace le point et on entend un grain de son,
      ce qui permet de poser un cue a l'oreille. */
  grain(secondes: number): void {
    if (!this.buffer || this.enLecture) return;
    this.positionDepart = Math.max(0, Math.min(this.duree, secondes));
    const ctx = this.table.ctx;
    const s = new AudioBufferSourceNode(ctx, { buffer: this.buffer });
    const enveloppe = new GainNode(ctx, { gain: 0 });
    const t = ctx.currentTime;
    enveloppe.gain.setValueAtTime(0, t);
    enveloppe.gain.linearRampToValueAtTime(1, t + 0.005);
    enveloppe.gain.linearRampToValueAtTime(0, t + 0.06);
    s.connect(enveloppe).connect(this.voie.entree);
    s.start(t, this.positionDepart, 0.065);
    s.onended = () => {
      s.disconnect();
      enveloppe.disconnect();
    };
  }
}

/* ═══ LE MOTEUR ENTIER ═══ La table et ses deux platines, crees au premier
   geste : un navigateur refuse de faire du son avant qu'on ait touche la
   page. Les appels suivants reveillent le contexte s'il s'est endormi. */
export interface Moteur {
  readonly table: Table;
  readonly platines: readonly [Platine, Platine];
}

let moteur: Moteur | null = null;
export function obtenirMoteur(): Moteur {
  if (!moteur) {
    const table = new Table();
    moteur = { table, platines: [new Platine(table, table.voies[0]), new Platine(table, table.voies[1])] };
  }
  if (moteur.table.ctx.state === 'suspended') void moteur.table.ctx.resume();
  return moteur;
}

/** Le moteur s'il existe deja, sans le creer : l'ecran le lit a chaque
    image, et seul un geste a le droit de faire naitre le son. */
export const moteurExistant = (): Moteur | null => moteur;
