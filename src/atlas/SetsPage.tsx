/* Routes #/sets et #/sets/<identifiant> : la liste, et la page d'un set.

   LA LISTE MONTRE LES FORMES D'ONDE SANS TELECHARGER UN SEUL OCTET D'AUDIO.
   C'est la raison d'etre des 800 valeurs stockees dans la ligne : dix sets
   dessines coutent 11 ko. Les charger pour les dessiner aurait coute 500 Mo,
   soit un dixieme du quota de sortie MENSUEL du plan gratuit, pour une page
   qu'on ouvre sans forcement rien ecouter.

   L'audio n'est demande qu'au premier appui sur lecture : la balise est en
   `preload="metadata"`, ce qui ne rapatrie que l'entete. */

import { useEffect, useState } from 'react';
import { contributionsActives } from '../lib/supabase.ts';
import { mmss, setsPublics, unSetPublic, urlAvatar, type SetDJ } from '../lib/sets.ts';
import { LecteurSet } from './LecteurSet.tsx';
import { SiteNav } from './SiteNav.tsx';
import { t } from '../langue/langue.ts';
import './credits.css';
import './sets.css';

/** L'identifiant demande dans l'adresse : #/sets/<uuid>, ou null pour la liste. */
function idDeLAdresse(): string | null {
  const m = window.location.hash.match(/^#\/sets\/([0-9a-f-]{36})/i);
  return m?.[1] ?? null;
}

export function SetsPage() {
  const [id, setId] = useState<string | null>(idDeLAdresse);

  /* Le routeur de main.tsx ne recharge que si la ROUTE change. Passer de la
     liste a un set ne change que la suite du fragment : sans cet ecouteur,
     l'adresse changerait et l'ecran resterait le meme, ce qui se lit comme
     un clic mort. Le meme piege est documente dans PropositionsPage. */
  useEffect(() => {
    const auChangement = (): void => setId(idDeLAdresse());
    window.addEventListener('hashchange', auChangement);
    return () => window.removeEventListener('hashchange', auChangement);
  }, []);

  return id ? <PageDUnSet id={id} /> : <ListeDesSets />;
}

/* --- La liste ------------------------------------------------------------- */

function ListeDesSets() {
  const [sets, setSets] = useState<SetDJ[] | null>(null);

  useEffect(() => {
    let vivant = true;
    void setsPublics().then((s) => {
      if (vivant) setSets(s);
    });
    return () => {
      vivant = false;
    };
  }, []);

  if (!contributionsActives) {
    return (
      <main className="credits sets-page">
        <SiteNav variant="page" />
        <h1>{t.lesSets}</h1>
        <p>{t.baseIndisponible}</p>
      </main>
    );
  }

  return (
    <main className="credits sets-page">
      <SiteNav variant="page" />
      <h1>{t.lesSets}</h1>

      {sets === null ? (
        <p className="sp-aide">{t.chargement}</p>
      ) : sets.length === 0 ? (
        <p className="sp-aide">{t.aucunSetPublie}</p>
      ) : (
        <ul className="sp-liste">
          {sets.map((s) => (
            <li key={s.id} className="sp-item">
              <div className="sp-item-tete">
                <div className="sp-item-titre">
                  <Vignette set={s} />
                  <div>
                    <h3>
                      <a href={`#/sets/${s.id}`}>{s.titre}</a>
                    </h3>
                    <p className="sp-aide">
                      {s.artiste_nom ?? t.artisteSansNom}
                      {s.duree_s ? ` · ${mmss(s.duree_s)}` : ''}
                      {` · ${t.nEcoutes(s.ecoutes)}`}
                    </p>
                  </div>
                </div>
              </div>
              <LecteurSet set={s} compact />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Vignette({ set }: { set: SetDJ }) {
  const url = urlAvatar(set.artiste_avatar);
  return (
    <span className="sp-vignette">
      {url ? (
        <img src={url} alt="" loading="lazy" />
      ) : (
        <span className="sp-avatar-vide" aria-hidden="true">
          {(set.artiste_nom?.trim()[0] ?? '?').toUpperCase()}
        </span>
      )}
    </span>
  );
}

/* --- Un set --------------------------------------------------------------- */

function PageDUnSet({ id }: { id: string }) {
  const [set, setSet] = useState<SetDJ | null | 'introuvable'>(null);

  useEffect(() => {
    let vivant = true;
    void unSetPublic(id).then((s) => {
      if (vivant) setSet(s ?? 'introuvable');
    });
    return () => {
      vivant = false;
    };
  }, [id]);

  if (set === null) {
    return (
      <main className="credits sets-page">
        <SiteNav variant="page" />
        <p className="sp-aide">{t.chargement}</p>
      </main>
    );
  }

  if (set === 'introuvable') {
    return (
      <main className="credits sets-page">
        <SiteNav variant="page" />
        <h1>{t.setIntrouvable}</h1>
        <p className="sp-aide">
          <a href="#/sets">{t.retourAuxSets}</a>
        </p>
      </main>
    );
  }

  return (
    <main className="credits sets-page">
      <SiteNav variant="page" />
      <p className="sp-fil">
        <a href="#/sets">{t.lesSets}</a>
      </p>

      <header className="sp-tete-set">
        <Vignette set={set} />
        <div>
          <h1>{set.titre}</h1>
          <p className="sp-aide">
            {set.artiste_nom ?? t.artisteSansNom}
            {set.duree_s ? ` · ${mmss(set.duree_s)}` : ''}
            {` · ${t.nEcoutes(set.ecoutes)}`}
          </p>
        </div>
      </header>

      <LecteurSet set={set} />

      {set.description && <p className="sp-description">{set.description}</p>}
    </main>
  );
}
