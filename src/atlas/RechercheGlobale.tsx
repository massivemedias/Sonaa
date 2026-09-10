/* LA RECHERCHE, LA MEME PARTOUT, OUVERTE PAR LA LOUPE DU COIN HAUT DROIT.

   Elle vivait dans l'atlas, puis Parcourir avait la sienne, dans son
   en-tete, et les autres pages n'en avaient pas. Mika, le 9 septembre
   2026 : « le bouton Recherche du header doit se retrouver partout sur le
   site, toujours au meme endroit ». La loupe est donc dans la boite du
   coin (AuthButton), presente sur toutes les pages, et c'est cette couche,
   rendue hors des routes dans App, qui ouvre la recherche.

   Un genre choisi mene a sa fiche dans Parcourir, d'ou qu'on vienne. */

import { lazy, Suspense, useEffect, useState } from 'react';

const SearchOverlay = lazy(() =>
  import('./SearchOverlay.tsx').then((m) => ({ default: m.SearchOverlay }))
);

export const EVENEMENT_RECHERCHE = 'sonaa:recherche';

export function RechercheGlobale() {
  const [ouverte, setOuverte] = useState(false);
  useEffect(() => {
    const ouvrir = (): void => setOuverte(true);
    window.addEventListener(EVENEMENT_RECHERCHE, ouvrir);
    return () => window.removeEventListener(EVENEMENT_RECHERCHE, ouvrir);
  }, []);
  if (!ouverte) return null;
  const versGenre = (fi: number, gl: number): void => {
    window.location.hash = `#/parcourir/${fi}/${gl}`;
    setOuverte(false);
  };
  const versFamille = (fi: number): void => {
    window.location.hash = `#/parcourir/${fi}`;
    setOuverte(false);
  };
  return (
    <Suspense fallback={null}>
      <SearchOverlay
        onPick={versGenre}
        onListen={versGenre}
        onFamille={versFamille}
        onClose={() => setOuverte(false)}
      />
    </Suspense>
  );
}
