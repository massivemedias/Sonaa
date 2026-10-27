import { describe, expect, it } from 'vitest';
import { nomDeSource, regrouper } from './statistiques.ts';
import { lireTracklist } from './sets.ts';

describe('nomDeSource', () => {
  it('range les hotes sous le nom du service', () => {
    expect(nomDeSource('l.facebook.com', 'Direct')).toBe('Facebook');
    expect(nomDeSource('m.facebook.com', 'Direct')).toBe('Facebook');
    expect(nomDeSource('www.google.ca', 'Direct')).toBe('Google');
    expect(nomDeSource('instagram.com', 'Direct')).toBe('Instagram');
    expect(nomDeSource('t.co', 'Direct')).toBe('X');
    expect(nomDeSource('', 'Direct')).toBe('Direct');
    expect(nomDeSource('residentadvisor.net', 'Direct')).toBe('residentadvisor.net');
  });
  it('additionne ce qui porte le meme nom', () => {
    const r = regrouper(
      [
        { h: 'l.facebook.com', n: 3 },
        { h: 'm.facebook.com', n: 2 },
        { h: 'instagram.com', n: 4 },
      ],
      (x) => nomDeSource(x.h, 'Direct'),
      (x) => x.n
    );
    expect(r).toEqual([
      { nom: 'Facebook', valeur: 5 },
      { nom: 'Instagram', valeur: 4 },
    ]);
  });
});

describe('lireTracklist', () => {
  it('separe le temps du morceau, avec ou sans heures', () => {
    expect(lireTracklist('0:00 Intro\n4:32 Artiste - Titre\n1:02:03 Fin')).toEqual([
      { temps: 0, texte: 'Intro' },
      { temps: 272, texte: 'Artiste - Titre' },
      { temps: 3723, texte: 'Fin' },
    ]);
  });
  it('accepte les crochets et garde les lignes sans temps', () => {
    expect(lireTracklist('[12:34] Morceau\nUn morceau sans temps\n\n')).toEqual([
      { temps: 754, texte: 'Morceau' },
      { temps: null, texte: 'Un morceau sans temps' },
    ]);
  });
});
