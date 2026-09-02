/* Route #/profil : qui je suis, et ce que je depose.

   CE LIEN ETAIT MORT. Le menu du compte proposait « Profil » depuis
   longtemps et pointait vers #/profil, une route que main.tsx ne connaissait
   pas : le clic ramenait sur la carte, sans un mot. La page manquait, pas le
   lien.

   ELLE FAIT DEUX CHOSES, ET C'EST VOULU QU'ELLES SOIENT SUR LE MEME ECRAN.
   L'identite publique (un nom, une photo) et le depot d'un set sont
   inseparables : un set sans nom d'artiste s'affiche « sans nom » sur la
   page publique, ce qui se voit et se repare tout de suite si les deux
   formulaires se touchent. */

import { useCallback, useEffect, useState } from 'react';
import { contributionsActives, supabase } from '../lib/supabase.ts';
import {
  AVATAR_MAX,
  FORMATS_AUDIO,
  FORMATS_IMAGE,
  GENRES_MAX,
  MO_PAR_MINUTE_FLAC,
  MO_PAR_MINUTE_WAV,
  estAudioAccepte,
  estSansPerte,
  estSansPerteIllisible,
  TAILLE_MAX,
  basculerPublication,
  calculerOnde,
  creerSet,
  deposerAudio,
  deposerAvatar,
  enregistrerArtiste,
  mesSets,
  mesurerDuree,
  mmss,
  monArtiste,
  supprimerSet,
  urlAvatar,
  type Artiste,
  type SetDJ,
} from '../lib/sets.ts';
import { LecteurSet } from './LecteurSet.tsx';
import { ZoneDepot } from './ZoneDepot.tsx';
import { SiteNav } from './SiteNav.tsx';
import { FAMILIES, STRUCTURES } from './structures.ts';

/* Le libelle d'un genre a partir de son identifiant. Construit une fois :
   la pastille en a besoin a chaque rendu, et parcourir 219 genres a chaque
   fois pour retrouver un nom serait du travail refait pour rien. */
const LABEL_DE_GENRE: Record<string, string> = Object.fromEntries(
  FAMILIES.flatMap((_, fi) => (STRUCTURES[fi]?.genres ?? []).map((g) => [g.id, g.label]))
);
import { t } from '../langue/langue.ts';
import './credits.css';
import './sets.css';

/* « 1024,0 Mo » est une facon de compter, pas une facon de lire. Au-dela du
   millier on passe au gigaoctet, comme le fait n'importe quel systeme. */
const mo = (o: number): string => {
  const m = o / (1024 * 1024);
  return m >= 1000 ? `${(m / 1024).toFixed(m / 1024 < 10 ? 1 : 0)} ${t.uniteGo}` : `${m.toFixed(1)} ${t.uniteMo}`;
};

type Etape = 'repos' | 'onde' | 'envoi' | 'ligne';

