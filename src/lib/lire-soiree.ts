/* LIRE UNE SOIREE DANS UNE PAGE : ce que le formulaire « Ajouter une
 * soiree » remplit tout seul quand on colle un lien.
 *
 * Mika, le 1er octobre 2026 : « si quelqu'un passe un lien Facebook, ca va
 * chercher toutes les infos et complete par defaut, et l'utilisateur peut
 * modifier bien sur ». La page est lue par la passerelle (worker/src/
 * index.ts, route api/lire-soiree), parce qu'un navigateur ne peut pas lire
 * facebook.com ni eventbrite.ca depuis sonaa.ca. Ce module ne fait que LIRE
 * un texte deja recu : aucune requete, et donc des tests sans reseau.
 *
 * ═══ CE QUE CHAQUE SOURCE DONNE, MESURE LE 1er OCTOBRE 2026 ═══
 *
 * - Eventbrite et toute page qui publie un JSON-LD « Event » : tout, heure
 *   et fuseau compris, salle, adresse, plateau, prix, affiche.
 * - Facebook, a un lecteur d'apercu de liens : le titre, l'affiche, et une
 *   phrase « Event in Montreal by X and 2 others on Friday, October 2
 *   2026 » qui porte la ville, l'organisateur et le jour, JAMAIS l'heure.
 *   L'adresse est dans l'adresse canonique de la page, en mots separes par
 *   des traits d'union. La salle n'est nulle part.
 * - Lepointdevente : pas de JSON-LD, un og:title structure (voir
 *   decouperTitre), l'heure dans le corps de page.
 * - Resident Advisor : lu par son API, pas par la page (voir la passerelle).
 * - Ticketmaster et Shotgun : protegees contre les robots. Il reste ce que
 *   dit leur adresse : le titre, et chez Ticketmaster la date.
 *
 * Ce qui n'a pas pu etre lu reste vide, et le formulaire le montre : une
 * case vide se remplit, une case fausse se croit. */

export type SourceDuLien = 'facebook' | 'eventbrite' | 'lepointdevente' | 'ticketmaster' | 'shotgun' | 'ra' | 'page';

export interface SoireeLue {
  readonly titre: string | null;
  /** Le jour dans le fuseau de la salle, AAAA-MM-JJ. */
  readonly jour: string | null;
  /** L'heure de la salle, HH:MM. Nulle quand la source ne la donne pas. */
  readonly heure: string | null;
  readonly lieu: string | null;
  readonly adresse: string | null;
  readonly ville: string | null;
  readonly artistes: readonly string[];
  readonly genres: readonly string[];
  readonly description: string | null;
  readonly organisateur: string | null;
  readonly prix: string | null;
  /** L'adresse distante de l'affiche ; la passerelle la telecharge. */
  readonly affiche: string | null;
  readonly lien: string;
  readonly source: SourceDuLien;
  /** L'identifiant chez la source, quand l'adresse en porte un. */
  readonly ref: string | null;
}

const VIDE: Omit<SoireeLue, 'lien' | 'source' | 'ref'> = {
  titre: null,
  jour: null,
  heure: null,
  lieu: null,
  adresse: null,
  ville: null,
  artistes: [],
  genres: [],
  description: null,
  organisateur: null,
  prix: null,
  affiche: null,
};

/* ── La source, d'apres l'adresse ─────────────────────────────────────── */

