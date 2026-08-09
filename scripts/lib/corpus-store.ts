/* LE SEUL CHEMIN D'ÉCRITURE DU CORPUS (ADR-044).

   fetch-covers a écrasé des données concurrentes DEUX FOIS en réécrivant
   l'instantané qu'il avait chargé au démarrage. Ce n'est plus un bug à
   corriger, c'est une classe d'erreur à interdire structurellement :

   1. AUCUN script n'appelle writeFileSync sur corpus.json. Un contrôle CI
      (check-corpus-writes) échoue si un script le fait.
   2. Ce module RELIT LE DISQUE à chaque écriture. La fenêtre entre lecture
      et écriture est de l'ordre de la milliseconde, pas de l'heure : un
      import qui a tourné pendant la passe de pochettes survit.
   3. `patchTracks` n'applique QUE les champs déclarés par le script
      appelant, track par track, identifiée par son identifiant vidéo.
      Impossible d'écraser un champ qu'on ne possède pas.
   4. `transaction` est réservée aux écritures structurelles (ajout ou
      retrait de tracks) : elle passe le corpus FRAIS du disque à la
      fonction de l'appelant, qui rejoue ses décisions dessus. Il n'existe
      AUCUNE API qui accepte un objet corpus complet à écrire. */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CORPUS = fileURLToPath(new URL('../../src/data/corpus.json', import.meta.url));

/* Champs de track qu'un script peut posséder. La liste est fermée exprès :
   un nouveau champ s'ajoute ici, avec son propriétaire en commentaire. */
export type TrackField =
  | 'cover' // fetch-covers
  | 'album' // fetch-covers (iTunes), retiré par fetch-release-data
  | 'release' // fetch-release-data
  | 'key'; // fetch-key

interface AnyTrack {
  youtubeId: string;
  [k: string]: unknown;
}
interface AnyGenre {
  id: string;
  tracks: { essentiel: AnyTrack[]; actuel: AnyTrack[] };
  [k: string]: unknown;
}
export interface AnyCorpus {
  genres: AnyGenre[];
  [k: string]: unknown;
}

export const readCorpus = (): AnyCorpus =>
  JSON.parse(readFileSync(CORPUS, 'utf8')) as AnyCorpus;

const write = (corpus: AnyCorpus): void => {
  writeFileSync(CORPUS, `${JSON.stringify(corpus, null, 1)}\n`, 'utf8');
};

/* Écriture par champs possédés. `patches` associe un identifiant vidéo aux
   valeurs des champs déclarés ; `undefined` supprime le champ (un cover
   retiré, un album remplacé par release). Toute copie de la track, dans
   tous les genres qui la tiennent, reçoit la même valeur : une charnière
   partage sa pochette. */
export const patchTracks = (
  fields: readonly TrackField[],
  patches: ReadonlyMap<string, Partial<Record<TrackField, unknown>>>
): void => {
  const disk = readCorpus();
  for (const genre of disk.genres) {
    for (const track of [...genre.tracks.essentiel, ...genre.tracks.actuel]) {
      const patch = patches.get(track.youtubeId);
      if (!patch) continue;
      for (const field of fields) {
        if (!(field in patch)) continue;
        const value = patch[field];
        if (value === undefined) delete track[field];
        else track[field] = value;
      }
    }
  }
  write(disk);
};

/* Écriture STRUCTURELLE : la fonction reçoit le corpus frais du disque et
   le modifie en place. C'est le seul endroit où ajouter ou retirer des
   tracks. La fonction doit être REJOUABLE sur un état plus récent que
   celui que le script a étudié : vérifier ses préconditions dedans. */
export const transaction = (mutate: (fresh: AnyCorpus) => void): void => {
  const disk = readCorpus();
  mutate(disk);
  write(disk);
};
