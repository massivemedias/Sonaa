/* L'AGENDA : OU SE TROUVE LE VISITEUR, ET CE QUI SE JOUE PRES DE LUI.

   ═══ POURQUOI CE CODE EST DANS LE WORKER ET NON DANS LA PAGE ═══

   Deux raisons, et aucune n'est un gout d'architecture.

   1. LA VILLE. Cloudflare sait deja d'ou arrive la requete : `request.cf`
      porte la ville, le pays, la region. C'est gratuit, immediat, et cela
      n'affiche AUCUNE demande de permission. La geolocalisation du
      navigateur aurait ouvert une fenetre « autoriser l'acces a votre
      position », que Mika ne voulait pas : « pas besoin que ce dernier
      selectionne quoi que ce soit ». Une position par IP est moins precise
      qu'un GPS, mais pour la question « quelle ville » elle suffit, et pour
      celui qu'elle trompe la ville reste changeable a la main.

   2. RESIDENT ADVISOR. Leur API ne repond pas aux requetes venues d'un
      navigateur : pas d'en-tetes de partage entre origines. Un appel depuis
      la page serait bloque avant meme d'avoir ete envoye. Le Worker, lui,
      appelle de serveur a serveur, ou la question ne se pose pas.

   ═══ CE QUE CETTE PASSERELLE N'EST PAS ═══

   Elle ne COPIE rien. Aucune base d'evenements n'est constituee : chaque
   demande est relayee, le resultat est garde une heure en cache, et il
   disparait. SONAA n'heberge pas l'agenda de RA, il le montre et renvoie
   chez eux par un lien sur chaque soiree.

   IL FAUT LE DIRE SANS DETOUR : cette API n'est pas publique. C'est celle
   que leur propre site utilise, elle n'est pas documentee, et rien ne nous
   autorise formellement a nous en servir. Elle peut cesser de repondre du
   jour au lendemain, sans preavis et sans que ce soit un defaut de notre
   cote. La page est ecrite pour que cela se voie clairement plutot que de
   ressembler a une ville sans soirees. */

const RA = 'https://ra.co/graphql';

/* La requete est celle du site de RA, reduite a ce que la page affiche. Les
   champs superflus ont ete retires : chaque champ demande est un champ que
   RA doit calculer, et nous n'avons pas a leur couter plus que necessaire. */
const REQUETE = `query GET_EVENT_LISTINGS($filters: FilterInputDtoInput, $filterOptions: FilterOptionsInputDtoInput, $page: Int, $pageSize: Int) {
  eventListings(filters: $filters, filterOptions: $filterOptions, pageSize: $pageSize, page: $page) {
    data { id listingDate event {
      id date startTime endTime title contentUrl flyerFront isTicketed attending
      genres { id name }
      images { filename type }
      artists { id name }
      venue { id name contentUrl }
    } }
    totalResults
  }
}`;

export interface Soiree {
  readonly id: string;
  readonly titre: string;
  readonly date: string;
  readonly debut: string | null;
  readonly lieu: string | null;
  readonly artistes: string[];
  readonly genres: string[];
  readonly affiche: string | null;
  readonly lien: string;
  readonly interesses: number;
}

interface EvenementRa {
  id: string;
  date: string;
  startTime?: string | null;
  title: string;
  contentUrl?: string | null;
  flyerFront?: string | null;
  images?: { filename?: string | null; type?: string | null }[] | null;
  attending?: number | null;
  genres?: { name: string }[] | null;
  artists?: { name: string }[] | null;
  venue?: { name?: string | null } | null;
}

function affiche(e: EvenementRa): string | null {
  const image = (e.images ?? []).find((i) => i.type === 'FLYERFRONT' && i.filename);
  return image?.filename ?? e.flyerFront ?? null;
}

function enSoiree(e: EvenementRa): Soiree {
  return {
    id: e.id,
    titre: e.title,
    date: e.date,
    debut: e.startTime ?? null,
    lieu: e.venue?.name ?? null,
    artistes: (e.artists ?? []).map((a) => a.name),
    genres: (e.genres ?? []).map((g) => g.name),
    /* L'AFFICHE N'EST PAS DANS `flyerFront`, QUI EST TOUJOURS VIDE.

       Mesure : quarante soirees de Montreal, quarante `flyerFront` nuls, et
       quarante images bien presentes dans `images`, type FLYERFRONT, avec
       leur adresse complete. Le champ qui porte le bon nom n'est plus
       alimente ; celui qui porte le contenu s'appelle autrement. On lit donc
       les deux, celui qui marche d'abord. */
    affiche: affiche(e),
    /* Le lien renvoie CHEZ EUX. C'est la contrepartie minimale de se servir
       de leur agenda : personne n'achete un billet sur SONAA. */
    lien: e.contentUrl ? `https://ra.co${e.contentUrl}` : `https://ra.co/events/${e.id}`,
    interesses: e.attending ?? 0,
  };
}

/** Les soirees d'une zone, entre deux dates, eventuellement d'un seul genre.
    Rend `null` si RA ne repond pas ou repond autre chose que du JSON : la
    page doit pouvoir distinguer « aucune soiree » de « la source est
    tombee », et confondre les deux serait exactement le defaut a eviter. */
export async function soirees(opts: {
  zone: number;
  du: string;
  au: string;
  genre?: string | undefined;
  page?: number | undefined;
}): Promise<{ soirees: Soiree[]; total: number } | null> {
  const filtres: Record<string, unknown> = {
    areas: { eq: opts.zone },
    listingDate: { gte: opts.du, lte: opts.au },
  };
  if (opts.genre) filtres['genre'] = { eq: opts.genre };

  let reponse: Response;
  try {
    reponse = await fetch(RA, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        /* RA repond 403 sans en-tete `Referer` plausible. Ce n'est pas un
           contournement d'authentification : il n'y a pas de compte, pas de
           cle, rien a franchir. C'est la requete que leur propre page
           envoie. */
        referer: 'https://ra.co/events',
        'user-agent': 'SONAA/1.0 (atlas genealogique de la musique electronique; sonaa.ca)',
      },
      body: JSON.stringify({
        operationName: 'GET_EVENT_LISTINGS',
        query: REQUETE,
        variables: {
          filters: filtres,
          filterOptions: { genre: true },
          pageSize: 40,
          page: opts.page ?? 1,
        },
      }),
    });
  } catch {
    return null;
  }
  if (!reponse.ok) return null;

  let charge: {
    data?: { eventListings?: { data?: { event: EvenementRa }[]; totalResults?: number } };
    errors?: unknown[];
  };
  try {
    charge = (await reponse.json()) as typeof charge;
  } catch {
    return null;
  }
  if (charge.errors?.length) return null;

  const liste = charge.data?.eventListings;
  if (!liste?.data) return null;
  return {
    soirees: liste.data.map((x) => enSoiree(x.event)),
    total: liste.totalResults ?? liste.data.length,
  };
}
