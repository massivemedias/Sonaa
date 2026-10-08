/* RECONNAITRE : ce qui passe en soiree, a la radio, dans la piece.
 *
 * LE COMPOSANT VIT A DEUX ENDROITS : la page /reconnaitre/, et l'accueil,
 * ou il s'ouvre DANS la page sous le bouton depuis le 30 septembre 2026.
 * Il s'ouvrait en surcouche plein ecran ; Mika : « quand on clique on ne
 * voit plus rien d'autre, je trouve ca dommage ». Meme code, meme micro,
 * meme resultat.
 *
 * UN CLIC SUR LA QUESTION LANCE L'ECOUTE. Le bouton de l'accueil et le lien
 * du menu (#/reconnaitre/ecouter) demandent `demarrer` : on ne fait pas
 * cliquer deux fois quelqu'un qui a deja dit ce qu'il voulait.
 *
 * UN SEUL RESULTAT : LE MORCEAU. Il passe par AudD, qui se paie, et la
 * route de la passerelle repond 503 quand la cle n'est pas posee ; la page
 * le dit alors en une phrase.
 *
 * LE STYLE N'EST PLUS DEVINE, depuis le 8 octobre 2026. Un reseau de
 * neurones de 43 Mo tournait dans le navigateur pour nommer le style a
 * l'oreille, puis les etiquettes de Discogs, Apple et Last.fm le
 * completaient. Mika : « c'est vraiment trop complexe et ca sert a rien ».
 * Track ID nomme le morceau, son artiste et son label, et s'arrete la.
 *
 * LA MODALE DE CONSENTEMENT N'EST PAS UNE FORMALITE. La loi 25 demande un
 * consentement libre et eclaire. La fenetre dit ce qui se passe, le micro
 * ouvert dix secondes et huit secondes envoyees a AudD, et ne se montre
 * qu'une fois. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { faMicrophone } from '@fortawesome/free-solid-svg-icons';
import { langue, t } from '../langue/langue.ts';
import { FaIcon } from '../atlas/FaIcon.tsx';
import { useSession } from '../lib/useSession.ts';
import { Apparition } from '../design/mouvement.tsx';
import { capturer, NIVEAU_MINIMAL, SECONDES_CAPTURE } from './capture.ts';
import { ajouterAlHistorique, lireHistorique, viderHistorique, type Reconnaissance } from './historique.ts';
import { ajouterEcouteAuCompte, fusionner, lireEcoutesDuCompte, viderEcoutesDuCompte } from './ecoutes-compte.ts';
import type { MorceauReconnu } from './audd.ts';
import './reconnaitre.css';

const PASSERELLE = 'https://sonaa-sets.massivemedias.workers.dev';
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

type Etat = 'repos' | 'consentement' | 'ecoute' | 'analyse' | 'resultat' | 'erreur';


/** « 6:55 » depuis des secondes. */
function mmss(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = Math.round(secondes % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* LA DATE D'UNE ECOUTE, courte : « mar. 30 sept., 21 h 14 ». */
const FORMAT_QUAND = new Intl.DateTimeFormat(langue === 'fr' ? 'fr-CA' : 'en-CA', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

interface Props {
  /** Vrai sur l'accueil : la question est deja ecrite sur le bouton qui
      ouvre, le composant ne la repete pas et ne touche pas au titre de
      l'onglet. */
  readonly enLigne?: boolean;
  /** Lance l'ecoute des l'ouverture (ou la demande d'accord, la premiere
      fois). */
  readonly demarrer?: boolean;
  /** Fait defiler jusqu'a l'historique a l'ouverture : l'entree « Mes
      ecoutes » du menu du compte. */
  readonly versHistorique?: boolean;
}

export function Reconnaissance({ enLigne = false, demarrer = false, versHistorique = false }: Props) {
  const [etat, setEtat] = useState<Etat>('repos');
  const [seconde, setSeconde] = useState(0);
  const [morceau, setMorceau] = useState<MorceauReconnu | null>(null);
  /* POURQUOI IL N'Y A PAS DE MORCEAU. Mesure le 22 septembre 2026 : la route
     repondait `null` sans distinguer « AudD n'a rien reconnu » de « AudD
     refuse, quota atteint », et la page se taisait dans les deux cas. */
  const [raisonMorceau, setRaisonMorceau] = useState<string>('');
  const [erreur, setErreur] = useState<string>('');
  /* LES DEUX MEMOIRES : celle du navigateur, toujours, et celle du compte
     quand on est connecte. Voir ecoutes-compte.ts. */
  const [local, setLocal] = useState<readonly Reconnaissance[]>([]);
  const [duCompte, setDuCompte] = useState<readonly Reconnaissance[]>([]);
  const historique = useMemo(() => fusionner(duCompte, local), [duCompte, local]);
  const { session } = useSession();
  const compte = session?.user.id ?? null;
  const [morceauActif, setMorceauActif] = useState(false);
  /* LA SONDE PEUT REPONDRE APRES LE CLIC : l'ecoute lancee des l'ouverture
     part avant elle. Le resultat est donc lu dans une reference au moment
     d'envoyer, dix secondes plus tard, et non fige dans la fonction. */
  const morceauActifRef = useRef(false);
  /* LE CLIC VAUT CONSENTEMENT. Mika, le 23 septembre 2026 : « plus aucune
     case a cocher ». La fenetre ne demande que le micro, une fois, et s'en
     souvient dans localStorage. */
  const [microConsenti, setMicroConsenti] = useState<boolean>(() => lireChoix(CLE_MICRO, false));
  const vivant = useRef(true);

  useEffect(() => {
    if (!enLigne) document.title = `${t.trackId} · SONAA`;
    setLocal(lireHistorique());
    return () => {
      vivant.current = false;
    };
  }, [enLigne]);

  useEffect(() => {
    let annule = false;
    setDuCompte([]);
    if (!compte) return;
    void lireEcoutesDuCompte().then((lues) => {
      if (!annule && lues) setDuCompte(lues);
    });
    return () => {
      annule = true;
    };
  }, [compte]);

  const blocHistorique = useRef<HTMLElement>(null);
  useEffect(() => {
    if (versHistorique) blocHistorique.current?.scrollIntoView({ block: 'start' });
  }, [versHistorique]);

  /* LA ROUTE DU MORCEAU EST INTERROGEE UNE FOIS, A L'OUVERTURE. Sans cle,
     elle repond `disponible: false` et la page le dira apres l'ecoute.
     
     ON LA LIT, ON NE LUI ENVOIE PLUS RIEN. Cette sonde postait un corps
     vide et lisait le code de retour, ce qui ecrivait une erreur 400 dans
     la console de chaque visiteur a chaque ouverture de la page. Une
     question de disponibilite est une lecture. Voir worker/src/index.ts. */
  useEffect(() => {
    let annule = false;
    void fetch(`${PASSERELLE}/api/reconnaitre-track`)
      .then((r) => (r.ok ? r.json() : { disponible: false }))
      .then((d: { disponible?: boolean }) => {
        morceauActifRef.current = d.disponible === true;
        if (!annule) setMorceauActif(d.disponible === true);
      })
      .catch(() => {
        morceauActifRef.current = false;
        if (!annule) setMorceauActif(false);
      });
    return () => {
      annule = true;
    };
  }, []);

  const lancer = useCallback(async () => {
    setErreur('');
    setMorceau(null);
    try {
      setEtat('ecoute');
      setSeconde(0);
      const capture = await capturer((s) => setSeconde(s));

      /* SON TROP FAIBLE : ON LE DIT, ON N'ENVOIE RIEN. Un micro coupe ou une
         piece silencieuse ne meritent pas un appel paye. Voir NIVEAU_MINIMAL. */
      if (capture.niveau < NIVEAU_MINIMAL) {
        setErreur(t.reconnaitreSonTropFaible);
        setEtat('erreur');
        return;
      }

      setEtat('analyse');
      let reconnu: MorceauReconnu | null = null;
      let raison = '';
      if (morceauActifRef.current) {
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
            (window as unknown as { __sonaaReco?: Record<string, unknown> }).__sonaaReco = { morceau: { statut: r.status, corps: lu } };
          }
        } catch (e) {
          raison = e instanceof Error ? e.message : String(e);
        }
      } else {
        raison = 'indisponible';
      }
      setMorceau(reconnu);
      setRaisonMorceau(raison);
      setEtat('resultat');

      /* L'HISTORIQUE NE GARDE QUE CE QUI A UN NOM : une ecoute sans morceau
         ne dit plus rien depuis que le style n'est plus devine. Le champ
         `styles` reste, vide, pour la forme que lisent le compte et les
         anciennes ecoutes. */
      if (!reconnu) return;
      const ecoute: Reconnaissance = {
        quand: Date.now(),
        styles: [],
        artiste: reconnu.artiste,
        titre: reconnu.titre,
        ...(reconnu.pochette ? { pochette: reconnu.pochette } : {}),
      };
      /* CONNECTE, L'ECOUTE VA AU COMPTE ; si la base refuse, le navigateur
         la garde, pour qu'elle ne se perde pas. */
      if (compte) {
        setDuCompte((avant) => [ecoute, ...avant]);
        void ajouterEcouteAuCompte(ecoute).then((ok) => {
          if (!ok) setLocal(ajouterAlHistorique(ecoute));
        });
      } else {
        setLocal(ajouterAlHistorique(ecoute));
      }
    } catch (e) {
      const nom = e instanceof Error ? e.name : '';
      setErreur(nom === 'NotAllowedError' || nom === 'NotFoundError' ? t.reconnaitreErreurMicro : t.reconnaitreIndisponible);
      setEtat('erreur');
    }
  }, [compte]);

  /* L'OUVERTURE QUI LANCE L'ECOUTE. Une seule fois, meme si React rejoue
     l'effet en developpement. */
  const demarre = useRef(false);
  useEffect(() => {
    if (!demarrer || demarre.current) return;
    demarre.current = true;
    if (microConsenti) void lancer();
    else setEtat('consentement');
  }, [demarrer, microConsenti, lancer]);

  const enMarche = etat === 'ecoute' || etat === 'analyse';

  const libelleBouton = useMemo(() => {
    if (etat === 'ecoute') return t.reconnaitreEnEcoute(seconde);
    if (etat === 'analyse') return t.reconnaitreAnalyse;
    if (etat === 'resultat' || etat === 'erreur') return t.reconnaitreRelancer;
    return t.reconnaitreEcouter;
  }, [etat, seconde]);

  /* LES ECOUTES QUI ONT UN NOM. Les anciennes, gardees du temps ou le style
     se devinait sans morceau, n'ont plus rien a montrer. */
  const nommees = useMemo(() => historique.filter((r) => r.titre), [historique]);

  return (
    <>
      <div className={enLigne ? 'rc rc-en-ligne' : 'rc'}>
        {!enLigne && (
          <header className="credits-head">
            <h1>{t.trackId}</h1>
            <p className="credits-lede">{t.reconnaitreChapeau}</p>
          </header>
        )}

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
            {/* L'ENVOI A AUDD EST ECRIT, ET NE SE VOIT PAS. Mika, le 30
                septembre 2026 : « cache-le mais laisse-le ecrit, ca ne doit
                pas se voir ». La phrase reste dans la page, lue par les
                lecteurs d'ecran ; la feuille la retire de l'ecran (voir
                reconnaitre.css). L'envoi est aussi dit dans la fenetre du
                micro et sur la page de confidentialite. */}
            {morceauActif && (
              <p className="rc-envoi">
                {t.reconnaitreEnvoiAvant}
                <a href="https://audd.io" target="_blank" rel="noreferrer noopener" tabIndex={-1}>
                  AudD
                </a>
                {t.reconnaitreEnvoiApres}
              </p>
            )}
          </div>

          {etat === 'erreur' && <p className="rc-erreur">{erreur}</p>}

          {/* ═══ LA FICHE DU RESULTAT, EN GRAND ═══
              Mika, le 27 septembre 2026 : « en desktop c'est pas beau, je veux
              quelque chose qui prenne de la place ». Une seule carte : la
              pochette a gauche, le morceau a droite avec ses faits (album,
              label, annee, duree, position de l'extrait) et ses liens. */}
          {etat === 'resultat' && (
            <Apparition as="section" className="rc-bloc rc-resultat">
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
                        {raisonMorceau === 'indisponible'
                          ? t.reconnaitreIndisponible
                          : raisonMorceau === 'aucun resultat' || raisonMorceau === ''
                            ? t.reconnaitreSansMorceau
                            : t.reconnaitreServiceRefuse(raisonMorceau)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* ECOUTER LE MORCEAU SUR YOUTUBE : une recherche par artiste et
                  titre, parce qu'aucune adresse de video n'est connue ici. */}
              {morceau && (
                <p className="rc-gestes">
                  <a
                    className="rc-geste rc-geste-plein"
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${morceau.artiste} ${morceau.titre}`)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {t.ecouterSurYoutube}
                  </a>
                </p>
              )}
            </Apparition>
          )}

          {/* ═══ L'HISTORIQUE ═══ Connecte, il vient du compte et suit d'un
              appareil a l'autre ; sinon du navigateur. Chaque ecoute porte
              sa pochette, le morceau et le moment : c'est ce qu'on cherche
              le lendemain d'une soiree. */}
          <section className="rc-bloc rc-ecoutes" id="ecoutes" ref={blocHistorique}>
            <h2 className="rc-titre">
              {t.reconnaitreHistorique}
              {nommees.length > 0 && (
                <button
                  type="button"
                  className="rc-effacer"
                  onClick={() => {
                    setLocal(viderHistorique());
                    setDuCompte([]);
                    if (compte) void viderEcoutesDuCompte(compte);
                  }}
                >
                  {t.reconnaitreEffacer}
                </button>
              )}
            </h2>
            {compte && <p className="rc-note rc-compte">{t.reconnaitreDansLeCompte}</p>}
            {nommees.length === 0 ? (
              <p className="rc-note">{t.reconnaitreAucunHistorique}</p>
            ) : (
              <ul className="rc-historique">
                {nommees.map((r) => (
                  <li key={r.quand} className="rc-passe">
                    <span className="rc-passe-pochette" aria-hidden="true">
                      {r.pochette ? (
                        <img src={r.pochette} alt="" loading="lazy" />
                      ) : (
                        <FaIcon icon={faMicrophone} className="rc-passe-micro" />
                      )}
                    </span>
                    <span className="rc-passe-texte">
                      <span className="rc-passe-titre">{r.titre}</span>
                      <span className="rc-passe-artiste">{r.artiste}</span>
                      <time className="rc-passe-quand" dateTime={new Date(r.quand).toISOString()}>
                        {FORMAT_QUAND.format(r.quand)}
                      </time>
                    </span>
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
