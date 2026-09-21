/* LA PAGE QUE RENDENT #/tracks ET #/panier TANT QUE RIEN NE SE VEND.
 *
 * Voir src/config.ts : quand MARCHAND_ACTIF est `false`, les deux adresses
 * repondent toujours, mais elles ne rendent plus la section de vente ni
 * l'ecran du panier. Elles rendent celle-ci.
 *
 * POURQUOI UNE PAGE ET NON UNE REDIRECTION. Une adresse partagee, ou tapee de
 * memoire, ou gardee dans un signet, doit dire ce qu'elle est devenue. Une
 * redirection silencieuse vers le calendrier laisse croire a une erreur de
 * frappe ; une phrase et un lien disent qu'il n'y a rien ici pour l'instant
 * et ou aller.
 *
 * ELLE EST HORS INDEX, des deux cotes. La page pre-rendue porte
 * `noindex, follow` et sort du plan du site et d'IndexNow (prerender.ts) ;
 * cette vue-ci pose la meme balise a l'hydratation, pour le cas ou un moteur
 * arrive par le routeur plutot que par le fichier statique. Rien n'est
 * indexe aujourd'hui, et on ne laisse pas de trace derriere.
 *
 * LE CODE DE LA BOUTIQUE N'EST PAS SUPPRIME. TracksPage et PanierEcran
 * existent, testes, et reviennent en remettant le drapeau a `true`. */

import { useEffect } from 'react';
import { t } from '../langue/langue.ts';
import { EnTeteSite } from '../atlas/EnTeteSite.tsx';
import { PiedDePage } from '../atlas/PiedDePage.tsx';
import '../atlas/credits.css';
import './tracks.css';

/* LA BALISE EST POSEE A L'ENTREE ET RETIREE A LA SORTIE. Sans le retrait,
   elle resterait sur la page suivante visitee dans la meme session, et on
   desindexerait le calendrier pour avoir ouvert le panier avant. Meme
   mecanisme que la vue de lecture d'un article. */
function useHorsIndex(): void {
  useEffect(() => {
    const balise = document.createElement('meta');
    balise.setAttribute('name', 'robots');
    balise.setAttribute('content', 'noindex, follow');
    document.head.appendChild(balise);
    return () => {
      balise.remove();
    };
  }, []);
}

export function MarchandFerme() {
  useHorsIndex();
  useEffect(() => {
    document.title = `${t.tracksBientot} · SONAA`;
  }, []);

  return (
    <>
      <EnTeteSite />
      <main className="credits">
        <header className="credits-head">
          <h1>{t.tracksBientot}</h1>
          <p className="credits-lede intro-page">{t.marchandFermeTexte}</p>
        </header>

        <div className="credits-body">
          <section className="tr-attente">
            <h2 className="tr-attente-titre">{t.marchandFermeQuoi}</h2>
            <p className="tr-attente-texte">{t.tracksBientotTexte}</p>
            <p>
              <a className="tr-lien" href="#/calendrier">
                {t.marchandFermeRetour}
              </a>
            </p>
          </section>
        </div>
      </main>
      <PiedDePage />
    </>
  );
}
