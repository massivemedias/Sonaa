/* LA MOISSON DES LABELS : une fiche par label que l'atlas connait.
 *
 * Usage : npm run moissonner:labels                 (tout, en reprenant)
 *         npm run moissonner:labels -- --refaire     (tout, de zero)
 *         npm run moissonner:labels -- --seulement="F Communications"
 *         npm run moissonner:labels -- --tranche     (la nuit : un 28e refait)
 *
 * Voir src/lib/labels.ts pour ce que la page en fait.
 *
 * ═══ QUELS LABELS ═══
 *
 * Tous ceux que le corpus cite sur un morceau, et ceux que les fiches des
 * styles nomment sans qu'aucun morceau les porte (Skam pour l'IDM). Il y en
 * avait d'abord un seuil, trois morceaux ou une page Wikipedia ; Mika a
 * demande les petits aussi, le 1er octobre 2026. Une fiche qui ne trouve
 * rien nulle part (ni morceau, ni Discogs, ni Wikipedia) n'est pas ecrite.
 *
 * ═══ D'OU VIENT CHAQUE CHAMP, ET SOUS QUELLE LICENCE ═══
 *
 * - Wikidata (CC0) : le pays, l'annee de fondation, les fondateurs, le site,
 *   l'identifiant Discogs, les adresses des pages Wikipedia. Interroge par
 *   lots de quarante noms, en exigeant que l'element soit un label (P31,
 *   sous-classe de Q18127) : « Tresor » est aussi un club.
 * - Wikipedia (CC BY-SA) : le resume de la page, en francais et en
 *   anglais. La page cite sa source par un lien, comme la licence le demande.
 * - Discogs : les sorties du label que le plus de gens possedent, triees par
 *   Discogs lui-meme, et la presentation du label quand Wikipedia n'en a pas.
 *   La recherche de Discogs est floue (« F Communications » ramene aussi
 *   F-Beat) : on ne garde que les sorties dont le label est exactement le bon.
 *
 * Aucune cle ne s'ecrit ici : le jeton Discogs vient de .env, lu par Node. */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cleDeLabel, nomsDeLabels, succes, estSansLabel, type FicheLabel, type SortieConnue } from '../src/lib/labels.ts';
import { slug } from '../src/lib/chemins.ts';
import { nettoyerProfil, sansTirets, variantes } from './lib/labels-moisson.ts';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const SORTIE = fileURLToPath(new URL('../src/data/labels.json', import.meta.url));
const INDEX = fileURLToPath(new URL('../src/data/labels-index.json', import.meta.url));
const AGENT = 'SonaaAtlas/1.0 (https://sonaa.ca; massivemedias@gmail.com)';
const DISCOGS = process.env['DISCOGS_TOKEN'] ?? '';
const REFAIRE = process.argv.includes('--refaire');
/* LE ROULEMENT DE LA NUIT. Tout refaire le premier du mois prenait plus de
   deux heures avec les petits labels, au-dela des 90 minutes de la moisson
   automatique. Chaque nuit refait donc un vingt-huitieme des fiches, choisi
   par le nom : tout est rafraichi en quatre semaines. Un label nomme par une
   fiche de style et introuvable n'est recherche que dans sa tranche. */
const TRANCHE = process.argv.includes('--tranche');
const dansLaTranche = (cle: string): boolean => {
  let h = 0;
  for (let i = 0; i < cle.length; i += 1) h = (h * 31 + cle.charCodeAt(i)) % 9973;
  return h % 28 === (new Date().getUTCDate() - 1) % 28;
};
const SEULEMENT = process.argv.find((a) => a.startsWith('--seulement='))?.slice('--seulement='.length) ?? null;

const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
/* UNE ADRESSE QUI RESSEMBLE A UNE CLE N'ENTRE PAS : le controle des secrets
   du deploiement la refuserait (voir scripts/check-secrets-dist.mjs). */
const suspecte = (u: string): boolean => /ghp_|github_pat_|AIza|sk-[A-Za-z0-9]{16}|sb_secret_|eyJhbGciOi/.test(u);

/* ── 1. Les labels du corpus ─────────────────────────────────────────── */

/* LES CORRECTIONS A LA MAIN, relues le 1er octobre 2026 sur la moisson des
   petits labels. Chaque liste dit ce qu'une regle ne pouvait pas deviner. */

/** Ce que le corpus range dans la case « label » et qui n'en est pas un : des
    magazines (leurs mix offerts en couverture) et un studio de mastering. */
const PAS_DES_LABELS = new Set(['alchemy mastering', 'mixmag', 'xlr8r', 'knowledge magazine']);

/** Des noms que les fiches des styles citent, et que Wikidata et Discogs
    attribuent a un homonyme : « Tesco » y est la chaine de supermarches,
    « Wild Bunch » une societe de cinema, « Coyote » un studio de Portland.
    Ils restent ecrits dans la fiche du style, sans page. */
const NOMS_ECARTES = new Set(
  [
    'Acid Test', 'Blackout', 'Coyote', 'Cyber', 'DAT Records', 'Evolution', 'Formation', 'FUSE', 'Guidance', 'Insomniac Records',
    'Jazzanova', 'King Street', 'Les Disques du Soleil', 'Lost & Found', "Movin'", 'Mystic Sound', 'Noise Maker', 'People',
    'PPU', 'Pure Trance', 'Slip-N-Slide', 'Southern Fried', 'Subculture', 'Sudbeats', 'TCP', 'Tesco', 'Things To Come', 'Transmission',
    'VIM', 'Wild Bunch',
  ].map(cleDeLabel)
);

/** Le meme label sous un autre nom, que la recherche et les fiches des
    styles doivent retrouver : Tidy Trax est Tidy, Play It Again Sam est
    [PIAS]. */
const AUTRES_NOMS: Readonly<Record<string, readonly string[]>> = {
  tidy: ['tidy trax'],
  'd j international records': ['dj international'],
  'pias recordings': ['play it again sam'],
  'esl music': ['eighteenth street lounge'],
  diynamic: ['diynamic music'],
  'stil vor talent': ['still vor talent'],
  'jeahmon records': ['jeahmon'],
  'la dame noir records': ['la dame noir'],
  'melopee records': ['melopee'],
  'manta recordings': ['manta'],
  ximena: ['ximena records'],
};
const DEJA_NOMMES = new Set(Object.values(AUTRES_NOMS).flat());

/** Des labels dont la fiche Discogs trouvee par le nom est celle d'un autre. */
const DISCOGS_HOMONYMES = new Set(['clarity recordings', 'fox', 'blackbox records', 'arder records', 'muses of eden', 'la creme']);

