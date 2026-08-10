import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './design/tokens.css';
import './design/base.css';

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

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Élément racine introuvable.');
}

type Route = 'index' | 'credits' | 'apropos' | 'propositions' | 'moderation' | 'atlas';

const routeOf = (): Route => {
  if (window.location.hash.startsWith('#/index')) return 'index';
  if (window.location.hash.startsWith('#/credits')) return 'credits';
  if (window.location.hash.startsWith('#/a-propos')) return 'apropos';
  if (window.location.hash.startsWith('#/propositions')) return 'propositions';
  if (window.location.hash.startsWith('#/moderation')) return 'moderation';
  return 'atlas';
};
const route = routeOf();

/* Un changement de route recharge la page. C'est brutal mais honnête : le
   contexte WebGL et le lecteur YouTube ne se démontent pas proprement, et une
   navigation entre l'atlas et la vue liste est rare. */
let lastRoute = routeOf();
window.addEventListener('hashchange', () => {
  const next = routeOf();
  if (next !== lastRoute) {
    lastRoute = next;
    window.location.reload();
  }
});

createRoot(rootElement).render(
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
      ) : (
        <AtlasPage />
      )}
    </Suspense>
  </StrictMode>
);
