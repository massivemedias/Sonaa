/* LES VILLES DE LA CARTE DES LABELS.
 *
 * Mika, le 23 novembre 2026, devant la carte des maisons meres : « ca veut
 * etre trop precis, on doit juste rester sur les villes et pas les rues,
 * donc quand on arrive dans une ville on a la liste bien presentee ».
 *
 * Chaque label portait son propre point, decale de quelques rues : Montreal
 * etait un essaim de soixante-sept pastilles posees les unes sur les autres.
 * Ici, les labels d'une meme ville ne font qu'un lieu, pose au point median
 * de leurs coordonnees, et la carte ne dessine que des villes.
 *
 * LES NOMS MOISSONNES NE SONT PAS HOMOGENES : « Toronto, Ontario » et
 * « Toronto », « Francfort-sur-le-Main » et « Francfort », « Brooklyn » et
 * « New York ». La province apres la virgule tombe, et une courte table
 * ramene un quartier a sa ville. Deux villes du meme nom dans deux pays
 * (Newcastle en Australie, une autre ailleurs demain) restent deux lieux :
 * on ne les reunit que si elles sont a moins de 150 km l'une de l'autre.
 *
 * UN LABEL SANS VILLE CONNUE N'A PAS DE POINT. La moisson le posait pres de
 * la capitale de son pays, ce qui aurait range 209 labels britanniques a
 * Londres sans le savoir. Il est classe sous son pays, dans la liste « ville
 * non renseignee », et la carte ne le dessine pas. */

import { cleDeLabel, ordreDeNotoriete, type EntreeLabel } from './labels.ts';

type Nom = { readonly fr: string; readonly en: string };
type Point = readonly [number, number];

export interface LieuDeLabels {
  /** Identifiant stable dans la page : « montreal », « newcastle-2 », « pays-royaume-uni ». */
  readonly id: string;
  /** La ville, ou null pour les labels d'un pays dont la ville n'est pas connue. */
  readonly ville: Nom | null;
  readonly pays: string | null;
  /** Lieu de la scene du Quebec : la moitie au moins de ses labels en sont. */
  readonly quebec: boolean;
  /** [latitude, longitude] : le point median de ses labels. */
  readonly centre: Point;
  /** Ses labels, du plus connu au moins connu. */
  readonly labels: readonly EntreeLabel[];
}

/* UN QUARTIER, UNE RUE OU UNE BANLIEUE RAMENES A LEUR VILLE. La cle est le
   nom francais, sans sa province, passe par cleDeLabel. */
const QUARTIERS: Readonly<Record<string, Nom>> = {
  'francfort sur le main': { fr: 'Francfort', en: 'Frankfurt' },
  'berlin prenzlauer berg': { fr: 'Berlin', en: 'Berlin' },
  'arrondissement de minato': { fr: 'Tokyo', en: 'Tokyo' },
  brooklyn: { fr: 'New York', en: 'New York' },
  'rue emile blemont': { fr: 'Paris', en: 'Paris' },
  anderlecht: { fr: 'Bruxelles', en: 'Brussels' },
  'kurten cologne': { fr: 'Cologne', en: 'Cologne' },
  'red hill brisbane': { fr: 'Brisbane', en: 'Brisbane' },
};

/* DES PAYS MOISSONNES A LA PLACE D'UNE VILLE, par leur nom anglais. */
const PAS_DES_VILLES = new Set(['belgium', 'netherlands']);

/* UNE REGION PRISE POUR UNE VILLE se trahit par ses coordonnees : le centre
   d'une province ou d'un Etat tombe sur un degre ou un demi-degre rond.
   « Quebec » a 52, -72 est la province (Altar Records), « New York » a 43,
   -75 est l'Etat (Mom + Pop), l'Ohio est a 40,5, -82,5. Une ville
   moissonnee a quatre decimales. */
const estUneRegion = (g: Point): boolean => Number.isInteger(g[0] * 2) && Number.isInteger(g[1] * 2);

const RAYON_DUNE_VILLE_KM = 150;

const sansRegion = (nom: string): string => nom.split(',')[0]?.trim() ?? nom;

/** La ville d'un label telle que la carte la lit : sans sa province, un
    quartier ramene a sa ville, null pour un pays ou une region pris pour une
    ville. Sert aussi a scripts/completer-villes-labels.ts pour savoir quels
    labels n'ont pas de ville. */
