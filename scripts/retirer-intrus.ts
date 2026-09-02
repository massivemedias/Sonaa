/* RETIRER LES MORCEAUX QUI NE SONT PAS DU GENRE OU ILS SONT POSES.

   LE DEFAUT, VU A L'OEIL PUIS MESURE. Le bouton « Ecouter » de Garage House
   lancait MFSB, « Love Is The Message », 1973 : un orchestre de soul de
   Philadelphie, sur Philadelphia International Records. Trois autres disques
   de disco de 1979 suivaient. Plus bas dans la meme liste : Ariana Grande sur
   Republic, Bebe Rexha sur Empire, Rochelle Jordan sur Empire.

   D'OU CA VIENT. Le remplissage interroge Discogs et retient un disque si le
   style cherche est premier ou deuxieme. Discogs dit vrai a sa facon :
   « Yes, And? » EMPRUNTE au garage house. Mais Discogs repond a « ce disque
   emprunte a quoi », et le site pose une autre question, « qu'est-ce que je
   dois ecouter pour comprendre ce style ». Ce ne sont pas les memes disques.

   POURQUOI CETTE LISTE EST ECRITE A LA MAIN ET NON CALCULEE. L'audit des
   etiquettes d'auditeurs (scripts/audit-coherence.ts) signale 279 morceaux.
   Applique tel quel, il se trompe de trois facons :

     COLLISION DE NOMS. Last.fm range « Interpol » sous post-punk, mais notre
     Interpol parait sur Highgrade Records, label de techno minimale
     berlinois. Meme piege pour Cheek sur Versatile, Da Capo sur Vega
     Records, Kyla sur Northern Line, Voyager sur Discomagic, Forced Entry
     sur Atom H, You & I sur Spinnin' Deep. Huit morceaux justes que le
     retrait automatique aurait detruits.

     GENRE PLUS VIEUX QUE LE VOCABULAIRE. Ligeti, Krenek, Kagel et
     Goeyvaerts sont etiquetes « contemporary classical » : ce sont pourtant
     les fondateurs du studio de Cologne, et Elektronische Musik EST leur
     genre.

     ABSENCE DE DONNEE. « All », « spotify », « UK », « under 2000
     listeners » : Last.fm ne sait rien de ces artistes. Ne rien savoir n'est
     pas un motif de retrait.

   LE LABEL DE PARUTION TRANCHE MIEUX QUE L'ETIQUETTE. Il est porte par le
   corpus, il ne depend d'aucun vote, et il dit d'ou vient physiquement le
   disque. Chaque retrait ci-dessous a ete verifie contre lui.

   Usage :
     npx tsx scripts/retirer-intrus.ts --dry-run
     npx tsx scripts/retirer-intrus.ts
*/

import { transaction } from './lib/corpus-store.ts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SEC = process.argv.includes('--dry-run');

/** genre, identifiant YouTube, et le motif, qui doit tenir en une ligne. */
const RETRAITS: [string, string, string][] = [
  // Garage House : quatre disques de disco des annees 1970, sur des labels de
  // disco, dans un genre de house. Le premier etait ce que lancait « Ecouter ».
  ['garagehouse', 'MFSB', 'Philadelphia International Records, 1973, soul de Philadelphie'],
  ['garagehouse', 'Fern Kinney', 'WEA, 1979, disco'],
  ['garagehouse', 'Delegation', 'Ariola, 1979, soul et disco'],
  ['garagehouse', 'Thp Orchestra', 'Atlantic, 1979, disco'],
  // Garage House : pop et rnb sur labels majeurs.
  ['garagehouse', 'Ariana Grande', 'Republic Records, pop'],
  ['garagehouse', 'Bebe Rexha', 'Empire, pop'],
  ['garagehouse', 'Rochelle Jordan', 'Empire, rnb'],
  // Miami Bass : rap et pop. Ghost Town DJ's reste, So So Def est un label de bass.
  ['miamibass', 'Beyoncé', 'Parkwood Entertainment, pop et rnb'],
  ['miamibass', 'Lil Pump', 'autoproduit, trap'],
  ['miamibass', 'Monaleo & Flo Milli', 'Stomp Down, rap'],
  // Club de Jersey et de Baltimore : k-pop et reggaeton.
  ['jerseyclub', 'NewJeans', 'ADOR, k-pop'],
  ['jerseyclub', 'Bad Bunny', 'Rimas Entertainment, reggaeton'],
  ['baltimoreclub', 'NewJeans', 'ADOR, k-pop'],
  // Un par genre, tous sur des labels qui ne font pas de musique electronique.
  ['chillwave', 'Taylor Swift Feat. Ice Spice', 'Republic Records, pop'],
  ['industrial', 'Cara Delevingne', 'Warner Records, pop'],
  ['amapiano', 'Doechii', 'Top Dawg Entertainment, rap'],
  ['hiphouse', 'Doechii', 'Top Dawg Entertainment, rap'],
  ['speedgarage', 'Jorja Smith', 'FAMM, rnb et neo-soul'],
  ['2step', 'Jorja Smith', 'FAMM, rnb et neo-soul'],
  ['minimaltechno', 'The Cure', 'Polydor, post-punk'],
  ['triphop', 'Woodkid', 'Barclay, pop de chambre'],
  ['disco', 'Carly Rae Jepsen', '604 Records, pop'],
  ['ghettohouse', 'Fey', 'BoBo Producciones, pop latine'],
  ['idm', 'Plini', 'sans label, metal progressif instrumental'],
  ['darkelectro', 'PRO8L3M', 'sans label, rap polonais'],
  ['glitch', 'Sofia Isella', 'autoproduit, art pop'],
  ['darkambient', 'Zahn', 'sans label, krautrock et noise rock'],
];

