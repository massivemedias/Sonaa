/* LE SON DES AFFICHES DE RYTHME : UN PETIT STUDIO QUI NE LIT QUE DES
   ENREGISTREMENTS.

   Mika, le 30 octobre 2026, apres la premiere version : « c'est bien, mais
   avec les sons, parce que c'est ca qui fait la difference ». Puis le 16
   novembre 2026 : « les sons sont horribles et ne refletent pas du tout le
   style », et : « remplace aussi les accords et les basses par des samples,
   refais la totale ».

   PLUS AUCUN OSCILLATEUR. Chaque frappe et chaque note est un fichier de
   public/sons : les batteries des vraies machines (echantillons.ts), et
   pour tout ce qui a une hauteur, une bibliotheque d'instruments choisis
   style par style (instruments.ts) : la basse Juno de la deep house, la
   basse roulante de la psytrance, la 303, la reese, l'accord de dub techno,
   le piano M1, l'orgue du garage, les cordes, les nappes. Une note joue
   l'enregistrement le plus proche de sa hauteur, relu un peu plus vite ou
   un peu plus lentement. Le studio garde ce qui n'est pas un son mais un
   traitement : la reverberation, l'echo a la croche pointee, la pompe du
   kick, la saturation et le compresseur du bus.

   L'HORLOGE EST CELLE DE L'AUDIO. Les notes sont programmees un peu en
   avance sur l'horloge du contexte, jamais sur un minuteur de page : un
   minuteur derive des qu'un onglet ralentit, l'audio non. Le dessin lit la
   meme horloge. Et parce que la programmation ne depend que du contexte, la
   meme fonction remplit un contexte hors ligne : c'est ainsi qu'on mesure
   le niveau de sortie de chaque style sans haut-parleur. */

import type { Motif, Piste, Voix } from '../../lib/rythmes.ts';
import { VOIX_D_ACCORD, VOIX_MELODIQUES } from '../../lib/rythmes.ts';
import { accord, degre, demiTons } from './theorie.ts';
import { dureeDuPas, etatAu, pasParTemps, plan, type Cycle } from './arrangement.ts';
import { charger, fichierDe, KICKS_DURS, kitDuMotif } from './echantillons.ts';
import { BASSES_MESUREES, INSTRUMENTS, sonAccorde, zoneDe, type Son } from './instruments.ts';

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
   basse restent secs : un grave reverbere devient une bouillie. Les
   instruments accordes sont egalises a -18 dB efficaces a la construction ;
   les frappes, a -1 dB de crete : d'ou des niveaux de canal differents. */
const DOSAGE: Record<Canal, { niveau: number; reverb: number; echo: number; pompe: boolean }> = {
  kick: { niveau: 0.9, reverb: 0.02, echo: 0, pompe: false },
  caisse: { niveau: 0.65, reverb: 0.35, echo: 0.08, pompe: false },
  metal: { niveau: 0.45, reverb: 0.18, echo: 0.1, pompe: false },
  percu: { niveau: 0.5, reverb: 0.3, echo: 0.2, pompe: false },
  basse: { niveau: 0.75, reverb: 0.02, echo: 0, pompe: true },
  accords: { niveau: 0.6, reverb: 0.55, echo: 0.3, pompe: true },
  lead: { niveau: 0.75, reverb: 0.45, echo: 0.4, pompe: true },
  fx: { niveau: 0.5, reverb: 0.6, echo: 0, pompe: false },
};

/* LE GAIN DE CHAQUE SON, mesure au banc d'essai le 16 novembre 2026. Les
   batteries sont ramenees a -1 dB de crete, mais leur energie varie de 7 dB
   d'une machine a l'autre (le kick de la 909 Detroit est tout en attaque,
   celui de la 808 tout en queue) ; une note courte (la basse roulante de la
   psytrance, l'accord de dub techno) a moins d'energie sur la mesure qu'une
   note tenue. Le but : un kick devant, la basse deux ou trois dB dessous,
   les accords six a huit dB dessous, comme dans un mix de club. */
