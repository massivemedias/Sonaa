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
  readonly image: string | null;
  readonly url: string;
}

export interface FicheLabel {
  readonly slug: string;
  readonly nom: string;
  /** Les graphies du nom dans le corpus, pour y retrouver ses morceaux. */
  readonly cles: readonly string[];
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
}

/** Les labels que la recherche montre EN PREMIER : ceux dont le nom commence
    par ce qu'on a tape, ou qui l'egale. A partir de trois lettres, sinon
    « wa » ouvrirait Warp a chaque frappe. Le nom exact passe devant, puis
    le label le plus present dans l'atlas. */
export function labelsPourRecherche(requete: string, index: readonly EntreeLabel[]): readonly EntreeLabel[] {
  const q = cleDeLabel(requete);
  if (q.length < 3) return [];
  const sansSuffixe = (k: string): string => k.replace(/ (records|recordings|music|label)$/, '');
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
