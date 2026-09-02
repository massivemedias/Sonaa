/* LE POINT D'ENTRÉE DU COMPTE : bouton, menu, panneau.

   POURQUOI CE FICHIER N'EXISTAIT PAS, ET CE QUE ÇA DIT. Tout le reste était
   là : la connexion par lien magique, la connexion par Google, le pseudonyme
   non réversible, l'état de session partagé, les droits de modération, la
   mémoire de l'action interrompue. Six pièces sur sept.

   La septième est la seule que le visiteur voit. Sans elle, un site
   entièrement équipé pour recevoir des contributions n'en recevait aucune,
   parce qu'aucune porte n'était dessinée. C'est le motif de l'absence qu'on ne
   remarque pas, appliqué à une fonctionnalité entière.

   CE QUE CE COMPOSANT NE FAIT PAS. Il n'invente aucun moyen de connexion, il
   n'écrit rien en base, il ne calcule pas de pseudonyme. Il appelle ce qui
   existe. S'il grossissait, ce serait le signe qu'on lui a fait porter une
   décision qui appartient ailleurs. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../lib/useSession.ts';
import { connexionGoogle, envoyerLienMagique, memoriserIntention, seDeconnecter } from '../lib/auth.ts';
import { monPseudonyme, suisJeModerateur } from '../lib/proposals.ts';
import { t } from '../langue/langue.ts';
import './auth-button.css';

/* L'ENDROIT EXACT QUITTÉ, capturé AVANT tout départ.

   Google redirige, le lien magique passe par une boîte mail : les deux
   quittent la page. Ce qui n'est pas écrit avant le départ n'existe plus au
   retour. On capture donc le fragment complet, qui porte le genre ouvert. */
const iciMeme = (): string => window.location.hash || '#/';

/* LE NOM QU'ON SE VOIT A SOI-MEME, ET LUI SEUL.

   DEFAUT SIGNALE SUR CAPTURE IPHONE : le bouton affichait « d78765f0 », c'est
   a dire le PSEUDONYME HACHE. Il est parfait pour signer une proposition
   publique, il ne dit rien a la personne qui vient de se connecter : personne
   ne se reconnait dans une empreinte.

   TROIS SOURCES, DANS CET ORDRE. Google fournit le prenom dans les metadonnees
   du compte, c'est la meilleure. Sinon le premier mot du nom complet, quand
   seul celui-la est fourni. Sinon, pour une connexion par lien magique ou rien
   n'est fourni, la partie de l'adresse avant l'arobase.

   LA LIMITE EST LA PARTIE IMPORTANTE. Ce nom ne sert QU'AU BOUTON ET AU MENU
   DE LA PERSONNE ELLE-MEME. Il ne part nulle part, il n'est stocke nulle part,
   il n'entre dans aucune proposition ni aucun commentaire : ailleurs, le
   pseudonyme hache reste la seule identite visible, exactement comme avant.
   C'est ce qui distingue « se reconnaitre » de « se faire reconnaitre ». */
const nomAffiche = (session: { user?: { email?: string; user_metadata?: Record<string, unknown> } } | null): string | null => {
  const u = session?.user;
  if (!u) return null;
  const m = u.user_metadata ?? {};
  const mot = (v: unknown): string | null => {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t === '' ? null : (t.split(/\s+/)[0] ?? null);
  };
  const prenom = mot(m['given_name']) ?? mot(m['first_name']) ?? mot(m['full_name']) ?? mot(m['name']);
  if (prenom) return prenom;
  const avantArobase = typeof u.email === 'string' ? u.email.split('@')[0] : null;
  return avantArobase && avantArobase !== '' ? avantArobase : null;
};

