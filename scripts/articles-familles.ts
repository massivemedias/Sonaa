/* LES ARTICLES DE FAMILLE.

   CE QUI MANQUAIT. Chaque famille portait une description de six lignes,
   environ 650 signes, qui repond a « qu'est-ce qui reunit ces genres ». Mika
   a demande davantage : « je pensais que les textes allaient etre plus
   fournis, avec plus de choses comme un article de journal, des images, des
   photos, meme des schemas ». Six lignes ne portent pas cela.

   COMMENT CELA A ETE ECRIT. Les faits verifiables ont ete confirmes par
   recherche avant redaction : dates, lieux, noms de labels, titres de
   disques. Ce qui n'a pas pu etre verifie n'est pas ecrit. Les images
   viennent de Wikimedia Commons, choisies dans les resultats reels de l'API
   de recherche filtree sur les licences libres, et non a partir d'un titre de
   fichier devine.

   Usage :
     npx tsx scripts/articles-familles.ts --dry-run
     npx tsx scripts/articles-familles.ts
*/

import { transaction } from './lib/corpus-store.ts';

const SEC = process.argv.includes('--dry-run');

interface Section {
  readonly titre: string;
  readonly texte: string;
  readonly image?: string;
}

const ARTICLES: Record<string, Section[]> = {
  disco: [
    {
      titre: 'Un appartement de Broadway, la Saint-Valentin 1970',
      image: 'studio-54',
      texte:
        "Le disco ne commence pas dans une discothèque mais chez quelqu'un. Le 14 février 1970, David Mancuso ouvre son appartement de Broadway à une fête privée qu'il appelle Love Saves the Day. Pas de licence d'alcool, pas de portier, une invitation et une sono d'audiophile montée pour la fidélité plutôt que pour le volume. Le lieu prend le nom de The Loft.\n\nCe qui s'y invente n'est pas un style de musique, c'est une façon de la faire écouter. Mancuso ne mixe pas au sens où on l'entend aujourd'hui : il fait jouer des disques entiers, choisis, sur un système qui rend le grave et l'aigu que la radio coupe. Le public est mélangé, noir et blanc, homosexuel et hétérosexuel, à une époque où les clubs de New York ne le sont pas. Cette assemblée-là est le premier fait du disco, avant la première note.",
    },
    {
      titre: 'Le maxi 45 tours, inventé par nécessité',
      image: 'maxi-45',
      texte:
        "Un 45 tours classique tient trois minutes et sature dans les graves : le sillon doit être serré pour faire entrer la musique sur un petit disque. En gravant un seul morceau sur un disque de douze pouces, le sillon s'écarte, le grave passe, et le morceau peut durer huit minutes au lieu de trois.\n\nWest End Records, à New York, est l'un des labels qui installent ce format au tournant des années 1970. Le maxi 45 tours n'est pas une commodité de fabrication : c'est ce qui rend possible le long développement, la partie instrumentale étirée, le passage où le chant disparaît et où il ne reste que la rythmique. Sans ce disque-là, la moitié de ce que la piste de danse a inventé ensuite n'aurait eu nulle part où tenir.",
    },
    {
      titre: "La réaction, et ce qu'elle a raté",
      texte:
        "Le 12 juillet 1979, entre deux matchs de baseball au Comiskey Park de Chicago, une caisse de disques disco est dynamitée devant le public. La Disco Demolition Night est présentée comme une blague de radio ; elle se termine en émeute et le second match est annulé. L'industrie retire le mot disco de ses pochettes en quelques mois.\n\nLa musique, elle, ne disparaît pas : elle change de nom et de continent. L'Italie en fait l'italo, l'Allemagne le Hi-NRG, et Chicago, où l'on venait de faire sauter les disques, en fait la house. Les quatorze genres réunis dans cette famille couvrent 1975 à aujourd'hui, du disco d'orchestre au nu-disco qui rejoue la même chose avec des synthétiseurs.",
    },
  ],

  house: [
    {
      titre: 'Un entrepôt, un DJ de New York, et un mot qui reste',
      image: 'hacienda',
      texte:
        "En 1977, un club de Chicago ouvre dans un ancien entrepôt de la rue Jefferson et fait venir un DJ de New York, Frankie Knuckles, formé au Continental Baths et proche de la scène du Loft. Le club s'appelle le Warehouse. Il joue du disco de Philadelphie, de la soul, du Salsoul, et quand les disques manquent il les rallonge lui-même avec une boîte à rythmes et un magnétophone.\n\nLe mot house vient de là : les disquaires de Chicago rangent sous l'étiquette house music les disques qu'on entend au Warehouse. C'est un nom de lieu devenu un nom de genre, ce qui arrive rarement et dit tout de la manière dont ce style est né : par une pratique de piste, pas par un projet de studio.",
    },
    {
      titre: 'Ce que la machine a changé',
      image: 'tr-909',
      texte:
        "Le disco se jouait avec un orchestre. La house se fait avec ce qu'on trouve d'occasion : une Roland TR-808 ou TR-909 que les magasins bradent parce qu'elles ne sonnent pas comme de vraies batteries, un clavier bon marché, un enregistreur quatre pistes.\n\nCette contrainte fait le son. La grosse caisse tombe sur les quatre temps parce que c'est ce que la boîte fait le mieux, le charleston répond entre les temps, et la basse est une ligne bouclée plutôt qu'un bassiste. On and On de Jesse Saunders, en 1984, est généralement tenu pour le premier disque de house édité : il tient sur ce matériel-là et il coûte presque rien à fabriquer. C'est ce qui ouvre la porte à des centaines de gens qui n'auraient jamais payé un studio.",
    },
    {
      titre: "L'Angleterre s'en empare",
      texte:
        "À Chicago la house reste une affaire locale. C'est l'Angleterre qui en fait un phénomène de masse : Love Can't Turn Around de Farley Jackmaster Funk entre dans les classements britanniques en 1986, Jack Your Body de Steve Silk Hurley y arrive premier en janvier 1987.\n\nManchester bascule ensuite. L'Haçienda, ouverte par Factory Records et New Order, devient à partir de 1988 le centre d'une scène qui mêle house de Chicago, acid et culture de club anglaise. La famille house rassemble aujourd'hui vingt-quatre genres, du Chicago originel à l'amapiano sud-africain : ce qui les tient ensemble n'est pas un tempo mais une grosse caisse sur chaque temps et une façon de faire durer.",
    },
  ],

  techno: [
    {
      titre: 'Trois lycéens du Michigan',
      image: 'detroit-skyline',
      texte:
        "La techno naît à Belleville, une banlieue au sud-ouest de Detroit, entre trois camarades de lycée : Juan Atkins, Derrick May et Kevin Saunderson. Ils écoutent une émission de radio nocturne, The Electrifying Mojo, qui passe Kraftwerk, Parliament, Prince et les B-52's dans la même heure sans expliquer pourquoi.\n\nCe mélange est la matrice. Atkins enregistre avec Rick Davis sous le nom Cybotron dès 1981, et Clear en 1983 porte déjà tout : la machine, le funk, et une froideur qui n'est pas de l'indifférence. Le mot techno vient d'un texte d'Alvin Toffler, Techno Rebels, que le groupe lit et retient.",
    },
    {
      titre: 'Une ville qui se vide',
      image: 'packard-detroit',
      texte:
        "Detroit perd la moitié de sa population entre 1950 et 1990. Les usines automobiles ferment, l'usine Packard est abandonnée dès 1958 et pourrit sur place pendant soixante ans. C'est le décor, et il n'est pas décoratif : la techno de Detroit se fabrique dans une ville où l'industrie a disparu en laissant ses bâtiments.\n\nLes disques le disent sans le dire. Ils sont mécaniques et mélancoliques à la fois, faits de machines dans une ville que les machines ont quittée. Strings of Life de Rhythim Is Rhythim, en 1987, est un morceau de piano joué par un séquenceur : personne ne le touche, et il est bouleversant.",
    },
    {
      titre: "Berlin, le mur, et le coffre d'une banque",
      image: 'tresor',
      texte:
        "La techno de Detroit se vend mal aux États-Unis et trouve son public en Europe. À Berlin, la chute du mur en 1989 libère des bâtiments vides des deux côtés : le Tresor ouvre en 1991 dans la chambre forte d'un grand magasin désaffecté, sous la Leipziger Strasse.\n\nLe label du même nom édite les producteurs de Detroit en Allemagne et fait le pont entre les deux villes. C'est de là que vient la techno telle qu'on l'entend aujourd'hui en club : plus dure, plus longue, plus linéaire que celle du Michigan. Les seize genres de cette famille vont de la Detroit d'origine à la hard techno actuelle, en passant par le dub techno de Basic Channel et l'industrielle de Birmingham.",
    },
  ],

  minimal: [
    {
      titre: "Retirer, plutôt qu'ajouter",
      texte:
        "La minimale ne cherche pas à remplir un morceau : elle regarde combien on peut en retirer avant qu'il cesse de fonctionner. Une boucle courte, une variation minuscule toutes les seize mesures, et le temps fait le reste.\n\nElle naît à Detroit au milieu des années 1990, chez Robert Hood et Daniel Bell, en réaction à l'excès des raves. Minimal Nation, l'album que Hood publie en 1994, en est le document fondateur : il n'y a presque rien dedans, et c'est le sujet. La question qu'il pose est celle de toute la famille, et elle est plus radicale qu'elle n'en a l'air : à partir de quel moment un motif répété cesse-t-il d'être de la musique.",
    },
    {
      titre: 'Cologne, et le disquaire devenu label',
      image: 'berghain',
      texte:
        "En 1993, un disquaire de techno ouvre à Cologne sous le nom de Delirium. Wolfgang Voigt, son frère Reinhard, Jörg Burger et Jürgen Paape le tiennent, bientôt rejoints par Michael Mayer. En 1998 ils réunissent leurs labels, le magasin, la distribution et l'organisation de soirées sous un seul nom : Kompakt.\n\nCe que Cologne ajoute à la minimale de Detroit, c'est une clarté presque clinique et une mélancolie assumée. La rythmique se réduit encore, mais un accord de synthétiseur tenu suffit à rendre un morceau chaleureux. Avec Perlon à Francfort et M-nus de Richie Hawtin, ces labels installent au début des années 2000 ce que toute l'Europe appellera simplement la minimale.",
    },
    {
      titre: 'Le clic comme matière',
      texte:
        "La dernière pièce est venue de l'erreur numérique. À la fin des années 1990, des producteurs se mettent à utiliser comme percussions ce que le matériel produit quand il rate : le clic d'un lecteur de disque compact qui saute, le craquement d'un vinyle, l'artefact d'un compresseur poussé trop loin.\n\nLa compilation Clicks & Cuts, publiée par Mille Plateaux en 2000, donne un nom à cette pratique. Croisée avec la house, elle produit la microhouse de Ricardo Villalobos et d'Akufen, faite de fragments de voix hachées et de silences. La tech house, qui en descend directement, deviendra le format le plus joué en club dans les années 2010 : c'est la famille la plus austère de la carte, et paradoxalement celle qui a produit le plus grand succès commercial.",
    },
  ],
};

