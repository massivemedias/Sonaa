/* LES MISES EN AVANT, dans l'admin. Voir lib/mise-en-avant.ts et
 * docs/adr/ADR-109-mise-en-avant-payante.md.
 *
 * Trois gestes. « Offrir » active une mise en avant sans paiement en ligne :
 * un virement Interac, un echange, un cadeau pour lancer la chose.
 * « Retirer » l'enleve du calendrier ; le remboursement, lui, se fait dans
 * Stripe. « Verifier le paiement » repose a Stripe la question que la page
 * de retour pose d'habitude, pour l'organisateur qui a paye puis ferme
 * l'onglet avant de revenir. */

import { useEffect, useState } from 'react';
import { confirmerMise, listerMises, prixLisible, reglerMise, type MiseAdmin } from '../lib/mise-en-avant.ts';
import { langue, t } from '../langue/langue.ts';

const LOCALE = langue === 'fr' ? 'fr-CA' : 'en-CA';
const date = (iso: string, heure = false): string =>
  new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', ...(heure ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(iso));

export function MisesAdmin() {
  const [mises, setMises] = useState<MiseAdmin[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupee, setOccupee] = useState<string | null>(null);
  const recharger = (): void => {
    listerMises()
      .then(setMises)
      .catch((e: unknown) => setErreur(e instanceof Error ? e.message : t.adminLectureImpossible));
  };
  useEffect(recharger, []);

  const agir = async (id: string, geste: () => Promise<unknown>): Promise<void> => {
    setOccupee(id);
    try {
      await geste();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : t.adminLectureImpossible);
    }
    setOccupee(null);
    recharger();
  };

  if (erreur) return <p className="sp-aide">{erreur}</p>;
  if (!mises) return <p className="sp-aide">{t.chargement}</p>;
  return (
    <section className="sets-bloc">
      <h2>{t.adminMises}</h2>
      <p className="sp-aide">{t.adminMisesExplication}</p>
      {mises.length === 0 ? (
        <p className="sp-aide">{t.adminMisesAucune}</p>
      ) : (
        <div className="admin-defile">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t.adminMiseDemandee}</th>
                <th>{t.adminMiseSoiree}</th>
                <th>{t.adminMiseOrganisateur}</th>
                <th>{t.adminMiseMontant}</th>
                <th>{t.adminMiseJusqua}</th>
                <th>{t.adminMiseEtat}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {mises.map((m) => {
                const active = (m.statut === 'payee' || m.statut === 'offerte') && Date.parse(m.fin) > Date.now();
                return (
                  <tr key={m.id}>
                    <td>{date(m.cree, true)}</td>
                    <td>
                      {m.titre}
                      <br />
                      <span className="sp-aide">
                        {m.ville} · {date(m.quand, true)}
                      </span>
                    </td>
                    <td>
                      {m.nom}
                      <br />
                      <a href={`mailto:${m.courriel}`}>{m.courriel}</a>
                      {m.message && <span className="sp-aide admin-mise-message">{m.message}</span>}
                    </td>
                    <td>{`${prixLisible(m.montant, LOCALE)} · ${m.jours} j`}</td>
                    <td>{date(m.fin)}</td>
                    <td>
                      {t.adminMiseStatut(m.statut)}
                      {active && <span className="admin-etiquette">{t.miseBadge}</span>}
                    </td>
                    <td className="admin-mise-gestes">
                      {m.statut === 'demandee' && m.stripe_session && (
                        <button type="button" disabled={occupee === m.id} onClick={() => void agir(m.id, () => confirmerMise(m.stripe_session ?? ''))}>
                          {t.adminMiseVerifier}
                        </button>
                      )}
                      {(m.statut === 'demandee' || m.statut === 'retiree') && (
                        <button type="button" disabled={occupee === m.id} onClick={() => void agir(m.id, () => reglerMise(m.id, 'offerte'))}>
                          {t.adminMiseOffrir}
                        </button>
                      )}
                      {(m.statut === 'payee' || m.statut === 'offerte') && (
                        <button
                          type="button"
                          className="sp-danger"
                          disabled={occupee === m.id}
                          onClick={() => {
                            if (window.confirm(t.adminMiseConfirmerRetrait(m.titre))) void agir(m.id, () => reglerMise(m.id, 'retiree'));
                          }}
                        >
                          {t.adminMiseRetirer}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
