/* LES MARQUES ET LEURS MACHINES, pour les news par marque.
 *
 * Mika, le 18 octobre 2026 : « si je suis fan d'une machine, je vais
 * chercher ses news un peu partout. J'ai acheté une Elektron Analog Rytm, je
 * veux toutes les news là-dessus. La liste de toutes les news par
 * constructeur, éditeur, et pareil pour les fabricants de plugins. »
 *
 * Une liste, lue des deux cotes : la moisson (scripts/moissonner-marques.ts)
 * s'en sert pour reconnaitre de quoi parle un article, une video ou une
 * discussion ; la page News en fait l'annuaire et les pages de marque.
 *
 * ═══ RECONNAITRE UNE MACHINE SANS SE TROMPER ═══
 *
 * Le motif d'une machine est tire de son nom (« Analog Rytm » reconnait
 * aussi « Analog-Rytm » et « Analog Rytm MKII »). Les noms qui sont aussi des
 * mots courants (« Peak », « Push », « Force », « Live ») portent
 * `avecMarque` : ils ne comptent que si la marque est nommee dans le meme
 * texte. Les marques au nom ambigu (Output, Waves, Apple) ont un motif
 * ecrit a la main, qui exige le contexte du studio.
 *
 * ═══ LES CHAINES ═══ `youtube` est l'identifiant de la chaine officielle,
 * verifie le 18 octobre 2026 par l'API (chaine active, bon nom). Sans lui,
 * la marque n'a que les videos des autres, trouvees par recherche. `reddit`
 * est le forum de la marque sur Reddit, quand il existe et vit. */

import { slug } from '../lib/chemins.ts';

export type GroupeMarque = 'synthes' | 'dj' | 'logiciels' | 'plugins';

export interface Produit {
  readonly id: string;
  readonly nom: string;
  readonly motif: RegExp;
  /** Le nom seul ne suffit pas : il faut aussi la marque dans le texte. */
  readonly avecMarque: boolean;
}

export interface Marque {
  readonly id: string;
  readonly nom: string;
  readonly groupe: GroupeMarque;
  readonly site: string;
  readonly motif: RegExp;
  readonly produits: readonly Produit[];
  readonly youtube?: string;
  readonly reddit?: string;
  /** Le forum de la marque, par son flux : tout ce qui s'y dit la concerne. */
  readonly forum?: { readonly nom: string; readonly flux: string };
}

const echapper = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Le motif d'un nom : ses morceaux dans l'ordre, separes par rien, une
    espace, un tiret, deux-points ou un point, et bornes par autre chose
    qu'une lettre ou un chiffre. */
function motifDe(nom: string): RegExp {
  const morceaux = nom.split(/[^A-Za-z0-9]+/).filter(Boolean).map(echapper);
  return new RegExp(`(?<![A-Za-z0-9])${morceaux.join('[\\s:._/-]*')}(?![A-Za-z0-9])`, 'i');
}

interface OptionsProduit {
  readonly motif?: RegExp;
  readonly avecMarque?: boolean;
}

function p(nom: string, o: OptionsProduit = {}): Produit {
  return { id: slug(nom), nom, motif: o.motif ?? motifDe(nom), avecMarque: o.avecMarque ?? false };
}

/** Un nom courant : il ne compte qu'avec la marque. */
const pm = (nom: string, motif?: RegExp): Produit => p(nom, { avecMarque: true, ...(motif ? { motif } : {}) });

interface OptionsMarque {
  readonly motif?: RegExp;
  readonly youtube?: string;
  readonly reddit?: string;
  readonly forum?: { readonly nom: string; readonly flux: string };
}

function m(nom: string, groupe: GroupeMarque, site: string, produits: readonly Produit[], o: OptionsMarque = {}): Marque {
  return {
    id: slug(nom),
    nom,
    groupe,
    site,
    motif: o.motif ?? motifDe(nom),
    produits,
    ...(o.youtube ? { youtube: o.youtube } : {}),
    ...(o.reddit ? { reddit: o.reddit } : {}),
    ...(o.forum ? { forum: o.forum } : {}),
  };
}

