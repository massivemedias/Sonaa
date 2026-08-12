/* LE MOT DE L'AUTEUR, posé sur les trois genres réservés à Mika.
 *
 * Le champ motDeLAuteur porte un point de vue assumé, à la première personne,
 * distinct de la description qui dit ce que le genre EST et se veut
 * vérifiable. Il est signé à l'affichage, justement pour qu'on ne les
 * confonde pas. Il est absent des 215 autres genres, délibérément : une voix
 * qui parle partout ne dit plus rien.
 *
 * Les trois emplacements avaient été posés vides en août 2026 et sont restés
 * en attente pendant cinq rapports. Les textes sont de Mika, recopiés tels
 * quels à une seule retouche près, déclarée ci-dessous.
 *
 * ÉCRITURE PAR corpus-store, comme tout le reste : aucun script n'écrit
 * corpus.json directement, et un contrôle de CI le vérifie (ADR-044).
 *
 * Usage : npx tsx scripts/poser-mot-auteur.ts
 */

import { transaction, type AnyCorpus } from './lib/corpus-store.ts';

/* LA SEULE RETOUCHE APPORTÉE AUX TEXTES : l'espace avant les deux-points.
 *
 * Mika a écrit « vient de Beatportal: trop dystopique ». La typographie
 * française demande une espace avant le deux-points, et tout le reste du site
 * la met. La retouche est typographique, jamais éditoriale : aucun mot n'est
 * changé, ajouté ni retiré. */
const espacerDeuxPoints = (texte: string): string => texte.replace(/(\S):(\s)/g, '$1 :$2');

const TEXTES: Record<string, string> = {
  darkdisco: `Le dark disco est le genre qui m'a le plus attrapé, et c'est aussi celui que j'ai le plus de mal à faire comprendre. La meilleure définition que j'aie lue vient de Beatportal: trop dystopique pour être du disco, trop mélancolique pour de la house, trop musical pour de la techno.

Ce qui le distingue à l'oreille, c'est le chug. Un tempo lent, entre 115 et 125, une basse qui roule au lieu de frapper, souvent jouée plutôt que programmée, et des synthés froids hérités de la cold wave et de l'italo. Pas de montée euphorique, pas de drop. Ça avance, ça n'explose jamais.

Sur la filiation, la scène elle-même hésite. Curses situe les racines dans l'EBM et le new beat du début des années 80. RateYourMusic y ajoute l'italo disco pour le groove et le post-punk pour la couleur. Les deux ont raison, c'est un genre né d'un croisement, pas d'une lignée.

Le terme, lui, est récent. Il est apparu à Berlin vers la fin des années 2010 pour décrire un set de Moderna, avant de désigner tout un mouvement.`,

  indiedance: `Indie dance est le terme le plus flou de cette carte, et ce n'est pas ma faute. Il désigne trois choses différentes selon l'époque et selon qui parle.

Au début des années 90, en Angleterre, ça voulait dire la musique indie qui débarque sur le dancefloor: Stone Roses, Happy Mondays, les Charlatans. Puis au début des années 2000, ça a désigné les groupes qui remixaient du rock pour le club, The Rapture, LCD Soundsystem. Et aujourd'hui, sur Beatport, ça désigne encore autre chose: une catégorie commerciale de dance mélodique à tempo médian qui n'a plus grand-chose à voir avec l'indie.

Wikipedia le range comme un autre nom de l'alternative dance. RateYourMusic en fait un sous-genre de l'EDM pop. Un vieux fil Discogs le réclame comme une catégorie à part entière pour la scène de Madchester. Personne n'a tort.

Ce que je garde ici, c'est le sens que la scène underground lui donne aujourd'hui: du dance à tempo médian avec une basse jouée, une couleur mélancolique, et un pied dans le rock. Si tu n'es pas d'accord, tu as sans doute autant raison que moi.`,

  progpsy: `Le psy-prog est le genre où les gens se trompent le plus, moi le premier pendant longtemps.

L'erreur classique est de le confondre avec le progressive trance. Ça n'a rien à voir: le progressive trance est un cousin de la progressive house, le psy-prog vient de la rencontre entre le psytrance et le progressive. Le mot progressive ne désigne pas le même mouvement dans les deux cas.

Ce qui le définit n'est pas un son mais une manière. Le Psytrance Guide le dit mieux que moi: le psy-prog n'utilise pas un type de son particulier, il se concentre sur le groove, le flux, et la façon dont ça progresse dans le temps. C'est très consistant, souvent sans climax ni grand pic émotionnel. Si tu cherches le drop, tu vas t'ennuyer. Si tu écoutes du début à la fin, tu remarques comment une couche se pose sur l'autre. Entre 134 et 138 BPM, basse offbeat, mélodie présente mais jamais démonstrative.

La confusion suivante est avec le zenonesque, plus lent, plus sombre, moins mélodique, et sans refrain. Formellement on pourrait l'appeler progressive, mais c'est autre chose. Le Psytrance Guide lui-même annonce qu'il le séparera dans une version future de son classement. Ici, c'est déjà fait.`
};

transaction((corpus: AnyCorpus) => {
  for (const [id, brut] of Object.entries(TEXTES)) {
    const genre = corpus.genres.find((g) => g.id === id);
    if (!genre) throw new Error(`genre absent du corpus : ${id}`);
    genre['motDeLAuteur'] = espacerDeuxPoints(brut);
  }
});

for (const [id, brut] of Object.entries(TEXTES)) {
  const t = espacerDeuxPoints(brut);
  console.log(`${id} : ${t.split('\n\n').length} paragraphes, ${t.length} signes.`);
}
