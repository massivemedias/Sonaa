import { describe, expect, it } from 'vitest';
import { bpmAffiche, crossfader, decibelsEq, dosage, filtreDuBouton, gainDuFader, ledsAllumees, pics, pitchEnPourcent, tempsAffiche, tonaliteCourte } from './calculs.ts';
import { genreAudius } from './audius.ts';
import { garderReperes, lireReperes } from './memoire.ts';

describe('la tonalite', () => {
  it('se dit court et en Camelot', () => {
    expect(tonaliteCourte('D flat minor')).toEqual({ nom: 'D♭m', camelot: '12A' });
    expect(tonaliteCourte('A major')).toEqual({ nom: 'A', camelot: '11B' });
    expect(tonaliteCourte('F sharp minor')).toEqual({ nom: 'F♯m', camelot: '11A' });
    expect(tonaliteCourte(null)).toBeNull();
  });
});

describe('le pitch', () => {
  it('suit la plage et change le BPM affiche', () => {
    expect(pitchEnPourcent(0.5, 6)).toBe(3);
    expect(pitchEnPourcent(-1, 12)).toBe(-12);
    expect(bpmAffiche(123, 2)).toBe('125.5');
    expect(bpmAffiche(null, 0)).toBe('---.-');
  });
});

describe('la table', () => {
  it('ne filtre rien au milieu, ferme les aigus a gauche, coupe les basses a droite', () => {
    expect(filtreDuBouton(0).type).toBe('aucun');
    expect(filtreDuBouton(-1)).toEqual({ type: 'bas', frequence: 150 });
    expect(filtreDuBouton(1).type).toBe('haut');
    expect(Math.round(filtreDuBouton(1).frequence)).toBe(6000);
  });
  it('egalise de -26 a +6 dB et garde la puissance au milieu du crossfader', () => {
    expect(decibelsEq(-1)).toBe(-26);
    expect(decibelsEq(1)).toBe(6);
    expect(gainDuFader(1)).toBe(1);
    const m = crossfader(0);
    expect(m.a ** 2 + m.b ** 2).toBeCloseTo(1);
    expect(crossfader(-1).b).toBeCloseTo(0);
  });
  it('ecrit le temps au dixieme', () => {
    expect(tempsAffiche(201.46)).toBe('03:21.5');
  });
  it('resume une onde par tranches', () => {
    const c = new Float32Array([0, 0.5, 0, 0, 0, -0.9, 0, 0]);
    const p = pics([c], 2);
    expect(p[0]).toBeCloseTo(0.5);
    expect(p[1]).toBeCloseTo(0.9);
  });
});

describe('du style au genre Audius', () => {
  it('lit le nom du style, puis la famille', () => {
    expect(genreAudius('bass', 'Liquid Drum and Bass')).toBe('Drum & Bass');
    expect(genreAudius('house', 'Deep House')).toBe('Deep House');
    expect(genreAudius('minimal', 'Microhouse')).toBe('House');
    expect(genreAudius('roots', 'Dub')).toBe('Electronic');
  });
});

describe('la memoire des cues', () => {
  it('relit ce qui a ete garde, et rien d abime', () => {
    const boite = new Map<string, string>();
    const stockage = { getItem: (k: string) => boite.get(k) ?? null, setItem: (k: string, v: string) => void boite.set(k, v) };
    garderReperes('x', { cue: 12.5, chauds: [1, null, 3.25, null] }, stockage);
    expect(lireReperes('x', stockage)).toEqual({ cue: 12.5, chauds: [1, null, 3.25, null] });
    boite.set('sonaa-cues-y', 'pas du json');
    expect(lireReperes('y', stockage).cue).toBeNull();
  });
});

describe('le VU-metre', () => {
  it('allume ses quinze segments en decibels', () => {
    expect(ledsAllumees(0)).toBe(0);
    expect(ledsAllumees(1)).toBe(15);
    expect(ledsAllumees(2)).toBe(15);
    // -6 dB : treize segments sur quinze
    expect(ledsAllumees(0.5)).toBe(13);
    // -40 dB : rien
    expect(ledsAllumees(0.01)).toBe(0);
  });
});

describe('la dose des effets', () => {
  it('laisse passer le son tel quel a zero', () => {
    for (const nom of ['disto', 'crush', 'chorus', 'flanger', 'trans', 'delay', 'reverb']) {
      expect(dosage(nom, 0)).toEqual({ sec: 1, humide: 0 });
    }
  });
  it('remplace, melange ou ajoute selon l effet', () => {
    expect(dosage('disto', 1)).toEqual({ sec: 0, humide: 1 });
    expect(dosage('chorus', 1)).toEqual({ sec: 0.5, humide: 0.8 });
    expect(dosage('reverb', 1).sec).toBe(1);
  });
});
