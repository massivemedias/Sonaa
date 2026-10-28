import { describe, expect, it } from 'vitest';
import { lienDAchat, typeDuGroupe } from './affiliation.ts';

const IDS = { pluginboutique: 'pb123', awinEditeur: '9999', awinReverb: '67144' };

describe('liens d achat', () => {
  it('ne propose rien tant que les identifiants manquent', () => {
    expect(lienDAchat('Xfer Serum', 'plugin', { pluginboutique: '', awinEditeur: '', awinReverb: '' })).toBeNull();
    expect(lienDAchat('Roland TR-909', 'machine', { ...IDS, awinEditeur: '' })).toBeNull();
  });

  it('envoie les plugins, logiciels et sons chez Plugin Boutique avec l identifiant', () => {
    expect(lienDAchat('Xfer Serum', 'plugin', IDS)).toEqual({
      boutique: 'pluginboutique',
      url: 'https://www.pluginboutique.com/search?q=Xfer%20Serum&a_aid=pb123',
    });
    expect(lienDAchat('FL Studio', 'daw', IDS)?.boutique).toBe('pluginboutique');
    expect(lienDAchat('Splice', 'samples', IDS)?.boutique).toBe('pluginboutique');
  });

  it('ne propose pas les modules livres avec Live, mais propose Live et Push', () => {
    expect(lienDAchat('Ableton Operator', 'plugin', IDS)).toBeNull();
    expect(lienDAchat('Ableton Live', 'daw', IDS)?.boutique).toBe('pluginboutique');
    expect(lienDAchat('Ableton Push', 'machine', IDS)?.boutique).toBe('reverb');
  });

  it('envoie les machines chez Reverb par Awin, la recherche encodee dans ued', () => {
    const l = lienDAchat('Roland TR-909', 'machine', IDS);
    expect(l?.boutique).toBe('reverb');
    const u = new URL(l?.url ?? '');
    expect(u.origin + u.pathname).toBe('https://www.awin1.com/cread.php');
    expect(u.searchParams.get('awinmid')).toBe('67144');
    expect(u.searchParams.get('awinaffid')).toBe('9999');
    expect(u.searchParams.get('ued')).toBe('https://reverb.com/marketplace?query=Roland%20TR-909');
  });

  it('range les marques des news par ce qu elles vendent', () => {
    expect(typeDuGroupe('plugins')).toBe('plugin');
    expect(typeDuGroupe('logiciels')).toBe('plugin');
    expect(typeDuGroupe('synthes')).toBe('machine');
    expect(typeDuGroupe('dj')).toBe('machine');
  });
});
