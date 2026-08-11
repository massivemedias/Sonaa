/* Correspondance entre un morceau cherché et une vidéo trouvée.

   Ce module fait autorité sur la question « est-ce bien ce morceau ». Il est
   partagé par tous les scripts qui écrivent des identifiants YouTube, pour
   qu'il n'existe qu'une seule définition de la rigueur.

   HISTORIQUE, à ne pas défaire. La première version acceptait un mot commun sur
   trois entre ce qu'on cherchait et ce que YouTube renvoyait. Sur 202 morceaux
   ainsi retenus, une revérification en a rejeté 41, soit un sur cinq : le bon
   artiste avec le mauvais morceau passait sans difficulté, par exemple
   « Phase Fatale - Reproduction » satisfait par « Velvet Imprints ». Le cas
   inverse existe aussi, une reprise du même titre par quelqu'un d'autre :
   « Sirens Of Jupiter » de Marvin & Guy satisfait par The Olympians.

   La règle est donc : LE TITRE ET L'ARTISTE doivent tenir tous les deux. */

/** Seuils. Le titre est plus discriminant que l'artiste, il est exigé plus haut. */
export const TITLE_THRESHOLD = 0.6;
export const ARTIST_THRESHOLD = 0.34;

/* Repli des accents ET des transcriptions allemandes. Les deux bases n'écrivent
   pas pareil : on cherche « Verrueckt », YouTube affiche « Verrückt » ; on
   cherche « Lindstrom », la chaîne s'appelle « Lindstrøm - Topic ». Sans ce
   repli, des correspondances parfaitement justes étaient rejetées. */
export const normalise = (input: string): string => {
  let s = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s
    .toLowerCase()
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/&/g, ' and ');
  s = s.replace(/[^a-z0-9]+/g, ' ');
  // ue, oe, ae transcrivent les umlauts : on ramène les deux écritures à une.
  s = s.replace(/([a-z])ue([a-z])/g, '$1u$2');
  s = s.replace(/([a-z])oe([a-z])/g, '$1o$2');
  s = s.replace(/([a-z])ae([a-z])/g, '$1a$2');
  return s.trim();
};

const words = (input: string): string[] => {
  const all = normalise(input).split(' ').filter(Boolean);
  const long = all.filter((w) => w.length > 2);
  return long.length > 0 ? long : all;
};

/* Égalité, ou préfixe d'au moins quatre lettres dans un sens ou l'autre.
   Couvre « holdin » contre « holding » et « geht » contre « gehts ». */
const hit = (word: string, haystack: Set<string>): boolean => {
  if (haystack.has(word)) return true;
  if (word.length < 4) return false;
  for (const h of haystack) {
    if (h.length >= 4 && (h.startsWith(word) || word.startsWith(h))) return true;
  }
  return false;
};

/** Part des mots significatifs attendus effectivement présents. */
export const coverage = (want: string, haystack: Set<string>): number => {
  const w = words(want);
  if (w.length === 0) return 0;
  return w.filter((x) => hit(x, haystack)).length / w.length;
};

export interface Candidate {
  /** Titre de la vidéo, tel que renvoyé par oEmbed. */
  title: string;
  /** Nom de la chaîne. Il porte souvent l'artiste, notamment les chaînes « - Topic ». */
  channel: string;
}

export interface Verdict {
  /** Le titre annonce un document SUR la musique, pas la musique. */
  about?: boolean;
  /** Les numeros d'ordre se contredisent : Living Torch II pour I. */
  numero?: boolean;
  /** Le candidat annonce une version ou une partie non demandee. */
  variante?: boolean;
  /** Mots significatifs que le candidat ajoute a la requete. */
  surplus?: number;
  ok: boolean;
  titleScore: number;
  artistScore: number;
  /** Vrai quand le candidat est une parution complète, pas une track. */
  fullRelease?: boolean;
}

/* Une PARUTION COMPLÈTE n'est pas une track. « Zanov - Moebius 256 301 (full
   album) », 40 minutes, passait le matcher parce que le titre contient bien
   l'artiste et le titre cherchés : le test de correspondance ne suffit pas, il
   faut aussi refuser la nature de l'objet. Deux détecteurs :

   1. Le titre annonce la parution : full album, álbum completo, LP, mix
      complet, compilation, megamix, et leurs variantes.
   2. La durée dépasse quinze minutes, quand elle est connue. Elle vient de la
      page de résultats de recherche, oEmbed ne la donne pas. */
