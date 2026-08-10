/* Le fil des propositions : chargement, votes, identité de l'appelant.

   Partagé par #/propositions et #/moderation, qui affichent le même fil
   filtré différemment. Le vote optimiste vit ici, pas dans les pages : c'est
   la partie délicate, et elle ne doit exister qu'une fois. */

import { useCallback, useEffect, useState } from 'react';
import { contributionsActives } from './supabase.ts';
import {
  listerPropositions,
  mesVotes,
  monPseudonyme,
  retirerVote,
  suisJeModerateur,
  voter,
  type Proposition,
  type ProposalStatus,
} from './proposals.ts';
import { useSession } from './useSession.ts';

export interface Fil {
  readonly propositions: Proposition[];
  readonly votes: Map<string, number>;
  readonly pseudonyme: string | null;
  readonly moderateur: boolean;
  readonly connecte: boolean;
  readonly chargement: boolean;
  readonly erreur: string | null;
  readonly setErreur: (m: string | null) => void;
  readonly recharger: () => void;
  readonly cliquerVote: (p: Proposition, valeur: 1 | -1) => void;
}

export function useFil(options: {
  statut: ProposalStatus | 'toutes';
  genreId?: string | null;
}): Fil {
  const { statut, genreId } = options;
  const { session } = useSession();
  const [propositions, setPropositions] = useState<Proposition[]>([]);
  const [votes, setVotes] = useState<Map<string, number>>(new Map());
  const [pseudonyme, setPseudonyme] = useState<string | null>(null);
  const [moderateur, setModerateur] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(() => {
    if (!contributionsActives) {
      setChargement(false);
      return;
    }
    setChargement(true);
    void (async () => {
      try {
        const liste = await listerPropositions({
          statut,
          ...(genreId ? { genreId } : {}),
        });
        setPropositions(liste);
        setVotes(await mesVotes(liste.map((p) => p.id)));
        setErreur(null);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : 'Lecture impossible.');
      } finally {
        setChargement(false);
      }
    })();
  }, [statut, genreId]);

  useEffect(recharger, [recharger]);

  useEffect(() => {
    if (!session) {
      setPseudonyme(null);
      setModerateur(false);
      return;
    }
    void monPseudonyme().then(setPseudonyme);
    void suisJeModerateur().then(setModerateur);
  }, [session]);

  /* Vote optimiste : l'écran bouge au clic, l'écriture suit, et l'état
     revient exactement en arrière si elle échoue. Attendre la réponse du
     serveur donne l'impression que le clic n'a pas pris, et se fait cliquer
     deux fois — ce qui produit ensuite un vote qu'on n'a pas voulu. */
  const cliquerVote = useCallback(
    (p: Proposition, valeur: 1 | -1) => {
      if (!session) {
        setErreur(
          'Il faut être connecté pour voter. Déposez une proposition depuis la fiche d’un genre pour recevoir un lien de connexion.'
        );
        return;
      }
      const ancien = votes.get(p.id) ?? 0;
      /* Recliquer le même sens retire le vote : c'est le geste attendu, et
         il évite d'avoir à chercher un bouton « annuler ». */
      const nouveau = ancien === valeur ? 0 : valeur;
      const delta = nouveau - ancien;
      if (delta === 0) return;

      const appliquer = (v: number, d: number) => {
        setVotes((carte) => {
          const copie = new Map(carte);
          if (v === 0) copie.delete(p.id);
          else copie.set(p.id, v);
          return copie;
        });
        setPropositions((liste) =>
          liste.map((x) => (x.id === p.id ? { ...x, score: x.score + d } : x))
        );
      };

      appliquer(nouveau, delta);

      void (async () => {
        try {
          if (nouveau === 0) await retirerVote(p.id);
          else await voter(p.id, nouveau);
          setErreur(null);
        } catch (e) {
          appliquer(ancien, -delta);
          setErreur(e instanceof Error ? e.message : 'Vote impossible.');
        }
      })();
    },
    [session, votes]
  );

  return {
    propositions,
    votes,
    pseudonyme,
    moderateur,
    connecte: session !== null,
    chargement,
    erreur,
    setErreur,
    recharger,
    cliquerVote,
  };
}
