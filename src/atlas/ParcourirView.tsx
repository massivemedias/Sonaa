/* PARCOURIR : la presentation refaite, sur le modele des applications de
   musique plutot que sur celui d'une carte.

   CE QUI N'ALLAIT PAS, dit par Mika devant son telephone : les lignes, les
   cases et les boules sont trop petites au doigt, et l'on ne devine pas ou
   l'on va. Une carte en trois dimensions demande d'apprendre a la lire avant
   d'en tirer quoi que ce soit ; sur un ecran de six pouces, dans le metro,
   personne n'apprend rien.

   LE MODELE RETENU est celui que tout le monde connait deja : des rectangles
   nommes, deux colonnes, on appuie, on descend d'un cran. Trois niveaux,
   jamais plus : familles, genres de la famille, page du genre avec ses
   morceaux. Aucune geometrie a interpreter, aucune profondeur cachee.

   LA CIBLE DU DOIGT EST LA REGLE DE DESSIN. Un rectangle fait au moins 92 px
   de haut et porte son nom en entier ; une ligne de morceau fait 60 px. Rien
   n'est plus petit, meme quand ca coute de la densite : mieux vaut defiler
   deux fois que rater sa cible une fois.

   L'ETAT DE NAVIGATION VIT DANS L'ADRESSE (#/parcourir/3/12) et non dans le
   composant, pour que le bouton retour du telephone remonte d'un niveau au
   lieu de quitter le site. C'est le geste le plus utilise du systeme, et il
   n'est gratuit que si l'on s'y branche. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FAMILIES, STRUCTURES, type Genre, type Track } from './structures.ts';
import { poidsDe } from './poids.ts';
import { ProceduralCover } from './ProceduralCover.tsx';
import { useLecteur } from '../lecture/useLecteur.ts';
import MACHINES from '../data/machines.json';
import {
  faChevronLeft,
  faPlay,
  faPause,
  faBackwardStep,
  faForwardStep,
  faMagnifyingGlass,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import { FaIcon } from './FaIcon.tsx';
import { SiteNav } from './SiteNav.tsx';
import { t } from '../langue/langue.ts';
import './parcourir.css';

/* --- L'adresse ------------------------------------------------------------ */

type Niveau =
  | { readonly k: 'familles' }
  | { readonly k: 'famille'; readonly fi: number }
  | { readonly k: 'genre'; readonly fi: number; readonly gl: number };

