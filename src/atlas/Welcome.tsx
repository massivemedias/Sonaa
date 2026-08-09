/* Écran d'accueil. Une seule fois, au premier chargement.

   Trois choses et rien d'autre : le nom, ce que c'est, comment on navigue. Il
   disparaît au premier clic et ne revient plus, mémorisé dans localStorage. Ce
   n'est pas une page d'accueil, c'est une légende de carte qu'on lit une fois. */

import { FAMILIES } from './structures.ts';

interface Props {
  onDismiss: () => void;
}

export function Welcome({ onDismiss }: Props) {
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-label="Bienvenue">
      <div className="welcome-inner">
        <h1 className="welcome-name">
          <img
            src={`${import.meta.env.BASE_URL}brand/sonaa-wordmark.png`}
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

        <dl className="welcome-keys">
          <dt>Glisser</dt>
          <dd>déplacer la carte</dd>
          <dt>Molette</dt>
          <dd>avancer et reculer</dd>
          <dt>Clic sur une sphère</dt>
          <dd>ouvrir sa fiche, puis ses tracks</dd>
          <dt>Espace</dt>
          <dd>chercher un genre par son nom</dd>
          <dt>Échap</dt>
          <dd>remonter d&apos;un niveau</dd>
        </dl>

        <button className="welcome-go" onClick={onDismiss} autoFocus>
          Entrer
        </button>
      </div>
    </div>
  );
}
