/* LES ADRESSES LISIBLES DU SITE, POUR LES MOTEURS DE RECHERCHE ET POUR LES
 * GENS QUI PARTAGENT UN LIEN.
 *
 * Mika, le 14 septembre 2026 : « fais du referencement de fou, je veux du
 * monde sur le site ». Le site vivait sur des ancres (#/parcourir/2/12) :
 * pour un moteur de recherche, tout le site etait UNE page, la racine, et
 * rien de ce qui fait sa valeur (219 fiches de styles, les cours, les
 * soirees, les sets) n'existait.
 *
 * Chaque style a donc un chemin, /styles/techno/dub-techno/, que la
 * construction du site rend en vraie page HTML (scripts/prerender.ts) avec
 * son contenu. Quand l'app demarre sur ce chemin sans ancre, elle traduit
 * le chemin en ancre et continue comme avant : le chemin reste dans la
 * barre d'adresse, l'ancre le suit. Une seule table de correspondance, ici,
 * partagee par l'app et par le pre-rendu : un slug qui differerait entre
 * les deux ferait des pages que l'app ne saurait pas ouvrir. */

/* LA TABLE EST LUE, PAS CALCULEE, ET C'EST TOUT L'INTERET.
 *
 * Elle etait construite ici a partir de `structures.ts`, donc du corpus. Or
 * `main.tsx` appelle `hashDuChemin` au demarrage : le corpus entier, 1254 Ko
 * minifies, entrait dans le bundle d'entree de chaque page pour une fonction
 * qui ne lit que des noms de dossiers. Mesure le 21 septembre 2026 : 72 pour
 * cent du poids de l'entree.
 *
 * La table fait maintenant onze kilo-octets et se regenere a chaque build
 * (scripts/generer-chemins-styles.ts). Le corpus reste dans le morceau que la
 * page des styles charge a la demande. */
import CHEMINS_STYLES from '../data/chemins-styles.json';

export const ORIGINE = 'https://sonaa.ca';

/** « Dub Techno » devient « dub-techno » : minuscules, sans accent, un tiret
    entre les mots, rien d'autre. */
export function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface CheminStyle {
  readonly chemin: string;
  readonly hash: string;
  readonly fi: number;
  readonly gl: number | null;
}

/** Tous les chemins de styles : les familles puis chaque genre. Lus dans la
    table, dont l'ordre est celui du corpus au moment du build. */
export function cheminsDesStyles(): CheminStyle[] {
  return Object.entries(CHEMINS_STYLES as Record<string, string>).map(([chemin, hash]) => {
    const bouts = hash.slice('#/parcourir/'.length).split('/');
    const fi = Number(bouts[0]);
    const gl = bouts.length > 1 ? Number(bouts[1]) : null;
    return { chemin, hash, fi, gl };
  });
}

/** LES MEMES PAGES EN ANGLAIS vivent sous /en/ : /en/styles/techno/dub-techno/.
    Meme ancre, meme contenu de l'app, la langue de l'interface en plus
    (langue.ts lit ce prefixe quand rien n'a ete choisi). */
export const PREFIXE_ANGLAIS = '/en';

export function langueDuChemin(chemin: string): 'fr' | 'en' {
  return chemin === PREFIXE_ANGLAIS || chemin.startsWith(`${PREFIXE_ANGLAIS}/`) ? 'en' : 'fr';
}

/** L'ancre qui correspond a un chemin, ou null si le chemin n'est pas un
    chemin du site. Le pre-rendu ecrit ces chemins ; l'app les relit. */