const lireNiveau = (): Niveau => {
  const morceaux = window.location.hash.replace(/^#\/parcourir\/?/, '').split('/').filter(Boolean);
  const fi = Number(morceaux[0]);
  const gl = Number(morceaux[1]);
  if (!Number.isInteger(fi) || fi < 0 || fi >= FAMILIES.length) return { k: 'familles' };
  const s = STRUCTURES[fi];
  if (!s || !Number.isInteger(gl) || gl < 0 || gl >= s.genres.length) return { k: 'famille', fi };
  return { k: 'genre', fi, gl };
};

const adresseDe = (n: Niveau): string =>
  n.k === 'familles' ? '#/parcourir' : n.k === 'famille' ? `#/parcourir/${n.fi}` : `#/parcourir/${n.fi}/${n.gl}`;

/* --- Petits outils -------------------------------------------------------- */

/* DIX SECONDES. Cinq, la valeur de Spotify, oblige a repeter l'appui pour
   retrouver une intro ; trente fait manquer le passage cherche. Dix est le
   pas qui demande le moins de corrections. */
const SAUT = 10;

const mmss = (s: number): string => {
  if (!Number.isFinite(s) || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const sansAccent = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Tous les genres a plat, une fois pour toutes : la recherche les balaie. */
const TOUS: { fi: number; gl: number; g: Genre }[] = FAMILIES.flatMap((_, fi) =>
  (STRUCTURES[fi]?.genres ?? []).map((g, gl) => ({ fi, gl, g }))
);

/* --- La pochette ---------------------------------------------------------- */

function Pochette({ track, hue, taille }: { track: Track; hue: number; taille: number }) {
  /* UNE VIGNETTE YOUTUBE N'EST PAS UNE POCHETTE : format large, triangle rouge
     incruste. Rognee en carre elle dessine un bouton Lecture juste au-dessus
     du vrai. On lui prefere la couverture generee, qui est carree et propre. */
  if (track.cover && track.coverSource !== 'youtube') {
    return <img className="pv-pochette" src={track.cover} alt="" draggable={false} width={taille} height={taille} />;
  }
  return (
    <span className="pv-pochette pv-pochette-generee">
      <ProceduralCover artist={track.artist} title={track.title} hue={hue} />
    </span>
  );
}

/* LE BANDEAU D'IMAGES D'UN GENRE, fait de ses propres pochettes.

   D'OU VIENNENT LES IMAGES, puisque la question se pose : de nulle part
   ailleurs que du site. Les 1263 pochettes sont deja telechargees et servies
   par le depot ; aucune n'est allee chercher chez un tiers au moment de
   l'affichage, et aucune photo de machine n'a ete prise quelque part, ce qui
   serait un probleme de droits qu'on ne veut pas.

   LES VIGNETTES DE VIDEO SONT ECARTEES. Une pochette venue de YouTube est
   une capture de video, souvent avec le triangle rouge incruste ; posee dans
   une mosaique elle se remarque immediatement. On prend les vraies, et s'il
   n'y en a pas assez la mosaique ne s'affiche pas du tout plutot que de se
   completer avec du faux.

   CINQ GENRES SUR 219 N'ONT AUCUNE VRAIE POCHETTE. Ils auront un bandeau de
   couleur pleine, ce qui est un etat correct et non un trou. */
function BandeauImages({ tracks, hue }: { tracks: readonly Track[]; hue: number }) {
  const images = tracks
    .filter((t) => t.cover && t.coverSource !== 'youtube')
    .slice(0, 4)
    .map((t) => t.cover);

  if (images.length < 2) return null;

  return (
    <div className="pv-mosaique" aria-hidden="true" data-n={images.length}>
      {images.map((src, i) => (
        <img key={src + String(i)} src={src} alt="" draggable={false} loading="lazy" />
      ))}
      <span className="pv-mosaique-voile" style={{ '--pv-hue': hue } as React.CSSProperties} />
    </div>
  );
}

/* LA PHOTO D'UNE MACHINE, prise sur Wikimedia Commons et servie par le depot.

   LA LICENCE EST LA CONDITION, pas un detail administratif. Chaque fichier
   n'a ete retenu que si Commons declare une licence libre lisible, et
   l'auteur est affiche sous l'image parce que c'est ce que la licence
   demande. Une photo bien creditee peut etre publiee ; une photo dont on
   ignore le droit ne le peut pas, meme si elle est belle.

   Le corpus ecrit « Roland TR-909 adoucie » : le qualificatif dit comment la
   machine sert dans ce genre, il n'appartient pas au modele. On retrouve donc
   la photo par le modele contenu dans la chaine. */
interface FicheMachine {
  readonly machine: string;
  readonly fichier: string;
  readonly auteur: string;
  readonly licence: string;
  readonly source: string;
}
const CATALOGUE = MACHINES as Record<string, FicheMachine>;
const CLES = Object.keys(CATALOGUE);
const sansPonct = (x: string): string => x.toLowerCase().replace(/[^a-z0-9]/g, '');

function photoDe(machines: readonly string[]): FicheMachine | null {
  for (const brut of machines) {
    const cle = CLES.find((k) => sansPonct(brut).includes(sansPonct(k)));
    if (cle) return CATALOGUE[cle] ?? null;
  }
  return null;
}

function PhotoMachine({ machines }: { machines: readonly string[] }) {
  const f = photoDe(machines);
  /* PAS DE CADRE VIDE quand il n'y a pas de photo : 147 genres sur 219 sont
     dans ce cas aujourd'hui, et un rectangle gris repete 147 fois se lit
     comme une panne, pas comme une absence. */
  if (!f) return null;
  return (
    <figure className="pv-photo">
      <img src={`${import.meta.env.BASE_URL}${f.fichier}`} alt={f.machine} loading="lazy" />
      <figcaption className="pv-photo-legende">
        <span className="pv-photo-nom">{f.machine}</span>
        <a className="pv-photo-credit" href={f.source} target="_blank" rel="noreferrer noopener">
          {f.auteur} · {f.licence} · Wikimedia Commons
        </a>
      </figcaption>
    </figure>
  );
}

/* --- La vue --------------------------------------------------------------- */

export function ParcourirView() {
  const [niveau, setNiveau] = useState<Niveau>(lireNiveau);
  const [recherche, setRecherche] = useState('');
  const [chercheOuvert, setChercheOuvert] = useState(false);

  useEffect(() => {
    const suivre = (): void => setNiveau(lireNiveau());
    window.addEventListener('hashchange', suivre);
    return () => window.removeEventListener('hashchange', suivre);
  }, []);

  const aller = useCallback((n: Niveau) => {
    window.location.hash = adresseDe(n);
  }, []);

  /* LE LECTEUR SE CONSTRUIT DES LA PAGE D'UN GENRE, avant tout appui : c'est
     ce qui permet au premier playVideo() de partir du geste, et donc au son
     d'etre autorise. Construit au premier appui, il devenait pret une seconde
     trop tard et le navigateur refusait. */
  const { lecture, jouer, basculer, deplacer, chercher } = useLecteur({ precharger: niveau.k === 'genre' });

  /* LE CLAVIER, SUR LE MODELE DE SPOTIFY.

     Espace joue et met en pause, les fleches deplacent DANS le morceau, et
     les memes fleches avec Majuscule changent de morceau. Le geste le plus
     frequent est le deplacement dans le titre, il recoit donc la touche la
     plus simple.

     ON APPELLE preventDefault DES QU'ON TRAITE LA TOUCHE. Sans cela la
     fleche garde son role par defaut, qui fait defiler la page ou reculer
     dans l'historique selon le contexte : c'est exactement le mélange que
     Mika a constate, une fleche qui ramene en arriere au lieu de servir au
     lecteur.

     RIEN NE SE DECLENCHE PENDANT UNE SAISIE. Le champ de recherche a besoin
     de ses fleches et de sa barre d'espace, et un lecteur qui se met en
     pause parce qu'on tape un espace est le genre de defaut qu'on ne
     soupconne jamais. */
  useEffect(() => {
    const auClavier = (e: KeyboardEvent): void => {
      const cible = e.target;
      if (
        cible instanceof HTMLInputElement ||
        cible instanceof HTMLTextAreaElement ||
        (cible instanceof HTMLElement && cible.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      /* Sans piste en cours, on ne prend pas les touches : elles doivent
         rester au navigateur, qui fait defiler. */
      if (lecture.listeId === null) return;

      if (e.code === 'Space') {
        e.preventDefault();
        basculer();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) deplacer(-1);
        else chercher(Math.max(0, lecture.position - SAUT));
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) deplacer(1);
        else chercher(lecture.position + SAUT);
      }
    };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  }, [basculer, deplacer, chercher, lecture.position, lecture.listeId]);

  /* ON REMONTE EN HAUT A CHAQUE CHANGEMENT DE NIVEAU.

     DEFAUT SIGNALE PAR MIKA, « je ne vois pas le texte » : le conteneur de
     defilement gardait sa position d'un genre a l'autre. En arrivant depuis
     une page ou l'on avait descendu, on atterrissait au milieu du suivant,
     sous la description, directement sur la fiche technique. Le texte etait
     bien la, on ne le voyait jamais.

     C'est le genre de defaut qu'une capture ne montre pas : chaque ecran est
     correct, c'est le PASSAGE de l'un a l'autre qui ne l'est pas. */
  const corps = useRef<HTMLElement | null>(null);
  useEffect(() => {
    corps.current?.scrollTo({ top: 0 });
  }, [niveau.k, niveau.k === 'famille' || niveau.k === 'genre' ? niveau.fi : -1, niveau.k === 'genre' ? niveau.gl : -1]);

  const genreCourant = niveau.k === 'genre' ? STRUCTURES[niveau.fi]?.genres[niveau.gl] : undefined;
  const familleCourante = niveau.k === 'familles' ? undefined : FAMILIES[niveau.fi];

  /* La liste jouee, retrouvee depuis son identifiant : la barre du bas doit
     afficher un titre meme apres qu'on a change de page. */
  const listeJouee = useMemo(() => {
    if (!lecture.listeId) return null;
    const t = TOUS.find((x) => x.g.id === lecture.listeId);
    return t ? { ...t, tracks: t.g.tracks } : null;
  }, [lecture.listeId]);

  const pisteJouee = listeJouee?.tracks[lecture.index];

  const resultats = useMemo(() => {
    const q = sansAccent(recherche.trim());
    if (q.length < 2) return [];
    return TOUS.filter((x) => sansAccent(x.g.label).includes(q)).slice(0, 40);
  }, [recherche]);

  /* --- Rendu ------------------------------------------------------------- */

  const enTete = (
    <header className="pv-tete">
      {niveau.k === 'familles' ? (
        <a className="pv-logo" href="#/" aria-label={t.retourAtlas}>
          <img src={`${import.meta.env.BASE_URL}brand/sonaa-logo.png`} alt="SONAA" draggable={false} />
        </a>
      ) : (
        <button
          className="pv-retour"
          onClick={() => aller(niveau.k === 'genre' ? { k: 'famille', fi: niveau.fi } : { k: 'familles' })}
          aria-label={t.revenir}
        >
          <FaIcon icon={faChevronLeft} />
        </button>
      )}

      <h1 className="pv-tete-titre">
        {niveau.k === 'familles' ? t.parcourir : niveau.k === 'famille' ? familleCourante?.label : genreCourant?.label}
      </h1>

      <button
        className="pv-chercher-bouton"
        onClick={() => {
          setChercheOuvert((v) => !v);
          setRecherche('');
        }}
        aria-label={chercheOuvert ? t.fermerRecherche : t.chercherUnGenre}
      >
        <FaIcon icon={chercheOuvert ? faXmark : faMagnifyingGlass} />
      </button>
    </header>
  );

  const barreRecherche = chercheOuvert && (
    <div className="pv-chercher">
      <input
        className="pv-chercher-champ"
        type="search"
        autoFocus
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder={t.nomDunGenre}
        aria-label={t.chercherUnGenre}
      />
      {recherche.trim().length >= 2 && (
        <ul className="pv-resultats">
          {resultats.length === 0 && <li className="pv-resultat-vide">{t.aucunGenreDeCeNom}</li>}
          {resultats.map(({ fi, gl, g }) => (
            <li key={g.id}>
              <button
                className="pv-resultat"
                onClick={() => {
                  setChercheOuvert(false);
                  setRecherche('');
                  aller({ k: 'genre', fi, gl });
                }}
              >
                <span className="pv-resultat-nom">{g.label}</span>
                <span className="pv-resultat-famille" style={{ '--pv-hue': FAMILIES[fi]?.hue ?? 0 } as React.CSSProperties}>
                  {FAMILIES[fi]?.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="pv" data-joue={lecture.etat === 'joue' || lecture.etat === 'chargement' || Boolean(pisteJouee)}>
      {enTete}
      {barreRecherche}

      <main className="pv-corps" ref={corps}>
        {niveau.k === 'familles' && (
          <>
            <p className="pv-intro">
              {t.accroche(TOUS.length, FAMILIES.length)}
            </p>
            <div className="pv-grille">
              {FAMILIES.map((f, fi) => (
                <button key={f.id} className="pv-tuile" onClick={() => aller({ k: 'famille', fi })}>
                  <span className="pv-tuile-carte">
                    <span className="pv-tuile-bloc">
                      <span className="pv-tuile-nom">{f.label}</span>
                      <span className="pv-tuile-detail">{t.nGenres(f.count)}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="pv-sortie">
              <SiteNav variant="overlay" />
            </div>
          </>
        )}

        {niveau.k === 'famille' && familleCourante && (
          <>
            {/* LE TEXTE DE LA FAMILLE. Un genre repond a « qu'est-ce que
                c'est », une famille repond a « qu'est-ce qui reunit ces
                vingt-quatre genres ». Sans lui, cette page n'etait qu'une
                grille : on savait combien, jamais pourquoi ensemble. */}
            {familleCourante.description && (
              <>
                {familleCourante.redaction === 'brouillon' && (
                  <p className="pv-brouillon">
                    <span className="pv-brouillon-marque">{t.brouillon}</span>
                    {t.brouillonExplique}
                  </p>
                )}
                <p className="pv-description pv-description-famille">{familleCourante.description}</p>
              </>
            )}
            <p className="pv-intro">{t.genresAppuyez(familleCourante.count)}</p>
            <div className="pv-grille">
              {(STRUCTURES[niveau.fi]?.genres ?? []).map((g, gl) => {
                const p = poidsDe(g.id);
                return (
                  <button
                    key={g.id}
                    className="pv-tuile pv-tuile-genre"
                    onClick={() => aller({ k: 'genre', fi: niveau.fi, gl })}
                  >
                    <span className="pv-tuile-carte">
                      <span className="pv-tuile-bloc">
                        <span className="pv-tuile-nom">{g.label}</span>
                        <span className="pv-tuile-detail">
                          {g.annee > 0 ? g.annee : ''}
                          {p.derivesDirects > 0 ? ` · ${t.nDerives(p.derivesDirects)}` : ''}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {niveau.k === 'genre' && genreCourant && familleCourante && (
          <PageGenre
            genre={genreCourant}
            famille={familleCourante}
            fi={niveau.fi}
            lecture={lecture}
            jouer={jouer}
            basculer={basculer}
            allerFamille={() => aller({ k: 'famille', fi: niveau.fi })}
          />
        )}
      </main>

      {pisteJouee && listeJouee && (
        <BarreLecture
          piste={pisteJouee}
          hue={FAMILIES[listeJouee.fi]?.hue ?? 0}
          genreLabel={listeJouee.g.label}
          lecture={lecture}
          basculer={basculer}
          deplacer={deplacer}
          chercher={chercher}
          ouvrir={() => aller({ k: 'genre', fi: listeJouee.fi, gl: listeJouee.gl })}
        />
      )}
    </div>
  );
}

/* --- La page d'un genre --------------------------------------------------- */

interface PageGenreProps {
  genre: Genre;
  famille: (typeof FAMILIES)[number];
  fi: number;
  lecture: ReturnType<typeof useLecteur>['lecture'];
  jouer: ReturnType<typeof useLecteur>['jouer'];
  basculer: ReturnType<typeof useLecteur>['basculer'];
  allerFamille: () => void;
}

function PageGenre({ genre, famille, lecture, jouer, basculer, allerFamille }: PageGenreProps) {
  const tracks = genre.tracks;
  const derives = poidsDe(genre.id).descendance;
  const cetteListe = lecture.listeId === genre.id;
  const enCours = cetteListe && (lecture.etat === 'joue' || lecture.etat === 'chargement');

  return (
    <>
      <section className="pv-hero" style={{ '--pv-hue': famille.hue } as React.CSSProperties}>
        <BandeauImages tracks={tracks} hue={famille.hue} />
        <div className="pv-hero-texte">
        <button className="pv-hero-famille" onClick={allerFamille}>
          {famille.label}
        </button>
        <h2 className="pv-hero-nom">{genre.label}</h2>
        <p className="pv-hero-faits">
          {genre.annee > 0 && <span>{genre.annee}</span>}
          {genre.bpmRange && <span>{t.bpm(genre.bpmRange[0], genre.bpmRange[1])}</span>}
          <span>{t.nMorceaux(tracks.length)}</span>
        </p>

        {/* LE GROS BOUTON N'EXISTE QUE S'IL Y A QUELQUE CHOSE A JOUER. Rendu
            sans condition, il restait muet sur les genres sans morceau, ce
            qui est exactement le defaut qu'on repare. */}
        {tracks.length > 0 ? (
          <button
            className="pv-hero-play"
            onClick={() => (cetteListe ? basculer() : jouer(tracks, 0, genre.id))}
          >
            <FaIcon icon={lecture.etat === 'joue' && cetteListe ? faPause : faPlay} />
            <span>{lecture.etat === 'joue' && cetteListe ? t.pause : t.ecouter}</span>
          </button>
        ) : (
          <p className="pv-hero-vide">{t.aucunMorceau}</p>
        )}
        </div>
      </section>

      {/* CE QUI ECHOUE SE DIT, ET SE DIT ICI, dans le flux de la page. Dans
          l'ancien lecteur le message vivait dans un panneau masque sur
          telephone : il n'etait visible dans aucune des trois positions. */}
      {cetteListe && lecture.message && (
        <p className="pv-alerte" role="status">
          {lecture.message}
        </p>
      )}

      {/* CE QUE LE GENRE EST, AVANT CE QU'ON PEUT EN ECOUTER.

          La description etait tout en bas, apres la liste : il fallait passer
          douze morceaux pour lire la reponse a la question qui amene ici.
          Elle passe devant, avec les faits qui la completent. */}
      {t.texteEnFrancais && <p className="pv-langue">{t.texteEnFrancais}</p>}
      {genre.description && <p className="pv-description">{genre.description}</p>}

      {/* L'ARTICLE LONG, quand il existe.

          IL PORTE SA MARQUE QUAND IL EST UN BROUILLON, et ce n'est pas une
          precaution decorative : un texte ecrit par la machine ne doit pas se
          faire passer pour la prose de Mika. La marque se retire a la
          relecture, pas avant. C'est le mecanisme que le corpus prevoyait
          deja, on ne fait que l'afficher. */}
      {genre.article.length > 0 && (
        <article className="pv-article">
          {genre.redaction === 'brouillon' && (
            <p className="pv-brouillon">
              <span className="pv-brouillon-marque">{t.brouillon}</span>
              {t.brouillonExplique}
            </p>
          )}
          {genre.article.map((section) => (
            <section className="pv-article-section" key={section.titre}>
              <h3 className="pv-article-titre">{section.titre}</h3>
              {/* Les paragraphes sont separes par une ligne vide dans la
                  donnee : on ne stocke pas de balises dans le corpus. */}
              {section.texte.split('\n\n').map((para, i) => (
                <p key={String(i)}>{para}</p>
              ))}
            </section>
          ))}
        </article>
      )}

      {genre.motDeLAuteur && (
        <blockquote className="pv-mot" style={{ '--pv-hue': famille.hue } as React.CSSProperties}>
          <span className="pv-mot-titre">{t.motDeLAuteur}</span>
          {genre.motDeLAuteur}
          <span className="pv-mot-signe">Mika</span>
        </blockquote>
      )}

      <PhotoMachine machines={genre.machines} />

      {/* LA FICHE TECHNIQUE. Elle ne dit rien que le corpus ne sache deja :
          tempo, date, machines, labels, artistes, descendance. C'est le
          minimum pour repondre a « comment ca se fabrique », et chaque valeur
          est tracable jusqu'a la donnee, sans un mot invente. */}
      <section className="pv-fiche" style={{ '--pv-hue': famille.hue } as React.CSSProperties}>
        <h3 className="pv-fiche-titre">{t.ficheTechnique}</h3>
        <dl className="pv-faits">
          {genre.bpmRange && (
            <div className="pv-fait">
              <dt className="pv-fait-cle">{t.tempo}</dt>
              <dd className="pv-fait-val">{t.bpm(genre.bpmRange[0], genre.bpmRange[1])}</dd>
            </div>
          )}
          {genre.annee > 0 && (
            <div className="pv-fait">
              <dt className="pv-fait-cle">{t.apparition}</dt>
              <dd className="pv-fait-val">
                {genre.yearStart ? genre.annee : `${t.vers} ${genre.annee}`}
              </dd>
            </div>
          )}
          {genre.machines.length > 0 && (
            <div className="pv-fait">
              <dt className="pv-fait-cle">{t.machines}</dt>
              <dd className="pv-fait-val">
                <span className="pv-machines">
                  {genre.machines.map((m) => (
                    <span className="pv-machine" key={m}>{m}</span>
                  ))}
                </span>
              </dd>
            </div>
          )}
          {genre.labelsHistoriques.length > 0 && (
            <div className="pv-fait">
              <dt className="pv-fait-cle">{t.labels}</dt>
              <dd className="pv-fait-val">{genre.labelsHistoriques.join(', ')}</dd>
            </div>
          )}
          {genre.artistesCles.length > 0 && (
            <div className="pv-fait">
              <dt className="pv-fait-cle">{t.artistes}</dt>
              <dd className="pv-fait-val">{genre.artistesCles.join(', ')}</dd>
            </div>
          )}
          {derives > 0 && (
            <div className="pv-fait">
              <dt className="pv-fait-cle">{t.descendance}</dt>
              <dd className="pv-fait-val">{t.nGenresDerives(derives)}</dd>
            </div>
          )}
        </dl>
      </section>

      {tracks.length > 0 && (
        <h3 className="pv-titre-liste">{t.nMorceaux(tracks.length)}</h3>
      )}

      {tracks.length > 0 && (
        <ol className="pv-pistes">
          {tracks.map((tr, i) => {
            const active = cetteListe && lecture.index === i;
            return (
              <li key={tr.id}>
                <button
                  className="pv-piste"
                  data-active={active}
                  onClick={() => (active ? basculer() : jouer(tracks, i, genre.id))}
                >
                  <span className="pv-piste-image">
                    <Pochette track={tr} hue={famille.hue} taille={48} />
                    {active && (
                      <span className="pv-piste-etat" aria-hidden="true">
                        <FaIcon icon={lecture.etat === 'joue' ? faPause : faPlay} />
                      </span>
                    )}
                  </span>
                  <span className="pv-piste-texte">
                    <span className="pv-piste-titre">{tr.title}</span>
                    <span className="pv-piste-artiste">
                      {tr.artist}
                      {tr.year ? ` · ${tr.year}` : ''}
                      {tr.role === 'origine' ? ` · ${t.origine}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {enCours && <p className="pv-sr" role="status">{t.lectureEnCours}</p>}
    </>
  );
}

/* --- La barre du bas ------------------------------------------------------ */

interface BarreProps {
  piste: Track;
  hue: number;
  genreLabel: string;
  lecture: ReturnType<typeof useLecteur>['lecture'];
  basculer: () => void;
  deplacer: (n: number) => void;
  chercher: (secondes: number) => void;
  ouvrir: () => void;
}

function BarreLecture({ piste, hue, genreLabel, lecture, basculer, deplacer, chercher, ouvrir }: BarreProps) {
  /* CE QU'ON MONTRE PENDANT QU'ON TIRE n'est pas ce que le lecteur joue.

     Sans cet etat, la poignee revient sous le doigt a chaque rafraichissement
     de position, et l'on croit que la barre resiste. On affiche donc la
     position TIREE tant que le doigt est pose, et la position reelle apres. */
  const [tire, setTire] = useState<number | null>(null);
  const piste_ref = useRef<HTMLDivElement | null>(null);

  const position = tire ?? lecture.position;
  const avance = lecture.duree > 0 ? Math.min(100, Math.max(0, (position / lecture.duree) * 100)) : 0;
  const joue = lecture.etat === 'joue';

  const secondesDe = (clientX: number): number => {
    const el = piste_ref.current;
    if (!el || lecture.duree <= 0) return 0;
    const b = el.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - b.left) / b.width));
    return f * lecture.duree;
  };

  return (
    <div className="pv-barre">
      {/* LA RANGEE DE DEFILEMENT, QU'ON ATTRAPE AU DOIGT. La ligne visible
          fait 4 px, mais la zone qui recoit le geste fait toute la hauteur de
          la rangee : viser une ligne de quatre pixels au pouce est
          impossible, et c'est pour cela que l'ancienne barre n'etait qu'un
          temoin. */}
      <div className="pv-scrub">
        <span className="pv-scrub-temps">{mmss(position)}</span>
        <div
          ref={piste_ref}
          className="pv-scrub-piste"
          role="slider"
          tabIndex={0}
          aria-label={t.positionDansLeMorceau}
          aria-valuemin={0}
          aria-valuemax={Math.round(lecture.duree)}
          aria-valuenow={Math.round(position)}
          aria-valuetext={mmss(position)}
          onPointerDown={(e) => {
            if (lecture.duree <= 0) return;
            /* LA CAPTURE PEUT ETRE REFUSEE, et ce n'est pas une raison
               d'abandonner le glissement. Elle echoue quand le pointeur
               n'est plus actif au moment ou on la demande, ce qui arrive
               quand le doigt part tres vite. Sans ce garde, l'exception
               remontait avant setTire et la barre ne bougeait pas du tout :
               un echec de confort devenait un echec de fonction. */
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* On suit alors le pointeur sans capture, ce qui marche tant
                 qu'il reste au-dessus de la barre. */
            }
            setTire(secondesDe(e.clientX));
          }}
          onPointerMove={(e) => {
            if (tire === null) return;
            setTire(secondesDe(e.clientX));
          }}
          onPointerUp={(e) => {
            if (tire === null) return;
            const s = secondesDe(e.clientX);
            setTire(null);
            chercher(s);
          }}
          onPointerCancel={() => setTire(null)}
          onKeyDown={(e) => {
            if (lecture.duree <= 0) return;
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              chercher(Math.max(0, lecture.position - SAUT));
            }
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              chercher(Math.min(lecture.duree, lecture.position + SAUT));
            }
          }}
        >
          <span className="pv-scrub-fond">
            <span className="pv-scrub-fait" style={{ width: `${avance}%` }} />
          </span>
          <span className="pv-scrub-poignee" style={{ left: `${avance}%` }} />
        </div>
        <span className="pv-scrub-temps">{lecture.duree > 0 ? mmss(lecture.duree) : '--:--'}</span>
      </div>

      <div className="pv-barre-bas">
      <button className="pv-barre-ouvrir" onClick={ouvrir}>
        <Pochette track={piste} hue={hue} taille={44} />
        <span className="pv-barre-texte">
          <span className="pv-barre-titre">{piste.title}</span>
          <span className="pv-barre-sous">
            {/* L'ETAT EST DIT EN TOUTES LETTRES quand il n'est pas la lecture.
                Un bouton qui n'a pas encore obtenu le son doit le montrer, pas
                afficher une pause qui n'a pas eu lieu. */}
            {lecture.etat === 'chargement'
              ? t.chargement
              : lecture.etat === 'bloque'
                ? t.appuyezEncoreCourt
                : lecture.etat === 'erreur'
                  ? t.pisteIllisible
                  : (
                      /* PAS DE GABARIT QUI COMPOSE UN POINT MEDIAN AVEC UN
                         NOM : c'est la regle que check:labels fait respecter,
                         parce qu'un suffixe colle a un nom a deja ete pris
                         pour un identifiant technique reste d'un jeu de
                         donnees factice. Le separateur est un element a lui,
                         le nom reste nu. */
                      <>
                        {piste.artist}
                        <span className="pv-sep" aria-hidden="true" />
                        {genreLabel}
                      </>
                    )}
          </span>
        </span>
      </button>

      <div className="pv-barre-transport">
        <button onClick={() => deplacer(-1)} aria-label={t.morceauPrecedent}>
          <FaIcon icon={faBackwardStep} />
        </button>
        <button className="pv-barre-play" onClick={basculer} aria-label={joue ? t.pause : t.lecture}>
          <FaIcon icon={joue ? faPause : faPlay} />
        </button>
        <button onClick={() => deplacer(1)} aria-label={t.morceauSuivant}>
          <FaIcon icon={faForwardStep} />
        </button>
      </div>

      </div>
    </div>
  );
}
