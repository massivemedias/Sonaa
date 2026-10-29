# ADR-112 : un accueil qui ne ressemble plus à un gabarit d'IA

Date : 28 octobre 2026. Statut : accepté.

## Pourquoi

Mika : « je voudrais que le site paraisse un peu moins IA, il y a des trucs
qu'on détecte automatiquement ». L'ouverture de l'accueil empilait les
signes des pages générées : un surtitre en petites capitales espacées au
dessus du titre, un slogan générique (« tout au même endroit »), sa seconde
ligne en dégradé de couleur, un chapeau qui énumère tout le site, des
sections numérotées 01, 02, 03, et un « Défiler » avec son fil animé en bas
de l'écran.

## Ce qui est décidé

- Le titre devient une question que les gens se posent vraiment : « Ce
  soir, on sort où ? » (« Where to tonight? »).
- Le chapeau dit en une phrase ce que le site fait, sans liste : les
  soirées de la ville, et de quoi comprendre ce qu'on y entend.
- La seconde ligne du titre est d'un orange franc, sans dégradé. Le jaune
  reste sur le trait de la page courante du menu et sur les liens d'achat.
  Cela tranche l'arbitrage ouvert par ADR-110.
- Le surtitre « SONAA » disparaît : le logo est déjà dans l'en-tête.
- Les numéros de section et l'invitation à défiler disparaissent.
- Les cinq cartes à icône sous le titre deviennent de simples liens (le nom,
  puis ce qu'il y a derrière), séparés d'un filet fin, sans icône ni verre
  dépoli. Au téléphone, ils forment une liste, un lien par ligne. Mika l'a
  choisi le 28 octobre.

## La relecture du corpus

Le même jour, Mika a demandé de relire tout le corpus. Les histoires des 219
styles et des 14 familles, en français et en anglais, ont été relues en
entier. Dans les cours, seuls les passages qui portaient une tournure à
risque ont été relus. La grille retire d'abord les « ce n'est pas X, c'est
Y », puis les phrases-slogans de fin de paragraphe (« la filiation Detroit
reste la conscience du genre entier »), les formules qui font profond
(« la signature », « le secret », « l'ADN »), l'emphase (« mythique »,
« incontournable ») et les triades décoratives.

884 passages ont été réécrits dans 724 champs. Chaque correctif remplace un
passage exact. Il est refusé si un chiffre change, si un tiret long entre ou
si le passage s'allonge de plus de 60 caractères. Le corpus passe par
`scripts/lib/corpus-store.ts`. Une seule correction a été écartée, parce
qu'elle effaçait un fait : le raggacore n'est pas en 4/4 régulier.

## L'interface et le menu

Le 29 octobre 2026, même grille sur les textes de l'interface, en français et
en anglais : 16 chaînes réécrites. Ainsi, « Ce n'est pas une ville sans
soirées : c'est la source qui est muette » devient « les soirées de cette
ville ne peuvent pas s'afficher pour l'instant », et « Les incontournables »
devient « À la une ». Deux propositions passaient du tutoiement au
vouvoiement : ce ne sont pas des tics d'IA, elles ont été écartées.

Le menu passe en français. « Calendar » devient « Calendrier » : Mika
revient sur son choix du 7 septembre, qui gardait le mot anglais dans les
deux langues. « News » devient « Actus », dans le menu, la barre du bas, le
titre de la page, l'onglet du navigateur et les phrases qui en parlent.

## Ce que cela ne fait pas

- Les notes de filiation (`note`), visibles seulement au survol d'un badge,
  ne sont pas relues.
