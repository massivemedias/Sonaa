/* LIRE UN FLUX RSS OU ATOM, SANS DEPENDANCE.
 *
 * Les sites de la scene electronique publient tous un flux : c'est la seule
 * chose qu'ils ont en commun. Il en existe deux dialectes, RSS 2.0 (item,
 * title, link, pubDate, description) et Atom (entry, title, link href,
 * updated, summary), et chaque site y ajoute sa poussiere : des CDATA, des
 * entites HTML, des images dans media:content ou dans enclosure ou dans le
 * corps du texte.
 *
 * On ne tire pas un analyseur XML pour cela. Les quatre champs qu'on veut
 * se lisent a la regle dans un texte de quelques dizaines de kilo-octets,
 * et un analyseur complet ne rendrait pas la lecture plus juste : il
 * rendrait la panne plus difficile a lire le jour ou un site change.
 */

import { SOURCES, type Categorie, type Source } from '../../src/data/news-sources.ts';

export { SOURCES };
export type { Categorie, Source };

export interface Article {
  readonly source: string;
  readonly titre: string;
  readonly lien: string;
  /** ISO, ou null quand le flux ne date pas. */
  readonly date: string | null;
  readonly image: string | null;
  readonly resume: string;
}

/* ── Le texte ─────────────────────────────────────────────────────────── */

const ENTITES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '’', nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', ndash: '\u2013', mdash: '\u2014',
  eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', ecirc: 'ê', ocirc: 'ô', ucirc: 'û', icirc: 'î',
};

function decoderEntites(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITES[n] ?? m);
}

/** Enleve les CDATA, les balises, les entites, et resserre les blancs. */
export function texteNu(brut: string | null | undefined): string {
  if (!brut) return '';
  const sansCdata = brut.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  const sansBalises = sansCdata.replace(/<[^>]+>/g, ' ');
  return decoderEntites(sansBalises).replace(/\s+/g, ' ').trim();
}

/** Coupe un resume a `max` signes, sur un mot, avec des points de suspension.

    ET ENLEVE D'ABORD LA POUSSIERE DE WORDPRESS : « Read More », « Continue
    reading », « The post X appeared first on Y ». Vu sur Synthtopia des la
    premiere moisson : le resume repetait le titre apres un « Read More ». */
export function resumer(brut: string, max = 220): string {
  const texte = brut
    .replace(/\s*(?:Read More|Continue reading|Lire la suite)\b[\s\S]*$/i, '')
    .replace(/\s*The post\b[\s\S]*appeared first on[\s\S]*$/i, '')
    .replace(/\s*L’article\b[\s\S]*est apparu en premier sur[\s\S]*$/i, '')
    .trim();
  if (texte.length <= max) return texte;
  const coupe = texte.slice(0, max);
  const dernier = coupe.lastIndexOf(' ');
  return `${(dernier > max * 0.6 ? coupe.slice(0, dernier) : coupe).replace(/[\s.,;:]+$/, '')}…`;
}

/* ── Le flux ──────────────────────────────────────────────────────────── */

const champ = (bloc: string, nom: string): string | null => {
  const m = bloc.match(new RegExp(`<${nom}(?:\\s[^>]*)?>([\\s\\S]*?)</${nom}>`, 'i'));
  return m?.[1] ?? null;
};

const attribut = (bloc: string, balise: string, attr: string): string | null => {
  const m = bloc.match(new RegExp(`<${balise}\\b[^>]*\\b${attr}=["']([^"']+)["']`, 'i'));
  return m?.[1] ?? null;
};

/** L'image d'un article : media:content, media:thumbnail, enclosure, ou la
    premiere balise img du corps. Beaucoup de flux n'en ont aucune. */
function imageDe(bloc: string): string | null {
  const media = attribut(bloc, 'media:content', 'url') ?? attribut(bloc, 'media:thumbnail', 'url');
  if (media) return media;
  const enclosure = bloc.match(/<enclosure\b[^>]*type=["']image\/[^"']*["'][^>]*url=["']([^"']+)["']/i)
    ?? bloc.match(/<enclosure\b[^>]*url=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/i);
  if (enclosure?.[1]) return enclosure[1];
  const img = bloc.match(/<img\b[^>]*src=["']([^"']+)["']/i) ?? bloc.match(/&lt;img\b[^&]*src=(?:&quot;|")([^"&]+)/i);
  return img?.[1] ? decoderEntites(img[1]) : null;
}

function dateDe(brut: string | null): string | null {
  if (!brut) return null;
  const d = new Date(texteNu(brut));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Les articles d'un flux, dans l'ordre du flux. Rend un tableau vide sur
    un texte qui n'est ni RSS ni Atom, sans lever : une source cassee ne
    doit pas faire tomber les vingt autres. */
export function lireFlux(xml: string, source: string): Article[] {
  const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((m) => m[1] ?? '');
  const entries = items.length > 0 ? [] : [...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)].map((m) => m[1] ?? '');
  const blocs = items.length > 0 ? items : entries;
  const atom = items.length === 0;

  const out: Article[] = [];
  for (const bloc of blocs) {
    const titre = texteNu(champ(bloc, 'title'));
    let lien = atom
      ? (attribut(bloc.replace(/<link\b[^>]*rel=["'](?!alternate)[^"']*["'][^>]*\/?>/gi, ''), 'link', 'href') ?? '')
      : texteNu(champ(bloc, 'link'));
    if (!lien) lien = texteNu(champ(bloc, 'guid'));
    if (!titre || !/^https?:\/\//.test(lien)) continue;
    const corps = champ(bloc, 'content:encoded') ?? champ(bloc, 'description') ?? champ(bloc, 'summary') ?? champ(bloc, 'content');
    out.push({
      source,
      titre,
      lien,
      date: dateDe(champ(bloc, 'pubDate') ?? champ(bloc, 'dc:date') ?? champ(bloc, 'published') ?? champ(bloc, 'updated')),
      image: imageDe(bloc),
      resume: resumer(texteNu(corps)),
    });
  }
  return out;
}
