/* RABATTRE LE VOCABULAIRE DE DISCOGS SUR LE NOTRE.
 *
 * Discogs nomme 538 styles dans ce qu'on a moissonne ; SONAA en nomme 219,
 * ranges en 14 familles. Les deux vocabulaires se recouvrent largement mais
 * ne se superposent pas, et c'est normal : Discogs decrit des disques, SONAA
 * decrit une filiation.
 *
 * ═══ TROIS SORTS POSSIBLES, ET UN SEUL PAR DEFAUT ═══
 *
 * Un nom tombe sur un GENRE quand il porte le meme libelle qu'un des 219.
 * Il tombe sur une FAMILLE quand Discogs est plus grossier que nous : il
 * etiquette « House » tout court la ou nous n'avons que Chicago House ou Deep
 * House. Sans les familles, la couverture ponderee plafonnait a 55 % ; avec
 * elles, elle passe a 79 %.
 *
 * TOUT LE RESTE EST JETE, et c'est le defaut. Un atlas des musiques
 * electroniques n'a rien a dire de « Pop Rock », « Gospel » ou « Thrash », et
 * un nom qu'on ne reconnait pas ne doit surtout pas etre range de force :
 * une correspondance approximative pollue mille fiches sans que personne le
 * remarque. On prefere ne rien dire.
 *
 * ═══ « ACID » EST UN MODIFICATEUR, PAS UN GENRE ═══
 *
 * Mesure du 7 septembre 2026 : « Acid » apparait chez 455 artistes, et chez
 * AUCUN il n'est le seul style. Discogs a par ailleurs un style « Acid House »
 * distinct, employe 1193 fois. « Acid » ne remplace donc rien : il qualifie.
 * Il accompagne Techno 383 fois, House 239, Electro 202, Trance 178.
 *
 * Le ranger sur Acid House aurait mal classe deux mille occurrences ; le
 * laisser tomber ne perd rien, puisque les styles qu'il accompagne disent
 * deja de quelle musique il s'agit. Meme raisonnement pour « Experimental »,
 * « Abstract », « Leftfield », « Lo-Fi », « Vocal », « Instrumental » : ce
 * sont des adjectifs.
 */

export type Cible =
  | { readonly sorte: 'genre'; readonly id: string }
  | { readonly sorte: 'famille'; readonly id: string };

/** Les noms Discogs qui qualifient au lieu de nommer. Ils ne sont pas
    inconnus, ils sont ecartes, et la distinction compte : un inconnu est un
    trou a combler, un modificateur est un choix. */
export const MODIFICATEURS: ReadonlySet<string> = new Set([
  'Acid',
  'Experimental',
  'Abstract',
  'Leftfield',
  'Lo-Fi',
  'Vocal',
  'Instrumental',
  'Tribal',
  'Noise',
  'Minimal',
]);

/* `Minimal` est dans cette liste et non range sur la famille Minimal, et
   c'est deliberé : Discogs l'emploie aussi bien pour la techno minimale que
   pour le minimalisme savant et pour la synth-pop depouillee. La famille
   Minimal de SONAA est une chose precise ; ce mot-la ne l'est pas.
   « Minimal Techno », lui, tombe tout seul sur son genre. */

/** Les noms ou Discogs ecrit autrement que nous, ou plus grossierement.
    N'y figure QUE ce dont la lecture ne fait aucun doute : une orthographe
    differente du meme genre, ou un nom qui contient explicitement le nom de
    sa famille. */
