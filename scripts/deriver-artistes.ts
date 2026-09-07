/* DU RELEVE BRUT AU FICHIER QUE LE SITE EMBARQUE.
 *
 * Usage : npm run deriver:artistes
 *
 * ═══ CE QUI PART EN LIGNE, ET CE QUI RESTE A TERRE ═══
 *
 * Le releve pese deux cent mille signes et grossit a chaque moisson. Le site
 * n'en a besoin que d'une part : POUR CHAQUE STYLE, SES MEILLEURS ARTISTES.
 * C'est la seule question a laquelle un fichier livre repond mieux qu'une
 * requete : elle se pose sur chacune des 219 fiches, la reponse ne change
 * qu'a la moisson suivante, et elle doit s'afficher sans attendre le reseau.
 *
 * La question inverse, « quels sont les styles de cet artiste », ne part PAS
 * en ligne. Elle se pose sur un nom quelconque, y compris un nom que la
 * moisson n'a jamais vu, et elle se resout en 250 millisecondes chez Discogs.
 * Embarquer dix mille artistes pour rater quand meme Lealtica serait le pire
 * des deux mondes : lourd et incomplet.
 *
 * ═══ LE CLASSEMENT VIENT DE LAST.FM, LA CONFIRMATION DE DISCOGS ═══
 *
 * Last.fm ordonne par ecoutes, ce qui est le seul sens acceptable de
 * « meilleurs » ici : ce sont les artistes qu'on rencontre le plus dans ce
 * style. Mais ses etiquettes sont posees par le public, et trois personnes
 * suffisent a taguer un artiste « techno » par erreur.
 *
 * Discogs sert donc de second avis : un artiste garde sa place si ses disques
 * le rangent dans ce genre ou dans sa famille. CE N'EST PAS UN FILTRE
 * ELIMINATOIRE tant que la moisson est en cours, sinon les artistes pas
 * encore demandes disparaitraient sans raison. Ils sont marques, et le rang
 * confirme passe devant.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { genresDuCorpus } from './lib/genres-du-corpus.ts';
import { ranger, vocabulaire } from './lib/correspondance-styles.ts';

const RELEVE = fileURLToPath(new URL('./donnees/artistes.json', import.meta.url));
const SORTIE = fileURLToPath(new URL('../src/data/artistes.json', import.meta.url));
/* L'INDEX INVERSE PART DANS SON PROPRE FICHIER, ET C'EST TOUT LE POINT.
   638 ko bruts, 134 une fois compresses : c'est acceptable pour qui cherche
   un artiste, inacceptable pour qui vient lire une fiche de genre. Le
   separer permet de ne le charger qu'au premier usage de la recherche. */
const INDEX = fileURLToPath(new URL('../src/data/artistes-index.json', import.meta.url));

/** Combien d'artistes par style. Trente, comme demande : c'est ce qui tient
    sur un ecran sans devenir un annuaire, et au-dela le classement de Last.fm
    devient du bruit de longue traine. */
const PAR_STYLE = 30;

interface Releve {
  parStyle: Record<string, string[]>;
  parArtiste: Record<string, Record<string, number>>;
}

interface Livre {
  /** Quand la moisson a ete faite, pour que la page puisse le dire. */
  readonly fait: string;
  /** genre id vers les noms, dans l'ordre du classement. */
  readonly parGenre: Record<string, string[]>;
}

function main(): void {
  if (!existsSync(RELEVE)) {
    throw new Error('Aucun relevé. Lancez d’abord npm run moissonner:artistes.');
  }
  const releve = JSON.parse(readFileSync(RELEVE, 'utf8')) as Releve;
  const genres = genresDuCorpus();

  /* Les familles, reconstruites depuis les genres : chaque genre porte la
     sienne, et c'est la seule source du lien. */
  const familles = [...new Set(genres.map((g) => g.family))].map((id) => ({ id, label: id }));
  const voc = vocabulaire(genres, familles);

  const familleDe = new Map(genres.map((g) => [g.id, g.family]));

  /** Ce que Discogs dit d'un artiste, traduit dans notre vocabulaire. */
  const chezNous = (nom: string): { genres: Set<string>; familles: Set<string> } => {
    const brut = releve.parArtiste[nom];
    const g = new Set<string>();
    const f = new Set<string>();
    if (!brut) return { genres: g, familles: f };
    for (const style of Object.keys(brut)) {
      const cible = ranger(style, voc);
      if (!cible) continue;
      if (cible.sorte === 'genre') {
        g.add(cible.id);
        const fam = familleDe.get(cible.id);
        if (fam) f.add(fam);
      } else f.add(cible.id);
    }
    return { genres: g, familles: f };
  };

  const parGenre: Record<string, string[]> = {};
  let confirmes = 0;
  let inconnus = 0;

  for (const g of genres) {
    const classement = releve.parStyle[g.id] ?? [];
    const surs: string[] = [];
    const autres: string[] = [];

    for (const nom of classement) {
      const vu = chezNous(nom);
      if (vu.genres.has(g.id) || vu.familles.has(g.family)) surs.push(nom);
      else if (!releve.parArtiste[nom]) autres.push(nom);
      /* Un artiste que Discogs connait ET qui ne joue pas ce genre est
         ecarte : c'est exactement le tag pose par erreur qu'on cherchait. */
    }

    confirmes += surs.length;
    inconnus += autres.length;

    /* LES CONFIRMES D'ABORD, DANS L'ORDRE DE LAST.FM. Les autres derriere,
       pour ne pas vider une fiche pendant que la moisson tourne encore. */
    const liste = [...surs, ...autres].slice(0, PAR_STYLE);
    if (liste.length > 0) parGenre[g.id] = liste;
  }

  const livre: Livre = { fait: new Date().toISOString(), parGenre };
  writeFileSync(SORTIE, JSON.stringify(livre), 'utf8');

  /* ═══ L'INDEX INVERSE : UN NOM, SES STYLES ═══
   *
   * Six styles au plus, du plus present au moins, parce qu'au-dela ce sont
   * des incursions et non un style. Les noms sont ranges par leur forme
   * aplatie : c'est ainsi que la recherche les cherchera, sans accent et
   * sans ponctuation, pour que « Rhythim Is Rhythim » se trouve en tapant
   * « rhythim is rhythim » comme « RhythimIsRhythim ». */
  const parNom: Record<string, string[]> = {};
  for (const [nom, brut] of Object.entries(releve.parArtiste)) {
    const poids = new Map<string, number>();
    for (const [style, n] of Object.entries(brut)) {
      const cible = ranger(style, voc);
      if (!cible) continue;
      poids.set(cible.id, (poids.get(cible.id) ?? 0) + n);
    }
    if (poids.size === 0) continue;
    parNom[nom] = [...poids.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id);
  }
  writeFileSync(INDEX, JSON.stringify(parNom), 'utf8');

  const styles = Object.keys(parGenre).length;
  const noms = new Set(Object.values(parGenre).flat()).size;
  const poids = Math.round(readFileSync(SORTIE, 'utf8').length / 1024);
  console.log(
    `${styles} styles sur ${genres.length} ont des artistes, ${noms} noms distincts, ${poids} ko.`
  );
  console.log(`  ${confirmes} places confirmées par Discogs, ${inconnus} pas encore vérifiées.`);
  const combien = Object.keys(JSON.parse(readFileSync(INDEX, 'utf8')) as object).length;
  const poidsIndex = Math.round(readFileSync(INDEX, 'utf8').length / 1024);
  console.log(`Index inverse : ${combien} artistes, ${poidsIndex} ko bruts.`);
}

main();
