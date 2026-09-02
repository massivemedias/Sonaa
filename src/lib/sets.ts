/* DEPOSER UN SET, ET LE RENDRE ECOUTABLE.

   ═══ LES SETS SONT SUR CLOUDFLARE R2, PLUS SUR SUPABASE ═══

   Supabase gardait le stockage des fichiers, et son plan gratuit refusait
   tout objet au-dessus de 50 Mo. Mesure faite a l'epoque : le bucket porte a
   500 Mo, un envoi de 60 Mo refuse quand meme avec 413. Ce n'etait pas un
   reglage, et un set d'une heure sans perte pese 300 a 600 Mo. La demande
   etait « aucune perte » : il fallait donc changer d'hebergement, pas
   reencoder.

   R2 n'a pas de plafond utile par objet, offre 10 Go gratuits, et surtout ne
   facture PAS la sortie. Le vrai mur precedent n'etait pas la taille mais les
   5 Go de sortie mensuels, soit une centaine d'ecoutes. Il n'existe plus.

   Ce qui reste sur Supabase : les comptes, les lignes de sets, et les photos
   de profil, qui font 2 Mo et n'ont aucune raison de demenager.

   ═══ POURQUOI L'ENVOI EST DECOUPE ═══

   Le plan Cloudflare gratuit refuse toute requete dont le corps depasse
   100 Mo. Verifie : 151 Mo d'un seul tenant renvoient 413, avant meme
   d'atteindre le Worker. Le fichier part donc en tranches de 40 Mo que R2
   assemble. Verifie de bout en bout sur un WAV de 151 Mo : quatre tranches,
   assemblage a l'octet pres, et l'empreinte du fichier recupere est
   identique a celle du fichier envoye.

   ═══ POURQUOI TOUT PASSE PAR CE SEUL FICHIER ═══

   Un jour Mika voudra servir ses sets depuis sa propre machine et son propre
   disque. Ce jour-la, seules les fonctions de ce fichier changeront : les
   pages ne connaissent ni bucket, ni Worker, ni URL de stockage.

   ═══ LA FORME D'ONDE, ET LE PIEGE DE MEMOIRE ═══

   Voir `calculerOnde`. C'est la partie la moins evidente du fichier. */

import { supabase } from './supabase.ts';

/* LE PLAFOND N'EST PLUS TECHNIQUE, IL EST BUDGETAIRE.

   R2 accepte des objets jusqu'a 5 To : plus rien n'empeche un set d'une
   heure. Ce qui reste borne, c'est le total gratuit, 10 Go. A 1 Go par set
   cela fait dix sets, a 400 Mo une vingtaine.

   Bornee a 2 Go par fichier : Mika a bute sur 1,2 Go des le premier vrai set,
   et un WAV de trois heures pese autant. Au-dela de 10 Go de total, R2 facture
   1,5 cent par gigaoctet et par mois, soit une quinzaine de cents pour dix
   sets de plus. Le plafond n'est donc plus la pour proteger une facture mais
   pour attraper le fichier depose par erreur. */
export const TAILLE_MAX = 2 * 1024 * 1024 * 1024;

/** Taille d'une tranche d'envoi. Sous les 100 Mo que Cloudflare accepte par
    requete, avec de la marge pour les entetes. */
export const TRANCHE = 40 * 1024 * 1024;

/** L'adresse de la passerelle. Le seul endroit du site qui la connaisse. */
const PASSERELLE = 'https://sonaa-sets.massivemedias.workers.dev';
export const AVATAR_MAX = 2 * 1024 * 1024;

/* LES FORMATS, ET POURQUOI ON VERIFIE L'EXTENSION ET NON LE TYPE DECLARE.

   Le navigateur ne sait pas toujours nommer un fichier sans perte. Mesure :
   Chrome rend une chaine VIDE pour un FLAC et pour un AIFF, Firefox rend
   « application/octet-stream ». Refuser sur le type declare aurait donc
   refuse des fichiers parfaitement valides, avec un message incomprehensible
   pour qui vient de glisser son master.

   L'extension, elle, est toujours la. C'est donc elle qui decide, et le
   bucket accepte les types generiques pour ne pas refuser derriere. */
