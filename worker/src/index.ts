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
/* La table des sources et la consigne de traduction vivent dans src/, avec
   leurs tests : une copie ici aurait derive des la premiere source ajoutee. */
import { SOURCES } from '../../src/data/news-sources.ts';
import { MODELE, consigneCorps, lireReponseCorps, rangsDeTexte, remettreEnPlace } from '../../scripts/lib/traduire.ts';
/* Le lecteur de la reponse d'AudD vit dans src/, avec son test : voir
   src/reconnaitre/audd.ts. Une copie ici aurait diverge. */
import { lireReponseAudd } from '../../src/reconnaitre/audd.ts';
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
  /** L'envoi de courriel de Cloudflare (Email Sending), domaine sonaa.ca. */
  readonly EMAIL?: { send: (m: { to: string; from: { email: string; name: string }; subject: string; text: string; html?: string }) => Promise<unknown> };
  /** Le secret que la base presente pour avoir le droit de faire ecrire un
      courriel, pose par `wrangler secret put NOTIFIER_SECRET`. */
  /* LA CLE D'AUDD, POUR LA RECONNAISSANCE DE MORCEAU. Facultative : sans
     elle la route repond 503 et la page masque la partie morceau. La
     reconnaissance de STYLE, elle, tourne dans le navigateur et ne depend
     d'aucune cle. Voir src/reconnaitre/. */
  AUDD_API_KEY?: string;
  /* LA CLE DE TRADUCTION, POUR LE CORPS DES ARTICLES. Facultative : sans
     elle la vue de lecture affiche l'original anglais, ce qui reste un
     article lisible. Voir la route api/article-flux. */
  ANTHROPIC_API_KEY?: string;
  readonly NOTIFIER_SECRET?: string;
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

/* ═══ LIRE UN ARTICLE DANS SON FLUX, ET NULLE PART AILLEURS ═══
 *
 * La vue de lecture allait chercher le corps sur la PAGE du magazine, la
 * nettoyait et l'affichait. Cela marchait, et cela reproduisait un article
 * entier depuis une source qui ne l'avait pas propose pour cela.
 *
 * Mika, le 21 septembre 2026 : « ne jamais aller chercher le corps sur la
 * page du magazine ». On ne lit donc plus que le FLUX, c'est-a-dire le canal
 * que l'editeur publie lui-meme pour etre repris. Quand il y met l'article
 * entier, on l'affiche entier ; quand il n'en met qu'un extrait, on affiche
 * l'extrait et un bouton vers chez lui. La difference est la sienne, pas la
 * notre, et elle se lit dans la reponse : `integral`.
 *
 * Mesure du 21 septembre 2026 sur les quatre flux ajoutes ou verifies :
 * Attack, Gearnews et Midnight Rebels livrent l'article entier avec ses
 * images ; CDM ne livre qu'un resume de 478 signes. */

/* LES DIMENSIONS D'UNE IMAGE, QUAND LE FLUX LES DECLARE.
   Sans elles le navigateur ne sait pas quelle place reserver et la page
   saute quand chaque image arrive. Environ trois images sur dix les portent,
   mesure faite le 22 septembre 2026 sur les flux de Gearnews et d'Attack.
   Voir LectureArticle.tsx, qui les repose sur la balise. */
interface Morceau { t: 'p' | 'h2' | 'h3' | 'quote' | 'img'; x: string; w?: number; h?: number }

/* LE SEUIL DE L'INTEGRAL. En dessous, c'est un chapeau, pas un article : les
   resumes de flux tournent autour de 300 a 500 signes, les articles entiers
   depassent les 5000. Mille est loin des deux. */
const SEUIL_INTEGRAL = 1000;

/* Les blocs tires du HTML d'un flux. Meme decoupe que ce que la page
   affichait avant, pour que la mise en page ne bouge pas. */
