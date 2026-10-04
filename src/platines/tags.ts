/* LES TAGS D'UN FICHIER AUDIO : titre, artiste, label, BPM, tonalite et
 * pochette, tels que le DJ les a ranges dans son MP3 (ID3, versions 2.2 a
 * 2.4). Rekordbox, Serato et Mixed In Key ecrivent tous ici le BPM (TBPM)
 * et la tonalite (TKEY) : quand ils y sont, on n'a rien a deviner.
 *
 * Pour un fichier sans tags (un WAV, un AIFF), le nom du fichier sert :
 * « Artiste - Titre.wav » est la convention de presque tous les DJ. */

export interface Tags {
  readonly titre?: string;
  readonly artiste?: string;
  readonly genre?: string;
  readonly label?: string;
  readonly bpm?: number;
  readonly tonalite?: string;
  readonly pochette?: { readonly type: string; readonly octets: Uint8Array };
}

const syncsafe = (o: Uint8Array, i: number): number =>
  ((o[i] ?? 0) << 21) | ((o[i + 1] ?? 0) << 14) | ((o[i + 2] ?? 0) << 7) | (o[i + 3] ?? 0);
const entier = (o: Uint8Array, i: number, n: number): number => {
  let v = 0;
  for (let k = 0; k < n; k += 1) v = v * 256 + (o[i + k] ?? 0);
  return v;
};

/* Les quatre encodages du texte ID3 : latin-1, UTF-16 avec sa marque,
   UTF-16 gros-boutiste, UTF-8. */
function texte(o: Uint8Array, encodage: number): string {
  let t: string;
  if (encodage === 1) {
    const grosBout = o[0] === 0xfe && o[1] === 0xff;
    t = new TextDecoder(grosBout ? 'utf-16be' : 'utf-16le').decode(o);
  } else if (encodage === 2) t = new TextDecoder('utf-16be').decode(o);
  else if (encodage === 3) t = new TextDecoder('utf-8').decode(o);
  else t = new TextDecoder('latin1').decode(o);
  /* Plusieurs valeurs sont separees par un nul : on garde la premiere. */
  return (t.replace(/^﻿/, '').split('\u0000')[0] ?? '').trim();
}

/* La fin d'une chaine terminee par un nul (deux nuls alignes en UTF-16). */
function finDeChaine(o: Uint8Array, debut: number, large: boolean): number {
  if (!large) {
    const i = o.indexOf(0, debut);
    return i < 0 ? o.length : i;
  }
  for (let i = debut; i + 1 < o.length; i += 2) if (o[i] === 0 && o[i + 1] === 0) return i;
  return o.length;
}

function image(o: Uint8Array, v22: boolean): Tags['pochette'] {
  const encodage = o[0] ?? 0;
  let i = 1;
  let type: string;
  if (v22) {
    const format = new TextDecoder('latin1').decode(o.subarray(1, 4)).toLowerCase();
    type = format === 'png' ? 'image/png' : 'image/jpeg';
    i = 4;
  } else {
    const fin = finDeChaine(o, 1, false);
    type = new TextDecoder('latin1').decode(o.subarray(1, fin)) || 'image/jpeg';
    if (!type.includes('/')) type = `image/${type.toLowerCase()}`;
    i = fin + 1;
  }
  i += 1;
  const large = encodage === 1 || encodage === 2;
  i = finDeChaine(o, i, large) + (large ? 2 : 1);
  const octets = o.subarray(i);
  return octets.length > 0 ? { type, octets } : undefined;
}

const CHAMPS: Readonly<Record<string, keyof Omit<Tags, 'pochette'>>> = {
  TIT2: 'titre',
  TT2: 'titre',
  TPE1: 'artiste',
  TP1: 'artiste',
  TCON: 'genre',
  TCO: 'genre',
  TPUB: 'label',
  TPB: 'label',
  TBPM: 'bpm',
  TBP: 'bpm',
  TKEY: 'tonalite',
  TKE: 'tonalite',
};

/** La longueur des tags en tete d'un fichier, d'apres ses dix premiers
    octets : zero s'il n'en a pas. Elle permet de ne lire que les tags d'un
    fichier de 10 Mo, et non le fichier entier. */
export function tailleDesTags(debut: Uint8Array): number {
  if (debut[0] !== 0x49 || debut[1] !== 0x44 || debut[2] !== 0x33) return 0;
  return 10 + syncsafe(debut, 6);
}

export function lireTags(fichier: ArrayBuffer): Tags {
  const o = new Uint8Array(fichier);
  if (o[0] !== 0x49 || o[1] !== 0x44 || o[2] !== 0x33) return {};
  const version = o[3] ?? 0;
  const drapeaux = o[5] ?? 0;
  const fin = Math.min(o.length, 10 + syncsafe(o, 6));
  const v22 = version === 2;
  let i = 10;
  if (drapeaux & 0x40 && !v22) i += version === 4 ? syncsafe(o, 10) : 4 + entier(o, 10, 4);
  const lu: Record<string, unknown> = {};
  while (i + (v22 ? 6 : 10) <= fin) {
    const idLongueur = v22 ? 3 : 4;
    const id = new TextDecoder('latin1').decode(o.subarray(i, i + idLongueur));
    if (!/^[A-Z0-9]+$/.test(id)) break;
    const taille = v22 ? entier(o, i + 3, 3) : version === 4 ? syncsafe(o, i + 4) : entier(o, i + 4, 4);
    const debut = i + (v22 ? 6 : 10);
    if (taille <= 0 || debut + taille > fin) break;
    const corps = o.subarray(debut, debut + taille);
    const champ = CHAMPS[id];
    if (champ && lu[champ] === undefined) {
      const valeur = texte(corps.subarray(1), corps[0] ?? 0);
      if (champ === 'bpm') {
        const n = Number.parseFloat(valeur.replace(',', '.'));
        if (n > 40 && n < 260) lu.bpm = Math.round(n * 10) / 10;
      } else if (champ === 'genre') {
        /* Les vieux genres numerotes, « (18) », ne disent rien d'utile. */
        const propre = valeur.replace(/^\(\d+\)\s*/, '');
        if (propre && !/^\d+$/.test(propre)) lu.genre = propre;
      } else if (valeur) lu[champ] = valeur;
    } else if ((id === 'APIC' || id === 'PIC') && lu.pochette === undefined) {
      const p = image(corps, v22);
      if (p) lu.pochette = p;
    }
    i = debut + taille;
  }
  return lu as Tags;
}

/** « Artiste - Titre (Original Mix).mp3 » : l'artiste et le titre. */
export function titreDuNom(nom: string): { titre: string; artiste: string } {
  const sans = nom.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_/g, ' ').trim();
  const morceaux = sans.split(/\s+-\s+/);
  if (morceaux.length >= 2) {
    /* Un numero de piste devant (« 01 », « 3. ») s'en va ; « 808 State »
       reste entier. */
    const artiste = (morceaux[0] ?? '').replace(/^(?:\d{1,3}\s*[.)]\s*|\d{2}\s+)/, '').trim();
    return { artiste, titre: morceaux.slice(1).join(' - ').trim() };
  }
  return { titre: sans, artiste: '' };
}
