/* L'AFFICHE D'UNE SOIREE QUI N'EN A PAS.
 *
 * Mika, le 30 septembre 2026 : « donne une image aux soirees sans affiche ».
 * Une soiree sur dix arrive sans image, et sa carte montrait un bloc vide a
 * l'endroit exact ou l'oeil cherche : on lisait un trou, pas une soiree.
 *
 * L'IMAGE EST FAITE DE SES DONNEES, ET DE RIEN D'AUTRE. C'est la regle de
 * DESIGN.md : une image porte une donnee, ou n'existe pas. Pas de photo
 * d'illustration prise ailleurs, pas de motif : le jour en tres gros, le
 * mois, l'heure, la salle et le style annonce, sur la teinte de la famille
 * de ce style (voir teinte-soiree.ts). Une soiree sans style reste dans le
 * granite du site.
 *
 * ELLE REMPLACE AUSSI UNE IMAGE QUI NE VIENT PAS. Une affiche annoncee dont
 * le serveur ne repond plus laissait un cadre casse ; `ImageDeSoiree` bascule
 * alors sur l'affiche dessinee, sans un mot. */

import { useState, type CSSProperties } from 'react';
import type { Soiree } from '../lib/agenda.ts';
import { heureLocale } from '../lib/villes.ts';
import { langue } from '../langue/langue.ts';
import { teinteDesStyles } from './teinte-soiree.ts';

const LOCALE = langue === 'fr' ? 'fr-CA' : 'en-CA';

/** Le jour de la soiree, lu dans sa date nue : il est deja local a la salle,
    lui appliquer un fuseau le decalerait. */
function partiesDuJour(date: string): { semaine: string; jour: string; mois: string } {
  const [a, m, j] = date.slice(0, 10).split('-').map(Number);
  const d = new Date(a ?? 1970, (m ?? 1) - 1, j ?? 1);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, o).format(d).replace(/\.$/, '');
  return { semaine: f({ weekday: 'short' }), jour: String(d.getDate()), mois: f({ month: 'short' }) };
}

type Variante = 'carte' | 'ligne' | 'fiche';

export function AfficheGeneree({ soiree, fuseau, variante }: { soiree: Soiree; fuseau: string; variante: Variante }) {
  const teinte = teinteDesStyles(soiree.genres);
  const { semaine, jour, mois } = partiesDuJour(soiree.date);
  const heure = soiree.debut ? heureLocale(soiree.debut, fuseau) : null;
  /* LA TEINTE EST UNE DONNEE, LE CHROMA AUSSI : sans famille, le chroma
     tombe a celui du granite, et la carte ne pretend a aucun style. */
  const style = {
    '--gen-teinte': teinte ?? 70,
    '--gen-chroma': teinte === null ? 0.004 : 0.07,
    '--gen-chroma-encre': teinte === null ? 0.006 : 0.09,
  } as CSSProperties;

  if (variante === 'ligne') {
    return (
      <div className="cal-gen cal-gen-ligne" style={style} data-neutre={teinte === null} aria-hidden="true">
        <span className="cal-gen-jour">{jour}</span>
      </div>
    );
  }
  /* DEUX BOITES ET NON UNE : les tailles suivent la largeur de l'affiche, en
     unites de conteneur, et une boite ne peut pas se mesurer elle-meme. La
     boite exterieure est le conteneur, l'interieure se dessine dedans. */
  return (
    <div className={`cal-gen cal-gen-${variante}`} style={style} data-neutre={teinte === null} aria-hidden="true">
      <span className="cal-gen-dedans">
        <span className="cal-gen-haut">
          <span className="cal-gen-semaine">{semaine}</span>
          {heure && <span className="cal-gen-heure">{heure}</span>}
        </span>
        <span className="cal-gen-jour">{jour}</span>
        <span className="cal-gen-mois">{mois}</span>
        <span className="cal-gen-bas">
          {soiree.lieu && <span className="cal-gen-lieu">{soiree.lieu}</span>}
          {soiree.genres[0] && <span className="cal-gen-style">{soiree.genres[0]}</span>}
        </span>
      </span>
    </div>
  );
}

/** L'affiche de la soiree si elle vient, l'affiche dessinee sinon. */
export function ImageDeSoiree({
  soiree,
  fuseau,
  variante,
  className,
}: {
  soiree: Soiree;
  fuseau: string;
  variante: Variante;
  className: string;
}) {
  const [echec, setEchec] = useState(false);
  if (!soiree.affiche || echec) return <AfficheGeneree soiree={soiree} fuseau={fuseau} variante={variante} />;
  return (
    <img
      className={className}
      src={soiree.affiche}
      alt=""
      /* CHARGEMENT DIFFERE : RA sert ses originaux, un a deux megaoctets
         piece, et ignore tout parametre de redimensionnement. */
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setEchec(true)}
    />
  );
}