export const FULL_RELEASE_MARKERS =
  /\bfull\s*album\b|\balbum\s+complet(?:o)?\b|\b[aá]lbum\s+completo\b|\bfull\s*lp\b|\blp\b|\bmix\s+complet\b|\bcompilation\b|\bmegamix\b|\bfull\s*ep\b|\bcontinuous\s+mix\b|\bdj\s*mix\b|\ball\s+tracks\b/i;

export const MAX_TRACK_SECONDS = 15 * 60;

/* CE QUE LA VIDEO EST, ET NON CE DONT ELLE PARLE.

   Le matcher compare des mots : une video intitulee « Karlheinz Stockhausen
   explains Kontakte » contient l'artiste et le titre, elle passe donc tous
   les controles. C'est une interview. Trente-six remplacements ont ete
   annules pour ce motif, parmi lesquels une bande-annonce d'album, une
   critique, et plusieurs captations de concert.

   Aucun score de similarite ne peut attraper cela : le probleme n'est pas
   la ressemblance du titre, c'est la NATURE du document. Une video qui
   parle de la musique n'est pas la musique.

   Les marqueurs couvrent le francais, l'anglais et l'espagnol, les trois
   langues rencontrees dans les resultats. « live » n'y figure PAS : une
   captation de concert est de la musique, souvent la seule trace d'un
   morceau, et l'exclure appauvrirait le corpus. */
export const NATURE_MARKERS =
  /\b(?:interview|entrevue|entrevista|explains?|explique|explica|talks?\s+about|parle\s+de|habla\s+de|documentary|documentaire|documental|trailer|bande[-\s]annonce|review|critique|resena|rese[nñ]a|reaction|reaccion|tutorial|tutoriel|how\s+to|comment\s+faire|c[oó]mo\s+hacer|behind\s+the\s+scenes|coulisses|making[-\s]of|breakdown|analysis|analyse|an[aá]lisis|track\s*by\s*track|first\s+look|unboxing)\b/i;

/** Vrai quand le titre annonce un document SUR la musique, pas la musique. */
export const isAboutMusic = (title: string): boolean => NATURE_MARKERS.test(title);



/* EXCEPTIONS AU PLAFOND DE DURÉE, nommées une par une, justification comprise.

   Règles de cette liste : trois entrées au maximum, une exception est toujours
   une PIÈCE UNIQUE, jamais un album ni une compilation, et les marqueurs de
   parution s'appliquent toujours, exception ou pas. Une vidéo « 1/1 full
   album » reste refusée même pour Eno.

   1. Brian Eno, 1/1 : 17 min 22. La pièce fondatrice de l'ambient, celle qui
      nomme le genre sur Music for Airports. L'exclure appauvrit le corpus.
   2. Kraftwerk, Autobahn : 22 min 42. La pièce fondatrice du proto-techno.
      L'édit single de 3 minutes existe mais c'est la pièce entière qui a fait
      l'histoire.
   3. Tangerine Dream, Phaedra : 17 min 39. La pièce-titre qui fonde l'école de
      Berlin : le séquenceur devient la structure du morceau. */
const DURATION_EXCEPTIONS: readonly { artist: string; title: string }[] = [
  { artist: 'Brian Eno', title: '1/1' },
  { artist: 'Kraftwerk', title: 'Autobahn' },
  { artist: 'Tangerine Dream', title: 'Phaedra' }
];

export const isDurationExempt = (artist: string, title: string): boolean =>
  DURATION_EXCEPTIONS.some(
    (x) => normalise(x.artist) === normalise(artist) && normalise(x.title) === normalise(title)
  );

export const isFullRelease = (
  title: string,
  seconds?: number | null,
  exempt = false
): boolean => {
  // Les marqueurs de parution priment sur tout, exception comprise.
  if (FULL_RELEASE_MARKERS.test(title)) return true;
  if (exempt) return false;
  if (seconds !== undefined && seconds !== null && seconds > MAX_TRACK_SECONDS) return true;
  return false;
};


