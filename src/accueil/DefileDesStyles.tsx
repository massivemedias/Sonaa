/* LE DEFILE DES STYLES, DANS LA SECTION DES STYLES DE L'ACCUEIL.
 *
 * Il remplace le spectre (un trait par style, haut comme son tempo) le
 * 10 octobre 2026. Mika, capture a l'appui : « j'aime pas ce design,
 * change ». Les 219 noms passent en trois rangs de grandes lettres, qui
 * defilent en sens contraires : plein, en contour, plein. Le point devant
 * chaque nom porte la teinte de sa famille, et le nom la prend au survol.
 * Un clic ouvre le style.
 *
 * Le defilement continu est une animation CSS ; au survol, le rang
 * s'arrete pour qu'on puisse viser. Au defilement de la page, chaque rang
 * glisse un peu de cote en plus (voir accueil.css). Qui demande moins de
 * mouvement voit trois rangs immobiles. Le bandeau est cache aux lecteurs
 * d'ecran et hors du clavier : 219 liens en double, avant la porte de
 * l'atlas, seraient un mur. */

import { useMemo } from 'react';
import { FAMILIES, STRUCTURES } from '../atlas/structures.ts';
import { slug } from '../lib/chemins.ts';

interface Nom {
  readonly id: string;
  readonly nom: string;
  readonly hue: number;
  readonly chemin: string;
}

const RANGS = 3;
/* La duree d'un tour complet, en secondes : lente, et differente d'un rang
   a l'autre pour que rien ne bouge en bloc. */
const DUREES = [150, 170, 140];

export function DefileDesStyles() {
  const rangs = useMemo(() => {
    /* LES FAMILLES ENTREMELEES : un nom de chaque famille a tour de role,
       pour que chaque rang melange les couleurs. */
    const parFamille = FAMILIES.map((f, fi) =>
      (STRUCTURES[fi]?.genres ?? []).map((g): Nom => ({ id: g.id, nom: g.label, hue: f.hue, chemin: `/styles/${slug(f.label)}/${slug(g.label)}/` }))
    );
    const tous: Nom[] = [];
    for (let rang = 0; parFamille.some((l) => l.length > rang); rang += 1) {
      for (const l of parFamille) {
        const n = l[rang];
        if (n) tous.push(n);
      }
    }
    return Array.from({ length: RANGS }, (_, r) => tous.filter((_n, i) => i % RANGS === r));
  }, []);

  return (
    <div className="ac-defile" aria-hidden="true">
      {rangs.map((noms, r) => (
        <div className={`ac-defile-rang ac-defile-rang-${r + 1}`} key={r}>
          <div
            className="ac-defile-piste"
            style={{
              ['--d' as string]: `${DUREES[r] ?? 150}s`,
              animationDirection: r % 2 === 0 ? 'normal' : 'reverse',
            }}
          >
            {/* LE RANG DEUX FOIS, a la suite : le tour parcourt la moitie de
                la piste et repart d'ou il est, sans saut. */}
            {[...noms, ...noms].map((n, i) => (
              <a key={`${n.id}-${i}`} href={n.chemin} tabIndex={-1} className="ac-defile-nom" style={{ ['--teinte' as string]: n.hue }}>
                <i aria-hidden="true" />
                {n.nom}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
