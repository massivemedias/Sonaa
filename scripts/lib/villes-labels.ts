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
  /** Le rang de sa ligne dans l'adresse : la premiere adresse d'une fiche
      est la principale, les suivantes sont d'anciens bureaux ou un
      distributeur. */
  readonly ligne?: number;
  /** Les noms plus longs du meme groupe qui le contiennent : si l'un d'eux
      est une ville, n'importe ou, celui-ci n'en est qu'un morceau (« York »
      dans « New York »). */
  readonly dans?: readonly string[];
  /** Les Etats americains ecrits sur la meme ligne (« OH »), pour
      departager les homonymes (Springfield). */
  readonly regions?: readonly string[];
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
  /** Le code de sa region chez GeoNames : l'Etat, aux Etats-Unis (« OH »). */
  readonly region?: string | null;
  /** Son nom principal est le nom lu, et non un ancien nom ou un nom
      etranger (« Northampton » est aussi un ancien nom d'Allentown). */
  readonly exact?: boolean;
  /** Le quartier par lequel on l'a trouvee (« Hollywood » pour Los Angeles). */
  readonly alias?: string;
}

/* LES PAYS, en anglais et en francais, tires de la table du moteur
   JavaScript : une zone MusicBrainz « Greece » n'est pas Greece, New York.
   Les villes-Etats restent des villes. */
const VILLES_ETATS = new Set(['SG', 'HK', 'MO', 'MC', 'LU', 'VA', 'GI']);
const CODES_PAR_NOM: ReadonlyMap<string, string> = (() => {
  const codes = new Map<string, string>();
  const lettres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const langues = ['en', 'fr', 'de', 'nl', 'es', 'it'].map((l) => new Intl.DisplayNames([l], { type: 'region' }));
  for (const a of lettres) {
    for (const b of lettres) {
      const code = a + b;
      for (const d of langues) {
        try {
          const nom = d.of(code);
          if (nom && nom !== code && !/\d/.test(nom)) codes.set(nom.toLowerCase(), code);
        } catch {
          /* code inconnu */
        }
      }
    }
  }
  const autres: Record<string, string> = {
    england: 'GB', scotland: 'GB', wales: 'GB', 'northern ireland': 'GB', angleterre: 'GB', écosse: 'GB', uk: 'GB',
    'u.k.': 'GB', 'great britain': 'GB', usa: 'US', 'u.s.a.': 'US', holland: 'NL', 'the netherlands': 'NL',
  };
  for (const [n, c] of Object.entries(autres)) codes.set(n, c);
  return codes;
})();
const NOMS_DE_PAYS: ReadonlySet<string> = new Set([
  ...[...CODES_PAR_NOM.entries()].filter(([, code]) => !VILLES_ETATS.has(code)).map(([nom]) => nom),
  'europe',
  'worldwide',
]);

/** LE PAYS QU'UNE ADRESSE ECRIT, pour un label dont la fiche n'a pas de
    pays : « Vancouver, British Columbia, Canada » donne CA. Null si
    l'adresse n'en nomme aucun, ou en nomme plusieurs. */
export function paysDuTexte(texte: string): string | null {
  const trouves = new Set<string>();
  const bas = ` ${texte.toLowerCase().replace(/[^\p{L}.]+/gu, ' ')} `;
  for (const [nom, code] of CODES_PAR_NOM) {
    if (nom.length < 4 && nom !== 'uk' && nom !== 'usa') continue;
    if (bas.includes(` ${nom} `)) trouves.add(code);
  }
  return trouves.size === 1 ? ([...trouves][0] ?? null) : null;
}

/* LES ETATS AMERICAINS, par leur nom et par leur code postal, pour lire
   « Springfield, Ohio 45501 » ou « Warren, MI 48093 ». */
const ETATS: Readonly<Record<string, string>> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
  delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI',
  minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
  'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};
const CODES_ETATS = new Set(Object.values(ETATS));

