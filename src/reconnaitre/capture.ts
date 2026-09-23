/* PRENDRE DIX SECONDES DE CE QUI PASSE DANS LA PIECE.
 *
 * Une seule capture sert aux deux reconnaissances, et c'est ce qui permet de
 * tenir la promesse faite dans la modale de consentement : le micro s'ouvre
 * une fois, dix secondes, puis se referme et les pistes sont arretees une par
 * une. Tant qu'une piste reste active, le navigateur affiche le point rouge,
 * et l'utilisateur a raison de s'en inquieter.
 *
 * DEUX SORTIES, DEUX USAGES.
 * 1. `pcm` : le son ramene a 16 000 Hz et une seule voie, ce que le modele
 *    attend. Il ne quitte JAMAIS le navigateur.
 * 2. `extrait` : les huit premieres secondes telles qu'enregistrees, pour
 *    AudD. Elles ne partent que si l'utilisateur a accepte ce point-la
 *    separement, et la passerelle ne les conserve pas.
 *
 * LE REECHANTILLONNAGE PASSE PAR UN CONTEXTE HORS ECRAN, comme la forme
 * d'onde des mixtapes : c'est le navigateur qui le fait, correctement, et non
 * une interpolation ecrite ici qui produirait un repliement de spectre. */

/** Ce que le modele attend, et ce sur quoi il a ete entraine. */
export const FREQUENCE_MODELE = 16000;
export const SECONDES_CAPTURE = 10;
/** Ce qu'on envoie a AudD, quand on l'envoie. Au-dela, on paie du silence. */
export const SECONDES_TRACK = 8;
/* SOUS CE NIVEAU, ON NE CLASSE PAS. Mesure le 22 septembre 2026 par le banc
   (scripts/banc-reconnaitre.mjs) sur le chemin complet du micro : quatre
   extraits de morceaux publies donnent un niveau efficace de 0,15 a 0,37 ;
   une sinusoide a -44 dBFS donne 0,006 et recoit quand meme « Euro-Disco
   19 % » ; le silence numerique donne 0 et fait lever une exception brute
   dans le WASM d'Essentia (un pointeur, 6736064, pas un message). Le seuil
   est a -40 dBFS, dix fois sous la musique la plus douce mesuree. Il est
   PROVISOIRE : aucun vrai enregistrement de piece n'a pu etre mesure sur ce
   poste, qui n'a pas de micro accessible au banc. */
export const NIVEAU_MINIMAL = 0.01;

export interface Capture {
  readonly pcm: Float32Array;
  readonly extrait: Blob;
  /** Le niveau efficace (RMS) du signal ramene a 16 kHz, entre 0 et 1. Il
      sert a dire « son trop faible » au lieu de classer du bruit. */
  readonly niveau: number;
}

/** Le niveau efficace d'un signal : la racine de la moyenne des carres. */
function niveauEfficace(pcm: Float32Array): number {
  if (pcm.length === 0) return 0;
  let somme = 0;
  for (let i = 0; i < pcm.length; i += 1) somme += (pcm[i] ?? 0) ** 2;
  return Math.sqrt(somme / pcm.length);
}

/* LE FORMAT D'ENREGISTREMENT SE NEGOCIE. Safari ne connait pas webm et rend
   du mp4 ; laisser le navigateur choisir evite une capture muette. */
function typeAccepte(): string | undefined {
  const candidats = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidats.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
}

interface Decode {
  readonly pcm: Float32Array;
  /** La frequence a laquelle le navigateur a decode l'enregistrement, avant
      le reechantillonnage : 48 000 Hz en general. */
  readonly frequenceDecodee: number;
  readonly dureeDecodee: number;
}

async function versPcm(blob: Blob): Promise<Decode> {
  const octets = await blob.arrayBuffer();
  const ctx = new AudioContext();
  let decode: AudioBuffer;
  try {
    decode = await ctx.decodeAudioData(octets);
  } finally {
    void ctx.close();
  }
  const cible = Math.max(1, Math.round((decode.duration * FREQUENCE_MODELE) | 0));
  const hors = new OfflineAudioContext(1, cible, FREQUENCE_MODELE);
  const source = hors.createBufferSource();
  source.buffer = decode;
  source.connect(hors.destination);
  source.start();
  const rendu = await hors.startRendering();
  return { pcm: rendu.getChannelData(0).slice(), frequenceDecodee: decode.sampleRate, dureeDecodee: decode.duration };
}

/** Ouvre le micro, enregistre, referme, et rend les deux formes du son.
    `onSeconde` sert a l'animation : elle recoit les secondes ecoulees. */
export async function capturer(onSeconde: (n: number) => void = () => {}): Promise<Capture> {
  const flux = await navigator.mediaDevices.getUserMedia({
    audio: {
      /* AUCUN TRAITEMENT. L'annulation d'echo et la reduction de bruit sont
         faites pour la voix : sur de la musique elles effacent justement ce
         que le modele ecoute. */
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  try {
    const type = typeAccepte();
    const enregistreur = new MediaRecorder(flux, type ? { mimeType: type } : undefined);
    const morceaux: Blob[] = [];
    enregistreur.ondataavailable = (e) => {
      if (e.data.size > 0) morceaux.push(e.data);
    };

    const fini = new Promise<void>((resolve) => {
      enregistreur.onstop = () => resolve();
    });

    enregistreur.start(1000);
    for (let s = 1; s <= SECONDES_CAPTURE; s += 1) {
      await new Promise((r) => setTimeout(r, 1000));
      onSeconde(s);
    }
    enregistreur.stop();
    await fini;

    const tout = new Blob(morceaux, { type: enregistreur.mimeType });
    /* HUIT SECONDES POUR AUDD : les morceaux sont enregistres par tranches
       d'une seconde, donc huit tranches. C'est approximatif et cela suffit,
       AudD lit ce qu'on lui donne. */
    const extrait = new Blob(morceaux.slice(0, SECONDES_TRACK), { type: enregistreur.mimeType });
    const decode = await versPcm(tout);
    const niveau = niveauEfficace(decode.pcm);

    /* EN DEVELOPPEMENT SEULEMENT : ce que la capture a vraiment produit, lu
       par le banc d'essai (scripts/banc-reconnaitre.mjs). Le type, la
       taille, la frequence decodee et le niveau sont exactement ce qu'il
       faut pour savoir si ce qu'on envoie au modele et a AudD est du son. */
    if (import.meta.env.DEV) {
      (window as unknown as { __sonaaReco?: Record<string, unknown> }).__sonaaReco = {
        ...(window as unknown as { __sonaaReco?: Record<string, unknown> }).__sonaaReco,
        capture: {
          type: enregistreur.mimeType,
          tranches: morceaux.length,
          octetsTout: tout.size,
          octetsExtrait: extrait.size,
          frequenceDecodee: decode.frequenceDecodee,
          dureeDecodee: decode.dureeDecodee,
          echantillonsPcm: decode.pcm.length,
          frequencePcm: FREQUENCE_MODELE,
          niveau,
          /* Le signal lui-meme, pour que le banc refasse l'inference a sa
             facon et compare. Cent soixante mille flottants, en dev seulement. */
          pcm: decode.pcm,
        },
      };
    }
    return { pcm: decode.pcm, extrait, niveau };
  } finally {
    /* LE MICRO SE REFERME MEME SI TOUT A ECHOUE. Une piste laissee ouverte
       garde le point rouge allume et la promesse est rompue. */
    for (const piste of flux.getTracks()) piste.stop();
  }
}
