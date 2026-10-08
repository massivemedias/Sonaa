/* LES DERNIERES SORTIES DE CHAQUE LABEL, CHEZ DISCOGS.
 *
 * Usage : npm run moissonner:actu-labels                (un septieme, la nuit)
 *         npm run moissonner:actu-labels -- --tout      (tous les labels)
 *         npm run moissonner:actu-labels -- --seulement=warp-records
 *         npm run moissonner:actu-labels -- --tout --reprendre (saute ceux
 *                                                   deja faits aujourd'hui)
 *
 * Voir scripts/lib/actu-labels.ts pour le fichier et la demande de Mika.
 *
 * UNE QUESTION PAR LABEL : les sorties du label chez Discogs, triees par
 * annee decroissante, trente par page. Discogs ne trie pas plus fin que
 * l'annee ; dans une meme annee, le numero de la fiche (plus grand, plus
 * recemment entree) departage. Les doublons (le vinyle et le numerique d'un
 * meme disque) sont fondus, et on en garde cinq.
 *
 * LE ROULEMENT. Mille trois cent cinquante labels a une question par seconde
 * font vingt-trois minutes : trop pour la moisson de la nuit, qui fait deja
 * les artistes et les fiches des labels. Chaque nuit refait donc un septieme
 * des labels, choisi par le nom : tout est rafraichi en une semaine, et des
 * sorties qui paraissent au rythme des mois n'en demandent pas plus.
 *
 * Aucune cle ne s'ecrit ici : le jeton Discogs vient de .env, lu par Node.
 * Sans lui, Discogs repond quand meme, plus lentement (25 questions par
 * minute au lieu de 60), et on ralentit d'autant. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { FicheLabel, SortieRecente } from '../src/lib/labels.ts';
import { cleDeLabel } from '../src/lib/labels.ts';
import { ecrireActu, ecrireALaUne, estReedition, lireActu, sortiesALaUne } from './lib/actu-labels.ts';
import { sansTirets } from './lib/labels-moisson.ts';
import type { EntreeLabel } from '../src/lib/labels.ts';

const LABELS = fileURLToPath(new URL('../src/data/labels.json', import.meta.url));
const INDEX = fileURLToPath(new URL('../src/data/labels-index.json', import.meta.url));
const AGENT = 'SonaaAtlas/1.0 (https://sonaa.ca; massivemedias@gmail.com)';
const DISCOGS = process.env['DISCOGS_TOKEN'] ?? '';
const TOUT = process.argv.includes('--tout');
const SEULEMENT = process.argv.find((a) => a.startsWith('--seulement='))?.slice('--seulement='.length) ?? null;
const REPRENDRE = process.argv.includes('--reprendre');
const PAR_LABEL = 5;
const PAUSE_MS = DISCOGS ? 1100 : 2600;
/* LE QUOTA SE LIT DANS LA REPONSE. Discogs dit a chaque fois combien de
   questions il reste dans la minute : tant qu'il en reste, on n'attend pas ;
   pres de la fin, on reprend le pas d'une par seconde. Une pause fixe
   doublait la duree de la moisson pour rien. */
let reste = 0;

const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const dansLaTranche = (cle: string): boolean => {
  let h = 0;
  for (let i = 0; i < cle.length; i += 1) h = (h * 31 + cle.charCodeAt(i)) % 9973;
  return h % 7 === new Date().getUTCDay();
};

interface SortieDiscogs {
  readonly id: number;
  readonly title?: string;
  readonly artist?: string;
  readonly year?: number;
  readonly thumb?: string;
  readonly format?: string;
  readonly type?: string;
}

/** « Holo (3) » chez Discogs, « Holo » ici. */
const sansNumero = (s: string): string => s.replace(/\s+\(\d+\)/g, '').trim();

async function questionner(url: string): Promise<Response> {
  for (let essai = 0; essai < 4; essai += 1) {
    const r = await fetch(url, {
      headers: { 'user-agent': AGENT, ...(DISCOGS ? { authorization: `Discogs token=${DISCOGS}` } : {}) },
      signal: AbortSignal.timeout(20_000),
    });
    reste = Number(r.headers.get('x-discogs-ratelimit-remaining') ?? 0);
    if (r.status !== 429) return r;
    /* Trop vite : Discogs demande une minute de calme. */
    await pause(60_000);
  }
  throw new Error('Discogs refuse encore apres quatre minutes');
}

