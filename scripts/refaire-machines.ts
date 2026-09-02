/* LE CHAMP « MACHINES » NE CONTENAIT PAS QUE DES MACHINES.

   CE QUE MIKA A VU. Sur Schranz, la ligne « Machines » affichait « Boucles
   percussives saturees », « Distorsion en chaine », « Filtres en mouvement
   permanent ». Trois manieres de travailler, pas trois machines. Une seule
   entree sur quatre nommait du materiel.

   LA MESURE. Sur les 827 entrees distinctes du corpus, 187 nommaient une
   marque ou un modele et 640 decrivaient un son ou un geste. Le champ avait
   ete rempli avec deux choses differentes sous une seule etiquette, et
   l'etiquette mentait sur la moitie du contenu.

   CE QUI N'A PAS ETE FAIT : JETER. Ces 640 phrases sont du travail juste, et
   elles repondent a une vraie question, celle du producteur qui demande
   comment ce son se fabrique. Elles changent de ligne, elles ne disparaissent
   pas.

   L'EXTRACTION D'ABORD, L'ECRITURE ENSUITE. Beaucoup de machines etaient
   deja la, noyees dans une phrase : « Basse SH-101 », « Piano plaque Korg
   M1 », « Echo a bande Roland Space Echo », « Synthetiseurs Prophet-5 ». Une
   table de motifs les remonte sous leur nom canonique. Elle porte 162 genres
   sur 219 sans qu'une seule ligne soit inventee. Les 57 restants sont ecrits
   a la main, ci-dessous, et chacun nomme du materiel documente pour SON
   genre : ce n'est pas une liste passe-partout recopiee.

   Usage :
     npx tsx scripts/refaire-machines.ts --dry-run
     npx tsx scripts/refaire-machines.ts
*/

import { transaction } from './lib/corpus-store.ts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SEC = process.argv.includes('--dry-run');

/* LA TABLE D'EXTRACTION : un motif dans le texte existant, et le nom canonique
   de la machine qu'il designe. Le qualificatif reste dans la phrase d'origine,
   qui passe en sonorites : « Roland TR-909 ecrasee » donne la machine
   « Roland TR-909 » et garde son « ecrasee » de l'autre cote. */