/* AIFF ET ALAC SONT ECARTES, ET C'EST MESURE, PAS SUPPOSE.

   `canPlayType` interroge dans ce navigateur : « probably » pour FLAC,
   « maybe » pour WAV, CHAINE VIDE pour AIFF. Chromium et Firefox ne lisent
   pas l'AIFF, et l'ALAC n'est lu que par Safari.

   Les accepter aurait produit des sets MUETS pour la plupart des auditeurs,
   sans qu'aucun message n'apparaisse : le depot reussit, la page s'affiche,
   et il ne se passe rien quand on appuie sur lecture. Un refus au moment du
   choix, avec le chemin de sortie, vaut mieux qu'un fichier en ligne qui ne
   joue nulle part. Le FLAC est sans perte lui aussi, plus petit, et lu
   partout : la conversion ne coute rien et ne perd rien. */
export const EXTENSIONS_SANS_PERTE = ['flac', 'wav'] as const;
export const EXTENSIONS_SANS_PERTE_ILLISIBLES = ['aif', 'aiff', 'alac'] as const;
export const EXTENSIONS_AVEC_PERTE = ['mp3', 'm4a', 'aac', 'ogg', 'oga', 'opus'] as const;
export const EXTENSIONS_AUDIO = [...EXTENSIONS_SANS_PERTE, ...EXTENSIONS_AVEC_PERTE];

/** Ce que le champ de fichier propose. Les types ET les extensions : sur les
    formats sans perte, le type seul ne suffit a aucun navigateur. */
export const FORMATS_AUDIO = [
  'audio/*',
  ...EXTENSIONS_AUDIO.map((e) => `.${e}`),
];

const extensionDe = (nom: string): string =>
  (nom.split('.').pop() ?? '').toLowerCase();

export const estSansPerte = (nom: string): boolean =>
  (EXTENSIONS_SANS_PERTE as readonly string[]).includes(extensionDe(nom));

export const estAudioAccepte = (nom: string): boolean =>
  EXTENSIONS_AUDIO.includes(extensionDe(nom) as (typeof EXTENSIONS_AUDIO)[number]);

/** Sans perte, mais qu'aucun navigateur courant ne lit. On le dit au lieu de
    laisser deposer un fichier qui restera silencieux. */
export const estSansPerteIllisible = (nom: string): boolean =>
  (EXTENSIONS_SANS_PERTE_ILLISIBLES as readonly string[]).includes(extensionDe(nom));

/* CE QU'UN FICHIER SANS PERTE PESE VRAIMENT, mesure et non estime.

   Encodage d'une minute de signal a 44,1 kHz 16 bits stereo, avec ffmpeg :

     WAV et AIFF, non compresses         10,09 Mo par minute, toujours
     FLAC sur un signal tonal             3,02 Mo par minute   (cas favorable)
     FLAC sur un master bruite            3,87 Mo par minute
     FLAC sur du stereo decorrele         9,87 Mo par minute   (pire cas)

   La musique de club reelle tombe entre les deux extremes, autour de 5 a
   6 Mo par minute. Ces nombres servent a DIRE a l'avance combien de minutes
   tiennent, plutot qu'a laisser quelqu'un attendre un envoi qui sera refuse. */
export const MO_PAR_MINUTE_WAV = 10.09;
export const MO_PAR_MINUTE_FLAC = 5.5;
export const FORMATS_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];

/** Nombre de barres de la forme d'onde. 800 barres a 2 px tiennent dans
    1600 px, soit plus large que tout ecran courant : on ne redessine jamais
    plus fin que ce que l'oeil distingue. Stockees en base64, cela fait
    environ 1,1 ko par set. */
export const BARRES = 800;

/** Nombre de styles qu'un set peut revendiquer. Au-dela, il apparaitrait
    partout et ne dirait rien nulle part. */
export const GENRES_MAX = 5;

export interface SetDJ {
  readonly id: string;
  readonly titre: string;
  readonly description: string | null;
  readonly audio_path: string;
  readonly cover_path: string | null;
  readonly duree_s: number | null;
  readonly onde: string | null;
  readonly ecoutes: number;
  readonly created_at: string;
  readonly user_id: string;
  readonly genre_ids: string[] | null;
  readonly publie?: boolean;
  readonly artiste_nom?: string | null;
  readonly artiste_avatar?: string | null;
}

