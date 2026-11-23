import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import RYTHMES from '../../data/rythmes.json';
import CORPUS from '../../data/corpus.json';
import type { Motif } from '../../lib/rythmes.ts';
import { fichierDe, kitDuMotif } from './echantillons.ts';
import { INSTRUMENTS, sonAccorde, zoneDe } from './instruments.ts';
import { fichiersDuMotif, sonsDuMotif } from './son.ts';

const motifs = RYTHMES as unknown as Record<string, Motif>;
const styles = CORPUS.genres.flatMap((g) => {
  const m = motifs[g.id];
  return m ? [{ motif: m, famille: g.family }] : [];
});
const motif = (id: string): Motif => {
  const m = motifs[id];
  if (!m) throw new Error(id);
  return m;
};
const instrumentDe = (id: string, famille: string, voix: string): string | undefined => {
  const m = motif(id);
  const i = m.pistes.findIndex((p) => p.voix === voix);
  const s = sonsDuMotif(m, famille)[i];
  return s && 'instrument' in s ? s.instrument : s && 'frappe' in s ? s.frappe : undefined;
};

/* LE 16 NOVEMBRE 2026, MIKA : « refais la totale ». Plus aucun son n'est
   fabrique dans le navigateur : chaque piste de chaque style joue un
   fichier, choisi pour son style. */
describe(`les sons des ${CORPUS.genres.length} styles`, () => {
  it('existent tous dans public/sons', () => {
    const manquants = new Set<string>();
    for (const { motif: m, famille } of styles) {
      for (const nom of fichiersDuMotif(m, famille)) if (!existsSync(`public/sons/${nom}.wav`)) manquants.add(nom);
    }
    expect([...manquants]).toEqual([]);
  });

  it('donnent un son a chaque piste, sans exception', () => {
    const muettes: string[] = [];
    for (const { motif: m, famille } of styles) {
      sonsDuMotif(m, famille).forEach((s, i) => {
        if (!s) muettes.push(`${m.id}:${m.pistes[i]?.fr}`);
        else if ('instrument' in s && !INSTRUMENTS[s.instrument]) muettes.push(`${m.id}:${s.instrument}`);
      });
    }
    expect(muettes).toEqual([]);
  });

  it('ne transposent jamais une note enregistree de plus de quatre demi-tons', () => {
    const loin: string[] = [];
    for (const { motif: m, famille } of styles) {
      for (const nom of fichiersDuMotif(m, famille)) {
        const z = /^(.*)-(\d+)$/.exec(nom);
        const inst = z ? INSTRUMENTS[z[1] ?? ''] : undefined;
        if (!z || !inst?.zones?.length) continue;
        if (!inst.zones.includes(Number(z[2]))) loin.push(nom);
      }
    }
    expect(loin).toEqual([]);
    for (const [id, inst] of Object.entries(INSTRUMENTS)) {
      const zones = inst.zones ?? [];
      for (let k = 1; k < zones.length; k += 1) expect((zones[k] ?? 0) - (zones[k - 1] ?? 0), id).toBeLessThanOrEqual(9);
    }
  });

  it('chargent peu de fichiers par style', () => {
    for (const { motif: m, famille } of styles) expect(fichiersDuMotif(m, famille).length, m.id).toBeLessThan(45);
  });
});