const GEAR: [RegExp, string][] = [
  [/\bTR-?808\b/i, 'Roland TR-808'], [/\bTR-?909\b/i, 'Roland TR-909'],
  [/\bTR-?707\b/i, 'Roland TR-707'], [/\bTR-?606\b/i, 'Roland TR-606'],
  [/\bTR-?727\b/i, 'Roland TR-727'], [/\bTR-?505\b/i, 'Roland TR-505'],
  [/\bTB-?303\b/i, 'Roland TB-303'], [/\bSH-?101\b/i, 'Roland SH-101'],
  [/\bMC-?202\b/i, 'Roland MC-202'], [/\bJX-?8P\b/i, 'Roland JX-8P'],
  [/\bJP-?8000\b/i, 'Roland JP-8000'], [/\bJuno-?60\b/i, 'Roland Juno-60'],
  [/\bJuno-?106\b/i, 'Roland Juno-106'], [/\bAlpha ?Juno\b/i, 'Roland Alpha Juno'],
  [/\bD-?50\b/i, 'Roland D-50'], [/\bS-?330\b/i, 'Roland S-330'],
  [/\bSpace ?Echo\b/i, 'Roland RE-201 Space Echo'], [/\bTR-?8\b(?!\d)/i, 'Roland TR-8'],
  [/\bJuno\b/i, 'Roland Juno-106'],
  [/\bMPC ?3000\b/i, 'Akai MPC3000'], [/\bMPC ?2000\b/i, 'Akai MPC2000'],
  [/\bMPC ?60\b/i, 'Akai MPC60'], [/\bMPC\b/i, 'Akai MPC'],
  [/\bS-?900\b/i, 'Akai S900'], [/\bS-?950\b/i, 'Akai S950'],
  [/\bS-?1000\b/i, 'Akai S1000'], [/\bS-?2000\b/i, 'Akai S2000'],
  [/\bS-?3000\b/i, 'Akai S3000'], [/\bSamplers? Akai\b/i, 'Akai S1000'],
  [/\bSP-?1200\b/i, 'E-mu SP-1200'], [/\bEmulator\b/i, 'E-mu Emulator'],
  [/\bEmax\b/i, 'E-mu Emax'],
  [/\bDX7\b/i, 'Yamaha DX7'], [/\bCS-?80\b/i, 'Yamaha CS-80'],
  [/\bPoly-?61\b/i, 'Korg Poly-61'], [/\bPoly-?800\b/i, 'Korg Poly-800'],
  [/\bMS-?20\b/i, 'Korg MS-20'], [/\bM1\b/i, 'Korg M1'],
  [/\bMinimoog\b/i, 'Minimoog'], [/\bMoog Modular\b/i, 'Moog modulaire'],
  [/\bMoog Sub\b/i, 'Moog Sub 37'],
  [/\bOB-?8\b/i, 'Oberheim OB-8'], [/\bOberheim\b/i, 'Oberheim OB-8'],
  [/\bProphet-?5\b/i, 'Sequential Prophet-5'],
  [/\bARP ?2600\b/i, 'ARP 2600'], [/\bOdyssey\b/i, 'ARP Odyssey'],
  [/\bLinn ?Drum\b/i, 'LinnDrum'], [/\bSyndrums?\b/i, 'Syndrum'],
  [/\bFairlight\b/i, 'Fairlight CMI'], [/\bSynthi\b/i, 'EMS Synthi AKS'],
  [/\bMellotron\b/i, 'Mellotron'], [/\bFarfisa\b/i, 'Orgue Farfisa'],
  [/\bEminent 310\b/i, 'Eminent 310'], [/\bRhodes\b/i, 'Fender Rhodes'],
  [/\bClavinet\b/i, 'Hohner Clavinet'], [/\bNord Lead\b/i, 'Clavia Nord Lead'],
  [/\bVirus\b/i, 'Access Virus'], [/\bEnsoniq\b/i, 'Ensoniq ESQ-1'],
  [/\bMelochord\b/i, 'Melochord'],
  [/\bSylenth1?\b/i, 'LennarDigital Sylenth1'], [/\bMassive\b/i, 'Native Instruments Massive'],
  [/\bFM8\b/i, 'Native Instruments FM8'], [/\bSerum\b/i, 'Xfer Serum'],
  [/\bSpire\b/i, 'Reveal Sound Spire'], [/\bReaktor\b/i, 'Native Instruments Reaktor'],
  [/\bAbleton\b/i, 'Ableton Live'], [/\bCubase\b/i, 'Steinberg Cubase'],
  [/\bLogic\b/i, 'Apple Logic'], [/\bFL Studio\b|\bFruity\b/i, 'FL Studio'],
  [/\bRenoise\b/i, 'Renoise'], [/\bSound Forge\b/i, 'Sound Forge'],
  [/\bMusic 2000\b/i, 'Music 2000 (PlayStation)'], [/\bAtari\b/i, 'Atari ST'],
  [/\bAmiga\b/i, 'Commodore Amiga'], [/\bTrackers?\b/i, 'Trackers (Amiga)'],
  [/\bVocod(?:eurs?|er)\b/i, 'Vocodeur'], [/\bTalkbox\b/i, 'Talkbox'],
  [/\bHoover\b/i, 'Roland Alpha Juno'],
  [/\bPhonog[eè]ne\b/i, 'Phonogène'], [/\bMagn[eé]tophone/i, 'Magnétophone à bande'],
  [/\bEcho à bande\b/i, 'Écho à bande'], [/\bMax\/MSP\b/i, 'Max/MSP'],
  [/\bEastWest\b/i, 'Banques orchestrales EastWest'], [/\bVocaloid\b/i, 'Vocaloid'],
  [/\bBo[iî]tes? à rythmes?\b/i, 'Boîte à rythmes'],
  [/\bSound ?system/i, 'Sound system'],
  [/\b(?:Console|Table) de (?:mixage|studio)\b/i, 'Console de mixage'],
  [/\bPlatines?\b|\bTourne-disques?\b/i, 'Platines vinyle'],
  [/\bquatre pistes\b/i, 'Magnétophone quatre pistes'],
  [/\bCassette\b/i, 'Magnétophone à cassette'],
  [/\b[EÉ]chantillonneurs?\b/i, 'Échantillonneur'],
  [/\bS[eé]quenceur analogique\b/i, 'Séquenceur analogique'],
  [/\bmodulaires?\b/i, 'Synthétiseur modulaire'],
  [/\bSynth[eé]s? (?:hardware|monophoniques?)\b/i, 'Synthétiseur monophonique'],
  [/\bOrgues?\b/i, 'Orgue'], [/\bGuitares?\b/i, 'Guitare électrique'],
  [/\bBasse [eé]lectrique\b/i, 'Basse électrique'],
  [/\bBatteries? (?:jou[eé]e|acoustique|s[eè]che)/i, 'Batterie acoustique'],
  [/\bContrebasse\b/i, 'Contrebasse'], [/\bOrdinateurs?\b|\bLaptop\b/i, 'Ordinateur'],
  [/\bP[eé]dales? de distorsion\b/i, 'Pédale de distorsion'],
  [/\bR[eé]verb[eé]ration à plaque\b/i, 'Réverbération à plaque'],
  [/\bR[eé]verb[eé]ration à ressort\b/i, 'Réverbération à ressort'],
  [/\bChambre d.[eé]cho\b/i, "Chambre d'écho"],
  [/\bCongas?\b/i, 'Congas'], [/\bTimbales\b/i, 'Timbales'],
  [/\bCowbell\b/i, 'Cowbell'], [/\bHarpes?\b/i, 'Harpe'],
  [/\bMicrophones? contact\b/i, 'Microphone contact'],
  [/\bStudio Sigma\b/i, 'Studio Sigma Sound'], [/\bGranulateurs?\b/i, 'Granulateur'],
];

