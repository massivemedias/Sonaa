/* Schéma du corpus SONAA. Minimal : uniquement ce qui porte les 60 genres.

   Deux principes, tous deux non négociables.

   1. Le DAG est la vérité, l'arbre est une vue (ADR-030). `parents` porte
      TOUTES les ascendances, y compris celles qui traversent une famille.
      `structuralParent` désigne explicitement celle qui positionne le noeud
      dans l'arbre. Le choix est nommé, jamais déduit d'un ordre de tableau.

   2. Aucun identifiant YouTube inventé (ADR-006). `verified` ne peut valoir que
      `true` : un identifiant non vérifié n'entre pas dans le fichier. La
      vérification se fait par l'endpoint oEmbed public, sans clé, et un
      identifiant qui ne répond pas 200 est retiré, jamais marqué faux. */

import { z } from 'zod';

export const FAMILY_IDS = [
  'disco',
  'house',
  'techno',
  'minimal',
  'trance',
  'psy',
  /* Ajoutée pour résoudre les quatre greffes EBM qui restaient déclarées mais
     non résolues : Dark Disco, Industrial Techno, Trance et Goa Trance. */
  'industrial',
  /* Vague 1 : la racine commune. Sans elle, Disco, Industrial et Techno
     n'avaient aucun ancetre et l'atlas etait structurellement faux. */
  'roots',
  /* Vague 2 : la lignee britannique. Sans elle, SONAA racontait une histoire
     uniquement continentale et americaine. */
  'breaks',
  'bass',
  /* Vague 3. Quatorze familles au total : c'est le plafond que la palette peut
     porter, avec un ecart minimal de 22 degres et la zone olive-kaki exclue. */
  'electro',
  'hardcore',
  'ambient',
  'downtempo'
] as const;
export type FamilyId = (typeof FAMILY_IDS)[number];

const familyId = z.enum(FAMILY_IDS);
const genreId = z.string().regex(/^[a-z0-9]+$/, 'identifiant en minuscules sans séparateur');

/** `debated` quand deux sources se contredisent. La note dit laquelle a été suivie. */
export const confidence = z.enum(['established', 'debated']);

const parentSchema = z.strictObject({
  id: genreId,
  family: familyId,
  confidence
});

