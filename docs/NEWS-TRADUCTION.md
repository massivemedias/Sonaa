# Traduire les news : analyse et recommandation

Étape 0, 17 septembre 2026. Aucune ligne de code. Objectif visé : un visiteur
en français lit les news en français, un visiteur en anglais lit l'original.

## 1. Ce qui existe

Les articles vivent dans `public/news.json`, 92 Ko, refait par
`scripts/moissonner-news.ts` toutes les quatre heures. Un article porte six
champs : `source`, `titre`, `lien`, `date`, `image`, `resume`.

**Il n'y a pas de corps d'article.** Le texte complet n'est jamais stocké : il
est lu à la demande par la passerelle (`api/article`), qui va chercher la page
du magazine, la nettoie et la garde un jour. Le prompt suppose un champ
`corps` à traduire ; il n'existe pas, et c'est ce qui sépare la réponse en
deux moitiés.

| Mesure | Valeur |
|---|---|
| Articles actifs | 160, plafond fixe |
| Titre | 68 caractères en moyenne |
| Résumé | 187 caractères en moyenne, 12 articles sans résumé |
| Titre plus résumé, à traduire | 255 caractères par article |
| Corps d'un article lu | 4 187 caractères en moyenne, soit environ 1 160 tokens |

## 2. Volume

Vingt-quatre moissons ont produit un commit en sept jours. Sur les douze
dernières, 153 articles nouveaux en 3,2 jours, soit **environ 48 nouveaux
articles par jour**, par vagues : deux moissons sur trois n'apportent presque
rien, la troisième en apporte vingt-cinq.

Traduire titre et résumé coûte donc 12 240 caractères par jour, **367 000 par
mois**, soit environ 102 000 tokens en entrée et 117 000 en sortie, le français
étant plus long que l'anglais d'environ 15 pour cent.

## 3. Détection de la langue

**Elle est déjà faite, et elle ne coûte rien.** `src/data/news-sources.ts`
porte un champ `langue` par magazine depuis sa création : dix-neuf sont en
anglais, deux en français, Trax et Tsugi. Aucune détection automatique n'est
nécessaire, et le risque de retraduire du français vers le français est nul
tant que la règle est lue à la source et non devinée par article.

Aujourd'hui, seul Tsugi produit réellement, avec 12 articles sur 160 ; Trax n'a
pas de flux et n'apporte rien.

## 4. Stratégie A ou B : les deux, mais pas au même endroit

Le découpage naturel n'est pas A contre B, il suit la nature des deux textes.

**La liste, titre et résumé : stratégie A, à la moisson.** Le volume est
minuscule, 255 caractères par article, et la moisson tourne déjà toutes les
quatre heures en quarante secondes. Les champs `titre_fr` et `resume_fr` se
rangent à côté des originaux dans `news.json`, qui passerait de 92 à environ
125 Ko. La lecture reste instantanée, la page pré-rendue en français porte de
vrais titres français, et la facture est connue d'avance.

**Le corps, dans la vue de lecture : stratégie B, à la lecture.** Il n'est pas
stocké et ne peut pas l'être sans changer la nature du site. La passerelle
garde déjà l'article nettoyé un jour ; elle garderait la version française
sous une clé de cache qui porte la langue. On ne paie que ce qui est lu.

Chiffré : si cinq cents articles distincts sont ouverts en français dans le
mois, le corps coûte environ 580 000 tokens en entrée et 700 000 en sortie.

## 5. Le fournisseur

| Fournisseur | Prix | Sur ce vocabulaire |
|---|---|---|
| Claude Haiku 4.5 | 1 USD par million de tokens en entrée, 5 en sortie, moitié prix en lot | Le seul qui accepte une consigne : ne traduis pas BPM, remix, EP, label, warehouse, four-on-the-floor, kick, drop, sidechain, et garde les noms d'artistes et de machines |
| DeepL | plan Growth à 26 USD par mois, un million de caractères inclus | Très bon sur la langue courante, glossaire disponible, mais le plancher mensuel est vingt fois le besoin |
| Google Cloud Translation | 20 USD par million de caractères, 500 000 gratuits par mois | Traduirait « label » par étiquette et « warehouse » par entrepôt, et le glossaire n'existe que dans l'offre avancée |

