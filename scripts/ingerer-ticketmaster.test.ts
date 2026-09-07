/* LES DECISIONS DE CET ADAPTATEUR, ET RIEN D'AUTRE : garder ou non, quelle
 * image, quel prix, et le refus d'une fiche sans heure. Les exemples sont
 * des fiches reelles de la premiere lecture montrealaise, reduites. */
import { describe, expect, it } from 'vitest';
import { afficheDe, ficheDe, prixDe, raisonDeGarder, type Evenement } from './ingerer-ticketmaster.ts';

const electronique = { genre: { name: 'Dance/Electronic' }, subGenre: { name: 'Amapiano' } };
const rock = { genre: { name: 'Rock' }, subGenre: { name: 'Pop' } };

const fiche = (extra: Partial<Evenement>): Evenement => ({
  id: '1Ad7Z_aGkM24GhX',
  name: 'Channel Tres - The Enigma Tour',
  url: 'https://www.ticketmaster.ca/x/event/3100649DCF54C6FE',
  dates: { start: { dateTime: '2026-09-16T00:00:00Z', localDate: '2026-09-15' }, status: { code: 'onsale' } },
  ...extra,
});

describe('raisonDeGarder', () => {
  it('garde par le genre de la fiche', () => {
    expect(raisonDeGarder(fiche({ classifications: [electronique] }))).toBe('genre');
  });
  /* KONTRAVOID & BUZZ KULL : la fiche dit Rock, les artistes disent
     Dance/Electronic. Le champ de l'artiste rattrape celui de la fiche. */
  it('garde par le genre d un artiste quand la fiche dit autre chose', () => {
    const e = fiche({
      classifications: [rock],
      _embedded: { attractions: [{ name: 'Kontravoid', classifications: [electronique] }] },
    });
    expect(raisonDeGarder(e)).toBe('artiste');
  });
  /* LES 28 FICHES PRISES PAR UN MOT ETAIENT TOUTES FAUSSES : revues Motown
     « Disco », « Jungle Rot », « Uncle Acid ». Le champ decide seul. */
  it('n ecoute pas un mot du titre quand le champ dit autre chose', () => {
    expect(raisonDeGarder(fiche({ name: 'Avenue 54 Disco Show', classifications: [{ genre: { name: 'R&B' } }] }))).toBeNull();
    expect(raisonDeGarder(fiche({ name: 'Uncle Acid & The Deadbeats', classifications: [rock] }))).toBeNull();
  });
  it('ecarte le rock qui ne dit rien, les fiches de test et les annulees', () => {
    expect(raisonDeGarder(fiche({ name: 'Mastodon', classifications: [rock] }))).toBeNull();
    expect(raisonDeGarder(fiche({ classifications: [electronique], test: true }))).toBeNull();
    expect(
      raisonDeGarder(fiche({ classifications: [electronique], dates: { start: { dateTime: '2026-09-16T00:00:00Z' }, status: { code: 'cancelled' } } }))
    ).toBeNull();
  });
});

describe('ficheDe', () => {
  it('refuse une fiche sans heure plutot que de l afficher a minuit', () => {
    expect(ficheDe(fiche({ dates: { start: { localDate: '2026-09-15' } } }))).toBeNull();
  });
  it('lit la salle, l adresse et les artistes', () => {
    const f = ficheDe(
      fiche({
        _embedded: {
          venues: [{ name: 'Théâtre Beanfield', address: { line1: '2490 Rue Notre-Dame Ouest ' } }],
          attractions: [{ name: 'Channel Tres' }, { name: 'Zainab' }],
        },
      })
    );
    expect(f?.lieu).toBe('Théâtre Beanfield');
    expect(f?.adresse).toBe('2490 Rue Notre-Dame Ouest');
    expect(f?.artistes).toEqual(['Channel Tres', 'Zainab']);
    expect(f?.ref).toBe('1Ad7Z_aGkM24GhX');
  });
});

describe('afficheDe', () => {
  it('prend la plus petite image 16:9 d au moins mille pixels', () => {
    const images = [
      { ratio: '16_9', url: 'petite', width: 640 },
      { ratio: '16_9', url: 'source', width: 2426 },
      { ratio: '16_9', url: 'retina', width: 1136 },
      { ratio: '3_2', url: 'autre', width: 1024 },
    ];
    expect(afficheDe(images)).toBe('retina');
    expect(afficheDe([])).toBeNull();
  });
});

describe('prixDe', () => {
  it('ecrit une fourchette, un prix fixe, ou rien', () => {
    expect(prixDe([{ min: 35, max: 60, currency: 'CAD' }])).toBe('35 a 60 $');
    expect(prixDe([{ min: 20, max: 20, currency: 'EUR' }])).toBe('20 €');
    expect(prixDe(undefined)).toBeNull();
  });
});
