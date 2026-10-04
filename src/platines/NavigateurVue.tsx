/* LE NAVIGATEUR DE MORCEAUX DES PLATINES.
 *
 * Mika, le 3 octobre 2026 : « pour l'instant, mixer des morceaux qui sont
 * dans un style de la liste des styles de sonaa.ca ; apres, pouvoir choisir
 * moi-meme la track ». Les deux sont la : un style de l'atlas donne ses
 * morceaux chez Audius (voir audius.ts), et une recherche libre trouve
 * n'importe quel morceau du catalogue.
 *
 * Sur ordinateur, chaque ligne porte deux boutons, A et B. Sur telephone,
 * le navigateur s'ouvre depuis une platine et charge sur elle.
 *
 * MES MORCEAUX, depuis le 3 octobre 2026 : Mika veut que chacun mixe ce
 * qu'il veut. Le second onglet montre la caisse de l'appareil (caisse.ts) ;
 * on y glisse ses fichiers, ou on les choisit, et ils restent la. */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FAMILIES, STRUCTURES } from '../atlas/structures.ts';
import { t } from '../langue/langue.ts';
import { chercherAudius, morceauxDuStyle } from './audius.ts';
import type { Morceau } from './morceau.ts';
import { FichierRefuse, ajouterFichier, ecouterCaisse, lireCaisse, retirerDeCaisse } from './caisse.ts';
import { tempsAffiche, tonaliteCourte } from './calculs.ts';

const CLE_STYLE = 'sonaa-platines-style';
const CLE_SOURCE = 'sonaa-platines-source';
type Source = 'audius' | 'fichiers';

function memoire<T extends string>(cle: string, defaut: T, permis: readonly T[]): T {
  try {
    const v = localStorage.getItem(cle) as T | null;
    return v && permis.includes(v) ? v : defaut;
  } catch {
    return defaut;
  }
}
function retenir(cle: string, v: string): void {
  try {
    localStorage.setItem(cle, v);
  } catch {
    /* rien a retenir */
  }
}

interface Props {
  /** Sur telephone : la platine qui recevra le morceau. */
  readonly cible: 0 | 1 | null;
  readonly onChoisir: (m: Morceau, platine: 0 | 1) => void;
  readonly onFermer?: () => void;
}

export function NavigateurVue({ cible, onChoisir, onFermer }: Props) {
  const styles = useMemo(
    () =>
      FAMILIES.map((f, fi) => ({
        famille: f,
        genres: (STRUCTURES[fi]?.genres ?? []).map((g) => ({ cle: `${f.id}/${g.id}`, famille: f.id, nom: g.label })),
      })),
    []
  );
  const [style, setStyle] = useState<string>(() => {
    try {
      return localStorage.getItem(CLE_STYLE) ?? 'house/usdeephouse';
    } catch {
      return 'house/usdeephouse';
    }
  });
  const [requete, setRequete] = useState('');
  const [liste, setListe] = useState<readonly Morceau[] | null>(null);
  const [source, setSource] = useState<Source>(() => memoire<Source>(CLE_SOURCE, 'audius', ['audius', 'fichiers']));
  const [caisse, setCaisse] = useState<readonly Morceau[] | null>(null);
  const [import_, setImport] = useState<{ fait: number; total: number } | null>(null);
  const [refus, setRefus] = useState<readonly string[]>([]);
  const [survol, setSurvol] = useState(false);

  useEffect(() => {
    let vivant = true;
    const relire = (): void => {
      lireCaisse()
        .then((l) => {
          if (vivant) setCaisse(l);
        })
        .catch(() => {
          if (vivant) setCaisse([]);
        });
    };
    relire();
    const arreter = ecouterCaisse(relire);
    return () => {
      vivant = false;
      arreter();
    };
  }, []);

  /* Les fichiers entrent un par un : chacun est decode pour sa duree et son
     BPM, et deux decodages a la fois pesent trop sur un telephone. */
  const importer = async (fichiers: readonly File[]): Promise<void> => {
    if (fichiers.length === 0) return;
    const refuses: string[] = [];
    for (let i = 0; i < fichiers.length; i += 1) {
      const f = fichiers[i];
      if (!f) continue;
      setImport({ fait: i + 1, total: fichiers.length });
      try {
        await ajouterFichier(f);
      } catch (e) {
        refuses.push(e instanceof FichierRefuse && e.raison === 'trop-long' ? t.caisseTropLong(f.name) : t.caisseIllisible(f.name));
      }
    }
    setImport(null);
    setRefus(refuses);
  };

  useEffect(() => {
    let vivant = true;
    setListe(null);
    const attente = window.setTimeout(
      () => {
        const choisi = styles.flatMap((s) => s.genres).find((g) => g.cle === style);
        const recherche = requete.trim().length >= 2 ? chercherAudius(requete) : choisi ? morceauxDuStyle(choisi.famille, choisi.nom) : Promise.resolve([]);
        recherche
          .then((l) => {
            if (vivant) setListe(l);
          })
          .catch(() => {
            if (vivant) setListe([]);
          });
      },
      requete ? 400 : 0
    );
    return () => {
      vivant = false;
      window.clearTimeout(attente);
    };
  }, [style, requete, styles]);

  const choisirSource = (s: Source): void => {
    setSource(s);
    retenir(CLE_SOURCE, s);
  };

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
          {cible === null ? (
            <>
              <button type="button" aria-label={t.navigateurSurPlatine('A')} onClick={() => onChoisir(m, 0)}>
                A
              </button>
              <button type="button" aria-label={t.navigateurSurPlatine('B')} onClick={() => onChoisir(m, 1)}>
                B
              </button>
            </>
          ) : (
            <button type="button" aria-label={t.navigateurSurPlatine(cible === 0 ? 'A' : 'B')} onClick={() => onChoisir(m, cible)}>
              {cible === 0 ? 'A' : 'B'}
            </button>
          )}
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
        <h2 className="pl-navigateur-titre">
          {t.navigateurTitre}
          {cible !== null ? ` · ${t.platineNom(cible === 0 ? 'A' : 'B')}` : ''}
        </h2>
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
        {onFermer && (
          <button type="button" className="pl-navigateur-fermer" onClick={onFermer}>
            {t.navigateurFermer}
          </button>
        )}
      </div>

      {source === 'fichiers' ? (
        <>
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
              void importer([...e.dataTransfer.files]);
            }}
          >
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.aif,.aiff,.flac,.m4a,.ogg"
              multiple
              onChange={(e) => {
                void importer([...(e.currentTarget.files ?? [])]);
                e.currentTarget.value = '';
              }}
            />
            <span className="pl-depot-titre">{import_ ? t.caisseAnalyse(import_.fait, import_.total) : t.caisseDeposer}</span>
            <span className="pl-depot-note">{t.caisseLocal}</span>
          </label>
          {refus.length > 0 && (
            <ul className="pl-refus" role="status">
              {refus.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          {caisse === null ? null : caisse.length === 0 ? (
            <p className="pl-navigateur-note">{t.caisseVide}</p>
          ) : (
            <ul className="pl-morceaux">{caisse.map((m) => ligne(m, true))}</ul>
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
                  setStyle(e.target.value);
                  setRequete('');
                  retenir(CLE_STYLE, e.target.value);
                }}
              >
                {styles.map((s) => (
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
