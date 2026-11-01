/* LE REEL DU JEUDI : CE QU'IL MONTRE, ET POURQUOI CES LIGNES-LA (ADR-115).
 *
 * Mika, le 31 octobre 2026 : « un reel tous les jeudis avec les soirees de
 * la fin de semaine, les grosses news qui sont sorties, les nouvelles
 * mixtapes qui fonctionnent bien sur SONAA, le label de la semaine qui a le
 * plus fonctionne et le style qui correspond », a telecharger depuis
 * l'administration.
 *
 * Ce fichier choisit ; il ne dessine rien et ne demande rien au reseau, sauf
 * `chiffresDeLaSemaine`. Chaque choix est un classement, et l'onglet laisse
 * Mika cocher, decocher ou changer de label avant de fabriquer : un
 * classement automatique propose, il ne publie pas.
 *
 * LES CHIFFRES DU SITE SONT MAIGRES (la mesure date du 27 octobre 2026) :
 * chaque classement a donc un second critere qui tient seul quand personne
 * n'a rien regarde, et le label tourne d'une semaine a l'autre plutot que
 * d'etre toujours le meme gros catalogue. */

import { supabase } from './supabase.ts';
import type { Soiree } from './agenda.ts';
import { cleDeLabel, type EntreeLabel } from './labels.ts';

const JOUR = 86_400_000;

export interface ArticleNews {
  readonly source: string;
  readonly titre: string;
  readonly lien: string;
  readonly date: string | null;
  readonly image: string | null;
  readonly resume: string;
}

/** Le jeudi de la semaine (du lundi au dimanche) ou tombe `maintenant`. */
export function jeudiDeLaSemaine(maintenant: Date): Date {
  const d = new Date(maintenant);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
  return d;
}

/** Le numero de la semaine dans l'annee, pour faire tourner le label de
    repli : le meme toute la semaine, un autre la suivante. */
export function numeroDeSemaine(maintenant: Date): number {
  const jeudi = jeudiDeLaSemaine(maintenant);
  const debut = new Date(jeudi.getFullYear(), 0, 1);
  /* Arrondi, pas tronque : le changement d'heure decale l'ecart d'une
     heure, et la troncature sautait alors une semaine. */
  return Math.round((jeudi.getTime() - debut.getTime()) / (7 * JOUR));
}

/* ═══ LES SOIREES ═══ Celles qui sont mises en avant d'abord (on les a
   payees pour ca), puis celles qui interessent le plus de monde chez
   Resident Advisor. Une soiree par titre, et l'ordre final est celui des
   dates : un reel se lit du vendredi au dimanche. */
