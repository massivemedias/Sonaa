import { z } from 'zod';

/* SONAA, schéma des données de genres.
   Ce fichier fait autorité : les types de l'application en sont dérivés, et
   scripts/validate-data.ts bloque la CI sur lui.

   Rappel structurant, DESIGN.md section 2 : un genre n'est pas un point, c'est
   une DURÉE. Il occupe [yearStart, yearEnd] sur l'axe du temps. yearEnd à null
   ne veut pas dire "mort aujourd'hui", il veut dire "toujours vivant", et se
   rend par un segment ouvert qui sort du cadre. Un genre éteint, lui, s'arrête
   franchement sur une barre à son année de fin. Ne jamais confondre les deux. */

export const LANGS = ['fr', 'en', 'es'] as const;
export type Lang = (typeof LANGS)[number];

export const FAMILIES = [
  'roots',
  'disco',
  'house',
  'bass',
  'breaks',
  'hardcore',
  'trance',
  'psy',
  'techno',
  'minimal',
  'ambient',
  'downtempo',
  'electro',
  'industrial'
] as const;
export type FamilyId = (typeof FAMILIES)[number];

/* La seule famille autorisée à contenir des racines, c'est-à-dire des genres
   sans parent : musique concrète, dub, disco, funk, krautrock, synth-pop
   primitive, industrial premier. Tout le reste descend de quelque chose. */
export const ROOT_FAMILY: FamilyId = 'roots';

export const EARLIEST_YEAR = 1948;
export const CURRENT_YEAR = new Date().getFullYear();

/* Écart toléré entre l'apparition d'un enfant et celle de son parent le plus
   ancien. Au-delà, validate-data.ts avertit : soit la date est fausse, soit la
   filiation est discutable et doit être justifiée dans sources. */
export const PARENT_YEAR_TOLERANCE = 2;

const localizedText = (min: number, max: number) =>
  z.strictObject({
    fr: z.string().trim().min(min).max(max),
    en: z.string().trim().min(min).max(max),
    es: z.string().trim().min(min).max(max)
  });

/* Slug kebab-case, stable, jamais renommé : il sert d'URL et de clé d'arête. */
export const genreIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'identifiant kebab-case attendu, par exemple acid-house');

const yearSchema = z.number().int().min(EARLIEST_YEAR).max(CURRENT_YEAR);

/* Une arête typée. Le poids pilote l'épaisseur du trait, donc il porte une
   information : 1 filiation directe et assumée, 0.5 filiation partielle,
   0.25 parenté lointaine ou contestée. */
export const edgeSchema = z.strictObject({
  to: genreIdSchema,
  weight: z.union([z.literal(0.25), z.literal(0.5), z.literal(1)]),
  note: localizedText(1, 240).optional()
});

export type Edge = z.infer<typeof edgeSchema>;

/* Un identifiant YouTube fait onze caractères. La chaîne vide est autorisée et
   signifie "pas encore trouvé" : elle impose verified à false, et le build de
   production retire le morceau. Voir ARCHITECTURE.md ADR-006. */
export const trackSchema = z
  .strictObject({
    artist: z.string().trim().min(1),
    title: z.string().trim().min(1),
    year: yearSchema,
    label: z.string().trim().min(1).optional(),
    youtubeId: z.union([z.literal(''), z.string().regex(/^[A-Za-z0-9_-]{11}$/)]),
    startSeconds: z.number().int().nonnegative().optional(),
    role: z.enum(['origin', 'canonical', 'mutation']),
    verified: z.boolean()
  })
  .refine((track) => !(track.verified && track.youtubeId === ''), {
    error: 'un morceau vérifié ne peut pas avoir un youtubeId vide',
    path: ['verified']
  });

export type Track = z.infer<typeof trackSchema>;

export const originSchema = z.strictObject({
  city: z.string().trim().min(1).optional(),
  country: z.string().trim().min(1),
  scene: z.string().trim().min(1).optional()
});

