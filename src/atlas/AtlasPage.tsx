/* Coquille de l'atlas. Elle route les vues et ne dessine rien elle-même :
   la 3D est dans webgl-orbit.ts, la vue en cartes dans ColumnsView, le
   lecteur ET la fiche dans PlayerLayer (le clic ouvre directement les
   tracks, la fiche vit dans la colonne), la recherche dans SearchOverlay. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { STRUCTURES } from './structures.ts';
import {
  faMagnifyingGlass,
  faMagnifyingGlassPlus,
  faMagnifyingGlassMinus,
  faCrosshairs,
  type IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import { PlayerLayer } from './PlayerLayer.tsx';
import { SearchOverlay } from './SearchOverlay.tsx';
import { Welcome } from './Welcome.tsx';
import { ColumnsView } from './ColumnsView.tsx';
import { MobileLevels } from './MobileLevels.tsx';
import type { NavState, PanelState, AtlasApi, AtlasStats } from './atlas-api.ts';
import './atlas.css';
import './welcome.css';

type Mode = 'attente' | 'webgl' | 'dom' | 'repli';

/* DEUX VUES (ADR-043, révisé) : la 3D libre, l'orbite planétaire, et les
   colonnes, les familles en cartes sans WebGL. La 3D fixe et la vue
   linéaire ont été retirées. Le choix se fait à l'entrée, se change à tout
   moment, et se retient. */
export type ViewId = 'libre' | 'colonnes';
const VIEW_KEY = 'sonaa-view';
const VIEWS: { id: ViewId; label: string; hint: string }[] = [
  { id: 'libre', label: '3D libre', hint: 'orbiter autour du système planétaire' },
  { id: 'colonnes', label: 'Colonnes', hint: 'les familles en cartes' }
];

/* Le choix mémorisé peut désigner une vue qui n'existe plus : « fixe » et
   « lineaire » traînent dans le localStorage de tous ceux qui les avaient
   choisies. On ne se contente pas de les ignorer, on RÉÉCRIT la clé, sinon
   la valeur morte reste et le repli se rejoue à chaque visite.
   « fixe » retombe sur la 3D libre, qui montre la même chose autrement ;
   « lineaire » retombe sur les colonnes, qui sont l'autre vue en DOM. */
const REMPLACEMENTS: Record<string, ViewId> = { fixe: 'libre', lineaire: 'colonnes' };

const readView = (): ViewId | null => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(VIEW_KEY);
  } catch {
    return null; // navigation privée : on part sur le défaut, sans bruit.
  }
  if (raw === null) return null;
  if (VIEWS.some((v) => v.id === raw)) return raw as ViewId;

  const remplacant = REMPLACEMENTS[raw];
  if (remplacant) {
    try {
      localStorage.setItem(VIEW_KEY, remplacant);
    } catch {
      /* sans écriture possible, le repli s'appliquera à nouveau au prochain
         chargement : c'est dégradé, jamais cassé. */
    }
    return remplacant;
  }
  return null; // valeur inconnue : défaut.
};

const hasWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

/* L'écran d'accueil se montre une seule fois dans la vie du navigateur. Clé
   distincte de la ligne d'aide : ce sont deux choses différentes. */
const WELCOME_KEY = 'sonaa-welcome-seen';
/* L'intro, la naissance des familles, se joue une seule fois. Clé distincte de
   l'accueil : « revoir l'intro » sur les crédits n'a pas à repasser l'accueil. */
const INTRO_KEY = 'sonaa-intro-seen';

/* LE GENRE D'ACCUEIL DE LA COLONNE.

   La colonne est ouverte en permanence, donc elle a quelque chose à montrer
   AVANT le premier clic. Un genre tiré au sort, différent à chaque visite :
   c'est une invitation à découvrir, et ça dit en une seconde à quoi sert le
   site, ce qu'aucune phrase ne fait aussi bien.

   Le tirage se limite aux genres BIEN POURVUS, cinq morceaux au moins. Un
   genre qui en a deux donnerait une première impression de corpus vide, et
   c'est la première impression qu'on ne rejoue pas. Toutes les tracks du
   corpus publié sont vérifiées, le compte suffit donc à qualifier.

   Math.random est ici volontaire : le but EST que ce soit différent d'une
   visite à l'autre. Rien n'en dépend qui doive être reproductible. */
