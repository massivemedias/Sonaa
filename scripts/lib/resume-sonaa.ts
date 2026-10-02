/* LE RESUME SONAA : un article de magazine, raconte avec nos mots.
 *
 * Mika, le 2 octobre 2026, devant un article de MusicRadar coupe apres le
 * chapeau : « j'aimerais avoir tout l'article sur mon site ». Recopier le
 * texte d'un magazine sur sonaa.ca serait le republier sans son accord. Ce
 * qui se lit ici est donc un RESUME ORIGINAL : les faits de l'article (ils
 * ne sont a personne), reecrits par Claude, en francais et en anglais, avec
 * le lien vers l'article entier dessous.
 *
 * Seulement pour les articles dont le flux ne donne qu'un extrait : quand le
 * magazine met l'article entier dans son flux, la page l'affiche deja (voir
 * worker/src/index.ts, api/article-flux).
 *
 * TROIS GARDE-FOUS, dans cet ordre :
 * 1. La consigne interdit de recopier une phrase ou de citer plus de dix mots.
 * 2. Le resume rendu est compare au texte de la page : une suite de dix mots
 *    identiques, et il est refuse (on redemande une fois, puis on renonce).
 * 3. Une page sans article (mur payant, erreur, texte trop court) ne produit
 *    rien : l'extrait et le bouton restent, comme avant. */

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { sansTirets } from './labels-moisson.ts';
import { texteNu } from './flux-rss.ts';

/* LE MODELE ET SON PRIX, pour la ligne de facture de chaque passe. Effort
   bas : resumer un article est une tache simple, et l'effort est ce qui fait
   le gros de la sortie facturee. */
export const MODELE_RESUME = 'claude-opus-5-5';
const PRIX_ENTREE = 4 / 1_000_000;
const PRIX_SORTIE = 20 / 1_000_000;

export interface ResumeSonaa {
  readonly fr: readonly string[];
  readonly en: readonly string[];
}

/* ═══ LE TEXTE DE LA PAGE ═══ Les paragraphes et intertitres de l'article,
   sans les menus, les pieds de page ni les scripts. Le modele sait ignorer
   les restes ; ce tri lui epargne seulement de les payer. */
const BLOCS_A_JETER = /<(script|style|noscript|svg|nav|header|footer|aside|form|iframe|button|figure)\b[\s\S]*?<\/\1>/gi;
const BRUIT = /cookie|newsletter|subscribe|sign up|sign in|advertisement|all rights reserved|©|follow us|related articles|read more/i;

export function texteDeLaPage(html: string): string {
  const propre = html.replace(/<!--[\s\S]*?-->/g, '').replace(BLOCS_A_JETER, ' ');
  /* L'ARTICLE LE PLUS LONG de la page, quand elle en balise un : les pages
     de magazine en ont souvent plusieurs, l'article et ses voisins. */
  const articles = [...propre.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)].map((m) => m[1] ?? '');
  const zone = articles.length > 0 ? articles.sort((a, b) => b.length - a.length)[0] ?? propre : propre;
  /* UNE BALISE <article> QUI N'ENTOURE QUE LE TITRE (DJ TechTools, mesure le
     2 octobre 2026 : 94 signes) : on reprend alors la page entiere. */
  const dansLArticle = paragraphes(zone);
  return (dansLArticle.length >= 800 || zone === propre ? dansLArticle : paragraphes(propre)).slice(0, 24_000);
}

