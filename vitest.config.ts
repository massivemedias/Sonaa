/* LE LANCEUR DE TESTS, INSTALLE LE 3 SEPTEMBRE 2026.

   Ce depot n'en avait aucun. Ce n'etait pas un oubli : presque tout y est
   verifie par des controles de donnees et par des mesures dans un vrai
   navigateur, ce qui attrape des defauts qu'un test unitaire ne voit pas,
   comme un survol qui efface un texte ou une barre qui se decolle. Ces
   controles restent la premiere ligne.

   Ce qui manquait, c'est la place ou verifier une FONCTION PURE dont le
   comportement se decrit par une table de cas : quatre niveaux de priorite
   dans la resolution d'une ville, une duree ISO 8601 vers des secondes. Les
   mesurer dans un navigateur reviendrait a monter une page pour poser une
   question qui n'en a pas besoin.

   Configuration a part de vite.config.ts, et volontairement : la
   configuration du site charge le greffon PWA, qui genere un service worker
   a chaque demarrage. Un lanceur de tests n'a rien a faire avec cela. */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /* `node` par defaut, `jsdom` pour les composants. Le second est bien plus
       lent a demarrer : le declarer par fichier plutot que pour tout le monde
       garde les tests de fonctions pures a quelques millisecondes.
       Un fichier de composant porte  @vitest-environment jsdom  en tete. */
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
    /* Pas de reseau dans les tests. Une suite qui depend d'un serveur
       distant echoue les jours ou il est lent, et on finit par ne plus la
       croire. Ce qui a besoin du reseau se mesure ailleurs, dans les
       controles de publication, qui eux ont le droit d'echouer bruyamment. */
    testTimeout: 5000,
  },
});
