/* L'IMAGE DE PARTAGE DES PAGES QUI N'EN ONT PAS.

   Mika, le 31 octobre 2026, devant l'apercu Facebook de /soirees/montreal-ca/ :
   « l'image est sacrement pourrie ». La page n'avait pas d'og:image ; Facebook
   prenait la premiere image du corps, le logotype blanc, et le posait sur un
   fond gris clair.

   Chaque page sans image recoit donc une carte de 1200 sur 630 dans le theme
   du site : fond brun presque noir, lueur ambre, Inter, un grand titre (la
   ville), une phrase, et la grille de pas d'un motif de rythme dans les cinq
   teintes de l'outil. Rien qui date : Facebook garde l'image en cache des
   semaines, une carte qui dirait « 87 soirees » ou « vendredi » mentirait
   vite.

   LES POLICES SONT DANS LE DEPOT (scripts/donnees/polices, licence OFL) : la
   machine de deploiement n'a pas Inter, et sharp ne lit pas le woff2 du site.
   Si le texte ne se rend pas, la fonction renvoie null et la page garde
   l'image de repli. */

import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import type { Motif } from '../../src/lib/rythmes.ts';

export const TAILLE_CARTE = [1200, 630] as const;

const POLICES = fileURLToPath(new URL('../donnees/polices/', import.meta.url));
const GRAS = { fichier: join(POLICES, 'Inter_28pt-Bold.ttf'), nom: 'Inter 28pt Bold' };
const MOYEN = { fichier: join(POLICES, 'Inter_18pt-Medium.ttf'), nom: 'Inter 18pt Medium' };

const FOND = '#0a0704';
const CREME = '#efe7d8';
const AMBRE = '#e9a23b';
const TEINTES = ['#e9a23b', '#7dc383', '#e2683c', '#e8cf8a', '#a37b55'] as const;
const MARGE = 72;

