/* QUELLE VILLE LE CALENDRIER MONTRE, ET POURQUOI CELLE-LA.
 *
 * ═══ QUATRE SOURCES, UN ORDRE, ET IL N'EST PAS ARBITRAIRE ═══
 *
 * L'ordre va du plus explicite au plus devine. Une intention exprimee bat
 * toujours une intention supposee.
 *
 *   1. `?city=<slug>` dans l'adresse. C'est quelqu'un qui a partage un lien
 *      en disant « regarde ce qui se joue a Berlin ». Rien ne doit passer
 *      devant : sinon le lien ne montre pas ce qu'il promet.
 *
 *   2. Le choix de session, garde en local. C'est la personne qui a change de
 *      ville a la main sur cette machine. Elle l'a fait une fois, elle n'a
 *      pas a le refaire a chaque visite.
 *
 *   3. La ville d'attache du profil, si quelqu'un est connecte. C'est un
 *      choix, lui aussi, mais fait ailleurs et il y a longtemps : il cede
 *      devant un geste plus recent.
 *
 *   4. La ville deduite de la connexion. C'est la seule qui soit une
 *      supposition. Elle ferme la marche, et elle ne s'ecrit nulle part :
 *      elle sert a remplir le premier ecran, pas a decider a la place de
 *      quelqu'un.
 *
 *   5. Rien. Etat vide explicite, avec le selecteur mis en avant. PAS de
 *      ville par defaut arbitraire, PAS de liste vide silencieuse. Une page
 *      qui montre Montreal a quelqu'un de Lyon sans le dire est pire qu'une
 *      page qui demande.
 *
 * ═══ CETTE FONCTION NE TOUCHE A RIEN ═══
 *
 * Elle ne lit pas `localStorage`, n'interroge pas la base, ne regarde pas
 * l'adresse : on lui donne les quatre reponses deja obtenues et elle dit
 * laquelle gagne. C'est ce qui la rend testable sans navigateur et sans
 * reseau, et c'est ce qui permet de verifier les quatre niveaux de priorite
 * par une table de cas plutot qu'en cliquant.
 */

export interface Ville {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly name_ascii: string;
  readonly admin_region: string | null;
  readonly country_code: string;
  readonly timezone: string;
  readonly population: number | null;
  readonly ra_area_id: number | null;
}

/** D'ou vient la ville affichee. La page le dit a l'ecran quand c'est une
    deduction : personne ne doit croire a un choix qu'il n'a pas fait. */
export type Provenance = 'lien' | 'session' | 'profil' | 'deduite' | 'aucune';

export interface VilleActive {
  readonly ville: Ville | null;
  readonly provenance: Provenance;
}

export interface Entrees {
  /** Le slug lu dans `?city=`, tel quel, meme s'il ne correspond a rien. */
  readonly slugDuLien?: string | null | undefined;
  /** Le slug garde en local par un choix precedent. */
  readonly slugDeSession?: string | null | undefined;
  /** L'identifiant de la ville d'attache du profil, si quelqu'un est connecte. */
  readonly villeDuProfil?: string | null | undefined;
  /** La ville deduite de la connexion, deja resolue. */
  readonly villeDeduite?: Ville | null | undefined;
  /** Les villes connues, pour resoudre les slugs et les identifiants. */
  readonly connues: readonly Ville[];
}

export function resoudreVille(e: Entrees): VilleActive {
  const parSlug = (s: string | null | undefined): Ville | null =>
    s ? (e.connues.find((v) => v.slug === s) ?? null) : null;

  /* 1. LE LIEN. Un slug qui ne correspond a rien ne fait PAS tomber sur la
        ville suivante : il tombe sur l'etat vide. Sinon quelqu'un qui suit un
        lien vers « berlin-de » mal orthographie verrait les soirees de sa
        propre ville en croyant voir Berlin, ce qui est le seul resultat
        vraiment trompeur de toute cette fonction. */
  if (e.slugDuLien) {
    const v = parSlug(e.slugDuLien);
    return v ? { ville: v, provenance: 'lien' } : { ville: null, provenance: 'aucune' };
  }

  /* 2. LA SESSION. Un slug perime, lui, est simplement ignore : il ne vient
        d'aucune intention presente, seulement d'un ancien passage. */
  const session = parSlug(e.slugDeSession);
  if (session) return { ville: session, provenance: 'session' };

  /* 3. LE PROFIL. */
  if (e.villeDuProfil) {
    const v = e.connues.find((x) => x.id === e.villeDuProfil);
    if (v) return { ville: v, provenance: 'profil' };
  }

  /* 4. LA DEDUCTION. */
  if (e.villeDeduite) return { ville: e.villeDeduite, provenance: 'deduite' };

  /* 5. RIEN, ET ON LE DIT. */
  return { ville: null, provenance: 'aucune' };
}

/* ── La recherche ──────────────────────────────────────────────────────────
   Sans accents et sans casse des deux cotes : « montreal » doit trouver
   « Montréal », et « MONTRÉAL » aussi. Le tri est par population
   decroissante, ce qui met Paris en France devant Paris en Ontario sans
   avoir a le dire. */

const sansAccents = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Nombre minimal de caracteres avant de chercher. En dessous, toutes les
    villes correspondent et la liste ne renseigne pas. */
export const CARACTERES_MIN = 2;

export function chercherVilles(terme: string, connues: readonly Ville[], max = 20): Ville[] {
  const t = sansAccents(terme.trim());
  if (t.length < CARACTERES_MIN) return [];
  const trouvees = connues.filter((v) => {
    const nom = sansAccents(v.name_ascii);
    /* Le code pays entier, pour « CA » ou « DE ». Deux lettres exactement :
       un `includes` ferait remonter le Canada sur la lettre « a ». */
    if (t.length === 2 && v.country_code.toLowerCase() === t) return true;
    return nom.startsWith(t) || nom.includes(t);
  });
  /* Ce qui COMMENCE par le terme passe devant ce qui le contient : taper
     « bar » doit donner Barcelone avant une ville dont le nom contient
     « bar » au milieu. A egalite, la plus peuplee. */
  return trouvees
    .sort((a, b) => {
      const da = sansAccents(a.name_ascii).startsWith(t) ? 0 : 1;
      const db = sansAccents(b.name_ascii).startsWith(t) ? 0 : 1;
      if (da !== db) return da - db;
      return (b.population ?? 0) - (a.population ?? 0);
    })
    .slice(0, max);
}

/** Ce qu'on montre a droite du nom pour lever l'ambiguite : Paris, Ontario
    contre Paris, Ile-de-France. */
export function situer(v: Ville): string {
  return v.admin_region ? `${v.admin_region}, ${v.country_code}` : v.country_code;
}
