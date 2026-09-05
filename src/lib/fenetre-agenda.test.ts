/* LES DATES SE TESTENT OU ELLES NE SE CROIENT PAS.
 *
 * Deux pieges vivent dans ce module, et aucun des deux ne se voit a la
 * lecture : la fin de semaine quand on est deja dedans, et « 2026-09-12 »
 * interprete comme minuit UTC, ce qui a Montreal designe la veille au soir.
 * Le second se manifeste par un agenda decale d'un jour pendant les quatre
 * cinquiemes de la journee, et par rien du tout entre minuit et 4 h.
 *
 * `maintenant` est un parametre de `fenetreDe` exactement pour ca : on
 * verifie un samedi soir un mardi matin. */

import { describe, expect, it } from 'vitest';
import {
  cleDuJour,
  estSansFuseau,
  fenetreDe,
  heureAuMur,
  joursProposes,
  sansFuseau,
} from './fenetre-agenda.ts';

/* Des reperes reels. Le 3 septembre 2026 est un jeudi. */
const JEUDI = new Date(2026, 8, 3, 14, 30);
const VENDREDI = new Date(2026, 8, 4, 14, 30);
const SAMEDI = new Date(2026, 8, 5, 23, 45);
const DIMANCHE = new Date(2026, 8, 6, 11, 0);
const LUNDI = new Date(2026, 8, 7, 9, 0);

const jour = (d: Date) => cleDuJour(d);

describe('fenetreDe : aujourd hui', () => {
  it('couvre le jour entier, de minuit a minuit moins une', () => {
    const f = fenetreDe('aujourdhui', null, JEUDI);
    expect(jour(f.du)).toBe('2026-09-03');
    expect(jour(f.au)).toBe('2026-09-03');
    expect(f.du.getHours()).toBe(0);
    expect(f.au.getHours()).toBe(23);
  });

  it('ne depend pas de l heure qu il est', () => {
    const tot = fenetreDe('aujourdhui', null, new Date(2026, 8, 3, 0, 5));
    const tard = fenetreDe('aujourdhui', null, new Date(2026, 8, 3, 23, 55));
    expect(jour(tot.du)).toBe(jour(tard.du));
  });
});

describe('fenetreDe : la fin de semaine', () => {
  it('un jeudi, elle commence au vendredi suivant', () => {
    const f = fenetreDe('weekend', null, JEUDI);
    expect(jour(f.du)).toBe('2026-09-04');
    expect(jour(f.au)).toBe('2026-09-06');
  });

  it('un vendredi, elle commence aujourd hui', () => {
    const f = fenetreDe('weekend', null, VENDREDI);
    expect(jour(f.du)).toBe('2026-09-04');
    expect(jour(f.au)).toBe('2026-09-06');
  });

  /* LE CAS QUI COMPTE. Un samedi soir, « la fin de semaine » est celle qu'on
     vit, pas celle d'apres. Une version qui partirait toujours du prochain
     vendredi enverrait quelqu'un a huit jours de la, un samedi a 23 h, au
     moment precis ou il cherche ou sortir. */
  it('un samedi soir, elle commence aujourd hui et finit demain', () => {
    const f = fenetreDe('weekend', null, SAMEDI);
    expect(jour(f.du)).toBe('2026-09-05');
    expect(jour(f.au)).toBe('2026-09-06');
  });

  it('un dimanche, elle est le jour meme et se termine ce soir', () => {
    const f = fenetreDe('weekend', null, DIMANCHE);
    expect(jour(f.du)).toBe('2026-09-06');
    expect(jour(f.au)).toBe('2026-09-06');
  });

  it('un lundi, elle repart au vendredi de la meme semaine', () => {
    const f = fenetreDe('weekend', null, LUNDI);
    expect(jour(f.du)).toBe('2026-09-11');
    expect(jour(f.au)).toBe('2026-09-13');
  });
});

describe('fenetreDe : une date choisie', () => {
  it('couvre ce jour-la et lui seul', () => {
    const f = fenetreDe('date', '2026-09-12', JEUDI);
    expect(jour(f.du)).toBe('2026-09-12');
    expect(jour(f.au)).toBe('2026-09-12');
  });

  /* LE PIEGE DU FUSEAU. `new Date('2026-09-12')` vaut minuit UTC, soit le
     11 a 20 h a Montreal : la fenetre aurait designe le mauvais jour. On
     construit donc composante par composante. */
  it('lit la date en heure locale, pas en UTC', () => {
    const f = fenetreDe('date', '2026-09-12', JEUDI);
    expect(f.du.getDate()).toBe(12);
    expect(f.du.getMonth()).toBe(8);
  });

  it('une date absente ou illisible retombe sur la suite, sans casser', () => {
    const sans = fenetreDe('date', null, JEUDI);
    const bidon = fenetreDe('date', 'pas-une-date', JEUDI);
    expect(jour(sans.du)).toBe('2026-09-04');
    expect(jour(bidon.du)).toBe('2026-09-04');
  });
});