export function hashDuChemin(chemin: string): string | null {
  /* LA BARRE FINALE EST AJOUTEE SI ELLE MANQUE. Les adresses ecrites par le
     pre-rendu la portent toujours, et l'hebergeur redirige vers elle, mais
     un lien copie a la main ou un service worker qui sert la coquille peut
     arriver sans : la traduction repondait alors null et la page tombait sur
     le calendrier. */
  const nu = langueDuChemin(chemin) === 'en' ? chemin.slice(PREFIXE_ANGLAIS.length) || '/' : chemin;
  const c = nu.endsWith('/') ? nu.replace(/\/+$/, '/') : `${nu}/`;
  if (c === '/styles/') return '#/parcourir';
  /* LES LABELS, depuis le 1er octobre 2026 : /labels/ et /labels/<slug>/. */
  if (c === '/labels/') return '#/labels';
  const label = c.match(/^\/labels\/([a-z0-9-]+)\/$/);
  if (label) return `#/labels/${label[1]}`;
  const style = (CHEMINS_STYLES as Record<string, string>)[c];
  if (style) return style;
  /* /soirees/montreal-ca/, /soirees/montreal-ca/techno/ (une famille) et
     /soirees/montreal-ca/<id>/ (une soiree) ouvrent tous le calendrier de la
     ville : la page pre-rendue a deja dit ce qu'il y avait a dire. */
  const soiree = c.match(/^\/soirees\/([a-z-]+)\/(?:[^/]+\/)?$/);
  if (soiree) return `#/calendrier?city=${soiree[1]}`;
  if (c.startsWith('/soirees/')) return '#/calendrier';
  /* LES MIXTAPES ONT DEUX CHEMINS, ET C'EST VOULU. /mixtapes/ est le nom
     depuis le 17 septembre 2026 ; /sons/ etait le sien depuis le 14 et se
     trouve dans les 780 pages deja soumises a Google et a Bing. Les deux
     ouvrent la meme page, et le pre-rendu dit laquelle est la bonne par un
     canonique. Retirer une adresse publiee coute une semaine de reindexation
     pour rien. */
  /* LES ARTISTES, depuis le 27 octobre 2026 : /artistes/<compte>/. */
  const artiste = c.match(/^\/artistes\/([0-9a-f-]{36})\/$/);
  if (artiste) return `#/mixtapes/a/${artiste[1]}`;
  const mixtape = c.match(/^\/(?:mixtapes|sons)\/([0-9a-f-]{36})\/$/);
  if (mixtape) return `#/mixtapes/${mixtape[1]}`;
  if (c === '/mixtapes/' || c === '/sons/') return '#/mixtapes';
  if (c === '/tracks/') return '#/tracks';
  if (c === '/reconnaitre/') return '#/reconnaitre';
  if (c === '/panier/') return '#/panier';
  if (c === '/conditions/') return '#/conditions';
  if (c === '/confidentialite/') return '#/confidentialite';
  if (c === '/mentions/') return '#/mentions';
  if (c === '/news/') return '#/news';
  /* LES NEWS PAR MARQUE, depuis le 27 octobre 2026 : /news/marques/,
     /news/marques/<marque>/ et /news/marques/<marque>/<machine>/. */
  if (c === '/news/marques/') return '#/news/marques';
  const marque = c.match(/^\/news\/marques\/([a-z0-9-]+)\/(?:([a-z0-9-]+)\/)?$/);
  if (marque) return `#/news/marques/${marque[1]}${marque[2] ? `/${marque[2]}` : ''}`;
  return null;
}

/* ═══ ET DANS L'AUTRE SENS : LE CHEMIN D'UNE ANCRE ═══

   Mika, le 27 octobre 2026 : une mixtape partagee sur Facebook affichait la
   couverture de l'evenement au lieu de la mixtape. Le lien copie dans la
   barre d'adresse etait sonaa.ca/#/mixtapes/<id>, et un robot de partage
   ne lit jamais ce qui suit le croisillon : pour lui, c'etait l'accueil.

   La page a partager existe pourtant, /mixtapes/<id>/, avec son titre et sa
   pochette (scripts/prerender.ts). L'app y met donc le chemin a chaque
   changement d'ancre, et l'adresse copiee porte toujours la page ouverte. */

let ancresDesStyles: Map<string, string> | null = null;

/** Le chemin de la page qu'ouvre une ancre, ou la racine si l'ancre n'a pas
    de page a elle. Le calendrier rend la racine, qui est sa page. */
export function cheminDuHash(hash: string): string {
  const [base = ''] = hash.split('?');
  const artiste = base.match(/^#\/(?:mixtapes|sets)\/a\/([0-9a-f-]{36})(?:\/|$)/);
  if (artiste) return `/artistes/${artiste[1]}/`;
  const mixtape = base.match(/^#\/(?:mixtapes|sets)\/([0-9a-f-]{36})(?:\/|$)/);
  if (mixtape) return `/mixtapes/${mixtape[1]}/`;
  if (/^#\/(?:mixtapes|sets)\/?$/.test(base)) return '/mixtapes/';
  const style = base.match(/^#\/parcourir(?:\/(\d+)(?:\/(\d+))?)?(?:\/|$)/);
  if (style) {
    if (!style[1]) return '/styles/';
    ancresDesStyles ??= new Map(Object.entries(CHEMINS_STYLES as Record<string, string>).map(([chemin, ancre]) => [ancre, chemin]));
    return ancresDesStyles.get(`#/parcourir/${style[1]}/${style[2] ?? ''}`.replace(/\/$/, '')) ?? ancresDesStyles.get(`#/parcourir/${style[1]}`) ?? '/styles/';
  }
  const label = base.match(/^#\/labels(?:\/([a-z0-9-]+))?(?:\/|$)/);
  if (label) return label[1] ? `/labels/${label[1]}/` : '/labels/';
  const marque = base.match(/^#\/news\/marques(?:\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?)?(?:\/|$)/);
  if (marque) return `/news/marques/${marque[1] ? `${marque[1]}/` : ''}${marque[2] ? `${marque[2]}/` : ''}`;
  const simple = base.match(/^#\/(news|tracks|reconnaitre|panier|conditions|confidentialite|mentions)(?:\/|$)/);
  if (simple) return `/${simple[1]}/`;
  return '/';
}

/** Le chemin a mettre dans la barre pour l'ancre en cours. Celui qui y est
    reste quand il mene a la meme page : /sons/<id>/, /en/styles/... ou la
    page d'une soiree ouverte depuis un moteur ne sont pas des erreurs. */
export function cheminAligne(hash: string, cheminActuel: string): string {
  const voulu = cheminDuHash(hash);
  return cheminDuHash(hashDuChemin(cheminActuel) ?? '') === voulu ? cheminActuel : voulu;
}
