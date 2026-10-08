/* LE SPECTRE : LES 219 STYLES, DEBOUT, EN OUVERTURE DE L'ACCUEIL.
 *
 * Mika, le 8 octobre 2026 : « il faut un effet wow quand on arrive sur le
 * site ». Le wow est ici une donnee, comme le veut DESIGN.md : chaque trait
 * est un style de l'atlas, teinte par sa famille, haut comme son tempo, et
 * les familles se suivent dans l'ordre de l'atlas, chaque style a sa date
 * de naissance. A l'arrivee, les traits montent de gauche a droite comme
 * un analyseur au moment ou le morceau part ; ensuite ils ne bougent plus.
 * Le survol nomme le style, le clic l'ouvre.
 *
 * Pas de WebGL, pas de particules, pas de parallaxe : 219 elements, une
 * animation CSS jouee une fois, coupee par prefers-reduced-motion. */

import { useMemo, useState } from 'react';
import { FAMILIES, STRUCTURES } from '../atlas/structures.ts';
import { slug } from '../lib/chemins.ts';
import { t } from '../langue/langue.ts';

interface Trait {
  readonly id: string;
  readonly nom: string;
  readonly famille: string;
  readonly hue: number;
  readonly bpm: number;
  readonly annee: number;
  readonly chemin: string;
  /** La hauteur, de 0 a 1. */
  readonly h: number;
}

/* UN TEMPO NUL (l'ambient n'en a pas) garde un trait visible ; au-dela de
   210, le speedcore touche le plafond et y reste. */
const hauteur = (bpm: number): number => 0.12 + 0.88 * Math.min(1, Math.max(0, (bpm - 60) / 150));

export function Spectre() {
  const traits = useMemo((): readonly Trait[] => {
    const out: Trait[] = [];
    FAMILIES.forEach((f, fi) => {
      const genres = [...(STRUCTURES[fi]?.genres ?? [])].sort((a, b) => a.annee - b.annee);
      for (const g of genres) {
        out.push({
          id: g.id,
          nom: g.label,
          famille: f.label,
          hue: f.hue,
          bpm: g.bpm,
          annee: g.annee,
          chemin: `/styles/${slug(f.label)}/${slug(g.label)}/`,
          h: hauteur(g.bpm),
        });
      }
    });
    return out;
  }, []);
  const [survol, setSurvol] = useState<Trait | null>(null);

  return (
    <div className="ac-spectre-cadre">
      <p className="ac-spectre-legende" aria-live="polite">
        {survol ? (
          <>
            <strong>{survol.nom}</strong>
            <span>{[survol.famille, survol.bpm > 0 ? `${survol.bpm} BPM` : null, survol.annee].filter(Boolean).join(' · ')}</span>
          </>
        ) : (
          <span>{t.accueilSpectreAide(traits.length)}</span>
        )}
      </p>
      {/* HORS DU CLAVIER : 219 liens a traverser a la tabulation avant le
          premier bouton seraient un mur. Les styles se rejoignent par
          l'atlas, que le bouton juste au-dessus ouvre. */}
      <div className="ac-spectre" aria-hidden="true" onMouseLeave={() => setSurvol(null)}>
        {traits.map((x, i) => (
          <a
            key={x.id}
            href={x.chemin}
            tabIndex={-1}
            className="ac-trait"
            data-actif={survol?.id === x.id}
            style={{
              ['--h' as string]: x.h,
              ['--i' as string]: i,
              ['--teinte' as string]: x.hue,
            }}
            onMouseEnter={() => setSurvol(x)}
          />
        ))}
      </div>
    </div>
  );
}