const trackSchema = z.strictObject({
  /** 11 caractères, l'identifiant public d'une vidéo YouTube. */
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  artist: z.string().min(1),
  title: z.string().min(1),
  year: z.number().int().min(1948).max(2030).nullable(),
  /** Toujours vrai. Un identifiant non vérifié n'a pas le droit d'exister. */
  verified: z.literal(true),
  /* La vidéo dépasse le plafond de quinze minutes ET aucune base publique ne
     donne la durée canonique de la piste : impossible de dire si c'est une
     pièce réellement longue ou l'album entier.

     Ce champ existe pour qu'une passe future ne prenne pas ces entrées pour
     vérifiées. Absent partout ailleurs, ce qui veut dire soit mesuré et
     conforme, soit sous le plafond. */
  dureeNonVerifiee: z.literal(true).optional(),
  /* Pochette figée au build. `source` dit d'où vient l'image, pour qu'on ne
     confonde jamais une vraie pochette avec une vignette de vidéo. `local` est
     le chemin servi par le site lui-même : aucun appel tiers au runtime. */
  cover: z
    .strictObject({
      url: z.string().url(),
      /* DISCOGS EST UNE TROISIEME SOURCE, arrivee apres Deezer et iTunes.
         Ces deux-la couvrent le catalogue commercial ; Discogs est une base
         de PRESSAGES, donc la ou vivent les 12 pouces de niche que cet atlas
         collectionne. La provenance reste enregistree parce que
         l'interface s'en sert : une vignette YouTube est une capture video et
         non une pochette, elle est donc ecartee a l'affichage. */
      source: z.enum(['deezer', 'itunes', 'youtube', 'discogs']),
      local: z.string().startsWith('covers/')
    })
    .optional(),
  /* iTunes donne l'album, pas le label de disque : le label demanderait un
     jeton Discogs. On affiche donc l'album, en le nommant pour ce qu'il est. */
  album: z.string().optional(),
  /* Sortie ORIGINALE, relevée sur Discogs (scripts/fetch-release-data.ts).
     Correspondance exigeante : une donnée fausse est pire qu'aucune, chaque
     champ peut donc manquer. Remplace l'album quand elle existe. */
  release: z
    .strictObject({
      label: z.string().nullable(),
      catno: z.string().nullable(),
      country: z.string().nullable(),
      year: z.number().int().min(1940).max(2030).nullable(),
      format: z.string().nullable()
    })
    .optional(),
  /* Tonalité RELEVÉE (GetSongKey), jamais déduite d'une analyse ni inventée.
     Absente le plus souvent : le champ ne s'affiche que quand il existe. */
  key: z.string().optional(),
  /* LE ROLE DE LA TRACK DANS SON GENRE. Un ROLE, jamais une date : « origine »
     ne veut pas dire « la plus ancienne », et c'est tout l'objet du champ.

     `origine` : le morceau qui fonde le genre. Au plus un par genre, et il ne
     se deduit d'aucune regle. Aucun classement automatique ne peut savoir que
     « Cinq etudes de bruits » fonde la musique concrete, il faut le savoir.
     Absent sur la quasi-totalite du corpus, et c'est l'etat normal : Mika le
     renseigne au fil du temps, les visiteurs peuvent le proposer.

     `canon` : une reference etablie du genre, toutes epoques confondues.

     Absent : une sortie parmi d'autres. Ce n'est pas un defaut de saisie, la
     plupart des tracks n'ont pas de role particulier. */
  role: z.enum(['origine', 'canon']).optional(),

  /* Morceau CHARNIÈRE : il appartient à plusieurs genres, et c'est une
     information, pas une anomalie. « Acperience 1 » est à la fois de l'acid
     techno et de l'acid trance, c'est précisément ce qui le rend intéressant.
     `shared` liste les AUTRES genres qui le revendiquent. Le même identifiant
     doit alors figurer dans chacun, chacun déclarant les autres : un partage
     non réciproque est une erreur de validation. */
  shared: z.array(genreId).optional()
});

