/* LES INSTRUMENTS DE CHAQUE SOUS-STYLE (ADR-122).

   Mika, le 16 novembre 2026 : « les sons sont horribles et ne refletent pas
   du tout le style ; prends de bons one-shots pour tous les sous-styles »,
   puis : « remplace aussi les accords et les basses par des samples, refais
   la totale ».

   Le navigateur ne fabrique plus aucun son. Chaque piste d'un motif joue un
   fichier de public/sons, construit par scripts/sons/construire.py et decrit
   dans data/instruments-sons.json. Ce module choisit lequel : la basse d'un
   style de deep house n'est pas celle de la psytrance, l'accord de la dub
   techno n'est pas le stab de la techno belge.

   L'ORDRE DU CHOIX. D'abord ce que la piste nomme (WOBBLE, REESE, 303,
   PIANO DX7, ORGUE M1...), puis le style lui-meme (une table par voix pour
   les styles dont l'instrument est connu), puis la famille. */

import FICHE from '../../data/instruments-sons.json';
import type { Motif, Piste, Voix } from '../../lib/rythmes.ts';

export type Mode = 'tenu' | 'libre' | 'fige' | 'coup';

export interface Instrument {
  readonly mode: Mode;
  /** Les notes MIDI enregistrees : un fichier `<id>-<midi>.wav` chacune. */
  readonly zones?: readonly number[];
  /** Le fondu de fin de note, en secondes. */
  readonly relache?: number;
  /** Joue en double, desaccorde et ecarte en stereo. */
  readonly large?: boolean;
}

export const INSTRUMENTS = FICHE as Record<string, Instrument>;

/** Ce que joue une piste : une frappe (un fichier), ou un instrument accorde. */
export type Son =
  | { readonly frappe: string }
  | { readonly instrument: string; readonly accent?: string };

const etiquette = (p: Piste): string => `${p.fr} ${p.en}`.toUpperCase();

/* ── Les basses ─────────────────────────────────────────────────────── */

