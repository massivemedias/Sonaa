import { describe, expect, it } from 'vitest';
import { lienAmazon, lienDAchat, liensDAchat, typeDuGroupe } from './affiliation.ts';

const IDS = { pluginboutique: 'pb123', awinEditeur: '9999', awinReverb: '67144', amazon: 'sonaa-20' };

describe('liens d achat', () => {
  it('ne propose rien tant que les identifiants manquent', () => {
    expect(lienDAchat('Xfer Serum', 'plugin', { pluginboutique: '', awinEditeur: '', awinReverb: '', amazon: '' })).toBeNull();
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

  it('ajoute Amazon.ca en second pour les machines, jamais pour les plugins', () => {
    expect(lienAmazon('Roland TR-909', 'machine', IDS)).toEqual({
      boutique: 'amazon',
      url: 'https://www.amazon.ca/s?k=Roland%20TR-909&tag=sonaa-20',
    });
    expect(lienAmazon('Xfer Serum', 'plugin', IDS)).toBeNull();
    expect(lienAmazon('Roland TR-909', 'machine', { ...IDS, amazon: '' })).toBeNull();
    expect(liensDAchat('Roland TR-909', 'machine', IDS).map((l) => l.boutique)).toEqual(['reverb', 'amazon']);
    expect(liensDAchat('Xfer Serum', 'plugin', IDS).map((l) => l.boutique)).toEqual(['pluginboutique']);
  });

  it('range les marques des news par ce qu elles vendent', () => {
    expect(typeDuGroupe('plugins')).toBe('plugin');
    expect(typeDuGroupe('logiciels')).toBe('plugin');
    expect(typeDuGroupe('synthes')).toBe('machine');
    expect(typeDuGroupe('dj')).toBe('machine');
  });
});
