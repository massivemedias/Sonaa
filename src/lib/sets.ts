/* DEPOSER UN SET, ET LE RENDRE ECOUTABLE.

   ═══ CE QUE LE PLAN GRATUIT AUTORISE, MESURE AVANT D'ECRIRE ═══

   L'organisation Supabase est en plan gratuit et aucun bucket n'existait :
   le stockage n'avait jamais servi sur ce projet. Trois plafonds durs :

     50 Mo par fichier   -> environ 52 minutes en 128 kbps, 35 en 192 kbps
     1 Go au total       -> une vingtaine de sets
     5 Go de sortie/mois -> environ 100 ecoutes completes par mois

   Ces nombres ne sont pas une opinion, ils commandent l'interface : le
   formulaire dit la limite AVANT le choix du fichier, et refuse le fichier
   trop lourd en donnant sa taille reelle plutot qu'un « erreur ».

   ═══ POURQUOI TOUT PASSE PAR CE SEUL FICHIER ═══

   Le plafond de sortie est le vrai mur : 5 Go par mois, c'est cent ecoutes.
   Le jour ou il faudra en servir mille, l'hebergement du fichier changera
   (Cloudflare R2 offre 10 Go et une sortie gratuite). Rien d'autre ne doit
   changer ce jour-la. Les pages ne connaissent donc ni bucket, ni URL de
   stockage : elles appellent `urlAudio` et `deposerAudio`, et ces deux
   fonctions sont les seules a savoir ou vivent les octets.

   ═══ LA FORME D'ONDE, ET LE PIEGE DE MEMOIRE ═══

   Voir `calculerOnde`. C'est la partie la moins evidente du fichier. */

import { supabase } from './supabase.ts';

/** Plafond du plan gratuit, en octets. Ecrit AUSSI dans le bucket : celui-ci
    est la garde serveur, celui-la sert a le dire avant l'envoi. */
export const TAILLE_MAX = 50 * 1024 * 1024;
export const AVATAR_MAX = 2 * 1024 * 1024;

/** Formats que le bucket accepte. Une liste plus large ici que la-bas
    donnerait un refus serveur incomprehensible cote formulaire. */
export const FORMATS_AUDIO = [
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/wav',
  'audio/x-m4a',
];
export const FORMATS_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];

/** Nombre de barres de la forme d'onde. 800 barres a 2 px tiennent dans
    1600 px, soit plus large que tout ecran courant : on ne redessine jamais
    plus fin que ce que l'oeil distingue. Stockees en base64, cela fait
    environ 1,1 ko par set. */
export const BARRES = 800;

export interface SetDJ {
  readonly id: string;
  readonly titre: string;
  readonly description: string | null;
  readonly audio_path: string;
  readonly duree_s: number | null;
  readonly onde: string | null;
  readonly ecoutes: number;
  readonly created_at: string;
  readonly user_id: string;
  readonly publie?: boolean;
  readonly artiste_nom?: string | null;
  readonly artiste_avatar?: string | null;
}

export interface Artiste {
  readonly user_id: string;
  readonly nom: string;
  readonly avatar_path: string | null;
  readonly bio: string | null;
}

/* --- Ou vivent les octets. Les deux seules fonctions qui le savent. ------- */

const base = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');

export function urlAudio(chemin: string): string {
  return `${base}/storage/v1/object/public/sets/${chemin}`;
}

export function urlAvatar(chemin: string | null | undefined): string | null {
  return chemin ? `${base}/storage/v1/object/public/avatars/${chemin}` : null;
}

/* --- La forme d'onde ------------------------------------------------------ */

/** Reduit un fichier audio a `BARRES` valeurs de 0 a 255, encodees en base64.

    LE PIEGE, ET IL EST GROS. `decodeAudioData` rend du PCM decompresse. Un
    set de 50 minutes en stereo a 44 100 Hz fait
    50 x 60 x 44100 x 2 canaux x 4 octets = 1,06 Go en memoire vive. Sur un
    telephone, l'onglet meurt. J'ai failli l'ecrire ainsi.

    LA SORTIE : `decodeAudioData` RE-ECHANTILLONNE vers la frequence du
    contexte qui le decode. Un contexte hors-ligne a 8 000 Hz en mono ramene
    le meme set a 24 Mo, soit quarante-quatre fois moins, et c'est
    strictement suffisant : on ne cherche pas a restituer le son, seulement
    son enveloppe, et une enveloppe de 800 points n'a pas besoin de plus de
    huit mille mesures par seconde.

    Si le decodage echoue malgre tout, la fonction rend null et le depot
    continue. Un set sans dessin reste un set ecoutable ; refuser le depot
    parce que le dessin a rate serait perdre le fichier pour l'illustration. */
