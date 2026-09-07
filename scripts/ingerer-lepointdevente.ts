/* L'ADAPTATEUR LEPOINTDEVENTE : par mot-cle, parce qu'il n'y a pas mieux.
 *
 * Usage : npm run ingerer:lepointdevente -- --lire   (montre, n'ecrit rien)
 *         SUPABASE_SERVICE_ROLE_KEY=... npm run ingerer:lepointdevente
 *
 * ═══ CE QUE CETTE SOURCE EST, MESURE LE 7 SEPTEMBRE 2026 ═══
 *
 * Lepointdevente est la billetterie generaliste du Quebec : comedie, sport,
 * hommages a Ginette Reno, arenas de banlieue, et parfois une soiree
 * electronique. Sa liste par defaut fait 495 fiches, toute la province, tous
 * les spectacles. Son parametre de ville ne fait rien : Montreal et Longueuil
 * rendent les memes 57 fiches. Ses fiches n'ont pas de JSON-LD.
 *
 * Sa recherche par mot, elle, filtre vraiment pour CERTAINS mots : « techno »
 * 48 fiches, « dj » 54, « rave » 22, « house » 24. Pour d'autres, « electro »
 * avec accent, « drum and bass », « club », elle rend la liste entiere : ces
 * mots-la ne filtrent pas et sont exclus d'ici, sinon ils ramenent tout.
 *
 * ═══ CE QU'ON PEUT LIRE D'UNE FICHE, ET CE QU'ON NE PEUT PAS ═══
 *
 * Le titre og:title est structure : « Organisateur presente Titre - date -
 * Lieu, Ville, QC - Lepointdevente.com ». La VILLE n'y est lisible que sur
 * une fiche sur cinq. La DATE est le plus souvent encodee dans la reference
 * elle-meme, « Y7R260923001 » vaut 2026-09-23 ; sinon on la lit dans le
 * titre. L'HEURE n'a pas de balise : on prend un bloc « 18h00 - 21h00 »
 * quand il existe, sinon la premiere heure du corps de page, et on le DIT
 * dans la note de la soiree, parce que c'est une lecture, pas une donnee.
 *
 * ═══ GRAND MONTREAL, ET RIEN D'AUTRE ═══
 *
 * On ne garde que les fiches dont la ville se lit ET est du Grand Montreal.
 * Une fiche sans ville est ecartee : dans l'echantillon, quatre sur cinq
 * n'en ont pas, et celles qui en ont vont de Moncton a Kamouraska. Garder
 * l'inconnu reviendrait a verser la province entiere dans le calendrier de
 * Montreal. Le rendement sera faible, et c'est le rendement reel.
 *
 * Mika a demande cet adaptateur en connaissant ces limites. Il existe pour
 * que le chiffre soit mesure, pas suppose.
 */

import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium, type Page } from 'playwright-core';

const VILLE_SONAA = 'montreal-ca';

/* LES SEULS MOTS QUI FILTRENT. Voir l'en-tete : les autres ramenent tout. */
const MOTS = ['techno', 'dj', 'rave', 'house', 'electro', 'disco', 'bass', 'after'];

/* Le Grand Montreal, tel que les fiches l'ecrivent. */
const GRAND_MONTREAL =
  /^(montr[ée]al|laval|longueuil|brossard|saint-lambert|verdun|lasalle|terrebonne|repentigny|boucherville|pointe-claire|dorval|saint-l[ée]onard|anjou|montr[ée]al-nord|lachine|outremont|westmount|mont-royal|c[ôo]te-saint-luc|kirkland|vaudreuil-dorion|blainville|sainte-th[ée]r[èe]se|mascouche|ch[âa]teauguay|saint-j[ée]r[ôo]me)$/i;

interface Fiche {
  readonly ref: string;
  readonly lien: string;
  readonly titre: string;
  readonly debut: string;
  readonly lieu: string | null;
  readonly adresse: string | null;
  readonly affiche: string | null;
  readonly description: string | null;
  readonly organisateur: string | null;
  readonly note: string | null;
}

const args = process.argv.slice(2);
const lire = args.includes('--lire');
const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/* ── La consentement, avant tout ──────────────────────────────────────── */

/** LA FENETRE DE CONSENTEMENT INTERCEPTE TOUT. Trois sondes avaient rendu
    des resultats instables, zero ou quarante selon l'essai, avant qu'on
    comprenne qu'un `#modal-background` avalait les clics et bloquait le
    rendu. On l'accepte comme un humain, et la page devient stable. */
async function accepter(page: Page): Promise<void> {
  await page.goto('https://lepointdevente.com/', { waitUntil: 'networkidle', timeout: 50_000 });
  const b = await page.$('button:has-text("Tout accepter")');
  if (b) await b.click().catch(() => undefined);
  await page.waitForTimeout(600);
}

/* ── Etape 1 : les references, par mot ────────────────────────────────── */

