import { describe, expect, it } from 'vitest';
import { pertinent } from './filtre-news.ts';

/* Des articles reels des flux du 8 octobre 2026, titre et categories tels
   que les sites les donnent. */
describe('pertinent', () => {
  it('ecarte la guitare et la variete des generalistes', () => {
    expect(pertinent({ source: 'musicradar', titre: 'John Feldmann on the secrets of Blink-182’s buoyant sound', etiquettes: ['Artists', 'Recording', 'Tech'] })).toBe(false);
    expect(pertinent({ source: 'musicradar', titre: '“It improves in all the right places”: Strymon TimeLine MX review', etiquettes: ['Guitar Pedals', 'Guitars'] })).toBe(false);
    expect(pertinent({ source: 'gearnews', titre: 'Harley Benton V30UK: Vintage 30 Limited Run Cabs', etiquettes: ['News', 'speaker cabinets'] })).toBe(false);
    expect(pertinent({ source: 'musictech', titre: 'Step aside Sonos: JBL’s new Cove line', etiquettes: ['Gear', 'News', 'Consumer Tech'] })).toBe(false);
    expect(pertinent({ source: 'musicradar', titre: 'Galantis shares memories of co-writing Britney Spears’ Toxic', etiquettes: ['Artists'] })).toBe(false);
  });

  it('garde les synthes, les plugins et les DJ des generalistes', () => {
    expect(pertinent({ source: 'musicradar', titre: 'UDO does its best Oberheim impression', etiquettes: ['Synths', 'Hybrid Synths', 'Tech'] })).toBe(true);
    expect(pertinent({ source: 'musicradar', titre: 'Baby Audio HyperWarp wants to be your new quick-fix for glitches', etiquettes: ['Plugins', 'Fx Software'] })).toBe(true);
    expect(pertinent({ source: 'gearnews', titre: 'The Best Rotary Mixers And Boutique Mixing Consoles For DJs', etiquettes: ['Tips & Tricks', 'DJ'] })).toBe(true);
    expect(pertinent({ source: 'musictech', titre: 'The LARYNX: a new feature-packed hard synth from AnalogFX', etiquettes: ['Gear', 'News', 'Hard Synths'] })).toBe(true);
  });

  it('laisse un synthe sauver un mot faible, pas un mot fort', () => {
    expect(pertinent({ source: 'musicradar', titre: 'Jean-Michel Jarre to release 50th anniversary edition of Oxygene', etiquettes: ['Artists', 'Singers & Songwriters', 'Synths'] })).toBe(true);
    expect(pertinent({ source: 'musicradar', titre: 'Kevin Parker on why he now lets his Tame Impala band', etiquettes: ['Gigs & Festivals', 'Bands', 'Artists'] })).toBe(false);
    expect(pertinent({ source: 'gearnews', titre: 'Fender Bonamassa Tone Master Twin: Amp Modeling Combo', etiquettes: ['News', 'convolution reverb', 'Plugin'] })).toBe(false);
  });

  it('ne juge que le titre des specialisees', () => {
    expect(pertinent({ source: 'xlr8r', titre: 'Beatrice Dillon to Launch Label with Double-Single', etiquettes: ['News', 'acoustic', 'bass clarinet'] })).toBe(true);
    expect(pertinent({ source: 'ableton', titre: 'A Beginner’s Guide to Looping Guitar and Vocals', etiquettes: ['Tutorials'] })).toBe(false);
    expect(pertinent({ source: 'mixmag', titre: 'Daft Punk’s Guy-Manuel team up on a soundtrack', etiquettes: [] })).toBe(true);
  });

  it('demande un mot electronique a Tsugi', () => {
    expect(pertinent({ source: 'tsugi', titre: 'Djrum livre « Psychic Video », le premier extrait de son DJ-Kicks', etiquettes: ['news', 'ambient', 'breakbeat'] })).toBe(true);
    expect(pertinent({ source: 'tsugi', titre: 'Fontaines D.C. annonce un nouvel album', etiquettes: ['Articles', 'album', 'Clip'] })).toBe(false);
    expect(pertinent({ source: 'tsugi', titre: 'Live Report : Rock en Seine 2026', etiquettes: ['Club'] })).toBe(false);
  });

  it('ne confond pas les mots courts avec des morceaux de mots', () => {
    expect(pertinent({ source: 'musicradar', titre: 'A trap and multiband plugin from Bandcamp favourites', etiquettes: ['Plugins'] })).toBe(true);
  });
});
