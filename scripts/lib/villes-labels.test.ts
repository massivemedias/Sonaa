/* LES LECTURES DE LIEU DE LA COMPLETION DES VILLES. Voir villes-labels.ts. */

import { describe, expect, it } from 'vitest';
import { choisirVille, lieuxDuContact, lieuxDuTexte, type Localite } from './villes-labels.ts';

const noms = (c: readonly { nom: string }[]): string[] => c.map((x) => x.nom);

const loc = (id: string, nom: string, pop: number, iso: string): Localite => ({ id, fr: nom, en: nom, lat: 0, lng: 0, pop, iso });

describe('les lieux d une adresse de contact', () => {
  it('trouve la ville a cote du code postal et ecarte les courriels', () => {
    const c = lieuxDuContact('Kompakt\r\nWerderstrasse 15-19\r\n50672 Köln\r\nGermany\r\ninfo@kompakt.fm');
    expect(noms(c)).toContain('Köln');
    expect(c.find((x) => x.nom === 'Köln')?.force).toBe(2);
    expect(noms(c).some((n) => n.includes('@'))).toBe(false);
  });

  it('ne prend pas un nom de rue pour une ville', () => {
    const c = noms(lieuxDuContact('12 London Road\nBrighton BN1 4JF\nUK'));
    expect(c).toContain('Brighton');
    expect(c).not.toContain('London');
    expect(noms(lieuxDuContact('15 rue de Lyon\n75012 Paris'))).not.toContain('Lyon');
  });

  it('reprend la casse d une ville en capitales et laisse tomber les sigles', () => {
    const c = noms(lieuxDuContact('PO BOX 123\nLONDON E8 2AA\nUK'));
    expect(c).toContain('London');
    expect(c).not.toContain('UK');
    expect(c).not.toContain('Box');
  });

  it('garde les liaisons d un nom compose', () => {
    expect(noms(lieuxDuContact('NE1 4XF Newcastle upon Tyne'))).toContain('Newcastle upon Tyne');
  });
});

describe('les lieux d une presentation', () => {
  it('lit « based in » et « -based », du nom le plus long au plus court', () => {
    expect(noms(lieuxDuTexte('Electronic label based in New York City, run by two DJs.'))).toEqual(['New York City', 'New York', 'New']);
    expect(noms(lieuxDuTexte('A Leeds-based imprint for broken beat.'))).toContain('Leeds');
  });

  it('lit les tournures francaises', () => {
    expect(noms(lieuxDuTexte('Sub Rosa est une maison de disques basée à Bruxelles, fondée en 1984.'))).toContain('Bruxelles');
  });

  it('ignore une ville citee au passage', () => {
    expect(lieuxDuTexte('Remixes by a Berlin producer and a Paris duo.')).toEqual([]);
  });
});

describe('le choix de la ville', () => {
  const localites = new Map<string, Localite[]>([
    ['London', [loc('Q84', 'Londres', 8_800_000, 'GB'), loc('Q92561', 'London', 420_000, 'CA')]],
    ['Hackney', [loc('Q205679', 'Hackney', 280_000, 'GB')]],
    ['Box', [loc('Q2462', 'Box', 3_000, 'GB')]],
    ['Portland', [loc('Q6106', 'Portland', 650_000, 'US'), loc('Q49184', 'Portland', 68_000, 'US')]],
  ]);

  it('prend la plus peuplee dans le pays du label', () => {
    expect(choisirVille([{ nom: 'London', rang: 1, force: 2 }], localites, 'CA')?.localite.id).toBe('Q92561');
    expect(choisirVille([{ nom: 'Portland', rang: 3, force: 1 }], localites, 'US')?.localite.id).toBe('Q6106');
  });

  it('prefere la ligne au code postal, puis la ville a son quartier', () => {
    const r = choisirVille(
      [
        { nom: 'Hackney', rang: 1, force: 2 },
        { nom: 'London', rang: 1, force: 2 },
      ],
      localites,
      'GB'
    );
    expect(r?.localite.id).toBe('Q84');
  });

  it('ecarte un hameau et une ville d un autre pays', () => {
    expect(choisirVille([{ nom: 'Box', rang: 1, force: 2 }], localites, 'GB')).toBeNull();
    expect(choisirVille([{ nom: 'Portland', rang: 1, force: 2 }], localites, 'GB')).toBeNull();
  });

  it('une source plus sure passe devant une plus peuplee', () => {
    const r = choisirVille(
      [
        { nom: 'London', rang: 3, force: 1 },
        { nom: 'Hackney', rang: 1, force: 2 },
      ],
      localites,
      'GB'
    );
    expect(r?.localite.id).toBe('Q205679');
  });
});
