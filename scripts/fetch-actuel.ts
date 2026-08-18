/* L'onglet ACTUEL : les sorties récentes d'un genre, triées par écoutes.

   ═══ CE QUE LA MESURE A CHANGÉ DANS LA CONCEPTION ═══

   La crainte de départ était un quota de 100 recherches par jour, soit dix
   jours pour couvrir 184 genres. Trois mesures l'ont dissipée.

   1. LE PROJET SAIT DÉJÀ CHERCHER SUR YOUTUBE SANS CLÉ. `searchYouTube`
      lit la page de résultats publique. C'est le chemin qu'utilise déjà
      import-tracks, il est sous garde-fou de CI depuis check:plafond, et
      il ne consomme AUCUN quota. `search.list`, à 100 unités, n'a donc
      jamais été nécessaire : on ne l'appelle pas une seule fois.

   2. `videos.list` REND CINQUANTE VIDÉOS PAR APPEL, pour une unité.
      Mesuré. C'est là que la clé sert vraiment : durée exacte, nombre de
      vues, date de publication, pour cinquante identifiants d'un coup.

   3. DISCOGS COUVRE INÉGALEMENT. Mesuré sur douze genres : Techno 1423
      sorties en 2023, Deep House 696, Drum and Bass 1127, mais Neurofunk
      0, Riddim 0, Gqom 2, Dark Psy 2. Il sert donc pour les genres
      majeurs, et les niches passent par la liste écrite à la main, comme
      les lots d'origine.

   Coût réel : environ 30 unités sur les 10 000 quotidiennes, soit 0,3 %.
   Le chantier tient en une passe, pas en dix jours.

   ═══ CE QUI RESTE MALGRÉ TOUT ═══

   La reprise et le comptage sont conservés. Non par superstition : Discogs
   limite à soixante requêtes par minute, le scraping peut se faire fermer
   la porte, et une passe de 184 genres dure assez longtemps pour être
   interrompue. Un chantier qui ne sait pas repartir où il en était se
   refait en entier, et c'est là qu'on gaspille vraiment.

   ═══ UN PIÈGE MESURÉ, À NE PAS REFAIRE ═══

   La date de publication YouTube N'EST PAS la date de sortie. « The Law »
   de The Infinity Project, sorti en 1994, a été publié sur YouTube en
   2015. Filtrer « les cinq dernières années » sur `publishedAt` ferait
   entrer des morceaux de trente ans dans l'onglet Actuel. La date de
   sortie vient donc de Discogs, jamais de YouTube.

   Deuxième piège du même ordre : sur Discogs, `year=2023` sans filtre de
   format rapporte surtout des RÉÉDITIONS. « Daft Punk, Homework, 2023 »
   est une réédition de 1997. D'où le filtre sur les formats courts.

   Usage :
     npm run fetch:actuel                  passe complète, reprend où elle en était
     npm run fetch:actuel -- --dry-run     n'écrit rien
     npm run fetch:actuel -- --budget=200  plafond d'unités pour cette passe
     npm run fetch:actuel -- --reset       repart de zéro */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { transaction } from './lib/corpus-store.ts';
import {
  isFullRelease,
  reseau,
  resolveTrack,
  sleep,
  tauxEchecReseau
} from './lib/match.ts';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const CORPUS = `${RACINE}src/data/corpus.json`;
const ETAT = `${RACINE}.actuel-state.json`;

const CLE = process.env['YOUTUBE_API_KEY'];
const DISCOGS = process.env['DISCOGS_TOKEN'] ?? lireEnv('DISCOGS_TOKEN');
const DRY = process.argv.includes('--dry-run');
const RESET = process.argv.includes('--reset');
const CIBLE = 5;
const ANNEES_RECENTES = 5;

/** Plafond d'unités pour cette passe. `videos.list` coûte 1, et rien
    d'autre n'est facturé : le reste passe par la page publique. */
const BUDGET = Number(
  process.argv.find((a) => a.startsWith('--budget='))?.slice(9) ?? '2000'
);

function lireEnv(nom: string): string | undefined {
  try {
    const ligne = readFileSync(`${RACINE}.env`, 'utf8')
      .split('\n')
      .find((l) => l.startsWith(`${nom}=`));
    return ligne?.slice(nom.length + 1).trim();
  } catch {
    return undefined;
  }
}

