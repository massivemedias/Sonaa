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
  return {
    ok: !fullRelease && titleScore >= TITLE_THRESHOLD && artistScore >= ARTIST_THRESHOLD,
    titleScore,
    artistScore,
    fullRelease
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

/** Cherche puis vérifie. Renvoie null si rien ne passe le matcher. */
export const resolveTrack = async (
  artist: string,
  title: string
): Promise<{ hit: Resolution | null; rejected: Resolution[] }> => {
  const rejected: Resolution[] = [];
  for (const { id: videoId, seconds } of await searchYouTube(`${artist} ${title}`)) {
    const candidate = await oembed(videoId);
    if (!candidate) continue;
    const verdict = judge(candidate, artist, title, seconds);
    if (verdict.ok) return { hit: { videoId, candidate, verdict }, rejected };
    rejected.push({ videoId, candidate, verdict });
  }
  return { hit: null, rejected };
};
