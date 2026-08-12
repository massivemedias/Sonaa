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

/* L'ACCROCHE, ecrite par Mika.

   Elle remplace « Un atlas des musiques electroniques, ou chaque genre est
   relie a ce dont il vient » : cette phrase decrivait ce que le site FAIT,
   celle-ci dit pourquoi il existe. C'est la difference entre une notice et
   une raison de rester.

   Elle est a la premiere personne et signee, donc mise en forme comme une
   voix : pas de guillemets, la signature suffit a dire qui parle. */
const ACCROCHE: readonly string[] = [
  "Je ne savais jamais dans quel style ranger un morceau.",
  "On me posait la question, je n'avais pas de réponse claire.",
  "J'ai fait cette carte pour ça. 218 genres, leurs filiations, et de quoi les écouter."
];
const SIGNATURE = 'Maudite Machine';

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
        {/* L'ACCROCHE, en attente du texte de Mika.

            La phrase ci-dessous dit ce que le site FAIT. Elle est correcte et
            elle ne donne aucune raison de rester. L'accroche, elle, doit dire
            pourquoi ce site existe : c'est la premiere chose que lit un
            visiteur, et la seule que liront ceux qui ne cliquent pas.

            Tant qu'ACCROCHE est vide, la description factuelle tient la place
            et rien ne casse. Des qu'elle est remplie, elle passe devant et la
            description devient une seconde ligne, plus discrete. */}
        <div className="welcome-accroche">
          {ACCROCHE.map((ligne) => (
            <p key={ligne}>{ligne}</p>
          ))}
          <p className="welcome-signature">{SIGNATURE}</p>
        </div>

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
