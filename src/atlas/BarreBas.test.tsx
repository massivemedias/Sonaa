// @vitest-environment jsdom
/* LA BARRE DU BAS : les portes de l'etat courant, la bonne allumee, et une
   trace sur le corps de page tant qu'elle est la. Ce dernier point est ce que les feuilles
   de style lisent pour cacher le menu du haut et reserver la place : s'il
   tombe, le menu du haut revient et la barre recouvre le pied de page. */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BarreBas, CLASSE_AVEC_BARRE } from './BarreBas.tsx';
import { t } from '../langue/langue.ts';
import { MARCHAND_ACTIF } from '../config.ts';

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('BarreBas', () => {
  /* L'ORDRE DEPEND DU DRAPEAU MARCHAND, et le test le dit au lieu de figer
     l'un des deux etats : vente ouverte, Tracks et le Panier prennent deux
     places et Styles vit dans le bouton « Plus » ; vente fermee, Styles
     revient et la barre tombe a quatre onglets. Voir src/config.ts.

     Le cas ferme est verifie plus finement dans
     src/marchand/marchand-ferme.test.tsx, avec les portes des trois menus. */
  it('porte les onglets de l etat courant de la couche marchande', () => {
    render(<BarreBas />);
    const liens = screen.getAllByRole('link');
    expect(liens.map((l) => l.getAttribute('href'))).toEqual(
      MARCHAND_ACTIF
        ? ['#/calendrier', '#/tracks', '#/mixtapes', '#/reconnaitre/ecouter', '#/news', '#/panier']
        : ['#/calendrier', '#/parcourir', '#/reconnaitre/ecouter', '#/mixtapes', '#/news']
    );
  });

  /* LE GESTE « TRACK ID » EST AU MILIEU, et il se nomme en entier pour un
     lecteur d'ecran : le mot court sous la pastille ne dit pas ce qu'il
     fait. Mika, le 30 septembre 2026. */
  it('porte le geste de reconnaissance au milieu, nomme en entier', () => {
    render(<BarreBas />);
    const geste = screen.getByRole('link', { name: t.trackId });
    expect(geste.getAttribute('href')).toBe('#/reconnaitre/ecouter');
  });

  /* L'ANCIENNE ANCRE DOIT SURVIVRE. #/sets a ete l'adresse publique des
     mixtapes du 2 au 17 septembre 2026 : elle est dans des liens partages et
     dans les pages indexees. Elle allume le meme onglet. */
  it('l ancienne ancre #/sets allume toujours l onglet Mixtapes', () => {
    window.location.hash = '#/sets';
    render(<BarreBas />);
    const courants = screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page');
    expect(courants).toHaveLength(1);
    expect(courants[0]?.getAttribute('href')).toBe('#/mixtapes');
  });

  it('allume l onglet de la page courante, et un seul', () => {
    window.location.hash = '#/sets/abc';
    render(<BarreBas />);
    const courants = screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page');
    expect(courants).toHaveLength(1);
    expect(courants[0]?.getAttribute('href')).toBe('#/mixtapes');
  });

  /* La racine est l'accueil depuis le 8 octobre 2026 : il n'a pas
     d'onglet, aucun ne s'allume. Le Calendar s'allume sur sa propre ancre. */
  it('a la racine, aucun onglet n est allume', () => {
    window.location.hash = '';
    render(<BarreBas />);
    const courants = screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page');
    expect(courants).toHaveLength(0);
  });

  it('sur #/calendrier, c est le Calendar qui est allume', () => {
    window.location.hash = '#/calendrier';
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
