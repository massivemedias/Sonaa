/* VOIR UNE POCHETTE EN GRAND.

   POURQUOI PAS UN NOUVEL ONGLET. Ouvrir l'image brute perd le contexte : on
   quitte la page, et sur telephone on revient par un bouton systeme qui
   recharge la liste et rejoue le defilement. Une couche par-dessus se ferme
   d'un geste et laisse la page exactement ou elle etait.

   TROIS FACONS DE FERMER, parce qu'on ne devine pas laquelle sera tentee :
   la touche d'echappement, un clic hors de l'image, et un bouton visible. Un
   panneau qu'on ne sait pas fermer est un panneau qui fait peur. */

import { useEffect } from 'react';
import { t } from '../langue/langue.ts';

interface Props {
  readonly url: string;
  readonly legende: string;
  readonly onFermer: () => void;
}

export function Loupe({ url, legende, onFermer }: Props) {
  useEffect(() => {
    const auClavier = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onFermer();
    };
    window.addEventListener('keydown', auClavier);
    /* LE FOND NE DEFILE PAS DERRIERE LA COUCHE. Sans cela, la molette fait
       glisser la liste sous l'image et on la retrouve ailleurs en fermant. */
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', auClavier);
      document.body.style.overflow = avant;
    };
  }, [onFermer]);

  return (
    <div className="loupe" role="dialog" aria-modal="true" aria-label={legende} onClick={onFermer}>
      <button className="loupe-fermer" onClick={onFermer} aria-label={t.fermerLImage}>
        ×
      </button>
      {/* Le clic sur l'image elle-meme ne ferme pas : on veut pouvoir la
          regarder sans que le moindre geste la fasse disparaitre. */}
      <img src={url} alt={legende} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
