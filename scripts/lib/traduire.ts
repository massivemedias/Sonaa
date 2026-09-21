/* TRADUIRE LES TITRES ET LES RESUMES DES NEWS, A LA MOISSON.
 *
 * Mika, le 17 septembre 2026 : « FR voit du FR traduit, EN voit l'original ».
 * Dix-neuf des vingt et un magazines moissonnes ecrivent en anglais ; un
 * lecteur francophone lisait donc une page francaise remplie de titres
 * anglais.
 *
 * CE QUI EST TRADUIT, ET RIEN D'AUTRE : le titre et le resume, soit 255
 * signes par article, l'extrait que le magazine publie lui-meme dans son
 * flux. Le corps de l'article n'est pas traduit, il reste dans sa langue
 * d'origine (arbitrage de Mika, voir docs/NEWS-TRADUCTION.md).
 *
 * LE JARGON EST LE VRAI SUJET, PAS LA GRAMMAIRE. « Warehouse label drops
 * four-on-the-floor EP » n'a qu'une bonne traduction, celle qui ne traduit
 * presque rien. Un traducteur automatique classique rend « label » par
 * etiquette et « warehouse » par entrepot ; c'est pour cela qu'on passe par
 * un modele a qui l'on peut donner la liste des mots a laisser tranquilles,
 * et non par une API de traduction.
 *
 * RIEN N'EST JAMAIS RETRADUIT. La moisson reprend les traductions du fichier
 * precedent et n'envoie que les articles nouveaux, une vingtaine par passe.
 * Sans cela, on repaierait cent soixante articles a chaque passe.
 *
 * UN ECHEC NE FAIT PAS TOMBER LA MOISSON. Sans cle, ou si l'appel echoue,
 * les articles sont ecrits sans traduction et s'affichent en anglais. Une
 * news anglaise est un moindre mal ; une moisson qui s'arrete en est un
 * vrai. */

export const MODELE = 'claude-haiku-4-5-20251001';

/** Vingt par appel : assez pour amortir la consigne, assez peu pour qu'un
    lot rate ne coute qu'un vingtieme de la passe. */
export const PAR_LOT = 20;

/* CE QUE LA PASSE A COUTE, ECRIT DANS LE JOURNAL.
 *
 * Une facture qui n'arrive qu'en fin de mois ne dit pas quelle passe l'a
 * gonflee. Le modele rend le compte des tokens a chaque appel : on l'additionne
 * et on l'imprime, donc le journal de chaque moisson porte son propre prix.
 *
 * Tarif Haiku 4.5 releve le 21 septembre 2026, en USD par million de tokens. */
export const PRIX_ENTREE = 1;
export const PRIX_SORTIE = 5;

/** Le prix d'une passe, en USD. */
export function cout(entree: number, sortie: number): number {
  return (entree * PRIX_ENTREE + sortie * PRIX_SORTIE) / 1_000_000;
}

/** Le compte d'une passe : ce qui est parti, ce qui est revenu, ce que ca vaut. */
export interface Compte {
  readonly lots: number;
  readonly entree: number;
  readonly sortie: number;
  readonly usd: number;
}

export interface ATraduire {
  readonly lien: string;
  readonly titre: string;
  readonly resume: string;
}

export interface Traduction {
  readonly titre: string;
  readonly resume: string;
}

/* LES MOTS QU'ON NE TRADUIT PAS. Ce ne sont pas des anglicismes tolerés,
   c'est le vocabulaire de metier : un producteur francophone dit un kick, un
   label, un EP, et personne n'ecrit « quatre au plancher ». La liste est
   citee dans la consigne, elle n'est pas appliquee par une substitution :
   c'est au modele de savoir que « label » dans un titre de magazine de
   musique designe une maison de disques. */
export const MOTS_GARDES = [
  'BPM', 'EP', 'LP', 'remix', 'label', 'warehouse', 'four-on-the-floor',
  'kick', 'snare', 'hi-hat', 'drop', 'break', 'sidechain', 'groove', 'set',
  'live', 'sample', 'preset', 'plugin', 'master', 'mastering', 'mixdown',
  'bassline', 'lineup', 'track', 'DJ', 'B2B', 'rave', 'club', 'dancefloor',
];

