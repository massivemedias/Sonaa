/* ASSOCIER LES PROCHAINES SOIREES DU CALENDRIER A CHAQUE CLUB, BAR MUSICAL,
 * SALLE A LOUER OU FESTIVAL DE L'ATLAS.
 *
 * Mika, le 6 novembre 2026 : « dans atlas sur la carte comme sur les tuiles je
 * veux qu'on puisse voir aussi les prochaines soirees qu'il y a par exemple
 * quand nous cliquons sur newspeak on voit les infos de cette salle mais aussi
 * les prochains events. » */

import type { LieuOuFestival } from '../data/lieux-et-festivals.ts';
import type { Soiree } from '../lib/agenda.ts';

export interface ConfigVilleCalendrier {
  readonly zone: number;
  readonly fuseau: string;
}

/** Les 23 villes du calendrier SONAA avec leur zone Resident Advisor et leur fuseau. */
export const ZONES_RA_PAR_VILLE: Readonly<Record<string, ConfigVilleCalendrier>> = {
  'montreal-ca': { zone: 40, fuseau: 'America/Toronto' },
  'toronto-ca': { zone: 28, fuseau: 'America/Toronto' },
  'vancouver-ca': { zone: 39, fuseau: 'America/Vancouver' },
  'quebec-ca': { zone: 250, fuseau: 'America/Toronto' },
  'ottawa-ca': { zone: 74, fuseau: 'America/Toronto' },
  'calgary-ca': { zone: 137, fuseau: 'America/Edmonton' },
  'winnipeg-ca': { zone: 580, fuseau: 'America/Winnipeg' },
  'halifax-ca': { zone: 586, fuseau: 'America/Halifax' },
  'berlin-de': { zone: 34, fuseau: 'Europe/Berlin' },
  'londres-gb': { zone: 13, fuseau: 'Europe/London' },
  'paris-fr': { zone: 44, fuseau: 'Europe/Paris' },
  'montpellier-fr': { zone: 339, fuseau: 'Europe/Paris' },
  'toulouse-fr': { zone: 618, fuseau: 'Europe/Paris' },
  'amsterdam-nl': { zone: 29, fuseau: 'Europe/Amsterdam' },
  'barcelone-es': { zone: 20, fuseau: 'Europe/Madrid' },
  'newyork-us': { zone: 8, fuseau: 'America/New_York' },
  'losangeles-us': { zone: 23, fuseau: 'America/Los_Angeles' },
  'detroit-us': { zone: 19, fuseau: 'America/Detroit' },
  'chicago-us': { zone: 17, fuseau: 'America/Chicago' },
  'mexico-mx': { zone: 399, fuseau: 'America/Mexico_City' },
  'tokyo-jp': { zone: 27, fuseau: 'Asia/Tokyo' },
  'melbourne-au': { zone: 2, fuseau: 'Australia/Melbourne' },
  'saopaulo-br': { zone: 400, fuseau: 'America/Sao_Paulo' },
};

const ALIAS_PAR_ID: Readonly<Record<string, readonly string[]>> = {
  'sat-montreal': ['SAT', 'Societe des arts technologiques', 'Satosphere'],
  'salon-daome-montreal': ['Salon Daome', 'Le Salon Daome'],
  'bar-datcha-montreal': ['Bar Datcha', 'Datcha'],
  'red-room-montreal': ['Le Red Room', 'Red Room'],
  'fairmount-theatre-montreal': ['Fairmount Theatre', 'Theatre Fairmount'],
  'entrepots-dominion-montreal': ['Les Entrepots Dominion', 'Entrepots Dominion, Les', 'Entrepots Dominion'],
  'olympia-montreal': ['L Olympia', 'Olympia de Montreal', 'Theatre Olympia'],
  'place-des-arts-montreal': ['Place des Arts', 'Esplanade de la Place des Arts'],
  'foufounes-electriques-montreal': ['Les Foufounes Electriques', 'Foufounes Electriques'],
  'nitsa-barcelone': ['Nitsa Club', 'Nitsa', 'La (2) de Apolo'],
  'sala-apolo-barcelone': ['Sala Apolo', 'La (2) de Apolo', 'Nitsa Club'],
  'razzmatazz-barcelone': ['Razzmatazz', 'The Loft', 'Lolita'],
  'moog-barcelone': ['Moog', 'Moog Club'],
  'city-hall-barcelone': ['City Hall', 'City Hall Barcelona'],
  'pacha-barcelone': ['Ku Barcelona', 'Pacha Barcelona'],
  'input-barcelone': ['INPUT High Fidelity Dance Club', 'INPUT'],
  'rockstore-montpellier': ['Rockstore', 'Le Rockstore'],
  'halle-tropisme-montpellier': ['Halle Tropisme', 'Club Tropisme'],
};

