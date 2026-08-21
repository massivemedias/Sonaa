/* MESURE : NOS 219 GENRES EXISTENT-ILS COMME TAG LAST.FM, ET AVEC QUEL POIDS ?

   Ce script ne modifie RIEN. Il mesure et il imprime. La decision d'utiliser
   `reach` ou `taggings`, et celle d'en faire une taille de rectangle,
   appartiennent a Mika et se prennent sur ces chiffres.

   `reach` est le nombre d'utilisateurs DISTINCTS ayant pose le tag.
   `taggings` est le nombre total de poses. Un seul passionne qui tague mille
   morceaux gonfle `taggings` et pas `reach` : c'est la difference qui compte
   et que ce script rend visible.

   LES VARIANTES. Last.fm n'a pas notre vocabulaire. Chaque libelle est essaye
   sous plusieurs formes, dans un ordre qui va du plus fidele au plus permissif,
   et LA FORME RETENUE EST IMPRIMEE : un chiffre obtenu sur une variante
   eloignee ne vaut pas un chiffre obtenu sur le nom exact, et le lecteur doit
   pouvoir en juger.

   Usage : LASTFM_API_KEY=... node --experimental-strip-types scripts/mesure-lastfm.ts
*/

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const CLE = process.env['LASTFM_API_KEY'];

if (!CLE) {
  console.error(
    '\nPAS DE CLE LAST.FM.\n' +
      "  L'endpoint tag.getInfo refuse sans `api_key` : verifie, il rend\n" +
      '  « error 6, Your request is missing a required parameter ».\n\n' +
      '  Definir LASTFM_API_KEY, ou la mettre dans .env et lancer avec\n' +
      '  --env-file=.env\n'
  );
  process.exit(2);
}

interface Genre { id: string; label: string; family: string; aliases?: string[] }
const corpus = JSON.parse(readFileSync(`${RACINE}src/data/corpus.json`, 'utf8')) as { genres: Genre[] };
const vues = JSON.parse(readFileSync(`${RACINE}src/data/vues.json`, 'utf8')) as { genres?: Record<string, number> };

const sommeil = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/* Du plus fidele au plus permissif. Les alias du corpus viennent en dernier :
   ce sont d'autres noms du genre, legitimes mais moins sûrs que le sien. */
const variantes = (g: Genre): string[] => {
  const b = g.label.trim();
  const sansAccent = b.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const v = [b, sansAccent, b.replace(/-/g, ' '), b.replace(/ /g, '-'), b.replace(/-/g, ''), ...(g.aliases ?? [])];
  return [...new Set(v.filter((x) => x.trim().length > 1))];
};

interface Resultat {
  id: string; label: string; family: string;
  reach: number; taggings: number; forme: string | null; exact: boolean;
}

const interroger = async (tag: string): Promise<{ reach: number; taggings: number } | null> => {
  const u =
    'https://ws.audioscrobbler.com/2.0/?method=tag.getinfo&tag=' +
    encodeURIComponent(tag) + '&api_key=' + CLE + '&format=json';
  const r = await fetch(u);
  if (!r.ok) return null;
  /* LE CHAMP S'APPELLE `total`, PAS `taggings`. La documentation nomme la
     grandeur « taggings », la reponse la nomme `total`. Premiere version : je
     lisais `taggings`, absent, donc zero partout, et le classement rendait
     dix-huit lignes a zero. Un champ absent lu comme un zero est un faux
     silencieux : rien ne distingue « la donnee vaut zero » de « je ne sais pas
     lire la donnee ». */
  const j = (await r.json()) as { tag?: { reach?: string | number; total?: string | number } };
  if (!j.tag) return null;
  const reach = Number(j.tag.reach ?? 0);
  const taggings = Number(j.tag.total ?? 0);
  if (!Number.isFinite(reach) || reach <= 0) return null;
  return { reach, taggings };
};

