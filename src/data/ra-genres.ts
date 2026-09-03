/* DE NOS 219 GENRES AUX 67 DE RESIDENT ADVISOR.

   Les deux vocabulaires ne decoupent pas le meme monde. SONAA distingue la
   Detroit Techno de la Birmingham Techno ; RA range les deux sous « Techno »
   parce qu'un agenda de soirees n'a pas besoin d'aller plus loin. Traduire
   dans ce sens fait donc TOUJOURS perdre de la finesse, et c'est normal :
   c'est le prix a payer pour que « je m'interesse a la dub techno » devienne
   une question qu'un agenda sache entendre.

   TROIS REGLES, DANS CET ORDRE.

   1. Meme identifiant des deux cotes. Vingt-huit genres tombent juste tout
      seuls : dubtechno, italodisco, minimaltechno, gqom, footwork...

   2. Une exception ecrite a la main, quand RA a un mot pour la chose mais
      pas le meme identifiant que nous : `usdeephouse` chez nous, `deephouse`
      chez eux.

   3. A defaut, le genre de la FAMILLE. Chercher « Ro-Minimal » dans un
      agenda ne rend rien nulle part au monde ; chercher « Minimal » rend les
      soirees ou l'on a une chance d'en entendre. Une reponse large vaut
      mieux qu'une page vide, a condition de dire a l'ecran que la recherche
      a ete elargie, ce que fait la page.

   CE QUI N'A PAS D'EQUIVALENT N'EN RECOIT PAS. Un genre dont ni
   l'identifiant, ni l'exception, ni la famille ne donnent quelque chose rend
   `null`, et la page affiche alors tout ce qui se joue en ville plutot que
   d'inventer une correspondance. */

/** Ce que RA sait filtrer. Releve le 3 septembre 2026 sur les listes de
    Londres, Berlin, Paris, Montreal, Detroit et Tokyo reunies. */
export const GENRES_RA = new Set([
  'acid', 'afrobeat', 'afrobeats', 'afrohouse', 'afrotech', 'amapiano', 'ambient',
  'bailefunk', 'balearic', 'ballroom', 'bass', 'breakbeat', 'breakcore', 'brokenbeat',
  'classical', 'club', 'dancehall', 'deephouse', 'dembow', 'disco', 'downtempo', 'drill',
  'drone', 'drumandbass', 'dub', 'dubstep', 'dubtechno', 'ebm', 'electro', 'electronica',
  'experimental', 'footwork', 'funksoul', 'gabber', 'garage', 'ghettotech', 'gqom',
  'grime', 'guaracha', 'hardcore', 'hiphop', 'house', 'idm', 'industrial', 'italodisco',
  'jazz', 'jungle', 'krautrock', 'kuduro', 'latinbass', 'minimal', 'minimaltechno',
  'neoperreo', 'newwave', 'noise', 'pop', 'postpunk', 'progressivehouse', 'psytrance',
  'reggaeton', 'riofunk', 'rnb', 'techhouse', 'techno', 'trance', 'ukfunky', 'vaporwave',
]);

/* LES EXCEPTIONS. Chacune dit « RA a un mot pour cela, mais pas le notre ».
   La liste est courte a dessein : chaque ligne en trop est une equivalence
   affirmee, donc une chose de plus a pouvoir se tromper. */
const EXCEPTIONS: Record<string, string> = {
  /* Le mot juste existe des deux cotes, l'identifiant seul differait. */
  usdeephouse: 'deephouse',
  ambientgenre: 'ambient',
  downtempogenre: 'downtempo',
  electromodern: 'electro',
  psychedelictrance: 'psytrance',
  ukgarage: 'garage',
  garagehouse: 'garage',
  speedgarage: 'garage',
  acidhouse: 'acid',
  acidtechno: 'acid',
  acidtrance: 'acid',
  chicagohouse: 'house',
  ghettohouse: 'ghettotech',
  reggae: 'dub',
  nujazz: 'jazz',
  funk: 'funksoul',
  soulfulhouse: 'funksoul',
  phillysoul: 'funksoul',
  hardcoretechno: 'hardcore',
  happyhardcore: 'hardcore',
  ukhardcore: 'hardcore',
  digitalhardcore: 'hardcore',
  breakbeathardcore: 'breakbeat',
  minimalwave: 'newwave',
  coldwave: 'newwave',
  darkwave: 'newwave',
  discopunk: 'postpunk',
  rhythmicnoise: 'noise',
  baltimoreclub: 'club',
  jerseyclub: 'club',
  deconstructedclub: 'club',
  industrialtechno: 'industrial',
  liquiddnb: 'drumandbass',
  drillnbass: 'drumandbass',
};

/* LA FAMILLE, EN DERNIER RECOURS. Quatorze lignes pour deux cent dix-neuf
   genres : c'est ce qui fait qu'aucun style choisi ne laisse la page muette.
   `roots` n'a pas d'equivalent utile chez RA, qui n'est pas un agenda de
   concerts de funk : il rend `funksoul`, le moins faux des mots proches. */
const PAR_FAMILLE: Record<string, string> = {
  disco: 'disco',
  house: 'house',
  techno: 'techno',
  minimal: 'minimal',
  trance: 'trance',
  psy: 'psytrance',
  industrial: 'industrial',
  roots: 'funksoul',
  breaks: 'breakbeat',
  bass: 'bass',
  electro: 'electro',
  hardcore: 'hardcore',
  ambient: 'ambient',
  downtempo: 'downtempo',
};

export interface Correspondance {
  /** Le mot que RA sait filtrer, ou `null` si rien de fiable n'a ete trouve. */
  readonly valeur: string | null;
  /** `true` quand on a du remonter a la famille : la page le dit a l'ecran,
      parce qu'une recherche elargie sans le dire fait passer une soiree
      house generique pour une soiree Chicago house. */
  readonly elargi: boolean;
}

export function correspondance(genreId: string, familleId: string): Correspondance {
  if (GENRES_RA.has(genreId)) return { valeur: genreId, elargi: false };
  const exception = EXCEPTIONS[genreId];
  if (exception) return { valeur: exception, elargi: false };
  const famille = PAR_FAMILLE[familleId];
  if (famille) return { valeur: famille, elargi: true };
  return { valeur: null, elargi: false };
}