/* LES 57 GENRES QUE L'EXTRACTION NE COUVRE PAS. Ecrits a la main, du materiel
   documente pour ce genre-la. Pour les genres nes apres 2000 la reponse
   honnete est souvent logicielle : c'est ce qui les fabrique reellement, et
   dire « boite a rythmes analogique » a leur sujet serait plus joli et faux. */
const ECRITS: Record<string, string[]> = {
  progressivehouse: ['Roland JP-8000', 'Access Virus', 'Akai S3000', 'Steinberg Cubase'],
  techhouse: ['Ableton Live', 'Roland TR-909', 'Akai MPC', 'Novation Bass Station'],
  minimaltech: ['Ableton Live', 'Roland TR-909', 'Elektron Machinedrum'],
  deeptech: ['Ableton Live', 'Roland TR-909', 'Akai MPC'],
  minimalprog: ['Ableton Live', 'Roland TR-909', 'Elektron Octatrack'],
  rominimal: ['Ableton Live', 'Elektron Octatrack', 'Enregistreur de terrain'],
  microtechno: ['Max/MSP', 'Native Instruments Reaktor', 'Ableton Live'],
  peaktimetechno: ['Ableton Live', 'Roland TR-909', 'Xfer Serum'],
  lofihouse: ['Ableton Live', 'Magnétophone à cassette', 'Akai MPC'],
  progressivetrance: ['Access Virus', 'Roland JP-8000', 'Akai S3000', 'Steinberg Cubase'],
  techtrance: ['Access Virus', 'Roland JP-8000', 'Roland TR-909', 'Steinberg Cubase'],
  vocaltrance: ['Roland JP-8000', 'Access Virus', 'LennarDigital Sylenth1', 'Steinberg Cubase'],
  eurotrance: ['Roland JP-8000', 'Korg Triton', 'Access Virus', 'Steinberg Cubase'],
  nitzhonot: ['Roland JP-8000', 'Clavia Nord Lead', 'Akai S3000', 'Steinberg Cubase'],
  darkpsy: ['Native Instruments Absynth', 'Access Virus', 'Native Instruments FM8', 'Steinberg Cubase'],
  hitech: ['Native Instruments FM8', 'Xfer Serum', 'Ableton Live'],
  psydub: ['Ableton Live', 'Roland RE-201 Space Echo', 'Native Instruments Absynth'],
  psycore: ['Xfer Serum', 'Native Instruments FM8', 'Ableton Live'],
  zenonesque: ['Ableton Live', 'Xfer Serum', 'Enregistreur de terrain'],
  twilightpsy: ['Native Instruments Absynth', 'Xfer Serum', 'Ableton Live'],
  morningfullon: ['LennarDigital Sylenth1', 'Xfer Serum', 'Ableton Live'],
  psybreaks: ['Ableton Live', 'Xfer Serum', 'Akai S3000'],
  darkelectro: ['Clavia Nord Lead', 'Roland JP-8000', 'Vocodeur', 'Steinberg Cubase'],
  futurepop: ['Access Virus', 'Roland JP-8000', 'Clavia Nord Lead', 'Steinberg Cubase'],
  darkcore: ['Akai S950', 'Commodore Amiga', 'Roland TR-909', 'Steinberg Cubase'],
  techstep: ['Akai S3000', 'Clavia Nord Lead', 'Roland TR-909', 'Steinberg Cubase'],
  jumpup: ['Akai S3000', 'Clavia Nord Lead', 'Steinberg Cubase'],
  drumstep: ['Ableton Live', 'Native Instruments Massive', 'Xfer Serum'],
  crossbreed: ['Ableton Live', 'Native Instruments Massive', 'Xfer Serum'],
  nuskoolbreaks: ['Akai S3000', 'Clavia Nord Lead', 'Roland TR-909', 'Steinberg Cubase'],
  progressivebreaks: ['Access Virus', 'Akai S3000', 'Steinberg Cubase'],
  floridabreaks: ['Roland TR-808', 'Akai MPC60', 'Platines vinyle'],
  ghettofunk: ['Ableton Live', 'Akai MPC', 'Platines vinyle'],
  darkstep: ['Akai S3000', 'Clavia Nord Lead', 'Steinberg Cubase'],
  '2step': ['Akai S950', 'Roland TR-909', 'Steinberg Cubase'],
  dubstep: ['Native Instruments Massive', 'Ableton Live', 'Steinberg Cubase', 'Sound system'],
  bassline: ['FL Studio', 'Native Instruments Massive', 'Roland TR-909'],
  breakstep: ['Ableton Live', 'Akai S950', 'Native Instruments Massive'],
  ukbass: ['Ableton Live', 'Native Instruments Massive', 'Akai MPC'],
  baltimoreclub: ['Akai MPC', 'Roland TR-808', 'Platines vinyle'],
  nustylegabber: ['FL Studio', 'Roland TR-909', 'Native Instruments Massive'],
  uptempo: ['FL Studio', 'Xfer Serum', 'Native Instruments Massive'],
  doomcore: ['Roland TR-909', 'Akai S950', 'Steinberg Cubase'],
  frenchcore: ['FL Studio', 'Roland TR-909', 'Xfer Serum'],
  dubstyle: ['FL Studio', 'Native Instruments Massive', 'Roland TR-909'],
  happyhardcore: ['Akai S950', 'Roland TR-909', 'Commodore Amiga', 'Korg M1'],
  ukhardcore: ['FL Studio', 'Roland JP-8000', 'LennarDigital Sylenth1'],
  raggacore: ['Akai S950', 'FL Studio', 'Platines vinyle'],
  jumpstyle: ['FL Studio', 'Roland TR-909', 'Native Instruments Massive'],
  lentoviolento: ['FL Studio', 'Roland TR-909', 'Korg Triton'],
  ambientgenre: ['EMS Synthi AKS', 'Magnétophone à bande', 'Synthétiseur modulaire', 'Fender Rhodes'],
  darkambient: ['Synthétiseur modulaire', 'Enregistreur de terrain', 'Granulateur'],
  isolationism: ['Gongs', 'Magnétophone à bande', 'Réverbération numérique'],
  ambientdub: ['Roland RE-201 Space Echo', 'Console de mixage', 'Akai S1000'],
  ambienthouse: ['Roland TR-909', 'Akai S1000', 'Korg M1', 'Roland Juno-106'],
  psybient: ['Ableton Live', 'Native Instruments Absynth', 'Roland RE-201 Space Echo'],
  breakbeatgarage: ['Akai S950', 'Roland TR-909', 'Steinberg Cubase'],
};


