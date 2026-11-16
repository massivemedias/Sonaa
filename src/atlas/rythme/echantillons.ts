/* LES SONS ENREGISTRES DES AFFICHES DE RYTHME.

   Mika, le 30 octobre 2026 : « importe des samples one-shot, ce n'est pas un
   probleme », puis le 2 novembre 2026 : « faut arranger surtout les samples,
   faire des recherches quand meme basiques concernant le style selectionne ».

   Les batteries et les instruments acoustiques sonnent mieux enregistres que
   fabriques : une vraie TR-909, une TR-909 passee dans un SP-1200, une vraie
   TR-808, une LinnDrum LM-2, une batterie acoustique de breakbeat, une
   TR-505, une CR-78. Les instruments accordes (basses, accords, nappes,
   melodies) sont dans instruments.ts ; ce module garde les frappes.

   TOUS LES FICHIERS SONT LIBRES : domaine public ou licence libre (depot
   oramics/sampled pour TR-909, TR-909 SP-1200, TR-808, LinnDrum LM-2, TR-505,
   CR-78 et Pearl Master Studio ; CC0 pour la bibliotheque Versilian). La
   provenance de chacun est dans public/sons/SOURCES.txt. */

import type { Motif, Piste, Voix } from '../../lib/rythmes.ts';

export type Kit = 'tr909' | 'sp909' | 'tr808' | 'linn' | 'breaks' | 'tr505' | 'cr78';

const KIT_DE_FAMILLE: Record<string, Kit> = {
  disco: 'linn',
  house: 'tr909',
  techno: 'tr909',
  minimal: 'tr909',
  trance: 'tr909',
  psy: 'tr909',
  hardcore: 'tr909',
  industrial: 'tr909',
  roots: 'linn',
  breaks: 'breaks',
  electro: 'tr808',
  bass: 'tr808',
  downtempo: 'sp909',
  ambient: 'cr78',
};

const kitDeFamille = (famille: string): Kit => KIT_DE_FAMILLE[famille] ?? 'tr909';

/** Choisit le kit d'un motif selon les machines qu'il cite et sa famille :
    TR-808, TR-909, SP-1200/MPC, LinnDrum/DMX, batterie/break Amen, TR-505
    ou CR-78. */
export function kitDuMotif(motif: Motif, famille: string): Kit {
  const inst = `${motif.instruments.fr} ${motif.instruments.en}`.toUpperCase();
  if (/CR-78|COMPURYTHM/.test(inst)) return 'cr78';
  if (/505|626/.test(inst)) return 'tr505';
  if (/LINN|LM-1|LM-2|DMX|OBERHEIM|707/.test(inst)) return 'linn';
  if (/SP-1200|MPC|FILTERED LOOP|BOUCLE FILTR/.test(inst)) return 'sp909';
  if (/808|606/.test(inst)) return 'tr808';
  if (/909/.test(inst)) return 'tr909';
  if (/AMEN|BREAKBEAT|BREAKS|BATTERIE|LIVE DRUM|JUNGLE|SAMPLER AKAI|S950|S1000|S3000/.test(inst)) return 'breaks';
  return kitDeFamille(famille);
}

