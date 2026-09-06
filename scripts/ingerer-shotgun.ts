/* L'ADAPTATEUR SHOTGUN : les soirees de Montpellier et de Toulouse.
 *
 * Usage : npm run ingerer:shotgun -- --lire        (montre, n'ecrit rien)
 *         SUPABASE_SERVICE_ROLE_KEY=... npm run ingerer:shotgun
 *         npm run ingerer:shotgun -- --villes=montpellier --pages=2
 *
 * ═══ POURQUOI SHOTGUN ET PAS RESIDENT ADVISOR ═══
 *
 * Mesure du 6 septembre 2026, sur trois mois : Resident Advisor rend TROIS
 * soirees a Montpellier, dont deux le meme soir a la Halle Tropisme. Shotgun
 * en annonce cent quarante. A Toulouse, seize contre deux cent quatre-vingt-
 * deux. RA couvre Paris et s'effondre partout ailleurs en France ; ce n'est
 * pas un defaut de reglage de notre cote, c'est leur ligne editoriale.
 *
 * Ce n'est pas un remplacement : la passerelle RA continue de servir Montreal
 * et Berlin, ou elle est bonne. C'est une SOURCE DE PLUS, versee dans la meme
 * table `soirees_manuelles` que les saisies a la main, avec `source` qui dit
 * d'ou elle vient. Le calendrier ne change pas d'une ligne.
 *
 * ═══ POURQUOI UN NAVIGATEUR, ET PAS UN fetch ═══
 *
 * Shotgun est derriere un « Vercel Security Checkpoint ». Mesure : un curl
 * avec en-tetes de navigateur complets recoit un 429 et une page de defi
 * JavaScript, sur la page de ville comme sur une fiche comme sur leur
 * /api/data/*. Un Worker Cloudflare recevrait la meme chose. Leur robots.txt
 * autorise pourtant tout (« User-Agent: * / Allow: / ») : ce n'est pas une
 * interdiction, c'est une protection anti-robot qu'un vrai navigateur passe.
 *
 * On pilote donc le Chrome installe sur la machine, par playwright-core.
 * `playwright-core` et non `playwright` : le premier ne telecharge aucun
 * navigateur, il se sert de celui qui est deja la. Verifie : statut 200,
 * quinze fiches sur la premiere page, cent quarante annoncees.
 *
 * ═══ LA PAGINATION EST UN LIEN, PAS UN BOUTON ═══
 *
 * « Voir plus » n'ouvre pas d'appel reseau cache : c'est une ancre vers
 * `?page=1`. On demande donc les pages par leur adresse, ce qui evite de
 * simuler des clics et rend le parcours reproductible. On s'arrete quand une
 * page n'apporte plus de fiche nouvelle.
 *
 * ═══ D'OU VIENT CHAQUE CHAMP ═══
 *
 * La FICHE porte un JSON-LD `MusicEvent` complet : nom, debut et fin avec
 * fuseau, salle avec adresse et coordonnees, affiche, prix, et surtout
 * `performer`, c'est a dire LE PLATEAU. C'est la source de verite pour tout
 * ce qui compte.
 *
 * Les STYLES n'y sont pas. Ils sont sur la carte de la liste, et seulement
 * la. On les lit donc au passage, dans le texte rendu de la carte : le site
 * les met en capitales par la feuille de style, pas dans le texte, donc c'est
 * `innerText` qui les rend lisibles et non `textContent`. Une carte qui
 * affiche « +1 » cache un style de plus ; on prend ce qui est montre, parce
 * qu'ouvrir dix-sept pages de genre par ville pour recuperer un mot ne vaut
 * pas son cout.
 *
 * ═══ IDEMPOTENT ═══
 *
 * Chaque soiree est ecrite en upsert sur (source, source_ref), ou source_ref
 * est l'identifiant Shotgun de la fiche. Un index unique le garantit en base.
 * Relancer le script deux fois de suite ne cree pas de doublon, et une soiree
 * dont l'heure change est corrigee au passage suivant.
 */

import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';

/* ── Ce qu'on va chercher ─────────────────────────────────────────────── */