/* LE COMPLEMENT. L'extraction seule laissait 71 genres avec UNE machine, et
   parfois la moins parlante : Nu-Disco n'affichait que « Guitare electrique »,
   Krautrock que « Orgue », Philly Soul que « Studio Sigma Sound ». Une ligne
   d'un mot est pire que pas de ligne, elle donne l'air d'avoir repondu.
   Ces entrees s'ajoutent a ce qui a ete extrait, sans le remplacer. */
const COMPLEMENTS: Record<string, string[]> = {
  nudisco: ['Roland Juno-106', 'Ableton Live', 'Fender Rhodes'],
  darkdisco: ['Roland Juno-106', 'Korg MS-20', 'Ableton Live'],
  hiphouse: ['Akai S900', 'Roland TR-808', 'E-mu SP-1200'],
  discohouse: ['Akai S3000', 'Roland TR-909', 'Steinberg Cubase'],
  hardtechno: ['Ableton Live', 'Xfer Serum', 'Steinberg Cubase'],
  schranz: ['Steinberg Cubase', 'Akai S3000'],
  industrialtechno: ['Roland TR-909', 'Elektron Machinedrum', 'Ableton Live'],
  dubtechno: ['Roland TR-909', 'Korg MS-20', 'Console de mixage'],
  bangintechno: ['Akai S3000', 'Steinberg Cubase'],
  minimaltechno: ['Roland TB-303', 'Ableton Live', 'Akai MPC'],
  clickscuts: ['Native Instruments Reaktor', 'Ordinateur', 'Steinberg Cubase'],
  fidgethouse: ['Native Instruments Massive', 'Roland TR-909'],
  balearictrance: ['Roland Juno-106', 'Korg M1', 'Akai S1000'],
  dreamtrance: ['Korg M1', 'Akai S3000', 'Roland Juno-106'],
  germantrance: ['Roland TB-303', 'Access Virus', 'Korg M1'],
  upliftingtrance: ['Access Virus', 'LennarDigital Sylenth1', 'Steinberg Cubase'],
  fullon: ['Clavia Nord Lead', 'Native Instruments Absynth', 'Steinberg Cubase'],
  forestpsy: ['Ableton Live', 'Native Instruments Absynth', 'Enregistreur de terrain'],
  electroindustrial: ['Clavia Nord Lead', 'Vocodeur', 'Steinberg Cubase'],
  ndh: ['Clavia Nord Lead', 'Boîte à rythmes', 'Steinberg Cubase'],
  electroacoustic: ['Magnétophone à bande', 'Oscillateur de laboratoire', 'Console de mixage'],
  krautrock: ['Moog modulaire', 'EMS Synthi AKS', 'Magnétophone à bande', 'Écho à bande'],
  earlyindustrial: ['Boîte à rythmes', 'Synthétiseur modulaire', 'Pédale de distorsion'],
  phillysoul: ['Fender Rhodes', 'Hohner Clavinet', 'Basse électrique', 'Batterie acoustique'],
  jungle: ['Commodore Amiga', 'Roland TR-909', 'Steinberg Cubase'],
  drumandbass: ['Clavia Nord Lead', 'Roland TR-909', 'Steinberg Cubase'],
  liquiddnb: ['Akai S3000', 'Native Instruments Massive', 'Steinberg Cubase'],
  drumfunk: ['Akai S3000', 'Steinberg Cubase'],
  raggajungle: ['Akai S950', 'Commodore Amiga', 'Steinberg Cubase'],
  drillnbass: ['Akai S950', 'Roland TB-303', 'Steinberg Cubase'],
  bigbeat: ['Akai S1000', 'Roland TR-909', 'Platines vinyle'],
  riddim: ['Ableton Live', 'FL Studio'],
  futuregarage: ['Ableton Live', 'Akai MPC', 'Native Instruments Massive'],
  grime: ['FL Studio', 'Korg Triton'],
  wonky: ['Ableton Live', 'Native Instruments Massive'],
  futurebass: ['Ableton Live', 'Native Instruments Massive'],
  trapedm: ['FL Studio', 'Xfer Serum', 'Native Instruments Massive'],
  jerseyclub: ['Akai MPC', 'Roland TR-808'],
  deconstructedclub: ['Xfer Serum', 'Max/MSP', 'Native Instruments Reaktor'],
  miamibass: ['E-mu SP-1200', 'Akai MPC60', 'Platines vinyle'],
  terrorcore: ['Roland TR-909', 'Trackers (Amiga)', 'Steinberg Cubase'],
  speedcore: ['Roland TR-909', 'FL Studio'],
  bouncytechno: ['Roland TR-909', 'Akai S950', 'Steinberg Cubase'],
  jcore: ['FL Studio', 'Xfer Serum', 'LennarDigital Sylenth1'],
  makina: ['Roland TR-909', 'Korg M1', 'Steinberg Cubase'],
  digitalhardcore: ['Akai S950', 'Guitare électrique', 'Roland TR-909'],
  dungeonsynth: ['Clavier General MIDI', 'Réverbération numérique'],
  drone: ['Amplificateur à lampes', 'Magnétophone à bande', 'Archet'],
  lowercase: ['Ordinateur', 'Max/MSP'],
  illbient: ['Akai S1000', 'Roland RE-201 Space Echo', 'Console de mixage'],
  glitch: ['Native Instruments Reaktor', 'Ordinateur', 'Granulateur'],
  triphop: ['Akai MPC60', 'Platines vinyle', 'Fender Rhodes'],
  bristolsound: ['Akai S1000', 'Platines vinyle', 'Magnétophone quatre pistes'],
  lofihiphop: ['Ableton Live', 'Magnétophone à cassette', 'Fender Rhodes'],
  balearic: ['Roland Juno-106', 'Platines vinyle', 'Écho à bande'],
  afrohouse: ['Roland TR-909', 'Ableton Live', 'Native Instruments Massive'],
  soulfulhouse: ['Korg M1', 'Roland TR-909', 'Akai S3000'],
  basshouse: ['Ableton Live', 'Native Instruments Massive'],
  amapiano: ['Native Instruments Massive', 'Xfer Serum'],
  gqom: ['Native Instruments Massive', 'Roland TR-808'],
  birminghamtechno: ['Roland TR-808', 'Akai S950', 'Steinberg Cubase'],
  hypnotictechno: ['Roland TR-909', 'Elektron Octatrack', 'Ableton Live'],
  melodictechno: ['Ableton Live', 'Xfer Serum', 'Roland TR-909'],
  brokentechno: ['Elektron Octatrack', 'Ableton Live', 'Akai MPC'],
  anthemtrance: ['Access Virus', 'Korg Triton', 'Steinberg Cubase'],
  ibizatrance: ['Roland Juno-106', 'Korg M1', 'Akai S1000'],
  psytech: ['Ableton Live', 'Xfer Serum', 'Roland TR-909'],
  powerelectronics: ['Console de mixage', 'Oscillateur de laboratoire', 'Microphone'],
  rhythmicnoise: ['Ordinateur', 'Pédale de distorsion', 'Native Instruments Reaktor'],
  darkwave: ['Roland Juno-106', 'Korg Poly-61', 'Basse électrique'],
  aggrotech: ['Clavia Nord Lead', 'Native Instruments Massive', 'Steinberg Cubase'],
};

