import { StrictMode, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './design/tokens.css';
import './design/base.css';
import { compterLaVisite, enregistrerLeServiceWorker, purgerSiDemande } from './lib/pwa.ts';
import { PwaLayer } from './atlas/PwaLayer.tsx';
import { AuthButton } from './atlas/AuthButton.tsx';
import { ouvrirDansAtlas } from './atlas/ouvrir-genre.ts';

/* LA PURGE PASSE AVANT TOUT LE RESTE, ET ELLE N'ÉTAIT APPELÉE NULLE PART.

   `?nocache=1` est la sortie de secours : elle désinscrit le service worker,
   vide les caches et recharge sur une URL propre. Elle était écrite,
   documentée, exportée, et jamais appelée : le paramètre ne faisait donc
   strictement rien, alors qu'il annonçait le contraire. C'est exactement le
   genre de porte de secours dont on ne s'aperçoit qu'elle est murée que le
   jour où l'on en a besoin.

   Elle s'exécute AVANT l'enregistrement du worker, sinon on réinstallerait
   celui qu'on vient de retirer. Le chemin normal, lui, reste entièrement
   synchrone : le worker doit prendre la main le plus tôt possible. */
compterLaVisite();
if (new URLSearchParams(window.location.search).get('nocache') === '1') {
  /* La page va se recharger : on n'enregistre pas le worker qu'on vient de
     retirer. Le reste de l'application démarre quand même, la purge peut
     échouer et il vaut mieux une page vivante qu'un écran blanc. */
  void purgerSiDemande();
} else {
  enregistrerLeServiceWorker();
}

/* L'atlas EST le produit. La racine du site l'ouvre directement, il n'y a plus
   de page d'accueil intermédiaire à traverser.

   Chargé en lazy quand même : Three.js pèse l'essentiel du bundle, et la vue
   liste sous #/index doit pouvoir s'ouvrir sans le charger du tout. */
const AtlasPage = lazy(() =>
  import('./atlas/AtlasPage.tsx').then((module) => ({ default: module.AtlasPage }))
);

/* Vue alternative accessible. Chemin de première classe, pas un repli. */
const IndexPage = lazy(() =>
  import('./atlas/IndexPage.tsx').then((module) => ({ default: module.IndexPage }))
);

const CreditsPage = lazy(() =>
  import('./atlas/CreditsPage.tsx').then((module) => ({ default: module.CreditsPage }))
);

const AProposPage = lazy(() =>
  import('./atlas/AProposPage.tsx').then((module) => ({ default: module.AProposPage }))
);

/* Contribution. Chargée à la demande : le client Supabase et ces écrans ne
   doivent rien coûter à qui vient seulement écouter l'atlas. */
const PropositionsPage = lazy(() =>
  import('./atlas/PropositionsPage.tsx').then((module) => ({ default: module.PropositionsPage }))
);

const ModerationPage = lazy(() =>
  import('./atlas/ModerationPage.tsx').then((module) => ({ default: module.ModerationPage }))
);

const ChronologyView = lazy(() =>
  import('./atlas/ChronologyView.tsx').then((module) => ({ default: module.ChronologyView }))
);

/* CHARGEE A LA DEMANDE, comme la chronologie : la carte de chaleur embarque
   son pavage et sa feuille de style, et personne qui ouvre l'atlas ne doit
   les payer. */
const HeatmapView = lazy(() =>
  import('./atlas/HeatmapView.tsx').then((module) => ({ default: module.HeatmapView }))
);

/* L'ARBRE, quatrieme vue : l'atlas entier en accordeon deploye. Meme regle
   que les deux precedentes, chargee a la demande. */
const AccordeonView = lazy(() =>
  import('./atlas/AccordeonView.tsx').then((module) => ({ default: module.AccordeonView }))
);

/* PARCOURIR : la presentation refaite au doigt, en rectangles nommes. Elle
   embarque son propre moteur de lecture, donc elle se charge a la demande
   comme les autres vues secondaires. */
const ParcourirView = lazy(() =>
  import('./atlas/ParcourirView.tsx').then((module) => ({ default: module.ParcourirView }))
);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Élément racine introuvable.');
}

type Route = 'index' | 'credits' | 'apropos' | 'propositions' | 'moderation' | 'chronologie' | 'heatmap' | 'arbre' | 'parcourir' | 'atlas';

const routeOf = (): Route => {
  if (window.location.hash.startsWith('#/index')) return 'index';
  if (window.location.hash.startsWith('#/credits')) return 'credits';
  if (window.location.hash.startsWith('#/a-propos')) return 'apropos';
  if (window.location.hash.startsWith('#/propositions')) return 'propositions';
  if (window.location.hash.startsWith('#/moderation')) return 'moderation';
  if (window.location.hash.startsWith('#/chronologie')) return 'chronologie';
  if (window.location.hash.startsWith('#/heatmap')) return 'heatmap';
  if (window.location.hash.startsWith('#/arbre')) return 'arbre';
  if (window.location.hash.startsWith('#/parcourir')) return 'parcourir';
  return 'atlas';
};

const estAtlas = (r: Route): boolean => r === 'atlas';

/* Un changement qui TRAVERSE l'atlas recharge la page. C'est brutal mais
   honnête : le contexte WebGL et le lecteur YouTube ne se démontent pas
   proprement.

   Entre deux vues SANS WebGL, plus de rechargement : chronologie → index →
   crédits était un flash blanc à chaque clic, pour rien. */
function App() {
  const [route, setRoute] = useState<Route>(routeOf);
  const routeRef = useRef(route);
  routeRef.current = route;

  useEffect(() => {
    const auChangement = (): void => {
      const next = routeOf();
      const actuelle = routeRef.current;
      if (next === actuelle) return;
      if (estAtlas(next) !== estAtlas(actuelle)) {
        window.location.reload();
        return;
      }
      setRoute(next);
    };
    window.addEventListener('hashchange', auChangement);
    return () => window.removeEventListener('hashchange', auChangement);
  }, []);

  return (
    <StrictMode>
      <Suspense fallback={null}>
        {route === 'index' ? (
          <IndexPage />
        ) : route === 'credits' ? (
          <CreditsPage />
        ) : route === 'apropos' ? (
          <AProposPage />
        ) : route === 'propositions' ? (
          <PropositionsPage />
        ) : route === 'moderation' ? (
          <ModerationPage />
        ) : route === 'chronologie' ? (
          <ChronologyView onOpen={ouvrirDansAtlas} />
        ) : route === 'heatmap' ? (
          <HeatmapView onOpen={ouvrirDansAtlas} />
        ) : route === 'arbre' ? (
          <AccordeonView onOpen={ouvrirDansAtlas} />
        ) : route === 'parcourir' ? (
          <ParcourirView />
        ) : (
          <AtlasPage />
        )}
      </Suspense>
      {/* Hors de toute page : on doit pouvoir se connecter depuis n'importe
          quelle vue, pas seulement depuis l'atlas. */}
      <AuthButton />
      {/* Hors du Suspense : un bandeau « hors ligne » doit pouvoir s'afficher
          même si le chunk de la page en cours n'a pas pu être chargé. */}
      <PwaLayer />
    </StrictMode>
  );
}

createRoot(rootElement).render(<App />);
/* Force rebuild 1786862135 */