export function classerSoirees(liste: readonly Soiree[], vedettes: ReadonlySet<string>, n = 6): Soiree[] {
  const vus = new Set<string>();
  const uniques = liste.filter((s) => {
    const cle = s.titre.toLowerCase().replace(/\s+/g, ' ').trim();
    if (vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
  return uniques
    .map((s, i) => ({ s, i, poids: (vedettes.has(s.id) ? 1e6 : 0) + s.interesses * 10 + (s.affiche ? 1 : 0) }))
    .sort((a, b) => b.poids - a.poids || a.i - b.i)
    .slice(0, n)
    .map((x) => x.s)
    .sort((a, b) => (a.debut ?? a.date).localeCompare(b.debut ?? b.date));
}

/* ═══ LES NEWS ═══ Une grosse news est une news que plusieurs sites
   racontent : on compte, pour chaque article de la semaine, les articles
   d'AUTRES sources qui partagent un de ses noms propres (un artiste, un
   festival, une machine). A egalite, la plus recente. Une news par source,
   pour que le reel ne soit pas trois tests du meme magazine. */
const MOTS_COMMUNS = new Set(
  (
    'the a an and or of in on at to for with from by how why what when who this that these new free best top review reviews ' +
    'get your you our we is are was be its it his her their my vs not more most first last all one two three watch listen ' +
    'here now live just out up off over after before into about still every week year day night le la les un une des du de ' +
    'et ou en au aux pour avec sur dans par ce cette ces son sa ses nouveau nouvelle meilleur'
  ).split(' ')
);

function nomsPropres(texte: string): Set<string> {
  const out = new Set<string>();
  for (const m of texte.matchAll(/\b\p{Lu}[\p{L}\d'’-]{2,}/gu)) {
    const mot = m[0].toLowerCase().replace(/['’]s$/, '');
    if (mot.length >= 4 && !MOTS_COMMUNS.has(mot)) out.add(mot);
  }
  return out;
}

export function classerNews(articles: readonly ArticleNews[], maintenant: Date, n = 3): ArticleNews[] {
  const t = maintenant.getTime();
  const recents = articles.filter((a) => {
    const d = a.date ? Date.parse(a.date) : NaN;
    return Number.isFinite(d) && d <= t + JOUR && t - d <= 7 * JOUR;
  });
  const noms = recents.map((a) => nomsPropres(a.titre));
  const notes = recents.map((a, i) => {
    let echo = 0;
    recents.forEach((b, j) => {
      if (j === i || b.source === a.source) return;
      const autres = noms[j] ?? new Set<string>();
      if ([...(noms[i] ?? [])].some((x) => autres.has(x))) echo += 1;
    });
    const fraicheur = 1 - (t - Date.parse(a.date ?? '')) / (7 * JOUR);
    return { a, note: echo * 3 + (a.image ? 1 : 0) + fraicheur };
  });
  notes.sort((x, y) => y.note - x.note);
  const sources = new Set<string>();
  const out: ArticleNews[] = [];
  for (const { a } of notes) {
    if (sources.has(a.source)) continue;
    sources.add(a.source);
    out.push(a);
    if (out.length === n) break;
  }
  return out;
}

/* ═══ LES MIXTAPES ═══ Les auditeurs de la semaine d'abord, puis les
   minutes ecoutees, puis la nouveaute : une mixtape deposee il y a moins
   d'un mois passe devant une ancienne a chiffres egaux. */
export interface EcouteDeLaSemaine {
  readonly id: string;
  readonly auditeurs: number;
  readonly minutes: number;
}

export function classerMixtapes<T extends { readonly id: string; readonly created_at: string; readonly ecoutes: number }>(
  sets: readonly T[],
  semaine: readonly EcouteDeLaSemaine[],
  maintenant: Date,
  n = 2
): T[] {
  const par = new Map(semaine.map((e) => [e.id, e]));
  const note = (s: T): number => {
    const e = par.get(s.id);
    const age = (maintenant.getTime() - Date.parse(s.created_at)) / JOUR;
    return (e?.auditeurs ?? 0) * 100 + (e?.minutes ?? 0) + (age <= 30 ? 50 : 0) + Math.min(s.ecoutes, 40) / 4;
  };
  return [...sets].sort((a, b) => note(b) - note(a) || b.created_at.localeCompare(a.created_at)).slice(0, n);
}

/* ═══ LE LABEL DE LA SEMAINE ═══ Ce qui « a fonctionne » se mesure deux
   fois : les pages du label vues sur SONAA cette semaine, et les news de la
   semaine qui le nomment. Un label doit avoir au moins deux morceaux dans
   l'atlas, sinon on ne saurait pas quel style lui associer.

   QUAND PERSONNE N'A RIEN REGARDE, on ne prend pas le plus gros catalogue
   (ce serait le meme chaque jeudi) : on tourne, une semaine chacun, parmi
   les cinquante labels les plus presents dans l'atlas. Les majors en sont
   ecartees : Virgin ou Columbia ont des morceaux dans l'atlas, mais un
   « label de la semaine » sur SONAA est une maison de musique
   electronique.

   UN NOM QUI EST AUSSI UN MOT NE COMPTE PAS. Le premier essai donnait
   « Logic Records » label de la semaine, parce que les news parlaient de
   Logic Pro. Un nom d'un seul mot suivi de « Records » se cherche donc en
   entier ; un nom d'un seul mot sans suffixe ne compte que s'il n'apparait
   jamais en minuscules dans les news de la semaine (« Touch » oui,
   « Drumcode » non). */
const GENERALISTES = new Set(
  (
    'virgin|atlantic|columbia|epic|polydor|warner|warner records|rca|republic|republic records|united artists|united artists records|' +
    'deutsche grammophon|motown|geffen|geffen records|capitol|capitol records|emi|sony|sony music|universal|island|island records|' +
    'parlophone|interscope|mercury|def jam|arista|elektra|decca|philips|a and m|mca|philadelphia international records|reprise|sire|chrysalis'
  ).split('|')
);
export interface VueDeLabel {
  readonly slug: string;
  readonly vues: number;
  readonly visiteurs: number;
}

export interface LabelClasse {
  readonly label: EntreeLabel;
  readonly vues: number;
  readonly mentions: number;
}

const SUFFIXES = /\s+(records|recordings|music|musique|audio|records ltd|label|digital)$/i;

/** Le nom du label tel qu'un titre de news le dirait, ou null s'il est trop
    court ou trop commun pour etre reconnu sans erreur. `minuscules` : les
    mots de la semaine ecrits sans majuscule. */
function nomCherchable(l: EntreeLabel, minuscules: ReadonlySet<string>): RegExp | null {
  const base = l.n.replace(SUFFIXES, '').trim();
  const nom = base !== l.n.trim() && !/\s/.test(base) ? l.n.trim() : base;
  if (nom.length < 5 || MOTS_COMMUNS.has(nom.toLowerCase())) return null;
  if (!/\s/.test(nom) && minuscules.has(nom.toLowerCase())) return null;
  const echappe = nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\d])${echappe}($|[^\\p{L}\\d])`, 'iu');
}

export function classerLabels(
  index: readonly EntreeLabel[],
  vues: readonly VueDeLabel[],
  articles: readonly ArticleNews[],
  maintenant: Date,
  n = 8
): LabelClasse[] {
  const t = maintenant.getTime();
  const semaine = articles.filter((a) => a.date && t - Date.parse(a.date) <= 7 * JOUR);
  const parSlug = new Map(vues.map((v) => [v.slug, v]));
  const minuscules = new Set<string>();
  for (const a of semaine) for (const m of `${a.titre} ${a.resume}`.matchAll(/(?<![\p{L}\d])\p{Ll}[\p{L}\d]+/gu)) minuscules.add(m[0]);
  const candidats = index.filter((l) => l.c >= 2);
  const notes: LabelClasse[] = [];
  for (const label of candidats) {
    const v = parSlug.get(label.s);
    const motif = semaine.length ? nomCherchable(label, minuscules) : null;
    const mentions = motif ? semaine.filter((a) => motif.test(`${a.titre} ${a.resume}`)).length : 0;
    if ((v?.vues ?? 0) > 0 || mentions > 0) notes.push({ label, vues: v?.vues ?? 0, mentions });
  }
  notes.sort((a, b) => b.mentions * 6 + b.vues * 3 - (a.mentions * 6 + a.vues * 3) || (b.label.r ?? 0) - (a.label.r ?? 0));
  /* Le repli tourne : la semaine choisit le premier, les suivants
     completent la liste proposee. */
  const tournant = candidats
    .filter((l) => !GENERALISTES.has(cleDeLabel(l.n)))
    .sort((a, b) => b.c - a.c || (b.r ?? 0) - (a.r ?? 0))
    .slice(0, 50);
  const depart = tournant.length ? numeroDeSemaine(maintenant) % tournant.length : 0;
  const deja = new Set(notes.map((x) => x.label.s));
  for (let i = 0; notes.length < n && i < tournant.length; i++) {
    const label = tournant[(depart + i) % tournant.length];
    if (label && !deja.has(label.s)) {
      deja.add(label.s);
      notes.push({ label, vues: 0, mentions: 0 });
    }
  }
  return notes.slice(0, n);
}

/** Les styles d'un label, du plus au moins represente : ceux de l'atlas
    ou il a des morceaux. Le premier est son style. `genres` donne, pour
    chaque style, les labels de ses morceaux. */
export function stylesDuLabel(
  label: EntreeLabel,
  genres: readonly { readonly id: string; readonly labels: readonly (string | null | undefined)[] }[],
  cle: (nom: string) => string
): string[] {
  const cles = new Set(label.k);
  return genres
    .map((g, i) => ({ id: g.id, i, n: g.labels.filter((x) => x && cles.has(cle(x))).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.id);
}

/* ═══ LES IMAGES ═══ Une affiche, une photo de news, un logo : la
   passerelle les relaie avec l'en-tete qui laisse le canvas propre (voir
   api/image-reel). Le jeton du compte prouve la moderation. Une image qui
   ne vient pas rend null, et la scene se dessine sans elle. */
const PASSERELLE = 'https://sonaa-sets.massivemedias.workers.dev';
const images = new Map<string, Promise<ImageBitmap | null>>();

export function imageDuReel(adresse: string | null): Promise<ImageBitmap | null> {
  if (!adresse || !/^https:\/\//.test(adresse)) return Promise.resolve(null);
  let p = images.get(adresse);
  if (!p) {
    p = (async () => {
      try {
        const session = supabase ? (await supabase.auth.getSession()).data.session : null;
        if (!session) return null;
        const r = await fetch(`${PASSERELLE}/api/image-reel?u=${encodeURIComponent(adresse)}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!r.ok) return null;
        return await createImageBitmap(await r.blob());
      } catch {
        return null;
      }
    })();
    images.set(adresse, p);
  }
  return p;
}

/* ═══ LES CHIFFRES ═══ La fonction reel_semaine de la base, reservee a la
   moderation : pages de label vues et mixtapes ecoutees sur sept jours.
   Une panne rend des listes vides, et les classements tiennent quand
   meme. */
export async function chiffresDeLaSemaine(): Promise<{ labels: VueDeLabel[]; mixtapes: EcouteDeLaSemaine[] }> {
  if (!supabase) return { labels: [], mixtapes: [] };
  const { data, error } = await supabase.rpc('reel_semaine', { jours: 7 });
  if (error || !data) return { labels: [], mixtapes: [] };
  const d = data as { labels?: VueDeLabel[]; mixtapes?: EcouteDeLaSemaine[] };
  return { labels: d.labels ?? [], mixtapes: d.mixtapes ?? [] };
}
