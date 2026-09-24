/* LE LECTEUR DES GENRES, MONTE UNE FOIS, HORS DES PAGES.
 *
 * Mika, le 23 septembre 2026 : « un seul element audio persistant, monte
 * hors de la page de genre, pour que la navigation interne ne coupe pas la
 * lecture ». Jusque-la, `useLecteur` vivait dans ParcourirView : quitter
 * /styles/ demontait la vue, donc l'iframe YouTube, donc le son. Mesure
 * avant la correction : un morceau lance sur Detroit Techno s'arretait au
 * premier clic vers les news.
 *
 * Le crochet vit ici, dans un fournisseur pose dans App, et la vue des
 * genres le lit par le contexte. L'iframe n'est construite qu'a la premiere
 * page de genre visitee (`demanderPrechargement`), jamais avant : quelqu'un
 * qui lit le calendrier ne charge pas l'API YouTube. Une fois construite,
 * elle ne se detruit qu'avec l'application.
 *
 * CE QUE LE CONTEXTE AJOUTE AU CROCHET : la liste en cours de lecture. Le
 * crochet ne connait que l'index ; la barre du bas, hors de la page, a
 * besoin du morceau lui-meme pour ecrire son titre et sa pochette. */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Track } from '../atlas/structures.ts';
import { useLecteur } from './useLecteur.ts';

type Crochet = ReturnType<typeof useLecteur>;

export interface LecteurPartage extends Crochet {
  /** La liste passee au dernier `jouer`, et le morceau que l'index designe. */
  readonly liste: readonly Track[];
  readonly pisteCourante: Track | null;
  /** A appeler en entrant sur une page de genre : construit l'iframe une fois. */
  readonly demanderPrechargement: () => void;
  /** Met en pause et retire la barre du bas. */
  readonly arreter: () => void;
}

const Contexte = createContext<LecteurPartage | null>(null);

export function LecteurProvider({ children }: { children: ReactNode }) {
  const [precharger, setPrecharger] = useState(false);
  const [liste, setListe] = useState<readonly Track[]>([]);
  const [retire, setRetire] = useState(false);
  const crochet = useLecteur({ precharger });

  const jouer = useCallback<Crochet['jouer']>(
    (tracks, index, listeId) => {
      setListe(tracks);
      setRetire(false);
      crochet.jouer(tracks, index, listeId);
    },
    [crochet.jouer]
  );

  const demanderPrechargement = useCallback(() => setPrecharger(true), []);

  const arreter = useCallback(() => {
    if (crochet.lecture.etat === 'joue' || crochet.lecture.etat === 'chargement') crochet.basculer();
    setRetire(true);
  }, [crochet.lecture.etat, crochet.basculer]);

  const valeur = useMemo<LecteurPartage>(
    () => ({
      ...crochet,
      jouer,
      liste,
      pisteCourante: retire ? null : (liste[crochet.lecture.index] ?? null),
      demanderPrechargement,
      arreter,
    }),
    [crochet, jouer, liste, retire, demanderPrechargement, arreter]
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useLecteurPartage(): LecteurPartage {
  const v = useContext(Contexte);
  if (!v) throw new Error('useLecteurPartage hors de LecteurProvider');
  return v;
}
