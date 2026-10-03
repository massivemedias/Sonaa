/* LES PLATINES : #/platines.
 *
 * Mika, le 3 octobre 2026 : « quelque chose de nouveau et revolutionnaire
 * pour sonaa.ca : mixer directement sur des platines. En ordinateur, deux
 * platines et une table au milieu ; en telephone, glisser a gauche et a
 * droite pour passer d'une platine a la table et a l'autre platine ».
 *
 * Les morceaux viennent d'Audius et non de l'atlas (voir audius.ts) : le son
 * de YouTube ne se laisse ni filtrer ni ralentir finement. Le son est
 * calcule dans le navigateur (moteur.ts) ; cette page ne fait que poser les
 * trois panneaux et faire circuler l'etat entre eux. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EnTeteSite } from '../atlas/EnTeteSite.tsx';
import { PiedDePage } from '../atlas/PiedDePage.tsx';
import { useLecteurPartage } from '../lecture/LecteurContexte.tsx';
import { t } from '../langue/langue.ts';
import type { MorceauAudius } from './audius.ts';
import { crossfader, gainDuFader, vitesse } from './calculs.ts';
import { NavigateurVue } from './NavigateurVue.tsx';
import { PlatineVue, type EtatPlatine } from './PlatineVue.tsx';
import { TableVue } from './TableVue.tsx';
import './platines.css';

const TELEPHONE = '(max-width: 899px)';
const ETAT_VIDE: EtatPlatine = { bpm: null, pitch: 0, enLecture: false };

export function PlatinesPage() {
  const { arreter } = useLecteurPartage();
  const [morceaux, setMorceaux] = useState<[MorceauAudius | null, MorceauAudius | null]>([null, null]);
  const [etats, setEtats] = useState<[EtatPlatine, EtatPlatine]>([ETAT_VIDE, ETAT_VIDE]);
  const [volumes, setVolumes] = useState({ a: 0.8, b: 0.8, croise: 0 });
  const [feuille, setFeuille] = useState<0 | 1 | null>(null);
  const [panneau, setPanneau] = useState(0);
  const scene = useRef<HTMLDivElement | null>(null);
  const bas = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.title = `${t.platinesTitre} · SONAA`;
  }, []);

  /* TOUT LE MATERIEL TIENT DANS L'ECRAN. Sur un portable de 13 pouces, la
     fenetre fait moins de 800 px de haut : la table et ses quatre voies n'y
     tiendraient pas, et mixer en faisant defiler la page, c'est perdre le
     crossfader de vue. La scene se reduit donc a la hauteur disponible,
     jamais sous 72 %, comme on recule d'un pas devant les machines. */
  useEffect(() => {
    const ajuster = (): void => {
      const s = scene.current;
      if (!s) return;
      s.style.removeProperty('zoom');
      if (window.matchMedia(TELEPHONE).matches) return;
      const haut = s.getBoundingClientRect().top + window.scrollY;
      const z = Math.max(0.72, Math.min(1, (window.innerHeight - haut - 24) / s.offsetHeight));
      if (z < 0.99) s.style.setProperty('zoom', z.toFixed(3));
    };
    ajuster();
    window.addEventListener('resize', ajuster);
    return () => window.removeEventListener('resize', ajuster);
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

  const charger = (m: MorceauAudius, i: 0 | 1): void => {
    /* Le petit lecteur du site joue peut-etre un morceau : deux sons a la
       fois, c'est un de trop. */
    arreter();
    setMorceaux((avant) => (i === 0 ? [m, avant[1]] : [avant[0], m]));
    setFeuille(null);
    aller(i === 0 ? 0 : 2);
  };

  const aller = (n: number): void => {
    const s = scene.current;
    if (!s || !window.matchMedia(TELEPHONE).matches) return;
    s.scrollTo({ left: n * s.clientWidth, behavior: 'smooth' });
  };

  const ouvrirNavigateur = (i: 0 | 1): void => {
    if (window.matchMedia(TELEPHONE).matches) setFeuille(i);
    else bas.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onglets = [t.platineNom('A'), t.tableNom, t.platineNom('B')];

  return (
    <>
      <EnTeteSite />
      <main className="pl-page">
        <header className="pl-tete">
          <h1 className="pl-titre">{t.platinesTitre}</h1>
          <p className="pl-chapeau">{t.platinesChapeau}</p>
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
            <PlatineVue index={0} morceau={morceaux[0]} onCharger={() => ouvrirNavigateur(0)} onEtat={onEtatA} />
          </div>
          <div className="pl-panneau">
            <TableVue bpm={bpm} onVolumes={setVolumes} />
          </div>
          <div className="pl-panneau">
            <PlatineVue index={1} morceau={morceaux[1]} onCharger={() => ouvrirNavigateur(1)} onEtat={onEtatB} />
          </div>
        </div>

        <div className="pl-bas" ref={bas}>
          <NavigateurVue cible={null} onChoisir={charger} />
        </div>

        {feuille !== null && (
          <div className="pl-feuille" role="dialog" aria-modal="true" aria-label={t.navigateurTitre}>
            <NavigateurVue cible={feuille} onChoisir={charger} onFermer={() => setFeuille(null)} />
          </div>
        )}
        <PiedDePage />
      </main>
    </>
  );
}
