/* LE PIED DE PAGE : UNE LIGNE, ET LA PRESENCE AU-DESSUS.
 *
 * Il a porte trois colonnes et seize liens, c'est-a-dire un second menu, plus
 * fourni que le vrai. Mika, le 21 septembre 2026 : « trop lourd, reduis a une
 * ligne ». Ce qui disparait n'est pas supprime du site, c'est exactement ce
 * qui vit deja dans la rangee du haut ou dans le bouton « Plus » du
 * telephone : Calendrier, News, Styles, Mixtapes, le profil. L'index a plat
 * des 219 genres part avec eux et rejoint la page des styles, d'ou on le
 * cherche vraiment.
 *
 * TROIS GROUPES, ET AUCUN N'EST DECORATIF. A gauche le nom et l'annee, qui
 * disent qui edite et depuis quand. Au centre ce qu'on ne trouve pas dans le
 * menu : les deux gestes de contribution, la page du projet, le code. A
 * droite le legal, seul, parce que c'est la seule chose qu'on vient chercher
 * dans un pied en sachant d'avance qu'elle y est.
 *
 * LES LIENS SONT VERIFIES, PAS DECORATIFS. Un pied rempli de liens morts fait
 * plus de mal qu'un pied vide : il apprend a ne plus rien y chercher. */

import { t } from '../langue/langue.ts';
import { PROPOSITIONS_OUVERTES } from '../lib/config.ts';
import { usePresence } from '../lib/presence.ts';
import './pied.css';

interface Lien {
  readonly href: string;
  readonly label: string;
  readonly externe?: boolean;
}

export function PiedDePage() {
  const presence = usePresence();
  const presents = presence.n;
  /* LES VILLES, LES TROIS PLUS NOMBREUSES : « Montréal 3, Paris 1 ». */
  const villes = presence.villes.slice(0, 3).map((v) => (v.n > 1 ? `${v.ville} ${v.n}` : v.ville)).join(', ');

  /* AU CENTRE, CE QU'ON NE TROUVE PAS DANS LE MENU. Les sections du site,
     Calendrier, News, Styles, Mixtapes, sont toutes dans la rangee du haut ou
     dans le bouton « Plus » du telephone : les redire ici doublait seize liens
     sans en ajouter un seul. Le micro, lui, n'a jamais eu de lien ici et n'en
     prend pas : il s'ouvre depuis le haut de l'atlas.

     TRACKS ET LE PANIER N'ONT JAMAIS EU DE LIEN ICI NON PLUS, et c'est
     pourquoi la fermeture de la vente ne change rien a ce fichier : il n'y
     avait rien a retirer. Voir src/config.ts. Restent les deux gestes de
     contribution, la page qui explique le projet, et le code. */
  const centre: readonly Lien[] = [
    { href: '#/a-propos', label: t.aPropos },
    { href: '#/calendrier', label: t.piedAjouterEvenement },
    { href: '#/profil/sets', label: t.piedDeposerMixtape },
    { href: 'https://github.com/massivemedias/Sonaa', label: t.piedCode, externe: true },
    ...(PROPOSITIONS_OUVERTES ? [{ href: '#/propositions', label: t.piedPropositions }] : []),
  ];

  /* A DROITE, LE LEGAL, ET SEUL. C'est la seule chose qu'on vient chercher
     dans un pied de page en sachant d'avance qu'elle y est. */
  const legal: readonly Lien[] = [
    { href: '#/conditions', label: t.conditionsTitre },
    { href: '#/confidentialite', label: t.confidentialiteTitre },
    { href: '#/mentions', label: t.mentionsTitre },
  ];

  const lien = (l: Lien) => (
    <a
      key={l.href + l.label}
      href={l.href}
      {...(l.externe ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
    >
      {l.label}
    </a>
  );

  return (
    <footer className="pied">
      {/* LA PRESENCE RESTE, ET SEULE AU-DESSUS. C'est la seule ligne du pied
          qui change d'une minute a l'autre, donc la seule qu'on regarde. */}
      {presents > 0 && (
        <p className="pied-presence" role="status">
          <span className="pied-pouls" aria-hidden="true" />
          {presents === 1 ? t.piedSeul : t.piedEnCeMoment(presents)}
          {villes && <span className="pied-villes">{villes}</span>}
        </p>
      )}

      {/* UNE SEULE LIGNE. Le pied portait trois colonnes et seize liens,
          c'est-a-dire un second menu, plus fourni que le vrai. Mika, le
          21 septembre 2026 : « trop lourd, reduis a une ligne ». */}
      <div className="pied-ligne">
        <span className="pied-nom">SONAA {new Date().getFullYear()}</span>
        <nav className="pied-liens" aria-label={t.navigationDuSite}>
          {centre.map(lien)}
        </nav>
        <nav className="pied-legal" aria-label={t.mentionsTitre}>
          {legal.map(lien)}
        </nav>
      </div>
    </footer>
  );
}