describe('le choix des instruments refletent le sous-style', () => {
  it('donne a chaque style sa basse', () => {
    expect(instrumentDe('usdeephouse', 'house', 'bass')).toBe('basse-juno');
    expect(instrumentDe('psychedelictrance', 'psy', 'sub')).toBe('basse-psychedelictrance');
    expect(instrumentDe('disco', 'disco', 'bass')).toBe('basse-electrique');
    expect(instrumentDe('dub', 'roots', 'bass')).toBe('basse-dub');
    expect(instrumentDe('dubtechno', 'techno', 'sub')).toBe('sub-sinus');
    expect(instrumentDe('drumandbass', 'breaks', 'reese')).toBe('basse-reese');
    expect(instrumentDe('neurofunk', 'breaks', 'reese')).toBe('basse-reese-neuro');
    expect(instrumentDe('dubstep', 'bass', 'sub')).toBe('sub-sinus');
    expect(instrumentDe('hardstyle', 'hardcore', 'bass')).toBe('basse-reverse');
    expect(instrumentDe('amapiano', 'house', 'logdrum')).toBe('logdrum');
  });

  it('donne a chaque style ses accords', () => {
    expect(instrumentDe('dubtechno', 'techno', 'stab')).toBe('accord-dub');
    expect(instrumentDe('garagehouse', 'house', 'organ')).toBe('orgue-m1');
    expect(instrumentDe('italohouse', 'house', 'piano')).toBe('piano-rave');
    expect(instrumentDe('detroittechno', 'techno', 'strings')).toBe('cordes-synthe');
    expect(instrumentDe('phillysoul', 'roots', 'strings')).toBe('cordes');
  });

  it('joue la 303 avec son accent et la glisse sur la meme piste', () => {
    const m = motif('acidhouse');
    const p = m.pistes.find((x) => x.voix === 'acid');
    if (!p) throw new Error('acid');
    expect(sonAccorde(p, m, 'house')).toEqual({ instrument: 'basse-303', accent: 'basse-303-accent' });
  });

  it('prend un kick fait pour les styles durs, et la machine du style ailleurs', () => {
    expect(instrumentDe('gabber', 'hardcore', 'kick')).toBe('kick-gabber');
    expect(instrumentDe('hardstyle', 'hardcore', 'kick')).toBe('kick-hardstyle');
    expect(instrumentDe('psychedelictrance', 'psy', 'kick')).toBe('kick-psychedelictrance');
    expect(instrumentDe('detroittechno', 'techno', 'kick')).toBe('tr909-kick');
    expect(instrumentDe('acidhouse', 'house', 'kick')).toBe('tr808-kick');
    const micro = motif('microhouse');
    expect(fichierDe('perc', kitDuMotif(micro, 'minimal'), { voix: 'perc', fr: 'CLICS', en: 'CLICKS', pas: [2] }, micro, 'minimal')).toBe('clic');
  });

  it('joue le hi-tech avec les sons mesures sur ses morceaux de reference (ADR-123)', () => {
    expect(instrumentDe('hitech', 'psy', 'kick')).toBe('kick-hitech');
    expect(instrumentDe('hitech', 'psy', 'hat')).toBe('charley-fm');
    expect(instrumentDe('hitech', 'psy', 'openhat')).toBe('charley-fm-ouvert');
    expect(instrumentDe('hitech', 'psy', 'sub')).toBe('basse-hitech');
    expect(instrumentDe('hitech', 'psy', 'lead')).toBe('lead-zap');
    const m = motif('hitech');
    expect(m.bpm).toBe(180);
    /* la basse roule sur les trois doubles croches qui suivent chaque kick, jamais sur lui */
    expect(m.pistes.find((p) => p.voix === 'sub')?.pas.join('')).toBe('0222022202220222');
    expect(m.pistes.some((p) => p.voix === 'snare')).toBe(false);
  });

  it('donne a chaque style psy mesure son kick et sa basse (ADR-124)', () => {
    const psy = CORPUS.genres.filter((g) => g.family === 'psy' && g.id !== 'hitech');
    for (const g of psy) expect(instrumentDe(g.id, 'psy', 'kick'), g.id).toBe(`kick-${g.id}`);
    for (const id of ['goatrance', 'fullon', 'darkpsy', 'forestpsy', 'progpsy', 'twilightpsy', 'zenonesque', 'psytech', 'neogoa', 'morningfullon']) {
      expect(instrumentDe(id, 'psy', 'sub'), id).toBe(`basse-${id}`);
    }
    expect(instrumentDe('suomisaundi', 'psy', 'bass')).toBe('basse-suomisaundi');
    expect(instrumentDe('psycore', 'psy', 'bass')).toBe('basse-psycore');
    /* les tempos des references, en mediane par morceau */
    expect(motif('darkpsy').bpm).toBe(150);
    expect(motif('psycore').bpm).toBe(160);
    expect(motif('zenonesque').bpm).toBe(126);
  });

  it('choisit la zone la plus proche et la vitesse qui y mene', () => {
    const z = zoneDe('piano', 62);
    expect(z?.nom).toBe('piano-60');
    expect(z?.vitesse).toBeCloseTo(Math.pow(2, 2 / 12));
    expect(zoneDe('piano', 72)?.vitesse).toBe(1);
  });

  it('donnent leur provenance et leur licence', () => {
    const sources = readFileSync('public/sons/SOURCES.txt', 'utf8');
    for (const x of ['VCSL', 'VSCO', 'Sonic Pi', 'Faust', 'CC0']) expect(sources).toContain(x);
  });
});

/* LE 16 NOVEMBRE 2026, 31 FICHIERS SUR 67 N'AVAIENT PAS DE BLOC « data » :
   le navigateur refusait de les decoder, et la TR-909, la TR-808 et la
   batterie retombaient sur des sons synthetises. Chaque fichier de
   public/sons doit maintenant se lire jusqu'a son bloc de donnees. */
describe('les fichiers de public/sons', () => {
  const dossier = join(process.cwd(), 'public', 'sons');
  const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.wav'));
  it('ont tous un en-tete WAV valide avec un bloc de donnees non vide', () => {
    expect(fichiers.length).toBeGreaterThan(300);
    const abimes = fichiers.filter((f) => {
      const b = readFileSync(join(dossier, f));
      if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') return true;
      let i = 12;
      while (i + 8 <= b.length) {
        const id = b.toString('ascii', i, i + 4);
        const taille = b.readUInt32LE(i + 4);
        if (id === 'data') return taille === 0;
        if (!['fmt ', 'LIST', 'fact'].includes(id)) return true;
        i += 8 + taille + (taille % 2);
      }
      return true;
    });
    expect(abimes).toEqual([]);
  });

  it('sont tous decrits par la fiche ou par un kit', () => {
    const zones = new Set(Object.entries(INSTRUMENTS).flatMap(([id, x]) => (x.zones?.length ? x.zones.map((z) => `${id}-${z}.wav`) : [`${id}.wav`])));
    const orphelins = fichiers.filter((f) => /-\d+\.wav$/.test(f) && !/^(tr|sp|lm|cr|vcsl)/.test(f) && !zones.has(f));
    expect(orphelins).toEqual([]);
  });
});