/** Un artiste tel que la page publique le montre : il a au moins un set. */
export interface ArtistePublic {
  readonly user_id: string;
  readonly nom: string;
  readonly avatar_path: string | null;
  readonly bio: string | null;
  readonly n_sets: number;
  readonly ecoutes: number;
  readonly dernier_set: string;
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
  /* Les chemins deposes avant la bascule vivent encore sur Supabase. On les
     reconnait a leur presence dans l'ancien stockage, ce qu'on ne peut pas
     savoir ici : on prefixe donc les nouveaux, et `urlAudio` lit le prefixe.
     Sans cela, basculer aurait rendu muets les sets deja en ligne. */
  return chemin.startsWith('supabase:')
    ? `${base}/storage/v1/object/public/sets/${chemin.slice(9)}`
    : `${PASSERELLE}/${chemin}`;
}

export function urlAvatar(chemin: string | null | undefined): string | null {
  return chemin ? `${base}/storage/v1/object/public/avatars/${chemin}` : null;
}

export function urlPochette(chemin: string | null | undefined): string | null {
  return chemin ? `${base}/storage/v1/object/public/covers/${chemin}` : null;
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
/* AU-DELA DE CETTE TAILLE, LE DECODAGE COMPLET EST TROP LOURD.

   `decodeAudioData` exige le fichier ENTIER en memoire avant de commencer :
   un WAV de 1,2 Go occupe 1,2 Go rien qu'a la lecture, avant meme le tampon
   decode. C'est au-dela de ce qu'un onglet supporte, et l'onglet ne rend pas
   une erreur, il meurt.

   Les WAV echappent a cette limite par le chemin ci-dessous, qui les lit par
   tranches. Les autres formats sont compresses, donc bien plus petits a
   taille de musique egale : 400 Mo de FLAC font deja deux heures. */
const PLAFOND_DECODAGE = 400 * 1024 * 1024;

/* --- La forme d'onde d'un WAV, sans jamais le charger en entier ----------- */

interface EnTeteWav {
  readonly canaux: number;
  readonly bits: number;
  readonly flottant: boolean;
  readonly debut: number;
  readonly longueur: number;
}

/** Lit l'en-tete RIFF. Rend null si ce n'est pas un WAV lisible. */
async function enTeteWav(fichier: File): Promise<EnTeteWav | null> {
  try {
    /* Les en-tetes tiennent dans les premiers kilo-octets. On ne lit que
       cela : c'est tout l'interet de la manoeuvre. */
    const vue = new DataView(await fichier.slice(0, 65536).arrayBuffer());
    if (vue.getUint32(0, false) !== 0x52494646) return null; // « RIFF »
    if (vue.getUint32(8, false) !== 0x57415645) return null; // « WAVE »

    let i = 12;
    let canaux = 0;
    let bits = 0;
    let format = 0;
    while (i + 8 <= vue.byteLength) {
      const nom = vue.getUint32(i, false);
      const taille = vue.getUint32(i + 4, true);
      if (nom === 0x666d7420) {
        format = vue.getUint16(i + 8, true);
        canaux = vue.getUint16(i + 10, true);
        bits = vue.getUint16(i + 22, true);
        /* Le format etendu range le vrai format plus loin. Sans cela, un WAV
           32 bits flottant exporte par un sequenceur passait pour du PCM
           entier et rendait une forme d'onde en bruit. */
        if (format === 0xfffe && i + 26 <= vue.byteLength) {
          format = vue.getUint16(i + 32, true);
        }
      } else if (nom === 0x64617461) {
        if (!canaux || !bits) return null;
        return {
          canaux,
          bits,
          flottant: format === 3,
          debut: i + 8,
          longueur: Math.min(taille, fichier.size - (i + 8)),
        };
      }
      i += 8 + taille + (taille % 2);
    }
    return null;
  } catch {
    return null;
  }
}

/** Enveloppe d'un WAV, lue par tranches de 8 Mo. Memoire bornee quelle que
    soit la taille du fichier. */
async function ondeDunWav(fichier: File, t: EnTeteWav): Promise<Uint8Array | null> {
  const octetsParEch = t.bits / 8;
  const cadre = octetsParEch * t.canaux;
  if (cadre <= 0) return null;
  const cadres = Math.floor(t.longueur / cadre);
  if (cadres < BARRES) return null;
  const parBarre = Math.floor(cadres / BARRES);

  const pics = new Uint8Array(BARRES);
  const TRANCHE_LECTURE = 8 * 1024 * 1024;

  let barre = 0;
  let somme = 0;
  let compte = 0;
  let position = t.debut;
  const fin = t.debut + cadres * cadre;

  /* Un reste peut rester a cheval sur deux tranches : on le garde et on le
     recolle, sinon un echantillon sur deux millions serait mal lu, ce qui ne
     se verrait pas mais serait faux. */
  let reste = new Uint8Array(0);

  while (position < fin && barre < BARRES) {
    const bout = Math.min(position + TRANCHE_LECTURE, fin);
    const brut = new Uint8Array(await fichier.slice(position, bout).arrayBuffer());
    position = bout;

    const bloc = reste.length > 0 ? new Uint8Array(reste.length + brut.length) : brut;
    if (reste.length > 0) {
      bloc.set(reste, 0);
      bloc.set(brut, reste.length);
    }
    const utilisables = Math.floor(bloc.length / cadre);
    reste = bloc.slice(utilisables * cadre);

    const vue = new DataView(bloc.buffer, bloc.byteOffset, utilisables * cadre);
    for (let c = 0; c < utilisables && barre < BARRES; c += 1) {
      const o = c * cadre;
      let v = 0;
      if (t.flottant && t.bits === 32) v = vue.getFloat32(o, true);
      else if (t.bits === 16) v = vue.getInt16(o, true) / 32768;
      else if (t.bits === 24) {
        const a = vue.getUint8(o);
        const b = vue.getUint8(o + 1);
        const d = vue.getInt8(o + 2);
        v = ((d << 16) | (b << 8) | a) / 8388608;
      } else if (t.bits === 32) v = vue.getInt32(o, true) / 2147483648;
      else if (t.bits === 8) v = (vue.getUint8(o) - 128) / 128;

      somme += v * v;
      compte += 1;
      if (compte >= parBarre) {
        pics[barre] = Math.min(255, Math.round(Math.sqrt(somme / compte) * 255));
        barre += 1;
        somme = 0;
        compte = 0;
      }
    }
  }

  let maximum = 0;
  for (const x of pics) if (x > maximum) maximum = x;
  if (maximum === 0) return null;
  for (let i = 0; i < BARRES; i += 1) pics[i] = Math.round(((pics[i] ?? 0) / maximum) * 255);
  return pics;
}

const encoder = (pics: Uint8Array): string => {
  let binaire = '';
  for (const o of pics) binaire += String.fromCharCode(o);
  return btoa(binaire);
};

export async function calculerOnde(fichier: File): Promise<string | null> {
  /* LE WAV D'ABORD, PARCE QUE C'EST LUI QUI EST ENORME. Un WAV est du PCM
     brut : on n'a rien a decoder, seulement a lire. On le parcourt donc par
     tranches de 8 Mo, ce qui rend la memoire independante de la duree. */
  if (estSansPerte(fichier.name) && extensionDe(fichier.name) === 'wav') {
    const t = await enTeteWav(fichier);
    if (t) {
      const pics = await ondeDunWav(fichier, t);
      if (pics) return encoder(pics);
    }
    /* En-tete illisible : on retombe sur le decodage, si la taille le permet. */
  }

  if (fichier.size > PLAFOND_DECODAGE) return null;

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

    return encoder(pics);
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

/** Ce qu'un compte occupe, et ce a quoi il a droit. `plafond` a null veut
    dire sans limite. */
export interface Stockage {
  readonly utilise: number;
  readonly plafond: number | null;
}

export async function monStockage(): Promise<Stockage | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) return null;
  const [u, p] = await Promise.all([
    supabase.rpc('stockage_utilise', { compte: id }),
    supabase.rpc('quota_octets', { compte: id }),
  ]);
  return {
    utilise: Number(u.data ?? 0),
    plafond: p.data === null || p.data === undefined ? null : Number(p.data),
  };
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

/* LE TYPE SERVI EST DEDUIT DE L'EXTENSION, JAMAIS RECOPIE DU NAVIGATEUR.

   PIEGE QUI AURAIT CASSE LA LECTURE SANS RIEN CASSER AU DEPOT. Chrome rend
   une chaine vide pour un FLAC, Firefox « application/octet-stream ». En
   recopiant ce type sur l'objet, le fichier aurait ete SERVI en
   octet-stream, et une balise audio refuse de lire ce qu'on ne lui annonce
   pas comme de l'audio. Le depot aurait reussi, le set aurait ete muet, et
   la cause serait restee invisible cote formulaire.

   On nomme donc le type nous-memes, a partir de l'extension, qui est la
   seule chose fiable ici. */
const TYPE_PAR_EXTENSION: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  aif: 'audio/aiff',
  aiff: 'audio/aiff',
  alac: 'audio/mp4',
};

