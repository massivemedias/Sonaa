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
  | 'perc' | 'conga' | 'bongo' | 'clave' | 'cowbell' | 'tom' | 'metal'
  | 'bass' | 'sub' | 'reese' | 'logdrum' | 'acid'
  | 'stab' | 'chord' | 'rhodes' | 'piano' | 'strings' | 'organ' | 'pad'
  | 'pluck' | 'arp' | 'lead' | 'hoover' | 'vocal';

export const VOIX: readonly Voix[] = [
  'kick', 'snare', 'clap', 'rim', 'hat', 'openhat', 'ride', 'shaker',
  'perc', 'conga', 'bongo', 'clave', 'cowbell', 'tom', 'metal',
  'bass', 'sub', 'reese', 'logdrum', 'acid',
  'stab', 'chord', 'rhodes', 'piano', 'strings', 'organ', 'pad',
  'pluck', 'arp', 'lead', 'hoover', 'vocal',
];

/** Les voix qui jouent des hauteurs une a une : leur piste porte `notes`. */
export const VOIX_MELODIQUES: readonly Voix[] = ['bass', 'sub', 'reese', 'logdrum', 'acid', 'pluck', 'arp', 'lead', 'hoover', 'vocal'];
/** Les voix qui jouent l'accord de la mesure en cours. */
export const VOIX_D_ACCORD: readonly Voix[] = ['stab', 'chord', 'rhodes', 'piano', 'strings', 'organ', 'pad'];

export type Gamme = 'mineure' | 'majeure' | 'dorienne' | 'phrygienne' | 'harmonique' | 'pentatonique' | 'blues' | 'hirajoshi' | 'chromatique';
export const GAMMES_CONNUES: readonly Gamme[] = ['mineure', 'majeure', 'dorienne', 'phrygienne', 'harmonique', 'pentatonique', 'blues', 'hirajoshi', 'chromatique'];

export interface Accord {
  /** Le degre de la gamme sur lequel l'accord est bati, 1 a 7. */
  readonly degre: number;
  readonly couleur: 'triade' | '7' | '9' | 'sus' | 'quinte';
}

interface Bilingue {
  readonly fr: string;
  readonly en: string;
}

export interface Piste extends Bilingue {
  readonly voix: Voix;
  /** Un pas par case : 0 silence, 1 frappe douce, 2 frappe accentuee. */
  readonly pas: readonly (0 | 1 | 2)[];
  /** Pour une voix melodique, le degre joue a chaque frappe (0 au silence). */
  readonly notes?: readonly number[];
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
  /** La musique (ADR-113, seconde passe) : tonalite affichee, gamme, accords
      qui tournent une mesure chacun, et le caractere du son. */
  readonly tonalite?: string;
  readonly tonique?: string;
  readonly gamme?: Gamme;
  readonly accords?: readonly Accord[];
  /** Le retard des doubles croches paires, en fraction de pas : 0 a 0,3. */
  readonly swing?: number;
  /** La reverberation et l'echo, de 0 a 1. */
  readonly espace?: number;
  /** La saturation, de 0 a 1. */
  readonly grain?: number;
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
    const melodique = VOIX_MELODIQUES.includes(p.voix);
    if (m.gamme && melodique && !p.notes) d.push(`${p.fr} : notes manquantes`);
    if (p.notes && !melodique) d.push(`${p.fr} : notes sur une voix sans hauteur`);
    if (p.notes && (p.notes.length !== p.pas.length || p.notes.some((n, i) => (n === 0) !== ((p.pas[i] ?? 0) === 0) || n < 0 || n > 21)))
      d.push(`${p.fr} : notes mal alignees sur les pas`);
  }
  if (m.gamme !== undefined) {
    if (!GAMMES_CONNUES.includes(m.gamme)) d.push(`gamme ${m.gamme}`);
    if (!m.tonalite || !/^[A-G][#b]?m?$/.test(m.tonalite)) d.push(`tonalite ${m.tonalite}`);
    if (!m.accords?.length || m.accords.length > 4 || m.accords.some((a) => a.degre < 1 || a.degre > 7 || !['triade', '7', '9', 'sus', 'quinte'].includes(a.couleur)))
      d.push('accords');
    for (const [nom, v, max] of [['swing', m.swing, 0.3], ['espace', m.espace, 1], ['grain', m.grain, 1]] as const)
      if (v === undefined || v < 0 || v > max) d.push(`${nom} ${v}`);
  }
  const textes = [m.devise, m.instruments, m.resume, m.racine].flatMap((b) => [b.fr, b.en]);
  if (textes.some((x) => !x || /[\u2013\u2014]/.test(x))) d.push('texte vide ou tiret long');
  if (m.instruments.fr.length > 28 || m.instruments.en.length > 28) d.push('instruments trop long');
  if (m.resume.fr.length > 44 || m.resume.en.length > 44) d.push('resume trop long');
  if (m.racine.fr.length > 70 || m.racine.en.length > 70) d.push('racine trop longue');
  return d;
}
