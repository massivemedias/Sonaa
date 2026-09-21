/* LES TRACKS. Route #/tracks, chemin /tracks/.
 *
 * La section de vente, ouverte vide. Phase 0, 17 septembre 2026 : la porte
 * existe, la boutique n'est pas montee. C'est volontaire, et c'est dit a
 * l'ecran plutot que cache : une page qui promet « bientot » vaut mieux
 * qu'une entree de menu qui mene a une erreur, et elle donne aux moteurs de
 * recherche une adresse stable a apprendre des maintenant.
 *
 * TRACKS N'EST PAS MORCEAUX. Le corpus appelle « morceaux » les 2 382
 * references des genres, et il garde ce mot dans tout le code. « Tracks »
 * designe ici, et ici seulement, ce qu'un artiste met en vente. Les deux ne
 * se croisent jamais dans une meme liste. */

import { useEffect } from 'react';
import { t } from '../langue/langue.ts';
import { EnTeteSite } from '../atlas/EnTeteSite.tsx';
import { PiedDePage } from '../atlas/PiedDePage.tsx';
import '../atlas/credits.css';
import './tracks.css';

export function TracksPage() {
  useEffect(() => {
    document.title = `${t.lesTracks} · SONAA`;
  }, []);

  return (
    <>
      <EnTeteSite />
      <main className="credits">
        <header className="credits-head">
          <h1>{t.lesTracks}</h1>
          <p className="credits-lede intro-page">{t.tracksChapeau}</p>
        </header>

        <div className="credits-body">
          <section className="tr-attente">
            <h2 className="tr-attente-titre">{t.tracksBientot}</h2>
            <p className="tr-attente-texte">{t.tracksBientotTexte}</p>
            <p>
              <a className="tr-lien" href="#/mixtapes">
                {t.lesMixtapes}
              </a>
            </p>
          </section>
        </div>

        <PiedDePage />
      </main>
    </>
  );
}