const genreSchema = z.strictObject({
  id: genreId,
  label: z.string().min(1),
  family: familyId,
  /** `null` pour le fondateur d'une famille. Sinon, doit figurer dans `parents`. */
  structuralParent: genreId.nullable(),
  /* Rattachement PUREMENT structurel : le noeud est placé sous ce parent pour
     tenir dans un arbre, mais ce n'est PAS une filiation.

     Le cas est réel et il fallait le nommer. La famille roots réunit les
     ancêtres des musiques électroniques, et son fondateur est la musique
     concrète. Or le funk et le dub ne descendent pas de la musique concrète :
     ce sont des racines parallèles. Le schéma exige un fondateur unique par
     famille, donc il faut bien accrocher ces noeuds quelque part. Plutôt
     qu'inventer une arête fausse, on la déclare conventionnelle, `parents`
     reste vide, et l'interface écrit « rattaché à » et non « vient de ». */
  structuralOnly: z.boolean().optional(),
  parents: z.array(parentSchema),
  /* LA DATE D'ORIGINE DOCUMENTEE, saisie a la main.

     POURQUOI ELLE EXISTE. La date etait DEDUITE du plus ancien enregistrement
     du genre dans le corpus. Cette methode s'effondre aux deux bouts, et la
     mesure sur les vingt genres les plus anciens l'a montre dans les DEUX sens.

     Trop tard : la musique concrete naissait en 1963 au lieu de 1948, faute
     d'un enregistrement de 1948 dans le corpus. La deduction ne peut pas
     trouver ce qui n'y est pas.

     Trop tot, et personne ne l'attendait : le breakbeat naissait en 1969 parce
     que son morceau de reference est « Amen, Brother », c'est-a-dire le break
     lui-meme. Un ancetre samplE pris pour un acte de naissance.

     LA REGLE, POSEE PAR MIKA : un genre nait quand la SCENE le produit, pas
     quand son materiau existe. Elle vaut partout dans le corpus.

     Absent, on garde la deduction et l'interface ecrit « vers ». Present, il
     prime, et l'annee s'affiche sans reserve. */
  yearStart: z.number().int().min(1900).max(2030).optional(),
  confidence,
  /* Intervalle, pas une valeur : un genre à tempo variable est la règle.

     `null` pour les genres qui n'ont pas de tempo du tout. Ce n'est pas un trou
     dans les données : la musique concrète, l'électroacoustique et le space
     music ne se comptent pas en battements par minute, et leur donner un
     intervalle serait une invention. L'interface n'affiche alors rien. */
  bpm: z
    .tuple([z.number().int().min(40).max(320), z.number().int().min(40).max(320)])
    .nullable(),
  /** Étiqueté par défaut quand la famille est déployée. */
  major: z.boolean(),
  note: z.string(),
  /* Autres noms du genre, pour la recherche. Repris des sources documentaires
     et filtrés : un alias qui est le nom d'un AUTRE genre du corpus est écarté,
     sinon la recherche saute sur le mauvais noeud. Une source donnait par
     exemple « Detroit Techno » comme alias de Minimal Techno, son ancêtre. */
  aliases: z.array(z.string().min(2)).optional(),

  /* LA FICHE ENRICHIE, le vrai contenu du site (mission d'août 2026).

     `description` : trois à cinq phrases, ton d'auteur, factuel. D'où il
     vient, ce qui le distingue à l'oreille, ce qui a changé quand il est
     apparu. Aucun superlatif creux.
     `machines` : instruments et machines caractéristiques, précis. C'est ce
     que les producteurs viennent chercher.
     `labelsActuels` VIDE quand le genre est éteint : c'est une information
     en soi, l'interface l'écrit au lieu de la cacher.
     `redaction: 'brouillon'` : fiche écrite par la machine sur un terrain
     réservé à Mika, à relire avant d'en retirer la marque. */
  description: z.string().min(80).optional(),
  machines: z.array(z.string().min(2)).optional(),
  labelsHistoriques: z.array(z.string().min(2)).optional(),
  labelsActuels: z.array(z.string()).optional(),
  artistesCles: z.array(z.string().min(2)).optional(),
  redaction: z.enum(['brouillon']).optional(),

  /* LE MOT DE L'AUTEUR. Distinct de `description`, qui dit ce que le genre
     est et se veut verifiable : celui-ci porte un point de vue assume, a la
     premiere personne, et il est signe a l'affichage pour qu'on ne les
     confonde pas.

     Optionnel et vide presque partout, deliberement : une voix qui parle sur
     les 218 genres ne dit plus rien. */
  motDeLAuteur: z.string().optional(),

  /* L'ARTICLE LONG, en sections titrees.

     `description` est un chapeau : trois a cinq phrases qui disent ce qu'est
     le genre. `article` est ce qu'on vient LIRE quand on veut savoir
     comment ce son se fabrique, d'ou il vient et ou il mene. Les deux
     coexistent parce qu'ils ne servent pas au meme moment : le chapeau se lit
     en passant, l'article se lit assis.

     LE MARQUEUR `redaction: 'brouillon'` VAUT POUR LUI AUSSI, et c'est la
     seule facon honnete de publier un texte que la machine a ecrit. Un
     article non relu par Mika porte la marque et l'affiche ; il ne se fait
     pas passer pour sa prose. La marque se retire a la relecture, pas avant.

     Minimum de 400 caracteres par section : en dessous, ce n'est pas une
     section d'article, c'est une ligne de fiche technique, et elle a deja sa
     place ailleurs. */
  article: z
    .array(
      z.object({
        titre: z.string().min(3),
        texte: z.string().min(400)
      })
    )
    .min(2)
    .optional(),

  /* LE TUTO DE FABRICATION, distinct de l'article.

     L'article raconte D'OU VIENT un son : la ville, les gens, les labels, la
     date. Le tuto dit COMMENT ON LE FAIT : le tempo, les machines, l'ordre
     des gestes, ce qui rate quand on s'y prend mal. Deux lectures
     differentes, pour deux moments differents. Melanger les deux donne un
     texte que ni le curieux ni le producteur ne lit jusqu'au bout.

     Sections plus courtes que celles de l'article : 200 signes suffisent pour
     une etape de fabrication, alors qu'une section d'histoire qui n'atteint
     pas 400 n'est qu'une ligne de fiche technique.

     Meme regle de brouillon : un tuto ecrit par la machine porte la marque
     jusqu'a relecture. */
  tuto: z
    .array(
      z.object({
        titre: z.string().min(3),
        texte: z.string().min(200)
      })
    )
    .min(2)
    .optional()
});

