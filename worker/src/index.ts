/* LA PASSERELLE DEVANT R2.

   ═══ POURQUOI ELLE EXISTE ═══

   R2 ne sait pas qui est connecte. Sans passerelle, il faudrait donner au
   navigateur une cle d'ecriture sur le bucket, c'est-a-dire la publier. Ce
   Worker verifie le jeton Supabase, refuse tout chemin qui sort du dossier de
   son porteur, et ne fait rien d'autre.

   ═══ POURQUOI L'ENVOI EST DECOUPE EN PARTIES ═══

   MESURE, PAS SUPPOSITION. Le plan Cloudflare gratuit refuse toute requete
   dont le corps depasse 100 Mo. Or c'est precisement ce chantier qui existe
   pour accepter des sets sans perte, et un set d'une heure en FLAC pese 300 a
   600 Mo. Un envoi d'un seul tenant etait donc impossible des le depart.

   R2 sait assembler un objet a partir de morceaux. Le navigateur decoupe donc
   le fichier en tranches de 40 Mo, les envoie une par une, et demande
   l'assemblage a la fin. Trois avantages, et le troisieme n'est pas le
   moindre : on passe sous la limite, une tranche perdue se rejoue sans tout
   recommencer, et on peut enfin afficher une progression honnete sur un
   envoi qui dure plusieurs minutes.

   ═══ CE QUI EST VERIFIE, ET CE QUI NE L'EST PAS ═══

   Le jeton est verifie CRYPTOGRAPHIQUEMENT contre les cles publiques du
   projet Supabase, pas seulement decode. Decoder un jeton sans verifier sa
   signature revient a croire n'importe qui sur parole : il suffirait de
   fabriquer un jeton disant « je suis untel » pour ecrire dans son dossier.

   Ce Worker ne consulte PAS la base. Il ne sait pas si un set existe, s'il
   est publie, ni a qui il appartient : cela reste dans Postgres, avec ses
   politiques. Sa seule question est « ce jeton est-il valide, et ce chemin
   commence-t-il par l'identifiant qu'il porte ». */

import { ZONES } from './zones.ts';
import { soirees, toutesLesSoirees } from './agenda.ts';

interface Env {
  readonly SETS: R2Bucket;
  readonly SUPABASE_URL: string;
  /** La cle publique du projet, celle du navigateur : elle sert a demander a
      la base si le porteur d'un jeton est moderateur. Pas un secret. */
  readonly SUPABASE_ANON_KEY?: string;
  readonly ORIGINES: string;
  /** Le jeton Discogs, pose par `wrangler secret put DISCOGS_TOKEN`. Jamais
      dans le navigateur : c'est toute la raison de la route api/artiste. */
  readonly DISCOGS_TOKEN?: string;
  /** La cle Last.fm, second avis quand Discogs refuse. */
  readonly LASTFM_API_KEY?: string;
  /** Les noms qu'aucune source n'a resolus, pour la moisson du lendemain. */
  readonly DEMANDES?: KVNamespace;
}

const aplatirNom = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/* ═══ UN ARTISTE, SES STYLES, EN DIRECT CHEZ DISCOGS ═══

   L'index embarque par le site connait 9 334 artistes : ceux qui figurent
   dans un classement Last.fm. Un artiste local a trois sorties n'y est pas,
   et c'est precisement lui que Mika veut trouver (Lealtica, Maudite
   Machine, FM Radio Gods). Discogs le connait, avec les styles de chacun de
   ses disques : on lui demande, ici, avec le jeton que le navigateur ne doit
   pas voir, et on garde la reponse un jour.

   CE QUI EST RENDU : le nom tel que Discogs l'ecrit, et le compte de ses
   sorties par style Discogs (« Tech House » : 3). Le rangement dans le
   vocabulaire de SONAA se fait cote site, avec la meme table que la moisson
   (src/lib/correspondance-styles.ts) : une seule regle, lue des deux cotes. */
const DISCOGS = 'https://api.discogs.com';
const AGENT_DISCOGS = 'SONAA/1.0 +https://sonaa.ca';

