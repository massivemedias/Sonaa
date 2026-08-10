/* L'état de connexion, partagé par tous les écrans de contribution.

   Un seul abonnement à onAuthStateChange pour toute l'application : chaque
   composant qui s'abonnerait de son côté rejouerait la même requête réseau
   au montage, et la fiche de genre se monte à chaque clic sur une sphère. */

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase.ts';
import { nettoyerUrlDeRetour } from './auth.ts';

export interface EtatSession {
  /** null quand personne n'est connecté. */
  readonly session: Session | null;
  /** Vrai tant qu'on ne sait pas encore : évite de faire clignoter les boutons. */
  readonly chargement: boolean;
}

let sessionPartagee: Session | null = null;
let chargee = false;
const abonnes = new Set<(e: EtatSession) => void>();

function diffuser(): void {
  const etat: EtatSession = { session: sessionPartagee, chargement: !chargee };
  for (const a of abonnes) a(etat);
}

if (supabase) {
  void supabase.auth.getSession().then(({ data }) => {
    sessionPartagee = data.session;
    chargee = true;
    /* Le retour du lien magique laisse un `?code=` dans l'adresse. Il a été
       consommé par supabase-js juste au-dessus ; on l'efface maintenant pour
       qu'un rechargement ne tente pas de le rejouer. */
    nettoyerUrlDeRetour();
    diffuser();
  });

  supabase.auth.onAuthStateChange((_evenement, session) => {
    sessionPartagee = session;
    chargee = true;
    diffuser();
  });
}

export function useSession(): EtatSession {
  const [etat, setEtat] = useState<EtatSession>({
    session: sessionPartagee,
    chargement: supabase !== null && !chargee,
  });

  useEffect(() => {
    abonnes.add(setEtat);
    /* Une session peut être arrivée entre le premier rendu et cet effet. */
    setEtat({ session: sessionPartagee, chargement: supabase !== null && !chargee });
    return () => {
      abonnes.delete(setEtat);
    };
  }, []);

  return etat;
}