async function morceauxDuHtml(html: string): Promise<Morceau[]> {
  const sortie: Morceau[] = [];
  const ouvre = (t: Morceau['t']) => ({
    element() {
      sortie.push({ t, x: '' });
    },
    text(tx: Text) {
      const dernier = sortie[sortie.length - 1];
      if (dernier && dernier.t === t) dernier.x += tx.text;
    },
  });
  await new HTMLRewriter()
    .on('p', ouvre('p'))
    .on('h2', ouvre('h2'))
    .on('h3', ouvre('h3'))
    .on('blockquote', ouvre('quote'))
    .on('img', {
      element(e) {
        const src = e.getAttribute('data-src') ?? e.getAttribute('src') ?? '';
        if (src.startsWith('http') && !/\.svg|1x1|pixel|avatar|logo|icon|gravatar/i.test(src)) {
          /* ON NE GARDE QUE DES NOMBRES PLAUSIBLES. Un flux ecrit parfois
             « 100% » ou « auto » dans ces attributs : poses tels quels sur la
             balise, ils feraient reserver n'importe quoi. */
          const n = (v: string | null): number | undefined => {
            const x = Number(v);
            return Number.isFinite(x) && x > 0 && x <= 10000 ? x : undefined;
          };
          const w = n(e.getAttribute('width'));
          const h = n(e.getAttribute('height'));
          sortie.push({ t: 'img', x: src, ...(w !== undefined && h !== undefined ? { w, h } : {}) });
        }
      },
    })
    .on('script', { element(e) { e.remove(); } })
    .on('style', { element(e) { e.remove(); } })
    .transform(new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } }))
    .arrayBuffer();

  return sortie
    .map((m) => ({ ...m, x: m.t === 'img' ? m.x : decodeEntites(m.x.replace(/\s+/g, ' ').trim()) }))
    .filter((m) => (m.t === 'img' ? true : m.t === 'p' || m.t === 'quote' ? m.x.length >= 25 : m.x.length >= 3))
    .filter((m, i, a) => m.t !== 'img' || a.findIndex((y) => y.t === 'img' && y.x === m.x) === i)
    .filter((m) => m.t === 'img' || !/continue reading|read more|the post .* appeared first/i.test(m.x))
    .slice(0, 160);
}

/* L'ITEM D'UN FLUX, retrouve par son adresse. On lit le XML a la main : un
   analyseur complet pese plus que ce qu'il apporte pour deux balises, et
   HTMLRewriter ne sait pas lire du XML. */
function itemDuFlux(xml: string, lien: string): { contenu: string; integral: boolean } | null {
  const items = xml.split('<item').slice(1);
  for (const brut of items) {
    const lienItem = /<link>([^<]+)<\/link>/.exec(brut)?.[1]?.trim();
    if (!lienItem || lienItem.replace(/\/$/, '') !== lien.replace(/\/$/, '')) continue;
    const encode = /<content:encoded>([\s\S]*?)<\/content:encoded>/.exec(brut)?.[1] ?? '';
    const description = /<description>([\s\S]*?)<\/description>/.exec(brut)?.[1] ?? '';
    const sansCdata = (x: string) => x.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');
    const corpsEncode = sansCdata(encode);
    const corpsDescription = sansCdata(description);
    const nu = (x: string) => decodeEntites(x.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const integral = nu(corpsEncode).length >= SEUIL_INTEGRAL;
    return { contenu: integral ? corpsEncode : corpsDescription || corpsEncode, integral };
  }
  return null;
}

const ENTITES: Record<string, string> = {
  ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’', hellip: '…', ndash: ', ', mdash: ', ',
  eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô', ucirc: 'û', iuml: 'ï', euml: 'ë', oelig: 'œ',
  copy: '©', trade: '™', reg: '®', deg: '°', euro: '€',
};
/* Deux passes : les magazines ecrivent parfois &amp;nbsp; dans leurs balises
   meta, l'entite d'une entite. */
const decodeEntites = (s: string): string => decodeUneFois(decodeUneFois(s));
const decodeUneFois = (s: string): string =>
  s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(nbsp|ensp|emsp|thinsp);/g, ' ')
    .replace(/&(ldquo|rdquo|laquo|raquo|lsquo|rsquo|hellip|ndash|mdash|eacute|egrave|ecirc|agrave|acirc|ccedil|ocirc|ucirc|iuml|euml|oelig|copy|trade|reg|deg|euro);/g, (_, n: string) => ENTITES[n] ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, '’');

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

