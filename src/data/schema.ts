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
  'industrial'
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
  /* Pochette figée au build. `source` dit d'où vient l'image, pour qu'on ne
     confonde jamais une vraie pochette avec une vignette de vidéo. `local` est
     le chemin servi par le site lui-même : aucun appel tiers au runtime. */
  cover: z
    .strictObject({
      url: z.string().url(),
      source: z.enum(['itunes', 'youtube']),
      local: z.string().startsWith('covers/')
    })
    .optional(),
  /* iTunes donne l'album, pas le label de disque : le label demanderait un
     jeton Discogs. On affiche donc l'album, en le nommant pour ce qu'il est. */
  album: z.string().optional()
});

export const genreSchema = z.strictObject({
  id: genreId,
  label: z.string().min(1),
  family: familyId,
  /** `null` pour le fondateur d'une famille. Sinon, doit figurer dans `parents`. */
  structuralParent: genreId.nullable(),
  parents: z.array(parentSchema),
  confidence,
  /** Intervalle, pas une valeur : un genre à tempo variable est la règle. */
  bpm: z.tuple([z.number().int().min(60).max(220), z.number().int().min(60).max(220)]),
  /** Étiqueté par défaut quand la famille est déployée. */
  major: z.boolean(),
  note: z.string(),
  /* Autres noms du genre, pour la recherche. Repris du champ `aka` d'Ishkur v3,
     filtrés : un alias qui est le nom d'un AUTRE genre du corpus est écarté,
     sinon la recherche saute sur le mauvais noeud. Ishkur donne par exemple
     « Detroit Techno » comme alias de Minimal Techno, ce qui est son ancêtre. */
  aliases: z.array(z.string().min(2)).optional()
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
      if (!g.parents.some((p) => p.id === g.structuralParent)) {
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

    /* Un identifiant de vidéo ne doit apparaître qu'une fois dans tout le
       corpus. Le même identifiant sur deux genres est presque toujours une
       compilation ou un mix pris pour un morceau. */
    const seenVideo = new Map<string, string>();
    for (const g of doc.genres) {
      for (const t of [...g.tracks.essentiel, ...g.tracks.actuel]) {
        const owner = seenVideo.get(t.youtubeId);
        if (owner !== undefined && owner !== g.id) {
          fail(`identifiant ${t.youtubeId} partagé entre ${owner} et ${g.id}`, ['genres']);
        }
        seenVideo.set(t.youtubeId, g.id);
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