async function discogs(chemin: string, env: Env): Promise<unknown> {
  /* LE JETON VA DANS L'ADRESSE ET DANS L'EN-TETE. Depuis le Worker, l'en-tete
     seul laissait Discogs compter les requetes comme anonymes, par adresse
     IP, et les adresses de sortie de Cloudflare sont partagees par tout le
     monde : « too quickly » des la premiere. Discogs accepte aussi `token=`
     dans l'adresse ; on envoie les deux. */
  const sep = chemin.includes('?') ? '&' : '?';
  const r = await fetch(`${DISCOGS}${chemin}${env.DISCOGS_TOKEN ? `${sep}token=${encodeURIComponent(env.DISCOGS_TOKEN)}` : ''}`, {
    headers: {
      'User-Agent': AGENT_DISCOGS,
      Accept: 'application/vnd.discogs.v2.discogs+json',
      ...(env.DISCOGS_TOKEN ? { Authorization: `Discogs token=${env.DISCOGS_TOKEN}` } : {}),
    },
  });
  if (!r.ok) {
    /* Le debut de la reponse et les compteurs de Discogs dans le message :
       un 429 par jeton et un 429 par adresse ne se reparent pas pareil. */
    const bout = (await r.text()).replace(/\s+/g, ' ').slice(0, 120);
    const quota = `limite=${r.headers.get('x-discogs-ratelimit') ?? '?'} utilise=${r.headers.get('x-discogs-ratelimit-used') ?? '?'}`;
    throw new Error(`Discogs ${r.status} ${quota} ${bout}`);
  }
  return r.json();
}

interface ArtisteDiscogs {
  readonly trouve: boolean;
  readonly nom: string | null;
  readonly sorties: number;
  readonly styles: Record<string, number>;
}

/* ═══ LAST.FM EN SECOND, PARCE QUE DISCOGS COMPTE PAR ADRESSE ═══

   MESURE LE 8 SEPTEMBRE 2026 : depuis ce Worker, Discogs repondait « too
   quickly » a la premiere requete, compteur a 70 sur 60, alors que le meme
   jeton depuis un poste montrait 0 sur 60. Discogs limite par adresse IP de
   depart, et les adresses de sortie de Cloudflare sont partagees par tous
   les Workers du monde : le seau est plein avant nous.

   Last.fm limite par cle, pas par adresse : il repond toujours. Ses
   etiquettes sont posees par le public, donc plus pauvres pour un artiste
   local a trois sorties (rien sur Lealtica), mais justes pour tout ce qui a
   des auditeurs (Nina Kraviz, FM Radio Gods). On tente Discogs, on retombe
   sur Last.fm, et on dit d'ou vient la reponse. */
