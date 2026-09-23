/* LE NUAGE EST DE L'ARITHMETIQUE, ET C'EST ICI QU'ELLE SE TIENT.
 *
 * Une capture d'ecran dit qu'un nuage est joli. Elle ne dit pas que les
 * quatorze cercles sont tous la, qu'aucun n'en chevauche un autre, ni que
 * l'amas entre dans sa colonne : ce sont trois proprietes qui se mesurent,
 * et qui se casseraient sans bruit le jour ou le corpus gagne une famille
 * ou un genre.
 *
 * LE CHEVAUCHEMENT EST LE PLUS IMPORTANT DES TROIS. `packSiblings` rend des
 * cercles tangents ; si un changement de rayons les faisait se croiser, le
 * nuage resterait beau au premier coup d'oeil et deviendrait illisible la ou
 * deux noms se superposent. Un pixel de tolerance couvre l'arrondi. */

import { describe, expect, it } from 'vitest';
import { calculerNuage } from './NuageFamilles.tsx';
import { FAMILIES } from './structures.ts';

/** La colonne de contenu sur bureau, et la largeur utile d'un iPhone SE. */
const BUREAU = 1240;
const TELEPHONE = 343;

function seChevauchent(nuage: ReturnType<typeof calculerNuage>): string[] {
  const fautes: string[] = [];
  const b = nuage.bulles;
  for (let i = 0; i < b.length; i += 1) {
    for (let j = i + 1; j < b.length; j += 1) {
      const a = b[i];
      const c = b[j];
      if (!a || !c) continue;
      const d = Math.hypot(a.x - c.x, a.y - c.y);
      if (d < a.r + c.r - 1) fautes.push(`${a.fi} et ${c.fi}`);
    }
  }
  return fautes;
}

describe('Le nuage des familles', () => {
  it('pose une bulle par famille, et une seule', () => {
    const nuage = calculerNuage(BUREAU);
    expect(nuage.bulles).toHaveLength(FAMILIES.length);
    expect(new Set(nuage.bulles.map((b) => b.fi)).size).toBe(FAMILIES.length);
  });

  it('ne fait se chevaucher aucune paire, ni sur bureau ni sur telephone', () => {
    expect(seChevauchent(calculerNuage(BUREAU))).toEqual([]);
    expect(seChevauchent(calculerNuage(TELEPHONE))).toEqual([]);
  });

  it('tient dans la largeur donnee, et la plus etroite d abord', () => {
    expect(calculerNuage(BUREAU).largeur).toBeLessThanOrEqual(BUREAU);
    expect(calculerNuage(TELEPHONE).largeur).toBeLessThanOrEqual(TELEPHONE);
  });

  it('tient les bornes de diametre quand la largeur le permet', () => {
    const d = calculerNuage(BUREAU).bulles.map((b) => b.r * 2);
    expect(Math.max(...d)).toBeCloseTo(220, 0);
    expect(Math.min(...d)).toBeGreaterThanOrEqual(120);
  });

  /* LE PLANCHER DE 90 PX NE PEUT PAS TENIR SUR UN TELEPHONE, et ce n'est pas
     un reglage a corriger : quatorze disques de 90 px couvrent 89 000 px², un
     empilement rond en demande environ 111 000, soit un amas de 376 px de
     large. L'ecran en offre 343. Les rayons cedent donc, tous ensemble et
     dans le meme rapport, ce que ce test fixe pour que personne ne le
     "repare" en laissant le nuage deborder. */
  it('reduit tout le monde plutot que de deborder, sur telephone', () => {
    const nuage = calculerNuage(TELEPHONE);
    const d = nuage.bulles.map((b) => b.r * 2);
    expect(Math.max(...d)).toBeLessThan(120);
    const rapportDesAires = Math.max(...d) ** 2 / Math.min(...d) ** 2;
    const comptes = nuage.bulles.map((b) => FAMILIES[b.fi]?.count ?? 0);
    expect(rapportDesAires).toBeCloseTo(Math.max(...comptes) / Math.min(...comptes), 1);
  });

  it('donne la plus grande bulle a la famille la plus fournie', () => {
    const nuage = calculerNuage(BUREAU);
    const plusGrosse = [...nuage.bulles].sort((a, b) => b.r - a.r)[0];
    const plusFournie = FAMILIES.reduce(
      (meilleur, f, i) => (f.count > (FAMILIES[meilleur]?.count ?? 0) ? i : meilleur),
      0
    );
    expect(plusGrosse?.fi).toBe(plusFournie);
  });
});
