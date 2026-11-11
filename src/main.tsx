import { StrictMode, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/big-shoulders-display';
import '@fontsource-variable/geist-mono';
import './design/tokens.css';
import './design/base.css';
import './design/v2.css';
import './design/verre.css';
import './design/parallaxe.css';
import { MotionRacine } from './design/mouvement.tsx';
import { LecteurProvider } from './lecture/LecteurContexte.tsx';
import { MARCHAND_ACTIF } from './config.ts';
import { compterLaVisite, enregistrerLeServiceWorker, purgerSiDemande } from './lib/pwa.ts';
import { cheminAligne, hashDuChemin } from './lib/chemins.ts';
import { demarrerMesure } from './lib/mesure.ts';
import { PwaLayer } from './atlas/PwaLayer.tsx';
import { AuthButton } from './atlas/AuthButton.tsx';
import { ouvrirLeStyle } from './atlas/ouvrir-genre.ts';

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
/* La mesure des pages vues, pour les statistiques : voir lib/mesure.ts. */
demarrerMesure();
/* UN CHEMIN LISIBLE DEVIENT UNE ANCRE. /styles/techno/dub-techno/ est une
   page reelle (voir scripts/prerender.ts) ; l'app, elle, route sur l'ancre.
   On la pose avant de lire l'adresse, le chemin reste dans la barre. */
if (!window.location.hash) {
  const ancre = hashDuChemin(window.location.pathname);
  if (ancre) window.history.replaceState(null, '', window.location.pathname + window.location.search + ancre);
}
/* ET LE CHEMIN SUIT L'ANCRE. Le lien copie dans la barre d'adresse est
   celui qu'on colle sur Facebook, qui ne lit pas l'ancre : il doit nommer
   la page ouverte, pas celle par ou l'on est entre. Voir chemins.ts. */
function alignerLeChemin(): void {
  const precedent = window.location.pathname;
  const chemin = cheminAligne(window.location.hash, precedent);
  if (chemin !== precedent) window.history.replaceState(window.history.state, '', chemin + window.location.search + window.location.hash);
  const canonique = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonique && !document.head.querySelector('meta[name="sonaa-introuvable"]')) {
    /* Si la coquille de la racine (canonique /) a ete servie pour une autre
       adresse, ou si la navigation vient de changer de page, le canonique
       suit l'adresse officielle de la page ouverte. */
    if (chemin !== precedent || (canonique.getAttribute('href') === 'https://sonaa.ca/' && chemin !== '/')) {
      const officiel = chemin === '/sons/' ? '/mixtapes/' : chemin.replace(/^\/sons\//, '/mixtapes/');
      canonique.setAttribute('href', `https://sonaa.ca${officiel}`);
    }
  }
}
alignerLeChemin();
window.addEventListener('hashchange', alignerLeChemin);
if (new URLSearchParams(window.location.search).get('nocache') === '1') {
  /* La page va se recharger : on n'enregistre pas le worker qu'on vient de
     retirer. Le reste de l'application démarre quand même, la purge peut
     échouer et il vaut mieux une page vivante qu'un écran blanc. */
  void purgerSiDemande();
} else {
  enregistrerLeServiceWorker();
}

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

/* ═══ LA COUCHE MARCHANDE ═══ Phase 0, 17 septembre 2026. Les quatre ecrans
   sont differes comme les autres : personne qui vient lire l'atlas ne doit
   payer le panier, et le panier ne coute presque rien tant qu'il est vide. */
const TracksPage = lazy(() =>
  import('./marchand/TracksPage.tsx').then((m) => ({ default: m.TracksPage }))
);

/* CE QUE LES DEUX ADRESSES RENDENT TANT QUE RIEN NE SE VEND. Le drapeau est
   dans src/config.ts ; les deux ecrans de vente restent charges a la demande
   et reviennent en le remettant a `true`. */
const MarchandFerme = lazy(() =>
  import('./marchand/MarchandFerme.tsx').then((m) => ({ default: m.MarchandFerme }))
);

/* LES LABELS : la fiche d'un label et la liste de tous. Voir
   atlas/LabelPage.tsx. Differee : elle tire le corpus et les fiches. */
const LabelPage = lazy(() => import('./atlas/LabelPage.tsx').then((m) => ({ default: m.LabelPage })));
const LieuxPage = lazy(() => import('./atlas/LieuxPage.tsx').then((m) => ({ default: m.LieuxPage })));
/* RECONNAITRE : la page qui ecoute. Differee comme les autres ; voir
   src/reconnaitre/. */
const ReconnaitrePage = lazy(() =>
  import('./reconnaitre/ReconnaitrePage.tsx').then((m) => ({ default: m.ReconnaitrePage }))
);
const PanierEcran = lazy(() =>
  import('./marchand/PanierEcran.tsx').then((m) => ({ default: m.PanierEcran }))
);
const ConditionsPage = lazy(() =>
  import('./atlas/PagesLegales.tsx').then((m) => ({ default: m.ConditionsPage }))
);
const ConfidentialitePage = lazy(() =>
  import('./atlas/PagesLegales.tsx').then((m) => ({ default: m.ConfidentialitePage }))
);
const MentionsPage = lazy(() =>
  import('./atlas/PagesLegales.tsx').then((m) => ({ default: m.MentionsPage }))
);

/* LE CALENDRIER EST CHARGE A LA DEMANDE, comme les autres pages. Il tire la
   liste des styles et parle a la passerelle : rien de tout cela n'a de raison
   de peser sur qui vient seulement lire l'atlas. */
/* LA BARRE DU BAS ET LE MINI LECTEUR NE SONT PAS DIFFERES : ils sont sur
   toutes les pages, petits, et un menu qui arrive apres la page est un menu
   qui saute. */
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
/* L'ACCUEIL, A LA RACINE DEPUIS LE 8 OCTOBRE 2026. Voir src/accueil/. */
const Accueil = lazy(() => import('./accueil/Accueil.tsx').then((m) => ({ default: m.Accueil })));

/* LES DECKS SONT PARTIS SUR MAUDITEMACHINE.COM le 4 octobre 2026, ou ils
   sont devenus une machine en trois dimensions a cote du MM-RYTM et du
   MM-ARP (ADR-101). Une adresse publiee ne se retire pas, elle se redirige :
   #/decks et l'ancienne #/platines menent la-bas, directement sur la
   machine (?m=dj ouvre le site sur MM-DECKS, depuis le 4 octobre). */
const ADRESSE_DES_DECKS = 'https://mauditemachine.com/?m=dj';
const versLesDecks = (): boolean => /^#\/(decks|platines)\b/.test(window.location.hash);
if (versLesDecks()) window.location.replace(ADRESSE_DES_DECKS);
window.addEventListener('hashchange', () => {
  if (versLesDecks()) window.location.replace(ADRESSE_DES_DECKS);
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Élément racine introuvable.');
}

type Route = 'accueil' | 'labels' | 'clubs' | 'reconnaitre' | 'index' | 'credits' | 'apropos' | 'propositions' | 'moderation' | 'chronologie' | 'heatmap' | 'arbre' | 'parcourir' | 'profil' | 'mixtapes' | 'tracks' | 'panier' | 'conditions' | 'confidentialite' | 'mentions' | 'calendrier' | 'news' | 'admin';

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
  /* MIXTAPES, ET #/sets QUI Y MENE TOUJOURS. La section s'appelait Sons
     jusqu'au 17 septembre 2026 ; son ancienne ancre reste vivante, parce
     qu'elle est dans des liens partages et dans les pages deja indexees.
     Une adresse publiee ne se retire pas, elle se redirige. */
  if (window.location.hash.startsWith('#/mixtapes')) return 'mixtapes';
  if (window.location.hash.startsWith('#/sets')) return 'mixtapes';
  if (window.location.hash.startsWith('#/tracks')) return 'tracks';
  if (window.location.hash.startsWith('#/reconnaitre')) return 'reconnaitre';
  if (window.location.hash.startsWith('#/labels')) return 'labels';
  if (window.location.hash.startsWith('#/clubs')) return 'clubs';
  if (window.location.hash.startsWith('#/panier')) return 'panier';
  if (window.location.hash.startsWith('#/conditions')) return 'conditions';
  if (window.location.hash.startsWith('#/confidentialite')) return 'confidentialite';
  if (window.location.hash.startsWith('#/mentions')) return 'mentions';
  /* LA CARTE EN TROIS DIMENSIONS EST SUPPRIMEE (Mika, le 9 novembre 2026 :
     « je veux plus la voir »). Son ancienne adresse, #/carte, mene aux
     styles, qui montrent le meme corpus en pages qui se lisent. */
  if (window.location.hash.startsWith('#/carte')) {
    window.history.replaceState(null, '', '#/parcourir');
    return 'parcourir';
  }
  /* LA RACINE MENE A L'ACCUEIL depuis le 8 octobre 2026. Elle menait au
     calendrier depuis le 7 septembre (« ce qu'on vient chercher en arrivant,
     c'est ce qui se joue ce soir ») ; Mika veut maintenant une porte qui
     montre toutes les pieces, le calendrier en premier. Il garde son
     adresse, #/calendrier, et sa place en tete du menu. Toute ancre
     inconnue tombe aussi ici, comme elle tombait sur le calendrier. */
  return 'accueil';
};

/* Aucune vue ne porte plus de scene WebGL depuis la suppression de la carte
   en trois dimensions : un changement de route ne recharge jamais la page. */
function App() {
  const [route, setRoute] = useState<Route>(routeOf);
  const routeRef = useRef(route);
  routeRef.current = route;

  useEffect(() => {
    const auChangement = (): void => {
      const next = routeOf();
      const actuelle = routeRef.current;
      if (next === actuelle) return;
      setRoute(next);
    };
    window.addEventListener('hashchange', auChangement);
    return () => window.removeEventListener('hashchange', auChangement);
  }, []);

  /* UNE PAGE NOUVELLE S'OUVRE EN HAUT. Mika, le 2 octobre 2026 : « quand on
     change de bouton en bas, des fois le menu remonte et ca casse la
     navigation ». La page suivante gardait la position de defilement de la
     precedente : de News descendu a 1500 px, le calendrier s'ouvrait a
     391 px, au milieu de rien. Sur iPhone, Safari redeploie alors sa barre
     d'adresse en cours de route, et la barre du bas saute avec elle. Avant
     la peinture, pour que la page n'apparaisse jamais ailleurs qu'en haut. */
  const premiereRoute = useRef(true);
  useLayoutEffect(() => {
    if (premiereRoute.current) {
      premiereRoute.current = false;
      return;
    }
    window.scrollTo(0, 0);
  }, [route]);

  return (
    <StrictMode>
    <MotionRacine>
    <LecteurProvider>
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
          <ChronologyView onOpen={ouvrirLeStyle} />
        ) : route === 'heatmap' ? (
          <HeatmapView onOpen={ouvrirLeStyle} />
        ) : route === 'arbre' ? (
          <AccordeonView onOpen={ouvrirLeStyle} />
        ) : route === 'profil' ? (
          <ProfilPage />
        ) : route === 'mixtapes' ? (
          <SetsPage />
        ) : route === 'tracks' ? (
          MARCHAND_ACTIF ? <TracksPage /> : <MarchandFerme />
        ) : route === 'reconnaitre' ? (
          <ReconnaitrePage />
        ) : route === 'labels' ? (
          <LabelPage />
        ) : route === 'clubs' ? (
          <LieuxPage />
        ) : route === 'panier' ? (
          MARCHAND_ACTIF ? <PanierEcran /> : <MarchandFerme />
        ) : route === 'conditions' ? (
          <ConditionsPage />
        ) : route === 'confidentialite' ? (
          <ConfidentialitePage />
        ) : route === 'mentions' ? (
          <MentionsPage />
        ) : route === 'calendrier' ? (
          <CalendrierPage />
        ) : route === 'accueil' ? (
          <Accueil />
        ) : route === 'news' ? (
          <NewsPage />
        ) : route === 'admin' ? (
          <AdminPage />
        ) : (
          <ParcourirView />
        )}
      </Suspense>
      {/* Hors de toute page : on doit pouvoir se connecter depuis n'importe
          quelle vue, pas seulement depuis l'atlas. */}
      <AuthButton />
      {/* LE SON VIT ICI, HORS DES ROUTES : c'est ce qui lui permet de rester
          quand la page change. La barre d'onglets du bas est retiree depuis
          le 9 novembre 2026 : au telephone, tout passe par le menu hamburger
          (ADR-116). */}
      <MiniLecteur />
      <RechercheGlobale />
      {/* Hors du Suspense : un bandeau « hors ligne » doit pouvoir s'afficher
          même si le chunk de la page en cours n'a pas pu être chargé. */}
      <PwaLayer />
    </LecteurProvider>
    </MotionRacine>
  </StrictMode>
  );
}

createRoot(rootElement).render(<App />);
/* Force rebuild 1786862135 */
