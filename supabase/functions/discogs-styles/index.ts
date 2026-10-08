/* LES STYLES D'UN MORCEAU RECONNU, CHEZ DISCOGS.
 *
 * Mika, le 8 octobre 2026 : « ça marche bien pour reconnaître une track, par
 * contre le style de cette track, ça ne fonctionne pas du tout ». Le style
 * venait d'Apple Music (« Dance », « Electronic » : trop large) et des
 * etiquettes Last.fm (rares et bruitees sur la musique de club). Discogs
 * range chaque sortie dans des styles precis (Deep House, Tech House, Indie
 * Dance...), et c'est sa taxonomie que l'atlas de SONAA et le modele de
 * style du navigateur parlent deja.
 *
 * POURQUOI ICI ET PAS DANS LE WORKER. Discogs refuse les adresses de
 * Cloudflare (le Worker sonaa-sets recoit un refus). Cette fonction tourne
 * chez Supabase ; le Worker l'appelle quand AudD a reconnu un morceau
 * (worker/src/index.ts, completerParEtiquettes).
 *
 * CE QU'ELLE FAIT. Une recherche de sorties qui contiennent ce titre, de cet
 * artiste ; chaque sortie vote pour ses styles, les premieres comptent plus.
 * Si rien ne sort, une seconde recherche avec le titre nettoye (sans
 * « Original Mix », « Extended Mix », « feat. »). Elle rend les styles et
 * leur poids, et le nombre de sorties lues ; jamais rien d'autre.
 *
 * LE JETON. DISCOGS_TOKEN, un secret de la fonction (tableau de bord
 * Supabase, Edge Functions, Secrets) ; jamais dans le depot. ?probe=1
 * verifie seulement que Discogs repond d'ici, sans jeton. */

const UA = 'SONAA/1.0 +https://sonaa.ca';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' } });

interface Sortie {
  style?: string[];
  genre?: string[];
}

/** Le titre sans ce qui n'est pas le titre : la version, l'invite. */
export function titreNettoye(t: string): string {
  return t
    .replace(/\((original|extended|radio|club)( mix| edit| version)?\)/gi, '')
    .replace(/\s+-\s+(original|extended|radio|club)( mix| edit| version)?$/i, '')
    .replace(/\s*[([]?(feat\.?|ft\.?|featuring)\s[^)\]]*[)\]]?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** L'artiste principal : avant « & », « , », « feat. », « x ». */
export function artistePrincipal(a: string): string {
  return a.split(/\s+(?:&|feat\.?|ft\.?|featuring|x|vs\.?)\s+|,\s*/i)[0].trim();
}

async function chercher(token: string, artist: string, track: string): Promise<Sortie[]> {
  const q = new URLSearchParams({ type: 'release', artist, track, per_page: '15' });
  const r = await fetch(`https://api.discogs.com/database/search?${q}`, {
    headers: { 'user-agent': UA, authorization: `Discogs token=${token}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw new Error(`discogs ${r.status}`);
  const j = (await r.json()) as { results?: Sortie[] };
  return j.results ?? [];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const url = new URL(req.url);
  if (url.searchParams.get('probe') === '1') {
    const r = await fetch('https://api.discogs.com/', { headers: { 'user-agent': UA } }).catch(() => null);
    return json({ discogs: r ? r.status : 0 });
  }
  const artist = (url.searchParams.get('artist') ?? '').trim().slice(0, 120);
  const track = (url.searchParams.get('track') ?? '').trim().slice(0, 160);
  if (!artist || !track) return json({ error: 'artist et track sont requis' }, 400);
  const token = Deno.env.get('DISCOGS_TOKEN');
  if (!token) return json({ error: 'DISCOGS_TOKEN absent' }, 503);
  try {
    let sorties = await chercher(token, artistePrincipal(artist), track);
    const propre = titreNettoye(track);
    if (sorties.length === 0 && propre && propre !== track) sorties = await chercher(token, artistePrincipal(artist), propre);
    // Chaque sortie vote pour ses styles ; la premiere compte le plus
    const poids = new Map<string, number>();
    sorties.slice(0, 12).forEach((s, i) => {
      const w = 1 / (1 + i * 0.35);
      for (const st of s.style ?? []) poids.set(st, (poids.get(st) ?? 0) + w);
    });
    const total = [...poids.values()].reduce((a, b) => a + b, 0) || 1;
    const styles = [...poids.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([nom, p]) => ({ nom, part: Math.round((p / total) * 100) / 100 }));
    return json({ styles, sorties: sorties.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'discogs muet' }, 502);
  }
});
