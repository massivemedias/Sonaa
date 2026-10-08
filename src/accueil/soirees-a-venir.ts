/* LES PROCHAINES SOIREES DE LA VILLE, POUR L'ACCUEIL.
 *
 * La meme ville que le calendrier, trouvee de la meme facon (le lien, la
 * session, le profil, la deduction : voir resoudreVille), et la meme
 * requete, a l'identique : quatre-vingt-dix jours, huit pages. Ce n'est pas
 * de la paresse. La racine lance cette requete pour Montreal avant meme que
 * le bundle arrive (voir le fragment `precharge` de scripts/prerender.ts) ;
 * une requete identique reprend cette promesse au lieu d'en refaire une, et
 * la passerelle garde les pages une heure pour le calendrier qui suivra. */

import { useEffect, useMemo, useState } from 'react';
import { agenda, ouJeSuis, type Soiree } from '../lib/agenda.ts';
import { fenetreDe } from '../lib/fenetre-agenda.ts';
import { resoudreVille, type Ville } from '../lib/ville-active.ts';
import { soireesManuelles } from '../lib/soirees-manuelles.ts';
import { sansDoublons } from '../lib/sans-doublons.ts';
import { toutesLesVilles, villeDattache, villeDeSession, villeDuLien } from '../lib/villes.ts';

export interface SoireesAVenir {
  readonly ville: Ville | null;
  /** Null tant que rien n'est arrive. */
  readonly soirees: readonly Soiree[] | null;
  readonly nVilles: number;
  /** Vrai quand on sait qu'aucune ville ne peut etre deduite. */
  readonly sansVille: boolean;
}

export function useSoireesAVenir(combien: number): SoireesAVenir {
  const [villes, setVilles] = useState<Ville[]>([]);
  const [idProfil, setIdProfil] = useState<string | null>(null);
  const [zone, setZone] = useState<number | null>(null);
  const [deduction, setDeduction] = useState(false);
  const [soirees, setSoirees] = useState<readonly Soiree[] | null>(null);
  const [slugLien] = useState(() => villeDuLien());
  const [slugSession] = useState(() => villeDeSession());

  useEffect(() => {
    let vivant = true;
    void toutesLesVilles().then((v) => vivant && setVilles(v));
    void villeDattache().then((id) => vivant && setIdProfil(id));
    void ouJeSuis().then((ou) => {
      if (!vivant) return;
      setZone(ou.zone?.id ?? null);
      setDeduction(true);
    });
    return () => {
      vivant = false;
    };
  }, []);

  const deduite = useMemo(() => (zone == null ? null : (villes.find((v) => v.ra_area_id === zone) ?? null)), [villes, zone]);
  const { ville } = useMemo(
    () => resoudreVille({ slugDuLien: slugLien, slugDeSession: slugSession, villeDuProfil: idProfil, villeDeduite: deduite, connues: villes }),
    [slugLien, slugSession, idProfil, deduite, villes]
  );

  useEffect(() => {
    if (!ville?.ra_area_id) return;
    let vivant = true;
    const { du, au } = fenetreDe('suite', null, new Date());
    void Promise.all([agenda({ zone: ville.ra_area_id, du, au, pages: 8 }), soireesManuelles(ville.id, du, au).catch(() => [])]).then(([r, mains]) => {
      if (!vivant) return;
      const ajoutees: Soiree[] = mains.map((m) => ({
        id: `main:${m.id}`,
        titre: m.titre,
        date: m.debut,
        debut: m.debut,
        lieu: m.lieu,
        artistes: m.artistes,
        genres: m.genres,
        affiche: m.affiche,
        lien: m.lien ?? '',
        interesses: 0,
      }));
      const tout = sansDoublons([...(r?.soirees ?? []), ...ajoutees]).sort((a, b) => a.date.localeCompare(b.date));
      /* LES AFFICHES D'ABORD : une rangee de cartes sans image ressemble a
         une liste d'attente. Celles qui en ont passent devant, dans l'ordre
         des dates, et les autres completent s'il en manque. */
      const avec = tout.filter((s) => s.affiche);
      const sans = tout.filter((s) => !s.affiche);
      setSoirees([...avec, ...sans].slice(0, combien).sort((a, b) => a.date.localeCompare(b.date)));
    });
    return () => {
      vivant = false;
    };
  }, [ville, combien]);

  return { ville, soirees, nVilles: villes.length, sansVille: deduction && villes.length > 0 && !ville };
}
