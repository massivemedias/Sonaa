/* LE PIED DE PAGE.

   IL RASSEMBLE CE QUI A ETE RETIRE DU MENU SANS ETRE SUPPRIME. Cinq vues
   existent encore et repondent a leur adresse : la carte en trois dimensions,
   la chronologie, la carte de chaleur, l'arbre deploye, l'index a plat. Elles
   ont quitte la navigation parce qu'elle demandait de choisir avant de
   savoir, et depuis elles n'etaient plus atteignables que par quelqu'un qui
   connaissait l'adresse. Un pied de page est exactement l'endroit ou vivent
   les portes secondaires.

   LES LIENS SONT VERIFIES, PAS DECORATIFS. Chaque adresse ci-dessous repond
   aujourd'hui. Un pied rempli de liens morts fait plus de mal qu'un pied
   vide : il apprend a ne plus rien y chercher. */

import { t } from '../langue/langue.ts';
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
        { href: '#/parcourir', label: t.lesStyles },
        { href: '#/sets', label: t.lesSons },
        { href: '#/index', label: t.piedIndex },
      ],
    },
    {
      titre: t.piedAutresVues,
      liens: [
        { href: '#/carte', label: t.piedCarte },
        { href: '#/arbre', label: t.piedArbre },
        { href: '#/chronologie', label: t.piedChronologie },
        { href: '#/heatmap', label: t.piedChaleur },
      ],
    },
    {
      titre: t.piedParticiper,
      liens: [
        { href: '#/profil', label: t.monProfil },
        { href: '#/propositions', label: t.piedPropositions },
      ],
    },
    {
      titre: t.piedLeProjet,
      liens: [
        { href: '#/a-propos', label: t.aPropos },
        { href: '#/credits', label: t.credits },
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
