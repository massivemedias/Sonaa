/* LES STYLES SONT LA SEULE CHOSE QU'ON DEVINE, DONC LA SEULE A TESTER.
 *
 * Tout le reste de l'adaptateur vient d'un JSON-LD : le nom, la date, la
 * salle, le plateau sont lus dans un champ nomme, il n'y a rien a deduire.
 * Les styles, eux, n'existent que dans le texte rendu d'une carte, et il faut
 * decider ou la liste commence. C'est le seul endroit ou une regle peut se
 * tromper en silence, donc le seul qui merite des exemples.
 *
 * Les textes ci-dessous sont des relevés reels du 6 septembre 2026, copies
 * tels quels depuis les cartes de shotgun.live/fr/cities/montpellier. */

import { describe, expect, it } from 'vitest';
import { stylesDeLaCarte } from './ingerer-shotgun.ts';

const carte = (...lignes: string[]): string => lignes.join('\n');

describe('stylesDeLaCarte', () => {
  it('lit la queue de capitales apres le prix', () => {
    expect(
      stylesDeLaCarte(
        carte(
          'United Open Air X Matt Sassari & Oscar L',
          'Paillote Paradise',
          'dim. 6 sept.',
          '12:00',
          '19,99 €',
          'TECHNO',
          'TECH HOUSE',
          'ELECTRO'
        )
      )
    ).toEqual(['TECHNO', 'TECH HOUSE', 'ELECTRO']);
  });

  it('saute le « +1 » sans inventer le style qu il cache', () => {
    expect(
      stylesDeLaCarte(
        carte(
          'Boum Boum : After (Entrée Gratuite)',
          'Montpellier',
          'dim. 6 sept.',
          '23:59',
          '9,99 €',
          'TECH HOUSE',
          'INDIE DANCE',
          'TECHNO',
          '+1'
        )
      )
    ).toEqual(['TECH HOUSE', 'INDIE DANCE', 'TECHNO']);
  });

  it('accepte les entrées gratuites, qui n ont pas de ligne de prix', () => {
    expect(
      stylesDeLaCarte(
        carte(
          'Underbounce Platine & Melina',
          "L'Antirouille",
          'mer. 9 sept.',
          '23:59',
          'Gratuit',
          'HARD BOUNCE',
          'HARD TRANCE',
          'HARD TECHNO'
        )
      )
    ).toEqual(['HARD BOUNCE', 'HARD TRANCE', 'HARD TECHNO']);
  });

  /* LA CARTE EPINGLEE PORTE UN TEXTE DE PROMOTION ET AUCUNE ETIQUETTE. Elle
     ne doit pas rendre le dernier mot de la phrase comme un style. */
  it('ne prend rien sur une carte sans etiquettes', () => {
    expect(
      stylesDeLaCarte(
        carte(
          'ÉPINGLÉ',
          '🖤 Techno Is Our Life débarque à Montpellier, au Mélomane Club, le 12 septembre.',
          'sam. 12 sept.',
          '23:59'
        )
      )
    ).toEqual([]);
  });

  /* CE QU'IL NE FAUT SURTOUT PAS AVALER. Une salle ecrite en capitales est en
     queue de carte elle aussi quand la soiree n'annonce pas de style, et la
     prendre pour un genre remplirait le calendrier de faux styles. La date et
     l'heure sont ecartees par le chiffre de tete. */
  it('s arrete sur une ligne qui n est pas une etiquette', () => {
    expect(stylesDeLaCarte(carte('Soirée', 'DIEZE WAREHOUSE', 'ven. 11 sept.', '16,99 €'))).toEqual(
      []
    );
  });

  it('ne prend ni la date ni l heure', () => {
    expect(stylesDeLaCarte(carte('Soirée', 'Une salle', '23:59'))).toEqual([]);
    expect(stylesDeLaCarte(carte('Soirée', 'Une salle', 'DIM 6 SEPT.'))).toEqual([]);
  });

  it('rend un tableau vide sur un texte vide', () => {
    expect(stylesDeLaCarte('')).toEqual([]);
  });
});
