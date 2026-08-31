/* RECOLTE DES PHOTOS DE MACHINES, sur Wikimedia Commons.

   POURQUOI COMMONS ET PAS « N'IMPORTE OU ». Mika a dit « tu peux prendre des
   trucs de wikipedia ou n'importe ». La premiere moitie est possible, la
   seconde ne l'est pas : une photo trouvee sur un site quelconque appartient
   a quelqu'un, et la publier reviendrait a la lui prendre. Commons, lui,
   publie la licence de chaque fichier dans une donnee structuree. On peut
   donc VERIFIER avant de telecharger, et rendre credit apres.

   CE SCRIPT NE GARDE QUE LES LICENCES LIBRES et refuse tout le reste, y
   compris les fichiers dits d'usage equitable, qui n'autorisent pas la
   republication. Un fichier dont la licence n'est pas lisible est refuse
   aussi : on ne suppose jamais qu'une image est libre.

   L'ATTRIBUTION EST TELECHARGEE EN MEME TEMPS QUE L'IMAGE. Une photo sans
   son auteur est inutilisable, et l'auteur retrouve six mois plus tard n'est
   jamais le bon. Auteur, licence et adresse de la page source sont ecrits
   dans src/data/machines.json, a cote du fichier.

   Usage :
     npx tsx scripts/images-machines.ts --dry-run     voir sans rien ecrire
     npx tsx scripts/images-machines.ts               recolter
     npx tsx scripts/images-machines.ts --only=Roland TR-909
*/

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const SORTIE = fileURLToPath(new URL('../src/data/machines.json', import.meta.url));
const DOSSIER = fileURLToPath(new URL('../public/machines/', import.meta.url));

const DRY = process.argv.includes('--dry-run');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);

/* LES LICENCES ACCEPTEES, en clair. Toute autre valeur, et toute absence de
   valeur, fait refuser le fichier. */
const LIBRES = [
  'cc0', 'public domain', 'cc by', 'cc by-sa', 'cc-by', 'cc-by-sa',
  'cc by 2.0', 'cc by 3.0', 'cc by 4.0',
  'cc by-sa 2.0', 'cc by-sa 2.5', 'cc by-sa 3.0', 'cc by-sa 4.0'
];

const estLibre = (nom: string): boolean => {
  const n = nom.trim().toLowerCase();
  if (!n) return false;
  if (n.includes('fair use') || n.includes('non-free') || n.includes('nc')) return false;
  return LIBRES.some((l) => n.startsWith(l));
};

/* LE NOM CHERCHABLE. Le corpus ecrit « Roland TR-909 adoucie » ou « Roland
   Juno-60 en nappes » : le qualificatif dit comment la machine est employee
   dans ce genre, il n'appartient pas au nom du modele. On cherche le modele. */
const MARQUES =
  /^(Roland|Korg|Yamaha|Akai|Moog|Sequential|Oberheim|E-?mu|Ensoniq|Casio|Elektron|Access|Nord|Waldorf|Alesis|Linn(?:Drum)?|ARP|Buchla|Fairlight|Kurzweil|Novation|Clavia|Boss|Doepfer|Behringer|Eventide|Lexicon|Technics|Pioneer|Emulator|Mellotron|Hammond|Rhodes|Clavinet|Prophet|Minimoog|Synclavier|PPG|Solina|Jomox|Arturia|Amiga|Atari|Commodore|Fostex|Tascam|Revox|Neumann|Shure|MPC)\b/i;

function modele(brut: string): string | null {
  const s = brut.trim();
  if (!MARQUES.test(s)) return null;
  /* On garde la marque et le premier bloc qui ressemble a une reference :
     des chiffres, un tiret, ou un mot capitalise court. Le reste tombe. */
  /* Marque, puis le premier bloc qui ressemble a une reference de modele :
     des lettres collees a des chiffres, avec ou sans tiret. */
  const m = s.match(
    /^([A-Za-z-]+)\s+((?:[A-Za-z]{1,5}[-\s]?)?\d{1,4}[A-Za-z]{0,2}|[A-Z][A-Za-z]{2,9}[-\s]?\d{1,4}[A-Za-z]?)/
  );
  if (m) return `${m[1]} ${(m[2] as string).replace(/\s+/g, '-')}`;
  /* Les modeles dont le nom EST la marque : ils n'ont pas de reference. */
  const seul = s.match(
    /^(LinnDrum|Minimoog|Mellotron|Clavinet|Synclavier|Fairlight|Rhodes|Hammond|Solina|Emulator|Prophet)\b/i
  );
  if (seul) return seul[1] as string;
  /* Une marque seule, sans modele : on ne cherche pas, une photo de « Roland »
     ne dit rien. */
  return null;
}