/* LES NUMEROS D'ORDRE, QUE LA COUVERTURE DE MOTS IGNORE.

   « Living Torch II » a ete accepte pour « Living Torch I ». Les deux
   partagent tous leurs mots significatifs, le score de couverture est
   parfait, et le chiffre romain seul distingue deux pieces differentes.
   Meme piege avec « Pt. 1 » et « Pt. 2 », « Part One » et « Part Two »,
   « Dub I » et « Dub II ».

   La regle est stricte dans un seul sens : SI le titre cherche porte un
   numero, le candidat doit porter LE MEME. Un titre sans numero n'impose
   rien, sans quoi « Acid Tracks » refuserait toute video dont le titre
   contient une annee ou un numero de catalogue. */
const NUMERO_FINAL = /\b(?:pt\.?|part|no\.?|vol\.?)?\s*(i{1,3}v?|iv|vi{0,3}|ix|x|\d{1,2})\s*$/i;

const ROMAINS: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10
};

/** Numero d'ordre en fin de titre, ou null s'il n'y en a pas. */
export const numeroDOrdre = (title: string): number | null => {
  const m = NUMERO_FINAL.exec(title.trim());
  const brut = m?.[1]?.toLowerCase();
  if (!brut) return null;
  if (/^\d+$/.test(brut)) return Number(brut);
  return ROMAINS[brut] ?? null;
};

/** Vrai quand les numeros d'ordre se contredisent. */
export const numerosDiscordants = (voulu: string, candidat: string): boolean => {
  const a = numeroDOrdre(voulu);
  if (a === null) return false; // pas de numero cherche, rien a verifier
  const b = numeroDOrdre(candidat);
  return b !== null && b !== a;
};


/* LES VARIANTES NON DEMANDEES, ET LES SUBDIVISIONS.

   Meme famille de faute que les numeros d'ordre : la couverture de mots
   donne un score parfait a « Bladed » et « Bladed (Pardon Moi Remix) »,
   qui ne sont pas la meme piste. Un corpus canonique veut l'original quand
   c'est l'original qu'on cherche.

   LA REGLE EST ASYMETRIQUE, et c'est ce qui la rend sure. 35 entrees du
   corpus portent deja un remix dans leur titre canonique, « Darlyn Vlys,
   Bladed (Pardon Moi Remix) » par exemple : ces titres-la DEMANDENT le
   remix, et le candidat doit le porter. On ne rejette donc que ce que le
   titre cherche ne demande pas.

   DEUX MENTIONS NE SONT PAS DES VARIANTES et doivent passer :
   « Original Mix » designe la version canonique elle-meme, « Album
   Version » aussi. Les exclure reviendrait a refuser « Charlotte de Witte,
   Formula (Original Mix) », qui est exactement ce qu'on cherche.

   « live » et « remaster » sont volontairement absents : une captation est
   souvent la seule trace d'un morceau, et un remaster reste la meme prise.
   Les exclure appauvrirait le corpus sans rien corriger. */
const VARIANTE =
  /\b(?:remix|rmx|edit|dub|instrumental|acapella|a\s*cappella|rework|bootleg|mashup|vip|extended|reprise|cover|karaoke|version|mix|radio|club|acoustic)\b/i;

/** « Original Mix » et « Album Version » nomment la version canonique.

    Cette exception DOIT etre testee avant `VARIANTE`, qui contient desormais
    « version » et « mix » tout court. Ces deux mots ont ete ajoutes apres
    coup : « Zanov, Moebius 256 (Mr.eNeX Club Mix) » et « Towers Of Dub
    (Live 93 Version) » etaient passes, la liste ne couvrant que « remix » et
    « edit ». Un Club Mix n'est pas la piece de 1977, une Live Version n'est
    pas la version studio. */
const VARIANTE_NEUTRE = /\b(?:original\s+mix|album\s+version|original\s+version)\b/i;

/* Les subdivisions d'une oeuvre : Part, Vol, Chapter, et les faces A et B.
   « Selected Ambient Works Vol II » n'est pas « Vol I ». La face B d'un
   45 tours n'est pas la face A. */
const SUBDIVISION = /\b(?:part|pt\.?|vol\.?|volume|chapter|chapitre|side)\s*([a-z0-9ivx]+)\b/i;

const mentionsVariantes = (titre: string): Set<string> => {
  const out = new Set<string>();
  /* On ne regarde QUE l'interieur des parentheses et des crochets : c'est la
     ou se declarent les versions. « Dub Fi Gwan » de King Tubby porte « dub »
     dans son titre meme, ce n'est pas une variante. */
  for (const m of titre.matchAll(/[([]([^)\]]+)[)\]]/g)) {
    const dedans = m[1] ?? '';
    if (VARIANTE_NEUTRE.test(dedans)) continue;
    const v = VARIANTE.exec(dedans);
    if (v?.[0]) out.add(v[0].toLowerCase());
  }
  return out;
};

