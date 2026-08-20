/* LE PRELUDE DE TOUT BANC : la page est-elle vraiment la ?
 *
 * QUATRE MORTS DU SERVEUR DE DEVELOPPEMENT EN UNE SEMAINE, et la quatrieme a
 * fausse une conclusion. Le banc a mesure « zero case, zero graduation, zero
 * trait » sur une page d'erreur du navigateur, et ce zero ressemblait
 * exactement a une mesure : meme format, meme precision, meme air de verite.
 *
 * C'EST LE PIRE RESULTAT POSSIBLE. Un banc qui plante se voit. Un banc qui rend
 * zero se croit. On cherche alors un defaut dans un produit qu'on n'a pas
 * charge, et rien dans le rendu ne dit qu'on se trompe de sujet.
 *
 * D'OU CE PRELUDE, obligatoire avant toute mesure. Il verifie deux choses et
 * s'arrete BRUYAMMENT si l'une manque :
 *
 *   1. le serveur repond ;
 *   2. la page porte le MARQUEUR attendu, c'est-a-dire un element qui n'existe
 *      que si l'application a demarre. Un serveur qui repond une page blanche,
 *      une erreur de compilation ou un 404 passe le premier test et echoue au
 *      second, ce qui est exactement la distinction utile.
 *
 * Le marqueur est choisi par l'appelant, et le choix compte : prendre un
 * element qui n'apparait qu'apres une interaction fait expirer l'attente en
 * silence, ce qui ramene au probleme de depart. On prend un element present
 * des le premier rendu.
 */

/* ENTRE CHAQUE MESURE D'UNE SERIE, ET PAS SEULEMENT AU DEBUT.

   SIXIEME MORT DU SERVEUR, et celle-la a coute une session entiere plus une
   fausse alerte. Le preambule etait verifie une fois, au demarrage du banc ;
   le serveur est mort ENSUITE, au milieu d'une bissection de sept points. Les
   premiers points ont repondu, les suivants ont rendu zero, et la serie avait
   exactement l'allure d'une regression trouvee.

   `serieValide` s'intercale entre deux points d'une serie. Elle ne mesure
   rien : elle refuse que la serie continue si la page a disparu, parce qu'un
   point mesure sur un serveur mort n'invalide pas que lui, il invalide la
   COMPARAISON, donc toute la serie. */
export const serieValide = async ({ lire, marqueur, url, arreter, point }) => {
  if (!(await serveurRepond(url))) {
    console.error(
      `\nLE SERVEUR EST MORT PENDANT LA SERIE, au point « ${point} ».\n` +
        "  LA SERIE ENTIERE EST INVALIDE, y compris les points deja mesures : ce qui\n" +
        "  compte dans une serie est la COMPARAISON, et elle n'a plus de sens des qu'un\n" +
        '  seul point vient d\'un autre environnement.\n\n' +
        '  Relancer le serveur, puis relancer la serie DEPUIS LE DEBUT.\n'
    );
    arreter(2);
    return false;
  }
  const vu = await lire(`Boolean(document.querySelector(${JSON.stringify(marqueur)}))`).catch(
    () => false
  );
  if (!vu) {
    console.error(
      `\nLA PAGE A DISPARU PENDANT LA SERIE, au point « ${point} ».\n` +
        '  Meme conclusion : la serie entiere est invalide, on la reprend au debut.\n'
    );
    arreter(2);
    return false;
  }
  return true;
};

/** Le serveur de developpement repond-il ? Interne au prelude. */
const serveurRepond = async (url = 'http://localhost:5173/') => {
  try {
    const r = await fetch(url, { method: 'GET' });
    return r.ok;
  } catch {
    return false;
  }
};

/**
 * A appeler juste apres la navigation, avant toute mesure.
 * `lire` evalue une expression dans la page et rend sa valeur.
 * `marqueur` est un selecteur present des le premier rendu.
 * Rend le nombre de millisecondes attendues, ou termine le processus.
 */
export const exigerLaPage = async ({ lire, marqueur, url, arreter, msMax = 40000 }) => {
  if (!(await serveurRepond(url))) {
    console.error(
      `\nLE SERVEUR NE REPOND PAS sur ${url}.\n` +
        "  Aucune mesure n'est faite : un zero rendu ici ressemblerait a un resultat.\n" +
        '  Relancer le serveur de developpement, puis relancer ce banc.\n'
    );
    arreter(2);
    return -1;
  }

  const pas = 400;
  for (let t = 0; t <= msMax; t += pas) {
    let vu = false;
    try {
      vu = await lire(`Boolean(document.querySelector(${JSON.stringify(marqueur)}))`);
    } catch {
      vu = false;
    }
    if (vu) return t;
    await new Promise((r) => setTimeout(r, pas));
  }

  /* Le serveur repond mais l'application n'est pas la : page blanche, erreur de
     compilation, mauvaise route. On le DIT, et l'on ne mesure pas. */
  let apercu = '(illisible)';
  try {
    apercu = await lire("(document.body.innerText||'').replace(/\\s+/g,' ').slice(0,160)");
  } catch {
    /* tant pis */
  }
  console.error(
    `\nLA PAGE N'A PAS LE MARQUEUR « ${marqueur} » apres ${Math.round(msMax / 1000)} s.\n` +
      `  Le serveur repond, donc ce n'est pas lui : page blanche, erreur de compilation\n` +
      `  ou mauvaise route.\n\n` +
      `  Ce que la page affiche : ${apercu}\n\n` +
      "  Aucune mesure n'est faite. Un zero rendu ici ressemblerait a un resultat, et\n" +
      "  c'est ainsi qu'une page absente a deja fait chercher un defaut inexistant.\n"
  );
  arreter(2);
  return -1;
};
