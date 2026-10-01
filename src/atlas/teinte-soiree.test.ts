import { describe, expect, it } from 'vitest';
import { FAMILIES } from './structures.ts';
import { teinteDesStyles } from './teinte-soiree.ts';

const teinte = (id: string): number | undefined => FAMILIES.find((f) => f.id === id)?.hue;

describe('teinteDesStyles', () => {
  it('lit une famille annoncee par son nom', () => {
    expect(teinteDesStyles(['Techno'])).toBe(teinte('techno'));
    expect(teinteDesStyles(['Trance', 'House'])).toBe(teinte('trance'));
  });

  it("ramene un genre du corpus a sa famille", () => {
    expect(teinteDesStyles(['Progressive House'])).toBe(teinte('house'));
    expect(teinteDesStyles(['Drum & Bass'])).toBe(teinteDesStyles(['drumandbass']));
    expect(teinteDesStyles(['Drum & Bass'])).not.toBeNull();
  });

  it('reconnait une famille contenue dans le nom', () => {
    expect(teinteDesStyles(['Hard Techno'])).toBe(teinte('techno'));
  });

  it('passe un style sans famille et prend le suivant', () => {
    expect(teinteDesStyles(['Funk / Soul', 'House'])).toBe(teinte('house'));
  });

  it("n'invente rien quand aucun style ne repond", () => {
    expect(teinteDesStyles([])).toBeNull();
    expect(teinteDesStyles(['Funk / Soul'])).toBeNull();
  });
});
