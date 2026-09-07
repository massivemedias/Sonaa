/* LIRE LES GENRES, ET RIEN QU'EUX.
 *
 * ═══ POURQUOI CE MODULE EXISTE, ALORS QU'UN readFileSync SUFFIRAIT ═══
 *
 * Le controle des ecritures du corpus (ADR-044) refuse qu'un fichier de
 * scripts/ contienne A LA FOIS une reference a corpus.json et un appel a
 * writeFileSync. La regle vient d'un vrai degat : fetch-covers a ecrase des
 * donnees concurrentes deux fois en reecrivant son instantane de demarrage.
 *
 * Le moissonneur d'artistes a besoin des deux : lire les 219 genres, et
 * ecrire son propre releve. Il aurait ete facile de passer a `writeFile` de
 * node:fs/promises, que le controle ne cherche pas. Ce serait avoir raison
 * contre le controle et tort contre la raison qui l'a fait ecrire.
 *
 * On separe donc les deux responsabilites pour de bon : ce fichier-ci lit le
 * corpus et n'ecrit rien, jamais ; le moissonneur ecrit et ne connait pas le
 * chemin du corpus. Aucun des deux ne peut faire le degat que la regle
 * previent, et la regle n'a pas eu a etre assouplie.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface GenreDuCorpus {
  readonly id: string;
  readonly label: string;
  readonly family: string;
  /** Les artistes choisis a la main, deja dans le corpus. Ils servent de
      graines : ce sont des noms dont on sait deja le style. */
  readonly artistesCles: readonly string[];
}

const CHEMIN = fileURLToPath(new URL('../../src/data/corpus.json', import.meta.url));

/** Les 219 genres, avec leur identifiant, leur libelle et leur famille. */
export function genresDuCorpus(): GenreDuCorpus[] {
  const brut = JSON.parse(readFileSync(CHEMIN, 'utf8')) as {
    genres: { id: string; label: string; family: string; artistesCles?: string[] }[];
  };
  return brut.genres.map((g) => ({
    id: g.id,
    label: g.label,
    family: g.family,
    artistesCles: g.artistesCles ?? [],
  }));
}

/** Les noms d'artistes deja presents dans le corpus, toutes sources
    confondues : artistes cles des genres et interpretes des morceaux. */
export function artistesDuCorpus(): string[] {
  const brut = JSON.parse(readFileSync(CHEMIN, 'utf8')) as {
    genres: { artistesCles?: string[]; tracks?: { artist?: string }[] }[];
  };
  const noms = new Set<string>();
  for (const g of brut.genres) {
    for (const a of g.artistesCles ?? []) if (a.trim()) noms.add(a.trim());
    for (const t of g.tracks ?? []) if (t.artist?.trim()) noms.add(t.artist.trim());
  }
  return [...noms].sort((a, b) => a.localeCompare(b));
}
