# ADR-090 : granite sous le verre, ou le site quitte le bois

Date : 29 septembre 2026. Statut : accepté.

Les ADR-001 à ADR-083 vivent dans [ARCHITECTURE.md](../../ARCHITECTURE.md).
Ce document amende [ADR-089](ADR-089-verre-depoli-sur-sable.md) sur le fond
et la texture, et met à jour [DESIGN.md](../../DESIGN.md) sur la palette.
Le verre dépoli, l'accent terracotta, les hauteurs de barre et l'échelle
d'espacement ne bougent pas.

## Ce qui est décidé

Le fond n'est plus du sable veiné de bois. Il est du granite, dans les deux
thèmes. Le verre se pose dessus comme avant.

Mika a demandé le 29 septembre : plus de bois, quelque chose du genre granite
ou plus subtil, et le jaune trop jaune. Le granite reprend l'objet de
référence du site, le carottage, sans poser de fibres, et sans teinte qu'on
lirait comme du jaune.

### La palette

Même clarté que le sable d'ADR-089. Chroma ramenée à 0,004. Teinte 70 en
sombre, 65 en clair. Assez chaud pour ne pas virer au bleu de dashboard, trop
peu pour lire du jaune.

| Rôle | Clair | Sombre |
|---|---|---|
| Fond | granite pâle, `oklch(0.95 0.004 65)` | granite profond, `oklch(0.2 0.004 70)` |
| Texte principal | `#3C3C3C` exactement | granite très pâle, `oklch(0.94 0.006 80)` |
| Texte secondaire | `#3C3C3C` à 80 % | l'encre à 65 % |
| Accent | terracotta, inchangé | terracotta, inchangé |
| Sur l'accent | `oklch(0.99 0.004 80)` | le fond, `oklch(0.22 0.004 70)` |

Pas de blanc pur, pas de noir pur, nulle part.

### La texture

Deux bruits superposés : un gros grain minéral (`baseFrequency` 0,045) et
un pointillé fin (0,55), en SVG écrit dans les jetons, répété en tuiles de
280 px sur le même pseudo-élément fixe de `body` qu'ADR-089. Des grains, pas
des veines. Specks clairs sur le granite sombre à 42 %, sombres sur le clair
à 48 %. La première version, trop fine et trop transparente, ne se voyait
pas.

Le grain reste quand le mouvement est réduit : il ne bouge jamais.

### Le jaune qui restait en dur

Plusieurs états d'interface (zone de dépôt, filet du mini lecteur, forme
d'onde d'un set, contour de carte) étaient écrits `oklch(... 0.17 85)`, un
jaune saturé qui n'était pas l'accent. Ils lisent `--accent`.

## Retouche du 30 septembre : un granite fin

Mika : « pourrais-tu faire une meilleure texture pour Sonaa ». Le premier
granite mélangeait les échelles : ses taches moyennes et contrastées se
lisaient comme du camouflage ou un marbre sale, qui se battait avec le
contenu.

Une pierre polie sépare deux échelles, et le nouveau granite fait de même :

- des nuances très larges et très douces (`baseFrequency` 0,004), à peine
  perceptibles, qui empêchent l'aplat de faire plastique ;
- un pointillé fin et net en deux tailles de grains (0,8 et 0,3), clairsemé,
  qui fait la pierre. Seuls les pics du bruit deviennent des grains.

Grains sombres sur le granite clair à 60 %, clairs sur le granite sombre à
45 %, qui se lit alors comme un granite noir moucheté. Tuile de 800 px, sans
couture. Le SVG laisse ses chevrons en clair, ce que tous les navigateurs
acceptent dans une adresse `data:`, et pèse 1998 octets avec sa règle, 425
compressés, sous les 2 Ko d'ADR-089.

Trois autres textures ont été essayées et écartées : des courbes de niveau,
qui parlaient d'atlas mais dont les traits tremblaient en dents de scie,
parce que le bruit est calculé sur 8 bits ; un papier coton, qui faisait des
stries de pluie ; et ce granite-ci avec des nuages plus forts, qui faisaient
des traînées sales.

Contraste AA remesuré sur le fond réel, en pixels : 6,18 pour 1 au minimum
en sombre, 4,67 en clair. Rendu vérifié dans Chrome et dans le moteur de
Safari.

## Ce qui ne change pas

Le verre, l'accent terracotta, Inter, les quatorze teintes de famille, la
carte en trois dimensions qui reste sombre, les hauteurs de barre, l'échelle
d'espacement.

## Ce que cela coûte

Le SVG du granite est plus court que celui du bois : il n'a plus de
déplacement ni de couture à cacher. Aucune requête de plus.