interface Ville {
  /** Le slug chez Shotgun, celui de l'adresse. */
  readonly shotgun: string;
  /** Le slug dans notre table `villes`. */
  readonly sonaa: string;
}

/* DEUX VILLES, PARCE QUE LE GAIN Y EST DU MEME ORDRE. En ajouter une revient
   a ajouter une ligne ici, a condition que la ville existe dans `villes`. */
const VILLES: readonly Ville[] = [
  { shotgun: 'montpellier', sonaa: 'montpellier-fr' },
  { shotgun: 'toulouse', sonaa: 'toulouse-fr' },
];

interface Fiche {
  readonly ref: string;
  readonly lien: string;
  readonly titre: string;
  readonly debut: string;
  readonly lieu: string | null;
  readonly artistes: readonly string[];
  readonly genres: readonly string[];
  readonly affiche: string | null;
}

/* ── Les reglages de la ligne de commande ─────────────────────────────── */

const args = process.argv.slice(2);
const lire = args.includes('--lire');
const opt = (nom: string): string | null => {
  const trouve = args.find((a) => a.startsWith(`--${nom}=`));
  return trouve ? (trouve.split('=')[1] ?? null) : null;
};
/* TRENTE PAGES, ET LE CHIFFRE VIENT D'UNE MESURE. La premiere moisson etait
   plafonnee a douze : Montpellier s'arretait tout seul a la page dix, sans
   rien perdre, mais Toulouse apportait encore quatorze fiches nouvelles a la
   douzieme et s'est fait couper a 161 sur 282, c'est a dire au 21 octobre.
   Un plafond qui coupe sans le dire est pire qu'un parcours long : on croit
   avoir tout pris. Quinze fiches par page, trente pages, quatre cent
   cinquante soirees par ville : au-dela, c'est la source qui s'arrete. */
const PAGES_MAX = Number(opt('pages') ?? 30);
const DEMANDEES = (opt('villes') ?? '').split(',').filter(Boolean);

/* Une pause entre deux chargements. Shotgun ne demande rien de tel dans son
   robots.txt, mais on ne martele pas un site parce qu'il ne l'interdit pas. */
const PAUSE = 650;
const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/* ── Lire les fiches d'une ville ──────────────────────────────────────── */

/** Les identifiants de fiche et leurs styles, page apres page. On s'arrete
    des qu'une page n'apporte rien de neuf : c'est plus sur que de faire
    confiance au compteur annonce, qui compte parfois des dates passees. */
