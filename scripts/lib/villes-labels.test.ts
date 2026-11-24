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
    expect(noms(lieuxDuTexte('Electronic label based in New York City, run by two DJs.'))).toEqual(['New York City', 'New York']);
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
    [
      'Springfield',
      [
        { ...loc('4409896', 'Springfield', 170_000, 'US'), region: 'MO', lat: 37.2153, lng: -93.2982 },
        { ...loc('4525353', 'Springfield', 58_000, 'US'), region: 'OH', lat: 39.9242, lng: -83.8088 },
      ],
    ],
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
      ['Zoersel', [{ ...loc('2783310', 'Zoersel', 22_000, 'BE'), lat: 51.2683, lng: 4.7128 }]],
      ['Deurne', [{ ...loc('2802031', 'Deurne', 78_000, 'BE'), lat: 51.2193, lng: 4.4658 }]],
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

describe('les mots qui ne sont pas des villes', () => {
  it('ecarte un mois, un point cardinal seul et un immeuble', () => {
    expect(noms(lieuxDuContact('Current in March, 2009\nBIG LIFE MANAGEMENT'))).not.toContain('March');
    const rue = noms(lieuxDuContact('734 North Old World 3rd Street #59\nMilwaukee, WI 53203'));
    expect(rue).not.toContain('North');
    expect(rue).toContain('Milwaukee');
    expect(noms(lieuxDuContact('1F Sakura Bld.\n4-9-2 Minamisenba Chuoku\nOsaka'))).not.toContain('Sakura');
    expect(noms(lieuxDuContact('Unit 25 Shaftesbury Centre\n85 Barlby Road, London W10 6BN'))).not.toContain('Shaftesbury');
  });

  it('garde « New York » meme si « New » seul ne compte pas', () => {
    expect(noms(lieuxDuContact('New York NY 10019'))).toContain('New York');
    expect(noms(lieuxDuContact('New York NY 10019'))).not.toContain('New');
  });

  it('ne prend pas un Etat pour la ville du meme nom', () => {
    const villes = new Map<string, Localite[]>([['Oregon', [{ ...loc('5165418', 'Oregon', 20_000, 'US'), region: 'OH' }]]]);
    expect(choisirVille([{ nom: 'Oregon', rang: 2, force: 1 }], villes, 'US')).toBeNull();
  });

  it('rend un quartier a sa grande ville nommee dans la meme adresse', () => {
    const tokyo = { ...loc('1850147', 'Tokyo', 8_300_000, 'JP'), lat: 35.6895, lng: 139.6917 };
    const mejiro = { ...loc('10866030', 'Mejiro', 14_000, 'JP'), lat: 35.7206, lng: 139.7066 };
    const villes = new Map<string, Localite[]>([['Mejiro', [mejiro]], ['Tokyo', [tokyo]]]);
    const r = choisirVille(lieuxDuContact('Maison Mejiro 102\nShinjuku-ku, Tokyo 161-0033'), villes, 'JP');
    expect(r?.localite.id).toBe('1850147');
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
