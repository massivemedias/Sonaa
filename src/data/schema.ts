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

export const parentSchema = z.strictObject({
  id: genreId,
  family: familyId,
  confidence
});

export const trackSchema = z.strictObject({
  /** 11 caractères, l'identifiant public d'une vidéo YouTube. */
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  artist: z.string().min(1),
  title: z.string().min(1),
  year: z.number().int().min(1960).max(2030).nullable(),
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
      source: z.enum(['deezer', 'itunes', 'youtube']),
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
  /* Morceau CHARNIÈRE : il appartient à plusieurs genres, et c'est une
     information, pas une anomalie. « Acperience 1 » est à la fois de l'acid
     techno et de l'acid trance, c'est précisément ce qui le rend intéressant.
     `shared` liste les AUTRES genres qui le revendiquent. Le même identifiant
     doit alors figurer dans chacun, chacun déclarant les autres : un partage
     non réciproque est une erreur de validation. */
  shared: z.array(genreId).optional()
});

export const genreSchema = z.strictObject({
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
  redaction: z.enum(['brouillon']).optional()
});

export const familySchema = z.strictObject({
  id: familyId,
  label: z.string().min(1),
  hue: z.number().min(0).max(360)
});

/* Deux listes par genre, comme prévu depuis le départ (ADR-026).

   `essentiel` : les fondateurs du genre, toutes époques. C'est ce qu'on sait
   remplir sans clé, par recherche puis vérification oEmbed.

   `actuel` : les sorties récentes triées par écoutes. Cela demande la YouTube
   Data API, donc une clé, donc un secret d'intégration continue. La liste
   existe dès maintenant et reste vide : l'onglet ne s'affiche que si elle
   contient quelque chose, ce qui évite de promettre une vue morte. */
export const trackListsSchema = z.strictObject({
  essentiel: z.array(trackSchema),
  actuel: z.array(trackSchema)
});

export const corpusSchema = z
  .strictObject({
    version: z.literal(1),
    families: z.array(familySchema).length(FAMILY_IDS.length),
    genres: z.array(genreSchema.extend({ tracks: trackListsSchema })).min(1)
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

    /* Un identifiant de vidéo n'apparaît qu'une fois par genre, et s'il
       apparaît dans plusieurs genres, le partage doit être DÉCLARÉ des deux
       côtés par `shared`. Un morceau charnière est une fonctionnalité ; un
       doublon silencieux reste presque toujours une compilation ou un mix pris
       pour un morceau, et reste une erreur. */
    const claims = new Map<string, { genre: string; shared: Set<string> }[]>();
    for (const g of doc.genres) {
      for (const t of [...g.tracks.essentiel, ...g.tracks.actuel]) {
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
