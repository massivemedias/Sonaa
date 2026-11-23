import { describe, expect, it } from 'vitest';
import {
  extraireTitreSquarespace,
  isoMontrealDepuisMs,
  nettoyerHtml,
  parserNewCityGas,
  parserSquarespace,
  SALLES_SQUARESPACE,
} from './ingerer-salles-mtl.ts';

describe('ingerer-salles-mtl', () => {
  it('nettoie les balises style/script et decode les entites HTML', () => {
    const html = '<style>.x { color: red; }</style><p>SOAME &amp; Friends<br/>Techno Night</p>';
    expect(nettoyerHtml(html)).toBe('SOAME & Friends\nTechno Night');
  });

  it('extrait le vrai titre quand Squarespace met la date dans title', () => {
    expect(
      extraireTitreSquarespace({
        title: '26 NOVEMBRE 2026',
        body: '<p>Présenté par Blue Skies</p><p>Rave Techno Night</p>',
      })
    ).toBe('Rave Techno Night');
    expect(extraireTitreSquarespace({ title: 'Paper Skies', body: '<p>Support</p>' })).toBe('Paper Skies');
  });

  it('formate une date Unix en ISO local de Montreal', () => {
    const ms = Date.parse('2026-11-28T03:00:00Z');
    expect(isoMontrealDepuisMs(ms)).toBe('2026-11-27T22:00:00-05:00');
  });

  it('garde toutes les soirees de Newspeak et filtre les salles generalistes', () => {
    const now = Date.parse('2026-11-23T18:00:00Z');
    const futur = Date.parse('2026-11-28T03:00:00Z');
    const passe = Date.parse('2026-10-01T03:00:00Z');

    const newspeak = SALLES_SQUARESPACE.find((s) => s.id === 'newspeak')!;
    const outNewspeak = parserSquarespace(
      {
        upcoming: [
          { id: 'a1', title: 'Paper Skies', startDate: futur, fullUrl: '/evenements/paper-skies' },
          { id: 'old', title: 'Old Event', startDate: passe, fullUrl: '/evenements/old' },
        ],
      },
      newspeak,
      now
    );
    expect(outNewspeak).toHaveLength(1);
    expect(outNewspeak[0]?.ref).toBe('newspeak:a1');
    expect(outNewspeak[0]?.lien).toBe('https://www.newspeakmtl.com/evenements/paper-skies');

    const ritz = SALLES_SQUARESPACE.find((s) => s.id === 'ritz')!;
    const outRitz = parserSquarespace(
      {
        upcoming: [
          { id: 'r1', title: '27 NOVEMBRE 2026', startDate: futur, body: '<p>Soiree Rock Indie Acoustique</p>' },
          { id: 'r2', title: '28 NOVEMBRE 2026', startDate: futur, body: '<p>Montreal Techno & House Rave</p>' },
        ],
      },
      ritz,
      now
    );
    expect(outRitz).toHaveLength(1);
    expect(outRitz[0]?.titre).toBe('Montreal Techno & House Rave');
  });

  it('parse les fiches WordPress ncgevent de New City Gas', () => {
    const now = Date.parse('2026-11-23T18:00:00Z');
    const res = parserNewCityGas(
      [
        {
          id: 7534,
          link: 'https://newcitygas.com/en/event/layton-giordani-202728/',
          acf: {
            ncgev_id: '202728',
            ncgev_status: 'public',
            ncgev_title: 'Layton Giordani',
            ncgev_support: 'Alex Stein, Local DJ',
            ncgev_datestart: '2026-12-19 22:00:00',
            ncgev_dateend: '2026-12-20 03:00:00',
            ncgev_ticketprice: 35,
          },
        },
        {
          id: 7000,
          acf: {
            ncgev_id: '100',
            ncgev_status: 'private',
            ncgev_title: 'Private Party',
            ncgev_datestart: '2026-12-20 22:00:00',
          },
        },
      ],
      now
    );
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      ref: 'ncg:202728',
      titre: 'Layton Giordani',
      debut: '2026-12-19T22:00:00-05:00',
      fin: '2026-12-20T03:00:00-05:00',
      lieu: 'New City Gas',
      prix: '35 $',
      artistes: ['Layton Giordani', 'Alex Stein', 'Local DJ'],
    });
  });
});
