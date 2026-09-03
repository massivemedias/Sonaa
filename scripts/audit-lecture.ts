/* LES 2382 MORCEAUX SE LISENT-ILS ENCORE ?
 *
 * ═══ LA QUESTION QUE PERSONNE NE POSAIT ═══
 *
 * Un identifiant YouTube n'est pas une adresse stable. Une video part pour
 * cinq raisons, et aucune ne se voit dans le corpus : elle est supprimee, la
 * chaine ferme, un ayant droit la bloque dans certains pays, elle passe en
 * prive, ou son proprietaire desactive l'integration. Dans les quatre
 * premiers cas le lecteur affiche une plaque noire ; dans le cinquieme il
 * affiche « regarder sur YouTube », ce qui est pire, parce que la fiche a
 * l'air de fonctionner.
 *
 * Le corpus marque tous les morceaux `verified: true`. C'etait vrai le jour
 * ou on les a poses. Ce controle demande si ca l'est encore.
 *
 * ═══ CE QU'IL INTERROGE, ET POURQUOI CETTE ROUTE-LA ═══
 *
 * `videos.list` de l'API officielle, cinquante identifiants par appel, une
 * unite de quota par appel. Les 2382 morceaux tiennent donc en 48 unites sur
 * les 10 000 de la journee. Le grattage de page aurait coute mille fois plus
 * et se serait fait fermer la porte au bout de vingt requetes.
 *
 * TROIS CHOSES SE LISENT DANS LA REPONSE, ET IL FAUT LES TROIS :
 *   - un identifiant ABSENT de la reponse n'existe plus, ou est prive ;
 *   - `status.embeddable` a faux veut dire que l'iframe refusera, meme si la
 *     video s'ouvre tres bien sur YouTube ;
 *   - `status.uploadStatus` a `rejected` ou `deleted` dit le reste.
 *
 * On releve aussi le blocage par pays. Une video bloquee au Canada est
 * invisible pour Mika mais parfaitement lisible pour un visiteur allemand :
 * ce n'est pas une panne, c'est une information, et elle est rangee a part.
 *
 * ═══ IL N'ECRIT RIEN DANS LE CORPUS ═══
 *
 * Il produit un rapport. Remplacer un morceau demande de choisir le
 * remplacant, et ce choix est celui de Mika. Un script qui substituerait tout
 * seul finirait par mettre n'importe quel enregistrement portant le bon titre
 * a la place du bon.
 *
 * Usage :
 *   npx tsx scripts/audit-lecture.ts
 *   npx tsx scripts/audit-lecture.ts --only=house
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const RAPPORT = fileURLToPath(new URL('../audit-lecture.md', import.meta.url));

const only = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);

/* La cle vient de l'environnement ou du fichier, comme partout ailleurs. */
const CLE = (() => {
  if (process.env['YOUTUBE_API_KEY']) return process.env['YOUTUBE_API_KEY'];
  const env = fileURLToPath(new URL('../.env', import.meta.url));
  if (!existsSync(env)) return '';
  const m = readFileSync(env, 'utf8').match(/^YOUTUBE_API_KEY=(.+)$/m);
  return m?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
})();