async function artisteChezLastfm(q: string, env: Env): Promise<ArtisteDiscogs> {
  if (!env.LASTFM_API_KEY) return { trouve: false, nom: null, sorties: 0, styles: {} };
  const r = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(q)}&api_key=${env.LASTFM_API_KEY}&format=json&autocorrect=1`,
    { headers: { 'user-agent': AGENT_DISCOGS } }
  );
  if (!r.ok) throw new Error(`Last.fm ${r.status}`);
  const j = (await r.json()) as { toptags?: { tag?: { name: string; count: number }[]; '@attr'?: { artist?: string } } };
  const tags = j.toptags?.tag ?? [];
  const styles: Record<string, number> = {};
  /* Les etiquettes a moins de 5 sur 100 sont du bruit : « seen live »,
     « under 2000 listeners », un genre qu'une personne a pose une fois. */
  /* Le meme poids que la moisson : le score sur 100 divise par 25, une
     etiquette a 100 vaut 4, comme une etiquette Bandcamp en vaut 8. */
  for (const t of tags) if (t.count >= 10) styles[t.name] = Math.max(1, Math.round(t.count / 25));
  if (Object.keys(styles).length === 0) return { trouve: false, nom: null, sorties: 0, styles: {} };
  return { trouve: true, nom: j.toptags?.['@attr']?.artist ?? q, sorties: tags.length, styles };
}

/* BANDCAMP, LA OU L'ARTISTE SE NOMME LUI-MEME. Sa recherche rend les
   etiquettes de l'artiste en une requete, et c'est la seule des trois
   sources qui connaisse « Dark disco » ou « Indie Dance » (Discogs ne les a
   pas dans son vocabulaire). Le nom doit etre exactement le meme. */
async function artisteChezBandcamp(q: string): Promise<ArtisteDiscogs> {
  const r = await fetch('https://bandcamp.com/api/bcsearch_public_api/1/autocomplete_elastic', {
    method: 'POST',
    headers: { 'user-agent': AGENT_DISCOGS, 'content-type': 'application/json' },
    body: JSON.stringify({ search_text: q, search_filter: 'b', full_page: false, fan_id: null }),
  });
  if (!r.ok) throw new Error(`Bandcamp ${r.status}`);
  const j = (await r.json()) as { auto?: { results?: { type?: string; name?: string; tag_names?: string[] }[] } };
  const exact = (j.auto?.results ?? []).find((x) => x.type === 'b' && aplatirNom(x.name ?? '') === aplatirNom(q));
  if (!exact) return { trouve: false, nom: null, sorties: 0, styles: {} };
  const styles: Record<string, number> = {};
  for (const t of exact.tag_names ?? []) if (t.trim()) styles[t.trim()] = (styles[t.trim()] ?? 0) + 8;
  return { trouve: Object.keys(styles).length > 0, nom: exact.name ?? null, sorties: 0, styles };
}

async function artisteChezDiscogs(q: string, env: Env): Promise<ArtisteDiscogs> {
  /* Les sorties d'abord : c'est la qu'il y a les styles. Cinquante suffisent
     a peser un style contre un autre. */
  const sorties = (await discogs(
    `/database/search?type=release&per_page=50&artist=${encodeURIComponent(q)}`,
    env
  )) as { results?: { style?: string[]; title?: string }[] };
  const res = sorties.results ?? [];
  const styles: Record<string, number> = {};
  for (const r of res) for (const st of r.style ?? []) styles[st] = (styles[st] ?? 0) + 1;
  if (res.length === 0) return { trouve: false, nom: null, sorties: 0, styles: {} };

  /* Le nom tel que Discogs l'ecrit, pour l'afficher juste : « Maudite
     Machine » et non ce qu'on a tape. */
  let nom: string | null = null;
  try {
    const fiche = (await discogs(
      `/database/search?type=artist&per_page=1&q=${encodeURIComponent(q)}`,
      env
    )) as { results?: { title?: string }[] };
    nom = fiche.results?.[0]?.title ?? null;
  } catch {
    nom = null;
  }
  return { trouve: true, nom, sorties: res.length, styles };
}


/* --- Les entetes de partage entre origines -------------------------------- */

function origineAutorisee(req: Request, env: Env): string | null {
  const o = req.headers.get('Origin');
  if (!o) return null;
  return env.ORIGINES.split(',').map((x) => x.trim()).includes(o) ? o : null;
}

function entetes(req: Request, env: Env, extra: Record<string, string> = {}): Headers {
  const h = new Headers(extra);
  const o = origineAutorisee(req, env);
  if (o) {
    h.set('Access-Control-Allow-Origin', o);
    h.set('Vary', 'Origin');
  }
  h.set('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'authorization, content-type');
  h.set('Access-Control-Expose-Headers', 'etag, content-range, accept-ranges, content-length');
  return h;
}

const refus = (req: Request, env: Env, code: number, message: string): Response =>
  new Response(JSON.stringify({ erreur: message }), {
    status: code,
    headers: entetes(req, env, { 'content-type': 'application/json' }),
  });

/* --- La verification du jeton --------------------------------------------- */

/* LES CLES SONT MISES EN CACHE, MAIS PAS ETERNELLEMENT. Aller chercher le
   trousseau a chaque tranche de 40 Mo ajouterait un aller-retour par tranche,
   soit dix sur un set d'une heure. Le garder pour toujours empecherait une
   rotation de cle de prendre effet. Dix minutes tiennent les deux bouts. */
let trousseau: { cles: CryptoKey[]; expire: number } | null = null;

async function clesPubliques(env: Env): Promise<CryptoKey[]> {
  if (trousseau && Date.now() < trousseau.expire) return trousseau.cles;
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
  if (!r.ok) throw new Error('trousseau injoignable');
  const j = (await r.json()) as { keys: JsonWebKey[] };
  const cles: CryptoKey[] = [];
  for (const k of j.keys) {
    try {
      cles.push(
        await crypto.subtle.importKey(
          'jwk',
          k,
          { name: 'ECDSA', namedCurve: 'P-256' },
          false,
          ['verify']
        )
      );
    } catch {
      /* Une cle d'un algorithme qu'on ne sait pas lire n'invalide pas les
         autres : on la passe. */
    }
  }
  trousseau = { cles, expire: Date.now() + 10 * 60 * 1000 };
  return cles;
}

const base64url = (s: string): Uint8Array => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i += 1) out[i] = b.charCodeAt(i);
  return out;
};

/** Rend l'identifiant du compte si le jeton est valide, sinon null. */
async function estModerateur(req: Request, env: Env): Promise<boolean> {
  const jeton = req.headers.get('Authorization') ?? '';
  if (!jeton || !env.SUPABASE_ANON_KEY) return false;
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/is_moderator`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: jeton,
        'content-type': 'application/json',
      },
      body: '{}',
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch {
    return false;
  }
}

