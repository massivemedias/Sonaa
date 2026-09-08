/* LES SOIREES QU'ON A DEPOSEES, DANS LE PROFIL.

   La fiche du calendrier permet deja d'en tirer l'image et de la retirer,
   mais il faut la retrouver dans le calendrier pour cela. Ici elles sont
   toutes, a venir d'abord, avec les memes actions : c'est la ou quelqu'un
   qui organise revient le lendemain pour refaire sa story. */

import { useCallback, useEffect, useState } from 'react';
import { PartageSoiree } from './PartageSoiree.tsx';
import { toutesLesVilles } from '../lib/villes.ts';
import type { Ville } from '../lib/ville-active.ts';
import { mesSoirees, supprimerSoiree, type SoireeManuelle } from '../lib/soirees-manuelles.ts';
import { quandEnLettres } from '../lib/affiche-insta.ts';
import { langue, t } from '../langue/langue.ts';

export function MesSoirees() {
  const [liste, setListe] = useState<SoireeManuelle[]>([]);
  const [villes, setVilles] = useState<Map<string, Ville>>(new Map());
  const [erreur, setErreur] = useState<string | null>(null);

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
    <section className="sets-bloc">
      <h2>{t.mesSoirees}</h2>
      <p className="sp-aide">{t.mesSoireesIntro}</p>
      {erreur && <p className="sp-message">{erreur}</p>}
      {aVenir.length === 0 ? (
        <p className="sp-aide">{t.aucuneSoireeDeposee}</p>
      ) : (
        <ul className="ms-liste">
          {aVenir.map((s) => {
            const ville = villes.get(s.ville_id) ?? null;
            const fuseau = ville?.timezone ?? 'America/Toronto';
            return (
              <li key={s.id} className="ms-soiree">
                {s.affiche && <img className="ms-affiche" src={s.affiche} alt="" loading="lazy" />}
                <div className="ms-texte">
                  <strong>{s.titre}</strong>
                  <span>{quandEnLettres(s.debut, fuseau, langue)}</span>
                  <span>{[s.lieu, ville?.name].filter(Boolean).join(' · ')}</span>
                  {!s.publiee && <span className="ms-depubliee">{t.soireeDepubliee}</span>}
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
  );
}
