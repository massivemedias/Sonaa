/* LA MISE EN AVANT PAYANTE D'UNE SOIREE, cote page. Voir
 * docs/adr/ADR-109-mise-en-avant-payante.md.
 *
 * Mika, le 27 octobre 2026 : « je voudrais trouver quelque chose pour etre
 * remunere », puis le choix de faire payer les organisateurs. Une soiree
 * mise en avant passe en tete du calendrier de sa ville, dans la banniere
 * d'accueil et sur la carte, avec la mention « Mise en avant », jusqu'au
 * jour de la soiree.
 *
 * LA MENTION N'EST PAS UNE COQUETTERIE. Un visiteur qui lit un agenda a le
 * droit de savoir qu'une soiree est en tete parce qu'on a paye, comme il a
 * le droit de savoir de quelle source elle vient.
 *
 * La lecture passe par la base (une fonction qui ne rend que l'identifiant
 * des soirees et leur fin) ; la demande et le paiement passent par la
 * passerelle, qui seule detient la cle Stripe. */

import { supabase } from './supabase.ts';

const PASSERELLE = 'https://sonaa-sets.massivemedias.workers.dev';

/** Les soirees mises en avant d'une ville, en ce moment. Un ensemble vide si
    la base ne repond pas : le calendrier s'affiche alors comme avant. */
export async function misesEnAvant(ville: string): Promise<ReadonlySet<string>> {
  if (!supabase) return new Set();
  const { data, error } = await supabase.rpc('mises_en_avant_de', { ville });
  if (error || !Array.isArray(data)) return new Set();
  return new Set((data as { soiree_id: string }[]).map((x) => x.soiree_id));
}

/** Les soirees mises en avant d'abord, les autres ensuite, chacun des deux
    groupes dans l'ordre recu. */
export function enAvantDabord<T extends { readonly id: string }>(liste: readonly T[], vedettes: ReadonlySet<string>): T[] {
  if (vedettes.size === 0) return [...liste];
  return [...liste.filter((s) => vedettes.has(s.id)), ...liste.filter((s) => !vedettes.has(s.id))];
}

export interface Devis {
  readonly jours: number;
  /** En cents canadiens. */
  readonly montant: number;
  readonly fin: string;
}

/** Le prix et la fin pour une soiree qui commence a `quand`, et si le
    paiement en ligne est branche. `devis` est nul pour une soiree passee ;
    la fonction rend null si la passerelle ne repond pas. */
export async function devisMise(quand: string): Promise<{ devis: Devis | null; paiement: boolean } | null> {
  try {
    const r = await fetch(`${PASSERELLE}/api/mise-en-avant/devis?quand=${encodeURIComponent(quand)}`);
    if (!r.ok) return null;
    return (await r.json()) as { devis: Devis | null; paiement: boolean };
  } catch {
    return null;
  }
}

export interface DemandeMise {
  readonly soiree_id: string;
  readonly ville: string;
  readonly titre: string;
  readonly quand: string;
  readonly nom: string;
  readonly courriel: string;
  readonly message: string;
  readonly langue: 'fr' | 'en';
}

/** `url` : la page de paiement Stripe ou aller. `recue` : la demande est
    ecrite, Mika repond par courriel. Null en cas d'echec. */
export async function demanderMise(d: DemandeMise): Promise<{ url?: string; recue?: boolean } | null> {
  try {
    const r = await fetch(`${PASSERELLE}/api/mise-en-avant/demande`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(d),
    });
    if (!r.ok) return null;
    return (await r.json()) as { url?: string; recue?: boolean };
  } catch {
    return null;
  }
}

/** Demande a la passerelle de verifier chez Stripe qu'une session est
    payee. True si elle l'est, false si pas encore, null si on n'a pas pu
    demander. */
export async function confirmerMise(session: string): Promise<boolean | null> {
  try {
    const r = await fetch(`${PASSERELLE}/api/mise-en-avant/confirmer`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session }),
    });
    if (!r.ok) return null;
    return Boolean(((await r.json()) as { payee?: unknown }).payee);
  } catch {
    return null;
  }
}

/** L'identifiant de session que Stripe met dans l'adresse de retour
    (`?mise=cs_...`), ou null. */
export function sessionDeLAdresse(recherche: string): string | null {
  const s = new URLSearchParams(recherche).get('mise');
  return s && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(s) ? s : null;
}

/** « 18 $ », « 12,50 $ », « $18 » en anglais. */
export function prixLisible(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CAD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/* ═══ LA MODERATION ═══ Les deux fonctions sont gardees en base par
   is_moderator() : un compte qui ne l'est pas recoit une erreur. */

export interface MiseAdmin {
  readonly id: string;
  readonly cree: string;
  readonly soiree_id: string;
  readonly ville: string;
  readonly titre: string;
  readonly quand: string;
  readonly fin: string;
  readonly jours: number;
  readonly montant: number;
  readonly nom: string;
  readonly courriel: string;
  readonly message: string | null;
  readonly statut: 'demandee' | 'payee' | 'offerte' | 'retiree';
  readonly stripe_session: string | null;
  readonly payee: string | null;
}

export async function listerMises(): Promise<MiseAdmin[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('mises_en_avant_admin');
  if (error) throw new Error(error.message);
  return (data ?? []) as MiseAdmin[];
}

export async function reglerMise(mise: string, statut: 'offerte' | 'retiree'): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('regler_mise_en_avant', { mise, statut });
  if (error) throw new Error(error.message);
}