const GAIN_SON: Record<string, number> = {
  'tr909-kick': 1.3, 'lm2-kick': 1.3, 'break-kick': 1.3, 'cr78-kick': 1.4, 'sp909-kick': 1.1,
  'kick-gabber': 0.6, 'kick-uptempo': 0.65, 'kick-hardstyle': 0.55, 'kick-dur': 0.85, 'kick-psy': 0.9, 'kick-caverne': 0.8,
  'tr808-snare': 2, 'tr808-hat': 2, 'tr909-snare': 1.3, 'tr909-clap': 1.3, 'sp909-clap': 1.6, 'cr78-snare': 1.4, 'break-snare': 1.2,
  'tr808-clap': 1.1, 'tr909-hat': 1.2, 'sp909-hat': 1.3, 'tr505-hat': 1.3, 'tr909-tom': 0.6,
  'basse-303': 1.8, 'basse-303-accent': 1.8, 'basse-reverse': 2, 'basse-roll': 1.6, 'basse-fm': 1.2, 'sub-sinus': 1.3,
  'accord-dub': 3, 'stab': 2, 'stab-rave': 1.6, 'orgue-m1': 2, rhodes: 0.3, piano: 0.6, 'piano-rave': 1, arpege: 0.8, cordes: 1.6,
  lead: 1.6, 'lead-moog': 1.3, supersaw: 1.3, hoover: 4.5, screech: 1.6,
  'kick-hitech': 1.4, 'basse-hitech': 1, 'lead-zap': 2.2, 'basse-psycore': 2, 'basse-fullon': 1.5,
};
/* Les kicks et les basses psy mesures (ADR-124) : meme dosage que le hi-tech. */
for (const id of BASSES_MESUREES) GAIN_SON[`basse-${id}`] ??= 1;
for (const k of KICKS_DURS) if (/^kick-[a-z]+$/.test(k) && !(k in GAIN_SON)) GAIN_SON[k] = 1.4;

/* Les kicks si gros qu'ils avalent la caisse et les charleys. */
const KICKS_ENORMES: ReadonlySet<string> = new Set(['kick-gabber', 'kick-uptempo', 'kick-hardstyle']);

/* Les fichiers communs : deux salles (reponses impulsionnelles stereo d'une
   reverberation zita), la montee de bruit blanc et l'impact du drop. */
const SALLE_COURTE = 'salle-courte';
const SALLE_LONGUE = 'salle-longue';
const MONTEE = 'fx-montee';
const IMPACT = 'fx-impact';

interface Studio {
  readonly ac: BaseAudioContext;
  readonly motif: Motif;
  readonly canaux: Record<Canal, GainNode>;
  readonly pompe: GainNode;
  /** La derniere hauteur jouee par piste, pour les glissandos de la 303. */
  readonly derniere: Map<number, number>;
  /** Les fichiers decodes, et ce que joue chaque piste. */
  readonly banque: Map<string, AudioBuffer>;
  readonly sons: readonly (Son | null)[];
  readonly famille: string;
}

/** Ce que joue chaque piste du motif : un instrument accorde, une frappe, ou rien. */
export function sonsDuMotif(motif: Motif, famille: string): (Son | null)[] {
  const kit = kitDuMotif(motif, famille);
  return motif.pistes.map((p, i) => {
    const accorde = sonAccorde(p, motif, famille);
    if (accorde) return accorde;
    const f = fichierDe(p.voix, kit, p, motif, famille, i);
    return f ? { frappe: f } : null;
  });
}

/* Si une salle manque (reseau coupe), une reverberation de secours : du
   bruit stereo qui decroit. Ce n'est pas un son, c'est une piece. */
