/* CE QUE L'IMAGE POUR INSTAGRAM PROMET, hors du dessin lui-meme : la toile
   n'existe pas sous Node, mais la coupe des lignes, la date en lettres, le
   texte du post et le nom du fichier sont de la logique pure, et c'est la
   que se cachent les fautes visibles (une date dans le mauvais fuseau, un
   titre coupe au milieu d'un mot, un mot-cle avec un accent). */
import { describe, expect, it } from 'vitest';
import { couperEnLignes, nomDeFichier, quandEnLettres, texteDuPost } from './affiche-insta.ts';

/* Une mesure de dix unites par lettre : assez pour raisonner sur des coupes. */
const mesure = (s: string): number => s.length * 10;

describe('couperEnLignes', () => {
  it('coupe entre les mots, jamais dedans', () => {
    expect(couperEnLignes(mesure, 'Nina Kraviz au Stade olympique', 150, 3)).toEqual([
      'Nina Kraviz au',
      'Stade olympique',
    ]);
  });
  it('marque la coupe quand il y a trop de lignes', () => {
    const lignes = couperEnLignes(mesure, 'un deux trois quatre cinq six sept', 90, 2);
    expect(lignes).toHaveLength(2);
    expect(lignes[1]?.endsWith('…')).toBe(true);
  });
  it('laisse entier un mot plus long qu une ligne', () => {
    expect(couperEnLignes(mesure, 'Supercalifragilistic ok', 100, 3)).toEqual(['Supercalifragilistic', 'ok']);
  });
});

describe('quandEnLettres', () => {
  it('ecrit la date dans le fuseau de la salle, pas celui de la machine', () => {
    /* 02:00 UTC le 13 = 22 h le 12 a Montreal. */
    expect(quandEnLettres('2026-09-13T02:00:00Z', 'America/Toronto', 'fr')).toBe('Samedi 12 septembre · 22 h 00');
    expect(quandEnLettres('2026-09-13T02:00:00Z', 'America/Toronto', 'en')).toMatch(/^Saturday, September 12 · 10:00 p\.?m\.?$/i);
  });
  it('rend vide sans date', () => {
    expect(quandEnLettres(null, 'America/Toronto', 'fr')).toBe('');
  });
});

describe('texteDuPost', () => {
  it('dit tout ce que l image dit, plus le lien et les mots-cles', () => {
    const texte = texteDuPost(
      {
        titre: 'Down2Techno',
        debut: '2026-09-13T02:00:00Z',
        lieu: 'Le Red Room',
        artistes: ['FEL!', 'Pinch'],
        affiche: null,
        lien: 'https://billets.example/x',
        genres: ['Techno', 'Deep House'],
      },
      'America/Toronto',
      'fr',
      'Montréal'
    );
    expect(texte.split('\n')).toEqual([
      'Down2Techno',
      'Samedi 12 septembre · 22 h 00',
      'Le Red Room',
      'FEL! · Pinch',
      '',
      'https://billets.example/x',
      '',
      '#sonaa #montreal #techno #deephouse',
    ]);
  });
});

describe('nomDeFichier', () => {
  it('aplatit le titre et finit en -story.png', () => {
    expect(nomDeFichier('Piknic Électronik #15 : Cloudy')).toBe('piknic-electronik-15-cloudy-story.png');
    expect(nomDeFichier('   ')).toBe('soiree-story.png');
  });
});