export function villeDuLabel(v: Nom | null | undefined, g: Point | null | undefined): Nom | null {
  if (!v || (g && estUneRegion(g))) return null;
  const fr = sansRegion(v.fr);
  const en = sansRegion(v.en);
  if (!fr || PAS_DES_VILLES.has(cleDeLabel(en))) return null;
  return QUARTIERS[cleDeLabel(fr)] ?? { fr, en };
}

function distanceKm(a: Point, b: Point): number {
  const r = Math.PI / 180;
  const x = (b[1] - a[1]) * r * Math.cos(((a[0] + b[0]) / 2) * r);
  const y = (b[0] - a[0]) * r;
  return Math.hypot(x, y) * 6371;
}

function mediane(valeurs: readonly number[]): number {
  const v = [...valeurs].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? (v[m] ?? 0) : ((v[m - 1] ?? 0) + (v[m] ?? 0)) / 2;
}

/** La valeur la plus frequente ; a egalite, la premiere rencontree. */
function majoritaire<T>(valeurs: readonly T[]): T | undefined {
  const n = new Map<T, number>();
  for (const v of valeurs) n.set(v, (n.get(v) ?? 0) + 1);
  let meilleure: T | undefined;
  let max = 0;
  for (const [v, c] of n) {
    if (c > max) {
      meilleure = v;
      max = c;
    }
  }
  return meilleure;
}

interface Groupe {
  readonly cle: string;
  readonly ancre: Point;
  readonly membres: { readonly e: EntreeLabel & { readonly g: Point }; readonly ville: Nom | null }[];
}

function versLieu(id: string, groupe: Groupe, avecVille: boolean): LieuDeLabels {
  const m = groupe.membres;
  const fr = majoritaire(m.map((x) => x.ville?.fr ?? ''));
  const en = majoritaire(m.map((x) => x.ville?.en ?? ''));
  return {
    id,
    ville: avecVille && fr && en ? { fr, en } : null,
    pays: majoritaire(m.map((x) => x.e.p).filter((p): p is string => Boolean(p))) ?? null,
    quebec: m.filter((x) => x.e.q === 1).length * 2 >= m.length,
    centre: [mediane(m.map((x) => x.e.g[0])), mediane(m.map((x) => x.e.g[1]))],
    labels: m.map((x) => x.e).sort(ordreDeNotoriete),
  };
}

const parTaille = (a: LieuDeLabels, b: LieuDeLabels): number =>
  b.labels.length - a.labels.length || (a.ville?.fr ?? a.pays ?? '').localeCompare(b.ville?.fr ?? b.pays ?? '');

/** Les lieux de la carte : les villes, et a part les pays dont des labels
    n'ont pas de ville connue. Un label sans coordonnees n'est ni l'un ni
    l'autre. */
export function lieuxDesLabels(entrees: readonly EntreeLabel[]): {
  readonly villes: readonly LieuDeLabels[];
  readonly sansVille: readonly LieuDeLabels[];
} {
  const parVille = new Map<string, Groupe[]>();
  const parPays = new Map<string, Groupe>();

  for (const e of entrees) {
    if (!e.g) continue;
    const point = e as EntreeLabel & { readonly g: Point };
    const ville = villeDuLabel(e.v, point.g);
    if (ville) {
      const cle = cleDeLabel(ville.fr);
      const homonymes = parVille.get(cle) ?? [];
      let groupe = homonymes.find((x) => distanceKm(x.ancre, point.g) < RAYON_DUNE_VILLE_KM);
      if (!groupe) {
        groupe = { cle, ancre: point.g, membres: [] };
        homonymes.push(groupe);
        parVille.set(cle, homonymes);
      }
      groupe.membres.push({ e: point, ville });
    } else if (e.p) {
      const cle = cleDeLabel(e.p);
      const groupe = parPays.get(cle) ?? { cle, ancre: point.g, membres: [] };
      groupe.membres.push({ e: point, ville: null });
      parPays.set(cle, groupe);
    }
  }

  const slug = (cle: string): string => cle.replace(/ /g, '-');
  const villes = [...parVille.values()]
    .flatMap((homonymes) => homonymes.map((g, i) => versLieu(i === 0 ? slug(g.cle) : `${slug(g.cle)}-${i + 1}`, g, true)))
    .sort(parTaille);
  const sansVille = [...parPays.values()].map((g) => versLieu(`pays-${slug(g.cle)}`, g, false)).sort(parTaille);
  return { villes, sansVille };
}