export const ALIAS: Readonly<Record<string, Cible>> = {
  /* Orthographes. */
  'drum n bass': { sorte: 'genre', id: 'drumandbass' },
  'drum and bass': { sorte: 'genre', id: 'drumandbass' },
  'drumnbass': { sorte: 'genre', id: 'drumandbass' },
  'psy-trance': { sorte: 'genre', id: 'psychedelictrance' },
  'psytrance': { sorte: 'genre', id: 'psychedelictrance' },
  'goa': { sorte: 'genre', id: 'goatrance' },
  'bleep': { sorte: 'genre', id: 'bleeptechno' },
  'hi nrg': { sorte: 'genre', id: 'hinrg' },
  'hi-nrg': { sorte: 'genre', id: 'hinrg' },
  'italo-disco': { sorte: 'genre', id: 'italodisco' },
  'euro-disco': { sorte: 'genre', id: 'eurodisco' },
  'nu-disco': { sorte: 'genre', id: 'nudisco' },
  'trip hop': { sorte: 'genre', id: 'triphop' },
  'hip hop': { sorte: 'genre', id: 'hiphop' },
  'synth pop': { sorte: 'genre', id: 'synthpop' },
  'electro house': { sorte: 'genre', id: 'electrohouse' },
  'tech house': { sorte: 'genre', id: 'techhouse' },
  'deep house': { sorte: 'genre', id: 'deephouse' },
  'progressive house': { sorte: 'genre', id: 'progressivehouse' },
  'happy hardcore': { sorte: 'genre', id: 'happyhardcore' },
  'broken beat': { sorte: 'genre', id: 'brokenbeat' },
  'big beat': { sorte: 'genre', id: 'bigbeat' },
  'new beat': { sorte: 'genre', id: 'newbeat' },
  'dark ambient': { sorte: 'genre', id: 'darkambient' },
  'musique concrete': { sorte: 'genre', id: 'musiqueconcrete' },

  /* Discogs plus grossier que nous : le nom porte sa famille. */
  'euro house': { sorte: 'famille', id: 'house' },
  'deep techno': { sorte: 'famille', id: 'techno' },
  'hard house': { sorte: 'genre', id: 'hardhouse' },
  'bass music': { sorte: 'famille', id: 'bass' },
  'uk garage': { sorte: 'genre', id: 'ukgarage' },
  'garage house': { sorte: 'genre', id: 'garagehouse' },
  'breakbeat hardcore': { sorte: 'genre', id: 'breakbeathardcore' },
  'hardcore techno': { sorte: 'genre', id: 'hardcoretechno' },
  'industrial techno': { sorte: 'genre', id: 'industrialtechno' },
  'dub techno': { sorte: 'genre', id: 'dubtechno' },
  'ambient techno': { sorte: 'genre', id: 'ambienttechno' },
  'minimal techno': { sorte: 'genre', id: 'minimaltechno' },
  'detroit techno': { sorte: 'genre', id: 'detroittechno' },
  'hard techno': { sorte: 'genre', id: 'hardtechno' },
  'acid house': { sorte: 'genre', id: 'acidhouse' },
  'chicago house': { sorte: 'genre', id: 'chicagohouse' },
  'french house': { sorte: 'genre', id: 'frenchhouse' },
  'ghetto house': { sorte: 'genre', id: 'ghettohouse' },
  'afro house': { sorte: 'genre', id: 'afrohouse' },
  'latin house': { sorte: 'genre', id: 'latinhouse' },
  'soulful house': { sorte: 'genre', id: 'soulfulhouse' },
  'tribal house': { sorte: 'genre', id: 'tribalhouse' },
  'italo house': { sorte: 'genre', id: 'italohouse' },
  'hip house': { sorte: 'genre', id: 'hiphouse' },
  'disco house': { sorte: 'genre', id: 'discohouse' },
  'future house': { sorte: 'genre', id: 'futurehouse' },
  'bass house': { sorte: 'genre', id: 'basshouse' },
};

/* ═══ CE QUE DISCOGS VOIT ET QUE L'ATLAS N'A PAS ═══
 *
 * Ces noms sont bien electroniques, ils pesent, et aucun des 219 genres ne
 * leur correspond. Ce ne sont donc pas des erreurs de correspondance : ce
 * sont des trous dans la carte, que la moisson a nommes.
 *
 *   Synthwave   557      Italodance  231
 *   Eurodance   274      Hands Up    184
 *   Vaporwave   235      Eurobeat    158
 *
 * Ils sont LAISSES DE COTE plutot que ranges de force sur une famille
 * approchante : ajouter un genre a l'atlas est une decision d'auteur, elle
 * appartient a Mika, et la prendre en douce en rangeant Synthwave sous
 * Electro reviendrait a la prendre sans le dire. La liste est ici pour qu'on
 * n'ait pas a la recalculer le jour ou il tranche. */
export const TROUS: readonly string[] = [
  'Synthwave',
  'Eurodance',
  'Vaporwave',
  'Italodance',
  'Hands Up',
  'Eurobeat',
];

const sansAccent = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** La forme sur laquelle on compare : sans accent, sans ponctuation, en
    minuscules. « Hi-NRG », « Hi NRG » et « hinrg » deviennent le meme mot. */
export const aplatir = (s: string): string =>
  sansAccent(s).toLowerCase().replace(/[^a-z0-9]/g, '');

export interface Vocabulaire {
  readonly genres: ReadonlyMap<string, string>;
  readonly familles: ReadonlyMap<string, string>;
}

/** Construit les deux dictionnaires de comparaison a partir du corpus. */
export function vocabulaire(
  genres: readonly { id: string; label: string }[],
  familles: readonly { id: string; label: string }[]
): Vocabulaire {
  const g = new Map<string, string>();
  for (const x of genres) {
    g.set(aplatir(x.label), x.id);
    g.set(aplatir(x.id), x.id);
  }
  const f = new Map<string, string>();
  for (const x of familles) f.set(aplatir(x.label), x.id);
  return { genres: g, familles: f };
}

/** Ou ranger un nom de style Discogs, ou null s'il ne se range pas.
    L'ordre compte : un modificateur est ecarte AVANT d'etre cherche, sinon
    « Minimal » tomberait sur la famille du meme nom. */
export function ranger(nom: string, voc: Vocabulaire): Cible | null {
  if (MODIFICATEURS.has(nom)) return null;

  const alias = ALIAS[nom.toLowerCase()];
  if (alias) return alias;

  const plat = aplatir(nom);
  const genre = voc.genres.get(plat);
  if (genre) return { sorte: 'genre', id: genre };

  const famille = voc.familles.get(plat);
  if (famille) return { sorte: 'famille', id: famille };

  return null;
}
