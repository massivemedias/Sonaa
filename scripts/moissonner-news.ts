/* LA MOISSON DES NEWS : vingt flux, un fichier, six fois par jour.
 *
 * Usage : npm run moissonner:news
 *
 * ═══ POURQUOI UN FICHIER ET PAS UNE LECTURE EN DIRECT ═══
 *
 * Un navigateur ne peut pas lire ces flux lui-meme : les sites ne l'y
 * autorisent pas (CORS), et vingt requetes a l'ouverture d'un onglet
 * feraient attendre tout le monde pour des titres qui ne changent que
 * quelques fois par jour. Le fichier est refait par une tache planifiee
 * (voir .github/workflows/news.yml), commis, et publie avec le site : la
 * page News lit un JSON de chez nous, en une requete, et n'attend personne.
 *
 * ═══ UNE SOURCE QUI TOMBE NE FAIT PAS TOMBER LES AUTRES ═══
 *
 * Chaque flux est lu dans son propre essai, avec un delai borne. Ce qui
 * echoue est ECRIT dans le fichier (`pannes`), pas tu : la page peut le
 * dire, et la moisson suivante reessaie.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lireFlux, SOURCES, type Article } from './lib/flux-rss.ts';

const SORTIE = fileURLToPath(new URL('../public/news.json', import.meta.url));
/** Par source : assez pour une journee chargee, pas de quoi noyer les autres. */
const PAR_SOURCE = 12;
/** Au total : ce que la page montre, du plus recent au plus ancien. */
const TOTAL = 160;
const DELAI_MS = 15_000;

export interface Livre {
  readonly fait: string;
  readonly articles: readonly Article[];
  readonly pannes: readonly { id: string; raison: string }[];
}

async function lire(url: string): Promise<string> {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), DELAI_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'user-agent': 'SONAA/1.0 (+https://sonaa.ca ; flux lu six fois par jour)',
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
      },
      redirect: 'follow',
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(minuteur);
  }
}

async function main(): Promise<void> {
  const articles: Article[] = [];
  const pannes: { id: string; raison: string }[] = [];

  await Promise.all(
    SOURCES.filter((s) => s.flux !== null).map(async (s) => {
      try {
        const xml = await lire(s.flux ?? '');
        const lus = lireFlux(xml, s.id);
        if (lus.length === 0) throw new Error('aucun article lu');
        articles.push(...lus.slice(0, PAR_SOURCE));
        console.log(`  ${s.nom.padEnd(24)} ${lus.length} articles`);
      } catch (e) {
        const raison = e instanceof Error ? e.message : String(e);
        pannes.push({ id: s.id, raison });
        console.log(`  ${s.nom.padEnd(24)} PANNE : ${raison}`);
      }
    })
  );

  /* Du plus recent au plus ancien ; ce qui n'a pas de date passe en dernier.
     Les doublons (un meme lien pousse deux fois par un flux bavard) sont
     ecartes. */
  const vus = new Set<string>();
  const tries = articles
    .filter((a) => {
      if (vus.has(a.lien)) return false;
      vus.add(a.lien);
      return true;
    })
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, TOTAL);

  const livre: Livre = { fait: new Date().toISOString(), articles: tries, pannes };
  writeFileSync(SORTIE, JSON.stringify(livre), 'utf8');
  const avecFlux = SOURCES.filter((s) => s.flux !== null).length;
  console.log(`\n${tries.length} articles de ${avecFlux - pannes.length} sources sur ${avecFlux}, ${pannes.length} panne(s).`);
}

if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
