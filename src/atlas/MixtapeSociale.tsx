/* CE QUI ENTOURE UNE MIXTAPE : aimer, commenter, partager, l'artiste, et
 * d'autres mixtapes a ecouter ensuite.
 *
 * Mika, le 18 octobre 2026, devant la page d'une mixtape : « cette page
 * devrait etre plus jolie et proposer d'autres mixtapes. Proposer aux users
 * loggés de faire des likes et des commentaires ; s'ils ne sont pas log,
 * proposer l'enregistrement. Un bouton de partage pour les reseaux sociaux,
 * avec un reel d'une minute. Une colonne avec le profil de qui a pose la
 * mixtape ». Voir SetsPage.tsx (PageDUnSet) qui assemble ces pieces.
 *
 * QUI N'EST PAS CONNECTE VOIT TOUT, ET LE BOUTON LUI OUVRE L'INSCRIPTION.
 * Le compte des j'aime et les commentaires sont publics ; aimer ou ecrire
 * ouvre le panneau du compte, sur l'onglet « Creer un compte » pour qui n'est
 * jamais venu, avec la phrase qui dit pourquoi. */

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { faHeart as faHeartPlein, faShareNodes, faLink, faFilm } from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartVide } from '@fortawesome/free-regular-svg-icons';
import { faFacebook, faWhatsapp, faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { FaIcon } from './FaIcon.tsx';
import { useSession } from '../lib/useSession.ts';
import { EVENEMENT_CONNEXION } from '../lib/porte-ecoute.ts';
import {
  aimerLeSet,
  commentairesDuSet,
  commenterLeSet,
  jAimeCeSet,
  likesDesSets,
  mmss,
  retirerCommentaireSet,
  setsPublics,
  unArtiste,
  urlAvatar,
  urlPochette,
  type ArtistePublic,
  type CommentaireSet,
  type SetDJ,
} from '../lib/sets.ts';
import { chercherDansLeSet, jouerLeSet, useLectureSet } from '../lib/lecture-set.ts';
import { adresseCourte, liensAffiches } from '../lib/reseaux.ts';
import { langue, t } from '../langue/langue.ts';
import './mixtape.css';

const GenerateurReel = lazy(() => import('./GenerateurReel.tsx').then((m) => ({ default: m.GenerateurReel })));

/** Demande le panneau du compte, avec la raison. */
function demanderCompte(): void {
  window.dispatchEvent(new CustomEvent(EVENEMENT_CONNEXION, { detail: t.compteRequisMixtape }));
}

const FORMAT_RELATIF = new Intl.RelativeTimeFormat(langue === 'fr' ? 'fr-CA' : 'en-CA', { numeric: 'auto' });
function ilYA(iso: string): string {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const pas: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unite, n] of pas) if (Math.abs(s) >= n) return FORMAT_RELATIF.format(Math.round(s / n), unite);
  return FORMAT_RELATIF.format(0, 'minute');
}

/* ═══ J'AIME ═══ */
export function BoutonJaime({ set }: { set: SetDJ }) {
  const { session } = useSession();
  const [n, setN] = useState<number | null>(null);
  const [aime, setAime] = useState(false);

  useEffect(() => {
    let vivant = true;
    void likesDesSets([set.id]).then((m) => vivant && setN(m.get(set.id) ?? 0));
    return () => {
      vivant = false;
    };
  }, [set.id]);
  useEffect(() => {
    let vivant = true;
    if (!session) {
      setAime(false);
      return;
    }
    void jAimeCeSet(set.id).then((x) => vivant && setAime(x));
    return () => {
      vivant = false;
    };
  }, [set.id, session]);

  const basculer = async (): Promise<void> => {
    if (!session) return demanderCompte();
    const voulu = !aime;
    setAime(voulu);
    setN((x) => Math.max(0, (x ?? 0) + (voulu ? 1 : -1)));
    try {
      await aimerLeSet(set.id, voulu);
    } catch {
      setAime(!voulu);
      setN((x) => Math.max(0, (x ?? 0) + (voulu ? -1 : 1)));
    }
  };

  return (
    <button type="button" className={aime ? 'mx-action mx-action-aime' : 'mx-action'} aria-pressed={aime} onClick={() => void basculer()}>
      <FaIcon icon={aime ? faHeartPlein : faHeartVide} className="mx-action-icone" />
      <span>{n === null ? t.jAime : t.nJaime(n)}</span>
    </button>
  );
}

