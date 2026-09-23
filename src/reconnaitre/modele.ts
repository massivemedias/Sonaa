/* LE MODELE DE STYLE, DANS LE NAVIGATEUR.
 *
 * C'est la fonctionnalite principale de la page, et elle ne depend d'AUCUNE
 * cle : le reseau de neurones tourne chez le visiteur, l'audio ne sort pas de
 * son appareil. La reconnaissance de morceau, elle, passe par un service
 * payant et peut etre absente ; celle-ci non.
 *
 * CE QUE PESE CETTE PROMESSE : 43,4 Mo de poids, mesures le 19 septembre
 * 2026, en douze fichiers. C'est beaucoup, et c'est pourquoi rien ne se
 * telecharge avant que le visiteur appuie : la page s'ouvre a vide, annonce
 * le poids, et ne va le chercher qu'au premier usage.
 *
 * DEUX MISES EN CACHE, ET LA SECONDE FAIT LE VRAI TRAVAIL.
 * 1. Le cache HTTP du navigateur, par l'en-tete immuable pose sur les objets.
 * 2. IndexedDB, par TensorFlow.js lui-meme : une fois range la, le modele se
 *    recharge sans reseau du tout. C'est ce qui rend la deuxieme visite
 *    instantanee, et c'est ce qui compte sur un forfait mobile.
 *
 * LE MODELE EST SERVI PAR NOTRE PASSERELLE, PAS PAR SON HOTE D'ORIGINE. Le
 * serveur d'Essentia ne pose pas d'en-tete CORS, verifie le 19 septembre
 * 2026 : un navigateur refuse donc de le lire depuis sonaa.ca. Les douze
 * fichiers sont ranges dans R2, sous le meme seau que les mixtapes.
 *
 * CE N'EST PAS DE LA RECONNAISSANCE DE MORCEAU. Le reseau rend une
 * distribution sur 400 styles Discogs, pas un titre. Il se trompe, surtout
 * sur dix secondes de radio avec une voix par-dessus, et la page doit le
 * dire au lieu de presenter un pourcentage comme un verdict. */

import { nomCourt } from './discogs-vers-sonaa.ts';
import { ETIQUETTES_MODELE } from './etiquettes-modele.ts';

const PASSERELLE = 'https://sonaa-sets.massivemedias.workers.dev';
const ADRESSE_MODELE = `${PASSERELLE}/modele/discogs-resnet/model.json`;
/** La copie rangee par TensorFlow.js. Le numero change si le modele change. */
const RANGEMENT = 'indexeddb://sonaa-discogs-1';

/** Mesure le 19 septembre 2026 : douze fichiers, dont onze de poids. */
export const POIDS_MODELE_MO = 43.4;

/* LA FORME QUE LE RESEAU ATTEND : des fenetres de 128 trames de 96 bandes
   mel, a 16 kHz. Ces trois nombres viennent de la signature du modele et de
   l'extracteur d'Essentia, ils ne se choisissent pas. */
const TRAMES_PAR_FENETRE = 128;
const BANDES = 96;
const TAILLE_TRAME = 512;
const SAUT_TRAMES = 256;

export interface Prediction {
  /** L'etiquette brute, « Electronic---Deep House ». */
  readonly discogs: string;
  /** Le nom seul, pour l'affichage. */
  readonly nom: string;
  /** Entre 0 et 1. */
  readonly score: number;
}

export interface Moteur {
  predire(pcm: Float32Array): Promise<readonly Prediction[]>;
  /* LA PREMIERE INFERENCE COUTE QUATRE SECONDES, LES SUIVANTES DEUX
     DIXIEMES. Mesure le 19 septembre 2026 : ce n'est pas le calcul, c'est la
     compilation des noyaux par TensorFlow.js au premier passage. On la paie
     donc pendant que le micro ecoute, et pas apres, quand l'utilisateur
     attend son resultat devant un bouton qui ne dit rien. */
  prechauffer(): Promise<void>;
}

let enCours: Promise<Moteur> | null = null;

