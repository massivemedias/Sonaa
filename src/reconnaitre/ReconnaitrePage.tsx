/* LA PAGE /reconnaitre/ : une coquille autour du composant Reconnaissance.
 *
 * Le meme composant s'ouvre aussi dans l'accueil, sous son bouton. Voir
 * Reconnaissance.tsx.
 *
 * DEUX ADRESSES DISENT CE QU'ON VIENT FAIRE, depuis le 30 septembre 2026 :
 * #/reconnaitre/ecouter (le bouton du menu) lance l'ecoute en arrivant, et
 * #/reconnaitre/historique (« Mes ecoutes », dans le menu du compte) descend
 * a l'historique. L'intention lue, l'adresse redevient #/reconnaitre : un
 * rechargement ne rouvre pas le micro, et le meme bouton, touche de
 * nouveau, change bien d'adresse et relance l'ecoute. */

import { useEffect, useState } from 'react';
import { EnTeteSite } from '../atlas/EnTeteSite.tsx';
import { PiedDePage } from '../atlas/PiedDePage.tsx';
import { Reconnaissance } from './Reconnaissance.tsx';
import { ADRESSE_ECOUTER, ADRESSE_HISTORIQUE } from './adresses.ts';
import '../atlas/credits.css';

type Intention = 'ecouter' | 'historique' | null;

function intention(hash: string): Intention {
  if (hash.startsWith(ADRESSE_ECOUTER)) return 'ecouter';
  if (hash.startsWith(ADRESSE_HISTORIQUE)) return 'historique';
  return null;
}

export function ReconnaitrePage() {
  const [visite, setVisite] = useState(() => ({ n: 0, quoi: intention(window.location.hash) }));

  useEffect(() => {
    const suivre = (): void => {
      const quoi = intention(window.location.hash);
      if (quoi) setVisite((v) => ({ n: v.n + 1, quoi }));
    };
    window.addEventListener('hashchange', suivre);
    return () => window.removeEventListener('hashchange', suivre);
  }, []);

  useEffect(() => {
    if (visite.quoi) window.history.replaceState(window.history.state, '', '#/reconnaitre');
  }, [visite]);

  return (
    <>
      <EnTeteSite />
      <main className="credits">
        {/* UNE NOUVELLE INTENTION EST UNE NOUVELLE ECOUTE : la clef remonte
            le composant, qui repart de son etat de repos. */}
        <Reconnaissance
          key={visite.n}
          demarrer={visite.quoi === 'ecouter'}
          versHistorique={visite.quoi === 'historique'}
        />
        <PiedDePage />
      </main>
    </>
  );
}
