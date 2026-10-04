/* LA PASSERELLE SOUNDCLOUD, pour les Decks de mauditemachine.com (MM-DECKS).
 *
 * Mika, le 4 octobre 2026 : « ce qu'il y a sur Audius c'est vraiment
 * pourri, est-ce que SoundCloud fonctionne ? », puis « oui branche
 * SoundCloud ». Le site des machines est statique : il ne peut pas cacher la
 * cle de l'application SoundCloud. Ce Worker la garde, obtient le jeton,
 * cherche les morceaux et ouvre leurs flux ; le navigateur ne voit jamais la
 * cle.
 *
 * ═══ CE QUE LES CONDITIONS PERMETTENT ═══
 *
 * Les conditions de l'API (section 3) interdisent de modifier un contenu
 * (adapter, monter, creer une oeuvre derivee), sauf si l'auteur l'a permis,
 * notamment par une licence Creative Commons qui autorise les oeuvres
 * derivees. Une platine change la vitesse, egalise, filtre et mixe : on ne
 * rend donc QUE ces licences-la (LICENCES_REMIX). Rien n'est garde (section
 * 5) : le son passe, il n'est ni stocke ni mis en cache. L'interface credite
 * l'auteur, SoundCloud, et renvoie a la page du morceau (section 8).
 *
 * ═══ LE JETON ═══
 *
 * Flux « client credentials » (secure.soundcloud.com/oauth/token, en
 * authentification Basic). Un jeton vit environ une heure, et SoundCloud
 * n'en accorde que 50 par 12 heures a une application : il est garde dans le
 * KV DEMANDES (cle soundcloud:jeton), partage par toutes les instances, et
 * redemande cinq minutes avant sa fin.
 *
 * ═══ LE SON ═══
 *
 * L'API rend des listes HLS (hls_mp3_128_url, hls_aac_160_url) qu'il faut
 * demander avec le jeton. Le Worker suit la liste MP3 jusqu'au CDN et rend
 * les adresses de ses morceaux de fichier ; le navigateur les telecharge et
 * les met bout a bout (du MP3 s'assemble tel quel). Si le CDN refuse le
 * navigateur, la route piece les fait passer par ici, une par requete : le
 * plan gratuit limite chaque requete a 50 sous-requetes. */

export interface EnvSoundcloud {
  readonly SOUNDCLOUD_CLIENT_ID?: string;
  readonly SOUNDCLOUD_CLIENT_SECRET?: string;
  readonly DEMANDES?: KVNamespace;
}

/**
 * LES MORCEAUX DE MAUDITE MACHINE (Mika, 4 octobre 2026 : « les gens
 * pourront mixer mes tracks »). Mika est l'auteur de ce compte et consent a
 * ce que ses morceaux passent sur les platines, quelle que soit leur licence
 * sur SoundCloud : c'est le consentement expres de l'auteur que demandent
 * les conditions (section 3).
 */
export const COMPTE_MM = 'mauditemachine';