/* ═══ PARTAGER ═══ Les reseaux qui acceptent un lien, le lien lui-meme, le
   partage du systeme sur telephone, et, pour une mixtape, le reel pour
   Instagram. L'adresse partagee d'une mixtape est celle de la page
   pre-rendue (/mixtapes/<id>/), qui porte la pochette, le titre et la
   description pour l'apercu de Facebook. */
export function adresseDuSet(set: SetDJ): string {
  return `https://sonaa.ca/mixtapes/${set.id}/`;
}

export function BoutonPartager({ url, titre, set }: { url: string; titre: string; set?: SetDJ }) {
  const [ouvert, setOuvert] = useState(false);
  const [reel, setReel] = useState(false);
  const [copie, setCopie] = useState(false);
  const texte = `${titre} sur SONAA`;
  const natif = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  /* Le menu se ferme a un clic ailleurs et a Echap. */
  useEffect(() => {
    if (!ouvert) return;
    const ailleurs = (e: PointerEvent): void => {
      if (!(e.target instanceof Element) || !e.target.closest('.mx-partage')) setOuvert(false);
    };
    const echap = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOuvert(false);
    };
    document.addEventListener('pointerdown', ailleurs);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('pointerdown', ailleurs);
      document.removeEventListener('keydown', echap);
    };
  }, [ouvert]);

  const copier = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2500);
    } catch {
      window.prompt(t.copierLeLien, url);
    }
  };

  return (
    <div className="mx-partage">
      <button type="button" className="mx-action" aria-expanded={ouvert} onClick={() => setOuvert((x) => !x)}>
        <FaIcon icon={faShareNodes} className="mx-action-icone" />
        <span>{t.partager}</span>
      </button>
      {ouvert && (
        <div className="mx-partage-menu" role="menu">
          <a role="menuitem" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer noopener">
            <FaIcon icon={faFacebook} className="mx-partage-icone" />
            Facebook
          </a>
          <a role="menuitem" href={`https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(texte)}`} target="_blank" rel="noreferrer noopener">
            <FaIcon icon={faXTwitter} className="mx-partage-icone" />X
          </a>
          <a role="menuitem" href={`https://wa.me/?text=${encodeURIComponent(`${texte} ${url}`)}`} target="_blank" rel="noreferrer noopener">
            <FaIcon icon={faWhatsapp} className="mx-partage-icone" />
            WhatsApp
          </a>
          <button role="menuitem" type="button" onClick={() => void copier()}>
            <FaIcon icon={faLink} className="mx-partage-icone" />
            {copie ? t.lienCopie : t.copierLeLien}
          </button>
          {natif && (
            <button role="menuitem" type="button" onClick={() => void navigator.share({ title: titre, text: texte, url }).catch(() => undefined)}>
              <FaIcon icon={faShareNodes} className="mx-partage-icone" />
              {t.partagerAilleurs}
            </button>
          )}
          {set && (
            <button
              role="menuitem"
              type="button"
              className="mx-partage-reel"
              onClick={() => {
                setOuvert(false);
                setReel(true);
              }}
            >
              <FaIcon icon={faFilm} className="mx-partage-icone" />
              {t.creerUnReel}
            </button>
          )}
        </div>
      )}
      {set && reel && (
        <Suspense fallback={null}>
          <GenerateurReel set={set} onFermer={() => setReel(false)} />
        </Suspense>
      )}
    </div>
  );
}

/* ═══ LES COMMENTAIRES ═══ Les plus recents d'abord. Pendant que la mixtape
   joue, on peut attacher le commentaire a l'instant ecoute, comme sur
   SoundCloud ; la pastille de temps ramene a cet instant. */
