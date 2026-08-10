/* Compter les propositions en attente, sans charger le client Supabase.

   POURQUOI CE DÉTOUR : la fiche de genre affiche « 3 propositions en attente ».
   Obtenir ce nombre par @supabase/supabase-js coûtait 222 ko de code à
   chaque ouverture de fiche, pour une requête qui tient en un fetch et dont
   la réponse est un seul entier. Le SDK apporte l'authentification, le
   renouvellement de jeton, le temps réel — rien de tout cela n'est utile
   pour lire un compteur public en lecture anonyme.

   PostgREST renvoie le total dans l'en-tête content-range quand on demande
   `count=exact` ; `Range: 0-0` évite de rapatrier les lignes elles-mêmes. */

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/** Nombre de propositions en attente, 0 si la base est injoignable.

    Un compteur qui échoue ne doit jamais abîmer une fiche de genre : toute
    erreur se traduit par « rien à signaler », ce qui est aussi la vérité
    quand on ne peut pas demander. */
export async function compterEnAttenteLeger(genreId?: string): Promise<number> {
  if (!url || !key) return 0;

  const parametres = new URLSearchParams({ select: 'id', status: 'eq.pending' });
  if (genreId) parametres.set('genre_id', `eq.${genreId}`);

  try {
    const reponse = await fetch(`${url}/rest/v1/proposals_public?${parametres}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'count=exact',
        Range: '0-0',
      },
    });
    if (!reponse.ok) return 0;
    // Format attendu : « 0-0/12 », ou « */12 » quand la plage est vide.
    const total = reponse.headers.get('content-range')?.split('/')[1];
    const n = Number(total);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
