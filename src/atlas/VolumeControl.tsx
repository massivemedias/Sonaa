/* Le volume : une icône, et un curseur vertical qui s'ouvre au-dessus.

   Le curseur horizontal précédent occupait 48 px en largeur dans une rangée
   déjà serrée, et disparaissait purement et simplement en mobile. Vertical
   et escamotable, il ne prend plus de place qu'au moment où on s'en sert, et
   il existe sur toutes les tailles d'écran.

   L'icône dit le niveau (muet, faible, fort) et sert de bouton de coupure.
   Couper le son NE PERD PAS le niveau réglé : il est mémorisé et rendu au
   rétablissement, sans quoi rétablir obligerait à retrouver son réglage à
   l'oreille. */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  faVolumeHigh,
  faVolumeLow,
  faVolumeXmark,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

/** Même rendu que dans AtlasPage : SVG inline, aucun appel tiers. */
function FaIcon({ icon }: { icon: IconDefinition }) {
  const [w, h, , , path] = icon.icon;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="fa-icon" aria-hidden="true" focusable="false">
      <path fill="currentColor" d={Array.isArray(path) ? path.join(' ') : path} />
    </svg>
  );
}

interface Props {
  /** 0 à 100. La coupure est un volume à 0, pas un état séparé côté lecteur. */
  readonly volume: number;
  readonly onChange: (volume: number) => void;
}

/** Délai avant refermeture automatique. 1,5 s après la dernière interaction :
    assez pour reprendre la poignée, assez court pour ne pas gêner. */
const DELAI_FERMETURE = 1500;

export function VolumeControl({ volume, onChange }: Props) {
  const [ouvert, setOuvert] = useState(false);
  /* Le niveau d'avant la coupure. On ne le met à jour que sur un vrai
     réglage, jamais sur la coupure elle-même. */
  const avantCoupure = useRef(volume > 0 ? volume : 80);
  const minuterie = useRef<number | null>(null);
  const boiteRef = useRef<HTMLDivElement>(null);

  const armerLaFermeture = useCallback(() => {
    if (minuterie.current !== null) window.clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(() => setOuvert(false), DELAI_FERMETURE);
  }, []);

  const annulerLaFermeture = useCallback(() => {
    if (minuterie.current !== null) {
      window.clearTimeout(minuterie.current);
      minuterie.current = null;
    }
  }, []);

  useEffect(() => () => annulerLaFermeture(), [annulerLaFermeture]);

  /* Un clic ailleurs referme. Écoute posée seulement quand c'est ouvert :
     un écouteur global permanent sur un composant monté en permanence est
     une dépense inutile. */
  useEffect(() => {
    if (!ouvert) return;
    const ailleurs = (e: PointerEvent) => {
      if (!boiteRef.current?.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false);
    };
    document.addEventListener('pointerdown', ailleurs);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('pointerdown', ailleurs);
      document.removeEventListener('keydown', echap);
    };
  }, [ouvert]);

  function basculerLaCoupure() {
    if (volume > 0) {
      avantCoupure.current = volume;
      onChange(0);
    } else {
      onChange(avantCoupure.current || 80);
    }
  }

  function regler(v: number) {
    if (v > 0) avantCoupure.current = v;
    onChange(v);
    armerLaFermeture();
  }

  const icone = volume === 0 ? faVolumeXmark : volume < 50 ? faVolumeLow : faVolumeHigh;
  const etat = volume === 0 ? 'Son coupé' : `Volume ${Math.round(volume)} %`;

  return (
    <div
      className="pcol-vol"
      ref={boiteRef}
      onPointerEnter={() => {
        /* Le survol ouvre sur les pointeurs fins seulement : au doigt,
           « survoler » n'existe pas et le tap ferait double emploi. */
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
          annulerLaFermeture();
          setOuvert(true);
        }
      }}
      onPointerLeave={armerLaFermeture}
    >
      {ouvert && (
        <div
          className="pcol-vol-piste"
          onPointerEnter={annulerLaFermeture}
          onPointerDown={annulerLaFermeture}
          onPointerUp={armerLaFermeture}
        >
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            onChange={(e) => regler(Number(e.target.value))}
            aria-label="Volume"
            aria-orientation="vertical"
            autoFocus
          />
        </div>
      )}

      <button
        className="pcol-vol-bouton"
        onClick={basculerLaCoupure}
        /* Le tap ouvre le curseur, le clic coupe : sur écran tactile il faut
           les deux gestes sur la même cible, sans quoi le curseur serait
           inatteignable au doigt. */
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') {
            annulerLaFermeture();
            setOuvert((o) => !o);
          }
        }}
        aria-label={volume === 0 ? 'Rétablir le son' : 'Couper le son'}
        aria-pressed={volume === 0}
        title={etat}
      >
        <FaIcon icon={icone} />
      </button>
    </div>
  );
}