async function qui(req: Request, env: Env): Promise<string | null> {
  const brut = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!brut) return null;
  const parts = brut.split('.');
  if (parts.length !== 3) return null;
  const [tete, corps, signature] = parts as [string, string, string];

  try {
    const donnees = new TextEncoder().encode(`${tete}.${corps}`);
    const sig = base64url(signature);
    let valide = false;
    for (const cle of await clesPubliques(env)) {
      if (await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, cle, sig, donnees)) {
        valide = true;
        break;
      }
    }
    if (!valide) return null;

    const charge = JSON.parse(new TextDecoder().decode(base64url(corps))) as {
      sub?: string;
      exp?: number;
    };
    /* L'EXPIRATION SE VERIFIE ICI. Une signature valide sur un jeton perime
       reste une signature valide : c'est la date qui dit qu'il ne vaut plus
       rien, et personne d'autre ne la regardera. */
    if (!charge.sub || typeof charge.exp !== 'number') return null;
    if (charge.exp * 1000 < Date.now()) return null;
    return charge.sub;
  } catch {
    return null;
  }
}

/* La forme de la reponse de l'agenda. A incrementer des qu'elle change. */
const FORME_REPONSE = 2;

/* --- Ou se trouve le visiteur -------------------------------------------- */

/* Le nom que Cloudflare donne a une ville et celui que RA lui donne ne sont
   pas toujours le meme mot : « Montréal » contre « Montreal », « Köln »
   contre « Cologne ». On compare donc sans accents et sans casse, et on
   n'accepte le rapprochement que DANS LE MEME PAYS : il existe un Paris au
   Texas, et proposer ses soirees a quelqu'un qui est en France serait pire
   que ne rien proposer du tout. */
