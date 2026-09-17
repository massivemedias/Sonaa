/* L'ECRAN DU PANIER. Route #/panier, chemin /panier/.
 *
 * C'est une FEUILLE POSEE SUR LA PAGE, pas une page de plus : un panier se
 * regarde sans quitter ce qu'on regardait. A droite sur ordinateur, plein
 * ecran sur telephone, comme la fiche d'une soiree l'est deja dans le
 * calendrier. Fermer revient d'ou l'on vient, par l'historique.
 *
 * Phase 0, 17 septembre 2026 : il est toujours vide, et il le dit. Le total,
 * les taxes et le bouton de paiement viendront en phase B ; la structure qui
 * les portera est deja la, pour que cette phase-la n'ait rien a deplacer. */

import { useEffect } from 'react';
import { t } from '../langue/langue.ts';
import { usePanier } from './usePanier.ts';
import { deviseDuPanier, retirerDuPanier, sousTotal } from './panier-store.ts';
import { EnTeteSite } from '../atlas/EnTeteSite.tsx';
import './panier.css';

/** Ferme la feuille : on revient a la page precedente si elle existe, sinon
    aux tracks, qui sont l'endroit d'ou l'on remplit un panier. */
function fermer(): void {
  if (window.history.length > 1) window.history.back();
  else window.location.hash = '#/tracks';
}

export function PanierEcran() {
  const articles = usePanier();
  const devise = deviseDuPanier(articles);
  const total = sousTotal(articles);

  useEffect(() => {
    document.title = `${t.lePanier} · SONAA`;
    const surTouche = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') fermer();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, []);

  return (
    <>
      <EnTeteSite />
      <div className="pn-voile" onClick={fermer}>
        <aside
          className="pn"
          role="dialog"
          aria-modal="true"
          aria-label={t.lePanier}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pn-tete">
            <h1 className="pn-titre">{t.lePanier}</h1>
            <button type="button" className="pn-fermer" onClick={fermer} aria-label={t.panierFermer}>
              ×
            </button>
          </div>

          {articles.length === 0 ? (
            <div className="pn-vide">
              <p className="pn-vide-mot">{t.panierVide}</p>
              <p className="pn-vide-aide">{t.panierVideAide}</p>
              <a className="pn-lien" href="#/tracks">
                {t.lesTracks}
              </a>
            </div>
          ) : (
            <>
              <ul className="pn-liste">
                {articles.map((a) => (
                  <li key={`${a.sorte}:${a.ref}`} className="pn-ligne">
                    <span className="pn-ligne-texte">
                      <span className="pn-ligne-titre">{a.titre}</span>
                      {a.artiste && <span className="pn-ligne-artiste">{a.artiste}</span>}
                    </span>
                    <span className="pn-ligne-prix">
                      {a.prix.toFixed(2)} {a.devise}
                    </span>
                    <button
                      type="button"
                      className="pn-retirer"
                      onClick={() => retirerDuPanier(a.sorte, a.ref)}
                      aria-label={t.supprimer}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <div className="pn-bas">
                <span className="pn-compte">{t.panierNArticles(articles.length)}</span>
                <span className="pn-total">
                  {t.panierSousTotal} {total.toFixed(2)} {devise}
                </span>
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
