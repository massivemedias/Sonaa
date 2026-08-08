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

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Élément racine introuvable.');
}

const isIndex = window.location.hash.startsWith('#/index');

/* Un changement de route recharge la page. C'est brutal mais honnête : le
   contexte WebGL et le lecteur YouTube ne se démontent pas proprement, et une
   navigation entre l'atlas et la vue liste est rare. */
let lastRoute = window.location.hash.startsWith('#/index') ? 'index' : 'atlas';
window.addEventListener('hashchange', () => {
  const route = window.location.hash.startsWith('#/index') ? 'index' : 'atlas';
  if (route !== lastRoute) {
    lastRoute = route;
    window.location.reload();
  }
});

createRoot(rootElement).render(
  <StrictMode>
    <Suspense fallback={null}>{isIndex ? <IndexPage /> : <AtlasPage />}</Suspense>
  </StrictMode>
);
