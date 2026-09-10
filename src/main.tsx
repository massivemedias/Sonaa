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
} else if (/^\/games?\//.test(window.location.pathname)) {
  /* LA COQUILLE DE L'APPLICATION A ETE SERVIE POUR UNE PAGE A PART.

     /game/ et /games/ sont des pages autonomes, hors de l'application. Si
     ce code s'execute a l'une de ces adresses, c'est qu'un ancien service
     worker, installe avant que le dossier figure dans sa liste d'exceptions,
     a repondu index.html a la place de la page. Constate le 7 septembre 2026
     sur un telephone : /games/isoku/ affichait l'accueil de l'atlas.

     Le nouveau worker ne prend la main qu'une fois tous les onglets fermes,
     ce que personne ne fait. On emprunte donc la sortie de secours qui
     existe deja : ?nocache=1 desinscrit le worker, vide les caches et
     recharge la meme adresse, servie cette fois par le reseau. */
  window.location.replace(window.location.pathname + '?nocache=1' + window.location.hash);
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

const ProfilPage = lazy(() =>
  import('./atlas/ProfilPage.tsx').then((module) => ({ default: module.ProfilPage }))
);

const SetsPage = lazy(() =>
  import('./atlas/SetsPage.tsx').then((module) => ({ default: module.SetsPage }))
);

/* LE CALENDRIER EST CHARGE A LA DEMANDE, comme les autres pages. Il tire la
   liste des styles et parle a la passerelle : rien de tout cela n'a de raison
   de peser sur qui vient seulement lire l'atlas. */
/* LA BARRE DU BAS ET LE MINI LECTEUR NE SONT PAS DIFFERES : ils sont sur
   toutes les pages, petits, et un menu qui arrive apres la page est un menu
   qui saute. */
import { BarreBas } from './atlas/BarreBas.tsx';
import { MiniLecteur } from './atlas/MiniLecteur.tsx';
import { RechercheGlobale } from './atlas/RechercheGlobale.tsx';

/* UN MORCEAU DE CODE QUI N'EXISTE PLUS SE RECHARGE, IL NE PLANTE PAS. Une
   page ouverte depuis hier demande un fichier que la publication de ce matin
   a remplace : le navigateur ne le trouve plus. Vite le signale ; on
   recharge, et la page revient a jour. Sans cela, la premiere navigation
   apres une publication montrait un ecran blanc. */
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  window.location.reload();
});

const NewsPage = lazy(() => import('./atlas/NewsPage.tsx').then((m) => ({ default: m.NewsPage })));
const AdminPage = lazy(() => import('./atlas/AdminPage.tsx').then((m) => ({ default: m.AdminPage })));

const CalendrierPage = lazy(() =>
  import('./atlas/CalendrierPage.tsx').then((module) => ({ default: module.CalendrierPage }))
);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Élément racine introuvable.');
}

type Route = 'index' | 'credits' | 'apropos' | 'propositions' | 'moderation' | 'chronologie' | 'heatmap' | 'arbre' | 'parcourir' | 'profil' | 'sets' | 'calendrier' | 'news' | 'admin' | 'atlas';

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
  /* #/profil existait dans le menu du compte depuis longtemps et ne menait
     nulle part : la route manquait, le clic retombait sur la carte. */
  if (window.location.hash.startsWith('#/profil')) return 'profil';
  if (window.location.hash.startsWith('#/calendrier')) return 'calendrier';
  if (window.location.hash.startsWith('#/news')) return 'news';
  if (window.location.hash.startsWith('#/admin')) return 'admin';
  if (window.location.hash.startsWith('#/sets')) return 'sets';
  /* LA CARTE EN TROIS DIMENSIONS A SON PROPRE CHEMIN, #/carte.

     Elle occupait la racine, et c'est ce qui faisait tomber Mika sur elle a
     chaque ouverture, en vue colonnes puisque ce mode est memorise. Elle
     n'est plus dans le menu depuis qu'il l'en a retiree ; la laisser en page
     d'accueil revenait a proposer, comme premier ecran, la seule vue que le
     menu ne mentionne pas. */
  if (window.location.hash.startsWith('#/carte')) return 'atlas';
  /* LA RACINE MENE AU CALENDAR. Decision de Mika du 7 septembre 2026, pour
     le lancement a Montreal : ce qu'on vient chercher en arrivant, c'est ce
     qui se joue ce soir, pas la carte des genres. Parcourir reste a un clic,
     premier dans le menu. */
  return 'calendrier';
};

const estAtlas = (r: Route): boolean => r === 'atlas';

/* Les routes qui portent la barre du bas sur telephone : celles qui defilent
   comme un document, ou comme Parcourir. Les vues plein ecran gardent leur
   chrome, voir BarreBas.tsx. */
const PORTE_LA_BARRE: ReadonlySet<Route> = new Set([
  'calendrier',
  'admin',
  'news',
  'parcourir',
  'sets',
  'profil',
  'index',
  'credits',
  'apropos',
  'propositions',
  'moderation',
]);

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
        ) : route === 'profil' ? (
          <ProfilPage />
        ) : route === 'sets' ? (
          <SetsPage />
        ) : route === 'calendrier' ? (
          <CalendrierPage />
        ) : route === 'news' ? (
          <NewsPage />
        ) : route === 'admin' ? (
          <AdminPage />
        ) : route === 'parcourir' ? (
          <ParcourirView />
        ) : (
          <AtlasPage />
        )}
      </Suspense>
      {/* Hors de toute page : on doit pouvoir se connecter depuis n'importe
          quelle vue, pas seulement depuis l'atlas. */}
      <AuthButton />
      {/* LE SON ET LA BARRE DU BAS VIVENT ICI, HORS DES ROUTES : c'est ce qui
          leur permet de rester quand la page change. La barre d'onglets
          relit l'adresse a chaque rendu de App, qui a lieu a chaque
          changement de route. */}
      <MiniLecteur />
      <RechercheGlobale />
      {PORTE_LA_BARRE.has(route) && <BarreBas />}
      {/* Hors du Suspense : un bandeau « hors ligne » doit pouvoir s'afficher
          même si le chunk de la page en cours n'a pas pu être chargé. */}
      <PwaLayer />
    </StrictMode>
  );
}

createRoot(rootElement).render(<App />);
/* Force rebuild 1786862135 */
