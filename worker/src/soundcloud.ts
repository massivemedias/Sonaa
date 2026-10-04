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

async function api(env: EnvSoundcloud, chemin: string, utilisateur?: string): Promise<Response> {
  const t = utilisateur ?? (await jeton(env));
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
  sharing?: string;
  user?: { urn?: string; id?: number; username?: string; permalink_url?: string; permalink?: string };
}

/** Le morceau appartient-il au compte connecte (urn de l'auteur) ? */
const deLui = (b: Brut, proprietaire?: string): boolean =>
  !!proprietaire && (b.user?.urn === proprietaire || (b.user?.id !== undefined && `soundcloud:users:${b.user.id}` === proprietaire));

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

/**
 * Un morceau qu'on a le droit de passer sur une platine : une licence de
 * remix, ou le compte de Maudite Machine, ou (proprietaire) le compte de la
 * personne connectee, qui consent pour ses propres morceaux. Les morceaux
 * prives demandent un jeton secret que l'API ne rend pas toujours : on s'en
 * tient aux morceaux publics.
 */
function versMorceau(b: Brut, proprietaire?: string): MorceauSoundcloud | null {
  if (!b.urn || !b.title) return null;
  const lui = deLui(b, proprietaire);
  if (!lui && !deMm(b) && (!b.license || !LICENCES_REMIX.has(b.license))) return null;
  if (b.streamable === false || (b.access && b.access !== 'playable')) return null;
  if (b.sharing === 'private') return null;
  const d = b.duration ?? 0;
  if (d < DUREE.min || d > DUREE.max) return null;
  return {
    id: b.urn,
    title: b.title,
    artist: b.user?.username ?? '',
    bpm: typeof b.bpm === 'number' && b.bpm > 0 ? Math.round(b.bpm * 10) / 10 : null,
    key: b.key_signature || null,
    duration: d / 1000,
    license: lui ? 'mine' : deMm(b) ? 'mauditemachine' : (b.license ?? ''),
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
export async function flux(env: EnvSoundcloud, urn: string, qui?: Seance | null): Promise<{ format: 'mp3' | 'aac'; pieces: string[] }> {
  if (!/^soundcloud:tracks:\d{1,20}$/.test(urn)) throw new Error('urn invalide');
  // Connecte : tout passe par son jeton, et ses propres morceaux sont permis
  const u = qui?.a;
  const piste = await api(env, `/tracks/${encodeURIComponent(urn)}`, u);
  if (!piste.ok) throw new Error(`morceau introuvable (${piste.status})`);
  if (!versMorceau((await piste.json()) as Brut, qui?.urn)) throw new Error('licence sans remix');
  const r = await api(env, `/tracks/${encodeURIComponent(urn)}/streams`, u);
  if (!r.ok) throw new Error(`flux refuses (${r.status})`);
  const s = (await r.json()) as { hls_mp3_128_url?: string; hls_aac_160_url?: string };
  const format: 'mp3' | 'aac' = s.hls_mp3_128_url ? 'mp3' : 'aac';
  const liste = s.hls_mp3_128_url ?? s.hls_aac_160_url;
  if (!liste) throw new Error('aucun flux');
  const m = await api(env, liste, u);
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

/* --- Se connecter avec SoundCloud ------------------------------------------ */

/* Mika, le 4 octobre 2026 : « je veux que les gens puissent connecter leur
 * SoundCloud ». Une personne se connecte avec son compte SoundCloud, pas avec
 * un compte du site, et mixe SES morceaux : c'est elle qui consent a leur
 * modification. Les morceaux des autres restent soumis aux licences de remix.
 *
 * Flux « authorization code » avec PKCE. Le secret de l'application reste
 * ici : la page des Decks ouvre /connexion dans une fenetre, SoundCloud
 * revient sur /rappel, le Worker echange le code contre les jetons et les
 * garde dans le KV DEMANDES. La page ne recoit qu'un numero de seance
 * (32 octets au hasard) ; le KV ne connait que son empreinte SHA-256, si
 * bien qu'une lecture du KV ne donne pas de seance utilisable. Le numero
 * arrive dans le fragment de l'adresse (#s=...), que le navigateur n'envoie a
 * aucun serveur, sur une page de mauditemachine.com qui le range et se ferme
 * (public/soundcloud-connect.html du depot MauditeMachine). */

/** L'adresse de retour, a inscrire telle quelle dans l'application SoundCloud de Mika. */
export const RETOUR_OAUTH = 'https://sonaa-sets.massivemedias.workers.dev/api/soundcloud/rappel';
/** La page des Decks qui recoit le numero de seance. */
const PAGE_RETOUR = '/soundcloud-connect.html';
/** Une seance oubliee apres soixante jours sans servir. */
const VIE_SEANCE = 60 * 24 * 3600;

export interface Seance {
  /** le jeton d'acces de la personne */
  a: string;
  /** son jeton de renouvellement (il ne sert qu'une fois) */
  r: string;
  /** la fin du jeton d'acces, cinq minutes avant la vraie */
  fin: number;
  urn: string;
  nom: string;
}

const b64url = (b: ArrayBuffer | Uint8Array): string =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const hasard = (n: number): string => b64url(crypto.getRandomValues(new Uint8Array(n)));
const empreinte = async (s: string): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((x) => x.toString(16).padStart(2, '0')).join('');
const cleSeance = async (id: string): Promise<string> => `soundcloud:seance:${await empreinte(id)}`;

/** Un jeton de personne : le code de la connexion, ou le renouvellement. */
async function jetonPersonne(env: EnvSoundcloud, champs: Record<string, string>): Promise<Pick<Seance, 'a' | 'r' | 'fin'>> {
  const r = await fetch('https://secure.soundcloud.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json; charset=utf-8' },
    body: new URLSearchParams({ client_id: env.SOUNDCLOUD_CLIENT_ID ?? '', client_secret: env.SOUNDCLOUD_CLIENT_SECRET ?? '', ...champs }),
  });
  if (!r.ok) throw new Error(`jeton refuse (${r.status})`);
  const d = (await r.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!d.access_token) throw new Error('jeton absent');
  return { a: d.access_token, r: d.refresh_token ?? '', fin: Date.now() + Math.max(120, (d.expires_in ?? 3600) - 300) * 1000 };
}

/** Le depart : un etat et un verificateur PKCE gardes dix minutes, puis la page de SoundCloud. */
export async function connexion(env: EnvSoundcloud, origine: string): Promise<Response> {
  if (!env.SOUNDCLOUD_CLIENT_ID || !env.SOUNDCLOUD_CLIENT_SECRET || !env.DEMANDES) throw new PasConfigure('soundcloud non configure');
  const etat = hasard(24);
  const verif = hasard(48);
  const defi = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verif)));
  await env.DEMANDES.put(`soundcloud:etat:${etat}`, JSON.stringify({ v: verif, o: origine }), { expirationTtl: 600 });
  const p = new URLSearchParams({
    client_id: env.SOUNDCLOUD_CLIENT_ID,
    redirect_uri: RETOUR_OAUTH,
    response_type: 'code',
    code_challenge: defi,
    code_challenge_method: 'S256',
    state: etat,
    display: 'popup',
  });
  return Response.redirect(`https://secure.soundcloud.com/authorize?${p.toString()}`, 302);
}

