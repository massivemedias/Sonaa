/* GLISSER-DEPOSER UN FICHIER, avec le clic qui continue de marcher.

   POURQUOI UN COMPOSANT ET NON DEUX ZONES ECRITES A LA MAIN. La photo de
   profil et le fichier de set posent le meme probleme et se trompent de la
   meme facon. Trois pieges, tous deja vus ailleurs :

   1. LE NAVIGATEUR OUVRE LE FICHIER PAR DEFAUT. Sans preventDefault sur
      dragover ET sur drop, lacher un WAV sur la page fait quitter le site
      pour aller lire le fichier. Le formulaire rempli est perdu.

   2. LE SURVOL CLIGNOTE. dragleave se declenche aussi quand le curseur passe
      sur un ENFANT de la zone. Un compteur de profondeur evite le
      clignotement ; un booleen simple ne suffit pas, c'est mesurable a
      l'oeil des qu'il y a un texte a l'interieur.

   3. LE CLAVIER RESTE UN CHEMIN. Une zone qui ne repond qu'a la souris
      exclut qui n'en a pas. Le champ de fichier natif reste donc la, cache
      mais atteignable, et la zone entiere est un libelle qui l'active.

   Le composant ne connait ni bucket ni format : il rend un fichier, et
   l'appelant decide. */

import { useCallback, useRef, useState, type ReactNode } from 'react';

interface Props {
  /** Ce que le champ natif accepte, et ce qu'on verifie au lacher. */
  readonly accept: readonly string[];
  readonly onFichier: (f: File) => void;
  readonly disabled?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

export function ZoneDepot({ accept, onFichier, disabled, children, className }: Props) {
  const [survol, setSurvol] = useState(false);
  const profondeur = useRef(0);
  const champ = useRef<HTMLInputElement | null>(null);

  const stop = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  const entrer = useCallback((e: React.DragEvent): void => {
    stop(e);
    if (disabled) return;
    profondeur.current += 1;
    setSurvol(true);
  }, [disabled]);

  const sortir = useCallback((e: React.DragEvent): void => {
    stop(e);
    profondeur.current = Math.max(0, profondeur.current - 1);
    if (profondeur.current === 0) setSurvol(false);
  }, []);

  const lacher = useCallback((e: React.DragEvent): void => {
    stop(e);
    profondeur.current = 0;
    setSurvol(false);
    if (disabled) return;
    /* ON NE PREND QUE LE PREMIER. Lacher trois fichiers sur une zone qui en
       attend un devrait donner un resultat previsible, pas trois envois
       concurrents. */
    const f = e.dataTransfer.files?.[0];
    if (f) onFichier(f);
  }, [disabled, onFichier]);

  return (
    <label
      className={`zd${survol ? ' zd-survol' : ''}${disabled ? ' zd-inactif' : ''}${className ? ' ' + className : ''}`}
      onDragEnter={entrer}
      onDragOver={stop}
      onDragLeave={sortir}
      onDrop={lacher}
    >
      <input
        ref={champ}
        type="file"
        accept={accept.join(',')}
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFichier(f);
          /* ON VIDE LE CHAMP. Sans cela, rechoisir LE MEME fichier apres une
             erreur ne declenche aucun evenement : la valeur n'a pas change.
             Le formulaire semble alors mort. */
          e.target.value = '';
        }}
      />
      {children}
    </label>
  );
}