export function ProfilPage() {
  const [pret, setPret] = useState(false);
  const [connecte, setConnecte] = useState(false);
  const [artiste, setArtiste] = useState<Artiste | null>(null);
  const [nom, setNom] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [messageProfil, setMessageProfil] = useState<string | null>(null);

  const [sets, setSets] = useState<SetDJ[]>([]);
  const [fichier, setFichier] = useState<File | null>(null);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [etape, setEtape] = useState<Etape>('repos');
  const [messageDepot, setMessageDepot] = useState<string | null>(null);
  const [avancement, setAvancement] = useState<number | null>(null);
  const [genres, setGenres] = useState<string[]>([]);

  const recharger = useCallback(async () => {
    setSets(await mesSets());
  }, []);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      if (!supabase) {
        if (vivant) setPret(true);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!vivant) return;
      const ok = Boolean(data.user);
      setConnecte(ok);
      if (ok) {
        const a = await monArtiste();
        if (!vivant) return;
        setArtiste(a);
        setNom(a?.nom ?? '');
        setBio(a?.bio ?? '');
        setAvatarPath(a?.avatar_path ?? null);
        await recharger();
      }
      if (vivant) setPret(true);
    })();
    return () => {
      vivant = false;
    };
  }, [recharger]);

  const enregistrerProfil = async (): Promise<void> => {
    setMessageProfil(null);
    const propre = nom.trim();
    if (propre.length < 1) {
      setMessageProfil(t.nomRequis);
      return;
    }
    try {
      await enregistrerArtiste({
        nom: propre,
        bio: bio.trim() || null,
        avatar_path: avatarPath,
      });
      setArtiste({ user_id: '', nom: propre, bio: bio.trim() || null, avatar_path: avatarPath });
      setMessageProfil(t.profilEnregistre);
    } catch (e) {
      setMessageProfil(e instanceof Error ? e.message : String(e));
    }
  };

  const changerAvatar = async (f: File): Promise<void> => {
    setMessageProfil(null);
    if (!FORMATS_IMAGE.includes(f.type)) {
      setMessageProfil(t.formatImageRefuse);
      return;
    }
    if (f.size > AVATAR_MAX) {
      setMessageProfil(t.imageTropLourde(mo(f.size)));
      return;
    }
    try {
      const chemin = await deposerAvatar(f);
      setAvatarPath(chemin);
      /* On enregistre TOUT DE SUITE plutot que d'attendre le bouton : la
         photo est deja partie sur le serveur, laisser la ligne en retard
         creerait un fichier que rien ne designe si la page se ferme ici. */
      await enregistrerArtiste({ nom: nom.trim() || t.artisteSansNom, bio: bio.trim() || null, avatar_path: chemin });
      setMessageProfil(t.photoEnregistree);
    } catch (e) {
      setMessageProfil(e instanceof Error ? e.message : String(e));
    }
  };

  const choisirFichier = (f: File | null): void => {
    setMessageDepot(null);
    if (!f) {
      setFichier(null);
      return;
    }
    /* L'EXTENSION DECIDE, PAS LE TYPE DECLARE. Chrome rend une chaine vide
       pour un FLAC et pour un AIFF, Firefox rend « application/octet-stream ».
       Filtrer sur le type aurait refuse un master parfaitement valide. */
    if (estSansPerteIllisible(f.name)) {
      setFichier(null);
      setMessageDepot(t.aiffRefuse);
      return;
    }
    if (!estAudioAccepte(f.name)) {
      setFichier(null);
      setMessageDepot(t.formatAudioRefuse);
      return;
    }
    /* LA TAILLE SE DIT AVANT L'ENVOI, ET AVEC SON CHIFFRE. Laisser partir
       120 Mo pour recevoir un refus du serveur, c'est faire attendre
       plusieurs minutes pour rien sur une connexion lente.

       ET POUR UN FICHIER SANS PERTE, ON DIT AUSSI COMBIEN DE MINUTES
       TIENDRAIENT. « 50 Mo maximum » ne veut rien dire quand on tient un WAV
       d'une heure ; « cinq minutes de WAV tiennent, votre fichier en fait
       soixante » se comprend tout de suite. */
    if (f.size > TAILLE_MAX) {
      setFichier(null);
      const plafond = TAILLE_MAX / (1024 * 1024);
      setMessageDepot(
        estSansPerte(f.name)
          ? t.sansPerteTropLourd(
              mo(f.size),
              mo(TAILLE_MAX),
              Math.floor(plafond / MO_PAR_MINUTE_WAV),
              Math.floor(plafond / MO_PAR_MINUTE_FLAC)
            )
          : t.audioTropLourd(mo(f.size), mo(TAILLE_MAX))
      );
      return;
    }
    setFichier(f);
    if (!titre.trim()) setTitre(f.name.replace(/\.[^.]+$/, '').slice(0, 120));
  };

  const deposer = async (): Promise<void> => {
    if (!fichier || !titre.trim()) return;
    setMessageDepot(null);
    try {
      /* L'ordre : dessin, fichier, ligne. Le dessin d'abord parce qu'il se
         fait sur le fichier local et qu'il ne coute rien au reseau ; s'il
         echoue on continue sans lui. */
      setEtape('onde');
      const [onde, duree] = await Promise.all([calculerOnde(fichier), mesurerDuree(fichier)]);

      setEtape('envoi');
      setAvancement(0);
      const chemin = await deposerAudio(fichier, (a) =>
        setAvancement(Math.round((a.envoye / a.total) * 100))
      );

      setEtape('ligne');
      await creerSet({
        titre: titre.trim(),
        description: description.trim() || null,
        genre_ids: genres.length > 0 ? genres : null,
        audio_path: chemin,
        duree_s: duree,
        taille_o: fichier.size,
        onde,
        publie: false,
      });

      setFichier(null);
      setTitre('');
      setDescription('');
      setGenres([]);
      setMessageDepot(t.setDepose);
      await recharger();
    } catch (e) {
      setMessageDepot(e instanceof Error ? e.message : String(e));
    } finally {
      setEtape('repos');
      setAvancement(null);
    }
  };

  if (!contributionsActives) {
    return (
      <main className="credits sets-page">
        <SiteNav variant="page" />
        <h1>{t.monProfil}</h1>
        <p>{t.baseIndisponible}</p>
      </main>
    );
  }

  if (!pret) {
    return (
      <main className="credits sets-page">
        <SiteNav variant="page" />
        <h1>{t.monProfil}</h1>
        <p>{t.chargement}</p>
      </main>
    );
  }

  if (!connecte) {
    return (
      <main className="credits sets-page">
        <SiteNav variant="page" />
        <h1>{t.monProfil}</h1>
        <p>{t.connexionRequiseProfil}</p>
      </main>
    );
  }

  const occupe = etape !== 'repos';

  return (
    <main className="credits sets-page">
      <SiteNav variant="page" />
      <h1>{t.monProfil}</h1>

      {/* ── L'identite publique ── */}
      <section className="sets-bloc">
        <h2>{t.identitePublique}</h2>
        <div className="sp-identite">
          <div className="sp-avatar">
            {/* LA PHOTO EST ELLE-MEME LA ZONE DE DEPOT. Un cadre en pointilles
                a cote d'un portrait aurait double la cible sans rien clarifier :
                on lache sur la photo qu'on remplace. Le clic marche toujours,
                le clavier aussi. */}
            <ZoneDepot
              className="zd-avatar"
              accept={FORMATS_IMAGE}
              onFichier={(f) => void changerAvatar(f)}
            >
              {urlAvatar(avatarPath) ? (
                <img src={urlAvatar(avatarPath) ?? ''} alt="" />
              ) : (
                <span className="sp-avatar-vide" aria-hidden="true">
                  {(nom.trim()[0] ?? '?').toUpperCase()}
                </span>
              )}
              <span className="zd-avatar-voile">{t.deposerOuCliquer}</span>
            </ZoneDepot>
            <p className="sp-aide">{t.photoLimite}</p>
          </div>

          <div className="sp-champs">
            <label className="sp-label">
              {t.nomDArtiste}
              <input
                type="text"
                maxLength={60}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder={t.nomDArtistePlaceholder}
              />
            </label>
            <label className="sp-label">
              {t.presentation}
              <textarea
                maxLength={600}
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </label>
            <button className="sp-action" onClick={() => void enregistrerProfil()}>
              {artiste ? t.enregistrer : t.creerMonProfil}
            </button>
            {messageProfil && <p className="sp-message">{messageProfil}</p>}
          </div>
        </div>
      </section>

      {/* ── Deposer ── */}
      <section className="sets-bloc">
        <h2>{t.deposerUnSet}</h2>
        <p className="sp-aide">{t.limitesDepot(mo(TAILLE_MAX))}</p>

        <ZoneDepot accept={FORMATS_AUDIO} onFichier={(f) => choisirFichier(f)} disabled={occupe}>
          <p className="zd-titre">{fichier ? fichier.name : t.deposerLeFichier}</p>
          <p className="zd-aide">
            {fichier
              ? `${mo(fichier.size)}${estSansPerte(fichier.name) ? ` · ${t.sansPerte}` : ''}`
              : t.formatsAcceptes}
          </p>
        </ZoneDepot>

        <label className="sp-label">
          {t.titreDuSet}
          <input
            type="text"
            maxLength={120}
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
          />
        </label>
        {/* LE GENRE EST CE QUI RELIE LES DEUX MOITIES DU SITE.

            Un set sans genre reste un fichier de plus dans une liste. Le meme
            set range sous « Dub Techno » apparait sur la page du genre, sous
            les morceaux qui l'ont fait. Aucune plateforme generaliste ne peut
            faire cela, parce qu'aucune ne porte les 219 fiches.

            Une liste deroulante native et non un champ de recherche : 219
            entrees groupees par famille tiennent dans un selecteur, le
            navigateur y cherche deja au clavier, et sur telephone il ouvre la
            roue du systeme, qui se manipule mieux que tout ce qu'on
            dessinerait. */}
        {/* PLUSIEURS STYLES, ET ON LES AJOUTE UN PAR UN.

            Un `select multiple` natif est le pire des deux mondes : il faut
            tenir une touche pour choisir le second, il n'affiche que trois
            lignes sur un ecran etroit, et sur telephone il ne s'ouvre pas en
            roue. On garde donc une liste deroulante ordinaire, qui ajoute au
            choix, et les styles retenus s'affichent en pastilles qu'on retire
            d'un clic. Ce qui a ete choisi reste visible, ce qu'un select
            multiple ne fait pas non plus.

            Les styles deja pris disparaissent de la liste : proposer un choix
            sans effet est une invitation a un clic mort. */}
        <label className="sp-label">
          {t.genresDuSet(GENRES_MAX)}
          <select
            value=""
            disabled={genres.length >= GENRES_MAX}
            onChange={(e) => {
              const v = e.target.value;
              if (v && !genres.includes(v)) setGenres([...genres, v]);
            }}
          >
            <option value="">
              {genres.length >= GENRES_MAX ? t.genresAuMaximum : t.ajouterUnStyle}
            </option>
            {FAMILIES.map((f, fi) => {
              const restants = (STRUCTURES[fi]?.genres ?? []).filter((g) => !genres.includes(g.id));
              if (restants.length === 0) return null;
              return (
                <optgroup label={f.label} key={f.id}>
                  {restants.map((g) => (
                    <option value={g.id} key={g.id}>
                      {g.label}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </label>

        {genres.length > 0 && (
          <ul className="sp-styles">
            {genres.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setGenres(genres.filter((x) => x !== id))}
                  aria-label={t.retirerLeStyle(LABEL_DE_GENRE[id] ?? id)}
                >
                  {LABEL_DE_GENRE[id] ?? id}
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="sp-label">
          {t.descriptionFacultative}
          <textarea
            maxLength={2000}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <button
          className="sp-action"
          disabled={!fichier || !titre.trim() || occupe}
          onClick={() => void deposer()}
        >
          {etape === 'onde'
            ? t.etapeOnde
            : etape === 'envoi'
              ? avancement === null
                ? t.etapeEnvoi
                : t.etapeEnvoiPourcent(avancement)
              : etape === 'ligne'
                ? t.etapeLigne
                : t.deposer}
        </button>
        {messageDepot && <p className="sp-message">{messageDepot}</p>}
      </section>

      {/* ── Mes sets ── */}
      <section className="sets-bloc">
        <h2>{t.mesSets(sets.length)}</h2>
        {sets.length === 0 ? (
          <p className="sp-aide">{t.aucunSetDepose}</p>
        ) : (
          <ul className="sp-liste">
            {sets.map((s) => (
              <li key={s.id} className="sp-item">
                <div className="sp-item-tete">
                  <div>
                    <h3>{s.titre}</h3>
                    <p className="sp-aide">
                      {s.duree_s ? mmss(s.duree_s) : t.dureeInconnue}
                      {' · '}
                      {s.publie ? t.publie : t.brouillon}
                      {s.publie ? ` · ${t.nEcoutes(s.ecoutes)}` : ''}
                    </p>
                  </div>
                  <div className="sp-item-actions">
                    <button
                      onClick={() => {
                        void basculerPublication(s.id, !s.publie).then(recharger);
                      }}
                    >
                      {s.publie ? t.depublier : t.publier}
                    </button>
                    <button
                      className="sp-danger"
                      onClick={() => {
                        if (!window.confirm(t.confirmerSuppression(s.titre))) return;
                        void supprimerSet(s.id, s.audio_path).then(recharger);
                      }}
                    >
                      {t.supprimer}
                    </button>
                  </div>
                </div>
                <LecteurSet set={s} compact />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
