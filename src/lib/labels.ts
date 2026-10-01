/* LES LABELS : CE QUE LA MOISSON ECRIT, CE QUE LA PAGE LIT.
 *
 * Mika, le 1er octobre 2026, en cherchant « F communications » : « j'aimerais
 * avoir comme resultat en premier une sorte de page avec le label connu et
 * toutes les explications, ainsi que certaines tracks les mieux notees ».
 *
 * La fiche d'un label est moissonnee une fois par mois (scripts/
 * moissonner-labels.ts) : Wikidata pour les faits (pays, annee, fondateurs,
 * site), Wikipedia pour la presentation, Discogs pour les sorties que la
 * communaute possede le plus. Les morceaux du label que l'atlas contient, eux,
 * ne sont pas recopies : la page les retrouve dans le corpus par le nom du
 * label, avec cleDeLabel. Une seule regle de comparaison des deux cotes. */

export interface SortieConnue {
  readonly titre: string;
  readonly artiste: string;
  readonly annee: number | null;
  /** Le nombre de personnes qui l'ont dans leur collection chez Discogs. */
  readonly possedee: number;
  /** Classee en musique electronique chez Discogs. */
  readonly electronique?: boolean;
  readonly image: string | null;
  readonly url: string;
}

export interface FicheLabel {
  readonly slug: string;
  readonly nom: string;
  /** Les graphies du nom dans le corpus, pour y retrouver ses morceaux. */
  readonly cles: readonly string[];
  /** Les adresses d'une graphie fondue dans celle-ci, qui renvoient ici. */
  readonly anciens?: readonly string[];
  /** Le nombre de morceaux du label dans l'atlas, au moment de la moisson. */
  readonly n: number;
  readonly pays: string | null;
  readonly annee: number | null;
  readonly fondateurs: readonly string[];
  readonly site: string | null;
  readonly wiki: { readonly fr?: string; readonly en?: string };
  readonly resume: { readonly fr?: string; readonly en?: string };
  /** La presentation de Discogs, en anglais, quand Wikipedia n'en a pas. */
  readonly profil: string | null;
  readonly discogs: string | null;
  readonly sorties: readonly SortieConnue[];
  /** L'element Wikidata, « Q123 ». */
  readonly wikidata?: string | null;
  /** Le logo : Wikimedia Commons d'abord (licence libre, credit), l'image
      du label chez Discogs sinon. */
  readonly logo?: LogoLabel | null;
}

export interface LogoLabel {
  readonly url: string;
  readonly source: 'commons' | 'discogs';
  readonly credit: string | null;
  readonly page: string | null;
}

/** La forme sur laquelle on compare deux noms de label : sans accents, sans
    ponctuation, « & » lu « and ». « R & S Records » et « R&S Records » sont
    le meme label. */
