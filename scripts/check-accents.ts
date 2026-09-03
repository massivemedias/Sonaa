/* LES ACCENTS DU TEXTE QUI ARRIVE A L'ECRAN.

   TROIS FOIS LE MEME DEFAUT, ET LA TROISIEME C'EST MIKA QUI L'A VU : des
   pages entieres de francais sans accents, « deduit de Montreal », « la
   source ne repond pas », « les 40 premieres ». La cause est connue et elle
   est bete : les COMMENTAIRES de ce depot sont volontairement sans accents,
   et a force d'en ecrire on continue sur sa lancee dans la chaine juste en
   dessous, qui, elle, est lue par quelqu'un.

   Une regle qu'on se rappelle est une regle qu'on oublie. Ce controle la
   rend mecanique.

   ═══ CE QU'IL REGARDE, ET CE QU'IL NE REGARDE PAS ═══

   Il ne lit QUE ce qui peut arriver a l'ecran : le texte entre balises et
   les chaines litterales. Les commentaires sont retires avant tout, et les
   identifiants ne sont jamais examines : `duree`, `annee`, `reponse` sont de
   bons noms de variables dans ce depot, et le controle n'a pas a en juger.

   ═══ COMMENT IL DECIDE ═══

   Une liste de mots dont l'orthographe francaise ne s'ecrit JAMAIS sans
   accent. Pas de statistique, pas de seuil : soit le mot est dans la liste,
   soit il ne l'est pas. Un seuil sur la densite d'accents avait deja produit
   un faux positif sur un article legitime ; ici, chaque signalement est une
   faute, et chaque faute non listee passe. C'est le bon sens du compromis :
   ce controle doit pouvoir etre cru sans etre relu.

   Trois filtres evitent le bruit :
     - les fragments techniques (classes CSS, adresses, cles) ;
     - l'interieur des `${...}`, qui est du code, pas du texte ;
     - l'anglais, reconnu a ses mots-outils : la moitie de langue.ts est une
       traduction, et « after » n'a pas d'accent a lui reprocher. */

import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/* Des mots qui, en francais, ne s'ecrivent jamais sans leur accent. La liste
   est volontairement courte : on n'y met que ce qu'on a vu se tromper, ou ce
   qui reviendra. Elle grandira par constat, pas par prevoyance. */
const FAUTES = [
  'deduit', 'deduite', 'deduits', 'deduites',
  'soiree', 'soirees',
  'evenement', 'evenements',
  'apres', 'tres', 'deja', 'pres',
  'periode', 'periodes',
  'elargi', 'elargie', 'elargir', 'elargissez',
  'repond', 'repondent', 'repondre',
  'ecran', 'ecrans',
  'francais', 'francaise',
  'reponse', 'reponses',
  'interesse', 'interesses',
  'decouvrir', 'decouverte',
  'numero', 'numeros',
  'systeme', 'systemes',
  'probleme', 'problemes',
  'annonce', 'annoncee', 'annonces',
  'melange', 'melangee',
  'separe', 'separee',
  'entiere', 'entieres',
  'derniere', 'dernieres',
  'premiere', 'premieres',
  'deuxieme', 'troisieme', 'quatrieme',
  'securite',
  'duree', 'durees',
  'annee', 'annees',
  'entree', 'entrees',
  'idee', 'idees',
  'acceptee', 'refusee', 'reportee', 'creee', 'publiee', 'supprimee', 'deposee',
  'etes', 'etre', 'meme', 'memes',
  'equivalent', 'equivalents',
  'precisez', 'reessayer',
  'defaut', 'defauts',
  'genere', 'generee',
  'terminee', 'commencee',
  'requete', 'requetes',
  'fenetre', 'fenetres',
  'etape', 'etapes',
  'apercu',
  'preferences', 'prefere',
  'ferme', 'fermee',
];

const MOTIF = new RegExp(`\\b(${FAUTES.join('|')})\\b`, 'gi');

/* L'anglais n'a pas d'accents a rendre. Ces mots-outils ne se rencontrent
   pas dans une phrase francaise, et leur presence suffit a classer le
   fragment. */
const ANGLAIS = /\b(the|your|you|and|with|from|this|that|for|are|was|will|about|back|see|all|latest|max|upload|ready|artwork|no|not|has|have|its|it|only|when|where|which|our|their|they|them|to file|of)\b/i;

function sansCommentaires(src: string): string {
  /* On remplace par des espaces de meme longueur : les numeros de ligne
     restent justes, ce qui est tout l'interet d'un message d'erreur. */
  let s = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  s = s.replace(/^([ \t]*)\/\/.*$/gm, (_m, i: string) => i);
  return s;
}

interface Fragment {
  readonly position: number;
  readonly texte: string;
}

