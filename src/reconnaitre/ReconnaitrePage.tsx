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
import { capturer, NIVEAU_MINIMAL, SECONDES_CAPTURE } from './capture.ts';
import { chargerMoteur, POIDS_MODELE_MO, type Prediction } from './modele.ts';
import { familleSonaa, nomCourt, styleDeLEtiquette } from './discogs-vers-sonaa.ts';
import { ajouterAlHistorique, lireHistorique, viderHistorique, type Reconnaissance } from './historique.ts';
import type { MorceauReconnu } from './audd.ts';
import '../atlas/credits.css';
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
  const [envoiMorceau, setEnvoiMorceau] = useState<boolean>(() => lireChoix(CLE_ENVOI, true));
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
            {morceauActif && (
              <p className="rc-envoi">
                <span>
                  {t.reconnaitreEnvoiAvant}
                  <a href="https://audd.io" target="_blank" rel="noreferrer noopener">
                    AudD
                  </a>
                  {t.reconnaitreEnvoiApres}
                </span>
                <label className="rc-interrupteur">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={envoiMorceau}
                    onChange={(e) => {
                      setEnvoiMorceau(e.target.checked);
                      ecrireChoix(CLE_ENVOI, e.target.checked);
                    }}
                  />
                  <span>{t.reconnaitreEnvoiInterrupteur}</span>
                </label>
              </p>
            )}
          </div>

          {etat === 'erreur' && <p className="rc-erreur">{erreur}</p>}

          {styles.length > 0 && (
            <Apparition as="section" className="rc-bloc">
              <h2 className="rc-titre">{t.reconnaitreLeStyle}</h2>
              {/* UN CLASSEMENT, SANS CHIFFRES. Mika, le 22 septembre 2026, apres
                  l'audit : la sortie du reseau est une sigmoide par classe, pas
                  une part. « Techno 82 % » et « House 67 % » ne se partageaient
                  rien, et la jauge les presentait comme s'ils le faisaient. Le
                  premier est le plus probable, le troisieme le moins, c'est
                  tout ce que le reseau sait dire honnetement. */}
              {/* EN LANGUE SONAA, PAS EN LANGUE DISCOGS. Mika, le 23 septembre 2026 :
                  « t'es au courant que nous sommes dans SONAA la ? ». Le reseau
                  parle Discogs, « Deep Techno », « Neo Trance » ; la page parle
                  l'atlas : le genre SONAA quand la table en donne un, la famille
                  quand elle n'en donne pas, « hors atlas » pour ce qui n'est pas
                  electronique. Deux etiquettes qui menent au meme endroit ne
                  font qu'une ligne. */}
              <ol className="rc-styles">
                {styles
                  .map((s) => {
                    const entree = styleDeLEtiquette(s.discogs);
                    const genre = entree?.sonaa ? genreSonaa(entree.sonaa) : null;
                    const famille = entree ? familleSonaa(entree) : null;
                    if (genre) return { cle: `g:${entree?.sonaa}`, nom: genre.nom, chemin: genre.chemin, hors: false };
                    const f = famille ? FAMILIES.find((x) => x.id === famille) : null;
                    if (f) return { cle: `f:${f.id}`, nom: t.reconnaitreFamilleSeule(f.label), chemin: cheminDeLaFamille(f.id), hors: false };
                    return { cle: `d:${s.discogs}`, nom: s.nom, chemin: null, hors: true };
                  })
                  .filter((x, i, tous) => tous.findIndex((y) => y.cle === x.cle) === i)
                  .map((x) => (
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
                    </li>
                  ))}
              </ol>
              <p className="rc-note">{t.reconnaitreImprecis}</p>
            </Apparition>
          )}

          {etat === 'resultat' && morceauActif && envoiMorceau && (
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
                <>
                  <p className="rc-morceau-titre">{t.reconnaitreMorceauNonIdentifie}</p>
                  {/* JAMAIS DE SILENCE : « rien reconnu » et « le service refuse »
                      sont deux phrases differentes, et la seconde porte la
                      raison telle que le service la donne. */}
                  <p className="rc-note">
                    {raisonMorceau === 'aucun resultat' || raisonMorceau === ''
                      ? t.reconnaitreSansMorceau
                      : t.reconnaitreServiceRefuse(raisonMorceau)}
                  </p>
                </>
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