const PAR_KIT: Record<Kit, Partial<Record<Voix, string>>> = {
  tr909: {
    kick: 'tr909-kick', snare: 'tr909-snare', clap: 'tr909-clap', rim: 'tr909-rim',
    hat: 'tr909-hat', openhat: 'tr909-openhat', ride: 'tr909-ride', tom: 'tr909-tom',
    cowbell: 'tr808-cowbell',
  },
  sp909: {
    kick: 'sp909-kick', snare: 'sp909-snare', clap: 'sp909-clap', rim: 'tr909-rim',
    hat: 'sp909-hat', openhat: 'sp909-openhat', ride: 'tr909-ride', tom: 'tr909-tom',
    cowbell: 'lm2-cowbell', shaker: 'lm2-cabasa',
  },
  tr808: {
    kick: 'tr808-kick', snare: 'tr808-snare', clap: 'tr808-clap', rim: 'tr808-rim',
    hat: 'tr808-hat', openhat: 'tr808-openhat', cowbell: 'tr808-cowbell',
    conga: 'tr808-conga', tom: 'tr808-tom', shaker: 'tr808-maracas', clave: 'tr808-claves',
    ride: 'tr909-ride',
  },
  linn: {
    kick: 'lm2-kick', snare: 'lm2-snare', clap: 'lm2-clap', rim: 'lm2-stick', hat: 'lm2-hat', openhat: 'lm2-openhat',
    ride: 'lm2-ride', cowbell: 'lm2-cowbell', conga: 'lm2-conga', tom: 'lm2-tom', perc: 'lm2-tamb', shaker: 'lm2-cabasa',
  },
  breaks: {
    kick: 'break-kick', snare: 'break-snare', clap: 'tr909-clap', rim: 'tr909-rim',
    hat: 'break-hat', openhat: 'break-openhat', ride: 'break-ride', tom: 'break-tom',
    perc: 'break-ghost',
  },
  tr505: {
    kick: 'tr909-kick', snare: 'tr505-snare', clap: 'tr505-clap', rim: 'tr505-rim',
    hat: 'tr505-hat', openhat: 'tr505-openhat', ride: 'tr505-ride', cowbell: 'tr505-cowbell', tom: 'tr505-tom',
  },
  cr78: {
    kick: 'cr78-kick', snare: 'cr78-snare', rim: 'cr78-rim', hat: 'cr78-hat', bongo: 'cr78-bongo',
    perc: 'vcsl-woodblock', clap: 'lm2-clap', openhat: 'lm2-openhat', ride: 'lm2-ride', tom: 'lm2-tom', cowbell: 'lm2-cowbell',
  },
};

/* Ce qui ne depend pas du kit : les percussions acoustiques de la Versilian. */
const COMMUNS: Partial<Record<Voix, string>> = {
  conga: 'vcsl-conga', bongo: 'vcsl-bongo', clave: 'vcsl-claves', shaker: 'vcsl-shaker', metal: 'vcsl-brakedrum',
};

/* Les kicks des styles durs, construits pour eux (scripts/sons/construire.py). */
const KICK_DU_STYLE: Record<string, string> = {
  gabber: 'kick-gabber', hardcoretechno: 'kick-gabber', nustylegabber: 'kick-gabber', doomcore: 'kick-gabber',
  lentoviolento: 'kick-gabber', crossbreed: 'kick-gabber', breakcore: 'kick-gabber',
  frenchcore: 'kick-uptempo', uptempo: 'kick-uptempo', terrorcore: 'kick-uptempo', speedcore: 'kick-uptempo',
  digitalhardcore: 'kick-uptempo', psycore: 'kick-uptempo',
  hardstyle: 'kick-hardstyle', jumpstyle: 'kick-hardstyle', dubstyle: 'kick-hardstyle',
  happyhardcore: 'kick-dur', ukhardcore: 'kick-dur', bouncytechno: 'kick-dur', makina: 'kick-dur', jcore: 'kick-dur',
  hardtechno: 'kick-dur', schranz: 'kick-dur', industrialtechno: 'kick-dur', bangintechno: 'kick-dur', techtrance: 'kick-dur',
  hardhouse: 'kick-dur', hardtrance: 'kick-dur', rhythmicnoise: 'kick-dur', powerelectronics: 'kick-dur', raggacore: 'kick-dur',
  gqom: 'kick-caverne',
  hitech: 'kick-hitech',
};

/** Les kicks deja satures : le moteur ne les repasse pas dans sa distorsion. */
export const KICKS_DURS: ReadonlySet<string> = new Set(['kick-gabber', 'kick-uptempo', 'kick-hardstyle', 'kick-dur', 'kick-caverne', 'kick-hitech']);

const GLITCH = ['glitch-3', 'glitch-2'];

/** Le fichier qui joue une frappe de cette voix, dans ce kit. Une piste qui
    nomme un bruit, un clic, un glitch, une boucle, une portiere ou un
    scratch prend un vrai enregistrement de ce bruit, jamais un son
    fabrique. */