const VILLES_A_RETIRER =
  /\b(montreal|barcelone|barcelona|montpellier|paris|berlin|london|londres|toronto|vancouver|quebec|ottawa|calgary|winnipeg|halifax|toulouse|amsterdam|new york|los angeles|detroit|chicago|mexico|tokyo|melbourne|sao paulo)\b/g;

function normaliserBrut(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bstereo\s+bar\b/g, 'stereobar')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cleExacte(s: string): string {
  return normaliserBrut(s)
    .replace(/^(le|la|les|l|the|el|los|las)\s+/g, '')
    .replace(/\s+(le|la|les|the|el|los|las)$/g, '')
    .replace(VILLES_A_RETIRER, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleCourtLieu(s: string): string {
  const base = cleExacte(s);
  const sans = base
    .replace(/\b(nightclub|club|theatre|theater|salle|sala|hall|high fidelity dance)\b/g, ' ')
    .replace(/\b(de|du|des|d|l|le|la|les|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return sans.length >= 3 ? sans : base;
}

function extraireCandidats(lieu: LieuOuFestival): string[] {
  const bruts = new Set<string>([lieu.nom]);
  const horsParentheses = lieu.nom.replace(/\([^)]*\)/g, '').trim();
  if (horsParentheses) bruts.add(horsParentheses);
  const dansParentheses = /\(([^)]+)\)/.exec(lieu.nom)?.[1]?.trim();
  if (dansParentheses) bruts.add(dansParentheses);
  for (const alias of ALIAS_PAR_ID[lieu.id] ?? []) {
    bruts.add(alias);
  }
  return [...bruts];
}

/** Retourne les prochaines soirees associees a un club, bar musical, salle ou festival. */
export function soireesPourLieu(
  lieu: LieuOuFestival,
  soirees: readonly Soiree[],
  maintenantIso?: string
): Soiree[] {
  if (soirees.length === 0) return [];
  const aujourdhui = (maintenantIso ?? new Date().toISOString()).slice(0, 10);
  const candidats = extraireCandidats(lieu);
  const exactes = new Set(candidats.map(cleExacte).filter(Boolean));
  const courtes = new Set(candidats.map(cleCourtLieu).filter((c) => c.length >= 3));
  const estStereoPrincipal = lieu.id === 'stereo-montreal';

  return soirees
    .filter((s) => {
      if (s.date.slice(0, 10) < aujourdhui) return false;
      if (lieu.type === 'festival') {
        const texte = `${cleExacte(s.lieu ?? '')} ${cleExacte(s.titre)}`;
        for (const c of exactes) {
          if (c.length >= 4 && texte.includes(c)) return true;
        }
        return false;
      }
      if (!s.lieu) return false;
      const brutLieu = normaliserBrut(s.lieu);
      if (estStereoPrincipal && (brutLieu.includes('stereobar') || brutLieu.includes('studio stereo'))) {
        return false;
      }
      const exactSoiree = cleExacte(s.lieu);
      const courtSoiree = cleCourtLieu(s.lieu);
      if (!exactSoiree) return false;
      if (exactes.has(exactSoiree) || courtes.has(courtSoiree)) return true;
      for (const c of exactes) {
        if (c.length >= 5 && (exactSoiree.startsWith(`${c} `) || exactSoiree.endsWith(` ${c}`))) {
          return true;
        }
      }
      return false;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