const SEUIL_ACCUEIL = 5;

const genreDAccueil = (): { familyIndex: number; genreLocal: number } => {
  const candidats: { familyIndex: number; genreLocal: number }[] = [];
  STRUCTURES.forEach((structure, fi) => {
    structure.genres.forEach((genre, gi) => {
      const n = genre.tracksEssentiel.length + genre.tracksActuel.length;
      if (n >= SEUIL_ACCUEIL) candidats.push({ familyIndex: fi, genreLocal: gi });
    });
  });
  /* Repli : si le seuil ne laissait personne, on prend le premier genre
     plutôt que de rendre une colonne vide. Ce cas n'existe pas dans le
     corpus publié, il existe dans un corpus en cours d'écriture. */
  return candidats[Math.floor(Math.random() * candidats.length)] ?? { familyIndex: 0, genreLocal: 0 };
};

/* SVG inline depuis les données d'icône : pas de fontawesome-svg-core, pas
   de police, pas de CDN. Le glyphe hérite de currentColor (noir sur le rond
   blanc), taille optique ~40 % du diamètre via la CSS. */
function FaIcon({ icon }: { icon: IconDefinition }) {
  const [w, h, , , path] = icon.icon;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="fa-icon" aria-hidden="true" focusable="false">
      <path fill="currentColor" d={Array.isArray(path) ? path.join(' ') : path} />
    </svg>
  );
}

function Fallback({ notice }: { notice: string }) {
  return (
    <div className="atlas-fallback">
      <p className="atlas-fallback-notice">{notice}</p>
      <p className="atlas-fallback-notice">
        <a href="#/index">Ouvrir l&apos;index, navigation complète des familles et des genres</a>
      </p>
    </div>
  );
}