async function listerLaVille(
  page: Page,
  slug: string
): Promise<Map<string, string[]>> {
  const cartes = new Map<string, string[]>();

  for (let n = 0; n < PAGES_MAX; n += 1) {
    const adresse = `https://shotgun.live/fr/cities/${slug}${n === 0 ? '' : `?page=${n}`}`;
    await page.goto(adresse, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(2500);

    const lues = await page.evaluate(() => {
      /* LA CARTE EST LE PLUS PETIT BLOC QUI NE CONTIENT QU'UNE SEULE FICHE.
         On remonte depuis le lien tant que le parent n'en contient qu'un :
         des qu'il en contient deux, on est remonte trop haut, dans la
         grille. Aucune classe CSS n'est nommee ici a dessein, elles sont
         generees et changent a chaque deploiement de leur cote. */
      const vus = new Set<string>();
      const out: Array<{ ref: string; texte: string }> = [];
      for (const a of document.querySelectorAll('a[href*="/events/"]')) {
        const href = a.getAttribute('href') ?? '';
        const ref = href.split('/events/')[1]?.split(/[?#]/)[0] ?? '';
        if (!ref || vus.has(ref)) continue;
        vus.add(ref);
        let bloc: Element = a;
        while (
          bloc.parentElement &&
          bloc.parentElement.querySelectorAll('a[href*="/events/"]').length === 1
        ) {
          bloc = bloc.parentElement;
        }
        out.push({ ref, texte: (bloc as HTMLElement).innerText ?? '' });
      }
      return out;
    });

    let neuves = 0;
    for (const { ref, texte } of lues) {
      const styles = stylesDeLaCarte(texte);
      const deja = cartes.get(ref);
      if (deja === undefined) {
        cartes.set(ref, styles);
        neuves += 1;
        continue;
      }
      /* LA CARTE EPINGLEE N'A PAS D'ETIQUETTES : elle porte un texte de
         promotion a la place. La meme soiree reparait plus bas dans la liste,
         avec ses styles. On complete donc au lieu de garder le premier
         passage, sinon la soiree la plus mise en avant de la ville serait la
         seule sans style. */
      if (deja.length === 0 && styles.length > 0) cartes.set(ref, styles);
    }
    console.log(`  page ${n} : ${lues.length} fiches, ${neuves} nouvelles`);
    if (neuves === 0) break;
    await dormir(PAUSE);
  }

  return cartes;
}

/** Les styles annonces sur une carte. Ils forment la queue du texte : une
    suite de lignes en capitales, apres la salle, la date, l'heure et le prix.
    « +1 » signale un style de plus que la carte ne montre pas ; on le laisse
    tomber plutot que d'inventer lequel. */
export function stylesDeLaCarte(texte: string): string[] {
  const lignes = texte
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const styles: string[] = [];
  for (let i = lignes.length - 1; i >= 0; i -= 1) {
    const l = lignes[i] ?? '';
    if (/^\+\d+$/.test(l)) continue;
    if (!/^[A-ZÀ-Ü][A-ZÀ-Ü0-9 '&/-]{1,24}$/.test(l)) break;
    if (/^\d/.test(l)) break;
    styles.unshift(l);
  }
  return styles;
}

/** La fiche elle-meme, lue dans son JSON-LD. Rend null quand la page n'en
    porte pas : mieux vaut une soiree manquante qu'une soiree inventee. */
async function lireLaFiche(
  page: Page,
  ref: string,
  genres: string[]
): Promise<Fiche | null> {
  const lien = `https://shotgun.live/fr/events/${ref}`;
  await page.goto(lien, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForTimeout(1800);

  const brut = await page.evaluate(() => {
    const blocs = [...document.querySelectorAll('script[type="application/ld+json"]')];
    for (const b of blocs) {
      let lu: unknown;
      try {
        lu = JSON.parse(b.textContent ?? '');
      } catch {
        continue;
      }
      for (const o of Array.isArray(lu) ? lu : [lu]) {
        const item = o as Record<string, unknown>;
        if (String(item['@type'] ?? '').includes('Event')) return item;
      }
    }
    return null;
  });

  if (!brut) return null;

  const nom = typeof brut['name'] === 'string' ? brut['name'].trim() : '';
  const debut = typeof brut['startDate'] === 'string' ? brut['startDate'] : '';
  if (!nom || !debut) return null;

  const lieuBrut = brut['location'] as { name?: unknown } | undefined;
  const lieu = typeof lieuBrut?.name === 'string' ? lieuBrut.name.trim() : null;

  const scene = brut['performer'];
  const artistes = (Array.isArray(scene) ? scene : scene ? [scene] : [])
    .map((p) => (p as { name?: unknown })?.name)
    .filter((n): n is string => typeof n === 'string' && n.trim() !== '')
    .map((n) => n.trim());

  const image = brut['image'];
  const affiche =
    typeof image === 'string' ? image : Array.isArray(image) && typeof image[0] === 'string' ? image[0] : null;

  return { ref, lien, titre: nom, debut, lieu, artistes, genres, affiche };
}

/* ── L'ecriture ───────────────────────────────────────────────────────── */

const URL_BASE = process.env['VITE_SUPABASE_URL'] ?? 'https://pqgapyfqkjzvwkulxnhv.supabase.co';
const CLE_SERVICE = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

/* LA CLE DE SERVICE N'EST PAS DANS .env ET NE DOIT PAS Y ETRE. Mika la pose
   dans l'environnement au moment de lancer, elle disparait avec le terminal.
   Meme regle que seed-villes.ts. Sans elle, le script tourne quand meme, en
   lecture, et depose son releve dans un fichier. */

async function identifiantDeVille(slug: string): Promise<string | null> {
  const cle = process.env['VITE_SUPABASE_ANON_KEY'] ?? CLE_SERVICE;
  const r = await fetch(`${URL_BASE}/rest/v1/villes?slug=eq.${slug}&select=id`, {
    headers: { apikey: cle, Authorization: `Bearer ${cle}` },
  });
  if (!r.ok) return null;
  const lignes = (await r.json()) as Array<{ id: string }>;
  return lignes[0]?.id ?? null;
}

async function verser(villeId: string, fiches: readonly Fiche[]): Promise<number> {
  const lignes = fiches.map((f) => ({
    ville_id: villeId,
    titre: f.titre,
    debut: f.debut,
    lieu: f.lieu,
    artistes: f.artistes,
    genres: f.genres,
    lien: f.lien,
    affiche: f.affiche,
    source: 'shotgun',
    source_ref: f.ref,
    publiee: true,
  }));

  const r = await fetch(`${URL_BASE}/rest/v1/soirees_manuelles?on_conflict=source,source_ref`, {
    method: 'POST',
    headers: {
      apikey: CLE_SERVICE,
      Authorization: `Bearer ${CLE_SERVICE}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(lignes),
  });
  if (!r.ok) throw new Error(`ecriture refusee : ${r.status} ${await r.text()}`);
  return lignes.length;
}

/* ── Le parcours ──────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  const villes = DEMANDEES.length
    ? VILLES.filter((v) => DEMANDEES.includes(v.shotgun))
    : VILLES;
  if (villes.length === 0) throw new Error('Aucune ville reconnue.');

  let nav: Browser | null = null;
  const releve: Record<string, Fiche[]> = {};

  try {
    nav = await chromium.launch({ channel: 'chrome', headless: true });
    const contexte = await nav.newContext({ locale: 'fr-FR', timezoneId: 'Europe/Paris' });
    const page = await contexte.newPage();

    for (const ville of villes) {
      console.log(`\n${ville.shotgun.toUpperCase()}`);
      const cartes = await listerLaVille(page, ville.shotgun);
      console.log(`  ${cartes.size} fiches à lire`);

      const fiches: Fiche[] = [];
      let n = 0;
      for (const [ref, genres] of cartes) {
        n += 1;
        try {
          const f = await lireLaFiche(page, ref, genres);
          if (f) fiches.push(f);
          else console.log(`  ${n}/${cartes.size} ${ref} : pas de JSON-LD, ignorée`);
        } catch (e) {
          console.log(`  ${n}/${cartes.size} ${ref} : ${(e as Error).message}`);
        }
        if (n % 20 === 0) console.log(`  ${n}/${cartes.size} lues`);
        await dormir(PAUSE);
      }
      releve[ville.sonaa] = fiches;
      console.log(`  ${fiches.length} soirées retenues`);
    }
  } finally {
    await nav?.close();
  }

  const total = Object.values(releve).reduce((s, f) => s + f.length, 0);

  if (lire || !CLE_SERVICE) {
    const chemin = 'scripts/donnees/shotgun-releve.json';
    writeFileSync(chemin, JSON.stringify(releve, null, 2), 'utf8');
    console.log(`\n${total} soirées écrites dans ${chemin}.`);
    if (!CLE_SERVICE && !lire) {
      console.log(
        'Rien versé en base : posez SUPABASE_SERVICE_ROLE_KEY dans l’environnement pour écrire.'
      );
    }
    return;
  }

  for (const [slug, fiches] of Object.entries(releve)) {
    if (fiches.length === 0) continue;
    const id = await identifiantDeVille(slug);
    if (!id) {
      console.log(`${slug} : ville absente de la table, rien versé.`);
      continue;
    }
    const n = await verser(id, fiches);
    console.log(`${slug} : ${n} soirées versées.`);
  }
}

/* ON NE LANCE UN NAVIGATEUR QUE SI CE FICHIER EST LE PROGRAMME.
   Defaut attrape en ecrivant le test : le test importe `stylesDeLaCarte`, ce
   qui evalue le module, ce qui appelait `main()`, ce qui ouvrait Chrome et
   partait moissonner Shotgun pendant une passe de `npm test`. Un module qui
   agit a l'import n'est pas un module, c'est un piege. */
const pointDentree = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (pointDentree === import.meta.url) {
  main().catch((e: unknown) => {
    console.error((e as Error).message);
    process.exit(1);
  });
}
