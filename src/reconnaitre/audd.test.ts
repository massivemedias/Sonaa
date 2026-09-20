/* LA LECTURE DE LA REPONSE D'AUDD : le cas propre, le cas partiel, le cas
   null. Les trois arrivent en production, et le troisieme est le plus
   frequent : une radio qui parle ne contient aucun morceau a reconnaitre. */

import { describe, expect, it } from 'vitest';
import { lireReponseAudd } from './audd.ts';

const complet = {
  status: 'success',
  result: {
    artist: 'Basic Channel',
    title: 'Phylyps Trak',
    album: 'BCD',
    release_date: '1995-01-01',
    song_link: 'https://lis.tn/PhylypsTrak',
    apple_music: {
      url: 'https://music.apple.com/ca/album/phylyps-trak/1',
      artwork: { url: 'https://is1.mzstatic.com/image/{w}x{h}{c}.{f}', width: 1400 },
    },
    spotify: {
      external_urls: { spotify: 'https://open.spotify.com/track/abc' },
      album: { images: [{ url: 'https://i.scdn.co/image/abc', height: 640 }] },
    },
  },
};

describe('la reponse d AudD', () => {
  it('lit une reponse complete', () => {
    const m = lireReponseAudd(complet);
    expect(m).not.toBeNull();
    expect(m?.artiste).toBe('Basic Channel');
    expect(m?.titre).toBe('Phylyps Trak');
    expect(m?.album).toBe('BCD');
  });

  /* LE GABARIT D'APPLE DOIT ETRE REMPLI, sinon l'image ne charge pas et la
     tuile reste vide sans dire pourquoi. */
  it('remplit le gabarit de la pochette Apple', () => {
    expect(lireReponseAudd(complet)?.pochette).toBe('https://is1.mzstatic.com/image/400x400{c}.jpg');
  });

  it('rend les liens de plateformes, AudD puis Apple puis Spotify', () => {
    expect(lireReponseAudd(complet)?.liens.map((l) => l.nom)).toEqual(['AudD', 'Apple Music', 'Spotify']);
  });

  it('se rabat sur la pochette Spotify quand Apple n en a pas', () => {
    const sansApple = { ...complet, result: { ...complet.result, apple_music: undefined } };
    expect(lireReponseAudd(sansApple)?.pochette).toBe('https://i.scdn.co/image/abc');
  });

  it('accepte un morceau sans album, sans pochette et sans lien', () => {
    const nu = { status: 'success', result: { artist: 'Inconnu', title: 'Sans rien' } };
    const m = lireReponseAudd(nu);
    expect(m).toEqual({ artiste: 'Inconnu', titre: 'Sans rien', album: null, pochette: null, liens: [] });
  });

  it('rend null quand AudD n a rien reconnu', () => {
    expect(lireReponseAudd({ status: 'success', result: null })).toBeNull();
  });

  it('rend null sur une erreur, un corps vide ou une forme inattendue', () => {
    expect(lireReponseAudd({ status: 'error', error: { error_code: 901 } })).toBeNull();
    expect(lireReponseAudd(null)).toBeNull();
    expect(lireReponseAudd('texte')).toBeNull();
    expect(lireReponseAudd({ status: 'success', result: { artist: 'Seul' } })).toBeNull();
    expect(lireReponseAudd({ status: 'success', result: { artist: '  ', title: 'x' } })).toBeNull();
  });
});