/** Les Etats americains nommes sur une ligne d'adresse. */
function etatsDeLaLigne(ligne: string): string[] {
  const res = new Set<string>();
  for (const m of ligne.matchAll(/\b([A-Z]{2})\b/g)) if (CODES_ETATS.has(m[1] ?? '')) res.add(m[1] ?? '');
  const bas = ligne.toLowerCase();
  for (const [nom, code] of Object.entries(ETATS)) if (new RegExp(`\\b${nom}\\b`).test(bas)) res.add(code);
  return [...res];
}

/* UN ETAT OU UNE PROVINCE N'EST PAS UNE VILLE, meme quand une ville porte
   son nom ailleurs (la zone MusicBrainz « Oregon » n'est pas Oregon, Ohio).
   New York et Washington restent des villes. */
const PROVINCES_CANADIENNES = new Set([
  'ontario', 'alberta', 'manitoba', 'saskatchewan', 'british columbia', 'nova scotia', 'new brunswick',
  'newfoundland', 'prince edward island', 'yukon', 'nunavut', 'northwest territories',
]);
const estUnEtat = (nom: string): boolean => {
  const n = nom.toLowerCase();
  return (n in ETATS && n !== 'new york' && n !== 'washington') || PROVINCES_CANADIENNES.has(n) || NOMS_DE_PAYS.has(n);
};

/* « QUEBEC » SEUL, DANS UNE ADRESSE OU UNE PHRASE, EST LA PROVINCE
   (« G0S 1K0 Quebec, Canada », « based in Quebec ») : la ville s'y ecrit
   « Québec (Québec) » ou « Quebec City ». */
const PROVINCES_HOMONYMES = new Set(['quebec', 'québec']);

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
    /* et les immeubles : « 1F Sakura Bld. », « Shaftesbury Centre » */
    'bld', 'bldg', 'building', 'centre', 'center', 'tower', 'towers', 'estate', 'mansion', 'mansions', 'heights',
    'hall', 'works', 'business', 'industrial', 'trading',
  ]
);
/* Les mots qui peuvent entrer dans un nom de ville (« New York », « North
   Shields ») mais n'en sont jamais une a eux seuls : les points cardinaux,
   les mois (« Current in March, 2009 »). */
