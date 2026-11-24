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

describe('les pieges des adresses', () => {
  const villes = new Map<string, Localite[]>([
    ['New York', [{ ...loc('5128581', 'New York', 8_800_000, 'US'), region: 'NY' }]],
    ['York', [loc('2633352', 'York', 156_000, 'GB'), { ...loc('4562407', 'York', 44_000, 'US'), region: 'PA' }]],
    ['Springfield', [{ ...loc('4409896', 'Springfield', 170_000, 'US'), region: 'MO' }, { ...loc('4525353', 'Springfield', 58_000, 'US'), region: 'OH' }]],
  ]);

  it('ne prend pas « York » dans « New York »', () => {
    const c = lieuxDuContact('161 West 54th Street Suite 401\nNew York NY 10019');
    expect(choisirVille(c, villes, 'GB')).toBeNull();
    expect(choisirVille(c, villes, 'US')?.localite.id).toBe('5128581');
  });

  it('departage les homonymes americains par l Etat ecrit sur la ligne', () => {
    const c = lieuxDuContact('Dungeons Deep Records\nPO Box 255\nSpringfield, Ohio 45501\nUSA');
    expect(choisirVille(c, villes, 'US')?.localite.id).toBe('4525353');
  });

  it('prend la premiere adresse d une fiche, pas la plus peuplee', () => {
    const villesBe = new Map<string, Localite[]>([
      ['Zoersel', [loc('2783310', 'Zoersel', 22_000, 'BE')]],
      ['Deurne', [loc('2802031', 'Deurne', 78_000, 'BE')]],
    ]);
    const c = lieuxDuContact('Byte Records\nSchriekbos 105\nB-2980 Zoersel\nBelgium\n\nPaulus Beyestraat 39\nB-2100 Deurne\nBelgium');
    expect(choisirVille(c, villesBe, 'BE')?.localite.id).toBe('2783310');
  });

  it('lit « Quebec » seul dans une adresse comme la province', () => {
    expect(noms(lieuxDuContact('1736, Dublin\nInverness, G0S 1K0\nQuebec, Canada'))).not.toContain('Quebec');
    expect(noms(lieuxDuTexte('Psychill label based in Quebec, Canada.'))).not.toContain('Quebec');
    expect(noms(lieuxDuTexte('Label based in Quebec City since 2001.'))).toContain('Quebec City');
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