function paragraphes(html: string): string {
  const vus = new Set<string>();
  const blocs: string[] = [];
  for (const m of html.matchAll(/<(p|h2|h3|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const texte = texteNu(m[2] ?? '');
    const min = m[1] === 'p' || m[1] === 'blockquote' ? 40 : 12;
    if (texte.length < min || BRUIT.test(texte) || vus.has(texte)) continue;
    vus.add(texte);
    blocs.push(texte);
  }
  return blocs.join('\n\n');
}

/* ═══ LA COPIE ═══ Une suite de dix mots identiques entre le resume et la
   page. C'est le signe d'une phrase recopiee, et ce qu'on s'est interdit. */
const mots = (s: string): string[] =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export function recopie(resume: readonly string[], source: string, longueur = 10): boolean {
  const s = mots(source);
  const suites = new Set<string>();
  for (let i = 0; i + longueur <= s.length; i += 1) suites.add(s.slice(i, i + longueur).join(' '));
  const r = mots(resume.join(' '));
  for (let i = 0; i + longueur <= r.length; i += 1) if (suites.has(r.slice(i, i + longueur).join(' '))) return true;
  return false;
}

const Reponse = z.object({
  lisible: z.boolean(),
  fr: z.array(z.string()),
  en: z.array(z.string()),
});

const CONSIGNE = `Tu écris pour SONAA, un site québécois consacré aux musiques électroniques. On te donne le texte d'un article de magazine, extrait de sa page web : il peut contenir des restes de menus, de légendes ou de publicités, à ignorer.

Écris un résumé ORIGINAL de cet article.
- Reformule entièrement avec tes propres mots. Ne recopie aucune phrase de l'article et ne cite jamais plus de dix mots d'affilée.
- Garde tous les faits utiles au lecteur : qui, quoi, les produits et leurs caractéristiques, les prix, les dates, les chiffres, et ce que cela change pour un producteur, un DJ ou un amateur.
- Trois à cinq paragraphes courts, 150 à 250 mots au total.
- Pas de titre, pas de liste à puces, pas d'avis personnel, pas de formule du type « Dans cet article ».
- Une version française, soignée et avec tous ses accents, et une version anglaise équivalente.
- N'utilise jamais le tiret cadratin ni le tiret demi-cadratin : une virgule, deux-points ou un trait d'union simple.

Si le texte ne contient pas l'article (page d'erreur, accès payant, texte trop court pour en tirer l'essentiel), réponds lisible: false avec des listes vides.`;

export interface Facture {
  entree: number;
  sortie: number;
}

/** Le resume d'un article, ou null quand la page ne le permet pas. */
export async function resumerArticle(
  client: Anthropic,
  article: { readonly titre: string; readonly source: string; readonly lien: string },
  texte: string,
  facture: Facture
): Promise<ResumeSonaa | null> {
  const demande = `Magazine : ${article.source}\nTitre : ${article.titre}\nAdresse : ${article.lien}\n\nTexte de la page :\n${texte}`;
  for (let essai = 0; essai < 2; essai += 1) {
    const message = await client.beta.messages.parse({
      model: MODELE_RESUME,
      max_tokens: 16000,
      /* UN REFUS DU MODELE NE DOIT PAS PERDRE L'ARTICLE : l'API repasse
         alors la meme demande a un autre modele, dans le meme appel. */
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: CONSIGNE,
      messages: [
        {
          role: 'user',
          content:
            essai === 0
              ? demande
              : `${demande}\n\nTon premier résumé reprenait une phrase de l'article mot pour mot. Reformule tout, sans exception.`,
        },
      ],
      output_config: { effort: 'low', format: betaZodOutputFormat(Reponse) },
    });
    facture.entree += message.usage.input_tokens;
    facture.sortie += message.usage.output_tokens;
    if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') return null;
    const r = message.parsed_output;
    if (!r || !r.lisible || r.fr.length === 0 || r.en.length === 0) return null;
    const fr = r.fr.map((p) => sansTirets(p.trim())).filter(Boolean);
    const en = r.en.map((p) => sansTirets(p.trim())).filter(Boolean);
    if (!recopie(fr, texte) && !recopie(en, texte)) return { fr, en };
  }
  return null;
}

export const prixDe = (f: Facture): number => f.entree * PRIX_ENTREE + f.sortie * PRIX_SORTIE;
