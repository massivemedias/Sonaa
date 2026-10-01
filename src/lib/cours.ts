/* LES COURS « PRODUIRE CE STYLE », UN PAR GENRE.
 *
 * Mika, le 14 septembre 2026 : « un bouton pour lire des cours sur la
 * musique quand on clique sur un style ». Les textes sont ecrits en francais
 * pour SONAA, a partir du livre que Mika a scanne (The Secrets of Techno
 * Production, Attack Magazine) pour les genres qu'il couvre, et de sources
 * publiques pour les autres. Ce sont des reformulations, jamais des
 * copies : le livre est cite en source, pas reproduit.
 *
 * LE FICHIER EST CHARGE A LA DEMANDE. 219 cours font plusieurs centaines de
 * kilo-octets ; ils ne pesent sur personne tant qu'on n'ouvre pas le
 * bouton. La liste des identifiants, elle, est minuscule et embarquee : c'est
 * elle qui dit si le bouton doit exister. */

import IDS from '../data/cours-ids.json';

export interface Cours {
  readonly tempo: string;
  readonly rythme: string;
  readonly basse: string;
  readonly sons: string;
  readonly arrangement: string;
  readonly mix: string;
  readonly etapes: readonly string[];
  readonly reperes: readonly string[];
  readonly sources: readonly string[];
  /** Les outils les plus utilises pour ce style, du plus determinant au plus accessoire. */
  readonly outils?: readonly { nom: string; type: 'machine' | 'plugin' | 'daw' | 'samples' | 'materiel'; pourquoi: string }[];
  readonly sourcesOutils?: readonly string[];
}

const DISPONIBLES: ReadonlySet<string> = new Set(IDS as string[]);

export function aUnCours(genreId: string): boolean {
  return DISPONIBLES.has(genreId);
}

let chargement: Promise<Record<string, Cours>> | null = null;

export function coursDuGenre(genreId: string): Promise<Cours | null> {
  chargement ??= import('../data/cours.json').then((m) => (m.default ?? m) as Record<string, Cours>);
  return chargement.then((tous) => tous[genreId] ?? null);
}

/* ═══ CE QUE LE COURS MONTRE AU LIEU DE LE DIRE ═══
 *
 * Mika, le 1er octobre 2026 : « Produire ce style, c'est pas attrayant du
 * tout, faut mettre des images de machines, des exemples, des schemas ».
 * Trois choses se lisent donc dans le cours lui-meme et se dessinent : le
 * tempo, sur une regle ; la batterie, sur une grille de seize pas qu'on peut
 * ecouter ; les machines, en photo. Rien n'est ajoute au texte : tout ce qui
 * est dessine y est ecrit. */

/** Une piste de la grille : l'instrument et ses pas, « X » accentue, « x »
    joue, « . » fantome, « - » silence. Seize pas par mesure, une ou deux
    mesures. */
export interface PisteDeMotif {
  readonly id: 'kick' | 'caisse' | 'clap' | 'rim' | 'charley' | 'charleyOuvert' | 'ride' | 'perc';
  readonly pas: string;
}

/* LES GRILLES ONT ETE LUES DANS LES COURS, le 1er octobre 2026 : la
   rythmique et les etapes disent ou tombe chaque coup (« kick sur 1 et
   « et » du 3 »). Un cours qui ne place rien (ambient, drone, rythme libre)
   n'a pas de grille, et c'est voulu : une grille inventee serait un faux
   schema.

   ELLES ONT ETE RELUES LE MEME JOUR, chacune contre son texte, par un
   second lecteur : 8 corrigees (une caisse oubliee, des fantomes poses sans
   raison, des croches ouvertes lues fermees), 13 ajoutees la ou le texte
   placait les coups. UNE REGLE EN EST SORTIE : pas de grille sans kick.
   Seize cours de techno, de house, de trance et de psy decrivent le son du
   kick sans ecrire sa place ; il y est pose en quatre temps, la regle de
   ces familles, quand le texte dit « kick droit » ou ne dit rien d'autre.
   Le trip-hop et la coldwave, dont le kick n'est ni en quatre temps ni
   place, n'ont plus de grille. 185 cours sur 219 en ont une. */
let motifs: Promise<Record<string, readonly PisteDeMotif[]>> | null = null;

export function motifDuGenre(genreId: string): Promise<readonly PisteDeMotif[] | null> {
  motifs ??= import('../data/motifs-cours.json').then(
    (m) => (m.default ?? m) as unknown as Record<string, readonly PisteDeMotif[]>
  );
  return motifs.then((tous) => tous[genreId] ?? null);
}

/** Le tempo que le cours annonce, en BPM : une plage, ou deux fois le meme
    nombre. Nul quand le cours dit d'emblee qu'il n'y a pas de tempo
    (ambient, drone) : on ne dessine pas une regle pour un temps libre. */
export function tempoDuCours(texte: string): readonly [number, number] | null {
  const premiere = texte.split(/[.:]/)[0] ?? '';
  if (/pas de tempo|aucun tempo|temps libre/i.test(premiere)) return null;
  const plage =
    /(\d{2,3})\s*(?:à|et|-)\s*(\d{2,3})\s*BPM/i.exec(texte) ?? /(\d{2,3})\s*BPM[^.]{0,60}?\sà\s*(\d{2,3})\b/i.exec(texte);
  if (plage) {
    const a = Number(plage[1]);
    const b = Number(plage[2]);
    if (a >= 40 && b <= 400 && a < b) return [a, b];
  }
  const seul = /(\d{2,3})\s*BPM/i.exec(texte);
  if (seul) {
    const n = Number(seul[1]);
    if (n >= 40 && n <= 400) return [n, n];
  }
  return null;
}

/* LE NOM D'UN OUTIL DU COURS ET CELUI D'UNE PHOTO DU CATALOGUE ne s'ecrivent
   pas pareil : « Moog Minimoog Model D » contre « Minimoog », « Akai
   MPC2000XL » contre « Akai MPC2000 ». On les compare en jetons, lettres et
   chiffres separes, et une photo va a l'outil si tous ses jetons s'y
   suivent. La plus precise gagne. « Roland TR-8 » ne prend donc pas la photo
   d'une TR-808 : « 8 » et « 808 » sont deux jetons differents. */
const jetons = (s: string): string[] =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export function photoDeMachine(nom: string, cles: readonly string[]): string | null {
  const dans = jetons(nom);
  let meilleure: string | null = null;
  let longueur = 0;
  for (const cle of cles) {
    const j = jetons(cle);
    if (j.length === 0 || j.length <= longueur) continue;
    for (let i = 0; i + j.length <= dans.length; i += 1) {
      if (j.every((x, k) => dans[i + k] === x)) {
        meilleure = cle;
        longueur = j.length;
        break;
      }
    }
  }
  return meilleure;
}
