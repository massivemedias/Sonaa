import { describe, expect, it } from 'vitest';
import { classerLabels, classerMixtapes, classerNews, classerSoirees, jeudiDeLaSemaine, numeroDeSemaine, stylesDuLabel, type ArticleNews } from './reel-semaine.ts';
import { cleDeLabel, type EntreeLabel } from './labels.ts';
import type { Soiree } from './agenda.ts';

const soiree = (id: string, titre: string, date: string, interesses: number): Soiree => ({
  id, titre, date, debut: date, lieu: 'Stereo', artistes: [], genres: [], affiche: null, lien: '', interesses,
});
const article = (source: string, titre: string, date: string, image: string | null = 'x'): ArticleNews => ({ source, titre, lien: `${source}/${titre}`, date, image, resume: '' });
const label = (s: string, n: string, c: number, r: number): EntreeLabel => ({ s, n, k: [cleDeLabel(n)], c, p: null, a: null, r });

describe('la semaine du reel', () => {
  it('le jeudi est celui de la semaine du lundi au dimanche', () => {
    expect(jeudiDeLaSemaine(new Date(2026, 9, 31)).getDate()).toBe(29); // samedi 31 oct.
    expect(jeudiDeLaSemaine(new Date(2026, 10, 2)).getDate()).toBe(5); // lundi 2 nov.
    expect(jeudiDeLaSemaine(new Date(2026, 10, 5, 22)).getDate()).toBe(5); // le jeudi lui-meme
  });
  it('le numero de semaine change le lundi, pas avant', () => {
    expect(numeroDeSemaine(new Date(2026, 10, 1))).toBe(numeroDeSemaine(new Date(2026, 9, 26)));
    expect(numeroDeSemaine(new Date(2026, 10, 2))).toBe(numeroDeSemaine(new Date(2026, 10, 1)) + 1);
  });
});

describe('les soirees', () => {
  it('la mise en avant passe devant, puis les plus interessantes, rendues dans l’ordre des dates', () => {
    const liste = [soiree('a', 'A', '2026-11-07T23:00', 300), soiree('b', 'B', '2026-11-06T22:00', 10), soiree('c', 'C', '2026-11-08T21:00', 50), soiree('d', 'D', '2026-11-06T23:00', 5)];
    const choix = classerSoirees(liste, new Set(['d']), 3);
    expect(choix.map((s) => s.id)).toEqual(['d', 'a', 'c']);
  });
  it('une soiree annoncee deux fois ne compte qu’une fois', () => {
    const liste = [soiree('a', 'Piknic', '2026-11-08', 9), soiree('b', 'piknic ', '2026-11-08', 9)];
    expect(classerSoirees(liste, new Set(), 6)).toHaveLength(1);
  });
});

describe('les news', () => {
  const maintenant = new Date('2026-11-05T12:00:00Z');
  it('une histoire racontee par plusieurs sites passe devant, une news par source', () => {
    const liste = [
      article('gearnews', 'Free Halloween groove box', '2026-11-05T10:00:00Z'),
      article('djmag', 'Awakenings announces Amsterdam lineup', '2026-11-03T10:00:00Z'),
      article('mixmag', 'Awakenings adds a second stage', '2026-11-02T10:00:00Z'),
      article('djmag', 'Another djmag story', '2026-11-05T09:00:00Z'),
      article('ra', 'Old story', '2026-10-20T10:00:00Z'),
    ];
    const choix = classerNews(liste, maintenant, 3);
    expect(choix[0]?.titre).toContain('Awakenings');
    expect(new Set(choix.map((a) => a.source)).size).toBe(choix.length);
    expect(choix.some((a) => a.titre === 'Old story')).toBe(false);
  });
});

describe('les mixtapes', () => {
  it('les auditeurs de la semaine comptent plus que les ecoutes de toujours', () => {
    const sets = [
      { id: 'vieille', created_at: '2026-01-01', ecoutes: 400 },
      { id: 'ecoutee', created_at: '2026-09-01', ecoutes: 3 },
    ];
    expect(classerMixtapes(sets, [{ id: 'ecoutee', auditeurs: 2, minutes: 40 }], new Date('2026-11-05'), 1)[0]?.id).toBe('ecoutee');
  });
});

describe('le label de la semaine', () => {
  const index = [label('drumcode', 'Drumcode', 12, 900), label('tresor', 'Tresor', 30, 5000), label('warp', 'Warp Records', 25, 8000), label('mini', 'Mini', 1, 10)];
  const maintenant = new Date('2026-11-05T12:00:00Z');
  it('les news de la semaine qui le nomment le designent', () => {
    const news = [article('djmag', 'Drumcode label night at ADE', '2026-11-04T10:00:00Z')];
    expect(classerLabels(index, [], news, maintenant)[0]?.label.s).toBe('drumcode');
  });
  it('les pages vues sur SONAA comptent aussi', () => {
    expect(classerLabels(index, [{ slug: 'tresor', vues: 4, visiteurs: 3 }], [], maintenant)[0]?.label.s).toBe('tresor');
  });
  it('sans chiffres, le label tourne d’une semaine a l’autre', () => {
    const a = classerLabels(index, [], [], maintenant)[0]?.label.s;
    const b = classerLabels(index, [], [], new Date('2026-11-12T12:00:00Z'))[0]?.label.s;
    expect(a).not.toBe(b);
  });
  it('un nom qui est aussi un mot ne fait pas un label de la semaine', () => {
    const avec = [...index, label('logic', 'Logic Records', 4, 100), label('touch', 'Touch', 4, 100)];
    const news = [article('musictech', 'Logic Pro 12 adds a stem splitter', '2026-11-04T10:00:00Z'), article('gearnews', 'Touch screens everywhere', '2026-11-04T10:00:00Z', 'x')];
    const lus = [{ ...news[1], resume: 'a touch of class' } as ArticleNews, news[0] as ArticleNews];
    const premiers = classerLabels(avec, [], lus, maintenant).filter((x) => x.mentions > 0).map((x) => x.label.s);
    expect(premiers).not.toContain('logic');
    expect(premiers).not.toContain('touch');
  });
  it('les majors ne tournent pas', () => {
    const avec = [label('virgin', 'Virgin', 90, 99999), ...index];
    for (const jour of ['2026-11-05', '2026-11-12', '2026-11-19', '2026-11-26']) {
      expect(classerLabels(avec, [], [], new Date(`${jour}T12:00:00Z`), 3).map((x) => x.label.s)).not.toContain('virgin');
    }
  });
  it('un label sans morceaux dans l’atlas n’est jamais propose', () => {
    expect(classerLabels(index, [{ slug: 'mini', vues: 99, visiteurs: 9 }], [], maintenant).some((x) => x.label.s === 'mini')).toBe(false);
  });
  it('son style est celui ou il a le plus de morceaux', () => {
    const genres = [
      { id: 'detroittechno', labels: ['Tresor', null, 'Warp'] },
      { id: 'dubtechno', labels: ['Tresor', 'Tresor'] },
    ];
    expect(stylesDuLabel(index[1] as EntreeLabel, genres, cleDeLabel)).toEqual(['dubtechno', 'detroittechno']);
  });
});