async function decouvrir(page: Page): Promise<Set<string>> {
  const refs = new Set<string>();
  for (const mot of MOTS) {
    let total = 0;
    for (let p = 1; p <= 6; p += 1) {
      await page.goto(`https://lepointdevente.com/?q=${encodeURIComponent(mot)}&page=${p}`, {
        waitUntil: 'networkidle',
        timeout: 50_000,
      });
      await page.waitForTimeout(1000);
      const lues = await page.evaluate(() =>
        [...new Set(
          [...document.querySelectorAll('a[href*="/billets/"]')]
            .map((a) => (a.getAttribute('href') ?? '').split('/billets/')[1]?.split(/[?#]/)[0] ?? '')
            .filter(Boolean)
        )]
      );
      /* UN MOT QUI RAMENE LA LISTE ENTIERE NE FILTRE PAS : on le sait a la
         premiere page, quand elle rend cinquante-sept fiches, le chiffre de
         la liste par defaut. On l'abandonne plutot que de tout ingerer. */
      if (p === 1 && lues.length >= 55) {
        console.log(`  ${mot.padEnd(10)} ne filtre pas (${lues.length} fiches), ignoré`);
        break;
      }
      let neuves = 0;
      for (const r of lues) if (!refs.has(r)) { refs.add(r); neuves += 1; }
      total += lues.length;
      if (lues.length === 0 || neuves === 0) break;
    }
    if (total > 0) console.log(`  ${mot.padEnd(10)} ${total} fiches vues`);
  }
  return refs;
}

/* ── Etape 2 : lire une fiche ─────────────────────────────────────────── */

const MOIS: Record<string, number> = {
  janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7,
  août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12,
};

/** La date, d'abord dans la reference (« Y7R260923001 » vaut 2026-09-23),
    sinon dans le titre (« 23 septembre 2026 »). Null quand ni l'un ni l'autre
    ne la porte : une fiche sans date n'a pas sa place dans un calendrier. */
export function dateDe(ref: string, titre: string): string | null {
  const r = /^[a-z0-9]{3}(\d{2})(\d{2})(\d{2})\d{3}$/i.exec(ref);
  if (r) return `20${r[1]}-${r[2]}-${r[3]}`;
  const t = /(\d{1,2})(?:er)?\s+([\p{L}]+)\s+(20\d\d)/u.exec(titre);
  if (t) {
    const m = MOIS[(t[2] ?? '').toLowerCase()];
    if (m) return `${t[3]}-${String(m).padStart(2, '0')}-${String(t[1]).padStart(2, '0')}`;
  }
  return null;
}

/** Le titre og:title, decoupe : organisateur, titre, lieu, ville. La
    forme est « Organisateur présente Titre - date - Lieu, Ville, QC - ... »
    et chaque morceau peut manquer. */
export function decouperTitre(og: string): {
  organisateur: string | null; titre: string; lieu: string | null; ville: string | null;
} {
  const sansSite = og.replace(/\s*-\s*Lepointdevente\.com\s*$/i, '').trim();
  const morceaux = sansSite.split(/\s+-\s+/);
  const tete = morceaux[0] ?? sansSite;
  const pres = /^(.+?)\s+pr[ée]sente\s+(.+)$/i.exec(tete);
  const organisateur = pres ? pres[1]!.trim() : null;
  const titre = (pres ? pres[2]! : tete).trim();
  const fin = morceaux.length >= 3 ? morceaux[morceaux.length - 1]! : '';
  const l = /^(.+?),\s*([^,]+?),\s*(QC|ON|NB|AB|BC|MB|SK|NS)$/i.exec(fin.trim());
  return { organisateur, titre, lieu: l ? l[1]!.trim() : null, ville: l ? l[2]!.trim() : null };
}

async function lireLaFiche(page: Page, ref: string): Promise<Fiche | null> {
  const lien = `https://lepointdevente.com/billets/${ref}`;
  await page.goto(lien, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  await page.waitForTimeout(900);
  /* AUCUNE FONCTION NOMMEE DANS CE CORPS, ET C'EST UNE LECON. tsx enrobe
     toute declaration `const f = () => ...` d'un `__name(f, "f")` qui
     n'existe pas dans la page : trois cent deux fiches decouvertes, zero lue,
     « __name is not defined » sur chacune. L'adaptateur Shotgun n'y tombait
     pas parce que ses corps ne contenaient que des fleches anonymes passees
     directement. Ici, tout est inline. */
  const brut = await page.evaluate(() => ({
    og: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '',
    image: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
    desc: document.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? '',
    /* LE DEMI-CADRATIN EST ECRIT EN SEQUENCE D'ECHAPPEMENT, a dessein : c'est
       le caractere que le site imprime entre deux heures, et ce depot n'en
       ecrit aucun en clair, meme dans une expression reguliere. */
    bloc:
      [...document.querySelectorAll('div,span,p,li,td')]
        .map((e) => (e.textContent ?? '').trim())
        .find((t) => /^\d{1,2}\s?h\s?\d{2}(\s?[\u2013-]\s?\d{1,2}\s?h\s?\d{2})?$/.test(t)) ?? null,
    corps: ((document.body.innerText ?? '').match(/\b([01]?\d|2[0-3])\s?h\s?[0-5]\d\b/) ?? [null])[0],
  }));
  if (!brut.og) return null;
  const d = decouperTitre(brut.og);
  if (!d.ville || !GRAND_MONTREAL.test(d.ville)) return null;
  const jour = dateDe(ref, brut.og);
  if (!jour) return null;

  const heureBrute = brut.bloc ?? brut.corps;
  const h = heureBrute ? /(\d{1,2})\s?h\s?(\d{2})/.exec(heureBrute) : null;
  const hh = h ? String(h[1]).padStart(2, '0') : '00';
  const mm = h ? h[2] : '00';
  /* L'HEURE EST UNE LECTURE, ET LA NOTE LE DIT. Sans balise d'heure, on
     prend ce qu'on trouve ; a defaut, minuit, et la note l'avoue. */
  const note = h
    ? brut.bloc ? null : 'heure lue dans le texte de la fiche'
    : 'heure inconnue, minuit par defaut';

  return {
    ref, lien, titre: d.titre,
    debut: `${jour}T${hh}:${mm}:00-04:00`,
    lieu: d.lieu, adresse: d.ville ? `${d.lieu ?? ''}, ${d.ville}, QC`.replace(/^, /, '') : null,
    affiche: brut.image || null, description: brut.desc || null,
    organisateur: d.organisateur, note,
  };
}

/* ── L'ecriture ───────────────────────────────────────────────────────── */

const URL_BASE = process.env['VITE_SUPABASE_URL'] ?? 'https://pqgapyfqkjzvwkulxnhv.supabase.co';
const CLE_SERVICE = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

async function verser(fiches: readonly Fiche[]): Promise<number> {
  const cle = process.env['VITE_SUPABASE_ANON_KEY'] ?? CLE_SERVICE;
  const r0 = await fetch(`${URL_BASE}/rest/v1/villes?slug=eq.${VILLE_SONAA}&select=id`, {
    headers: { apikey: cle, Authorization: `Bearer ${cle}` },
  });
  const villeId = ((await r0.json()) as { id: string }[])[0]?.id;
  if (!villeId) throw new Error(`${VILLE_SONAA} absente de la table villes.`);
  const lignes = fiches.map((f) => ({
    ville_id: villeId, titre: f.titre, debut: f.debut, lieu: f.lieu, adresse: f.adresse, artistes: [], genres: [],
    lien: f.lien, affiche: f.affiche, description: f.description, organisateur: f.organisateur, note: f.note,
    source: 'lepointdevente', source_ref: f.ref, publiee: true,
  }));
  const r = await fetch(`${URL_BASE}/rest/v1/soirees_manuelles?on_conflict=source,source_ref`, {
    method: 'POST',
    headers: { apikey: CLE_SERVICE, Authorization: `Bearer ${CLE_SERVICE}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(lignes),
  });
  if (!r.ok) throw new Error(`ecriture refusee : ${r.status} ${await r.text()}`);
  return lignes.length;
}

/* ── Le parcours ──────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  const nav = await chromium.launch({ channel: 'chrome', headless: true });
  const releve: Fiche[] = [];
  let lues = 0;
  let horsMontreal = 0;
  try {
    const page = await nav.newContext({ locale: 'fr-CA', timezoneId: 'America/Toronto' }).then((c) => c.newPage());
    await accepter(page);
    console.log('MONTRÉAL, Lepointdevente, par mot-clé');
    const refs = await decouvrir(page);
    console.log(`  ${refs.size} fiches distinctes à lire\n`);
    for (const ref of refs) {
      lues += 1;
      try {
        const f = await lireLaFiche(page, ref);
        if (f) releve.push(f);
        else horsMontreal += 1;
      } catch (e) {
        console.log(`  ${ref} : ${(e as Error).message}`);
      }
      if (lues % 25 === 0) console.log(`  ${lues}/${refs.size} lues, ${releve.length} retenues`);
      await dormir(500);
    }
  } finally {
    await nav.close();
  }
  console.log(`\n  ${releve.length} soirées du Grand Montréal retenues, ${horsMontreal} écartées (ville absente ou hors Montréal)`);
  console.log(`  dont ${releve.filter((f) => f.note === null).length} avec une heure sûre`);

  if (lire || !CLE_SERVICE) {
    const chemin = 'scripts/donnees/lepointdevente-releve.json';
    writeFileSync(chemin, JSON.stringify({ fait: new Date().toISOString(), [VILLE_SONAA]: releve }, null, 2), 'utf8');
    console.log(`\n${releve.length} soirées écrites dans ${chemin}.`);
    return;
  }
  console.log(`\n${await verser(releve)} soirées versées.`);
}

const pointDentree = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (pointDentree === import.meta.url) {
  main().catch((e: unknown) => {
    console.error((e as Error).message);
    process.exit(1);
  });
}