const familySchema = z.strictObject({
  id: familyId,
  label: z.string().min(1),
  hue: z.number().min(0).max(360),
  /* LE TEXTE D'UNE FAMILLE, distinct de celui d'un genre.

     Un genre repond a « qu'est-ce que c'est » ; une famille repond a « qu'
     est-ce qui reunit ces vingt-quatre genres et pourquoi ils sont ensemble ».
     Sans lui, la page d'une famille n'etait qu'une grille : on savait combien
     de genres, jamais ce qu'ils avaient en commun.

     Meme regle que pour les genres : `redaction: 'brouillon'` marque un texte
     ecrit par la machine et non encore relu, et la marque s'affiche. */
  description: z.string().min(120).optional(),
  redaction: z.enum(['brouillon']).optional()
});

/* UNE SEULE LISTE PAR GENRE, ET UN ATTRIBUT DE ROLE (aout 2026).

   IL Y EN AVAIT DEUX, `essentiel` et `actuel`, et la separation etait fausse.
   Elle melangeait deux questions qui n'ont rien a voir : l'importance d'un
   morceau dans son genre, et sa date de sortie. Une reference de 2024 n'avait
   pas de place, un morceau fondateur passait pour une nouveaute.

   La distinction utile est un ROLE porte par la track, pas une liste qui la
   contient : `origine` pour le morceau fondateur, `canon` pour une reference
   etablie, rien pour les autres. Un morceau peut ainsi etre a la fois recent
   et canonique, ce que deux listes rendaient impossible a dire.

   L'ORDRE EST CHRONOLOGIQUE, annees inconnues en fin de liste. Il raconte le
   genre dans le sens ou il s'est fait, et le role se lit par un signe et non
   par une position. */
const trackListSchema = z.array(trackSchema);

