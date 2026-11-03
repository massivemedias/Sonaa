/* LES SONS ENREGISTRES DES AFFICHES DE RYTHME.

   Mika, le 30 octobre 2026 : « importe des samples one-shot, ce n'est pas un
   probleme ». Les batteries et les instruments acoustiques sonnent mieux
   enregistres que fabriques : une caisse de LinnDrum, un charley de TR-505,
   une conga, un piano, un marimba. Le synthetiseur (son.ts) garde ce qu'il
   fait bien, les basses, les nappes, la 303, et reprend la main sur toute
   voix dont le fichier manque.

   TOUS LES FICHIERS SONT LIBRES : domaine public pour les trois boites a
   rythmes, CC0 pour la bibliotheque Versilian. La provenance de chacun est
   dans public/sons/SOURCES.txt.

   UN KIT PAR FAMILLE. Le disco, la house et le downtempo prennent la LinnDrum,
   la machine des disques de 1982 a 1988 ; la techno, la trance et la bass
   music prennent la TR-505, plus seche ; l'ambient prend la CR-78, la plus
   douce. Le kick de la techno reste fabrique : celui de la TR-505 n'a pas
   de grave. */

import type { Motif, Piste, Voix } from '../../lib/rythmes.ts';

export type Kit = 'linn' | 'roland' | 'cr78';

const KIT_DE_FAMILLE: Record<string, Kit> = {
  disco: 'linn', roots: 'linn', downtempo: 'linn',
  ambient: 'cr78',
};

export const kitDeFamille = (famille: string): Kit => KIT_DE_FAMILLE[famille] ?? 'roland';

/** Choisit le kit d'un motif selon les machines qu'il cite et sa famille :
    une 808 ou une 909 se fabrique au synthetiseur (roland), la LinnDrum,
    la DMX ou la 707 gardent les fichiers de la LM-2 (linn), et la CR-78
    reste pour l'ambient et les boites analogiques douces. */
export function kitDuMotif(motif: Motif, famille: string): Kit {
  const inst = `${motif.instruments.fr} ${motif.instruments.en}`.toUpperCase();
  if (/CR-78|COMPURYTHM/.test(inst)) return 'cr78';
  if (/LINN|LM-1|LM-2|DMX|OBERHEIM|707|BATTERIE|DRUMS|LIVE|DISCO/.test(inst)) return 'linn';
  if (/808|909|606|MACHINEDRUM|DIGITAKT|MODULAIRE|MODULAR|SERUM|MASSIVE|SYLENTH|VIRUS|NORD/.test(inst)) return 'roland';
  return kitDeFamille(famille);
}

const PAR_KIT: Record<Kit, Partial<Record<Voix, string>>> = {
  linn: {
    kick: 'lm2-kick', snare: 'lm2-snare', clap: 'lm2-clap', rim: 'lm2-stick', hat: 'lm2-hat', openhat: 'lm2-openhat',
    ride: 'lm2-ride', cowbell: 'lm2-cowbell', conga: 'lm2-conga', tom: 'lm2-tom', perc: 'lm2-tamb', shaker: 'lm2-cabasa',
  },
  /* Les boites de club (808, 909, techno, house, breaks, electro, bass) sont
     fabriquees sur mesure par style dans son.ts ; seules les percussions de
     bois et de peau gardent un enregistrement. */
  roland: {},
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
    /* Une piste qui nomme un break, un bruit, un clic, un glitch ou un LFO
       est synthetisee dans son.ts plutot que remplacee par un woodblock. */
    if (/BREAK|AMEN|BRUIT|NOISE|CLIC|CLICK|GLITCH|GRAIN|LFO|IMPULS|BOUCLE|LOOP|PAPIER|PAPER|ROBINET|TAP|PORTI|BED|SQUEAK|TAPE|BANDE|MACHINE/.test(etik)) {
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