/* CE QUE LE NAVIGATEUR A LE DROIT DE GARDER, ET QUI MANQUAIT.
 *
 * La reponse de l'agenda etait gardee une heure dans le cache du Worker, et
 * PAS UNE SECONDE dans celui du navigateur : aucun en-tete ne le lui disait.
 * Chaque ouverture de la page repayait donc l'aller-retour, pour une liste
 * qui ne bouge pas d'une minute a l'autre.
 *
 * Cinq minutes de fraicheur, une heure de rabiot : passe cinq minutes le
 * navigateur affiche quand meme ce qu'il a, immediatement, et revalide en
 * arriere-plan. Une soiree ajoutee met donc au plus cinq minutes a
 * apparaitre, sans commune mesure avec le temps qu'elle a mis a etre
 * moissonnee. */
/* UN APPEL, UN ARTICLE. Les blocs vides, qui sont les images, partent quand
   meme : le modele doit rendre autant d'elements qu'il en recoit, et c'est
   ainsi qu'on peut remettre chaque bloc a sa place. */
async function traduireCorps(blocs: string[], cle: string): Promise<string[]> {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': cle, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODELE,
        max_tokens: 8000,
        system: consigneCorps(),
        messages: [{ role: 'user', content: JSON.stringify(blocs) }],
      }),
    });
    if (!r.ok) {
      console.log(`traduireCorps : HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
      return [];
    }
    const rep = (await r.json()) as {
      content?: { type: string; text?: string }[];
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const texte = (rep.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
    const lus = lireReponseCorps(texte, blocs.length);
    /* CE JOURNAL DIT POURQUOI UNE TRADUCTION N'A PAS EU LIEU. Sans lui, un
       echec silencieux se lit « traduit: false » et rien de plus, et il faut
       payer un appel de plus pour apprendre lequel des trois cas c'etait. */
    console.log(
      `traduireCorps : ${blocs.length} blocs demandes, ${lus.length} rendus, ` +
        `arret ${rep.stop_reason}, ${rep.usage?.input_tokens} + ${rep.usage?.output_tokens} tokens`
    );
    return lus;
  } catch (e) {
    console.log(`traduireCorps : ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
}

const CACHE_AGENDA = {
  'content-type': 'application/json',
  'cache-control': 'public, max-age=300, stale-while-revalidate=3600',
};

/* CE QU'AUDD DIT QUAND IL NE REND PAS DE MORCEAU. Trois formes, lues sur
   ses reponses : `status: "error"` avec `error.error_code` et
   `error.error_message` (jeton refuse, quota, fichier illisible) ;
   `status: "success"` avec `result: null` (rien reconnu) ; un `result`
   sans artiste ni titre. Le code d'erreur et son message sont ceux d'AudD,
   ils ne portent rien de secret, et ils sont exactement ce qu'il faut lire
   pour savoir si le probleme est chez nous ou chez lui. */
function raisonDAudd(brut: Record<string, unknown>): string {
  if (brut['status'] !== 'success') {
    const err = (typeof brut['error'] === 'object' && brut['error'] !== null ? brut['error'] : {}) as Record<string, unknown>;
    const code = err['error_code'] !== undefined ? String(err['error_code']) : '?';
    const message = typeof err['error_message'] === 'string' ? err['error_message'] : String(brut['status'] ?? 'inconnu');
    return `audd ${code} : ${message}`;
  }
  return brut['result'] === null || brut['result'] === undefined ? 'aucun resultat' : 'reponse incomplete';
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
    /* ═══ UN COURRIEL A MIKA QUAND QUELQUE CHOSE ARRIVE ═══

       Mika, le 14 septembre 2026 : « quand un nouvel utilisateur s'inscrit
       j'aimerais recevoir un courriel a massivemedias@gmail.com, pareil
       quand un user upload un set ». C'est la base qui appelle ici, par un
       declencheur (pg_net) sur auth.users et sur dj_sets, avec un secret
       partage : sans lui, personne ne peut faire ecrire un courriel depuis
       l'exterieur. Le courriel part par l'envoi de Cloudflare, depuis
       sonaa.ca. */
    if (req.method === 'POST' && chemin === 'api/notifier') {
      const secret = req.headers.get('x-sonaa-secret');
      if (!env.NOTIFIER_SECRET || secret !== env.NOTIFIER_SECRET) return refus(req, env, 403, 'secret absent ou faux');
      if (!env.EMAIL) return refus(req, env, 503, 'envoi de courriel non configure');
      const { sujet, texte } = (await req.json()) as { sujet?: string; texte?: string };
      if (!sujet || !texte) return refus(req, env, 400, 'sujet et texte obligatoires');
      const propre = (x: string): string => x.replace(/[\r\n]+/g, ' ').slice(0, 200);
      try {
        await env.EMAIL.send({
          to: 'massivemedias@gmail.com',
          from: { email: 'bonjour@sonaa.ca', name: 'SONAA' },
          subject: propre(sujet),
          text: texte.slice(0, 5000),
        });
      } catch (e) {
        /* On DIT pourquoi : un domaine pas encore inscrit a l'envoi, une
           limite, un refus. Un 1101 muet ne sert a personne. */
        return new Response(JSON.stringify({ envoye: false, erreur: e instanceof Error ? e.message : String(e) }), {
          status: 502,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ envoye: true }), { headers: { 'content-type': 'application/json' } });
    }

    /* ═══ LE CORPS D'UN ARTICLE, DEPUIS SON FLUX ═══
     *
     * GET api/article-flux?source=<id>&lien=<url>&lang=fr
     *
     * On telecharge le flux du magazine, garde une heure, on y retrouve
     * l'article par son adresse, et on rend ses blocs. La page du magazine
     * n'est jamais ouverte : voir le commentaire de morceauxDuHtml.
     *
     * LA TRADUCTION DU CORPS SE FAIT ICI, A LA DEMANDE, et jamais a la
     * moisson : traduire cent soixante articles a chaque passe pour les
     * quelques-uns qu'on ouvre serait payer mille fois ce qu'on lit. Le
     * resultat est range dans KV pour trente jours, donc la deuxieme
     * ouverture ne coute rien. Cinq traductions par adresse et par heure :
     * au-dela, on rend l'original, ce qui reste un article lisible. */
    if (req.method === 'GET' && chemin === 'api/article-flux') {
      const idSource = (url.searchParams.get('source') ?? '').trim();
      const lien = (url.searchParams.get('lien') ?? '').trim();
      const langue = url.searchParams.get('lang') === 'fr' ? 'fr' : 'en';
      const source = SOURCES.find((x) => x.id === idSource);
      if (!source || !source.flux) return refus(req, env, 404, 'source inconnue ou sans flux');
      if (!lien.startsWith('http')) return refus(req, env, 400, 'lien invalide');

      const cache = caches.default;
      const cleFlux = new Request(`https://sonaa.ca/flux/${source.id}?v=1`);
      let xml = '';
      const garde = await cache.match(cleFlux);
      if (garde) {
        xml = await garde.text();
      } else {
        try {
          const r = await fetch(source.flux, {
            headers: { 'user-agent': 'SONAA/1.0 (+https://sonaa.ca ; flux lu a la demande)', accept: 'application/rss+xml, application/xml' },
          });
          if (!r.ok) throw new Error(`flux ${r.status}`);
          xml = await r.text();
          await cache.put(cleFlux, new Response(xml, { headers: { 'content-type': 'application/xml', 'cache-control': 'public, max-age=3600' } }));
        } catch (e) {
          return refus(req, env, 502, e instanceof Error ? e.message : 'flux illisible');
        }
      }

      const item = itemDuFlux(xml, lien);
      /* L'ARTICLE A PU SORTIR DU FLUX. Les magazines n'y gardent que les dix
         ou vingt derniers ; un article moissonne il y a trois jours n'y est
         peut-etre plus. Ce n'est pas une erreur, c'est un article a lire
         chez lui, et la page le dira. */
      if (!item) {
        return new Response(JSON.stringify({ trouve: false, integral: false, corps: [], traduit: false }), {
          headers: entetes(req, env, { 'content-type': 'application/json', 'cache-control': 'public, max-age=600' }),
        });
      }

      const corps = await morceauxDuHtml(item.contenu);

      /* LA TRADUCTION : seulement en francais, seulement sur un article
         entier, seulement depuis une source anglophone. */
      let traduit = false;
      let rendu = corps;
      if (langue === 'fr' && item.integral && source.langue === 'en' && env.ANTHROPIC_API_KEY) {
        const cleTrad = `trad:${langue}:${lien}`;
        const range = await env.DEMANDES.get(cleTrad);
        if (range) {
          try {
            const lu = JSON.parse(range) as string[];
            if (lu.length !== corps.length) throw new Error('entree de longueur differente');
            rendu = corps.map((m, i) => (m.t === 'img' ? m : { t: m.t, x: lu[i] || m.x }));
            traduit = true;
          } catch {
            /* Entree abimee : on rend l'original. */
          }
        } else {
          const ip = req.headers.get('cf-connecting-ip') ?? 'inconnue';
          const heure = new Date().toISOString().slice(0, 13);
          const cleCompteur = `tradrl:${ip}:${heure}`;
          const vus = Number((await env.DEMANDES.get(cleCompteur)) ?? '0');
          if (vus < 5) {
            await env.DEMANDES.put(cleCompteur, String(vus + 1), { expirationTtl: 3900 });
            /* LES IMAGES NE PARTENT PAS EN TRADUCTION, et c'est ce qui
               manquait. Elles partaient comme des chaines vides, le modele les
               rendait vides, et la regle qui refuse un bloc vide, posee pour
               attraper une traduction amputee, refusait alors l'article
               entier : tout article illustre etait intraduisible, et le seul
               symptome etait un « traduit: false » sans raison. On n'envoie
               donc que les blocs de texte, et on les remet a leur place. */
            const rangs = rangsDeTexte(corps);
            const aTraduire = rangs.map((i) => (corps[i] as Morceau).x);
            const blocs = await traduireCorps(aTraduire, env.ANTHROPIC_API_KEY);
            if (blocs.length === aTraduire.length && blocs.length > 0) {
              const complet = remettreEnPlace(corps, rangs, blocs);
              rendu = corps.map((m, i) => (m.t === 'img' ? m : { t: m.t, x: complet[i] || m.x }));
              traduit = true;
              await env.DEMANDES.put(cleTrad, JSON.stringify(complet), { expirationTtl: 2592000 });
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ trouve: true, integral: item.integral, corps: rendu, traduit, source: source.nom }),
        { headers: entetes(req, env, { 'content-type': 'application/json', 'cache-control': 'public, max-age=600' }) }
      );
    }

    /* ═══ RECONNAITRE UN MORCEAU ═══ POST api/reconnaitre-track
     *
     * Le navigateur envoie huit secondes d'audio, on les relaie a AudD, on
     * rend cinq champs. L'audio N'EST PAS CONSERVE : il vit dans la memoire
     * de cette requete, il n'est ecrit ni dans R2 ni dans KV, et il n'y a
     * aucune trace a purger ensuite. C'est ce que la modale de consentement
     * promet a l'utilisateur, et c'est verifiable ici en dix lignes.
     *
     * SANS CLE, 503, ET C'EST UNE REPONSE VALIDE. La reconnaissance de style
     * tourne entierement dans le navigateur et ne depend pas de cette route ;
     * la page masque la partie morceau et le reste fonctionne.
     *
     * TRENTE PAR HEURE ET PAR ADRESSE. AudD se facture a la requete : sans
     * borne, une page laissee ouverte avec un minuteur coute un abonnement.
     * Le compteur vit dans le meme KV que la file des artistes, sous un
     * prefixe a lui, et expire tout seul. */
    /* ═══ LA ROUTE REPOND AUSSI A LA QUESTION « ES-TU LA ? » ═══
     *
     * La page du micro doit savoir, a l'ouverture, si la reconnaissance de
     * morceau est configuree : sans cle elle masque toute la section.
     *
     * ELLE LE DEMANDAIT EN POSTANT UN CORPS VIDE, et lisait le code de
     * retour : 503 sans cle, 400 avec. Ca marchait, et ca ecrivait une
     * erreur 400 dans la console de CHAQUE visiteur, a chaque ouverture de
     * la page. Trace le 22 septembre 2026, apres deux rapports ou j'avais
     * attribue ces 400 a la mauvaise page.
     *
     * Une question de disponibilite est une LECTURE : elle se pose en GET,
     * et la reponse est 200 dans les deux cas. Rien n'est envoye a AudD, le
     * compteur n'est pas touche, et plus personne ne voit d'erreur. */
    if (req.method === 'GET' && chemin === 'api/reconnaitre-track') {
      return new Response(JSON.stringify({ disponible: Boolean(env.AUDD_API_KEY) }), {
        headers: entetes(req, env, { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' }),
      });
    }

    if (req.method === 'POST' && chemin === 'api/reconnaitre-track') {
      if (!env.AUDD_API_KEY) return refus(req, env, 503, 'reconnaissance de morceau non configuree');

      const ip = req.headers.get('cf-connecting-ip') ?? 'inconnue';
      const heure = new Date().toISOString().slice(0, 13);
      const cleCompteur = `reco:${ip}:${heure}`;
      const vus = Number((await env.DEMANDES.get(cleCompteur)) ?? '0');
      if (vus >= 30) return refus(req, env, 429, 'trop de reconnaissances cette heure-ci');

      const audio = await req.arrayBuffer();
      /* Huit secondes d'Opus pesent une centaine de kilo-octets. Quatre
         mega-octets laissent la place a un format non compresse sans ouvrir
         la porte a un envoi de fichier entier. */
      if (audio.byteLength === 0) return refus(req, env, 400, 'aucun audio');
      if (audio.byteLength > 4 * 1024 * 1024) return refus(req, env, 413, 'extrait trop long');

      await env.DEMANDES.put(cleCompteur, String(vus + 1), { expirationTtl: 3900 });

      const formulaire = new FormData();
      formulaire.append('api_token', env.AUDD_API_KEY);
      formulaire.append('return', 'apple_music,spotify');
      formulaire.append('file', new Blob([audio]), 'extrait.webm');

      /* LA RAISON D'UN « RIEN » EST RENDUE, ET C'EST LA CORRECTION DU 22
         SEPTEMBRE 2026. La route repondait `{ morceau: null }` aussi bien
         quand AudD n'avait pas reconnu que quand AudD refusait la cle ou le
         quota : mesure ce jour-la avec trois extraits de morceaux publies,
         trois fois `null`, et aucun moyen de savoir lequel des deux cas on
         tenait. AudD dit toujours pourquoi : `status: "error"` avec un code,
         ou `result: null`. On le rend tel quel, et la page le montre. */
      let morceau: unknown = null;
      let raison: string | null = null;
      try {
        const r = await fetch('https://api.audd.io/', { method: 'POST', body: formulaire });
        if (!r.ok) throw new Error(`AudD ${r.status}`);
        const brut = (await r.json()) as Record<string, unknown>;
        morceau = lireReponseAudd(brut);
        if (!morceau) raison = raisonDAudd(brut);
      } catch (e) {
        return new Response(
          JSON.stringify({ morceau: null, raison: e instanceof Error ? e.message : String(e) }),
          { status: 502, headers: entetes(req, env, { 'content-type': 'application/json' }) }
        );
      }

      return new Response(
        JSON.stringify({ morceau, raison, recu: { octets: audio.byteLength, type: req.headers.get('content-type') } }),
        { headers: entetes(req, env, { 'content-type': 'application/json', 'cache-control': 'no-store' }) }
      );
    }

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
      /* ON NOTE LE NOM, TROUVE OU NON, ET LA MOISSON S'EN CHARGERA. Une seule
         entree par nom aplati, avec la date ; trente jours de vie, le temps
         que la moisson passe plusieurs fois. Un nom qui n'existe nulle part
         finit par expirer sans avoir gene personne.

         TROUVE AUSSI, DEPUIS LE 13 SEPTEMBRE 2026 : Laurent Garnier se
         trouvait ici a chaque recherche et n'entrait jamais dans l'index,
         parce que seuls les echecs etaient notes. Un nom qu'on a su
         resoudre en direct merite l'index autant qu'un autre.

         ET ON EFFACE LES FRAPPES EN COURS : la recherche part apres une
         pause, donc « Digital c » puis « Digital com » arrivent avant
         « Digital committee ». Quand un nom arrive, ses debuts deja notes
         s'en vont. */
      if (env.DEMANDES) {
        const k = aplatirNom(q);
        if (k.length >= 3) {
          await env.DEMANDES.put(k, JSON.stringify({ nom: q, quand: new Date().toISOString(), trouve: reponse.trouve }), {
            expirationTtl: 30 * 24 * 3600,
          });
          const debuts: string[] = [];
          for (let n = 3; n < k.length; n += 1) debuts.push(k.slice(0, n));
          await Promise.all(debuts.map((d) => env.DEMANDES?.delete(d)));
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
      /* LES DEBUTS D'UN AUTRE NOM NE SONT PAS DES NOMS : on les ecarte de la
         liste, et on les efface au passage, pour ce qui a ete note avant le
         13 septembre 2026. */
      const cles = liste.keys.map((k) => k.name);
      const estUnDebut = (c: string): boolean => cles.some((autre) => autre.length > c.length && autre.startsWith(c));
      const noms: string[] = [];
      for (const k of liste.keys) {
        if (estUnDebut(k.name)) {
          await env.DEMANDES.delete(k.name);
          continue;
        }
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
        const h = entetes(req, env, CACHE_AGENDA);
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
      const h = entetes(req, env, CACHE_AGENDA);
      h.set('x-cache', 'frais');
      return new Response(corps, { headers: h });
    }

    /* LECTURE PUBLIQUE. Un set publie s'ecoute sans compte, comme sur
       n'importe quelle plateforme. Ce qui protege les brouillons n'est pas le
       secret du chemin mais le fait que la base ne le donne a personne. */
    /* HEAD AUSSI, ET PAS SEULEMENT GET. Mesure le 24 septembre 2026 en
       diagnostiquant les coupures de lecture sur telephone : un HEAD sur un
       set tombait dans le mur d'authentification et rendait 401, alors que
       le meme chemin en GET rendait 206 par plage. Un lecteur qui sonde la
       taille et les plages avant de lire recevait donc un refus. */
    if ((req.method === 'GET' || req.method === 'HEAD') && chemin && !chemin.startsWith('api/')) {
      if (req.method === 'HEAD') {
        const tete = await env.SETS.head(chemin);
        if (!tete) return refus(req, env, 404, 'introuvable');
        const h = entetes(req, env);
        tete.writeHttpMetadata(h);
        h.set('etag', tete.httpEtag);
        h.set('accept-ranges', 'bytes');
        h.set('content-length', String(tete.size));
        h.set('cache-control', tete.httpMetadata?.cacheControl ?? 'public, max-age=31536000, immutable');
        return new Response(null, { status: 200, headers: h });
      }
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
