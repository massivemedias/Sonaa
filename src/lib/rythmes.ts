/* LE MOTIF RYTHMIQUE DE CHAQUE STYLE.

   Mika, le 30 octobre 2026, devant une affiche de rythme vue sur Instagram :
   « je veux la meme chose dans chaque style ». Chaque style recoit un motif
   d'une mesure (ou deux) : quelques pistes, chacune une rangee de pas, que la
   page dessine en cercle et en grille et qu'elle sait jouer.

   D'OU VIENNENT LES MOTIFS. Ils ont ete ecrits a partir de la section
   « Rythme » du cours de chaque style (src/data/cours.json), qui dit deja ou
   tombent le kick, la caisse et les charleys, et de la fourchette de tempo
   du corpus. Ce sont des motifs d'ecole, la forme la plus reconnaissable du
   style, pas le releve d'un morceau.

   LE FICHIER EST CHARGE A LA DEMANDE, a l'ouverture d'une page de style : il
   pese une centaine de kilo-octets et l'accueil n'en a pas besoin. */

/** La voix choisit le son du synthetiseur et rien d'autre. */
export type Voix =
  | 'kick' | 'snare' | 'clap' | 'rim' | 'hat' | 'openhat' | 'ride' | 'shaker'
  | 'perc' | 'conga' | 'bongo' | 'clave' | 'cowbell' | 'tom'
  | 'bass' | 'sub' | 'acid' | 'stab' | 'chord' | 'pad' | 'pluck' | 'vocal';

export const VOIX: readonly Voix[] = [
  'kick', 'snare', 'clap', 'rim', 'hat', 'openhat', 'ride', 'shaker',
  'perc', 'conga', 'bongo', 'clave', 'cowbell', 'tom',
  'bass', 'sub', 'acid', 'stab', 'chord', 'pad', 'pluck', 'vocal',
];

interface Bilingue {
  readonly fr: string;
  readonly en: string;
}

export interface Piste extends Bilingue {
  readonly voix: Voix;
  /** Un pas par case : 0 silence, 1 frappe douce, 2 frappe accentuee. */
  readonly pas: readonly (0 | 1 | 2)[];
}

export interface Motif {
  readonly id: string;
  readonly bpm: number;
  readonly mesure: string;
  readonly pas: 12 | 16 | 32;
  readonly pistes: readonly Piste[];
  readonly devise: Bilingue;
  readonly instruments: Bilingue;
  readonly resume: Bilingue;
  readonly racine: Bilingue;
}

let charge: Promise<Record<string, Motif>> | null = null;

/** Le motif d'un style, ou null s'il n'en a pas. */
export async function motifDuStyle(id: string): Promise<Motif | null> {
  charge ??= import('../data/rythmes.json').then((m) => m.default as unknown as Record<string, Motif>);
  try {
    return (await charge)[id] ?? null;
  } catch {
    charge = null;
    return null;
  }
}

/** Les defauts d'un motif, en clair ; une liste vide veut dire qu'il est bon.
    Lue par le test du fichier et par le script d'import. */
export function defautsDuMotif(m: Motif): string[] {
  const d: string[] = [];
  if (!Number.isInteger(m.bpm) || m.bpm < 40 || m.bpm > 300) d.push(`bpm ${m.bpm}`);
  if (![12, 16, 32].includes(m.pas)) d.push(`pas ${m.pas}`);
  if (!/^\d+\/\d+$/.test(m.mesure)) d.push(`mesure ${m.mesure}`);
  if (m.pistes.length < 2 || m.pistes.length > 5) d.push(`${m.pistes.length} pistes`);
  for (const p of m.pistes) {
    if (!VOIX.includes(p.voix)) d.push(`voix ${p.voix}`);
    if (p.pas.length !== m.pas) d.push(`${p.fr} : ${p.pas.length} pas au lieu de ${m.pas}`);
    if (p.pas.some((x) => x !== 0 && x !== 1 && x !== 2)) d.push(`${p.fr} : valeur hors 0, 1, 2`);
    if (!p.pas.some((x) => x > 0)) d.push(`${p.fr} : aucune frappe`);
    if (p.fr.length > 10 || p.en.length > 10) d.push(`nom trop long : ${p.fr} / ${p.en}`);
  }
  const textes = [m.devise, m.instruments, m.resume, m.racine].flatMap((b) => [b.fr, b.en]);
  if (textes.some((x) => !x || /[\u2013\u2014]/.test(x))) d.push('texte vide ou tiret long');
  if (m.instruments.fr.length > 28 || m.instruments.en.length > 28) d.push('instruments trop long');
  if (m.resume.fr.length > 44 || m.resume.en.length > 44) d.push('resume trop long');
  if (m.racine.fr.length > 70 || m.racine.en.length > 70) d.push('racine trop longue');
  return d;
}
