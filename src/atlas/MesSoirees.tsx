/* L'ONGLET « EVENEMENTS » DU PROFIL : ajouter une soiree, retrouver les
   siennes.

   Mika, le 1er octobre 2026 : « cette page est mal faite, je veux quelque
   chose de plus propre avec le design du site, et que ce soit simple et
   clair pour les gens de rajouter quelque chose ». Elle empilait un
   formulaire de modération de huit champs bruts et la liste de soixante
   soirees de tous les comptes. Elle tient maintenant en deux blocs :

   1. AJOUTER : le formulaire commun, qui commence par le lien a coller
      (FormulaireSoiree.tsx).
   2. A VENIR : les soirees de la personne, en cartes, chacune avec son
      image pour Instagram, le texte du post et le retrait (PartageSoiree).

   LA LISTE DE TOUS LES COMPTES QUITTE LE PROFIL. Elle sert a moderer, et
   elle vit deja dans l'administration (#/admin/soirees) ; ici, un
   moderateur n'en voit qu'un lien. */

import { useCallback, useEffect, useState } from 'react';
import { PartageSoiree } from './PartageSoiree.tsx';
import { FormulaireSoiree } from './FormulaireSoiree.tsx';
import { toutesLesVilles } from '../lib/villes.ts';
import type { Ville } from '../lib/ville-active.ts';
import { mesSoirees, supprimerSoiree, type SoireeManuelle } from '../lib/soirees-manuelles.ts';
import { quandEnLettres } from '../lib/affiche-insta.ts';
import { langue, t } from '../langue/langue.ts';
import './formulaire-soiree.css';

export function MesSoirees({ moderateur }: { readonly moderateur: boolean }) {
  const [liste, setListe] = useState<SoireeManuelle[]>([]);
  const [villes, setVilles] = useState<Map<string, Ville>>(new Map());
  const [erreur, setErreur] = useState<string | null>(null);
  const [ajoutee, setAjoutee] = useState(false);

  const recharger = useCallback(() => {
    void mesSoirees()
      .then(setListe)
      .catch((e: unknown) => setErreur(e instanceof Error ? e.message : t.lectureImpossible));
  }, []);

  useEffect(recharger, [recharger]);
  useEffect(() => {
    void toutesLesVilles().then((v) => setVilles(new Map(v.map((x) => [x.id, x]))));
  }, []);

  const maintenant = Date.now();
  const aVenir = liste.filter((s) => new Date(s.debut).getTime() >= maintenant - 6 * 3600 * 1000);

  return (
    <>
      <section className="sets-bloc ev-bloc">
        <h2>{t.ajouterUneSoiree}</h2>
        <p className="ev-intro">{t.mesSoireesIntro}</p>
        <FormulaireSoiree
          villeInitiale={null}
          onAjoutee={() => {
            setAjoutee(true);
            recharger();
          }}
        />
        {ajoutee && (
          <p className="fs-bilan ev-ajoutee" role="status">
            {t.soireeAjoutee}
          </p>
        )}
      </section>

      <section className="sets-bloc ev-bloc">
        <h2>
          {t.soireesAVenirTitre}
          {aVenir.length > 0 && <span className="ev-compte">{aVenir.length}</span>}
        </h2>
        {erreur && <p className="sp-message">{erreur}</p>}
        {aVenir.length === 0 ? (
          <p className="ev-vide">{t.aucuneSoireeDeposee}</p>
        ) : (
          <ul className="ev-liste">
            {aVenir.map((s) => {
              const ville = villes.get(s.ville_id) ?? null;
              const fuseau = ville?.timezone ?? 'America/Toronto';
              return (
                <li key={s.id} className="ev-carte">
                  {s.affiche ? (
                    <img className="ev-affiche" src={s.affiche} alt="" loading="lazy" />
                  ) : (
                    <span className="ev-affiche ev-affiche-vide" aria-hidden="true" />
                  )}
                  <div className="ev-texte">
                    <span className="ev-quand">{quandEnLettres(s.debut, fuseau, langue)}</span>
                    <strong className="ev-titre">{s.titre}</strong>
                    <span className="ev-ou">{[s.lieu, ville?.name].filter(Boolean).join(' · ')}</span>
                    {!s.publiee && <span className="ev-depubliee">{t.soireeDepubliee}</span>}
                    <PartageSoiree
                      soiree={s}
                      ville={ville?.name ?? null}
                      fuseau={fuseau}
                      onRetirer={async () => {
                        await supprimerSoiree(s.id);
                        recharger();
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {moderateur && (
        <p className="ev-moderation">
          {t.moderationSoireesAilleurs} <a href="#/admin/soirees">{t.ouvrirLAdministration}</a>
        </p>
      )}
    </>
  );
}