const subdivision = (titre: string): string | null =>
  SUBDIVISION.exec(titre)?.[1]?.toLowerCase() ?? null;

/** Vrai quand le candidat annonce une version ou une partie que le titre
    cherche ne demande pas, ou une autre partie que celle demandee. */
export const variantesDiscordantes = (voulu: string, candidat: string): boolean => {
  const dem = mentionsVariantes(voulu);
  for (const v of mentionsVariantes(candidat)) {
    if (!dem.has(v)) return true; // une version qu'on n'a pas demandee
  }
  const a = subdivision(voulu);
  if (a !== null) {
    const b = subdivision(candidat);
    if (b !== null && b !== a) return true; // Vol II pour Vol I
  }
  return false;
};


/* CE QUE LE CANDIDAT AJOUTE, ET NON SEULEMENT CE QU'IL CONTIENT.

   `coverage` mesure si les mots CHERCHES sont presents. Elle ne regarde
   jamais ce que le candidat apporte en plus, et c'est la cause structurelle
   des quatre derniers faux :

     « The Ride, Alec Empiree DIGITAL HARDCORE » pour « Digital Hardcore »
     « Harmonia, Deluxe, Walky Talky » pour « Deluxe »
     « Salem Witchcraft, Sandman, 1975 Private Press 45 Rock Ballad »
       pour « Sandman, Witchcraft »

   Les trois obtiennent un score de couverture parfait. Ce sont d'autres
   morceaux, et le signal est dans les mots EN TROP.

   LES MOTS DE BRUIT NE COMPTENT PAS. Un titre YouTube porte presque
   toujours « official video », « HD », « remastered », un numero de
   catalogue, une annee : ces mots ne disent rien de l'identite du morceau.
   Sans cette liste, « Charlotte de Witte, Formula (Original Mix)
   [KNTXT010] » serait rejete pour trois mots en trop qui n'en sont pas. */
const BRUIT =
  /^(?:official|officiel|video|videoclip|clip|audio|music|musique|hd|hq|4k|full|complete|the|and|feat|featuring|ft|with|avec|remaster|remastered|remasterise|original|album|single|ep|lp|records?|recordings?|rec|music|out|now|free|download|premiere|exclusive|vinyl|mix|version|edit|extended|radio|club|live|acoustic|instrumental|dub|track|song|new|best|top|classic|old|school|rare|unreleased|bonus|part|pt|vol|volume|no|nr|version|mp3|hq|lyrics?|subtitle[sd]?|visualizer|visualiser|teaser|bpm|special|film|movie|soundtrack|ost|from|taken|anniversary|edition|reissue|bootleg|promo|snippet|preview|hardcore|toppop)$/i;

/* LES COLLABORATEURS NE SONT PAS DES MOTS EN TROP.

   Premiere calibration, seuil a quatre : dix entrees du corpus tombaient,
   et les dix etaient JUSTES. « Tchami feat. Kaleem Taylor, Promesses »,
   « Tyler ICU & Tumelo.za, Mnike (Visualizer) ft. Ceeka RSA », « Lee Perry
   and The Upsetters, Blackboard Jungle Dub » : le nom d'un invite ou d'un
   co-auteur n'indique pas un autre morceau.

   Tout ce qui suit « feat », « ft », « featuring », « with », « pres »,
   « vs » est donc retire avant le comptage. */
const APRES_INVITE = /\b(?:feat|ft|featuring|with|avec|pres|presents|vs|versus)\b[\s\S]*$/i;

/** Mots significatifs, hors bruit, hors chiffres, hors invites. */
const motsUtiles = (texte: string): string[] =>
  normalise(texte.replace(APRES_INVITE, ' '))
    .split(' ')
    .filter((w) => w.length > 2 && !BRUIT.test(w) && !/^\d+$/.test(w));

/** Combien de mots significatifs le candidat ajoute a ce qu'on cherchait.

    On compare au titre ET a l'artiste reunis : « Psykovsky, Kashyyyk &
    Fractal Gauchos, Tanetsveta » ajoute des noms de collaborateurs, et ce
    sont des mots en trop legitimes. C'est pourquoi le seuil ne peut pas
    etre a zero, et c'est pourquoi il a ete calibre sur le corpus reel
    plutot que choisi. */
