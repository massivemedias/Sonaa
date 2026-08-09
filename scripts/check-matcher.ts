/* Garde-fou du matcher.

   Ces cas viennent tous du corpus reel : quatre faux que la version permissive
   avait laisses passer, et cinq justes qu'une version trop stricte rejetait.
   Si ce script echoue, c'est que le matcher a change de comportement sur des
   cas connus : le corriger, pas ajuster le test.

   Usage : npm run check:matcher */

import { judge, isFullRelease, normalise } from './lib/match.ts';

/* Les cas qui ont motivé le durcissement, plus ceux que la version trop stricte
   rejetait à tort. Attendu = ce que le matcher DOIT dire. */
const cases: [string, string, string, string, boolean, string][] = [
  // artiste, titre, titre YouTube, chaîne, attendu, pourquoi
  ['Phase Fatale', 'Reproduction', 'Velvet Imprints', 'Phase Fatale - Topic', false, 'bon artiste, autre morceau'],
  ['Marvin And Guy', 'Sirens Of Jupiter', 'The Olympians "Sirens of Jupiter" OFFICIAL VIDEO', 'Daptone', false, 'reprise par un autre'],
  ['Kindzadza', 'Night Voices', 'Kindzadza - On The Night Side', 'psyfan', false, 'titre proche mais différent'],
  ['Curses', 'Rip It Out', 'RIP THE KING OF CURSES | Jujutsu Kaisen', 'anime', false, 'sans rapport'],
  ['Lindstrom', 'I Feel Space', 'I Feel Space', 'Lindstrøm - Topic', true, 'o barré dans la chaîne'],
  ['Eisbrecher', 'Verrueckt', 'Eisbrecher - Verrückt (Official Video)', 'EISBRECHER official', true, 'umlaut contre ue'],
  ['Roman Fluegel', 'Gehts Noch', "Roman Flugel - Geht's Noch?", 'Dial', true, 'apostrophe et umlaut'],
  ['Dsk', "I'll Keep Holding On", "(1992) DSK - I'll Keep Holdin' On", 'raregroove', true, 'Holdin contre Holding'],
  // Le nom de l'artiste est dans le titre de l'album, plus loin dans la chaîne :
  // c'est ce qui sauve cette correspondance, et le matcher le voit.
  ['Throbbing Gristle', 'We Hate You (Little Girls)', 'We Hate You (Little Girls) (D.o.A.: The Third and Final Report of Throbbing Gristle, 1978)', 'Carlos Buchan', true, 'artiste present dans le titre d album'],
  // Le meme morceau sans aucune trace de l'artiste : refuse, et c'est voulu.
  // On prefere manquer un vrai morceau qu'en inscrire un faux.
  ['Throbbing Gristle', 'We Hate You (Little Girls)', 'We Hate You (Little Girls)', 'Carlos Buchan', false, 'artiste nulle part, refus assume'],
];

// Parutions complètes : le bon artiste, le bon titre, et pourtant NON.
// Le cas réel : Spacesynth jouait un album entier de 40 minutes.
cases.push(
  ['Zanov', 'Moebius 256', 'Zanov - Moebius 256 301 (full album)', 'vinylarchives', false, 'album entier annoncé dans le titre'],
  ['Koto', 'Visitors', 'Koto - Visitors (Album Completo 1985)', 'italoteca', false, 'album completo'],
  ['Laserdance', 'Humanoid Invasion', 'Laserdance Megamix 1988', 'spacesynth4ever', false, 'megamix'],
  ['Jean-Michel Jarre', 'Oxygene 4', 'Jean-Michel Jarre - Oxygene (Full LP)', 'archives', false, 'full LP']
);

let fails = 0;
for (const [artist, title, ytTitle, channel, expected, why] of cases) {
  const v = judge({ title: ytTitle, channel }, artist, title);
  const ok = v.ok === expected;
  if (!ok) fails += 1;
  console.log(
    `${ok ? 'OK  ' : 'ECHEC'} ${expected ? 'accepter' : 'refuser '} | ` +
      `titre ${v.titleScore.toFixed(2)} artiste ${v.artistScore.toFixed(2)} | ${artist} - ${title} | ${why}`
  );
}

// La durée seule suffit à refuser, même avec un titre irréprochable.
if (!isFullRelease('Zanov - Moebius 256', 40 * 60 + 34)) {
  fails += 1;
  console.error('ECHEC un candidat de 40 minutes doit être refusé par la durée seule');
}
if (isFullRelease('Zanov - Moebius 256', 6 * 60)) {
  fails += 1;
  console.error('ECHEC une track de 6 minutes ne doit pas être refusée');
}

console.log('');
console.log('normalisation :', normalise('Verrückt'), '/', normalise('Verrueckt'), '/', normalise('Lindstrøm'));
console.log(fails === 0 ? `Les ${cases.length} cas passent.` : `${fails} cas sur ${cases.length} en échec.`);
process.exit(fails === 0 ? 0 : 1);
