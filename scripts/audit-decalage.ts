/* LES VRAIS DECALAGES : UN MORCEAU DONT LES ETIQUETTES NOMMENT UNE AUTRE
 * FAMILLE QUE LA SIENNE.
 *
 * ═══ POURQUOI CE SECOND TRI ═══
 *
 * `audit-coherence.ts` signale 248 morceaux « hors champ » : aucune etiquette
 * d'auditeur ne nomme leur genre, ni sa famille, ni ses parents. C'est utile,
 * mais ce n'est pas la question que Mika pose. Regarde Drill and Bass : les
 * treize morceaux sont signales, et les treize sont justes. Aphex Twin et
 * Squarepusher SONT le drill and bass ; simplement, les auditeurs de Last.fm
 * ecrivent « idm », pas « drill and bass ». Le genre est trop fin pour leur
 * vocabulaire. Signaler cela, c'est signaler le dictionnaire, pas le corpus.
 *
 * LE DEFAUT QU'IL FAUT ATTRAPER EST AUTRE. C'est « du disco dans la chicago
 * house » : un morceau dont les auditeurs disent, en nombre, qu'il appartient
 * a une famille DIFFERENTE de celle ou on l'a range. La difference entre les
 * deux cas n'est pas une question de seuil, c'est une question de nature :
 * dans le premier, les etiquettes sont muettes ou generiques ; dans le
 * second, elles designent ailleurs.
 *
 * ═══ COMMENT ON DECIDE ═══
 *
 * On construit un dictionnaire etiquette -> famille a partir du corpus
 * lui-meme : les 219 noms de genres et les 14 noms de familles, plus une
 * courte table de synonymes pour les mots que les auditeurs emploient sans
 * qu'ils soient des noms de genres chez nous.
 *
 * Un morceau est signale quand, ses etiquettes traduites :
 *   - AUCUNE ne pointe vers sa propre famille ni vers la lignee de son genre ;
 *   - au moins une pointe vers une autre famille, avec un poids reel.
 *
 * Les etiquettes generiques (electronic, experimental, dance) ne pointent
 * nulle part : c'est voulu. Elles ne disent pas ou est le morceau, donc elles
 * ne doivent ni l'accuser ni le disculper.
 *
 * ═══ IL N'ECRIT RIEN, ET IL NE SAIT PAS TOUT ═══
 *
 * Le classement d'un disque n'appartient pas a une somme d'etiquettes. Un
 * morceau peut etre range dans un genre PARCE QU'IL EN EST L'ANCETRE, et ses
 * auditeurs le rangeront alors dans la famille d'origine : c'est le cas de
 * « Love Train » chez Philly Soul comme racine du disco. Ces morceaux
 * remonteront ici, et c'est normal. La liste est courte exactement pour
 * qu'elle soit lisible a la main.
 *
 * Usage : npx tsx scripts/audit-decalage.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const CACHE = fileURLToPath(new URL('../.audit-coherence-cache.json', import.meta.url));
const RAPPORT = fileURLToPath(new URL('../audit-decalage.md', import.meta.url));

if (!existsSync(CACHE)) {
  console.error(
    "Le cache d'etiquettes est absent. Lancer d'abord :\n" +
      '  npx tsx scripts/audit-coherence.ts\n' +
      "qui interroge Last.fm et depose .audit-coherence-cache.json. Ce tri-ci\n" +
      'ne fait que relire ces mesures, il ne consomme aucun reseau.'
  );
  process.exit(1);
}

interface Track {
  youtubeId: string;
  artist: string;
  title: string;
  year?: number;
}
interface Genre {
  id: string;
  label: string;
  family: string;
  structuralParent?: string | null;
  parents?: string[];
  tracks?: Track[];
}

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as {
  genres: Genre[];
  families: { id: string; label: string }[];
};
const cache = JSON.parse(readFileSync(CACHE, 'utf8')) as Record<
  string,
  { tags?: [string, number][] }
>;

const nu = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const familleDe = new Map(corpus.genres.map((g) => [g.id, g.family]));
const labelFamille = new Map(corpus.families.map((f) => [f.id, f.label]));

/* ── Le dictionnaire etiquette -> famille ─────────────────────────────────── */

const versFamille = new Map<string, string>();
for (const f of corpus.families) versFamille.set(nu(f.label), f.id);
for (const g of corpus.genres) versFamille.set(nu(g.label), g.family);

/* LES MOTS DES AUDITEURS QUI NE SONT PAS DES NOMS DE GENRES CHEZ NOUS.
   Ecrits a la main, et courts : chaque ligne est une affirmation sur le
   monde, pas une commodite. On n'y met que ce dont on est sur. */
const SYNONYMES: Record<string, string> = {
  soul: 'roots',
  funk: 'roots',
  rnb: 'roots',
  randb: 'roots',
  motown: 'roots',
  hiphop: 'roots',
  rap: 'roots',
  reggae: 'roots',
  dancehall: 'roots',
  ska: 'roots',
  postpunk: 'industrial',
  newwave: 'industrial',
  ebm: 'industrial',
  gothic: 'industrial',
  goth: 'industrial',
  metal: 'industrial',
  drumandbass: 'breaks',
  drumnbass: 'breaks',
  dnb: 'breaks',
  jungle: 'breaks',
  gabber: 'hardcore',
  hardstyle: 'hardcore',
  happyhardcore: 'hardcore',
  psytrance: 'psy',
  goa: 'psy',
  italodisco: 'disco',
  nudisco: 'disco',
  boogie: 'disco',
  grime: 'bass',
  microhouse: 'minimal',
};