export function cleDeLabel(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Le nom qui n'est pas un label : un disque sans label, ou auto-produit. */
export function estSansLabel(nom: string): boolean {
  const c = cleDeLabel(nom);
  return c === '' || c.startsWith('not on label') || c === 'self released' || c === 'white label';
}

/** Une ligne de l'index de recherche (src/data/labels-index.json). */
export interface EntreeLabel {
  /** L'adresse : #/labels/<s>. */
  readonly s: string;
  readonly n: string;
  readonly k: readonly string[];
  /** Le nombre de morceaux dans l'atlas. */
  readonly c: number;
  readonly p: string | null;
  readonly a: number | null;
  /** L'adresse du logo, pour la galerie et la recherche. */
  readonly l?: string | null;
  /** Son succes (voir succes) : pour ranger la galerie. */
  readonly r?: number;
}

/** Les labels que la recherche montre EN PREMIER : ceux dont le nom commence
    par ce qu'on a tape, ou qui l'egale. A partir de trois lettres, sinon
    « wa » ouvrirait Warp a chaque frappe. Le nom exact passe devant, puis
    le label le plus present dans l'atlas. */
const sansSuffixe = (k: string): string => k.replace(/ (records|recordings|music|label)$/, '');

export function labelsPourRecherche(requete: string, index: readonly EntreeLabel[]): readonly EntreeLabel[] {
  const q = cleDeLabel(requete);
  if (q.length < 3) return [];
  return index
    .map((e) => {
      const exact = e.k.some((k) => k === q || sansSuffixe(k) === q);
      const debut = e.k.some((k) => k.startsWith(q));
      return exact ? { e, note: 2 } : debut ? { e, note: 1 } : null;
    })
    .filter((x): x is { e: EntreeLabel; note: number } => x !== null)
    .sort((a, b) => b.note - a.note || b.e.c - a.e.c)
    .slice(0, 2)
    .map((x) => x.e);
}

/* LES MAJORS NE SONT PAS DES INCONTOURNABLES DE L'ATLAS. Classes par leurs
   disques les plus possedes, Republic, EMI, Sony ou Warner passaient devant
   Warp et Tresor (vu le 1er octobre 2026) : ils sortent de tout, et d'abord
   de la pop. Ils restent dans la galerie, mais pas en tete. La liste est
   celle des grandes maisons et de leurs etiquettes historiques. */
const MAJORS = new Set(
  [
    'columbia', 'emi', 'parlophone', 'sony music', 'sony music entertainment', 'warner music', 'warner bros records', 'warner records',
    'republic records', 'atlantic', 'atlantic records', 'virgin', 'virgin records', 'polydor', 'island records', 'capitol records',
    'rca', 'rca records', 'rca victor', 'epic', 'epic records', 'mercury', 'mercury records', 'universal music', 'universal music group',
    'interscope records', 'elektra', 'elektra records', 'arista', 'arista records', 'decca', 'decca records', 'def jam recordings',
    'geffen records', 'a and m records', 'motown', 'emi records', 'bmg', 'bmg rights management', 'sire records', 'reprise records',
    'because music', 'columbia records', 'cbs', 'philips', 'ariola', 'aftermath entertainment', 'republic',
    /* et leurs filiales */
    'wea', 'sire', 'mca records', 'jive', 'jive records', 'london records', 'barclay', 'sony soho square', 'go beat', 'maverick',
    'wea japan', 'warner music denmark', 'universal music france', 'universal music tv',
  ].map(cleDeLabel)
);

export function estMajor(e: Pick<EntreeLabel, 'k'>): boolean {
  return e.k.some((k) => MAJORS.has(k));
}

/* LE SUCCES D'UN LABEL : combien de collectionneurs ont ses sorties
   electroniques les plus possedees chez Discogs, additionne. Mika, le 1er
   octobre 2026 : « dans le top je veux les labels qui fonctionnent le mieux,
   tout style confondu ». La somme plutot que le seul disque le plus possede :
   un catalogue qui marche compte plus qu'un tube isole. Les sorties hors
   electronique ne comptent pas, sinon un label de rap passerait devant. */
export function succes(f: Pick<FicheLabel, 'sorties'>): number {
  return f.sorties.reduce((somme, s) => somme + (s.electronique ? s.possedee : 0), 0);
}

/** L'ordre de la galerie : le succes d'abord, puis la presence dans
    l'atlas, puis le nom. */
export function ordreDeNotoriete(a: EntreeLabel, b: EntreeLabel): number {
  return (b.r ?? 0) - (a.r ?? 0) || b.c - a.c || a.n.localeCompare(b.n);
}

/* LE PAYS EST MOISSONNE EN FRANCAIS (le libelle Wikidata), et le site parle
   aussi anglais : « Royaume-Uni » s'affichait tel quel en anglais. Le nom
   francais est ramene a son code ISO, que le navigateur nomme dans la langue
   du site. Un pays absent de la table garde son nom francais. */
const CODES_DES_PAYS: Readonly<Record<string, string>> = {
  'États-Unis': 'US', 'Royaume-Uni': 'GB', Allemagne: 'DE', 'Pays-Bas': 'NL', Belgique: 'BE', France: 'FR', Italie: 'IT',
  Canada: 'CA', Japon: 'JP', Norvège: 'NO', Jamaïque: 'JM', Australie: 'AU', Espagne: 'ES', Suède: 'SE', Finlande: 'FI',
  Égypte: 'EG', 'Corée du Sud': 'KR', Hongrie: 'HU', Islande: 'IS', 'Émirats arabes unis': 'AE', Danemark: 'DK', Suisse: 'CH',
  Autriche: 'AT', Irlande: 'IE', Portugal: 'PT', Pologne: 'PL', Russie: 'RU', Brésil: 'BR', Mexique: 'MX', Grèce: 'GR',
  'Afrique du Sud': 'ZA', 'Nouvelle-Zélande': 'NZ', Israël: 'IL', Inde: 'IN', Chine: 'CN', Argentine: 'AR', Tchéquie: 'CZ',
};

export function nomDuPays(pays: string, langue: string): string {
  const code = CODES_DES_PAYS[pays];
  if (!code || langue === 'fr') return pays;
  try {
    return new Intl.DisplayNames([langue], { type: 'region' }).of(code) ?? pays;
  } catch {
    return pays;
  }
}

/* LES LABELS D'UN STYLE. Mika, le 1er octobre 2026 : « dans les styles,
   recoupe l'information, mettons les meilleurs labels d'IDM ». Deux sources
   se recoupent :
   - les labels que la fiche du style nomme (historiques et actuels), choisis
     a la main : ce sont les meilleurs, et ils passent devant ;
   - ceux des morceaux du style dans l'atlas : ils rangent les premiers (le
     label qui porte le plus de morceaux du style d'abord) et en ajoutent,
     a partir de deux morceaux, hors majors (WEA Japan n'est pas un label
     d'IDM parce qu'il a distribue deux disques d'Aphex Twin au Japon).
   Un label nomme sans page reste dans la liste, sans lien. */
export interface LabelDuStyle {
  readonly nom: string;
  readonly entree: EntreeLabel | null;
  /** Ses morceaux de ce style dans l'atlas. */
  readonly n: number;
}

export function labelsDuStyle(
  labelsDesMorceaux: readonly (string | null | undefined)[],
  nommes: readonly string[],
  index: readonly EntreeLabel[],
  max = 6
): readonly LabelDuStyle[] {
  const parCle = new Map<string, EntreeLabel>();
  for (const e of index) for (const k of e.k) if (!parCle.has(k)) parCle.set(k, e);
  const trouver = (nom: string): EntreeLabel | null => {
    const q = cleDeLabel(nom);
    return parCle.get(q) ?? parCle.get(`${q} records`) ?? index.find((e) => e.k.some((k) => sansSuffixe(k) === q)) ?? null;
  };
  const compte = new Map<EntreeLabel, number>();
  for (const l of labelsDesMorceaux) {
    const e = l ? parCle.get(cleDeLabel(l)) : undefined;
    if (e) compte.set(e, (compte.get(e) ?? 0) + 1);
  }
  const vus = new Set<string>();
  const choisis: LabelDuStyle[] = [];
  for (const brut of nommes) {
    /* « Ilian Tape (parenté) » : la parenthese est une nuance de la fiche. */
    const nom = brut.replace(/\s*\([^)]*\)/g, '').trim();
    const e = nom ? trouver(nom) : null;
    const id = e?.s ?? cleDeLabel(nom);
    if (!id || vus.has(id)) continue;
    vus.add(id);
    choisis.push({ nom: e?.n ?? nom, entree: e, n: e ? (compte.get(e) ?? 0) : 0 });
  }
  choisis.sort((a, b) => b.n - a.n || (b.entree ? (b.entree.r ?? 0) : -1) - (a.entree ? (a.entree.r ?? 0) : -1));
  const ajoutes = [...compte.entries()]
    .filter(([e, n]) => n >= 2 && !vus.has(e.s) && !estMajor(e))
    .sort(([a, na], [b, nb]) => nb - na || (b.r ?? 0) - (a.r ?? 0))
    .map(([e, n]): LabelDuStyle => ({ nom: e.n, entree: e, n }));
  return [...choisis, ...ajoutes].slice(0, max);
}
