/* Ce que la PWA ajoute à l'écran : trois bandeaux, jamais plus d'un à la fois.

   1. Réseau absent, le plus urgent, parce qu'il explique pourquoi la
      lecture ne démarre pas. Il reste tant que la connexion manque.
   2. Nouvelle version, proposée, jamais imposée.
   3. Installation, à la deuxième visite seulement, refusable une fois pour
      toutes.

   L'ordre est une priorité, pas un empilement : trois bandeaux superposés
   sur un téléphone, c'est l'atlas qui disparaît. */

import { useEffect, useRef, useState } from 'react';
import {
  appliquerLaMiseAJour,
  dejaInstallee,
  estIOS,
  installationRefusee,
  memoriserLeRefus,
  nombreDeVisites,
  surEtatDuReseau,
  surMiseAJour,
} from '../lib/pwa.ts';
import './pwa.css';

/** L'événement Chrome, absent des types du DOM. */
interface EvenementInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaLayer() {
  const [enLigne, setEnLigne] = useState(true);
  const [majPrete, setMajPrete] = useState(false);
  /* « Plus tard » veut dire plus tard, pas jamais. Voir REPOUSSER_MS. */
  const repousse = useRef<number | null>(null);
  const [invite, setInvite] = useState<'non' | 'navigateur' | 'ios'>('non');
  const [evenement, setEvenement] = useState<EvenementInstallation | null>(null);

  useEffect(() => surEtatDuReseau(setEnLigne), []);
  useEffect(() => surMiseAJour(setMajPrete), []);

  /* ═══ « PLUS TARD » NE DOIT PAS VOULOIR DIRE « JAMAIS » ═══
   *
   * Le bouton posait simplement `majPrete` a faux, et la banniere ne
   * revenait plus : `onNeedRefresh` ne se declenche qu'une fois par version.
   * Quelqu'un qui repousse une fois reste donc sur son ancienne version tant
   * qu'il ne recharge pas la page, ce qui peut durer des jours sur un onglet
   * laisse ouvert.
   *
   * CE N'EST PAS UN DEFAUT THEORIQUE. Mika a signale que la recherche ne
   * rendait qu'un resultat pour « daome » alors qu'il y en a douze. Le code
   * etait juste et deploye : son navigateur servait la version d'avant. On a
   * cherche un defaut qui n'existait plus.
   *
   * On garde le principe qui a fait choisir `prompt` plutot que
   * `autoUpdate` : on ne remplace pas le code sous les pieds de quelqu'un
   * qui lit une fiche ou ecoute un set. Mais on redemande au bout d'une
   * demi-heure. */
  const REPOUSSER_MS = 30 * 60 * 1000;

  const repousser = (): void => {
    setMajPrete(false);
    if (repousse.current !== null) window.clearTimeout(repousse.current);
    repousse.current = window.setTimeout(() => setMajPrete(true), REPOUSSER_MS);
  };

  useEffect(
    () => () => {
      if (repousse.current !== null) window.clearTimeout(repousse.current);
    },
    []
  );

  /* L'invite d'installation. Conditions cumulatives : deuxième visite au
     moins, pas déjà installée, pas déjà refusée. */
  useEffect(() => {
    if (dejaInstallee() || installationRefusee() || nombreDeVisites() < 2) return;

    if (estIOS()) {
      /* Safari n'expose aucun événement d'installation : sur iOS, ajouter à
         l'écran d'accueil est un geste manuel. Expliquer ce geste est tout
         ce qu'on peut faire, et c'est mieux que se taire. */
      setInvite('ios');
      return;
    }

    const capter = (e: Event) => {
      e.preventDefault(); // sinon Chrome affiche sa propre barre, en double
      setEvenement(e as EvenementInstallation);
      setInvite('navigateur');
    };
    window.addEventListener('beforeinstallprompt', capter);
    return () => window.removeEventListener('beforeinstallprompt', capter);
  }, []);

  function refuser() {
    memoriserLeRefus();
    setInvite('non');
  }

  async function installer() {
    if (!evenement) return;
    await evenement.prompt();
    await evenement.userChoice;
    /* Quel que soit le choix, on ne redemande pas : accepté, l'invite n'a
       plus lieu d'être ; refusé, insister serait du harcèlement. */
    memoriserLeRefus();
    setInvite('non');
  }

  if (!enLigne) {
    return (
      <div className="pwa-bandeau pwa-bandeau-alerte" role="status">
        <p>
          <strong>Hors ligne.</strong> L&apos;atlas, les fiches et les listes restent
          consultables. L&apos;écoute, elle, a besoin du réseau : les tracks sont jouées par
          le lecteur YouTube et ne sont pas stockées ici.
        </p>
      </div>
    );
  }

  if (majPrete) {
    return (
      <div className="pwa-bandeau" role="status">
        <p>Une nouvelle version de l&apos;atlas est prête.</p>
        <span className="pwa-actions">
          <button className="pwa-bouton-principal" onClick={() => void appliquerLaMiseAJour()}>
            Mettre à jour
          </button>
          <button className="pwa-bouton" onClick={repousser}>
            Plus tard
          </button>
        </span>
      </div>
    );
  }

  if (invite === 'navigateur') {
    return (
      <div className="pwa-bandeau" role="status">
        <p>Installer SONAA pour l&apos;ouvrir hors ligne, sans barre de navigateur.</p>
        <span className="pwa-actions">
          <button className="pwa-bouton-principal" onClick={() => void installer()}>
            Installer
          </button>
          <button className="pwa-bouton" onClick={refuser}>
            Non merci
          </button>
        </span>
      </div>
    );
  }

  if (invite === 'ios') {
    return (
      <div className="pwa-bandeau" role="status">
        <p>
          Pour garder SONAA sur votre écran d&apos;accueil : touchez{' '}
          <span className="pwa-geste" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M12 2 8.5 5.5l1.4 1.4L11 5.8V15h2V5.8l1.1 1.1 1.4-1.4L12 2Z" />
              <path d="M5 11v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9h-2v9H7v-9H5Z" />
            </svg>
          </span>
          <span className="pwa-geste-mot">Partager</span> en bas de l&apos;écran, puis{' '}
          <strong>Sur l&apos;écran d&apos;accueil</strong>.
        </p>
        <span className="pwa-actions">
          <button className="pwa-bouton" onClick={refuser}>
            Compris
          </button>
        </span>
      </div>
    );
  }

  return null;
}
