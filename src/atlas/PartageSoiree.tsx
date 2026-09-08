/* CE QU'ON PEUT FAIRE D'UNE SOIREE QU'ON A DEPOSEE : l'image pour
   Instagram, le texte du post, et la retirer.

   Le meme bloc sert dans la fiche du calendrier et dans le profil, pour que
   les deux endroits fassent exactement la meme chose. L'image est dessinee
   ici, dans le navigateur (voir lib/affiche-insta.ts), et proposee en
   telechargement ; le texte va dans le presse-papiers. */

import { useState } from 'react';
import {
  genererAfficheInsta,
  nomDeFichier,
  texteDuPost,
  type SoireePourAffiche,
} from '../lib/affiche-insta.ts';
import { langue, t } from '../langue/langue.ts';
import './partage-soiree.css';

interface Props {
  readonly soiree: SoireePourAffiche;
  readonly ville: string | null;
  readonly fuseau: string;
  /** Present quand la personne peut retirer la soiree. */
  readonly onRetirer?: () => Promise<void>;
}

export function PartageSoiree({ soiree, ville, fuseau, onRetirer }: Props) {
  const [etat, setEtat] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [apercu, setApercu] = useState<string | null>(null);

  const image = async (): Promise<void> => {
    setOccupe(true);
    setEtat(t.imageEnCours);
    try {
      const police = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
      const blob = await genererAfficheInsta(soiree, { fuseau, langue, police });
      const url = URL.createObjectURL(blob);
      setApercu((ancien) => {
        if (ancien) URL.revokeObjectURL(ancien);
        return url;
      });
      /* LE TELECHARGEMENT PART TOUT DE SUITE, et l'apercu reste a l'ecran :
         sur telephone, c'est l'apercu qu'on garde en appuyant longuement,
         quand le navigateur n'ouvre pas de dialogue d'enregistrement. */
      const a = document.createElement('a');
      a.href = url;
      a.download = nomDeFichier(soiree.titre);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setEtat(t.imagePrete);
    } catch (e) {
      setEtat(e instanceof Error ? e.message : t.imageImpossible);
    } finally {
      setOccupe(false);
    }
  };

  const texte = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(texteDuPost(soiree, fuseau, langue, ville));
      setEtat(t.texteCopie);
    } catch {
      setEtat(t.copieImpossible);
    }
  };

  const retirer = async (): Promise<void> => {
    if (!onRetirer) return;
    if (!window.confirm(t.confirmerRetraitSoiree)) return;
    setOccupe(true);
    try {
      await onRetirer();
    } catch (e) {
      setEtat(e instanceof Error ? e.message : t.retraitImpossible);
      setOccupe(false);
    }
  };

  return (
    <div className="ps">
      <div className="ps-boutons">
        <button type="button" className="ps-bouton ps-principal" disabled={occupe} onClick={() => void image()}>
          {t.imagePourInstagram}
        </button>
        <button type="button" className="ps-bouton" onClick={() => void texte()}>
          {t.copierLeTexteDuPost}
        </button>
        {onRetirer && (
          <button type="button" className="ps-bouton ps-retirer" disabled={occupe} onClick={() => void retirer()}>
            {t.retirerLaSoiree}
          </button>
        )}
      </div>
      {etat && <p className="ps-etat">{etat}</p>}
      {apercu && (
        <a className="ps-apercu" href={apercu} download={nomDeFichier(soiree.titre)}>
          <img src={apercu} alt="" />
        </a>
      )}
    </div>
  );
}
