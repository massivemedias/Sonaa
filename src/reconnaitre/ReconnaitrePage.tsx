/* RECONNAITRE : ce qui passe a la radio, a la tele, dans la piece.
 *
 * Route #/reconnaitre, chemin /reconnaitre/.
 *
 * DEUX RESULTATS INDEPENDANTS, ET L'ORDRE COMPTE.
 *
 * Le STYLE est la fonctionnalite principale. Il sort d'un reseau de neurones
 * qui tourne dans le navigateur : rien ne part, aucune cle n'est necessaire,
 * et il marche meme si tout le reste tombe. C'est ce qu'on affiche en
 * premier, et c'est le seul resultat garanti.
 *
 * Le MORCEAU est un bonus. Il passe par AudD, qui se paie, et la route de la
 * passerelle repond 503 quand la cle n'est pas posee. Dans ce cas la section
 * ne s'affiche pas du tout : une section vide qui dit « indisponible » est
 * une promesse non tenue affichee en permanence.
 *
 * LA MODALE DE CONSENTEMENT N'EST PAS UNE FORMALITE. La loi 25 demande un
 * consentement libre et eclaire, distinct par finalite. Il y a donc deux
 * finalites et deux consentements : ecouter sur l'appareil, et envoyer huit
 * secondes a un tiers. La seconde est une case a cocher, decochee, et on peut
 * accepter la premiere sans la seconde. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EnTeteSite } from '../atlas/EnTeteSite.tsx';
import { PiedDePage } from '../atlas/PiedDePage.tsx';
import { t } from '../langue/langue.ts';
import { Apparition } from '../design/mouvement.tsx';
import { FAMILIES, STRUCTURES } from '../atlas/structures.ts';
import { slug } from '../lib/chemins.ts';
import { capturer, SECONDES_CAPTURE } from './capture.ts';
import { chargerMoteur, POIDS_MODELE_MO, type Prediction } from './modele.ts';
import { familleSonaa, nomCourt, styleDeLEtiquette } from './discogs-vers-sonaa.ts';
import { ajouterAlHistorique, lireHistorique, viderHistorique, type Reconnaissance } from './historique.ts';
import type { MorceauReconnu } from './audd.ts';
import '../atlas/credits.css';
import './reconnaitre.css';

const PASSERELLE = 'https://sonaa-sets.massivemedias.workers.dev';

type Etat = 'repos' | 'consentement' | 'chargement' | 'ecoute' | 'analyse' | 'resultat' | 'erreur';

/* L'ADRESSE D'UN GENRE OU D'UNE FAMILLE, telle que le pre-rendu l'ecrit. Un
   lien construit ici doit etre exactement celui de l'atlas, sinon il tombe
   sur la page d'accueil sans rien dire. */
function cheminDuGenre(id: string): string | null {
  for (let fi = 0; fi < FAMILIES.length; fi += 1) {
    const genre = STRUCTURES[fi]?.genres.find((g) => g.id === id);
    const famille = FAMILIES[fi];
    if (genre && famille) return `/styles/${slug(famille.label)}/${slug(genre.label)}/`;
  }
  return null;
}

function cheminDeLaFamille(id: string): string | null {
  const famille = FAMILIES.find((f) => f.id === id);
  return famille ? `/styles/${slug(famille.label)}/` : null;
}

