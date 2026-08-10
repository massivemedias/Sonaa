/* La modale de contribution : proposer une track, signaler une correction,
   donner son avis sur une filiation.

   Un seul composant pour les trois, parce que le squelette est identique —
   en-tête, corps, justification, envoi — et que trois modales presque
   semblables divergeraient au premier correctif.

   La connexion est intégrée : si personne n'est connecté, la modale demande
   une adresse et envoie un lien magique, en gardant le brouillon de côté.
   Le formulaire n'est jamais perdu, c'est une exigence directe du quota
   d'envoi de courriels (voir lib/auth.ts). */

import { useEffect, useMemo, useRef, useState } from 'react';
import { FAMILIES, STRUCTURES } from './structures.ts';
import {
  CHAMPS_EDITABLES,
  JUSTIFICATION_MAX,
  JUSTIFICATION_MIN,
  LIBELLE_CHAMP,
  proposer,
  valider,
  type Brouillon,
  type ChampEditable,
  type ProposalKind,
} from '../lib/proposals.ts';
import { envoyerLienMagique, memoriserIntention } from '../lib/auth.ts';
import { useSession } from '../lib/useSession.ts';
import './contribute.css';

interface Props {
  readonly kind: ProposalKind;
  readonly genreId: string;
  readonly genreLabel: string;
  /** Pré-remplissage venu d'une reprise après connexion. */
  readonly brouillonInitial?: Brouillon;
  readonly onClose: () => void;
  readonly onEnvoye?: () => void;
}

const TITRES: Record<ProposalKind, string> = {
  track: 'Proposer une track',
  genre_edit: 'Signaler une correction',
  filiation: 'Donner son avis sur cette filiation',
};

const INTRODUCTIONS: Record<ProposalKind, string> = {
  track:
    "Une track qui manque à ce genre. Dites d'où vous la tenez : c'est la justification " +
    'qui permet de trancher, pas le titre.',
  genre_edit:
    'Une erreur ou un manque dans la fiche. Indiquez ce qui devrait être écrit à la place.',
  filiation:
    'Vous pensez que ce genre descend d’ailleurs. Nommez le genre parent que vous défendez ' +
    'et dites sur quoi vous vous appuyez.',
};

