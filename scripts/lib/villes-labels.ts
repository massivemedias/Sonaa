/* LES LECTURES DE LIEU DE scripts/completer-villes-labels.ts, a part pour
   etre testees sans reseau.

   Deux sortes de texte disent ou est un label :
   - l'adresse de contact de Discogs, ligne par ligne (« 10965 Berlin »,
     « London NW5 1GL ») : tout groupe de mots a majuscule y est un candidat,
     sauf le nom d'une rue (« London Road ») ;
   - une presentation, mais seulement par une tournure qui dit le lieu
     (« based in Leeds », « a Leeds-based label », « basé à Lyon »). Un nom
     de ville cite au passage (« remixes by a Berlin producer ») ne compte
     pas.
   Un candidat n'est qu'un nom : il ne devient une ville que si Wikidata le
   connait comme localite du pays du label (voir choisirVille). */

export interface Candidat {
  readonly nom: string;
  /** La source, de la plus sure a la moins sure : 1 l'adresse de contact,
      2 la zone MusicBrainz, 3 une phrase de presentation. */
  readonly rang: number;
  /** Dans une adresse, la ligne qui porte un code postal passe devant. */
  readonly force: number;
}

export interface Localite {
  readonly id: string;
  readonly fr: string | null;
  readonly en: string | null;
  readonly lat: number;
  readonly lng: number;
  readonly pop: number;
  /** Le code ISO du pays de la localite. */
  readonly iso: string | null;
}

/* Les mots qui font d'un nom de ville un nom de rue quand ils le suivent ou
   le precedent : « London Road », « rue de Lyon », « Via Roma ». */
const RUES = new Set(
  [
    'road', 'rd', 'street', 'st', 'avenue', 'ave', 'av', 'lane', 'ln', 'way', 'drive', 'dr', 'close', 'place', 'pl',
    'square', 'sq', 'terrace', 'gardens', 'crescent', 'court', 'ct', 'boulevard', 'blvd', 'bd', 'row', 'walk', 'mews',
    'parade', 'grove', 'strasse', 'straße', 'str', 'weg', 'platz', 'allee', 'gasse', 'damm', 'ufer', 'rue', 'chemin',
    'quai', 'impasse', 'allée', 'calle', 'carrer', 'via', 'viale', 'piazza', 'corso', 'rua', 'avenida', 'praça',
    'straat', 'laan', 'plein', 'kade', 'gracht', 'gade', 'vej', 'gatan', 'vägen', 'gata', 'katu', 'ulica', 'utca',
    'strada', 'highway', 'hwy', 'pike', 'circle', 'plaza',
  ]
);
/* Les mots qui ne sont jamais une ville, dans une adresse ou une phrase. */
const JAMAIS = new Set(
  [
    'records', 'recordings', 'record', 'music', 'musique', 'musik', 'label', 'labels', 'ltd', 'limited', 'inc', 'llc',
    'gmbh', 'bv', 'sarl', 'sas', 'srl', 'ab', 'oy', 'as', 'aps', 'studio', 'studios', 'box', 'po', 'p.o.', 'unit',
    'suite', 'floor', 'house', 'building', 'mail', 'email', 'e-mail', 'tel', 'phone', 'fax', 'mobile', 'contact',
    'contacts', 'demos', 'demo', 'info', 'booking', 'bookings', 'distribution', 'management', 'promo', 'press',
    'office', 'licensing', 'sync', 'publishing', 'general', 'enquiries', 'inquiries', 'attn', 'c/o', 'the', 'and',
    'for', 'please', 'send', 'only', 'no', 'not', 'all', 'our', 'we', 'us', 'uk', 'usa', 'eu',
  ]
);
const LIAISONS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'del', 'della', 'di', 'am', 'an', 'der', 'upon', 'on', 'sur', 'en', 'im', 'aan', 'den', 'sous', 'lès', 'les']);

/** Un mot tout en capitales de quatre lettres ou plus reprend une casse de
    nom (« BERLIN » devient « Berlin ») ; plus court, c'est un sigle ou un
    morceau de code postal (« UK », « NW5 »), on le laisse tomber. */