/* LE PARTAGE PARAPLUIE CONTRE SPECIFIQUE, ET IL EST NOMME A LA MAIN.

   C'EST LE TEST QUI DECIDE DE LA SOURCE. Si les termes generiques ecrasent les
   termes precis, alors le classement mesure la GENERALITE DU MOT et non la
   notoriete du genre, et Last.fm ne peut pas dimensionner cette carte.

   LA LISTE EST NOMMEE, PAS DEDUITE. Une regle automatique du type « un seul
   mot » classerait Skweee, Makina, Gqom, Nitzhonot ou Zenonesque parmi les
   generiques alors qu'ils sont les plus pointus du corpus, et le test perdrait
   tout son sens : il comparerait des mots courts a des mots longs.

   LE CRITERE : le libelle nomme un COURANT ENTIER, employe seul dans la
   presse et les bacs de disquaire, et non une de ses variantes. « Trance » est
   un courant, « Goa Trance » en est une ecole. */
const PARAPLUIES = new Set([
  'Ambient', 'Breakbeat', 'Disco', 'Downtempo', 'Drone', 'Dub', 'Dubstep',
  'Electro', 'Funk', 'Gabber', 'Glitch', 'Grime', 'Hardstyle', 'IDM',
  'Industrial', 'Jungle', 'Reggae', 'Trance', 'Trap', 'Hip-Hop',
  'Drum and Bass', 'Synth-pop', 'New Age', 'Chill-Out', 'Krautrock', 'Lounge'
]);

