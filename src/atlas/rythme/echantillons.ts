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
  disco: 'linn', house: 'linn', roots: 'linn', downtempo: 'linn', breaks: 'linn', electro: 'linn',
  ambient: 'cr78',
};

export const kitDeFamille = (famille: string): Kit => KIT_DE_FAMILLE[famille] ?? 'roland';

const PAR_KIT: Record<Kit, Partial<Record<Voix, string>>> = {
  linn: {
    kick: 'lm2-kick', snare: 'lm2-snare', clap: 'lm2-clap', rim: 'lm2-stick', hat: 'lm2-hat', openhat: 'lm2-openhat',
    ride: 'lm2-ride', cowbell: 'lm2-cowbell', conga: 'lm2-conga', tom: 'lm2-tom', perc: 'lm2-tamb', shaker: 'lm2-cabasa',
  },
  roland: {
    snare: 'tr505-snare', clap: 'tr505-clap', rim: 'tr505-rim', hat: 'tr505-hat', openhat: 'tr505-openhat',
    ride: 'tr505-ride', cowbell: 'tr505-cowbell', tom: 'tr505-tom', perc: 'vcsl-woodblock',
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
export function fichierDe(voix: Voix, kit: Kit): string | null {
  return PAR_KIT[kit][voix] ?? COMMUNS[voix] ?? null;
}

/** Tous les fichiers dont un motif a besoin. */
export function fichiersDuMotif(motif: Motif, kit: Kit): string[] {
  const noms = new Set<string>();
  for (const p of motif.pistes) {
    const a = accordeDe(p);
    if (a) a.notes.forEach((n) => noms.add(n.nom));
    else {
      const f = fichierDe(p.voix, kit);
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
