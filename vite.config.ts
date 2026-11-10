import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

// SONAA est un site 100 % statique servi depuis GitHub Pages sur sonaa.ca.
// Deux variables d'environnement seulement, toutes deux publiques par
// conception : l'URL Supabase et la clé « publishable ». Aucun secret n'est
// injecté au build, et un contrôle de CI le vérifie sur dist/.
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    /* LE GABARIT PART SANS SES NOTES. index.html est documente en commentaires
       francais, et le pre-rendu le recopie dans chacune des 3 700 pages : 18,6
       Mo de commentaires sur 94,6 Mo de HTML, que personne ne lit en ligne et
       que GitHub Pages devait synchroniser a chaque deploiement (mesure le 10
       novembre 2026). Ils restent dans la source ; la page servie les perd,
       avec l'indentation de son en-tete. Le corps n'est pas touche : un
       espace y peut compter. */
    {
      name: 'sonaa-gabarit-sans-notes',
      transformIndexHtml: {
        order: 'post',
        handler(html: string): string {
          const sansNotes = html.replace(/<!--[\s\S]*?-->/g, '');
          return sansNotes.replace(/<head>[\s\S]*?<\/head>/, (tete) => tete.replace(/\n\s+/g, '\n'));
        },
      },
    },
    /* TAILWIND, DEPUIS LE 21 SEPTEMBRE 2026, ET SANS SON RESET. La feuille
       src/design/v2.css n'importe que le theme et les utilitaires : le
       « preflight » remettrait a zero les boutons, les listes et les titres
       de trente-cinq feuilles ecrites a la main, et c'est exactement ce
       qu'on ne veut pas. Voir ADR-086. */
    tailwindcss(),
    VitePWA({
      /* « prompt » et non « autoUpdate », mais ce n'est plus la personne qui
         appuie : c'est PwaLayer qui applique la version en attente au
         prochain moment creux (changement de page, onglet en arrière-plan),
         jamais pendant qu'un son joue, et ne montre le bandeau qu'à défaut
         de moment creux en une demi-heure. « autoUpdate » ferait la même
         chose sans regarder si un set joue. */
      registerType: 'prompt',
      injectRegister: null, // l'enregistrement est fait à la main dans pwa.ts
      manifestFilename: 'manifest.webmanifest',

      manifest: {
        name: 'SONAA',
        short_name: 'SONAA',
        description:
          'Atlas généalogique des musiques électroniques. 218 genres, 14 familles, écoute par le lecteur officiel YouTube.',
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#070401',
        theme_color: '#070401',
        categories: ['music', 'education', 'reference'],
        icons: [
          { src: 'brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      /* Ce qui doit être là AVANT la première coupure réseau : le code, les
         styles, la police, les icônes. Le corpus n'apparaît pas dans cette
         liste parce qu'il est importé en JSON et donc déjà compilé DANS le
         bundle JavaScript · le précacher séparément le stockerait deux fois. */
      workbox: {
        /* og.png N'EST PAS PRECACHEE, et ne doit pas l'être : l'image de
           partage n'est jamais demandée par l'application, seulement par les
           robots des réseaux sociaux, côté serveur. Elle pesait 39 Ko quand
           elle était le disque de la marque ; c'est maintenant une capture de
           l'atlas de 186 Ko, qu'il serait absurde de faire télécharger à
           chaque visiteur pour un fichier qu'aucun d'eux n'ouvrira. */
        globPatterns: ['**/*.{js,css,html,woff2,ico}', 'brand/*.png'],
        /* Les 1263 pochettes pèsent 39 Mo. Les précharger imposerait ce
           téléchargement à toute personne qui ouvre le site une fois, sur
           son forfait. Elles sont mises en cache à l'usage, ci-dessous. */
        globIgnores: ['**/covers/**', '**/node_modules/**'],
        navigateFallback: 'index.html',
        /* LES JEUX /game/ ET /games/ SONT SUPPRIMES depuis le 10 novembre 2026
           (Mika : « il a pas rapport »), avec leurs exceptions ici.

           /v2/ Y A VECU UN JOUR, le 21 septembre 2026 : le prototype de
           comparaison qui a decide du portage. Il n'existe plus, le site
           entier EST la v2. Voir ADR-086. */
        navigateFallbackDenylist: [/^\/covers\//],
        cleanupOutdatedCaches: true,
        /* Le chunk des structures pèse 680 Ko : au-dessus du défaut, et il
           n'est pas question de le laisser hors du cache, c'est le corpus. */
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,

        runtimeCaching: [
          {
            /* Pochettes : une fois vue, toujours disponible. CacheFirst car
               une pochette ne change jamais · si elle change, c'est un
               nouveau fichier. Plafond à 400 entrées pour ne pas remplir le
               disque de quelqu'un qui parcourt tout l'atlas. */
            urlPattern: ({ url }) => url.pathname.startsWith('/covers/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'sonaa-pochettes',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            /* ECRANS DE LANCEMENT iOS : gardes A L'USAGE, pas precaches.

               Les vingt-six images pesent 2,9 Mo ensemble, et un appareil
               donne n'en utilise QU'UNE, celle qui correspond exactement a sa
               definition. Les precacher toutes ferait payer 2,9 Mo a chacun
               pour 113 ko utiles : on garde donc celle qui sert, la premiere
               fois qu'elle sert.

               CacheFirst parce qu'une image de lancement ne change jamais :
               si elle change, c'est un nouveau fichier avec un nouveau nom. */
            urlPattern: ({ url }) => url.pathname.startsWith('/brand/splash/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'sonaa-lancement',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            /* YOUTUBE : JAMAIS EN CACHE, sous aucune forme. Trois raisons.
               La lecture passe par le lecteur officiel, dont les conditions
               d'utilisation interdisent d'intercepter ou de rejouer les flux.
               Les URL de media sont signées et expirent : une réponse gardée
               ne rejouerait rien, elle produirait une erreur difficile à
               diagnostiquer. Et les vignettes appartiennent à YouTube, pas à
               SONAA. NetworkOnly est donc une règle, pas un réglage. */
            urlPattern: ({ url }) =>
              /(^|\.)(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com|ggpht\.com)$/.test(
                url.hostname
              ),
            handler: 'NetworkOnly',
          },
          {
            /* Supabase : jamais en cache non plus. Un score de vote ou une
               liste de propositions servis depuis un cache seraient faux, et
               un faux compteur est pire qu'un compteur absent. Hors ligne,
               l'interface le dit (voir lib/proposals.ts). */
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
          },
        ],
      },

      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    // Budget de 250 Ko gzip hors données (ARCHITECTURE.md ADR-013).
    chunkSizeWarningLimit: 800,
  },
});