export const MARQUES: readonly Marque[] = [
  /* ═══ SYNTHES, BOITES A RYTHMES, SAMPLERS ═══ */
  m('Elektron', 'synthes', 'https://www.elektron.se/', [
    p('Analog Rytm'), p('Digitakt'), p('Digitone'), p('Octatrack'), p('Syntakt'),
    p('Analog Four', { motif: /(?<![a-z0-9])analog[\s-]*(four|4)(?![a-z0-9])/i }),
    pm('Analog Heat'), p('Model:Samples'), p('Model:Cycles'), p('Tonverk'), pm('Overbridge'),
  ], { youtube: 'UCL0xWyrKvKkZkvXesqHLcow', reddit: 'Elektron', forum: { nom: 'Elektronauts', flux: 'https://www.elektronauts.com/c/elektron-gear/5.rss' } }),
  m('Roland', 'synthes', 'https://www.roland.com/', [
    p('TR-8S'), p('TR-1000'), p('TR-808'), p('TR-909'), p('TB-303'),
    p('SP-404', { motif: /(?<![a-z0-9])sp[\s-]*404/i }), p('MC-707'), p('MC-101'),
    p('Jupiter-X', { motif: /(?<![a-z0-9])jupiter[\s-]*xm?(?![a-z0-9])/i }), p('Juno-X'), p('Fantom'),
    p('TB-03'), p('TR-06'), p('TR-08'), pm('T-8'), pm('J-6'), pm('S-1'), p('Gaia 2'), p('JD-08'), p('JX-08'),
  ], { youtube: 'UC4vbiZMU_yrheYVZH393-Zw', reddit: 'Roland' }),
  m('Korg', 'synthes', 'https://www.korg.com/', [
    p('Minilogue'), pm('Monologue'), pm('Prologue'), p('Wavestate'), p('Opsix'), p('Modwave'),
    p('Volca', { motif: /(?<![a-z0-9])volca(?![a-z0-9])/i }), p('Drumlogue'), p('Electribe'),
    p('NTS-1'), p('MS-20'), p('Multi/Poly'), p('KAOSS Pad'), pm('Nautilus'), p('KingKORG'),
  ], { youtube: 'UCgSolLR-mvPfOD_ZmWjsedQ', reddit: 'korg' }),
  m('Moog', 'synthes', 'https://www.moogmusic.com/', [
    p('Subsequent 37'), p('Subsequent 25'), pm('Grandmother'), pm('Matriarch'), pm('Labyrinth'),
    pm('Messenger'), p('Muse', { avecMarque: true }), p('Minimoog'), p('DFAM'), p('Mother-32'),
    p('Spectravox'), p('Moog One'), p('Animoog'),
  ], { youtube: 'UC3ZR8kjzs1pf6aH_SMiT3Pw', reddit: 'moog' }),
  m('Arturia', 'synthes', 'https://www.arturia.com/', [
    p('MiniFreak'), p('MicroFreak'), p('PolyBrute'), p('MiniBrute'), p('MicroBrute'), p('DrumBrute'),
    p('KeyStep'), p('BeatStep'), p('KeyLab'), p('V Collection'), pm('Pigments'), p('Analog Lab'),
    p('AstroLab'), p('Augmented', { avecMarque: true }), pm('FX Collection'),
  ], { youtube: 'UCmYCh6pWejcZ--EF7yC3iPQ', reddit: 'Arturia', forum: { nom: 'Arturia Forum', flux: 'https://forum.arturia.com/latest.rss' } }),
  m('Novation', 'synthes', 'https://novationmusic.com/', [
    p('Circuit Tracks'), p('Circuit Rhythm'), pm('Circuit'), pm('Peak'), pm('Summit'),
    p('Bass Station'), pm('Launchpad'), p('Launch Control'), p('Launchkey'), p('SL MkIII'),
  ], { youtube: 'UCLYJasHbl4-ED9HSM3C1BuQ', reddit: 'novationmusic' }),
  m('Teenage Engineering', 'synthes', 'https://teenage.engineering/', [
    p('OP-1'), p('OP-Z'), p('OP-XY'), p('EP-133', { motif: /(?<![a-z0-9])(ep[\s-]*133|k\.?o\.?\s*ii)(?![a-z0-9])/i }),
    p('EP-1320'), p('TX-6'), p('Pocket Operator'), p('TP-7'), p('OB-4'),
  ], { youtube: 'UCJaEGe7IYRz4_f42DyeUU1w', reddit: 'teenageengineering', forum: { nom: 'op-forums', flux: 'https://op-forums.com/latest.rss' } }),
  m('Behringer', 'synthes', 'https://www.behringer.com/', [
    p('TD-3'), p('RD-6'), p('RD-8'), p('RD-9'), pm('Model D'), p('Poly D'), pm('DeepMind'),
    pm('Crave'), pm('Pro-1'), p('MS-1'), p('JT-4000'), p('UB-Xa'), pm('Wasp'), pm('Neutron'), pm('Spice'),
    p('Kobol'), p('LM Drum'), pm('Proton'),
  ], { youtube: 'UCuI9mKTljZlI-y-eyaeGcNw', reddit: 'behringer' }),
  m('Sequential', 'synthes', 'https://sequential.com/', [
    p('Prophet-5'), p('Prophet-6'), p('Prophet Rev2'), p('OB-6'), pm('Take 5'), pm('Pro 3'),
    p('Trigon-6'), p('Teo-5'), p('Fourm'), p('OB-X8'),
  ], {
    youtube: 'UChxQGUxPnW8IOu5snHIP9ig',
    /* « sequential » est aussi un mot : il faut le nom de la maison. */
    motif: /(?<![a-z0-9])(sequential\s+(circuits|llc|prophet|ob|take|pro|trigon|teo|fourm)|oberheim)(?![a-z0-9])/i,
  }),
  m('Waldorf', 'synthes', 'https://waldorfmusic.com/', [
    pm('Iridium'), p('Quantum', { avecMarque: true }), p('Blofeld'), pm('Kyra'), pm('M'), pm('Microwave'),
  ], { youtube: 'UCU1I1uxJppjWp5kW7gzumsQ' }),
  m('Akai Professional', 'synthes', 'https://www.akaipro.com/', [
    p('MPC One'), p('MPC Live'), p('MPC X'), p('MPC Key'), p('MPC Sample'), p('MPC 3'),
    p('MPC', { motif: /(?<![a-z0-9])mpc(?![a-z0-9])/i }), pm('Force'), p('APC40'), p('APC64'), p('MPK Mini'),
  ], { youtube: 'UCidn7JF0IjiczL74qvQoaGA', reddit: 'mpcusers', motif: /(?<![a-z0-9])akai(?![a-z0-9])/i }),
  m('Native Instruments', 'synthes', 'https://www.native-instruments.com/', [
    p('Maschine'), p('Komplete Kontrol'), p('Komplete'), p('Kontakt'), p('Massive X'),
    p('Reaktor'), p('Traktor'), p('Battery 4'), p('Guitar Rig'), p('Kontrol S'),
  ], { youtube: 'UCwjiBFz7LuxYvmIRw5kChFA', reddit: 'NativeInstruments', forum: { nom: 'NI Community', flux: 'https://community.native-instruments.com/discussions/feed.rss' } }),
  m('Polyend', 'synthes', 'https://polyend.com/', [
    p('Polyend Tracker', { motif: /(?<![a-z0-9])polyend\s+tracker|tracker\s+(mini|\+|plus)/i }), pm('Play'),
    pm('Synth'), pm('Medusa'), p('Seq', { avecMarque: true }),
  ], { youtube: 'UCjF-ino7FfnjZU7CMmMKe1g', reddit: 'polyend' }),
  m('Erica Synths', 'synthes', 'https://www.ericasynths.lv/', [
    p('Perkons'), p('LXR-02'), p('Bassline DB-01'), p('Syntrx'), p('Steampipe'), p('Black Sequencer'),
  ], { youtube: 'UCfs2QrfWJ2x4ozPg7aF70XQ' }),
  m('1010music', 'synthes', 'https://1010music.com/', [
    pm('Blackbox'), p('Bitbox'), p('Nanobox'), p('Lemondrop'), pm('Fireball'), pm('Razzmatazz'),
  ], { youtube: 'UCEX4Zo2qD5XLPZshzJtDnWQ' }),
  m('Squarp', 'synthes', 'https://squarp.net/', [p('Hapax'), p('Pyramid', { avecMarque: true }), p('Rample')], {
    youtube: 'UCaGhWZfD8xIcEWhPG6wpoxQ',
    forum: { nom: 'Squarp Community', flux: 'https://squarp.community/latest.rss' },
  }),
  m('Torso Electronics', 'synthes', 'https://torsoelectronics.com/', [pm('T-1'), pm('S-4'), pm('T-EP')], {
    youtube: 'UCfHYEt8M4X-t0SJn4fXhWaA',
    motif: /(?<![a-z0-9])torso(\s+electronics)?(?![a-z0-9])/i,
  }),
  m('Make Noise', 'synthes', 'https://www.makenoisemusic.com/', [
    p('0-Coast'), pm('Strega'), p('Shared System'), p('Maths', { avecMarque: true }), p('QPAS'), p('Spectraphon'),
  ], { youtube: 'UCy1tvekyTbDs35hwcaWHbpg' }),
  m('Intellijel', 'synthes', 'https://intellijel.com/', [pm('Cascadia'), p('Metropolix'), pm('Rainmaker')], {
    youtube: 'UCZQcHnvFu8yOV94HCNAhqzw',
  }),
  m('ASM', 'synthes', 'https://www.ashunsoundmachines.com/', [p('Hydrasynth'), p('Leviasynth')], {
    youtube: 'UC7wH6wgpwF3lkqzZhDwWZ0w',
    motif: /(?<![a-z0-9])(ashun sound machines|hydrasynth|leviasynth)(?![a-z0-9])/i,
  }),
  m('UDO Audio', 'synthes', 'https://www.udo-audio.com/', [pm('Super 6'), p('Super Gemini'), p('DMNO')], {
    youtube: 'UCi4njJ-EL21RFPOWrXzGj9Q',
    motif: /(?<![a-z0-9])udo\s+(audio|super)(?![a-z0-9])/i,
  }),
  m('Dreadbox', 'synthes', 'https://www.dreadbox-fx.com/', [p('Nymphes'), pm('Typhon'), pm('Erebus'), pm('Hypnosis')], {
    youtube: 'UCQrwYgZKxgNCx_6nX-WmGHw',
  }),
  m('Sonicware', 'synthes', 'https://sonicware.jp/', [pm('Liven'), p('ELZ_1'), p('CyDrums')], { youtube: 'UCSCKVAIhInXtRBO80dfQBKQ' }),
  m('Modal Electronics', 'synthes', 'https://modalelectronics.com/', [p('Argon8'), p('Cobalt8'), p('Skulpt'), pm('Craft')], {
    youtube: 'UCyis-OyHUP8EfwG3kKlJgGQ',
    motif: /(?<![a-z0-9])modal\s+electronics(?![a-z0-9])/i,
  }),
  m('Expressive E', 'synthes', 'https://www.expressivee.com/', [pm('Osmose'), p('Touché', { motif: /(?<![a-z0-9])touch[ée](?![a-z0-9])/i, avecMarque: true })], { youtube: 'UCAKc3_QTczvh5WFSZrdc6og' }),
  m('Strymon', 'synthes', 'https://www.strymon.net/', [p('BigSky'), pm('TimeLine'), pm('Volante'), p('NightSky'), pm('Deco')], {
    youtube: 'UChzTzB8UIW3oLfITK7pTOVg',
  }),

  /* ═══ MATERIEL DJ ═══ */
  m('Pioneer DJ', 'dj', 'https://www.pioneerdj.com/', [
    p('CDJ-3000'), p('DJM-A9'), p('DJM-V10'), p('DJM-900'), p('XDJ-AZ'), p('XDJ-RX3'), p('Opus Quad'),
    p('rekordbox'), p('DDJ-FLX', { motif: /(?<![a-z0-9])ddj[\s-]*flx/i }), p('Toraiz'), p('HDJ-F9'),
  ], {
    youtube: 'UCg70JR8kcR0fTdarQf9xj_w',
    reddit: 'Rekordbox',
    motif: /(?<![a-z0-9])(pioneer\s*dj|alphatheta|rekordbox|cdj[\s-]*\d)(?![a-z0-9])/i,
  }),
  m('Rane', 'dj', 'https://www.rane.com/', [p('Rane Seventy', { motif: /rane\s+seventy/i }), p('Performer', { avecMarque: true }), p('Rane Four', { motif: /rane\s+four/i }), p('System One', { avecMarque: true })], {
    youtube: 'UCB6VJUCx87zMmqcbNtCaRtg',
    motif: /(?<![a-z0-9])rane(\s+dj)?(?![a-z0-9])/i,
  }),
  m('Denon DJ', 'dj', 'https://www.denondj.com/', [pm('Prime 4'), pm('Prime Go'), p('SC6000'), p('SC Live'), p('Engine DJ'), p('X1850')], {
    youtube: 'UCUMK3jyo_vtJw78Tyb_QW7g',
    motif: /(?<![a-z0-9])(denon\s*dj|engine\s*dj)(?![a-z0-9])/i,
  }),
  m('Allen & Heath', 'dj', 'https://www.allen-heath.com/', [p('Xone:96'), p('Xone:92'), p('Xone:PX5'), p('Xone:DB4'), p('Xone:43')], {
    youtube: 'UCj52Pj4FECJbYf9fveQw0dg',
    motif: /(?<![a-z0-9])(allen\s*(&|and)\s*heath|xone)(?![a-z0-9])/i,
  }),
  m('Serato', 'dj', 'https://serato.com/', [p('Serato DJ'), p('Serato Studio'), p('Stems', { avecMarque: true })], { reddit: 'Serato' }),
  m('Algoriddim', 'dj', 'https://www.algoriddim.com/', [p('djay Pro'), p('Neural Mix')], {
    youtube: 'UC73u3ovXVbuGwDnqVVSbuNA',
    motif: /(?<![a-z0-9])(algoriddim|djay\s+pro)(?![a-z0-9])/i,
  }),

  /* ═══ EDITEURS DE LOGICIELS ═══ */
  m('Ableton', 'logiciels', 'https://www.ableton.com/', [
    pm('Live 12', /(?<![a-z0-9])live\s*12(?![a-z0-9])/i), pm('Live'), pm('Push'), pm('Move'), pm('Note'),
    p('Max for Live'),
  ], { youtube: 'UCgWZYUZjiidjWgfs95pJrWg', reddit: 'ableton' }),
  m('Bitwig', 'logiciels', 'https://www.bitwig.com/', [p('Bitwig Studio'), pm('Grid', /the\s+grid/i)], {
    youtube: 'UCkVdkd-DBrvSbpC4gefsnkw',
    reddit: 'Bitwig',
  }),
  m('Image-Line', 'logiciels', 'https://www.image-line.com/', [p('FL Studio'), p('FL Cloud')], {
    youtube: 'UCtYw-H_L5D09T9uWeNBUvqg',
    reddit: 'FL_Studio',
    forum: { nom: 'Image-Line Forum', flux: 'https://forum.image-line.com/app.php/feed' },
    motif: /(?<![a-z0-9])(image[\s-]*line|fl\s*studio)(?![a-z0-9])/i,
  }),
  m('Apple', 'logiciels', 'https://www.apple.com/logic-pro/', [p('Logic Pro'), p('MainStage'), p('GarageBand')], {
    youtube: 'UCBH2v7iomzEQ2zzUa9rc5Pw',
    reddit: 'Logic_Studio',
    motif: /(?<![a-z0-9])(logic\s*pro|mainstage|garageband)(?![a-z0-9])/i,
  }),
  m('Steinberg', 'logiciels', 'https://www.steinberg.net/', [p('Cubase'), p('Nuendo'), p('WaveLab'), p('HALion'), p('Dorico')], {
    youtube: 'UCLRLC0yPbRD-JaKzb5wKDdQ',
    reddit: 'cubase',
    forum: { nom: 'Steinberg Forums', flux: 'https://forums.steinberg.net/latest.rss' },
  }),
  m('Avid', 'logiciels', 'https://www.avid.com/pro-tools', [p('Pro Tools')], {
    youtube: 'UCthklhp3GozCN3aeBfiGYHQ',
    reddit: 'protools',
    motif: /(?<![a-z0-9])(pro\s*tools|avid\s+(pro|technology|audio))(?![a-z0-9])/i,
  }),
  m('PreSonus', 'logiciels', 'https://www.presonus.com/', [p('Studio One')], { reddit: 'StudioOne' }),
  m('Reason Studios', 'logiciels', 'https://www.reasonstudios.com/', [p('Reason 13', { motif: /(?<![a-z0-9])reason\s*1[0-9](?![a-z0-9])/i }), p('Reason Rack Plugin')], {
    youtube: 'UCMtEmcNZCq0WZturHuwKWgw',
    reddit: 'reasoners',
  }),
  m("Cycling '74", 'logiciels', 'https://cycling74.com/', [p('Max/MSP', { motif: /(?<![a-z0-9])max\s*(\/\s*msp|9|8)(?![a-z0-9])/i }), p('RNBO')], {
    youtube: 'UCqSNdDNH1Iq25ucNmqaGvig',
    reddit: 'maxmsp',
    motif: /(?<![a-z0-9])cycling\s*['’]?\s*74(?![a-z0-9])/i,
  }),
  m('VCV', 'logiciels', 'https://vcvrack.com/', [p('VCV Rack')], {
    youtube: 'UCafBNyN93qbTzFzaiNHDMJQ',
    reddit: 'vcvrack',
    forum: { nom: 'VCV Community', flux: 'https://community.vcvrack.com/latest.rss' },
    motif: /(?<![a-z0-9])vcv(?![a-z0-9])/i,
  }),
  m('Cockos', 'logiciels', 'https://www.reaper.fm/', [p('REAPER', { motif: /(?<![A-Za-z0-9])REAPER(?![A-Za-z0-9])|reaper\s*7/ })], {
    reddit: 'Reaper',
    forum: { nom: 'Cockos Forum', flux: 'https://forum.cockos.com/external.php?type=RSS2' },
    motif: /(?<![A-Za-z0-9])(cockos|REAPER)(?![A-Za-z0-9])/,
  }),

  /* ═══ PLUGINS ═══ */
  m('FabFilter', 'plugins', 'https://www.fabfilter.com/', [
    p('Pro-Q'), p('Pro-L'), p('Pro-C'), p('Pro-R'), p('Pro-MB'), p('Pro-DS'), pm('Saturn'), pm('Volcano'), pm('Twin 3'), pm('Timeless'),
  ], { youtube: 'UCxihtGe18Br6U8RuYCt-hDw' }),
  m('iZotope', 'plugins', 'https://www.izotope.com/', [pm('Ozone'), p('Neutron', { avecMarque: true }), p('RX 11', { motif: /(?<![a-z0-9])rx\s*1[0-9](?![a-z0-9])/i }), pm('Nectar'), pm('Trash'), p('VocalSynth')], {
    youtube: 'UCFYLFu6j4hxl5vEnpl7hw3w',
  }),
  m('Spectrasonics', 'plugins', 'https://www.spectrasonics.net/', [p('Omnisphere'), p('Keyscape'), p('Trilian'), p('Stylus RMX')], {
    youtube: 'UCtppwNik4cQr4P6XXzHYnig',
  }),
  m('Valhalla DSP', 'plugins', 'https://valhalladsp.com/', [
    p('VintageVerb'), p('Supermassive'), p('Valhalla Room'), p('Valhalla Delay'), p('Valhalla Shimmer'), p('Valhalla Plate'), p('Valhalla Space Modulator'),
  ], { youtube: 'UCxdWC8VgNmUw8ixsXFVzb4Q', motif: /(?<![a-z0-9])valhalla(\s*dsp)?(?![a-z0-9])/i }),
  m('u-he', 'plugins', 'https://u-he.com/', [pm('Diva'), pm('Repro'), pm('Zebra'), p('Hive', { avecMarque: true }), p('Bazille'), p('ACE', { avecMarque: true }), p('Uhbik')], {
    motif: /(?<![a-z0-9])u[\s-]he(?![a-z0-9])/i,
  }),
  m('Xfer Records', 'plugins', 'https://xferrecords.com/', [p('Serum', { avecMarque: false, motif: /(?<![a-z0-9])serum(\s*2)?(?![a-z0-9])/i }), p('OTT', { avecMarque: true }), p('LFOTool')], {
    youtube: 'UCZ_YjBd5DMmTCikpXPZQEvw',
    motif: /(?<![a-z0-9])xfer(\s+records)?(?![a-z0-9])/i,
  }),
  m('Soundtoys', 'plugins', 'https://www.soundtoys.com/', [p('Decapitator'), p('EchoBoy'), p('Little AlterBoy'), p('Crystallizer'), p('SuperPlate')], {
    youtube: 'UCe84vljp6TlGbsH_TIKvmwg',
  }),
  m('Output', 'plugins', 'https://output.com/', [p('Arcade', { avecMarque: true }), p('Portal', { avecMarque: true }), p('Movement', { avecMarque: true }), p('Thermal', { avecMarque: true }), p('Co-Producer', { avecMarque: true })], {
    youtube: 'UCZ12RhBjsDXGbk22fM-rlgA',
    motif: /(?<![a-z0-9])output\s+(inc|arcade|portal|movement|thermal|substance|exhale|co[\s-]*producer)(?![a-z0-9])/i,
  }),
  m('Universal Audio', 'plugins', 'https://www.uaudio.com/', [p('UAD'), p('Apollo', { avecMarque: true }), p('LUNA', { avecMarque: true }), p('UAFX')], {
    youtube: 'UCKTQROb4IchK0h5P0So29Fw',
    motif: /(?<![a-z0-9])(universal\s+audio|uad)(?![a-z0-9])/i,
  }),
  m('Waves', 'plugins', 'https://www.waves.com/', [p('CLA', { avecMarque: true }), p('StudioVerse'), p('Curves', { avecMarque: true }), p('Clarity Vx')], {
    youtube: 'UCPSRc34Vs-Nf_t1l3pS7peg',
    motif: /(?<![a-z0-9])waves\s+(audio|plugins?|cla|ssl|abbey|curves|clarity|studioverse|central|creative|mercury|horizon)(?![a-z0-9])/i,
  }),
  m('Plugin Alliance', 'plugins', 'https://www.plugin-alliance.com/', [p('bx_console', { motif: /bx_?console/i }), pm('Brainworx', /brainworx/i)], {
    youtube: 'UCuB-ljAa6Le035EtRasWV5A',
  }),
  m('Cableguys', 'plugins', 'https://www.cableguys.com/', [p('ShaperBox'), p('VolumeShaper'), p('HalfTime'), p('PanCake'), p('Curve 2')], {
    youtube: 'UCwjgHtqBBdbZTUs9joWedag',
  }),
  m('Kilohearts', 'plugins', 'https://kilohearts.com/', [p('Phase Plant'), p('Multipass'), p('Snap Heap'), pm('Disperser')], {
    youtube: 'UCRSRkNnfNvuRjJi7rBwCRbA',
  }),
  m('Baby Audio', 'plugins', 'https://babyaud.io/', [pm('Smooth Operator'), pm('Spaced Out'), p('BA-1'), pm('Transit'), pm('Crystalline'), p('HyperWarp')], {
    youtube: 'UCNypPXheQuh4vGnSPuIvQLw',
  }),
  m('Eventide', 'plugins', 'https://www.eventideaudio.com/', [pm('Blackhole'), pm('H90'), pm('H9'), p('MicroPitch'), p('SP2016'), p('Physion')], {
    youtube: 'UCsdmKmxdkZ602N1ECFG79GA',
  }),
  m('Slate Digital', 'plugins', 'https://slatedigital.com/', [p('Virtual Mix Rack'), p('VMR'), pm('Fresh Air')], {
    youtube: 'UCcsttGjEJ0yf0LmTVXw-xmw',
  }),
  m('Polyverse', 'plugins', 'https://polyversemusic.com/', [pm('Infiltrator'), pm('Manipulator'), pm('Gatekeeper'), pm('Wider'), p('Supermodal')], {
    youtube: 'UCgaq8QZDHGitvSpGJUdLDNA',
  }),
  m('sonible', 'plugins', 'https://www.sonible.com/', [p('smart:EQ', { motif: /smart\s*:?\s*eq/i }), p('smart:comp', { motif: /smart\s*:?\s*comp/i }), p('smart:limit', { motif: /smart\s*:?\s*limit/i })], {
    youtube: 'UC7vEdxjQ43NeBep_8v9lN0Q',
  }),
  m('oeksound', 'plugins', 'https://oeksound.com/', [p('soothe2', { motif: /soothe\s*2/i }), pm('spiff'), p('bloom', { avecMarque: true })], {
    youtube: 'UCgsJYTilROOc5irH6yMNwEQ',
  }),
  m('Minimal Audio', 'plugins', 'https://www.minimal.audio/', [p('Current', { avecMarque: true }), p('Rift', { avecMarque: true }), p('Fuse Compressor')], {
    youtube: 'UCmhRAigxlXKNPyATzQQQzKw',
  }),
  m('Vital Audio', 'plugins', 'https://vital.audio/', [p('Vital', { avecMarque: true, motif: /vital\s+(synth|wavetable)/i })], {
    motif: /(?<![a-z0-9])vital\s+(audio|synth)(?![a-z0-9])/i,
  }),
  m('Synapse Audio', 'plugins', 'https://www.synapse-audio.com/', [p('DUNE 3', { motif: /(?<![a-z0-9])dune\s*3(?![a-z0-9])/i }), p('Legend HZ', { motif: /legend(\s*hz)?/i, avecMarque: true }), pm('Obsession')], {
    youtube: 'UCQRCE4cTffy6YGXHVrHe3Yg',
  }),
  m('Wavesfactory', 'plugins', 'https://www.wavesfactory.com/', [p('Trackspacer'), p('Cassette', { avecMarque: true }), p('Spectre', { avecMarque: true })], {
    youtube: 'UCmWPR4NGAH4CZVZUO6ZsFQA',
  }),
  m('TAL Software', 'plugins', 'https://tal-software.com/', [p('TAL-U-NO-LX'), p('TAL-Sampler'), p('TAL-J-8'), p('TAL-Pha'), p('TAL-BassLine-101')], {
    youtube: 'UCgqAwL5ovRqKz1WqP2PLquA',
    motif: /(?<![a-z0-9])tal[\s-](software|u[\s-]*no|sampler|j[\s-]*8|pha|bassline|dac|vocoder|chorus)(?![a-z0-9])/i,
  }),
  m('D16 Group', 'plugins', 'https://d16.pl/', [p('Drumazon'), p('Punchbox'), p('Nepheton'), p('Phoscyon'), p('LuSH-101'), p('Toraverb')], {
    youtube: 'UC_EOhityu6FjVHElXES5XWQ',
    motif: /(?<![a-z0-9])d16(\s+group)?(?![a-z0-9])/i,
  }),
  m('Sugar Bytes', 'plugins', 'https://sugar-bytes.de/', [p('Effectrix'), p('Turnado'), p('Looperator'), pm('Factory')], { youtube: 'UCbvs6wDUWIXPcgdFff8ZUbw' }),
  m('XLN Audio', 'plugins', 'https://www.xlnaudio.com/', [p('RC-20'), p('XO', { avecMarque: true }), p('Addictive Drums'), p('Life', { avecMarque: true })], {
    youtube: 'UCf5wGcKGWCVM3YBmf1enN4Q',
  }),
  m('Cherry Audio', 'plugins', 'https://cherryaudio.com/', [p('Voltage Modular'), p('GX-80'), p('Miniverse'), p('Dreamsynth')], {}),
  m('Softube', 'plugins', 'https://www.softube.com/', [p('Console 1'), p('Modular', { avecMarque: true }), p('Tape', { avecMarque: true })], {
    youtube: 'UC0cOCSOcLSaB8Vt8xgJTHWw',
  }),
];

export const MARQUE_PAR_ID: ReadonlyMap<string, Marque> = new Map(MARQUES.map((x) => [x.id, x]));

/** L'identifiant qualifie d'une machine : « elektron:analog-rytm ». */
const idProduit = (marque: string, produit: string): string => `${marque}:${produit}`;

/** Les marques et les machines que nomme un texte. Une machine au nom
    distinctif emporte sa marque ; une machine au nom courant ne compte que
    si la marque est nommee aussi. */
export function reconnaitreMarques(texte: string): { marques: string[]; produits: string[] } {
  const marques: string[] = [];
  const produits: string[] = [];
  for (const marque of MARQUES) {
    const marqueVue = marque.motif.test(texte);
    let une = false;
    for (const pr of marque.produits) {
      if ((!pr.avecMarque || marqueVue) && pr.motif.test(texte)) {
        produits.push(idProduit(marque.id, pr.id));
        une = true;
      }
    }
    if (marqueVue || une) marques.push(marque.id);
  }
  return { marques, produits };
}
