/* LA CAISSE DE DISQUES : les fichiers que le DJ glisse sur les platines.
 *
 * Mika, le 3 octobre 2026 : il veut que les gens mixent ce qu'ils veulent.
 * Les grands catalogues verrouillent leur son ; un fichier que l'on possede,
 * non. Chacun glisse ses MP3, WAV, AIFF ou FLAC : ils sont gardes dans le
 * navigateur (IndexedDB), sur cet appareil seulement, et ne partent jamais
 * sur internet. Pas de compte, pas de serveur, pas de droits a negocier.
 *
 * A L'ENTREE, ON NE LIT QUE LES TAGS (tags.ts) : titre, artiste, BPM et
 * tonalite, quand rekordbox ou Serato les ont ecrits. La duree, et le BPM
 * quand le tag n'en dit rien (estimerBpm), demandent de decoder tout le
 * morceau : ils se calculent ensuite, en fond, un morceau a la fois, ou tout
 * de suite quand on charge un morceau qui ne l'est pas encore. Un dossier de
 * 1 800 morceaux entre ainsi en quelques secondes, au lieu d'une demi-heure.
 *
 * RIEN N'EST ENVOYE. Sur Safari et Firefox, tout est COPIE dans le
 * navigateur : avant un gros import, on dit combien il pese et s'il y a la
 * place (placeDisponible). SUR CHROME ET EDGE, UN DOSSIER EST RELIE, pas
 * copie (relierDossier, depuis le 3 octobre 2026, a la demande de Mika) : la
 * caisse ne garde que l'adresse de chaque fichier sur le disque, et le lit
 * la ou il est. Apres un rechargement, le navigateur redemande une fois
 * l'acces au dossier, au premier morceau qu'on charge.
 *
 * TROP GROS POUR ETRE COPIE, AILLEURS QUE SUR CHROME (Mika, 86,7 Go pour
 * 1,9 Go accordes) : le dossier se relie le temps de la visite. Les fichiers
 * restent en memoire, ou ils sont ; seuls leurs tags et leurs BPM sont
 * gardes. A la visite suivante, on glisse a nouveau le dossier, et chaque
 * morceau retrouve aussitot ses donnees et ses cues.
 *
 * LES DOSSIERS, depuis le 3 octobre 2026 : Mika range ses morceaux en
 * dossiers dans Fichiers, sur son iPhone. Chaque morceau porte le nom de
 * son dossier (vide s'il est en vrac) ; un dossier n'existe que par ses
 * morceaux, et la caisse est la meme pour les deux decks. */

import { estimerBpm } from './calculs.ts';
import type { Morceau } from './morceau.ts';
import { lireTags, tailleDesTags, titreDuNom } from './tags.ts';

const BASE = 'sonaa-caisse';
const MAGASIN = 'morceaux';
/* Les dossiers relies : leur poignee, par nom. C'est sur elle qu'on demande
   l'acces, une fois pour tous ses fichiers. */
const RACINES = 'racines';
const CHANGEMENT = 'sonaa-caisse';
/* Decode en entier, un fichier de plus de 200 Mo (un mix de deux heures)
   pese trop lourd sur un telephone : on le refuse a l'entree. */
const POIDS_MAX = 200 * 1024 * 1024;

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
  /** Le fichier copie dans le navigateur (Safari, Firefox, fichiers seuls). */
  readonly fichier?: Blob;
  /** Ou le fichier relie, lu sur le disque (Chrome, Edge). */
  readonly poignee?: FileSystemFileHandle;
  /** Le dossier relie qui le contient. */
  readonly racine?: string;
  /** Relie pour la visite seulement : le fichier n'est qu'en memoire. */
  readonly session?: boolean;
  readonly ajout: number;
  /** Absent dans les entrees d'avant les dossiers : en vrac. */
  readonly dossier?: string;
  /** Le decodage a echoue : le fichier ne se lit pas. */
  readonly illisible?: boolean;
}

let base: Promise<IDBDatabase> | null = null;
function ouvrir(): Promise<IDBDatabase> {
  base ??= new Promise((resolu, rejete) => {
    const r = indexedDB.open(BASE, 2);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(MAGASIN)) r.result.createObjectStore(MAGASIN, { keyPath: 'id' });
      if (!r.result.objectStoreNames.contains(RACINES)) r.result.createObjectStore(RACINES, { keyPath: 'nom' });
    };
    r.onsuccess = () => resolu(r.result);
    r.onerror = () => rejete(r.error ?? new Error('IndexedDB'));
  });
  return base;
}