/* GARDE-FOU CONTRE MA PROPRE FAUTE, FAITE DEUX FOIS.

   Les commentaires de code de ce projet sont volontairement sans accents.
   En passant de l'un a l'autre j'ai ecrit deux fois de la prose francaise
   sans accents, et elle s'est affichee telle quelle sur le site avant que
   quelqu'un ne la lise. Un francais de deux mille signes qui compte moins de
   trente lettres accentuees n'est pas du francais : le script refuse d'ecrire
   plutot que de publier ca. */
const ACCENTS = /[àâäçéèêëîïôöùûüÀÂÄÇÉÈÊËÎÏÔÖÙÛÜ]/g;
for (const [id, sections] of Object.entries(ARTICLES)) {
  for (const s of sections) {
    const n = (s.texte.match(ACCENTS) ?? []).length;
    /* UN POUR CENT VINGT SIGNES, ET LE SEUIL A ETE CORRIGE PAR LA MESURE.
       Pose d'abord a un pour soixante, il a refuse une section pourtant
       correctement ecrite : « La reaction, et ce qu'elle a rate » porte onze
       lettres accentuees en six cent quatre-vingt-quatre signes, parce que le
       passage parle surtout de noms propres et de dates. Un seuil qui refuse
       du bon texte finit par etre desactive ; celui-ci vise le vrai defaut,
       qui etait ZERO accent sur deux mille signes. */
    const attendu = Math.max(5, Math.floor(s.texte.length / 120));
    if (n < attendu) {
      console.error(
        `ACCENTS MANQUANTS : ${id}, section « ${s.titre} » : ${n} lettres accentuees ` +
          `pour ${s.texte.length} signes, il en faut au moins ${attendu}.\n` +
          `  Du francais sans accents se voit a l'ecran et ne se rattrape pas apres publication.`
      );
      process.exit(1);
    }
  }
}

const avant = ARTICLES;
let ecrits = 0;

transaction((frais) => {
  const familles = (frais as unknown as { families: { id: string; article?: Section[] }[] }).families;
  for (const [id, sections] of Object.entries(avant)) {
    const f = familles.find((x) => x.id === id);
    if (!f) {
      console.error(`FAMILLE INCONNUE : ${id}. Rien n'a ete ecrit pour elle.`);
      continue;
    }
    if (SEC) {
      console.log(`  ${id} : ${sections.length} sections, ${sections.reduce((n, s) => n + s.texte.length, 0)} signes`);
      continue;
    }
    f.article = sections;
    ecrits += 1;
  }
});

console.log(SEC ? "\n--dry-run : rien n'a ete ecrit." : `\n${ecrits} article(s) de famille ecrit(s).`);
