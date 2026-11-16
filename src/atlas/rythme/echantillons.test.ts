import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import RYTHMES from '../../data/rythmes.json';
import CORPUS from '../../data/corpus.json';
import type { Motif } from '../../lib/rythmes.ts';
import { accordeDe, fichiersDuMotif, kitDeFamille, kitDuMotif, plusProche } from './echantillons.ts';

const motifs = RYTHMES as unknown as Record<string, Motif>;

describe('les sons enregistres', () => {
  it('existent tous dans public/sons pour chacun des 219 styles', () => {
    const manquants = new Set<string>();
    for (const g of CORPUS.genres) {
      const m = motifs[g.id];
      if (!m) continue;
      for (const nom of fichiersDuMotif(m, kitDuMotif(m, g.family))) if (!existsSync(`public/sons/${nom}.wav`)) manquants.add(nom);
      for (const nom of fichiersDuMotif(m, kitDeFamille(g.family))) if (!existsSync(`public/sons/${nom}.wav`)) manquants.add(nom);
    }
    expect([...manquants]).toEqual([]);
  });

  it('choisit le kit selon les machines du motif et garde les bruits et clics au synthetiseur', () => {
    const detroit = motifs['detroittechno'];
    const acidHouse = motifs['acidhouse'];
    const french = motifs['frenchhouse'];
    const jungle = motifs['jungle'];
    const italo = motifs['italodisco'];
    const micro = motifs['microhouse'];
    if (!detroit || !acidHouse || !french || !jungle || !italo || !micro) throw new Error('motifs');
    expect(kitDuMotif(detroit, 'techno')).toBe('tr909');
    expect(kitDuMotif(acidHouse, 'house')).toBe('tr808');
    expect(kitDuMotif(french, 'house')).toBe('sp909');
    expect(kitDuMotif(jungle, 'breaks')).toBe('breaks');
    expect(kitDuMotif(italo, 'disco')).toBe('linn');
    expect(fichiersDuMotif(micro, kitDuMotif(micro, 'minimal'))).toEqual(['tr909-kick']);
  });

  it('donnent leur provenance et leur licence', () => {
    expect(existsSync('public/sons/SOURCES.txt')).toBe(true);
  });

  it('accordent le piano sur la note enregistree la plus proche', () => {
    const piano = accordeDe({ voix: 'piano', fr: 'PIANO', en: 'PIANO', pas: [2] });
    if (!piano) throw new Error('piano');
    expect(plusProche(piano, 62)).toMatchObject({ nom: 'vcsl-piano-c3' });
    expect(plusProche(piano, 72).vitesse).toBe(1);
    expect(plusProche(piano, 67)).toMatchObject({ nom: 'vcsl-piano-c4' });
    expect(plusProche(piano, 67).vitesse).toBeCloseTo(Math.pow(2, -5 / 12));
  });
});

/* LE 16 NOVEMBRE 2026, 31 FICHIERS SUR 67 N'AVAIENT PAS DE BLOC « data » :
   le navigateur refusait de les decoder, et la TR-909, la TR-808 et la
   batterie retombaient sur des sons synthetises. Chaque fichier de
   public/sons doit maintenant se lire jusqu'a son bloc de donnees. */
describe('les fichiers de public/sons', () => {
  const dossier = join(process.cwd(), 'public', 'sons');
  const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.wav'));
  it('ont tous un en-tete WAV valide avec un bloc de donnees non vide', () => {
    expect(fichiers.length).toBeGreaterThan(60);
    const abimes = fichiers.filter((f) => {
      const b = readFileSync(join(dossier, f));
      if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') return true;
      let i = 12;
      while (i + 8 <= b.length) {
        const id = b.toString('ascii', i, i + 4);
        const taille = b.readUInt32LE(i + 4);
        if (id === 'data') return taille === 0;
        if (!['fmt ', 'LIST', 'fact'].includes(id)) return true;
        i += 8 + taille + (taille % 2);
      }
      return true;
    });
    expect(abimes).toEqual([]);
  });
});