if (!CLE) {
  console.error(
    "YOUTUBE_API_KEY absente. Elle ne sert qu'à videos.list, pour la durée et " +
      'les vues. Sans elle ce chantier ne peut pas trier par écoutes : il est ' +
      'arrêté plutôt que de rendre un classement inventé.'
  );
  process.exit(1);
}

/* ------------------------------------------------------------------ état */

interface Etat {
  faits: string[];
  unitesConsommees: number;
  jour: string;
  ajoutsTotal: number;
}

const aujourdhui = (): string => new Date().toISOString().slice(0, 10);

const lireEtat = (): Etat => {
  if (RESET || !existsSync(ETAT)) {
    return { faits: [], unitesConsommees: 0, jour: aujourdhui(), ajoutsTotal: 0 };
  }
  const e = JSON.parse(readFileSync(ETAT, 'utf8')) as Etat;
  /* Le compteur d'unités est journalier : Google le remet à zéro à minuit
     heure du Pacifique. On remet à zéro au changement de date, ce qui est
     approximatif d'une poignée d'heures et toujours du bon côté. */
  if (e.jour !== aujourdhui()) {
    e.jour = aujourdhui();
    e.unitesConsommees = 0;
  }
  return e;
};

const etat = lireEtat();
const ecrireEtat = (): void => {
  if (!DRY) writeFileSync(ETAT, JSON.stringify(etat, null, 2) + '\n');
};

/* ------------------------------------------------------------- le corpus */

interface Track {
  youtubeId: string;
  artist: string;
  title: string;
  year?: number;
  [k: string]: unknown;
}
interface Genre {
  id: string;
  label: string;
  family: string;
  labelsActuels?: string[] | null;
  tracks: Track[];
}

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as { genres: Genre[] };

/** Un genre éteint n'a pas d'actuel, et ce n'est pas un manque. */
const estEteint = (g: Genre): boolean =>
  Array.isArray(g.labelsActuels) && g.labelsActuels.length === 0;

/* PRIORITÉ : les genres les plus peuplés d'abord, comme demandé. Le nombre
   de tracks déjà réunies est le meilleur indicateur disponible de
   l'importance d'un genre : c'est le travail éditorial déjà fait qui le
   dit, pas un classement inventé. À égalité, celui qui manque le plus. */
/* CE QUE CE SCRIPT REMPLIT, depuis la fusion des deux listes : les morceaux
   SANS ROLE, c'est-a-dire les sorties ordinaires. C'etait exactement le
   contenu de l'ancienne liste `actuel`, le compte est donc inchange. Il ne
   touche jamais aux morceaux d'origine ni aux canons, qui sont un choix
   editorial et non une recolte. */
const sansRole = (g: Genre): number => g.tracks.filter((t) => !t.role).length;

const aTraiter = corpus.genres
  .filter((g) => !estEteint(g) && sansRole(g) < CIBLE)
  .filter((g) => !etat.faits.includes(g.id))
  .sort((a, b) => {
    const poids = (g: Genre) => g.tracks.length;
    return poids(b) - poids(a) || sansRole(a) - sansRole(b);
  });

/* ------------------------------------------------------- Discogs, gratuit */

interface Candidat {
  artist: string;
  title: string;
  annee: number;
  possesseurs: number;
  /** Zero quand la sortie est unique : sa date est alors fiable. */
  masterId: number;
  /** Styles Discogs de l'oeuvre, DANS L'ORDRE. L'ordre est l'information. */
  styles: string[];
  /** Rang du style cherche dans ce tableau. 0 = style principal.
      Number.MAX_SAFE_INTEGER si absent. */
  rang: number;
}

/** Comparaison de styles tolerante aux variantes d'ecriture Discogs :
    « Drum n Bass », « Drum and Bass », « Drum & Bass » designent le meme
    style, et « Acid House » ne doit pas rater « Acid house ». */
const memeStyle = (a: string, b: string): boolean => {
  const n = (x: string) =>
    x
      .toLowerCase()
      .replace(/&|\band\b/g, 'n')
      .replace(/[^a-z0-9]/g, '');
  return n(a) === n(b);
};