export function AtlasPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AtlasApi | null>(null);

  const [mode, setMode] = useState<Mode>('attente');
  // 3D libre par défaut (verdict de Mika) ; un choix mémorisé est respecté.
  const [view, setView] = useState<ViewId>(() => readView() ?? 'libre');
  const [nav, setNav] = useState<NavState | null>(null);
  /* LA COLONNE NE SE FERME PLUS. `panelGenre` n'est donc JAMAIS null : il
     porte le genre d'accueil tiré au sort tant qu'on n'a rien ouvert. Le
     type non nullable n'est pas cosmétique, c'est ce qui empêche de
     réintroduire une fermeture par mégarde ailleurs dans le fichier. */
  const [panelGenre, setPanelGenre] = useState<{ familyIndex: number; genreLocal: number }>(
    genreDAccueil
  );
  const [searchOpen, setSearchOpen] = useState(false);
  /* Légende de navigation : aide-mémoire PERMANENT, repliable en une ligne,
     choix mémorisé. Elle ne disparaît jamais complètement. */
  const [legendCollapsed, setLegendCollapsed] = useState(
    () => localStorage.getItem('sonaa-legend-collapsed') === '1'
  );
  const toggleLegend = useCallback(() => {
    setLegendCollapsed((v) => {
      localStorage.setItem('sonaa-legend-collapsed', v ? '0' : '1');
      return !v;
    });
  }, []);
  /* Fil d'Ariane replié sur petit écran : deux segments et un chevron. */
  const [crumbsExpanded, setCrumbsExpanded] = useState(false);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 600px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)');
    const onChange = (): void => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem(WELCOME_KEY) !== '1'
  );
  const [reason, setReason] = useState('Chargement de la couche WebGL…');

  // Le HUD est retiré : les statistiques du moteur n'ont plus de lecteur.
  const onStats = useCallback((_next: AtlasStats) => {}, []);
  const onNavigate = useCallback((next: NavState) => setNav(next), []);
  const onTracks = useCallback(
    (familyIndex: number, genreLocal: number) => setPanelGenre({ familyIndex, genreLocal }),
    []
  );

  /* Le moteur signalait la fermeture du panneau ; il n'y a plus de
     fermeture. Le rappel reste au contrat pour ne pas toucher aux six
     interfaces, mais il ne vide plus la colonne : c'était le seul chemin par
     lequel elle pouvait redevenir vide. */
  const onPanel = useCallback((_state: PanelState | null) => {}, []);

  /* La colonne du lecteur ne suspend PLUS la carte : elle reste vivante à
     côté, on navigue pendant que la musique joue. */

  useEffect(() => {
    // La vue colonnes n'a pas de moteur : rien à charger, rien à perdre.
    if (view === 'colonnes') {
      setMode('dom');
      setNav(null);
      return;
    }
    if (!hasWebGL()) {
      setMode('repli');
      setReason('WebGL indisponible sur ce navigateur.');
      return;
    }

    let disposed = false;
    const id = window.setTimeout(() => {
      /* Un seul moteur désormais. La branche qui choisissait entre deux
         imports a disparu avec la vue fixe : il n'y a plus d'alternative à
         arbitrer, et un ternaire à une seule issue se lit comme un choix
         qui n'existe pas. */
      const load = import('./webgl-orbit.ts').then((m) => m.initAtlasOrbit);
      void load.then((init) => {
        if (disposed) return;
        const canvas = canvasRef.current;
        const labelLayer = labelRef.current;
        if (!canvas || !labelLayer) return;

        apiRef.current = init({
          canvas,
          labelLayer,
          onStats,
          onNavigate,
          onTracks,
          onPanel,
          onContextLost: () => {
            setMode('repli');
            setReason('Contexte WebGL perdu, bascule sur le repli.');
          }
        });
        setMode('webgl');
        if (
          localStorage.getItem(INTRO_KEY) !== '1' &&
          localStorage.getItem(WELCOME_KEY) === '1'
        ) {
          apiRef.current?.playIntro();
        }
      });
    }, 0);

    return () => {
      disposed = true;
      window.clearTimeout(id);
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [view, onStats, onNavigate, onTracks, onPanel]);

  const chooseView = useCallback((next: ViewId) => {
    localStorage.setItem(VIEW_KEY, next);
    setMode('attente');
    setNav(null);
    setView(next);
  }, []);

  /* VÉRIFICATION VISUELLE PAR LA MACHINE : l'app ouverte avec ?verify
     mesure la matité des éteints, la respiration, le survol, le flux,
     l'intro et le recouvrement sous rotation, puis affiche le JSON.
     Voir npm run verify:visual pour la marche à suivre. */
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('verify')) return;
    if (mode !== 'webgl') return;
    const id = window.setTimeout(() => {
      void import('./verify-visual.ts').then((m) => m.runAndDisplay());
    }, 2000);
    return () => window.clearTimeout(id);
  }, [mode]);

  /* Les contrôles s'estompent à 60 % après 3 s sans interaction, et
     reviennent à pleine opacité au moindre mouvement ou toucher. Attribut
     DOM direct : pas de re-rendu React toutes les 3 secondes. */
  const controlsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let timer = 0;
    const wake = (): void => {
      controlsRef.current?.removeAttribute('data-idle');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => controlsRef.current?.setAttribute('data-idle', '1'), 3000);
    };
    wake();
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart'];
    for (const e of events) window.addEventListener(e, wake, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, wake);
    };
  }, []);

  /* Le balayage du logo s'arrête quand l'onglet est en arrière-plan : une
     animation CSS ne se met pas en pause toute seule. */
  useEffect(() => {
    const onVisibility = (): void => {
      document.documentElement.toggleAttribute('data-tab-hidden', document.hidden);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* La 3D n'est plus suspendue : le panneau vit DANS la scène, devant la
     sphère du genre. On continue donc à orbiter et à zoomer pendant qu'il est
     ouvert, et la plaque suit la caméra sans jamais tourner sur elle-même. */

  /* Il n'y a plus de fermeture, seulement une RÉDUCTION, et c'est la colonne
     elle-même qui la tient : elle sait si elle est réduite, la coquille n'a
     pas à le savoir. */

  /* Retour à l'Atlas : cadrage d'ensemble et fil d'Ariane remis à zéro.
     C'est ce que fait le premier segment du fil d'Ariane, et le logotype.
     LA LECTURE NE SE COUPE PAS : si quelque chose joue sur mobile, la
     feuille passe en barre discrète au lieu de se fermer ; c'est le
     PlayerLayer qui tranche, via l'événement sonaa:home. */
  const backToAtlas = useCallback(() => {
    apiRef.current?.goToFamily(-1);
    window.dispatchEvent(new CustomEvent('sonaa:home'));
  }, []);

  const dismissWelcome = useCallback((picked?: ViewId) => {
    localStorage.setItem(WELCOME_KEY, '1');
    setShowWelcome(false);
    if (picked && picked !== view) {
      chooseView(picked);
      return;
    }
    // L'intro se joue après l'accueil, jamais dessous.
    if (localStorage.getItem(INTRO_KEY) !== '1') {
      apiRef.current?.playIntro();
    }
  }, [view, chooseView]);

  /* LA BARRE OBLIQUE OUVRE LA RECHERCHE, ET ELLE SEULE.

     L'espace le faisait aussi, sauf quand la colonne était ouverte : il
     appartient alors au lecteur, comme partout ailleurs sur le web. Depuis
     que la colonne est PERMANENTE (ADR-068), cette exception est devenue la
     règle et l'espace n'ouvre donc plus jamais la recherche. La légende, elle,
     a continué d'annoncer « Espace : chercher un genre » : elle promettait un
     raccourci mort, et c'est en tentant de suivre ce chemin que le défaut a
     été trouvé.

     On garde l'espace au lecteur, qui est l'usage attendu, et la légende dit
     désormais la barre oblique. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLInputElement) return;
      if (searchOpen) return;
      /* L'ESPACE APPARTIENT AU LECTEUR, désormais toujours. Il ouvrait la
         recherche tant qu'aucune colonne n'était ouverte ; la colonne est
         maintenant toujours ouverte, et l'espace est lecture-pause partout
         ailleurs sur le web. La barre oblique reste le raccourci de
         recherche, et la légende le dit. */
      if (event.key === '/') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  const goToGenre = useCallback((familyIndex: number, genreLocal: number) => {
    if (!apiRef.current) {
      // Vue DOM : aller à un genre, c'est ouvrir sa colonne de tracks.
      setPanelGenre({ familyIndex, genreLocal });
      return;
    }
    apiRef.current.goToGenre(familyIndex, genreLocal);
  }, []);

  /* Écouter passe par le MOTEUR, pas par l'état React seul. C'est lui qui pose
     la plaque dans la scène et qui en émet la géométrie ; le prévenir est la
     seule façon d'avoir une fenêtre vidéo positionnée. Appeler onTracks
     directement affichait un panneau sans plaque ni fenêtre. */
  const openTracks = useCallback((familyIndex: number, genreLocal: number) => {
    if (!apiRef.current) {
      setPanelGenre({ familyIndex, genreLocal });
      return;
    }
    apiRef.current.openPanel(familyIndex, genreLocal);
  }, []);

  const reopenPanel = useCallback((familyIndex: number, genreLocal: number) => {
    apiRef.current?.openPanel(familyIndex, genreLocal);
  }, []);

  /* Le titre du document suit la navigation : un onglet ouvert doit dire où on
     en est, et un lien copié depuis la barre d'adresse doit être lisible.
     Point médian et non tiret cadratin. */
  useEffect(() => {
    const parts: string[] = [];
    if (panelGenre) {
      const genre = STRUCTURES[panelGenre.familyIndex]?.genres[panelGenre.genreLocal];
      if (genre) parts.push(`${genre.label}, tracks`);
    } else if (nav && nav.path.length > 0) {
      const last = nav.path[nav.path.length - 1];
      if (last) parts.push(last.label);
    } else if (nav && nav.familyIndex >= 0) {
      parts.push(nav.familyLabel);
    }
    document.title = parts.length > 0 ? `${parts.join(' ')} · SONAA` : 'SONAA';
  }, [nav, panelGenre]);


  const level = nav?.level ?? 'atlas';

  return (
    <div className="atlas-root">
      <canvas
        ref={canvasRef}
        className="atlas-canvas"
        /* Focalisable au clavier : la fermeture de la recherche lui rend la
           main. tabIndex -1 le rend focalisable par programme sans l'ajouter
           au parcours de tabulation, où un canvas n'a rien à faire. */
        tabIndex={-1}
        data-active={mode === 'webgl'}
        data-suspended={false}
      />
      <div ref={labelRef} className="atlas-labels" data-suspended={false} aria-hidden="true" />

      {mode === 'dom' && (
        <ColumnsView onOpen={openTracks} />
      )}

      {/* LA NAVIGATION PAR NIVEAUX REMPLACE LA VUE D'ENSEMBLE SOUS 768 px.

          Elle se monte PAR-DESSUS le canvas plutot qu'a sa place : le moteur
          continue de vivre, ses cadrages restent calcules, et ouvrir un genre
          la fait s'effacer pour decouvrir la vue graphique qui, elle,
          fonctionne sur telephone. Le composant se retire lui-meme au-dela du
          seuil, la page n'a pas a le savoir. */}
      {mode === 'webgl' && <MobileLevels onOpen={openTracks} />}

      {mode !== 'webgl' && mode !== 'dom' && <Fallback notice={reason} />}

      {/* Le sélecteur de vue vit dans le pied de page, avec les crédits :
          la barre permanente encombrait la carte une fois le choix fait
          (verdict). Le choix reste à un clic, il n'est plus sous les yeux. */}

      {/* Le logotype est le retour à l'accueil : cadrage d'ensemble, fil
          d'Ariane remis à zéro, la lecture en cours passe en barre discrète
          sans jamais se couper. Le balayage lumineux au survol sert
          d'indice de cliquabilité. */}
      <button
        className="brand"
        onClick={backToAtlas}
        aria-label="SONAA, revenir à la vue Atlas"
        title="Revenir à l'Atlas"
      >
        <img src={`${import.meta.env.BASE_URL}brand/sonaa-logo.png`} alt="SONAA" draggable={false} />
        {/* Le balayage lumineux. Le PNG n'a pas de tracé vectoriel : c'est un
            masque en dégradé qui respecte la transparence, la lumière n'existe
            que sur les pixels du glyphe, donc le point semble suivre le trait.
            Choix documenté dans DESIGN.md, section identité. */}
        <span className="brand-sweep" aria-hidden="true" />
      </button>

      {/* LA FLÈCHE DE RETOUR, à gauche du fil d'Ariane, visible seulement
          quand on est entré quelque part.

          Le fil d'Ariane sait déjà remonter, mais il demande de viser le bon
          segment et de comprendre qu'un segment est cliquable. Une flèche ne
          demande rien : c'est le geste que tout le monde connaît, et elle
          remonte d'un cran. */}
      {mode === 'webgl' && (level !== 'atlas' || panelGenre) && (
        <button className="crumb-retour" onClick={() => apiRef.current?.goUp()} aria-label="Remonter d'un niveau" title="Remonter d'un niveau">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 5 L8 12 L15 19"
            />
          </svg>
        </button>
      )}

      {/* Fil d'Ariane permanent : on sait toujours où on est, et on remonte
          en un clic sur n'importe quel segment. */}
      <nav
        className="crumbs"
        data-hidden={false}
        data-expanded={crumbsExpanded}
        aria-label="Fil d'Ariane"
      >
        {(() => {
          /* Sous 600 px : deux segments au plus, précédés d'un chevron qui
             déploie le chemin complet. Une ligne, jamais deux. */
          const totalSegments =
            1 + (nav && nav.familyIndex >= 0 ? 1 : 0) + (nav?.path.length ?? 0);
          if (narrow && !crumbsExpanded && totalSegments > 2) {
            return (
              <button
                className="crumb-ellipsis"
                onClick={() => setCrumbsExpanded(true)}
                aria-label="Déployer le chemin complet"
              >
                ‹ …
              </button>
            );
          }
          if (narrow && crumbsExpanded) {
            return (
              <button
                className="crumb-ellipsis"
                onClick={() => setCrumbsExpanded(false)}
                aria-label="Replier le chemin"
              >
                ×
              </button>
            );
          }
          return null;
        })()}
        {(() => {
          /* Segments en données : le repli mobile ne garde que les deux
             derniers, sans dupliquer la logique de rendu. */
          interface Seg {
            key: string;
            label: string;
            current: boolean;
            onClick?: () => void;
          }
          /* PLUS DE SEGMENT « TRACKS ». Il annonçait l'ouverture de la
             colonne ; la colonne est toujours ouverte, il serait toujours là
             et ne dirait plus rien. Le dernier genre du chemin est la vérité
             de l'endroit où l'on est.

             Le fil d'Ariane reste NET et cliquable en mode focus : il vit
             hors du canvas, le flou ne l'atteint pas, et c'est par lui qu'on
             remonte sans avoir à viser une sphère. */
          const segments: Seg[] = [
            { key: 'atlas', label: 'Atlas', current: level === 'atlas', onClick: backToAtlas }
          ];
          if (nav && nav.familyIndex >= 0) {
            const fi = nav.familyIndex;
            segments.push({
              key: 'family',
              label: nav.familyLabel,
              current: level === 'family',
              onClick: () => apiRef.current?.goToFamily(fi)
            });
          }
          nav?.path.forEach((seg, i) => {
            const fi = nav.familyIndex;
            /* LE FONDATEUR PORTE SOUVENT LE NOM DE SA FAMILLE : Downtempo,
               Disco, Techno, Industrial. Depuis qu'ouvrir une famille entre
               dans son fondateur, le chemin affichait « Downtempo ›
               Downtempo », ce qui se lit comme un bug d'affichage. Le
               segment de famille reste, il porte déjà le clic qui y ramène. */
            if (i === 0 && seg.label === nav.familyLabel) return;
            segments.push({
              key: `g-${seg.index}`,
              label: seg.label,
              current: i === nav.path.length - 1,
              /* Un segment de genre REDESCEND sur ce genre : il refait sa
                 couronne, referme la zone sur lui et remplace le contenu de
                 la colonne. Avant, il se contentait de vider la colonne, ce
                 qui laissait la carte où elle était. */
              onClick: () => goToGenre(fi, seg.local)
            });
          });

          const shown = narrow && !crumbsExpanded ? segments.slice(-2) : segments;
          return shown.map((seg, i) => (
            <span key={seg.key} className="crumb-group">
              {i > 0 && <span className="crumb-sep" aria-hidden="true">›</span>}
              {seg.onClick ? (
                <button className="crumb" data-current={seg.current} onClick={seg.onClick}>
                  {seg.label}
                </button>
              ) : (
                <span className="crumb" data-current={seg.current}>{seg.label}</span>
              )}
            </span>
          ));
        })()}
      </nav>

      {/* Trois contrôles, haut droit : zoom avant, zoom arrière, recentrer.
          Icônes Font Awesome Free (CC BY 4.0) intégrées au bundle en SVG
          inline via free-solid-svg-icons : aucun appel tiers au runtime.
          Recentrer = crosshairs et non house : la maison ferait doublon
          avec le logotype, qui est déjà le retour à l'accueil. Estompage
          après 3 s d'inactivité (data-idle). */}
      {mode === 'webgl' && (
        <div ref={controlsRef} className="controls" aria-label="Contrôles de navigation">
          <button onClick={() => apiRef.current?.zoom(1)} aria-label="Zoom avant" title="Zoom avant (+)">
            <FaIcon icon={faMagnifyingGlassPlus} />
          </button>
          <button onClick={() => apiRef.current?.zoom(-1)} aria-label="Zoom arrière" title="Zoom arrière (-)">
            <FaIcon icon={faMagnifyingGlassMinus} />
          </button>
          <button onClick={() => apiRef.current?.recenter()} aria-label="Recentrer" title="Recentrer (0)">
            <FaIcon icon={faCrosshairs} />
          </button>
          {/* La loupe n'existe qu'à l'écran tactile : au clavier, Espace
              suffit. Sans elle, la légende mobile mentirait. */}
          <button
            className="controls-search"
            onClick={() => setSearchOpen(true)}
            aria-label="Chercher un genre, un artiste, un label"
            title="Chercher"
          >
            <FaIcon icon={faMagnifyingGlass} />
          </button>
        </div>
      )}

      {/* Légende de navigation : permanente, discrète, repliable. Chaque
          raccourci a été vérifié dans le code avant d'être écrit.

          CACHÉE PENDANT L'ACCUEIL. Elle s'affichait par-dessus l'écran de
          bienvenue, semi-transparente, et ses lignes se mélangeaient aux
          labels de la carte en fond : « chercher un genre, un artiste, un
          label » se lisait par-dessus « Power Electronics ». C'est la
          première chose que voit un visiteur, et des raccourcis clavier
          n'ont aucun sens avant d'être entré dans la carte. */}
      {mode === 'webgl' && !showWelcome && (
        <aside className="legend" data-collapsed={legendCollapsed}>
          <button className="legend-toggle" onClick={toggleLegend}>
            aide
          </button>
          {!legendCollapsed && (
            <>
              <ul className="legend-list legend-desktop">
                <li><kbd>/</kbd><span>chercher un genre, un artiste, un label</span></li>
                <li><kbd>Clic</kbd><span>ouvrir un genre, ses tracks et ses dérivés</span></li>
                <li><kbd>Molette</kbd><span>zoomer</span></li>
                <li><kbd>Glisser</kbd><span>se déplacer</span></li>
                <li><kbd>Échap</kbd><span>remonter d&apos;un niveau</span></li>
                <li><kbd>0</kbd><span>revenir à la vue d&apos;ensemble</span></li>
              </ul>
              <ul className="legend-list legend-mobile">
                <li><kbd>Toucher</kbd><span>ouvrir un genre et ses dérivés</span></li>
                <li><kbd>Pincer</kbd><span>zoomer</span></li>
                <li><kbd>Glisser</kbd><span>se déplacer</span></li>
                <li><kbd>Loupe</kbd><span>chercher</span></li>
              </ul>
            </>
          )}
        </aside>
      )}

      {searchOpen && (
        <SearchOverlay
          onPick={goToGenre}
          onListen={openTracks}
          onClose={() => {
            setSearchOpen(false);
            /* LE FOCUS REVIENT À LA CARTE. Sans cela il reste sur un élément
               démonté, donc nulle part, et les raccourcis du moteur qui
               ignorent les champs de saisie fonctionnent, mais pas ceux du
               canvas. On rend la main à ce qu'on regarde. */
            requestAnimationFrame(() => canvasRef.current?.focus());
          }}
        />
      )}

      {showWelcome && <Welcome views={VIEWS} current={view} onDismiss={dismissWelcome} />}

      {/* MONTÉ EN PERMANENCE, sans condition de mode : le démontage pendant
          la transition de vue détruisait l'iframe et coupait la lecture.
          La règle est absolue : la lecture survit à tout. */}
      <PlayerLayer
        panelGenre={panelGenre}
        demarrer={!showWelcome}
        onReopen={reopenPanel}
        onGoToGenre={goToGenre}
        onGoToFamily={(familyIndex: number) => apiRef.current?.goToFamily(familyIndex)}
        onFrameCurrent={() => apiRef.current?.frameCurrent()}
      />

      {/* Pied de page discret, présent dans TOUTES les vues : crédits, index
          ET le changement de vue, qui n'a plus de barre permanente. */}
      <span className="foot-links">
        {/* BASCULE et non liste depuis qu'il ne reste que deux vues : deux
            entrées côte à côte obligeaient à comparer deux teintes de gris
            pour savoir laquelle était active. Un bouton unique qui nomme sa
            DESTINATION dit à la fois où l'on est et où l'on va. */}
        {(() => {
          const autre = VIEWS.find((v) => v.id !== view);
          if (!autre) return null;
          return (
            <button
              className="foot-view"
              onClick={() => chooseView(autre.id)}
              title={autre.hint}
              aria-label={`Passer à la vue ${autre.label}`}
            >
              Vue {autre.label}
            </button>
          );
        })()}
        <span className="foot-sep" aria-hidden="true">·</span>
        <a className="credits-link" href="#/a-propos">À propos</a>
        <a className="credits-link" href="#/credits">Crédits</a>
        <a className="credits-link" href="#/index">Index</a>
      </span>

      {/* Le HUD « Mesures » est retiré (verdict : on s'en fout). Le système
          ?verify reste, c'est lui l'appareil de mesure. */}
    </div>
  );
}
