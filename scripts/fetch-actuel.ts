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
  tracks: { essentiel: Track[]; actuel: Track[] };
}

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as { genres: Genre[] };

/** Un genre éteint n'a pas d'actuel, et ce n'est pas un manque. */
const estEteint = (g: Genre): boolean =>
  Array.isArray(g.labelsActuels) && g.labelsActuels.length === 0;

/* PRIORITÉ : les genres les plus peuplés d'abord, comme demandé. Le nombre
   de tracks déjà réunies est le meilleur indicateur disponible de
   l'importance d'un genre : c'est le travail éditorial déjà fait qui le
   dit, pas un classement inventé. À égalité, celui qui manque le plus. */
const aTraiter = corpus.genres
  .filter((g) => !estEteint(g) && g.tracks.actuel.length < CIBLE)
  .filter((g) => !etat.faits.includes(g.id))
  .sort((a, b) => {
    const poids = (g: Genre) => g.tracks.essentiel.length + g.tracks.actuel.length;
    return poids(b) - poids(a) || a.tracks.actuel.length - b.tracks.actuel.length;
  });

/* ------------------------------------------------------- Discogs, gratuit */

interface Candidat {
  artist: string;
  title: string;
  annee: number;
  possesseurs: number;
}

const anneeMin = new Date().getFullYear() - ANNEES_RECENTES;

/** Sorties récentes d'un style, formats courts, les plus possédées d'abord.

    `type=master` ET NON `type=release`, ET C'EST LE POINT CENTRAL.

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
      `&type=master&year=${annee}&format=Single&sort=have&sort_order=desc` +
      `&per_page=25&token=${DISCOGS}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'SONAA/1.0 +https://sonaa.ca/' } });
      if (!res.ok) {
        await sleep(1500);
        continue;
      }
      const j = (await res.json()) as {
        results?: { title?: string; year?: number; community?: { have?: number } }[];
      };
      for (const r of j.results ?? []) {
        /* Discogs met « Artiste - Titre » dans un seul champ. On coupe au
           premier tiret entouré d'espaces : les tirets internes aux noms
           n'ont pas cette forme. */
        const m = /^(.+?)\s+-\s+(.+)$/.exec(r.title ?? '');
        if (!m || !m[1] || !m[2]) continue;
        out.push({
          artist: m[1].replace(/\s*\(\d+\)$/, '').trim(),
          title: m[2].trim(),
          annee: r.year ?? annee,
          possesseurs: r.community?.have ?? 0
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
  for (const t of [...g.tracks.essentiel, ...g.tracks.actuel]) dejaDansLeCorpus.add(t.youtubeId);
}

console.log(
  `${aTraiter.length} genre(s) vivant(s) sous la cible de ${CIBLE}. ` +
    `Budget de la passe : ${BUDGET} unités, ${etat.unitesConsommees} déjà consommées aujourd'hui.\n`
);

let genresCouverts = 0;
let ajouts = 0;

for (const genre of aTraiter) {
  const manque = CIBLE - genre.tracks.actuel.length;
  const candidats = await candidatsDiscogs(genre.label);

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
  for (const c of candidats.slice(0, manque * 6)) {
    if (resolus.length >= manque * 3) break;
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
        [...g.tracks.essentiel, ...g.tracks.actuel].map((t) => t.youtubeId)
      );
      for (const r of retenus) {
        if (presents.has(r.id)) continue;
        g.tracks.actuel.push({
          youtubeId: r.id,
          artist: r.c.artist,
          title: r.c.title,
          year: r.c.annee,
          verified: true
        } as unknown as Track);
      }
    });
  }

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
      `(${candidats.length} candidats, ${resolus.length} résolus, ` +
      `${etat.unitesConsommees} unités)`
  );
}

/* ------------------------------------------------------------- verdict */

console.log(
  `\n${genresCouverts} genre(s) traité(s), ${ajouts} track(s) ajoutée(s) en actuel.` +
    `\nQuota : ${etat.unitesConsommees} unités sur ${BUDGET} autorisées cette passe.`
);

const taux = tauxEchecReseau();
if (reseau.requetes > 0 && taux > 0.25) {
  console.error(
    `\nRÉSEAU : ${reseau.echecs} requêtes perdues sur ${reseau.requetes} ` +
      `(${Math.round(taux * 100)} %). Les genres « sans candidat vérifiable » ` +
      `ci-dessus ne veulent rien dire, ils peuvent être des refus. Relancer plus tard.`
  );
  process.exit(1);
}
