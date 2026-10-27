/* LA TRADUCTION CHEMIN VERS ANCRE, ET SURTOUT CE QU'ELLE NE DOIT PLUS TIRER.
 *
 * Ce test existe pour une raison mesuree le 21 septembre 2026 : `chemins.ts`
 * importait le corpus, et comme `main.tsx` l'appelle au demarrage, 1254 Ko
 * entraient dans le bundle d'entree de chaque page. La table est desormais
 * generee au build. Le test verifie que la traduction est juste ET que les
 * anciennes adresses continuent de repondre. */

import { describe, expect, it } from 'vitest';
import { cheminAligne, cheminDuHash, hashDuChemin, langueDuChemin, slug } from './chemins.ts';

describe('slug', () => {
  it('met en minuscules, retire les accents et joint par un tiret', () => {
    expect(slug('Dub Techno')).toBe('dub-techno');
    expect(slug('Électro')).toBe('electro');
    expect(slug('Drum & Bass')).toBe('drum-et-bass');
  });
});

describe('hashDuChemin', () => {
  it('traduit un genre et une famille', () => {
    expect(hashDuChemin('/styles/techno/dub-techno/')).toMatch(/^#\/parcourir\/\d+\/\d+$/);
    expect(hashDuChemin('/styles/techno/')).toMatch(/^#\/parcourir\/\d+$/);
    expect(hashDuChemin('/styles/')).toBe('#/parcourir');
  });

  it('accepte un chemin sans barre finale', () => {
    expect(hashDuChemin('/styles/techno/dub-techno')).toBe(hashDuChemin('/styles/techno/dub-techno/'));
  });

  it('traduit les soirees, avec ou sans ville et sans identifiant', () => {
    expect(hashDuChemin('/soirees/montreal-ca/')).toBe('#/calendrier?city=montreal-ca');
    expect(hashDuChemin('/soirees/montreal-ca/techno/')).toBe('#/calendrier?city=montreal-ca');
    expect(hashDuChemin('/soirees/')).toBe('#/calendrier');
  });

  /* LES ANCIENNES ADRESSES SONT DANS DES LIENS PARTAGES ET DANS L'INDEX DE
     GOOGLE : elles doivent repondre tant que ces liens existent. */
  it('traduit la liste des labels et la page d un label', () => {
    expect(hashDuChemin('/labels/')).toBe('#/labels');
    expect(hashDuChemin('/labels/f-communications/')).toBe('#/labels/f-communications');
    expect(hashDuChemin('/labels/f-communications')).toBe('#/labels/f-communications');
  });

  it('garde /sons/ vivant a cote de /mixtapes/', () => {
    expect(hashDuChemin('/mixtapes/')).toBe('#/mixtapes');
    expect(hashDuChemin('/sons/')).toBe('#/mixtapes');
    const id = '221c6aaa-b5e8-4879-bcb6-b638086ebcaa';
    expect(hashDuChemin(`/sons/${id}/`)).toBe(`#/mixtapes/${id}`);
    expect(hashDuChemin(`/mixtapes/${id}/`)).toBe(`#/mixtapes/${id}`);
  });

  it('traduit les pages ouvertes depuis', () => {
    expect(hashDuChemin('/tracks/')).toBe('#/tracks');
    expect(hashDuChemin('/reconnaitre/')).toBe('#/reconnaitre');
    expect(hashDuChemin('/panier/')).toBe('#/panier');
    expect(hashDuChemin('/conditions/')).toBe('#/conditions');
    expect(hashDuChemin('/news/')).toBe('#/news');
    expect(hashDuChemin('/news/marques/')).toBe('#/news/marques');
    expect(hashDuChemin('/news/marques/elektron/')).toBe('#/news/marques/elektron');
    expect(hashDuChemin('/news/marques/elektron/analog-rytm/')).toBe('#/news/marques/elektron/analog-rytm');
    expect(hashDuChemin('/news/marques/elektron/analog-rytm')).toBe('#/news/marques/elektron/analog-rytm');
  });

  it('rend null pour un chemin qui n est pas du site', () => {
    expect(hashDuChemin('/rien/du/tout/')).toBeNull();
    expect(hashDuChemin('/')).toBeNull();
  });

  it('lit la langue dans le prefixe et traduit quand meme', () => {
    expect(langueDuChemin('/en/styles/techno/')).toBe('en');
    expect(langueDuChemin('/styles/techno/')).toBe('fr');
    expect(hashDuChemin('/en/styles/techno/dub-techno/')).toBe(hashDuChemin('/styles/techno/dub-techno/'));
  });
});

/* LE LIEN COPIE DANS LA BARRE EST CELUI QU'ON COLLE SUR FACEBOOK, qui ne lit
   pas l'ancre. Le 27 octobre 2026, sonaa.ca/#/mixtapes/<id> y montrait
   l'accueil au lieu de la mixtape. */
describe('cheminDuHash', () => {
  const id = '0fc7a483-fbd6-4662-8086-90f609574969';

  it('donne la page d une mixtape, meme par l ancienne ancre', () => {
    expect(cheminDuHash(`#/mixtapes/${id}`)).toBe(`/mixtapes/${id}/`);
    expect(cheminDuHash(`#/mixtapes/${id}?t=120`)).toBe(`/mixtapes/${id}/`);
    expect(cheminDuHash(`#/sets/${id}`)).toBe(`/mixtapes/${id}/`);
    expect(cheminDuHash('#/mixtapes')).toBe('/mixtapes/');
  });

  it('donne la page publique d un artiste', () => {
    const compte = '9b2f6c1e-3d4a-4f5b-8c7d-1e2f3a4b5c6d';
    expect(cheminDuHash(`#/mixtapes/a/${compte}`)).toBe(`/artistes/${compte}/`);
    expect(hashDuChemin(`/artistes/${compte}/`)).toBe(`#/mixtapes/a/${compte}`);
  });

  it('refait le chemin d un style a partir de son ancre', () => {
    const genre = hashDuChemin('/styles/techno/dub-techno/') ?? '';
    const famille = hashDuChemin('/styles/techno/') ?? '';
    expect(cheminDuHash(genre)).toBe('/styles/techno/dub-techno/');
    expect(cheminDuHash(famille)).toBe('/styles/techno/');
    expect(cheminDuHash('#/parcourir')).toBe('/styles/');
  });

  it('fait l aller retour avec hashDuChemin', () => {
    for (const chemin of ['/labels/', '/labels/f-communications/', '/news/', '/news/marques/elektron/analog-rytm/', '/tracks/', '/mentions/']) {
      expect(cheminDuHash(hashDuChemin(chemin) ?? '')).toBe(chemin);
    }
  });

  it('rend la racine pour le calendrier et pour une ancre sans page', () => {
    expect(cheminDuHash('#/calendrier?city=montreal-ca')).toBe('/');
    expect(cheminDuHash('#/profil/xyz')).toBe('/');
    expect(cheminDuHash('')).toBe('/');
  });
});

describe('cheminAligne', () => {
  const id = '0fc7a483-fbd6-4662-8086-90f609574969';

  it('met le chemin de la mixtape quand on y arrive depuis l accueil', () => {
    expect(cheminAligne(`#/mixtapes/${id}`, '/')).toBe(`/mixtapes/${id}/`);
    expect(cheminAligne(`#/mixtapes/${id}`, '/styles/techno/')).toBe(`/mixtapes/${id}/`);
  });

  it('garde un chemin qui mene deja a la meme page', () => {
    expect(cheminAligne(`#/mixtapes/${id}`, `/sons/${id}/`)).toBe(`/sons/${id}/`);
    const genre = hashDuChemin('/styles/techno/dub-techno/') ?? '';
    expect(cheminAligne(genre, '/en/styles/techno/dub-techno/')).toBe('/en/styles/techno/dub-techno/');
    expect(cheminAligne('#/calendrier?city=montreal-ca', '/soirees/montreal-ca/123/')).toBe('/soirees/montreal-ca/123/');
    expect(cheminAligne('', '/')).toBe('/');
    expect(cheminAligne('', '/games/isoku/')).toBe('/games/isoku/');
  });

  it('revient a la racine en quittant une page qui a un chemin', () => {
    expect(cheminAligne('#/calendrier', `/mixtapes/${id}/`)).toBe('/');
    expect(cheminAligne('#/profil/xyz', '/labels/')).toBe('/');
  });
});