/** La basse de chaque style dont la basse est connue. */
const BASSE_DU_STYLE: Record<string, string> = {
  // disco
  disco: 'basse-electrique', postdisco: 'basse-electrique', discopunk: 'basse-electrique', boogie: 'basse-moog',
  eurodisco: 'basse-moog', cosmic: 'basse-moog', hinrg: 'basse-juno', spacesynth: 'basse-juno', italodisco: 'basse-juno',
  nuitalo: 'basse-juno', nudisco: 'basse-juno', indiedance: 'basse-juno', darkdisco: 'basse-101', discodub: 'basse-dub',
  // house
  chicagohouse: 'basse-juno', acidhouse: 'basse-101', garagehouse: 'basse-fm', usdeephouse: 'basse-juno', hiphouse: 'basse-juno',
  ukhouse: 'basse-juno', italohouse: 'basse-juno', hardhouse: 'basse-saw', discohouse: 'basse-electrique', frenchhouse: 'basse-moog',
  progressivehouse: 'basse-juno', electrohouse: 'basse-saw', tribalhouse: 'basse-juno', afrohouse: 'basse-juno',
  soulfulhouse: 'basse-electrique', latinhouse: 'basse-electrique', ghettohouse: 'basse-101', juke: 'sub-808', footwork: 'sub-808',
  basshouse: 'basse-saw', futurehouse: 'basse-fm', lofihouse: 'basse-juno', amapiano: 'basse-juno', gqom: 'sub-808',
  // techno
  detroittechno: 'basse-juno', bleeptechno: 'sub-sinus', acidtechno: 'basse-303', eurotechno: 'basse-saw', belgiantechno: 'basse-saw',
  hardtechno: 'basse-saw', schranz: 'basse-saw', industrialtechno: 'basse-saturee', bangintechno: 'basse-saw',
  birminghamtechno: 'basse-saw', dubtechno: 'basse-dub', ambienttechno: 'basse-dub', hypnotictechno: 'basse-101',
  melodictechno: 'basse-moog', peaktimetechno: 'basse-saw', brokentechno: 'basse-101',
  // minimal
  minimaltechno: 'basse-101', techhouse: 'basse-moog', microhouse: 'basse-101', clickscuts: 'basse-101', minimaltech: 'basse-101',
  deeptech: 'sub-sinus', fidgethouse: 'basse-saw', minimalprog: 'basse-101', rominimal: 'sub-sinus', microtechno: 'basse-101',
  minimalwave: 'basse-101',
  // trance
  trance: 'basse-moog', acidtrance: 'basse-303', balearictrance: 'basse-juno', progressivetrance: 'basse-moog', techtrance: 'basse-saw',
  dreamtrance: 'basse-juno', germantrance: 'basse-moog', hardtrance: 'basse-saw', upliftingtrance: 'basse-moog',
  vocaltrance: 'basse-moog', eurotrance: 'basse-moog', anthemtrance: 'basse-moog', ibizatrance: 'basse-juno',
  orchestraltrance: 'basse-moog',
  // psy
  psydub: 'basse-dub',
  // industrial
  industrial: 'basse-saturee', ebm: 'basse-101', newbeat: 'basse-101', electroindustrial: 'basse-101', darkelectro: 'basse-101',
  technobodymusic: 'basse-101', coldwave: 'basse-electrique', ndh: 'basse-saturee', powerelectronics: 'basse-saturee',
  rhythmicnoise: 'basse-saturee', darkwave: 'basse-electrique', industrialrock: 'basse-saturee', futurepop: 'basse-moog',
  aggrotech: 'basse-101',
  // roots
  musiqueconcrete: 'basse-101', electroacoustic: 'basse-101', krautrock: 'basse-electrique', kosmische: 'basse-moog',
  spacemusic: 'basse-moog', prototechno: 'basse-moog', earlyindustrial: 'basse-saturee', funk: 'basse-electrique',
  phillysoul: 'basse-electrique', dub: 'basse-dub', synthpop: 'basse-juno', hiphop: 'sub-808', reggae: 'basse-dub',
  elektronischemusik: 'basse-101',
  // breaks
  breakbeat: 'basse-moog', breakbeathardcore: 'basse-saw', darkcore: 'basse-reese', jungle: 'sub-sinus', drumandbass: 'basse-reese',
  techstep: 'basse-reese-neuro', neurofunk: 'basse-reese-neuro', liquiddnb: 'basse-dub', jumpup: 'basse-wobble',
  drumfunk: 'sub-sinus', drumstep: 'basse-growl', raggajungle: 'basse-dub', drillnbass: 'basse-303', breakcore: 'basse-saturee',
  crossbreed: 'basse-reese-neuro', bigbeat: 'basse-saw', nuskoolbreaks: 'basse-saw', progressivebreaks: 'basse-moog',
  floridabreaks: 'sub-808', brokenbeat: 'basse-moog', ghettofunk: 'basse-wobble', psybreaks: 'basse-roll', darkstep: 'basse-reese-neuro',
  // bass
  ukgarage: 'basse-fm', speedgarage: 'basse-warp', '2step': 'basse-fm', dubstep: 'basse-wobble', brostep: 'basse-growl',
  riddim: 'basse-growl', futuregarage: 'sub-sinus', grime: 'basse-101', bassline: 'basse-warp', ukfunky: 'basse-juno',
  breakstep: 'basse-reese', ukbass: 'sub-sinus', wonky: 'basse-moog', futurebass: 'basse-saw', trapedm: 'sub-808',
  baltimoreclub: 'sub-808', jerseyclub: 'sub-808', deconstructedclub: 'basse-saturee', breakbeatgarage: 'basse-warp',
  // electro
  electrofunk: 'basse-moog', electrohop: 'sub-808', miamibass: 'sub-808', technobass: 'sub-808', freestyle: 'basse-fm',
  latinfreestyle: 'basse-fm', detroitelectro: 'basse-moog', electromodern: 'basse-101', synthfunk: 'basse-moog',
  electroclash: 'basse-101', skweee: 'basse-101',
  // hardcore
  hardcoretechno: 'basse-saturee', gabber: 'basse-saturee', terrorcore: 'basse-saturee', speedcore: 'basse-saturee',
  nustylegabber: 'basse-saturee', uptempo: 'basse-saturee', doomcore: 'basse-saturee', frenchcore: 'basse-saturee',
  dubstyle: 'basse-reverse', happyhardcore: 'basse-saw', bouncytechno: 'basse-saw', ukhardcore: 'basse-saw',
  raggacore: 'basse-reese', jcore: 'basse-saw', hardstyle: 'basse-reverse', jumpstyle: 'basse-reverse',
  lentoviolento: 'basse-saturee', makina: 'basse-saw', digitalhardcore: 'basse-saturee',
  // ambient
  ambientgenre: 'basse-dub', darkambient: 'basse-bourdon', isolationism: 'basse-bourdon', dungeonsynth: 'basse-dub',
  drone: 'basse-bourdon', lowercase: 'sub-sinus', ambientdub: 'basse-dub', illbient: 'basse-dub', newage: 'basse-juno',
  idm: 'basse-101', braindance: 'basse-303', glitch: 'basse-101',
  // downtempo
  downtempogenre: 'basse-electrique', triphop: 'basse-dub', bristolsound: 'basse-dub', lofihiphop: 'basse-contrebasse',
  chillout: 'basse-juno', lounge: 'basse-contrebasse', balearic: 'basse-juno', ambienthouse: 'basse-juno',
  nujazz: 'basse-contrebasse', psybient: 'basse-dub', chillwave: 'basse-juno', folktronica: 'basse-electrique',
};

