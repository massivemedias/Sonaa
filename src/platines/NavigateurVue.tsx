/* LE NAVIGATEUR DE MORCEAUX DES PLATINES.
 *
 * Mika, le 3 octobre 2026 : « pour l'instant, mixer des morceaux qui sont
 * dans un style de la liste des styles de sonaa.ca ; apres, pouvoir choisir
 * moi-meme la track ». Les deux sont la : un style de l'atlas donne ses
 * morceaux chez Audius (voir audius.ts), et une recherche libre trouve
 * n'importe quel morceau du catalogue.
 *
 * Il s'ouvre dans la platine dont on a presse la touche de chargement, et
 * charge sur elle.
 *
 * MES MORCEAUX, depuis le 3 octobre 2026 : Mika veut que chacun mixe ce
 * qu'il veut. Le second onglet montre la caisse de l'appareil (caisse.ts) ;
 * on y glisse ses fichiers, ou on les choisit, et ils restent la. */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { t } from '../langue/langue.ts';
import { chercherAudius } from './audius.ts';
import type { Morceau } from './morceau.ts';
import {
  FichierRefuse,
  ajouterFichier,
  dossierDuChemin,
  estUnSon,
  fichiersDuDepot,
  retirerDeCaisse,
  retirerDossier,
  type FichierRange,
} from './caisse.ts';
import { tempsAffiche, tonaliteCourte } from './calculs.ts';
import { STYLES, TOUS, VRAC, changerSelection, duDossier, useCaisse, useMorceauxDuStyle, useSelection } from './selection.ts';

/* L'iPhone et l'iPad n'ont pas de selecteur de dossier : on y nomme le
   dossier, puis on choisit ses morceaux dans Fichiers. */
const sansSelecteurDeDossier = (): boolean =>
  /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

interface Props {
  /** La platine qui recevra le morceau. */
  readonly cible: 0 | 1;
  readonly onChoisir: (m: Morceau, platine: 0 | 1) => void;
  readonly onFermer: () => void;
}

