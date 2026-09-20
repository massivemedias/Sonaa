/* LA REPONSE D'AUDD, RAMENEE A CE QUE LA PAGE AFFICHE.
 *
 * Ce module est volontairement dans `src/` et non dans `worker/` alors que
 * c'est la passerelle qui l'appelle : il ne depend de rien, il se teste avec
 * le reste du site, et la passerelle l'importe. Une copie de chaque cote
 * aurait diverge au premier champ ajoute.
 *
 * ON NE REND PAS CE QU'AUDD ENVOIE. Sa reponse porte des dizaines de champs,
 * dont des identifiants de plateformes et des minutages. La page a besoin de
 * cinq choses ; le reste ne traverse pas la passerelle, ce qui evite de
 * publier par accident un champ qu'on n'a pas lu.
 *
 * TROIS FORMES DE REPONSE, ET AUCUNE N'EST UNE ERREUR.
 * 1. Un morceau reconnu.
 * 2. `result` a null : AudD a bien repondu, il n'a pas reconnu. C'est le cas
 *    le plus frequent sur une radio qui parle, et il se dit a l'ecran.
 * 3. Un statut d'erreur : quota depasse, jeton invalide. La page n'affiche
 *    alors rien du tout cote morceau, et le style reste, lui, disponible. */

export interface MorceauReconnu {
  readonly artiste: string;
  readonly titre: string;
  readonly album: string | null;
  readonly pochette: string | null;
  readonly liens: readonly { readonly nom: string; readonly url: string }[];
}

const texte = (x: unknown): string => (typeof x === 'string' ? x.trim() : '');

/* LA POCHETTE ET LES LIENS VIENNENT DES PLATEFORMES, ET ELLES SONT
   FACULTATIVES : AudD ne les rend que si on les a demandees et qu'il les a.
   On lit Apple Music puis Spotify, dans cet ordre, et on s'arrete a la
   premiere image trouvee. */
function pochetteDe(apple: Record<string, unknown> | null, spotify: Record<string, unknown> | null): string | null {
  const art = apple?.['artwork'];
  if (art && typeof art === 'object') {
    const url = (art as Record<string, unknown>)['url'];
    if (typeof url === 'string' && url.startsWith('http')) {
      /* Apple rend un gabarit avec {w} et {h} a remplacer. Non remplace, il
         ne charge pas, et la tuile reste vide sans dire pourquoi. */
      return url.replace('{w}', '400').replace('{h}', '400').replace('{f}', 'jpg');
    }
  }
  const album = spotify?.['album'];
  if (album && typeof album === 'object') {
    const images = (album as Record<string, unknown>)['images'];
    if (Array.isArray(images)) {
      const premiere = images.find((i) => typeof (i as Record<string, unknown>)?.['url'] === 'string');
      if (premiere) return String((premiere as Record<string, unknown>)['url']);
    }
  }
  return null;
}

/** Lit une reponse d'AudD. Rend le morceau, ou null quand rien n'a ete
    reconnu ou que la reponse n'a pas la forme attendue. */
export function lireReponseAudd(brut: unknown): MorceauReconnu | null {
  if (typeof brut !== 'object' || brut === null) return null;
  const rep = brut as Record<string, unknown>;
  if (rep['status'] !== 'success') return null;
  const r = rep['result'];
  if (typeof r !== 'object' || r === null) return null;
  const res = r as Record<string, unknown>;

  const artiste = texte(res['artist']);
  const titre = texte(res['title']);
  /* SANS ARTISTE NI TITRE, IL N'Y A PAS DE MORCEAU. Une reponse qui ne porte
     qu'un minutage est une non-reconnaissance deguisee. */
  if (!artiste || !titre) return null;

  const apple = (typeof res['apple_music'] === 'object' ? res['apple_music'] : null) as Record<string, unknown> | null;
  const spotify = (typeof res['spotify'] === 'object' ? res['spotify'] : null) as Record<string, unknown> | null;

  const liens: { nom: string; url: string }[] = [];
  const lienChanson = texte(res['song_link']);
  if (lienChanson.startsWith('http')) liens.push({ nom: 'AudD', url: lienChanson });
  const urlApple = apple?.['url'];
  if (typeof urlApple === 'string' && urlApple.startsWith('http')) liens.push({ nom: 'Apple Music', url: urlApple });
  const urlsSpotify = spotify?.['external_urls'];
  if (urlsSpotify && typeof urlsSpotify === 'object') {
    const u = (urlsSpotify as Record<string, unknown>)['spotify'];
    if (typeof u === 'string' && u.startsWith('http')) liens.push({ nom: 'Spotify', url: u });
  }

  const album = texte(res['album']);
  return {
    artiste,
    titre,
    album: album || null,
    pochette: pochetteDe(apple, spotify),
    liens,
  };
}
