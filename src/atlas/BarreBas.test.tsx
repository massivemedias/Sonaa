// @vitest-environment jsdom
/* LA BARRE DU BAS : quatre portes, la bonne allumee, et une trace sur le
   corps de page tant qu'elle est la. Ce dernier point est ce que les feuilles
   de style lisent pour cacher le menu du haut et reserver la place : s'il
   tombe, le menu du haut revient et la barre recouvre le pied de page. */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BarreBas, CLASSE_AVEC_BARRE } from './BarreBas.tsx';

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('BarreBas', () => {
  it('porte quatre onglets, dans l ordre Calendar, Styles, Sons, Profil', () => {
    render(<BarreBas />);
    const liens = screen.getAllByRole('link');
    expect(liens.map((l) => l.getAttribute('href'))).toEqual([
      '#/calendrier',
      '#/parcourir',
      '#/sets',
      '#/profil',
    ]);
  });

  it('allume l onglet de la page courante, et un seul', () => {
    window.location.hash = '#/sets/abc';
    render(<BarreBas />);
    const courants = screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page');
    expect(courants).toHaveLength(1);
    expect(courants[0]?.getAttribute('href')).toBe('#/sets');
  });

  it('a la racine, c est le Calendar qui est allume', () => {
    window.location.hash = '';
    render(<BarreBas />);
    const courant = screen.getAllByRole('link').find((l) => l.getAttribute('aria-current') === 'page');
    expect(courant?.getAttribute('href')).toBe('#/calendrier');
  });

  it('marque le corps de page tant qu elle est rendue, et le nettoie apres', () => {
    const { unmount } = render(<BarreBas />);
    expect(document.body.classList.contains(CLASSE_AVEC_BARRE)).toBe(true);
    unmount();
    expect(document.body.classList.contains(CLASSE_AVEC_BARRE)).toBe(false);
  });
});