const BASSE_DE_FAMILLE: Record<string, string> = {
  disco: 'basse-electrique', house: 'basse-juno', techno: 'basse-101', minimal: 'basse-101', trance: 'basse-moog',
  psy: 'basse-roll', industrial: 'basse-101', roots: 'basse-electrique', breaks: 'basse-reese', bass: 'basse-warp',
  electro: 'basse-moog', hardcore: 'basse-saturee', ambient: 'basse-dub', downtempo: 'basse-dub',
};

function basse(e: string, motif: Motif, famille: string): string {
  if (/WOBBLE/.test(e)) return 'basse-wobble';
  if (/GROWL|MARTEAU|HAMMER/.test(e)) return 'basse-growl';
  if (/WARP/.test(e)) return 'basse-warp';
  if (/REVERSE/.test(e)) return 'basse-reverse';
  if (/DX7|\bFM\b/.test(e)) return 'basse-fm';
  if (/SAW/.test(e)) return 'basse-saw';
  if (/SH-101|ARPÈGE|ARPEGGIO|SÉQUENCE|SEQUENCE|RIFF/.test(e)) return 'basse-101';
  if (/MINIMOOG/.test(e)) return 'basse-moog';
  if (/DUB/.test(e)) return 'basse-dub';
  if (/BOURDON|DRONE/.test(e)) return 'basse-bourdon';
  return BASSE_DU_STYLE[motif.id] ?? BASSE_DE_FAMILLE[famille] ?? 'basse-juno';
}

function sousBasse(e: string): string {
  /* La basse en mitraille du hi-tech : trois attaques par double croche (ADR-123). */
  if (/MITRAILLE|MACHINE ?GUN/.test(e)) return 'basse-hitech';
  if (/RUMBLE/.test(e)) return 'rumble';
  if (/808/.test(e)) return 'sub-808';
  if (/BOURDON|DRONE|PÉDALE|PEDAL|GELÉ|FROZEN/.test(e)) return 'basse-bourdon';
  if (/BRUIT|NOISE/.test(e)) return 'rumble';
  return 'sub-sinus';
}

/* ── Les accords ────────────────────────────────────────────────────── */

const CORDES_VRAIES = new Set(['disco', 'roots', 'ambient', 'downtempo']);
const STAB_RAVE = new Set(['belgiantechno', 'eurotechno', 'hardtechno', 'bangintechno', 'breakbeathardcore', 'darkcore', 'hardhouse']);
const STAB_DUB = new Set(['dubtechno', 'ambienttechno', 'minimaltechno', 'deeptech', 'ambientdub']);