/* MOTS RETIRES APRES MESURE, ET LA RAISON VAUT D'ETRE ECRITE.

   `ambient`, `minimal`, `dub`, `garage`, `psychedelic` designaient chacun une
   famille, et chacun a produit du faux. Aphex Twin porte « ambient 62 » :
   avec ce mot au dictionnaire, ses dix morceaux de Drill and Bass etaient
   accuses d'appartenir a la famille Ambient. Ils n'y appartiennent pas, et
   l'etiquette ne dit pas cela : elle dit que cet artiste fait aussi de
   l'ambient. Un mot qui decrit une PARTIE de l'oeuvre d'un artiste ne peut
   pas servir a classer un de ses morceaux.

   Ne restent au dictionnaire que les mots qui, portes par un artiste,
   excluent pratiquement le reste : personne ne range MFSB en techno parce
   qu'on l'etiquette soul et funk. */
for (const [mot, fam] of Object.entries(SYNONYMES)) {
  if (!versFamille.has(mot)) versFamille.set(mot, fam);
}

/* LES ETIQUETTES QUI NE DESIGNENT RIEN. Elles ne disent pas ou est le
   morceau : ni accusation, ni alibi. Les laisser pointer quelque part
   ferait passer la moitie du corpus pour un decalage. */
const MUETTES = new Set(
  [
    'electronic', 'electronica', 'dance', 'electro', 'experimental', 'instrumental',
    'idm', 'club', 'house', 'techno', 'trance', 'breaks', 'bass', 'industrial',
    'seen live', 'favorites', 'british', 'american', 'german', 'french', 'japanese',
    'italian', 'belgian', 'dutch', 'uk', 'usa', 'female vocalists', 'male vocalists',
    '80s', '90s', '00s', '70s', '10s', 'pop', 'rock', 'indie', 'alternative', 'chill',
    'classic', 'oldies', 'remix', 'mix', 'dj', 'produced by', 'lofi', 'vaporwave',
  ].map(nu)
);
/* ═══ ACCUSER ET DISCULPER NE SONT PAS LE MEME GESTE ═══
 *
 * Un premier jet retirait du dictionnaire tous les mots generiques, pour
 * qu'ils cessent de designer une famille. Consequence non voulue : ils ne
 * pouvaient plus DISCULPER non plus. Drexciya, range en Detroit Electro,
 * porte « electro 99 » et « detroit techno 61 » ; le mot « electro » etant
 * muet, il ne comptait pas comme un alibi, et le morceau se retrouvait
 * accuse d'appartenir a la famille Techno. Neuf faux signalements sur un
 * seul artiste, et parmi les plus emblematiques du genre.
 *
 * Les deux roles sont donc separes. Le dictionnaire ENTIER sert a
 * disculper : si une seule etiquette, meme large, nomme la famille du genre
 * ou sa lignee, le morceau est chez lui et la mesure s'arrete la. Seuls les
 * mots specifiques peuvent accuser. C'est asymetrique a dessein, parce que
 * le cout d'une erreur ne l'est pas : accuser a tort fait perdre du temps a
 * lire, disculper a tort laisse passer un disque mal range. */
/* UN NOM DE FAMILLE N'ACCUSE JAMAIS, IL NE FAIT QUE DISCULPER.
 *
 * « ambient » est a la fois une famille de l'atlas et une etiquette que
 * portent la moitie des artistes electroniques : Aphex Twin est etiquete
 * « ambient 62 », et cela suffisait a accuser ses huit morceaux de Drill and
 * Bass d'appartenir a la famille Ambient. Ils n'y appartiennent pas.
 * L'etiquette dit seulement que cet artiste fait aussi de l'ambient.
 *
 * Accuser demande donc de la PRECISION : un sous-genre, « detroit techno »,
 * « italo disco », « gabber ». Un nom de famille est trop large pour porter
 * une accusation, et reste parfaitement bon pour porter un alibi. */
const NOMS_DE_FAMILLES = new Set(corpus.families.map((f) => nu(f.label)));
const PEUT_ACCUSER = (mot: string): boolean =>
  !MUETTES.has(mot) && !NOMS_DE_FAMILLES.has(mot);

/* ── La lignee d'un genre ─────────────────────────────────────────────────── */

const lignee = (g: Genre): Set<string> => {
  const s = new Set<string>([g.family]);
  const vus = new Set<string>();
  const pile = [...(g.parents ?? []), ...(g.structuralParent ? [g.structuralParent] : [])];
  while (pile.length) {
    const p = pile.pop();
    if (!p || vus.has(p)) continue;
    vus.add(p);
    const f = familleDe.get(p);
    if (f) s.add(f);
    const pg = corpus.genres.find((x) => x.id === p);
    if (pg) pile.push(...(pg.parents ?? []));
  }
  return s;
};