export function consigne(): string {
  return [
    'Tu traduis en français des titres et des résumés de magazines de musique électronique, pour un site montréalais.',
    '',
    'Règles, dans cet ordre de priorité :',
    `1. Ne traduis JAMAIS le vocabulaire de métier : ${MOTS_GARDES.join(', ')}, et tous les noms de genres (techno, house, drum and bass, dub techno...).`,
    '2. Ne traduis jamais un nom propre : artistes, labels, machines, logiciels, salles, festivals, villes. Garde la graphie exacte.',
    '3. Garde le ton du titre. Un titre de magazine est court et frappe ; ne le rallonge pas, ne l\'explique pas, n\'ajoute pas de mot.',
    '4. Si une phrase est déjà en français, rends-la telle quelle.',
    '5. N\'utilise jamais de tiret cadratin ni de demi-cadratin. Virgule, deux-points ou point.',
    '6. Écris avec les accents, et avec les apostrophes typographiques.',
    '',
    'Réponds UNIQUEMENT par un tableau JSON, sans texte autour et sans bloc de code.',
    'Chaque élément : {"i": <le numéro donné>, "titre": "...", "resume": "..."}.',
    'Un élément par entrée reçue, dans le même ordre, sans en omettre aucun.',
  ].join('\n');
}

/* ═══ LE CORPS D'UN ARTICLE, MEME GLOSSAIRE, AUTRE FORME ═══
 *
 * Les titres et les resumes partent par lots a la moisson ; le corps, lui,
 * ne part qu'a la demande, quand quelqu'un ouvre l'article en francais. Ce
 * sont deux moments et deux formes de reponse, mais UNE SEULE liste de mots
 * a ne pas traduire : c'est elle qui fait la difference entre un texte de
 * metier et une traduction automatique, et elle ne doit exister qu'une fois.
 *
 * Voir worker/src/index.ts, route api/article-flux. */
export function consigneCorps(): string {
  return [
    "Tu traduis en français le corps d'un article de magazine de musique électronique, pour un site montréalais.",
    '',
    'Règles, dans cet ordre de priorité :',
    `1. Ne traduis JAMAIS le vocabulaire de métier : ${MOTS_GARDES.join(', ')}, et tous les noms de genres (techno, house, drum and bass, dub techno...).`,
    '2. Ne traduis jamais un nom propre : artistes, labels, machines, logiciels, salles, festivals, villes. Garde la graphie exacte.',
    '3. Traduis bloc par bloc, sans en fusionner ni en couper aucun, sans rien résumer et sans rien ajouter.',
    '4. Si un bloc est déjà en français, rends-le tel quel.',
    "5. N'utilise jamais de tiret cadratin ni de demi-cadratin. Virgule, deux-points ou point.",
    '6. Écris avec les accents, et avec les apostrophes typographiques.',
    '',
    'Réponds UNIQUEMENT par un tableau JSON de chaînes, sans texte autour et sans bloc de code.',
    "Autant d'éléments que de blocs reçus, dans le même ordre.",
  ].join('\n');
}

/** Les blocs traduits, ou une liste vide si la reponse n'a pas la forme
    attendue. L'appelant garde alors l'original, ce qui est l'etat d'avant. */
export function lireReponseCorps(texte: string, attendus: number): string[] {
  const debut = texte.indexOf('[');
  const fin = texte.lastIndexOf(']');
  if (debut === -1 || fin <= debut) return [];
  try {
    const lu: unknown = JSON.parse(texte.slice(debut, fin + 1));
    if (!Array.isArray(lu)) return [];
    const blocs = lu.map((x) => (typeof x === 'string' ? x : ''));
    /* UNE TRADUCTION PARTIELLE N'EN EST PAS UNE. Si le modele a fusionne ou
       oublie des blocs, l'article s'afficherait amoute sans que personne le
       sache : on rend l'original entier plutot qu'un texte tronque. */
    return blocs.length === attendus && blocs.every((b) => b !== '') ? blocs : [];
  } catch {
    return [];
  }
}

