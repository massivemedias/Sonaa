/* LA MISE EN AVANT PAYANTE D'UNE SOIREE, cote passerelle. Voir
 * docs/adr/ADR-109-mise-en-avant-payante.md et src/lib/stripe-session.ts.
 *
 * Trois routes publiques, avant le mur d'authentification :
 *
 *   GET  api/mise-en-avant/devis?quand=<iso>  le prix et la fin, et si le
 *        paiement en ligne est branche ;
 *   POST api/mise-en-avant/demande            la demande d'un organisateur,
 *        ecrite en base, un courriel a Mika, et l'adresse du paiement Stripe
 *        quand la cle est posee ;
 *   POST api/mise-en-avant/confirmer          le retour du paiement : la
 *        passerelle demande a Stripe si la session est payee, et seulement
 *        alors la soiree passe en tete.
 *
 * SANS CLE STRIPE, RIEN NE CASSE. La demande est ecrite et Mika la recoit
 * par courriel, avec l'adresse de l'organisateur en reponse : il peut se
 * faire payer autrement et activer la mise en avant depuis l'admin (bouton
 * « Offrir »). Le jour ou `STRIPE_SECRET_KEY` est posee, le meme formulaire
 * mene au paiement, sans redeployer le site.
 *
 * L'ECRITURE PASSE PAR LE SECRET DE LA MESURE (STATS_SECRET), le seul que
 * la base sait reconnaitre : voir la migration 20261027200000. */

import { corpsDeSession, lireDemandeMise, lireSession, sessionValide, type DemandeMise } from '../../src/lib/stripe-session.ts';

export interface EnvMise {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY?: string;
  readonly STATS_SECRET?: string;
  /** La cle secrete Stripe de Mika, posee par `wrangler secret put
      STRIPE_SECRET_KEY`. Absente, le paiement en ligne est simplement
      eteint. */
  readonly STRIPE_SECRET_KEY?: string;
  readonly EMAIL?: {
    send: (m: { to: string; from: { email: string; name: string }; replyTo?: string; subject: string; text: string }) => Promise<unknown>;
  };
}

export interface Reponse {
  readonly statut: number;
  readonly corps: unknown;
}

const MIKA = 'massivemedias@gmail.com';
const DE = { email: 'bonjour@sonaa.ca', name: 'SONAA' };
const STRIPE = 'https://api.stripe.com/v1';

async function rpc<T>(env: EnvMise, fonction: string, args: Record<string, unknown>): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  if (!env.SUPABASE_ANON_KEY) return { ok: false, message: 'base non configuree' };
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fonction}`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(args),
    });
    const corps = (await r.json().catch(() => null)) as unknown;
    if (!r.ok) return { ok: false, message: String((corps as { message?: unknown } | null)?.message ?? r.status) };
    return { ok: true, data: corps as T };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

/** Un courriel qui ne part pas ne fait jamais echouer la demande : elle est
    deja en base, et l'admin la montre. */
async function ecrire(env: EnvMise, to: string, subject: string, text: string, replyTo?: string): Promise<void> {
  if (!env.EMAIL) return;
  try {
    await env.EMAIL.send({ to, from: DE, subject: subject.replace(/[\r\n]+/g, ' ').slice(0, 200), text: text.slice(0, 5000), ...(replyTo ? { replyTo } : {}) });
  } catch (e) {
    /* L'envoi peut refuser une adresse : on le note pour `wrangler tail`,
       et rien de plus. */
    console.error('courriel de mise en avant refuse', e instanceof Error ? e.message : String(e));
  }
}

const dollars = (cents: number): string => `${(cents / 100).toFixed(2).replace('.', ',')} $`;
const jourDe = (iso: string, langue: 'fr' | 'en' = 'fr'): string =>
  new Intl.DateTimeFormat(langue === 'en' ? 'en-CA' : 'fr-CA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Toronto' }).format(new Date(iso));

interface Devis {
  readonly jours: number;
  readonly montant: number;
  readonly fin: string;
}

export async function devis(env: EnvMise, quand: string | null): Promise<Reponse> {
  if (!quand || !Number.isFinite(Date.parse(quand))) return { statut: 400, corps: { erreur: 'quand est obligatoire' } };
  const r = await rpc<Devis[]>(env, 'devis_mise_en_avant', { quand });
  if (!r.ok) return { statut: 502, corps: { erreur: r.message } };
  return { statut: 200, corps: { devis: r.data[0] ?? null, paiement: Boolean(env.STRIPE_SECRET_KEY) } };
}

async function ouvrirSession(env: EnvMise, d: DemandeMise, mise: { id: string; montant: number }): Promise<string | null> {
  if (!env.STRIPE_SECRET_KEY || mise.montant <= 0) return null;
  try {
    const corps = corpsDeSession({ id: mise.id, montant: mise.montant, titre: d.titre, ville: d.ville, courriel: d.courriel, langue: d.langue });
    const r = await fetch(`${STRIPE}/checkout/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `mise-${mise.id}` },
      body: corps.toString(),
    });
    const s = (await r.json().catch(() => null)) as { id?: unknown; url?: unknown } | null;
    if (!r.ok || !s || !sessionValide(s.id) || typeof s.url !== 'string') return null;
    await rpc(env, 'noter_session_mise_en_avant', { secret: env.STATS_SECRET, mise: mise.id, session: s.id });
    return s.url;
  } catch {
    return null;
  }
}

