/* Le fil de discussion d'un genre, dans la colonne, sous les infos.

   REPLIABLE ET FERME PAR DEFAUT. Une fiche de genre sert d'abord a ecouter :
   le fil ne doit pas pousser les morceaux hors de l'ecran. Le compte visible
   sur le bouton dit s'il y a quelque chose a lire sans avoir a deplier.

   CE QUI NE CHARGE RIEN. Tant que la section reste fermee, aucune requete
   n'est faite. Le SDK Supabase, lui, n'arrive qu'a la premiere ECRITURE :
   lire un fil ne coute que le fetch de la vue publique. */

import { useCallback, useEffect, useState } from 'react';

import {
  type Commentaire,
  dateCourte,
  filDuGenre,
  filFerme,
  publierCommentaire,
  retirerCommentaire,
  signalerCommentaire,
  voterCommentaire
} from '../lib/comments.ts';
import { contributionsActives } from '../lib/config.ts';
import { sessionProbable } from '../lib/track-votes.ts';

interface Props {
  genreId: string;
  /* La couleur de la famille : le liseré du message de l'auteur du site la
     reprend, pour qu'il se distingue sans badge tapageur. */
  couleurFamille: string;
}

const LONGUEUR_MAX = 1000;

export function CommentsSection({ genreId, couleurFamille }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [fil, setFil] = useState<Commentaire[]>([]);
  const [ferme, setFerme] = useState(false);
  const [charge, setCharge] = useState(false);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const connecte = sessionProbable();

  const recharger = useCallback(async () => {
    const [lignes, estFerme] = await Promise.all([filDuGenre(genreId), filFerme(genreId)]);
    setFil(lignes);
    setFerme(estFerme);
    setCharge(true);
  }, [genreId]);

  /* Rien ne part sur le reseau tant que la section est fermee. */
  useEffect(() => {
    if (!ouvert) return;
    void recharger();
  }, [ouvert, recharger]);

  /* Changer de genre referme le fil : le laisser ouvert afficherait un
     instant la discussion du genre precedent sous le nouveau titre. */
  useEffect(() => {
    setOuvert(false);
    setCharge(false);
    setFil([]);
    setTexte('');
    setMessage(null);
  }, [genreId]);

  if (!contributionsActives) return null;

  const dire = (r: Awaited<ReturnType<typeof publierCommentaire>>): boolean => {
    if (r.ok) {
      setMessage(null);
      return true;
    }
    setMessage(
      r.raison === 'connexion'
        ? 'Connecte-toi pour participer.'
        : r.raison === 'quota'
          ? 'Tu as atteint dix messages pour aujourd’hui.'
          : r.raison === 'ferme'
            ? 'Les commentaires sont fermés sur ce genre.'
            : 'Envoi impossible pour le moment.'
    );
    return false;
  };

  const publier = async () => {
    const propre = texte.trim();
    if (propre.length < 2) return;
    setEnvoi(true);
    const r = await publierCommentaire(genreId, propre);
    setEnvoi(false);
    if (dire(r)) {
      setTexte('');
      await recharger();
    }
  };

  const voter = async (id: string, valeur: -1 | 1) => {
    if (dire(await voterCommentaire(id, valeur))) await recharger();
  };

  const signaler = async (id: string) => {
    if (dire(await signalerCommentaire(id))) {
      setMessage('Signalé. Un modérateur va regarder.');
    }
  };

  const retirer = async (id: string) => {
    if (dire(await retirerCommentaire(id))) await recharger();
  };

  return (
    <section className="pcol-fil" aria-labelledby={`fil-${genreId}`}>
      <button
        id={`fil-${genreId}`}
        className="pcol-info-toggle"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
      >
        Discussion{charge && fil.length > 0 ? ` (${fil.length})` : ''} {ouvert ? '▾' : '▸'}
      </button>

      {ouvert && (
        <div className="pcol-fil-corps">
          {message && (
            <p className="pcol-fil-message" role="status">
              {message}
            </p>
          )}

          {/* La saisie n'apparait que si elle peut aboutir : ni pour un
              visiteur non connecte, ni sur un fil ferme. Proposer un champ
              qui sera refuse est une petite malhonnetete d'interface. */}
          {ferme ? (
            <p className="pcol-fil-vide">Les commentaires sont fermés sur ce genre.</p>
          ) : connecte ? (
            <div className="pcol-fil-saisie">
              <textarea
                value={texte}
                onChange={(e) => setTexte(e.target.value.slice(0, LONGUEUR_MAX))}
                placeholder="Ce que tu sais de ce genre, ce que tu écoutes."
                rows={3}
                aria-label="Écrire un message"
              />
              <div className="pcol-fil-actions">
                <span className="pcol-fil-compte">
                  {texte.length}/{LONGUEUR_MAX}
                </span>
                <button onClick={() => void publier()} disabled={envoi || texte.trim().length < 2}>
                  {envoi ? 'Envoi…' : 'Publier'}
                </button>
              </div>
            </div>
          ) : (
            <p className="pcol-fil-vide">Connecte-toi pour participer à la discussion.</p>
          )}

          {charge && fil.length === 0 && (
            <p className="pcol-fil-vide">Personne n&apos;a encore écrit sur ce genre.</p>
          )}

          <ul className="pcol-fil-liste">
            {fil.map((c) => (
              <li
                key={c.id}
                className="pcol-fil-item"
                data-auteur={c.parAuteurDuSite || undefined}
                /* Le liseré de l'auteur du site prend la couleur de la
                   famille : il se remarque sans crier. */
                style={
                  c.parAuteurDuSite
                    ? ({ borderInlineStartColor: couleurFamille } as React.CSSProperties)
                    : undefined
                }
              >
                <div className="pcol-fil-entete">
                  <span className="pcol-fil-auteur">
                    {c.parAuteurDuSite ? 'Mika' : c.auteur}
                  </span>
                  {c.parAuteurDuSite && <span className="pcol-fil-marque">auteur du site</span>}
                  <span className="pcol-fil-date">{dateCourte(c.createdAt)}</span>
                </div>

                {/* Un message retire garde sa place : un trou inexplique dans
                    un fil se lit plus mal qu'une mention franche. */}
                <p className="pcol-fil-texte">
                  {c.masque || c.body === null ? (
                    <em>Message retiré par la modération.</em>
                  ) : (
                    c.body
                  )}
                </p>

                <div className="pcol-fil-pied">
                  <button onClick={() => void voter(c.id, 1)} aria-label="Approuver">
                    ▲
                  </button>
                  <span className="pcol-fil-score">{c.score}</span>
                  <button onClick={() => void voter(c.id, -1)} aria-label="Désapprouver">
                    ▼
                  </button>
                  {connecte && (
                    <>
                      <button className="pcol-fil-lien" onClick={() => void signaler(c.id)}>
                        signaler
                      </button>
                      <button className="pcol-fil-lien" onClick={() => void retirer(c.id)}>
                        retirer
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
