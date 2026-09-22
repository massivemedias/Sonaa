# ADR-086 : la v2, ou le site prend la pile et le look de 21st.dev

Date : 21 septembre 2026. Statut : accepté, en production.

Les ADR-001 à ADR-083 vivent dans [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Ce qui s'est passé, dans l'ordre

Une vidéo a conseillé à Mika d'installer Framer Motion, un skill de design et
21st.dev « pour avoir un site vraiment beau et pro ». J'ai objecté deux fois,
avec le texte de `DESIGN.md` à l'appui : sa section 10 interdisait nommément
le dégradé violet-bleu, les cartes arrondies à ombre portée, le glassmorphism
et le grand chiffre à petit label, c'est-à-dire exactement ce que ces outils
produisent, et sa section sur le mouvement disait « pas d'apparition en
fondu, pas de ressort ».

Mika a demandé un prototype : `sonaa.ca/v2/`, une page autonome montée sur
Tailwind, l'esthétique shadcn et Motion, avec les vraies données du site. Il
l'a comparé à la v1, à côté, sur ordinateur et sur téléphone, et il a
tranché : « ok c'est beau, porte la v2 pour vrai et complète le tout ».

**Ce document enregistre cette décision, et le renversement de `DESIGN.md`
qu'elle impose.** Un document écrit « pour qu'on puisse me l'opposer » a été
opposé, deux fois, et la décision a été prise en connaissance de cause. Il ne
s'ignore pas, il se réécrit.

## La décision

SONAA adopte le look du prototype sur tout le site : la maille des trois
accents, le verre, le texte en dégradé, la lueur, le rayon de carte, et un
seul geste de mouvement, l'entrée en cascade avec ressort.

## Comment c'est porté, et pourquoi pas autrement

**Par les jetons, pas par une réécriture.** Le site a trente-cinq feuilles et
quatorze mille lignes de CSS, dont la logique de mise en page est saine et
mesurée au pixel. Tout y passe déjà par `tokens.css`. La v2 est donc portée à
un seul endroit : l'échelle des gris descend d'un cran et se teinte de violet
à 285, et un bloc de jetons nouveaux porte les accents, le dégradé, le verre,
la lueur, l'ombre et la maille. Chaque composant les lit ; aucun ne les
réécrit. Le thème clair a ses propres valeurs pour le verre et le dégradé de
texte, et la carte en trois dimensions reste sombre comme avant.

**Tailwind sans son reset.** `src/design/v2.css` n'importe que le thème et les
utilitaires. Le « preflight » aurait remis à zéro les boutons, les listes et
les titres de trente-cinq feuilles qui comptent sur les valeurs par défaut du
navigateur. Cinq utilitaires maison, `verre`, `verre-fort`, `texte-degrade`,
`lueur`, `maille`, sont déclarés une fois et composés partout. Les couleurs de
Tailwind sont liées aux jetons : `bg-accent-a` lit `tokens.css`, ce n'est pas
une seconde source de vérité.

**Motion, réduit à un geste.** `src/design/mouvement.tsx` expose la racine
`LazyMotion` en mode strict, qui ne charge que le tiers de la bibliothèque et
fait échouer la construction si quelqu'un importe le tout, et un seul
composant, `Apparition` : vingt-deux pixels de montée, un ressort, un pas de
cascade plafonné à huit rangs. Les cartes du calendrier, des news, des
mixtapes, les tuiles de l'atlas et les résultats du micro l'emploient. Qui
demande moins de mouvement ne voit rien bouger.

**Le chrome flotte.** L'en-tête devient une pilule de verre à six dixièmes de
rem du bord, sous laquelle la page défile ; la barre du bas devient une
capsule de verre détachée du bas, dont l'onglet courant porte le dégradé ; le
bouton de compte prend la même matière. La place réservée en bas inclut
désormais l'écart de flottement.

**Les trois grands chiffres vivent sur la page des styles**, et non sur
l'accueil : c'est la seule page qui charge déjà le corpus. Les poser sur le
calendrier aurait tiré 1,2 Mo dans son paquet pour trois nombres.

## Ce que cela coûte, et qui est assumé

- Environ trente kilo-octets de plus dans le paquet d'entrée pour Tailwind et
  le tiers de Motion, sur les 535 que le site venait de gagner. C'est le prix
  du look choisi, et il a été dit avant.
- `DESIGN.md` est réécrit sur trois points : la palette, les interdits de la
  section 10, et la ligne sur le mouvement. Ce qui y reste vrai, la structure,
  la typographie, la règle qu'une image porte une donnée, reste.
- Le flou d'arrière-plan du verre coûte sur les téléphones anciens ; il est
  déclaré par un seul jeton, `--verre-flou`, que l'on peut baisser d'un geste.

## Ce que cette décision ne change pas

Aucune route, aucune donnée, aucun contrôle de publication. Les vingt et un
contrôles passent, les tests passent, le pré-rendu et le plan du site sont
inchangés. Le prototype `public/v2/` est supprimé : le site entier est la v2.
