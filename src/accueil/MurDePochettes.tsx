/* LE MUR DE POCHETTES, DERRIERE LE TITRE DE L'ACCUEIL.
 *
 * Mika, le 10 octobre 2026, devant la premiere version (le spectre des
 * styles sous un grand titre) : « j'aime pas la presentation de la premiere
 * page, il faut quelque chose de plus attrayant, eventuellement en
 * parallaxe ». L'ouverture devient un mur de pochettes de l'atlas, en
 * colonnes legerement inclinees :
 *
 *   chaque colonne derive lentement, vers le haut ou vers le bas, sans fin ;
 *   au defilement, les colonnes montent a des vitesses differentes, et le
 *   mur s'approche un peu : la profondeur.
 *
 * La derive est une animation en temps, le parallaxe une animation liee au
 * defilement (voir accueil.css) : deux elements distincts, pour que l'une
 * n'ecrase pas l'autre. Les deux s'arretent pour qui demande moins de
 * mouvement. Le mur est decoratif pour un lecteur d'ecran : il est cache. */

import { useMemo } from 'react';
import { pochettesDuMur } from './pochettes.ts';

const COLONNES = 8;
const PAR_COLONNE = 6;
/* Les vitesses de parallaxe, en pixels de montee sur la hauteur de
   l'ouverture, et les durees de derive, en secondes : differentes d'une
   colonne a sa voisine, pour que rien ne bouge en bloc. */
const VITESSES = [-260, -120, -340, -60, -300, -160, -380, -90];
const DUREES = [92, 118, 84, 130, 100, 76, 110, 96];

export function MurDePochettes() {
  const colonnes = useMemo(() => {
    const toutes = pochettesDuMur(COLONNES * PAR_COLONNE);
    return Array.from({ length: COLONNES }, (_, c) => toutes.slice(c * PAR_COLONNE, (c + 1) * PAR_COLONNE));
  }, []);

  return (
    <div className="ac-mur-cadre" aria-hidden="true">
      <div className="ac-mur">
        {colonnes.map((col, c) => (
          <div className="ac-mur-col" key={c} style={{ ['--v' as string]: `${VITESSES[c] ?? -100}px` }}>
            <div
              className="ac-mur-bande"
              style={{
                ['--d' as string]: `${DUREES[c] ?? 100}s`,
                animationDirection: c % 2 === 0 ? 'normal' : 'reverse',
              }}
            >
              {/* LA COLONNE DEUX FOIS, a la suite : la derive parcourt la
                  moitie de la bande et repart d'ou elle est, sans saut. */}
              {[...col, ...col].map((src, i) => (
                <img key={i} src={src} alt="" loading="lazy" decoding="async" draggable={false} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
