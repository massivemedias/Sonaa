import { describe, expect, it } from 'vitest';
import { bpmAffiche, crossfader, decibelsEq, dosage, estimerBpm, filtreDuBouton, gainDuFader, ledsAllumees, pics, pitchEnPourcent, tempsAffiche, tonaliteCourte } from './calculs.ts';
import { genreAudius } from './audius.ts';
import { garderReperes, lireReperes } from './memoire.ts';
import { lireTags, titreDuNom } from './tags.ts';

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

/* Un faux morceau : un coup de grosse caisse (un bruit qui decroit vite) a
   chaque temps, et un charley plus faible entre les temps. */
function battement(bpm: number, secondes: number, frequence = 22050): Float32Array {
  const s = new Float32Array(Math.floor(secondes * frequence));
  const temps = (60 / bpm) * frequence;
  let graine = 1;
  const hasard = (): number => {
    graine = (graine * 16807) % 2147483647;
    return graine / 2147483647 - 0.5;
  };
  for (let t = 0; t < s.length; t += temps / 2) {
    const fort = Math.round(t / (temps / 2)) % 2 === 0;
    const debut = Math.floor(t);
    for (let i = 0; i < 2000 && debut + i < s.length; i += 1) s[debut + i] = (s[debut + i] ?? 0) + hasard() * (fort ? 1 : 0.25) * Math.exp(-i / 300);
  }
  return s;
}

describe('le BPM d un fichier', () => {
  it('trouve le tempo d une house, d une techno et d une drum and bass', () => {
    expect(estimerBpm(battement(124, 90), 22050)).toBe(124);
    expect(estimerBpm(battement(132, 90), 22050)).toBe(132);
    expect(estimerBpm(battement(174, 90), 22050)).toBe(174);
  });
  it('ne glisse pas aux deux tiers sur un morceau court et sature', () => {
    const s = battement(126, 40).map((v) => Math.max(-1, Math.min(1, v * 1.2)));
    expect(estimerBpm(s, 22050)).toBe(126);
  });
  it('se tait sur un silence ou un fichier trop court', () => {
    expect(estimerBpm(new Float32Array(22050 * 30), 22050)).toBeNull();
    expect(estimerBpm(new Float32Array(100), 22050)).toBeNull();
  });
});

describe('la tonalite des fichiers', () => {
  it('lit les notations courtes et Camelot', () => {
    expect(tonaliteCourte('Am')).toEqual({ nom: 'Am', camelot: '8A' });
    expect(tonaliteCourte('F#m')).toEqual({ nom: 'F♯m', camelot: '11A' });
    expect(tonaliteCourte('Db')).toEqual({ nom: 'D♭', camelot: '3B' });
    expect(tonaliteCourte('8A')).toEqual({ nom: 'Am', camelot: '8A' });
    expect(tonaliteCourte('Ebmin')).toEqual({ nom: 'E♭m', camelot: '2A' });
    expect(tonaliteCourte('rien')).toBeNull();
  });
});

/* Un tag ID3 fabrique a la main : en-tete, puis les cadres. */
function id3(version: 3 | 4, cadres: [string, Uint8Array][]): ArrayBuffer {
  const taille = (n: number, sur: boolean): number[] =>
    sur ? [(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127] : [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
  const corps: number[] = [];
  for (const [id, octets] of cadres) corps.push(...[...id].map((c) => c.charCodeAt(0)), ...taille(octets.length, version === 4), 0, 0, ...octets);
  return new Uint8Array([0x49, 0x44, 0x33, version, 0, 0, ...taille(corps.length, true), ...corps, 0xff, 0xfb]).buffer;
}
const latin = (t: string): Uint8Array => new Uint8Array([0, ...[...t].map((c) => c.charCodeAt(0))]);
const utf16 = (t: string): Uint8Array => {
  const o = [1, 0xff, 0xfe];
  for (const c of t) o.push(c.charCodeAt(0) & 255, c.charCodeAt(0) >> 8);
  return new Uint8Array(o);
};
const utf8 = (t: string): Uint8Array => new Uint8Array([3, ...new TextEncoder().encode(t)]);

describe('les tags d un fichier', () => {
  it('lit un ID3 v2.3 : titre, artiste en UTF-16, BPM, tonalite et pochette', () => {
    const pochette = new Uint8Array([0, ...[...'image/jpeg'].map((c) => c.charCodeAt(0)), 0, 3, 0, 0xff, 0xd8, 0xff]);
    const t = lireTags(id3(3, [['TIT2', latin('Mentasm')], ['TPE1', utf16('Joey Beltram')], ['TBPM', latin('128')], ['TKEY', latin('Am')], ['TPUB', latin('R&S')], ['APIC', pochette]]));
    expect(t.titre).toBe('Mentasm');
    expect(t.artiste).toBe('Joey Beltram');
    expect(t.bpm).toBe(128);
    expect(t.tonalite).toBe('Am');
    expect(t.label).toBe('R&S');
    expect(t.pochette?.type).toBe('image/jpeg');
    expect([...(t.pochette?.octets ?? [])]).toEqual([0xff, 0xd8, 0xff]);
  });
  it('lit un ID3 v2.4 en UTF-8 et ignore un fichier sans tag', () => {
    const t = lireTags(id3(4, [['TIT2', utf8('Pièce d’été')], ['TCON', latin('(18) Techno')]]));
    expect(t.titre).toBe('Pièce d’été');
    expect(t.genre).toBe('Techno');
    expect(lireTags(new Uint8Array([0xff, 0xfb, 0x90]).buffer)).toEqual({});
  });
  it('tire artiste et titre du nom du fichier', () => {
    expect(titreDuNom('01 Akufen - Deck The House.mp3')).toEqual({ artiste: 'Akufen', titre: 'Deck The House' });
    expect(titreDuNom('808 State - Pacific State.wav')).toEqual({ artiste: '808 State', titre: 'Pacific State' });
    expect(titreDuNom('sans_artiste.aiff')).toEqual({ artiste: '', titre: 'sans artiste' });
  });
});
