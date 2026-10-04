/* LA CAISSE DE DISQUES : les fichiers que le DJ glisse sur les platines.
 *
 * Mika, le 3 octobre 2026 : il veut que les gens mixent ce qu'ils veulent.
 * Les grands catalogues verrouillent leur son ; un fichier que l'on possede,
 * non. Chacun glisse ses MP3, WAV, AIFF ou FLAC : ils sont gardes dans le
 * navigateur (IndexedDB), sur cet appareil seulement, et ne partent jamais
 * sur internet. Pas de compte, pas de serveur, pas de droits a negocier.
 *
 * A l'entree, chaque fichier est lu une fois : ses tags (tags.ts), sa duree,
 * et son BPM quand le tag n'en dit rien (estimerBpm).
 *
 * LES DOSSIERS, depuis le 3 octobre 2026 : Mika range ses morceaux en
 * dossiers dans Fichiers, sur son iPhone. Chaque morceau porte le nom de
 * son dossier (vide s'il est en vrac) ; un dossier n'existe que par ses
 * morceaux, et la caisse est la meme pour les deux decks. */

import { estimerBpm } from './calculs.ts';
import type { Morceau } from './morceau.ts';
import { lireTags, titreDuNom } from './tags.ts';

const BASE = 'sonaa-caisse';
const MAGASIN = 'morceaux';
const CHANGEMENT = 'sonaa-caisse';
/* Decode en entier, un morceau de plus d'un quart d'heure pese trop lourd
   sur un telephone. */
export const DUREE_MAX_FICHIER = 15 * 60;

interface Entree {
  readonly id: string;
  readonly nom: string;
  readonly titre: string;
  readonly artiste: string;
  readonly genre: string;
  readonly label: string;
  readonly bpm: number | null;
  readonly tonalite: string | null;
  readonly duree: number;
  readonly pochette: Blob | null;
  readonly fichier: Blob;
  readonly ajout: number;
  /** Absent dans les entrees d'avant les dossiers : en vrac. */
  readonly dossier?: string;
}

let base: Promise<IDBDatabase> | null = null;
function ouvrir(): Promise<IDBDatabase> {
  base ??= new Promise((resolu, rejete) => {
    const r = indexedDB.open(BASE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(MAGASIN, { keyPath: 'id' });
    r.onsuccess = () => resolu(r.result);
    r.onerror = () => rejete(r.error ?? new Error('IndexedDB'));
  });
  return base;
}

function requete<T>(mode: IDBTransactionMode, faire: (m: IDBObjectStore) => IDBRequest): Promise<T> {
  return ouvrir().then(
    (b) =>
      new Promise<T>((resolu, rejete) => {
        const r = faire(b.transaction(MAGASIN, mode).objectStore(MAGASIN));
        r.onsuccess = () => resolu(r.result as T);
        r.onerror = () => rejete(r.error ?? new Error('IndexedDB'));
      })
  );
}

/* Une pochette garde la meme adresse tant que la page vit. */
const pochettes = new Map<string, string>();
function versMorceau(e: Entree): Morceau {
  let pochette = pochettes.get(e.id) ?? null;
  if (!pochette && e.pochette) {
    pochette = URL.createObjectURL(e.pochette);
    pochettes.set(e.id, pochette);
  }
  return {
    id: e.id,
    source: 'fichier',
    titre: e.titre,
    artiste: e.artiste,
    genre: e.genre,
    ...(e.label ? { label: e.label } : {}),
    bpm: e.bpm,
    tonalite: e.tonalite,
    duree: e.duree,
    pochette,
    lien: null,
    dossier: e.dossier ?? '',
  };
}

/** Les morceaux de la caisse, les derniers glisses en premier. */
export async function lireCaisse(): Promise<Morceau[]> {
  const toutes = await requete<Entree[]>('readonly', (m) => m.getAll());
  return toutes.sort((a, b) => b.ajout - a.ajout).map(versMorceau);
}

export async function fichierDe(id: string): Promise<Blob | null> {
  const e = await requete<Entree | undefined>('readonly', (m) => m.get(id));
  return e?.fichier ?? null;
}

export async function retirerDeCaisse(id: string): Promise<void> {
  await requete('readwrite', (m) => m.delete(id));
  const p = pochettes.get(id);
  if (p) URL.revokeObjectURL(p);
  pochettes.delete(id);
  window.dispatchEvent(new Event(CHANGEMENT));
}

/** Previent quand la caisse change ; rend de quoi arreter d'ecouter. */
export function ecouterCaisse(rappel: () => void): () => void {
  window.addEventListener(CHANGEMENT, rappel);
  return () => window.removeEventListener(CHANGEMENT, rappel);
}

/* Le meme fichier glisse deux fois est le meme morceau, avec ses cues. */
function empreinte(f: File): string {
  let h = 0x811c9dc5;
  for (const c of `${f.name}|${f.size}|${f.lastModified}`) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193);
  return `f${(h >>> 0).toString(16)}`;
}

