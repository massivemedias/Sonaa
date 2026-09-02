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
  compresserPochette,
  creerSet,
  deposerPochette,
  urlPochette,
  deposerAudio,
  deposerAvatar,
  enregistrerArtiste,
  mesSets,
  mesurerDuree,
  mmss,
  monArtiste,
  monStockage,
  supprimerSet,
  urlAvatar,
  type Artiste,
  type Stockage,
  type SetDJ,
} from '../lib/sets.ts';
import { LecteurSet } from './LecteurSet.tsx';
import { ZoneDepot } from './ZoneDepot.tsx';
import { ChoixStyles } from './ChoixStyles.tsx';
import { ModifierSet } from './ModifierSet.tsx';
import { EnTeteSite } from './EnTeteSite.tsx';
import { PiedDePage } from './PiedDePage.tsx';

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
  const [enModif, setEnModif] = useState<string | null>(null);
  const [stockage, setStockage] = useState<Stockage | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [pochette, setPochette] = useState<{ fichier: File; apercu: string; avant: number } | null>(null);

  const recharger = useCallback(async () => {
    const [liste, place] = await Promise.all([mesSets(), monStockage()]);
    setSets(liste);
    setStockage(place);
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

  /* LA POCHETTE EST COMPRESSEE AU MOMENT DU CHOIX, PAS A L'ENVOI.

     Une image de quarante megaoctets met deux secondes a se reduire. Faites
     au moment du depot, ces deux secondes s'ajoutent a l'attente du fichier
     audio et paraissent une panne ; faites au choix, elles se passent pendant
     qu'on tape le titre. On en profite pour montrer tout de suite le resultat,
     ce qui est aussi la seule facon de verifier que la compression n'a pas
     abime l'image. */
  const choisirPochette = async (f: File): Promise<void> => {
    setMessageDepot(null);
    if (!f.type.startsWith('image/')) {
      setMessageDepot(t.formatImageRefuse);
      return;
    }
    try {
      const petite = await compresserPochette(f);
      if (pochette) URL.revokeObjectURL(pochette.apercu);
      setPochette({ fichier: petite, apercu: URL.createObjectURL(petite), avant: f.size });
      setMessageDepot(t.pochetteCompressee(mo(f.size), mo(petite.size)));
    } catch {
      setMessageDepot(t.formatImageRefuse);
    }
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
      const cover = pochette ? await deposerPochette(pochette.fichier) : null;
      await creerSet({
        cover_path: cover,
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
      if (pochette) URL.revokeObjectURL(pochette.apercu);
      setPochette(null);
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
      <>
      <EnTeteSite />
      <main className="credits sets-page">
        <h1>{t.monProfil}</h1>
        <p>{t.baseIndisponible}</p>
        <PiedDePage />
      </main>
    </>
    );
  }

  if (!pret) {
    return (
      <>
      <EnTeteSite />
      <main className="credits sets-page">
        <h1>{t.monProfil}</h1>
        <p>{t.chargement}</p>
        <PiedDePage />
      </main>
    </>
    );
  }

  if (!connecte) {
    return (
      <>
      <EnTeteSite />
      <main className="credits sets-page">
        <h1>{t.monProfil}</h1>
        <p>{t.connexionRequiseProfil}</p>
        <PiedDePage />
      </main>
    </>
    );
  }

  const occupe = etape !== 'repos';

  return (
    <>
      <EnTeteSite />
      <main className="credits sets-page">
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
        {/* LA PLACE RESTANTE SE DIT AVANT, PAS APRES UN REFUS. Quelqu'un qui
            depose un fichier d'un gigaoctet met plusieurs minutes a
            l'envoyer : apprendre a la fin qu'il n'y avait pas la place est le
            genre de chose qui fait fermer l'onglet. */}
        {stockage && (
          <p className="sp-aide">
            {stockage.plafond === null
              ? t.stockageSansLimite(mo(stockage.utilise))
              : t.stockageUtilise(mo(stockage.utilise), mo(stockage.plafond))}
          </p>
        )}

        <div className="sp-formulaire">
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
        {/* LA POCHETTE. Meme zone de depot que le fichier audio : glisser une
            image dessus la remplace, cliquer ouvre le selecteur. */}
        <p className="sp-label">{t.pochette}</p>
        <ZoneDepot
          className="zd-pochette"
          accept={FORMATS_IMAGE}
          onFichier={(f) => void choisirPochette(f)}
          disabled={occupe}
        >
          {pochette ? (
            <img className="zd-apercu" src={pochette.apercu} alt="" />
          ) : (
            <>
              <p className="zd-titre">{t.deposerUnePochette}</p>
              <p className="zd-aide">{t.pochetteAide}</p>
            </>
          )}
        </ZoneDepot>
        {pochette && (
          <button
            type="button"
            className="sp-lien"
            onClick={() => {
              URL.revokeObjectURL(pochette.apercu);
              setPochette(null);
            }}
          >
            {t.retirerLaPochette}
          </button>
        )}

        <ChoixStyles choisis={genres} onChange={setGenres} max={GENRES_MAX} />

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
        </div>
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
                  <div className="sp-item-titre">
                    {urlPochette(s.cover_path) && (
                      <img className="sp-pochette" src={urlPochette(s.cover_path) ?? ''} alt="" />
                    )}
                    <div>
                    <h3>{s.titre}</h3>
                    <p className="sp-aide">
                      {s.duree_s ? mmss(s.duree_s) : t.dureeInconnue}
                      {' · '}
                      {s.publie ? t.publie : t.brouillon}
                      {s.publie ? ` · ${t.nEcoutes(s.ecoutes)}` : ''}
                    </p>
                    </div>
                  </div>
                  <div className="sp-item-actions">
                    <button onClick={() => setEnModif(enModif === s.id ? null : s.id)}>
                      {enModif === s.id ? t.annuler : t.modifier}
                    </button>
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
                {enModif === s.id ? (
                  <ModifierSet
                    set={s}
                    onFini={() => {
                      setEnModif(null);
                      void recharger();
                    }}
                    onAnnuler={() => setEnModif(null)}
                  />
                ) : (
                  <LecteurSet set={s} compact />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <PiedDePage />
    </main>
    </>
  );
}