/** LA MESURE DU BRUIT.

    Le premier soupcon portait sur le genre Discogs : « Madonna en acid
    house, c'est du hors-sujet ». La mesure dit le contraire, la release
    porte bien genre=["Electronic"]. Un filtre sur « Electronic » ne
    l'attraperait pas, et il ne pourrait pas servir de toute facon : les
    familles Hip-Hop et Reggae du corpus ne sont pas etiquetees Electronic.

    CE QUI SE MESURE VRAIMENT, C'EST LE RANG. Discogs classe les styles par
    importance. Madonna porte ["Dance-pop", "House", "Acid"] : « Acid »
    arrive en troisieme, derriere de la pop, c'est une couleur du morceau,
    pas sa nature. Ezequiel Arias porte ["Progressive House", "Acid"] :
    deuxieme, le morceau est vraiment de cette famille.

    Regle retenue : rang 0 ou 1, le style est central, l'entree est saine.
    Rang 2 et au-dela, le style est marginal, l'entree est comptee comme
    bruit. Style absent, l'entree est refusee, c'est du bruit certain. */
const RANG_SAIN = 2;

const anneeMin = new Date().getFullYear() - ANNEES_RECENTES;

/** Sorties récentes d'un style, formats courts, les plus possédées d'abord.

    LA DATE DE L'OEUVRE, ET NON CELLE DU PRESSAGE. C'EST LE POINT CENTRAL.

    Une « release » est un pressage. Un pressage de 2026 peut porter une
    musique de 1994 : la première version de ce chantier a proposé
    « Cappella, Move On Baby, 2026 » pour l'italo disco, alors que le
    morceau est de 1994, et « Lee Marrow, Shanghai » daté 2026 pour un titre
    de 1986. Le filtre sur les formats courts n'y suffisait pas : les
    rééditions numériques sont elles aussi des singles.

    Un « master » est l'ŒUVRE, et son année est celle de la PREMIÈRE
    parution. `type=master&year=2024` rend donc ce qui est réellement sorti
    en 2024. Mesuré sur l'italo disco : 273 releases contre 39 masters, et
    les faux de trente ans ont disparu.

    Le prix de cette précision est une couverture plus faible sur les genres
    de niche : Goa Trance ne compte qu'un seul master en 2024. Ces genres
    resteront sous la cible, ce qui est le comportement voulu : une sortie
    récente qui n'existe pas ne doit pas être inventée. */
async function candidatsDiscogs(style: string): Promise<Candidat[]> {
  if (!DISCOGS) return [];
  const out: Candidat[] = [];
  for (let annee = new Date().getFullYear(); annee >= anneeMin; annee -= 1) {
    const url =
      `https://api.discogs.com/database/search?style=${encodeURIComponent(style)}` +
      `&type=release&year=${annee}&format=Single&sort=have&sort_order=desc` +
      `&per_page=25&token=${DISCOGS}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'SONAA/1.0 +https://sonaa.ca/' } });
      if (!res.ok) {
        await sleep(1500);
        continue;
      }
      const j = (await res.json()) as {
        results?: {
          title?: string;
          year?: number;
          style?: string[];
          master_id?: number;
          community?: { have?: number };
        }[];
      };
      for (const r of j.results ?? []) {
        /* Discogs met « Artiste - Titre » dans un seul champ. On coupe au
           premier tiret entouré d'espaces : les tirets internes aux noms
           n'ont pas cette forme. */
        const m = /^(.+?)\s+-\s+(.+)$/.exec(r.title ?? '');
        if (!m || !m[1] || !m[2]) continue;
        const styles = r.style ?? [];
        const rang = styles.findIndex((x) => memeStyle(x, style));
        out.push({
          artist: m[1].replace(/\s*\(\d+\)$/, '').trim(),
          title: m[2].trim(),
          /* Discogs rend parfois l'annee en chaine. Sans cette conversion,
             elle entre telle quelle dans le corpus et validate:data bloque
             le deploiement, ce qui est arrive sur 177 entrees. */
          annee: Number(r.year) || annee,
          possesseurs: r.community?.have ?? 0,
          masterId: r.master_id ?? 0,
          styles,
          rang: rang === -1 ? Number.MAX_SAFE_INTEGER : rang
        });
      }
    } catch {
      /* Discogs indisponible sur cette année : on continue, et le compte
         final dira combien de genres sont restés sous la cible. */
    }
    await sleep(1100); // 60 requêtes par minute, on reste en dessous
  }
  return out;
}

/** Annee de PREMIERE parution d'une oeuvre. Sans master, la sortie est
    unique et sa date de pressage fait foi. Le cache evite de redemander le
    meme master, frequent quand un classique est reedite plusieurs fois. */
const cacheMasters = new Map<number, number>();

async function anneeDeLOeuvre(c: Candidat): Promise<number> {
  if (c.masterId === 0) return c.annee;
  const connu = cacheMasters.get(c.masterId);
  if (connu !== undefined) return connu;
  try {
    const res = await fetch(`https://api.discogs.com/masters/${c.masterId}?token=${DISCOGS}`, {
      headers: { 'User-Agent': 'SONAA/1.0 +https://sonaa.ca/' }
    });
    await sleep(1100);
    if (!res.ok) return c.annee;
    const j = (await res.json()) as { year?: number };
    const an = j.year && j.year > 0 ? j.year : c.annee;
    cacheMasters.set(c.masterId, an);
    return an;
  } catch {
    /* Master injoignable : on garde la date du pressage, qui peut etre
       fausse. C'est le seul endroit ou une reedition peut encore passer,
       et il est borne par la disponibilite de Discogs. */
    return c.annee;
  }
}

