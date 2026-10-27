/* LE FORMULAIRE DE MISE EN AVANT, au pied de la fiche d'une soiree. Voir
 * lib/mise-en-avant.ts et docs/adr/ADR-109-mise-en-avant-payante.md.
 *
 * Replie, c'est une ligne discrete : la fiche est d'abord pour celui qui
 * sort, pas pour celui qui organise. Deplie, il dit ce que l'on achete, ou
 * et jusqu'a quand, le prix calcule par la base, puis trois champs. Avec le
 * paiement en ligne branche, le bouton mene a Stripe ; sans lui, la demande
 * part a Mika, qui repond par courriel. */

import { useEffect, useState } from 'react';
import type { Soiree } from '../lib/agenda.ts';
import type { Ville } from '../lib/ville-active.ts';
import { demanderMise, devisMise, prixLisible, type Devis } from '../lib/mise-en-avant.ts';
import { langue, t } from '../langue/langue.ts';

const LOCALE = langue === 'fr' ? 'fr-CA' : 'en-CA';

type Etat = 'saisie' | 'envoi' | 'paiement' | 'recue' | 'echec';

export function MettreEnAvant({ soiree, ville }: { soiree: Soiree; ville: Ville }) {
  const [ouvert, setOuvert] = useState(false);
  const [devis, setDevis] = useState<{ devis: Devis | null; paiement: boolean } | null | 'echec'>(null);
  const [nom, setNom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [message, setMessage] = useState('');
  const [etat, setEtat] = useState<Etat>('saisie');
  const quand = soiree.debut ?? soiree.date;

  useEffect(() => {
    if (!ouvert || devis) return;
    let vivant = true;
    void devisMise(quand).then((d) => {
      if (vivant) setDevis(d ?? 'echec');
    });
    return () => {
      vivant = false;
    };
  }, [ouvert, devis, quand]);

  if (!ouvert) {
    return (
      <button type="button" className="mav-ouvrir" onClick={() => setOuvert(true)}>
        {t.miseOffre}
      </button>
    );
  }

  const d = devis && devis !== 'echec' ? devis.devis : null;
  const prix = d ? prixLisible(d.montant, LOCALE) : '';
  const jusqua = d
    ? new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone: ville.timezone }).format(new Date(quand))
    : '';

  const envoyer = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (etat === 'envoi' || etat === 'paiement') return;
    setEtat('envoi');
    const r = await demanderMise({
      soiree_id: soiree.id,
      ville: ville.slug,
      titre: soiree.titre,
      quand,
      nom,
      courriel,
      message,
      langue,
    });
    if (r?.url) {
      setEtat('paiement');
      window.location.assign(r.url);
    } else setEtat(r?.recue ? 'recue' : 'echec');
  };

  return (
    <section className="mav" aria-label={t.miseTitre}>
      <h4>{t.miseTitre}</h4>
      {devis === null ? (
        <p className="mav-note">{t.chargement}</p>
      ) : devis === 'echec' ? (
        <p className="mav-note">{t.miseEchec}</p>
      ) : !d ? (
        <p className="mav-note">{t.miseTropTard}</p>
      ) : etat === 'recue' ? (
        <p className="mav-merci" role="status">
          {t.miseRecue(courriel)}
        </p>
      ) : (
        <>
          <p className="mav-texte">{t.miseExplication(ville.name, jusqua)}</p>
          <p className="mav-prix">{t.misePrix(prix, d.jours)}</p>
          <form className="mav-form" onSubmit={(e) => void envoyer(e)}>
            <label>
              <span>{t.miseNom}</span>
              <input type="text" required maxLength={120} autoComplete="organization" value={nom} onChange={(e) => setNom(e.target.value)} />
            </label>
            <label>
              <span>{t.miseCourriel}</span>
              <input type="email" required maxLength={200} autoComplete="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} />
            </label>
            <label>
              <span>{t.miseMessage}</span>
              <textarea rows={2} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <button type="submit" className="mav-envoyer" disabled={etat === 'envoi' || etat === 'paiement'}>
              {etat === 'envoi' ? t.miseEnvoi : etat === 'paiement' ? t.miseVersPaiement : devis.paiement ? t.misePayer(prix) : t.miseEnvoyer}
            </button>
            {etat === 'echec' && (
              <p className="mav-note" role="alert">
                {t.miseEchec}
              </p>
            )}
            <p className="mav-conditions">{devis.paiement ? t.miseConditionsPaiement : t.miseConditionsDemande}</p>
          </form>
        </>
      )}
    </section>
  );
}