type Genre = { id: string; label: string; machines?: string[]; sonorites?: string[] };
const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const avant = JSON.parse(readFileSync(CORPUS, 'utf8')) as { genres: Genre[] };

const canon = (txt: string): string[] =>
  GEAR.filter(([re]) => re.test(txt)).map(([, n]) => n);

/* UNE ENTREE QUI N'EST QUE LE NOM D'UNE MACHINE NE PART PAS EN SONORITES : elle
   n'ajoute rien a ce que la ligne « Machines » dit deja. Une entree qui porte
   un qualificatif y reste, parce que le qualificatif est l'information. */
const estPurGear = (e: string): boolean => {
  const noms = canon(e);
  if (noms.length === 0) return false;
  const nu = e.replace(/[()]/g, '').trim().toLowerCase();
  const marque = /^(roland|akai|korg|yamaha|e-mu|oberheim|sequential|access|clavia|native instruments|xfer|lennardigital|reveal sound|steinberg|apple|fender|hohner|commodore|elektron|novation)\s+/;
  return noms.some((n) => nu === n.toLowerCase() || nu === n.toLowerCase().replace(marque, ''));
};

const plan = avant.genres.map((g) => {
  const src = g.machines ?? [];
  const extraites = [...new Set(src.flatMap(canon))];
  const machines = [
    ...new Set(
      extraites.length > 0 ? [...extraites, ...(COMPLEMENTS[g.id] ?? [])] : (ECRITS[g.id] ?? [])
    ),
  ];
  const sonorites = src.filter((e) => !estPurGear(e));
  return { id: g.id, label: g.label, machines, sonorites, ecrit: extraites.length === 0 && machines.length > 0 };
});

