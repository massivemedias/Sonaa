/* LA PAGE /reconnaitre/ : une coquille autour du composant Reconnaissance.
 *
 * Elle reste servie pour les liens existants et l'historique local ; depuis
 * le 27 septembre 2026 le meme composant s'ouvre aussi en surcouche sur
 * l'accueil. Voir Reconnaissance.tsx. */

import { EnTeteSite } from '../atlas/EnTeteSite.tsx';
import { PiedDePage } from '../atlas/PiedDePage.tsx';
import { Reconnaissance } from './Reconnaissance.tsx';
import '../atlas/credits.css';

export function ReconnaitrePage() {
  return (
    <>
      <EnTeteSite />
      <main className="credits">
        <Reconnaissance />
        <PiedDePage />
      </main>
    </>
  );
}