export function ContributeDialog({
  kind,
  genreId,
  genreLabel,
  brouillonInitial,
  onClose,
  onEnvoye,
}: Props) {
  const { session, chargement } = useSession();
  const connecte = session !== null;

  const initial = brouillonInitial && brouillonInitial.kind === kind ? brouillonInitial : undefined;

  const [artist, setArtist] = useState(initial?.kind === 'track' ? initial.artist : '');
  const [title, setTitle] = useState(initial?.kind === 'track' ? initial.title : '');
  const [url, setUrl] = useState(initial?.kind === 'track' ? initial.url : '');
  const [field, setField] = useState<ChampEditable>(
    initial?.kind === 'genre_edit' ? initial.field : 'description'
  );
  const [value, setValue] = useState(initial?.kind === 'genre_edit' ? initial.value : '');
  const [parentId, setParentId] = useState(initial?.kind === 'filiation' ? initial.parentId : '');
  const [justification, setJustification] = useState(initial?.justification ?? '');

  const [email, setEmail] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lienEnvoye, setLienEnvoye] = useState(false);
  const [succes, setSucces] = useState(false);

  const boiteRef = useRef<HTMLDivElement>(null);
  const premierChampRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  /* Échap ferme, et le focus reste dans la modale tant qu'elle est ouverte :
     une modale qu'on peut quitter au clavier sans s'en apercevoir est une
     modale qui piège les personnes qui ne voient pas l'écran. */
  useEffect(() => {
    premierChampRef.current?.focus();
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !boiteRef.current) return;
      const focusables = boiteRef.current.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, a[href]'
      );
      if (focusables.length === 0) return;
      const premier = focusables[0];
      const dernier = focusables[focusables.length - 1];
      if (!premier || !dernier) return;
      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    };
    document.addEventListener('keydown', auClavier, true);
    return () => document.removeEventListener('keydown', auClavier, true);
  }, [onClose]);

  const brouillon = useMemo<Brouillon>(() => {
    if (kind === 'track') return { kind: 'track', genreId, artist, title, url, justification };
    if (kind === 'genre_edit') return { kind: 'genre_edit', genreId, field, value, justification };
    return { kind: 'filiation', genreId, parentId, justification };
  }, [kind, genreId, artist, title, url, field, value, parentId, justification]);

  const restant = JUSTIFICATION_MIN - justification.trim().length;

  async function envoyerLaProposition() {
    setErreur(null);
    const probleme = valider(brouillon);
    if (probleme) {
      setErreur(probleme);
      return;
    }
    setEnvoiEnCours(true);
    try {
      await proposer(brouillon);
      setSucces(true);
      onEnvoye?.();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function demanderLeLien() {
    setErreur(null);
    /* Le brouillon part avant le courriel : si l'envoi réussit, la personne
       quitte la page pour aller relever sa boîte, et ce qu'elle a écrit doit
       l'attendre à son retour. */
    memoriserIntention({ route: '#/propositions', brouillon });
    setEnvoiEnCours(true);
    const resultat = await envoyerLienMagique(email);
    setEnvoiEnCours(false);
    if (resultat.ok) {
      setLienEnvoye(true);
    } else {
      setErreur(resultat.message);
    }
  }

  return (
    <div className="contrib-fond" role="presentation" onClick={onClose}>
      <div
        className="contrib-boite"
        ref={boiteRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contrib-titre"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="contrib-tete">
          <h2 id="contrib-titre">{TITRES[kind]}</h2>
          <p className="contrib-genre">{genreLabel}</p>
        </header>

        {succes ? (
          <div className="contrib-corps">
            <p className="contrib-succes">
              Proposition enregistrée. Elle apparaît dès maintenant dans{' '}
              <a href="#/propositions">les propositions en attente</a>, où elle peut être
              soutenue ou contestée avant d&apos;être tranchée.
            </p>
            <p className="contrib-note">
              Une proposition acceptée n&apos;entre pas automatiquement dans l&apos;atlas : elle
              est reportée à la main dans le corpus, avec ses sources.
            </p>
            <div className="contrib-pied">
              <button className="contrib-primaire" onClick={onClose}>
                Fermer
              </button>
            </div>
          </div>
        ) : lienEnvoye ? (
          <div className="contrib-corps">
            <p className="contrib-succes">
              Un lien de connexion vient de partir vers <strong>{email}</strong>.
            </p>
            <p className="contrib-note">
              Ouvrez-le sur cet appareil : vous reviendrez sur SONAA avec votre brouillon intact,
              prêt à être envoyé. Le lien ne sert qu&apos;une fois.
            </p>
            <div className="contrib-pied">
              <button className="contrib-primaire" onClick={onClose}>
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <div className="contrib-corps">
            <p className="contrib-intro">{INTRODUCTIONS[kind]}</p>

            {kind === 'track' && (
              <>
                <label className="contrib-champ">
                  <span>Artiste</span>
                  <input
                    ref={premierChampRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={artist}
                    maxLength={120}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Nom tel qu'il figure sur la sortie"
                  />
                </label>
                <label className="contrib-champ">
                  <span>Titre</span>
                  <input
                    type="text"
                    value={title}
                    maxLength={160}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label className="contrib-champ">
                  <span>
                    Adresse <em>facultatif</em>
                  </span>
                  <input
                    type="url"
                    value={url}
                    maxLength={300}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="YouTube, Discogs, Bandcamp…"
                  />
                </label>
              </>
            )}

            {kind === 'genre_edit' && (
              <>
                <label className="contrib-champ">
                  <span>Ce qui doit changer</span>
                  <select
                    ref={premierChampRef as React.RefObject<HTMLSelectElement>}
                    value={field}
                    onChange={(e) => setField(e.target.value as ChampEditable)}
                  >
                    {CHAMPS_EDITABLES.map((c) => (
                      <option key={c} value={c}>
                        {LIBELLE_CHAMP[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="contrib-champ">
                  <span>Ce qui devrait être écrit</span>
                  <textarea
                    value={value}
                    maxLength={2000}
                    rows={4}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </label>
              </>
            )}

            {kind === 'filiation' && (
              <label className="contrib-champ">
                <span>Le genre dont il descend, selon vous</span>
                <select
                  ref={premierChampRef as React.RefObject<HTMLSelectElement>}
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">Choisir un genre…</option>
                  {STRUCTURES.map((s, i) => (
                    <optgroup key={i} label={FAMILIES[i]?.label ?? ''}>
                      {s.genres
                        .filter((g) => g.id !== genreId)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            )}

            <label className="contrib-champ">
              <span>
                Justification{' '}
                <em>
                  {restant > 0
                    ? `encore ${restant} caractère${restant > 1 ? 's' : ''}`
                    : `${justification.trim().length} / ${JUSTIFICATION_MAX}`}
                </em>
              </span>
              <textarea
                value={justification}
                maxLength={JUSTIFICATION_MAX}
                rows={4}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Sur quoi vous appuyez-vous ? Une pochette, une interview, une date de sortie, une écoute."
                aria-describedby="contrib-pourquoi"
              />
            </label>
            <p className="contrib-note" id="contrib-pourquoi">
              Au moins {JUSTIFICATION_MIN} caractères. Une proposition sans raison n&apos;est pas
              arbitrable, et personne ne peut la soutenir.
            </p>

            {!connecte && !chargement && (
              <div className="contrib-connexion">
                <p className="contrib-note">
                  Il faut une adresse courriel pour proposer, afin que chaque proposition ait un
                  auteur. Elle n&apos;est jamais publiée : les propositions sont signées d&apos;un
                  pseudonyme.
                </p>
                <label className="contrib-champ">
                  <span>Votre adresse</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    autoComplete="email"
                  />
                </label>
              </div>
            )}

            {erreur && (
              <p className="contrib-erreur" role="alert">
                {erreur}
              </p>
            )}

            <div className="contrib-pied">
              <button className="contrib-secondaire" onClick={onClose} disabled={envoiEnCours}>
                Annuler
              </button>
              {connecte ? (
                <button
                  className="contrib-primaire"
                  onClick={envoyerLaProposition}
                  disabled={envoiEnCours}
                >
                  {envoiEnCours ? 'Envoi…' : 'Envoyer la proposition'}
                </button>
              ) : (
                <button
                  className="contrib-primaire"
                  onClick={demanderLeLien}
                  disabled={envoiEnCours || chargement}
                >
                  {envoiEnCours ? 'Envoi…' : 'Recevoir un lien de connexion'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
