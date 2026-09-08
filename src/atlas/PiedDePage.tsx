/* LE PIED DE PAGE.

   LES « AUTRES VUES » N'Y SONT PLUS. Le pied a longtemps servi de refuge a
   ce qui avait quitte le menu : la carte en trois dimensions, l'arbre
   deploye, la chronologie, la carte de chaleur. Mika les a retirees d'ici
   aussi, sur capture : quatre portes que personne ne pousse, sous un titre
   qui promettait autre chose. Elles ne sont pas supprimees, leurs adresses
   repondent toujours ; elles ne sont simplement plus proposees nulle part.
   C'est la meme decision que pour le menu, un cran plus loin.

   L'index a plat reste, sous « Parcourir » : c'est la liste des 219 genres,
   une porte de premiere classe et non une vue de plus.

   LES LIENS SONT VERIFIES, PAS DECORATIFS. Chaque adresse ci-dessous repond
   aujourd'hui. Un pied rempli de liens morts fait plus de mal qu'un pied
   vide : il apprend a ne plus rien y chercher. */

import { t } from '../langue/langue.ts';
import { PROPOSITIONS_OUVERTES } from '../lib/config.ts';
import './pied.css';

interface Lien {
  readonly href: string;
  readonly label: string;
  readonly externe?: boolean;
}

interface Colonne {
  readonly titre: string;
  readonly liens: readonly Lien[];
}

export function PiedDePage() {
  const colonnes: Colonne[] = [
    {
      titre: t.piedParcourir,
      liens: [
        /* Le Calendar d'abord, comme dans le menu du haut : c'est la page d'accueil. */
        { href: '#/calendrier', label: t.leCalendrier },
        { href: '#/parcourir', label: t.lesStyles },
        { href: '#/sets', label: t.lesSons },
        { href: '#/index', label: t.piedIndex },
      ],
    },
    {
      titre: t.piedParticiper,
      liens: [
        { href: '#/profil', label: t.monProfil },
        /* Les propositions sont fermees pour l'instant : voir lib/config.ts. */
        ...(PROPOSITIONS_OUVERTES ? [{ href: '#/propositions', label: t.piedPropositions }] : []),
      ],
    },
    {
      titre: t.piedLeProjet,
      liens: [
        { href: '#/a-propos', label: t.aPropos },
        { href: '#/credits', label: t.credits },
        /* Le jeu ne figure plus ici non plus, meme raison que dans la barre
           de navigation : il reste en ligne, il n'est plus annonce. */
        {
          href: 'https://github.com/massivemedias/Sonaa',
          label: t.piedCode,
          externe: true,
        },
      ],
    },
  ];

  return (
    <footer className="pied">
      <div className="pied-colonnes">
        {colonnes.map((c) => (
          <nav className="pied-colonne" key={c.titre} aria-label={c.titre}>
            <h2>{c.titre}</h2>
            <ul>
              {c.liens.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    {...(l.externe ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <p className="pied-mot">{t.piedMot}</p>
    </footer>
  );
}
