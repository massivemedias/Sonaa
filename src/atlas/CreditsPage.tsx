/* Crédits. Route #/credits.

   Une page sobre : ce qui a servi à construire SONAA, sans hiérarchie de
   dette. Les sources documentaires sont nommées comme catégories, ouvrages et
   bases de données, jamais comme guides particuliers : c'est une règle du
   projet, la source ne s'affiche pas dans l'interface.

   Français seul : l'internationalisation n'est pas en place, on n'en simule
   pas une. */

import { FAMILIES, STRUCTURES } from './structures.ts';
import './credits.css';

const TOTAL = STRUCTURES.reduce((n, s) => n + s.genres.length, 0);

export function CreditsPage() {
  return (
    <main className="credits">
      <a className="credits-skip" href="#credits-content">
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
        <h1>Crédits</h1>
        <p className="credits-lede">
          Ce qui a servi à construire cet atlas, sans hiérarchie de dette.
        </p>
      </header>

      <div id="credits-content" className="credits-body">
        <section aria-labelledby="credits-sources">
          <h2 id="credits-sources">Les filiations</h2>
          <p>
            Les {TOTAL} genres et leurs liens ont été établis en croisant des encyclopédies
            généralistes et musicales, des bases de données discographiques, des cartographies
            historiques des musiques électroniques et des discussions de communautés
            d&apos;auditeurs. Aucune source ne fait autorité seule : quand deux se contredisent,
            le désaccord est conservé.
          </p>
          <p className="credits-caveat">
            Une filiation musicale est une lecture, pas une vérité. Les cas contestés sont
            signalés dans l&apos;atlas par la mention « filiation débattue », avec la nature du
            désaccord.
          </p>
        </section>

        <section aria-labelledby="credits-tech">
          <h2 id="credits-tech">Les technologies</h2>
          <ul>
            <li>Three.js, le rendu 3D</li>
            <li>React, l&apos;interface</li>
            <li>Vite, la construction</li>
            <li>TypeScript, le langage</li>
          </ul>
        </section>

        <section aria-labelledby="credits-services">
          <h2 id="credits-services">Les services</h2>
          <ul>
            <li>YouTube, la lecture des morceaux</li>
            <li>Deezer et iTunes, les pochettes</li>
          </ul>
          <p>
            Les morceaux sont lus via le lecteur officiel YouTube. SONAA n&apos;héberge aucun
            contenu audio : chaque identifiant de vidéo est vérifié, jamais inventé, et un
            morceau retiré de YouTube disparaît de la sélection.
          </p>
        </section>

        <section aria-labelledby="credits-families">
          <h2 id="credits-families">Les {FAMILIES.length} familles</h2>
          <ul className="credits-families">
            {FAMILIES.map((f) => (
              <li key={f.id}>
                <span
                  className="credits-dot"
                  style={{ background: `oklch(0.72 0.15 ${f.hue})` }}
                  aria-hidden="true"
                />
                {f.label}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="credits-author">
          <h2 id="credits-author">L&apos;auteur</h2>
          <p>
            Michael Sanchez, Montréal ·{' '}
            <a
              href="https://mauditemachine.com"
              target="_blank"
              rel="me noopener noreferrer"
            >
              mauditemachine.com
            </a>
          </p>
        </section>
      </div>

      <footer className="credits-foot">
        <a href="#/">Revenir à l&apos;atlas</a>
        <a href="#/index">Vue liste</a>
      </footer>
    </main>
  );
}
