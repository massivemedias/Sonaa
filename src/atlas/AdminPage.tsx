/* L'ADMINISTRATION : #/admin.
 *
 * Mika, le 10 septembre 2026 : « je veux une interface admin quand je me log
 * avec mauditemachine@gmail.com ». Ce compte est moderateur, et c'est le
 * statut de moderateur, verifie en base, qui ouvre cette page : le menu du
 * compte la propose aux moderateurs, et la base ne rend ses lignes qu'a eux.
 * Un autre compte qui tape l'adresse voit la phrase de reserve, et rien.
 *
 * CINQ ONGLETS, PAR CE QU'ON VIENT Y FAIRE. Les membres (qui s'est inscrit,
 * quand, par quel moyen, avec quel set), les sets (tous, publies ou non,
 * avec de quoi en retirer un), les soirees (le panneau qui vivait dans le
 * profil), les commentaires signales, et les artistes que la recherche n'a
 * pas su resoudre. Chaque onglet reutilise ce qui existait quand ca
 * existait : SoireesAdmin et CommentsModeration ne sont pas reecrits. */

import { useEffect, useState } from 'react';
import { EnTeteSite } from './EnTeteSite.tsx';
import { PiedDePage } from './PiedDePage.tsx';
import { SoireesAdmin } from './SoireesAdmin.tsx';
import { CommentsModeration } from './CommentsModeration.tsx';
import { useSession } from '../lib/useSession.ts';
import { suisJeModerateur } from '../lib/proposals.ts';
import { artistesDemandes, listerMembres, listerTousLesSets, type Membre, type SetAdmin } from '../lib/admin.ts';
import { basculerPublication, mmss, supprimerSet, urlPochette } from '../lib/sets.ts';
import { langue, t } from '../langue/langue.ts';
import './credits.css';
import './sets.css';
import './admin.css';

type Onglet = 'membres' | 'sets' | 'soirees' | 'commentaires' | 'artistes';

const lireOnglet = (): Onglet => {
  const h = window.location.hash;
  if (h.startsWith('#/admin/sets')) return 'sets';
  if (h.startsWith('#/admin/soirees')) return 'soirees';
  if (h.startsWith('#/admin/commentaires')) return 'commentaires';
  if (h.startsWith('#/admin/artistes')) return 'artistes';
  return 'membres';
};

const ONGLETS: readonly { id: Onglet; label: () => string }[] = [
  { id: 'membres', label: () => t.adminMembres },
  { id: 'sets', label: () => t.adminSets },
  { id: 'soirees', label: () => t.adminSoirees },
  { id: 'commentaires', label: () => t.adminCommentaires },
  { id: 'artistes', label: () => t.adminArtistes },
];

