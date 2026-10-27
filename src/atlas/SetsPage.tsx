/* Routes #/mixtapes et #/mixtapes/<identifiant> : la liste, et une mixtape.

   LA LISTE MONTRE LES FORMES D'ONDE SANS TELECHARGER UN SEUL OCTET D'AUDIO.
   C'est la raison d'etre des 800 valeurs stockees dans la ligne : dix sets
   dessines coutent 11 ko. Les charger pour les dessiner aurait coute 500 Mo,
   soit un dixieme du quota de sortie MENSUEL du plan gratuit, pour une page
   qu'on ouvre sans forcement rien ecouter.

   L'audio n'est demande qu'au premier appui sur lecture : la balise est en
   `preload="metadata"`, ce qui ne rapatrie que l'entete. */

import { useEffect, useState } from 'react';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { contributionsActives } from '../lib/supabase.ts';
import {
  artistesPublics,
  likesDesSets,
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
import { EnTeteSite } from './EnTeteSite.tsx';
import { PiedDePage } from './PiedDePage.tsx';
import { FaIcon } from './FaIcon.tsx';
import { FAMILIES, STRUCTURES } from './structures.ts';
import { adresseDuSet, AutresMixtapes, BoutonJaime, BoutonPartager, CarteArtiste, Commentaires, FicheMixtape, Tracklist } from './MixtapeSociale.tsx';
import { adresseCourte, liensAffiches } from '../lib/reseaux.ts';
import { slug } from '../lib/chemins.ts';
import { langue, t } from '../langue/langue.ts';
import { Apparition } from '../design/mouvement.tsx';
import './credits.css';
import './sets.css';

/* TROIS ECRANS SOUS UNE SEULE ROUTE.

   #/mixtapes            la liste des artistes qui ont depose
   #/mixtapes/a/<compte> tout ce qu'un artiste a publie
   #/mixtapes/<uuid>     une mixtape, avec son grand lecteur

   Pourquoi l'entree n'est plus la liste des sets mais celle des ARTISTES :
   une liste de fichiers tries par date ne dit pas qui fait quoi. Ce qu'on
   cherche en arrivant, c'est quelqu'un, et ensuite ce qu'il a pose. */
type Ecran =
  | { readonly k: 'artistes' }
  | { readonly k: 'artiste'; readonly compte: string }
  | { readonly k: 'set'; readonly id: string };

/* LES DEUX PREFIXES MENENT ICI. La section s'appelle Mixtapes depuis le
   17 septembre 2026 ; #/sets etait son nom public depuis le 2 septembre et
   vit dans des liens partages et dans les pages deja indexees par Google.
   Une adresse publiee ne se retire pas. */
function ecranDeLAdresse(): Ecran {
  const h = window.location.hash;
  const artiste = h.match(/^#\/(?:mixtapes|sets)\/a\/([0-9a-f-]{36})/i);
  if (artiste?.[1]) return { k: 'artiste', compte: artiste[1] };
  const set = h.match(/^#\/(?:mixtapes|sets)\/([0-9a-f-]{36})/i);
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

/* COMBIEN D'ARTISTES ON MONTRE AVANT DE DEMANDER.

   Aujourd'hui ils sont deux. A cent, une grille complete ferait defiler
   plusieurs ecrans avant d'atteindre les derniers sets, qui sont pourtant ce
   qu'on vient ecouter. Dix-huit tiennent en trois rangees sur un ordinateur
   et six sur un telephone, ce qui laisse le reste de la page visible sans
   couper l'acces aux autres. */
const ARTISTES_VISIBLES = 18;

function ListeDesArtistes() {
  const [artistes, setArtistes] = useState<ArtistePublic[] | null>(null);
  const [derniers, setDerniers] = useState<SetDJ[]>([]);
  const [tous, setTous] = useState(false);

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
      <>
      <EnTeteSite />
      <main className="credits sets-page">
        <h1>{t.lesArtistes}</h1>
        <p>{t.baseIndisponible}</p>
        <PiedDePage />
      </main>
    </>
    );
  }

  return (
    <>
      <EnTeteSite />
      <main className="credits sets-page">
      <h1>{t.lesMixtapes}</h1>
      {/* LE CHAPEAU QUI MANQUAIT. La page ouvrait sur un titre puis une grille
          de portraits, sans une phrase pour dire ce qu'on ecoute ici : elle
          etait la seule des cinq sections dans ce cas. */}
      <p className="sp-lede intro-page">{t.ledeMixtapes}</p>

      <h2 className="sp-sous-titre sp-sous-titre-premier">{t.lesArtistes}</h2>

      {artistes === null ? (
        <p className="sp-aide">{t.chargement}</p>
      ) : artistes.length === 0 ? (
        <p className="sp-aide">{t.aucunArtiste}</p>
      ) : (
        <>
        <ul className="sp-artistes">
          {(tous ? artistes : artistes.slice(0, ARTISTES_VISIBLES)).map((a, rang) => (
            <Apparition as="li" key={a.user_id} i={rang}>
              <a className="sp-carte-artiste" href={`#/mixtapes/a/${a.user_id}`}>
                <Portrait nom={a.nom} chemin={a.avatar_path} />
                <span className="sp-carte-nom">{a.nom}</span>
                <span className="sp-aide">
                  {t.nMixtapes(a.n_sets)} · {t.nEcoutes(a.ecoutes)}
                </span>
              </a>
            </Apparition>
          ))}
        </ul>
        {!tous && artistes.length > ARTISTES_VISIBLES && (
          <button className="sp-lien" onClick={() => setTous(true)}>
            {t.voirTousLesArtistes(artistes.length)}
          </button>
        )}
        </>
      )}

      {/* UNE GRILLE DE VISAGES NE S'ECOUTE PAS. Sans cette section, la page
          d'entree du monde des artistes ne contient aucun son : il faudrait
          cliquer deux fois pour entendre quoi que ce soit. Les douze derniers
          sets donnent une raison de rester. */}
      {derniers.length > 0 && (
        <>
          <h2 className="sp-sous-titre">{t.dernieresMixtapes}</h2>
          <ul className="sp-liste">
            {derniers.map((s) => (
              <ListeUnSet set={s} key={s.id} />
            ))}
          </ul>
        </>
      )}
      <PiedDePage />
    </main>
    </>
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

/* LA PAGE D'UN ARTISTE, FACON SOUNDCLOUD. Mika, le 18 octobre 2026, capture
   a l'appui : une banniere, le portrait en grand qui la chevauche, le nom et
   le lieu sur des etiquettes sombres, puis deux colonnes, les mixtapes a
   gauche et, a droite, les chiffres, la presentation et les reseaux.

   La banniere est celle que l'artiste a deposee ; a defaut, sa derniere
   pochette, floutee, qui donne au moins la couleur de ce qu'il joue. */
function PageDUnArtiste({ compte }: { compte: string }) {
  const [artiste, setArtiste] = useState<ArtistePublic | null | 'introuvable'>(null);
  const [sets, setSets] = useState<SetDJ[]>([]);
  const [likes, setLikes] = useState(0);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      const a = await unArtiste(compte);
      if (!vivant) return;
      setArtiste(a ?? 'introuvable');
      if (!a) return;
      const x = await setsDunArtiste(compte);
      if (!vivant) return;
      setSets(x);
      const m = await likesDesSets(x.map((s) => s.id));
      if (vivant) setLikes([...m.values()].reduce((u, v) => u + v, 0));
    })();
    return () => {
      vivant = false;
    };
  }, [compte]);

  if (artiste === null) {
    return (
      <>
        <EnTeteSite />
        <main className="credits sets-page">
          <p className="sp-aide">{t.chargement}</p>
          <PiedDePage />
        </main>
      </>
    );
  }

  if (artiste === 'introuvable') {
    return (
      <>
        <EnTeteSite />
        <main className="credits sets-page">
          <h1>{t.artisteIntrouvable}</h1>
          <p className="sp-aide">
            <a href="#/mixtapes">{t.retourAuxArtistes}</a>
          </p>
        </main>
      </>
    );
  }

  const banniere = urlAvatar(artiste.banniere_path ?? null);
  const repli = banniere ? null : urlPochette(sets.find((s) => s.cover_path)?.cover_path ?? null);
  const portrait = urlAvatar(artiste.avatar_path);
  const liens = liensAffiches(artiste.liens);

  return (
    <>
      <EnTeteSite />
      <main className="credits sets-page mx-page">
        <RetourAuxMixtapes libelle={t.lesArtistes} />

        <header className="mx-profil">
          <div className={banniere ? 'mx-profil-banniere' : 'mx-profil-banniere mx-profil-banniere-repli'} aria-hidden="true">
            {(banniere ?? repli) && <img src={banniere ?? repli ?? ''} alt="" />}
          </div>
          <div className="mx-profil-identite">
            <span className="mx-profil-portrait">
              {portrait ? <img src={portrait} alt="" /> : <span aria-hidden="true">{(artiste.nom.trim()[0] ?? '?').toUpperCase()}</span>}
            </span>
            <div className="mx-profil-mots">
              <h1>
                <span>{artiste.nom}</span>
              </h1>
              {artiste.lieu && (
                <p className="mx-profil-lieu">
                  <span>{artiste.lieu}</span>
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="mx-barre">
          <BoutonPartager url={`https://sonaa.ca/#/mixtapes/a/${artiste.user_id}`} titre={artiste.nom} />
        </div>

        <div className="mx-grille">
          <section className="mx-principal" aria-labelledby="mx-ses-mixtapes">
            <h2 id="mx-ses-mixtapes" className="mx-bloc-titre">
              {t.lesMixtapes}
            </h2>
            <ul className="sp-liste">
              {sets.map((s) => (
                <ListeUnSet set={s} key={s.id} sansArtiste />
              ))}
            </ul>
          </section>

          <aside className="mx-colonne">
            <dl className="mx-chiffres">
              <div>
                <dt>{t.lesMixtapes}</dt>
                <dd>{artiste.n_sets}</dd>
              </div>
              <div>
                <dt>{t.ecoutesMot}</dt>
                <dd>{artiste.ecoutes}</dd>
              </div>
              <div>
                <dt>{t.jAimeMot}</dt>
                <dd>{likes}</dd>
              </div>
            </dl>
            {artiste.bio && <p className="mx-artiste-bio">{artiste.bio}</p>}
            {liens.length > 0 && (
              <ul className="mx-liens">
                {liens.map((l) => (
                  <li key={l.reseau.id}>
                    <a href={l.url} target="_blank" rel="noreferrer noopener me">
                      <FaIcon icon={l.reseau.icone} className="mx-lien-icone" />
                      <span>{l.reseau.id === 'site' ? adresseCourte(l.url) : l.reseau.nom}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
        <PiedDePage />
      </main>
    </>
  );
}

/* Le chemin de retour, une pastille avec sa fleche. Il etait un lien nu,
   dans le violet du navigateur. */
function RetourAuxMixtapes({ libelle }: { libelle: string }) {
  return (
    <p className="mx-retour">
      <a href="#/mixtapes">
        <FaIcon icon={faArrowLeft} className="mx-retour-icone" />
        {libelle}
      </a>
    </p>
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
              <a href={`#/mixtapes/${set.id}`}>{set.titre}</a>
            </h3>
            <p className="sp-aide">
              {!sansArtiste && (
                <>
                  <a href={`#/mixtapes/a/${set.user_id}`}>{set.artiste_nom ?? t.artisteSansNom}</a>
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

/* LA PAGE D'UNE MIXTAPE. Mika, le 18 octobre 2026 : « plus jolie, proposer
   d'autres mixtapes, le cover plus grand et dans sa taille originale, des
   likes et des commentaires, un bouton de partage, et une colonne avec le
   profil de qui a pose la mixtape ».

   EN TETE, UN BANDEAU : la pochette floutee en fond, la pochette elle-meme
   dans ses proportions (carree, en largeur ou en hauteur, elle n'est jamais
   recadree), le titre, l'artiste, les styles et le lecteur.
   DESSOUS, DEUX TIERS ET UN TIERS : les actions, la description, les
   commentaires et d'autres mixtapes ; dans la colonne, l'artiste. Sur
   telephone, la colonne passe sous les actions. */
function PageDUnSet({ id }: { id: string }) {
  const [set, setSet] = useState<SetDJ | null | 'introuvable'>(null);
  const [siens, setSiens] = useState<SetDJ[]>([]);
  const [loupe, setLoupe] = useState(false);

  useEffect(() => {
    let vivant = true;
    setSet(null);
    void unSetPublic(id).then(async (s) => {
      if (!vivant) return;
      setSet(s ?? 'introuvable');
      if (s) {
        const x = await setsDunArtiste(s.user_id);
        if (vivant) setSiens(x);
      }
    });
    window.scrollTo({ top: 0 });
    return () => {
      vivant = false;
    };
  }, [id]);

  if (set === null) {
    return (
      <>
        <EnTeteSite />
        <main className="credits sets-page">
          <p className="sp-aide">{t.chargement}</p>
          <PiedDePage />
        </main>
      </>
    );
  }

  if (set === 'introuvable') {
    return (
      <>
        <EnTeteSite />
        <main className="credits sets-page">
          <h1>{t.mixtapeIntrouvable}</h1>
          <p className="sp-aide">
            <a href="#/mixtapes">{t.retourAuxMixtapes}</a>
          </p>
        </main>
      </>
    );
  }

  const pochette = urlPochette(set.cover_path);
  const image = pochette ?? urlAvatar(set.artiste_avatar);
  const styles = (set.genre_ids ?? []).map(styleDuGenre).filter((x): x is StyleDuSet => x !== null);

  return (
    <>
      <EnTeteSite />
      <main className="credits sets-page mx-page">
        <RetourAuxMixtapes libelle={t.lesMixtapesTitre} />

        <header className="mx-tete">
          <div className="mx-tete-fond" aria-hidden="true">
            {image && <img src={image} alt="" />}
          </div>
          <div className="mx-tete-mots">
            <p className="mx-surtitre">{t.mixtapeMot}</p>
            <h1 className="mx-titre">{set.titre}</h1>
            <a className="mx-tete-artiste" href={`#/mixtapes/a/${set.user_id}`}>
              {set.artiste_nom ?? t.artisteSansNom}
            </a>
            <p className="mx-meta">
              {[set.duree_s ? mmss(set.duree_s) : null, t.nEcoutes(set.ecoutes), DATE.format(new Date(set.created_at))]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {styles.length > 0 && (
              <ul className="mx-styles">
                {styles.map((g) => (
                  <li key={g.id}>
                    <a href={g.chemin}>{g.nom}</a>
                  </li>
                ))}
              </ul>
            )}
            <div className="mx-lecteur">
              <LecteurSet set={set} />
            </div>
          </div>
          {pochette && (
            <button type="button" className="mx-pochette" onClick={() => setLoupe(true)} aria-label={set.titre}>
              <img src={pochette} alt="" />
            </button>
          )}
        </header>
        {loupe && pochette && <Loupe url={pochette} legende={set.titre} onFermer={() => setLoupe(false)} />}

        <div className="mx-grille">
          <div className="mx-principal">
            <div className="mx-actions">
              <BoutonJaime set={set} />
              <BoutonPartager url={adresseDuSet(set)} titre={`${set.titre}${set.artiste_nom ? ` · ${set.artiste_nom}` : ''}`} set={set} />
            </div>
            {set.description && <p className="sp-description mx-description">{set.description}</p>}
            <Tracklist set={set} />
            <FicheMixtape set={set} />
            <Commentaires set={set} />
            <AutresMixtapes set={set} />
          </div>
          <div className="mx-colonne">
            <CarteArtiste compte={set.user_id} sets={siens} />
          </div>
        </div>
        <PiedDePage />
      </main>
    </>
  );
}

const DATE = new Intl.DateTimeFormat(langue === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short', year: 'numeric' });

interface StyleDuSet {
  readonly id: string;
  readonly nom: string;
  readonly chemin: string;
}

/** Un style de l'atlas par son identifiant, avec l'adresse de sa fiche. */
function styleDuGenre(id: string): StyleDuSet | null {
  for (let fi = 0; fi < FAMILIES.length; fi += 1) {
    const f = FAMILIES[fi];
    const g = STRUCTURES[fi]?.genres.find((x) => x.id === id);
    if (f && g) return { id, nom: g.label, chemin: `/styles/${slug(f.label)}/${slug(g.label)}/` };
  }
  return null;
}