/** Ce que l'envoi rapporte a l'appelant pendant qu'il dure. */
/* --- La pochette ---------------------------------------------------------- */

/** Cote maximal de la pochette enregistree. Une pochette s'affiche a 300 px
    dans une liste et remplit au plus la moitie d'un ecran quand on l'ouvre :
    1200 px couvre les deux avec de la marge sur un ecran a haute densite, et
    ne coute qu'environ 200 ko en WebP. */
export const COTE_POCHETTE = 1200;

/** Recompresse une image, quelle que soit sa taille de depart.

    ON NE REFUSE JAMAIS SUR LA TAILLE D'ENTREE. Un master de pochette fait
    couramment 40 Mo en TIFF, et Mika a demande qu'un fichier de deux
    gigaoctets passe quand meme. Ce qui compte est ce qui SORT.

    `createImageBitmap` avec `resizeWidth` fait le travail au bon endroit :
    le redimensionnement est demande AU DECODEUR, donc l'image complete n'est
    jamais construite en memoire. Decoder puis reduire aurait bati une image
    de plusieurs centaines de megaoctets avant de la jeter.

    Le WebP a 0,86 est le point ou l'artefact cesse de se voir sur un aplat
    de couleur, ce qui est le cas difficile d'une pochette de disque. */
export async function compresserPochette(fichier: File): Promise<File> {
  const taille = await dimensionsImage(fichier);
  const bitmap = await creerBitmap(fichier, taille);

  const cote = Math.max(bitmap.width, bitmap.height);
  const echelle = cote > COTE_POCHETTE ? COTE_POCHETTE / cote : 1;
  const l = Math.max(1, Math.round(bitmap.width * echelle));
  const h = Math.max(1, Math.round(bitmap.height * echelle));

  const toile = document.createElement('canvas');
  toile.width = l;
  toile.height = h;
  const ctx = toile.getContext('2d');
  if (!ctx) throw new Error('image illisible');
  ctx.drawImage(bitmap, 0, 0, l, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((res) => toile.toBlob(res, 'image/webp', 0.86));
  if (!blob) throw new Error('compression impossible');
  return new File([blob], 'cover.webp', { type: 'image/webp' });
}

/** Les dimensions lues dans l'en-tete, sans decoder l'image.

    DEUX DEFAUTS MESURES SUR LA PREMIERE VERSION, qui demandait au decodeur
    une largeur de 1200 sans savoir ce qu'il avait sous la main :

      une pochette de 200 px etait AGRANDIE a 1200, plus floue et plus lourde
      qu'a l'arrivee, 2 ko devenus 3 ;

      une image en hauteur, disons 800 sur 4000, voyait sa LARGEUR portee a
      1200, donc sa hauteur a 6000. On agrandissait en croyant reduire.

    Les deux viennent de la meme cause : on ne peut pas cadrer ce qu'on n'a
    pas mesure. L'en-tete tient dans les premiers kilo-octets des trois
    formats acceptes, et le lire coute une lecture de 64 ko la ou decoder
    coutait 256 Mo sur une image de 8000 par 8000. */
async function dimensionsImage(fichier: File): Promise<{ l: number; h: number } | null> {
  try {
    const vue = new DataView(await fichier.slice(0, 65536).arrayBuffer());

    // PNG : la largeur et la hauteur vivent dans le bloc IHDR, toujours en tete.
    if (vue.byteLength > 24 && vue.getUint32(0, false) === 0x89504e47) {
      return { l: vue.getUint32(16, false), h: vue.getUint32(20, false) };
    }

    // JPEG : il faut parcourir les marqueurs jusqu'au debut de trame.
    if (vue.byteLength > 4 && vue.getUint16(0, false) === 0xffd8) {
      let i = 2;
      while (i + 9 < vue.byteLength) {
        if (vue.getUint8(i) !== 0xff) {
          i += 1;
          continue;
        }
        const marqueur = vue.getUint8(i + 1);
        /* Les marqueurs de debut de trame portent les dimensions. On ecarte
           0xC4, 0xC8 et 0xCC, qui sont des tables et non des trames. */
        const estTrame =
          marqueur >= 0xc0 && marqueur <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marqueur);
        if (estTrame) return { h: vue.getUint16(i + 5, false), l: vue.getUint16(i + 7, false) };
        i += 2 + vue.getUint16(i + 2, false);
      }
      return null;
    }

    // WebP : trois variantes de bloc, et chacune range ses dimensions ailleurs.
    if (vue.byteLength > 30 && vue.getUint32(0, false) === 0x52494646 && vue.getUint32(8, false) === 0x57454250) {
      const bloc = vue.getUint32(12, false);
      if (bloc === 0x56503858) {
        // VP8X : deux entiers de 24 bits, moins un.
        const l = 1 + (vue.getUint8(24) | (vue.getUint8(25) << 8) | (vue.getUint8(26) << 16));
        const h = 1 + (vue.getUint8(27) | (vue.getUint8(28) << 8) | (vue.getUint8(29) << 16));
        return { l, h };
      }
      if (bloc === 0x5650384c) {
        const b = vue.getUint32(21, true);
        return { l: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) };
      }
      if (bloc === 0x56503820) {
        return { l: vue.getUint16(26, true) & 0x3fff, h: vue.getUint16(28, true) & 0x3fff };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function creerBitmap(
  fichier: File,
  taille: { l: number; h: number } | null
): Promise<ImageBitmap> {
  /* SANS DIMENSIONS CONNUES, ON NE REDIMENSIONNE PAS. Un format inattendu
     vaut mieux decode tel quel puis reduit a la toile : c'est plus lourd,
     mais c'est juste, et le cadrage se fait de toute facon plus loin. */
  if (!taille) return createImageBitmap(fichier);

  const cote = Math.max(taille.l, taille.h);
  if (cote <= COTE_POCHETTE) return createImageBitmap(fichier);

  /* LE COTE LE PLUS LONG COMMANDE, jamais la largeur seule : une image en
     hauteur cadree sur sa largeur grandit au lieu de retrecir. */
  const echelle = COTE_POCHETTE / cote;
  try {
    return await createImageBitmap(fichier, {
      resizeWidth: Math.max(1, Math.round(taille.l * echelle)),
      resizeHeight: Math.max(1, Math.round(taille.h * echelle)),
      resizeQuality: 'high',
    });
  } catch {
    return createImageBitmap(fichier);
  }
}

/** Depose la pochette deja compressee et rend son chemin. */
export async function deposerPochette(fichier: File): Promise<string> {
  if (!supabase) throw new Error('base indisponible');
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error('non connecte');
  const chemin = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await supabase.storage
    .from('covers')
    .upload(chemin, fichier, { contentType: 'image/webp', upsert: false });
  if (error) throw new Error(error.message);
  return chemin;
}

export interface Avancement {
  readonly envoye: number;
  readonly total: number;
}

/** Depose le fichier audio sur R2, en tranches, et rend son chemin.

    L'ENVOI SE RACONTE PENDANT QU'IL DURE. Un set de 400 Mo prend plusieurs
    minutes sur une connexion domestique. Sans progression, on ne distingue
    pas un envoi lent d'un envoi bloque, et on recharge la page au milieu. */
export async function deposerAudio(
  fichier: File,
  surAvancement?: (a: Avancement) => void
): Promise<string> {
  if (!supabase) throw new Error('base indisponible');
  const { data } = await supabase.auth.getSession();
  const jeton = data.session?.access_token;
  const id = data.session?.user?.id;
  if (!jeton || !id) throw new Error('non connecte');
  if (fichier.size > TAILLE_MAX) throw new Error('fichier trop lourd');

  /* Le nom d'origine peut contenir n'importe quoi : accents, espaces, barres
     obliques. Une barre obliques ferait sortir la cle du dossier du compte,
     ce que la passerelle refuserait. On garde l'extension et rien d'autre. */
  const ext = extensionDe(fichier.name).replace(/[^a-z0-9]/g, '').slice(0, 5) || 'mp3';
  const type = TYPE_PAR_EXTENSION[ext] ?? (fichier.type || 'audio/mpeg');
  const cle = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const entetes = { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' };

  const debut = await fetch(`${PASSERELLE}/api/creer`, {
    method: 'POST',
    headers: entetes,
    body: JSON.stringify({ cle, type }),
  });
  if (!debut.ok) throw new Error(`la passerelle refuse l'envoi (${debut.status})`);
  const { envoi } = (await debut.json()) as { envoi: string };

  const parties: { partNumber: number; etag: string }[] = [];
  let envoye = 0;
  try {
    const total = Math.ceil(fichier.size / TRANCHE);
    for (let n = 1; n <= total; n += 1) {
      const tranche = fichier.slice((n - 1) * TRANCHE, n * TRANCHE);
      const r = await fetch(
        `${PASSERELLE}/api/partie?cle=${encodeURIComponent(cle)}&envoi=${encodeURIComponent(envoi)}&numero=${n}`,
        { method: 'PUT', headers: { Authorization: `Bearer ${jeton}` }, body: tranche }
      );
      if (!r.ok) throw new Error(`tranche ${n} refusee (${r.status})`);
      parties.push((await r.json()) as { partNumber: number; etag: string });
      envoye += tranche.size;
      surAvancement?.({ envoye, total: fichier.size });
    }

    const fin = await fetch(`${PASSERELLE}/api/finir`, {
      method: 'POST',
      headers: entetes,
      body: JSON.stringify({ cle, envoi, parties }),
    });
    if (!fin.ok) throw new Error(`assemblage refuse (${fin.status})`);
    return cle;
  } catch (e) {
    /* ON ABANDONNE L'ENVOI AVANT DE RELANCER L'ERREUR. Les tranches deja
       deposees d'un envoi jamais termine restent facturees comme du stockage
       tant que personne ne les efface, et rien dans l'interface ne les
       montre : ce sont des octets invisibles qu'on paie. */
    await fetch(`${PASSERELLE}/api/annuler`, {
      method: 'POST',
      headers: entetes,
      body: JSON.stringify({ cle, envoi }),
    }).catch(() => undefined);
    throw e;
  }
}

export async function creerSet(champs: {
  titre: string;
  description?: string | null;
  audio_path: string;
  cover_path?: string | null;
  duree_s?: number | null;
  taille_o?: number | null;
  onde?: string | null;
  genre_ids?: string[] | null;
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
    .select('id, titre, description, audio_path, cover_path, duree_s, onde, ecoutes, created_at, user_id, genre_ids, publie')
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

/** Les artistes qui ont au moins un set publie. */
export async function artistesPublics(): Promise<ArtistePublic[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('artistes_publics')
    .select('*')
    .order('dernier_set', { ascending: false })
    .limit(200);
  return (data as ArtistePublic[] | null) ?? [];
}

export async function unArtiste(userId: string): Promise<ArtistePublic | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('artistes_publics')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as ArtistePublic | null) ?? null;
}

export async function setsDunArtiste(userId: string): Promise<SetDJ[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('sets_publics')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data as SetDJ[] | null) ?? [];
}

/** Les sets qui declarent ce genre parmi les leurs. Sert la section
    « communaute » de la page d'un genre.

    `contains` et non `eq` : la colonne est un tableau depuis qu'un set peut
    revendiquer plusieurs styles, et un mix qui passe de l'indie dance au dub
    techno doit apparaitre sur les deux fiches. */
export async function setsDunGenre(genreId: string): Promise<SetDJ[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('sets_publics')
    .select('*')
    .contains('genre_ids', [genreId])
    .order('created_at', { ascending: false })
    .limit(20);
  return (data as SetDJ[] | null) ?? [];
}

/** Modifie un set deja depose : titre, description, styles, pochette.

    LA POCHETTE PRECEDENTE EST EFFACEE APRES, jamais avant. Si l'ecriture de
    la ligne echouait entre les deux, on aurait un set dont l'image n'existe
    plus, et rien dans l'interface pour le reparer. Dans l'autre sens le pire
    cas est un fichier orphelin : une facture, pas une panne. */
export async function modifierSet(
  id: string,
  champs: {
    titre: string;
    description?: string | null;
    genre_ids?: string[] | null;
    cover_path?: string | null;
  },
  ancienneCover?: string | null
): Promise<void> {
  if (!supabase) throw new Error('base indisponible');
  const { error } = await supabase.from('dj_sets').update(champs).eq('id', id);
  if (error) throw new Error(error.message);
  if (ancienneCover && ancienneCover !== champs.cover_path) {
    await supabase.storage.from('covers').remove([ancienneCover]);
  }
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
  if (chemin.startsWith('supabase:')) {
    await supabase.storage.from('sets').remove([chemin.slice(9)]);
    return;
  }
  const { data } = await supabase.auth.getSession();
  const jeton = data.session?.access_token;
  if (!jeton) return;
  await fetch(`${PASSERELLE}/${chemin}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${jeton}` },
  }).catch(() => undefined);
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
