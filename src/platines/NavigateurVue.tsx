/* LE NAVIGATEUR DE MORCEAUX DES PLATINES.
 *
 * Mika, le 3 octobre 2026 : « pour l'instant, mixer des morceaux qui sont
 * dans un style de la liste des styles de sonaa.ca ; apres, pouvoir choisir
 * moi-meme la track ». Les deux sont la : un style de l'atlas donne ses
 * morceaux chez Audius (voir audius.ts), et une recherche libre trouve
 * n'importe quel morceau du catalogue.
 *
 * Sur ordinateur, chaque ligne porte deux boutons, A et B. Sur telephone,
 * le navigateur s'ouvre depuis une platine et charge sur elle. */

import { useEffect, useMemo, useState } from 'react';
import { FAMILIES, STRUCTURES } from '../atlas/structures.ts';
import { t } from '../langue/langue.ts';
import { chercherAudius, morceauxDuStyle, type MorceauAudius } from './audius.ts';
import { tempsAffiche, tonaliteCourte } from './calculs.ts';

const CLE_STYLE = 'sonaa-platines-style';

interface Props {
  /** Sur telephone : la platine qui recevra le morceau. */
  readonly cible: 0 | 1 | null;
  readonly onChoisir: (m: MorceauAudius, platine: 0 | 1) => void;
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
  const [liste, setListe] = useState<readonly MorceauAudius[] | null>(null);

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

  return (
    <section className="pl-navigateur" aria-label={t.navigateurTitre}>
      <div className="pl-navigateur-tete">
        <h2 className="pl-navigateur-titre">
          {t.navigateurTitre}
          {cible !== null ? ` · ${t.platineNom(cible === 0 ? 'A' : 'B')}` : ''}
        </h2>
        <label className="pl-navigateur-style">
          <span>{t.navigateurStyle}</span>
          <select
            value={style}
            onChange={(e) => {
              setStyle(e.target.value);
              setRequete('');
              try {
                localStorage.setItem(CLE_STYLE, e.target.value);
              } catch {
                /* rien a retenir */
              }
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
        {onFermer && (
          <button type="button" className="pl-navigateur-fermer" onClick={onFermer}>
            {t.navigateurFermer}
          </button>
        )}
      </div>

      {liste === null ? (
        <p className="pl-navigateur-note">{t.navigateurCharge}</p>
      ) : liste.length === 0 ? (
        <p className="pl-navigateur-note">{t.navigateurVide}</p>
      ) : (
        <ul className="pl-morceaux">
          {liste.map((m) => {
            const k = tonaliteCourte(m.tonalite);
            return (
              <li key={m.id} className="pl-morceau">
                {m.pochette ? <img src={m.pochette} alt="" loading="lazy" /> : <span className="pl-morceau-vide" />}
                <span className="pl-morceau-titres">
                  <span className="pl-morceau-titre">{m.titre}</span>
                  <span className="pl-morceau-artiste">
                    {m.artiste} · {m.genre}
                  </span>
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
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="pl-navigateur-source">{t.navigateurSource}</p>
    </section>
  );
}
