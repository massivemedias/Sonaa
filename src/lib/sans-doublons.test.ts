import { describe, expect, it } from 'vitest';
import type { Soiree } from './agenda.ts';
import { sansDoublons } from './sans-doublons.ts';

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
    expect(sansDoublons([flytz, autre, flytz, flytz]).map((s) => s.id)).toEqual(['2550181', '2543200']);
  });

  it('reconnait la meme soiree venue de deux sources, malgre les accents et la ponctuation', () => {
    const ra = soiree('2504538', 'FÊTE DE QUARTIER NUMÉRIQUE | Festival MAPP 2026', '2026-10-01T00:00:00.000', 'Van Horne Skatepark', 'ra.jpg');
    const shotgun = soiree('main:77', 'Fete de quartier numerique - Festival MAPP 2026', '2026-10-01T17:00:00.000', 'Van Horne Skatepark');
    expect(sansDoublons([ra, shotgun])).toEqual([ra]);
  });

  it("garde la ligne qui porte une affiche quand la premiere n'en a pas", () => {
    const sans = soiree('main:1', 'Vino Disco THURSDAY', '2026-10-01T00:00:00.000', 'Vino Disco');
    const avec = soiree('2549000', 'Vino Disco Thursday', '2026-10-01T00:00:00.000', 'Vino Disco', 'v.jpg');
    expect(sansDoublons([sans, avec])).toEqual([avec]);
  });

  it('garde deux soirees au meme titre un autre jour ou dans une autre salle', () => {
    const mardi = soiree('1', 'Techno Tuesday', '2026-10-06T00:00:00.000', 'Stereo');
    const mardiSuivant = soiree('2', 'Techno Tuesday', '2026-10-13T00:00:00.000', 'Stereo');
    const ailleurs = soiree('3', 'Techno Tuesday', '2026-10-06T00:00:00.000', 'Newspeak');
    expect(sansDoublons([mardi, mardiSuivant, ailleurs])).toHaveLength(3);
  });
});