/* --------------------------------------------- YouTube, une unité par lot */

interface Meta {
  id: string;
  secondes: number;
  vues: number;
  titre: string;
}

const dureeEnSecondes = (iso: string): number => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  return (+(m?.[1] ?? 0)) * 3600 + (+(m?.[2] ?? 0)) * 60 + +(m?.[3] ?? 0);
};

/** Durée, vues et titre pour un lot d'identifiants. 50 par appel, 1 unité.

    C'est le SEUL endroit du chantier qui consomme du quota. */
async function metaDesVideos(ids: readonly string[]): Promise<Map<string, Meta>> {
  const out = new Map<string, Meta>();
  for (let i = 0; i < ids.length; i += 50) {
    if (etat.unitesConsommees >= BUDGET) {
      console.warn(
        `\nBudget atteint : ${etat.unitesConsommees} unités consommées sur ${BUDGET}. ` +
          `Arrêt propre, l'état est enregistré, relancer reprendra ici.`
      );
      ecrireEtat();
      process.exit(0);
    }
    const lot = ids.slice(i, i + 50);
    const url =
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet` +
      `&id=${lot.join(',')}&key=${CLE}`;
    try {
      const res = await fetch(url);
      etat.unitesConsommees += 1;
      if (!res.ok) {
        const corps = await res.text();
        if (res.status === 403 && /quota/i.test(corps)) {
          console.error(
            `\nQUOTA YOUTUBE ÉPUISÉ après ${etat.unitesConsommees} unités. ` +
              `L'état est enregistré : relancer demain reprendra exactement ici.`
          );
          ecrireEtat();
          process.exit(0);
        }
        continue;
      }
      const j = (await res.json()) as {
        items?: {
          id: string;
          contentDetails?: { duration?: string };
          statistics?: { viewCount?: string };
          snippet?: { title?: string };
        }[];
      };
      for (const v of j.items ?? []) {
        out.set(v.id, {
          id: v.id,
          secondes: dureeEnSecondes(v.contentDetails?.duration ?? 'PT0S'),
          vues: Number(v.statistics?.viewCount ?? 0),
          titre: v.snippet?.title ?? ''
        });
      }
    } catch {
      /* Un lot perdu n'invalide pas les autres : les identifiants sans
         métadonnées seront simplement écartés, faute de pouvoir vérifier
         leur durée. Ne jamais garder ce qu'on n'a pas pu mesurer. */
    }
    await sleep(120);
  }
  return out;
}

/* ------------------------------------------------------------- la passe */

const dejaDansLeCorpus = new Set<string>();
for (const g of corpus.genres) {
  for (const t of g.tracks) dejaDansLeCorpus.add(t.youtubeId);
}

console.log(
  `${aTraiter.length} genre(s) vivant(s) sous la cible de ${CIBLE}. ` +
    `Budget de la passe : ${BUDGET} unités, ${etat.unitesConsommees} déjà consommées aujourd'hui.\n`
);