/* CE QUI RESTE EN PLACE, ET POURQUOI. Ecrit ici pour que la prochaine passe
   ne les reprenne pas : chacun a ete signale par l'audit et rattrape par son
   label de parution ou par l'histoire du genre. */
const GARDES = [
  'Interpol - Personal Use : Highgrade Records, techno minimale de Berlin, pas le groupe de New York',
  "Cheek - Venus : Versatile Records, Paris, pas le rappeur finlandais",
  'Da Capo - Afrika : Vega Records, pas le groupe de rock progressif',
  'Kyla - Do You Mind : Northern Line, le disque fondateur du UK funky',
  'Voyager - City Of Light : Discomagic Records, pas le groupe de metal',
  'Forced Entry : Atom H et Hog Loft, labels de noise, pas le groupe de thrash',
  "You & I - Suitcase Stories : Spinnin' Deep, pas le groupe de screamo",
  'Dames Brown - What Would You Do? : Defected, label de house',
  "Ghost Town DJ's - My Boo : So So Def, le disque de bass d'Atlanta",
  'Craig David - Fill Me In : le disque fondateur du 2-step',
  "Jungle Brothers - I'll House You : le disque fondateur du hip house",
  'Ligeti, Krenek, Kagel, Goeyvaerts : les fondateurs du studio de Cologne',
  'Mapara A Jazz - John Vuli Gate : le disque qui a fait sortir amapiano',
];

const CORPUS = fileURLToPath(new URL('../src/data/corpus.json', import.meta.url));
const avant = JSON.parse(readFileSync(CORPUS, 'utf8')) as {
  genres: { id: string; label: string; tracks: { artist?: string; title?: string }[] }[];
};

/* ON REPERE PAR ARTISTE ET NON PAR IDENTIFIANT DE VIDEO, parce qu'une video
   peut etre remplacee entre deux passes ; le couple genre plus artiste, lui,
   est ce qu'on a decide de retirer. On liste d'abord ce qui va disparaitre,
   nommement, pour que le compte soit verifiable avant l'ecriture. */
const prevu: { genre: string; artiste: string; titre: string; motif: string }[] = [];
for (const [gid, artiste, motif] of RETRAITS) {
  const g = avant.genres.find((x) => x.id === gid);
  if (!g) {
    console.error(`GENRE INCONNU : ${gid}. Rien n'a ete fait.`);
    process.exit(1);
  }
  const hits = g.tracks.filter((t) => (t.artist ?? '').toLowerCase() === artiste.toLowerCase());
  if (hits.length === 0) {
    console.log(`  deja retire : ${gid} / ${artiste}`);
    continue;
  }
  for (const h of hits) prevu.push({ genre: g.label, artiste, titre: h.title ?? '', motif });
}

const restants = new Map<string, number>();
for (const [gid] of RETRAITS) {
  const g = avant.genres.find((x) => x.id === gid);
  if (!g) continue;
  const partis = prevu.filter((p) => p.genre === g.label).length;
  restants.set(g.label, g.tracks.length - partis);
}

console.log(`\n${prevu.length} morceaux a retirer :\n`);
for (const p of prevu) console.log(`  ${p.genre.padEnd(16)} ${p.artiste} - ${p.titre}\n${' '.repeat(19)}${p.motif}`);

console.log('\nCe qui restera dans les genres touches :');
for (const [label, n] of [...restants].sort((a, b) => a[1] - b[1])) {
  console.log(`  ${String(n).padStart(3)}  ${label}${n < 5 ? '   <-- genre appauvri' : ''}`);
}

console.log(`\n${GARDES.length} signalements de l'audit sont ecartes, le morceau reste :`);
for (const g of GARDES) console.log(`  ${g}`);

if (SEC) {
  console.log("\n--dry-run : rien n'a ete ecrit.");
  process.exit(0);
}

/* PRECONDITION VERIFIEE DANS LA TRANSACTION et non avant : le corpus a pu
   changer entre la lecture d'etude et l'ecriture. */
let retires = 0;
transaction((frais) => {
  const genres = (frais as unknown as { genres: { id: string; tracks: { artist?: string }[] }[] })
    .genres;
  for (const [gid, artiste] of RETRAITS) {
    const g = genres.find((x) => x.id === gid);
    if (!g) continue;
    const avantN = g.tracks.length;
    g.tracks = g.tracks.filter((t) => (t.artist ?? '').toLowerCase() !== artiste.toLowerCase());
    retires += avantN - g.tracks.length;
  }
});
console.log(`\n${retires} morceaux retires du corpus.`);
