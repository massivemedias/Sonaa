/* LA MOISSON DES NEWS : vingt flux, un fichier, deux fois par jour.
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
 * ═══ TOUTE TUILE A UNE IMAGE, OU N'EST PAS ═══
 *
 * Mika, le 7 septembre 2026, devant une tuile grise a la lettre S : « toutes
 * les tuiles possedent au moins une image, s'il n'y en a pas on ne met pas
 * cette tuile ». La moitie des flux ne donnent pas d'image ; on va la
 * chercher sur la page de l'article (og:image), et ce qui n'en a toujours
 * pas est ecarte.
 *
 * ═══ UNE SOURCE QUI TOMBE NE FAIT PAS TOMBER LES AUTRES ═══
 *
 * Chaque flux est lu dans son propre essai, avec un delai borne. Ce qui
 * echoue est ECRIT dans le fichier (`pannes`), pas tu : la page peut le
 * dire, et la moisson suivante reessaie.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { imageDePage, lireFlux, SOURCES, type Article } from './lib/flux-rss.ts';
import { pertinent } from './lib/filtre-news.ts';
import { ecrireActu, lireActu, rangerLesNews } from './lib/actu-labels.ts';

const SORTIE = fileURLToPath(new URL('../public/news.json', import.meta.url));
const LABELS = fileURLToPath(new URL('../src/data/labels.json', import.meta.url));
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
        'user-agent': 'SONAA/1.0 (+https://sonaa.ca ; flux lu deux fois par jour)',
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

/* Une image se charge si son adresse rend un statut 200 et un type image,
   demandee comme un navigateur la demanderait depuis une autre page. Le
   corps est lu puis jete : certains serveurs ne disent la verite qu'une fois
   la reponse consommee. Dix secondes au plus. */
