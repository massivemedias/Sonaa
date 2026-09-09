/* LE MOISSONNEUR D'ARTISTES : qui joue quoi, dans les deux sens.
 *
 * Usage : npm run moissonner:artistes -- --etape=styles   (219 requetes, minutes)
 *         npm run moissonner:artistes -- --etape=artistes (1 requete par artiste, heures)
 *         npm run moissonner:artistes -- --etape=artistes --combien=500
 *
 * ═══ CE QU'ON CHERCHE, ET POURQUOI DEUX SENS ═══
 *
 * Mika veut deux choses qui n'ont pas la meme source. D'un cote, chercher
 * « Lealtica » et tomber sur ses styles, meme si l'artiste a trois sorties.
 * De l'autre, ouvrir un style et voir les trente meilleurs artistes qui le
 * jouent. Ce sont deux questions inverses, et aucune base ne repond bien aux
 * deux.
 *
 * ═══ MESURE DU 7 SEPTEMBRE 2026, QUI A DECIDE DE TOUT ═══
 *
 * Trois sources ont ete testees sur trois artistes que Mika a nommes, dont
 * deux minuscules.
 *
 *   Lealtica         last.fm : aucun tag · musicbrainz : inconnu · DISCOGS : trouve
 *   Maudite Machine  last.fm : aucun tag · musicbrainz : inconnu · DISCOGS : trouve
 *   FM Radio Gods    les trois le connaissent
 *
 * La longue traine n'existe que chez Discogs, parce que Discogs catalogue des
 * DISQUES et non des ecoutes : trois sorties suffisent a y exister, alors
 * qu'il faut des auditeurs pour exister chez Last.fm. Et les styles y sont
 * deja dans la reponse de recherche, ce qui coute UNE requete par artiste au
 * lieu d'une par sortie.
 *
 *   Maudite Machine : Techno 30, Minimal 30, Disco 14, Dark Electro 11,
 *                     Electro 7, Breakbeat 5, Nu-Disco 4, Darkwave 3
 *
 * Ponderes, en prime : le nombre de sorties dit lequel des styles est le
 * sien et lequel est une incursion.
 *
 * A l'inverse, CLASSER les artistes d'un style demande de la popularite, que
 * Discogs n'a pas et que Last.fm a. `tag.getTopArtists` repond meme sur des
 * niches : gqom rend DJ Lag et Griffit Vigo, hardvapour rend wosX et DJ
 * Alina. C'est donc lui qui fait le sens « style vers artistes ».
 *
 * ═══ LES DEUX ETAPES SONT SEPAREES A DESSEIN ═══
 *
 * La premiere tient en deux minutes et donne deja le classement par style.
 * La seconde tient en heures parce que Discogs plafonne a soixante requetes
 * par minute. Les separer permet de relancer l'une sans l'autre, et de
 * reprendre la seconde la ou elle s'est arretee : elle relit son propre
 * releve et ne redemande que les artistes qui manquent.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { genresDuCorpus, artistesDuCorpus } from './lib/genres-du-corpus.ts';

/* ── Les cles, posees dans l'environnement et jamais ecrites ici ───────── */