interface Fiche {
  readonly machine: string;
  /** Chemin SERVI PAR LE SITE, jamais l'adresse chez Commons. */
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

async function chercher(nom: string): Promise<Fiche | null> {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json' +
    `&generator=search&gsrsearch=${encodeURIComponent(nom)}&gsrnamespace=6&gsrlimit=6` +
    '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1200';
  const r = await fetch(url, { headers: { 'User-Agent': AGENT } });
  if (!r.ok) return null;
  const d = (await r.json()) as {
    query?: { pages?: Record<string, {
      title?: string;
      imageinfo?: {
        thumburl?: string; url?: string; descriptionurl?: string;
        width?: number; height?: number;
        extmetadata?: Record<string, { value?: string }>;
      }[];
    }> };
  };
  const pages = Object.values(d.query?.pages ?? {});
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    const em = ii.extmetadata ?? {};
    const licence = sansBalises(em['LicenseShortName']?.value ?? '');
    if (!estLibre(licence)) continue;
    /* PAS DE VECTEURS NI DE FICHIERS EXOTIQUES : on veut une photo. */
    const titre = p.title ?? '';
    if (!/\.(jpe?g|png)$/i.test(titre)) continue;

    /* LE TITRE DOIT CONTENIR LE MODELE, et ce garde n'est pas theorique : la
       recherche « Roland S-330 » a rendu une partition de Jean-Baptiste
       Lully, avec une licence parfaitement libre et un auteur parfaitement
       credite. Une image fausse et bien attribuee reste une image fausse, et
       rien dans la licence ne l'aurait signale. */
    const propre = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const morceaux = nom.split(/\s+/).filter(Boolean);
    const titreOk = morceaux.every((mot) => propre(titre).includes(propre(mot)));
    if (!titreOk) continue;
    const lien = ii.thumburl ?? ii.url;
    if (!lien) continue;
    const auteur = sansBalises(em['Artist']?.value ?? '') || 'auteur non indique';
    return {
      machine: nom,
      fichier: '',
      distant: lien,
      auteur,
      licence,
      source: ii.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(titre)}`,
      largeur: ii.width ?? 0,
      hauteur: ii.height ?? 0
    };
  }
  return null;
}

/* --- Deroulement ---------------------------------------------------------- */

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as {
  genres: { label: string; machines?: string[] }[];
};

const voulus = new Map<string, number>();
for (const g of corpus.genres) {
  for (const brut of g.machines ?? []) {
    const m = modele(brut);
    if (m) voulus.set(m, (voulus.get(m) ?? 0) + 1);
  }
}

const liste = [...voulus.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([nom]) => nom)
  .filter((nom) => !only || nom.toLowerCase().includes(only.toLowerCase()));

console.log(`${liste.length} modele(s) a chercher.\n`);

const deja: Record<string, Fiche> = existsSync(SORTIE)
  ? (JSON.parse(readFileSync(SORTIE, 'utf8')) as Record<string, Fiche>)
  : {};

let trouves = 0;
/* DEUX COMPTEURS, ET NON UN SEUL. Le premier bilan disait « 20 sans image
   libre » alors que les vingt avaient ete refusees par le SERVEUR, pas par
   leur licence. Un bilan qui melange une absence de droit et une limite de
   debit fait chercher au mauvais endroit. */
let sansLicence = 0;
let echecReseau = 0;
const resultats: Record<string, Fiche> = { ...deja };

for (const nom of liste) {
  if (deja[nom]) {
    console.log(`  deja    ${nom}`);
    continue;
  }
  const f = await chercher(nom);
  if (!f) {
    console.log(`  aucune  ${nom}  (rien de libre, ou rien du tout)`);
    sansLicence += 1;
    continue;
  }

  /* L'IMAGE EST TELECHARGEE ET SERVIE PAR LE DEPOT. Pointer sur Commons
     depuis la page ferait un appel tiers a chaque affichage : c'est ce que
     le projet s'interdit pour les pochettes, et il n'y a aucune raison de
     l'accepter ici. Un lien distant casse aussi le jour ou le fichier est
     renomme la-bas, ce qui arrive. */
  const base = nom.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const cible = `${DOSSIER}${base}.webp`;
  if (!DRY) {
    if (!existsSync(DOSSIER)) mkdirSync(DOSSIER, { recursive: true });
    /* WIKIMEDIA LIMITE LE DEBIT, et repond 429 quand on insiste. On attend
       et on reessaie, en allongeant l'attente : renoncer au premier refus
       ferait passer un simple embouteillage pour une image introuvable. */
    let rep: Response | null = null;
    for (let essai = 0; essai < 4; essai += 1) {
      rep = await fetch(f.distant, { headers: { 'User-Agent': AGENT } });
      if (rep.ok) break;
      if (rep.status !== 429 && rep.status !== 503) break;
      await new Promise((r) => setTimeout(r, 2000 * (essai + 1)));
    }
    if (!rep || !rep.ok) {
      console.log(`  echec   ${nom}  (telechargement ${rep?.status ?? '?'})`);
      echecReseau += 1;
      continue;
    }
    const octets = Buffer.from(await rep.arrayBuffer());
    const brut = `${DOSSIER}${base}.tmp`;
    writeFileSync(brut, octets);
    /* 900 px de large suffisent : l'image est affichee dans une bande de
       page, jamais en plein ecran. */
    execFileSync('magick', [brut, '-resize', '900x900>', '-quality', '82', cible]);
    execFileSync('rm', [brut]);
  }

  const fiche: Fiche = { ...f, fichier: `machines/${base}.webp` };
  console.log(`  ok      ${nom}  [${f.licence}] ${f.auteur.slice(0, 36)}`);
  resultats[nom] = fiche;
  trouves += 1;
  /* Commons demande de ne pas marteler ses serveurs. La pause vaut pour la
     recherche ET pour le telechargement, qui passent par la meme maison. */
  await new Promise((r) => setTimeout(r, 1200));
}

console.log(
  `\n${trouves} recoltee(s), ${sansLicence} sans image libre, ` +
    `${echecReseau} refusee(s) par le serveur (a relancer, le script reprend ou il en est).`
);

if (DRY) {
  console.log("Essai a blanc : rien n'a ete ecrit.");
} else {
  if (!existsSync(DOSSIER)) mkdirSync(DOSSIER, { recursive: true });
  writeFileSync(SORTIE, JSON.stringify(resultats, null, 2) + '\n');
  console.log(`Ecrit dans src/data/machines.json (${Object.keys(resultats).length} entrees).`);
}
