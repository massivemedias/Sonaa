# Parutions complètes dans le corpus

Trouvées par `scripts/audit-durees.ts` après réparation du plafond de
quinze minutes. Pendant la panne, une intégrale sans le mot « album » dans
son titre passait le matcher.

AUCUNE N EST RETIRÉE : les enlever laisserait des genres sous la cible, et
c est une décision de corpus, pas une correction technique.

| Genre | Œuvre | Durée | Identifiant | Tracks du genre |
|---|---|---|---|---|
| terrorcore | Noisekick & Paranoizer - Terrordrang | 142 min 35 s | `undefined` | 5 |
| psycore | Psykovsky - Tanetsveta | 111 min 23 s | `undefined` | 3 |
| psycore | Savage Scream - Bloody Ballet | 97 min 56 s | `undefined` | 3 |
| psybient | Carbon Based Lifeforms - Stochastic | 95 min 25 s | `undefined` | 7 |
| belgiantechno | Charlotte de Witte - Formula | 89 min 6 s | `undefined` | 6 |
| darkelectro | Mentallo And The Fixer - Burnt Beyond Recognition | 73 min 46 s | `undefined` | 7 |
| peaktimetechno | Amelie Lens - Higher | 72 min 11 s | `undefined` | 5 |
| forestpsy | Battle of the Future Buddhas - Twin Sharkfins | 71 min 2 s | `undefined` | 6 |
| techstep | Ed Rush & Optical - Wormhole | 70 min 54 s | `undefined` | 6 |
| industrialtechno | Ancient Methods - The Jericho Recordings | 70 min 7 s | `undefined` | 7 |
| microtechno | Rrose - Please Touch | 68 min 3 s | `undefined` | 5 |
| rhythmicnoise | Imminent Starvation - Nord | 68 min 1 s | `undefined` | 5 |
| rominimal | Cezar - Salvatore | 67 min 11 s | `undefined` | 5 |
| psycore | Kindzadza - Waves From Inner Space | 64 min 51 s | `undefined` | 3 |
| twilightpsy | Rinkadink - Rabbit From Darkside | 62 min 9 s | `undefined` | 4 |
| minimaltechno | Rrose - Hymn to Moisture | 59 min 2 s | `undefined` | 8 |
| frenchcore | Micropoint - Neurophonie | 57 min 46 s | `undefined` | 6 |
| nuitalo | Italoconnection - Metropoli | 55 min 36 s | `undefined` | 7 |
| lowercase | Steve Roden - Forms of Paper | 54 min 0 s | `undefined` | 4 |
| dungeonsynth | Mortiis - Fodt til a herske | 53 min 1 s | `undefined` | 5 |
| drillnbass | µ-Ziq - Magic Pony Ride | 51 min 26 s | `undefined` | 7 |
| kosmische | Harmonia - Deluxe | 42 min 10 s | `undefined` | 6 |
| neogoa | Artifact303 - Back to Space | 41 min 37 s | `undefined` | 6 |
| kosmische | Tangerine Dream - Phaedra | 38 min 2 s | `undefined` | 6 |
| isolationism | Thomas Koner - Permafrost | 37 min 37 s | `undefined` | 4 |
| electroacoustic | Karlheinz Stockhausen - Kontakte | 35 min 10 s | `undefined` | 5 |
| raggacore | Shitmat - Killababylonkutz | 34 min 44 s | `undefined` | 5 |
| drone | Kali Malone - Living Torch I | 33 min 34 s | `undefined` | 7 |
| spacemusic | Klaus Schulze - Bayreuth Return | 30 min 22 s | `undefined` | 7 |
| dungeonsynth | Old Tower - The Rise of the Specter | 29 min 49 s | `undefined` | 5 |
| dungeonsynth | Secret Stairways - Enchantment of the Ring | 29 min 0 s | `undefined` | 5 |
| spacemusic | Steve Roach - Structures from Silence | 28 min 49 s | `undefined` | 7 |
| lowercase | Richard Chartier - Of Surfaces | 26 min 27 s | `undefined` | 4 |
| kosmische | Klaus Schulze - Mindphaser | 25 min 45 s | `undefined` | 6 |
| glitch | Oval - Do While | 24 min 6 s | `undefined` | 7 |
| spacemusic | Steve Roach - Rest of Life | 22 min 56 s | `undefined` | 7 |
| clickscuts | Vladislav Delay - Huone | 22 min 7 s | `undefined` | 6 |
| illbient | Techno Animal vs Dalek - Megaton | 21 min 58 s | `undefined` | 4 |
| breakcore | Alec Empire - Digital Hardcore | 20 min 38 s | `undefined` | 6 |
| digitalhardcore | Alec Empire - Digital Hardcore | 20 min 38 s | `undefined` | 10 |
| ambienthouse | The Orb - A Huge Ever Growing Pulsating Brain That Rules from the Centre of the Ultraworld | 18 min 47 s | `undefined` | 7 |
| ambientgenre | Brian Eno - 1/1 | 17 min 22 s | `undefined` | 7 |
| krautrock | Föllakzoid - I | 17 min 1 s | `undefined` | 7 |
| aggrotech | Grendel - Ascending the Abyss | 16 min 37 s | `undefined` | 7 |
| dubtechno | Basic Channel - Quadrant Dub I | 15 min 37 s | `undefined` | 5 |
| ambientgenre | KMRU - Why Are You Here | 15 min 10 s | `undefined` | 7 |
| ambientdub | The Orb - Towers of Dub | 15 min 1 s | `undefined` | 7 |

## Deux cas à part

**Brian Eno, 1/1 (17 min 22)** : exception nommée au plafond, légitime.
Elle apparaît ici parce que le script d audit ne connaît pas les
exceptions, pas parce qu il y a un problème.

**Tangerine Dream, Phaedra (38 min 2)** : l exception déclarée vise la
PIÈCE-TITRE de 17 min 39. La vidéo retenue en fait 38, c est donc l album
entier, protégé par une exception qui décrit autre chose. Le cas le plus
sournois de la liste : la règle est respectée sur le papier et violée en
fait.
