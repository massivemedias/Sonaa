/* UN SEUL SON DE SET POUR TOUT LE SITE, ET IL SURVIT AUX PAGES.
 *
 * ═══ POURQUOI CE N'EST PLUS DANS LE COMPOSANT ═══
 *
 * Le lecteur d'un set portait sa propre balise audio. Elle vivait et mourait
 * avec lui : ouvrir un autre onglet du site demontait la page des sons, donc
 * la balise, donc le son. Mesure le 7 septembre 2026 : quitter Sons coupait
 * l'ecoute, a chaque fois. Sur un site qui veut qu'on ECOUTE en regardant le
 * calendrier ou les styles, c'est le defaut qui compte le plus.
 *
 * La balise vit donc ici, une fois, hors de React. Les composants la
 * regardent et la commandent, ils ne la possedent pas. C'est ce qui permet
 * a la barre du bas d'afficher ce qui joue depuis n'importe quelle page.
 *
 * ═══ DEUX LECTEURS, JAMAIS DEUX SONS ═══
 *
 * Le site a aussi un lecteur YouTube, pour les morceaux des genres. Tant que
 * le son des sets mourait avec sa page, les deux ne pouvaient pas se
 * superposer : c'etait garanti par les routes. Ce n'est plus le cas. Ils
 * s'annoncent donc l'un a l'autre par un evenement de fenetre, et chacun se
 * tait quand l'autre demarre. Une seule regle, dans les deux sens.
 */

import { useSyncExternalStore } from 'react';
import { compterEcoute, urlAudio, type SetDJ } from './sets.ts';

export type SourceDeLecture = 'set' | 'youtube';

/** L'evenement par lequel un lecteur annonce qu'il vient de demarrer. */
export const EVENEMENT_LECTURE = 'sonaa:lecture';

export function annoncerLecture(source: SourceDeLecture): void {
  window.dispatchEvent(new CustomEvent<SourceDeLecture>(EVENEMENT_LECTURE, { detail: source }));
}

/** Appelle `quoi` quand une AUTRE source demarre. Rend la fonction de retrait. */
export function quandLAutreDemarre(moi: SourceDeLecture, quoi: () => void): () => void {
  const h = (e: Event): void => {
    const source = (e as CustomEvent<SourceDeLecture>).detail;
    if (source !== moi) quoi();
  };
  window.addEventListener(EVENEMENT_LECTURE, h);
  return () => window.removeEventListener(EVENEMENT_LECTURE, h);
}

export interface EtatLectureSet {
  readonly set: SetDJ | null;
  readonly joue: boolean;
  readonly position: number;
  readonly duree: number;
  readonly erreur: boolean;
}

const REPOS: EtatLectureSet = { set: null, joue: false, position: 0, duree: 0, erreur: false };

let etat: EtatLectureSet = REPOS;
let audio: HTMLAudioElement | null = null;
const abonnes = new Set<() => void>();
/** Les sets deja comptes comme ecoutes dans cette session : une ecoute par
    set, pas une par appui sur lecture. */
const comptes = new Set<string>();

function publier(suivant: EtatLectureSet): void {
  etat = suivant;
  for (const f of abonnes) f();
}

/** La balise, creee au premier besoin et jamais detruite. */
function balise(): HTMLAudioElement {
  if (audio) return audio;
  const a = new Audio();
  a.preload = 'metadata';
  a.addEventListener('timeupdate', () => publier({ ...etat, position: a.currentTime }));
  const surDuree = (): void => {
    if (Number.isFinite(a.duration)) publier({ ...etat, duree: a.duration });
  };
  a.addEventListener('loadedmetadata', surDuree);
  a.addEventListener('durationchange', surDuree);
  a.addEventListener('play', () => publier({ ...etat, joue: true, erreur: false }));
  a.addEventListener('pause', () => publier({ ...etat, joue: false }));
  a.addEventListener('ended', () => publier({ ...etat, joue: false, position: 0 }));
  a.addEventListener('error', () => publier({ ...etat, joue: false, erreur: true }));
  /* L'ETAT SUIT L'ELEMENT, IL NE LE DEVANCE PAS : `joue` ne passe a vrai que
     sur l'evenement `play`. Afficher Pause avant que le son ait demarre
     faisait envoyer une pause au moment ou le geste allait debloquer. */
  quandLAutreDemarre('set', () => a.pause());
  audio = a;
  return a;
}

/** Charge ce set s'il n'est pas deja celui de la balise, et le lance. */
export function jouerLeSet(set: SetDJ): void {
  const a = balise();
  if (etat.set?.id !== set.id) {
    a.src = urlAudio(set.audio_path);
    publier({ set, joue: false, position: 0, duree: set.duree_s ?? 0, erreur: false });
  }
  void a.play().then(
    () => annoncerLecture('set'),
    () => publier({ ...etat, joue: false, erreur: true })
  );
  if (!comptes.has(set.id)) {
    comptes.add(set.id);
    void compterEcoute(set.id);
  }
}

/** Lecture ou pause sur le set en cours. Sans set en cours, ne fait rien. */
export function basculerLeSet(): void {
  const a = audio;
  if (!a || !etat.set) return;
  if (a.paused) {
    void a.play().then(
      () => annoncerLecture('set'),
      () => publier({ ...etat, joue: false, erreur: true })
    );
  } else a.pause();
}

/** Se place a `secondes` dans le set en cours. */
export function chercherDansLeSet(secondes: number): void {
  const a = audio;
  if (!a || !etat.set) return;
  const cible = Math.max(0, Math.min(etat.duree || secondes, secondes));
  a.currentTime = cible;
  publier({ ...etat, position: cible });
}

/** Arrete tout et oublie le set : la barre du bas disparait. */
export function arreterLeSet(): void {
  const a = audio;
  if (a) {
    a.pause();
    a.removeAttribute('src');
    a.load();
  }
  publier(REPOS);
}

export function etatDeLectureSet(): EtatLectureSet {
  return etat;
}

function sAbonner(f: () => void): () => void {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

/** L'etat du lecteur, pour un composant. Se met a jour a chaque tic. */
export function useLectureSet(): EtatLectureSet {
  return useSyncExternalStore(sAbonner, etatDeLectureSet, etatDeLectureSet);
}

/** Pour les tests seulement : remet la balise et l'etat a zero. */
export function reinitialiserPourTests(): void {
  audio = null;
  etat = REPOS;
  abonnes.clear();
  comptes.clear();
}
