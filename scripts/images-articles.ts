/* RECOLTE DES ILLUSTRATIONS D'ARTICLE, sur Wikimedia Commons.

   MEME EXIGENCE QUE LES PHOTOS DE MACHINES, pour la meme raison : une image
   trouvee n'importe ou appartient a quelqu'un, et la publier reviendrait a la
   lui prendre. Commons publie la licence de chaque fichier dans une donnee
   structuree, donc on VERIFIE avant de telecharger et on rend credit apres.
   Toute licence non lisible fait refuser le fichier.

   CE QUI CHANGE PAR RAPPORT AUX MACHINES. Le garde des machines exige que le
   titre du fichier contienne le modele cherche, parce qu'une recherche
   « Roland S-330 » avait rendu une partition de Lully. Ce garde ne peut pas
   marcher ici : un article sur Detroit ne cherche pas un numero de modele
   mais une ville, une usine, une salle. La demande porte donc un TITRE DE
   FICHIER ATTENDU, ecrit a la main, et le script ne prend que celui-la. On ne
   laisse pas un moteur de recherche choisir ce qu'on va publier.

   Usage :
     npx tsx scripts/images-articles.ts --dry-run
     npx tsx scripts/images-articles.ts
*/

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SORTIE = fileURLToPath(new URL('../src/data/illustrations.json', import.meta.url));
const DOSSIER = fileURLToPath(new URL('../public/articles/', import.meta.url));
const DRY = process.argv.includes('--dry-run');

/* LA DEMANDE : une cle utilisee par le corpus, le titre EXACT du fichier chez
   Commons, et la legende francaise qui s'affichera sous l'image. */
const DEMANDES: { cle: string; fichier: string; legende: string }[] = [
  { cle: 'hacienda', fichier: 'File:The Hacienda Nightclub Manchester Floor Sign.jpg', legende: "L'Hacienda, Manchester" },
  { cle: 'packard-detroit', fichier: 'File:Abandoned Packard Automobile Factory Detroit 200.jpg', legende: "L'usine Packard abandonnee, Detroit" },
  { cle: 'detroit-skyline', fichier: 'File:Skyline of Detroit, Michigan from S 2014-12-07.jpg', legende: 'Detroit' },
  { cle: 'maxi-45', fichier: 'File:12in-Vinyl-LP-Record-Angle.jpg', legende: 'Un maxi 45 tours' },
  { cle: 'tb-303-panneau', fichier: 'File:Roland TB-303 Panel.jpg', legende: 'Le panneau de la TB-303' },
  { cle: 'schaeffer', fichier: 'File:Pierre Schaeffer (1960).jpg', legende: 'Pierre Schaeffer, 1960' },
  { cle: 'anjuna', fichier: 'File:Anjuna Beach 25012016.jpg', legende: 'La plage d\'Anjuna, Goa' },
  { cle: 'kraftwerk-1975', fichier: 'File:Kraftwerk 1975.jpg', legende: 'Kraftwerk, 1975' },
  { cle: 'sound-system', fichier: 'File:Metromedia sound system.jpg', legende: 'Un sound system' },
];

const LIBRES = [
  'cc0', 'public domain', 'cc by', 'cc by-sa', 'cc-by', 'cc-by-sa',
  'attribution', 'gfdl', 'fal', 'no restrictions',
];
const estLibre = (l: string): boolean => {
  const x = l.toLowerCase().trim();
  if (!x) return false;
  if (/fair use|non-?commercial|nc\b|nd\b|no derivat/i.test(x)) return false;
  return LIBRES.some((ok) => x.startsWith(ok));
};

interface Fiche {
  readonly legende: string;
  readonly fichier: string;
  readonly distant: string;
  readonly auteur: string;
  readonly licence: string;
  readonly source: string;
  readonly largeur: number;
  readonly hauteur: number;
}

const sansBalises = (s: string): string =>
  s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const AGENT = 'SonaaAtlas/1.0 (https://sonaa.ca; massivemedias@gmail.com)';

