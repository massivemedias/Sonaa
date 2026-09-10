/* ON ECOUTE CONNECTE, ET C'EST VOULU.
 *
 * Mika, le 10 septembre 2026 : « des que les gens cliquent sur play je veux
 * qu'ils puissent et doivent se logger sur le site ... je veux vraiment
 * forcer les gens a se connecter ». Le calendrier, les fiches, les news
 * restent ouverts a tous ; le SON, les sets comme les morceaux des genres,
 * demande un compte.
 *
 * UNE SEULE PORTE, POSEE DEVANT CHAQUE LECTURE. Le set (LecteurSet), le
 * morceau d'un genre (ParcourirView), le lecteur de la carte (PlayerLayer) :
 * tous appellent `peutEcouter()` dans le geste, et ne lancent le son que si
 * elle rend vrai. Sinon elle ouvre le panneau de connexion, avec la phrase
 * qui dit pourquoi, et le geste s'arrete la. Une fois connecte, on appuie a
 * nouveau : la lecture doit partir d'un geste, et la connexion en a
 * consomme un.
 *
 * LA DECISION EST SYNCHRONE, ET IL LE FAUT. Le navigateur n'autorise un son
 * que dans le gestionnaire du geste ; attendre une promesse pour savoir si
 * la personne est connectee ferait rater la fenetre. On lit donc la session
 * deja connue (useSession la tient a jour), on ne la redemande pas.
 *
 * SANS BASE, PAS DE PORTE. Un build local sans variables Supabase ne peut
 * connecter personne ; y fermer le son fermerait le site. */

import { contributionsActives } from './config.ts';
import { sessionActuelle } from './useSession.ts';

/** L'evenement qui ouvre le panneau de connexion, avec un motif. */
export const EVENEMENT_CONNEXION = 'sonaa:connexion';

/** Le motif porte par l'evenement quand c'est la lecture qui l'a ouvert :
    le panneau dit alors « connecte-toi pour ecouter » au lieu de la phrase
    generale. */
export const MOTIF_ECOUTE = 'ecoute';

/** Vrai si le son peut partir. Faux sinon, ET le panneau de connexion est
    ouvert : l'appelant n'a rien d'autre a faire que s'arreter. */
export function peutEcouter(): boolean {
  if (!contributionsActives) return true;
  if (sessionActuelle()) return true;
  window.dispatchEvent(new CustomEvent<string>(EVENEMENT_CONNEXION, { detail: MOTIF_ECOUTE }));
  return false;
}