const quand = (iso: string | null): string => {
  if (!iso) return t.adminJamais;
  return new Intl.DateTimeFormat(langue === 'fr' ? 'fr-CA' : 'en-CA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
};

export function AdminPage() {
  const { session, chargement } = useSession();
  const [moderateur, setModerateur] = useState<boolean | null>(null);
  const [onglet, setOnglet] = useState<Onglet>(lireOnglet);

  useEffect(() => {
    document.title = `${t.adminTitre} · SONAA`;
    const suivre = (): void => setOnglet(lireOnglet());
    window.addEventListener('hashchange', suivre);
    return () => window.removeEventListener('hashchange', suivre);
  }, []);

  useEffect(() => {
    if (chargement) return;
    if (!session) {
      setModerateur(false);
      return;
    }
    void suisJeModerateur().then(setModerateur);
  }, [session, chargement]);

  return (
    <>
      <EnTeteSite />
      <main className="credits sets-page admin">
        <h1>{t.adminTitre}</h1>
        {moderateur === null ? (
          <p className="sp-aide">{t.chargement}</p>
        ) : !moderateur ? (
          <p className="sp-aide">
            {t.adminReserve}{' '}
            {!session && (
              <button type="button" className="admin-lien" onClick={() => window.dispatchEvent(new Event('sonaa:connexion'))}>
                {t.seConnecter}
              </button>
            )}
          </p>
        ) : (
          <>
            <nav className="pf-menu" aria-label={t.adminTitre}>
              {ONGLETS.map((o) => (
                <a
                  key={o.id}
                  href={o.id === 'membres' ? '#/admin' : `#/admin/${o.id}`}
                  className="pf-onglet"
                  aria-current={onglet === o.id ? 'page' : undefined}
                >
                  {o.label()}
                </a>
              ))}
            </nav>
            {onglet === 'membres' && <Membres />}
            {onglet === 'sets' && <Sets />}
            {onglet === 'soirees' && <SoireesAdmin />}
            {onglet === 'commentaires' && <CommentsModeration />}
            {onglet === 'artistes' && <Artistes />}
          </>
        )}
        <PiedDePage />
      </main>
    </>
  );
}

function Membres() {
  const [membres, setMembres] = useState<Membre[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    listerMembres().then(setMembres).catch((e: unknown) => setErreur(e instanceof Error ? e.message : t.adminLectureImpossible));
  }, []);
  if (erreur) return <p className="sp-aide">{erreur}</p>;
  if (!membres) return <p className="sp-aide">{t.chargement}</p>;
  return (
    <section className="sets-bloc">
      <h2>{t.adminComptes(membres.length)}</h2>
      <div className="admin-defile">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t.tonAdresse}</th>
              <th>{t.adminArtiste}</th>
              <th>{t.adminInscritLe}</th>
              <th>{t.adminDerniereConnexion}</th>
              <th>{t.adminMoyen}</th>
              <th>{t.adminSets}</th>
              <th>{t.adminSoirees}</th>
            </tr>
          </thead>
          <tbody>
            {membres.map((m) => (
              <tr key={m.user_id}>
                <td>
                  {m.courriel}
                  {m.moderateur && <span className="admin-etiquette">{t.moderationMenu}</span>}
                </td>
                <td>{m.artiste_nom ? <a href={`#/sets/a/${m.user_id}`}>{m.artiste_nom}</a> : '·'}</td>
                <td>{quand(m.inscrit_le)}</td>
                <td>{quand(m.derniere_connexion)}</td>
                <td>{m.fournisseurs ?? '·'}</td>
                <td>{m.n_sets > 0 ? t.adminNSets(m.n_sets, m.n_sets_publies) : '·'}</td>
                <td>{m.n_soirees > 0 ? t.adminNSoirees(m.n_soirees) : '·'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Sets() {
  const [sets, setSets] = useState<SetAdmin[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const recharger = (): void => {
    listerTousLesSets().then(setSets).catch((e: unknown) => setErreur(e instanceof Error ? e.message : t.adminLectureImpossible));
  };
  useEffect(recharger, []);
  if (erreur) return <p className="sp-aide">{erreur}</p>;
  if (!sets) return <p className="sp-aide">{t.chargement}</p>;
  return (
    <section className="sets-bloc">
      <h2>{t.adminSets}</h2>
      <p className="sp-aide">{t.adminTousLesSets}</p>
      {sets.length === 0 ? (
        <p className="sp-aide">{t.adminAucunSet}</p>
      ) : (
        <ul className="sp-liste">
          {sets.map((s) => (
            <li key={s.id} className="sp-item">
              <div className="sp-item-tete">
                <div className="sp-item-titre">
                  {urlPochette(s.cover_path) && <img className="sp-pochette" src={urlPochette(s.cover_path) ?? ''} alt="" />}
                  <div>
                    <h3>
                      <a href={`#/sets/${s.id}`}>{s.titre}</a>
                    </h3>
                    <p className="sp-aide">
                      {t.adminDeposePar} {s.artiste_nom ?? t.artisteSansNom}
                      {s.courriel ? ` (${s.courriel})` : ''}
                      {' · '}
                      {quand(s.created_at)}
                      {' · '}
                      {s.duree_s ? mmss(s.duree_s) : t.dureeInconnue}
                      {' · '}
                      {s.publie ? t.publie : t.brouillon}
                      {s.publie ? ` · ${t.nEcoutes(s.ecoutes)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="sp-item-actions">
                  <button type="button" onClick={() => void basculerPublication(s.id, !s.publie).then(recharger)}>
                    {s.publie ? t.depublier : t.publier}
                  </button>
                  <button
                    type="button"
                    className="sp-danger"
                    onClick={() => {
                      if (!window.confirm(t.adminConfirmerRetrait(s.titre))) return;
                      void supprimerSet(s.id, s.audio_path).then(recharger);
                    }}
                  >
                    {t.supprimer}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Artistes() {
  const [noms, setNoms] = useState<string[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    artistesDemandes().then(setNoms).catch(() => setErreur(t.adminLectureImpossible));
  }, []);
  return (
    <section className="sets-bloc">
      <h2>{t.adminArtistes}</h2>
      <p className="sp-aide">{t.adminDemandesIntro}</p>
      {erreur && <p className="sp-aide">{erreur}</p>}
      {!erreur && !noms && <p className="sp-aide">{t.chargement}</p>}
      {noms && noms.length === 0 && <p className="sp-aide">{t.adminAucuneDemande}</p>}
      {noms && noms.length > 0 && (
        <ul className="admin-noms">
          {noms.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
