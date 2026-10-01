# ADR-091 : « Quelle est cette track qui joue ? », un geste dans tous les menus

Date : 30 septembre 2026. Statut : accepté.

Ce document revient sur la décision du 21 septembre 2026 qui avait sorti la
reconnaissance du menu (voir les commentaires de `src/atlas/SiteNav.tsx`), et
sur la surcouche plein écran de l'accueil du 27 septembre.

## Ce qui est décidé

La reconnaissance s'annonce par sa question : « Quelle est cette track qui
joue ? ». Elle nomme le morceau d'abord, puisque c'est ce qu'on veut savoir
en soirée ; le style vient avec.

Elle revient dans les menus, mais comme un geste et non comme une porte :

- sur ordinateur, une pilule d'accent avec un micro, à part des mots, qui ne
  garde que le micro sous 1180 px ;
- sur téléphone, au milieu de la barre du bas, une pastille ronde toujours
  allumée, distincte de la pilule qui marque la page courante ;
- sur l'accueil et sur Styles, un grand bouton commun (`BoutonTrack`) :
  dégradé de l'accent vers un terracotta plus rouge, halo, micro qui respire,
  égaliseur qui joue.

Un clic lance l'écoute. Le menu mène à `#/reconnaitre/ecouter` ; l'accueil
ouvre la reconnaissance dans la page, sous le bouton, et le calendrier reste
visible dessous.

Connecté, l'historique vit dans le compte (table `ecoutes`, lisible, écrite et
effacée par son seul propriétaire, emportée par « supprimer mes données »).
Sans compte, il reste dans le navigateur. Le menu du compte porte « Mes
écoutes », qui descend à l'historique.

Le poids du modèle et l'envoi à AudD restent écrits dans la page, retirés de
l'écran à la manière d'un texte pour lecteur d'écran.

Le favicon devient un égaliseur de trois barres claires sur une tuile
terracotta, le même dessin que le bouton. Un seul vecteur,
`public/brand/favicon.svg`, un seul écrivain, `scripts/refaire-favicon.sh`.

## Pourquoi

Mika, le 30 septembre 2026 : le bouton était « mal fait », il voulait
« quelque chose de plus attrayant », « dans le menu aussi, mobile ou
desktop », qui « se dissocie du reste pour attirer le regard » sans sortir
du dessin du site ; la surcouche cachait tout (« on ne voit plus rien
d'autre ») ; il voulait l'historique pour les comptes connectés ; et le
favicon n'était « pas beau ».

L'argument du 21 septembre tient toujours sur le fond : ce n'est pas une
section. C'est pourquoi elle revient sous une forme qui n'est pas celle des
sections, et qu'elle ne s'allume jamais comme page courante.

## Ce qui ne change pas

Le style est reconnu dans le navigateur, le son ne part que vers AudD et n'est
pas gardé. Les scans publics restent anonymes et modérés (table `scans`).