/** Les licences qui autorisent les oeuvres derivees (et le domaine public). */
export const LICENCES_REMIX = new Set(['cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'no-rights-reserved']);
/** Un morceau, pas un set : une minute au moins, douze au plus (tout est decode en memoire). */
const DUREE = { min: 60_000, max: 12 * 60_000 } as const;
const API = 'https://api.soundcloud.com';
const CLE_JETON = 'soundcloud:jeton';
/** Les hotes ou vivent les morceaux de fichier : la route piece ne relaie qu'eux. */
const HOTES_CDN = /(^|\.)(sndcdn\.com|soundcloud\.com|soundcloud\.cloud)$/;

export class PasConfigure extends Error {}

/* --- Le jeton ------------------------------------------------------------- */

let enMemoire: { t: string; fin: number } | null = null;

async function jeton(env: EnvSoundcloud): Promise<string> {
  const id = env.SOUNDCLOUD_CLIENT_ID;
  const secret = env.SOUNDCLOUD_CLIENT_SECRET;
  if (!id || !secret) throw new PasConfigure('soundcloud non configure');
  const maintenant = Date.now();
  if (enMemoire && enMemoire.fin > maintenant) return enMemoire.t;
  const garde = env.DEMANDES ? ((await env.DEMANDES.get(CLE_JETON, 'json')) as { t: string; fin: number } | null) : null;
  if (garde && garde.fin > maintenant) {
    enMemoire = garde;
    return garde.t;
  }
  const r = await fetch('https://secure.soundcloud.com/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json; charset=utf-8',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error(`jeton SoundCloud refuse (${r.status})`);
  const d = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!d.access_token) throw new Error('jeton SoundCloud absent');
  const vie = Math.max(120, (d.expires_in ?? 3600) - 300);
  enMemoire = { t: d.access_token, fin: maintenant + vie * 1000 };
  if (env.DEMANDES) await env.DEMANDES.put(CLE_JETON, JSON.stringify(enMemoire), { expirationTtl: vie });
  return enMemoire.t;
}

async function api(env: EnvSoundcloud, chemin: string): Promise<Response> {
  const t = await jeton(env);
  return fetch(chemin.startsWith('http') ? chemin : `${API}${chemin}`, {
    headers: { Authorization: `OAuth ${t}`, accept: 'application/json; charset=utf-8' },
  });
}

/* --- La recherche ---------------------------------------------------------- */

interface Brut {
  urn?: string;
  title?: string;
  duration?: number;
  bpm?: number | null;
  key_signature?: string | null;
  license?: string;
  access?: string | null;
  streamable?: boolean;
  permalink_url?: string;
  artwork_url?: string | null;
  genre?: string | null;
  user?: { username?: string; permalink_url?: string; permalink?: string };
}

const deMm = (b: Brut): boolean => b.user?.permalink === COMPTE_MM || (b.user?.permalink_url ?? '').toLowerCase().endsWith(`/${COMPTE_MM}`);

export interface MorceauSoundcloud {
  id: string;
  title: string;
  artist: string;
  bpm: number | null;
  key: string | null;
  duration: number;
  license: string;
  link: string;
  artistLink: string | null;
  genre: string;
}

function versMorceau(b: Brut): MorceauSoundcloud | null {
  if (!b.urn || !b.title) return null;
  if (!deMm(b) && (!b.license || !LICENCES_REMIX.has(b.license))) return null;
  if (b.streamable === false || (b.access && b.access !== 'playable')) return null;
  const d = b.duration ?? 0;
  if (d < DUREE.min || d > DUREE.max) return null;
  return {
    id: b.urn,
    title: b.title,
    artist: b.user?.username ?? '',
    bpm: typeof b.bpm === 'number' && b.bpm > 0 ? Math.round(b.bpm * 10) / 10 : null,
    key: b.key_signature || null,
    duration: d / 1000,
    license: deMm(b) ? 'mauditemachine' : (b.license ?? ''),
    link: b.permalink_url ?? '',
    artistLink: b.user?.permalink_url ?? null,
    genre: b.genre ?? '',
  };
}

/**
 * Cherche, puis ne garde que les licences qui autorisent le remix. La
 * recherche de SoundCloud n'a pas de filtre de licence : on lit jusqu'a
 * trois pages de 200 pour en rendre une trentaine.
 */
export async function chercher(env: EnvSoundcloud, q: string): Promise<MorceauSoundcloud[]> {
  const p = new URLSearchParams({ access: 'playable', limit: '200', linked_partitioning: 'true' });
  if (q) p.set('q', q);
  else p.set('genres', 'House,Deep House,Tech House,Techno,Electronic,Disco,Drum & Bass');
  let suivante: string | null = `/tracks?${p.toString()}`;
  const vus = new Set<string>();
  const sortie: MorceauSoundcloud[] = [];
  for (let page = 0; page < 3 && suivante && sortie.length < 30; page += 1) {
    const r = await api(env, suivante);
    if (!r.ok) break;
    const d = (await r.json()) as { collection?: Brut[]; next_href?: string | null } | Brut[];
    const liste = Array.isArray(d) ? d : (d.collection ?? []);
    for (const b of liste) {
      const m = versMorceau(b);
      if (m && !vus.has(m.id)) {
        vus.add(m.id);
        sortie.push(m);
      }
    }
    suivante = Array.isArray(d) ? null : (d.next_href ?? null);
  }
  return sortie;
}

/** Les morceaux du compte de Maudite Machine (une heure de cache au Worker). */
export async function morceauxMm(env: EnvSoundcloud): Promise<MorceauSoundcloud[]> {
  const r = await api(env, `/resolve?url=${encodeURIComponent(`https://soundcloud.com/${COMPTE_MM}`)}`);
  if (!r.ok) throw new Error(`compte introuvable (${r.status})`);
  const u = (await r.json()) as { urn?: string };
  if (!u.urn) throw new Error('compte introuvable');
  let suivante: string | null = `/users/${encodeURIComponent(u.urn)}/tracks?access=playable&limit=200&linked_partitioning=true`;
  const sortie: MorceauSoundcloud[] = [];
  for (let page = 0; page < 3 && suivante; page += 1) {
    const p = await api(env, suivante);
    if (!p.ok) break;
    const d = (await p.json()) as { collection?: Brut[]; next_href?: string | null } | Brut[];
    for (const b of Array.isArray(d) ? d : (d.collection ?? [])) {
      const m = versMorceau(b);
      if (m) sortie.push(m);
    }
    suivante = Array.isArray(d) ? null : (d.next_href ?? null);
  }
  return sortie;
}

/* --- Le son ---------------------------------------------------------------- */

/**
 * Les morceaux de fichier d'un titre : on demande ses flux, on suit la liste
 * MP3 (sinon AAC) jusqu'au CDN, et on rend les adresses absolues de ses
 * morceaux, dans l'ordre. Le titre doit avoir une licence de remix : on le
 * reverifie ici, l'adresse pourrait etre forgee.
 */
export async function flux(env: EnvSoundcloud, urn: string): Promise<{ format: 'mp3' | 'aac'; pieces: string[] }> {
  if (!/^soundcloud:tracks:\d{1,20}$/.test(urn)) throw new Error('urn invalide');
  const piste = await api(env, `/tracks/${encodeURIComponent(urn)}`);
  if (!piste.ok) throw new Error(`morceau introuvable (${piste.status})`);
  if (!versMorceau((await piste.json()) as Brut)) throw new Error('licence sans remix');
  const r = await api(env, `/tracks/${encodeURIComponent(urn)}/streams`);
  if (!r.ok) throw new Error(`flux refuses (${r.status})`);
  const s = (await r.json()) as { hls_mp3_128_url?: string; hls_aac_160_url?: string };
  const format: 'mp3' | 'aac' = s.hls_mp3_128_url ? 'mp3' : 'aac';
  const liste = s.hls_mp3_128_url ?? s.hls_aac_160_url;
  if (!liste) throw new Error('aucun flux');
  const m = await api(env, liste);
  if (!m.ok) throw new Error(`liste refusee (${m.status})`);
  const base = m.url;
  const texte = await m.text();
  const pieces = texte
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => new URL(l, base).toString());
  if (pieces.length === 0) throw new Error('liste vide');
  return { format, pieces };
}

/** Relaie un morceau de fichier du CDN de SoundCloud (le navigateur n'y a pas acces), sans le garder. */
export async function piece(adresse: string): Promise<Response> {
  let u: URL;
  try {
    u = new URL(adresse);
  } catch {
    return new Response('adresse invalide', { status: 400 });
  }
  if (u.protocol !== 'https:' || !HOTES_CDN.test(u.hostname)) return new Response('hote refuse', { status: 403 });
  const r = await fetch(u.toString());
  return new Response(r.body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') ?? 'audio/mpeg', 'cache-control': 'no-store' } });
}
