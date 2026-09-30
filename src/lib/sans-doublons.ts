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
 * une ailleurs, c'est l'agenda qui se trompe. */

import type { Soiree } from './agenda.ts';

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

/** Les soirees dans leur ordre, chacune une seule fois. */
export function sansDoublons(liste: readonly Soiree[]): Soiree[] {
  const ids = new Set<string>();
  const parCle = new Map<string, number>();
  const garde: Soiree[] = [];
  for (const s of liste) {
    if (ids.has(s.id)) continue;
    ids.add(s.id);
    const cle = `${norme(s.titre)}|${s.date.slice(0, 10)}|${norme(s.lieu)}`;
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