export const corpusSchema = z
  .strictObject({
    version: z.literal(1),
    families: z.array(familySchema).length(FAMILY_IDS.length),
    genres: z.array(genreSchema.extend({ tracks: trackListSchema })).min(1)
  })
  .check((ctx) => {
    const doc = ctx.value;
    const byId = new Map(doc.genres.map((g) => [g.id, g]));
    const fail = (message: string, path: (string | number)[]): void => {
      ctx.issues.push({ code: 'custom', message, path, input: doc });
    };

    if (byId.size !== doc.genres.length) fail('identifiants de genres en double', ['genres']);

    doc.genres.forEach((g, i) => {
      // Références résolues.
      for (const [j, p] of g.parents.entries()) {
        const target = byId.get(p.id);
        if (!target) {
          fail(`parent inconnu : ${p.id}`, ['genres', i, 'parents', j, 'id']);
        } else if (target.family !== p.family) {
          fail(
            `le parent ${p.id} est déclaré dans la famille ${p.family} mais appartient à ${target.family}`,
            ['genres', i, 'parents', j, 'family']
          );
        }
      }

      // Le parent structurel doit être l'un des parents, et de la même famille.
      if (g.structuralParent === null) return;
      const structural = byId.get(g.structuralParent);
      if (!structural) {
        fail(`parent structurel inconnu : ${g.structuralParent}`, ['genres', i, 'structuralParent']);
        return;
      }
      /* Un rattachement conventionnel est dispensé de figurer dans `parents` :
         c'est tout son objet. En revanche il doit rester dans la famille. */
      if (!g.structuralOnly && !g.parents.some((p) => p.id === g.structuralParent)) {
        fail('le parent structurel doit aussi figurer dans parents', ['genres', i, 'structuralParent']);
      }
      if (structural.family !== g.family) {
        fail(
          `le parent structurel doit être de la même famille : ${structural.family} au lieu de ${g.family}`,
          ['genres', i, 'structuralParent']
        );
      }
    });

    // Exactement un fondateur par famille.
    for (const family of FAMILY_IDS) {
      const founders = doc.genres.filter((g) => g.family === family && g.structuralParent === null);
      if (founders.length !== 1) {
        fail(`la famille ${family} a ${founders.length} fondateurs, il en faut exactement un`, ['genres']);
      }
    }

    // Aucun cycle, et trois générations minimum par famille.
    const depthOf = new Map<string, number>();
    const resolve = (id: string, seen: Set<string>): number => {
      const cached = depthOf.get(id);
      if (cached !== undefined) return cached;
      if (seen.has(id)) {
        fail(`cycle de filiation sur ${id}`, ['genres']);
        return 0;
      }
      seen.add(id);
      const g = byId.get(id);
      const parent = g?.structuralParent;
      const d = parent ? resolve(parent, seen) + 1 : 0;
      depthOf.set(id, d);
      return d;
    };
    for (const g of doc.genres) resolve(g.id, new Set());

    /* AU PLUS UNE ORIGINE PAR GENRE. Le role dit « le morceau qui a fonde ce
       genre » : au pluriel il ne veut plus rien dire, et deux origines sont
       toujours une saisie faite deux fois plutot qu'une decision. La regle est
       ici et non dans un script, pour qu'elle vaille aussi sur ce qu'un
       visiteur proposera. */
    for (const [i, g] of doc.genres.entries()) {
      const origines = g.tracks.filter((t) => t.role === 'origine');
      if (origines.length > 1) {
        fail(
          `${g.id} a ${origines.length} morceaux d'origine, il en faut au plus un : ` +
            origines.map((t) => `${t.artist} - ${t.title}`).join(', '),
          ['genres', i, 'tracks']
        );
      }
    }

    /* Un identifiant de vidéo n'apparaît qu'une fois par genre, et s'il
       apparaît dans plusieurs genres, le partage doit être DÉCLARÉ des deux
       côtés par `shared`. Un morceau charnière est une fonctionnalité ; un
       doublon silencieux reste presque toujours une compilation ou un mix pris
       pour un morceau, et reste une erreur. */
    const claims = new Map<string, { genre: string; shared: Set<string> }[]>();
    for (const g of doc.genres) {
      for (const t of g.tracks) {
        const list = claims.get(t.youtubeId) ?? [];
        list.push({ genre: g.id, shared: new Set(t.shared ?? []) });
        claims.set(t.youtubeId, list);
      }
    }
    for (const [videoId, holders] of claims) {
      if (holders.length === 1) {
        const holder = holders[0];
        if (holder && holder.shared.size > 0) {
          fail(
            `identifiant ${videoId} : ${holder.genre} déclare un partage avec ` +
              `${[...holder.shared].join(', ')} mais est seul à porter le morceau`,
            ['genres']
          );
        }
        continue;
      }
      const ids = holders.map((h) => h.genre);
      if (new Set(ids).size !== ids.length) {
        fail(`identifiant ${videoId} présent deux fois dans un même genre`, ['genres']);
        continue;
      }
      for (const holder of holders) {
        const others = ids.filter((x) => x !== holder.genre);
        for (const other of others) {
          if (!holder.shared.has(other)) {
            fail(
              `identifiant ${videoId} partagé entre ${ids.join(' et ')} sans déclaration : ` +
                `${holder.genre} doit porter shared: [${others.map((x) => `"${x}"`).join(', ')}]`,
              ['genres']
            );
          }
        }
        for (const declared of holder.shared) {
          if (!ids.includes(declared)) {
            fail(
              `identifiant ${videoId} : ${holder.genre} déclare un partage avec ${declared}, ` +
                `qui ne porte pas le morceau`,
              ['genres']
            );
          }
        }
      }
    }

    for (const family of FAMILY_IDS) {
      const genres = doc.genres.filter((g) => g.family === family);
      const deepest = genres.reduce((m, g) => Math.max(m, depthOf.get(g.id) ?? 0), 0);
      if (deepest < 2) {
        fail(`la famille ${family} n'a que ${deepest + 1} génération(s), il en faut 3`, ['genres']);
      }
      if (!genres.some((g) => g.major)) {
        fail(`la famille ${family} n'a aucun genre majeur`, ['genres']);
      }
    }
  });

export type Corpus = z.infer<typeof corpusSchema>;
export type CorpusGenre = Corpus['genres'][number];