export const motsEnTrop = (artist: string, title: string, candidat: string): number => {
  const attendus = new Set([...motsUtiles(artist), ...motsUtiles(title)]);
  return motsUtiles(candidat).filter((w) => !attendus.has(w)).length;
};

/* LE SEUIL, ET CE QU'IL NE FAIT PAS.

   Calibre sur 200 entrees reelles du corpus, titres YouTube mesures, et sur
   les 47 faux des trois passes de remplacement. Distribution du corpus :
   64 % a zero mot en trop, 91 % a deux ou moins, 98,5 % a quatre ou moins.

   LES DEUX DISTRIBUTIONS SE CHEVAUCHENT, et aucun seuil ne les separe.
   « Human Mesh Dance (Taylor Deupree), Dahlia » compte SIX mots en trop et
   c'est la bonne video, le nom civil de l'artiste etant ajoute. « The Ride,
   Alec Empiree DIGITAL HARDCORE » n'en compte que DEUX et c'est un autre
   morceau.

   CINQ est retenu, et le chemin pour y arriver compte autant que la valeur.

   A quatre, DIX entrees du corpus tombaient et les dix etaient JUSTES :
   « Tchami feat. Kaleem Taylor », « Lee Perry and The Upsetters »,
   « Tyler ICU & Tumelo.za ft. Ceeka RSA ». Le comptage prenait les invites
   pour du bruit. Ils sont desormais retires avant de compter, ce qui a fait
   passer le corpus de 91 % a 95 % sous deux mots en trop.

   Meme apres cette correction, aucun seuil ne separe proprement. A cinq, une
   seule entree du corpus tombe sur deux cents, « Human Mesh Dance (Taylor
   Deupree), Dahlia », ou le nom civil de l'artiste est ajoute. Le filtre
   ecarte « Salem Witchcraft » (6) et « Shards Of Pol Pottery » (5), et
   laisse passer « The Ride, DIGITAL HARDCORE » et « Deluxe, Walky Talky »,
   qui ne comptent que deux mots en trop.

   CE FILTRE REDUIT LE TAUX D'ERREUR, IL NE L'ANNULE PAS. Le dire est plus
   utile que de laisser croire a une garantie : la verification par mesure de
   chaque remplacant reste une etape du chantier, pas une precaution. */
export const MAX_MOTS_EN_TROP = 5;

/** Le verdict, avec ses deux scores : un rejet doit être explicable. */
export const judge = (
  candidate: Candidate,
  artist: string,
  title: string,
  seconds?: number | null
): Verdict => {
  const haystack = new Set(normalise(`${candidate.title} ${candidate.channel}`).split(' ').filter(Boolean));
  const titleScore = coverage(title, haystack);
  const artistScore = coverage(artist, haystack);
  const fullRelease = isFullRelease(candidate.title, seconds, isDurationExempt(artist, title));
  /* La nature prime sur les scores ET sur les exceptions de duree : une
     interview de Brian Eno sur 1/1 reste une interview. */
  const about = isAboutMusic(candidate.title);
  const numero = numerosDiscordants(title, candidate.title);
  const variante = variantesDiscordantes(title, candidate.title);
  const surplus = motsEnTrop(artist, title, candidate.title);
  return {
    ok:
      !fullRelease &&
      !about &&
      !numero &&
      !variante &&
      surplus < MAX_MOTS_EN_TROP &&
      titleScore >= TITLE_THRESHOLD &&
      artistScore >= ARTIST_THRESHOLD,
    titleScore,
    artistScore,
    fullRelease,
    about,
    numero,
    variante,
    surplus
  };
};

// ------------------------------------------------------------------ YouTube

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/* Espacement des recherches. YouTube coupe sans prévenir après une vingtaine
   de requêtes rapprochées : la page revient bien en 200 mais sans aucun
   résultat. Symptôme observé, 87 refus sur 105 lignes toutes trouvables, et le
   rapport disait « aucun résultat » là où il fallait lire « on nous a fermé la
   porte ». On espace donc, et on retente. */
const SEARCH_INTERVAL_MS = 1400;
let lastSearch = 0;

const pace = async (): Promise<void> => {
  const wait = SEARCH_INTERVAL_MS - (Date.now() - lastSearch);
  if (wait > 0) await sleep(wait);
  lastSearch = Date.now();
};