export async function demande(env: EnvMise, ctx: ExecutionContext, brut: unknown): Promise<Reponse> {
  if (!env.STATS_SECRET) return { statut: 503, corps: { erreur: 'passerelle non configuree' } };
  const d = lireDemandeMise(brut);
  if (!d) return { statut: 400, corps: { erreur: 'demande illisible' } };
  const r = await rpc<{ id: string; jours: number; montant: number; fin: string }[]>(env, 'demander_mise_en_avant', {
    secret: env.STATS_SECRET,
    soiree_id: d.soiree_id,
    ville: d.ville,
    titre: d.titre,
    quand: d.quand,
    nom: d.nom,
    courriel: d.courriel,
    message: d.message,
    langue: d.langue,
  });
  if (!r.ok) {
    if (/trop de demandes/.test(r.message)) return { statut: 429, corps: { erreur: 'trop de demandes' } };
    if (/soiree passee/.test(r.message)) return { statut: 400, corps: { erreur: 'soiree passee' } };
    return { statut: 502, corps: { erreur: r.message } };
  }
  const mise = r.data[0];
  if (!mise) return { statut: 502, corps: { erreur: 'demande non ecrite' } };
  const url = await ouvrirSession(env, d, mise);
  const lignes = [
    `Soirée : ${d.titre}`,
    `Ville : ${d.ville}, le ${jourDe(d.quand)}`,
    `Identifiant : ${d.soiree_id}`,
    `Organisateur : ${d.nom} <${d.courriel}>`,
  ];
  if (d.message) lignes.push(`Message : ${d.message}`);
  lignes.push(
    '',
    `Prix : ${dollars(mise.montant)} pour ${mise.jours} jour(s), jusqu'au ${jourDe(mise.fin)}.`,
    url
      ? "Le paiement Stripe est ouvert : la soirée passera en tête dès qu'il sera réglé, un second courriel le dira."
      : 'Paiement en ligne pas encore branché : réponds à ce courriel pour te faire payer, puis active-la avec « Offrir » dans sonaa.ca/#/admin/mises.'
  );
  ctx.waitUntil(ecrire(env, MIKA, `Mise en avant demandée : ${d.titre}`, lignes.join('\n'), d.courriel));
  return { statut: 200, corps: url ? { url } : { recue: true } };
}

export async function confirmer(env: EnvMise, ctx: ExecutionContext, session: unknown): Promise<Reponse> {
  if (!env.STRIPE_SECRET_KEY || !env.STATS_SECRET) return { statut: 503, corps: { erreur: 'paiement non configure' } };
  if (!sessionValide(session)) return { statut: 400, corps: { erreur: 'session illisible' } };
  let lue = null;
  try {
    const r = await fetch(`${STRIPE}/checkout/sessions/${session}`, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
    lue = r.ok ? lireSession(await r.json()) : null;
  } catch {
    lue = null;
  }
  if (!lue) return { statut: 502, corps: { erreur: 'Stripe ne repond pas' } };
  if (!lue.payee) return { statut: 200, corps: { payee: false } };
  const r = await rpc<{ id: string; titre: string; ville: string; montant: number; nom: string; courriel: string; fin: string; langue: 'fr' | 'en' }[]>(env, 'payer_mise_en_avant', {
    secret: env.STATS_SECRET,
    session: lue.session,
    paye: lue.montant,
  });
  if (!r.ok) return { statut: 502, corps: { erreur: r.message } };
  /* Une ligne seulement la premiere fois : on n'ecrit qu'une fois. */
  const m = r.data[0];
  if (m) {
    ctx.waitUntil(
      Promise.all([
        ecrire(env, MIKA, `Mise en avant payée : ${m.titre} (${dollars(m.montant)})`, `${m.nom} <${m.courriel}> a payé ${dollars(m.montant)}.\nLa soirée « ${m.titre} » est en tête du calendrier de ${m.ville} jusqu'au ${jourDe(m.fin)}.`, m.courriel),
        ecrire(
          env,
          m.courriel,
          m.langue === 'en' ? `SONAA: "${m.titre}" is now featured` : `SONAA : « ${m.titre} » est mise en avant`,
          m.langue === 'en'
            ? `Hello ${m.nom},\n\nThank you. "${m.titre}" is at the top of the SONAA calendar until ${jourDe(m.fin, 'en')}: in the list, in the home banner and on the map.\n\nhttps://sonaa.ca/soirees/${m.ville}/\n\nAny question: simply reply to this email.\n\nSONAA`
            : `Bonjour ${m.nom},\n\nMerci. « ${m.titre} » est en tête du calendrier de SONAA jusqu'au ${jourDe(m.fin)} : dans la liste, dans la bannière d'accueil et sur la carte.\n\nhttps://sonaa.ca/soirees/${m.ville}/\n\nUne question : répondez simplement à ce courriel.\n\nSONAA`,
          MIKA
        ),
      ])
    );
  }
  return { statut: 200, corps: { payee: true } };
}