function stab(e: string, motif: Motif, famille: string): string {
  if (/DUB/.test(e) || STAB_DUB.has(motif.id)) return 'accord-dub';
  if (/CUIVRE|BRASS/.test(e)) return 'cuivres';
  if (/ORCH/.test(e)) return 'orchestre';
  if (STAB_RAVE.has(motif.id) || famille === 'hardcore' || famille === 'industrial') return 'stab-rave';
  return 'stab';
}

function accordDe(e: string, famille: string): string {
  if (/SUPERSAW/.test(e)) return 'supersaw';
  if (/CLAVINET/.test(e)) return 'clavinet';
  if (/JUNO/.test(e)) return 'juno';
  if (/SKANK/.test(e)) return 'guitare-cocotte';
  if (/GUITAR/.test(e)) {
    if (famille === 'industrial' || famille === 'hardcore') return 'guitare-saturee';
    if (famille === 'disco') return 'guitare-cocotte';
    return 'guitare';
  }
  if (famille === 'trance' || famille === 'hardcore') return 'supersaw';
  return famille === 'house' || famille === 'bass' ? 'stab' : 'juno';
}

function piano(motif: Motif, famille: string): string {
  const inst = `${motif.instruments.fr} ${motif.instruments.en}`.toUpperCase();
  if (/M1|RAVE/.test(inst) || famille === 'hardcore') return 'piano-rave';
  if (['italohouse', 'hiphouse', 'ukhouse', 'breakbeathardcore', 'dreamtrance'].includes(motif.id)) return 'piano-rave';
  return 'piano';
}

function orgue(e: string, famille: string): string {
  if (/M1/.test(e)) return 'orgue-m1';
  if (famille === 'house' || famille === 'bass') return 'orgue-m1';
  return 'orgue';
}

const NAPPE_DE_FAMILLE: Record<string, string> = {
  trance: 'nappe-air', psy: 'nappe-air', industrial: 'nappe-sombre', hardcore: 'nappe-sombre',
};

function nappe(e: string, motif: Motif, famille: string): string {
  if (/ARCHET|BOW/.test(e)) return 'cordes';
  if (/BOURDON|DRONE/.test(e)) return 'bourdon';
  if (/GRONDEMENT|RUMBLE/.test(e)) return 'nappe-sombre';
  if (/MELLOTRON/.test(e)) return 'mellotron';
  if (/SOUFFLE|BREATH|TEXTURE/.test(e)) return 'vent';
  if (['darkambient', 'doomcore', 'darkpsy', 'darkwave'].includes(motif.id)) return 'nappe-sombre';
  if (['isolationism', 'lowercase'].includes(motif.id)) return 'vent';
  if (motif.id === 'newage') return 'nappe-air';
  return NAPPE_DE_FAMILLE[famille] ?? 'nappe';
}

/* ── Les melodies ───────────────────────────────────────────────────── */

function pluck(e: string, famille: string): string {
  if (/BLEEP/.test(e)) return 'bleep';
  if (/BOIS|WOOD/.test(e)) return 'balafon';
  if (/CARILLON|CHIME/.test(e)) return 'carillon';
  if (/CLOCHE|BELL/.test(e)) return 'cloche';
  if (/GUITAR/.test(e)) return 'guitare';
  if (/HARPE|HARP/.test(e)) return 'harpe';
  if (/KALIMBA/.test(e)) return 'kalimba';
  if (/MARIMBA|BALAFON/.test(e)) return 'marimba';
  if (/MODULAIRE|MODULAR/.test(e)) return 'modulaire';
  if (/PIANO/.test(e)) return 'piano';
  if (/SÉQUENCE|SEQUENCE/.test(e)) return 'sequence';
  return famille === 'psy' ? 'modulaire' : 'pluck';
}

function arpege(e: string, famille: string): string {
  if (/CHIPTUNE/.test(e)) return 'chiptune';
  if (/SÉQUENCE|SEQUENCE/.test(e) || famille === 'disco' || famille === 'roots') return 'sequence';
  return 'arpege';
}

