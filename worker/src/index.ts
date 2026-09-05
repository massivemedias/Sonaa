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
  readonly ORIGINES: string;
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

    if (req.method === 'OPTIONS') {
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
      h.set('cache-control', 'public, max-age=31536000, immutable');

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
      if (!aMoi(chemin)) return refus(req, env, 403, 'chemin hors de votre dossier');
      await env.SETS.delete(chemin);
      return new Response(null, { status: 204, headers: entetes(req, env) });
    }

    return refus(req, env, 404, 'route inconnue');
  },
};
