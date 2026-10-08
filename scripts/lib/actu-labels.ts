/* L'ACTUALITE DES LABELS : LEURS DERNIERES SORTIES, ET LES NEWS QUI LES NOMMENT.
 *
 * Mika, le 8 octobre 2026 : « ce serait fabuleux d'avoir les cinq dernieres
 * tracks de chaque label, sans se prendre la tete, et aussi les quelques
 * news des labels ».
 *
 * Un fichier a part, src/data/labels-actu.json, et non dans labels.json :
 * la fiche d'un label se refait une fois par mois, son actualite chaque
 * semaine pour les sorties et deux fois par jour pour les news. Le
 * pre-rendu fond les deux dans la fiche que lit la page.
 *
 * LES SORTIES viennent de Discogs (les sorties du label, triees par annee,
 * voir scripts/moissonner-actu-labels.ts). LES NEWS viennent de la moisson
 * des magazines (scripts/moissonner-news.ts) : un article qui nomme le
 * label est garde sous lui, cinq au plus, les plus recents. */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { estMajor, estReedition, ordreDeNotoriete, type ActuDuLabel, type EntreeLabel, type NewsDuLabel, type SortieRecente } from '../../src/lib/labels.ts';

export { estReedition };

export const FICHIER_ACTU = fileURLToPath(new URL('../../src/data/labels-actu.json', import.meta.url));
export const FICHIER_UNE = fileURLToPath(new URL('../../src/data/sorties-a-la-une.json', import.meta.url));
export const NEWS_PAR_LABEL = 5;

export type ActuLabels = Record<string, ActuDuLabel>;

export function lireActu(): ActuLabels {
  if (!existsSync(FICHIER_ACTU)) return {};
  return JSON.parse(readFileSync(FICHIER_ACTU, 'utf8')) as ActuLabels;
}

/** Les cles dans l'ordre, une par ligne : un diff lisible d'une nuit a
    l'autre. */
export function ecrireActu(a: ActuLabels): void {
  const trie: ActuLabels = {};
  for (const k of Object.keys(a).sort()) {
    const v = a[k];
    if (v && ((v.recentes?.length ?? 0) > 0 || (v.news?.length ?? 0) > 0)) trie[k] = v;
  }
  writeFileSync(FICHIER_ACTU, `${JSON.stringify(trie, null, 1)}\n`, 'utf8');
}

/* ═══ QUAND UN ARTICLE NOMME-T-IL UN LABEL ? ═══
 *
 * Un nom de plusieurs mots (« Circus Company », « Get Physical », « Ninja
 * Tune ») se reconnait tel quel, a la casse pres : « The Mole to Release
 * Fifth Album on Circus Company ».
 *
 * Un nom d'un seul mot est un mot de tous les jours une fois sur deux
 * (Club, Beyond, Empire, Clone, Mute). Il ne compte que dans un contexte de
 * label : precede de « on », « via », « sur », « label », ou suivi de
 * « Records », « label », « boss », « co-founder ». « out now on Warp »
 * compte ; « Beyond the dancefloor » non.
 *
 * Un nom qui finit par Records, Recordings ou Music se cherche aussi sans :
 * les magazines ecrivent « Warp », pas « Warp Records ». Le nom court est
 * alors un nom d'un seul mot, ou de plusieurs, et suit la regle qui va. */