export function NavigateurVue({ cible, onChoisir, onFermer }: Props) {
  /* La source, le style et le dossier sont ceux de toute la page : les
     playlists des decks les suivent (voir selection.ts). */
  const { source, style, dossier: dossierOuvert } = useSelection();
  const caisse = useCaisse();
  const listeDuStyle = useMorceauxDuStyle(source === 'audius' ? style : null);
  const [requete, setRequete] = useState('');
  const [resultats, setResultats] = useState<readonly Morceau[] | null>(null);
  const cherche = requete.trim().length >= 2;
  const liste = cherche ? resultats : listeDuStyle;
  const [import_, setImport] = useState<{ fait: number; total: number } | null>(null);
  const [refus, setRefus] = useState<readonly string[]>([]);
  const [survol, setSurvol] = useState(false);
  const [nommer, setNommer] = useState<string | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const fichiersRef = useRef<HTMLInputElement | null>(null);
  const dossierRef = useRef<HTMLInputElement | null>(null);
  /* Le dossier ou iront les fichiers que l'on va choisir. */
  const destination = useRef<string>(VRAC);

  const ouvrirDossier = (d: string): void => {
    setConfirmer(false);
    changerSelection({ dossier: d });
  };
  const dossierCourant = dossierOuvert === TOUS ? VRAC : dossierOuvert;

  /* Les dossiers de la caisse, avec le nombre de morceaux de chacun. */
  const dossiers = useMemo(() => {
    const compte = new Map<string, number>();
    for (const m of caisse ?? []) compte.set(m.dossier ?? VRAC, (compte.get(m.dossier ?? VRAC) ?? 0) + 1);
    return [...compte.entries()].filter(([d]) => d !== VRAC).sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  }, [caisse]);
  const enVrac = (caisse ?? []).filter((m) => !m.dossier).length;
  const visibles = duDossier(caisse ?? [], dossierOuvert);

  /* Les fichiers entrent un par un : chacun est decode pour sa duree et son
     BPM, et deux decodages a la fois pesent trop sur un telephone. */
  const importer = async (fichiers: readonly FichierRange[]): Promise<void> => {
    const sons = fichiers.filter((x) => estUnSon(x.fichier));
    if (sons.length === 0) return;
    const refuses: string[] = [];
    for (let i = 0; i < sons.length; i += 1) {
      const x = sons[i];
      if (!x) continue;
      setImport({ fait: i + 1, total: sons.length });
      try {
        await ajouterFichier(x.fichier, x.dossier);
      } catch (e) {
        refuses.push(e instanceof FichierRefuse && e.raison === 'trop-long' ? t.caisseTropLong(x.fichier.name) : t.caisseIllisible(x.fichier.name));
      }
    }
    setImport(null);
    setRefus(refuses);
    /* Un dossier qu'on vient d'ajouter s'ouvre, pour voir ce qui est entre. */
    const premier = sons[0]?.dossier;
    if (premier) ouvrirDossier(premier);
  };

  const ajouterDossier = (): void => {
    if (sansSelecteurDeDossier()) setNommer('');
    else dossierRef.current?.click();
  };

  /* Une recherche libre attend que l'on cesse de taper. */
  useEffect(() => {
    if (!cherche) return;
    let vivant = true;
    setResultats(null);
    const attente = window.setTimeout(() => {
      chercherAudius(requete)
        .then((l) => {
          if (vivant) setResultats(l);
        })
        .catch(() => {
          if (vivant) setResultats([]);
        });
    }, 400);
    return () => {
      vivant = false;
      window.clearTimeout(attente);
    };
  }, [requete, cherche]);

  const choisirSource = (s: 'audius' | 'fichiers'): void => changerSelection({ source: s });

  const ligne = (m: Morceau, retirer: boolean): ReactNode => {
    const k = tonaliteCourte(m.tonalite);
    return (
      <li key={m.id} className="pl-morceau">
        {m.pochette ? <img src={m.pochette} alt="" loading="lazy" /> : <span className="pl-morceau-vide" />}
        <span className="pl-morceau-titres">
          <span className="pl-morceau-titre">{m.titre}</span>
          <span className="pl-morceau-artiste">{[m.artiste, m.label, m.genre].filter(Boolean).join(' · ')}</span>
        </span>
        <span className="pl-morceau-chiffres">
          <span>{m.bpm ? m.bpm.toFixed(0) : '--'}</span>
          <span>{k ? k.camelot : '--'}</span>
          <span>{tempsAffiche(m.duree).slice(0, 5)}</span>
        </span>
        <span className="pl-morceau-actions">
          <button type="button" aria-label={t.navigateurSurPlatine(cible === 0 ? 'A' : 'B')} onClick={() => onChoisir(m, cible)}>
            {cible === 0 ? 'A' : 'B'}
          </button>
          {retirer && (
            <button type="button" className="pl-morceau-retirer" aria-label={t.caisseRetirer(m.titre)} onClick={() => void retirerDeCaisse(m.id)}>
              ×
            </button>
          )}
        </span>
      </li>
    );
  };

  return (
    <section className="pl-navigateur" aria-label={t.navigateurTitre}>
      <div className="pl-navigateur-tete">
        <h2 className="pl-navigateur-titre">{t.navigateurTitre}</h2>
        <div className="pl-sources" role="group" aria-label={t.navigateurProvenance}>
          <button type="button" className="pl-touche" aria-pressed={source === 'audius'} onClick={() => choisirSource('audius')}>
            <span className="pl-touche-led" aria-hidden="true" />
            Audius
          </button>
          <button type="button" className="pl-touche" aria-pressed={source === 'fichiers'} onClick={() => choisirSource('fichiers')}>
            <span className="pl-touche-led" aria-hidden="true" />
            {t.navigateurMesMorceaux(caisse?.length ?? 0)}
          </button>
        </div>
        <button type="button" className="pl-navigateur-fermer" aria-label={t.navigateurFermer} onClick={onFermer}>
          ×
        </button>
      </div>

      {source === 'fichiers' ? (
        <>
          <div className="pl-caisse-actions">
            <button
              type="button"
              className="pl-ecran-touche"
              onClick={() => {
                destination.current = dossierCourant;
                fichiersRef.current?.click();
              }}
            >
              {t.caisseAjouterFichiers}
            </button>
            <button type="button" className="pl-ecran-touche" onClick={ajouterDossier}>
              {t.caisseAjouterDossier}
            </button>
            <input
              ref={fichiersRef}
              className="pl-cache"
              type="file"
              accept="audio/*,.mp3,.wav,.aif,.aiff,.flac,.m4a,.ogg"
              multiple
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const dossier = destination.current;
                void importer([...(e.currentTarget.files ?? [])].map((fichier) => ({ fichier, dossier })));
                e.currentTarget.value = '';
              }}
            />
            <input
              ref={(el) => {
                dossierRef.current = el;
                el?.setAttribute('webkitdirectory', '');
              }}
              className="pl-cache"
              type="file"
              multiple
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                void importer([...(e.currentTarget.files ?? [])].map((fichier) => ({ fichier, dossier: dossierDuChemin(fichier) })));
                e.currentTarget.value = '';
              }}
            />
          </div>

          {nommer !== null && (
            <form
              className="pl-caisse-nommer"
              onSubmit={(e) => {
                e.preventDefault();
                const nom = nommer.trim();
                if (!nom) return;
                destination.current = nom;
                setNommer(null);
                fichiersRef.current?.click();
              }}
            >
              <input
                value={nommer}
                onChange={(e) => setNommer(e.target.value)}
                placeholder={t.caisseNomDossier}
                aria-label={t.caisseNomDossier}
                maxLength={60}
                autoFocus
              />
              <button type="submit" className="pl-ecran-touche" disabled={!nommer.trim()}>
                {t.caisseChoisirMorceaux}
              </button>
              <button type="button" className="pl-ecran-touche" onClick={() => setNommer(null)}>
                {t.caisseAnnuler}
              </button>
              <p className="pl-navigateur-note">{t.caisseIphone}</p>
            </form>
          )}

          {dossiers.length > 0 && (
            <div className="pl-dossiers" role="group" aria-label={t.caisseDossiers}>
              <button type="button" className="pl-ecran-touche" aria-pressed={dossierOuvert === TOUS} onClick={() => ouvrirDossier(TOUS)}>
                {t.caisseTout(caisse?.length ?? 0)}
              </button>
              {dossiers.map(([nom, n]) => (
                <button key={nom} type="button" className="pl-ecran-touche" aria-pressed={dossierOuvert === nom} onClick={() => ouvrirDossier(nom)}>
                  {nom} · {n}
                </button>
              ))}
              {enVrac > 0 && (
                <button type="button" className="pl-ecran-touche" aria-pressed={dossierOuvert === VRAC} onClick={() => ouvrirDossier(VRAC)}>
                  {t.caisseEnVrac(enVrac)}
                </button>
              )}
            </div>
          )}

          <label
            className="pl-depot-zone"
            data-survol={survol}
            onDragOver={(e) => {
              if (![...e.dataTransfer.types].includes('Files')) return;
              e.preventDefault();
              setSurvol(true);
            }}
            onDragLeave={() => setSurvol(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSurvol(false);
              void fichiersDuDepot(e.dataTransfer.items, dossierCourant).then(importer);
            }}
          >
            <span className="pl-depot-titre">{t.caisseDeposer}</span>
            <span className="pl-depot-note">{t.caisseLocal}</span>
          </label>
          {import_ && (
            <p className="pl-navigateur-note pl-caisse-analyse" role="status">
              {t.caisseAnalyse(import_.fait, import_.total)}
            </p>
          )}
          {refus.length > 0 && (
            <ul className="pl-refus" role="status">
              {refus.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          {caisse === null ? null : visibles.length === 0 ? (
            <p className="pl-navigateur-note">{t.caisseVide}</p>
          ) : (
            <ul className="pl-morceaux">{visibles.map((m) => ligne(m, true))}</ul>
          )}
          {dossierOuvert !== TOUS && dossierOuvert !== VRAC && visibles.length > 0 && (
            <button
              type="button"
              className="pl-caisse-retirer"
              onClick={() => {
                if (!confirmer) {
                  setConfirmer(true);
                  window.setTimeout(() => setConfirmer(false), 4000);
                  return;
                }
                void retirerDossier(dossierOuvert).then(() => ouvrirDossier(TOUS));
              }}
            >
              {confirmer ? t.caisseConfirmer : t.caisseRetirerDossier(dossierOuvert)}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="pl-navigateur-filtres">
            <label className="pl-navigateur-style">
              <span>{t.navigateurStyle}</span>
              <select
                value={style}
                onChange={(e) => {
                  setRequete('');
                  changerSelection({ style: e.target.value });
                }}
              >
                {STYLES.map((s) => (
                  <optgroup key={s.famille.id} label={s.famille.label}>
                    {s.genres.map((g) => (
                      <option key={g.cle} value={g.cle}>
                        {g.nom}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <input
              className="pl-navigateur-chercher"
              type="search"
              value={requete}
              placeholder={t.navigateurChercher}
              aria-label={t.navigateurChercher}
              onChange={(e) => setRequete(e.target.value)}
            />
          </div>
          {liste === null ? (
            <p className="pl-navigateur-note">{t.navigateurCharge}</p>
          ) : liste.length === 0 ? (
            <p className="pl-navigateur-note">{t.navigateurVide}</p>
          ) : (
            <ul className="pl-morceaux">{liste.map((m) => ligne(m, false))}</ul>
          )}
          <p className="pl-navigateur-source">{t.navigateurSource}</p>
        </>
      )}
    </section>
  );
}
