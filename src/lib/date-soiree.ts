/* LE JOUR D'UNE SOIREE, ECRIT EN TOUTES LETTRES.
 *
 * Mika, le 30 septembre 2026, devant la fiche d'une soiree qui l'interessait :
 * « faut que je cherche quand c'est, c'est dommage parce que c'est un
 * calendrier ». La fiche ne disait que « 15 h 00 », et la carte rien du tout :
 * le jour n'etait ecrit qu'en tete de la section, des ecrans plus haut. Il a
 * donne la forme voulue : « mardi 5 janvier 2026 - 15h00 ».
 *
 * DEUX SORTES DE DATES ARRIVENT, ET ELLES NE SE LISENT PAS PAREIL.
 * Resident Advisor ecrit « 2026-10-03T15:00:00.000 », sans fuseau : c'est
 * l'heure au mur de la salle, et le jour se lit tel quel, sans conversion
 * (voir villes.ts, heureLocale). Une soiree ajoutee chez nous porte un vrai
 * instant, « 2026-10-04T02:00:00+00:00 » : son jour est celui du fuseau de
 * la ville, soit le samedi 3 a 22 h a Montreal et non le dimanche 4. */

import { estSansFuseau } from './fenetre-agenda.ts';

/** « samedi 3 octobre 2026 », ou « Saturday, October 3, 2026 ». Sans
    l'annee si on le demande, pour une etiquette courte. */
export function dateLongue(iso: string, fuseau: string, locale: string, avecAnnee = true): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(avecAnnee ? { year: 'numeric' } : {}),
  };
  if (estSansFuseau(iso) || /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [a, m, j] = iso.slice(0, 10).split('-').map(Number);
    return new Intl.DateTimeFormat(locale, options).format(new Date(a ?? 1970, (m ?? 1) - 1, j ?? 1));
  }
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: fuseau }).format(d);
  } catch {
    return new Intl.DateTimeFormat(locale, options).format(d);
  }
}

/** Le jour et l'heure d'une soiree : « samedi 3 octobre 2026 - 15 h 00 ».
    Le jour est lu dans le debut quand il existe, sinon dans la date. */
export function quandEnLettres(
  soiree: { readonly date: string; readonly debut: string | null },
  heure: string | null,
  fuseau: string,
  locale: string,
  avecAnnee = true
): string {
  const jour = dateLongue(soiree.debut ?? soiree.date, fuseau, locale, avecAnnee);
  return heure ? `${jour} - ${heure}` : jour;
}
