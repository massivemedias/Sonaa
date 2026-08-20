/* LA MEDIANE DES VUES PAR MORCEAU, POUR LA CARTE DE CHALEUR.

   ═══════════════════════════════════════════════════════════════════════
   POURQUOI LA MEDIANE ET PAS LA SOMME, ET POURQUOI UN RANG ET PAS LA VALEUR
   ═══════════════════════════════════════════════════════════════════════

   LA SOMME NE STABILISE RIEN. Mesure faite sur les 1783 morceaux du corpus :
   la part du morceau le plus vu dans le total de son genre est de 60 % en
   mediane. CENT QUARANTE-TROIS genres sur 219 ont un seul morceau qui pese
   plus de la moitie, et cinquante et un en ont un qui pese plus de 80 %. Une
   somme mesure donc surtout le morceau viral du genre.

   LA SOMME EST AUSSI BIAISEE PAR LE NOMBRE DE MORCEAUX CHOISIS, ce qui est
   une decision editoriale et non une propriete du genre. Correlation mesuree
   entre le nombre de morceaux et le total des vues : 0,38. Avec la mediane
   par morceau : 0,14. Le biais disparait presque.

   LA MEDIANE SEULE NE SUFFIT PAS pour la geometrie : elle laisse un rapport
   de 222 235 entre le genre le plus ecoute et le moins ecoute. Un rectangle
   deux cent mille fois plus petit qu'un autre n'est pas un rectangle. Le rang
   est donc calcule DANS LA VUE, pas ici : ce fichier ne porte que la mesure,
   la decision editoriale de l'ecraser en douze crans appartient a l'affichage
   et doit rester lisible dans le code de l'affichage.

   COUT ET FRAICHEUR. 36 appels d'une unite chacun sur un quota de 10 000 par
   jour, soit 277 rafraichissements complets possibles quotidiennement. La
   fraicheur n'est contrainte par rien.

   Usage : npm run fetch:vues
*/

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const CLE = process.env['YOUTUBE_API_KEY'];

interface Track { youtubeId: string; artist: string; title: string }
interface Genre { id: string; label: string; tracks: Track[] }
interface Corpus { genres: Genre[] }

const corpus = JSON.parse(readFileSync(`${RACINE}src/data/corpus.json`, 'utf8')) as Corpus;

if (!CLE) {
  console.error(
    "\nPAS DE CLE YOUTUBE dans l'environnement.\n" +
      "  Aucune mesure n'est ecrite : un fichier vide serait pris pour un corpus\n" +
      '  sans aucune vue, et la carte afficherait des rangs faux plutot que de\n' +
      "  retomber sur le poids genealogique.\n\n" +
      '  Lancer avec --env-file=.env, ou definir YOUTUBE_API_KEY.\n'
  );
  process.exit(2);
}

const sommeil = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const mediane = (v: number[]): number => {
  if (v.length === 0) return 0;
  const t = [...v].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  if (t.length % 2 === 1) return t[m] ?? 0;
  return Math.round(((t[m - 1] ?? 0) + (t[m] ?? 0)) / 2);
};

const main = async (): Promise<void> => {
  const tous: string[] = [];
  for (const g of corpus.genres) for (const t of g.tracks) tous.push(t.youtubeId);

  const vues = new Map<string, number>();
  let appels = 0;
  for (let i = 0; i < tous.length; i += 50) {
    const lot = tous.slice(i, i + 50);
    const url =
      'https://www.googleapis.com/youtube/v3/videos?part=statistics&id=' +
      lot.join(',') +
      '&key=' +
      CLE;
    const r = await fetch(url);
    appels += 1;
    if (!r.ok) {
      /* ON N'ECRIT PAS UN FICHIER PARTIEL. Un fichier a moitie rempli donne
         des rangs faux sur la moitie du corpus, et rien ne le dirait : c'est
         exactement le faux vert que ce projet traque. */
      console.error(`\nAPPEL ${appels} REFUSE, http ${r.status}. Rien n'est ecrit.\n`);
      process.exit(2);
    }
    const j = (await r.json()) as { items?: { id: string; statistics?: { viewCount?: string } }[] };
    for (const it of j.items ?? []) vues.set(it.id, Number(it.statistics?.viewCount ?? 0));
    await sommeil(120);
  }

  /* LES MORCEAUX QUI NE REPONDENT PLUS. Une video retiree, privee ou bloquee
     ne revient pas dans la reponse. Ce n'est pas un detail de mesure : dans le
     lecteur, c'est une piste morte, et une piste morte est un defaut visible. */
  const disparus: string[] = [];
  for (const g of corpus.genres) {
    for (const t of g.tracks) {
      if (!vues.has(t.youtubeId)) disparus.push(`${g.id}  ${t.artist} - ${t.title}  [${t.youtubeId}]`);
    }
  }

  const table: Record<string, number> = {};
  for (const g of corpus.genres) {
    const v = g.tracks.map((t) => vues.get(t.youtubeId)).filter((x): x is number => typeof x === 'number');
    if (v.length > 0) table[g.id] = mediane(v);
  }

  const sortie = {
    /* LA DATE EST DANS LE FICHIER, et c'est elle qui permet a la vue de dire
       « mesure du 20 aout » plutot que de laisser croire a du temps reel. */
    releve: new Date().toISOString().slice(0, 10),
    genres: table
  };
  writeFileSync(`${RACINE}src/data/vues.json`, `${JSON.stringify(sortie, null, 2)}\n`);

  const n = Object.keys(table).length;
  console.log(`Vues relevees : ${vues.size} morceaux sur ${tous.length}, en ${appels} appels.`);
  console.log(`Mediane ecrite pour ${n} genres sur ${corpus.genres.length}.`);
  if (disparus.length > 0) {
    console.log(`\n${disparus.length} MORCEAU(X) NE REPONDENT PLUS, a remplacer :`);
    for (const d of disparus) console.log(`  ${d}`);
  }
};

void main();
