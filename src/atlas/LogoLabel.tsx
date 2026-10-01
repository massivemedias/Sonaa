/* LE LOGO D'UN LABEL, partout ou un label se montre : la galerie, sa fiche,
 * et la ligne « Labels » de la fiche d'un style. Une seule regle de rendu,
 * pour qu'un label se reconnaisse d'une page a l'autre. */

import { useState } from 'react';
import './logo-label.css';

/* ═══ LE LOGO ═══ Sur une plaque claire : la plupart des logos sont noirs
   sur fond transparent, et disparaitraient sur le granite sombre. Sans logo,
   un monogramme : les initiales du label, sur une teinte tiree de son nom,
   pour que deux labels sans logo ne se ressemblent pas. */
const teinteDuNom = (nom: string): number => {
  let h = 0;
  for (let i = 0; i < nom.length; i += 1) h = (h * 31 + nom.charCodeAt(i)) % 360;
  return h;
};
const initiales = (nom: string): string =>
  nom
    .replace(/\b(records?|recordings|music|label|ltd|inc)\b/gi, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? '')
    .join('') || nom.slice(0, 2).toUpperCase();

export function LogoLabel({ nom, url, taille = 'normal' }: { nom: string; url: string | null | undefined; taille?: 'petit' | 'normal' | 'grand' }) {
  const [casse, setCasse] = useState(false);
  if (url && !casse) {
    /* UNE IMAGE DE DISCOGS EST UNE VIGNETTE CARREE, souvent avec son propre
       fond : elle remplit la tuile. Un logo de Commons est un dessin sur fond
       transparent : il se pose sur la plaque, avec de l'air autour. */
    const commons = url.includes('wikimedia.org');
    return (
      <span className={`lb-logo${commons ? '' : ' lb-logo-image'}${taille === 'normal' ? '' : ` lb-logo-${taille}`}`}>
        <img src={url} alt={nom} loading="lazy" onError={() => setCasse(true)} />
      </span>
    );
  }
  return (
    <span
      className={`lb-logo lb-logo-monogramme${taille === 'normal' ? '' : ` lb-logo-${taille}`}`}
      style={{ ['--lb-teinte' as string]: String(teinteDuNom(nom)) }}
      aria-hidden="true"
    >
      {initiales(nom)}
    </span>
  );
}
