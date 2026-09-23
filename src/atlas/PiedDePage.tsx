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
  /* LA PREMIERE VILLE SEULEMENT, SANS SON COMPTE : « 2 en ligne · Tripoli ».
     Mika, le 22 septembre 2026, apres avoir vu le pied casser a 1240 px en
     francais : la phrase entiere et trois villes chiffrees prenaient 282 px
     dans une rangee ou il n'en restait plus. Le nombre et une ville disent
     la meme chose en 110. */
  const ville = presence.villes[0]?.ville ?? '';

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
     dans un pied de page en sachant d'avance qu'elle y est.

     EN TITRES COURTS : « Conditions », « Confidentialité », « Mentions ».
     Les titres complets font 371 px a eux trois en francais, les courts 190.
     Ils restent entiers sur les pages elles-memes et dans le menu « Plus »,
     ou la place ne manque pas. */
  const legal: readonly Lien[] = [
    { href: '#/conditions', label: t.conditionsCourt },
    { href: '#/confidentialite', label: t.confidentialiteCourt },
    { href: '#/mentions', label: t.mentionsCourt },
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
      {/* UNE SEULE RANGEE, TROIS GROUPES. Le nom a gauche, la presence au
          milieu, les sept liens a droite. La presence etait une ligne a elle
          seule au-dessus ; elle tient dans la meme rangee, reduite, et le
          pied passe de 247 px a 56. */}
      <div className="pied-ligne">
        <span className="pied-nom">SONAA {new Date().getFullYear()}</span>

        {/* ELLE RESTE LA SEULE CHOSE DU PIED QUI CHANGE D'UNE MINUTE A
            L'AUTRE, donc la seule qu'on regarde. Absente quand il n'y a
            personne : une pastille qui annonce zero est du bruit. */}
        {presents > 0 && (
          <p className="pied-presence" role="status">
            <span className="pied-pouls" aria-hidden="true" />
            {t.piedEnLigne(presents)}
            {ville && <span className="pied-villes">{ville}</span>}
          </p>
        )}

        {/* LES SEPT LIENS EN UN SEUL GROUPE. Ils etaient en deux navigations,
            l'une pour les gestes et l'autre pour le legal, ce qui se
            justifiait sur trois colonnes. Sur une seule rangee, deux groupes
            cote a cote ne se distinguent plus : ils n'en font qu'un, et le
            legal garde son cran de gris. */}
        <nav className="pied-liens" aria-label={t.navigationDuSite}>
          {centre.map(lien)}
          {legal.map((l) => (
            <a key={l.href} href={l.href} className="pied-lien-legal">
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