const SUFFIXES = /\s+(?:Records|Recordings|Music|Records Ltd\.?|Label|Recordings Ltd\.?)$/i;
/* Des mots trop communs pour etre un label meme dans un contexte de label. */
const TROP_COMMUNS = new Set(
  ['Club', 'Classic', 'Arts', 'Beyond', 'Brain', 'Broke', 'Divine', 'Empire', 'Live', 'Music', 'Records', 'Dance', 'House', 'Techno', 'Studio', 'Radio', 'Love', 'Life', 'Night', 'Future', 'Space', 'Global', 'World', 'New', 'Next', 'Origin', 'Boxed', 'Balearic', 'Cream', 'Disciple', 'Apollo'].map((m) => m.toLowerCase())
);
const AVANT = /(?:^|\s)(?:on|via|sur|chez|label|imprint|signs to|signed to|returns to|joins)\s+$/i;
const APRES = /^(?:\s+(?:Records|Recordings|label|imprint|boss|co-?founder|founder|head|sublabel)\b|[’']s\s+(?:label|boss|founder|co-?founder|catalogue|catalog))/i;

function echapper(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Les formes sous lesquelles chercher un label, et si chacune demande un
    contexte. */
export function formesDuNom(nom: string): { forme: string; seul: boolean }[] {
  const propre = nom.replace(/\s+\(\d+\)$/, '').trim();
  const formes = new Set<string>([propre]);
  const court = propre.replace(SUFFIXES, '').trim();
  if (court && court !== propre) formes.add(court);
  return [...formes]
    .filter((f) => f.length >= 3 && !TROP_COMMUNS.has(f.toLowerCase()))
    .map((f) => ({ forme: f, seul: !/\s/.test(f) }));
}

/* UN NOM D'UN MOT DANS UN NOM PLUS LONG N'EST PAS LE LABEL. Vu a la
   premiere moisson : « on Circus Company » rangeait l'article sous Circus
   Records, et « The Glazmo Network founder » sous Network Records. Un mot a
   majuscule colle devant ou derriere (sauf Records, Recordings, Music)
   fait partie d'un autre nom. */
const MOT_AVANT = /(\p{Lu}[\p{L}\p{N}'’.-]*)\s+$/u;
const MOT_APRES = /^\s+(\p{Lu}[\p{L}\p{N}'’.-]*)/u;
const SUFFIXES_ADMIS = new Set(['Records', 'Recordings', 'Music']);
const LIENS_ADMIS = new Set(['On', 'Via', 'Sur', 'Chez']);

/** Vrai si `texte` nomme le label sous `forme`. */
export function nomme(texte: string, forme: string, seul: boolean): boolean {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${echapper(forme)}(?![\\p{L}\\p{N}])`, 'gu');
  for (const m of texte.matchAll(re)) {
    if (!seul) return true;
    const i = m.index ?? 0;
    const avant = texte.slice(Math.max(0, i - 24), i);
    const apres = texte.slice(i + forme.length, i + forme.length + 24);
    const motAvant = MOT_AVANT.exec(avant)?.[1];
    const motApres = MOT_APRES.exec(apres)?.[1];
    if (motAvant && !LIENS_ADMIS.has(motAvant)) continue;
    if (motApres && !SUFFIXES_ADMIS.has(motApres)) continue;
    if (AVANT.test(avant) || APRES.test(apres)) return true;
  }
  return false;
}

export interface ArticleLu {
  readonly source: string;
  readonly titre: string;
  readonly lien: string;
  readonly date: string | null;
  readonly image: string | null;
  readonly resume: string;
}

/** Range les articles sous les labels qu'ils nomment, en gardant ce que
    chaque label avait deja : les news d'une moisson remplacent celles de la
    precedente, et un article qui sort du flux ne doit pas sortir du label. */
export function rangerLesNews(labels: readonly { slug: string; nom: string }[], articles: readonly ArticleLu[], avant: ActuLabels): { actu: ActuLabels; ajouts: number } {
  const actu: ActuLabels = { ...avant };
  let ajouts = 0;
  for (const l of labels) {
    const formes = formesDuNom(l.nom);
    if (formes.length === 0) continue;
    const trouves: NewsDuLabel[] = [];
    for (const a of articles) {
      const texte = `${a.titre}. ${a.resume}`;
      if (formes.some((f) => nomme(texte, f.forme, f.seul))) {
        trouves.push({ titre: a.titre, lien: a.lien, source: a.source, date: a.date, image: a.image });
      }
    }
    if (trouves.length === 0) continue;
    const deja = actu[l.slug]?.news ?? [];
    const liens = new Set(deja.map((n) => n.lien));
    const nouveaux = trouves.filter((n) => !liens.has(n.lien));
    if (nouveaux.length === 0) continue;
    ajouts += nouveaux.length;
    const news = [...nouveaux, ...deja].sort((x, y) => (y.date ?? '').localeCompare(x.date ?? '')).slice(0, NEWS_PAR_LABEL);
    actu[l.slug] = { ...actu[l.slug], news };
  }
  return { actu, ajouts };
}

/* ═══ LES SORTIES A LA UNE, POUR L'ACCUEIL ═══
 *
 * L'accueil montre une rangee de sorties fraiches de labels qu'on connait :
 * pas le fichier entier (deux mega-octets), un extrait de quelques
 * kilo-octets, importe par la page. La derniere sortie de chaque label, si
 * elle date de cette annee ou de la precedente, qu'elle a une pochette et
 * que ce n'est pas une reedition.
 *
 * LES LABELS SONT CLASSES PAR LEURS MORCEAUX DANS L'ATLAS, pas par leur
 * notoriete. Classee par collectionneurs, la premiere moisson du 8 octobre
 * 2026 mettait a la une Swans chez Mute, Jethro Tull chez Chrysalis et Kiss
 * chez Casablanca : des labels connus, qui pressent de tout. Ceux qui ont le
 * plus de morceaux dans l'atlas sont ceux de la musique electronique. Le
 * script verifie ensuite, sortie par sortie, que Discogs la range en
 * « Electronic » (voir moissonner-actu-labels.ts) : ici, on ne rend que les
 * candidates. */

export interface SortieALaUne extends SortieRecente {
  readonly label: string;
  readonly slug: string;
}

export function sortiesALaUne(actu: ActuLabels, index: readonly EntreeLabel[], combien = 60, annee = new Date().getUTCFullYear()): SortieALaUne[] {
  const out: SortieALaUne[] = [];
  const vues = new Set<string>();
  const classes = [...index].filter((x) => !estMajor(x) && x.c >= 3).sort((a, b) => b.c - a.c || ordreDeNotoriete(a, b));
  for (const e of classes) {
    const s = actu[e.s]?.recentes?.find(
      (x) => x.image && x.annee !== null && x.annee >= annee - 1 && !estReedition(x.format) && x.artiste !== 'Various'
    );
    if (!s) continue;
    /* Un disque distribue par deux labels de la liste ne passe qu'une fois. */
    const cle = `${s.artiste}|${s.titre}`.toLowerCase();
    if (vues.has(cle)) continue;
    vues.add(cle);
    out.push({ ...s, label: e.n, slug: e.s });
    if (out.length >= combien) break;
  }
  return out;
}

/** Le fichier de l'accueil : les sorties, et le nombre de labels, que
    l'accueil affiche sans charger l'index entier (370 Ko). */
export interface FichierALaUne {
  readonly labels: number;
  readonly sorties: readonly SortieALaUne[];
}

export function ecrireALaUne(une: readonly SortieALaUne[], labels: number): void {
  const f: FichierALaUne = { labels, sorties: une };
  writeFileSync(FICHIER_UNE, `${JSON.stringify(f, null, 1)}\n`, 'utf8');
}