let genresCouverts = 0;
let ajouts = 0;

/** Bruit par genre : entrees retenues dont le style est marginal. */
const bruit: { id: string; famille: string; retenus: number; marginaux: number; refuses: number }[] =
  [];

for (const genre of aTraiter) {
  const manque = CIBLE - sansRole(genre);
  const bruts = await candidatsDiscogs(genre.label);

  /* Style absent de l'oeuvre : bruit certain, refuse. Le reste passe, les
     styles centraux en premier, la popularite ne departageant qu'a rang
     egal. Sans ce tri, `sort=have` fait remonter les vedettes mal
     etiquetees avant les sorties vraiment representatives du genre. */
  const candidats = bruts
    .filter((c) => c.rang !== Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a.rang - b.rang || b.possesseurs - a.possesseurs);

  const refuses = bruts.length - candidats.length;

  if (candidats.length === 0) {
    console.log(`  ${genre.id.padEnd(20)} aucun candidat Discogs, genre laissé sous la cible`);
    etat.faits.push(genre.id);
    ecrireEtat();
    continue;
  }

  /* Résolution nom vers identifiant : par la page publique, sans quota.
     On s'arrête dès qu'on a trois fois ce qui manque, pour laisser au tri
     par vues de quoi choisir sans multiplier les requêtes. */
  const resolus: { c: Candidat; id: string }[] = [];
  let reeditions = 0;
  for (const c of candidats.slice(0, manque * 6)) {
    if (resolus.length >= manque * 3) break;
    const annee = await anneeDeLOeuvre(c);
    if (annee < anneeMin) {
      reeditions += 1;
      continue; // pressage recent d'une oeuvre ancienne
    }
    c.annee = annee;
    const { hit } = await resolveTrack(c.artist, c.title);
    if (hit && !dejaDansLeCorpus.has(hit.videoId)) {
      resolus.push({ c, id: hit.videoId });
      dejaDansLeCorpus.add(hit.videoId);
    }
    await sleep(200);
  }

  if (resolus.length === 0) {
    console.log(`  ${genre.id.padEnd(20)} aucun identifiant vérifiable`);
    etat.faits.push(genre.id);
    ecrireEtat();
    continue;
  }

  const metas = await metaDesVideos(resolus.map((r) => r.id));

  /* LE FILTRE, inchangé et non négociable : plafond de durée, rejet des
     parutions complètes, et rien qu'on n'ait pu mesurer. */
  const retenus = resolus
    .filter((r) => {
      const m = metas.get(r.id);
      if (!m) return false; // durée inconnue : on ne garde jamais l'invérifiable
      if (isFullRelease(m.titre, m.secondes, false)) return false;
      return true;
    })
    .map((r) => ({ ...r, vues: metas.get(r.id)?.vues ?? 0 }))
    .sort((a, b) => b.vues - a.vues)
    .slice(0, manque);

  if (retenus.length > 0 && !DRY) {
    transaction((frais) => {
      const g = (frais.genres as unknown as Genre[]).find((x) => x.id === genre.id);
      if (!g) return;
      const presents = new Set(
        g.tracks.map((t) => t.youtubeId)
      );
      for (const r of retenus) {
        if (presents.has(r.id)) continue;
        g.tracks.push({
          youtubeId: r.id,
          artist: r.c.artist,
          title: r.c.title,
          year: r.c.annee,
          verified: true
        } as unknown as Track);
      }
    });
  }

  const marginaux = retenus.filter((r) => r.c.rang >= RANG_SAIN).length;
  bruit.push({
    id: genre.id,
    famille: genre.family,
    retenus: retenus.length,
    marginaux,
    refuses
  });

  ajouts += retenus.length;
  etat.ajoutsTotal += retenus.length;
  genresCouverts += 1;
  etat.faits.push(genre.id);
  ecrireEtat();

  if (DRY) {
    for (const r of retenus) {
      console.log(
        `      ${String(r.c.annee)} ${r.c.artist} - ${r.c.title} ` +
          `(${(metas.get(r.id)?.vues ?? 0).toLocaleString('fr-CA')} vues)`
      );
    }
  }

  console.log(
    `  ${genre.id.padEnd(20)} +${retenus.length} actuel ` +
      `(${candidats.length} candidats, ${reeditions} rééditions écartées, ` +
      `${resolus.length} résolus, ${etat.unitesConsommees} unités)`
  );
}

