/* LES DECKS : #/decks (et #/platines, l'ancienne adresse).
 *
 * Mika, le 3 octobre 2026 : « quelque chose de nouveau et revolutionnaire
 * pour sonaa.ca : mixer directement sur des platines. En ordinateur, deux
 * platines et une table au milieu ; en telephone, glisser a gauche et a
 * droite pour passer d'une platine a la table et a l'autre platine ».
 *
 * Les morceaux viennent d'Audius et non de l'atlas (voir audius.ts) : le son
 * de YouTube ne se laisse ni filtrer ni ralentir finement. Le son est
 * calcule dans le navigateur (moteur.ts) ; cette page ne fait que poser les
 * trois panneaux et faire circuler l'etat entre eux.
 *
 * LE NAVIGATEUR S'OUVRE DANS LA PLATINE, depuis le 3 octobre 2026 : Mika ne
 * voulait plus de la liste sous les machines, mais dans la platine ou il a
 * clique, comme l'ecran de navigation d'une CDJ.
 *
 * LA FINITION : noire, ou blanche comme la version claire de la MM-808. Le
 * site reste sombre ; seules les machines changent de robe. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EnTeteSite } from '../atlas/EnTeteSite.tsx';
import { PiedDePage } from '../atlas/PiedDePage.tsx';
import { useLecteurPartage } from '../lecture/LecteurContexte.tsx';
import { t } from '../langue/langue.ts';
import { FichierRefuse, ajouterFichier } from './caisse.ts';
import type { Morceau } from './morceau.ts';
import { crossfader, gainDuFader, vitesse } from './calculs.ts';
import { NavigateurVue } from './NavigateurVue.tsx';
import { PlatineVue, type EtatPlatine } from './PlatineVue.tsx';
import { TableVue } from './TableVue.tsx';
import './platines.css';

const TELEPHONE = '(max-width: 899px)';
const CLE_FINITION = 'sonaa-platines-finition';
type Finition = 'noire' | 'blanche';
const ETAT_VIDE: EtatPlatine = { bpm: null, pitch: 0, enLecture: false };

export function PlatinesPage() {
  const { arreter } = useLecteurPartage();
  const [morceaux, setMorceaux] = useState<[Morceau | null, Morceau | null]>([null, null]);
  const [etats, setEtats] = useState<[EtatPlatine, EtatPlatine]>([ETAT_VIDE, ETAT_VIDE]);
  const [volumes, setVolumes] = useState({ a: 0.8, b: 0.8, croise: 0 });
  const [navigateurSur, setNavigateurSur] = useState<0 | 1 | null>(null);
  const [panneau, setPanneau] = useState(0);
  const scene = useRef<HTMLDivElement | null>(null);
  const [finition, setFinition] = useState<Finition>(() => {
    try {
      return localStorage.getItem(CLE_FINITION) === 'blanche' ? 'blanche' : 'noire';
    } catch {
      return 'noire';
    }
  });
  const choisirFinition = (f: Finition): void => {
    setFinition(f);
    try {
      localStorage.setItem(CLE_FINITION, f);
    } catch {
      /* rien a retenir */
    }
  };

  useEffect(() => {
    document.title = `${t.platinesTitre} · SONAA`;
  }, []);

  /* TOUT LE MATERIEL TIENT DANS L'ECRAN, en largeur comme en hauteur. Les
     machines ont leur largeur de machine (voir platines.css) : sur un
     portable de 13 pouces, une tablette couchee ou une fenetre etroite, la
     scene se reduit plutot que de les ecraser, et le crossfader reste en
     vue. Jamais sous 55 % : en dessous, c'est le telephone, qui fait glisser
     les machines une a une. */
  useEffect(() => {
    const ajuster = (): void => {
      const s = scene.current;
      if (!s) return;
      s.style.removeProperty('zoom');
      if (window.matchMedia(TELEPHONE).matches) return;
      const parent = s.parentElement;
      const marges = parent ? getComputedStyle(parent) : null;
      const dispo = parent && marges ? parent.clientWidth - parseFloat(marges.paddingLeft) - parseFloat(marges.paddingRight) : s.clientWidth;
      const largeur = dispo / Math.max(1, s.scrollWidth);
      const haut = s.getBoundingClientRect().top + window.scrollY;
      const hauteur = (window.innerHeight - haut - 24) / Math.max(1, s.offsetHeight);
      const z = Math.max(0.55, Math.min(1, largeur, hauteur));
      if (z < 0.99) s.style.setProperty('zoom', z.toFixed(3));
    };
    ajuster();
    window.addEventListener('resize', ajuster);
    return () => window.removeEventListener('resize', ajuster);
  }, []);

  /* L'ancienne adresse #/platines devient #/decks dans la barre d'adresse. */
  useEffect(() => {
    if (window.location.hash.startsWith('#/platines')) window.history.replaceState(null, '', '#/decks');
  }, []);

  const onEtatA = useCallback((e: EtatPlatine) => setEtats((x) => [e, x[1]]), []);
  const onEtatB = useCallback((e: EtatPlatine) => setEtats((x) => [x[0], e]), []);

  /* LE TEMPO DES EFFETS : celui de la platine qu'on entend le plus, son
     pitch compris. Sans platine qui joue, 120. */
  const bpm = useMemo(() => {
    const x = crossfader(volumes.croise);
    const poids = [gainDuFader(volumes.a) * x.a, gainDuFader(volumes.b) * x.b];
    let meilleur = { poids: -1, bpm: 120 };
    etats.forEach((e, i) => {
      const p = (e.enLecture ? 1 : 0.001) * (poids[i] ?? 0);
      if (e.bpm && p > meilleur.poids) meilleur = { poids: p, bpm: e.bpm * vitesse(e.pitch) };
    });
    return meilleur.bpm;
  }, [etats, volumes]);

  const charger = (m: Morceau, i: 0 | 1): void => {
    /* Le petit lecteur du site joue peut-etre un morceau : deux sons a la
       fois, c'est un de trop. */
    arreter();
    setMorceaux((avant) => (i === 0 ? [m, avant[1]] : [avant[0], m]));
    setNavigateurSur(null);
    aller(i === 0 ? 0 : 2);
  };

  /* UN FICHIER LACHE SUR UNE PLATINE : il entre dans la caisse (lu,
     analyse), puis se charge. */
  const [annonce, setAnnonce] = useState<string | null>(null);
  const deposer = (f: File, i: 0 | 1): void => {
    setAnnonce(t.caisseAnalyse(1, 1));
    ajouterFichier(f)
      .then((m) => {
        setAnnonce(null);
        charger(m, i);
      })
      .catch((e: unknown) => setAnnonce(e instanceof FichierRefuse && e.raison === 'trop-long' ? t.caisseTropLong(f.name) : t.caisseIllisible(f.name)));
  };

  /* Un fichier lache a cote d'une cible ne doit pas remplacer la page par
     sa lecture, ce que fait le navigateur par defaut. */
  useEffect(() => {
    const retenir = (e: globalThis.DragEvent): void => {
      if ([...(e.dataTransfer?.types ?? [])].includes('Files')) e.preventDefault();
    };
    window.addEventListener('dragover', retenir);
    window.addEventListener('drop', retenir);
    return () => {
      window.removeEventListener('dragover', retenir);
      window.removeEventListener('drop', retenir);
    };
  }, []);

  const aller = (n: number): void => {
    const s = scene.current;
    if (!s || !window.matchMedia(TELEPHONE).matches) return;
    s.scrollTo({ left: n * s.clientWidth, behavior: 'smooth' });
  };

  /* La touche de chargement ouvre le navigateur dans sa platine, et le
     referme si on la presse encore. */
  const basculerNavigateur = (i: 0 | 1): void => setNavigateurSur((n) => (n === i ? null : i));
  const navigateurDe = (i: 0 | 1) =>
    navigateurSur === i ? <NavigateurVue cible={i} onChoisir={charger} onFermer={() => setNavigateurSur(null)} /> : null;

  const onglets = [t.platineNom('A'), t.tableNom, t.platineNom('B')];

  return (
    <>
      <EnTeteSite />
      <main className="pl-page" data-finition={finition}>
        <header className="pl-tete">
          <h1 className="pl-titre">{t.platinesTitre}</h1>
          <p className="pl-chapeau">{t.platinesChapeau}</p>
          <div className="pl-finition" role="group" aria-label={t.platinesFinition}>
            {(['noire', 'blanche'] as const).map((f) => (
              <button key={f} type="button" aria-pressed={finition === f} onClick={() => choisirFinition(f)}>
                <span className={`pl-finition-pastille pl-finition-${f}`} aria-hidden="true" />
                {f === 'noire' ? t.platinesFinitionNoire : t.platinesFinitionBlanche}
              </button>
            ))}
          </div>
        </header>

        <nav className="pl-onglets" aria-label={t.platinesGlisser}>
          {onglets.map((o, i) => (
            <button key={o} type="button" aria-pressed={panneau === i} onClick={() => aller(i)}>
              {o}
            </button>
          ))}
        </nav>

        <div
          className="pl-scene"
          ref={scene}
          onScroll={(e) => {
            const s = e.currentTarget;
            setPanneau(Math.round(s.scrollLeft / Math.max(1, s.clientWidth)));
          }}
        >
          <div className="pl-panneau">
            <PlatineVue
              index={0}
              morceau={morceaux[0]}
              onCharger={() => basculerNavigateur(0)}
              onEtat={onEtatA}
              onDeposer={(f) => deposer(f, 0)}
              navigateur={navigateurDe(0)}
            />
          </div>
          <div className="pl-panneau">
            <TableVue bpm={bpm} onVolumes={setVolumes} />
          </div>
          <div className="pl-panneau">
            <PlatineVue
              index={1}
              morceau={morceaux[1]}
              onCharger={() => basculerNavigateur(1)}
              onEtat={onEtatB}
              onDeposer={(f) => deposer(f, 1)}
              navigateur={navigateurDe(1)}
            />
          </div>
        </div>

        <p className="pl-annonce" role="status">
          {annonce}
        </p>
        <PiedDePage />
      </main>
    </>
  );
}