/* ── La mesure ────────────────────────────────────────────────────────────── */

interface Decalage {
  genre: string;
  familleGenre: string;
  morceau: string;
  annee?: number | undefined;
  designe: { famille: string; mot: string; poids: number }[];
  etiquettes: string;
}

const signals: Decalage[] = [];
let mesures = 0;
let sansEtiquettes = 0;

for (const g of corpus.genres) {
  const permises = lignee(g);
  for (const t of g.tracks ?? []) {
    /* LA CLE DU CACHE EST LE NOM NORMALISE, pas le nom tel quel. Ecrit
       autrement, la premiere version ne trouvait que seize morceaux sur
       2382 et annoncait « 2 decalages » : un rapport rassurant construit sur
       un cache qu'on ne savait pas lire. */
    const tags = cache[nu(t.artist)]?.tags;
    if (!tags || tags.length === 0) {
      sansEtiquettes += 1;
      continue;
    }
    mesures += 1;

    const ailleurs: { famille: string; mot: string; poids: number }[] = [];
    let disculpe = false;
    for (const [mot, poids] of tags) {
      const cle = nu(mot);
      const f = versFamille.get(cle);
      if (!f) continue;
      /* Disculper : toute etiquette, meme large, qui nomme la lignee. */
      if (permises.has(f)) {
        disculpe = true;
        break;
      }
      /* Accuser : seulement les mots specifiques. */
      if (!PEUT_ACCUSER(cle)) continue;
      /* UN POIDS PLANCHER. Last.fm rend des etiquettes a 3 ou 5 sur 100,
         posees par une poignee de gens : elles ne soutiennent aucune
         conclusion. A 25, l'etiquette est portee par une part reelle des
         auditeurs de cet artiste. */
      /* SEUIL A 60, RELEVE APRES MESURE. A 25, l'etiquette est portee par
         une minorite et decrit souvent une autre partie de l'oeuvre de
         l'artiste. A 60, elle est ce que la majorite de ses auditeurs dit de
         lui : c'est le seul niveau ou « cet artiste est ailleurs » se
         soutient. */
      if (poids >= 60) ailleurs.push({ famille: f, mot, poids });
    }
    if (disculpe || ailleurs.length === 0) continue;

    signals.push({
      genre: g.label,
      familleGenre: labelFamille.get(g.family) ?? g.family,
      morceau: `${t.artist} · ${t.title}`,
      annee: t.year,
      designe: ailleurs.sort((a, b) => b.poids - a.poids).slice(0, 3),
      etiquettes: tags
        .slice(0, 5)
        .map(([m, p]) => `${m} ${p}`)
        .join(', '),
    });
  }
}

/* Les plus lourds d'abord : c'est la ou le decalage est le mieux etabli. */
signals.sort((a, b) => (b.designe[0]?.poids ?? 0) - (a.designe[0]?.poids ?? 0));

const parGenre = new Map<string, Decalage[]>();
for (const s of signals) {
  const l = parGenre.get(s.genre) ?? [];
  l.push(s);
  parGenre.set(s.genre, l);
}

const lignes = [...parGenre.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .map(([genre, l]) => {
    const t = l[0];
    const corps = l
      .map(
        (s) =>
          `- **${s.morceau}**${s.annee ? ` (${s.annee})` : ''}  \n` +
          `  les auditeurs disent : ${s.designe.map((d) => `${d.mot} ${d.poids} → ${labelFamille.get(d.famille) ?? d.famille}`).join(', ')}  \n` +
          `  toutes ses etiquettes : ${s.etiquettes}`
      )
      .join('\n');
    return `## ${genre} · famille ${t?.familleGenre ?? '?'} (${l.length})\n\n${corps}\n`;
  });

const rapport = [
  '# Les morceaux ranges dans une famille qui n en est pas la leur',
  '',
  `Releve du ${new Date().toISOString().slice(0, 10)}. ${mesures} morceaux mesures, ` +
    `${sansEtiquettes} sans etiquettes exploitables, **${signals.length} signales** ` +
    `dans ${parGenre.size} genres.`,
  '',
  "Ce tri est plus severe que `audit-coherence.md` et beaucoup plus court. Il ne",
  "signale pas les morceaux dont les etiquettes sont muettes ou generiques : il",
  'signale ceux dont les auditeurs designent, en nombre, une AUTRE famille de',
  "l'atlas. C'est la difference entre « Last.fm ne connait pas ce genre » et",
  '« ce disque appartient ailleurs ».',
  '',
  'Un signalement peut etre juste malgre tout : un morceau range dans un genre',
  "parce qu'il en est la racine sera etiquete par sa propre famille d'origine.",
  'Le dernier mot revient a la lecture, pas au compte.',
  '',
  ...lignes,
].join('\n');

writeFileSync(RAPPORT, rapport);

console.log(`${mesures} morceaux mesures, ${sansEtiquettes} sans etiquettes.`);
console.log(`${signals.length} decalages dans ${parGenre.size} genres.`);
console.log(`Rapport : ${RAPPORT}`);