**Recommandation : Claude Haiku 4.5.** Le jargon est le vrai sujet, pas la
grammaire. Un titre comme « Warehouse label drops four-on-the-floor EP » n'a
qu'une seule bonne traduction, celle qui ne traduit presque rien, et c'est la
seule chose qu'un traducteur automatique classique ne sait pas faire sans
glossaire payant.

### Coût mensuel estimé

| Poste | Tokens par mois | Coût |
|---|---|---|
| Titres et résumés, en lot | 102 000 entrée, 117 000 sortie | 0,35 USD |
| Corps lus, 500 articles | 580 000 entrée, 700 000 sortie | 4,08 USD |
| **Total** | | **moins de 5 USD par mois** |

Google Translate coûterait zéro pour la liste seule, en restant sous son palier
gratuit. L'écart, quelques dollars, ne justifie pas de traduire « label » par
« étiquette » sur un site de musique électronique.

## 6. Le référencement : ne pas faire ce que le prompt demande

Le prompt demande une page `/fr/news/<slug>/` par article traduit. **Il ne faut
pas la construire**, pour trois raisons, de la plus faible à la plus grave.

**La forme du site dit l'inverse.** Le français est la langue par défaut de
sonaa.ca, sans préfixe, et c'est l'anglais qui vit sous `/en/`. Une section
`/fr/` contredirait les 792 adresses déjà soumises à Google.

**Le hreflang ne peut pas pointer vers l'original.** L'article anglais est sur
musicradar.com, pas sur sonaa.ca. Google demande un lien de retour pour
valider une paire de langues, et musicradar ne le posera jamais.

**C'est du contenu récupéré, au sens où Google le définit.** Sa politique
antispam nomme exactement ce cas : récupérer des flux pour produire des pages
par transformation automatique, dont la traduction, sans valeur ajoutée. Cent
soixante pages de traductions d'articles tiers ne feraient pas monter SONAA,
elles risqueraient de faire tomber tout le domaine, y compris les 234 fiches de
styles qui, elles, sont originales.

**Ce qui est sûr et suffisant** : traduire le titre et le résumé pour
l'affichage, c'est-à-dire l'extrait que le magazine publie lui-même dans son
flux, en gardant le nom de la source et le lien vers l'original. C'est ce que
fait n'importe quel agrégateur, et c'est déjà ce que la page `/news/`
pré-rendue contient aujourd'hui, en anglais. Elle porterait les mêmes titres,
en français.

Il reste une question ouverte, antérieure à cette mission : la vue de lecture
affiche depuis le 14 septembre le texte complet des magazines. Une traduction
est une œuvre dérivée, donc une reproduction plus caractérisée qu'une simple
lecture. Traduire le corps augmente l'exposition, sans la créer.

## 7. Où brancher la traduction

**Dans la moisson, pas dans un job séparé.** La moisson tourne en quarante
secondes ; traduire une vingtaine de titres en un appel groupé en ajoute cinq.
Un job séparé demanderait un second commit sur le même fichier, donc un risque
de course avec la moisson, qui vient justement d'être réparée le 15 septembre
sur ce point précis.

Deux garde-fous : ne traduire que les articles dont le lien n'a pas déjà sa
traduction, et laisser passer la moisson si l'appel échoue, comme le fichier
laisse déjà passer une source en panne. Une news sans traduction s'affiche en
anglais, ce n'est pas une erreur.

## 8. Fichiers et migrations

Aucune migration Supabase : rien de tout cela ne touche la base.

- `scripts/moissonner-news.ts` : l'appel de traduction et les deux champs.
- `scripts/lib/traduire.ts` : nouveau, l'appel groupé et la consigne de jargon.
- `public/news.json` : deux champs de plus par article.
- `src/atlas/NewsPage.tsx` : afficher `titre_fr` quand la langue est le français.
- `scripts/prerender.ts` : la page `/news/` en français.
- `worker/src/index.ts` : la variante traduite de `api/article`, clé de cache par langue.
- `.github/workflows/news.yml` : le secret de l'API.

## 9. À valider avant d'écrire une ligne

1. Le corps des articles est-il traduit aussi, ou seulement la liste ?
2. Les deux sources françaises sont-elles traduites vers l'anglais pour les
   lecteurs anglophones, ou restent-elles en français pour tout le monde ?
3. Une clé API Anthropic doit être créée et posée en secret GitHub, et en
   secret de la passerelle si le corps est traduit.