export const genreSchema = z
  .strictObject({
    id: genreIdSchema,
    name: z.string().trim().min(1),
    aliases: z.array(z.string().trim().min(1)).optional(),
    family: z.enum(FAMILIES),

    /* La géométrie du noeud, pas des métadonnées de panneau. */
    yearStart: yearSchema,
    yearPeak: yearSchema.optional(),
    yearEnd: yearSchema.nullable(),

    origin: originSchema,
    bpm: z.tuple([z.number().int().positive(), z.number().int().positive()]).optional(),

    /* Marqueurs sonores concrets et vérifiables, pas des adjectifs.
       "TB-303 avec résonance poussée" oui, "ambiance hypnotique" non. */
    key_traits: z.array(z.string().trim().min(1)).min(3).max(6),

    description: localizedText(400, 800),

    parents: z.array(edgeSchema),
    influences: z.array(edgeSchema).optional(),

    /* Le lien de rupture : un genre qui se définit CONTRE un autre.
       La minimal contre la trance maximaliste, la gabber contre la house
       consensuelle. Ce n'est pas une filiation inversée, c'est une réaction,
       et elle se rend différemment sur la carte. */
    rejects: z.array(edgeSchema).optional(),

    labels: z.array(z.string().trim().min(1)).optional(),
    artists: z.array(z.string().trim().min(1)).min(3).max(6).optional(),
    tracks: z.array(trackSchema).min(3).max(5),

    /* Passerelle vers un classifieur audio en v1.1. Les styles Discogs sont un
       vocabulaire contrôlé et largement présent dans les jeux de données
       audio, ce qui en fait le point de jonction le moins coûteux entre notre
       taxonomie et une classification automatique. */
    discogsStyles: z.array(z.string().trim().min(1)).min(1),

    /* Visible dès le niveau de zoom L1. Un genre majeur est un genre sans
       lequel la carte de sa famille devient incompréhensible. */
    major: z.boolean(),

    confidence: z.enum(['high', 'medium', 'debated']),
    sources: z.array(z.string().trim().min(1)).min(1)
  })
  .check((ctx) => {
    const g = ctx.value;

    if (g.yearEnd !== null && g.yearEnd < g.yearStart) {
      ctx.issues.push({
        code: 'custom',
        input: g.yearEnd,
        path: ['yearEnd'],
        message: `yearEnd (${g.yearEnd}) est antérieur à yearStart (${g.yearStart})`
      });
    }

    if (g.yearPeak !== undefined) {
      const upperBound = g.yearEnd ?? CURRENT_YEAR;
      if (g.yearPeak < g.yearStart || g.yearPeak > upperBound) {
        ctx.issues.push({
          code: 'custom',
          input: g.yearPeak,
          path: ['yearPeak'],
          message: `yearPeak (${g.yearPeak}) doit tomber entre ${g.yearStart} et ${upperBound}`
        });
      }
    }

    if (g.bpm && g.bpm[0] > g.bpm[1]) {
      ctx.issues.push({
        code: 'custom',
        input: g.bpm,
        path: ['bpm'],
        message: `plage BPM inversée : ${g.bpm[0]} à ${g.bpm[1]}`
      });
    }

    // Aucune arête ne peut pointer vers son propre genre.
    for (const key of ['parents', 'influences', 'rejects'] as const) {
      const edges = g[key];
      if (!edges) continue;

      for (const edge of edges) {
        if (edge.to === g.id) {
          ctx.issues.push({
            code: 'custom',
            input: edge.to,
            path: [key],
            message: `${g.id} se référence lui-même dans ${key}`
          });
        }
      }

      const seen = new Set<string>();
      for (const edge of edges) {
        if (seen.has(edge.to)) {
          ctx.issues.push({
            code: 'custom',
            input: edge.to,
            path: [key],
            message: `${key} contient deux fois la cible ${edge.to}`
          });
        }
        seen.add(edge.to);
      }
    }

    // On ne peut pas descendre d'un genre et se définir contre lui.
    if (g.rejects) {
      const parentIds = new Set(g.parents.map((p) => p.to));
      for (const reject of g.rejects) {
        if (parentIds.has(reject.to)) {
          ctx.issues.push({
            code: 'custom',
            input: reject.to,
            path: ['rejects'],
            message: `${g.id} rejette ${reject.to} tout en le déclarant comme parent`
          });
        }
      }
    }
  });

export type Genre = z.infer<typeof genreSchema>;

export const genreFileSchema = z.array(genreSchema).min(1);

/* Un genre est vivant tant que yearEnd est null. Le rendu doit alors produire
   un segment ouvert, jamais un trait terminé à l'année courante. */
export const isOpenEnded = (genre: Genre): boolean => genre.yearEnd === null;

/* Borne basse du segment sur l'axe, en années. La borne haute est
   genre.yearEnd, ou l'infini visuel si le genre est vivant. */
export const segmentSpan = (genre: Genre): { from: number; to: number | null } => ({
  from: genre.yearStart,
  to: genre.yearEnd
});