interface LabelDuCorpus {
  cle: string;
  nom: string;
  graphies: Map<string, number>;
  n: number;
}

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as {
  genres: { tracks: { release?: { label?: string } | null }[]; labelsHistoriques?: string[]; labelsActuels?: string[] | null }[];
};
const parCle = new Map<string, LabelDuCorpus>();
for (const g of corpus.genres) {
  for (const t of g.tracks) {
    const nom = t.release?.label?.trim();
    if (!nom || estSansLabel(nom) || PAS_DES_LABELS.has(cleDeLabel(nom))) continue;
    const cle = cleDeLabel(nom);
    const l = parCle.get(cle) ?? { cle, nom, graphies: new Map(), n: 0 };
    l.n += 1;
    l.graphies.set(nom, (l.graphies.get(nom) ?? 0) + 1);
    parCle.set(cle, l);
  }
}
for (const l of parCle.values()) l.nom = [...l.graphies.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? l.nom;

/* LES LABELS AJOUTES A LA MAIN, absents du corpus. VRSTL Records, le label
   de Mika : l'atlas ne cite aucun morceau de son auteur (ADR-050), mais la
   galerie est un annuaire, et Mika veut y trouver son label (1er octobre
   2026). Sa fiche vient de Discogs comme celle des autres. */
interface AjoutLabel {
  readonly nom: string;
  readonly pays: string;
  readonly quebec?: boolean;
  readonly annee?: number;
  readonly fondateurs: readonly string[];
  readonly site: string;
  readonly discogsId?: number;
  readonly discogsArtistId?: number;
  readonly cles?: readonly string[];
  readonly anciens?: readonly string[];
  readonly resume?: { readonly fr: string; readonly en: string };
}

const AJOUTS: readonly AjoutLabel[] = [
  {
    nom: 'VRSTL Records',
    pays: 'Canada',
    quebec: true,
    annee: 2024,
    fondateurs: ['Maudite Machine'],
    site: 'https://vrstlrecords.com',
    discogsId: 3752945,
    resume: {
      fr: "Label montréalais fondé en 2024 par le producteur et compositeur de musique électronique Maudite Machine, dédié à la dark disco, à l'indie dance et aux rythmes électroniques hypnotiques.",
      en: 'Montreal-based record label founded in 2024 by electronic music producer and composer Maudite Machine, dedicated to dark disco, indie dance and hypnotic club electronics.',
    },
  },
  {
    nom: 'JEAHMON! Records',
    pays: 'Allemagne',
    annee: 2014,
    fondateurs: ['Marc DePulse'],
    site: 'https://www.jeahmon.de',
    discogsId: 417421,
    cles: ['jeahmon', 'jeahmon records'],
    anciens: ['jeahmon'],
    resume: {
      fr: "Label basé à Leipzig fondé en 2014 par Marc DePulse, dédié à l'indie dance, à la melodic house et à la techno mélodique.",
      en: 'Leipzig-based record label founded in 2014 by Marc DePulse, dedicated to indie dance, melodic house and melodic techno.',
    },
  },
  {
    nom: 'La Dame Noir Records',
    pays: 'France',
    annee: 2011,
    fondateurs: ['Phred Noir'],
    site: 'https://ladamenoir.bandcamp.com',
    discogsId: 728007,
    cles: ['la dame noir', 'la dame noir records'],
    anciens: ['la-dame-noir'],
    resume: {
      fr: "Label et collectif marseillais fondé en 2011 par Phred Noir, figure de la dark disco, de la slow techno et de l'indie dance.",
      en: 'Marseille-based label and collective founded in 2011 by Phred Noir, a cornerstone of dark disco, slow techno and indie dance.',
    },
  },
  {
    nom: 'Phantasy Sound',
    pays: 'Royaume-Uni',
    annee: 2007,
    fondateurs: ['Erol Alkan'],
    site: 'https://phantasysound.co.uk',
    discogsId: 94402,
    cles: ['phantasy sound', 'phantasy'],
    anciens: ['phantasy'],
    resume: {
      fr: 'Label londonien fondé en 2007 par Erol Alkan, croisant électro, acid, indie dance et techno psychédélique (Daniel Avery, Boys Noize, Connan Mockasin, Red Axes).',
      en: 'London-based record label founded in 2007 by Erol Alkan, bridging electro, acid, indie dance and psychedelic techno (Daniel Avery, Boys Noize, Connan Mockasin, Red Axes).',
    },
  },
  {
    nom: 'Stil vor Talent',
    pays: 'Allemagne',
    annee: 2005,
    fondateurs: ['Oliver Koletzki'],
    site: 'https://www.stilvortalent.de',
    discogsId: 46433,
    cles: ['stil vor talent', 'still vor talent'],
    anciens: ['still-vor-talent'],
    resume: {
      fr: "Label berlinois fondé en 2005 par Oliver Koletzki, pilier de la melodic house, de l'indie dance et de la techno mélodique.",
      en: 'Berlin-based record label founded in 2005 by Oliver Koletzki, a pillar of melodic house, indie dance and melodic techno.',
    },
  },
  {
    nom: 'Polaris',
    pays: 'France',
    annee: 2022,
    fondateurs: ['Darlyn Vlys'],
    site: 'https://polarisrecords.bandcamp.com',
    discogsId: 3992946,
    cles: ['polaris', 'polaris records', 'polaris label'],
    resume: {
      fr: "Label fondé en 2022 par le producteur français Darlyn Vlys, consacré à l'indie dance et à la dark disco (Damon Jee, AFFKT, Panthera, MMYYLO).",
      en: 'Record label founded in 2022 by French producer Darlyn Vlys, focused on indie dance and dark disco (Damon Jee, AFFKT, Panthera, MMYYLO).',
    },
  },
  {
    nom: 'Diynamic',
    pays: 'Allemagne',
    annee: 2006,
    fondateurs: ['Solomun', 'Adriano Trolio'],
    site: 'https://www.diynamic.com',
    discogsId: 62555,
    cles: ['diynamic', 'diynamic music'],
    anciens: ['diynamic-music'],
    resume: {
      fr: "Label hambourgeois fondé en 2006 par Solomun et Adriano Trolio (Diynamic Music, Do It Yourself), référence mondiale de la melodic house, de l'indie dance et de la deep house.",
      en: 'Hamburg-based label founded in 2006 by Solomun and Adriano Trolio (Diynamic Music, Do It Yourself), a leading imprint for melodic house, indie dance and deep house.',
    },
  },
  {
    nom: 'Permanent Vacation',
    pays: 'Allemagne',
    annee: 2006,
    fondateurs: ['Tom Bioly', 'Benjamin Fröhlich'],
    site: 'https://perm-vac.com',
    discogsId: 63501,
    cles: ['permanent vacation'],
    resume: {
      fr: "Label munichois fondé en 2006 par Tom Bioly et Benjamin Fröhlich, au carrefour du nu-disco, de l'italo, de la balearic et de l'indie dance (John Talabot, Tensnake, Todd Terje, Mano Le Tough).",
      en: 'Munich-based label founded in 2006 by Tom Bioly and Benjamin Fröhlich, at the crossroads of nu-disco, Italo, balearic and indie dance (John Talabot, Tensnake, Todd Terje, Mano Le Tough).',
    },
  },
  {
    nom: 'Hivern Discs',
    pays: 'Espagne',
    annee: 2008,
    fondateurs: ['John Talabot'],
    site: 'https://hiverndiscs.bandcamp.com',
    discogsId: 446528,
    cles: ['hivern discs', 'hivern'],
    resume: {
      fr: 'Label barcelonais fondé en 2008 par John Talabot, reconnu pour ses sorties électroniques aventureuses mêlant house hypnotique, leftfield, techno et dark disco.',
      en: 'Barcelona-based label founded in 2008 by John Talabot, acclaimed for its leftfield electronic releases blending hypnotic house, techno and dark disco.',
    },
  },
  {
    nom: 'Mélopée Records',
    pays: 'France',
    annee: 2019,
    fondateurs: ['Bamboo', 'Thomas M'],
    site: 'https://melopeerecords.bandcamp.com',
    discogsId: 1829941,
    cles: ['melopee records', 'melopee'],
    anciens: ['melopee'],
    resume: {
      fr: "Label français fondé à Lyon en 2019, spécialisé dans l'indie dance, la melodic techno et les grooves électroniques hybrides.",
      en: 'French record label founded in Lyon in 2019, specializing in indie dance, melodic techno and hybrid club grooves.',
    },
  },
  {
    nom: 'Dust & Blood',
    pays: 'France',
    annee: 2020,
    fondateurs: ['Damon Jee'],
    site: 'https://dustandblood.bandcamp.com',
    discogsId: 2731130,
    cles: ['dust and blood'],
    anciens: ['dust-and-blood'],
    resume: {
      fr: "Label français fondé par Damon Jee, dédié à la dark disco, à l'indie dance et aux textures électro-rock saturées.",
      en: 'French record label founded by Damon Jee, dedicated to dark disco, indie dance and saturated electro-rock club tracks.',
    },
  },
  {
    nom: 'Eskimo Recordings',
    pays: 'Belgique',
    annee: 2000,
    fondateurs: ['Dirk De Ruyck', 'Stefaan Vandenberghe'],
    site: 'https://www.eskimorecordings.be',
    discogsId: 6059,
    cles: ['eskimo recordings', 'eskimo'],
    resume: {
      fr: "Label belge fondé à Gand en 2000 dans le sillage des soirées Eskimo, pionnier du nu-disco, de la balearic et de l'indie dance (Lindstrøm, Aeroplane, Satin Jackets, Psychemagik).",
      en: 'Belgian label founded in Ghent in 2000 out of the legendary Eskimo parties, a pioneer of nu-disco, balearic and indie dance (Lindstrøm, Aeroplane, Satin Jackets, Psychemagik).',
    },
  },
  {
    nom: 'Ximena',
    pays: 'Mexique',
    annee: 2018,
    fondateurs: ['Ximena', 'Ali X'],
    site: 'https://soundcloud.com/ximena-delascurain',
    discogsArtistId: 6837202,
    cles: ['ximena', 'ximena records'],
    anciens: ['ximena-records'],
    resume: {
      fr: 'Projet et étiquette indie dance et dark disco basés à Mexico autour de Ximena et Ali X, mêlant synthés 80s, EBM et rythmes club.',
      en: 'Mexico City-based indie dance and dark disco imprint and project around Ximena and Ali X, blending 80s synth aesthetics, EBM and dark club rhythms.',
    },
  },
  {
    nom: 'Manta Recordings',
    pays: 'États-Unis',
    annee: 2023,
    fondateurs: ['IDORU', 'Sian'],
    site: 'https://www.beatport.com/label/manta-recordings/116415',
    discogsId: 3984072,
    cles: ['manta recordings', 'manta'],
    anciens: ['manta'],
    resume: {
      fr: 'Label fondé à Detroit en 2023 par Ashley Taylor (IDORU) et Sian, orienté indie dance, nu-disco, house et techno.',
      en: 'Detroit-based electronic music label founded in 2023 by Ashley Taylor (IDORU) and Sian, focused on indie dance, nu-disco, house and techno.',
    },
  },
  /* LES GRANDS LABELS QUI MANQUAIENT, ajoutes le 13 novembre 2026. Mika :
     « de toute la liste des labels, y a meme pas Turbo Records, fais une
     recherche approfondie des meilleurs labels du monde ». Chaque label a
     ete verifie un a un sur Discogs (identifiant, profil, nombre de
     sorties) : Turbo est le 242, celui de Tiga a Montreal, et non Turbo
     Recordings ou Turbo Records, deux homonymes. La moisson de la nuit en
     tire les sorties, le logo et le resume Wikipedia. */
  {
    nom: 'Turbo Recordings',
    pays: 'Canada',
    quebec: true,
    annee: 1998,
    fondateurs: ['Tiga', 'Thomas Von Party'],
    site: 'http://www.turborecordings.com',
    discogsId: 242,
    cles: ['turbo', 'turbo recordings', 'turbo records'],
    resume: {
      fr: 'Label électronique montréalais fondé en 1998 par Tiga, institution mondiale de la techno, de l’électro et de la house (Chromeo, Gesaffelstein, Boys Noize, Azari & III, Charlotte de Witte, Proxy).',
      en: 'Montreal electronic music powerhouse founded in 1998 by Tiga, releasing landmark techno, electro and house records (Chromeo, Gesaffelstein, Boys Noize, Azari & III, Charlotte de Witte, Proxy).',
    },
  },
  {
    nom: 'M_nus',
    pays: 'Canada',
    annee: 1998,
    fondateurs: ['Richie Hawtin'],
    site: 'https://www.discogs.com/label/246',
    discogsId: 246,
    cles: ['m nus'],
  },
  {
    nom: 'Lisbon Lux Records',
    pays: 'Canada',
    quebec: true,
    annee: 2013,
    fondateurs: ['Julien Manaud'],
    site: 'https://lisbonluxrecords.com',
    discogsId: 534643,
    cles: ['lisbon lux records'],
    resume: {
      fr: 'Label indépendant montréalais fondé en 2013 par Julien Manaud, phare de la synth-pop, du nu-disco, de la french touch et de la pop électronique francophone (Le Couleur, Paupière, Super Plage, Das Mörtal).',
      en: 'Montreal independent record label founded in 2013 by Julien Manaud, championing synth-pop, nu-disco, French touch and electronic pop (Le Couleur, Paupière, Super Plage, Das Mörtal).',
    },
  },
  {
    nom: 'Cocoon Recordings',
    pays: 'Allemagne',
    annee: 2000,
    fondateurs: ['Sven Väth'],
    site: 'http://www.cocoon.net',
    discogsId: 959,
    cles: ['cocoon recordings'],
  },
  {
    nom: 'Dekmantel',
    pays: 'Pays-Bas',
    annee: 2009,
    fondateurs: ['Thomas Martojo', 'Casper Tielrooij'],
    site: 'http://dekmantel.com',
    discogsId: 148054,
    cles: ['dekmantel'],
  },
  {
    nom: 'Rush Hour',
    pays: 'Pays-Bas',
    annee: 1997,
    fondateurs: ['Antal Heitlager', 'Christiaan Macdonald'],
    site: 'https://www.discogs.com/label/1851',
    discogsId: 1851,
    cles: ['rush hour', 'rush hour recordings'],
  },
  {
    nom: 'BPitch Control',
    pays: 'Allemagne',
    annee: 1999,
    fondateurs: ['Ellen Allien'],
    site: 'http://www.bpitch.de',
    discogsId: 1466,
    cles: ['bpitch control'],
  },
  {
    nom: 'Mote-Evolver',
    pays: 'Royaume-Uni',
    annee: 2006,
    fondateurs: ['Luke Slater'],
    site: 'http://www.mote-evolver.com',
    discogsId: 60165,
    cles: ['mote evolver'],
  },
  {
    nom: 'Token',
    pays: 'Belgique',
    annee: 2007,
    fondateurs: ['Kr!z'],
    site: 'http://www.tokenrecords.com',
    discogsId: 80945,
    cles: ['token'],
  },
  {
    nom: 'Figure',
    pays: 'Allemagne',
    annee: 2003,
    fondateurs: ['Len Faki'],
    site: 'http://figure-music.com',
    discogsId: 13288,
    cles: ['figure'],
  },
  {
    nom: 'Mord',
    pays: 'Pays-Bas',
    annee: 2013,
    fondateurs: ['Bas Mooy'],
    site: 'http://mord.bandcamp.com/',
    discogsId: 159295,
    cles: ['mord'],
  },
  {
    nom: 'Dystopian',
    pays: 'Allemagne',
    annee: 2011,
    fondateurs: ['Rødhåd'],
    site: 'http://dystopian.de/',
    discogsId: 404310,
    cles: ['dystopian'],
  },
  {
    nom: 'Delsin',
    pays: 'Pays-Bas',
    annee: 1996,
    fondateurs: ['Marsel van der Wielen'],
    site: 'http://www.delsinrecords.com',
    discogsId: 457,
    cles: ['delsin'],
  },
  {
    nom: 'Stroboscopic Artefacts',
    pays: 'Allemagne',
    annee: 2009,
    fondateurs: ['Lucy'],
    site: 'http://www.stroboscopicartefacts.com',
    discogsId: 165187,
    cles: ['stroboscopic artefacts'],
  },
  {
    nom: 'Ellum Audio',
    pays: 'Espagne',
    annee: 2011,
    fondateurs: ['Maceo Plex'],
    site: 'http://www.ellumaudio.com/',
    discogsId: 313193,
    cles: ['ellum audio'],
  },
  {
    nom: 'Life and Death',
    pays: 'Italie',
    annee: 2010,
    fondateurs: ['DJ Tennis', 'Greg Oreck'],
    site: 'https://lifeanddeath.us/',
    discogsId: 219126,
    cles: ['life and death'],
  },
  {
    nom: 'Crosstown Rebels',
    pays: 'Royaume-Uni',
    annee: 2003,
    fondateurs: ['Damian Lazarus'],
    site: 'http://www.crosstownrebels.com',
    discogsId: 13612,
    cles: ['crosstown rebels'],
  },
  {
    nom: 'Bedrock Records',
    pays: 'Royaume-Uni',
    annee: 1999,
    fondateurs: ['John Digweed'],
    site: 'https://bedrock.org.uk',
    discogsId: 770,
    cles: ['bedrock records'],
  },
  {
    nom: 'Toolroom Records',
    pays: 'Royaume-Uni',
    annee: 2002,
    fondateurs: ['Mark Knight'],
    site: 'http://www.toolroomrecords.com',
    discogsId: 17675,
    cles: ['toolroom records'],
  },
  {
    nom: 'Rekids',
    pays: 'Royaume-Uni',
    annee: 2007,
    fondateurs: ['Radio Slave', 'James Masters'],
    site: 'http://rekids.com',
    discogsId: 58500,
    cles: ['rekids'],
  },
  {
    nom: 'Watergate Records',
    pays: 'Allemagne',
    annee: 2009,
    fondateurs: [],
    site: 'http://watergaterecords.bandcamp.com',
    discogsId: 122874,
    cles: ['watergate records'],
  },
  {
    nom: 'Get Physical Music',
    pays: 'Allemagne',
    annee: 2002,
    fondateurs: ['M.A.N.D.Y.', 'Booka Shade', 'DJ T.'],
    site: 'http://www.getphysicalmusic.com',
    discogsId: 8847,
    cles: ['get physical music'],
  },
  {
    nom: 'Mobilee',
    pays: 'Allemagne',
    annee: 2005,
    fondateurs: ['Anja Schneider', 'Ralf Kollmann'],
    site: 'https://mobileerecords.bandcamp.com/',
    discogsId: 41679,
    cles: ['mobilee'],
  },
  {
    nom: 'Desolat',
    pays: 'Allemagne',
    annee: 2007,
    fondateurs: ['Loco Dice', 'Martin Buttrich'],
    site: 'http://www.desolat.com',
    discogsId: 93611,
    cles: ['desolat'],
  },
  {
    nom: 'Dial',
    pays: 'Allemagne',
    annee: 2000,
    fondateurs: ['Carsten Jost', 'Turner', 'Lawrence'],
    site: 'http://www.dial-rec.de',
    discogsId: 392,
    cles: ['dial'],
  },
  {
    nom: 'Smallville Records',
    pays: 'Allemagne',
    annee: 2005,
    fondateurs: ['Julius Steinhoff', 'Just von Ahlefeld', 'Lawrence'],
    site: 'http://www.smallville-records.com',
    discogsId: 77423,
    cles: ['smallville records'],
  },
  {
    nom: 'Live At Robert Johnson',
    pays: 'Allemagne',
    annee: 2005,
    fondateurs: ['Ata', 'Gerd Janson'],
    site: 'http://www.robert-johnson.de',
    discogsId: 150470,
    cles: ['live at robert johnson'],
  },
  {
    nom: 'Optimo Music',
    pays: 'Royaume-Uni',
    annee: 2009,
    fondateurs: ['JD Twitch', 'JG Wilkes'],
    site: 'http://www.kompakt.fm/labels/optimo_muisic',
    discogsId: 140001,
    cles: ['optimo music'],
  },
  {
    nom: 'King Street Sounds',
    pays: 'États-Unis',
    annee: 1993,
    fondateurs: ['Hisa Ishioka'],
    site: 'https://www.discogs.com/label/789',
    discogsId: 789,
    cles: ['king street sounds'],
  },
  {
    nom: 'Mahogani Music',
    pays: 'États-Unis',
    annee: 1996,
    fondateurs: ['Moodymann'],
    site: 'http://www.mahoganimusic.com',
    discogsId: 9690,
    cles: ['mahogani music'],
  },
  {
    nom: 'Sound Signature',
    pays: 'États-Unis',
    annee: 1997,
    fondateurs: ['Theo Parrish'],
    site: 'http://www.soundsignature.net/',
    discogsId: 374,
    cles: ['sound signature'],
  },
  {
    nom: 'Ovum Recordings',
    pays: 'États-Unis',
    annee: 1994,
    fondateurs: ['Josh Wink', 'King Britt'],
    site: 'http://www.ovum-rec.com',
    discogsId: 35,
    cles: ['ovum recordings'],
  },
  {
    nom: 'Wolf + Lamb',
    pays: 'États-Unis',
    annee: 2006,
    fondateurs: ['Zev Eisenberg', 'Gadi Mizrahi'],
    site: 'http://www.wolflambmusic.com/',
    discogsId: 59701,
    cles: ['wolf lamb', 'wolf lamb music'],
  },
  {
    nom: 'Visionquest',
    pays: 'États-Unis',
    annee: 2010,
    fondateurs: ['Seth Troxler', 'Ryan Crosson', 'Lee Curtiss', 'Shaun Reeves'],
    site: 'http://yourvisionquest.com',
    discogsId: 229006,
    cles: ['visionquest'],
  },
  {
    nom: 'Throne Of Blood',
    pays: 'États-Unis',
    annee: 2007,
    fondateurs: ['Max Pask', 'James Friedman'],
    site: 'http://www.throneofbloodmusic.com',
    discogsId: 78622,
    cles: ['throne of blood'],
  },
  {
    nom: 'Malka Tuti',
    pays: 'Israël',
    annee: 2014,
    fondateurs: ['Asaf Samuel', 'Katzele'],
    site: 'https://malkatuti.bandcamp.com',
    discogsId: 847737,
    cles: ['malka tuti'],
  },
  {
    nom: 'Disco Halal',
    pays: 'Israël',
    annee: 2015,
    fondateurs: ['Moscoman'],
    site: 'http://www.discohalal.com',
    discogsId: 814927,
    cles: ['disco halal'],
  },
  {
    nom: 'Mannequin Records',
    pays: 'Italie',
    annee: 2008,
    fondateurs: ['Alessandro Adriani'],
    site: 'http://www.mannequinrecords.com',
    discogsId: 133282,
    cles: ['mannequin', 'mannequin records'],
  },
  {
    nom: 'Emotional Rescue',
    pays: 'Royaume-Uni',
    annee: 2013,
    fondateurs: ['Stuart Leath'],
    site: 'http://emotional-rescue.org',
    discogsId: 315799,
    cles: ['emotional rescue'],
  },
  {
    nom: 'Hell Yeah Recordings',
    pays: 'Italie',
    annee: 2009,
    fondateurs: ['Marco Gallerani'],
    site: 'http://www.hellyeahrec.it',
    discogsId: 77624,
    cles: ['hell yeah recordings'],
  },
  {
    nom: 'Dirt Crew Recordings',
    pays: 'Allemagne',
    annee: 2004,
    fondateurs: ['Break SL', 'Peter Dildo'],
    site: 'https://dirtcrew.bandcamp.com/',
    discogsId: 31242,
    cles: ['dirt crew recordings'],
  },
  {
    nom: 'Kalahari Oyster Cult',
    pays: 'Belgique',
    annee: 2017,
    fondateurs: ['Rey Colino'],
    site: 'https://kalaharioystercult.bandcamp.com/',
    discogsId: 1120990,
    cles: ['kalahari oyster cult'],
  },
  {
    nom: 'Pinkman',
    pays: 'Pays-Bas',
    annee: 2013,
    fondateurs: [],
    site: 'https://pinkman.bandcamp.com/',
    discogsId: 496004,
    cles: ['pinkman'],
  },
  {
    nom: 'Clan Destine Records',
    pays: 'Royaume-Uni',
    annee: 2009,
    fondateurs: ['Carl Clandestine'],
    site: 'http://clandestinerecords.bandcamp.com/',
    discogsId: 183888,
    cles: ['clan destine records'],
  },
  {
    nom: 'Spa In Disco',
    pays: 'Espagne',
    annee: 2013,
    fondateurs: ['Fran Deeper'],
    site: 'https://spaindisco.bandcamp.com/',
    discogsId: 815089,
    cles: ['spa in disco'],
  },
  {
    nom: 'Tigersushi',
    pays: 'France',
    annee: 2001,
    fondateurs: ['Joakim'],
    site: 'http://www.tigersushi.com',
    discogsId: 8123,
    cles: ['tigersushi'],
  },
  {
    nom: 'Pont Neuf Records',
    pays: 'France',
    annee: 2015,
    fondateurs: [],
    site: 'http://pontneuf.bandcamp.com',
    discogsId: 902173,
    cles: ['pont neuf records'],
  },
  {
    nom: 'Bunker Records',
    pays: 'Pays-Bas',
    annee: 1992,
    fondateurs: ['Guy Tavares'],
    site: 'https://www.discogs.com/label/1908',
    discogsId: 1908,
    cles: ['bunker records'],
  },
  {
    nom: 'Frustrated Funk',
    pays: 'Pays-Bas',
    annee: 2002,
    fondateurs: ['Klen'],
    site: 'https://frustratedfunk.bandcamp.com/',
    discogsId: 9239,
    cles: ['frustrated funk'],
  },
  {
    nom: 'Critical Music',
    pays: 'Royaume-Uni',
    annee: 2002,
    fondateurs: ['Kasra'],
    site: 'http://www.criticalmusic.com/',
    discogsId: 316138,
    cles: ['critical music'],
  },
  {
    nom: 'Good Looking Records',
    pays: 'Royaume-Uni',
    annee: 1991,
    fondateurs: ['LTJ Bukem'],
    site: 'https://goodlooking.gbuk.net',
    discogsId: 124,
    cles: ['good looking records'],
  },
  {
    nom: 'Med School',
    pays: 'Royaume-Uni',
    annee: 2009,
    fondateurs: [],
    site: 'https://www.discogs.com/label/68555',
    discogsId: 68555,
    cles: ['med school'],
  },
  {
    nom: 'Tectonic',
    pays: 'Royaume-Uni',
    annee: 2006,
    fondateurs: ['Pinch'],
    site: 'http://tectonicrecordings.com/',
    discogsId: 40294,
    cles: ['tectonic'],
  },
  {
    nom: 'Bonzai Records',
    pays: 'Belgique',
    annee: 1992,
    fondateurs: ['Fred Bervoets'],
    site: 'http://www.bonzaiprogressive.com',
    discogsId: 1078,
    cles: ['bonzai records'],
  },
  {
    nom: 'Revealed Recordings',
    pays: 'Pays-Bas',
    annee: 2010,
    fondateurs: ['Hardwell'],
    site: 'http://www.revealedrecordings.com/',
    discogsId: 187109,
    cles: ['revealed recordings'],
  },
  {
    nom: 'STMPD RCRDS',
    pays: 'Pays-Bas',
    annee: 2016,
    fondateurs: ['Martin Garrix'],
    site: 'http://www.stmpdrcrds.com/',
    discogsId: 982199,
    cles: ['stmpd rcrds'],
  },
  {
    nom: 'Erased Tapes Records',
    pays: 'Royaume-Uni',
    annee: 2007,
    fondateurs: ['Robert Raths'],
    site: 'https://www.erasedtapes.com/',
    discogsId: 88949,
    cles: ['erased tapes records'],
  },
  {
    nom: 'Morr Music',
    pays: 'Allemagne',
    annee: 1999,
    fondateurs: ['Thomas Morr'],
    site: 'http://www.morrmusic.com',
    discogsId: 196,
    cles: ['morr music'],
  },
  {
    nom: 'Nu Groove Records',
    pays: 'États-Unis',
    annee: 1988,
    fondateurs: ['Frank Mendez', 'Karen Mendez'],
    site: 'http://defected.com/music/releases/label/nu-groove',
    discogsId: 608,
    cles: ['nu groove records'],
  },
  {
    nom: 'Areal Records',
    pays: 'Allemagne',
    annee: 2000,
    fondateurs: ['Konfekt', 'Basteroid', 'Metope'],
    site: 'http://www.areal-records.com',
    discogsId: 3769,
    cles: ['areal records'],
  },
  {
    nom: 'Freude Am Tanzen',
    pays: 'Allemagne',
    annee: 1998,
    fondateurs: [],
    site: 'http://www.freude-am-tanzen.com',
    discogsId: 2643,
    cles: ['freude am tanzen'],
  },
  {
    nom: 'Yoruba Records',
    pays: 'États-Unis',
    annee: 1998,
    fondateurs: ['Osunlade'],
    site: 'http://yorubarecords.net',
    discogsId: 2744,
    cles: ['yoruba records'],
  },
  {
    nom: 'Hypercolour',
    pays: 'Royaume-Uni',
    annee: 2006,
    fondateurs: ['Jamie Russell', 'Alex Jones', 'Ste Roberts'],
    site: 'http://plus.google.com/107597690352100842743',
    discogsId: 75104,
    cles: ['hypercolour'],
  },
  {
    nom: 'Futureboogie Recordings',
    pays: 'Royaume-Uni',
    annee: 2007,
    fondateurs: ['Dave Harvey', 'Christophe Brodie'],
    site: 'http://vk.com/public45049485',
    discogsId: 241950,
    cles: ['futureboogie recordings'],
  },
  {
    nom: 'All Day I Dream',
    pays: 'États-Unis',
    annee: 2011,
    fondateurs: ['Lee Burridge', 'Matthew Dekay'],
    site: 'http://www.alldayidream.com',
    discogsId: 300702,
    cles: ['all day i dream'],
  },
  {
    nom: 'Sol Selectas',
    pays: 'États-Unis',
    annee: 2006,
    fondateurs: ['Sabo'],
    site: 'http://solselectas.com/',
    discogsId: 173630,
    cles: ['sol selectas'],
  },
  {
    nom: 'Steyoyoke',
    pays: 'Allemagne',
    annee: 2012,
    fondateurs: ['Soul Button', 'Nick Devon'],
    site: 'http://www.steyoyoke.com/',
    discogsId: 357949,
    cles: ['steyoyoke'],
  },
  {
    nom: 'Einmusika Recordings',
    pays: 'Allemagne',
    annee: 2008,
    fondateurs: ['Einmusik'],
    site: 'http://www.einmusika.com',
    discogsId: 136151,
    cles: ['einmusika recordings'],
  },
  {
    nom: 'Sleaze Records',
    pays: 'Royaume-Uni',
    annee: 2002,
    fondateurs: ['Hans Bouffmyhre'],
    site: 'http://www.sleaze-records.co.uk/',
    discogsId: 124817,
    cles: ['sleaze records'],
  },
  {
    nom: 'L.I.E.S.',
    pays: 'États-Unis',
    annee: 2010,
    fondateurs: ['Ron Morelli'],
    site: 'http://www.liesrecords.com',
    discogsId: 1698864,
    cles: ['l i e s', 'l i e s records'],
  },
  {
    nom: 'Kill The DJ',
    pays: 'France',
    annee: 2004,
    fondateurs: ['Chloé', 'Ivan Smagghe', 'Fany Corral'],
    site: 'https://www.discogs.com/label/28933',
    discogsId: 28933,
    cles: ['kill the dj', 'kill the dj records'],
  },
  {
    nom: 'Swamp81',
    pays: 'Royaume-Uni',
    annee: 2009,
    fondateurs: ['Loefah'],
    site: 'http://www.81ldn.com/',
    discogsId: 141880,
    cles: ['swamp 81', 'swamp81'],
  },
  /* LES LABELS ELECTRONIQUES DU QUEBEC, ajoutes le 18 novembre 2026. Mika :
     « Recherche tous les label de musique electronqiue du Quebec meme les
     petits et affichent les dans la page labels ! ». Des pionniers disco,
     Hi-NRG et electroacoustiques jusqu'aux micro-labels cassettes, Bandcamp
     et vinyles de Montreal et de Quebec, chaque identifiant Discogs a ete
     verifie a la main pour ecarter les homonymes etrangers. */
  {
    nom: 'Multi Culti',
    pays: 'Canada',
    quebec: true,
    annee: 2013,
    fondateurs: ['Thomas Von Party', 'Dreems'],
    site: 'https://multiculti.bandcamp.com',
    discogsId: 680741,
    cles: ['multi culti'],
    resume: {
      fr: 'Label montréalais fondé en 2013 par Thomas Von Party et Dreems, dédié à la psy-dance, à la slow techno, aux grooves cosmiques et aux musiques électroniques sans frontières.',
      en: 'Montreal-based electronic dance label founded in 2013 by Thomas Von Party and Dreems, exploring psychedelic club grooves, slow techno and cosmic dance music.',
    },
  },
  {
    nom: 'Cult Edits',
    pays: 'Canada',
    quebec: true,
    annee: 2018,
    fondateurs: ['Thomas Von Party', 'Dreems'],
    site: 'https://multiculti.bandcamp.com',
    discogsId: 1430082,
    cles: ['cult edits'],
    resume: {
      fr: "Sous-label montréalais de Multi Culti consacré aux edits vinyles et numériques de disco psychédélique, d'électro tropicale et de pépites club.",
      en: 'Montreal sub-label of Multi Culti dedicated to vinyl and digital club edits of psychedelic disco, global boogie and cosmic dancefloor cuts.',
    },
  },
  {
    nom: 'empreintes DIGITALes',
    pays: 'Canada',
    quebec: true,
    annee: 1990,
    fondateurs: ['Jean-François Denis'],
    site: 'https://empreintesdigitales.com',
    discogsId: 16656,
    cles: ['empreintes digitales'],
    resume: {
      fr: 'Label montréalais fondé en 1990 par Jean-François Denis au sein de Diffusion i Média, référence mondiale de la musique électroacoustique et acousmatique (Francis Dhomont, Robert Normandeau, Gilles Gobeil).',
      en: 'Montreal label founded in 1990 by Jean-François Denis under Diffusion i Média, a global benchmark for electroacoustic and acousmatic music (Francis Dhomont, Robert Normandeau, Gilles Gobeil).',
    },
  },
  {
    nom: 'Unidisc',
    pays: 'Canada',
    quebec: true,
    annee: 1977,
    fondateurs: ['George Cucuzzella'],
    site: 'https://www.unidisc.com',
    discogsId: 5411,
    cles: ['unidisc', 'unidisc music'],
    resume: {
      fr: "Institution montréalaise du disco, du Hi-NRG, de l'électro-funk et de la house fondée en 1977 par George Cucuzzella, gardienne d'un immense catalogue de maxis 12 pouces.",
      en: 'Historic Montreal disco, Hi-NRG, electro-funk and house institution founded in 1977 by George Cucuzzella, home to one of North America’s largest 12-inch dance catalogues.',
    },
  },
  {
    nom: 'Matra',
    pays: 'Canada',
    quebec: true,
    annee: 1980,
    fondateurs: ['George Cucuzzella'],
    site: 'https://www.discogs.com/label/26032-Matra',
    discogsId: 26032,
    cles: ['matra', 'matra records'],
    resume: {
      fr: "Label montréalais fondé en 1980 par George Cucuzzella, célèbre pour ses hymnes Hi-NRG, synth-dance et électro-disco comme Living on Video de Trans-X et les classiques de Lime.",
      en: 'Montreal dance label founded in 1980 by George Cucuzzella, renowned for landmark Hi-NRG and synth-disco classics including Trans-X’s Living on Video and Lime.',
    },
  },
  {
    nom: 'ISBA Music Entertainment Inc.',
    pays: 'Canada',
    quebec: true,
    annee: 1984,
    fondateurs: ['Maurice Velenosi'],
    site: 'http://www.isbamusic.com',
    discogsId: 13739,
    cles: ['isba music entertainment inc', 'isba music entertainment'],
    resume: {
      fr: "Maison de disques indépendante montréalaise active dès 1984 dans la synth-pop, le Hi-NRG, l'italo-disco et l'eurodance au Québec (Rational Youth, Mitsou, Bran Van 3000).",
      en: 'Montreal independent dance and electronic music company active since 1984 across synth-pop, Hi-NRG, Italo disco and 90s club releases.',
    },
  },
  {
    nom: 'ISBA',
    pays: 'Canada',
    quebec: true,
    annee: 1984,
    fondateurs: ['Maurice Velenosi'],
    site: 'http://www.isbamusic.com',
    discogsId: 31642,
    cles: ['isba'],
    resume: {
      fr: "Étiquette club et synth-pop montréalaise d'ISBA Music, pilier des maxis Hi-NRG, freestyle et dance pressés au Québec dans les années 1980 et 1990.",
      en: 'Montreal club and synth-pop imprint of ISBA Music, pressing landmark Quebec Hi-NRG, freestyle and dance 12-inch singles throughout the 1980s and 1990s.',
    },
  },
  {
    nom: 'Collect-Call',
    pays: 'Canada',
    quebec: true,
    annee: 2015,
    fondateurs: [],
    site: 'https://collect-call.bandcamp.com',
    discogsId: 844766,
    cles: ['collect call', 'collect call records'],
    resume: {
      fr: "Micro-label indépendant montréalais dédié à la house, au disco-boogie et aux grooves club taillés pour le vinyle et la piste.",
      en: 'Independent Montreal micro-label focused on underground house, boogie-disco cuts and club-ready grooves.',
    },
  },
  {
    nom: 'Interchill',
    pays: 'Canada',
    quebec: true,
    annee: 1995,
    fondateurs: ['Andrew Ross Collins'],
    site: 'https://interchill.bandcamp.com',
    discogsId: 1775,
    cles: ['interchill', 'interchill records'],
    resume: {
      fr: 'Label fondé à Montréal en 1995 par Andrew Ross Collins dans la foulée des nuits chill-out des années 1990, référence du psychill, de la psybient et du dub électronique.',
      en: 'Label founded in Montreal in 1995 by Andrew Ross Collins out of the 1990s ambient chill-out room scene, a benchmark for psychill, psybient and electronic dub.',
    },
  },
  {
    nom: 'NAFF',
    pays: 'Canada',
    quebec: true,
    annee: 2018,
    fondateurs: ['Francis Latreille (Priori)', 'Adam Feingold (Ex-Terrestrial)'],
    site: 'https://naffrecordings.bandcamp.com',
    discogsId: 1390196,
    cles: ['naff', 'naff recordings'],
    resume: {
      fr: 'Label montréalais fondé en 2018 par Priori et Ex-Terrestrial, figure majeure de la techno hypnotique, de la trance brumeuse, de l’IDM et de l’ambient contemporain.',
      en: 'Montreal record label founded in 2018 by Priori and Ex-Terrestrial, a leading force in hypnotic techno, hazy trance, IDM and contemporary ambient.',
    },
  },
  {
    nom: 'GARMO',
    pays: 'Canada',
    quebec: true,
    annee: 2020,
    fondateurs: ['Francis Latreille (Priori)', 'Adam Feingold (Ex-Terrestrial)'],
    site: 'https://naffrecordings.bandcamp.com',
    discogsId: 1779793,
    cles: ['garmo'],
    resume: {
      fr: 'Sous-label club montréalais lancé par Priori et Ex-Terrestrial dans le sillage de NAFF, dédié aux maxis house, techno, breaks et outils de piste percussifs.',
      en: 'Montreal club sister imprint of NAFF run by Priori and Ex-Terrestrial, dedicated to raw house, techno, breaks and percussive DJ tools.',
    },
  },
  {
    nom: 'ASL Singles Club',
    pays: 'Canada',
    quebec: true,
    annee: 2014,
    fondateurs: [],
    site: 'https://soundcloud.com/asl-singles-club',
    discogsId: 716715,
    cles: ['asl singles club'],
    resume: {
      fr: 'Étiquette vinyle et numérique montréalaise apparue au milieu des années 2010, point de ralliement de la scène house modulaire et club lo-fi locale (Project Pablo, Jump Source).',
      en: 'Montreal boutique vinyl and digital imprint emerging in the mid-2010s around the city’s raw modular house and underground club circle (Project Pablo, Jump Source).',
    },
  },
  {
    nom: 'Musique Risquée',
    pays: 'Canada',
    quebec: true,
    annee: 2007,
    fondateurs: ['Vincent Lemieux', 'Marc Leclair (Akufen)', 'Scott Monteith (Deadbeat)', 'Stephen Beaupré'],
    site: 'http://www.musique-risquee.com',
    discogsId: 16661,
    cles: ['musique risquee'],
    resume: {
      fr: 'Label montréalais fondé par Vincent Lemieux, Akufen, Deadbeat et Stephen Beaupré, pilier de la microhouse, de la minimal et d’une house organique cousue d’échantillons.',
      en: 'Montreal record label founded by Vincent Lemieux, Akufen, Deadbeat and Stephen Beaupré, a cornerstone of microhouse, minimal and sample-rich organic house.',
    },
  },
  {
    nom: 'Archipel',
    pays: 'Canada',
    quebec: true,
    annee: 2004,
    fondateurs: ['Jean-Patrice Rémillard (Pheek)'],
    site: 'https://archipelmusique.bandcamp.com',
    discogsId: 30259,
    cles: ['archipel', 'archipel musique'],
    resume: {
      fr: 'Label et collectif montréalais fondé en 2004 par Pheek, laboratoire prolifique de minimal, microhouse, dub techno et électronique expérimentale.',
      en: 'Montreal label and artist community founded in 2004 by Pheek, a prolific laboratory for minimal, microhouse, dub techno and experimental electronics.',
    },
  },
  {
    nom: 'Kalimari Musique',
    pays: 'Canada',
    quebec: true,
    annee: 2008,
    fondateurs: ['Jean-Patrice Rémillard (Pheek)'],
    site: 'https://archipelmusique.bandcamp.com',
    discogsId: 59045,
    cles: ['kalimari musique', 'kalimari'],
    resume: {
      fr: "Sous-label numérique montréalais d'Archipel animé par Pheek, consacré à la techno minimale ludique et à la microhouse.",
      en: 'Montreal digital sub-label of Pheek’s Archipel, dedicated to playful minimal techno and microhouse.',
    },
  },
  {
    nom: 'Sounds Of Beaubien Ouest',
    pays: 'Canada',
    quebec: true,
    annee: 2015,
    fondateurs: ['Sebastian Cowan', 'Patrick Holland'],
    site: 'https://sobomtl.bandcamp.com',
    discogsId: 1007103,
    cles: ['sounds of beaubien ouest', 'sobo'],
    resume: {
      fr: 'Aussi connu sous le nom SOBO, label dance montréalais né sur la rue Beaubien Ouest autour de Patrick Holland (Project Pablo), Sebastian Cowan et Gene Tellem, emblème de la house ensoleillée du Mile-Ex.',
      en: 'Also known as SOBO, a Montreal dance music imprint born on Beaubien Ouest around Patrick Holland (Project Pablo), Sebastian Cowan and Gene Tellem, defining the city’s warm deep house sound.',
    },
  },
  {
    nom: 'Verdicchio Music Publishing',
    pays: 'Canada',
    quebec: true,
    annee: 2016,
    fondateurs: ['Patrick Holland'],
    site: 'https://hollandpatrick.com',
    discogsId: 1474179,
    cles: ['verdicchio music publishing'],
    resume: {
      fr: 'Étiquette personnelle lancée à Montréal par le producteur Patrick Holland (Project Pablo), mêlant house feutrée, ambient et électronique downtempo.',
      en: 'Personal imprint founded in Montreal by producer Patrick Holland (Project Pablo), spanning warm house, ambient and downtempo electronics.',
    },
  },
  {
    nom: 'Temple Records',
    pays: 'Canada',
    quebec: true,
    annee: 2015,
    fondateurs: ['Adam Feingold (Ex-Terrestrial)', 'R Weng', 'M Salaciak'],
    site: 'https://templerecordsofficial.bandcamp.com',
    discogsId: 809288,
    cles: ['temple records', 'temple'],
    resume: {
      fr: 'Micro-label montréalais animé par Ex-Terrestrial, R Weng et M Salaciak, dédié à la house brumeuse, à l’électro analogique et à la techno atmosphérique.',
      en: 'Montreal underground label run by Ex-Terrestrial, R Weng and M Salaciak, releasing hazy house, analog electro and atmospheric club music.',
    },
  },
  {
    nom: 'La Rama Records',
    pays: 'Canada',
    quebec: true,
    annee: 2016,
    fondateurs: ['Kris Guilty'],
    site: 'https://laramarecords.bandcamp.com',
    discogsId: 1625356,
    cles: ['la rama records', 'la rama'],
    resume: {
      fr: 'Disquaire indépendant, distributeur et label montréalais fondé en 2016 par Kris Guilty dans le Mile End, carrefour essentiel de la house, du dub, de la techno et des musiques leftfield locales.',
      en: 'Independent Montreal record shop, distributor and label established in 2016 by Kris Guilty in Mile End, a vital hub for local house, techno, dub and leftfield vinyl.',
    },
  },
  {
    nom: 'La Rama Tapes',
    pays: 'Canada',
    quebec: true,
    annee: 2016,
    fondateurs: ['Kris Guilty'],
    site: 'https://laramarecords.bandcamp.com',
    discogsId: 1124943,
    cles: ['la rama tapes'],
    resume: {
      fr: 'Branche cassettes de La Rama Records à Montréal, publiant mixtapes, ambient, beats et expérimentations électroniques en tirages limités.',
      en: 'Cassette sub-label of Montreal’s La Rama Records, issuing limited-run ambient, beat, house and experimental electronic tapes.',
    },
  },
  {
    nom: 'Bienvenue Recordings',
    pays: 'Canada',
    quebec: true,
    annee: 2019,
    fondateurs: ['Gene Tellem'],
    site: 'https://bienvenuerecordings.bandcamp.com',
    discogsId: 1675545,
    cles: ['bienvenue recordings'],
    resume: {
      fr: 'Label indépendant montréalais fondé en 2019 par la productrice Gene Tellem dans l’orbite de La Rama, consacré à une deep house racée, à la techno et à l’électro.',
      en: 'Montreal independent label launched in 2019 by producer Gene Tellem out of La Rama Records, focused on deep house, techno and hardware-driven club music.',
    },
  },
  {
    nom: 'DustWORLD',
    pays: 'Canada',
    quebec: true,
    annee: 2019,
    fondateurs: ['Dust-e-1'],
    site: 'https://dustworld.bandcamp.com',
    discogsId: 1674010,
    cles: ['dustworld'],
    resume: {
      fr: 'Label montréalais fondé en 2019 par Dust-e-1 et distribué par Clone, croisant ambient techno, breakbeat, jungle vaporeuse et house profonde.',
      en: 'Montreal record label established in 2019 by Dust-e-1 and distributed by Clone, bridging ambient techno, misty jungle, breakbeat and deep house.',
    },
  },
  {
    nom: 'Humidex',
    pays: 'Canada',
    quebec: true,
    annee: 2019,
    fondateurs: ['Absurde', 'softcoresoft', 'S. Chioini'],
    site: 'https://humidex.bandcamp.com',
    discogsId: 1662910,
    cles: ['humidex'],
    resume: {
      fr: 'Label techno montréalais fondé par Absurde, softcoresoft et S. Chioini, dédié à l’acid, à la rave rapide, à l’électro et aux percussions club hybrides.',
      en: 'Montreal techno imprint founded by Absurde, softcoresoft and S. Chioini, championing acid, high-energy rave, electro and hybrid club tracks.',
    },
  },
  {
    nom: 'Booma Collective',
    pays: 'Canada',
    quebec: true,
    annee: 2009,
    fondateurs: [],
    site: 'https://boomacollective.bandcamp.com',
    discogsId: 617633,
    cles: ['booma collective', 'booma'],
    resume: {
      fr: 'Collectif et label montréalais actif depuis 2009, réunissant producteurs underground autour de la deep house, de la techno hypnotique et de l’ambient.',
      en: 'Montreal collective and record label active since 2009, bringing together local underground producers across deep house, hypnotic techno and ambient.',
    },
  },
  {
    nom: 'Collection Disques Durs',
    pays: 'Canada',
    quebec: true,
    annee: 2021,
    fondateurs: ['Multicolore', 'Courage'],
    site: 'https://collectiondisquesdurs.bandcamp.com',
    discogsId: 2101768,
    cles: ['collection disques durs'],
    resume: {
      fr: 'Label électronique montréalais lancé en 2021 par Multicolore (Piknic Électronik, Igloofest) et Courage, propulsant trance euphorique, house et electronica (TDJ, yehno).',
      en: 'Montreal electronic music label launched in 2021 by Multicolore (Piknic Électronik, Igloofest) and Courage, releasing euphoric trance, house and electronica (TDJ, yehno).',
    },
  },
  {
    nom: 'Moonshine',
    pays: 'Canada',
    quebec: true,
    annee: 2014,
    fondateurs: ['Pierre Kwenders', 'Hervé Kalongo', 'Félix Noé', 'Steven Michel', 'San Farafina'],
    site: 'https://moonshinemu.bandcamp.com',
    discogsId: 3831290,
    cles: ['moonshine', 'moonshine collectif'],
    resume: {
      fr: 'Collectif nocturne et label montréalais cofondé en 2014 par Pierre Kwenders et sa bande, célèbre pour ses fêtes secrètes de pleine lune et ses compilations afro-électroniques SMS for Location (afro house, batida, amapiano, club).',
      en: 'Montreal collective and label co-founded in 2014 by Pierre Kwenders, renowned for its full-moon secret raves and SMS for Location compilations blending afro-electronic club, batida, afro house and bass.',
    },
  },
  {
    nom: 'Mutek_Rec',
    pays: 'Canada',
    quebec: true,
    annee: 2002,
    fondateurs: ['Alain Mongeau'],
    site: 'https://mutek.org',
    discogsId: 13613,
    cles: ['mutek rec', 'mutek_rec'],
    resume: {
      fr: 'Bras discographique du festival montréalais MUTEK lancé en 2002, documentant la microhouse, la techno minimale et l’avant-garde électronique québécoise et internationale.',
      en: 'Record label arm of Montreal’s MUTEK festival launched in 2002, documenting microhouse, minimal techno and live electronic experimentation.',
    },
  },
  {
    nom: 'Oral',
    pays: 'Canada',
    quebec: true,
    annee: 1999,
    fondateurs: ['Eric Mattson'],
    site: 'http://www.oral.qc.ca',
    discogsId: 5223,
    cles: ['oral', 'oral records'],
    resume: {
      fr: 'Label indépendant d’art sonore et de musique électronique fondé à Montréal en 1999 par le commissaire audio Eric Mattson, auteur de plus de 80 parutions (Akufen, Mitchell Akiyama, Alexandre St-Onge).',
      en: 'Independent Montreal sound-art and experimental electronic label run by curator Eric Mattson since 1999, with over 80 releases (Akufen, Mitchell Akiyama, Alexandre St-Onge).',
    },
  },
  {
    nom: 'No Type',
    pays: 'Canada',
    quebec: true,
    annee: 1998,
    fondateurs: ['David Turgeon'],
    site: 'https://notype.bandcamp.com',
    discogsId: 5654,
    cles: ['no type', 'no type records'],
    resume: {
      fr: 'Netlabel pionnier fondé à Montréal en 1998 par David Turgeon, l’un des tout premiers au monde consacrés à l’électronique expérimentale, à la microhouse, au glitch et à l’électroacoustique (Akufen, Deadbeat, Pheek).',
      en: 'Pioneering Montreal netlabel founded in 1998 by David Turgeon, among the earliest online imprints for experimental electronics, microhouse, glitch and electroacoustics (Akufen, Deadbeat, Pheek).',
    },
  },
  {
    nom: 'Intr_version Records',
    pays: 'Canada',
    quebec: true,
    annee: 1999,
    fondateurs: ['Mitchell Akiyama'],
    site: 'https://www.discogs.com/label/7829-Intr_version-Records',
    discogsId: 7829,
    cles: ['intr version records', 'intr_version', 'intr version'],
    resume: {
      fr: 'Label montréalais fondé en 1999 par le compositeur Mitchell Akiyama, figure de l’IDM, du glitch, de l’ambient et de l’électronique de chambre au tournant des années 2000.',
      en: 'Montreal record label founded in 1999 by composer Mitchell Akiyama, shaping turn-of-the-millennium IDM, glitch, minimal electronics and chamber ambient.',
    },
  },
  {
    nom: 'Alien8 Recordings',
    pays: 'Canada',
    quebec: true,
    annee: 1996,
    fondateurs: ['Gary McKie', "Sean O'Hara"],
    site: 'https://alien8recordings.bandcamp.com',
    discogsId: 1095,
    cles: ['alien8 recordings', 'alien8'],
    resume: {
      fr: 'Label indépendant montréalais fondé en 1996 par Gary McKie et Sean O’Hara, reconnu pour ses parutions d’ambient, de noise et d’électronique expérimentale (Tim Hecker, Merzbow, Les Georges Leningrad).',
      en: 'Montreal independent label founded in 1996 by Gary McKie and Sean O’Hara, acclaimed for experimental electronic, ambient and noise releases (Tim Hecker, Merzbow, Les Georges Leningrad).',
    },
  },
  {
    nom: 'Substractif',
    pays: 'Canada',
    quebec: true,
    annee: 2000,
    fondateurs: ['Gary McKie', "Sean O'Hara"],
    site: 'https://alien8recordings.bandcamp.com',
    discogsId: 3905,
    cles: ['substractif'],
    resume: {
      fr: 'Sous-label d’Alien8 Recordings lancé à Montréal en 2000 exclusivement pour les musiques électroniques numériques, le glitch et l’ambient (premiers albums de Tim Hecker et Mitchell Akiyama).',
      en: 'Electronic sub-label of Montreal’s Alien8 Recordings launched in 2000 for digital synthesis, glitch and ambient works, including early albums by Tim Hecker and Mitchell Akiyama.',
    },
  },
  {
    nom: 'Ambiances Magnétiques',
    pays: 'Canada',
    quebec: true,
    annee: 1983,
    fondateurs: ['Jean Derome', 'René Lussier', 'Robert Marcel Lepage', 'Joane Hétu'],
    site: 'https://actuellecd.com',
    discogsId: 22199,
    cles: ['ambiances magnetiques'],
    resume: {
      fr: 'Collectif et label montréalais fondé en 1983 et distribué par DAME, foyer historique de la musique actuelle, de l’électroacoustique et de l’expérimentation électronique au Québec.',
      en: 'Montreal artist-run label founded in 1983 and distributed by DAME, a cornerstone of Quebec musique actuelle, electroacoustics and experimental electronics.',
    },
  },
  {
    nom: 'Avatar / OHM éditions',
    pays: 'Canada',
    quebec: true,
    annee: 1993,
    fondateurs: ['Centre Avatar'],
    site: 'https://avatarquebec.org',
    discogsId: 21144,
    cles: ['avatar ohm editions', 'ohm editions', 'ohm avatar'],
    resume: {
      fr: 'Maison d’édition sonore fondée en 1993 dans le quartier Saint-Roch à Québec par le centre d’artistes Avatar, dédiée à l’art audio, à l’électronique expérimentale et aux musiques électroacoustiques.',
      en: 'Audio-art publishing imprint founded in 1993 in Quebec City by the Avatar artist-run centre, dedicated to experimental electronics, electroacoustics and sound art.',
    },
  },
  {
    nom: 'Iturnem',
    pays: 'Canada',
    quebec: true,
    annee: 2003,
    fondateurs: ['Misstress Barbara'],
    site: 'http://www.iturnem.com',
    discogsId: 12590,
    cles: ['iturnem', 'iturnem music'],
    resume: {
      fr: 'Label techno montréalais dirigé par la productrice Misstress Barbara (successeur de Relentless en 2003), fer de lance de la techno percussive, du hardgroove et de la tech house.',
      en: 'Montreal techno imprint run by producer Misstress Barbara (renamed from Relentless in 2003), a flagship for driving percussive techno, hardgroove and tech house.',
    },
  },
  {
    nom: 'Relentless',
    pays: 'Canada',
    quebec: true,
    annee: 1999,
    fondateurs: ['Misstress Barbara'],
    site: 'https://www.discogs.com/label/12436-Relentless',
    discogsId: 12436,
    cles: ['relentless'],
    resume: {
      fr: 'Premier label techno fondé à Montréal en 1999 par Misstress Barbara avant de devenir Iturnem en 2003, témoin majeur de l’âge d’or rave et hardgroove montréalais.',
      en: 'Misstress Barbara’s original Montreal techno vinyl label founded in 1999 (renamed Iturnem in 2003), capturing the peak of Montreal’s late-90s rave and hardgroove sound.',
    },
  },
  {
    nom: 'Kannibalen Records',
    pays: 'Canada',
    quebec: true,
    annee: 2011,
    fondateurs: ['Marc Chagnon', 'Julien Maranda', 'Patrick Barry'],
    site: 'https://kannibalenrecords.bandcamp.com',
    discogsId: 849741,
    cles: ['kannibalen records', 'kannibalen'],
    resume: {
      fr: 'Label montréalais fondé en 2011 par le trio Black Tiger Sex Machine, poids lourd international de l’électro sombre, du dubstep, de la bass house et de la midtempo (Apashe, Kai Wachi, Snails, Dabin).',
      en: 'Montreal powerhouse founded in 2011 by Black Tiger Sex Machine, internationally renowned for heavy electro, dubstep, bass house and dark midtempo (Apashe, Kai Wachi, Snails, Dabin).',
    },
  },
  {
    nom: 'Cult Nation',
    pays: 'Canada',
    quebec: true,
    annee: 2009,
    fondateurs: ['Mischa', 'Franz Schuller'],
    site: 'https://cultnation.com',
    discogsId: 787374,
    cles: ['cult nation'],
    resume: {
      fr: 'Collectif et maison de disques indépendante montréalaise mêlant productions électroniques, bass music et pop alternative.',
      en: 'Montreal independent music collective and record label bridging electronic production, bass music and alternative pop.',
    },
  },
  {
    nom: 'Altar Records',
    pays: 'Canada',
    quebec: true,
    annee: 2009,
    fondateurs: ['Gabriel Le Mar (DJ Zen)'],
    site: 'https://altar.bandcamp.com',
    discogsId: 139339,
    cles: ['altar records'],
    resume: {
      fr: 'Label québécois fondé en 2009 par DJ Zen, référence internationale du psychill, de la psybient, du downtempo psychédélique et de l’ambient atmosphérique.',
      en: 'Quebec-based boutique label founded in 2009 by DJ Zen, globally recognized for psychill, psybient, psychedelic downtempo and deep ambient.',
    },
  },
  {
    nom: 'Altar Techno',
    pays: 'Canada',
    quebec: true,
    annee: 2018,
    fondateurs: ['DJ Zen'],
    site: 'https://techno.bandcamp.com',
    discogsId: 1694787,
    cles: ['altar techno'],
    resume: {
      fr: 'Division techno montréalaise d’Altar Records animée par DJ Zen, orientée dub techno, techno minimale et grooves profonds et hypnotiques.',
      en: 'Montreal techno imprint of Altar Records curated by DJ Zen, focusing on dub techno, minimal and deep hypnotic techno.',
    },
  },
  {
    nom: 'Altar Progressive',
    pays: 'Canada',
    quebec: true,
    annee: 2019,
    fondateurs: ['DJ Zen'],
    site: 'https://altar.bandcamp.com',
    discogsId: 1758228,
    cles: ['altar progressive'],
    resume: {
      fr: 'Sous-label québécois de la famille Altar Records dédié à la progressive psytrance mélodique et hypnotique.',
      en: 'Quebec sister imprint of Altar Records dedicated to melodic and hypnotic progressive psytrance.',
    },
  },
  {
    nom: 'Diatonic Records',
    pays: 'Canada',
    quebec: true,
    annee: 2020,
    fondateurs: ['Nyvium'],
    site: 'https://diatonicrecords.bandcamp.com',
    discogsId: 3709584,
    cles: ['diatonic records'],
    resume: {
      fr: 'Micro-label indépendant québécois dédié à la psytrance, à la full-on et aux sonorités psychédéliques nocturnes.',
      en: 'Independent Quebec psytrance micro-label focused on full-on, twilight and nocturnal psychedelic trance.',
    },
  },
  {
    nom: 'When We Dip XYZ',
    pays: 'Canada',
    quebec: true,
    annee: 2018,
    fondateurs: ['When We Dip'],
    site: 'https://wwdxyz.bandcamp.com',
    discogsId: 1587342,
    cles: ['when we dip xyz', 'xyz'],
    resume: {
      fr: 'Label montréalais lancé en 2018 par le média électronique When We Dip, dédié à l’organic house, à la deep house et à la progressive house mélodique.',
      en: 'Montreal label project launched in 2018 by electronic music platform When We Dip, curating organic house, deep house and melodic progressive.',
    },
  },
  {
    nom: 'When We Dip Records',
    pays: 'Canada',
    quebec: true,
    annee: 2021,
    fondateurs: ['When We Dip'],
    site: 'https://whenwedip.com',
    discogsId: 4323157,
    cles: ['when we dip records'],
    resume: {
      fr: 'Second volet discographique de l’équipe montréalaise When We Dip, tourné vers la house club et les maxis mélodiques.',
      en: 'Sister label from Montreal’s When We Dip team focused on club-ready deep and melodic house.',
    },
  },
  {
    nom: 'Cosmovision Records',
    pays: 'Canada',
    quebec: true,
    annee: 2017,
    fondateurs: [],
    site: 'https://cosmovisionrecords.bandcamp.com',
    discogsId: 3847643,
    cles: ['cosmovision records', 'cosmovision'],
    resume: {
      fr: 'Collectif et label montréalais né en 2017, croisant organic house, downtempo, folktronica et rythmes électroniques d’Amérique latine et du monde.',
      en: 'Montreal multicultural collective and label founded in 2017, blending organic house, downtempo, folktronica and global electronic rhythms.',
    },
  },
  {
    nom: 'Strange Town Recordings',
    pays: 'Canada',
    quebec: true,
    annee: 2010,
    fondateurs: [],
    site: 'https://strangetownrecordings.bandcamp.com',
    discogsId: 219521,
    cles: ['strange town recordings', 'strange town'],
    resume: {
      fr: 'Label montréalais actif depuis 2010 dans la deep house, la progressive house sombre et la techno minimale.',
      en: 'Montreal underground imprint active since 2010 across deep house, dark progressive house and minimal techno.',
    },
  },
  {
    nom: 'Mile End Records',
    pays: 'Canada',
    quebec: true,
    annee: 2005,
    fondateurs: ['Patrick Dream', 'Kirk Coleman'],
    site: 'https://soundcloud.com/mileendrecords',
    discogsId: 76428,
    cles: ['mile end records'],
    resume: {
      fr: 'Label montréalais fondé en 2005 par Patrick Dream et Kirk Coleman, dédié à la house, à la tech house et aux productions club du circuit local et international.',
      en: 'Montreal house and tech-house label started in 2005 by Patrick Dream and Kirk Coleman.',
    },
  },
  {
    nom: 'Griffintown Records',
    pays: 'Canada',
    quebec: true,
    annee: 2016,
    fondateurs: ['Patrick Dream', 'Kirk Coleman'],
    site: 'https://soundcloud.com/mileendrecords',
    discogsId: 1759384,
    cles: ['griffintown records'],
    resume: {
      fr: 'Sous-label montréalais issu de l’équipe de Mile End Records, orienté house et tech house de club.',
      en: 'Montreal sister label created by the founders of Mile End Records, releasing club house and tech house.',
    },
  },
  {
    nom: 'Ghost Club Records',
    pays: 'Canada',
    quebec: true,
    annee: 2017,
    fondateurs: ['Max-Antoine Gendron (Prince Club)', 'Sebastian Navarro'],
    site: 'https://ghostclubrecords.bandcamp.com',
    discogsId: 1430233,
    cles: ['ghost club records'],
    resume: {
      fr: 'Label indépendant montréalais fondé par Max-Antoine Gendron (Prince Club) et Sebastian Navarro, dédié à la house, à la tech house et aux maxis club.',
      en: 'Independent Montreal label founded by Max-Antoine Gendron (Prince Club) and Sebastian Navarro, releasing house and club cuts.',
    },
  },
  {
    nom: 'Red Channel Records',
    pays: 'Canada',
    quebec: true,
    annee: 2016,
    fondateurs: ['Tony Romanello'],
    site: 'https://redchannelrecords.bandcamp.com',
    discogsId: 1353239,
    cles: ['red channel records'],
    resume: {
      fr: 'Label techno fondé en 2016 par le producteur Tony Romanello, spécialisé dans la techno peak-time, la dark techno et l’acid.',
      en: 'Techno imprint founded in 2016 by producer Tony Romanello, specializing in peak-time, dark and acid techno.',
    },
  },
  {
    nom: 'Visage Musique',
    pays: 'Canada',
    quebec: true,
    annee: 2011,
    fondateurs: [],
    site: 'https://visagemusique.bandcamp.com',
    discogsId: 254521,
    cles: ['visage musique'],
    resume: {
      fr: 'Label indépendant montréalais consacré à la minimal synth, à la coldwave, à l’italo-disco et à l’EBM (Xarah Dion, Police des Mœurs, Automelodi).',
      en: 'Montreal underground label dedicated to minimal synth, coldwave, Italo disco and EBM (Xarah Dion, Police des Mœurs, Automelodi).',
    },
  },
  {
    nom: 'Facecontrol Audio Industries',
    pays: 'Canada',
    quebec: true,
    annee: 2020,
    fondateurs: ['Sean Kosa'],
    site: 'https://facecontrol-audio-industries.bandcamp.com',
    discogsId: 3905406,
    cles: ['facecontrol audio industries', 'facecontrol'],
    resume: {
      fr: 'Micro-label électronique montréalais dirigé par Sean Kosa, orienté EBM, électro brute, acid et techno industrielle.',
      en: 'Montreal underground electronic micro-label run by Sean Kosa, focusing on EBM, raw electro, acid and industrial techno.',
    },
  },
  {
    nom: 'Éditions Appærent',
    pays: 'Canada',
    quebec: true,
    annee: 2017,
    fondateurs: ['Pierre Guerineau', 'Jesse Osborne-Lanthier', 'Asael Richard-Robitaille', 'Anna Arrobas'],
    site: 'https://editionsappaerent.bandcamp.com',
    discogsId: 1863256,
    cles: ['editions appaerent'],
    resume: {
      fr: 'Maison d’édition et micro-label montréalais cofondé notamment par Pierre Guerineau (Essaie Pas) et Jesse Osborne-Lanthier, dédié à l’électronique expérimentale, à l’ambient et aux formes post-industrielles.',
      en: 'Montreal imprint co-run by Pierre Guerineau (Essaie Pas) and Jesse Osborne-Lanthier, dedicated to experimental electronics, ambient and post-industrial sound.',
    },
  },
  {
    nom: 'Total Black',
    pays: 'Canada',
    quebec: true,
    annee: 2012,
    fondateurs: [],
    site: 'https://totalblack.bandcamp.com',
    discogsId: 528464,
    cles: ['total black'],
    resume: {
      fr: 'Label underground de cassettes et de vinyles fondé à Montréal en 2012 (puis établi entre Montréal et Berlin), spécialisé dans l’industriel, la dark ambient, l’EBM et le noise.',
      en: 'Underground cassette and vinyl imprint founded in Montreal in 2012, specializing in industrial, dark ambient, EBM and power electronics.',
    },
  },
  {
    nom: 'Infinite Machine',
    pays: 'Canada',
    quebec: true,
    annee: 2011,
    fondateurs: ['Charlie Juárez', 'Nicholas James Concklin', 'Alin Ceauselu'],
    site: 'https://infinitemachine.bandcamp.com',
    discogsId: 356584,
    cles: ['infinite machine'],
    resume: {
      fr: 'Label électronique avant-gardiste né à Montréal en 2011, tremplin international pour la bass music déconstruite, le grime instrumental et la techno hybride (Toma Kami, Fenna Fiction).',
      en: 'Forward-thinking electronic label born in Montreal in 2011, an international hub for deconstructed club, instrumental grime and hybrid bass music.',
    },
  },
  {
    nom: 'Arbutus Records',
    pays: 'Canada',
    quebec: true,
    annee: 2009,
    fondateurs: ['Sebastian Cowan'],
    site: 'https://arbutusrecords.com',
    discogsId: 28927,
    cles: ['arbutus records', 'arbutus'],
    resume: {
      fr: 'Label indépendant montréalais né en 2009 dans l’entrepôt Lab Synthèse du Mile End autour de Sebastian Cowan, berceau des débuts synth-pop et électro-expérimentaux de Grimes, Blue Hawaii, Doldrums et Majical Cloudz.',
      en: 'Montreal DIY label founded in 2009 out of Mile End’s Lab Synthèse loft by Sebastian Cowan, launching early synth-pop and electronic records by Grimes, Blue Hawaii, Doldrums and Majical Cloudz.',
    },
  },
  {
    nom: 'Chez Kito Kat',
    pays: 'Canada',
    quebec: true,
    annee: 2006,
    fondateurs: ['Samuel Ricciuti', 'Salima Bouaraour', 'Christophe Biache'],
    site: 'https://chezkitokatrecords.bandcamp.com',
    discogsId: 179789,
    cles: ['chez kito kat', 'chez kito kat records'],
    resume: {
      fr: 'Label indépendant montréalais fondé en 2006 par Samuel Ricciuti, Salima Bouaraour et Christophe Biache, explorant electronica, IDM, synthwave et ambient.',
      en: 'Montreal independent label founded in 2006 by Samuel Ricciuti, Salima Bouaraour and Christophe Biache, exploring electronica, IDM, synthwave and ambient.',
    },
  },
  {
    nom: 'Jeunesse Cosmique',
    pays: 'Canada',
    quebec: true,
    annee: 2009,
    fondateurs: ['Chittakone Baccam', 'Alexis M. Brien', 'Catherine Debard'],
    site: 'https://jeunessecosmique.bandcamp.com',
    discogsId: 249853,
    cles: ['jeunesse cosmique'],
    resume: {
      fr: 'Micro-label montréalais fondé par Chittakone Baccam, Alexis M. Brien et Catherine Debard, voué aux synthétiseurs cosmiques, au drone, à l’ambient et aux bandes magnétiques.',
      en: 'Montreal DIY micro-label founded by Chittakone Baccam, Alexis M. Brien and Catherine Debard, devoted to cosmic synth music, drone, ambient and tape experiments.',
    },
  },
  {
    nom: 'Everyday Ago',
    pays: 'Canada',
    quebec: true,
    annee: 2018,
    fondateurs: ['Jean Néant (Joni Void)'],
    site: 'https://everydayago.bandcamp.com',
    discogsId: 1476583,
    cles: ['everyday ago'],
    resume: {
      fr: 'Micro-label et communauté créative fondés en 2018 dans le Mile End à Montréal par Jean Néant (Joni Void), dédiés à l’ambient intimiste, aux boucles de cassettes et au collage électronique (YlangYlang, Joni Void).',
      en: 'Mile End, Montreal micro-label and community founded in 2018 by Jean Néant (Joni Void), releasing intimate ambient, tape loops and electronic collage (YlangYlang, Joni Void).',
    },
  },
  {
    nom: 'Florina Cassettes',
    pays: 'Canada',
    quebec: true,
    annee: 2020,
    fondateurs: ['Pier-Luc Tremblay (Lamasz)', 'Francis Tremblay (Grandbruit)'],
    site: 'https://florinacassettes.bandcamp.com',
    discogsId: 2707307,
    cles: ['florina cassettes'],
    resume: {
      fr: 'Micro-label cassettes montréalais fondé par les frères Pier-Luc Tremblay (Lamasz) et Francis Tremblay (Grandbruit), consacré à l’ambient, au drone et à l’électronique minimaliste.',
      en: 'Montreal cassette micro-label founded by brothers Pier-Luc Tremblay (Lamasz) and Francis Tremblay (Grandbruit), dedicated to ambient, drone and minimalist electronics.',
    },
  },
  {
    nom: 'Distr!ck',
    pays: 'Canada',
    quebec: true,
    annee: 1996,
    fondateurs: [],
    site: 'https://www.discogs.com/label/1276-Distr!ck',
    discogsId: 1276,
    cles: ['distr ck', 'districk', 'districk records'],
    resume: {
      fr: 'Label underground montréalais de la fin des années 1990 situé rue Sainte-Catherine Ouest, resté célèbre pour ses maxis house, techno et électro et ses compilations Montréal House Musique et Montreal Basement.',
      en: 'Late-1990s underground Montreal house, techno and electro imprint on Ste-Catherine West, known for the landmark Montréal House Musique and Montreal Basement compilations.',
    },
  },
  {
    nom: '514 Records',
    pays: 'Canada',
    quebec: true,
    annee: 1996,
    fondateurs: [],
    site: 'https://www.discogs.com/label/88991-514-Records',
    discogsId: 88991,
    cles: ['514 records', 'five one four records'],
    resume: {
      fr: 'Label vinyle montréalais de house et de techno actif rue Notre-Dame Ouest à la fin des années 1990 (rebaptisé Haute Couture en 1999), baptisé d’après l’indicatif régional de Montréal.',
      en: 'Late-1990s Montreal vinyl house and techno label on Notre-Dame West named after the city’s 514 area code (rebranded as Haute Couture in 1999).',
    },
  },
  {
    nom: 'Numuzik Inc.',
    pays: 'Canada',
    quebec: true,
    annee: 1991,
    fondateurs: [],
    site: 'https://www.discogs.com/label/14712-Numuzik-Inc',
    discogsId: 14712,
    cles: ['numuzik inc', 'numuzik'],
    resume: {
      fr: 'Label et distributeur indépendant basé à Saint-Léonard (Montréal), acteur majeur de la house, de l’eurodance et des compilations club au Québec durant les années 1990 et 2000.',
      en: 'Independent dance label and distributor based in Saint-Léonard (Montreal), a major force for 1990s and 2000s house, eurodance and club releases in Quebec.',
    },
  },
  {
    nom: 'Kanibalz Digitalz',
    pays: 'Canada',
    quebec: true,
    annee: 2005,
    fondateurs: [],
    site: 'https://www.discogs.com/label/80973-Kanibalz-Digitalz',
    discogsId: 80973,
    cles: ['kanibalz digitalz', 'kanibalz'],
    resume: {
      fr: 'Netlabel originaire de la ville de Québec fondé au milieu des années 2000, référence canadienne du hardcore, du gabber, du UK hardcore et des musiques électroniques dures.',
      en: 'Quebec City netlabel established in the mid-2000s, a pioneering Canadian hub for hardcore, gabber, UK hardcore and hard electronic music.',
    },
  },
  {
    nom: 'Blackbox Records',
    pays: 'Canada',
    quebec: true,
    annee: 2020,
    fondateurs: [],
    site: 'https://blackboxrecords.ca',
    cles: ['blackbox records'],
    resume: {
      fr: 'Petit label indépendant montréalais porté par un collectif de producteurs locaux, dédié à la house, à la bass house et aux grooves club percutants.',
      en: 'Independent Montreal micro-label run by a collective of local producers, dedicated to house, bass house and gritty club grooves.',
    },
  },
  {
    nom: 'Ärder Records',
    pays: 'Canada',
    quebec: true,
    annee: 2021,
    fondateurs: ['Mike Larry'],
    site: 'https://arderrecords.bandcamp.com',
    cles: ['arder records'],
    resume: {
      fr: 'Micro-label techno montréalais lancé par le producteur Mike Larry, consacré à la techno brute, industrielle et hypnotique.',
      en: 'Montreal underground techno micro-label founded by producer Mike Larry, dedicated to raw, driving and hypnotic techno.',
    },
  },
  {
    nom: 'Muses of Eden',
    pays: 'Canada',
    quebec: true,
    annee: 2021,
    fondateurs: [],
    site: 'https://musesofeden.bandcamp.com',
    cles: ['muses of eden'],
    resume: {
      fr: 'Micro-label montréalais sur Bandcamp dédié à l’ambient, au kosmische, au new age électronique et aux paysages modulaires contemplatifs.',
      en: 'Montreal Bandcamp micro-label dedicated to ambient, kosmische, electronic new age and contemplative modular soundscapes.',
    },
  },
  {
    nom: 'La Crème',
    pays: 'Canada',
    quebec: true,
    annee: 2020,
    fondateurs: ['Xavier Constant (Jeune Chilly Chill)'],
    site: 'https://lacreme.bandcamp.com',
    cles: ['la creme'],
    resume: {
      fr: 'Micro-label numérique montréalais fondé par Xavier Constant (Jeune Chilly Chill), explorant mutations club, électro, bass et rythmes électroniques hybrides.',
      en: 'Montreal digital micro-label founded by Xavier Constant (Jeune Chilly Chill), exploring underground club mutations, electro and hybrid bass beats.',
    },
  },
];
const AJOUTE = new Map(AJOUTS.map((a) => [cleDeLabel(a.nom), a]));
for (const a of AJOUTS) {
  const cle = cleDeLabel(a.nom);
  if (!parCle.has(cle)) parCle.set(cle, { cle, nom: a.nom, graphies: new Map([[a.nom, 0]]), n: 0 });
}
/* LES LABELS QUE LES FICHES DES STYLES NOMMENT, sans morceau dans l'atlas.
   « Warp » est deja la sous « Warp Records » : un nom qui egale un label du
   corpus, a « Records » pres, n'en cree pas un second. */
const racineDuNom = (cle: string): string => cle.replace(/ (records|recordings|music|label)$/, '');
const racinesDuCorpus = new Set([...parCle.keys()].map(racineDuNom));
const NOMMES = new Set<string>();
for (const g of corpus.genres) {
  for (const nom of [...(g.labelsHistoriques ?? []), ...(g.labelsActuels ?? [])].flatMap(nomsDeLabels)) {
    const cle = cleDeLabel(nom);
    if (!cle || estSansLabel(nom) || parCle.has(cle) || racinesDuCorpus.has(racineDuNom(cle)) || NOMS_ECARTES.has(cle) || DEJA_NOMMES.has(cle)) continue;
    parCle.set(cle, { cle, nom, graphies: new Map([[nom, 0]]), n: 0 });
    racinesDuCorpus.add(racineDuNom(cle));
    NOMMES.add(cle);
  }
}
let labels = [...parCle.values()];
const tousLesNoms = new Set(labels.map((l) => l.cle));
if (SEULEMENT) labels = labels.filter((l) => l.cle === cleDeLabel(SEULEMENT));
console.log(`${labels.length} label(s) : ${labels.length - NOMMES.size - AJOUTS.length} du corpus, ${NOMMES.size} nommes par les fiches des styles.`);

/* ── 2. Wikidata ─────────────────────────────────────────────────────── */

interface Candidat {
  item: string;
  logo: string | null;
  exact: boolean;
  /** Trouve par un autre nom de l'element, pas par son nom. */
  alias: boolean;
  /** Le nom de l'element, en francais ou en anglais. */
  nomWikidata: string;
  pays: string | null;
  annee: number | null;
  site: string | null;
  discogs: string | null;
  enwiki: string | null;
  frwiki: string | null;
}

async function sparql(requete: string): Promise<Record<string, { value: string }>[]> {
  for (let essai = 0; essai < 4; essai += 1) {
    const r = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(requete)}`, {
      headers: { 'User-Agent': AGENT, Accept: 'application/sparql-results+json' },
    }).catch(() => null);
    if (r?.ok) return ((await r.json()) as { results: { bindings: Record<string, { value: string }>[] } }).results.bindings;
    await pause(3000 * (essai + 1));
  }
  return [];
}

const candidats = new Map<string, Candidat[]>();
for (let i = 0; i < labels.length; i += 40) {
  const lot = labels.slice(i, i + 40);
  const parVariante = new Map<string, { cle: string; exact: boolean }[]>();
  for (const l of lot) {
    for (const v of variantes(l.nom)) {
      const liste = parVariante.get(v) ?? [];
      liste.push({ cle: l.cle, exact: v === l.nom });
      parVariante.set(v, liste);
    }
  }
  const valeurs = [...parVariante.keys()].map((v) => `${JSON.stringify(v)}@en`).join(' ');
  const lignes = await sparql(`SELECT ?nom ?item ?itemLabel ?alias ?paysLabel ?debut ?site ?discogs ?enwiki ?frwiki ?logo WHERE {
    VALUES ?nom { ${valeurs} }
    { ?item rdfs:label ?nom } UNION { ?item skos:altLabel ?nom . BIND(true AS ?alias) }
    ?item wdt:P31/wdt:P279* wd:Q18127 .
    OPTIONAL { ?item wdt:P17 ?pays }
    OPTIONAL { ?item wdt:P571 ?debut }
    OPTIONAL { ?item wdt:P856 ?site }
    OPTIONAL { ?item wdt:P1955 ?discogs }
    OPTIONAL { ?item wdt:P154 ?logo }
    OPTIONAL { ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
    OPTIONAL { ?frwiki schema:about ?item ; schema:isPartOf <https://fr.wikipedia.org/> }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
  }`);
  for (const b of lignes) {
    const nom = b['nom']?.value ?? '';
    for (const { cle, exact } of parVariante.get(nom) ?? []) {
      const liste = candidats.get(cle) ?? [];
      const item = b['item']?.value.split('/').pop() ?? '';
      /* Le meme element peut revenir par plusieurs graphies : il garde la
         meilleure (le nom exact, et son vrai nom plutot qu'un autre). */
      const vu = liste.find((c) => c.item === item);
      if (vu) {
        vu.exact ||= exact;
        vu.alias &&= b['alias']?.value === 'true';
        continue;
      }
      const debut = Number.parseInt((b['debut']?.value ?? '').slice(0, 4), 10);
      const logo = b['logo']?.value ? decodeURIComponent(b['logo'].value.split('/').pop() ?? '') : null;
      liste.push({
        item,
        logo,
        exact,
        alias: b['alias']?.value === 'true',
        nomWikidata: b['itemLabel']?.value ?? '',
        pays: b['paysLabel']?.value ?? null,
        annee: Number.isFinite(debut) && debut > 1800 ? debut : null,
        site: b['site']?.value ?? null,
        discogs: b['discogs']?.value ?? null,
        enwiki: b['enwiki']?.value ?? null,
        frwiki: b['frwiki']?.value ?? null,
      });
      candidats.set(cle, liste);
    }
  }
  process.stdout.write(`\rWikidata : ${Math.min(i + 40, labels.length)}/${labels.length}`);
  await pause(400);
}
console.log('');

/** Le meilleur candidat : le nom exact avant une variante, puis celui qui a
    des pages Wikipedia. */
function choisir(liste: readonly Candidat[] | undefined): Candidat | null {
  if (!liste || liste.length === 0) return null;
  const note = (c: Candidat): number => (c.exact ? 4 : 0) + (c.frwiki ? 2 : 0) + (c.enwiki ? 1 : 0);
  return [...liste].sort((a, b) => note(b) - note(a))[0] ?? null;
}

/* UN NOM DE MOINS DE QUATRE LETTRES SE MEFIE DES AUTRES NOMS : « TME », le
   label hardstyle de Showtek, devenait Tencent Music Entertainment, dont
   c'est un autre nom (constate le 1er octobre 2026). Mais 12k s'appelle
   vraiment ainsi : refuser tous les noms courts le faisait disparaitre. */
const court = (cle: string): boolean => cle.replace(/ /g, '').length < 4;
/* UN ANCIEN NOM N'EST PAS UN AUTRE LABEL : 4AD s'est appele Axis, et le
   Axis de Jeff Mills devenait 4AD (constate le 1er octobre 2026). Un element
   trouve par un autre nom, alors qu'un label du corpus porte son vrai nom,
   appartient a ce label-la. */
const racine = (cle: string): string => cle.replace(/( (records|recordings|music|label|group|entertainment))+$/, '');
/* Un autre nom qui a la meme racine que le vrai (« Skint » pour « Skint
   Records ») est le meme label. Un autre nom sans parente (« Axis » pour
   4AD, « TME » pour Tencent Music Entertainment) n'est cru que si le nom
   est assez long et que le vrai nom n'est pas lui-meme un label du corpus. */
const acceptable = (c: Candidat, cle: string): boolean => {
  const a = AJOUTE.get(cle);
  if (a) {
    if (a.discogsId && c.discogs && c.discogs !== String(a.discogsId)) return false;
    if (a.pays && (!c.pays || c.pays !== a.pays) && (!a.discogsId || c.discogs !== String(a.discogsId))) return false;
  }
  if (!c.alias) return true;
  const vrai = cleDeLabel(c.nomWikidata);
  if (racine(vrai) === racine(cle)) return true;
  return !court(cle) && !tousLesNoms.has(vrai);
};
/* LES HOMONYMES : le Wikidata d'un autre label du meme nom. Titanic Records
   y est un label americain de 1973, celui du corpus sort du hardstyle. */
const HOMONYMES = new Set(['titanic records', 'polaris']);
const tousRetenus = labels
  .map((l) => ({
    l,
    wd: HOMONYMES.has(l.cle)
      ? null
      : choisir(candidats.get(l.cle)?.filter((c) => acceptable(c, l.cle))),
  }))
  .filter(({ l, wd }) => l.n >= 1 || wd?.frwiki || wd?.enwiki || AJOUTE.has(l.cle) || NOMMES.has(l.cle));

/* UN LABEL, UNE PAGE. Le corpus ecrit « Armada » et « Armada Music », « Out
   Of Line » et « Out Of Line Music » : deux graphies, un seul element
   Wikidata, et la galerie montrait deux fois le meme logo (vu le 1er octobre
   2026). Les graphies d'un meme element se fondent dans celle qui a le plus
   de morceaux ; les adresses des autres restent, en renvoi vers elle. */
/* Deux paires que Wikidata ne relie pas : Young Turks s'appelle Young depuis
   2021, et V2 n'y est trouve que sous V2 Records. */
const FUSIONS: Readonly<Record<string, string>> = { 'young turks': 'young', young: 'young', v2: 'v2', 'v2 records': 'v2' };
const groupe = (r: (typeof tousRetenus)[number]): string | undefined => (FUSIONS[r.l.cle] ? `fusion:${FUSIONS[r.l.cle]}` : r.wd?.item);
const tete = new Map<string, (typeof tousRetenus)[number]>();
for (const r of tousRetenus) {
  const item = groupe(r);
  if (!item) continue;
  const deja = tete.get(item);
  if (!deja || r.l.n > deja.l.n) tete.set(item, r);
}
const anciens = new Map<string, string[]>();
const retenus = tousRetenus.filter((r) => {
  const g = groupe(r);
  const t = g ? tete.get(g) : undefined;
  if (!t || t === r) return true;
  t.l.n += r.l.n;
  t.wd ??= r.wd;
  for (const [g, k] of r.l.graphies) t.l.graphies.set(g, (t.l.graphies.get(g) ?? 0) + k);
  anciens.set(t.l.cle, [...(anciens.get(t.l.cle) ?? []), slug(r.l.nom) || slug(r.l.cle)]);
  return false;
});
console.log(`${retenus.length} label(s) retenu(s).`);

/* Les fondateurs, en une requete par lot d'elements. */
const fondateurs = new Map<string, string[]>();
const items = retenus.map((r) => r.wd?.item).filter((x): x is string => Boolean(x));
for (let i = 0; i < items.length; i += 80) {
  const lignes = await sparql(`SELECT ?item ?fLabel WHERE {
    VALUES ?item { ${items.slice(i, i + 80).map((q) => `wd:${q}`).join(' ')} }
    ?item wdt:P112 ?f .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
  }`);
  for (const b of lignes) {
    const q = b['item']?.value.split('/').pop() ?? '';
    const n = b['fLabel']?.value ?? '';
    if (!n || /^Q\d+$/.test(n)) continue;
    fondateurs.set(q, [...new Set([...(fondateurs.get(q) ?? []), n])]);
  }
  await pause(400);
}

/* LES IMAGES DE DISCOGS QUE LA GALERIE NE MONTRE PAS, relues une a une le
   1er octobre 2026. Celle d'Industrial Records est une photo du camp
   d'Auschwitz, celle de Cold Meat Industry des carcasses pendues, celle de
   Titanic Records evoque une croix gammee. Vraies, mais pas en vignette :
   le monogramme les remplace. */
const IMAGES_REFUSEES = new Set(['industrial records', 'cold meat industry', 'titanic records']);

/* ── 2 bis. Les logos de Wikimedia Commons ────────────────────────────── */

/* LE LOGO DU LABEL, quand Wikidata en connait un (P154). Il est sur Commons,
   souvent en SVG, donc net a toutes les tailles ; on n'en garde que ceux dont
   la licence est libre (beaucoup sont « PD-textlogo », un logo fait de
   lettres n'etant pas protegeable), et on garde l'auteur et la page pour le
   credit. A defaut, la moisson prend l'image du label chez Discogs. */
const LIBRES = /^(cc0|public domain|pd|cc by|cc-by)/i;
const logosCommons = new Map<string, { url: string; credit: string; page: string }>();
const fichiersLogo = [...new Set(retenus.map((r) => r.wd?.logo).filter((x): x is string => Boolean(x)))];
for (let i = 0; i < fichiersLogo.length; i += 40) {
  const titres = fichiersLogo.slice(i, i + 40).map((f) => `File:${f}`).join('|');
  try {
    const r = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=360&titles=${encodeURIComponent(titres)}`,
      { headers: { 'User-Agent': AGENT } }
    );
    const j = (await r.json()) as {
      query?: { pages?: Record<string, { title?: string; imageinfo?: { thumburl?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }[] }> };
    };
    for (const page of Object.values(j.query?.pages ?? {})) {
      const ii = page.imageinfo?.[0];
      const licence = (ii?.extmetadata?.['LicenseShortName']?.value ?? '').replace(/<[^>]+>/g, '').trim();
      if (!ii?.thumburl || !LIBRES.test(licence)) continue;
      const auteur = (ii.extmetadata?.['Artist']?.value ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const fichier = (page.title ?? '').replace(/^File:/, '');
      logosCommons.set(fichier, {
        url: ii.thumburl,
        credit: sansTirets(`${auteur && !/^unknown/i.test(auteur) ? `${auteur}, ` : ''}${licence}, Wikimedia Commons`),
        page: ii.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fichier)}`,
      });
    }
  } catch {
    /* Commons muet : les labels prendront l'image de Discogs. */
  }
  await pause(500);
}
console.log(`${logosCommons.size} logo(s) libre(s) sur Commons.`);

/* ── 3. Wikipedia ────────────────────────────────────────────────────── */

/** Le resume de la page, coupe a la fin d'une phrase vers 700 signes. */
async function resume(adresse: string | null): Promise<string | undefined> {
  if (!adresse) return undefined;
  const m = /^https:\/\/(fr|en)\.wikipedia\.org\/wiki\/(.+)$/.exec(adresse);
  if (!m) return undefined;
  try {
    const r = await fetch(`https://${m[1]}.wikipedia.org/api/rest_v1/page/summary/${m[2]}`, { headers: { 'User-Agent': AGENT } });
    if (!r.ok) return undefined;
    const j = (await r.json()) as { extract?: string; type?: string; title?: string };
    if (j.type === 'disambiguation' || !j.extract) return undefined;
    /* UNE PAGE QUI REDIRIGE PARLE D'AUTRE CHOSE : « Gold Mind Records »
       renvoie a la biographie de son fondateur, Norman Harris. On ne garde
       que le resume de la page demandee elle-meme. */
    const demande = decodeURIComponent(m[2] ?? '').replace(/_/g, ' ').toLowerCase();
    if (j.title && j.title.toLowerCase() !== demande) return undefined;
    const texte = sansTirets(j.extract.replace(/\s+/g, ' ').trim());
    if (texte.length <= 700) return texte;
    const coupe = texte.slice(0, 700).lastIndexOf('. ');
    return coupe > 200 ? texte.slice(0, coupe + 1) : `${texte.slice(0, 700)}…`;
  } catch {
    return undefined;
  }
}

/* ── 4. Discogs ──────────────────────────────────────────────────────── */

async function discogs(chemin: string): Promise<unknown> {
  if (!DISCOGS) return null;
  for (let essai = 0; essai < 5; essai += 1) {
    /* UNE COUPURE DU RESEAU N'ARRETE PAS LA MOISSON : le 1er octobre 2026,
       un DNS absent une seconde l'a fait tomber a la fiche 486 sur 1560. On
       attend, et on reessaie. */
    const r = await fetch(`https://api.discogs.com${chemin}`, {
      headers: { 'User-Agent': AGENT, Authorization: `Discogs token=${DISCOGS}` },
    }).catch(() => null);
    if (!r) {
      await pause(15000);
      continue;
    }
    /* SOIXANTE REQUETES A LA MINUTE avec un jeton : une seconde entre deux,
       et une attente plus longue quand Discogs dit que c'est trop. */
    await pause(1100);
    if (r.status === 429) {
      await pause(20000);
      continue;
    }
    return r.ok ? r.json() : null;
  }
  return null;
}

/* LES SORTIES ELECTRONIQUES D'ABORD. Un label generaliste (Columbia,
   Atlantic, Virgin) a pour disques les plus possedes Miles Davis et Bruce
   Springsteen : vrai, mais hors sujet dans un atlas des musiques
   electroniques. On demande donc d'abord a Discogs ses sorties du genre
   « Electronic », et toutes ses sorties seulement s'il y en a moins de
   quatre (un label de house n'a pas toujours le genre ecrit partout). */
async function sortiesConnues(nomDiscogs: string, cle: string): Promise<SortieConnue[]> {
  const electroniques = await sortiesDuGenre(nomDiscogs, cle, 'Electronic', 'master');
  if (electroniques.length >= 4) return electroniques;
  const toutes = await sortiesDuGenre(nomDiscogs, cle, null, 'master');
  if (toutes.length >= 4) return toutes;
  /* UN PETIT LABEL NUMERIQUE N'A SOUVENT PAS DE « MASTER » chez Discogs, ses
     disques n'existant qu'en une edition : on prend alors ses sorties. */
  const editions = await sortiesDuGenre(nomDiscogs, cle, null, 'release');
  return editions.length > toutes.length ? editions : toutes;
}

async function sortiesDuGenre(nomDiscogs: string, cle: string, genre: string | null, type: 'master' | 'release'): Promise<SortieConnue[]> {
  const j = (await discogs(
    `/database/search?label=${encodeURIComponent(nomDiscogs)}&type=${type}&per_page=40&sort=have&sort_order=desc${genre ? `&genre=${encodeURIComponent(genre)}` : ''}`
  )) as {
    results?: { title?: string; year?: string; label?: string[]; genre?: string[]; community?: { have?: number }; cover_image?: string; uri?: string }[];
  } | null;
  const sorties: SortieConnue[] = [];
  for (const x of j?.results ?? []) {
    /* LE LABEL EXACT, ou on passe : voir l'en-tete. */
    if (!(x.label ?? []).some((l) => cleDeLabel(l) === cle || cleDeLabel(l) === cleDeLabel(nomDiscogs))) continue;
    const [artiste, ...reste] = (x.title ?? '').split(' - ');
    if (!artiste || reste.length === 0) continue;
    /* Une edition revient sous plusieurs formats : une fois suffit. */
    if (sorties.some((s) => s.url === `https://www.discogs.com${x.uri ?? ''}` || x.title === `${s.artiste} - ${s.titre}`)) continue;
    const annee = Number.parseInt(x.year ?? '', 10);
    /* UNE ADRESSE QUI RESSEMBLE A UNE CLE N'ENTRE PAS : le controle des
       secrets du deploiement la refuserait, et il a raison de ne rien
       laisser passer (voir scripts/check-secrets-dist.mjs). */
    const image = x.cover_image && !x.cover_image.includes('spacer.gif') && !suspecte(x.cover_image) ? x.cover_image : null;
    sorties.push({
      titre: sansTirets(reste.join(' - ').trim()),
      artiste: sansTirets(artiste.replace(/\*$/, '').replace(/\s\(\d+\)$/, '').trim()),
      annee: Number.isFinite(annee) && annee > 1900 ? annee : null,
      possedee: x.community?.have ?? 0,
      electronique: genre === 'Electronic' || (x.genre ?? []).includes('Electronic'),
      image,
      url: `https://www.discogs.com${x.uri ?? ''}`,
    });
    if (sorties.length >= 8) break;
  }
  return sorties;
}

async function sortiesDuLabelId(id: number): Promise<SortieConnue[]> {
  const j = (await discogs(`/labels/${id}/releases?per_page=30&sort=year&sort_order=desc`)) as {
    releases?: { id?: number; title?: string; artist?: string; year?: number; thumb?: string; stats?: { community?: { in_collection?: number } } }[];
  } | null;
  const sorties: SortieConnue[] = [];
  for (const x of j?.releases ?? []) {
    if (!x.artist || !x.title) continue;
    const url = `https://www.discogs.com/release/${x.id ?? ''}`;
    if (sorties.some((s) => s.url === url || `${s.artiste} - ${s.titre}` === `${x.artist} - ${x.title}`)) continue;
    const image = x.thumb && !x.thumb.includes('spacer.gif') && !suspecte(x.thumb) ? x.thumb : null;
    sorties.push({
      titre: sansTirets(x.title.trim()),
      artiste: sansTirets(x.artist.replace(/\*$/, '').replace(/\s\(\d+\)$/, '').trim()),
      annee: x.year && x.year > 1900 ? x.year : null,
      possedee: Math.max(1, x.stats?.community?.in_collection ?? 1),
      electronique: true,
      image,
      url,
    });
    if (sorties.length >= 8) break;
  }
  return sorties.sort((a, b) => b.possedee - a.possedee);
}

async function sortiesDeLArtisteId(id: number): Promise<SortieConnue[]> {
  const j = (await discogs(`/artists/${id}/releases?per_page=30&sort=year&sort_order=desc`)) as {
    releases?: { id?: number; type?: string; title?: string; artist?: string; year?: number; thumb?: string; stats?: { community?: { in_collection?: number } } }[];
  } | null;
  const sorties: SortieConnue[] = [];
  for (const x of j?.releases ?? []) {
    if (!x.artist || !x.title) continue;
    const url = `https://www.discogs.com/${x.type === 'master' ? 'master' : 'release'}/${x.id ?? ''}`;
    if (sorties.some((s) => s.url === url || `${s.artiste} - ${s.titre}` === `${x.artist} - ${x.title}`)) continue;
    const image = x.thumb && !x.thumb.includes('spacer.gif') && !suspecte(x.thumb) ? x.thumb : null;
    sorties.push({
      titre: sansTirets(x.title.trim()),
      artiste: sansTirets(x.artist.replace(/\*$/, '').replace(/\s\(\d+\)$/, '').trim()),
      annee: x.year && x.year > 1900 ? x.year : null,
      possedee: Math.max(1, x.stats?.community?.in_collection ?? 1),
      electronique: true,
      image,
      url,
    });
    if (sorties.length >= 8) break;
  }
  return sorties.sort((a, b) => b.possedee - a.possedee);
}

/* ── 5. L'ecriture, en reprenant ce qui est deja fait ─────────────────── */

const deja: Map<string, FicheLabel> = new Map(
  !REFAIRE && existsSync(SORTIE) ? (JSON.parse(readFileSync(SORTIE, 'utf8')) as FicheLabel[]).map((f) => [f.slug, f]) : []
);
const fiches = new Map<string, FicheLabel>(SEULEMENT ? deja : []);
/* En mode --seulement, un label qui n'est plus retenu sort du fichier. */
if (SEULEMENT && retenus.length === 0) for (const [s, f] of fiches) if (f.cles.includes(cleDeLabel(SEULEMENT))) fiches.delete(s);
const slugsPris = new Set<string>();
let faits = 0;

for (const { l, wd } of retenus) {
  let s = slug(l.nom) || slug(l.cle);
  while (slugsPris.has(s)) s = `${s}-2`;
  slugsPris.add(s);
  const avant = deja.get(s);
  const ajout = AJOUTE.get(l.cle);
  const ajoutChange = Boolean(
    ajout &&
      (!avant ||
        (DISCOGS_HOMONYMES.has(l.cle) && avant.sorties.length > 0) ||
        (ajout.discogsId === 12436 && avant.sorties.some((x) => x.artiste === 'Artful Dodger')) ||
        (avant.sorties.length === 0 && Boolean(ajout.discogsId || ajout.discogsArtistId)) ||
        (ajout.discogsId && !avant.discogs?.includes(`/${ajout.discogsId}`)))
  );
  /* Une fiche se reprend telle quelle, sauf si son element Wikidata a change
     depuis : les regles de reconnaissance ont pu la corriger. */
  if (avant && !SEULEMENT && !ajoutChange && (avant.wikidata ?? null) === (wd?.item ?? null) && !(TRANCHE && dansLaTranche(l.cle))) {
    fiches.set(s, {
      ...avant,
      n: l.n,
      pays: ajout?.quebec ? 'Canada' : (avant.pays ?? ajout?.pays ?? null),
      ...(avant.quebec || ajout?.quebec ? { quebec: true } : {}),
      annee: avant.annee ?? ajout?.annee ?? null,
      fondateurs: avant.fondateurs.length > 0 ? avant.fondateurs : (ajout?.fondateurs ?? []),
      site: avant.site ?? ajout?.site ?? null,
      resume: {
        ...((avant.resume.fr ?? ajout?.resume?.fr) ? { fr: (avant.resume.fr ?? ajout?.resume?.fr) as string } : {}),
        ...((avant.resume.en ?? ajout?.resume?.en) ? { en: (avant.resume.en ?? ajout?.resume?.en) as string } : {}),
      },
      cles: [...new Set([l.cle, ...[...l.graphies.keys()].map(cleDeLabel), ...(AUTRES_NOMS[l.cle] ?? []), ...(ajout?.cles ?? [])])],
      anciens: [...new Set([...(anciens.get(l.cle) ?? []), ...(ajout?.anciens ?? [])])],
    });
    continue;
  }
  if (TRANCHE && !avant && l.n === 0 && NOMMES.has(l.cle) && !dansLaTranche(l.cle)) continue;
  if (!REFAIRE && !SEULEMENT && !TRANCHE && !avant && !ajout && l.n === 0 && NOMMES.has(l.cle)) continue;

  let nomDiscogs = l.nom;
  let profil: string | null = null;
  let urlDiscogs: string | null = null;
  let imageDiscogs: string | null = null;
  const idDiscogsConnu = ajout?.discogsId ? String(ajout.discogsId) : wd?.discogs ?? null;
  if (DISCOGS && !DISCOGS_HOMONYMES.has(l.cle)) {
    const fiche = idDiscogsConnu
      ? ((await discogs(`/labels/${idDiscogsConnu}`)) as { name?: string; profile?: string; uri?: string; images?: { type?: string; uri?: string }[] } | null)
      : null;
    if (fiche?.name) {
      nomDiscogs = fiche.name;
      imageDiscogs = (fiche.images ?? []).find((i) => i.type === 'primary')?.uri ?? fiche.images?.[0]?.uri ?? null;
      profil = fiche.profile ? sansTirets(nettoyerProfil(fiche.profile)).slice(0, 900) || null : null;
      urlDiscogs = fiche.uri ?? null;
    } else {
      const r = (await discogs(`/database/search?type=label&q=${encodeURIComponent(l.nom)}&per_page=5`)) as {
        results?: { id?: number; title?: string; uri?: string; cover_image?: string }[];
      } | null;
      const exact = (r?.results ?? []).find((x) => cleDeLabel(x.title ?? '') === l.cle);
      if (exact?.title) {
        nomDiscogs = exact.title;
        imageDiscogs = exact.cover_image && !exact.cover_image.includes('spacer.gif') ? exact.cover_image : null;
        urlDiscogs = exact.uri ? `https://www.discogs.com${exact.uri}` : null;
        /* Sans Wikipedia, la presentation de Discogs est la seule : on la
           demande aussi pour un label trouve par son nom. */
        const detail = exact.id ? ((await discogs(`/labels/${exact.id}`)) as { profile?: string } | null) : null;
        profil = detail?.profile ? sansTirets(nettoyerProfil(detail.profile)).slice(0, 900) || null : null;
      }
    }
  }
  let sorties =
    DISCOGS && !DISCOGS_HOMONYMES.has(l.cle) && (!ajout?.discogsId || ![2731130, 3992946, 3984072, 12436].includes(ajout.discogsId))
      ? await sortiesConnues(nomDiscogs, l.cle)
      : [];
  if (DISCOGS && sorties.length < 4 && ajout?.discogsId) {
    const duLabel = await sortiesDuLabelId(ajout.discogsId);
    if (duLabel.length > sorties.length) sorties = duLabel;
  }
  if (DISCOGS && sorties.length === 0 && ajout?.discogsArtistId) {
    sorties = await sortiesDeLArtisteId(ajout.discogsArtistId);
    urlDiscogs ??= `https://www.discogs.com/artist/${ajout.discogsArtistId}`;
    imageDiscogs ??= sorties.find((x) => x.image)?.image ?? null;
  }
  const [resumeFrWiki, resumeEnWiki] = await Promise.all([resume(wd?.frwiki ?? null), resume(wd?.enwiki ?? null)]);
  const resumeFr = resumeFrWiki ?? ajout?.resume?.fr;
  const resumeEn = resumeEnWiki ?? ajout?.resume?.en;
  /* Un label nomme qu'on ne trouve nulle part n'a rien a montrer. */
  if (l.n === 0 && !urlDiscogs && !resumeFr && !resumeEn && !ajout) continue;

  fiches.set(s, {
    slug: s,
    nom: l.nom,
    cles: [...new Set([l.cle, ...[...l.graphies.keys()].map(cleDeLabel), ...(AUTRES_NOMS[l.cle] ?? []), ...(ajout?.cles ?? [])])],
    anciens: [...new Set([...(anciens.get(l.cle) ?? []), ...(ajout?.anciens ?? [])])],
    n: l.n,
    pays: ajout?.quebec ? 'Canada' : (wd?.pays ?? ajout?.pays ?? null),
    ...(avant?.quebec || ajout?.quebec ? { quebec: true } : {}),
    annee: wd?.annee ?? ajout?.annee ?? null,
    fondateurs: wd && (fondateurs.get(wd.item)?.length ?? 0) > 0 ? (fondateurs.get(wd.item) ?? []) : (ajout?.fondateurs ?? []),
    site: wd?.site ?? ajout?.site ?? null,
    wiki: { ...(wd?.frwiki ? { fr: wd.frwiki } : {}), ...(wd?.enwiki ? { en: wd.enwiki } : {}) },
    resume: { ...(resumeFr ? { fr: resumeFr } : {}), ...(resumeEn ? { en: resumeEn } : {}) },
    profil: resumeFr || resumeEn ? null : profil,
    discogs: urlDiscogs,
    wikidata: wd?.item ?? null,
    logo: (() => {
      const commons = wd?.logo ? logosCommons.get(wd.logo) : undefined;
      if (commons) return { url: commons.url, source: 'commons' as const, credit: commons.credit, page: commons.page };
      if (imageDiscogs && !suspecte(imageDiscogs) && !IMAGES_REFUSEES.has(l.cle)) return { url: imageDiscogs, source: 'discogs' as const, credit: null, page: urlDiscogs };
      return null;
    })(),
    sorties,
  });
  faits += 1;
  process.stdout.write(`\r${faits} fiche(s) faite(s) : ${l.nom.slice(0, 40).padEnd(40)}`);
  /* On ecrit en chemin : une moisson coupee reprend ou elle en etait. */
  if (faits % 10 === 0) writeFileSync(SORTIE, `${JSON.stringify([...fiches.values()].sort((a, b) => a.nom.localeCompare(b.nom)), null, 1)}\n`);
}

/* DEUX NOMS, UNE MEME FICHE DISCOGS : « Upsetter » et « Upsetter Records »
   n'ont pas d'element Wikidata pour les reunir, mais Discogs les donne pour
   un seul label. Ils se fondent comme les graphies d'un meme element. */
const parDiscogs = new Map<string, FicheLabel[]>();
for (const f of fiches.values()) if (f.discogs) parDiscogs.set(f.discogs, [...(parDiscogs.get(f.discogs) ?? []), f]);
for (const groupe of parDiscogs.values()) {
  if (groupe.length < 2) continue;
  const [t, ...autres] = [...groupe].sort((a, b) => b.n - a.n);
  if (!t) continue;
  fiches.set(t.slug, {
    ...t,
    ...(groupe.some((f) => f.quebec) ? { quebec: true } : {}),
    n: groupe.reduce((somme, f) => somme + f.n, 0),
    cles: [...new Set(groupe.flatMap((f) => f.cles))],
    anciens: [...new Set([...(t.anciens ?? []), ...autres.flatMap((f) => [f.slug, ...(f.anciens ?? [])])])],
  });
  for (const f of autres) fiches.delete(f.slug);
}

const tout = [...fiches.values()].sort((a, b) => a.nom.localeCompare(b.nom));
writeFileSync(SORTIE, `${JSON.stringify(tout, null, 1)}\n`);
/* L'INDEX DE LA RECHERCHE, a part et minuscule : la recherche le charge a
   chaque ouverture, et n'a besoin que du nom, des cles et de l'adresse. La
   fiche entiere ne se charge que sur la page du label. */
writeFileSync(
  INDEX,
  `${JSON.stringify(tout.map((f) => ({ s: f.slug, n: f.nom, k: f.cles, c: f.n, p: f.pays, ...(f.quebec ? { q: 1 as const } : {}), a: f.annee, l: f.logo?.url ?? null, r: succes(f) })))}\n`
);
const avecResume = tout.filter((f) => f.resume.fr || f.resume.en || f.profil).length;
const avecSorties = tout.filter((f) => f.sorties.length > 0).length;
const avecLogo = tout.filter((f) => f.logo).length;
console.log(`\n${tout.length} fiche(s) ecrite(s) dans src/data/labels.json : ${avecResume} avec une presentation, ${avecSorties} avec des sorties connues, ${avecLogo} avec un logo.`);
