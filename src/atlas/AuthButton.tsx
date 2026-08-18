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
import './auth-button.css';

/* L'ENDROIT EXACT QUITTÉ, capturé AVANT tout départ.

   Google redirige, le lien magique passe par une boîte mail : les deux
   quittent la page. Ce qui n'est pas écrit avant le départ n'existe plus au
   retour. On capture donc le fragment complet, qui porte le genre ouvert. */
const iciMeme = (): string => window.location.hash || '#/';

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

  return (
    <div className="authb" ref={boite}>
      {connecte ? (
        <>
          <button
            className="authb-bouton"
            onClick={() => setMenu((m) => !m)}
            aria-expanded={menu}
            aria-haspopup="menu"
          >
            {pseudo ?? '…'}
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
          Se connecter
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
            aria-label="Connexion"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="authb-fermer" onClick={() => setOuvert(false)} aria-label="Fermer">
              ×
            </button>
            <h2>Connexion</h2>
            <p className="authb-usage">
              Connecte-toi pour proposer des morceaux, voter et commenter.
            </p>

            {/* GOOGLE EN PREMIER, ET C'EST DE L'ARITHMÉTIQUE : le lien par
                courriel est plafonné à cent envois par jour pour le site
                entier. Google n'a pas cette limite. */}
            <button className="authb-google" onClick={() => void parGoogle()}>
              Continuer avec Google
            </button>

            <div className="authb-ou"><span>ou</span></div>

            {envoi === 'parti' ? (
              <p className="authb-parti">
                Un lien de connexion vient de partir. Ouvre-le depuis ce navigateur,
                tu reviendras exactement ici.
              </p>
            ) : (
              <form onSubmit={(e) => void parCourriel(e)}>
                <label htmlFor="authb-email">Ton adresse</label>
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
                  {envoi === 'envoi' ? 'Envoi…' : 'Recevoir un lien'}
                </button>
              </form>
            )}

            {message && <p className="authb-message">{message}</p>}

            {/* LA LIGNE SUR LES DONNÉES EST UNE PROMESSE, pas une mention
                légale : elle dit ce que le site fait, et le site le tient. */}
            <p className="authb-donnees">
              Aucun mot de passe, jamais. Ton pseudonyme public est calculé de façon
              non réversible : ton adresse n'est affichée nulle part, ni pour toi ni
              pour les autres.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
