import { describe, expect, it } from 'vitest';
import { estReedition, formesDuNom, nomme, rangerLesNews } from './actu-labels.ts';

describe('formesDuNom', () => {
  it('cherche aussi le nom sans Records', () => {
    expect(formesDuNom('Warp Records')).toEqual([
      { forme: 'Warp Records', seul: false },
      { forme: 'Warp', seul: true },
    ]);
  });
  it('ecarte les mots trop communs', () => {
    expect(formesDuNom('Club')).toEqual([]);
  });
});

describe('nomme', () => {
  it('reconnait un nom de plusieurs mots tel quel', () => {
    expect(nomme('The Mole to Release Fifth Album on Circus Company', 'Circus Company', false)).toBe(true);
    expect(nomme('Get Physical and M.A.N.D.Y. Co-Founder Philipp Jung Has Passed Away', 'Get Physical', false)).toBe(true);
  });
  it('demande un contexte de label pour un nom d un seul mot', () => {
    expect(nomme('Bjarki returns with a new EP on Warp', 'Warp', true)).toBe(true);
    expect(nomme('Warp Records boss Steve Beckett', 'Warp', true)).toBe(true);
    expect(nomme('Warp speed: how producers work faster', 'Warp', true)).toBe(false);
    expect(nomme('Mute your monitors before mixing', 'Mute', true)).toBe(false);
  });
  it('ne trouve pas le nom dans un autre mot', () => {
    expect(nomme('New EP on Warpaint Records', 'Warp', true)).toBe(false);
  });
});

describe('rangerLesNews', () => {
  const article = { source: 'xlr8r', titre: 'The Mole to Release Fifth Album on Circus Company', lien: 'https://xlr8r.com/a', date: '2026-10-08T10:00:00Z', image: null, resume: '' };
  it('range un article sous le label qu il nomme, une seule fois', () => {
    const une = rangerLesNews([{ slug: 'circus-company', nom: 'Circus Company' }], [article], {});
    expect(une.ajouts).toBe(1);
    expect(une.actu['circus-company']?.news?.[0]?.lien).toBe('https://xlr8r.com/a');
    const deux = rangerLesNews([{ slug: 'circus-company', nom: 'Circus Company' }], [article], une.actu);
    expect(deux.ajouts).toBe(0);
    expect(deux.actu['circus-company']?.news).toHaveLength(1);
  });
});

describe('estReedition', () => {
  it('reconnait les reeditions, repressages et compilations', () => {
    expect(estReedition('LP, Album, RP')).toBe(true);
    expect(estReedition('3x12", Album, RP + 12", S/Sided, Etch + Album')).toBe(true);
    expect(estReedition('Box, Comp + CD, Album + 3xCD, Maxi')).toBe(true);
    expect(estReedition('LP, Album, RE, 180')).toBe(true);
  });
  it('laisse passer les sorties neuves', () => {
    expect(estReedition('12", EP')).toBe(false);
    expect(estReedition('3xFile, MP3, EP, 320')).toBe(false);
    expect(estReedition('LP, Album, Pur')).toBe(false);
    expect(estReedition(null)).toBe(false);
  });
});

describe('nomme, dans un nom plus long', () => {
  it('ne prend pas un mot d un autre nom pour le label', () => {
    expect(nomme('The Mole to Release Fifth Album on Circus Company', 'Circus', true)).toBe(false);
    expect(nomme('The Glazmo Network founder has been doing research', 'Network', true)).toBe(false);
  });
  it('garde le nom suivi de Records', () => {
    expect(nomme('A new EP on Warp Records this month', 'Warp', true)).toBe(true);
  });
});
