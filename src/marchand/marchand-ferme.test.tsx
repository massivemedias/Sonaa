// @vitest-environment jsdom
/* TANT QUE LA VENTE EST FERMEE, AUCUNE PORTE NE L'ANNONCE.
 *
 * Ce test ne verifie pas une classe ni une mise en page : il verifie qu'un
 * drapeau a `false` dans src/config.ts ferme TOUTES les portes d'un coup, et
 * il les relit toutes, pas celle qu'on vient de modifier.
 *
 * POURQUOI IL EXISTE. La phase 0 avait ouvert quatre portes vers la vente,
 * dans quatre fichiers differents : la rangee du bureau, la barre du
 * telephone, le bouton « Plus » et, croyait-on, le pied de page. Depuis le
 * 9 novembre 2026, le telephone n'a plus que le menu hamburger. Fermer a la
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
import { MenuHamburger } from '../atlas/MenuHamburger.tsx';

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

/* Le menu hamburger se deplie au clic ; on le rend ouvert en cliquant dessus,
   sinon ses liens ne sont pas dans le document et le test passerait pour une
   mauvaise raison. Depuis le 9 novembre 2026, c'est la seule navigation du
   telephone : la barre du bas et le bouton « Plus » sont retires. */
function menuDeplie(): void {
  render(<MenuHamburger />);
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

  it('ne rend ni Tracks ni Panier dans le menu du telephone', () => {
    menuDeplie();
    const adresses = screen.queryAllByRole('link').map((l) => l.getAttribute('href'));
    /* Le menu doit bien etre ouvert, sinon l'absence ne prouve rien. */
    expect(adresses.length).toBeGreaterThan(0);
    expect(adresses).not.toContain('#/tracks');
    expect(adresses).not.toContain('#/panier');
  });

  it('rend chaque page principale une seule fois dans le menu du telephone', () => {
    menuDeplie();
    const adresses = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    for (const page of ['#/calendrier', '#/parcourir', '#/labels', '#/clubs', '#/mixtapes', '#/news']) {
      expect(adresses.filter((a) => a === page)).toHaveLength(1);
    }
    /* la carte en trois dimensions est supprimee */
    expect(adresses).not.toContain('#/carte');
  });
});
