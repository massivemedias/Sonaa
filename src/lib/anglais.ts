/* LES TEXTES ANGLAIS DES STYLES. Le corpus est ecrit en francais ; pour
 * chaque genre, deux textes anglais existent en plus (description, et ce
 * qui compte quand on le produit), ecrits le 14 septembre 2026 pour les
 * pages /en/ que lisent les moteurs de recherche. L'app les affiche a la
 * place de la description francaise quand l'interface est en anglais. Le
 * fichier n'est charge que dans ce cas : un lecteur francophone ne le
 * telecharge jamais.
 *
 * TOUT LE RESTE DEPUIS LE 10 OCTOBRE 2026. Mika : « il y a des erreurs de
 * traduction intenses, quand je suis en EN il y a beaucoup de texte en
 * francais, surtout dans les styles ». Il avait raison : seule la
 * description etait anglaise. Le son, l'histoire, le tuto, le mot de
 * l'auteur, les textes des familles (familles-en.json) et les 219 cours
 * (cours-en.json, voir cours.ts) le sont maintenant aussi, et le meme
 * fichier porte chaque fois le champ anglais a cote de la description. Un
 * champ absent retombe sur le francais. */

import { useEffect, useState } from 'react';
import { langue } from '../langue/langue.ts';

export interface SectionAnglaise {
  readonly titre: string;
  readonly texte: string;
  readonly image?: string | undefined;
}

export interface TexteAnglais {
  readonly description: string;
  readonly production: string;
  readonly note?: string | undefined;
  readonly sonorites?: readonly string[] | undefined;
  readonly article?: readonly SectionAnglaise[] | undefined;
  readonly motDeLAuteur?: string | undefined;
  readonly tuto?: readonly { readonly titre: string; readonly texte: string }[] | undefined;
}

export interface FamilleAnglaise {
  readonly description?: string | undefined;
  readonly article?: readonly SectionAnglaise[] | undefined;
}

let promesse: Promise<Record<string, TexteAnglais>> | null = null;
let promesseFamilles: Promise<Record<string, FamilleAnglaise>> | null = null;

function charger(): Promise<Record<string, TexteAnglais>> {
  promesse ??= import('../data/textes-en.json').then((m) => m.default as Record<string, TexteAnglais>);
  return promesse;
}

function chargerFamilles(): Promise<Record<string, FamilleAnglaise>> {
  promesseFamilles ??= import('../data/familles-en.json').then((m) => m.default as Record<string, FamilleAnglaise>);
  return promesseFamilles;
}

/** Le texte anglais d'un genre, ou null tant qu'il n'est pas la (ou que
    l'interface est en francais, auquel cas il ne le sera jamais). */
export function useTexteAnglais(genreId: string): TexteAnglais | null {
  const [texte, setTexte] = useState<TexteAnglais | null>(null);
  useEffect(() => {
    if (langue !== 'en') return;
    let vivant = true;
    void charger().then((tous) => {
      if (vivant) setTexte(tous[genreId] ?? null);
    });
    return () => {
      vivant = false;
    };
  }, [genreId]);
  return langue === 'en' ? texte : null;
}

/** Le texte anglais d'une famille, meme regle. */
export function useFamilleAnglaise(familleId: string): FamilleAnglaise | null {
  const [texte, setTexte] = useState<FamilleAnglaise | null>(null);
  useEffect(() => {
    if (langue !== 'en') return;
    let vivant = true;
    void chargerFamilles().then((toutes) => {
      if (vivant) setTexte(toutes[familleId] ?? null);
    });
    return () => {
      vivant = false;
    };
  }, [familleId]);
  return langue === 'en' ? texte : null;
}

/* LES MACHINES QUI NE SONT PAS DES MARQUES. « Roland TR-909 » se dit pareil
   partout ; « Console de mixage » non. Les noms communs sont traduits ici
   une fois, plutot que dans chacune des fiches qui les citent. */
const MACHINES_EN: Readonly<Record<string, string>> = {
  'Amplificateur à lampes': 'Tube amplifier',
  Archet: 'Bow',
  'Banques orchestrales EastWest': 'EastWest orchestral libraries',
  'Basse électrique': 'Electric bass',
  'Batterie acoustique': 'Acoustic drum kit',
  'Boîte à rythmes': 'Drum machine',
  "Chambre d'écho": 'Echo chamber',
  'Clavier General MIDI': 'General MIDI keyboard',
  'Console de mixage': 'Mixing console',
  Contrebasse: 'Double bass',
  'Enregistreur de terrain': 'Field recorder',
  Granulateur: 'Granular processor',
  'Guitare électrique': 'Electric guitar',
  Harpe: 'Harp',
  'Magnétophone quatre pistes': 'Four-track recorder',
  'Magnétophone à bande': 'Tape recorder',
  'Magnétophone à cassette': 'Cassette recorder',
  'Microphone contact': 'Contact microphone',
  'Moog modulaire': 'Moog modular',
  Ordinateur: 'Computer',
  Orgue: 'Organ',
  'Orgue Farfisa': 'Farfisa organ',
  'Oscillateur de laboratoire': 'Laboratory oscillator',
  Phonogène: 'Phonogene',
  'Platines vinyle': 'Turntables',
  'Pédale de distorsion': 'Distortion pedal',
  'Réverbération numérique': 'Digital reverb',
  'Réverbération à plaque': 'Plate reverb',
  'Réverbération à ressort': 'Spring reverb',
  'Synthétiseur modulaire': 'Modular synthesizer',
  'Synthétiseur monophonique': 'Monophonic synthesizer',
  'Séquenceur analogique': 'Analog sequencer',
  Vocodeur: 'Vocoder',
  'Écho à bande': 'Tape echo',
};

/** Le nom d'une machine dans la langue de l'interface. */
export function nomDeMachine(nom: string): string {
  return langue === 'en' ? (MACHINES_EN[nom] ?? nom) : nom;
}
