/* Annuler les 36 remplacements de parutions completes.

   ═══ POURQUOI ═══

   La regle appliquee etait : « si une version de moins de quinze minutes
   existe et passe le matcher, l'entree longue etait une integrale ». Elle
   est fausse, et la mesure l'a montre sans ambiguite.

   Les remplacants obtenus, mesures un par un par videos.list :

     « Karlheinz Stockhausen explains Kontakte », 8 min   -> une interview
     « First Look: Video Trailer for Ancient Methods »    -> une bande-annonce
     « Salvatore Cezar Pais & The Navy UFO Patents »      -> sans rapport
     « Salem Witchcraft, Sandman, 1975 Private Press 45 » -> autre artiste
     « Tangerine Dream Phaedra Live », 4 min              -> extrait de concert
     « Bayreuth Return [Edit] », 14 min                   -> edition tronquee
     « Magic Pony Ride (Pt.1) », 3 min                    -> une partie
     « Living Torch Pt 1 (excerpt) », 9 min               -> extrait declare

   Le matcher fait son travail : le titre contient bien l'artiste et le
   morceau. Ce qu'il ne peut pas savoir, c'est que la video parle de la
   musique au lieu de la jouer, ou n'en donne qu'un fragment.

   ═══ CE QUE J'AURAIS DU MESURER ═══

   « Il existe une version courte » ne prouve rien sur la duree de l'oeuvre.
   Une piste de trente-cinq minutes a toujours des extraits, des editions
   radio et des captations de concert qui circulent. J'ai pris l'existence
   d'un fragment pour la preuve que l'entier n'existait pas.

   La duree canonique d'une piste se lit chez Discogs, sur la fiche de la
   sortie, et nulle part ailleurs. C'est la mesure a faire, et elle n'a pas
   ete faite.

   ═══ CE QUE FAIT CE FICHIER ═══

   Rien d'autre que remettre les identifiants d'origine. Les 49 entrees
   longues redeviennent ce qu'elles etaient : un defaut connu, ecrit noir
   sur blanc dans AUDIT-DUREES.txt, qui attend une regle correcte. Une
   integrale d'album identifiee vaut mieux qu'une interview presentee comme
   de la musique.

   Usage : node --experimental-strip-types scripts/annuler-remplacements.ts */

import { readFileSync } from 'node:fs';
import { transaction } from './lib/corpus-store.ts';

interface Cible {
  genre: string;
  champ: 'essentiel' | 'actuel';
  id: string;
  artiste: string;
  titre: string;
}
interface Track {
  youtubeId: string;
  [k: string]: unknown;
}
interface Genre {
  id: string;
  tracks: { essentiel: Track[]; actuel: Track[] };
}

const CIBLES =
  '/private/tmp/claude-501/-Users-mauditemachine-Library-Mobile-Documents-com-apple-CloudDocs-Dev-JPrunier/bf4a0e7e-48b8-41a2-9487-299130e6437f/scratchpad/cibles.json';
const RAPPORT =
  '/private/tmp/claude-501/-Users-mauditemachine-Library-Mobile-Documents-com-apple-CloudDocs-Dev-JPrunier/bf4a0e7e-48b8-41a2-9487-299130e6437f/scratchpad/parutions.txt';

const cibles = JSON.parse(readFileSync(CIBLES, 'utf8')) as Cible[];

/* Le rapport de la reparation donne le couple « ce qui a ete remplace » et
   « par quoi ». C'est la seule trace de la correspondance. */
const remplacements = new Map<string, string>(); // nouvel id -> ancien id
for (const ligne of readFileSync(RAPPORT, 'utf8').split('\n')) {
  const m = /^\s+([a-z0-9]+) \| (.+?) - (.+?) \| \d+ min -> ([A-Za-z0-9_-]{11})$/.exec(ligne);
  if (!m) continue;
  const [, genre, artiste, titre, nouveau] = m;
  const c = cibles.find(
    (x) => x.genre === genre && x.artiste === artiste && x.titre === titre
  );
  if (c && nouveau) remplacements.set(nouveau, c.id);
}

console.log(`${remplacements.size} remplacement(s) a annuler.`);

let rendus = 0;
const introuvables: string[] = [];

transaction((frais) => {
  for (const [nouveau, ancien] of remplacements) {
    let trouve = false;
    for (const g of frais.genres as unknown as Genre[]) {
      for (const champ of ['essentiel', 'actuel'] as const) {
        const t = g.tracks[champ].find((x) => x.youtubeId === nouveau);
        if (t) {
          t.youtubeId = ancien;
          trouve = true;
          rendus += 1;
        }
      }
    }
    if (!trouve) introuvables.push(`${nouveau} -> ${ancien}`);
  }
});

console.log(`${rendus} identifiant(s) d'origine remis en place.`);

/* SEPARER LES DEUX ECHECS. « Rien a annuler » n'est pas la meme chose que
   « je n'ai pas retrouve la cible ». Le second cas laisse un faux dans le
   corpus, et doit se voir. */
if (introuvables.length > 0) {
  console.error(
    `\n${introuvables.length} remplacement(s) INTROUVABLE(S) dans le corpus. ` +
      `Ces faux y sont peut-etre encore, sous un autre chemin :`
  );
  for (const i of introuvables) console.error('  ' + i);
  process.exit(1);
}

if (rendus !== remplacements.size) {
  console.error(
    `\nCompte incoherent : ${remplacements.size} attendus, ${rendus} rendus. ` +
      `Verifier le corpus a la main avant de publier.`
  );
  process.exit(1);
}
