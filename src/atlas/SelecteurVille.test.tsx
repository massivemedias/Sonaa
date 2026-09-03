/* @vitest-environment jsdom */

/* LE SELECTEUR SE PARCOURT AU CLAVIER SEUL, ET C'EST VERIFIE ICI.
 *
 * POURQUOI UN TEST PLUTOT QU'UNE VERIFICATION A L'ECRAN. Le panneau d'apercu
 * de cet outil transmet la frappe mais pas les touches de direction ni
 * Entree : mesure faite, « to » arrive dans le champ, Fleche bas et Entree
 * n'arrivent nulle part. Conclure « le clavier marche » de ce silence aurait
 * ete exactement le genre d'affirmation qu'on ne peut pas soutenir.
 *
 * `user-event` produit de vrais evenements clavier sur un vrai DOM : keydown,
 * keypress, input, dans l'ordre, avec les valeurs qu'un navigateur envoie. Ce
 * n'est pas une simulation d'appel de fonction, c'est la meme chaine que
 * celle qu'un doigt declenche. Et cela restera vrai dans six mois, ce qu'une
 * verification a la main ne garantit pas.
 */

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SelecteurVille } from './SelecteurVille.tsx';
import type { Ville } from '../lib/ville-active.ts';

afterEach(cleanup);

const v = (slug: string, name: string, pays: string, pop: number, region: string): Ville => ({
  id: `id-${slug}`,
  slug,
  name,
  name_ascii: name.normalize('NFD').replace(/[̀-ͯ]/g, ''),
  admin_region: region,
  country_code: pays,
  timezone: 'America/Toronto',
  population: pop,
  ra_area_id: 1,
});

const VILLES = [
  v('tokyo-jp', 'Tokyo', 'JP', 14264798, 'Tokyo'),
  v('toronto-ca', 'Toronto', 'CA', 2794356, 'Ontario'),
  v('montreal-ca', 'Montréal', 'CA', 1895211, 'Québec'),
];

function poser(onChoisir = vi.fn()) {
  render(
    <SelecteurVille
      villes={VILLES}
      choisie={null}
      onChoisir={onChoisir}
      etiquette="Votre ville"
    />
  );
  return { onChoisir, champ: screen.getByRole('searchbox') };
}

/* LE TEMPS N'EST PAS SIMULE, ET C'EST UN CHOIX APRES MESURE.
   Les faux minuteurs de vitest et `user-event` se marchent dessus : le
   premier jet passait son temps a expirer ou a se plaindre que les minuteurs
   n'etaient pas simules, dix cas sur dix. Le champ attend 250 ms, on attend
   donc 250 ms pour de vrai. Dix cas font deux secondes et demie, ce qui est
   le prix honnete d'un test qui traverse le meme chemin qu'un doigt. */
const utilisateur = () => userEvent.setup();

async function taper(champ: HTMLElement, texte: string) {
  const u = utilisateur();
  await u.type(champ, texte);
  return u;
}

/* La liste apparait apres le delai du champ : on laisse a `findBy` de quoi
   couvrir les 250 ms, sans quoi il conclut trop tot. */
const ATTENDRE = { timeout: 1500 };

describe('SelecteurVille : au clavier seul', () => {
  it('la frappe ouvre la liste et la filtre', async () => {
    const { champ } = poser();
    await taper(champ, 'to');
    const options = await screen.findAllByRole('option', {}, ATTENDRE);
    expect(options.map((o) => o.textContent)).toEqual([
      'TokyoTokyo, JP',
      'TorontoOntario, CA',
    ]);
  });

  it('la fleche bas descend, la fleche haut remonte, et cela boucle', async () => {
    const { champ } = poser();
    const u = await taper(champ, 'to');
    await screen.findAllByRole('option', {}, ATTENDRE);

    const surlignee = () =>
      screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true')
        ?.textContent;

    /* Au depart, la premiere : on peut valider sans toucher aux fleches. */
    expect(surlignee()).toContain('Tokyo');

    await u.keyboard('{ArrowDown}');
    expect(surlignee()).toContain('Toronto');

    /* Deux villes seulement : redescendre revient a la premiere. Boucler evite
       le cul-de-sac ou la fleche cesse de repondre sans qu'on sache pourquoi. */
    await u.keyboard('{ArrowDown}');
    expect(surlignee()).toContain('Tokyo');

    await u.keyboard('{ArrowUp}');
    expect(surlignee()).toContain('Toronto');
  });

  it('aria-activedescendant suit le surlignage, sinon un lecteur d ecran se tait', async () => {
    const { champ } = poser();
    const u = await taper(champ, 'to');
    await screen.findAllByRole('option', {}, ATTENDRE);
    await u.keyboard('{ArrowDown}');

    const surlignee = screen
      .getAllByRole('option')
      .find((o) => o.getAttribute('aria-selected') === 'true');
    expect(champ.getAttribute('aria-activedescendant')).toBe(surlignee?.id);
  });

  it('Entree choisit la ville surlignee', async () => {
    const onChoisir = vi.fn();
    const { champ } = poser(onChoisir);
    const u = await taper(champ, 'to');
    await screen.findAllByRole('option', {}, ATTENDRE);
    await u.keyboard('{ArrowDown}{Enter}');

    expect(onChoisir).toHaveBeenCalledTimes(1);
    expect(onChoisir.mock.calls[0]?.[0]).toMatchObject({ slug: 'toronto-ca' });
  });

  it('Entree sans avoir bouge choisit la premiere proposition', async () => {
    const onChoisir = vi.fn();
    const { champ } = poser(onChoisir);
    const u = await taper(champ, 'to');
    await screen.findAllByRole('option', {}, ATTENDRE);
    await u.keyboard('{Enter}');
    expect(onChoisir.mock.calls[0]?.[0]).toMatchObject({ slug: 'tokyo-jp' });
  });

  it('Echap referme la liste sans rien choisir', async () => {
    const onChoisir = vi.fn();
    const { champ } = poser(onChoisir);
    const u = await taper(champ, 'to');
    await screen.findAllByRole('option', {}, ATTENDRE);

    await u.keyboard('{Escape}');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(onChoisir).not.toHaveBeenCalled();
    /* Le texte reste : on a ferme la liste, pas annule sa recherche. */
    expect((champ as HTMLInputElement).value).toBe('to');
  });

  it('le second Echap vide le champ', async () => {
    const { champ } = poser();
    const u = await taper(champ, 'to');
    await screen.findAllByRole('option', {}, ATTENDRE);
    await u.keyboard('{Escape}{Escape}');
    expect((champ as HTMLInputElement).value).toBe('');
  });

  it('une recherche sans resultat le dit au lieu de se taire', async () => {
    const { champ } = poser();
    await taper(champ, 'zzz');
    expect(await screen.findByRole('status', {}, ATTENDRE)).toHaveProperty(
      'textContent',
      expect.stringContaining('Aucune ville')
    );
  });

  it('ignore les accents : « montreal » trouve « Montréal »', async () => {
    const { champ } = poser();
    await taper(champ, 'montreal');
    const options = await screen.findAllByRole('option', {}, ATTENDRE);
    expect(options[0]?.textContent).toContain('Montréal');
  });

  it('ne cherche rien en dessous de deux caracteres', async () => {
    const { champ } = poser();
    await taper(champ, 't');
    /* On laisse le delai s'ecouler AVANT de conclure : verifier tout de suite
       ne prouverait que la lenteur du champ, pas la regle des deux
       caracteres. */
    await new Promise((r) => setTimeout(r, 500));
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});
