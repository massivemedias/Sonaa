/* Pont entre une vue secondaire et l'atlas.

   Les vues hors WebGL (index, chronologie, chaleur) ne peuvent pas ouvrir une
   fiche elles-mêmes : le lecteur et le moteur vivent dans AtlasPage, et un
   changement de route vers l'atlas recharge la page (le contexte WebGL ne se
   démonte pas proprement). On écrit donc la cible AVANT le départ, et
   l'atlas la consomme à l'arrivée.

   sessionStorage, pas l'adresse : l'atlas n'a pas de deep-link de genre, et
   on n'en invente pas ici. La clé est lue une fois, puis effacée, pour qu'un
   rechargement ultérieur n'ouvre pas le même genre à l'infini. */

const CLE = 'sonaa-ouvrir';

interface CibleGenre {
  familyIndex: number;
  genreLocal: number;
}

function memoriserOuverture(cible: CibleGenre): void {
  try {
    sessionStorage.setItem(CLE, JSON.stringify(cible));
  } catch {
    /* navigation privée : on ira à l'atlas sans cible, jamais cassé. */
  }
}

export function consommerOuverture(): CibleGenre | null {
  let brut: string | null = null;
  try {
    brut = sessionStorage.getItem(CLE);
    if (brut) sessionStorage.removeItem(CLE);
  } catch {
    return null;
  }
  if (!brut) return null;
  try {
    const v = JSON.parse(brut) as unknown;
    if (
      v !== null &&
      typeof v === 'object' &&
      'familyIndex' in v &&
      'genreLocal' in v &&
      typeof (v as CibleGenre).familyIndex === 'number' &&
      typeof (v as CibleGenre).genreLocal === 'number'
    ) {
      return v as CibleGenre;
    }
  } catch {
    return null;
  }
  return null;
}

/** Écrit la cible et ramène à l'atlas. Le routeur recharge en passant la
    frontière WebGL ; si l'on y est déjà, on recharge soi-même. */
export function ouvrirDansAtlas(familyIndex: number, genreLocal: number): void {
  memoriserOuverture({ familyIndex, genreLocal });
  const hash = window.location.hash;
  const dejaAtlas = hash === '' || hash === '#' || hash === '#/';
  if (dejaAtlas) {
    window.location.reload();
    return;
  }
  window.location.hash = '#/';
}