const vides = plan.filter((p) => p.machines.length === 0);
const ecrits = plan.filter((p) => p.ecrit);

console.log(`${plan.length} genres.`);
console.log(`  ${plan.length - vides.length} avec une ligne Machines`);
console.log(`  ${plan.length - vides.length - ecrits.length} extraits du texte existant`);
console.log(`  ${ecrits.length} ecrits a la main`);
console.log(`  ${vides.length} encore sans machine`);
if (vides.length > 0) console.log('    ' + vides.map((v) => v.id).join(', '));

const inutiles = Object.keys(ECRITS).filter((k) => !plan.some((p) => p.ecrit && p.id === k));
if (inutiles.length > 0) {
  console.error(`\nCLES ECRITES SANS EMPLOI (genre inconnu ou deja couvert) : ${inutiles.join(', ')}`);
}

console.log('\nExemples :');
for (const id of ['schranz', 'chicagohouse', 'dubstep', 'ambientgenre', 'reggae']) {
  const p = plan.find((x) => x.id === id);
  if (!p) continue;
  console.log(`  ${p.label}`);
  console.log(`    Machines : ${p.machines.join(', ') || '(aucune)'}`);
  console.log(`    Le son   : ${p.sonorites.join(', ') || '(rien)'}`);
}

if (SEC) {
  console.log("\n--dry-run : rien n'a ete ecrit.");
  process.exit(0);
}

transaction((frais) => {
  const genres = (frais as unknown as { genres: Genre[] }).genres;
  for (const p of plan) {
    const g = genres.find((x) => x.id === p.id);
    if (!g) continue;
    if (p.machines.length > 0) g.machines = p.machines;
    else delete g.machines;
    if (p.sonorites.length > 0) g.sonorites = p.sonorites;
    else delete g.sonorites;
  }
});
console.log('\nCorpus reecrit.');
