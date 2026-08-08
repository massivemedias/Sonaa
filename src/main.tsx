import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './design/tokens.css';
import './design/base.css';
import { App } from './app/App';

/* Le prototype de charge vit sous #/proto et n'est pas branché au reste.
   Chargé en lazy : rien de son code, ni Three, n'entre dans le bundle de la
   page d'accueil. À retirer avec src/proto/ quand la direction sera tranchée. */
const ProtoPage = lazy(() =>
  import('./proto/ProtoPage.tsx').then((module) => ({ default: module.ProtoPage }))
);

/* Vue alternative accessible. Chemin de première classe, pas un repli. */
const IndexPage = lazy(() =>
  import('./proto/IndexPage.tsx').then((module) => ({ default: module.IndexPage }))
);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Élément racine introuvable.');
}

const hash = window.location.hash;
const isProto = hash.startsWith('#/proto');
const isIndex = hash.startsWith('#/index');

// Le prototype est jetable : un simple rechargement suffit à changer de vue.
window.addEventListener('hashchange', () => window.location.reload());

createRoot(rootElement).render(
  <StrictMode>
    {isProto ? (
      <Suspense fallback={null}>
        <ProtoPage />
      </Suspense>
    ) : isIndex ? (
      <Suspense fallback={null}>
        <IndexPage />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>
);