function salleDeSecours(ac: BaseAudioContext, secondes: number): AudioBuffer {
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

/* LA FAMILLE PSY SE MIXE SUR LE GRAVE (ADR-124) : mesurees sur leurs
   morceaux de reference, ses productions mettent de 30 a 50 % de leur
   energie sous 60 Hz et a peine 2 % entre 2 et 6 kHz. Charleys, caisses et
   melodies y descendent d'un cran. */
const DOSAGE_DE_FAMILLE: Partial<Record<string, Partial<Record<Canal, number>>>> = {
  psy: { metal: 0.55, caisse: 0.45, lead: 0.7, accords: 0.8, percu: 0.8 },
};

/* Et, dans la meme famille, la ligne acide reste derriere la basse. */
const VOIX_DE_FAMILLE: Partial<Record<string, Partial<Record<Voix, number>>>> = {
  psy: { acid: 0.6 },
};

function monterStudio(ac: BaseAudioContext, motif: Motif, sortie: AudioNode, banque: Map<string, AudioBuffer>, sons: readonly (Son | null)[], famille = ''): Studio {
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
     egale. Le volume general baisse avec le grain pour que passer d'un
     style a l'autre ne surprenne pas l'oreille ; un style sans kick
     (ambient, drone) remonte d'autant qu'il lui manque son instrument le
     plus fort. */
  maitre.gain.value = 0.95 * (1 - grain * 0.4) * (motif.pistes.some((p) => p.voix === 'kick') ? 1 : 1.6);
  /* LE LIMITEUR, en tout dernier : rien ne sort au-dessus de -1 dB, quel
     que soit l'empilement des sons. */
  const limiteur = ac.createDynamicsCompressor();
  limiteur.threshold.value = -2;
  limiteur.knee.value = 0;
  limiteur.ratio.value = 20;
  limiteur.attack.value = 0.002;
  limiteur.release.value = 0.08;
  sature.connect(compresseur).connect(maitre).connect(limiteur).connect(sortie);

  const reverb = ac.createConvolver();
  reverb.buffer = banque.get(espace > 0.5 ? SALLE_LONGUE : SALLE_COURTE) ?? salleDeSecours(ac, 1.6 + espace * 2.2);
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

  /* Le kick d'une machine passe par une saturation a lui dans les styles
     sales ; un kick de gabber ou de hardstyle est deja sature a la
     construction et n'y passe pas. */
  const kick = sons.find((x, i) => motif.pistes[i]?.voix === 'kick' && x && 'frappe' in x);
  const kickDejaDur = !!kick && 'frappe' in kick && KICKS_DURS.has(kick.frappe);

  const canaux = {} as Record<Canal, GainNode>;
  for (const nom of Object.keys(DOSAGE) as Canal[]) {
    const d = DOSAGE[nom];
    const g = ac.createGain();
    g.gain.value = d.niveau * (DOSAGE_DE_FAMILLE[famille]?.[nom] ?? 1);
    let sortieCanal: AudioNode = g;
    if (nom === 'kick' && grain > 0.45 && !kickDejaDur) {
      const dur = ac.createWaveShaper();
      dur.curve = courbe(1.5 + grain * 6);
      const apres = ac.createGain();
      apres.gain.value = 0.7;
      g.connect(dur).connect(apres);
      sortieCanal = apres;
    }
    /* Sous un kick de gabber ou de hardstyle, la caisse et les charleys
       remontent de 6 dB : sinon ce kick les avale. */
    if (kick && 'frappe' in kick && KICKS_ENORMES.has(kick.frappe) && (nom === 'caisse' || nom === 'metal')) g.gain.value *= 2;
    sortieCanal.connect(d.pompe ? pompe : sature);
    const envoiR = ac.createGain();
    envoiR.gain.value = d.reverb * (0.25 + espace);
    sortieCanal.connect(envoiR).connect(reverb);
    const envoiE = ac.createGain();
    envoiE.gain.value = d.echo * espace;
    sortieCanal.connect(envoiE).connect(echo);
    canaux[nom] = g;
  }
  return { ac, motif, canaux, pompe, derniere: new Map(), banque, sons, famille };
}

/* ── La lecture ──────────────────────────────────────────────────────── */

interface Lecture {
  readonly vitesse?: number;
  /** Une glissade de la 303 : la vitesse de depart, qui rejoint `vitesse`. */
  readonly depuis?: number;
  /** La fin de la note : le son s'efface alors en `relache` secondes. */
  readonly fin?: number;
  readonly relache?: number;
  readonly desaccord?: number;
  readonly panoramique?: number;
  /** Ou commencer dans le fichier, en secondes. */
  readonly decalage?: number;
}

function lireFichier(s: Studio, nom: string, sortie: AudioNode, t: number, niveau: number, l: Lecture = {}): boolean {
  const b = s.banque.get(nom);
  if (!b) return false;
  const src = s.ac.createBufferSource();
  src.buffer = b;
  const vitesse = l.vitesse ?? 1;
  if (l.depuis !== undefined) {
    src.playbackRate.setValueAtTime(l.depuis, t);
    src.playbackRate.exponentialRampToValueAtTime(vitesse, t + 0.05);
  } else {
    src.playbackRate.value = vitesse;
  }
  if (l.desaccord) src.detune.value = l.desaccord;
  const g = s.ac.createGain();
  g.gain.setValueAtTime(niveau, t);
  const finDuFichier = t + (b.duration - (l.decalage ?? 0)) / vitesse;
  let arret = finDuFichier;
  if (l.fin !== undefined && l.fin < finDuFichier) {
    const r = Math.max(0.008, l.relache ?? 0.04);
    g.gain.setValueAtTime(niveau, l.fin);
    g.gain.linearRampToValueAtTime(0, l.fin + r);
    arret = Math.min(finDuFichier, l.fin + r + 0.01);
  }
  let dernier: AudioNode = g;
  if (l.panoramique && s.ac.createStereoPanner) {
    const p = s.ac.createStereoPanner();
    p.pan.value = l.panoramique;
    g.connect(p);
    dernier = p;
  }
  src.connect(g);
  dernier.connect(sortie);
  src.start(t, l.decalage ?? 0);
  src.stop(arret + 0.02);
  return true;
}

/** La force d'un pas en gain : un pas fort a 1, un pas normal un peu en dessous. */
const velocite = (force: number): number => 0.35 + 0.65 * force;

/* Le niveau de depart de chaque voix accordee, a energie egale. Une nappe
   tenue s'entend plus qu'un pluck a la meme energie ; une sous-basse moins
   qu'une basse sur un petit haut-parleur. */
const NIVEAU: Partial<Record<Voix, number>> = {
  sub: 1.15, bass: 1, reese: 0.95, logdrum: 1, acid: 0.8,
  pad: 0.7, strings: 0.75, organ: 0.8, chord: 0.85, stab: 0.95, piano: 0.9, rhodes: 0.95,
  pluck: 0.95, arp: 0.85, lead: 0.8, hoover: 0.75, vocal: 0.85,
};

interface Coup {
  readonly t: number;
  readonly force: number;
  /** La duree de la note jusqu'a la frappe suivante de la piste, en s. */
  readonly duree: number;
  /** Les hauteurs MIDI : une note, ou l'accord. */
  readonly midi: readonly number[];
  readonly piste: number;
  readonly p: Piste;
  /** Le pas precedent de la piste sonnait aussi : la 303 y glisse. */
  readonly lie: boolean;
}

function jouerSon(s: Studio, c: Coup): void {
  const son = s.sons[c.piste];
  if (!son) return;
  const canal = CANAL[c.p.voix];
  const sortie = s.canaux[canal];
  if ('frappe' in son) {
    const doux = c.p.voix === 'hat' || c.p.voix === 'shaker';
    lireFichier(s, son.frappe, sortie, c.t, (doux ? 0.75 : 0.95) * (GAIN_SON[son.frappe] ?? 1) * velocite(c.force));
    return;
  }
  const id = son.accent && c.force >= 1 ? son.accent : son.instrument;
  const inst = INSTRUMENTS[id];
  if (!inst) return;
  /* Un accord enregistre d'un bloc se joue sur la fondamentale. */
  const notes = inst.mode === 'fige' ? [Math.min(...c.midi)] : c.midi;
  const fin =
    inst.mode === 'tenu' ? c.t + Math.max(0.06, c.duree * 0.92) :
    inst.mode === 'libre' ? c.t + (canal === 'basse' ? c.duree : Math.max(0.4, c.duree * 2.5)) :
    c.t + Math.max(0.25, c.duree * 1.5);
  const niveau = ((NIVEAU[c.p.voix] ?? 0.9) * (GAIN_SON[id] ?? 1) * (VOIX_DE_FAMILLE[s.famille]?.[c.p.voix] ?? 1) * velocite(c.force)) / Math.sqrt(notes.length);
  for (const m of notes) {
    const z = zoneDe(id, m);
    if (!z) continue;
    let depuis: number | undefined;
    if (c.p.voix === 'acid') {
      /* La 303 glisse de la note precedente quand les deux pas se touchent. */
      const prec = s.derniere.get(c.piste);
      if (prec !== undefined && c.lie && prec !== m && Math.abs(prec - m) <= 12) depuis = z.vitesse * Math.pow(2, (prec - m) / 12);
      s.derniere.set(c.piste, m);
    }
    const base: Lecture = { vitesse: z.vitesse, fin, relache: inst.relache ?? 0.04, ...(depuis === undefined ? {} : { depuis }) };
    if (inst.large) {
      /* Deux lectures desaccordees de quelques cents, ecartees a gauche et a
         droite : la largeur d'un chorus, sans un oscillateur. */
      lireFichier(s, z.nom, sortie, c.t, niveau * 0.72, { ...base, desaccord: -7, panoramique: -0.55 });
      lireFichier(s, z.nom, sortie, c.t, niveau * 0.72, { ...base, desaccord: 7, panoramique: 0.55 });
    } else {
      lireFichier(s, z.nom, sortie, c.t, niveau, base);
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

/** Le nombre de pas d'une mesure : douze en 12/8, seize sinon. */
const pasDeMesure = (motif: Motif): number => (motif.pas === 12 ? 12 : 16);

/** Tous les fichiers dont un motif a besoin, et rien de plus : pour chaque
    instrument accorde, seulement les zones que ses notes atteignent, sur
    toute la grille d'accords. Un style charge ainsi quelques centaines de
    kilo-octets, pas toute la bibliotheque. */
export function fichiersDuMotif(motif: Motif, famille: string, construire = true): string[] {
  const sons = sonsDuMotif(motif, famille);
  const noms = new Set<string>([(motif.espace ?? 0.4) > 0.5 ? SALLE_LONGUE : SALLE_COURTE]);
  if (construire) {
    noms.add(MONTEE);
    noms.add(IMPACT);
  }
  const mesures = Math.max(1, motif.accords?.length ?? 1);
  const parMesure = pasDeMesure(motif);
  motif.pistes.forEach((piste, i) => {
    const son = sons[i];
    if (!son) return;
    if ('frappe' in son) {
      noms.add(son.frappe);
      return;
    }
    const ids = [son.instrument, ...(son.accent ? [son.accent] : [])];
    /* Le couple (pas, accord) revient au bout de motif.pas x mesures pas. */
    for (let p = 0; p < motif.pas * mesures; p += 1) {
      const pas = p % motif.pas;
      if ((piste.pas[pas] ?? 0) === 0) continue;
      const midi = hauteurs(motif, piste, pas, Math.floor(p / parMesure));
      for (const id of ids) {
        const notes = INSTRUMENTS[id]?.mode === 'fige' ? [Math.min(...midi)] : midi;
        for (const m of notes) {
          const z = zoneDe(id, m);
          if (z) noms.add(z.nom);
        }
      }
    }
  });
  return [...noms];
}

/** Programme tout ce qui sonne au pas global `p`, a l'instant `t`. */
function programmerLePas(s: Studio, motif: Motif, cycles: readonly Cycle[] | null, p: number, t: number): void {
  const n = motif.pas;
  const duree = dureeDuPas(motif);
  const pas = p % n;
  const mesure = Math.floor(p / pasDeMesure(motif));
  const etat = cycles ? etatAu(motif, cycles, p) : null;
  if (etat?.silence) return;
  const swing = n !== 12 && pas % 2 === 1 ? (motif.swing ?? 0) * duree : 0;

  /* L'impact du drop, enregistre. */
  if (etat?.impact) lireFichier(s, IMPACT, s.canaux.fx, t, 0.9);
  if (etat?.section === 'montee' && pas === 0) {
    /* La montee : un bruit blanc dont le filtre s'ouvre, rendu sur huit
       secondes ; on en lit la fin, pour qu'il culmine juste avant le
       silence qui precede le drop. */
    const longueur = (n - pasParTemps(motif)) * duree;
    const b = s.banque.get(MONTEE);
    if (b) lireFichier(s, MONTEE, s.canaux.fx, t, 0.75, { decalage: Math.max(0, b.duration - longueur), fin: t + longueur, relache: 0.01 });
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
      lie: (piste.pas[(pas - 1 + n) % n] ?? 0) > 0,
    };
    jouerSon(s, coup);
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
  const banque = await charger(ac, fichiersDuMotif(motif, options.famille, options.construire ?? false));
  /* L'ENREGISTREMENT SE FAIT EN SILENCE : le son va dans la video, pas dans
     les haut-parleurs. Mika, le 30 octobre 2026 : « arrete de jouer la
     musique dans les speakers ». La sortie d'enregistrement suffit a faire
     tourner le graphe audio. */
  const sortie = options.enregistrer ? ac.createMediaStreamDestination() : null;
  const bus = ac.createGain();
  bus.connect(sortie ?? ac.destination);
  const s = monterStudio(ac, motif, bus, banque, sonsDuMotif(motif, options.famille), options.famille);
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
  const banque = await charger(ac, fichiersDuMotif(motif, famille, construire));
  const s = monterStudio(ac, motif, ac.destination, banque, sonsDuMotif(motif, famille), famille);
  const cycles = construire ? plan(motif) : null;
  const duree = dureeDuPas(motif);
  for (let p = 0; p * duree < secondes; p += 1) programmerLePas(s, motif, cycles, p, 0.05 + p * duree);
  return ac.startRendering();
}
