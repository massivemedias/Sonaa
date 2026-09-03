/* LE PEUPLEMENT DE LA TABLE DES VILLES.
 *
 * Usage : npm run seed:villes            (ecrit)
 *         npm run seed:villes -- --lire  (montre ce qui serait ecrit)
 *
 * ═══ IDEMPOTENT, ET CE N'EST PAS UN DETAIL ═══
 *
 * Il se relance autant de fois qu'on veut : chaque ville est ecrite par son
 * `slug`, en `upsert`. Ajouter une ville revient a l'ajouter dans
 * scripts/donnees/villes.json et a relancer. Rien n'est efface : une ville
 * retiree du fichier reste en base, parce que des comptes peuvent l'avoir
 * choisie et des liens la nommer. Pour la retirer de la recherche, on passe
 * `is_active` a false, on ne la supprime pas.
 *
 * Un script de peuplement qui n'est pas idempotent finit par etre lance une
 * fois puis jamais, et le fichier de donnees derive de la base sans que
 * personne le sache. C'est arrive dans ce depot avec refaire-machines.ts, qui
 * relisait sa propre sortie.
 *
 * ═══ D'OU VIENNENT LES DONNEES ═══
 *
 * Population et coordonnees : Wikidata, par identifiant Q, releve du
 * 3 septembre 2026. Le Q est conserve dans la table pour pouvoir rafraichir.
 * Fuseau IANA : ecrit a la main, ce sont vingt et une valeurs qu'on connait
 * et que Wikidata rend de facon inegale.
 *
 * DEUX IDENTIFIANTS ETAIENT FAUX au premier jet, et aucun ne l'aurait dit :
 * Calgary pointait sur La Haye, Halifax sur un temple mormon. Le controle qui
 * les a trouves est ci-dessous, et il tourne a chaque peuplement : une ville
 * dont les coordonnees tombent hors des bornes de son pays arrete tout.
 *
 * ═══ LA CLE DE SERVICE ═══
 *
 * La table est en lecture publique et en ecriture pour personne. Ce script
 * ecrit donc avec SUPABASE_SERVICE_ROLE_KEY, qui n'est PAS dans .env et ne
 * doit pas y etre : Mika la colle dans l'environnement au moment de lancer,
 * et elle disparait avec le terminal.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

interface Ville {
  slug: string;
  name: string;
  name_ascii: string;
  admin_region: string | null;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population: number | null;
  ra_area_id: number | null;
  wikidata: string | null;
}

const LIRE_SEULEMENT = process.argv.includes('--lire');

const villes = JSON.parse(
  readFileSync(new URL('./donnees/villes.json', import.meta.url), 'utf8')
) as Ville[];

/* ── Le controle qui a trouve La Haye ──────────────────────────────────────
   Boite englobante grossiere de chaque pays. Elle ne verifie pas que la
   ville est au bon endroit, seulement qu'elle est dans le bon pays, ce qui
   suffit a attraper un identifiant Wikidata qui designe autre chose. */
const BORNES: Record<string, [number, number, number, number]> = {
  CA: [41, 84, -141, -52],
  US: [24, 72, -180, -66],
  MX: [14, 33, -118, -86],
  DE: [47, 55, 5, 16],
  GB: [49, 61, -8, 2],
  FR: [41, 51, -5, 10],
  NL: [50, 54, 3, 8],
  ES: [35, 44, -19, 5],
  JP: [24, 46, 122, 154],
  AU: [-44, -9, 112, 154],
  BR: [-34, 6, -74, -34],
};

const plaintes: string[] = [];
const slugs = new Set<string>();

for (const v of villes) {
  const b = BORNES[v.country_code];
  if (!b) {
    plaintes.push(`${v.name} : pays ${v.country_code} sans bornes connues, ajouter sa boite`);
    continue;
  }
  if (v.latitude < b[0] || v.latitude > b[1] || v.longitude < b[2] || v.longitude > b[3]) {
    plaintes.push(
      `${v.name} (${v.wikidata}) : ${v.latitude}, ${v.longitude} tombe hors de ${v.country_code}. ` +
        "Identifiant Wikidata probablement faux, il designe autre chose."
    );
  }
  if (slugs.has(v.slug)) plaintes.push(`${v.slug} : slug en double`);
  slugs.add(v.slug);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.slug)) {
    plaintes.push(`${v.slug} : un slug s'ecrit en minuscules, chiffres et traits d'union`);
  }
  /* Le fuseau doit ressembler a un fuseau IANA. On ne peut pas verifier qu'il
     existe sans base de fuseaux, mais Intl le sait. */
  try {
    new Intl.DateTimeFormat('fr-CA', { timeZone: v.timezone }).format(new Date());
  } catch {
    plaintes.push(`${v.name} : fuseau « ${v.timezone} » inconnu du navigateur`);
  }
}

if (plaintes.length > 0) {
  console.error(`PEUPLEMENT REFUSE : ${plaintes.length} probleme(s).\n`);
  for (const p of plaintes) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`${villes.length} villes verifiees, coordonnees dans les bornes de leur pays.`);

if (LIRE_SEULEMENT) {
  for (const v of villes) {
    console.log(
      `  ${v.slug.padEnd(16)} ${v.name.padEnd(13)} ${v.country_code}  ` +
        `RA ${String(v.ra_area_id ?? '-').padStart(4)}  ${v.timezone}`
    );
  }
  console.log('\n--lire : rien n a ete ecrit.');
  process.exit(0);
}

const url = process.env['VITE_SUPABASE_URL'] ?? '';
const service = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
if (!url || !service) {
  console.error(
    "VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont necessaires pour ecrire.\n" +
      "La table est en lecture publique et en ecriture pour personne : la cle\n" +
      "anonyme ne peut rien y faire, c'est voulu.\n\n" +
      '  SUPABASE_SERVICE_ROLE_KEY=... npm run seed:villes\n\n' +
      'Pour voir ce qui serait ecrit sans cle : npm run seed:villes -- --lire'
  );
  process.exit(1);
}

const sb = createClient(url, service, { auth: { persistSession: false } });
const { error } = await sb.from('villes').upsert(villes, { onConflict: 'slug' });
if (error) {
  console.error(`Ecriture refusee : ${error.message}`);
  process.exit(1);
}

const { count } = await sb.from('villes').select('*', { count: 'exact', head: true });
console.log(`Ecrit. La table contient ${count ?? '?'} villes.`);
