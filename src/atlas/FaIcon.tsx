/* L'ICONE, DEFINIE UNE SEULE FOIS POUR TOUT LE SITE.

   Elle vivait dans AtlasPage, ou seuls les boutons de la carte s'en
   servaient. Le lecteur, lui, dessinait son transport avec des CARACTERES
   bruts : precedent, lecture et suivant etaient des glyphes de police, de
   graisses differentes, d'alignements differents, et sans rapport visuel avec
   les icones du reste de l'ecran. Sur un telephone, ou ces trois boutons sont
   la commande la plus utilisee, ca se voyait immediatement.

   Une seule definition, donc, et le meme trait partout. Aucun paquet
   supplementaire : le glyphe est un chemin SVG pose en ligne, il herite de
   currentColor et n'appelle rien au chargement. */

import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

export function FaIcon({ icon, className = 'fa-icon' }: { icon: IconDefinition; className?: string }) {
  const [w, h, , , path] = icon.icon;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden="true" focusable="false">
      <path fill="currentColor" d={Array.isArray(path) ? path.join(' ') : path} />
    </svg>
  );
}
