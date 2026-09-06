/* LE SELECTEUR DE LANGUE : deux mots, dans la barre du haut.
 *
 * ═══ POURQUOI DEUX BOUTONS ET NON UNE BASCULE ═══
 *
 * Une bascule montre UN etat et cache l'autre : le bouton dit « EN », et on
 * ne sait pas s'il annonce la langue en cours ou celle vers laquelle il
 * emmene. C'est le defaut classique de l'interrupteur nomme par sa
 * destination, et il coute un clic pour comprendre, plus un autre pour
 * revenir. Deux mots cote a cote montrent les deux possibilites et laquelle
 * est active : il n'y a plus rien a deviner.
 *
 * ═══ TANT QUE RIEN N'EST CHOISI, RIEN N'EST ALLUME ═══
 *
 * Le site s'affiche dans la langue du navigateur avant qu'on ait rien
 * demande. Allumer « FR » a ce moment-la affirmerait un choix que personne
 * n'a fait, et rendrait le bouton mort au clic pour qui le presserait afin de
 * le confirmer. Tant que la personne n'a pas tranche, les deux mots sont
 * eteints et les deux repondent.
 *
 * ═══ CE COMPOSANT NE TRADUIT RIEN ═══
 *
 * « FR » et « EN » ne sont pas des mots d'interface, ce sont des codes de
 * langue : ils s'ecrivent pareil dans les deux dictionnaires, et les faire
 * passer par la traduction reviendrait a inventer un cas ou ils differeraient.
 * Seules les etiquettes lues par les lecteurs d'ecran sont traduites, parce
 * qu'elles, ce sont des phrases.
 */

import { choisirLangue, langue, langueEstChoisie, t } from '../langue/langue.ts';
import './choix-langue.css';

export function ChoixLangue() {
  const bouton = (code: 'fr' | 'en', libelle: string) => {
    const actif = langueEstChoisie && langue === code;
    return (
      <button
        type="button"
        className="choixlangue-bouton"
        onClick={() => choisirLangue(code)}
        aria-current={actif ? 'true' : undefined}
        data-actif={actif}
        lang={code}
        title={libelle}
        aria-label={libelle}
      >
        {code.toUpperCase()}
      </button>
    );
  };

  return (
    <div className="choixlangue" role="group" aria-label={t.choixDeLangue}>
      {bouton('fr', t.enFrancais)}
      <span className="choixlangue-barre" aria-hidden="true" />
      {bouton('en', t.enAnglais)}
    </div>
  );
}
