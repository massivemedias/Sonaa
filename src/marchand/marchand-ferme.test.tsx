// @vitest-environment jsdom
/* TANT QUE LA VENTE EST FERMEE, AUCUNE PORTE NE L'ANNONCE.
 *
 * Ce test ne verifie pas une classe ni une mise en page : il verifie qu'un
 * drapeau a `false` dans src/config.ts ferme TOUTES les portes d'un coup, et
 * il les relit toutes, pas celle qu'on vient de modifier.
 *
 * POURQUOI IL EXISTE. La phase 0 avait ouvert quatre portes vers la vente,
 * dans quatre fichiers differents : la rangee du bureau, la barre du
 * telephone, le bouton « Plus » et, croyait-on, le pied de page. Fermer a la
 * main, c'est fermer trois portes sur quatre et decouvrir la quatrieme en
 * production. Le drapeau existe pour cela, et ce test est ce qui garantit
 * que le drapeau suffit.
 *
 * IL LIT LES LIBELLES ET LES ADRESSES. Un libelle peut changer de mot sans
 * changer d'adresse, et une adresse peut rester dans le code sans etre
 * rendue : les deux sont donc verifies. */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MARCHAND_ACTIF } from '../config.ts';
import { t } from '../langue/langue.ts';
import { SiteNav } from '../atlas/SiteNav.tsx';
import { BarreBas } from '../atlas/BarreBas.tsx';
import { MenuPlus } from '../atlas/MenuPlus.tsx';

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

/* Le menu « Plus » se deplie au clic ; on le rend ouvert en cliquant dessus,
   sinon ses liens ne sont pas dans le document et le test passerait pour une
   mauvaise raison. */
function menuPlusDeplie(): void {
  render(<MenuPlus />);
  fireEvent.click(screen.getByRole('button', { expanded: false }));
}

describe('la couche marchande fermee', () => {
  it('est bien fermee : sans cela, tout ce qui suit ne prouve rien', () => {
    expect(MARCHAND_ACTIF).toBe(false);
  });

  it('ne rend ni Tracks ni Panier dans la rangee du bureau', () => {
    render(<SiteNav variant="page" />);
    const liens = screen.getAllByRole('link');
    const adresses = liens.map((l) => l.getAttribute('href'));
    expect(adresses).not.toContain('#/tracks');
    expect(adresses).not.toContain('#/panier');
    const mots = liens.map((l) => l.textContent ?? '');
    expect(mots).not.toContain(t.lesTracks);
    expect(mots).not.toContain(t.lePanier);
  });

  it('ne rend ni Tracks ni Panier dans la barre du telephone', () => {
    render(<BarreBas />);
    const liens = screen.getAllByRole('link');
    const adresses = liens.map((l) => l.getAttribute('href'));
    expect(adresses).not.toContain('#/tracks');
    expect(adresses).not.toContain('#/panier');
  });

  it('ne rend ni Tracks ni Panier dans le bouton Plus', () => {
    menuPlusDeplie();
    const adresses = screen.queryAllByRole('link').map((l) => l.getAttribute('href'));
    expect(adresses).not.toContain('#/tracks');
    expect(adresses).not.toContain('#/panier');
  });

  /* LA CONTREPARTIE DU 17 SEPTEMBRE EST RENDUE. Styles avait quitte la barre
     du bas pour faire place a Tracks et au Panier ; il y revient, et il sort
     du bouton « Plus » pour ne pas y etre deux fois. */
  it('rend Styles dans la barre du telephone, et une seule fois', () => {
    render(<BarreBas />);
    const adresses = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(adresses).toEqual(['#/calendrier', '#/parcourir', '#/mixtapes', '#/news']);
  });

  it('ne redit pas Styles dans le bouton Plus', () => {
    menuPlusDeplie();
    const adresses = screen.queryAllByRole('link').map((l) => l.getAttribute('href'));
    /* Le menu doit bien etre ouvert, sinon l'absence ne prouve rien. */
    expect(adresses.length).toBeGreaterThan(0);
    expect(adresses).not.toContain('#/parcourir');
  });
});