const JAMAIS_SEULS = new Set(
  [
    'north', 'south', 'east', 'west', 'new', 'old', 'great', 'little', 'upper', 'lower', 'central', 'saint', 'san',
    'santa', 'city', 'town', 'county', 'state', 'district', 'region', 'province', 'current', 'since', 'address',
    'adresse', 'obsolete',
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november',
    'december', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre',
    'novembre', 'décembre', 'januar', 'februar', 'märz', 'juni', 'juli', 'oktober', 'dezember',
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
    /* les intitules d'un formulaire de contact : « Name: », « Website: » */
    'name', 'nom', 'website', 'web', 'site', 'country', 'pays', 'zip', 'postcode', 'telephone', 'téléphone',
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
      if (g.length === 1 && JAMAIS_SEULS.has(premier.toLowerCase())) continue;
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

/** Les noms plus longs d'une liste qui contiennent celui-ci, mot pour mot. */
function contenantsDe(nom: string, tous: readonly string[]): string[] {
  const mots = ` ${nom} `;
  return tous.filter((x) => x !== nom && ` ${x} `.includes(mots));
}

/** Les candidats d'une adresse de contact Discogs. */
export function lieuxDuContact(contact: string): Candidat[] {
  const vus = new Map<string, Candidat>();
  let numero = -1;
  for (const brute of contact.split(/\r?\n/)) {
    const ligne = brute
      .replace(/\S+@\S+/g, ' ')
      .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
      .replace(/\+?\d[\d ().-]{6,}\d/g, ' 0 ')
      .trim();
    if (!ligne) continue;
    numero += 1;
    const force = /\d/.test(ligne) ? 2 : 1;
    const etats = etatsDeLaLigne(ligne);
    for (const morceau of ligne.split(/[,;/|]/)) {
      for (const { mots, avant, apres } of suites(morceau)) {
        const groupe = sousGroupes(mots, avant, apres);
        for (const nom of groupe) {
          if (PROVINCES_HOMONYMES.has(nom.toLowerCase())) continue;
          const deja = vus.get(nom);
          if (!deja || deja.force < force) {
            vus.set(nom, {
              nom,
              rang: 1,
              force,
              ligne: numero,
              dans: contenantsDe(nom, groupe),
              ...(etats.length > 0 ? { regions: etats } : {}),
            });
          }
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
  const groupes: string[][] = [];
  for (const m of texte.matchAll(APRES_TOURNURE)) {
    const mots = (m[1] ?? '').split(/\s+/).map(nettoyerMot).filter(Boolean);
    const groupe: string[] = [];
    for (let n = mots.length; n >= 1; n -= 1) {
      const g = mots.slice(0, n);
      if (LIAISONS.has(g[g.length - 1] ?? '') || g.some((x) => JAMAIS.has(x.toLowerCase()))) continue;
      if (PROVINCES_HOMONYMES.has(g.join(' ').toLowerCase())) continue;
      if (g.length === 1 && JAMAIS_SEULS.has((g[0] ?? '').toLowerCase())) continue;
      noms.add(g.join(' '));
      groupe.push(g.join(' '));
    }
    groupes.push(groupe);
  }
  for (const m of texte.matchAll(AVANT_BASED)) {
    const mots = (m[1] ?? '').split(/[\s-]+/).map(nettoyerMot).filter(Boolean);
    const groupe: string[] = [];
    for (let n = mots.length; n >= 1; n -= 1) {
      const g = mots.slice(mots.length - n);
      if (g.some((x) => JAMAIS.has(x.toLowerCase()))) continue;
      if (PROVINCES_HOMONYMES.has(g.join(' ').toLowerCase())) continue;
      if (g.length === 1 && JAMAIS_SEULS.has((g[0] ?? '').toLowerCase())) continue;
      noms.add(g.join(' '));
      groupe.push(g.join(' '));
    }
    groupes.push(groupe);
  }
  return [...noms].map((nom) => ({
    nom,
    rang: 3,
    force: 1,
    dans: [...new Set(groupes.flatMap((g) => (g.includes(nom) ? contenantsDe(nom, g) : [])))],
  }));
}

/* EN DESSOUS DE CINQ MILLE HABITANTS, un nom d'adresse est plus souvent un
   hameau homonyme (« Box », dans le Wiltshire) que la ville du label. */
const POPULATION_MIN = 5000;

/** La ville retenue parmi les candidats : la meilleure source qui en designe
    une dans le pays du label ; dans une adresse, la premiere ligne qui en
    designe une ; et sur cette ligne, la localite la plus peuplee (la ville
    plutot que son quartier). Un pays inconnu n'ecarte rien. Null si aucune
    source ne designe une localite sure. */
export function choisirVille(
  candidats: readonly Candidat[],
  localites: ReadonlyMap<string, readonly Localite[]>,
  iso: string | null
): { readonly localite: Localite; readonly candidat: Candidat } | null {
  const ordonnes = [...candidats].sort((a, b) => a.rang - b.rang || b.force - a.force || (a.ligne ?? 0) - (b.ligne ?? 0));
  /* Un nom plus long qui est une ville, dans n'importe quel pays. */
  const estUneVille = (nom: string): boolean => (localites.get(nom) ?? []).some((l) => l.pop >= POPULATION_MIN);
  let palier: { rang: number; force: number; ligne: number } | null = null;
  let meilleur: { localite: Localite; candidat: Candidat } | null = null;
  for (const c of ordonnes) {
    if (palier && (c.rang !== palier.rang || c.force !== palier.force || (c.ligne ?? 0) !== palier.ligne)) {
      if (meilleur) break;
      palier = null;
    }
    palier ??= { rang: c.rang, force: c.force, ligne: c.ligne ?? 0 };
    if (c.dans?.some(estUneVille) || estUnEtat(c.nom)) continue;
    for (const l of possiblesDe(c, localites, iso)) {
      if (!meilleur || l.pop > meilleur.localite.pop) meilleur = { localite: l, candidat: c };
    }
  }
  return meilleur ? avecSaGrandeVille(meilleur, ordonnes, localites, iso) : null;
}

/* UN HOMONYME CINQUANTE FOIS PLUS PEUPLE A L'ETRANGER rend le nom ambigu :
   une adresse « London » sur une fiche dont le pays moissonne est faux ne
   fait pas de Novamute un label de London, Kentucky (mille fois plus
   petite que Londres). London, en Ontario, vingt fois plus petite, reste
   possible. Sauf si la ligne nomme l'Etat (« London, KY »). */
const ECART_AMBIGU = 50;

/** Les localites qu'un candidat peut designer : assez peuplees, dans le pays
    du label, dans l'Etat americain ecrit sur sa ligne quand il y en a un, de
    preference sous leur nom principal, et sans homonyme ecrasant ailleurs. */
function possiblesDe(c: Candidat, localites: ReadonlyMap<string, readonly Localite[]>, iso: string | null): readonly Localite[] {
  const toutes = (localites.get(c.nom) ?? []).filter((l) => l.pop >= POPULATION_MIN);
  let possibles = toutes.filter((l) => !(iso && l.iso && l.iso !== iso));
  /* SANS PAYS CONNU, le nom doit designer un seul pays, ou un pays cinquante
     fois plus peuple que les autres : « Hanover » est en Allemagne et dans
     six Etats americains. */
  if (!iso && !c.regions?.length) {
    const parPays = new Map<string, number>();
    for (const l of toutes) parPays.set(l.iso ?? '', Math.max(parPays.get(l.iso ?? '') ?? 0, l.pop));
    const [premier, second] = [...parPays.entries()].sort((a, b) => b[1] - a[1]);
    if (second && premier && premier[1] < second[1] * ECART_AMBIGU) return [];
    if (premier) possibles = toutes.filter((l) => (l.iso ?? '') === premier[0]);
  }
  /* Un Etat ecrit sur la ligne est une contrainte, pas une preference :
     « Hollywood, CA » n'est pas Hollywood, en Floride. */
  if (c.regions?.length) possibles = possibles.filter((l) => l.iso !== 'US' || (l.region && c.regions?.includes(l.region)));
  const exactes = possibles.filter((l) => l.exact);
  if (exactes.length > 0) possibles = exactes;
  if (possibles.length === 0) return [];
  const ici = Math.max(...possibles.map((l) => l.pop));
  const ailleurs = Math.max(0, ...toutes.filter((l) => !possibles.includes(l)).map((l) => l.pop));
  if (!c.regions?.length && ailleurs > ici * ECART_AMBIGU) return [];
  return possibles;
}

const RAYON_AGGLOMERATION_KM = 12;
function distanceKm(a: Localite, b: Localite): number {
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  return Math.hypot(x, (b.lat - a.lat) * r) * 6371;
}

/** UN QUARTIER CEDE A SA GRANDE VILLE quand la meme source les nomme tous
    les deux : « Mejiro », a cinq kilometres du centre de Tokyo, devient
    Tokyo. Seulement a moins de douze kilometres : Zoersel, a dix-sept de
    Deurne, reste Zoersel. */
function avecSaGrandeVille(
  choix: { readonly localite: Localite; readonly candidat: Candidat },
  candidats: readonly Candidat[],
  localites: ReadonlyMap<string, readonly Localite[]>,
  iso: string | null
): { readonly localite: Localite; readonly candidat: Candidat } {
  let meilleur = choix;
  for (const c of candidats) {
    if (c.rang !== choix.candidat.rang || estUnEtat(c.nom) || c.dans?.some((d) => (localites.get(d) ?? []).some((l) => l.pop >= POPULATION_MIN))) continue;
    for (const l of possiblesDe(c, localites, iso)) {
      if (l.pop > meilleur.localite.pop && distanceKm(l, choix.localite) < RAYON_AGGLOMERATION_KM) meilleur = { localite: l, candidat: c };
    }
  }
  return meilleur;
}
