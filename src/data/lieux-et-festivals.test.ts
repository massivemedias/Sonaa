import { describe, expect, it } from 'vitest';
import { LIEUX_ET_FESTIVALS, PAYS_LIEUX, VILLES_CLUBS } from './lieux-et-festivals.ts';
import { soireesPourLieu } from '../atlas/soirees-du-lieu.ts';
import type { Soiree } from '../lib/agenda.ts';

describe('Atlas des clubs et festivals', () => {
  it('couvre les 20 villes du calendrier SONAA (ADR-118), 400 salles et clubs, dont 38 à Montréal, 30 à Barcelone, 22 à Montpellier', () => {
    const clubs = LIEUX_ET_FESTIVALS.filter((l) => l.type === 'club');
    expect(VILLES_CLUBS.length).toBe(20);
    expect(VILLES_CLUBS.every((v) => v.aCalendrier)).toBe(true);
    expect(clubs.length).toBeGreaterThanOrEqual(400);
    /* aucun club hors des vingt villes */
    const slugs = new Set(VILLES_CLUBS.map((v) => v.slug));
    expect(clubs.filter((c) => !c.villeSlug || !slugs.has(c.villeSlug))).toEqual([]);

    const montpellierClubs = clubs.filter((c) => c.villeSlug === 'montpellier-fr');
    expect(montpellierClubs.length).toBeGreaterThanOrEqual(22);
    expect(montpellierClubs.map((c) => c.nom)).toContain('PZ City Club');
    expect(montpellierClubs.map((c) => c.nom)).toContain('Halle Tropisme (Club Tropisme)');
    expect(montpellierClubs.map((c) => c.nom)).toContain('Zénith Sud Montpellier');
    expect(montpellierClubs.map((c) => c.nom)).toContain('Secret Place');

    const barceloneClubs = clubs.filter((c) => c.villeSlug === 'barcelone-es');
    expect(barceloneClubs.length).toBeGreaterThanOrEqual(30);
    expect(barceloneClubs.map((c) => c.nom)).toContain('LAUT');
    expect(barceloneClubs.map((c) => c.nom)).toContain('La Terrrazza');
    expect(barceloneClubs.map((c) => c.nom)).toContain('Sant Jordi Club');
    expect(barceloneClubs.map((c) => c.nom)).toContain('Paral·lel 62');

    const montreal = clubs.filter((c) => c.villeSlug === 'montreal-ca');
    expect(montreal.length).toBeGreaterThanOrEqual(38);
    const nomsMtl = montreal.map((c) => c.nom);
    expect(nomsMtl).toContain('Stereo');
    expect(nomsMtl).toContain('StereoBar');
    expect(nomsMtl).toContain('Bar Datcha');
    expect(nomsMtl).toContain('Système');
    expect(nomsMtl).toContain('Le Belmont');
    expect(nomsMtl).toContain('Le Red Room');
    expect(nomsMtl).toContain('New City Gas');
    expect(nomsMtl).toContain('MTELUS');
    expect(nomsMtl).toContain('Théâtre Beanfield');
    expect(nomsMtl).toContain('L’Olympia de Montréal');
    expect(nomsMtl).toContain('La Sala Rossa');

    const salles = clubs.filter((c) => c.estSalle);
    expect(salles.length).toBeGreaterThanOrEqual(90);
    for (const s of salles) {
      expect(s.styles).toEqual([]);
    }

    const clubsDediesMtl = montreal.filter((c) => !c.estSalle);
    expect(clubsDediesMtl.length).toBeGreaterThanOrEqual(15);

    for (const v of VILLES_CLUBS) {
      const deLaVille = clubs.filter((c) => c.villeSlug === v.slug);
      expect(deLaVille.length).toBeGreaterThanOrEqual(7);
    }
    /* La densification du 12 novembre 2026 : vingt lieux au moins dans les
       grandes capitales de la nuit. */
    for (const slug of ['newyork-us', 'londres-gb', 'berlin-de', 'amsterdam-nl', 'madrid-es', 'tokyo-jp', 'toronto-ca']) {
      expect(clubs.filter((c) => c.villeSlug === slug).length).toBeGreaterThanOrEqual(20);
    }
  });

  it('recense au moins 325 festivals de 1 000+ places dans 33 pays, dont le Suti Festival au Portugal', () => {
    const festivals = LIEUX_ET_FESTIVALS.filter((l) => l.type === 'festival');
    expect(PAYS_LIEUX.length).toBeGreaterThanOrEqual(33);
    expect(festivals.length).toBeGreaterThanOrEqual(325);

    const suti = festivals.find((f) => f.id === 'suti-festival-portugal');
    expect(suti).toBeDefined();
    expect(suti?.nom).toBe('Suti Festival');
    expect(suti?.paysCode).toBe('PT');

    const timeless = festivals.find((f) => f.id === 'timeless-festival-quebec');
    expect(timeless).toBeDefined();
    expect(timeless?.nom).toBe('Timeless Festival');

    const futureForest = festivals.find((f) => f.id === 'future-forest-canada');
    expect(futureForest).toBeDefined();
    expect(futureForest?.nom).toBe('Future Forest');

    const grooveBass = festivals.find((f) => f.id === 'groove-and-bass-festival-quebec');
    expect(grooveBass).toBeDefined();
    expect(grooveBass?.nom).toBe('Groove & Bass Festival');

    for (const f of festivals) {
      expect(f.capacite).toBeGreaterThanOrEqual(1000);
      expect(f.latitude).toBeGreaterThanOrEqual(-45);
      expect(f.latitude).toBeLessThanOrEqual(60);
      expect(f.longitude).toBeGreaterThanOrEqual(-130);
      expect(f.longitude).toBeLessThanOrEqual(155);
    }
  });

  it('associe les prochaines soirées aux clubs, bars musicaux et salles (Newspeak, Stereo, StereoBar, Salon Daomé, SAT, MTELUS)', () => {
    const newspeak = LIEUX_ET_FESTIVALS.find((l) => l.id === 'newspeak-montreal');
    const stereo = LIEUX_ET_FESTIVALS.find((l) => l.id === 'stereo-montreal');
    const stereobar = LIEUX_ET_FESTIVALS.find((l) => l.id === 'stereobar-montreal');
    const daome = LIEUX_ET_FESTIVALS.find((l) => l.id === 'salon-daome-montreal');
    const sat = LIEUX_ET_FESTIVALS.find((l) => l.id === 'sat-montreal');
    expect(newspeak).toBeDefined();
    expect(stereo).toBeDefined();
    expect(stereobar).toBeDefined();
    expect(daome).toBeDefined();
    expect(sat).toBeDefined();

    const echantillon: Soiree[] = [
      {
        id: 'ra-1',
        titre: 'Nuit Techno Newspeak',
        date: '2026-11-14T22:00:00.000',
        debut: '2026-11-14T22:00:00.000',
        lieu: 'Newspeak',
        artistes: ['Dasha Rush', 'Priori'],
        genres: ['Techno'],
        affiche: null,
        lien: 'https://ra.co/events/1',
        interesses: 120,
      },
      {
        id: 'ra-2',
        titre: 'Afterhours Stereo',
        date: '2026-11-15T02:00:00.000',
        debut: '2026-11-15T02:00:00.000',
        lieu: 'Stereo',
        artistes: ['Hernan Cattaneo'],
        genres: ['Progressive House'],
        affiche: null,
        lien: 'https://ra.co/events/2',
        interesses: 340,
      },
      {
        id: 'ra-3',
        titre: 'StereoBar Intimate Night',
        date: '2026-11-15T22:00:00.000',
        debut: '2026-11-15T22:00:00.000',
        lieu: 'StereoBar',
        artistes: [' Ostrich'],
        genres: ['House'],
        affiche: null,
        lien: 'https://ra.co/events/3',
        interesses: 85,
      },
      {
        id: 'ra-4',
        titre: 'Vendredi au Daomé',
        date: '2026-11-13T22:00:00.000',
        debut: '2026-11-13T22:00:00.000',
        lieu: 'Salon Daomé',
        artistes: ['Gene Tellem'],
        genres: ['House'],
        affiche: null,
        lien: 'https://ra.co/events/4',
        interesses: 64,
      },
      {
        id: 'ra-5',
        titre: 'Dôme immersif SAT',
        date: '2026-11-20T21:00:00.000',
        debut: '2026-11-20T21:00:00.000',
        lieu: 'Société des arts technologiques',
        artistes: ['Max Cooper'],
        genres: ['IDM'],
        affiche: null,
        lien: 'https://ra.co/events/5',
        interesses: 210,
      },
    ];

    expect(soireesPourLieu(newspeak!, echantillon, '2026-11-06').map((s) => s.id)).toEqual(['ra-1']);
    expect(soireesPourLieu(stereo!, echantillon, '2026-11-06').map((s) => s.id)).toEqual(['ra-2']);
    expect(soireesPourLieu(stereobar!, echantillon, '2026-11-06').map((s) => s.id)).toEqual(['ra-3']);
    expect(soireesPourLieu(daome!, echantillon, '2026-11-06').map((s) => s.id)).toEqual(['ra-4']);
    expect(soireesPourLieu(sat!, echantillon, '2026-11-06').map((s) => s.id)).toEqual(['ra-5']);
  });
});
