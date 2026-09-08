// @vitest-environment jsdom
/* CE QUE LE LECTEUR DE SET PROMET, VERIFIE SANS SON.

   jsdom n'a pas de moteur audio : `play()` n'y est pas implemente. On le
   remplace par une promesse tenue qui emet `play`, comme un navigateur le
   ferait apres le geste, et `pause()` par son symetrique. Ce qui est teste
   est la MACHINE, pas le son : qu'un set charge survit a l'absence de tout
   composant, qu'un autre lecteur qui demarre fait taire celui-ci, et qu'une
   ecoute n'est comptee qu'une fois. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./sets.ts', () => ({
  urlAudio: (chemin: string) => `https://sons.test/${chemin}`,
  compterEcoute: vi.fn(() => Promise.resolve()),
}));

import { compterEcoute, type SetDJ } from './sets.ts';
import {
  annoncerLecture,
  arreterLeSet,
  basculerLeSet,
  chercherDansLeSet,
  etatDeLectureSet,
  jouerLeSet,
  reinitialiserPourTests,
} from './lecture-set.ts';

const set = (id: string): SetDJ => ({
  id,
  titre: `Set ${id}`,
  description: null,
  audio_path: `${id}.mp3`,
  cover_path: null,
  duree_s: 3600,
  onde: null,
  ecoutes: 0,
  created_at: '2026-09-07T00:00:00Z',
  user_id: 'u1',
  genre_ids: null,
});

const attendre = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  reinitialiserPourTests();
  /* `paused` est en lecture seule chez jsdom et ne bouge jamais : on le
     redefinit sur l'instance, puisque c'est lui que `basculer` interroge. */
  const poserPause = (a: HTMLMediaElement, valeur: boolean): void => {
    Object.defineProperty(a, 'paused', { value: valeur, configurable: true });
  };
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    poserPause(this, false);
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    poserPause(this, true);
    this.dispatchEvent(new Event('pause'));
  });
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(compterEcoute).mockClear();
});

describe('lecture-set', () => {
  it('au repos, rien ne joue et aucun set n est charge', () => {
    expect(etatDeLectureSet()).toMatchObject({ set: null, joue: false });
  });

  it('jouer un set le charge, le lance, et le garde sans aucun composant', async () => {
    jouerLeSet(set('a'));
    await attendre();
    const e = etatDeLectureSet();
    expect(e.set?.id).toBe('a');
    expect(e.joue).toBe(true);
    expect(e.duree).toBe(3600);
  });

  it('basculer met en pause puis relance le meme set', async () => {
    jouerLeSet(set('a'));
    await attendre();
    basculerLeSet();
    expect(etatDeLectureSet().joue).toBe(false);
    basculerLeSet();
    await attendre();
    expect(etatDeLectureSet().joue).toBe(true);
  });

  it('un autre set remplace le premier et repart de zero', async () => {
    jouerLeSet(set('a'));
    await attendre();
    chercherDansLeSet(120);
    expect(etatDeLectureSet().position).toBe(120);
    jouerLeSet(set('b'));
    await attendre();
    expect(etatDeLectureSet().set?.id).toBe('b');
    expect(etatDeLectureSet().position).toBe(0);
  });

  it('quand YouTube demarre, le set se tait ; quand le set demarre, il l annonce', async () => {
    const annonces: string[] = [];
    window.addEventListener('sonaa:lecture', (e) => annonces.push((e as CustomEvent<string>).detail));
    jouerLeSet(set('a'));
    await attendre();
    expect(annonces).toEqual(['set']);
    annoncerLecture('youtube');
    expect(etatDeLectureSet().joue).toBe(false);
  });

  it('une ecoute est comptee une fois par set, pas une fois par appui', async () => {
    jouerLeSet(set('a'));
    await attendre();
    basculerLeSet();
    basculerLeSet();
    jouerLeSet(set('a'));
    await attendre();
    expect(vi.mocked(compterEcoute)).toHaveBeenCalledTimes(1);
    jouerLeSet(set('b'));
    await attendre();
    expect(vi.mocked(compterEcoute)).toHaveBeenCalledTimes(2);
  });

  it('arreter oublie le set : la barre n a plus rien a montrer', async () => {
    jouerLeSet(set('a'));
    await attendre();
    arreterLeSet();
    expect(etatDeLectureSet()).toMatchObject({ set: null, joue: false, position: 0 });
  });
});
