/* À propos. Route #/a-propos.

   Sobre : ce qu'est SONAA, comment le lire, qui le fait, comment c'est
   fait. Pas d'autopromotion lourde, pas de biographie longue. Les comptes
   sont calculés depuis le corpus, jamais écrits en dur : ils resteront
   vrais quand le corpus grandira. */

import { FAMILIES, STRUCTURES } from './structures.ts';
import { SiteNav } from './SiteNav.tsx';
import './credits.css';

const GENRES = STRUCTURES.reduce((n, s) => n + s.genres.length, 0);
const TRACKS = STRUCTURES.reduce(
  (n, s) => n + s.genres.reduce((m, g) => m + g.tracks.length, 0),
  0
);

/* LE TEXTE D'AUTEUR, à la première personne. Écrit par Mika, recopié tel
   quel. Les paragraphes se séparent par une ligne vide.

   Il dit POURQUOI le site existe, là où le reste de la page dit ce qu'il est
   et comment il est fait. C'est la différence entre une notice et une voix,
   et c'est pour cela qu'il est au « je » et qu'il n'est pas résumé. */
const TEXTE_AUTEUR: string = `Je fais de la musique électronique depuis quinze ans, sous le nom de Maudite Machine, et je dirige VRSTL Records à Montréal. Autant dire que je passe mes journées à écouter des morceaux et à essayer de les ranger quelque part.

Et je me trompais tout le temps. On me demandait dans quel style tel morceau allait, je répondais au feeling, et je découvrais trois mois plus tard que la moitié de la scène l'aurait rangé ailleurs. Les frontières entre les genres ne sont pas dans les morceaux, elles sont dans les têtes des gens qui en parlent, et ces gens ne sont jamais d'accord.

SONAA est né de là. J'ai croisé les sources, les bases de données, les discussions de forums, les guides écrits par des gens de la scène, et j'en ai fait une carte. 219 genres, leurs filiations, et de quoi écouter ce dont on parle. Quand deux sources se contredisent, c'est écrit. Quand personne n'est d'accord, c'est écrit aussi.

Ce n'est pas une vérité. C'est une lecture, faite avec le plus de rigueur possible, et ouverte à la correction. Si tu connais un genre mieux que moi, propose. C'est fait pour ça.`;