export interface SearchHit {
  id: string;
  /** Durée en secondes, lue sur la page de résultats. Null si absente. */
  seconds: number | null;
}

const parseLength = (text: string): number | null => {
  const parts = text.split(':').map((x) => Number.parseInt(x, 10));
  if (parts.some((x) => !Number.isFinite(x))) return null;
  return parts.reduce((acc, x) => acc * 60 + x, 0);
};

const scrape = (html: string, limit: number): SearchHit[] => {
  const out: SearchHit[] = [];
  const seen = new Set<string>();
  /* La page de résultats encode chaque vidéo dans un bloc videoRenderer qui
     porte l'identifiant ET la durée. On découpe sur ces blocs plutôt que de
     chercher les identifiants seuls : c'est la seule source de durée sans clé. */
  for (const chunk of html.split('"videoRenderer":{"videoId":"').slice(1)) {
    const id = chunk.slice(0, 11);
    if (!/^[A-Za-z0-9_-]{11}$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    /* PANNE SILENCIEUSE RÉPARÉE. L'ancienne expression n'autorisait qu'UN
       niveau d'accolades entre « lengthText » et « simpleText » :

         /"lengthText":\{(?:[^{}]|\{[^{}]*\})*?"simpleText":"([0-9:]+)"/

       Or YouTube en intercale DEUX, pour l'étiquette d'accessibilité :

         "lengthText":{"accessibility":{"accessibilityData":{"label":"4 minutes, 13 seconds"}},"simpleText":"4:13"}

       Résultat : plus aucune durée n'était extraite, donc le plafond de
       quinze minutes ne s'appliquait plus JAMAIS, et le rejet des parutions
       complètes ne tenait plus qu'aux marqueurs de titre. Mesuré sur 61
       candidats : 61 durées inconnues, zéro connue.

       La forme ci-dessous ne compte plus les accolades : elle prend le
       premier « simpleText » horaire dans une fenêtre courte. Moins fine,
       mais elle survivra au prochain remaniement de la page. */
    const m = /"lengthText":\{[\s\S]{0,300}?"simpleText":"([0-9:]+)"/.exec(chunk.slice(0, 3000));
    out.push({ id, seconds: m?.[1] ? parseLength(m[1]) : null });
    if (out.length >= limit) break;
  }
  return out;
};

/** Candidats pour une requête, avec leur durée. Aucun identifiant n'est jamais construit. */
/* COMPTEUR D'ÉCHECS RÉSEAU.

   `searchYouTube` rend un tableau vide dans DEUX cas que rien ne
   distinguait : « cette requête ne donne vraiment rien », et « on nous a
   fermé la porte quatre fois de suite ». L'appelant concluait « non
   résolu » dans les deux, et un blocage complet de YouTube produisait un
   rapport d'import parfaitement normal, du genre « 0 ajouté, 60 non
   résolus ».

   C'est le même défaut que le plafond de durée : une opération qui échoue
   sans le dire. Les appelants interrogent maintenant ce compteur et
   refusent de conclure quand il grimpe. */
export const reseau = { requetes: 0, echecs: 0 };

/** Part des requêtes qui n'ont jamais abouti. 0 quand rien n'a été tenté. */
export const tauxEchecReseau = (): number =>
  reseau.requetes === 0 ? 0 : reseau.echecs / reseau.requetes;

export const searchYouTube = async (query: string, limit = 4): Promise<SearchHit[]> => {
  reseau.requetes += 1;
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await pace();
    let html = '';
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }
      });
      if (res.ok) html = await res.text();
    } catch {
      html = '';
    }

    const found = scrape(html, limit);
    if (found.length > 0) return found;

    /* Zéro résultat peut vouloir dire deux choses : la requête ne donne
       vraiment rien, ou on nous a fermé la porte. Une page de résultats
       normale, même vide, contient le mot videoId quelque part ; une page de
       blocage ou de consentement, non. */
    if (html.includes('"videoId"')) return [];
    await sleep(4000 * (attempt + 1));
  }
  /* Quatre tentatives, aucune page exploitable : ce n'est pas une requête
     sans résultat, c'est une porte fermée. On le compte. */
  reseau.echecs += 1;
  return [];
};

