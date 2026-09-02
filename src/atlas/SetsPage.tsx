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
import {
  artistesPublics,
  mmss,
  setsPublics,
  setsDunArtiste,
  unArtiste,
  unSetPublic,
  urlAvatar,
  urlPochette,
  type ArtistePublic,
  type SetDJ,
} from '../lib/sets.ts';
import { LecteurSet } from './LecteurSet.tsx';
import { Loupe } from './Loupe.tsx';
import { SiteNav } from './SiteNav.tsx';
import { t } from '../langue/langue.ts';
import './credits.css';
import './sets.css';

/* TROIS ECRANS SOUS UNE SEULE ROUTE.

   #/sets            la liste des artistes qui ont depose
   #/sets/a/<compte> tout ce qu'un artiste a publie
   #/sets/<uuid>     un set, avec son grand lecteur

   Pourquoi l'entree n'est plus la liste des sets mais celle des ARTISTES :
   une liste de fichiers tries par date ne dit pas qui fait quoi. Ce qu'on
   cherche en arrivant, c'est quelqu'un, et ensuite ce qu'il a pose. */
type Ecran =
  | { readonly k: 'artistes' }
  | { readonly k: 'artiste'; readonly compte: string }
  | { readonly k: 'set'; readonly id: string };

function ecranDeLAdresse(): Ecran {
  const h = window.location.hash;
  const artiste = h.match(/^#\/sets\/a\/([0-9a-f-]{36})/i);
  if (artiste?.[1]) return { k: 'artiste', compte: artiste[1] };
  const set = h.match(/^#\/sets\/([0-9a-f-]{36})/i);
  if (set?.[1]) return { k: 'set', id: set[1] };
  return { k: 'artistes' };
}

export function SetsPage() {
  const [ecran, setEcran] = useState<Ecran>(ecranDeLAdresse);

  /* Le routeur de main.tsx ne recharge que si la ROUTE change. Passer d'un
     artiste a un set ne change que la suite du fragment : sans cet ecouteur,
     l'adresse changerait et l'ecran resterait le meme, ce qui se lit comme
     un clic mort. Le meme piege est documente dans PropositionsPage. */
  useEffect(() => {
    const auChangement = (): void => setEcran(ecranDeLAdresse());
    window.addEventListener('hashchange', auChangement);
    return () => window.removeEventListener('hashchange', auChangement);
  }, []);

  if (ecran.k === 'set') return <PageDUnSet id={ecran.id} />;
  if (ecran.k === 'artiste') return <PageDUnArtiste compte={ecran.compte} />;
  return <ListeDesArtistes />;
}

/* --- Les artistes --------------------------------------------------------- */

function ListeDesArtistes() {
  const [artistes, setArtistes] = useState<ArtistePublic[] | null>(null);
  const [derniers, setDerniers] = useState<SetDJ[]>([]);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      const [a, s] = await Promise.all([artistesPublics(), setsPublics()]);
      if (!vivant) return;
      setArtistes(a);
      setDerniers(s.slice(0, 12));
    })();
    return () => {
      vivant = false;
    };
  }, []);

  if (!contributionsActives) {
    return (
      <main className="credits sets-page">
        <SiteNav variant="page" />
        <h1>{t.lesArtistes}</h1>
        <p>{t.baseIndisponible}</p>
      </main>
    );
  }

  return (
    <main className="credits sets-page">
      <SiteNav variant="page" />
      <h1>{t.lesArtistes}</h1>

      {artistes === null ? (
        <p className="sp-aide">{t.chargement}</p>
      ) : artistes.length === 0 ? (
        <p className="sp-aide">{t.aucunArtiste}</p>
      ) : (
        <ul className="sp-artistes">
          {artistes.map((a) => (
            <li key={a.user_id}>
              <a className="sp-carte-artiste" href={`#/sets/a/${a.user_id}`}>
                <Portrait nom={a.nom} chemin={a.avatar_path} />
                <span className="sp-carte-nom">{a.nom}</span>
                <span className="sp-aide">
                  {t.nSets(a.n_sets)} · {t.nEcoutes(a.ecoutes)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* UNE GRILLE DE VISAGES NE S'ECOUTE PAS. Sans cette section, la page
          d'entree du monde des artistes ne contient aucun son : il faudrait
          cliquer deux fois pour entendre quoi que ce soit. Les douze derniers
          sets donnent une raison de rester. */}
      {derniers.length > 0 && (
        <>
          <h2 className="sp-sous-titre">{t.derniersSets}</h2>
          <ul className="sp-liste">
            {derniers.map((s) => (
              <ListeUnSet set={s} key={s.id} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

function Portrait({ nom, chemin }: { nom: string; chemin: string | null }) {
  const url = urlAvatar(chemin);
  return url ? (
    <img className="sp-portrait" src={url} alt="" loading="lazy" />
  ) : (
    <span className="sp-portrait sp-avatar-vide" aria-hidden="true">
      {(nom.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}

function PageDUnArtiste({ compte }: { compte: string }) {
  const [artiste, setArtiste] = useState<ArtistePublic | null | 'introuvable'>(null);
  const [sets, setSets] = useState<SetDJ[]>([]);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      const a = await unArtiste(compte);
      if (!vivant) return;
      setArtiste(a ?? 'introuvable');
      if (a) setSets(await setsDunArtiste(compte));
    })();
    return () => {
      vivant = false;
    };
  }, [compte]);

  if (artiste === null) {
    return (
      <main className="credits sets-page">
        <SiteNav variant="page" />
        <p className="sp-aide">{t.chargement}</p>
      </main>
    );
  }

  if (artiste === 'introuvable') {
    return (
      <main className="credits sets-page">
        <SiteNav variant="page" />
        <h1>{t.artisteIntrouvable}</h1>
        <p className="sp-aide">
          <a href="#/sets">{t.retourAuxArtistes}</a>
        </p>
      </main>
    );
  }

  return (
    <main className="credits sets-page">
      <SiteNav variant="page" />
      <p className="sp-fil">
        <a href="#/sets">{t.lesArtistes}</a>
      </p>

      <header className="sp-tete-artiste">
        <Portrait nom={artiste.nom} chemin={artiste.avatar_path} />
        <div>
          <h1>{artiste.nom}</h1>
          <p className="sp-aide">
            {t.nSets(artiste.n_sets)} · {t.nEcoutes(artiste.ecoutes)}
          </p>
        </div>
      </header>

      {artiste.bio && <p className="sp-description">{artiste.bio}</p>}

      <ul className="sp-liste">
        {sets.map((s) => (
          <ListeUnSet set={s} key={s.id} sansArtiste />
        ))}
      </ul>
    </main>
  );
}

/* --- Une ligne de set, partagee par toutes les listes --------------------- */

export function ListeUnSet({ set, sansArtiste }: { set: SetDJ; sansArtiste?: boolean }) {
  return (
    <li className="sp-item">
      <div className="sp-item-tete">
        <div className="sp-item-titre">
          <Vignette set={set} />
          <div>
            <h3>
              <a href={`#/sets/${set.id}`}>{set.titre}</a>
            </h3>
            <p className="sp-aide">
              {!sansArtiste && (
                <>
                  <a href={`#/sets/a/${set.user_id}`}>{set.artiste_nom ?? t.artisteSansNom}</a>
                  {' · '}
                </>
              )}
              {set.duree_s ? `${mmss(set.duree_s)} · ` : ''}
              {t.nEcoutes(set.ecoutes)}
            </p>
          </div>
        </div>
      </div>
      <LecteurSet set={set} compact />
    </li>
  );
}

/* LA POCHETTE D'ABORD, LE PORTRAIT ENSUITE.

   Un set a une pochette : c'est elle qu'on cherche des yeux dans une liste.
   Faute de pochette on retombe sur le portrait de l'artiste, qui vaut mieux
   qu'un carre vide, et faute des deux sur l'initiale.

   SEULE LA POCHETTE S'AGRANDIT. Un portrait de profil n'a rien a montrer en
   grand, et rendre cliquable une image qui ne reagit pas serait pire que de
   ne rien rendre cliquable. */
function Vignette({ set }: { set: SetDJ }) {
  const [grande, setGrande] = useState(false);
  const pochette = urlPochette(set.cover_path);
  const portrait = urlAvatar(set.artiste_avatar);

  if (pochette) {
    return (
      <>
        <button
          className="sp-vignette sp-vignette-ouvrable"
          onClick={() => setGrande(true)}
          aria-label={set.titre}
        >
          <img src={pochette} alt="" loading="lazy" />
        </button>
        {grande && <Loupe url={pochette} legende={set.titre} onFermer={() => setGrande(false)} />}
      </>
    );
  }

  return (
    <span className="sp-vignette">
      {portrait ? (
        <img src={portrait} alt="" loading="lazy" />
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
            <a href={`#/sets/a/${set.user_id}`}>{set.artiste_nom ?? t.artisteSansNom}</a>
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