export async function calculerOnde(fichier: File): Promise<string | null> {
  try {
    const octets = await fichier.arrayBuffer();
    const Ctx: typeof OfflineAudioContext =
      window.OfflineAudioContext ??
      (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    if (!Ctx) return null;

    /* La longueur passee ici ne sert qu'a construire le contexte ; le tampon
       rendu par le decodage a sa propre longueur. Un echantillon suffit. */
    const ctx = new Ctx(1, 1, 8000);
    const tampon = await ctx.decodeAudioData(octets);
    const donnees = tampon.getChannelData(0);
    const parBarre = Math.floor(donnees.length / BARRES) || 1;

    const pics = new Uint8Array(BARRES);
    let maximum = 0;
    for (let i = 0; i < BARRES; i += 1) {
      const debut = i * parBarre;
      const fin = Math.min(debut + parBarre, donnees.length);
      /* LA VALEUR EFFICACE ET NON LE PIC. Le pic d'une tranche est atteint
         par un seul echantillon : un claquement isole donne une barre pleine
         au milieu d'un passage calme, et le dessin ment sur l'energie du
         morceau. La moyenne quadratique suit ce qu'on entend. */
      let somme = 0;
      for (let j = debut; j < fin; j += 1) {
        const v = donnees[j] ?? 0;
        somme += v * v;
      }
      const rms = Math.sqrt(somme / Math.max(1, fin - debut));
      pics[i] = Math.min(255, Math.round(rms * 255));
      if (pics[i]! > maximum) maximum = pics[i]!;
    }

    /* NORMALISER, parce qu'un set masterise bas donnerait une ligne plate
       sans que rien ne soit anormal. On compare les barres entre elles, pas
       a une reference absolue. */
    if (maximum > 0) {
      for (let i = 0; i < BARRES; i += 1) {
        pics[i] = Math.round(((pics[i] ?? 0) / maximum) * 255);
      }
    }

    let binaire = '';
    for (const o of pics) binaire += String.fromCharCode(o);
    return btoa(binaire);
  } catch {
    return null;
  }
}

/** Relit ce que `calculerOnde` a ecrit. Rend null sur une chaine abimee :
    le lecteur dessine alors une ligne neutre au lieu de casser la page. */
export function lireOnde(encode: string | null | undefined): Uint8Array | null {
  if (!encode) return null;
  try {
    const binaire = atob(encode);
    const out = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i += 1) out[i] = binaire.charCodeAt(i);
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/** Duree en secondes, lue par le navigateur sur le fichier choisi.

    Mesuree et non calculee depuis le debit : un fichier a debit variable,
    ce que produit tout encodeur moderne, rend une estimation fausse de
    plusieurs minutes sur un set d'une heure. */
export function mesurerDuree(fichier: File): Promise<number | null> {
  return new Promise((resoudre) => {
    const url = URL.createObjectURL(fichier);
    const audio = new Audio();
    const finir = (v: number | null): void => {
      URL.revokeObjectURL(url);
      resoudre(v);
    };
    audio.addEventListener('loadedmetadata', () => {
      finir(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null);
    });
    audio.addEventListener('error', () => finir(null));
    /* Un fichier illisible ne doit pas suspendre le depot indefiniment. */
    setTimeout(() => finir(null), 15000);
    audio.src = url;
  });
}

/* --- Les acces ------------------------------------------------------------ */

async function moi(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function monArtiste(): Promise<Artiste | null> {
  if (!supabase) return null;
  const id = await moi();
  if (!id) return null;
  const { data } = await supabase
    .from('artistes')
    .select('user_id, nom, avatar_path, bio')
    .eq('user_id', id)
    .maybeSingle();
  return (data as Artiste | null) ?? null;
}

export async function enregistrerArtiste(champs: {
  nom: string;
  bio?: string | null;
  avatar_path?: string | null;
}): Promise<void> {
  if (!supabase) throw new Error('base indisponible');
  const id = await moi();
  if (!id) throw new Error('non connecte');
  const { error } = await supabase
    .from('artistes')
    .upsert({ user_id: id, ...champs }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

/** Depose l'image de profil et rend son chemin.

    LE NOM PORTE UN HORODATAGE. Ecrire toujours « <compte>/avatar.jpg »
    aurait ete plus propre a lire, mais le fichier est servi publiquement
    donc mis en cache par le navigateur et par le reseau de diffusion :
    remplacer sa photo n'aurait rien change a l'ecran pendant des heures. Un
    nom neuf a chaque fois est une adresse neuve, donc visible tout de suite. */
export async function deposerAvatar(fichier: File): Promise<string> {
  if (!supabase) throw new Error('base indisponible');
  const id = await moi();
  if (!id) throw new Error('non connecte');
  if (fichier.size > AVATAR_MAX) throw new Error('image trop lourde');
  const ext = (fichier.name.split('.').pop() ?? 'jpg').toLowerCase().slice(0, 5);
  const chemin = `${id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(chemin, fichier, { contentType: fichier.type, upsert: false });
  if (error) throw new Error(error.message);
  return chemin;
}

export interface Progres {
  readonly envoye: number;
  readonly total: number;
}

/** Depose le fichier audio. Rend le chemin dans le bucket. */
export async function deposerAudio(fichier: File): Promise<string> {
  if (!supabase) throw new Error('base indisponible');
  const id = await moi();
  if (!id) throw new Error('non connecte');
  if (fichier.size > TAILLE_MAX) throw new Error('fichier trop lourd');
  /* Le nom d'origine peut contenir n'importe quoi : accents, espaces,
     barres obliques. Une barre oblique creerait un sous-dossier et ferait
     sortir le chemin du dossier du compte, ce que la politique refuserait
     avec un message obscur. On garde l'extension et rien d'autre. */
  const ext = (fichier.name.split('.').pop() ?? 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
  const chemin = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || 'mp3'}`;
  const { error } = await supabase.storage
    .from('sets')
    .upload(chemin, fichier, { contentType: fichier.type, upsert: false });
  if (error) throw new Error(error.message);
  return chemin;
}

export async function creerSet(champs: {
  titre: string;
  description?: string | null;
  audio_path: string;
  duree_s?: number | null;
  taille_o?: number | null;
  onde?: string | null;
  publie: boolean;
}): Promise<string> {
  if (!supabase) throw new Error('base indisponible');
  const id = await moi();
  if (!id) throw new Error('non connecte');
  const { data, error } = await supabase
    .from('dj_sets')
    .insert({ user_id: id, ...champs })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function mesSets(): Promise<SetDJ[]> {
  if (!supabase) return [];
  const id = await moi();
  if (!id) return [];
  const { data } = await supabase
    .from('dj_sets')
    .select('id, titre, description, audio_path, duree_s, onde, ecoutes, created_at, user_id, publie')
    .eq('user_id', id)
    .order('created_at', { ascending: false });
  return (data as SetDJ[] | null) ?? [];
}

export async function setsPublics(): Promise<SetDJ[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('sets_publics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  return (data as SetDJ[] | null) ?? [];
}

export async function unSetPublic(id: string): Promise<SetDJ | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('sets_publics').select('*').eq('id', id).maybeSingle();
  return (data as SetDJ | null) ?? null;
}

export async function basculerPublication(id: string, publie: boolean): Promise<void> {
  if (!supabase) throw new Error('base indisponible');
  const { error } = await supabase.from('dj_sets').update({ publie }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Supprime la ligne ET le fichier. L'ordre compte : la ligne d'abord.

    Si le fichier partait en premier et que la suppression de la ligne
    echouait, la page afficherait un set dont l'audio est introuvable, et
    plus rien dans l'interface ne permettrait de s'en debarrasser. Dans
    l'autre sens, le pire cas est un fichier orphelin qui occupe de la place
    sans que personne ne le voie : c'est une facture, pas une panne. */
export async function supprimerSet(id: string, chemin: string): Promise<void> {
  if (!supabase) throw new Error('base indisponible');
  const { error } = await supabase.from('dj_sets').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await supabase.storage.from('sets').remove([chemin]);
}

/** Compte une ecoute. Silencieux : un compteur qui echoue n'est pas une
    panne, et surtout ne doit pas interrompre la lecture. */
export async function compterEcoute(id: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.rpc('compter_ecoute', { set_id: id });
  } catch {
    /* rien */
  }
}

export function mmss(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}