describe('fenetreDe : la suite', () => {
  /* Elle commence DEMAIN : ce qui se joue ce soir a deja son bouton, et une
     liste « le reste » qui repete le premier ecran n'est pas le reste. */
  it('commence demain et va jusqu a trois mois', () => {
    const f = fenetreDe('suite', null, JEUDI);
    expect(jour(f.du)).toBe('2026-09-04');
    expect(jour(f.au)).toBe('2026-12-02');
  });
});

describe('fenetreDe : la recherche', () => {
  /* LA DIFFERENCE AVEC « LA SUITE » TIENT A UN JOUR, ET ELLE COMPTE.
     Chercher une salle a 19 h un samedi pour voir quand y aller doit montrer
     ce soir. Defaut constate a l'ecran : la recherche « stereo » rendait 27
     dates a partir du lendemain, en sautant la soiree du soir meme. */
  it('commence aujourd hui, contrairement a la suite', () => {
    const r = fenetreDe('recherche', null, JEUDI);
    const suite = fenetreDe('suite', null, JEUDI);
    expect(jour(r.du)).toBe('2026-09-03');
    expect(jour(suite.du)).toBe('2026-09-04');
  });

  it('couvre la meme duree que la suite', () => {
    const r = fenetreDe('recherche', null, JEUDI);
    expect(jour(r.au)).toBe('2026-12-02');
  });
});

describe('joursProposes', () => {
  it('commence demain, puisque aujourd hui a son bouton', () => {
    const j = joursProposes(JEUDI, 3);
    expect(j.map(cleDuJour)).toEqual(['2026-09-04', '2026-09-05', '2026-09-06']);
  });

  it('traverse un changement de mois sans trou', () => {
    const j = joursProposes(new Date(2026, 8, 29), 4);
    expect(j.map(cleDuJour)).toEqual(['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03']);
  });
});

describe('cleDuJour', () => {
  it('rend la date locale et non la date UTC', () => {
    /* 23 h 30 le 3 septembre a Montreal, c'est deja le 4 en UTC. La cle doit
       rester le 3 : c'est le jour de la soiree pour qui y va. */
    expect(cleDuJour(new Date(2026, 8, 3, 23, 30))).toBe('2026-09-03');
  });

  it('complete les mois et les jours a deux chiffres', () => {
    expect(cleDuJour(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('sansFuseau : parler la langue de Resident Advisor', () => {
  /* LE DEFAUT QUI DECALAIT L'AGENDA D'UN JOUR. On envoyait `toISOString()`,
     donc « 2026-09-12T04:00:00.000Z » pour minuit a Montreal. RA compare
     cette chaine a ses dates nues, conclut que le 12 a minuit est avant le
     seuil, et rend le 13. Constate a l'ecran : demander le samedi 12
     affichait une liste intitulee « dimanche 13 septembre ». */
  it('rend les composantes locales, sans Z et sans decalage', () => {
    expect(sansFuseau(new Date(2026, 8, 12, 0, 0, 0))).toBe('2026-09-12T00:00:00.000');
    expect(sansFuseau(new Date(2026, 8, 12, 23, 59, 59))).toBe('2026-09-12T23:59:59.000');
  });

  it('ne bascule pas de jour le soir, contrairement a toISOString', () => {
    const soir = new Date(2026, 8, 12, 22, 0, 0);
    expect(sansFuseau(soir).slice(0, 10)).toBe('2026-09-12');
  });
});

describe('estSansFuseau et heureAuMur', () => {
  it('reconnait une chaine de Resident Advisor', () => {
    expect(estSansFuseau('2026-09-13T22:00:00.000')).toBe(true);
  });

  it('ne confond pas avec un vrai horodatage', () => {
    expect(estSansFuseau('2026-09-13T22:00:00.000Z')).toBe(false);
    expect(estSansFuseau('2026-09-13T22:00:00+02:00')).toBe(false);
  });

  /* Une soiree berlinoise de 22 h s'affichait « 04 h 00 » depuis Montreal :
     l'heure au mur etait lue comme un instant, puis reconvertie. */
  it('lit l heure au mur telle qu elle est ecrite', () => {
    expect(heureAuMur('2026-09-13T22:00:00.000')).toBe('22 h 00');
    expect(heureAuMur('2026-09-13T09:30:00.000')).toBe('09 h 30');
  });

  it('rend null sur une chaine sans heure', () => {
    expect(heureAuMur('2026-09-13')).toBeNull();
  });
});