/* oEmbed public, sans clé. Un 200 signifie que la vidéo existe ET qu'elle est
   embarquable, ce qui est exactement la condition de l'iframe. Un 403 veut dire
   que l'intégration est refusée : c'est un rejet, pas une erreur. */
export const oembed = async (videoId: string): Promise<Candidate | null> => {
  const target = encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${target}&format=json`, {
      headers: { 'User-Agent': UA }
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { title?: string; author_name?: string };
    return { title: body.title ?? '', channel: body.author_name ?? '' };
  } catch {
    return null;
  }
};

export interface Resolution {
  videoId: string;
  candidate: Candidate;
  verdict: Verdict;
}


/* ARTISTES A NOM ORDINAIRE : LA RECHERCHE AUTOMATIQUE EST DESACTIVEE.

   La lecon la plus reutilisable de la campagne de nettoyage. Seize entrees
   ont du etre retirees du corpus, et elles avaient toutes la meme cause :
   un artiste dont le nom est un mot courant.

     Final, Open              -> LPGA Highlights, Golf Channel
     Tandem, Tandem           -> How Fast Can a Tandem Bike Really Go
     Ocelot, Elephant         -> un documentaire animalier
     Curses, Incenser         -> un guide de jeu video Pokemon
     Outback, Outback         -> un film Netflix
     Shift, Coup de Grace     -> une partie de Dota
     Alpha Omega, Sinister    -> une bande dessinee Marvel
     Cezar, Salvatore         -> des brevets d'OVNI de la marine

   Aucun filtre ne les attrape, et c'est structurel : le score de couverture
   est PARFAIT, les mots cherches sont bien tous presents. Deux campagnes de
   recherche, la seconde avec le style musical dans la requete, n'ont produit
   qu'un seul candidat valable sur dix-sept. Elles ont propose une chanteuse
   pop pour du microhouse et un onduleur solaire pour du power electronics.

   CE QUI DECIDE DE L'INSCRIPTION DANS CETTE LISTE : le nom est un mot du
   langage courant ET n'a pas d'association musicale dominante. Portishead,
   The Orb, Four Tet et Bonobo portent aussi des mots ordinaires, mais toute
   recherche les trouve : ils ne sont pas ici. Air, Justice, Pole, Oval y
   sont, parce que le mot seul ramene autre chose aussi souvent que l'artiste.

   Verifier a la main coute moins cher que nettoyer apres coup, et empeche
   qu'une prochaine campagne remette du golf dans l'isolationism. */
export const ARTISTES_AMBIGUS: readonly string[] = [
  // Ceux qui ont reellement casse, retires du corpus.
  'final',
  'tandem',
  'ocelot',
  'curses',
  'outback',
  'shift',
  'alpha omega',
  'cezar',
  'gaudium',
  'grendel',
  'zha',
  'savage scream',
  'tribal vision',
  'sparkling wide pressure',
  // Mots courants sans dominance musicale, presents dans le corpus.
  'main',
  'we',
  'hyper',
  'dylan',
  'freq',
  'pole',
  'oval',
  'spectre',
  'radium',
  'scanner',
  'air',
  'justice',
  'osom',
  'chasis',
  'erang'
];

const AMBIGUS = new Set(ARTISTES_AMBIGUS);

/** Vrai quand le nom de l'artiste est trop courant pour etre cherche seul. */
export const estArtisteAmbigu = (artist: string): boolean =>
  AMBIGUS.has(artist.trim().toLowerCase());

/** Cherche puis vérifie. Renvoie null si rien ne passe le matcher. */
export const resolveTrack = async (
  artist: string,
  title: string
): Promise<{ hit: Resolution | null; rejected: Resolution[]; ambigu?: true }> => {
  const rejected: Resolution[] = [];
  /* NOM TROP COURANT : on ne cherche pas. Rendre `ambigu` plutot que
     simplement `null` permet a l'appelant de dire « verification manuelle
     requise » au lieu de « non resolu », qui sont deux choses differentes. */
  if (estArtisteAmbigu(artist)) return { hit: null, rejected, ambigu: true };
  for (const { id: videoId, seconds } of await searchYouTube(`${artist} ${title}`)) {
    const candidate = await oembed(videoId);
    if (!candidate) continue;
    const verdict = judge(candidate, artist, title, seconds);
    if (verdict.ok) return { hit: { videoId, candidate, verdict }, rejected };
    rejected.push({ videoId, candidate, verdict });
  }
  return { hit: null, rejected };
};