/** Charge le modele une seule fois par session, et le garde. `onEtape` recoit
    une valeur entre 0 et 1 pour la barre de progression. */
export function chargerMoteur(onEtape: (part: number) => void = () => {}): Promise<Moteur> {
  enCours ??= monter(onEtape);
  return enCours;
}

async function monter(onEtape: (part: number) => void): Promise<Moteur> {
  onEtape(0.02);
  /* LES DEUX BIBLIOTHEQUES SONT CHARGEES A LA DEMANDE, et c'est la raison
     d'etre de ce module : elles pesent plus que tout le reste du site, et
     personne qui vient lire l'atlas ne doit les payer. */
  const [tf, coreEssentia, wasmEssentia] = await Promise.all([
    import('@tensorflow/tfjs'),
    import('essentia.js/dist/essentia.js-core.es.js'),
    import('essentia.js/dist/essentia-wasm.es.js'),
  ]);
  onEtape(0.1);

  const EssentiaClasse = (coreEssentia as unknown as { default: new (w: unknown) => EssentiaLike }).default;
  const wasm = (wasmEssentia as unknown as { EssentiaWASM: unknown }).EssentiaWASM;
  const essentia = new EssentiaClasse(wasm);

  /* ON ESSAIE D'ABORD LA COPIE RANGEE. Un echec ici n'est pas une erreur :
     c'est la premiere visite. */
  let reseau: GraphModelLike | null = null;
  try {
    reseau = (await tf.loadGraphModel(RANGEMENT)) as unknown as GraphModelLike;
    onEtape(1);
  } catch {
    reseau = null;
  }

  if (!reseau) {
    reseau = (await tf.loadGraphModel(ADRESSE_MODELE, {
      onProgress: (p: number) => onEtape(0.1 + p * 0.85),
    })) as unknown as GraphModelLike;
    try {
      await (reseau as unknown as { save: (u: string) => Promise<unknown> }).save(RANGEMENT);
    } catch {
      /* Navigation privee, quota plein : le modele marche quand meme, il
         sera simplement retelecharge la prochaine fois. */
    }
    onEtape(1);
  }

  const etiquettes = await etiquettesDuModele();

  const inferer = async (plat: Float32Array, n: number): Promise<Float32Array> => {
    const entree = tf.tensor(plat, [n, TRAMES_PAR_FENETRE, BANDES]);
    const sortie = reseau.predict(entree) as { data: () => Promise<Float32Array>; dispose: () => void };
    const valeurs = await sortie.data();
    entree.dispose();
    sortie.dispose();
    return valeurs;
  };

  let chauffe = false;

  /* EN DEVELOPPEMENT SEULEMENT : les pieces du moteur, nues, pour le banc
     d'essai. Il s'en sert pour comparer un appel groupe a des appels
     separes, et pour lire les 400 sorties brutes plutot que trois noms. */
  if (import.meta.env.DEV) {
    (window as unknown as { __sonaaReco?: Record<string, unknown> }).__sonaaReco = {
      ...(window as unknown as { __sonaaReco?: Record<string, unknown> }).__sonaaReco,
      moteur: {
        inferer,
        fenetres: (pcm: Float32Array) => fenetresMel(essentia, pcm),
        etiquettes,
        tramesParFenetre: TRAMES_PAR_FENETRE,
        bandes: BANDES,
      },
    };
  }

  return {
    async prechauffer(): Promise<void> {
      if (chauffe) return;
      chauffe = true;
      await inferer(new Float32Array(TRAMES_PAR_FENETRE * BANDES), 1);
    },

    async predire(pcm: Float32Array): Promise<readonly Prediction[]> {
      const fenetres = fenetresMel(essentia, pcm);
      if (fenetres.length === 0) return [];

      /* LES QUATRE FENETRES PARTENT EN UN SEUL APPEL, et ce n'est pas un
         detail : mesure le 19 septembre 2026 sur un portable, quatre appels
         separes prenaient 5,5 secondes, le meme travail en un lot tombe a
         moins de deux. Le reseau est fait pour traiter un lot, l'appeler
         quatre fois lui fait reconstruire son graphe autant de fois. */
      const n = fenetres.length;
      const plat = new Float32Array(n * TRAMES_PAR_FENETRE * BANDES);
      fenetres.forEach((f, i) => plat.set(f, i * TRAMES_PAR_FENETRE * BANDES));
      const valeurs = await inferer(plat, n);

      /* LA MOYENNE DES FENETRES, pas la meilleure : un passage de voix ou un
         blanc ne doit pas decider seul du style de dix secondes. */
      const moyenne = new Float32Array(etiquettes.length);
      for (let f = 0; f < n; f += 1) {
        for (let i = 0; i < moyenne.length; i += 1) {
          moyenne[i] = (moyenne[i] ?? 0) + (valeurs[f * etiquettes.length + i] ?? 0);
        }
      }
      return etiquettes
        .map((discogs, i): Prediction => ({ discogs, nom: nomCourt(discogs), score: (moyenne[i] ?? 0) / n }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    },
  };
}

/* LES 400 ETIQUETTES SONT CELLES DU MODELE, DANS L'ORDRE DE SES SORTIES.
   Elles etaient lues depuis la table de correspondance, « pour eviter que
   deux ordres divergent » ; c'est precisement ce qui est arrive, parce que
   la table suivait l'ordre d'un autre modele. Depuis le 22 septembre 2026
   l'ordre vient du fichier copie de la demonstration d'origine, et la table
   se cherche par le nom. Voir etiquettes-modele.ts. */
async function etiquettesDuModele(): Promise<readonly string[]> {
  return ETIQUETTES_MODELE;
}

interface EssentiaLike {
  FrameGenerator: (a: Float32Array, taille: number, saut: number) => { size: () => number; get: (i: number) => unknown; delete?: () => void };
  TensorflowInputMusiCNN: (trame: unknown) => { bands: unknown };
  vectorToArray: (v: unknown) => Float32Array;
}

interface GraphModelLike {
  predict: (t: unknown) => unknown;
}

/* DU SON AUX FENETRES QUE LE RESEAU LIT.
 *
 * Essentia decoupe le signal en trames de 512 avec un saut de 256, et rend
 * pour chacune 96 bandes mel deja compressees comme a l'entrainement. On
 * empile ensuite ces trames par 128, soit un peu plus de deux secondes par
 * fenetre. Dix secondes en donnent quatre ou cinq, et la moyenne de leurs
 * sorties vaut mieux qu'une seule : un passage de voix ou un blanc ne decide
 * plus seul du resultat. */
function fenetresMel(essentia: EssentiaLike, pcm: Float32Array): Float32Array[] {
  /* FrameGenerator PREND LE TABLEAU BRUT, PAS UN VECTEUR ESSENTIA. Lui
     passer le vecteur rend une erreur d'Emscripten qui ne nomme rien,
     « Cannot convert undefined to unsigned int », mesuree le 19 septembre
     2026. Les autres algorithmes, eux, prennent bien un vecteur. */
  const trames = essentia.FrameGenerator(pcm, TAILLE_TRAME, SAUT_TRAMES);
  const toutes: Float32Array[] = [];
  for (let i = 0; i < trames.size(); i += 1) {
    const bandes = essentia.TensorflowInputMusiCNN(trames.get(i)).bands;
    toutes.push(essentia.vectorToArray(bandes));
  }
  trames.delete?.();

  const fenetres: Float32Array[] = [];
  for (let debut = 0; debut + TRAMES_PAR_FENETRE <= toutes.length; debut += TRAMES_PAR_FENETRE) {
    const plate = new Float32Array(TRAMES_PAR_FENETRE * BANDES);
    for (let t = 0; t < TRAMES_PAR_FENETRE; t += 1) {
      plate.set((toutes[debut + t] ?? new Float32Array(BANDES)).subarray(0, BANDES), t * BANDES);
    }
    fenetres.push(plate);
  }
  return fenetres;
}
