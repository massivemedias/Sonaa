/* RECONNAITRE : ce qui passe a la radio, a la tele, dans la piece.
 *
 * LE COMPOSANT VIT A DEUX ENDROITS depuis le 27 septembre 2026 : la page
 * /reconnaitre/, gardee pour les liens existants, et la surcouche de
 * l'accueil, ouverte par le bouton sous la banniere sans changer d'adresse.
 * Meme code, meme micro, meme resultat.
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
import { t } from '../langue/langue.ts';
import { Apparition } from '../design/mouvement.tsx';
import { FAMILIES, STRUCTURES } from '../atlas/structures.ts';
import { slug } from '../lib/chemins.ts';
import { capturer, NIVEAU_MINIMAL, SECONDES_CAPTURE } from './capture.ts';
import { chargerMoteur, POIDS_MODELE_MO, type Prediction } from './modele.ts';
import { familleSonaa, nomCourt, styleDeLEtiquette } from './discogs-vers-sonaa.ts';
import { ajouterAlHistorique, lireHistorique, viderHistorique, type Reconnaissance } from './historique.ts';
import type { MorceauReconnu } from './audd.ts';
import { scanAEnregistrer } from './scan.ts';
import './reconnaitre.css';

const PASSERELLE = 'https://sonaa-sets.massivemedias.workers.dev';
const CLE_ENVOI = 'sonaa-envoi-morceau';
const CLE_MICRO = 'sonaa-micro-consenti';

function lireChoix(cle: string, defaut: boolean): boolean {
  try {
    const v = localStorage.getItem(cle);
    return v === null ? defaut : v === '1';
  } catch {
    return defaut;
  }
}
function ecrireChoix(cle: string, valeur: boolean): void {
  try {
    localStorage.setItem(cle, valeur ? '1' : '0');
  } catch {
    /* navigation privee : le choix ne survit pas a la page, et c'est tout */
  }
}

type Etat = 'repos' | 'consentement' | 'chargement' | 'ecoute' | 'analyse' | 'resultat' | 'erreur';


/** Le nom et l'adresse d'un genre de l'atlas, par son identifiant. */
function genreSonaa(id: string): { nom: string; chemin: string } | null {
  for (let fi = 0; fi < FAMILIES.length; fi += 1) {
    const genre = STRUCTURES[fi]?.genres.find((g) => g.id === id);
    const famille = FAMILIES[fi];
    if (genre && famille) return { nom: genre.label, chemin: `/styles/${slug(famille.label)}/${slug(genre.label)}/` };
  }
  return null;
}

/* LE NOM DE L'ATLAS POUR UNE ETIQUETTE DU RESEAU : le genre s'il en a un,
   la famille sinon, le nom Discogs en dernier recours. L'historique parlait
   Discogs (« Hi NRG, Dance-pop ») ; il parle SONAA. */
function nomAtlas(discogs: string): string {
  const entree = styleDeLEtiquette(discogs);
  const genre = entree?.sonaa ? genreSonaa(entree.sonaa) : null;
  if (genre) return genre.nom;
  const famille = entree ? familleSonaa(entree) : null;
  const f = famille ? FAMILIES.find((x) => x.id === famille) : null;
  return f ? f.label : nomCourt(discogs);
}

