/* LES CORRESPONDANCES VERS RESIDENT ADVISOR NE DOIVENT PAS MENTIR.

   Une table d'equivalences ecrite a la main se degrade en silence. Une
   exception qui vise un mot que RA ne connait pas ne produit aucune erreur :
   elle produit une page vide, ce qui ressemble exactement a une ville sans
   soirees. C'est le genre de panne qu'on ne trouve jamais en regardant, parce
   qu'il n'y a rien a voir.

   Trois questions, donc, posees a chaque publication :

   1. chaque exception vise-t-elle un genre que RA sait filtrer ;
   2. chaque famille vise-t-elle un genre que RA sait filtrer ;
   3. les identifiants a gauche existent-ils encore dans le corpus. Un genre
      renomme laisserait une exception orpheline, qui ne servirait plus
      jamais sans que rien ne le dise.

   Ce controle ne demande RIEN a RA. Il verifie la coherence interne, pas la
   verite du monde : si RA retire un genre de sa liste, seul un relevé refait
   a la main le verra, et c'est assume. */

import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/data/ra-genres.ts', import.meta.url), 'utf8');
const corpus = JSON.parse(
  readFileSync(new URL('../src/data/corpus.json', import.meta.url), 'utf8')
) as { genres: { id: string }[]; families: { id: string }[] };

const bloc = (nom: string): string => {
  const debut = source.indexOf(nom);
  if (debut < 0) throw new Error(`bloc ${nom} introuvable dans ra-genres.ts`);
  const ouvre = source.indexOf('{', debut);
  const ferme = source.indexOf('};', ouvre);
  return source.slice(ouvre, ferme);
};

const genresRa = new Set(
  [...source.slice(source.indexOf('GENRES_RA'), source.indexOf(']);')).matchAll(/'([a-z]+)'/g)].map(
    (m) => m[1] as string
  )
);

const paires = (texte: string): [string, string][] =>
  [...texte.matchAll(/^\s*([a-z]+):\s*'([a-z]+)',/gm)].map((m) => [m[1] as string, m[2] as string]);

const exceptions = paires(bloc('const EXCEPTIONS'));
const familles = paires(bloc('const PAR_FAMILLE'));

const idsCorpus = new Set(corpus.genres.map((g) => g.id));
const idsFamilles = new Set(corpus.families.map((f) => f.id));

const plaintes: string[] = [];

for (const [de, vers] of exceptions) {
  if (!genresRa.has(vers)) plaintes.push(`exception ${de} vise « ${vers} », que RA ne filtre pas`);
  if (!idsCorpus.has(de)) plaintes.push(`exception ${de} : ce genre n'existe plus dans le corpus`);
}
for (const [de, vers] of familles) {
  if (!genresRa.has(vers)) plaintes.push(`famille ${de} vise « ${vers} », que RA ne filtre pas`);
  if (!idsFamilles.has(de)) plaintes.push(`famille ${de} : cette famille n'existe pas`);
}
for (const f of idsFamilles) {
  if (!familles.some(([de]) => de === f)) {
    plaintes.push(`famille ${f} : aucune correspondance, ses genres rares ne trouveraient rien`);
  }
}

if (plaintes.length > 0) {
  console.error('Correspondances Resident Advisor :');
  for (const p of plaintes) console.error(`  ${p}`);
  process.exit(1);
}

const couverts = corpus.genres.filter(
  (g) => genresRa.has(g.id) || exceptions.some(([de]) => de === g.id)
).length;
console.log(
  `Genres RA : ${exceptions.length} exceptions et ${familles.length} familles valides, ` +
    `${couverts} genres sur ${corpus.genres.length} vises directement, le reste par sa famille.`
);