const main = async (): Promise<void> => {
  const out: Resultat[] = [];
  for (const g of corpus.genres) {
    let trouve: Resultat | null = null;
    for (const forme of variantes(g)) {
      const rep = await interroger(forme);
      await sommeil(260); // Last.fm demande de rester sous 5 requetes par seconde.
      if (rep) {
        trouve = { id: g.id, label: g.label, family: g.family, ...rep, forme, exact: forme === g.label };
        break;
      }
    }
    out.push(trouve ?? { id: g.id, label: g.label, family: g.family, reach: 0, taggings: 0, forme: null, exact: false });
  }

  const ok = out.filter((x) => x.reach > 0);
  const exacts = ok.filter((x) => x.exact);
  const q = (a: number[], p: number): number => a[Math.floor(p * (a.length - 1))] ?? 0;
  const reachs = ok.map((x) => x.reach).sort((a, b) => a - b);

  console.log(`\n=== COUVERTURE ===`);
  console.log(`trouves : ${ok.length} / ${out.length}   dont sur le nom EXACT : ${exacts.length}`);
  console.log(`absents apres variantes : ${out.length - ok.length}`);
  const absents = out.filter((x) => x.reach === 0).map((x) => x.label);
  if (absents.length > 0) console.log('   ' + absents.join(', '));

  console.log(`\n=== DISTRIBUTION DU REACH ===`);
  console.log(`min ${q(reachs, 0)}  q1 ${q(reachs, 0.25)}  mediane ${q(reachs, 0.5)}  q3 ${q(reachs, 0.75)}  max ${q(reachs, 1)}`);
  console.log(`rapport extremes : x${Math.round(q(reachs, 1) / Math.max(1, q(reachs, 0)))}`);

  const VINGT = ['Detroit Techno','Chicago House','Trance','Dubstep','Drum and Bass','Trip-Hop','Gabber','Goa Trance','Italo Disco','Minimal Techno','Psychedelic Trance','Hardstyle','Breakbeat','Ambient','IDM','Jungle','Acid House','Downtempo'];
  const sel = VINGT.map((n) => ok.find((x) => x.label === n)).filter((x): x is Resultat => x !== undefined);
  const parReach = [...sel].sort((a, b) => b.reach - a.reach);
  const parTag = [...sel].sort((a, b) => b.taggings - a.taggings);
  console.log(`\n=== LES DEUX CLASSEMENTS, COTE A COTE ===`);
  console.log('  #   par REACH                        par TAGGINGS');
  for (let i = 0; i < sel.length; i += 1) {
    const a = parReach[i]; const b = parTag[i];
    console.log(
      `  ${String(i + 1).padStart(2)}  ${(a?.label ?? '').padEnd(20)} ${String(a?.reach ?? '').padStart(8)}   ` +
        `${(b?.label ?? '').padEnd(20)} ${String(b?.taggings ?? '').padStart(9)}`
    );
  }

  /* CROISEMENT AVEC LA MEDIANE DES VUES YOUTUBE. Sur les logarithmes : deux
     grandeurs qui s'etalent sur cinq ordres de grandeur ne se correlent pas en
     valeur brute, une seule vedette y ferait toute la statistique. */
  const paires = ok
    .map((x) => ({ l: x.label, r: x.reach, y: vues.genres?.[x.id] ?? 0 }))
    .filter((p) => p.y > 0);
  const lx = paires.map((p) => Math.log10(1 + p.r));
  const ly = paires.map((p) => Math.log10(1 + p.y));
  const moy = (a: number[]): number => a.reduce((s, v) => s + v, 0) / a.length;
  const mx = moy(lx); const my = moy(ly);
  let num = 0; let dx = 0; let dy = 0;
  for (let i = 0; i < lx.length; i += 1) {
    const a = (lx[i] ?? 0) - mx; const b = (ly[i] ?? 0) - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  /* ═══ LE TEST QUI DECIDE ═══ */
  const stat = (a: number[]): { n: number; moy: number; med: number } => {
    if (a.length === 0) return { n: 0, moy: 0, med: 0 };
    const t = [...a].sort((x, y) => x - y);
    return {
      n: t.length,
      moy: Math.round(t.reduce((s2, v) => s2 + v, 0) / t.length),
      med: t[Math.floor(t.length / 2)] ?? 0
    };
  };
  const para = ok.filter((x) => PARAPLUIES.has(x.label));
  const spec = ok.filter((x) => !PARAPLUIES.has(x.label));
  const sp = stat(para.map((x) => x.reach));
  const ss = stat(spec.map((x) => x.reach));
  console.log(`\n=== PARAPLUIE CONTRE SPECIFIQUE, sur le reach ===`);
  console.log(`  parapluies  : ${String(sp.n).padStart(3)} genres   moyenne ${String(sp.moy).padStart(8)}   mediane ${String(sp.med).padStart(8)}`);
  console.log(`  specifiques : ${String(ss.n).padStart(3)} genres   moyenne ${String(ss.moy).padStart(8)}   mediane ${String(ss.med).padStart(8)}`);
  console.log(`  rapport des moyennes : x${(sp.moy / Math.max(1, ss.moy)).toFixed(1)}   des medianes : x${(sp.med / Math.max(1, ss.med)).toFixed(1)}`);
  const top20 = [...ok].sort((a, b) => b.reach - a.reach).slice(0, 20);
  const paraDansTop = top20.filter((x) => PARAPLUIES.has(x.label)).length;
  console.log(`  parapluies dans les 20 plus hauts reach : ${paraDansTop} / 20   (ils sont ${sp.n} sur ${ok.length}, soit ${Math.round((sp.n / ok.length) * 100)}% du corpus)`);
  console.log(`  les 20 plus hauts : ${top20.map((x) => (PARAPLUIES.has(x.label) ? `[${x.label}]` : x.label)).join(', ')}`);
  console.log(`  (entre crochets : les parapluies)`);

  console.log(`\n=== CROISEMENT AVEC LA MEDIANE DES VUES ===`);
  console.log(`genres comparables : ${paires.length}`);
  console.log(`correlation des logarithmes : ${(num / Math.sqrt(dx * dy)).toFixed(2)}`);

  /* Les divergences : on compare les RANGS, seule facon de mettre deux
     grandeurs d'unites differentes sur la meme regle. */
  const rgR = new Map([...paires].sort((a, b) => a.r - b.r).map((p, i) => [p.l, i]));
  const rgY = new Map([...paires].sort((a, b) => a.y - b.y).map((p, i) => [p.l, i]));
  const ecarts = paires
    .map((p) => ({ ...p, d: (rgR.get(p.l) ?? 0) - (rgY.get(p.l) ?? 0) }))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, 10);
  console.log('\nles dix plus grandes divergences de rang :');
  for (const e of ecarts) {
    const sens = e.d > 0 ? 'connu mais peu ecoute' : 'ecoute mais peu tague';
    console.log(`  ${e.l.padEnd(22)} reach ${String(e.r).padStart(7)}  vues ${String(e.y).padStart(10)}  ecart ${String(e.d).padStart(4)} rangs  ${sens}`);
  }
};

void main();