const echapper = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Un bloc de texte rendu en PNG transparent, et sa taille. */
async function texte(
  contenu: string,
  police: { fichier: string; nom: string },
  taille: number,
  couleur: string,
  opacite = 100,
  espacement = 0
): Promise<{ data: Buffer; largeur: number; hauteur: number }> {
  const balise = `<span foreground="${couleur}" fgalpha="${opacite}%"${espacement ? ` letter_spacing="${espacement * 1024}"` : ''}>${echapper(contenu)}</span>`;
  const { data, info } = await sharp({
    text: { text: balise, font: `${police.nom} ${taille}`, fontfile: police.fichier, rgba: true, dpi: 72 },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { data, largeur: info.width, hauteur: info.height };
}

/** Le titre au plus grand qui tienne sur la largeur utile. */
async function titreAjuste(contenu: string): Promise<{ data: Buffer; largeur: number; hauteur: number }> {
  const utile = TAILLE_CARTE[0] - 2 * MARGE;
  let taille = 112;
  let rendu = await texte(contenu, GRAS, taille, CREME);
  while (rendu.largeur > utile && taille > 48) {
    taille = Math.max(48, Math.floor((taille * utile) / rendu.largeur));
    rendu = await texte(contenu, GRAS, taille, CREME);
  }
  return rendu;
}

/** Le fond et la grille de pas, en SVG : aucune lettre, donc aucune police. */
function fondEtGrille(motif: Motif | undefined, haut: number, bas: number): string {
  const [l, ht] = TAILLE_CARTE;
  const pistes = (motif?.pistes ?? []).slice(0, 5);
  const n = motif?.pas ?? 16;
  const ecart = n > 16 ? 4 : 8;
  const largeurCase = (l - 2 * MARGE - (n - 1) * ecart) / n;
  const ecartLigne = 10;
  const hauteurCase = pistes.length ? Math.min(30, (bas - haut - (pistes.length - 1) * ecartLigne) / pistes.length) : 0;
  const parTemps = n === 12 ? 3 : 4;
  /* Moins de cinq pistes : la grille se centre dans sa bande au lieu de
     laisser un trou en bas. */
  const decalage = (bas - haut - (pistes.length * hauteurCase + Math.max(0, pistes.length - 1) * ecartLigne)) / 2;
  const cases: string[] = [];
  pistes.forEach((p, ligne) => {
    const y = haut + decalage + ligne * (hauteurCase + ecartLigne);
    const teinte = TEINTES[ligne % TEINTES.length] ?? AMBRE;
    for (let i = 0; i < n; i++) {
      const x = MARGE + i * (largeurCase + ecart);
      const v = p.pas[i] ?? 0;
      if (v === 0) {
        const temps = i % parTemps === 0;
        cases.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${largeurCase.toFixed(1)}" height="${hauteurCase.toFixed(1)}" rx="4" fill="${CREME}" fill-opacity="${temps ? 0.09 : 0.05}"/>`);
      } else {
        cases.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${largeurCase.toFixed(1)}" height="${hauteurCase.toFixed(1)}" rx="4" fill="${teinte}" fill-opacity="${v === 2 ? 1 : 0.45}"/>`);
      }
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${l}" height="${ht}">
  <defs>
    <radialGradient id="lueur" cx="${MARGE + 160}" cy="40" r="760" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${AMBRE}" stop-opacity="0.20"/>
      <stop offset="0.45" stop-color="${AMBRE}" stop-opacity="0.06"/>
      <stop offset="1" stop-color="${AMBRE}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bas" cx="${l - 120}" cy="${ht}" r="520" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${AMBRE}" stop-opacity="0.07"/>
      <stop offset="1" stop-color="${AMBRE}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${l}" height="${ht}" fill="${FOND}"/>
  <rect width="${l}" height="${ht}" fill="url(#lueur)"/>
  <rect width="${l}" height="${ht}" fill="url(#bas)"/>
  ${cases.join('\n  ')}
</svg>`;
}

export interface Carte {
  /** Le grand titre : une ville, ou SONAA. */
  readonly titre: string;
  /** Une phrase sous le titre. */
  readonly phrase: string;
  /** Le motif dont la grille est dessinee, et son nom pour la ligne du bas. */
  readonly motif?: Motif | undefined;
  readonly nomDuMotif?: string | undefined;
}

/** Ecrit la carte sous <dist>/og/<dossier>/ et renvoie son adresse publique,
    ou null si elle ne se fabrique pas. Le nom porte une empreinte du
    contenu : une carte changee change d'adresse, et Facebook ne ressert pas
    l'ancienne de son cache. */
export async function fabriquerCarte(carte: Carte, dist: string, origine: string, dossier: string, cle: string): Promise<string | null> {
  try {
    const [l, ht] = TAILLE_CARTE;
    const titre = await titreAjuste(carte.titre);
    const phrase = await texte(carte.phrase, MOYEN, 36, CREME, 66);
    const signature = await texte('sonaa.ca', GRAS, 30, AMBRE);
    const mention = carte.nomDuMotif && carte.motif ? await texte(`${carte.nomDuMotif.toUpperCase()}  ·  ${carte.motif.bpm} BPM`, MOYEN, 20, CREME, 45, 2) : null;
    /* La ligne du bas ne doit pas toucher la signature : trop longue, elle part. */
    const nomDuMotif = mention && mention.largeur <= l - 2 * MARGE - signature.largeur - 48 ? mention : null;

    const hautTitre = 70;
    const hautPhrase = hautTitre + titre.hauteur + 20;
    const hautGrille = Math.max(310, hautPhrase + phrase.hauteur + 56);
    const basGrille = 512;
    const ligneDuBas = 560;

    const fond = Buffer.from(fondEtGrille(carte.motif, hautGrille, basGrille));
    const nom = `${cle}-${createHash('sha1').update(JSON.stringify([carte.titre, carte.phrase, carte.nomDuMotif, carte.motif?.pistes, 1])).digest('hex').slice(0, 8)}.jpg`;
    mkdirSync(join(dist, 'og', dossier), { recursive: true });
    await sharp(fond)
      .composite([
        { input: titre.data, top: hautTitre, left: MARGE - 4 },
        { input: phrase.data, top: hautPhrase, left: MARGE },
        { input: signature.data, top: ligneDuBas, left: MARGE },
        ...(nomDuMotif ? [{ input: nomDuMotif.data, top: ligneDuBas + Math.round((signature.hauteur - nomDuMotif.hauteur) / 2), left: l - MARGE - nomDuMotif.largeur }] : []),
      ])
      .flatten({ background: FOND })
      .resize(l, ht)
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(join(dist, 'og', dossier, nom));
    return `${origine}/og/${dossier}/${nom}`;
  } catch {
    return null;
  }
}
