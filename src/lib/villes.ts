/* L'ACCES AUX VILLES, ET LA VILLE D'ATTACHE D'UN COMPTE.
 *
 * ═══ LA SEPARATION QUI COMPTE ═══
 *
 * Changer de ville dans le calendrier ecrit en LOCAL et dans l'adresse.
 * Changer de ville dans le profil ecrit en BASE. Jamais l'inverse.
 *
 * Ce n'est pas une commodite d'implementation, c'est la regle : regarder ce
 * qui se joue a Berlin un mardi soir ne doit pas rendre quelqu'un berlinois
 * dans son profil. Une preference se declare, elle ne se deduit pas d'une
 * consultation. C'est le meme principe que la ville deduite de la connexion,
 * qui remplit l'ecran sans rien ecrire nulle part.
 *
 * Les deux fonctions d'ecriture sont donc nommees pour qu'on ne puisse pas se
 * tromper : `noterVilleDeSession` et `enregistrerVilleDattache`.
 */

import { supabase } from './supabase.ts';
import type { Ville } from './ville-active.ts';
import { estSansFuseau, heureAuMur } from './fenetre-agenda.ts';

export type { Ville } from './ville-active.ts';

const CLE_SESSION = 'sonaa.calendar.city';

/** Toutes les villes actives, triees par population : c'est aussi l'ordre
    d'interet quand on affiche la liste sans recherche. */
export async function toutesLesVilles(): Promise<Ville[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('villes')
    .select('id, slug, name, name_ascii, admin_region, country_code, timezone, population, ra_area_id')
    .eq('is_active', true)
    .order('population', { ascending: false, nullsFirst: false });
  if (error) return [];
  return (data ?? []) as Ville[];
}

/* ── Le choix de session, local a cette machine ───────────────────────────── */

export function villeDeSession(): string | null {
  try {
    return localStorage.getItem(CLE_SESSION);
  } catch {
    /* Navigation privee, stockage refuse : le calendrier marche quand meme,
       il oublie simplement la ville a la fermeture. */
    return null;
  }
}

export function noterVilleDeSession(slug: string | null): void {
  try {
    if (slug) localStorage.setItem(CLE_SESSION, slug);
    else localStorage.removeItem(CLE_SESSION);
  } catch {
    /* Voir ci-dessus. */
  }
}

/** Le slug lu dans l'adresse. Le routage du site se fait sur le hash, donc le
    parametre vit APRES le croisillon : #/calendrier?city=berlin-de. */
export function villeDuLien(): string | null {
  const h = window.location.hash;
  const i = h.indexOf('?');
  if (i < 0) return null;
  return new URLSearchParams(h.slice(i + 1)).get('city');
}

/** Ecrit la ville dans l'adresse sans empiler une entree d'historique par
    changement : revenir en arriere doit ramener a la page precedente, pas
    remonter une a une les villes qu'on a regardees. */
export function poserVilleDansLien(slug: string | null): void {
  const h = window.location.hash;
  const i = h.indexOf('?');
  const base = i < 0 ? h : h.slice(0, i);
  const p = new URLSearchParams(i < 0 ? '' : h.slice(i + 1));
  if (slug) p.set('city', slug);
  else p.delete('city');
  const q = p.toString();
  history.replaceState(null, '', `${window.location.pathname}${base}${q ? `?${q}` : ''}`);
}

/* ── La ville d'attache, en base ──────────────────────────────────────────── */

/** L'identifiant de la ville d'attache, ou null. Rend null aussi quand
    personne n'est connecte : l'appelant n'a pas a distinguer les deux, les
    deux veulent dire « le profil ne dit rien ». */
export async function villeDattache(): Promise<string | null> {
  if (!supabase) return null;
  const { data: session } = await supabase.auth.getUser();
  const uid = session.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('home_city_id')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) return null;
  return (data?.home_city_id as string | null) ?? null;
}

/** Ecrit ou efface la ville d'attache. `null` efface : c'est le bouton
    « retirer ma ville » du profil, et il doit exister pour que la donnee soit
    effacable par la personne elle-meme, a tout moment. */
export async function enregistrerVilleDattache(villeId: string | null): Promise<void> {
  if (!supabase) throw new Error('base indisponible');
  const { data: session } = await supabase.auth.getUser();
  const uid = session.user?.id;
  if (!uid) throw new Error('non connecte');
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: uid, home_city_id: villeId }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

/* ── Les heures, dans le fuseau du lieu ───────────────────────────────────── */

/** L'heure d'une soiree telle qu'on la lit SUR PLACE.
 *
 *  Une soiree a Berlin commence a 23 h a Berlin, pas a 17 h a Montreal. Les
 *  heures sont stockees en UTC et affichees dans le fuseau de la ville de
 *  l'evenement : c'est la seule lecture qui ait un sens pour quelqu'un qui
 *  regarde ou il ira. */
export function heureLocale(iso: string, fuseau: string): string | null {
  /* UNE HEURE DEJA LOCALE NE SE CONVERTIT PAS, ET C'EST LE DEFAUT QU'ON
     VIENT DE CORRIGER. Resident Advisor rend « 2026-09-13T22:00:00.000 »,
     sans Z : c'est 22 h A LA SALLE. `new Date` la lisait comme 22 h chez le
     visiteur, puis on la convertissait vers le fuseau du lieu : une soiree
     berlinoise de 22 h s'affichait « 04 h 00 » depuis Montreal. Mesure faite
     a l'ecran avant correction.

     On lit donc l'heure au mur, telle qu'elle est ecrite. La conversion ne
     sert qu'aux horodatages qui portent vraiment un fuseau. */
  if (estSansFuseau(iso)) return heureAuMur(iso);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('fr-CA', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: fuseau,
    }).format(d);
  } catch {
    /* Fuseau inconnu du navigateur : on rend null plutot qu'une heure fausse
       dans le fuseau du visiteur, qui serait indistinguable de la bonne. */
    return null;
  }
}

/** L'abreviation du fuseau, « HAE », « CEST ». Affichee SEULEMENT quand la
    ville consultee n'est pas celle ou l'on est : sinon elle repete une
    evidence a chaque ligne. */
export function sigleFuseau(iso: string, fuseau: string): string | null {
  /* L'heure affichee est celle de la salle : le sigle doit donc etre celui du
     LIEU, quel que soit l'instant. On prend un instant quelconque du bon jour
     pour que l'heure d'ete soit juste, et c'est tout ce dont Intl a besoin. */
  const d = estSansFuseau(iso) ? new Date(`${iso.slice(0, 10)}T12:00:00Z`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const parties = new Intl.DateTimeFormat('fr-CA', {
      timeZone: fuseau,
      timeZoneName: 'short',
    }).formatToParts(d);
    return parties.find((p) => p.type === 'timeZoneName')?.value ?? null;
  } catch {
    return null;
  }
}
