/* LA BANNIERE D'ACCUEIL, EN TETE DU CALENDRIER.
 *
 * Mika, le 19 septembre 2026, capture a l'appui : « refais la page d'accueil,
 * je veux que ca ressemble a Bandsintown ». Ce qui fait leur page n'est pas
 * leur turquoise, c'est leur structure : une promesse en tres gros, une
 * action immediate, un collage d'images, et les filtres juste dessous.
 * C'est cette structure qui est reprise ici.
 *
 * LE COLLAGE EST FAIT DE VRAIES AFFICHES, ET C'EST LA TOUTE LA DIFFERENCE.
 * Bandsintown y met des portraits d'artistes choisis par eux, qui n'encodent
 * rien. Ici, ce sont les affiches des PROCHAINES soirees de la ville
 * regardee, dans l'ordre des dates, cliquables vers leur fiche. Elles
 * changent donc chaque jour, elles disent quelque chose de vrai, et la regle
 * de DESIGN.md tient : une image a l'ecran porte une donnee, ou n'existe pas.
 *
 * AUCUNE REQUETE DE PLUS. Les soirees sont deja chargees par la page du
 * calendrier ; la banniere ne fait que lire les cinq premieres qui ont une
 * affiche. Une banniere qui irait chercher ses propres images ferait attendre
 * la page pour de la decoration.
 *
 * LES DEUX BOUTONS SONT DES RACCOURCIS, PAS DES ORNEMENTS : ils portent le
 * nombre de soirees et posent la meme vue que la liste deroulante « quand »
 * de la barre. Un bouton qui annonce zero soiree reste affiche et le dit,
 * plutot que de disparaitre et de laisser croire a un oubli. */

import { t } from '../langue/langue.ts';
import './hero.css';

export interface AfficheHero {
  readonly id: string;
  readonly titre: string;
  readonly affiche: string;
}

interface Props {
  readonly ville: string | null;
  readonly nCeSoir: number;
  readonly nWeekend: number;
  readonly affiches: readonly AfficheHero[];
  readonly onCeSoir: () => void;
  readonly onWeekend: () => void;
  readonly onVille: () => void;
  readonly onAffiche: (id: string) => void;
}

/* LES INCLINAISONS SONT ECRITES, PAS TIREES AU SORT. Un angle aleatoire
   change a chaque rendu de React, et le collage tremble des qu'on clique
   ailleurs sur la page. */
const ANGLES = [-7, 5, -3, 8, -5];

export function HeroAccueil({
  ville,
  nCeSoir,
  nWeekend,
  affiches,
  onCeSoir,
  onWeekend,
  onVille,
  onAffiche,
}: Props) {
  return (
    <section className="hero" aria-label={t.heroTitre}>
      <div className="hero-mots">
        <h1 className="hero-titre">{t.heroTitre}</h1>
        <p className="hero-phrase">{t.heroPhrase}</p>

        {/* SANS VILLE, UNE SEULE ACTION, ET C'EST LA BONNE. Un visiteur dont
            la ville n'est pas couverte, ou qui arrive sans reglage, voyait
            une page nue : c'est pourtant lui que cette banniere vise. Les
            compteurs n'ont alors rien a compter, le collage rien a montrer,
            et il reste ce qu'il faut faire d'abord, choisir sa ville. */}
        <div className="hero-actions">
          {ville ? (
            <>
              <button type="button" className="hero-bouton hero-bouton-plein" onClick={onCeSoir}>
                {t.heroCeSoir(nCeSoir)}
              </button>
              <button type="button" className="hero-bouton" onClick={onWeekend}>
                {t.heroWeekend(nWeekend)}
              </button>
              <button type="button" className="hero-ville" onClick={onVille}>
                <span className="hero-ville-nom">{ville}</span>
                <span className="hero-ville-mot">{t.heroVilleAutre}</span>
              </button>
            </>
          ) : (
            <button type="button" className="hero-bouton hero-bouton-plein" onClick={onVille}>
              {t.heroChoisirVille}
            </button>
          )}
        </div>
      </div>

      {affiches.length > 0 && (
        <div className="hero-collage" aria-label={t.heroAffiches}>
          {affiches.slice(0, ANGLES.length).map((a, i) => (
            <button
              key={a.id}
              type="button"
              className="hero-affiche"
              style={{ '--tour': `${ANGLES[i] ?? 0}deg` } as React.CSSProperties}
              onClick={() => onAffiche(a.id)}
              title={a.titre}
            >
              <img src={a.affiche} alt="" loading="lazy" decoding="async" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