export function AuthButton() {
  const { session, chargement } = useSession();
  const [ouvert, setOuvert] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [moderateur, setModerateur] = useState(false);
  const [email, setEmail] = useState('');
  const [envoi, setEnvoi] = useState<'repos' | 'envoi' | 'parti'>('repos');
  const [message, setMessage] = useState<string | null>(null);
  const boite = useRef<HTMLDivElement | null>(null);

  const connecte = session !== null;

  /* LE PSEUDONYME VIENT DU SERVEUR, jamais de l'adresse : le dériver ici le
     rendrait réversible, donc ce ne serait plus un pseudonyme. */
  useEffect(() => {
    if (!connecte) {
      setPseudo(null);
      setModerateur(false);
      return;
    }
    void monPseudonyme().then(setPseudo);
    void suisJeModerateur().then(setModerateur);
  }, [connecte]);

  /* Un menu qui ne se ferme pas au clic extérieur reste ouvert derrière ce
     qu'on voulait atteindre, et c'est le motif de la couche invisible. */
  useEffect(() => {
    if (!menu) return undefined;
    const dehors = (e: MouseEvent): void => {
      if (boite.current && !boite.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', dehors);
    return () => document.removeEventListener('mousedown', dehors);
  }, [menu]);

  /* LES POINTS D'ENTREE CONTEXTUELS OUVRENT CE MEME PANNEAU.

     Sous une liste de morceaux, dans le fil de discussion : partout ou une
     action exige un compte, le bouton local emet cet evenement plutot que de
     dessiner son propre panneau. Deux panneaux de connexion finiraient par
     diverger, c'est le motif des grandeurs ecrites deux fois applique a une
     interface. */
  useEffect(() => {
    const demande = (): void => setOuvert(true);
    window.addEventListener('sonaa:connexion', demande);
    return () => window.removeEventListener('sonaa:connexion', demande);
  }, []);

  useEffect(() => {
    if (!ouvert && !menu) return undefined;
    const echap = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setOuvert(false);
        setMenu(false);
      }
    };
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [ouvert, menu]);

  const parGoogle = useCallback(async () => {
    setMessage(null);
    const r = await connexionGoogle({ route: iciMeme() });
    if (!r.ok) setMessage(r.message);
  }, []);

  const parCourriel = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) return;
      setEnvoi('envoi');
      setMessage(null);
      memoriserIntention({ route: iciMeme() });
      const r = await envoyerLienMagique(email.trim());
      if (r.ok) {
        setEnvoi('parti');
      } else {
        setEnvoi('repos');
        setMessage(r.message);
      }
    },
    [email]
  );

  /* TANT QU'ON NE SAIT PAS, ON N'AFFIRME RIEN. Afficher « Se connecter »
     pendant la reprise de session ferait clignoter le bouton à chaque
     chargement, devant quelqu'un qui EST connecté. */
  if (chargement) return <div className="authb authb-attente" aria-hidden="true" />;

  /* LA RESERVE EST UNE POSITION MESUREE, PLUS UNE LARGEUR RECONSTRUITE.

     TROISIEME FOIS QUE MIKA SIGNALE LA MEME CHOSE, la loupe collee au nom de
     compte, et les deux premieres corrections traitaient un symptome.

     D'abord `--authb-l` valait 112 px en dur alors que le bouton connecte en
     fait 128 : on a mesure la largeur. Le defaut est revenu, a trois pixels
     cette fois, et la mesure explique pourquoi.

     LE BOUTON N'OCCUPE PAS SEULEMENT SA LARGEUR. Il est en position fixe avec
     son propre decalage a droite, quatorze pixels plus la colonne du lecteur
     et la marge de securite de l'ecran. Publier sa largeur obligeait chaque
     feuille de style a RECONSTRUIRE sa position en ajoutant une marge
     devinee, `largeur + 0.6rem`. Cette marge devinee etait plus petite que le
     decalage reel du bouton : la reserve tombait donc a l'interieur de lui, et
     il ne restait que trois pixels.

     ON PUBLIE DONC LA DISTANCE ENTRE LE BORD DROIT DE LA PAGE ET LE BORD
     GAUCHE DU BOUTON. Ce seul nombre contient deja la largeur, le decalage,
     la colonne du lecteur et la marge de securite, sans qu'aucune feuille
     n'ait a les additionner. `reserve + 0.6rem` redevient ce que ca dit :
     un espace de 0,6 rem entre la loupe et le bouton.

     clientWidth ET NON innerWidth : innerWidth compte la barre de defilement,
     que la mise en page ne voit pas. Six pixels d'ecart, soit deux fois le
     defaut qu'on repare.

     ON ECOUTE AUSSI LE REDIMENSIONNEMENT DE LA FENETRE : le bouton peut garder
     exactement la meme taille pendant que son bord gauche se deplace, et un
     observateur de taille ne se declenche alors jamais. */
  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const publier = (): void => {
      const gauche = el.getBoundingClientRect().left;
      const reserve = Math.ceil(document.documentElement.clientWidth - gauche);
      if (reserve > 0) document.documentElement.style.setProperty('--authb-reserve', `${reserve}px`);
    };
    publier();
    const obs = new ResizeObserver(publier);
    obs.observe(el);
    window.addEventListener('resize', publier);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', publier);
    };
  }, [connecte]);

  return (
    <div className="authb" ref={boite}>
      {connecte ? (
        <>
          <button
            className="authb-bouton authb-compte"
            onClick={() => setMenu((m) => !m)}
            aria-expanded={menu}
            aria-haspopup="menu"
          >
            {/* SUR TELEPHONE, L'INITIALE SEULE ; AILLEURS, LE NOM ENTIER.

                Un nom coupe au milieu, « maudite... », n'est ni un nom ni une
                icone. Une initiale est un signe COMPLET, et le nom entier
                reste dans le menu, ou la place ne manque pas. */}
            <span className="authb-entier">{nomAffiche(session) ?? pseudo ?? '…'}</span>
            <span className="authb-initiale" aria-hidden="true">
              {(nomAffiche(session) ?? pseudo ?? '?').slice(0, 1)}
            </span>
          </button>
          {menu && (
            <div className="authb-menu" role="menu">
              <a href="#/profil" role="menuitem" onClick={() => setMenu(false)}>Profil</a>
              <a href="#/propositions" role="menuitem" onClick={() => setMenu(false)}>
                Mes propositions
              </a>
              {moderateur && (
                <a href="#/admin" role="menuitem" onClick={() => setMenu(false)}>Modération</a>
              )}
              <button
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  void seDeconnecter();
                }}
              >
                Déconnexion
              </button>
            </div>
          )}
        </>
      ) : (
        <button className="authb-bouton" onClick={() => setOuvert(true)}>
          {t.seConnecter}
        </button>
      )}

      {ouvert && !connecte && (
        <div className="authb-voile" onClick={() => setOuvert(false)}>
          {/* PAR-DESSUS, PAS UNE PAGE À PART : la carte reste visible derrière,
              donc on ne perd pas l'endroit où l'on se trouvait. */}
          <div
            className="authb-panneau"
            role="dialog"
            aria-modal="true"
            aria-label={t.connexion}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="authb-fermer" onClick={() => setOuvert(false)} aria-label={t.fermer}>
              ×
            </button>
            <h2>{t.connexion}</h2>
            <p className="authb-usage">{t.usageConnexion}</p>

            {/* GOOGLE EN PREMIER, ET C'EST DE L'ARITHMÉTIQUE : le lien par
                courriel est plafonné à cent envois par jour pour le site
                entier. Google n'a pas cette limite. */}
            <button className="authb-google" onClick={() => void parGoogle()}>
              {t.continuerGoogle}
            </button>

            <div className="authb-ou"><span>{t.ou}</span></div>

            {envoi === 'parti' ? (
              <p className="authb-parti">{t.lienParti}</p>
            ) : (
              <form onSubmit={(e) => void parCourriel(e)}>
                <label htmlFor="authb-email">{t.tonAdresse}</label>
                <input
                  id="authb-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="toi@exemple.com"
                  autoComplete="email"
                  required
                />
                <button type="submit" disabled={envoi === 'envoi'}>
                  {envoi === 'envoi' ? t.envoiEnCours : t.recevoirLien}
                </button>
              </form>
            )}

            {message && <p className="authb-message">{message}</p>}

            {/* LA LIGNE SUR LES DONNÉES EST UNE PROMESSE, pas une mention
                légale : elle dit ce que le site fait, et le site le tient. */}
            <p className="authb-donnees">{t.promesseDonnees}</p>
          </div>
        </div>
      )}
    </div>
  );
}
