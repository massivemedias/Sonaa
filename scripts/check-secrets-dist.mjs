/* LES MOTIFS DE SECRET, CHERCHES DANS dist/ AVANT DE POUSSER.

   Le deploiement les cherche deja (deploy.yml, « Verifier qu'aucun secret
   n'a traverse le build ») et refuse de publier s'il en trouve un. Mais il le
   decouvre apres le push : le 1er octobre 2026, une adresse de pochette de
   Discogs contenait par hasard « sk-lawPQPdY5mTFaQY », la forme d'une cle
   OpenAI, et le deploiement s'est arrete sur la branche deja poussee. Les
   memes motifs, ici, arretent la publication avant.

   LES MOTIFS SONT CEUX DU DEPLOIEMENT, a la lettre : un motif plus doux ici
   laisserait passer ce qui sera refuse la-bas. */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MOTIFS = [/ghp_|github_pat_|AIza|sk-[A-Za-z0-9]{16}/, /sb_secret_[A-Za-z0-9_-]{15,}/, /eyJhbGciOi[A-Za-z0-9_.-]{60,}/];

const fichiers = [];
const parcourir = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) parcourir(p);
    else fichiers.push(p);
  }
};
parcourir('dist');

const trouves = [];
for (const f of fichiers) {
  if (!/\.(js|html|json|css|txt|xml|webmanifest)$/.test(f)) continue;
  const texte = readFileSync(f, 'utf8');
  for (const m of MOTIFS) {
    const r = m.exec(texte);
    if (r) trouves.push(`${f} : « ${texte.slice(Math.max(0, r.index - 30), r.index + 24)} »`);
  }
}
if (trouves.length > 0) {
  console.log(`SECRETS : ${trouves.length} motif(s) dans dist/, le deploiement refuserait.\n  ${trouves.join('\n  ')}`);
  process.exit(1);
}
console.log(`Secrets : ${fichiers.length} fichiers de dist/ relus, aucun motif de cle.`);
