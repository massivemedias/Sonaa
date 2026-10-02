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
import Anthropic from '@anthropic-ai/sdk';
import { MODELE_RESUME, prixDe, resumerArticle, texteDeLaPage, type Facture, type ResumeSonaa } from './lib/resume-sonaa.ts';

const SORTIE = fileURLToPath(new URL('../public/news.json', import.meta.url));
/** Par source : assez pour une journee chargee, pas de quoi noyer les autres. */
const PAR_SOURCE = 12;
/** Au total : ce que la page montre, du plus recent au plus ancien. */
const TOTAL = 160;
const DELAI_MS = 15_000;
/* LES RESUMES SONAA D'UNE PASSE, AU PLUS. Une passe en trouve d'ordinaire
   une dizaine de nouveaux ; la toute premiere en avait une centaine a
   rattraper, et un article sans resume n'est plus montre (voir plus bas) :
   le rattrapage se fait donc d'un coup. Le plafond borne seulement la
   facture d'une passe qui s'emballerait (trois dollars au pire). */
const RESUMES_PAR_PASSE = 100;

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
  const synthesesDeja = new Map<string, ResumeSonaa>();
  if (existsSync(SORTIE)) {
    try {
      const ancien = JSON.parse(readFileSync(SORTIE, 'utf8')) as Livre;
      for (const a of ancien.articles) {
        if (a.titre_fr) deja.set(a.lien, { titre: a.titre_fr, resume: a.resume_fr ?? '' });
        if (a.synthese) synthesesDeja.set(a.lien, a.synthese);
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

  /* ═══ LE RESUME SONAA, POUR LES ARTICLES DONT LE FLUX NE DONNE QU'UN
     EXTRAIT ═══ Voir scripts/lib/resume-sonaa.ts. Comme la traduction : on
     reprend ceux du fichier precedent, on ne paie que les nouveaux, et sans
     cle on n'appelle rien. La page de l'article est lue une fois, pour en
     tirer les faits ; son texte n'est pas garde. */
  const syntheses = new Map(synthesesDeja);
  const aResumer = traduits.filter((a) => !a.integral && !syntheses.has(a.lien)).slice(0, RESUMES_PAR_PASSE);
  if (aResumer.length === 0) {
    console.log('\nResumes SONAA : rien de nouveau.');
  } else if (!cle) {
    console.log(`\nResumes SONAA : ${aResumer.length} article(s) a resumer, mais ANTHROPIC_API_KEY est absente.`);
  } else {
    console.log(`\nResumes SONAA de ${aResumer.length} article(s), avec ${MODELE_RESUME} :`);
    const client = new Anthropic({ apiKey: cle });
    const facture: Facture = { entree: 0, sortie: 0 };
    let faits = 0;
    for (let i = 0; i < aResumer.length; i += 3) {
      await Promise.all(
        aResumer.slice(i, i + 3).map(async (a) => {
          const nom = SOURCES.find((s) => s.id === a.source)?.nom ?? a.source;
          try {
            const texte = texteDeLaPage(await lire(a.lien));
            /* Moins de huit cents signes : un mur payant ou une page vide, pas
               de quoi resumer un article. */
            if (texte.length < 800) {
              console.log(`  ${nom.padEnd(22)} page trop courte (${texte.length} signes) : ${a.titre.slice(0, 50)}`);
              return;
            }
            const r = await resumerArticle(client, { titre: a.titre, source: nom, lien: a.lien }, texte, facture);
            if (r) {
              syntheses.set(a.lien, r);
              faits += 1;
            } else {
              console.log(`  ${nom.padEnd(22)} pas de resume : ${a.titre.slice(0, 50)}`);
            }
          } catch (e) {
            console.log(`  ${nom.padEnd(22)} ${e instanceof Error ? e.message : String(e)} : ${a.titre.slice(0, 50)}`);
          }
        })
      );
    }
    console.log(`  ${faits} resume(s) faits, ${facture.entree} tokens entree, ${facture.sortie} sortie, ${prixDe(facture).toFixed(4)} USD`);
  }
  const resumes: Article[] = traduits.map((a) => {
    const s = syntheses.get(a.lien);
    return s ? { ...a, synthese: s } : a;
  });
  console.log(`  ${resumes.filter((a) => a.synthese).length} article(s) sur ${resumes.filter((a) => !a.integral).length} en extrait ont leur resume SONAA.`);

  /* ═══ UN ARTICLE QU'ON NE PEUT PAS LIRE ICI N'EST PAS MONTRE ═══ Mika, le
     2 octobre 2026, devant un article de MusicRadar reduit a son titre et a
     « Lire la suite sur MusicRadar » : « je prefere ne pas le voir ». Un
     article reste s'il est entier dans son flux, ou s'il a son resume SONAA.
     Celui dont la page n'a pas pu etre resumee (mur payant, blocage des
     robots) attend la passe suivante, ou ne revient pas. */
  const lisibles = resumes.filter((a) => a.integral !== false || a.synthese);
  console.log(`  ${resumes.length - lisibles.length} article(s) en extrait sans resume ne sont pas montres.`);

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
