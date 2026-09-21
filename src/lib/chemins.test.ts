/* LA TRADUCTION CHEMIN VERS ANCRE, ET SURTOUT CE QU'ELLE NE DOIT PLUS TIRER.
 *
 * Ce test existe pour une raison mesuree le 21 septembre 2026 : `chemins.ts`
 * importait le corpus, et comme `main.tsx` l'appelle au demarrage, 1254 Ko
 * entraient dans le bundle d'entree de chaque page. La table est desormais
 * generee au build. Le test verifie que la traduction est juste ET que les
 * anciennes adresses continuent de repondre. */

import { describe, expect, it } from 'vitest';
import { hashDuChemin, langueDuChemin, slug } from './chemins.ts';

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
