/* Écran d'accueil. Une seule fois, au premier chargement.

   Le nom, ce que c'est, et LE CHOIX DE LA VUE (ADR-043) : quatre façons de
   lire la même carte, proposées dès l'entrée. Le choix se retient et se
   change à tout moment par le sélecteur en haut de l'écran. */

import { FAMILIES } from './structures.ts';
import type { ViewId } from './AtlasPage.tsx';

interface Props {
  views: { id: ViewId; label: string; hint: string }[];
  current: ViewId;
  onDismiss: (picked?: ViewId) => void;
}

export function Welcome({ views, current, onDismiss }: Props) {
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-label="Bienvenue">
      <div className="welcome-inner">
        <h1 className="welcome-name">
          <img
            src={`${import.meta.env.BASE_URL}brand/sonaa-logo.png`}
            alt="SONAA"
            draggable={false}
          />
        </h1>
        <p className="welcome-line">
          Un atlas des musiques électroniques, où chaque genre est relié à ce dont il vient
          et à ce qu&apos;il a donné.
        </p>

        <ul className="welcome-families" aria-label="Les quatorze familles">
          {FAMILIES.map((f) => (
            <li key={f.id}>
              <span
                className="welcome-dot"
                style={{ background: `oklch(0.72 0.15 ${f.hue})` }}
                aria-hidden="true"
              />
              {f.label}
            </li>
          ))}
        </ul>

        <p className="welcome-choose">Choisissez votre façon de lire la carte :</p>
        <div className="welcome-views" role="group" aria-label="Choisir la vue">
          {views.map((v) => (
            <button
              key={v.id}
              className="welcome-view"
              data-current={v.id === current}
              onClick={() => onDismiss(v.id)}
            >
              <strong>{v.label}</strong>
              <span>{v.hint}</span>
            </button>
          ))}
        </div>

        <button className="welcome-go" onClick={() => onDismiss()} autoFocus>
          Entrer
        </button>
      </div>
    </div>
  );
}
