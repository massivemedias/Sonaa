/* À propos. Route #/a-propos.

   Sobre : ce qu'est SONAA, comment le lire, qui le fait, comment c'est
   fait. Pas d'autopromotion lourde, pas de biographie longue. Les comptes
   sont calculés depuis le corpus, jamais écrits en dur : ils resteront
   vrais quand le corpus grandira. */

import { FAMILIES, STRUCTURES } from './structures.ts';
import './credits.css';

const GENRES = STRUCTURES.reduce((n, s) => n + s.genres.length, 0);
const TRACKS = STRUCTURES.reduce(
  (n, s) => n + s.genres.reduce((m, g) => m + g.tracksEssentiel.length + g.tracksActuel.length, 0),
  0
);

export function AProposPage() {
  return (
    <main className="credits">
      <a className="credits-skip" href="#apropos-content">
        Aller au contenu
      </a>

      <header className="credits-head">
        <a href="#/" aria-label="SONAA, revenir à l'atlas">
          <img
            src={`${import.meta.env.BASE_URL}brand/sonaa-wordmark.png`}
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
            SONAA est réalisé par Michael Sanchez, alias Maudite Machine, producteur et DJ à
            Montréal, fondateur de VRSTL Records.
          </p>
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
        </section>
      </div>

      <footer className="credits-foot">
        <a href="#/">Revenir à l&apos;atlas</a>
        <a href="#/credits">Crédits</a>
        <a href="#/index">Vue liste</a>
      </footer>
    </main>
  );
}
