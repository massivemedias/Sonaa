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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FAMILIES, STRUCTURES, type Genre, type Track } from './structures.ts';
import { poidsDe } from './poids.ts';
import { ProceduralCover } from './ProceduralCover.tsx';
import { useLecteur } from '../lecture/useLecteur.ts';
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
  const { lecture, jouer, basculer, deplacer } = useLecteur({ precharger: niveau.k === 'genre' });

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

      <main className="pv-corps">
        {niveau.k === 'familles' && (
          <>
            <p className="pv-intro">
              {t.accroche(TOUS.length, FAMILIES.length)}
            </p>
            <div className="pv-grille">
              {FAMILIES.map((f, fi) => (
                <button
                  key={f.id}
                  className="pv-tuile"
                  style={{ '--pv-hue': f.hue } as React.CSSProperties}
                  onClick={() => aller({ k: 'famille', fi })}
                >
                  <span className="pv-tuile-nom">{f.label}</span>
                  <span className="pv-tuile-detail">{t.nGenres(f.count)}</span>
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
            <p className="pv-intro">{t.genresAppuyez(familleCourante.count)}</p>
            <div className="pv-grille">
              {(STRUCTURES[niveau.fi]?.genres ?? []).map((g, gl) => {
                const p = poidsDe(g.id);
                return (
                  <button
                    key={g.id}
                    className="pv-tuile pv-tuile-genre"
                    style={{ '--pv-hue': familleCourante.hue } as React.CSSProperties}
                    onClick={() => aller({ k: 'genre', fi: niveau.fi, gl })}
                  >
                    <span className="pv-tuile-nom">{g.label}</span>
                    <span className="pv-tuile-detail">
                      {g.annee > 0 ? g.annee : ''}
                      {p.derivesDirects > 0 ? ` · ${t.nDerives(p.derivesDirects)}` : ''}
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
  const cetteListe = lecture.listeId === genre.id;
  const enCours = cetteListe && (lecture.etat === 'joue' || lecture.etat === 'chargement');

  return (
    <>
      <section className="pv-hero" style={{ '--pv-hue': famille.hue } as React.CSSProperties}>
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

      {genre.motDeLAuteur && (
        <blockquote className="pv-mot">
          {genre.motDeLAuteur}
          <span className="pv-mot-signe">Mika</span>
        </blockquote>
      )}

      <dl className="pv-faits">
        {genre.machines.length > 0 && (
          <div className="pv-fait">
            <dt className="pv-fait-cle">{t.machines}</dt>
            <dd className="pv-fait-val">{genre.machines.join(', ')}</dd>
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
      </dl>

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
  ouvrir: () => void;
}

function BarreLecture({ piste, hue, genreLabel, lecture, basculer, deplacer, ouvrir }: BarreProps) {
  const avance = lecture.duree > 0 ? Math.min(100, (lecture.position / lecture.duree) * 100) : 0;
  const joue = lecture.etat === 'joue';

  return (
    <div className="pv-barre">
      <div className="pv-barre-progres" aria-hidden="true">
        <span style={{ width: `${avance}%` }} />
      </div>

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
                  : `${piste.artist} · ${genreLabel}`}
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

      <span className="pv-barre-temps">{mmss(lecture.position)}</span>
    </div>
  );
}
