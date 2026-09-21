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

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { imageDePage, lireFlux, SOURCES, type Article } from './lib/flux-rss.ts';
import { traduire, type ATraduire } from './lib/traduire.ts';

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
  const complets: Article[] = articles
    .map((a) => (a.image ? a : { ...a, image: trouvees.get(a.lien) ?? null }))
    .filter((a) => a.image !== null);
  console.log(`\n  ${sansImage.length} sans image dans le flux, ${trouvees.size} retrouvees sur la page, ${articles.length - complets.length} ecartees.`);

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

  /* ═══ LE FRANCAIS, POUR LES SOURCES QUI ECRIVENT EN ANGLAIS ═══
   *
   * Trois regles, dans cet ordre, et c'est l'ordre qui tient la facture.
   *
   * 1. On reprend les traductions du fichier precedent. Six passes par jour
   *    sur cent soixante articles dont vingt-cinq sont nouveaux : sans cette
   *    reprise, on paierait six fois cent soixante au lieu d'une fois
   *    vingt-cinq.
   * 2. On n'envoie que les sources declarees anglophones. Le champ `langue`
   *    de news-sources.ts le dit depuis toujours : aucune detection, donc
   *    aucun risque de retraduire du francais vers le francais.
   * 3. Sans cle, on n'appelle rien et on le dit. Les articles sortent sans
   *    traduction, la page les montre en anglais. */
  const FRANCOPHONES = new Set(SOURCES.filter((s) => s.langue === 'fr').map((s) => s.id));
  const deja = new Map<string, { titre: string; resume: string }>();
  if (existsSync(SORTIE)) {
    try {
      const ancien = JSON.parse(readFileSync(SORTIE, 'utf8')) as Livre;
      for (const a of ancien.articles) {
        if (a.titre_fr) deja.set(a.lien, { titre: a.titre_fr, resume: a.resume_fr ?? '' });
      }
    } catch {
      /* Fichier illisible : on repart de rien, la passe coutera une fois le
         plein tarif et le fichier sera sain ensuite. */
    }
  }

  const cle = process.env['ANTHROPIC_API_KEY'] ?? '';
  const aTraduire: ATraduire[] = tries
    .filter((a) => !FRANCOPHONES.has(a.source) && !deja.has(a.lien))
    .map((a) => ({ lien: a.lien, titre: a.titre, resume: a.resume }));

  let neuves = new Map<string, { titre: string; resume: string }>();
  if (aTraduire.length === 0) {
    console.log('\nTraduction : rien de nouveau a traduire.');
  } else if (!cle) {
    console.log(`\nTraduction : ${aTraduire.length} article(s) a traduire, mais ANTHROPIC_API_KEY est absente. Ils sortent en anglais.`);
  } else {
    console.log(`\nTraduction de ${aTraduire.length} article(s) :`);
    neuves = await traduire(
      aTraduire,
      cle,
      (l) => console.log(l),
      /* LE PRIX DE LA PASSE, DANS SON PROPRE JOURNAL. Une facture mensuelle ne
         dit pas quelle moisson l'a gonflee ; cette ligne-la, si. */
      (c) => console.log(`  ${c.lots} lot(s), ${c.entree} tokens entree, ${c.sortie} sortie, ${c.usd.toFixed(4)} USD`)
    );
  }

  const traduits: Article[] = tries.map((a) => {
    const t = neuves.get(a.lien) ?? deja.get(a.lien);
    return t ? { ...a, titre_fr: t.titre, resume_fr: t.resume } : a;
  });
  console.log(`  ${traduits.filter((a) => a.titre_fr).length} article(s) sur ${traduits.length} ont leur version francaise.`);

  const livre: Livre = { fait: new Date().toISOString(), articles: traduits, pannes };
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
