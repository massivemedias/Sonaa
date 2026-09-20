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

export interface Capture {
  readonly pcm: Float32Array;
  readonly extrait: Blob;
}

/* LE FORMAT D'ENREGISTREMENT SE NEGOCIE. Safari ne connait pas webm et rend
   du mp4 ; laisser le navigateur choisir evite une capture muette. */
function typeAccepte(): string | undefined {
  const candidats = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidats.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
}

async function versPcm(blob: Blob): Promise<Float32Array> {
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
  return rendu.getChannelData(0).slice();
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
    return { pcm: await versPcm(tout), extrait };
  } finally {
    /* LE MICRO SE REFERME MEME SI TOUT A ECHOUE. Une piste laissee ouverte
       garde le point rouge allume et la promesse est rompue. */
    for (const piste of flux.getTracks()) piste.stop();
  }
}
