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

/** Les 20 villes du calendrier SONAA avec leur zone Resident Advisor et leur fuseau. */
/* LES VINGT VILLES, depuis le 12 novembre 2026 (ADR-118) : les memes que la
   table `villes` du calendrier. */
export const ZONES_RA_PAR_VILLE: Readonly<Record<string, ConfigVilleCalendrier>> = {
  'montreal-ca': { zone: 40, fuseau: 'America/Toronto' },
  'toronto-ca': { zone: 28, fuseau: 'America/Toronto' },
  'newyork-us': { zone: 8, fuseau: 'America/New_York' },
  'losangeles-us': { zone: 23, fuseau: 'America/Los_Angeles' },
  'chicago-us': { zone: 17, fuseau: 'America/Chicago' },
  'miami-us': { zone: 38, fuseau: 'America/New_York' },
  'mexico-mx': { zone: 399, fuseau: 'America/Mexico_City' },
  'saopaulo-br': { zone: 400, fuseau: 'America/Sao_Paulo' },
  'londres-gb': { zone: 13, fuseau: 'Europe/London' },
  'paris-fr': { zone: 44, fuseau: 'Europe/Paris' },
  'lyon-fr': { zone: 337, fuseau: 'Europe/Paris' },
  'marseille-fr': { zone: 338, fuseau: 'Europe/Paris' },
  'toulouse-fr': { zone: 618, fuseau: 'Europe/Paris' },
  'montpellier-fr': { zone: 339, fuseau: 'Europe/Paris' },
  'berlin-de': { zone: 34, fuseau: 'Europe/Berlin' },
  'amsterdam-nl': { zone: 29, fuseau: 'Europe/Amsterdam' },
  'bruxelles-be': { zone: 62, fuseau: 'Europe/Brussels' },
  'barcelone-es': { zone: 20, fuseau: 'Europe/Madrid' },
  'madrid-es': { zone: 41, fuseau: 'Europe/Madrid' },
  'tokyo-jp': { zone: 27, fuseau: 'Asia/Tokyo' },
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

  const filtrees = soirees
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

  /* Dedoublonne deux annonces d'un meme soir dans la meme salle dont l'une
     ajoute le nom de la ville ou un prefixe entre crochets au titre. */
  const titreDedup = (t: string): string => cleExacte(t.replace(/^\[[^\]]+\]\s*/, ''));
  const uniques: Soiree[] = [];
  for (const s of filtrees) {
    const jour = s.date.slice(0, 10);
    const titreCourt = titreDedup(s.titre);
    const indexExistant = uniques.findIndex((u) => {
      if (u.date.slice(0, 10) !== jour) return false;
      const tU = titreDedup(u.titre);
      if (!tU || !titreCourt) return false;
      return tU === titreCourt || tU.startsWith(`${titreCourt} `) || titreCourt.startsWith(`${tU} `);
    });
    if (indexExistant < 0) {
      uniques.push(s);
    } else {
      const deja = uniques[indexExistant];
      if (deja && s.artistes.length > deja.artistes.length) {
        uniques[indexExistant] = s;
      }
    }
  }
  return uniques;
}
