import { describe, expect, it } from 'vitest';
import { MARQUES, reconnaitreMarques } from './marques.ts';

describe('le catalogue des marques', () => {
  it('a des identifiants uniques et lisibles dans une adresse', () => {
    const ids = MARQUES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MARQUES) {
      expect(m.id).toMatch(/^[a-z0-9-]{1,60}$/);
      const p = m.produits.map((x) => x.id);
      expect(new Set(p).size, m.nom).toBe(p.length);
      for (const id of p) expect(id).toMatch(/^[a-z0-9-]{1,60}$/);
    }
  });
});

describe('reconnaitreMarques', () => {
  it('trouve la machine et sa marque', () => {
    expect(reconnaitreMarques('Elektron Analog Rytm MKII firmware 1.70 adds Euclidean mode')).toEqual({
      marques: ['elektron'],
      produits: ['elektron:analog-rytm'],
    });
    expect(reconnaitreMarques('Digitakt II review: the sampler grows up').produits).toEqual(['elektron:digitakt']);
    expect(reconnaitreMarques('Model:Samples tips').produits).toEqual(['elektron:model-samples']);
  });

  it('ne prend un nom courant que si la marque est nommee', () => {
    expect(reconnaitreMarques('Facebook Messenger gets a new look').marques).toEqual([]);
    expect(reconnaitreMarques('Moog Messenger review').produits).toEqual(['moog:messenger']);
    expect(reconnaitreMarques('Google DeepMind unveils a music model').marques).toEqual([]);
    expect(reconnaitreMarques('Behringer DeepMind 12 price drop').produits).toContain('behringer:deepmind');
    expect(reconnaitreMarques('The stream went live 12 days ago').marques).toEqual([]);
    expect(reconnaitreMarques('Ableton Live 12.1 adds stem separation').produits).toContain('ableton:live-12');
  });

  it('ne confond pas un mot avec une marque au nom ambigu', () => {
    expect(reconnaitreMarques('New waves of techno from Berlin').marques).toEqual([]);
    expect(reconnaitreMarques('The output of the mixer is clipping').marques).toEqual([]);
    expect(reconnaitreMarques('Output Arcade 2 is here').produits).toEqual(['output:arcade']);
    expect(reconnaitreMarques('Waves Audio releases Curves AQ').marques).toEqual(['waves']);
  });
});