function lireEnv(): void {
  const chemin = fileURLToPath(new URL('../.env', import.meta.url));
  if (!existsSync(chemin)) return;
  for (const ligne of readFileSync(chemin, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(ligne.trim());
    if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = (m[2] ?? '').replace(/^["']|["']$/g, '');
  }
}
lireEnv();

const LASTFM = process.env['LASTFM_API_KEY'] ?? '';
const DISCOGS = process.env['DISCOGS_TOKEN'] ?? '';
const AGENT = 'SONAA/1.0 (+https://sonaa.ca)';

/* ── Le releve ────────────────────────────────────────────────────────── */

interface Releve {
  /** Quand la moisson a ete faite. Un releve sans date ne se relit pas. */
  fait: string;
  /** genre id vers la liste ordonnee des noms d'artistes, du plus ecoute au
      moins. L'ordre EST l'information : c'est le classement de Last.fm. */
  parStyle: Record<string, string[]>;
  /** nom d'artiste vers ses styles Discogs ponderes par le nombre de sorties. */
  parArtiste: Record<string, Record<string, number>>;
  /** Les noms cherches chez Discogs et introuvables. On les garde pour ne pas
      les redemander a chaque passage. */
  introuvables: string[];
}

const SORTIE = fileURLToPath(new URL('./donnees/artistes.json', import.meta.url));

function lireReleve(): Releve {
  if (!existsSync(SORTIE)) {
    return { fait: '', parStyle: {}, parArtiste: {}, introuvables: [] };
  }
  return JSON.parse(readFileSync(SORTIE, 'utf8')) as Releve;
}

function ecrireReleve(r: Releve): void {
  r.fait = new Date().toISOString();
  writeFileSync(SORTIE, JSON.stringify(r, null, 1), 'utf8');
}

/* ── Le reseau, avec ses limites ──────────────────────────────────────── */

const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function json(url: string, entetes: Record<string, string> = {}): Promise<unknown> {
  const r = await fetch(url, { headers: { 'User-Agent': AGENT, ...entetes } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

/* ── Etape 1 : un style, ses meilleurs artistes ───────────────────────── */

/** LES ALIAS SONT ECRITS A LA MAIN, ET SEULEMENT QUAND LA MESURE LES EXIGE.
    Last.fm etiquette « drum and bass » et non « drum & bass », « psytrance »
    et non « psy-trance ». Deviner ces formes par une regle generale produirait
    des tags qui n'existent pas ; les ecrire une par une produit des tags dont
    on a verifie qu'ils rendent des artistes. */
const ALIAS: Record<string, string[]> = {
  'drumandbass': ['drum and bass', 'drum n bass'],
  'psytrance': ['psytrance', 'psychedelic trance'],
  'dubtechno': ['dub techno'],
  'techhouse': ['tech house'],
  'deephouse': ['deep house'],
  'ukgarage': ['uk garage', '2step'],
  'jungle': ['jungle', 'ragga jungle'],
  'hardcore': ['hardcore techno', 'gabber'],
  'idm': ['idm', 'intelligent dance music'],
  'ebm': ['ebm', 'electronic body music'],
};

/** Les formes de tag a essayer pour un genre, de la plus precise a la plus
    large. On s'arrete a la premiere qui rend des artistes : une forme large
    qui repond apres une precise qui a repondu ajouterait du bruit. */
function formesDeTag(id: string, label: string): string[] {
  const propres = ALIAS[id] ?? [];
  const duLabel = label.toLowerCase();
  const sansTiret = duLabel.replace(/[-‑]/g, ' ');
  return [...new Set([...propres, duLabel, sansTiret])];
}

async function etapeStyles(releve: Releve, combien: number): Promise<void> {
  const genres = genresDuCorpus();
  console.log(`${genres.length} styles à interroger chez Last.fm.\n`);
  let vides = 0;

  for (const g of genres) {
    if (releve.parStyle[g.id]?.length) continue;
    let noms: string[] = [];
    for (const forme of formesDeTag(g.id, g.label)) {
      try {
        const d = (await json(
          'https://ws.audioscrobbler.com/2.0/?method=tag.gettopartists' +
            `&tag=${encodeURIComponent(forme)}&api_key=${LASTFM}&format=json&limit=${combien}`
        )) as { topartists?: { artist?: { name: string }[] } };
        noms = (d.topartists?.artist ?? []).map((a) => a.name).filter(Boolean);
      } catch {
        noms = [];
      }
      if (noms.length > 0) break;
      await dormir(250);
    }
    releve.parStyle[g.id] = noms;
    if (noms.length === 0) vides += 1;
    console.log(`  ${g.label.padEnd(26)} ${String(noms.length).padStart(3)} artistes`);
    await dormir(250);
  }

  ecrireReleve(releve);
  const total = new Set(Object.values(releve.parStyle).flat()).size;
  console.log(`\n${total} artistes distincts, ${vides} style(s) sans réponse.`);
}

/* ── Etape 2 : un artiste, ses styles ─────────────────────────────────── */

/* ═══ TROIS SOURCES, PARCE QU'AUCUNE N'A TOUT LE VOCABULAIRE ═══

   Discogs classe les disques, finement, mais son vocabulaire s'arrete ou
   celui des disquaires s'arrete : ni « Indie Dance » ni « Dark Disco » n'y
   existent, alors que SONAA les nomme et que la scene les emploie tous les
   jours. Mesure sur Maudite Machine le 9 septembre 2026 : Discogs disait
   Techno, Minimal, Dark Electro, Disco ; Bandcamp disait « Dark disco ».

   Bandcamp porte les etiquettes que l'artiste s'est donnees lui-meme, et sa
   recherche les rend en une requete, sans page a lire. Last.fm porte celles
   que le public lui a posees. On additionne les trois, chacune avec son
   poids : une sortie Discogs vaut 1, une etiquette Bandcamp vaut 8 (c'est
   l'artiste qui parle, et il n'en met que six), une etiquette Last.fm vaut
   son score sur 100 divise par 25 (une etiquette a 100 vaut 4). Le
   rangement dans notre vocabulaire se fait ensuite, dans deriver-artistes,
   avec la meme table pour les trois. */

async function stylesChezDiscogs(nom: string): Promise<Record<string, number>> {
  const d = (await json(
    `https://api.discogs.com/database/search?type=release&per_page=50&artist=${encodeURIComponent(nom)}`,
    { Authorization: `Discogs token=${DISCOGS}` }
  )) as { results?: { style?: string[] }[] };
  const compte: Record<string, number> = {};
  for (const r of d.results ?? []) for (const s of r.style ?? []) compte[s] = (compte[s] ?? 0) + 1;
  return compte;
}

const aplati = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function stylesChezBandcamp(nom: string): Promise<Record<string, number>> {
  const r = await fetch('https://bandcamp.com/api/bcsearch_public_api/1/autocomplete_elastic', {
    method: 'POST',
    headers: { 'User-Agent': AGENT, 'content-type': 'application/json' },
    body: JSON.stringify({ search_text: nom, search_filter: 'b', full_page: false, fan_id: null }),
  });
  if (!r.ok) throw new Error(`Bandcamp ${r.status}`);
  const j = (await r.json()) as { auto?: { results?: { type?: string; name?: string; tag_names?: string[] }[] } };
  /* LE NOM DOIT ETRE LE MEME, pas seulement ressemblant : Bandcamp rend
     aussi les voisins, et prendre le premier venu collerait a un artiste
     les etiquettes d'un autre. */
  const exact = (j.auto?.results ?? []).find((x) => x.type === 'b' && aplati(x.name ?? '') === aplati(nom));
  const compte: Record<string, number> = {};
  for (const t of exact?.tag_names ?? []) if (t.trim()) compte[t.trim()] = (compte[t.trim()] ?? 0) + 8;
  return compte;
}

async function stylesChezLastfm(nom: string): Promise<Record<string, number>> {
  if (!LASTFM) return {};
  const j = (await json(
    `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(nom)}&api_key=${LASTFM}&format=json&autocorrect=1`
  )) as { toptags?: { tag?: { name: string; count: number }[] } };
  const compte: Record<string, number> = {};
  for (const t of j.toptags?.tag ?? []) {
    if (t.count < 10) continue;
    compte[t.name] = (compte[t.name] ?? 0) + Math.max(1, Math.round(t.count / 25));
  }
  return compte;
}

/** Les styles d'un artiste, les trois sources additionnees. Rend null quand
    aucune ne connait le nom : c'est different d'un artiste connu sans
    style, qu'on note par un objet vide. Une source qui tombe ne fait pas
    tomber les deux autres. */
async function stylesDeLArtiste(nom: string): Promise<Record<string, number> | null> {
  const compte: Record<string, number> = {};
  let connu = false;
  for (const source of [stylesChezDiscogs, stylesChezBandcamp, stylesChezLastfm]) {
    try {
      const c = await source(nom);
      if (Object.keys(c).length > 0) connu = true;
      for (const [k, v] of Object.entries(c)) compte[k] = (compte[k] ?? 0) + v;
    } catch (e) {
      /* Discogs qui ne repond pas est un echec reseau, pas une absence : on
         le laisse remonter pour que l'artiste soit redemande. Les deux
         autres sources sont un complement, leur panne ne bloque rien. */
      if (source === stylesChezDiscogs) throw e;
    }
  }
  return connu ? compte : null;
}

/* ═══ LES ARTISTES DU CALENDRIER ET DES SETS, EN PREMIER ═══

   C'est pour eux que la question « quels styles fait untel » se pose sur le
   site : les noms sur les affiches de Montreal, et ceux qui deposent un set.
   Ils ne figurent dans aucun classement Last.fm, donc aucune autre graine
   ne les apporte. On les lit dans la base, avec la cle publique (les soirees
   publiees et les artistes sont lisibles par tous), et on les passe AVANT
   les autres : c'est ce qui fait que Lealtica et Maudite Machine entrent
   dans l'index le soir meme ou ils sont a l'affiche.

   Discogs, lui, ne peut pas etre interroge en direct depuis la passerelle :
   il compte par adresse IP et les adresses de Cloudflare sont partagees
   (mesure du 8 septembre 2026). D'ou cette moisson, depuis un poste. */
async function artistesDuSite(): Promise<string[]> {
  const url = process.env['VITE_SUPABASE_URL'];
  const cle = process.env['VITE_SUPABASE_ANON_KEY'];
  if (!url || !cle) return [];
  const lire = async (chemin: string): Promise<unknown> => {
    const r = await fetch(`${url}/rest/v1/${chemin}`, { headers: { apikey: cle, authorization: `Bearer ${cle}` } });
    return r.ok ? r.json() : [];
  };
  const soirees = (await lire('soirees_manuelles?select=artistes&publiee=eq.true')) as { artistes?: string[] }[];
  const comptes = (await lire('artistes?select=nom')) as { nom?: string }[];
  const noms = new Set<string>();
  for (const s of soirees) for (const a of s.artistes ?? []) if (a.trim().length >= 2) noms.add(a.trim());
  for (const c of comptes) if (c.nom && c.nom.trim().length >= 2) noms.add(c.nom.trim());
  /* ET LES NOMS QUE LA RECHERCHE N'A PAS SU RESOUDRE : la passerelle les
     note quand ni Discogs ni Last.fm ne repondent en direct (voir
     worker/src/index.ts, api/artiste). C'est la promesse faite a qui a tape
     un nom pour rien : le lendemain, il y est. */
  try {
    const r = await fetch('https://sonaa-sets.massivemedias.workers.dev/api/artistes-demandes');
    if (r.ok) for (const d of (await r.json()) as string[]) if (d.trim().length >= 3) noms.add(d.trim());
  } catch {
    /* La passerelle injoignable ne prive pas la moisson des autres graines. */
  }
  return [...noms];
}

async function etapeArtistes(releve: Releve, combien: number): Promise<void> {
  /* LES GRAINES VIENNENT DE TROIS COTES : les noms du site (calendrier et
     sets) d'abord, puis ce que Last.fm a classe par style, puis ce que le
     corpus nomme deja. Le dernier lot est petit et precieux : ce sont des
     noms dont Mika a verifie le style a la main. */
  const duSite = await artistesDuSite();
  console.log(`${duSite.length} noms lus dans le calendrier et les sets.`);
  /* `--rafraichir` redemande aussi les noms du site deja connus : c'est ce
     qu'il faut quand une source s'ajoute (Bandcamp et Last.fm le 9
     septembre 2026) et que les artistes de Montreal doivent en profiter
     sans attendre que le releve soit refait de zero. */
  const rafraichir = process.argv.includes('--rafraichir');
  const aFaire = [
    ...new Set([...duSite, ...Object.values(releve.parStyle).flat(), ...artistesDuCorpus()]),
  ].filter((n) => (rafraichir && duSite.includes(n)) || (!(n in releve.parArtiste) && !releve.introuvables.includes(n)));

  const lot = combien > 0 ? aFaire.slice(0, combien) : aFaire;
  console.log(`${aFaire.length} artistes sans styles, ${lot.length} demandés ce passage.`);
  console.log('Discogs plafonne à soixante requêtes par minute : une seconde entre chacune.\n');

  let n = 0;
  let trouves = 0;
  for (const nom of lot) {
    n += 1;
    try {
      const styles = await stylesDeLArtiste(nom);
      if (styles === null) releve.introuvables.push(nom);
      else {
        releve.parArtiste[nom] = styles;
        trouves += 1;
      }
    } catch (e) {
      /* UN ECHEC RESEAU N'EST PAS UN ARTISTE INTROUVABLE. On ne le note pas
         comme absent, sinon un creux de reseau le condamnerait pour toujours. */
      console.log(`  ${nom} : ${(e as Error).message}`);
      await dormir(3000);
    }
    if (n % 25 === 0) {
      ecrireReleve(releve);
      console.log(`  ${n}/${lot.length} · ${trouves} trouvés · relevé écrit`);
    }
    await dormir(1050);
  }

  ecrireReleve(releve);
  console.log(
    `\n${Object.keys(releve.parArtiste).length} artistes avec styles, ` +
      `${releve.introuvables.length} introuvables chez Discogs.`
  );
}

/* ── Le parcours ──────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const opt = (nom: string): string | null => {
    const t = args.find((a) => a.startsWith(`--${nom}=`));
    return t ? (t.split('=')[1] ?? null) : null;
  };
  const etape = opt('etape') ?? 'styles';
  const combien = Number(opt('combien') ?? (etape === 'styles' ? 60 : 0));

  if (etape === 'styles' && !LASTFM) throw new Error('LASTFM_API_KEY manquante.');
  if (etape === 'artistes' && !DISCOGS) throw new Error('DISCOGS_TOKEN manquant.');

  const releve = lireReleve();
  if (etape === 'styles') await etapeStyles(releve, combien);
  else if (etape === 'artistes') await etapeArtistes(releve, combien);
  else throw new Error(`Étape inconnue : ${etape}`);
}

main().catch((e: unknown) => {
  console.error((e as Error).message);
  process.exit(1);
});
