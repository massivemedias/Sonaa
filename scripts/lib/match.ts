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
}

/** Le verdict, avec ses deux scores : un rejet doit être explicable. */
export const judge = (candidate: Candidate, artist: string, title: string): Verdict => {
  const haystack = new Set(normalise(`${candidate.title} ${candidate.channel}`).split(' ').filter(Boolean));
  const titleScore = coverage(title, haystack);
  const artistScore = coverage(artist, haystack);
  return {
    ok: titleScore >= TITLE_THRESHOLD && artistScore >= ARTIST_THRESHOLD,
    titleScore,
    artistScore
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

const scrape = (html: string, limit: number): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)) {
    const id = m[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= limit) break;
  }
  return out;
};

/** Identifiants candidats pour une requête. Aucun identifiant n'est jamais construit. */
export const searchYouTube = async (query: string, limit = 4): Promise<string[]> => {
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
  for (const videoId of await searchYouTube(`${artist} ${title}`)) {
    const candidate = await oembed(videoId);
    if (!candidate) continue;
    const verdict = judge(candidate, artist, title);
    if (verdict.ok) return { hit: { videoId, candidate, verdict }, rejected };
    rejected.push({ videoId, candidate, verdict });
  }
  return { hit: null, rejected };
};