if (!CLE) {
  console.error(
    "YOUTUBE_API_KEY absente. Ce controle demande a YouTube si chaque video\n" +
      "existe encore et si elle accepte d'etre integree : sans cle il n'a rien\n" +
      "a interroger, et il s'arrete plutot que de rendre un rapport vide qui\n" +
      'ressemblerait a « tout va bien ».'
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
  tracks?: Track[];
}

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as {
  genres: Genre[];
  families: { id: string; label: string }[];
};

const genres = only ? corpus.genres.filter((g) => g.id.includes(only)) : corpus.genres;

/* Un identifiant peut servir dans plusieurs genres. On interroge une fois et
   on rattache ensuite : sans cela, un morceau partage par six genres
   coutait six fois son quota. */
const ou = new Map<string, { g: Genre; t: Track }[]>();
for (const g of genres) {
  for (const t of g.tracks ?? []) {
    const l = ou.get(t.youtubeId) ?? [];
    l.push({ g, t });
    ou.set(t.youtubeId, l);
  }
}
const ids = [...ou.keys()];

console.log(
  `${ids.length} identifiants distincts dans ${genres.length} genres. ` +
    `Cout : ${Math.ceil(ids.length / 50)} unites de quota sur 10 000.`
);

interface Etat {
  present: boolean;
  embeddable?: boolean;
  uploadStatus?: string;
  privacyStatus?: string;
  titre?: string;
  bloquePays?: string[];
  autorisePays?: string[];
}

const etats = new Map<string, Etat>();

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

for (let i = 0; i < ids.length; i += 50) {
  const paquet = ids.slice(i, i + 50);
  const url =
    'https://www.googleapis.com/youtube/v3/videos?part=status,snippet,contentDetails' +
    `&id=${paquet.join(',')}&key=${CLE}`;
  let reponse: {
    items?: {
      id?: string;
      status?: { embeddable?: boolean; uploadStatus?: string; privacyStatus?: string };
      snippet?: { title?: string };
      contentDetails?: { regionRestriction?: { blocked?: string[]; allowed?: string[] } };
    }[];
    error?: { message?: string };
  };
  try {
    const r = await fetch(url);
    reponse = (await r.json()) as typeof reponse;
  } catch (e) {
    console.error(`Reseau : ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
  if (reponse.error) {
    console.error(`YouTube refuse : ${reponse.error.message ?? 'sans message'}`);
    process.exit(1);
  }

  /* CE QUI N'EST PAS DANS LA REPONSE N'EXISTE PLUS. L'API ne dit pas
     « supprimee » : elle ne renvoie simplement pas la ligne. C'est
     silencieux, et c'est justement pour cela qu'on part du paquet demande
     plutot que de la liste rendue. */
  const rendus = new Set<string>();
  for (const it of reponse.items ?? []) {
    if (!it.id) continue;
    rendus.add(it.id);
    const e: Etat = { present: true };
    if (it.status?.embeddable !== undefined) e.embeddable = it.status.embeddable;
    if (it.status?.uploadStatus) e.uploadStatus = it.status.uploadStatus;
    if (it.status?.privacyStatus) e.privacyStatus = it.status.privacyStatus;
    if (it.snippet?.title) e.titre = it.snippet.title;
    const rr = it.contentDetails?.regionRestriction;
    if (rr?.blocked) e.bloquePays = rr.blocked;
    if (rr?.allowed) e.autorisePays = rr.allowed;
    etats.set(it.id, e);
  }
  for (const id of paquet) if (!rendus.has(id)) etats.set(id, { present: false });

  process.stdout.write(`\r  ${Math.min(i + 50, ids.length)} / ${ids.length}`);
  await dormir(80);
}
process.stdout.write('\n');

/* ── Le tri ──────────────────────────────────────────────────────────────── */

interface Signal {
  id: string;
  cause: string;
  detail: string;
  genres: string[];
  morceau: string;
}

const morts: Signal[] = [];
const nonIntegrables: Signal[] = [];
const bloquesPartout: Signal[] = [];
const bloquesIci: Signal[] = [];

for (const [id, e] of etats) {
  const usages = ou.get(id) ?? [];
  const p = usages[0];
  if (!p) continue;
  const morceau = `${p.t.artist} · ${p.t.title}`;
  const listeGenres = usages.map((u) => u.g.label);
  const base = { id, genres: listeGenres, morceau };

  if (!e.present) {
    morts.push({ ...base, cause: 'absente', detail: 'supprimee, privee ou identifiant faux' });
    continue;
  }
  if (e.uploadStatus === 'rejected' || e.uploadStatus === 'deleted') {
    morts.push({ ...base, cause: e.uploadStatus, detail: 'refusee ou supprimee par YouTube' });
    continue;
  }
  if (e.privacyStatus === 'private') {
    morts.push({ ...base, cause: 'privee', detail: 'plus visible du public' });
    continue;
  }
  if (e.embeddable === false) {
    nonIntegrables.push({
      ...base,
      cause: 'integration refusee',
      detail: "s'ouvre sur YouTube mais pas dans le lecteur du site",
    });
    continue;
  }
  /* LE BLOCAGE PAR PAYS, ET LE PIEGE DES DEUX LISTES INVERSES.
   *
   * YouTube donne l'une ou l'autre : `blocked`, la liste noire, ou `allowed`,
   * la liste blanche. Elles se lisent en sens CONTRAIRE, et un premier jet a
   * confondu les deux : il rangeait dans « bloquee au Canada » toute video
   * dont la liste blanche contenait le Canada, c'est-a-dire exactement celles
   * qui s'y lisent. Resultat annonce : 603 morceaux illisibles a Montreal,
   * soit un quart du corpus. Un chiffre trop gros pour etre vrai, et c'est ce
   * qui a fait relire.
   *
   * La regle tient en une phrase : le Canada est-il dans la liste blanche, ou
   * hors de la liste noire ? */
  const surListeBlanche = e.autorisePays && e.autorisePays.length > 0;
  const surListeNoire = e.bloquePays && e.bloquePays.length > 0;
  if (!surListeBlanche && !surListeNoire) continue;

  const lisibleIci = surListeBlanche
    ? (e.autorisePays as string[]).includes('CA')
    : !(e.bloquePays as string[]).includes('CA');

  const detail = surListeBlanche
    ? `visible seulement dans ${(e.autorisePays as string[]).length} pays : ` +
      `${(e.autorisePays as string[]).slice(0, 8).join(', ')}`
    : `bloquee dans ${(e.bloquePays as string[]).length} pays`;

  (lisibleIci ? bloquesPartout : bloquesIci).push({
    ...base,
    cause: lisibleIci ? 'restreinte ailleurs' : 'illisible au Canada',
    detail,
  });
}

const lisibles =
  etats.size - morts.length - nonIntegrables.length - bloquesPartout.length - bloquesIci.length;

/* ── Le rapport ──────────────────────────────────────────────────────────── */

const bloc = (titre: string, quoi: string, l: Signal[]): string => {
  if (l.length === 0) return `## ${titre}\n\nAucun.\n`;
  const lignes = l
    .sort((a, b) => a.morceau.localeCompare(b.morceau))
    .map(
      (s) =>
        `- **${s.morceau}** \`${s.id}\`  \n` +
        `  ${s.detail}  \n` +
        `  dans : ${s.genres.join(', ')}`
    );
  return `## ${titre} (${l.length})\n\n${quoi}\n\n${lignes.join('\n')}\n`;
};

const rapport = [
  '# Les morceaux se lisent-ils encore ?',
  '',
  `Releve du ${new Date().toISOString().slice(0, 10)} sur ${etats.size} identifiants ` +
    `distincts, ${genres.length} genres.`,
  '',
  `- **${lisibles}** se lisent normalement`,
  `- **${morts.length}** ne repondent plus du tout`,
  `- **${nonIntegrables.length}** refusent l'integration : le lecteur du site affichera ` +
    'une plaque, alors que le lien vers YouTube marcherait',
  `- **${bloquesIci.length}** sont bloquees au Canada`,
  `- **${bloquesPartout.length}** sont bloquees ailleurs, mais lisibles ici`,
  '',
  "Ce fichier ne modifie rien. Le remplacement d'un morceau demande de choisir",
  'le remplacant, et ce choix ne revient pas a un script.',
  '',
  bloc(
    'Mortes',
    'Supprimees, passees en prive, ou identifiant devenu faux. Le lecteur affiche une plaque noire.',
    morts
  ),
  bloc(
    "Integration refusee",
    "Le proprietaire a desactive la lecture hors de YouTube. C'est le cas le plus trompeur : " +
      "la video existe, elle s'ouvre parfaitement en cliquant, et le lecteur du site reste noir.",
    nonIntegrables
  ),
  bloc(
    'Bloquees au Canada',
    "Invisibles depuis Montreal, lisibles ailleurs. A remplacer si l'on veut que la fiche " +
      'fonctionne pour son auteur.',
    bloquesIci
  ),
  bloc(
    'Bloquees ailleurs',
    "Lisibles ici, invisibles pour une partie des visiteurs. Ce n'est pas une panne, c'est une " +
      'limite a connaitre.',
    bloquesPartout
  ),
].join('\n');

writeFileSync(RAPPORT, rapport);

console.log('');
console.log(`  lisibles              ${lisibles}`);
console.log(`  mortes                ${morts.length}`);
console.log(`  integration refusee   ${nonIntegrables.length}`);
console.log(`  bloquees au Canada    ${bloquesIci.length}`);
console.log(`  bloquees ailleurs     ${bloquesPartout.length}`);
console.log('');
console.log(`Rapport : ${RAPPORT}`);