export function ReconnaitrePage() {
  const [etat, setEtat] = useState<Etat>('repos');
  const [avancement, setAvancement] = useState(0);
  const [seconde, setSeconde] = useState(0);
  const [styles, setStyles] = useState<readonly Prediction[]>([]);
  const [morceau, setMorceau] = useState<MorceauReconnu | null>(null);
  const [erreur, setErreur] = useState<string>('');
  const [historique, setHistorique] = useState<readonly Reconnaissance[]>([]);
  const [morceauActif, setMorceauActif] = useState(false);
  const [accepteMorceau, setAccepteMorceau] = useState(false);
  const vivant = useRef(true);

  useEffect(() => {
    document.title = `${t.quelStyleJoue} · SONAA`;
    setHistorique(lireHistorique());
    return () => {
      vivant.current = false;
    };
  }, []);

  /* LA ROUTE DU MORCEAU EST INTERROGEE UNE FOIS, A L'OUVERTURE. Sans cle,
     elle repond `disponible: false` et la section n'existera pas.
     
     ON LA LIT, ON NE LUI ENVOIE PLUS RIEN. Cette sonde postait un corps
     vide et lisait le code de retour, ce qui ecrivait une erreur 400 dans
     la console de chaque visiteur a chaque ouverture de la page. Une
     question de disponibilite est une lecture. Voir worker/src/index.ts. */
  useEffect(() => {
    let annule = false;
    void fetch(`${PASSERELLE}/api/reconnaitre-track`)
      .then((r) => (r.ok ? r.json() : { disponible: false }))
      .then((d: { disponible?: boolean }) => {
        if (!annule) setMorceauActif(d.disponible === true);
      })
      .catch(() => {
        if (!annule) setMorceauActif(false);
      });
    return () => {
      annule = true;
    };
  }, []);

  const lancer = useCallback(async () => {
    setErreur('');
    setStyles([]);
    setMorceau(null);
    try {
      setEtat('chargement');
      const moteur = await chargerMoteur((p) => setAvancement(p));

      setEtat('ecoute');
      setSeconde(0);
      /* LE PRECHAUFFAGE TOURNE PENDANT L'ECOUTE, et n'est pas attendu : dix
         secondes de micro couvrent largement les quatre que coute la
         premiere inference. Voir modele.ts. */
      void moteur.prechauffer();
      const capture = await capturer((s) => setSeconde(s));

      setEtat('analyse');
      const trouves = await moteur.predire(capture.pcm);
      setStyles(trouves);

      /* LE MORCEAU EST DEMANDE APRES, ET SON ECHEC N'EFFACE PAS LE STYLE. */
      let reconnu: MorceauReconnu | null = null;
      if (morceauActif && accepteMorceau) {
        try {
          const r = await fetch(`${PASSERELLE}/api/reconnaitre-track`, { method: 'POST', body: capture.extrait });
          if (r.ok) {
            const lu = (await r.json()) as { morceau: MorceauReconnu | null };
            reconnu = lu.morceau;
          }
        } catch {
          /* Reseau coupe ou quota atteint : le style suffit. */
        }
      }
      setMorceau(reconnu);
      setEtat('resultat');

      setHistorique(
        ajouterAlHistorique({
          quand: Date.now(),
          styles: trouves.map((s) => ({ discogs: s.discogs, score: s.score })),
          ...(reconnu ? { artiste: reconnu.artiste, titre: reconnu.titre } : {}),
        })
      );
    } catch (e) {
      const nom = e instanceof Error ? e.name : '';
      setErreur(nom === 'NotAllowedError' || nom === 'NotFoundError' ? t.reconnaitreErreurMicro : t.reconnaitreErreurStyle);
      setEtat('erreur');
    }
  }, [morceauActif, accepteMorceau]);

  const enMarche = etat === 'chargement' || etat === 'ecoute' || etat === 'analyse';

  const libelleBouton = useMemo(() => {
    if (etat === 'chargement') return t.reconnaitreChargement(avancement);
    if (etat === 'ecoute') return t.reconnaitreEnEcoute(seconde);
    if (etat === 'analyse') return t.reconnaitreAnalyse;
    if (etat === 'resultat' || etat === 'erreur') return t.reconnaitreRelancer;
    return t.reconnaitreEcouter;
  }, [etat, avancement, seconde]);

  return (
    <>
      <EnTeteSite />
      <main className="credits rc">
        <header className="credits-head">
          <h1>{t.quelStyleJoue}</h1>
          <p className="credits-lede">{t.reconnaitreChapeau}</p>
        </header>

        <div className="credits-body">
          <div className="rc-action">
            <button
              type="button"
              className={`rc-bouton${enMarche ? ' rc-bouton-actif' : ''}`}
              disabled={enMarche}
              onClick={() => (etat === 'repos' || etat === 'resultat' || etat === 'erreur' ? setEtat('consentement') : undefined)}
              aria-live="polite"
            >
              {etat === 'ecoute' && (
                <span
                  className="rc-jauge"
                  style={{ transform: `scaleX(${seconde / SECONDES_CAPTURE})` }}
                  aria-hidden="true"
                />
              )}
              <span className="rc-bouton-mot">{libelleBouton}</span>
            </button>
            <p className="rc-poids">{t.reconnaitrePoids(POIDS_MODELE_MO)}</p>
          </div>

          {etat === 'erreur' && <p className="rc-erreur">{erreur}</p>}

          {styles.length > 0 && (
            <Apparition as="section" className="rc-bloc">
              <h2 className="rc-titre">{t.reconnaitreLeStyle}</h2>
              <ul className="rc-styles">
                {styles.map((s) => {
                  const entree = styleDeLEtiquette(s.discogs);
                  const chemin = entree?.sonaa
                    ? cheminDuGenre(entree.sonaa)
                    : entree
                      ? (() => {
                          const f = familleSonaa(entree);
                          return f ? cheminDeLaFamille(f) : null;
                        })()
                      : null;
                  const pourcent = `${Math.round(s.score * 100)} %`;
                  return (
                    <li key={s.discogs} className="rc-style">
                      {chemin ? (
                        <a className="rc-style-nom" href={chemin}>
                          {s.nom}
                        </a>
                      ) : (
                        <span className="rc-style-nom rc-style-hors">
                          {s.nom} <span className="rc-hors-mot">{t.reconnaitreHorsAtlas}</span>
                        </span>
                      )}
                      <span className="rc-part" aria-hidden="true">
                        <span className="rc-part-pleine" style={{ width: pourcent }} />
                      </span>
                      <span className="rc-pourcent">{pourcent}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="rc-note">{t.reconnaitreImprecis}</p>
            </Apparition>
          )}

          {etat === 'resultat' && morceauActif && accepteMorceau && (
            <Apparition as="section" i={1} className="rc-bloc">
              <h2 className="rc-titre">{t.reconnaitreLeMorceau}</h2>
              {morceau ? (
                <div className="rc-morceau">
                  {morceau.pochette && <img className="rc-pochette" src={morceau.pochette} alt="" loading="lazy" />}
                  <div className="rc-morceau-texte">
                    <p className="rc-morceau-titre">{morceau.titre}</p>
                    <p className="rc-morceau-artiste">{morceau.artiste}</p>
                    {morceau.album && <p className="rc-morceau-album">{morceau.album}</p>}
                    {morceau.liens.length > 0 && (
                      <p className="rc-morceau-liens">
                        {morceau.liens.map((l) => (
                          <a key={l.url} href={l.url} target="_blank" rel="noreferrer noopener">
                            {l.nom}
                          </a>
                        ))}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="rc-note">{t.reconnaitreSansMorceau}</p>
              )}
            </Apparition>
          )}

          <section className="rc-bloc">
            <h2 className="rc-titre">
              {t.reconnaitreHistorique}
              {historique.length > 0 && (
                <button
                  type="button"
                  className="rc-effacer"
                  onClick={() => setHistorique(viderHistorique())}
                >
                  {t.reconnaitreEffacer}
                </button>
              )}
            </h2>
            {historique.length === 0 ? (
              <p className="rc-note">{t.reconnaitreAucunHistorique}</p>
            ) : (
              <ul className="rc-historique">
                {historique.map((r) => (
                  <li key={r.quand} className="rc-passe">
                    <span className="rc-passe-styles">
                      {r.styles.map((s) => nomCourt(s.discogs)).join(', ')}
                    </span>
                    {r.titre && (
                      <span className="rc-passe-morceau">
                        {r.artiste} · {r.titre}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <PiedDePage />
      </main>

      {etat === 'consentement' && (
        <div className="rc-voile" onClick={() => setEtat('repos')}>
          <div
            className="rc-modale"
            role="dialog"
            aria-modal="true"
            aria-label={t.consentementTitre}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="rc-modale-titre">{t.consentementTitre}</h2>
            <p>{t.consentementMicro}</p>
            <p>{t.consentementLocal}</p>
            <p>{t.consentementDuree}</p>
            {morceauActif && (
              <label className="rc-case">
                <input
                  type="checkbox"
                  checked={accepteMorceau}
                  onChange={(e) => setAccepteMorceau(e.target.checked)}
                />
                <span>{t.consentementCaseMorceau}</span>
              </label>
            )}
            <div className="rc-modale-boutons">
              <button type="button" className="rc-refus" onClick={() => setEtat('repos')}>
                {t.consentementRefuser}
              </button>
              <button type="button" className="rc-accord" onClick={() => void lancer()}>
                {t.consentementAccepter}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