/** Le retour de SoundCloud : le code devient une seance, la page des Decks recoit son numero. */
export async function rappel(env: EnvSoundcloud, url: URL): Promise<Response> {
  const etat = url.searchParams.get('state') ?? '';
  const cle = `soundcloud:etat:${etat}`;
  const garde = /^[A-Za-z0-9_-]{20,64}$/.test(etat) && env.DEMANDES ? ((await env.DEMANDES.get(cle, 'json')) as { v: string; o: string } | null) : null;
  if (!garde || !env.DEMANDES) {
    return new Response('Ce lien a expire. Recommence depuis les Decks de mauditemachine.com.', { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  await env.DEMANDES.delete(cle);
  const vers = (frag: Record<string, string>): Response => Response.redirect(`${garde.o}${PAGE_RETOUR}#${new URLSearchParams(frag).toString()}`, 302);
  const code = url.searchParams.get('code');
  if (!code) return vers({ e: 'refused' });
  try {
    const t = await jetonPersonne(env, { grant_type: 'authorization_code', redirect_uri: RETOUR_OAUTH, code_verifier: garde.v, code });
    const me = await fetch(`${API}/me`, { headers: { Authorization: `OAuth ${t.a}`, accept: 'application/json; charset=utf-8' } });
    if (!me.ok) throw new Error(`profil refuse (${me.status})`);
    const u = (await me.json()) as { urn?: string; username?: string };
    if (!u.urn) throw new Error('profil sans urn');
    const id = hasard(32);
    const s: Seance = { ...t, urn: u.urn, nom: u.username ?? '' };
    await env.DEMANDES.put(await cleSeance(id), JSON.stringify(s), { expirationTtl: VIE_SEANCE });
    return vers({ s: id, n: s.nom });
  } catch {
    return vers({ e: 'failed' });
  }
}

/**
 * La seance d'une requete (Authorization: Bearer <numero>), jeton renouvele
 * s'il arrive a sa fin ; null si elle n'existe pas ou plus.
 */
export async function seance(env: EnvSoundcloud, autorisation: string | null): Promise<Seance | null> {
  const id = /^Bearer ([A-Za-z0-9_-]{30,64})$/.exec(autorisation ?? '')?.[1];
  if (!id || !env.DEMANDES) return null;
  const cle = await cleSeance(id);
  const s = (await env.DEMANDES.get(cle, 'json')) as Seance | null;
  if (!s) return null;
  if (s.fin > Date.now()) return s;
  if (!s.r) return null;
  try {
    const t = await jetonPersonne(env, { grant_type: 'refresh_token', refresh_token: s.r });
    const neuve: Seance = { ...s, ...t, r: t.r || s.r };
    await env.DEMANDES.put(cle, JSON.stringify(neuve), { expirationTtl: VIE_SEANCE });
    return neuve;
  } catch {
    // Une requete voisine l'a peut-etre deja renouvelee (le jeton de renouvellement ne sert qu'une fois)
    const autre = (await env.DEMANDES.get(cle, 'json')) as Seance | null;
    return autre && autre.fin > Date.now() ? autre : null;
  }
}

/** Les morceaux publics du compte connecte. */
export async function mesMorceaux(env: EnvSoundcloud, s: Seance): Promise<MorceauSoundcloud[]> {
  let suivante: string | null = '/me/tracks?limit=200&linked_partitioning=true';
  const sortie: MorceauSoundcloud[] = [];
  for (let page = 0; page < 3 && suivante; page += 1) {
    const r = await api(env, suivante, s.a);
    if (!r.ok) throw new Error(`morceaux refuses (${r.status})`);
    const d = (await r.json()) as { collection?: Brut[]; next_href?: string | null } | Brut[];
    for (const b of Array.isArray(d) ? d : (d.collection ?? [])) {
      const m = versMorceau(b, s.urn);
      if (m) sortie.push(m);
    }
    suivante = Array.isArray(d) ? null : (d.next_href ?? null);
  }
  return sortie;
}

/** Se deconnecter : la seance s'efface ici, et SoundCloud oublie le jeton. */
export async function deconnexion(env: EnvSoundcloud, autorisation: string | null): Promise<void> {
  const id = /^Bearer ([A-Za-z0-9_-]{30,64})$/.exec(autorisation ?? '')?.[1];
  if (!id || !env.DEMANDES) return;
  const cle = await cleSeance(id);
  const s = (await env.DEMANDES.get(cle, 'json')) as Seance | null;
  await env.DEMANDES.delete(cle);
  if (s) {
    await fetch('https://secure.soundcloud.com/sign-out', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ access_token: s.a }),
    }).catch(() => undefined);
  }
}
