/* LE SELECTEUR DE VILLE. Un seul, pour le calendrier et pour le profil.
 *
 * ═══ POURQUOI UN SEUL ═══
 *
 * Les deux endroits posent la meme question et ne font pas la meme chose de
 * la reponse : le calendrier ecrit en local et dans l'adresse, le profil
 * ecrit en base. La QUESTION est identique, la CONSEQUENCE ne l'est pas. Le
 * composant pose donc la question et rend le choix ; ce qu'on en fait
 * appartient a l'appelant. Deux selecteurs auraient diverge en un mois, comme
 * les deux en-tetes du site avaient diverge.
 *
 * ═══ C'EST UN COMBOBOX, PAS UN CHAMP AVEC UNE LISTE EN DESSOUS ═══
 *
 * La difference se voit au clavier. Un champ suivi d'une liste de boutons
 * oblige a passer par la tabulation dans chaque resultat pour atteindre le
 * suivant ; un combobox se parcourt aux fleches sans quitter le champ, ce qui
 * est le geste qu'on fait sans y penser. Les attributs ARIA ne sont pas une
 * decoration : sans `aria-activedescendant`, un lecteur d'ecran annonce le
 * champ et se tait pendant qu'on parcourt les propositions.
 *
 * Fleches pour parcourir, Entree pour choisir, Echap pour refermer sans
 * choisir. Echap referme d'abord la liste, et seulement au second appui rend
 * la main a l'appelant : refermer et annuler d'un seul geste surprend.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  CARACTERES_MIN,
  chercherVilles,
  situer,
  type Ville,
} from '../lib/ville-active.ts';
import './selecteur-ville.css';

/* DEBOUNCE. La liste des villes est deja en memoire, donc filtrer ne coute
   rien ; ce qu'on evite, c'est de REANNONCER la liste a chaque frappe pour
   qui ecoute la page. 250 ms est le delai ou l'on cesse de taper sans avoir
   l'impression d'attendre. */
const ATTENTE_MS = 250;

interface Props {
  readonly villes: readonly Ville[];
  readonly choisie: Ville | null;
  readonly onChoisir: (v: Ville) => void;
  /** Rendu sous le champ. Sert au profil, qui y met le bouton d'effacement. */
  readonly enDessous?: React.ReactNode;
  readonly etiquette: string;
  readonly autoFocus?: boolean;
}

export function SelecteurVille({
  villes,
  choisie,
  onChoisir,
  enDessous,
  etiquette,
  autoFocus,
}: Props) {
  const [terme, setTerme] = useState('');
  const [termeRetarde, setTermeRetarde] = useState('');
  const [surligne, setSurligne] = useState(0);
  const [ouvert, setOuvert] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const idListe = useId();
  const idChamp = useId();

  useEffect(() => {
    const t = setTimeout(() => setTermeRetarde(terme), ATTENTE_MS);
    return () => clearTimeout(t);
  }, [terme]);

  const resultats = useMemo(
    () => chercherVilles(termeRetarde, villes),
    [termeRetarde, villes]
  );

  /* Le surlignage revient en tete a chaque nouvelle recherche : garder la
     cinquieme ligne surlignee alors que la liste a change designe une ville
     qu'on n'a pas regardee. */
  useEffect(() => setSurligne(0), [termeRetarde]);

  const choisir = useCallback(
    (v: Ville) => {
      onChoisir(v);
      setTerme('');
      setTermeRetarde('');
      setOuvert(false);
    },
    [onChoisir]
  );

  const auClavier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (resultats.length === 0) return;
      e.preventDefault();
      setOuvert(true);
      setSurligne((i) => {
        const n = resultats.length;
        return e.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n;
      });
      return;
    }
    if (e.key === 'Enter') {
      const v = resultats[surligne];
      if (v) {
        e.preventDefault();
        choisir(v);
      }
      return;
    }
    if (e.key === 'Escape') {
      /* Premier appui : on referme la liste. Second : on vide le champ. */
      e.preventDefault();
      if (ouvert && resultats.length > 0) setOuvert(false);
      else setTerme('');
    }
  };

  const listeVisible = ouvert && resultats.length > 0;
  const idOption = (i: number) => `${idListe}-${i}`;

  return (
    <div className="sv">
      <label className="sv-etiquette" htmlFor={idChamp}>
        {etiquette}
      </label>

      <div
        className="sv-combo"
        role="combobox"
        aria-expanded={listeVisible}
        aria-owns={idListe}
        aria-haspopup="listbox"
      >
        <input
          id={idChamp}
          ref={champ}
          className="sv-champ"
          type="text"
          role="searchbox"
          autoComplete="off"
          spellCheck={false}
          aria-controls={idListe}
          aria-autocomplete="list"
          aria-activedescendant={listeVisible ? idOption(surligne) : undefined}
          placeholder={choisie ? choisie.name : 'Chercher une ville'}
          value={terme}
          autoFocus={autoFocus ?? false}
          onChange={(e) => {
            setTerme(e.target.value);
            setOuvert(true);
          }}
          onFocus={() => setOuvert(true)}
          /* Le flou ferme la liste, mais APRES le clic : sans ce delai, le
             clic sur une proposition serait annule par la fermeture avant
             d'avoir declenche quoi que ce soit. Defaut classique, corrige
             une fois pour toutes ici. */
          onBlur={() => setTimeout(() => setOuvert(false), 150)}
          onKeyDown={auClavier}
        />
      </div>

      {/* La liste existe toujours dans l'arbre, meme vide : un lecteur
          d'ecran annonce alors « aucun resultat » plutot que le silence. */}
      <ul className="sv-liste" id={idListe} role="listbox" aria-label={etiquette} hidden={!listeVisible}>
        {resultats.map((v, i) => (
          <li
            key={v.id}
            id={idOption(i)}
            role="option"
            aria-selected={i === surligne}
            className={`sv-option${i === surligne ? ' sv-option-surlignee' : ''}`}
            /* `mousedown` et non `click` : le flou du champ part avant le
               clic, et c'est la raison du delai ci-dessus. Les deux ensemble
               rendent le clic fiable. */
            onMouseDown={(e) => {
              e.preventDefault();
              choisir(v);
            }}
            onMouseEnter={() => setSurligne(i)}
          >
            <span className="sv-nom">{v.name}</span>
            <span className="sv-situation">{situer(v)}</span>
          </li>
        ))}
      </ul>

      {termeRetarde.trim().length >= CARACTERES_MIN && resultats.length === 0 && (
        <p className="sv-rien" role="status">
          Aucune ville de ce nom. SONAA en connait {villes.length} pour le moment.
        </p>
      )}

      {enDessous}
    </div>
  );
}
