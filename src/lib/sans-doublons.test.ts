import { describe, expect, it } from 'vitest';
import type { Soiree } from './agenda.ts';
import { sansDoublons } from './sans-doublons.ts';

const MTL = 'America/Montreal';

const soiree = (id: string, titre: string, date: string, lieu: string | null, affiche: string | null = null): Soiree => ({
  id,
  titre,
  date,
  debut: date,
  lieu,
  artistes: [],
  genres: [],
  affiche,
  lien: '',
  interesses: 0,
});

describe('sansDoublons', () => {
  it("ecarte une soiree que Resident Advisor rend trois fois sous le meme identifiant", () => {
    const flytz = soiree('2550181', 'Flytz, BACKSPIN, YVNNI', '2026-10-01T00:00:00.000', 'Salon Daomé', 'a.jpg');
    const autre = soiree('2543200', 'Minzi Roberta, Isa Boom & Noel', '2026-10-01T00:00:00.000', 'Bar Datcha');
    expect(sansDoublons([flytz, autre, flytz, flytz], MTL).map((s) => s.id)).toEqual(['2550181', '2543200']);
  });

  it('reconnait la meme soiree venue de deux sources, malgre les accents et la ponctuation', () => {
    const ra = soiree('2504538', 'FÊTE DE QUARTIER NUMÉRIQUE | Festival MAPP 2026', '2026-10-01T00:00:00.000', 'Van Horne Skatepark', 'ra.jpg');
    const shotgun = soiree('main:77', 'Fete de quartier numerique - Festival MAPP 2026', '2026-10-01T17:00:00.000', 'Van Horne Skatepark');
    expect(sansDoublons([ra, shotgun], MTL)).toEqual([ra]);
  });

  it("garde la ligne qui porte une affiche quand la premiere n'en a pas", () => {
    const sans = soiree('main:1', 'Vino Disco THURSDAY', '2026-10-01T00:00:00.000', 'Vino Disco');
    const avec = soiree('2549000', 'Vino Disco Thursday', '2026-10-01T00:00:00.000', 'Vino Disco', 'v.jpg');
    expect(sansDoublons([sans, avec], MTL)).toEqual([avec]);
  });

  it('garde deux soirees au meme titre un autre jour ou dans une autre salle', () => {
    const mardi = soiree('1', 'Techno Tuesday', '2026-10-06T00:00:00.000', 'Stereo');
    const mardiSuivant = soiree('2', 'Techno Tuesday', '2026-10-13T00:00:00.000', 'Stereo');
    const ailleurs = soiree('3', 'Techno Tuesday', '2026-10-06T00:00:00.000', 'Newspeak');
    expect(sansDoublons([mardi, mardiSuivant, ailleurs], MTL)).toHaveLength(3);
  });

  it("fusionne KONTRAST MONTREAL : RA a l'heure au mur, Facebook en UTC, « Le » devant la salle", () => {
    const ra = soiree('2568601', 'KONTRAST MONTREAL', '2026-11-12T00:00:00.000', 'Salon Daomé', 'ra.jpg');
    const facebook = soiree('main:f2bd7135', 'KONTRAST MONTREAL', '2026-11-13T03:30:00+00:00', 'Le Salon Daomé');
    expect(sansDoublons([ra, facebook], MTL)).toEqual([ra]);
  });

  it("lit le jour d'une soiree de la base dans le fuseau de la ville", () => {
    /* 3 h 30 UTC le 13 est le 12 a Montreal, mais deja le 13 a Paris */
    const ra = soiree('1', 'Nuit longue', '2026-11-12T00:00:00.000', 'Stereo');
    const base = soiree('main:2', 'Nuit longue', '2026-11-13T03:30:00+00:00', 'Stereo');
    expect(sansDoublons([ra, base], MTL)).toHaveLength(1);
    expect(sansDoublons([ra, base], 'Europe/Paris')).toHaveLength(2);
  });

  it("garde deux salles qui ne different que par plus qu'un article", () => {
    const a = soiree('1', 'Techno', '2026-10-06T00:00:00.000', 'Le Belmont');
    const b = soiree('2', 'Techno', '2026-10-06T00:00:00.000', 'Belmont Bar');
    expect(sansDoublons([a, b], MTL)).toHaveLength(2);
  });
});