function lead(e: string, motif: Motif, famille: string): string {
  if (/LASER|ZAP/.test(e)) return 'lead-zap';
  if (/LEAD FM|\bFM\b/.test(e)) return 'lead-fm';
  if (/MINIMOOG/.test(e)) return 'lead-moog';
  if (/MÉLODICA|MELODICA/.test(e)) return 'melodica';
  if (/SCREECH/.test(e)) return 'screech';
  if (/SUPERSAW/.test(e)) return 'supersaw';
  if (/MÉLODIE|MELODY/.test(e)) return famille === 'minimal' ? 'bleep' : 'lead-moog';
  if (famille === 'psy') return 'lead';
  if (famille === 'hardcore') return (motif.grain ?? 0) >= 0.6 ? 'screech' : 'supersaw';
  if (famille === 'trance') return 'supersaw';
  return 'lead-moog';
}

function voix(e: string): Son {
  if (/SCRATCH/.test(e)) return { frappe: 'scratch' };
  if (/TALKBOX/.test(e)) return { instrument: 'talkbox' };
  if (/CRIS|SCREAM/.test(e)) return { instrument: 'cris' };
  return { instrument: 'voix' };
}

/** Les styles psy dont la basse a ete mesuree sur des morceaux de
    reference (ADR-124) : chacun a la sienne, `basse-<style>`, calee sur son
    tempo, son registre et son nombre d'attaques par double croche. */
export const BASSES_MESUREES: ReadonlySet<string> = new Set([
  'goatrance', 'psychedelictrance', 'fullon', 'morningfullon', 'darkpsy', 'forestpsy', 'progpsy',
  'twilightpsy', 'zenonesque', 'psytech', 'neogoa', 'suomisaundi', 'psycore',
]);

/** L'instrument accorde d'une piste melodique ou d'accords, ou null pour
    une voix de percussion (echantillons.ts s'en charge). */
export function sonAccorde(piste: Piste, motif: Motif, famille: string): Son | null {
  const e = etiquette(piste);
  const v: Voix = piste.voix;
  if ((v === 'bass' || v === 'sub') && BASSES_MESUREES.has(motif.id)) return { instrument: `basse-${motif.id}` };
  switch (v) {
    case 'bass':
      return { instrument: basse(e, motif, famille) };
    case 'sub':
      return { instrument: sousBasse(e) };
    case 'reese':
      return { instrument: ['techstep', 'neurofunk', 'darkstep', 'crossbreed'].includes(motif.id) ? 'basse-reese-neuro' : 'basse-reese' };
    case 'logdrum':
      return { instrument: 'logdrum' };
    case 'acid':
      return { instrument: 'basse-303', accent: 'basse-303-accent' };
    case 'stab':
      return { instrument: stab(e, motif, famille) };
    case 'chord':
      return { instrument: accordDe(e, famille) };
    case 'rhodes':
      return { instrument: /DX7|FM/.test(e) ? 'piano-fm' : 'rhodes' };
    case 'piano':
      return { instrument: piano(motif, famille) };
    case 'strings':
      return { instrument: CORDES_VRAIES.has(famille) || motif.id === 'orchestraltrance' || motif.id === 'phillysoul' ? 'cordes' : 'cordes-synthe' };
    case 'organ':
      return { instrument: orgue(e, famille) };
    case 'pad':
      return { instrument: nappe(e, motif, famille) };
    case 'pluck':
      return { instrument: pluck(e, famille) };
    case 'arp':
      return { instrument: arpege(e, famille) };
    case 'lead':
      return { instrument: lead(e, motif, famille) };
    case 'hoover':
      return { instrument: 'hoover' };
    case 'vocal':
      return voix(e);
    default:
      return null;
  }
}

/** La note enregistree la plus proche et la vitesse de lecture qui l'amene
    a la hauteur voulue. */
export function zoneDe(id: string, midi: number): { nom: string; vitesse: number; ecart: number } | null {
  const zones = INSTRUMENTS[id]?.zones;
  if (!zones || zones.length === 0) return null;
  let z = zones[0] ?? midi;
  for (const x of zones) if (Math.abs(x - midi) < Math.abs(z - midi)) z = x;
  return { nom: `${id}-${z}`, vitesse: Math.pow(2, (midi - z) / 12), ecart: midi - z };
}