export function sourceDuLien(lien: string): { source: SourceDuLien; ref: string | null } {
  let u: URL;
  try {
    u = new URL(lien);
  } catch {
    return { source: 'page', ref: null };
  }
  const hote = u.hostname.replace(/^(www|m|mbasic|web)\./, '');
  if (hote === 'facebook.com' || hote === 'fb.me') {
    const id = /\/events\/(?:[^/]+\/)*?(\d{6,30})(?:\/|$)/.exec(u.pathname)?.[1] ?? null;
    return { source: 'facebook', ref: id };
  }
  if (hote === 'ra.co' || hote === 'residentadvisor.net') {
    return { source: 'ra', ref: /\/events\/(?:[a-z]{2}\/)?(\d+)/.exec(u.pathname)?.[1] ?? null };
  }
  if (/(^|\.)eventbrite\.[a-z.]+$/.test(hote)) {
    return { source: 'eventbrite', ref: /-(\d{9,})\/?$/.exec(u.pathname)?.[1] ?? null };
  }
  if (hote === 'lepointdevente.com') {
    return { source: 'lepointdevente', ref: /\/billets\/([^/?#]+)/.exec(u.pathname)?.[1] ?? null };
  }
  if (/(^|\.)ticketmaster\.[a-z.]+$/.test(hote)) {
    return { source: 'ticketmaster', ref: /\/event\/([A-Z0-9]+)/i.exec(u.pathname)?.[1] ?? null };
  }
  if (hote === 'shotgun.live') {
    return { source: 'shotgun', ref: /\/events\/([^/?#]+)/.exec(u.pathname)?.[1] ?? null };
  }
  return { source: 'page', ref: null };
}

/* ── Le texte d'une page ──────────────────────────────────────────────── */

const NOMMEES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '’', nbsp: ' ', eacute: 'é', egrave: 'è', ecirc: 'ê',
  agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô', ucirc: 'û', ugrave: 'ù', iuml: 'ï', icirc: 'î',
  euml: 'ë', oelig: 'œ', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  hellip: '…', ndash: ', ', mdash: ', ', euro: '€', copy: '©',
};

/** Les entites d'un attribut ou d'un texte, et les blancs ramenes a un. */
export function texteNu(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => NOMMEES[n.toLowerCase()] ?? m)
    .replace(/[\u2013\u2014]/g, ', ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function meta(html: string, propriete: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${propriete}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${propriete}["']`,
    'i'
  );
  const m = re.exec(html);
  const v = m?.[1] ?? m?.[2] ?? null;
  return v ? texteNu(v) || null : null;
}

/** « 2026-10-02T22:00:00-04:00 » : le jour et l'heure TELS QU'ECRITS, qui
    sont ceux de la salle. On ne convertit pas : l'heure affichee sur
    l'affiche est celle qu'on veut retrouver. */
export function jourEtHeure(iso: string | null | undefined): { jour: string | null; heure: string | null } {
  if (!iso) return { jour: null, heure: null };
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(iso.trim());
  if (!m) return { jour: null, heure: null };
  return { jour: m[1] ?? null, heure: m[2] && m[3] ? `${m[2]}:${m[3]}` : null };
}

/* ── JSON-LD ──────────────────────────────────────────────────────────── */

type Objet = Record<string, unknown>;
const estObjet = (x: unknown): x is Objet => typeof x === 'object' && x !== null && !Array.isArray(x);
const texte = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? texteNu(x) : null);
const liste = (x: unknown): unknown[] => (Array.isArray(x) ? x : x == null ? [] : [x]);

function evenementsLd(html: string): Objet[] {
  const trouves: Objet[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    let j: unknown;
    try {
      j = JSON.parse((m[1] ?? '').trim());
    } catch {
      continue;
    }
    const pile = liste(j);
    while (pile.length > 0) {
      const x = pile.shift();
      if (!estObjet(x)) continue;
      if (Array.isArray(x['@graph'])) pile.push(...x['@graph']);
      const type = liste(x['@type']).map(String).join(' ');
      if (/Event\b/.test(type)) trouves.push(x);
    }
  }
  return trouves;
}

function imageLd(x: unknown): string | null {
  for (const i of liste(x)) {
    if (typeof i === 'string' && /^https?:\/\//.test(i)) return i;
    if (estObjet(i) && typeof i['url'] === 'string') return i['url'];
  }
  return null;
}

function prixLd(x: unknown): string | null {
  for (const o of liste(x)) {
    if (!estObjet(o)) continue;
    const devise = typeof o['priceCurrency'] === 'string' ? ` ${o['priceCurrency']}` : '';
    const bas = o['lowPrice'] ?? o['price'];
    const haut = o['highPrice'];
    if (bas == null || bas === '') continue;
    const b = Number(bas);
    const h = Number(haut);
    if (b === 0 && (!haut || h === 0)) return 'Gratuit';
    const f = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2));
    return Number.isFinite(h) && h > b ? `${f(b)} à ${f(h)}${devise}` : `${f(b)}${devise}`;
  }
  return null;
}

function depuisLd(e: Objet): Partial<SoireeLue> {
  const lieu = liste(e['location']).find(estObjet);
  const adresseBrute = lieu?.['address'];
  let adresse: string | null = null;
  let ville: string | null = null;
  if (typeof adresseBrute === 'string') adresse = texteNu(adresseBrute);
  else if (estObjet(adresseBrute)) {
    ville = texte(adresseBrute['addressLocality']);
    const rue = texte(adresseBrute['streetAddress']);
    adresse = rue && ville && !rue.includes(ville) ? `${rue}, ${ville}` : rue;
  }
  const { jour, heure } = jourEtHeure(typeof e['startDate'] === 'string' ? e['startDate'] : null);
  const noms = (x: unknown): string[] =>
    liste(x)
      .map((p) => (estObjet(p) ? texte(p['name']) : texte(p)))
      .filter((n): n is string => Boolean(n));
  return {
    titre: texte(e['name']),
    jour,
    heure,
    lieu: lieu ? texte(lieu['name']) : null,
    adresse,
    ville,
    artistes: noms(e['performer']),
    description: texte(e['description']),
    organisateur: noms(e['organizer'])[0] ?? null,
    prix: prixLd(e['offers']),
    affiche: imageLd(e['image']),
  };
}

/* ── Facebook ─────────────────────────────────────────────────────────── */

const MOIS_ANGLAIS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** La phrase d'apercu de Facebook, demandee en anglais pour qu'elle ait une
    seule forme : « Event in Montreal by WaterFront.Events and 4 others on
    Friday, October 2 20265 posts in the discussion. » L'annee est collee au
    compte de publications qui suit : on n'en prend que quatre chiffres. */
export function phraseFacebook(d: string): { ville: string | null; organisateur: string | null; jour: string | null; heure: string | null } {
  const ville = /^Event in (.+?) by /i.exec(d)?.[1]?.trim() ?? null;
  const par = / by (.+?) on [A-Z][a-z]+day, /.exec(d)?.[1] ?? null;
  const organisateur = par
    ? par
        .replace(/ and \d+ others?$/i, '')
        .split(/,\s*| and /)
        .map((x) => x.trim())
        .filter(Boolean)
        .join(', ')
    : null;
  const q = / on [A-Z][a-z]+day, ([A-Z][a-z]+) (\d{1,2}) (\d{4})/.exec(d);
  const mois = q ? MOIS_ANGLAIS[(q[1] ?? '').toLowerCase()] : undefined;
  const jour = q && mois ? `${q[3]}-${String(mois).padStart(2, '0')}-${String(q[2]).padStart(2, '0')}` : null;
  const h = / at (\d{1,2})(?::(\d{2}))?\s?(AM|PM)/i.exec(d);
  let heure: string | null = null;
  if (h) {
    let hh = Number(h[1]) % 12;
    if ((h[3] ?? '').toUpperCase() === 'PM') hh += 12;
    heure = `${String(hh).padStart(2, '0')}:${h[2] ?? '00'}`;
  }
  return { ville, organisateur, jour, heure };
}

const PETITS_MOTS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'd', 'l', 'of', 'the']);

/** L'adresse qu'ecrit l'URL canonique d'un evenement Facebook :
    « 1403-rue-ste-%C3%A9lisabeth-montr%C3%A9al-qc-h2x-3c5-canada » devient
    « 1403 Rue Ste Élisabeth Montréal QC H2X 3C5 ». Le pays et la province en
    toutes lettres tombent, le code postal est remis en capitales. */
export function adresseFacebook(urlCanonique: string | null): string | null {
  if (!urlCanonique) return null;
  let chemin: string;
  try {
    chemin = decodeURIComponent(new URL(urlCanonique).pathname);
  } catch {
    return null;
  }
  const morceaux = chemin.split('/').filter(Boolean);
  /* /events/<adresse>/<titre>/<id>/ : l'adresse est le premier morceau
     apres « events » quand il y en a trois. */
  if (morceaux[0] !== 'events' || morceaux.length < 4) return null;
  const brut = morceaux[1] ?? '';
  if (/^\d+$/.test(brut)) return null;
  const sansPostal = brut.replace(/\b([a-z]\d[a-z])-(\d[a-z]\d)\b/gi, (_, a: string, b: string) => `${a.toUpperCase()}§${b.toUpperCase()}`);
  const mots = sansPostal
    .split('-')
    .filter((m) => !/^(canada|quebec|québec|france)$/i.test(m))
    .map((m, i) => {
      if (m.includes('§')) return m.replace('§', ' ');
      if (/^(qc|on|bc|ab)$/i.test(m)) return m.toUpperCase();
      if (i > 0 && PETITS_MOTS.has(m.toLowerCase())) return m.toLowerCase();
      return m.charAt(0).toUpperCase() + m.slice(1);
    });
  const adresse = mots.join(' ').trim();
  return adresse || null;
}

/* ── Lepointdevente ───────────────────────────────────────────────────── */

const MOIS: Record<string, number> = {
  janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7,
  août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12,
};

/** La date, d'abord dans la reference (« Y7R260923001 » vaut 2026-09-23),
    sinon dans le titre (« 23 septembre 2026 »). Null quand ni l'un ni l'autre
    ne la porte : une fiche sans date n'a pas sa place dans un calendrier. */
export function dateDe(ref: string, titre: string): string | null {
  const r = /^[a-z0-9]{3}(\d{2})(\d{2})(\d{2})\d{3}$/i.exec(ref);
  if (r) return `20${r[1]}-${r[2]}-${r[3]}`;
  const t = /(\d{1,2})(?:er)?\s+([\p{L}]+)\s+(20\d\d)/u.exec(titre);
  if (t) {
    const m = MOIS[(t[2] ?? '').toLowerCase()];
    if (m) return `${t[3]}-${String(m).padStart(2, '0')}-${String(t[1]).padStart(2, '0')}`;
  }
  return null;
}

/** Le titre og:title, decoupe : organisateur, titre, lieu, ville. La
    forme est « Organisateur presente Titre - date - Lieu, Ville, QC - ... »
    et chaque morceau peut manquer. */
export function decouperTitre(og: string): {
  organisateur: string | null; titre: string; lieu: string | null; ville: string | null;
} {
  const sansSite = og.replace(/\s*-\s*Lepointdevente\.com\s*$/i, '').trim();
  const morceaux = sansSite.split(/\s+-\s+/);
  const tete = morceaux[0] ?? sansSite;
  const pres = /^(.+?)\s+pr[ée]sente\s+(.+)$/i.exec(tete);
  const organisateur = pres ? pres[1]!.trim() : null;
  const titre = (pres ? pres[2]! : tete).trim();
  const fin = morceaux.length >= 3 ? morceaux[morceaux.length - 1]! : '';
  const l = /^(.+?),\s*([^,]+?),\s*(QC|ON|NB|AB|BC|MB|SK|NS)$/i.exec(fin.trim());
  return { organisateur, titre, lieu: l ? l[1]!.trim() : null, ville: l ? l[2]!.trim() : null };
}

/* ── Ce que l'adresse seule dit ───────────────────────────────────────── */

/** Pour les pages qui ne se laissent pas lire : le titre et parfois la date
    sont dans l'adresse. Ticketmaster ecrit « ...-montreal-quebec-10-01-2026/
    event/310064FB... », Shotgun « /events/sals-a-tropisme-octobre ». */
export function lireLeLienSeul(lien: string): SoireeLue {
  const { source, ref } = sourceDuLien(lien);
  let titre: string | null = null;
  let jour: string | null = null;
  try {
    const u = new URL(lien);
    const morceaux = u.pathname.split('/').filter(Boolean);
    let slug: string | null = null;
    if (source === 'ticketmaster') slug = morceaux[morceaux.indexOf('event') - 1] ?? null;
    else if (source === 'shotgun' || source === 'lepointdevente') slug = ref;
    else if (source === 'eventbrite') slug = (morceaux[morceaux.indexOf('e') + 1] ?? '').replace(/-tickets-\d+$/, '');
    if (slug) {
      const d = /-(\d{2})-(\d{2})-(20\d\d)$/.exec(slug);
      if (d) jour = `${d[3]}-${d[1]}-${d[2]}`;
      const mots = slug.replace(/-(\d{2})-(\d{2})-(20\d\d)$/, '').split('-').filter(Boolean);
      titre = mots.length > 0 ? mots.join(' ').replace(/^./, (c) => c.toUpperCase()) : null;
    }
  } catch {
    /* une adresse illisible ne dit rien, et c'est ce qu'on rend */
  }
  return { ...VIDE, titre, jour, lien, source, ref };
}

/* ── La lecture ───────────────────────────────────────────────────────── */

/** Tout ce qu'une page dit d'une soiree. Le JSON-LD d'abord, parce que c'est
    la seule forme ou la source dit elle-meme ce qui est quoi ; les balises
    de partage ensuite ; la lecture propre a chaque source enfin ; et ce que
    dit l'adresse pour combler. */
export function lireLaPage(html: string, lien: string): SoireeLue {
  const { source, ref } = sourceDuLien(lien);
  const seul = lireLeLienSeul(lien);
  const ld = evenementsLd(html)[0];
  const deLd = ld ? depuisLd(ld) : {};
  const ogTitre = meta(html, 'og:title');
  const ogDescription = meta(html, 'og:description');
  const ogImage = meta(html, 'og:image');

  let propre: Partial<SoireeLue> = {};
  if (source === 'facebook') {
    const p = ogDescription ? phraseFacebook(ogDescription) : null;
    /* La page de connexion n'est pas une soiree : son titre est « Log in or
       sign up to view ». */
    const connexion = ogTitre ? /log in|connectez-vous/i.test(ogTitre) : true;
    propre = connexion
      ? {}
      : {
          titre: ogTitre,
          jour: p?.jour ?? null,
          heure: p?.heure ?? null,
          ville: p?.ville ?? null,
          organisateur: p?.organisateur ?? null,
          adresse: adresseFacebook(meta(html, 'og:url')),
          affiche: ogImage,
          /* La phrase d'apercu n'est pas une description : elle redit le
             jour et l'organisateur. On n'en garde rien comme texte. */
          description: null,
        };
  } else if (source === 'lepointdevente' && ogTitre) {
    const d = decouperTitre(ogTitre);
    const h = /\b([01]?\d|2[0-3])\s?h\s?([0-5]\d)\b/.exec(texteNu(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')));
    propre = {
      titre: d.titre,
      organisateur: d.organisateur,
      lieu: d.lieu,
      ville: d.ville,
      jour: dateDe(ref ?? '', ogTitre),
      heure: h ? `${String(h[1]).padStart(2, '0')}:${h[2]}` : null,
    };
  }

  const choisir = <K extends keyof SoireeLue>(cle: K): SoireeLue[K] | null => {
    for (const x of [deLd[cle], propre[cle]]) {
      if (Array.isArray(x) ? x.length > 0 : x != null && x !== '') return x as SoireeLue[K];
    }
    return null;
  };
  const generique = source !== 'facebook';
  const description = choisir('description') ?? (generique ? ogDescription : null);
  return {
    titre: choisir('titre') ?? (generique ? ogTitre : null) ?? seul.titre,
    jour: choisir('jour') ?? seul.jour,
    heure: choisir('heure'),
    lieu: choisir('lieu'),
    adresse: choisir('adresse'),
    ville: choisir('ville'),
    artistes: (choisir('artistes') as string[] | null) ?? [],
    genres: (choisir('genres') as string[] | null) ?? [],
    description: description ? description.slice(0, 2000) : null,
    organisateur: choisir('organisateur'),
    prix: choisir('prix'),
    affiche: choisir('affiche') ?? (generique ? ogImage : null),
    lien,
    source,
    ref,
  };
}
