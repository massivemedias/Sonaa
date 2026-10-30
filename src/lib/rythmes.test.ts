import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import RYTHMES from '../data/rythmes.json';
import CORPUS from '../data/corpus.json';
import { defautsDuMotif, type Motif } from './rythmes.ts';
import { TEINTES } from '../atlas/rythme/dessin.ts';

const motifs = RYTHMES as unknown as Record<string, Motif>;

describe('les motifs rythmiques', () => {
  it('donnent un motif a chaque style du corpus', () => {
    const manquants = CORPUS.genres.map((g) => g.id).filter((id) => !motifs[id]);
    expect(manquants).toEqual([]);
  });

  it('sont tous bien formes', () => {
    const fautes = Object.entries(motifs).flatMap(([id, m]) => {
      const d = defautsDuMotif(m);
      return [...(m.id === id ? [] : ['id']), ...d].map((x) => `${id} : ${x}`);
    });
    expect(fautes).toEqual([]);
  });

  it('restent dans la fourchette de tempo du corpus', () => {
    const hors = CORPUS.genres.flatMap((g) => {
      const m = motifs[g.id];
      const b = g.bpm as number[] | null;
      if (!m || !b || b.length !== 2) return [];
      const [min, max] = b as [number, number];
      return m.bpm < min || m.bpm > max ? [`${g.id} : ${m.bpm} hors ${min}-${max}`] : [];
    });
    expect(hors).toEqual([]);
  });

  it('ne donnent jamais deux fois le meme motif', () => {
    const vus = new Map<string, string>();
    const doubles: string[] = [];
    for (const [id, m] of Object.entries(motifs)) {
      const cle = `${m.bpm}|${m.pistes.map((p) => `${p.voix}:${p.pas.join('')}`).join('|')}`;
      const deja = vus.get(cle);
      if (deja) doubles.push(`${deja} = ${id}`);
      else vus.set(cle, id);
    }
    expect(doubles).toEqual([]);
  });
});

describe('les teintes de piste', () => {
  it('sont celles des jetons --piste-1 a --piste-5', () => {
    const css = readFileSync('src/design/tokens.css', 'utf8');
    const jetons = [1, 2, 3, 4, 5].map((i) => css.match(new RegExp(`--piste-${i}: (#[0-9a-f]{6});`))?.[1]);
    expect(jetons).toEqual([...TEINTES]);
  });
});