export class FichierRefuse extends Error {
  constructor(readonly raison: 'illisible' | 'trop-long') {
    super(raison);
  }
}

/** Retire tous les morceaux d'un dossier. */
export async function retirerDossier(dossier: string): Promise<void> {
  const toutes = await requete<Entree[]>('readonly', (m) => m.getAll());
  for (const e of toutes) if ((e.dossier ?? '') === dossier) await retirerDeCaisse(e.id);
}

/* Un dossier contient aussi des pochettes, des textes, des fichiers caches
   du Mac : on ne garde que le son. */
const SON = /\.(mp3|wav|aiff?|flac|m4a|aac|ogg|opus)$/i;
export const estUnSon = (f: File): boolean => f.type.startsWith('audio/') || SON.test(f.name);

/** Lit un fichier, le range dans la caisse (dans `dossier`, ou en vrac) et
    rend son morceau. Deja la, il change seulement de dossier. */
export async function ajouterFichier(f: File, dossier = ''): Promise<Morceau> {
  const id = empreinte(f);
  const deja = await requete<Entree | undefined>('readonly', (m) => m.get(id));
  if (deja) {
    if (!dossier || deja.dossier === dossier) return versMorceau(deja);
    const range: Entree = { ...deja, dossier };
    await requete('readwrite', (m) => m.put(range));
    window.dispatchEvent(new Event(CHANGEMENT));
    return versMorceau(range);
  }

  const octets = await f.arrayBuffer();
  const tags = lireTags(octets);
  let son: AudioBuffer;
  try {
    son = await new OfflineAudioContext(1, 1, 22050).decodeAudioData(octets.slice(0));
  } catch {
    throw new FichierRefuse('illisible');
  }
  if (son.duration > DUREE_MAX_FICHIER) throw new FichierRefuse('trop-long');
  const nom = titreDuNom(f.name);
  const entree: Entree = {
    id,
    nom: f.name,
    titre: tags.titre ?? nom.titre,
    artiste: tags.artiste ?? nom.artiste,
    genre: tags.genre ?? '',
    label: tags.label ?? '',
    bpm: tags.bpm ?? estimerBpm(son.getChannelData(0), son.sampleRate),
    tonalite: tags.tonalite ?? null,
    duree: son.duration,
    pochette: tags.pochette ? new Blob([tags.pochette.octets.slice()], { type: tags.pochette.type }) : null,
    fichier: f,
    ajout: Date.now(),
    dossier,
  };
  await requete('readwrite', (m) => m.put(entree));
  window.dispatchEvent(new Event(CHANGEMENT));
  return versMorceau(entree);
}

export interface FichierRange {
  readonly fichier: File;
  readonly dossier: string;
}

/* UN DOSSIER LACHE SUR LA CAISSE (ordinateur) : le navigateur le donne comme
   une arborescence qu'on parcourt. Les entrees se lisent tout de suite, avant
   la premiere attente : apres, le depot n'est plus lisible. Les sous-dossiers
   se rangent sous le nom du dossier lache. */
export function fichiersDuDepot(objets: DataTransferItemList, dossierParDefaut: string): Promise<FichierRange[]> {
  const entrees = [...objets].map((o) => ({ entree: o.webkitGetAsEntry(), fichier: o.getAsFile() }));
  const lireDossier = async (d: FileSystemDirectoryEntry, nom: string): Promise<FichierRange[]> => {
    const lecteur = d.createReader();
    const tout: FileSystemEntry[] = [];
    for (;;) {
      const lot = await new Promise<FileSystemEntry[]>((resolu, rejete) => lecteur.readEntries(resolu, rejete));
      if (lot.length === 0) break;
      tout.push(...lot);
    }
    const listes = await Promise.all(
      tout.map(async (e): Promise<FichierRange[]> => {
        if (e.isDirectory) return lireDossier(e as FileSystemDirectoryEntry, nom);
        const f = await new Promise<File>((resolu, rejete) => (e as FileSystemFileEntry).file(resolu, rejete));
        return [{ fichier: f, dossier: nom }];
      })
    );
    return listes.flat();
  };
  return Promise.all(
    entrees.map(async ({ entree, fichier }): Promise<FichierRange[]> => {
      if (entree?.isDirectory) return lireDossier(entree as FileSystemDirectoryEntry, entree.name);
      return fichier ? [{ fichier, dossier: dossierParDefaut }] : [];
    })
  ).then((l) => l.flat().filter((x) => estUnSon(x.fichier)));
}

/** Le dossier d'un fichier choisi avec le selecteur de dossiers. */
export const dossierDuChemin = (f: File): string => (f.webkitRelativePath.split('/')[0] ?? '').trim();