/** Les cinq dernieres sorties d'un label, ou null si Discogs ne repond pas. */
async function dernieres(idLabel: string): Promise<SortieRecente[] | null> {
  const r = await questionner(`https://api.discogs.com/labels/${idLabel}/releases?sort=year&sort_order=desc&per_page=30`);
  if (!r.ok) return null;
  const j = (await r.json()) as { releases?: SortieDiscogs[] };
  const vues = new Set<string>();
  const sorties: SortieRecente[] = [];
  const triees = [...(j.releases ?? [])]
    .filter((s) => s.title && s.artist)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.id - a.id);
  for (const s of triees) {
    /* Discogs ecrit les plages d'annees avec un tiret long : le site n'en a pas. */
    const artiste = sansTirets(sansNumero(s.artist ?? ''));
    const titre = sansTirets((s.title ?? '').trim());
    const cle = `${cleDeLabel(artiste)}|${cleDeLabel(titre)}`;
    /* Une reedition n'est pas une derniere sortie : Brian Auger en 1971,
       represse par un label distribue par !K7 en 2026, n'en dit rien. */
    if (vues.has(cle) || estReedition(s.format ?? null)) continue;
    vues.add(cle);
    sorties.push({
      titre,
      artiste,
      annee: s.year && s.year > 0 ? s.year : null,
      image: s.thumb && !s.thumb.includes('spacer.gif') ? s.thumb : null,
      url: `https://www.discogs.com/${s.type === 'master' ? 'master' : 'release'}/${s.id}`,
      format: s.format ?? null,
    });
    if (sorties.length >= PAR_LABEL) break;
  }
  return sorties;
}

async function main(): Promise<void> {
  const fiches = JSON.parse(readFileSync(LABELS, 'utf8')) as FicheLabel[];
  const actu = lireActu();
  const voulues = fiches.filter((f) => {
    if (!f.discogs || !/\/label\/\d+/.test(f.discogs)) return false;
    if (SEULEMENT) return f.slug === SEULEMENT;
    if (REPRENDRE && actu[f.slug]?.recentesLe === new Date().toISOString().slice(0, 10)) return false;
    return TOUT || dansLaTranche(f.slug);
  });
  console.log(`${voulues.length} labels a demander a Discogs${DISCOGS ? '' : ' (sans jeton : lentement)'}.`);
  let faits = 0;
  let pannes = 0;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  for (const f of voulues) {
    const id = /\/label\/(\d+)/.exec(f.discogs ?? '')?.[1];
    if (!id) continue;
    try {
      const s = await dernieres(id);
      if (s === null) pannes += 1;
      else {
        actu[f.slug] = { ...actu[f.slug], recentes: s, recentesLe: aujourdhui };
        faits += 1;
        /* Ecrit en cours de route : une moisson coupee garde ce qu'elle a fait. */
        if (faits % 50 === 0) {
          ecrireActu(actu);
          console.log(`  ${faits} / ${voulues.length}`);
        }
      }
    } catch (e) {
      pannes += 1;
      console.log(`  ${f.nom} : ${e instanceof Error ? e.message : String(e)}`);
    }
    await pause(reste > 4 ? 0 : PAUSE_MS);
  }
  ecrireActu(actu);
  const index = JSON.parse(readFileSync(INDEX, 'utf8')) as EntreeLabel[];
  const une = sortiesALaUne(actu, index);
  /* LA FICHE DE CHAQUE CANDIDATE, POUR DEUX RAISONS. Elle dit le genre :
     on ne garde que ce que Discogs range en « Electronic », parce que les
     labels de l'atlas pressent aussi du rock et de la pop. Et elle donne la
     pochette entiere : la liste n'a qu'une vignette de 150 px, floue dans la
     grille de l'accueil. On s'arrete a dix-huit. */
  const grandes = [];
  for (const s of une) {
    if (grandes.length >= 18) break;
    const id = /\/(release|master)\/(\d+)/.exec(s.url);
    if (!id) continue;
    try {
      const r = await questionner(`https://api.discogs.com/${id[1] === 'master' ? 'masters' : 'releases'}/${id[2]}`);
      if (r.ok) {
        const j = (await r.json()) as { genres?: string[]; images?: { uri?: string; type?: string }[] };
        if ((j.genres ?? []).includes('Electronic')) {
          grandes.push({ ...s, image: j.images?.find((x) => x.type === 'primary')?.uri ?? j.images?.[0]?.uri ?? s.image });
        }
      }
    } catch {
      /* Une fiche muette fait passer a la suivante. */
    }
    await pause(reste > 4 ? 0 : PAUSE_MS);
  }
  ecrireALaUne(grandes, index.length);
  console.log(`${faits} labels a jour, ${pannes} sans reponse ; ${grandes.length} sorties a la une.`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
