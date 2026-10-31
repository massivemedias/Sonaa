import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { TAILLE_CARTE, fabriquerCarte } from './image-de-partage.ts';

/* La machine de deploiement n'a pas Inter : si les polices du depot ne se
   chargent pas, les pages partent sans image de partage. Ce test le dit
   avant. */
describe('la carte de partage', () => {
  it('se fabrique en 1200 x 630, avec son texte', async () => {
    const dist = mkdtempSync(join(tmpdir(), 'carte-'));
    try {
      const adresse = await fabriquerCarte({ titre: 'Montréal', phrase: 'Les soirées électroniques de ce soir et des prochains jours' }, dist, 'https://sonaa.ca', 'essai', 'montreal');
      expect(adresse).toMatch(/^https:\/\/sonaa\.ca\/og\/essai\/montreal-[0-9a-f]{8}\.jpg$/);
      const [fichier] = readdirSync(join(dist, 'og', 'essai'));
      const meta = await sharp(join(dist, 'og', 'essai', fichier ?? '')).metadata();
      expect([meta.width, meta.height]).toEqual([...TAILLE_CARTE]);
      /* Le titre est creme sur fond sombre : sans police, la zone du titre
         resterait sombre. */
      const { data } = await sharp(join(dist, 'og', 'essai', fichier ?? '')).extract({ left: 72, top: 70, width: 500, height: 100 }).greyscale().raw().toBuffer({ resolveWithObject: true });
      expect(Math.max(...data)).toBeGreaterThan(180);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
});