const NAVIGATEUR =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
async function imageSeCharge(adresse: string): Promise<boolean> {
  if (!/^https?:\/\//.test(adresse)) return false;
  const arret = new AbortController();
  const minuteur = setTimeout(() => arret.abort(), 10_000);
  try {
    const r = await fetch(adresse, {
      signal: arret.signal,
      redirect: 'follow',
      headers: { 'user-agent': NAVIGATEUR, accept: 'image/avif,image/webp,image/*,*/*;q=0.8', referer: 'https://sonaa.ca/' },
    });
    const type = r.headers.get('content-type') ?? '';
    await r.arrayBuffer().catch(() => undefined);
    return r.ok && type.startsWith('image/');
  } catch {
    return false;
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
        /* LE TRI AVANT LA PART : MusicRadar donne cinquante articles, dont
           une poignee de synthes ; couper a douze avant de trier en
           laisserait deux. Voir filtre-news.ts. */
        const gardes = lus.filter(pertinent);
        articles.push(...gardes.slice(0, PAR_SOURCE).map(({ etiquettes: _e, ...a }) => a));
        console.log(`  ${s.nom.padEnd(24)} ${lus.length} articles, ${lus.length - gardes.length} hors sujet`);
      } catch (e) {
        const raison = e instanceof Error ? e.message : String(e);
        pannes.push({ id: s.id, raison });
        console.log(`  ${s.nom.padEnd(24)} PANNE : ${raison}`);
      }
    })
  );

  /* L'image manquante se cherche sur la page, par paquets de huit pour ne
     pas frapper un site de douze requetes d'un coup. */
  const sansImage = articles.filter((a) => a.image === null);
  const trouvees = new Map<string, string>();
  for (let i = 0; i < sansImage.length; i += 8) {
    await Promise.all(
      sansImage.slice(i, i + 8).map(async (a) => {
        try {
          const html = await lire(a.lien);
          const img = imageDePage(html.slice(0, 200_000));
          if (img) trouvees.set(a.lien, img);
        } catch {
          /* Une page qui ne repond pas laisse l'article sans image : il tombe. */
        }
      })
    );
  }
  const avecImage: Article[] = articles
    .map((a) => (a.image ? a : { ...a, image: trouvees.get(a.lien) ?? null }))
    .filter((a) => a.image !== null);
  console.log(`\n  ${sansImage.length} sans image dans le flux, ${trouvees.size} retrouvees sur la page, ${articles.length - avecImage.length} ecartees.`);

  /* ═══ UNE IMAGE ANNONCEE N'EST PAS UNE IMAGE QUI SE CHARGE ═══
   *
   * Mika, le 30 septembre 2026, capture a l'appui : « il y a des images
   * manquantes, je ne veux jamais voir ce genre de chose ». Les douze
   * articles de Bedroom Producers Blog annoncaient une image que le site
   * refuse a tout le monde : un controle anti-robots de Cloudflare repond
   * 403 a toute requete qui ne vient pas d'une visite de leur page, y
   * compris a un navigateur ordinaire qui charge l'image depuis SONAA.
   *
   * On TELECHARGE donc chaque image avant de la retenir, avec l'identite
   * d'un navigateur : un statut 200 et un type image, ou l'article tombe,
   * selon la regle posee par Mika des la premiere moisson, « s'il n'y en a
   * pas, on ne met pas cette tuile ». Par paquets de huit, comme plus haut. */
  const ecarteesParSource = new Map<string, number>();
  const chargees = new Set<string>();
  for (let i = 0; i < avecImage.length; i += 8) {
    await Promise.all(
      avecImage.slice(i, i + 8).map(async (a) => {
        if (await imageSeCharge(a.image ?? '')) chargees.add(a.lien);
        else ecarteesParSource.set(a.source, (ecarteesParSource.get(a.source) ?? 0) + 1);
      })
    );
  }
  const complets = avecImage.filter((a) => chargees.has(a.lien));
  const detail = [...ecarteesParSource.entries()].map(([s, n]) => `${s} ${n}`).join(', ');
  console.log(`  ${avecImage.length - complets.length} image(s) qui ne se chargent pas, articles ecartes${detail ? ` (${detail})` : ''}.`);

  /* Du plus recent au plus ancien ; ce qui n'a pas de date passe en dernier.
     Les doublons (un meme lien pousse deux fois par un flux bavard) sont
     ecartes. */
  const vus = new Set<string>();
  const tries = complets
    .filter((a) => {
      if (vus.has(a.lien)) return false;
      vus.add(a.lien);
      return true;
    })
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, TOTAL);

  /* ═══ LES TITRES RESTENT DANS LA LANGUE DU MAGAZINE ═══ Ils etaient
     traduits en francais par Claude depuis le 17 septembre 2026. Mika, le 3
     octobre, apres l'abandon du resume SONAA : « coupe aussi la
     traduction ». Plus aucun appel a une API payante dans cette moisson. */
  /* ═══ SEULS LES ARTICLES ENTIERS SONT MONTRES ═══ Mika, le 2 octobre
     2026, devant un article de MusicRadar reduit a son titre et a « Lire la
     suite » : « je prefere ne pas le voir ». Puis le 3, apres l'essai d'un
     resume ecrit par Claude (ADR-095, abandonne pour son cout) : « je veux
     juste les articles complets, c'est tout ». Un article reste s'il est
     entier dans son flux ; un extrait ne l'est jamais. */
  /* ═══ LES NEWS DES LABELS ═══ Tous les articles retenus, extraits
     compris : la page d'un label renvoie au magazine, elle n'affiche pas
     l'article. Voir scripts/lib/actu-labels.ts. */
  const fiches = JSON.parse(readFileSync(LABELS, 'utf8')) as { slug: string; nom: string }[];
  const { actu, ajouts } = rangerLesNews(fiches, tries, lireActu());
  ecrireActu(actu);
  console.log(`\n  ${ajouts} article(s) ranges sous les labels qu'ils nomment.`);

  const lisibles = tries.filter((a) => a.integral !== false);
  console.log(`\n  ${tries.length - lisibles.length} article(s) en extrait ne sont pas montres.`);

  const livre: Livre = { fait: new Date().toISOString(), articles: lisibles, pannes };
  /* INDENTE, ET `fait` SUR SA PROPRE LIGNE : l'action planifiee compare le
     fichier en ignorant cette ligne, pour ne commettre que quand un article
     a change, pas deux fois par jour pour une date. */
  writeFileSync(SORTIE, JSON.stringify(livre, null, 1), 'utf8');
  const avecFlux = SOURCES.filter((s) => s.flux !== null).length;
  console.log(`\n${tries.length} articles de ${avecFlux - pannes.length} sources sur ${avecFlux}, ${pannes.length} panne(s).`);
}

if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