export function fichierDe(voix: Voix, kit: Kit, piste?: Piste, motif?: Motif, famille?: string, numero = 0): string | null {
  const etik = piste ? `${piste.fr} ${piste.en}`.toUpperCase() : '';
  const id = motif?.id ?? '';
  if (voix === 'kick') {
    if (/GABBER|HARDCORE|TERROR|UPTEMPO|SPEEDCORE/.test(etik)) return 'kick-gabber';
    if (/AMEN|BREAK/.test(etik)) return 'break-kick';
    if (/808/.test(etik)) return 'tr808-kick';
    const dur = KICK_DU_STYLE[id];
    if (dur) return dur;
    if (famille === 'psy' && id !== 'psydub') return 'kick-psy';
  }
  /* Les charleys FM du hi-tech (FM8), fabriques pour lui. */
  if (voix === 'hat' && /\bFM\b/.test(etik)) return 'charley-fm';
  if (voix === 'openhat' && /\bFM\b/.test(etik)) return 'charley-fm-ouvert';
  if (/AMEN|BREAK/.test(etik)) {
    if (voix === 'snare') return 'break-snare';
    if (voix === 'hat') return 'break-hat';
    if (voix === 'perc') return 'break-ghost';
  }
  if (/SCRATCH/.test(etik)) return 'scratch';
  if (/BALAIS|BRUSH/.test(etik)) return 'caisse-balais';
  if (/GONG/.test(etik)) return 'gong';
  if (/TIMBALE|TIMPANI/.test(etik)) return voix === 'tom' ? 'timbale' : 'vcsl-bongo';
  if (/KICK AIGU|HIGH KICK/.test(etik)) return 'kick-uptempo';
  if (/IMPACT/.test(etik)) return voix === 'metal' ? 'enclume' : 'caisse-impact';
  if (/BRUIT|NOISE/.test(etik)) return voix === 'snare' ? 'caisse-impact' : 'bruit';
  if (/ROBINET|TAP\b|FAUCET/.test(etik)) return 'robinet';
  if (/PORTI|CAR DOOR|DOOR/.test(etik)) return 'porte';
  if (/PAPIER|PAPER/.test(etik)) return 'papier';
  if (/GRINCEMENT|SQUEAK/.test(etik)) return 'twip';
  if (/TABLA/.test(etik)) return 'tabla-na';
  if (/CYMBALE|CYMBAL/.test(etik)) return 'cymbale';
  if (/BOUCLE|LOOP/.test(etik)) return 'chug';
  if (/TICK|MÉTAL|METAL/.test(etik) && voix !== 'metal') return 'ping';
  if (voix === 'metal') return /MÉTAL|METAL/.test(etik) ? 'enclume' : 'vcsl-brakedrum';
  if (/GLITCH|MACHINE|BANDE|TAPE|CLIQUETIS|RATTLE|LFO/.test(etik)) return GLITCH[numero % GLITCH.length] ?? 'glitch-3';
  if (/GRAIN|MICRO/.test(etik)) return 'plip';
  if (/CLAQUEMENT|SNAP/.test(etik)) return 'snap';
  if (/CLIC|CLICK|IMPULS/.test(etik)) return 'clic';
  if (/WOOD\s?BLOCK/.test(etik)) return 'vcsl-woodblock';
  return PAR_KIT[kit][voix] ?? COMMUNS[voix] ?? null;
}

/* LE CACHE. Un fichier se telecharge et se decode une fois par visite ; le
   tampon decode sert a tous les contextes audio qui suivent (une ecoute, la
   video, la suivante). */
const decodes = new Map<string, Promise<AudioBuffer | null>>();

export function charger(ac: BaseAudioContext, noms: readonly string[]): Promise<Map<string, AudioBuffer>> {
  return Promise.all(
    noms.map((nom) => {
      let p = decodes.get(nom);
      if (!p) {
        p = fetch(`/sons/${nom}.wav`)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
          .then((b) => ac.decodeAudioData(b))
          .catch(() => {
            decodes.delete(nom);
            return null;
          });
        decodes.set(nom, p);
      }
      return p.then((b) => [nom, b] as const);
    })
  ).then((paires) => new Map(paires.filter((x): x is readonly [string, AudioBuffer] => x[1] !== null)));
}