async function fiche(titre: string, legende: string): Promise<Fiche | null> {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json' +
    `&titles=${encodeURIComponent(titre)}` +
    '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1200';
  const r = await fetch(url, { headers: { 'User-Agent': AGENT } });
  if (!r.ok) return null;
  const d = (await r.json()) as {
    query?: { pages?: Record<string, {
      title?: string; missing?: string;
      imageinfo?: { thumburl?: string; url?: string; descriptionurl?: string;
        width?: number; height?: number;
        extmetadata?: Record<string, { value?: string }> }[];
    }> };
  };
  const p = Object.values(d.query?.pages ?? {})[0];
  /* UN FICHIER INTROUVABLE SE DIT. La premiere version rendait null en
     silence sur quatre demandes sur cinq, et le bilan « 5 refusees » ne
     distinguait pas un probleme de licence d'un titre mal orthographie. Deux
     causes qui appellent deux gestes opposes ne doivent pas rendre le meme
     message. */
  if (!p || p.missing !== undefined) {
    console.log(`  ABSENT  ${titre}  aucun fichier de ce nom chez Commons`);
    return null;
  }
  const ii = p.imageinfo?.[0];
  if (!ii) {
    console.log(`  VIDE    ${titre}  la page existe mais ne porte pas d'image`);
    return null;
  }
  const em = ii.extmetadata ?? {};
  const licence = sansBalises(em['LicenseShortName']?.value ?? '');
  if (!estLibre(licence)) {
    console.log(`  REFUSE  ${titre}  licence « ${licence || 'illisible'} »`);
    return null;
  }
  if (!/\.(jpe?g|png)$/i.test(p.title ?? '')) {
    console.log(`  REFUSE  ${titre}  ce n'est pas une photo`);
    return null;
  }
  const lien = ii.thumburl ?? ii.url;
  if (!lien) return null;
  return {
    legende,
    fichier: '',
    distant: lien,
    auteur: sansBalises(em['Artist']?.value ?? '') || 'auteur non indique',
    licence,
    source: ii.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title ?? '')}`,
    largeur: ii.width ?? 0,
    hauteur: ii.height ?? 0,
  };
}

const deja: Record<string, Fiche> = existsSync(SORTIE)
  ? (JSON.parse(readFileSync(SORTIE, 'utf8')) as Record<string, Fiche>)
  : {};

if (!DRY && !existsSync(DOSSIER)) mkdirSync(DOSSIER, { recursive: true });

let pris = 0;
let refuses = 0;
for (const d of DEMANDES) {
  if (deja[d.cle]) { console.log(`  deja la ${d.cle}`); continue; }
  const f = await fiche(d.fichier, d.legende);
  if (!f) { refuses += 1; continue; }
  const nom = `articles/${d.cle}.webp`;
  if (!DRY) {
    const brut = `${DOSSIER}${d.cle}.src`;
    const rep = await fetch(f.distant, { headers: { 'User-Agent': AGENT } });
    writeFileSync(brut, Buffer.from(await rep.arrayBuffer()));
    /* Recadre en 4/3, la forme que la mise en page reserve, et borne a
       720 px de large : une illustration d'article s'affiche a 240 px, tout
       ce qui depasse le double est du poids sans gain visible. */
    execFileSync('magick', [brut, '-resize', '720x540^', '-gravity', 'center',
      '-extent', '720x540', '-quality', '80', `${DOSSIER}${d.cle}.webp`]);
    execFileSync('rm', ['-f', brut]);
  }
  deja[d.cle] = { ...f, fichier: nom };
  pris += 1;
  console.log(`  ok      ${d.cle}  [${f.licence}] ${f.auteur.slice(0, 40)}`);
  await new Promise((r) => setTimeout(r, 400));
}

console.log(`\n${pris} prise(s), ${refuses} refusee(s) sur ${DEMANDES.length} demandee(s).`);
if (!DRY) {
  writeFileSync(SORTIE, `${JSON.stringify(deja, null, 1)}\n`);
  console.log(`Catalogue ecrit : src/data/illustrations.json`);
} else {
  console.log("--dry-run : rien n'a ete ecrit.");
}
