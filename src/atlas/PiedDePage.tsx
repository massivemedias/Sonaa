/* LE PIED DE PAGE : LA SIGNATURE DU SITE, PAS UNE LISTE DE LIENS.
 *
 * Mika, le 14 septembre 2026 : « c'est trop simple comme ca, peut-etre aussi
 * le logo Sonaa, et le nombre de visiteurs live sur le site ». Le pied
 * n'etait que trois colonnes de liens. Il porte maintenant, en tete, le
 * logo, une phrase qui dit ce qu'est SONAA, et le nombre de personnes sur
 * le site a cet instant (voir presence.ts) ; puis les colonnes ; puis une
 * ligne de bas : fait a Montreal, l'annee, les 219 genres.
 *
 * LES « AUTRES VUES » N'Y SONT PAS. Le pied a longtemps servi de refuge a
 * ce qui avait quitte le menu : la carte en trois dimensions, l'arbre
 * deploye, la chronologie, la carte de chaleur. Mika les a retirees d'ici
 * aussi, sur capture : quatre portes que personne ne pousse. Elles ne sont
 * pas supprimees, leurs adresses repondent toujours ; elles ne sont
 * simplement plus proposees nulle part. L'index a plat reste : c'est la
 * liste des 219 genres, une porte de premiere classe.
 *
 * LES LIENS SONT VERIFIES, PAS DECORATIFS. Chaque adresse ci-dessous repond
 * aujourd'hui. Un pied rempli de liens morts fait plus de mal qu'un pied
 * vide : il apprend a ne plus rien y chercher. */

import { t } from '../langue/langue.ts';
import { PROPOSITIONS_OUVERTES } from '../lib/config.ts';
import { usePresence } from '../lib/presence.ts';
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
  const presence = usePresence();
  const presents = presence.n;
  /* LES VILLES, LES TROIS PLUS NOMBREUSES : « Montréal 3, Paris 1 ». */
  const villes = presence.villes.slice(0, 3).map((v) => (v.n > 1 ? `${v.ville} ${v.n}` : v.ville)).join(', ');

  const colonnes: Colonne[] = [
    {
      titre: t.piedParcourir,
      liens: [
        { href: '#/calendrier', label: t.leCalendrier },
        { href: '#/news', label: t.leNews },
        { href: '#/parcourir', label: t.lesStyles },
        { href: '#/mixtapes', label: t.lesMixtapes },
        { href: '#/tracks', label: t.lesTracks },
        { href: '#/reconnaitre', label: t.reconnaitre },
        { href: '#/index', label: t.piedIndex },
      ],
    },
    {
      titre: t.piedParticiper,
      liens: [
        { href: '#/calendrier', label: t.piedAjouterEvenement },
        { href: '#/profil/sets', label: t.piedDeposerMixtape },
        { href: '#/profil', label: t.monProfil },
        ...(PROPOSITIONS_OUVERTES ? [{ href: '#/propositions', label: t.piedPropositions }] : []),
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
        /* LES TROIS PAGES LEGALES SONT DANS LE PIED, ET SUR TOUTES LES PAGES.
           C'est le seul endroit ou on les cherche, et elles doivent etre
           joignables de partout des lors qu'un compte existe : la loi 25 du
           Quebec ne s'applique pas qu'aux pages qui vendent. */
        { href: '#/conditions', label: t.conditionsTitre },
        { href: '#/confidentialite', label: t.confidentialiteTitre },
        { href: '#/mentions', label: t.mentionsTitre },
      ],
    },
  ];

  return (
    <footer className="pied">
      {/* LA TETE : le logo, la phrase, et qui est la. Le logo est celui de
          l'en-tete, en plus grand : c'est la seule fois ou il a la place. */}
      <div className="pied-tete">
        <a href="#/calendrier" className="pied-logo" aria-label="SONAA">
          <img src={`${import.meta.env.BASE_URL}brand/sonaa-logo.png`} alt="SONAA" />
        </a>
        <p className="pied-slogan">{t.piedSlogan}</p>
        {presents > 0 && (
          <p className="pied-presence" role="status">
            <span className="pied-pouls" aria-hidden="true" />
            {presents === 1 ? t.piedSeul : t.piedEnCeMoment(presents)}
            {villes && <span className="pied-villes">{villes}</span>}
          </p>
        )}
      </div>

      <div className="pied-colonnes">
        {colonnes.map((c) => (
          <nav className="pied-colonne" key={c.titre} aria-label={c.titre}>
            <h2>{c.titre}</h2>
            <ul>
              {c.liens.map((l) => (
                <li key={l.href + l.label}>
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

      <div className="pied-bas">
        <p className="pied-mot">{t.piedMot}</p>
        <p className="pied-signature">
          {t.piedVille} · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
