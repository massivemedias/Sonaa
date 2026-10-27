/* LE PAIEMENT D'UNE MISE EN AVANT, CHEZ STRIPE. Voir
 * docs/adr/ADR-109-mise-en-avant-payante.md.
 *
 * Des fonctions pures, partagees par la passerelle (worker/src/index.ts) et
 * testees ici : lire la demande d'un organisateur, ecrire la session de
 * paiement a ouvrir chez Stripe, et lire ce que Stripe en dit ensuite.
 *
 * PAS DE WEBHOOK, ET C'EST VOULU. Au retour du paiement, la page renvoie a
 * la passerelle l'identifiant de session que Stripe a mis dans l'adresse ;
 * la passerelle demande alors a Stripe, avec sa propre cle, si cette session
 * est payee. Personne ne peut donc activer une mise en avant en inventant un
 * identifiant, et il n'y a qu'un secret a poser, la cle Stripe. Si quelqu'un
 * paie puis ferme l'onglet avant le retour, la moderation a un bouton qui
 * fait la meme verification. */

export interface DemandeMise {
  readonly soiree_id: string;
  readonly ville: string;
  readonly titre: string;
  /** Le debut de la soiree, en ISO. */
  readonly quand: string;
  readonly nom: string;
  readonly courriel: string;
  readonly message: string | null;
  readonly langue: 'fr' | 'en';
}

const COURRIEL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const VILLE = /^[a-z0-9-]{2,60}$/;

function texte(x: unknown, max: number): string | null {
  if (typeof x !== 'string') return null;
  const t = x.trim().replace(/\s+/g, ' ');
  return t.length > 0 && t.length <= max ? t : null;
}

/** La demande lue et bornee, ou null si un champ manque ou deborde. */
export function lireDemandeMise(brut: unknown): DemandeMise | null {
  if (!brut || typeof brut !== 'object') return null;
  const o = brut as Record<string, unknown>;
  const soiree_id = texte(o['soiree_id'], 120);
  const ville = texte(o['ville'], 60);
  const titre = texte(o['titre'], 200);
  const quand = texte(o['quand'], 40);
  const nom = texte(o['nom'], 120);
  const courriel = texte(o['courriel'], 200)?.toLowerCase() ?? null;
  if (!soiree_id || !ville || !VILLE.test(ville) || !titre || !quand || !nom || !courriel || !COURRIEL.test(courriel)) return null;
  if (!Number.isFinite(Date.parse(quand))) return null;
  /* Le message garde ses retours a la ligne : c'est un mot pour Mika. */
  const message = typeof o['message'] === 'string' && o['message'].trim() ? o['message'].trim().slice(0, 1000) : null;
  return { soiree_id, ville, titre, quand, nom, courriel, message, langue: o['langue'] === 'en' ? 'en' : 'fr' };
}

export interface MiseAPayer {
  readonly id: string;
  /** En cents canadiens. */
  readonly montant: number;
  readonly titre: string;
  readonly ville: string;
  readonly courriel: string;
  readonly langue: 'fr' | 'en';
}

/** Le corps de POST /v1/checkout/sessions. Le retour se fait sur la page de
    la ville, qui lit `mise` dans l'adresse et demande la verification. */
export function corpsDeSession(m: MiseAPayer, site = 'https://sonaa.ca'): URLSearchParams {
  const page = `${site}/soirees/${m.ville}/`;
  const nom = m.langue === 'en' ? `SONAA featured listing: ${m.titre}` : `Mise en avant sur SONAA : ${m.titre}`;
  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('line_items[0][quantity]', '1');
  p.set('line_items[0][price_data][currency]', 'cad');
  p.set('line_items[0][price_data][unit_amount]', String(m.montant));
  p.set('line_items[0][price_data][product_data][name]', nom.slice(0, 250));
  p.set('customer_email', m.courriel);
  p.set('client_reference_id', m.id);
  p.set('metadata[mise_id]', m.id);
  p.set('payment_intent_data[metadata][mise_id]', m.id);
  p.set('locale', m.langue);
  /* Stripe remplace {CHECKOUT_SESSION_ID} par l'identifiant de la session. */
  p.set('success_url', `${page}?mise={CHECKOUT_SESSION_ID}`);
  p.set('cancel_url', page);
  return p;
}

/** Un identifiant de session Stripe, et rien d'autre : il entre dans une
    adresse de l'API. */
export function sessionValide(x: unknown): x is string {
  return typeof x === 'string' && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(x);
}

export interface SessionLue {
  readonly session: string;
  readonly payee: boolean;
  /** En cents, ce que Stripe a encaisse. */
  readonly montant: number;
}

/** La reponse de GET /v1/checkout/sessions/<id>. Payee veut dire payee en
    dollars canadiens : une autre devise ne compte pas. */
export function lireSession(brut: unknown): SessionLue | null {
  const o = brut as { id?: unknown; payment_status?: unknown; currency?: unknown; amount_total?: unknown } | null;
  if (!o || !sessionValide(o.id)) return null;
  const montant = typeof o.amount_total === 'number' && Number.isFinite(o.amount_total) ? o.amount_total : 0;
  return { session: o.id, payee: o.payment_status === 'paid' && o.currency === 'cad' && montant > 0, montant };
}