function nu(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function zoneLaPlusProche(ville: string, pays: string): { id: number; nom: string; pays: string } | null {
  const v = nu(ville);
  const p = pays.toUpperCase();
  const memePays = ZONES.filter(([, , c]) => c.toUpperCase() === p);
  const exact = memePays.find(([, nom]) => nu(nom) === v);
  if (exact) return { id: exact[0], nom: exact[1], pays: exact[2] };
  /* A defaut du nom exact, une zone qui contient le nom de la ville ou
     l'inverse : « New York City » contre « New York ». Rien de plus flou que
     cela, parce qu'au-dela on inventerait. */
  const proche = memePays.find(([, nom]) => nu(nom).includes(v) || v.includes(nu(nom)));
  if (proche) return { id: proche[0], nom: proche[1], pays: proche[2] };
  return null;
}

/* --- Le service ----------------------------------------------------------- */

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const chemin = decodeURIComponent(url.pathname.replace(/^\//, ''));

    /* LE DEPOT D'AFFICHE VIENT D'UNE ORIGINE QU'ON NE PEUT PAS ECRIRE D'AVANCE.
       Les pages de facebook.com interdisent a leurs scripts d'appeler d'autres
       serveurs (politique de securite de contenu), on ne peut donc pas
       deposer depuis la page de l'evenement. Le navigateur ouvre l'image
       elle-meme, sur le CDN de Facebook (scontent.<zone>.fbcdn.net, une
       origine par zone), et depose depuis la. Cette seule route repond donc
       a toute origine : elle n'a de toute facon aucun jeton a proteger,
       sa serrure est ailleurs (voir plus bas). */
    const depotDAffiche = chemin.startsWith('api/affiche/');
    if (req.method === 'OPTIONS') {
      if (depotDAffiche) {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'PUT, OPTIONS',
            'Access-Control-Allow-Headers': 'content-type',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
      return new Response(null, { status: 204, headers: entetes(req, env) });
    }

    /* ═══ L'AGENDA. Deux routes publiques, sans jeton. ═══

       Elles sont ici, avant le mur d'authentification, parce que la question
       « qu'est-ce qui se joue ce week-end » n'appartient a personne. */

    /* OU SUIS-JE. Cloudflare le sait deja : la requete porte sa propre
       origine. Aucune fenetre de permission, aucun service tiers, aucune
       cle. La ville est ensuite rapprochee de la liste de RA, parce qu'une
       ville sans zone RA ne sert a rien pour la suite. */
    if (req.method === 'GET' && chemin === 'api/ou') {
      const cf = (req as Request & { cf?: Record<string, unknown> }).cf ?? {};
      const ville = typeof cf['city'] === 'string' ? cf['city'] : null;
      const pays = typeof cf['country'] === 'string' ? cf['country'] : null;
      const zone = ville && pays ? zoneLaPlusProche(ville, pays) : null;
      return new Response(
        JSON.stringify({ ville, pays, zone }),
        { headers: entetes(req, env, { 'content-type': 'application/json', 'cache-control': 'no-store' }) }
      );
    }

    /* UN ARTISTE QUE L'INDEX IGNORE. Publique, sans jeton : la question
       « quels styles fait untel » n'appartient a personne. Un jour de cache
       par nom, pour ne pas frapper Discogs a chaque frappe. */
    if (req.method === 'GET' && chemin === 'api/artiste') {
      const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
      if (q.length < 3) return refus(req, env, 400, 'q trop court');
      if (!env.DISCOGS_TOKEN) return refus(req, env, 503, 'Discogs non configure');
      const cache = caches.default;
      const cle = new Request(`https://sonaa.ca/api/artiste?q=${encodeURIComponent(q.toLowerCase())}&v=4`);
      const garde = await cache.match(cle);
      if (garde) {
        const h = entetes(req, env, { 'content-type': 'application/json' });
        h.set('x-cache', 'garde');
        return new Response(garde.body, { headers: h });
      }
      /* LES TROIS SOURCES S'ADDITIONNENT, comme dans la moisson : Discogs
         quand il repond (il compte par adresse et refuse souvent d'ici),
         Bandcamp, Last.fm. Ce qui est rendu porte le nom de celles qui ont
         parle. */
      const parts: (ArtisteDiscogs & { s: string })[] = [];
      for (const [s, f] of [
        ['discogs', () => artisteChezDiscogs(q, env)],
        ['bandcamp', () => artisteChezBandcamp(q)],
        ['lastfm', () => artisteChezLastfm(q, env)],
      ] as const) {
        try {
          const r = await f();
          if (r.trouve) parts.push({ ...r, s });
        } catch {
          /* Une source muette n'empeche pas les autres de repondre. */
        }
      }
      const styles: Record<string, number> = {};
      for (const p of parts) for (const [k, v] of Object.entries(p.styles)) styles[k] = (styles[k] ?? 0) + v;
      const reponse: ArtisteDiscogs & { source?: string } = {
        trouve: parts.length > 0,
        nom: parts.find((p) => p.nom)?.nom ?? null,
        sorties: parts.reduce((n, p) => n + p.sorties, 0),
        styles,
        source: parts.map((p) => p.s).join('+') || 'aucune',
      };
      /* PAS TROUVE : ON NOTE LE NOM, ET LA MOISSON S'EN CHARGERA. Une seule
         entree par nom aplati, avec la date ; trente jours de vie, le temps
         que la moisson passe plusieurs fois. Un nom qui n'existe nulle part
         finit par expirer sans avoir gene personne. */
      if (!reponse.trouve && env.DEMANDES) {
        const k = aplatirNom(q);
        if (k.length >= 3) {
          await env.DEMANDES.put(k, JSON.stringify({ nom: q, quand: new Date().toISOString() }), {
            expirationTtl: 30 * 24 * 3600,
          });
        }
      }
      const corps = JSON.stringify(reponse);
      await cache.put(
        cle,
        new Response(corps, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' } })
      );
      const h = entetes(req, env, { 'content-type': 'application/json' });
      h.set('x-cache', 'frais');
      return new Response(corps, { headers: h });
    }

    /* LA LISTE DES NOMS DEMANDES, pour la moisson. Publique : ce sont des
       noms d'artistes tapes dans une recherche, rien de personnel. */
    /* L'AFFICHE D'UNE SOIREE FACEBOOK, DEPOSEE PAR LE NAVIGATEUR QUI L'A LUE.

       Les adresses d'images de Facebook sont signees et expirent, et elles
       ne peuvent etre lues que par un navigateur connecte. La passe Facebook
       (tache planifiee dans le Chrome de Mika) ne peut donc ni les garder
       telles quelles, ni les faire transiter par un outil. Elle fait donc
       faire le travail a la page elle-meme : le navigateur telecharge
       l'image (le CDN de Facebook l'autorise) et la depose ici, sous
       affiches/<identifiant Facebook>.jpg, que le GET public ci-dessous sert
       comme n'importe quel objet.

       SANS JETON, ET VOICI LA SERRURE. La page qui depose tourne sur
       facebook.com, elle n'a aucun jeton SONAA. On n'accepte donc que : une
       image (JPEG, PNG ou WebP, verifie sur les premiers octets), de moins
       de trois megaoctets, pour un identifiant qui existe deja dans la base
       comme soiree Facebook publiee, lue avec la cle publique. Le pire cas
       est une affiche remplacee par une autre image pour une soiree connue,
       et la passe suivante la remet. */
    if (req.method === 'PUT' && chemin.startsWith('api/affiche/')) {
      const ref = chemin.slice('api/affiche/'.length);
      if (!/^\d{6,30}$/.test(ref)) return new Response(JSON.stringify({ erreur: 'identifiant invalide' }), { status: 400, headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      const taille = Number(req.headers.get('content-length') ?? '0');
      if (!Number.isFinite(taille) || taille <= 0 || taille > 3 * 1024 * 1024) {
        return new Response(JSON.stringify({ erreur: 'image absente ou trop lourde' }), { status: 413, headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
      if (!env.SUPABASE_ANON_KEY) return new Response(JSON.stringify({ erreur: 'cle publique absente' }), { status: 503, headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      const existe = await fetch(
        `${env.SUPABASE_URL}/rest/v1/soirees_manuelles?select=id&source=eq.facebook&source_ref=eq.${ref}&limit=1`,
        { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` } }
      )
        .then((r) => (r.ok ? r.json() : []))
        .then((j) => Array.isArray(j) && j.length > 0)
        .catch(() => false);
      if (!existe) return new Response(JSON.stringify({ erreur: 'aucune soiree Facebook avec cet identifiant' }), { status: 404, headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      const corps = new Uint8Array(await req.arrayBuffer());
      const jpeg = corps[0] === 0xff && corps[1] === 0xd8;
      const png = corps[0] === 0x89 && corps[1] === 0x50 && corps[2] === 0x4e && corps[3] === 0x47;
      const webp = corps[0] === 0x52 && corps[1] === 0x49 && corps[8] === 0x57 && corps[9] === 0x45;
      if (!jpeg && !png && !webp) return new Response(JSON.stringify({ erreur: 'pas une image' }), { status: 415, headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      const type = jpeg ? 'image/jpeg' : png ? 'image/png' : 'image/webp';
      const cle = `affiches/${ref}.jpg`;
      await env.SETS.put(cle, corps, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=86400' } });
      return new Response(JSON.stringify({ cle, octets: corps.length }), {
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (req.method === 'GET' && chemin === 'api/artistes-demandes') {
      if (!env.DEMANDES) return refus(req, env, 503, 'file non configuree');
      const liste = await env.DEMANDES.list({ limit: 1000 });
      const noms: string[] = [];
      for (const k of liste.keys) {
        const v = await env.DEMANDES.get(k.name);
        if (!v) continue;
        try {
          const j = JSON.parse(v) as { nom?: string };
          if (j.nom) noms.push(j.nom);
        } catch {
          /* Une entree illisible n'est pas une raison de taire les autres. */
        }
      }
      return new Response(JSON.stringify(noms), {
        headers: entetes(req, env, { 'content-type': 'application/json', 'cache-control': 'no-store' }),
      });
    }

    /* LA LISTE DES VILLES, pour qui n'est pas la ou son adresse le dit. */
    if (req.method === 'GET' && chemin === 'api/zones') {
      return new Response(
        JSON.stringify(ZONES.map(([id, nom, pays]) => ({ id, nom, pays }))),
        { headers: entetes(req, env, { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' }) }
      );
    }

    /* CE QUI SE JOUE. Relaye chez RA, garde une heure.

       LE CACHE N'EST PAS UN CONFORT, C'EST UNE POLITESSE. Sans lui, chaque
       ouverture de la page frapperait leur serveur ; avec lui, une ville
       consultee cent fois dans l'heure ne leur coute qu'une requete. */
    if (req.method === 'GET' && chemin === 'api/agenda') {
      const zone = Number(url.searchParams.get('zone'));
      const du = url.searchParams.get('du');
      const au = url.searchParams.get('au');
      if (!Number.isInteger(zone) || zone <= 0 || !du || !au) {
        return refus(req, env, 400, 'zone, du et au sont obligatoires');
      }

      const cache = caches.default;
      /* LA CLE DE CACHE PORTE LA VERSION DU CODE.

         DEFAUT MESURE : la lecture de l'affiche a ete corrigee, le Worker
         redeploye, et la page a continue une heure entiere a montrer des
         soirees sans affiche. Rien n'etait casse ; le cache servait
         simplement des reponses fabriquees par la version d'avant. Une
         correction invisible pendant une heure ressemble exactement a une
         correction qui n'a pas marche, et c'est ainsi qu'on va chercher un
         defaut la ou il n'y en a plus.

         Changer ce nombre a chaque fois que la FORME de la reponse change
         suffit : les anciennes entrees deviennent inatteignables et
         expirent toutes seules. */
      const cle = new Request(`${url.toString()}&v=${FORME_REPONSE}`, { method: 'GET' });
      const garde = await cache.match(cle);
      if (garde) {
        const h = entetes(req, env, { 'content-type': 'application/json' });
        h.set('x-cache', 'garde');
        return new Response(garde.body, { headers: h });
      }

      const genre = url.searchParams.get('genre');
      /* `pages` demande de tourner les pages cote passerelle. Il sert a la
         recherche, qui veut toutes les dates d'une salle et non les quarante
         premieres. Sans lui, le comportement ne change pas d'un pouce. */
      const pages = Number(url.searchParams.get('pages')) || 1;
      const resultat =
        pages > 1
          ? await toutesLesSoirees({ zone, du, au, ...(genre ? { genre } : {}), pages })
          : await soirees({
              zone,
              du,
              au,
              ...(genre ? { genre } : {}),
              page: Number(url.searchParams.get('page')) || 1,
            });
      /* 502 ET PAS UNE LISTE VIDE. Une ville sans soiree et une source
         tombee doivent se lire differemment a l'ecran, sans quoi la page
         ment tranquillement le jour ou RA ferme la porte. */
      if (!resultat) return refus(req, env, 502, 'Resident Advisor ne repond pas');

      const corps = JSON.stringify(resultat);
      const aGarder = new Response(corps, {
        headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' },
      });
      await cache.put(cle, aGarder.clone());
      const h = entetes(req, env, { 'content-type': 'application/json' });
      h.set('x-cache', 'frais');
      return new Response(corps, { headers: h });
    }

    /* LECTURE PUBLIQUE. Un set publie s'ecoute sans compte, comme sur
       n'importe quelle plateforme. Ce qui protege les brouillons n'est pas le
       secret du chemin mais le fait que la base ne le donne a personne. */
    if (req.method === 'GET' && chemin && !chemin.startsWith('api/')) {
      const plage = req.headers.get('Range');
      const objet = plage
        ? await env.SETS.get(chemin, { range: req.headers })
        : await env.SETS.get(chemin);
      if (!objet) return refus(req, env, 404, 'introuvable');

      const h = entetes(req, env);
      objet.writeHttpMetadata(h);
      h.set('etag', objet.httpEtag);
      /* LES REQUETES PAR PLAGE SONT INDISPENSABLES. Sans elles, se deplacer
         dans un set d'une heure obligerait a telecharger l'heure entiere. */
      h.set('accept-ranges', 'bytes');
      /* Les sets ne changent jamais sous une meme cle ; les affiches des
         soirees Facebook, si (une passe par jour). L'objet dit sa propre
         duree quand il en a une. */
      h.set('cache-control', objet.httpMetadata?.cacheControl ?? 'public, max-age=31536000, immutable');

      /* LE 206 NE SE REND QUE SI LE CLIENT A DEMANDE UNE PLAGE.

         DEFAUT MESURE : R2 remplit `range` meme sur une lecture entiere, et
         la premiere version rendait donc 206 a une requete qui n'en
         demandait pas. Un lecteur qui recoit un contenu partiel qu'il n'a
         pas demande a le droit de le refuser. On regarde donc l'entete
         d'ARRIVEE, seule source de la question posee. */
      if (plage && objet.range && 'offset' in objet.range) {
        const debut = objet.range.offset ?? 0;
        const longueur = objet.range.length ?? objet.size - debut;
        h.set('content-range', `bytes ${debut}-${debut + longueur - 1}/${objet.size}`);
        return new Response(objet.body, { status: 206, headers: h });
      }
      return new Response(objet.body, { headers: h });
    }

    /* ECRITURE. Tout ce qui suit exige un jeton valide, et un chemin qui
       commence par l'identifiant qu'il porte. */
    const moi = await qui(req, env);
    if (!moi) return refus(req, env, 401, 'jeton absent ou invalide');

    const aMoi = (cle: string): boolean => cle.startsWith(`${moi}/`);

    if (req.method === 'POST' && chemin === 'api/creer') {
      const { cle, type } = (await req.json()) as { cle: string; type: string };
      if (!aMoi(cle)) return refus(req, env, 403, 'chemin hors de votre dossier');
      const envoi = await env.SETS.createMultipartUpload(cle, {
        httpMetadata: { contentType: type || 'application/octet-stream' },
      });
      return new Response(JSON.stringify({ cle, envoi: envoi.uploadId }), {
        headers: entetes(req, env, { 'content-type': 'application/json' }),
      });
    }

    if (req.method === 'PUT' && chemin === 'api/partie') {
      const cle = url.searchParams.get('cle') ?? '';
      const envoiId = url.searchParams.get('envoi') ?? '';
      const numero = Number(url.searchParams.get('numero'));
      if (!aMoi(cle)) return refus(req, env, 403, 'chemin hors de votre dossier');
      if (!envoiId || !Number.isInteger(numero) || numero < 1) {
        return refus(req, env, 400, 'envoi ou numero manquant');
      }
      const envoi = env.SETS.resumeMultipartUpload(cle, envoiId);
      const partie = await envoi.uploadPart(numero, req.body as ReadableStream);
      return new Response(JSON.stringify(partie), {
        headers: entetes(req, env, { 'content-type': 'application/json' }),
      });
    }

    if (req.method === 'POST' && chemin === 'api/finir') {
      const { cle, envoi: envoiId, parties } = (await req.json()) as {
        cle: string;
        envoi: string;
        parties: R2UploadedPart[];
      };
      if (!aMoi(cle)) return refus(req, env, 403, 'chemin hors de votre dossier');
      const envoi = env.SETS.resumeMultipartUpload(cle, envoiId);
      const objet = await envoi.complete(parties);
      return new Response(JSON.stringify({ cle, octets: objet.size }), {
        headers: entetes(req, env, { 'content-type': 'application/json' }),
      });
    }

    if (req.method === 'POST' && chemin === 'api/annuler') {
      const { cle, envoi: envoiId } = (await req.json()) as { cle: string; envoi: string };
      if (!aMoi(cle)) return refus(req, env, 403, 'chemin hors de votre dossier');
      /* ABANDONNER UN ENVOI EST GRATUIT, ET NE PAS L'ABANDONNER COUTE. Les
         tranches deja envoyees d'un envoi jamais termine restent facturees
         comme du stockage tant que personne ne les efface. */
      await env.SETS.resumeMultipartUpload(cle, envoiId).abort();
      return new Response(null, { status: 204, headers: entetes(req, env) });
    }

    if (req.method === 'DELETE') {
      /* LA MODERATION PEUT RETIRER LE FICHIER D'UN AUTRE. Depuis le 10
         septembre 2026 la base laisse un moderateur supprimer la ligne d'un
         set qui n'est pas le sien ; sans ceci le fichier restait sur R2,
         orphelin et facture. On demande a la base, avec le jeton de la
         personne, si elle est moderatrice : c'est la meme fonction
         is_moderator() que les politiques, et la reponse ne vaut que pour ce
         jeton. */
      if (!aMoi(chemin) && !(await estModerateur(req, env))) {
        return refus(req, env, 403, 'chemin hors de votre dossier');
      }
      await env.SETS.delete(chemin);
      return new Response(null, { status: 204, headers: entetes(req, env) });
    }

    return refus(req, env, 404, 'route inconnue');
  },
};