function fragments(src: string): Fragment[] {
  const sortie: Fragment[] = [];
  /* Les chaines litterales, les trois formes. */
  const chaines = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/gs;
  for (const m of src.matchAll(chaines)) {
    sortie.push({ position: m.index, texte: m[1] ?? m[2] ?? m[3] ?? '' });
  }
  /* Le texte entre deux balises JSX.

     LE MOTIF EST STRICT, ET IL A UNE RAISON DE L'ETRE. Un premier jet
     acceptait tout ce qui se trouve entre un « > » et un « < », ce qui
     attrapait les generiques de TypeScript : `useState<Soiree[] | null>`
     ouvre un chevron, la ligne suivante en referme un, et le corps de la
     fonction se retrouvait lu comme du texte affiche. Huit faux
     signalements, tous sur du code.

     On exige donc l'absence de ponctuation de programmation. Une phrase de
     l'interface n'en contient pas ; du code n'en manque jamais.

     ET LES ACCOLADES COMPTENT COMME DES BALISES. Deuxieme mesure, apres
     avoir remis deux fautes expres : le controle n'en trouvait qu'une. La
     seconde vivait dans « … sur cette période{expression}. Élargissez la
     période … », c'est-a-dire dans un texte COUPE par une interpolation. Un
     motif qui n'accepte que « > texte < » ne voit jamais ces morceaux-la,
     qui sont pourtant la forme la plus courante du texte d'interface des
     qu'il contient une valeur. On coupe donc aussi sur les accolades. */
  for (const m of src.matchAll(/(?<=[>}])\s*([^<>{};=()[\]|]{8,200}?)\s*(?=[<{])/g)) {
    sortie.push({ position: m.index, texte: m[1] ?? '' });
  }
  return sortie;
}

function estDuTexte(t: string): boolean {
  /* L'interieur des interpolations est du code : on l'ote avant de juger. */
  const nu = t.replace(/\$\{[^}]*\}/g, ' ').trim();
  if (nu.length < 8) return false;
  /* Une classe CSS, une cle, un identifiant : pas d'espace, ou que des
     minuscules et des tirets. */
  if (!/\s/.test(nu)) return false;
  if (/^[a-z0-9\s_-]+$/.test(nu) && !/\s[a-z]{2,}\s/.test(nu)) return false;
  /* Adresses, chemins, selecteurs. */
  if (/https?:\/\/|^[.#][a-z-]+|\/api\/|\.(ts|tsx|css|json|png|webp)\b/.test(nu)) return false;
  /* DU CODE RESTE DU CODE ENTRE DEUX ACCOLADES. Couper sur les accolades a
     fait entrer des morceaux d'expression : « soirees.length ? `, les $ ».
     Un acces a une propriete, un accent grave, un operateur logique : rien
     de tout cela n'apparait dans une phrase qu'on lit. */
  if (/[A-Za-z_$][\w$]*\.[A-Za-z_$]|`|&&|\?\?|=>/.test(nu)) return false;
  if (ANGLAIS.test(nu)) return false;
  /* Au moins trois mots : une phrase, pas une etiquette technique. */
  return nu.split(/\s+/).filter((w) => w.length >= 2).length >= 3;
}

/* CE QUI PEUT METTRE DU TEXTE DANS LA PAGE, ET RIEN D'AUTRE.

   Les composants, d'abord : tout `.tsx` rend quelque chose. Puis les deux
   endroits ou vivent des phrases sans etre des composants, `src/langue` qui
   n'est que cela, et `src/lib` dont les messages d'erreur remontent tels
   quels a l'ecran.

   `webgl-orbit.ts` et `verify-visual.ts` sont exclus a dessein : leurs
   phrases vont dans la console pour moi pendant que je mesure, pas dans la
   page pour quelqu'un. Les y soumettre revenait a exiger des accents dans
   des commentaires, ce que ce depot a decide de ne pas faire. */
function fichiers(racine: string): string[] {
  const sortie: string[] = [];
  for (const nom of readdirSync(racine)) {
    const chemin = join(racine, nom);
    if (statSync(chemin).isDirectory()) {
      sortie.push(...fichiers(chemin));
    } else if (nom.endsWith('.tsx')) {
      sortie.push(chemin);
    } else if (nom.endsWith('.ts') && !nom.endsWith('.d.ts')) {
      if (racine.includes('langue') || racine.includes('lib')) sortie.push(chemin);
    }
  }
  return sortie;
}

const plaintes: string[] = [];
let lus = 0;

for (const chemin of fichiers('src')) {
  const src = sansCommentaires(readFileSync(chemin, 'utf8'));
  for (const f of fragments(src)) {
    if (!estDuTexte(f.texte)) continue;
    lus += 1;
    const nu = f.texte.replace(/\$\{[^}]*\}/g, ' ');
    const mots = [...new Set([...nu.matchAll(MOTIF)].map((m) => m[0]))];
    if (mots.length === 0) continue;
    const ligne = src.slice(0, f.position).split('\n').length;
    plaintes.push(
      `  ${chemin}:${ligne}\n    ${mots.join(', ')}\n    « ${nu.trim().slice(0, 90)} »`
    );
  }
}

if (plaintes.length > 0) {
  console.error(
    `ACCENTS : ${plaintes.length} fragment(s) de francais sans accents, dans du texte lu a l'ecran.\n`
  );
  for (const p of plaintes) console.error(`${p}\n`);
  console.error(
    "Les commentaires de ce depot s'ecrivent sans accents ; le texte affiche,\n" +
      'jamais. Corriger les fragments ci-dessus.\n'
  );
  process.exit(1);
}

console.log(`Accents : ${lus} fragments de texte affiche relus, aucun francais sans accents.`);
