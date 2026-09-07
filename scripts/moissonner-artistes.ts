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

/** Les styles d'un artiste, ponderes par le nombre de sorties ou ils
    apparaissent. Rend null quand Discogs ne connait pas le nom : c'est
    different d'un artiste connu sans style, qu'on note par un objet vide. */
async function stylesDeLArtiste(nom: string): Promise<Record<string, number> | null> {
  const d = (await json(
    `https://api.discogs.com/database/search?type=release&per_page=50&artist=${encodeURIComponent(nom)}`,
    { Authorization: `Discogs token=${DISCOGS}` }
  )) as { results?: { style?: string[] }[] };

  const res = d.results ?? [];
  if (res.length === 0) return null;

  const compte: Record<string, number> = {};
  for (const r of res) for (const s of r.style ?? []) compte[s] = (compte[s] ?? 0) + 1;
  return compte;
}

async function etapeArtistes(releve: Releve, combien: number): Promise<void> {
  /* LES GRAINES VIENNENT DES DEUX BOUTS : ce que Last.fm a classe par style,
     et ce que le corpus nomme deja. Le second lot est petit et precieux : ce
     sont des noms dont Mika a verifie le style a la main. */
  const aFaire = [
    ...new Set([...Object.values(releve.parStyle).flat(), ...artistesDuCorpus()]),
  ].filter((n) => !(n in releve.parArtiste) && !releve.introuvables.includes(n));

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