/** Le lot mis en forme pour le modele : numerote, sans les adresses, qui ne
    servent a rien a la traduction et que le modele pourrait abimer. */
export function demande(lot: readonly ATraduire[]): string {
  return JSON.stringify(
    lot.map((a, i) => ({ i, titre: a.titre, resume: a.resume })),
    null,
    1
  );
}

/* LA REPONSE EST LUE, PAS CRUE.
 *
 * Un modele repond parfois avec une phrase avant le tableau, ou dans un bloc
 * de code, ou en oubliant une entree. On extrait le premier tableau JSON, on
 * ne garde que les elements dont le numero designe une entree du lot, et on
 * laisse tomber le reste sans bruit : un article non traduit s'affichera en
 * anglais, ce qui est l'etat d'avant. */
export function lireReponse(texte: string, lot: readonly ATraduire[]): Map<string, Traduction> {
  const sorties = new Map<string, Traduction>();
  const debut = texte.indexOf('[');
  const fin = texte.lastIndexOf(']');
  if (debut === -1 || fin <= debut) return sorties;
  let lu: unknown;
  try {
    lu = JSON.parse(texte.slice(debut, fin + 1));
  } catch {
    return sorties;
  }
  if (!Array.isArray(lu)) return sorties;
  for (const e of lu) {
    if (typeof e !== 'object' || e === null) continue;
    const o = e as Record<string, unknown>;
    const i = typeof o['i'] === 'number' ? o['i'] : Number.NaN;
    const article = lot[i];
    if (!article) continue;
    const titre = typeof o['titre'] === 'string' ? o['titre'].trim() : '';
    const resume = typeof o['resume'] === 'string' ? o['resume'].trim() : '';
    /* UN TITRE VIDE N'EST PAS UNE TRADUCTION. Le resume, lui, a le droit
       d'etre vide : douze articles sur cent soixante n'en ont pas. */
    if (!titre) continue;
    sorties.set(article.lien, { titre, resume });
  }
  return sorties;
}

/* Un appel, un lot. Interne : tout passe par `traduire`, qui decoupe et
   encaisse les echecs. */
async function traduireUnLot(
  lot: readonly ATraduire[],
  cle: string
): Promise<{ sorties: Map<string, Traduction>; entree: number; sortie: number }> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': cle,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODELE,
      max_tokens: 4000,
      system: consigne(),
      messages: [{ role: 'user', content: demande(lot) }],
    }),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status} ${(await r.text()).slice(0, 200)}`);
  const rep = (await r.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const texte = (rep.content ?? [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('');
  return {
    sorties: lireReponse(texte, lot),
    entree: rep.usage?.input_tokens ?? 0,
    sortie: rep.usage?.output_tokens ?? 0,
  };
}

/** Tous les lots, l'un apres l'autre. Un lot qui echoue est signale et
    n'empeche pas les suivants. Le compte de la passe part par `compte`, qui
    n'est appele qu'une fois, a la fin. */
export async function traduire(
  aTraduire: readonly ATraduire[],
  cle: string,
  journal: (ligne: string) => void = () => {},
  compte: (c: Compte) => void = () => {}
): Promise<Map<string, Traduction>> {
  const tout = new Map<string, Traduction>();
  let lots = 0;
  let entree = 0;
  let sortie = 0;
  for (let i = 0; i < aTraduire.length; i += PAR_LOT) {
    const lot = aTraduire.slice(i, i + PAR_LOT);
    try {
      const rendu = await traduireUnLot(lot, cle);
      for (const [lien, t] of rendu.sorties) tout.set(lien, t);
      lots += 1;
      entree += rendu.entree;
      sortie += rendu.sortie;
      journal(`  lot de ${lot.length} : ${rendu.sorties.size} traduits, ${rendu.entree} + ${rendu.sortie} tokens`);
    } catch (e) {
      journal(`  lot de ${lot.length} : ECHEC, ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  compte({ lots, entree, sortie, usd: cout(entree, sortie) });
  return tout;
}
