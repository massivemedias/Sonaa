/* UNE SOIREE NE S'AFFICHE QU'UNE FOIS, QUELLE QUE SOIT SA SOURCE.
 *
 * Mika, le 30 septembre 2026, capture a l'appui : « les events ne sont pas
 * bons ». Le jeudi 1er octobre montrait « Flytz, BACKSPIN, YVNNI » trois
 * fois et le festival MAPP trois fois. Mesure : Resident Advisor rend une
 * annonce par jour pour une soiree de plusieurs jours, avec le meme
 * identifiant, et le calendrier les empilait. La passerelle les ecarte
 * desormais (worker/src/agenda.ts) ; ce filtre les ecarte aussi ici, pour
 * deux raisons qu'elle ne couvre pas :
 *
 * 1. LES REPONSES DEJA EN CACHE. Une page ouverte hors ligne, ou un
 *    prechargement du HTML, peut encore servir une liste d'avant.
 * 2. LES DOUBLONS ENTRE SOURCES. Une soiree annoncee sur Resident Advisor
 *    et versee aussi par Shotgun ou par un membre porte deux identifiants
 *    differents. Elle a le meme titre, le meme jour, la meme salle : c'est la
 *    meme soiree.
 *
 * CE QUI EST GARDE. La premiere ligne rencontree, sauf si une suivante porte
 * une affiche et elle non : une carte sans image pour une soiree qui en a
 * une ailleurs, c'est l'agenda qui se trompe.
 *
 * KONTRAST MONTREAL, LE 12 NOVEMBRE 2026, AFFICHE DEUX FOIS. Deux causes,
 * mesurees sur les deux lignes :
 *
 * 1. LE JOUR. Resident Advisor ecrit « 2026-11-12T00:00:00.000 », l'heure au
 *    mur sans fuseau. La passe Facebook a ecrit un vrai instant,
 *    « 2026-11-13T03:30:00+00:00 », soit le 12 a 22 h 30 a Montreal. Couper
 *    la chaine aux dix premiers caracteres donnait le 13 : toute soiree de la
 *    base qui commence apres 19 h ou 20 h a Montreal changeait de jour et
 *    echappait au filtre. Un instant se lit donc dans le fuseau de la ville,
 *    une heure au mur se lit telle quelle (voir date-soiree.ts).
 * 2. LA SALLE. « Salon Daomé » chez RA, « Le Salon Daomé » chez Facebook.
 *    L'article de tete ne distingue aucune salle : il est retire de la cle. */

import type { Soiree } from './agenda.ts';
import { estSansFuseau } from './fenetre-agenda.ts';

/** Minuscules, sans accents, sans ponctuation : « FÊTE DE QUARTIER | MAPP »
    et « Fete de quartier - MAPP » donnent la meme cle. */
function norme(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** La salle sans son article de tete : « Le Salon Daomé » et « Salon Daomé »
    sont la meme salle. Un nom fait du seul article reste tel quel. */
function normeSalle(s: string | null | undefined): string {
  const n = norme(s);
  const sans = n.replace(/^(le|la|les|l|the)\s+/, '');
  return sans || n;
}

/** Le jour de la soiree, « AAAA-MM-JJ », dans le fuseau de sa ville. */
function jourDe(s: Soiree, fuseau: string): string {
  /* une date au mur (Resident Advisor) garde son jour tel qu'il est ecrit */
  if (estSansFuseau(s.date) || /^\d{4}-\d{2}-\d{2}$/.test(s.date)) return s.date.slice(0, 10);
  const iso = s.debut ?? s.date;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  try {
    /* en-CA ecrit les dates en AAAA-MM-JJ */
    return new Intl.DateTimeFormat('en-CA', { timeZone: fuseau, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

/** Les soirees dans leur ordre, chacune une seule fois. Le fuseau est celui
    de la ville : il sert a lire le jour des soirees de la base. */
export function sansDoublons(liste: readonly Soiree[], fuseau: string): Soiree[] {
  const ids = new Set<string>();
  const parCle = new Map<string, number>();
  const garde: Soiree[] = [];
  for (const s of liste) {
    if (ids.has(s.id)) continue;
    ids.add(s.id);
    const cle = `${norme(s.titre)}|${jourDe(s, fuseau)}|${normeSalle(s.lieu)}`;
    const deja = parCle.get(cle);
    if (deja === undefined) {
      parCle.set(cle, garde.length);
      garde.push(s);
      continue;
    }
    const premiere = garde[deja];
    if (premiere && !premiere.affiche && s.affiche) garde[deja] = s;
  }
  return garde;
}