/* ------------------------------------------------------------- verdict */

console.log(
  `\n${genresCouverts} genre(s) traité(s), ${ajouts} track(s) ajoutée(s) en actuel.` +
    `\nQuota : ${etat.unitesConsommees} unités sur ${BUDGET} autorisées cette passe.`
);

/* ------------------------------------------- le bruit, famille par famille

   Demande explicitement : si une famille depasse 40 % de styles marginaux,
   c'est que le style Discogs interroge ne recouvre pas le genre SONAA, et
   il faut le dire plutot que de laisser le vote nettoyer. */

const SEUIL_ALERTE = 0.4;

const parFamille = new Map<string, { retenus: number; marginaux: number; refuses: number }>();
for (const b of bruit) {
  const f = parFamille.get(b.famille) ?? { retenus: 0, marginaux: 0, refuses: 0 };
  f.retenus += b.retenus;
  f.marginaux += b.marginaux;
  f.refuses += b.refuses;
  parFamille.set(b.famille, f);
}

const lignes = [...parFamille.entries()]
  .map(([famille, f]) => ({
    famille,
    ...f,
    taux: f.retenus === 0 ? 0 : f.marginaux / f.retenus
  }))
  .sort((a, b) => b.taux - a.taux);

console.log('\nBRUIT PAR FAMILLE, part des entrees dont le style est marginal :');
for (const l of lignes) {
  const pc = Math.round(l.taux * 100);
  console.log(
    `  ${l.famille.padEnd(22)} ${String(pc).padStart(3)} %  ` +
      `(${l.marginaux}/${l.retenus} retenues, ${l.refuses} candidats refuses)` +
      (l.taux > SEUIL_ALERTE ? '   <-- AU-DESSUS DU SEUIL' : '')
  );
}

const alertes = lignes.filter((l) => l.taux > SEUIL_ALERTE && l.retenus >= 5);
if (alertes.length > 0) {
  console.log(
    `\n${alertes.length} famille(s) au-dessus de 40 % de styles marginaux. ` +
      `Le style Discogs interroge ne recouvre pas le genre SONAA pour :`
  );
  for (const a of alertes) {
    const pires = bruit
      .filter((b) => b.famille === a.famille && b.marginaux > 0)
      .sort((x, y) => y.marginaux - x.marginaux)
      .slice(0, 5)
      .map((b) => `${b.id} ${b.marginaux}/${b.retenus}`);
    console.log(`  ${a.famille} : ${pires.join(', ')}`);
  }
}

if (!DRY) {
  writeFileSync(
    `${RACINE}BRUIT-ACTUEL.md`,
    `# Bruit d'etiquetage sur l'onglet Actuel\n\n` +
      `Mesure : part des entrees retenues dont le style cherche n'est PAS\n` +
      `parmi les deux premiers styles Discogs de l'oeuvre. Un style au rang 2\n` +
      `ou plus est une couleur du morceau, pas sa nature. Les candidats dont\n` +
      `le style est absent sont refuses avant d'arriver ici.\n\n` +
      `| famille | bruit | marginales / retenues | candidats refuses |\n` +
      `| --- | --- | --- | --- |\n` +
      lignes
        .map(
          (l) =>
            `| ${l.famille} | ${Math.round(l.taux * 100)} % | ` +
            `${l.marginaux} / ${l.retenus} | ${l.refuses} |`
        )
        .join('\n') +
      `\n\nSeuil d'alerte : 40 %. Au-dessus, le style Discogs ne recouvre pas\n` +
      `le genre SONAA et le vote ne suffira pas a nettoyer.\n`
  );
}

const taux = tauxEchecReseau();
if (reseau.requetes > 0 && taux > 0.25) {
  console.error(
    `\nRÉSEAU : ${reseau.echecs} requêtes perdues sur ${reseau.requetes} ` +
      `(${Math.round(taux * 100)} %). Les genres « sans candidat vérifiable » ` +
      `ci-dessus ne veulent rien dire, ils peuvent être des refus. Relancer plus tard.`
  );
  process.exit(1);
}