export function Commentaires({ set }: { set: SetDJ }) {
  const { session } = useSession();
  const lecture = useLectureSet();
  const [liste, setListe] = useState<CommentaireSet[] | null>(null);
  const [texte, setTexte] = useState('');
  const [auMoment, setAuMoment] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    setListe(await commentairesDuSet(set.id));
  }, [set.id]);
  useEffect(() => {
    void recharger();
  }, [recharger]);

  const ici = lecture.set?.id === set.id;
  const position = ici ? Math.floor(lecture.position) : null;

  const envoyer = async (): Promise<void> => {
    if (!session) return demanderCompte();
    if (!texte.trim()) return;
    setEnvoi(true);
    setMessage(null);
    try {
      await commenterLeSet(set.id, texte, auMoment && position !== null ? position : null);
      setTexte('');
      await recharger();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setEnvoi(false);
    }
  };

  const allerA = (s: number): void => {
    if (lecture.set?.id !== set.id) jouerLeSet(set);
    window.setTimeout(() => chercherDansLeSet(s), lecture.set?.id === set.id ? 0 : 400);
  };

  return (
    <section className="mx-bloc mx-commentaires" aria-labelledby="mx-commentaires-titre">
      <h2 id="mx-commentaires-titre" className="mx-bloc-titre">
        {t.commentairesMixtape(liste?.length ?? 0)}
      </h2>

      {session ? (
        <form
          className="mx-ecrire"
          onSubmit={(e) => {
            e.preventDefault();
            void envoyer();
          }}
        >
          <textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={t.ecrireUnCommentaire}
            aria-label={t.ecrireUnCommentaire}
          />
          <div className="mx-ecrire-pied">
            {position !== null ? (
              <label className="mx-au-moment">
                <input type="checkbox" checked={auMoment} onChange={(e) => setAuMoment(e.target.checked)} />
                {t.aCetInstant(mmss(position))}
              </label>
            ) : (
              <span className="mx-aide">{t.commentaireAstuceInstant}</span>
            )}
            <button type="submit" className="mx-envoyer" disabled={envoi || !texte.trim()}>
              {t.publierCommentaire}
            </button>
          </div>
          {message && <p className="mx-erreur">{message}</p>}
        </form>
      ) : (
        <div className="mx-invitation">
          <p>{t.compteRequisMixtape}</p>
          <button type="button" className="mx-envoyer" onClick={demanderCompte}>
            {t.creerUnCompte}
          </button>
        </div>
      )}

      {liste === null ? (
        <p className="mx-aide">{t.chargement}</p>
      ) : liste.length === 0 ? (
        <p className="mx-aide">{t.aucunCommentaireMixtape}</p>
      ) : (
        <ul className="mx-fil">
          {liste.map((c) => (
            <li key={c.id} className="mx-commentaire">
              <span className="mx-commentaire-portrait" aria-hidden="true">
                {urlAvatar(c.avatar_path) ? <img src={urlAvatar(c.avatar_path) ?? ''} alt="" loading="lazy" /> : (c.nom.trim()[0] ?? '?').toUpperCase()}
              </span>
              <div className="mx-commentaire-corps">
                <p className="mx-commentaire-tete">
                  {c.artiste_id ? <a href={`#/mixtapes/a/${c.artiste_id}`}>{c.nom}</a> : <strong>{c.nom}</strong>}
                  {c.position_s !== null && (
                    <button type="button" className="mx-instant" onClick={() => allerA(c.position_s ?? 0)}>
                      {mmss(c.position_s)}
                    </button>
                  )}
                  <time dateTime={c.created_at}>{ilYA(c.created_at)}</time>
                </p>
                <p className="mx-commentaire-texte">{c.texte}</p>
                {c.a_moi && (
                  <button
                    type="button"
                    className="mx-retirer"
                    onClick={() => void retirerCommentaireSet(c.id).then(recharger)}
                  >
                    {t.supprimer}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ═══ L'ARTISTE, EN COLONNE ═══ Sa banniere, son portrait, son lieu, ses
   chiffres, sa presentation et ses reseaux. */
export function CarteArtiste({ compte, sets }: { compte: string; sets: readonly SetDJ[] }) {
  const [a, setA] = useState<ArtistePublic | null>(null);
  const [likes, setLikes] = useState(0);
  useEffect(() => {
    let vivant = true;
    void unArtiste(compte).then((x) => vivant && setA(x));
    return () => {
      vivant = false;
    };
  }, [compte]);
  useEffect(() => {
    let vivant = true;
    void likesDesSets(sets.map((s) => s.id)).then((m) => {
      if (vivant) setLikes([...m.values()].reduce((x, y) => x + y, 0));
    });
    return () => {
      vivant = false;
    };
  }, [sets]);
  if (!a) return null;
  const banniere = urlAvatar(a.banniere_path) ?? urlPochette(sets.find((s) => s.cover_path)?.cover_path);
  const liens = liensAffiches(a.liens);
  return (
    <aside className="mx-artiste">
      <a className="mx-artiste-tete" href={`#/mixtapes/a/${a.user_id}`}>
        <span className="mx-artiste-banniere" aria-hidden="true">
          {banniere && <img src={banniere} alt="" loading="lazy" />}
        </span>
        <span className="mx-artiste-portrait" aria-hidden="true">
          {urlAvatar(a.avatar_path) ? <img src={urlAvatar(a.avatar_path) ?? ''} alt="" /> : (a.nom.trim()[0] ?? '?').toUpperCase()}
        </span>
        <span className="mx-artiste-nom">{a.nom}</span>
        {a.lieu && <span className="mx-artiste-lieu">{a.lieu}</span>}
      </a>
      <dl className="mx-chiffres">
        <div>
          <dt>{t.lesMixtapes}</dt>
          <dd>{a.n_sets}</dd>
        </div>
        <div>
          <dt>{t.ecoutesMot}</dt>
          <dd>{a.ecoutes}</dd>
        </div>
        <div>
          <dt>{t.jAimeMot}</dt>
          <dd>{likes}</dd>
        </div>
      </dl>
      {a.bio && <p className="mx-artiste-bio">{a.bio}</p>}
      {liens.length > 0 && (
        <ul className="mx-liens">
          {liens.map((l) => (
            <li key={l.reseau.id}>
              <a href={l.url} target="_blank" rel="noreferrer noopener me">
                <FaIcon icon={l.reseau.icone} className="mx-lien-icone" />
                <span>{l.reseau.id === 'site' ? adresseCourte(l.url) : l.reseau.nom}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <a className="mx-artiste-voir" href={`#/mixtapes/a/${a.user_id}`}>
        {t.voirLeProfil}
      </a>
    </aside>
  );
}

/* ═══ D'AUTRES MIXTAPES ═══ Celles du meme artiste d'abord, puis les plus
   recentes des autres ; six en tout. */
export function AutresMixtapes({ set }: { set: SetDJ }) {
  const [tous, setTous] = useState<SetDJ[] | null>(null);
  useEffect(() => {
    let vivant = true;
    void setsPublics().then((x) => vivant && setTous(x));
    return () => {
      vivant = false;
    };
  }, []);
  const choix = useMemo(() => {
    if (!tous) return [];
    const autres = tous.filter((s) => s.id !== set.id);
    return [...autres.filter((s) => s.user_id === set.user_id), ...autres.filter((s) => s.user_id !== set.user_id)].slice(0, 6);
  }, [tous, set.id, set.user_id]);
  if (choix.length === 0) return null;
  return (
    <section className="mx-bloc" aria-labelledby="mx-autres-titre">
      <h2 id="mx-autres-titre" className="mx-bloc-titre">
        {t.dAutresMixtapes}
      </h2>
      <ul className="mx-autres">
        {choix.map((s) => {
          const image = urlPochette(s.cover_path) ?? urlAvatar(s.artiste_avatar);
          return (
            <li key={s.id}>
              <a href={`#/mixtapes/${s.id}`}>
                <span className="mx-autre-image">{image ? <img src={image} alt="" loading="lazy" /> : null}</span>
                <span className="mx-autre-titre">{s.titre}</span>
                <span className="mx-autre-artiste">
                  {s.artiste_nom ?? t.artisteSansNom}
                  {s.duree_s ? ` · ${mmss(s.duree_s)}` : ''}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

