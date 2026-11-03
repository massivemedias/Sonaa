/* LES SONS ENREGISTRES DES AFFICHES DE RYTHME.

   Mika, le 30 octobre 2026 : « importe des samples one-shot, ce n'est pas un
   probleme », puis le 2 novembre 2026 : « faut arranger surtout les samples,
   faire des recherches quand meme basiques concernant le style selectionne ».

   Les batteries et les instruments acoustiques sonnent mieux enregistres que
   fabriques : une vraie TR-909, une TR-909 passee dans un SP-1200, une vraie
   TR-808, une LinnDrum LM-2, une batterie acoustique de breakbeat, une
   TR-505, une CR-78, un piano, un piano FM DX7/TX81Z, un marimba. Le
   synthetiseur (son.ts) garde les basses, les nappes, la 303, le kick gabber
   ou psytrance, et double les kicks enregistres d'une sous-basse accordee.

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

export const kitDeFamille = (famille: string): Kit => KIT_DE_FAMILLE[famille] ?? 'tr909';

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

/** Un instrument accorde : ses enregistrements et la note MIDI de chacun,
    mesuree sur le fichier (le « do 3 » de la Versilian n'est pas le meme
    d'un instrument a l'autre). */
interface Accorde {
  readonly notes: readonly { readonly nom: string; readonly midi: number }[];
  readonly tenue: number;
}

const ACCORDES: Record<string, Accorde> = {
  piano: { notes: [{ nom: 'vcsl-piano-c3', midi: 60 }, { nom: 'vcsl-piano-c4', midi: 72 }], tenue: 1.8 },
  rhodes: { notes: [{ nom: 'vcsl-fmpiano-c3', midi: 48 }, { nom: 'vcsl-fmpiano-c4', midi: 60 }], tenue: 1.8 },
  marimba: { notes: [{ nom: 'vcsl-marimba-c4', midi: 72 }], tenue: 1.2 },
};

/** L'instrument accorde d'une piste, s'il en a un. Le marimba n'a pas de
    voix a lui : une piste nommee MARIMBA, BALAFON ou KALIMBA le prend. */
export function accordeDe(piste: Piste): Accorde | null {
  if (piste.voix === 'piano') return ACCORDES['piano'] ?? null;
  if (piste.voix === 'rhodes') return ACCORDES['rhodes'] ?? null;
  if (/MARIMBA|BALAFON|KALIMBA/.test(`${piste.fr} ${piste.en}`)) return ACCORDES['marimba'] ?? null;
  return null;
}

/** Le fichier qui joue une frappe de cette voix, dans ce kit. */
export function fichierDe(voix: Voix, kit: Kit, piste?: Piste): string | null {
  if (piste) {
    const etik = `${piste.fr} ${piste.en}`.toUpperCase();
    /* Kicks speciaux (gabber, hardcore, 808 explicite, break Amen). */
    if (voix === 'kick') {
      if (/GABBER|HARDCORE|TERROR|UPTEMPO|SPEEDCORE/.test(etik)) return null;
      if (/808/.test(etik)) return 'tr808-kick';
      if (/AMEN|BREAK/.test(etik)) return 'break-kick';
    }
    if (voix === 'snare' && /AMEN|BREAK/.test(etik)) return 'break-snare';
    if (voix === 'hat' && /AMEN|BREAK/.test(etik)) return 'break-hat';
    if (voix === 'perc' && /AMEN|BREAK/.test(etik)) return 'break-ghost';
    /* Une piste qui nomme un bruit, un clic, un glitch, une boucle techno ou
       un LFO est synthetisee dans son.ts plutot que remplacee par un woodblock. */
    if (/BRUIT|NOISE|CLIC|CLICK|GLITCH|GRAIN|LFO|IMPULS|BOUCLE|LOOP|PAPIER|PAPER|ROBINET|TAP|PORTI|BED|SQUEAK|TAPE|BANDE|MACHINE|SCRATCH/.test(etik)) {
      return null;
    }
    if (/WOOD\s?BLOCK/.test(etik)) return 'vcsl-woodblock';
  }
  return PAR_KIT[kit][voix] ?? COMMUNS[voix] ?? null;
}

/** Tous les fichiers dont un motif a besoin. */
export function fichiersDuMotif(motif: Motif, kit: Kit): string[] {
  const noms = new Set<string>();
  for (const p of motif.pistes) {
    const a = accordeDe(p);
    if (a) a.notes.forEach((n) => noms.add(n.nom));
    else {
      const f = fichierDe(p.voix, kit, p);
      if (f) noms.add(f);
    }
  }
  return [...noms];
}

/** La note enregistree la plus proche d'une hauteur, et le rapport de
    vitesse qui l'y amene. */
export function plusProche(a: Accorde, midi: number): { nom: string; vitesse: number; tenue: number } {
  let meilleure = a.notes[0] ?? { nom: '', midi };
  for (const n of a.notes) if (Math.abs(n.midi - midi) < Math.abs(meilleure.midi - midi)) meilleure = n;
  return { nom: meilleure.nom, vitesse: Math.pow(2, (midi - meilleure.midi) / 12), tenue: a.tenue };
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
