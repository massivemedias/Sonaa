/* AJOUTER UNE SOIREE, DEPUIS LE CALENDRIER, QUAND ON EST CONNECTE.
 *
 * ═══ CE QUE C'EST ═══
 *
 * Une feuille, comme la fiche d'une soiree, qui porte le formulaire commun
 * (FormulaireSoiree.tsx) : on colle le lien, la fiche se remplit, on
 * corrige, on ajoute. Ce qui est depose apparait dans le calendrier tout de
 * suite, avec la pastille « membre », et la personne peut ensuite en tirer
 * l'image pour Instagram (voir PartageSoiree).
 *
 * Demande de Mika du 7 septembre 2026. Le lien de billets est un champ libre
 * pour l'instant ; une billetterie viendra plus tard, et c'est ce champ
 * qu'elle remplira.
 *
 * ═══ CE QUI EST VERROUILLE PAR LA BASE, PAS PAR L'ECRAN ═══
 *
 * Sans session, le formulaire ne s'affiche pas et propose de se connecter.
 * Mais ce n'est pas ce qui protege : la base n'accepte d'un membre qu'une
 * soiree portant la source « membre » et son propre compte, et pas plus de
 * vingt par jour. Voir la migration soirees_des_membres.
 *
 * ═══ L'HEURE EST CELLE DE LA SALLE ═══
 *
 * La date est construite composante par composante, dans le fuseau de la
 * ville, jamais par `new Date('2026-09-12T22:00')` : quelqu'un qui depose
 * depuis Paris une soiree a Montreal ecrit l'heure de Montreal.
 */

import { useEffect } from 'react';
import type { Ville } from '../lib/ville-active.ts';
import type { SoireeManuelle } from '../lib/soirees-manuelles.ts';
import { useSession } from '../lib/useSession.ts';
import { FormulaireSoiree } from './FormulaireSoiree.tsx';
import { t } from '../langue/langue.ts';
import './ajouter-soiree.css';

interface Props {
  readonly ville: Ville;
  readonly onFermer: () => void;
  readonly onAjoutee: (s: SoireeManuelle) => void;
}

export function AjouterSoiree({ ville, onFermer, onAjoutee }: Props) {
  const { session, chargement } = useSession();

  useEffect(() => {
    const surTouche = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onFermer();
    };
    window.addEventListener('keydown', surTouche);
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', surTouche);
      document.body.style.overflow = avant;
    };
  }, [onFermer]);

  const corps = chargement ? null : !session ? (
    <div className="aj-connexion">
      <p>{t.connexionPourAjouter}</p>
      <button
        type="button"
        className="aj-principal"
        onClick={() => window.dispatchEvent(new Event('sonaa:connexion'))}
      >
        {t.seConnecter}
      </button>
    </div>
  ) : (
    <FormulaireSoiree villeInitiale={ville} onAjoutee={onAjoutee} onAnnuler={onFermer} />
  );

  return (
    <div className="cal-voile" onClick={onFermer}>
      <div
        className="cal-feuille"
        role="dialog"
        aria-modal="true"
        aria-label={t.ajouterUneSoiree}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cal-feuille-tete">
          <span className="cal-feuille-poignee" aria-hidden="true" />
          <h3 className="cal-feuille-titre">{t.ajouterUneSoiree}</h3>
          <button type="button" className="cal-feuille-fermer" onClick={onFermer} aria-label={t.fermer}>
            ×
          </button>
        </div>
        <div className="cal-fiche">{corps}</div>
      </div>
    </div>
  );
}