function requete<T>(mode: IDBTransactionMode, faire: (m: IDBObjectStore) => IDBRequest, magasin = MAGASIN): Promise<T> {
  return ouvrir().then(
    (b) =>
      new Promise<T>((resolu, rejete) => {
        const r = faire(b.transaction(magasin, mode).objectStore(magasin));
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
    ...(e.illisible ? { illisible: true } : {}),
    ...(e.session && !enMemoire.has(e.id) && !e.fichier ? { aRelier: true } : {}),
  };
}

/* Les fichiers relies pour la visite : de simples references a ce qui est
   sur le disque, perdues a la fermeture de la page. */
const enMemoire = new Map<string, File>();

/** Les morceaux de la caisse, les derniers glisses en premier. */
export async function lireCaisse(): Promise<Morceau[]> {
  const toutes = await requete<Entree[]>('readonly', (m) => m.getAll());
  return toutes.sort((a, b) => b.ajout - a.ajout).map(versMorceau);
}

/* ═══ L'ACCES AUX FICHIERS RELIES ═══ Chrome rend l'acces a un dossier
   pour la visite ; a la suivante, il faut le redemander, et seulement
   pendant un geste de l'utilisateur. On le demande donc au chargement d'un
   morceau (un clic), sur le dossier entier ; les analyses en fond, elles,
   attendent qu'il soit accorde. */
interface Permissions {
  queryPermission(o: { mode: 'read' }): Promise<PermissionState>;
  requestPermission(o: { mode: 'read' }): Promise<PermissionState>;
}
const enAttente = new Set<string>();
async function autorise(h: FileSystemHandle, demander: boolean): Promise<boolean> {
  const p = h as unknown as Permissions;
  if ((await p.queryPermission({ mode: 'read' })) === 'granted') return true;
  return demander && (await p.requestPermission({ mode: 'read' })) === 'granted';
}

/** Le contenu d'une entree : copie, ou lu sur le disque s'il est relie et
    que l'acces est accorde (demande si `demander`). */
async function contenu(e: Entree, demander: boolean): Promise<Blob | null> {
  if (e.fichier) return e.fichier;
  const visite = enMemoire.get(e.id);
  if (visite) return visite;
  if (!e.poignee) return null;
  const racine = e.racine ? await requete<{ poignee: FileSystemDirectoryHandle } | undefined>('readonly', (m) => m.get(e.racine ?? ''), RACINES) : undefined;
  if (!(await autorise(racine?.poignee ?? e.poignee, demander))) return null;
  if (enAttente.size > 0) {
    enAttente.clear();
    void lancerAnalyses();
  }
  return e.poignee.getFile();
}

export async function fichierDe(id: string): Promise<Blob | null> {
  const e = await requete<Entree | undefined>('readonly', (m) => m.get(id));
  return e ? contenu(e, true) : null;
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
  constructor(readonly raison: 'trop-lourd') {
    super(raison);
  }
}

/** Retire tous les morceaux d'un dossier. */
export async function retirerDossier(dossier: string): Promise<void> {
  const toutes = await requete<Entree[]>('readonly', (m) => m.getAll());
  for (const e of toutes) if ((e.dossier ?? '') === dossier) await retirerDeCaisse(e.id);
  if (dossier) await requete('readwrite', (m) => m.delete(dossier), RACINES);
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

  if (f.size > POIDS_MAX) throw new FichierRefuse('trop-lourd');
  const entree = await entreeDe(f, id, dossier, { fichier: f });
  await requete('readwrite', (m) => m.put(entree));
  window.dispatchEvent(new Event(CHANGEMENT));
  void lancerAnalyses();
  return versMorceau(entree);
}

/* Une entree, d'apres les tags seulement : les dix premiers octets disent
   leur longueur, et on ne lit que celle-la (8 Mo au plus, une grande
   pochette comprise). */
async function entreeDe(f: File, id: string, dossier: string, ou: Pick<Entree, 'fichier' | 'poignee' | 'racine' | 'session'>): Promise<Entree> {
  const tete = new Uint8Array(await f.slice(0, 10).arrayBuffer());
  const longueur = Math.min(f.size, tailleDesTags(tete), 8 * 1024 * 1024);
  const tags = longueur > 0 ? lireTags(await f.slice(0, longueur).arrayBuffer()) : {};
  const nom = titreDuNom(f.name);
  return {
    id,
    nom: f.name,
    titre: tags.titre ?? nom.titre,
    artiste: tags.artiste ?? nom.artiste,
    genre: tags.genre ?? '',
    label: tags.label ?? '',
    bpm: tags.bpm ?? null,
    tonalite: tags.tonalite ?? null,
    duree: 0,
    pochette: tags.pochette ? new Blob([tags.pochette.octets.slice()], { type: tags.pochette.type }) : null,
    ...ou,
    ajout: Date.now(),
    dossier,
  };
}

/** Relie des fichiers pour la visite, sans les copier : leurs tags et leur
    BPM sont gardes, eux, pour la prochaine fois. */
export async function relierPourLaVisite(fichiers: readonly FichierRange[], progres: (fait: number, total: number) => void): Promise<number> {
  let relies = 0;
  for (let i = 0; i < fichiers.length; i += 1) {
    const x = fichiers[i];
    if (!x) continue;
    progres(i + 1, fichiers.length);
    if (x.fichier.size > POIDS_MAX) continue;
    try {
      const id = empreinte(x.fichier);
      enMemoire.set(id, x.fichier);
      const deja = await requete<Entree | undefined>('readonly', (m) => m.get(id));
      if (deja) {
        if (x.dossier && deja.dossier !== x.dossier) await requete('readwrite', (m) => m.put({ ...deja, dossier: x.dossier }));
        enAttente.delete(id);
      } else {
        const entree = await entreeDe(x.fichier, id, x.dossier, { session: true });
        await requete('readwrite', (m) => m.put(entree));
      }
      relies += 1;
      if (relies % 100 === 0) window.dispatchEvent(new Event(CHANGEMENT));
    } catch {
      /* un fichier illisible : on passe au suivant */
    }
  }
  window.dispatchEvent(new Event(CHANGEMENT));
  void lancerAnalyses();
  return relies;
}

/* ═══ RELIER UN DOSSIER (Chrome, Edge) ═══ Le navigateur rend une poignee
   sur le dossier ; on la garde, on parcourt ses sous-dossiers, et chaque
   son devient une entree qui ne porte que sa propre poignee. Rien n'est
   copie : 1 800 morceaux ne prennent que quelques kilo-octets. */
interface Selecteur {
  showDirectoryPicker?: (o?: { id?: string; mode?: 'read' }) => Promise<FileSystemDirectoryHandle>;
}
export const peutRelier = (): boolean => typeof (window as unknown as Selecteur).showDirectoryPicker === 'function';

/** Ouvre le selecteur de dossier ; rend le dossier et le nombre de
    morceaux relies, ou null si l'on a renonce. */
export async function relierDossier(progres: (fait: number, total: number) => void): Promise<{ nom: string; relies: number } | null> {
  const choisir = (window as unknown as Selecteur).showDirectoryPicker;
  if (!choisir) return null;
  let dossier: FileSystemDirectoryHandle;
  try {
    dossier = await choisir({ id: 'sonaa-caisse', mode: 'read' });
  } catch {
    return null;
  }
  return relier(dossier, progres);
}

type Contenu = AsyncIterable<FileSystemHandle>;
async function sonsDe(d: FileSystemDirectoryHandle): Promise<FileSystemFileHandle[]> {
  const sons: FileSystemFileHandle[] = [];
  for await (const h of (d as unknown as { values(): Contenu }).values()) {
    if (h.kind === 'directory') sons.push(...(await sonsDe(h as FileSystemDirectoryHandle)));
    else if (SON.test(h.name)) sons.push(h as FileSystemFileHandle);
  }
  return sons;
}

/** Relie un dossier deja choisi (par le selecteur, ou lache sur la page). */
export async function relier(dossier: FileSystemDirectoryHandle, progres: (fait: number, total: number) => void): Promise<{ nom: string; relies: number }> {
  await requete('readwrite', (m) => m.put({ nom: dossier.name, poignee: dossier }), RACINES);
  const sons = await sonsDe(dossier);
  let relies = 0;
  for (let i = 0; i < sons.length; i += 1) {
    const h = sons[i];
    if (!h) continue;
    progres(i + 1, sons.length);
    try {
      const f = await h.getFile();
      if (f.size > POIDS_MAX) continue;
      const id = empreinte(f);
      const deja = await requete<Entree | undefined>('readonly', (m) => m.get(id));
      const entree: Entree = deja
        ? { ...deja, dossier: dossier.name, poignee: h, racine: dossier.name }
        : await entreeDe(f, id, dossier.name, { poignee: h, racine: dossier.name });
      await requete('readwrite', (m) => m.put(entree));
      relies += 1;
      if (relies % 50 === 0) window.dispatchEvent(new Event(CHANGEMENT));
    } catch {
      /* un fichier illisible ou disparu : on passe au suivant */
    }
  }
  window.dispatchEvent(new Event(CHANGEMENT));
  void lancerAnalyses();
  return { nom: dossier.name, relies };
}

/* ═══ L'ANALYSE ═══ Decoder un morceau pour sa duree, et pour son BPM si
   le tag n'en donnait pas. A 22 050 Hz : assez pour entendre les coups,
   deux fois moins lourd. */
async function analyserEntree(e: Entree, demander = false): Promise<Entree> {
  const brut = await contenu(e, demander);
  if (!brut) {
    enAttente.add(e.id);
    return e;
  }
  let analyse: Entree;
  try {
    const son = await new OfflineAudioContext(1, 1, 22050).decodeAudioData(await brut.arrayBuffer());
    analyse = { ...e, duree: son.duration, bpm: e.bpm ?? estimerBpm(son.getChannelData(0), son.sampleRate) };
  } catch {
    analyse = { ...e, illisible: true };
  }
  await requete('readwrite', (m) => m.put(analyse));
  window.dispatchEvent(new Event(CHANGEMENT));
  return analyse;
}

/** Un morceau de la caisse, analyse s'il ne l'etait pas encore : celui
    qu'on va charger sur un deck n'attend pas son tour. */
export async function morceauAnalyse(id: string): Promise<Morceau | null> {
  const e = await requete<Entree | undefined>('readonly', (m) => m.get(id));
  if (!e) return null;
  return versMorceau(e.duree > 0 || e.illisible ? e : await analyserEntree(e, true));
}

/* LES ANALYSES EN FOND, une a la fois, tant que la page est visible : un
   dossier de 1 800 morceaux se range en quelques secondes, puis ses BPM
   arrivent au fil des minutes, sans bloquer le mix. */
let enCours = false;
export async function lancerAnalyses(): Promise<void> {
  if (enCours) return;
  enCours = true;
  try {
    /* La caisse se lit une fois par tour, pas une fois par morceau : sur dix
       mille morceaux, la relire a chaque fois couterait des minutes. Un tour
       de plus ne sert qu'aux morceaux entres entre-temps. */
    for (;;) {
      const toutes = await requete<Entree[]>('readonly', (m) => m.getAll());
      const aFaire = toutes.filter((e) => e.duree === 0 && !e.illisible && !enAttente.has(e.id)).sort((a, b) => b.ajout - a.ajout);
      if (aFaire.length === 0) break;
      for (const e of aFaire) {
        if (document.hidden) await new Promise<void>((r) => document.addEventListener('visibilitychange', () => r(), { once: true }));
        const fraiche = await requete<Entree | undefined>('readonly', (m) => m.get(e.id));
        if (!fraiche || fraiche.duree > 0 || fraiche.illisible) continue;
        const apres = await analyserEntree(fraiche);
        /* Une pause apres un vrai decodage seulement : un morceau a relier
           se saute aussitot. */
        if (apres !== fraiche) await new Promise((r) => window.setTimeout(r, 150));
      }
    }
  } finally {
    enCours = false;
  }
}

/* ═══ LA PLACE ═══ Ce que le navigateur accorde encore a la page, en
   octets ; null s'il ne le dit pas. On demande aussi que la caisse ne soit
   pas videe quand l'appareil manque de place. */
export async function placeDisponible(): Promise<number | null> {
  try {
    await navigator.storage?.persist?.();
    const e = await navigator.storage?.estimate?.();
    return e?.quota !== undefined ? e.quota - (e.usage ?? 0) : null;
  } catch {
    return null;
  }
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
