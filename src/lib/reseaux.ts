/* LES RESEAUX D'UN ARTISTE : lesquels, dans quel ordre, et comment lire ce
 * qu'on tape.
 *
 * Mika, le 18 octobre 2026, capture de SoundCloud a l'appui : sur un profil,
 * les liens vers Instagram, Facebook et les autres, chacun avec son icone.
 *
 * ON ACCEPTE UNE ADRESSE OU UN SIMPLE IDENTIFIANT. Personne ne retient
 * l'adresse complete de son SoundCloud ; « maudite-machine » suffit, et la
 * fonction `adresseDuReseau` en fait https://soundcloud.com/maudite-machine.
 * Seules des adresses http(s) sont gardees : un lien « javascript: » colle
 * dans un profil ne doit jamais devenir un lien cliquable. */

import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { faGlobe, faRecordVinyl } from '@fortawesome/free-solid-svg-icons';
import {
  faBandcamp,
  faFacebook,
  faInstagram,
  faMixcloud,
  faSoundcloud,
  faSpotify,
  faTiktok,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';

export interface Reseau {
  readonly id: string;
  readonly nom: string;
  readonly icone: IconDefinition;
  /** L'adresse d'un identifiant, quand on n'a tape que lui. */
  readonly depuisIdentifiant: (h: string) => string;
}

export const RESEAUX: readonly Reseau[] = [
  { id: 'instagram', nom: 'Instagram', icone: faInstagram, depuisIdentifiant: (h) => `https://www.instagram.com/${h}` },
  { id: 'soundcloud', nom: 'SoundCloud', icone: faSoundcloud, depuisIdentifiant: (h) => `https://soundcloud.com/${h}` },
  { id: 'facebook', nom: 'Facebook', icone: faFacebook, depuisIdentifiant: (h) => `https://www.facebook.com/${h}` },
  { id: 'youtube', nom: 'YouTube', icone: faYoutube, depuisIdentifiant: (h) => `https://www.youtube.com/@${h}` },
  { id: 'tiktok', nom: 'TikTok', icone: faTiktok, depuisIdentifiant: (h) => `https://www.tiktok.com/@${h}` },
  { id: 'mixcloud', nom: 'Mixcloud', icone: faMixcloud, depuisIdentifiant: (h) => `https://www.mixcloud.com/${h}/` },
  { id: 'bandcamp', nom: 'Bandcamp', icone: faBandcamp, depuisIdentifiant: (h) => `https://${h}.bandcamp.com` },
  { id: 'spotify', nom: 'Spotify', icone: faSpotify, depuisIdentifiant: (h) => `https://open.spotify.com/artist/${h}` },
  { id: 'ra', nom: 'Resident Advisor', icone: faRecordVinyl, depuisIdentifiant: (h) => `https://ra.co/dj/${h}` },
  { id: 'site', nom: 'Site', icone: faGlobe, depuisIdentifiant: (h) => `https://${h}` },
];

/* UNE ADRESSE SANS PROTOCOLE N'EST RECONNUE QUE SUR LE DOMAINE DU RESEAU.
   « soundcloud.com/x » est une adresse ; « dj.mike » sur Instagram est un
   identifiant, pas un site, meme s'il a un point. */
function estDuDomaine(reseau: Reseau, brut: string): boolean {
  const domaine = new URL(reseau.depuisIdentifiant('x')).hostname.split('.').slice(-2).join('.');
  const hote = (brut.toLowerCase().split('/')[0] ?? '').replace(/^www\./, '');
  return hote === domaine || hote.endsWith(`.${domaine}`);
}

/** L'adresse a garder pour ce qu'on a tape, ou null si ce n'en est pas une. */
export function adresseDuReseau(reseau: Reseau, saisie: string): string | null {
  const brut = saisie.trim();
  if (!brut) return null;
  let url: string;
  if (/^https?:\/\//i.test(brut)) url = brut;
  else if (reseau.id === 'site' || estDuDomaine(reseau, brut)) url = `https://${brut}`;
  else url = reseau.depuisIdentifiant(brut.replace(/^@/, '').replace(/\s+/g, ''));
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Les liens d'un profil, dans l'ordre des reseaux, sans ceux qui sont vides
    ou qui ne sont pas des adresses web. */
export function liensAffiches(liens: Readonly<Record<string, string>> | null | undefined): { reseau: Reseau; url: string }[] {
  if (!liens) return [];
  return RESEAUX.flatMap((reseau) => {
    const url = liens[reseau.id];
    return url && /^https?:\/\//i.test(url) ? [{ reseau, url }] : [];
  });
}

/** Ce qu'on montre d'une adresse a cote de son icone : sans protocole ni
    « www. », sans barre finale. */
export function adresseCourte(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}