export function AProposPage() {
  return (
    <main className="credits">
      <a className="credits-skip" href="#apropos-content">
        Aller au contenu
      </a>

      <header className="credits-head">
        <a href="#/" aria-label="SONAA, revenir à l'accueil">
          <img
            src={`${import.meta.env.BASE_URL}brand/sonaa-logo.png`}
            alt="SONAA"
            draggable={false}
          />
        </a>
        <h1>À propos</h1>
      </header>

      <div id="apropos-content" className="credits-body">
        <section aria-labelledby="apropos-quoi">
          <h2 id="apropos-quoi">Ce que c&apos;est</h2>
          <p>
            SONAA est un atlas généalogique des musiques électroniques : {GENRES} genres reliés
            à ce dont ils viennent et à ce qu&apos;ils ont donné, {TRACKS} tracks écoutables via
            le lecteur officiel YouTube. Les filiations sont présentées comme une lecture, pas
            comme une vérité : quand les sources se contredisent, le désaccord est conservé et
            signalé.
          </p>
        </section>

        <section aria-labelledby="apropos-lire">
          <h2 id="apropos-lire">Comment le lire</h2>
          <p>
            Les {FAMILIES.length} familles sont les continents de la carte. Un clic sur une
            famille la déploie, un clic sur un genre ouvre sa fiche et ses tracks, et chaque
            filiation se remonte ou se descend d&apos;un clic. L&apos;écoute ne s&apos;interrompt
            jamais pendant la navigation.
          </p>
        </section>

        <section aria-labelledby="apropos-auteur">
          <h2 id="apropos-auteur">L&apos;auteur</h2>
          <p>
            SONAA est réalisé par Mika, alias Maudite Machine, producteur et DJ à
            Montréal, fondateur de VRSTL Records.
          </p>

          {/* ESPACE POUR LE TEXTE D'AUTEUR, a la premiere personne.

              La ligne ci-dessus dit qui a fait le site. Ce bloc-ci est pour
              dire pourquoi, et il est ecrit au « je » : c'est la difference
              entre une notice et une voix.

              Vide, il ne s'affiche pas du tout, plutot qu'un encadre en
              attente qui ferait pense-bete a l'ecran. */}
          {TEXTE_AUTEUR && (
            <div className="apropos-voix">
              {TEXTE_AUTEUR.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}
          <p>
            <a href="https://mauditemachine.com" target="_blank" rel="me noopener noreferrer">
              mauditemachine.com
            </a>
            {' · '}
            <a
              href="https://mauditemachine.bandcamp.com"
              target="_blank"
              rel="me noopener noreferrer"
            >
              Bandcamp
            </a>
            {' · '}
            <a href="https://vrstlrecords.com" target="_blank" rel="noopener noreferrer">
              VRSTL Records
            </a>
          </p>
        </section>

        <section aria-labelledby="apropos-methode">
          <h2 id="apropos-methode">La méthode</h2>
          <p>
            Sources croisées, identifiants vidéo vérifiés un par un, jamais inventés ; les cas
            contestés portent la mention « filiation débattue ». Le détail est aux{' '}
            <a href="#/credits">crédits</a>.
          </p>
          <p>
            <strong>Dates de la chronologie :</strong> les années affichées dans la{' '}
            <a href="#/chronologie">vue chronologique</a> sont déduites de la track la plus ancienne
            de chaque genre dans le corpus. Elles ne sont pas des dates de naissance exactes, mais
            des repères fiables à environ deux ans près. C&apos;est pourquoi elles s&apos;affichent
            avec la mention « vers ».
          </p>
          <p>
            <strong>L&apos;arbre :</strong> la vue <a href="#/arbre">arbre</a> présente les
            quatorze familles et leurs {GENRES} genres imbriqués, déjà dépliés, dans le même ordre
            que la carte. Elle n&apos;ajoute aucune donnée : elle donne la même filiation sous
            forme de texte, où l&apos;on retrouve un nom plus vite que dans un graphe. Le nombre
            affiché à droite d&apos;un genre est son nombre de dérivés directs.
          </p>
          <p>
            <strong>Pourquoi la carte de chaleur mesure la descendance :</strong> parce
            qu&apos;aucune source publique ne mesure la notoriété d&apos;un genre précis. Nous
            avons testé les deux qui existent, et publions ce qu&apos;elles donnent.
          </p>
          <p>
            Last.fm connaît nos {GENRES} genres, mais son indicateur mesure la généralité du mot
            et non la notoriété du genre : les vingt-six termes parapluies du corpus, «&nbsp;ambient
            », «&nbsp;trance&nbsp;», «&nbsp;funk&nbsp;», pèsent en médiane quarante-trois fois
            plus que les cent quatre-vingt-treize termes précis. Seize des vingt valeurs les plus
            hautes sont des parapluies, alors qu&apos;ils ne sont que douze pour cent du corpus.
            Normaliser à l&apos;intérieur de chaque famille ramène l&apos;écart de quinze à deux
            et demi, mais trente-sept genres y ont moins de cent auditeurs, ce qui n&apos;est plus
            une mesure. Et les noms de nos familles y sont des homonymes : «&nbsp;hardcore&nbsp;»
            y désigne d&apos;abord le hardcore punk, «&nbsp;roots&nbsp;» le reggae roots.
          </p>
          <p>
            YouTube donne la médiane des vues des tracks d&apos;un genre. Elle mesure la
            popularité des tracks que nous avons choisies, pas celle du genre. Les deux sources ne
            se confirment pas l&apos;une l&apos;autre.
          </p>
          <p>
            La taille des blocs vient donc de la <strong>descendance généalogique</strong> :
            combien de genres descendent d&apos;un genre. C&apos;est la seule grandeur qui vienne
            du corpus lui-même, qui ne dépende d&apos;aucun service tiers, et qui ne puisse pas
            disparaître. Les deux mesures d&apos;écoute restent affichées sur la fiche de chaque
            genre, avec leur date : une donnée trop biaisée pour dimensionner reste lisible comme
            information.
          </p>
        </section>

        <section aria-labelledby="apropos-contribuer">
          <h2 id="apropos-contribuer">Contribuer</h2>
          <p>
            La fiche de chaque genre permet de proposer une track, de signaler une correction et,
            sur les filiations débattues, de défendre une autre lecture. Les propositions sont
            publiques et se soutiennent ou se contestent depuis{' '}
            <a href="#/propositions">la page des propositions</a>.
          </p>
          <p>
            Une proposition acceptée n&apos;entre pas d&apos;elle-même dans l&apos;atlas : elle
            est reportée à la main dans le corpus, avec ses sources. Le score oriente la décision,
            il ne la prend pas.
          </p>
        </section>
      </div>

      <footer className="credits-foot">
        <SiteNav variant="page" />
      </footer>
    </main>
  );
}