/** « 6:55 » depuis des secondes. */
function mmss(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = Math.round(secondes % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function cheminDeLaFamille(id: string): string | null {
  const famille = FAMILIES.find((f) => f.id === id);
  return famille ? `/styles/${slug(famille.label)}/` : null;
}

interface Props {
  /** Vrai dans la surcouche de l'accueil : le titre est celui de la fenetre,
      et les deux boutons d'action suivent le resultat. */
  readonly enSurcouche?: boolean;
}

export function Reconnaissance({ enSurcouche = false }: Props) {
  const [etat, setEtat] = useState<Etat>('repos');
  const [avancement, setAvancement] = useState(0);
  const [seconde, setSeconde] = useState(0);
  const [styles, setStyles] = useState<readonly Prediction[]>([]);
  const [morceau, setMorceau] = useState<MorceauReconnu | null>(null);
  /* POURQUOI IL N'Y A PAS DE MORCEAU. Mesure le 22 septembre 2026 : la route
     repondait `null` sans distinguer « AudD n'a rien reconnu » de « AudD
     refuse, quota atteint », et la page se taisait dans les deux cas. */
  const [raisonMorceau, setRaisonMorceau] = useState<string>('');
  const [erreur, setErreur] = useState<string>('');
  const [historique, setHistorique] = useState<readonly Reconnaissance[]>([]);
  const [morceauActif, setMorceauActif] = useState(false);
  /* LE CLIC VAUT CONSENTEMENT, ET L'ENVOI SE DEBRANCHE. Mika, le 23 septembre
     2026 : « plus aucune case a cocher ». La fenetre ne demande plus que le
     micro, une fois, et s'en souvient ; l'envoi de huit secondes a AudD est
     annonce en clair sous le bouton, actif par defaut, et un interrupteur le
     coupe pour qui ne le veut pas. Les deux choix vivent dans localStorage. */
  const [envoiMorceau] = useState<boolean>(() => lireChoix(CLE_ENVOI, true));
  const [microConsenti, setMicroConsenti] = useState<boolean>(() => lireChoix(CLE_MICRO, false));
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

      /* SON TROP FAIBLE : ON LE DIT, ON NE CLASSE PAS. Un micro coupe ou une
         piece silencieuse donnaient un style avec sa jauge, ou une erreur
         sans nom quand Essentia plantait sur du zero. Voir NIVEAU_MINIMAL. */
      if (capture.niveau < NIVEAU_MINIMAL) {
        setErreur(t.reconnaitreSonTropFaible);
        setEtat('erreur');
        return;
      }

      setEtat('analyse');
      const trouves = await moteur.predire(capture.pcm);
      setStyles(trouves);

      /* LE MORCEAU EST DEMANDE APRES, ET SON ECHEC N'EFFACE PAS LE STYLE. */
      let reconnu: MorceauReconnu | null = null;
      let raison = '';
      if (morceauActif && envoiMorceau) {
        try {
          const r = await fetch(`${PASSERELLE}/api/reconnaitre-track`, {
            method: 'POST',
            headers: { 'content-type': capture.extrait.type || 'application/octet-stream' },
            body: capture.extrait,
          });
          const lu = (await r.json().catch(() => ({}))) as { morceau?: MorceauReconnu | null; raison?: string | null; erreur?: string };
          reconnu = r.ok ? (lu.morceau ?? null) : null;
          raison = lu.raison ?? lu.erreur ?? (r.ok ? '' : `HTTP ${r.status}`);
          if (import.meta.env.DEV) {
            (window as unknown as { __sonaaReco?: Record<string, unknown> }).__sonaaReco = {
              ...(window as unknown as { __sonaaReco?: Record<string, unknown> }).__sonaaReco,
              morceau: { statut: r.status, corps: lu },
            };
          }
        } catch (e) {
          /* Reseau coupe : le style suffit, mais on le dit. */
          raison = e instanceof Error ? e.message : String(e);
        }
      }
      setMorceau(reconnu);
      setRaisonMorceau(raison);

      /* CE QU'ON GARDE : voir scan.ts. Le morceau nomme, le meilleur genre de
         l'atlas, si la confiance passe le seuil. La passerelle refait le
         calcul et ecrit « en attente » ; rien ne parait avant moderation. */
      const scan = scanAEnregistrer(reconnu, trouves);
      if (import.meta.env.DEV) {
        (window as unknown as { __sonaaReco?: Record<string, unknown> }).__sonaaReco = {
          ...(window as unknown as { __sonaaReco?: Record<string, unknown> }).__sonaaReco,
          scan,
        };
      }
      if (scan) {
        void fetch(`${PASSERELLE}/api/scan`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(scan),
        }).catch(() => undefined);
      }
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
  }, [morceauActif, envoiMorceau]);

  const enMarche = etat === 'chargement' || etat === 'ecoute' || etat === 'analyse';

  /* LE PREMIER STYLE QUI A UNE FICHE, genre ou famille, pour le bouton
     « Ouvrir le style ». */
  const premierChemin = useMemo(() => {
    for (const s of styles) {
      const entree = styleDeLEtiquette(s.discogs);
      const genre = entree?.sonaa ? genreSonaa(entree.sonaa) : null;
      if (genre) return genre.chemin;
      const famille = entree ? familleSonaa(entree) : null;
      if (famille) return cheminDeLaFamille(famille);
    }
    return null;
  }, [styles]);


  const libelleBouton = useMemo(() => {
    if (etat === 'chargement') return t.reconnaitreChargement(avancement);
    if (etat === 'ecoute') return t.reconnaitreEnEcoute(seconde);
    if (etat === 'analyse') return t.reconnaitreAnalyse;
    if (etat === 'resultat' || etat === 'erreur') return t.reconnaitreRelancer;
    return t.reconnaitreEcouter;
  }, [etat, avancement, seconde]);

  return (
    <>
      <div className={enSurcouche ? 'rc rc-surcouche' : 'rc'}>
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
              onClick={() => {
                if (etat !== 'repos' && etat !== 'resultat' && etat !== 'erreur') return;
                /* LE MICRO NE SE DEMANDE QU'UNE FOIS, comme n'importe quel site. */
                if (microConsenti) void lancer();
                else setEtat('consentement');
              }}
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
            {/* LA LIGNE SUR L'ENVOI A AUDD EST PARTIE. Mika, le 27 septembre
                2026 : « enleve cette ligne ». L'envoi reste actif par defaut,
                memorise, et la politique de confidentialite le decrit. */}
          </div>

          {etat === 'erreur' && <p className="rc-erreur">{erreur}</p>}

          {/* ═══ LA FICHE DU RESULTAT, EN GRAND ═══
              Mika, le 27 septembre 2026 : « en desktop c'est pas beau, je veux
              quelque chose qui prenne de la place ». Une seule carte : la
              pochette a gauche, le morceau a droite avec ses faits (album,
              label, annee, duree, position de l'extrait), ses liens, puis le
              style avec sa confiance. Les pourcentages reviennent, nommes
              pour ce qu'ils sont : la confiance du reseau par style, pas une
              part d'un tout. */}
          {(etat === 'resultat' || styles.length > 0) && (
            <Apparition as="section" className="rc-bloc rc-resultat">
              {etat === 'resultat' && morceauActif && envoiMorceau && (
                <div className="rc-fiche">
                  <div className="rc-fiche-pochette">
                    {morceau?.pochette ? (
                      <img src={morceau.pochette} alt="" loading="lazy" />
                    ) : (
                      <span className="rc-fiche-vide" aria-hidden="true" />
                    )}
                  </div>
                  <div className="rc-fiche-corps">
                    <p className="rc-titre">{t.reconnaitreLeMorceau}</p>
                    {morceau ? (
                      <>
                        <h2 className="rc-fiche-titre">{morceau.titre}</h2>
                        <p className="rc-fiche-artiste">{morceau.artiste}</p>
                        <dl className="rc-faits">
                          {morceau.album && (
                            <div>
                              <dt>{t.reconnaitreAlbum}</dt>
                              <dd>{morceau.album}</dd>
                            </div>
                          )}
                          {morceau.label && (
                            <div>
                              <dt>{t.reconnaitreLabel}</dt>
                              <dd>{morceau.label}</dd>
                            </div>
                          )}
                          {morceau.annee && (
                            <div>
                              <dt>{t.reconnaitreAnnee}</dt>
                              <dd>{morceau.annee}</dd>
                            </div>
                          )}
                          {morceau.duree && (
                            <div>
                              <dt>{t.reconnaitreDuree}</dt>
                              <dd>{mmss(morceau.duree)}</dd>
                            </div>
                          )}
                          {morceau.position && (
                            <div>
                              <dt>{t.reconnaitrePosition}</dt>
                              <dd>{morceau.position}</dd>
                            </div>
                          )}
                        </dl>
                        {morceau.liens.length > 0 && (
                          <p className="rc-morceau-liens">
                            {morceau.liens.map((l) => (
                              <a key={l.url} href={l.url} target="_blank" rel="noreferrer noopener">
                                {l.nom}
                              </a>
                            ))}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <h2 className="rc-fiche-titre">{t.reconnaitreMorceauNonIdentifie}</h2>
                        <p className="rc-note">
                          {raisonMorceau === 'aucun resultat' || raisonMorceau === ''
                            ? t.reconnaitreSansMorceau
                            : t.reconnaitreServiceRefuse(raisonMorceau)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {styles.length > 0 && (
                <div className="rc-fiche-styles">
                  <h3 className="rc-titre">{t.reconnaitreLeStyle}</h3>
                  <ol className="rc-styles">
                    {styles
                      .map((s) => {
                        const entree = styleDeLEtiquette(s.discogs);
                        const genre = entree?.sonaa ? genreSonaa(entree.sonaa) : null;
                        const famille = entree ? familleSonaa(entree) : null;
                        const f = !genre && famille ? FAMILIES.find((x) => x.id === famille) : null;
                        const cle = genre ? `g:${entree?.sonaa}` : f ? `f:${f.id}` : `d:${s.discogs}`;
                        const nom = genre ? genre.nom : f ? t.reconnaitreFamilleSeule(f.label) : s.nom;
                        const chemin = genre ? genre.chemin : f ? cheminDeLaFamille(f.id) : null;
                        return { cle, nom, chemin, score: s.score };
                      })
                      .filter((x, i, tous) => tous.findIndex((y) => y.cle === x.cle) === i)
                      .map((x) => {
                        const pourcent = `${Math.round(x.score * 100)} %`;
                        return (
                          <li key={x.cle} className="rc-style">
                            {x.chemin ? (
                              <a className="rc-style-nom" href={x.chemin}>
                                {x.nom}
                              </a>
                            ) : (
                              <span className="rc-style-nom rc-style-hors">
                                {x.nom} <span className="rc-hors-mot">{t.reconnaitreHorsAtlas}</span>
                              </span>
                            )}
                            <span className="rc-part" aria-hidden="true">
                              <span className="rc-part-pleine" style={{ width: pourcent }} />
                            </span>
                            <span className="rc-pourcent">
                              <span className="rc-pourcent-mot">{t.reconnaitreConfiance}</span> {pourcent}
                            </span>
                          </li>
                        );
                      })}
                  </ol>
                  <p className="rc-note">{t.reconnaitreImprecis}</p>
                </div>
              )}

              {/* DEUX GESTES APRES LE RESULTAT : ouvrir le style dans l'atlas,
                  ecouter le morceau sur YouTube. Le premier va au meilleur
                  style qui a une fiche ; le second cherche l'artiste et le
                  titre, parce qu'aucune adresse de video n'est connue ici. */}
              {(premierChemin || morceau) && (
                <p className="rc-gestes">
                  {premierChemin && (
                    <a className="rc-geste rc-geste-plein" href={premierChemin}>
                      {t.ouvrirLeStyle}
                    </a>
                  )}
                  {morceau && (
                    <a
                      className="rc-geste"
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${morceau.artiste} ${morceau.titre}`)}`}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {t.ecouterSurYoutube}
                    </a>
                  )}
                </p>
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
                      {r.styles.map((s) => nomAtlas(s.discogs)).join(', ')}
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

      </div>

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
            <div className="rc-modale-boutons">
              <button type="button" className="rc-refus" onClick={() => setEtat('repos')}>
                {t.consentementRefuser}
              </button>
              <button
                type="button"
                className="rc-accord"
                onClick={() => {
                  setMicroConsenti(true);
                  ecrireChoix(CLE_MICRO, true);
                  void lancer();
                }}
              >
                {t.consentementAccepter}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