function casse(mot: string): string | null {
  if (/\d/.test(mot)) return null;
  if (mot === mot.toUpperCase() && /\p{Lu}/u.test(mot)) {
    if (mot.replace(/[^\p{L}]/gu, '').length < 4) return null;
    return mot
      .toLowerCase()
      .replace(/(^|[-' ])(\p{L})/gu, (_t, a: string, b: string) => a + b.toUpperCase());
  }
  return mot;
}

const commenceParMajuscule = (mot: string): boolean => /^\p{Lu}/u.test(mot);
const nettoyerMot = (mot: string): string => mot.replace(/^[("'«“]+|[)"'»”.,;:!?]+$/g, '');

/** Les suites de mots a majuscule d'un morceau de texte, liaisons comprises
    (« Newcastle upon Tyne », « Frankfurt am Main »). */
function suites(texte: string): { readonly mots: string[]; readonly avant: string | null; readonly apres: string | null }[] {
  const brut = texte.split(/\s+/).map(nettoyerMot).filter(Boolean);
  const res: { mots: string[]; avant: string | null; apres: string | null }[] = [];
  let i = 0;
  while (i < brut.length) {
    const premier = casse(brut[i] ?? '');
    if (!premier || !commenceParMajuscule(premier)) {
      i += 1;
      continue;
    }
    const mots = [premier];
    let j = i + 1;
    while (j < brut.length) {
      const m = brut[j] ?? '';
      const c = casse(m);
      if (c && commenceParMajuscule(c)) {
        mots.push(c);
        j += 1;
      } else if (LIAISONS.has(m.toLowerCase()) && j + 1 < brut.length && commenceParMajuscule(casse(brut[j + 1] ?? '') ?? '')) {
        mots.push(m.toLowerCase());
        j += 1;
      } else break;
    }
    res.push({ mots, avant: i > 0 ? (brut[i - 1] ?? null) : null, apres: j < brut.length ? (brut[j] ?? null) : null });
    i = j;
  }
  return res;
}

const estRue = (mot: string | null | undefined): boolean => Boolean(mot && RUES.has(mot.toLowerCase().replace(/\.$/, '')));

/** Les sous-groupes contigus d'une suite, du plus long au plus court, sans
    liaison au bord ni mot interdit, et sans ceux qui touchent un mot de rue. */
function sousGroupes(mots: readonly string[], avant: string | null, apres: string | null, max = 4): string[] {
  const res: string[] = [];
  for (let long = Math.min(max, mots.length); long >= 1; long -= 1) {
    for (let d = 0; d + long <= mots.length; d += 1) {
      const g = mots.slice(d, d + long);
      const premier = g[0] ?? '';
      const dernier = g[g.length - 1] ?? '';
      if (LIAISONS.has(premier) || LIAISONS.has(dernier)) continue;
      if (g.some((m) => JAMAIS.has(m.toLowerCase()))) continue;
      const voisinAvant = d > 0 ? mots[d - 1] : avant;
      const voisinApres = d + long < mots.length ? mots[d + long] : apres;
      if (estRue(voisinApres) || estRue(voisinAvant) || g.some((m) => estRue(m))) continue;
      /* « rue de Lyon » : la liaison avant le groupe, et la rue avant elle. */
      if (d === 0 && avant && LIAISONS.has(avant.toLowerCase())) continue;
      res.push(g.join(' '));
    }
  }
  return res;
}

/** Les candidats d'une adresse de contact Discogs. */
export function lieuxDuContact(contact: string): Candidat[] {
  const vus = new Map<string, Candidat>();
  for (const brute of contact.split(/\r?\n/)) {
    const ligne = brute
      .replace(/\S+@\S+/g, ' ')
      .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
      .replace(/\+?\d[\d ().-]{6,}\d/g, ' 0 ')
      .trim();
    if (!ligne) continue;
    const force = /\d/.test(ligne) ? 2 : 1;
    for (const morceau of ligne.split(/[,;/|]/)) {
      for (const { mots, avant, apres } of suites(morceau)) {
        for (const nom of sousGroupes(mots, avant, apres)) {
          const deja = vus.get(nom);
          if (!deja || deja.force < force) vus.set(nom, { nom, rang: 1, force });
        }
      }
    }
  }
  return [...vus.values()];
}

/* LES TOURNURES QUI DISENT OU EST UN LABEL, en anglais et en francais. Le
   groupe capture commence au premier mot du lieu. */
const APRES_TOURNURE =
  /\b(?:based (?:in|out of)|headquartered in|located in|operating (?:from|out of)|run (?:from|out of)|label (?:from|in)|imprint (?:from|in)|company (?:from|in)|bas[ée]e?s? (?:à|a|en|dans)|établie?s? (?:à|a)|install[ée]e?s? (?:à|a)|implant[ée]e?s? (?:à|a)|situ[ée]e?s? (?:à|a)|fond[ée]e?s? (?:à|a)|originaire de)\s+((?:\p{Lu}[\p{L}'’.-]*)(?:\s+(?:(?:de|du|des|la|le|del|di|am|upon|on|sur|en)\s+)?\p{Lu}[\p{L}'’.-]*){0,3})/gu;
const AVANT_BASED = /((?:\p{Lu}[\p{L}'’.]*)(?:[\s-]\p{Lu}[\p{L}'’.]*){0,3})[-\s]based\b/gu;

/** Les candidats d'une presentation : seulement ce qu'une tournure de lieu
    designe. Pour « based in New York City », on essaie « New York City »,
    « New York », puis « New ». */
export function lieuxDuTexte(texte: string): Candidat[] {
  const noms = new Set<string>();
  for (const m of texte.matchAll(APRES_TOURNURE)) {
    const mots = (m[1] ?? '').split(/\s+/).map(nettoyerMot).filter(Boolean);
    for (let n = mots.length; n >= 1; n -= 1) {
      const g = mots.slice(0, n);
      if (LIAISONS.has(g[g.length - 1] ?? '') || g.some((x) => JAMAIS.has(x.toLowerCase()))) continue;
      noms.add(g.join(' '));
    }
  }
  for (const m of texte.matchAll(AVANT_BASED)) {
    const mots = (m[1] ?? '').split(/[\s-]+/).map(nettoyerMot).filter(Boolean);
    for (let n = mots.length; n >= 1; n -= 1) {
      const g = mots.slice(mots.length - n);
      if (g.some((x) => JAMAIS.has(x.toLowerCase()))) continue;
      noms.add(g.join(' '));
    }
  }
  return [...noms].map((nom) => ({ nom, rang: 3, force: 1 }));
}

/* EN DESSOUS DE CINQ MILLE HABITANTS, un nom d'adresse est plus souvent un
   hameau homonyme (« Box », dans le Wiltshire) que la ville du label. */
const POPULATION_MIN = 5000;

/** La ville retenue parmi les candidats : la meilleure source qui en designe
    une dans le pays du label, et dans cette source la localite la plus
    peuplee. Un pays inconnu n'ecarte rien. Null si aucune source ne
    designe une localite sure. */
export function choisirVille(
  candidats: readonly Candidat[],
  localites: ReadonlyMap<string, readonly Localite[]>,
  iso: string | null
): { readonly localite: Localite; readonly candidat: Candidat } | null {
  const ordonnes = [...candidats].sort((a, b) => a.rang - b.rang || b.force - a.force);
  let palier: { rang: number; force: number } | null = null;
  let meilleur: { localite: Localite; candidat: Candidat } | null = null;
  for (const c of ordonnes) {
    if (palier && (c.rang !== palier.rang || c.force !== palier.force)) {
      if (meilleur) return meilleur;
      palier = null;
    }
    palier ??= { rang: c.rang, force: c.force };
    for (const l of localites.get(c.nom) ?? []) {
      if (l.pop < POPULATION_MIN) continue;
      if (iso && l.iso && l.iso !== iso) continue;
      if (!meilleur || l.pop > meilleur.localite.pop) meilleur = { localite: l, candidat: c };
    }
  }
  return meilleur;
}
