/* LE PRE-RENDU : UNE VRAIE PAGE HTML PAR CHOSE QUE LE SITE SAIT.
 *
 * Mika, le 14 septembre 2026 : « fais du referencement de fou, je veux du
 * monde sur le site ». Le site est une application a ancres : pour un
 * moteur de recherche, sonaa.ca etait une seule page. Ce script tourne
 * apres `vite build` et ecrit dans dist/ :
 *
 *   /styles/                            les 14 familles
 *   /styles/<famille>/                  une famille et ses genres
 *   /styles/<famille>/<genre>/          la fiche complete d'un genre :
 *                                       description, morceaux, fiche
 *                                       technique, artistes, le cours entier
 *   /soirees/<ville>/                   les soirees a venir d'une ville
 *   /soirees/<ville>/<id>/              une soiree, avec ses donnees
 *                                       structurees MusicEvent
 *   /sons/                              les sets publies
 *   /sons/<id>/                         un set, MusicRecording
 *   /sitemap.xml, /robots.txt
 *
 * Chaque page est le index.html du build, avec le titre, la description, le
 * canonique et le contenu ecrits dedans, plus une ligne qui pose l'ancre :
 * l'app demarre par-dessus a la meme adresse (voir src/lib/chemins.ts) et
 * remplace le contenu par la vraie page. Ce que Google lit est ce que la
 * personne voit, a la meme adresse : pas de redirection, pas de doublon.
 *
 * Les soirees et les sets viennent de la base, avec la cle publique : si
 * elle manque (build local sans .env), ces pages sont simplement absentes
 * et le script le dit. Rien n'est invente. */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { FAMILIES, STRUCTURES, type Genre } from '../src/atlas/structures.ts';
import { ORIGINE, PREFIXE_ANGLAIS, cheminsDesStyles, slug } from '../src/lib/chemins.ts';
import { ranger, vocabulaire } from '../src/lib/correspondance-styles.ts';
import { MARCHAND_ACTIF } from '../src/config.ts';
import { actuSansReeditions, cleDeLabel, labelsDuStyle, type ActuDuLabel, type EntreeLabel, type FicheLabel } from '../src/lib/labels.ts';
import { MARQUES, type GroupeMarque } from '../src/data/marques.ts';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const RACINE = fileURLToPath(new URL('..', import.meta.url));
const COURS = JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/cours.json', import.meta.url)), 'utf8')) as Record<string, Cours>;
const ARTISTES = (JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/artistes.json', import.meta.url)), 'utf8')) as { parGenre: Record<string, string[]> }).parGenre;

interface Cours {
  tempo: string; rythme: string; basse: string; sons: string; arrangement: string; mix: string;
  etapes: string[]; reperes: string[]; sources: string[];
  outils?: { nom: string; type: string; pourquoi: string }[]; sourcesOutils?: string[];
}

const CONTENEUR = '<div id="root">';
const gabarit = readFileSync(join(DIST, 'index.html'), 'utf8');
if (!gabarit.includes(CONTENEUR)) throw new Error('dist/index.html : conteneur root introuvable');

const h = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const couper = (s: string, n: number): string => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);
const aujourdhui = new Date().toISOString().slice(0, 10);

interface Page {
  chemin: string;
  hash: string;
  titre: string;
  description: string;
  corps: string;
  jsonld: unknown[];
  image?: string | undefined;
  /** Les dimensions de l'image quand on les connait : Facebook affiche
      l'apercu des le premier partage au lieu d'attendre de l'avoir mesuree. */
  imageTaille?: readonly [number, number] | undefined;
  /** 'en' pour une page sous /en/ ; le francais est la langue par defaut. */
  langue?: 'en' | undefined;
  /** Le chemin de la meme page dans l'autre langue, pour hreflang. */
  alterne?: string | undefined;
  /* HORS INDEX ET HORS PLAN DU SITE. Le panier n'a rien a dire a un moteur :
     il est vide pour tout le monde sauf pour celui qui l'a rempli. */
  noindex?: boolean | undefined;
  /* UNE AUTRE PAGE FAIT AUTORITE. Les anciennes adresses /sons/ restent
     servies, parce qu'elles sont indexees et partagees, mais elles disent
     elles-memes que la bonne adresse est /mixtapes/. Elles sortent du plan du
     site : un plan ne liste que des canoniques. */
  canonique?: string | undefined;
}

const pages: Page[] = [];

function ecrire(p: Page): void {
  const url = ORIGINE + p.chemin;
  const meta = [
    `<title>${h(p.titre)}</title>`,
    `<meta name="description" content="${h(p.description)}" />`,
    `<link rel="canonical" href="${h(ORIGINE + (p.canonique ?? p.chemin))}" />`,
    p.noindex ? `<meta name="robots" content="noindex, follow" />` : '',
    `<meta property="og:title" content="${h(p.titre)}" />`,
    `<meta property="og:description" content="${h(p.description)}" />`,
    `<meta property="og:url" content="${h(url)}" />`,
    `<meta property="og:type" content="article" />`,
    p.image ? `<meta property="og:image" content="${h(p.image)}" />` : '',
    p.image && p.imageTaille ? `<meta property="og:image:width" content="${p.imageTaille[0]}" />\n    <meta property="og:image:height" content="${p.imageTaille[1]}" />` : '',
    `<meta name="twitter:card" content="summary_large_image" />`,
    /* LES DEUX LANGUES SE DECLARENT L'UNE L'AUTRE : sans cela, un moteur
       prend la page anglaise pour un doublon de la francaise. */
    ...(p.alterne
      ? [
          `<link rel="alternate" hreflang="${p.langue === 'en' ? 'fr' : 'en'}" href="${h(ORIGINE + p.alterne)}" />`,
          `<link rel="alternate" hreflang="${p.langue === 'en' ? 'en' : 'fr'}" href="${h(url)}" />`,
          `<link rel="alternate" hreflang="x-default" href="${h(ORIGINE + (p.langue === 'en' ? p.alterne : p.chemin))}" />`,
        ]
      : []),
    ...p.jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
  ].join('\n    ');
  /* L'ANCRE EST POSEE AVANT QUE L'APP NE LISE L'ADRESSE. Le chemin reste, elle
     le suit. L'app sait aussi le faire seule (chemins.ts), pour le cas ou le
     service worker sert son propre index.html a la place de cette page. */
  const amorce = `<script>if(!location.hash){history.replaceState(null,'',location.pathname+location.search+${JSON.stringify(p.hash)})}</script>`;
  /* LE GABARIT EST NETTOYE AVANT L'INJECTION, pas apres : les balises de la
     racine (description, Open Graph, Twitter, canonical) partent, y compris
     celles ecrites sur plusieurs lignes, puis les notres prennent la place
     du titre. Nettoyer apres effacait aussi ce qu'on venait d'ecrire. */
  let html = gabarit
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>\n?/g, '')
    .replace(/<link\s+rel="canonical"[^>]*>\n?/g, '')
    .replace(/<meta\s+property="og:(?:title|description|url|type|image|image:width|image:height|image:alt)"\s+content="[^"]*"\s*\/>\n?/g, '')
    .replace(/<meta\s+name="twitter:[^"]*"\s+content="[^"]*"\s*\/>\n?/g, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, '');
  html = html.replace(/<title>[^<]*<\/title>/, () => meta);
  if (p.langue === 'en') {
    html = html.replace('<html lang="fr">', '<html lang="en">').replace('property="og:locale" content="fr_FR"', 'property="og:locale" content="en_CA"');
  }
  /* LE CONTENU ENTRE DANS LE CONTENEUR DE L'APP, devant l'ecran de
     chargement : React remplace tout au montage, les moteurs lisent tout
     avant. */
  html = html.replace('<div id="root">', `${amorce}<div id="root"><main class="prerendu">${p.corps}</main>`);
  const dossier = join(DIST, p.chemin);
  mkdirSync(dossier, { recursive: true });
  writeFileSync(join(dossier, 'index.html'), html, 'utf8');
  pages.push(p);
}

/* ═══ LES STYLES ═══ */

const entete = (fil: { nom: string; href: string }[]): string =>
  `<nav class="sr-fil" aria-label="Fil d’Ariane">${[{ nom: 'SONAA', href: '/' }, ...fil]
    .map((x) => `<a href="${h(x.href)}">${h(x.nom)}</a>`)
    .join(' › ')}</nav>`;

const filAriane = (fil: { nom: string; href: string }[]): unknown => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [{ nom: 'SONAA', href: '/' }, ...fil].map((x, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: x.nom,
    item: ORIGINE + x.href,
  })),
});

const styles = cheminsDesStyles();
/* LES LABELS D'UN STYLE, en liens vers leurs pages : les memes que la fiche
   du style montre (voir labelsDuStyle). */
const INDEX_LABELS = existsSync(fileURLToPath(new URL('../src/data/labels-index.json', import.meta.url)))
  ? (JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/labels-index.json', import.meta.url)), 'utf8')) as EntreeLabel[])
  : [];
function labelsEnLiens(g: { tracks: readonly { release?: { label?: string | null } | null }[]; labelsHistoriques: readonly string[]; labelsActuels: readonly string[] | null }): string {
  return labelsDuStyle(
    g.tracks.map((tr) => tr.release?.label),
    [...g.labelsHistoriques, ...(g.labelsActuels ?? [])],
    INDEX_LABELS
  )
    .map((l) => (l.entree ? `<a href="/labels/${h(l.entree.s)}/">${h(l.nom)}</a>` : h(l.nom)))
    .join(', ');
}

const cheminDuGenre = new Map<string, string>();
for (const s of styles) if (s.gl !== null) cheminDuGenre.set((STRUCTURES[s.fi]?.genres[s.gl] as Genre).id, s.chemin);

ecrire({
  chemin: '/styles/',
  hash: '#/parcourir',
  titre: 'Les styles de musique électronique : 219 genres, 14 familles · SONAA',
  description:
    'Un atlas généalogique des musiques électroniques : 219 genres classés en 14 familles, avec pour chacun son histoire, ses morceaux de référence, ses machines et un cours de production.',
  /* LA LISTE DES QUATORZE FAMILLES RESTE DANS LE HTML STATIQUE, en liens
     simples : c'est ce que lit un moteur, et c'est ce que voit quelqu'un qui
     arrive avant que le bundle soit la. Le nuage de bulles s'y substitue a
     l'hydratation. Voir NuageFamilles.tsx.

     LE LIEN VERS L'INDEX A PLAT EST PARTI d'ici aussi, le 22 septembre
     2026 : Mika ne veut plus aucun lien visible vers lui depuis cette page.
     La route `#/index` reste servie par l'application. */
  corps: `${entete([{ nom: 'Atlas', href: '/styles/' }])}<h1>Les styles de musique électronique</h1><p>219 genres, 14 familles, écrits et vérifiés à la main.</p><ul>${FAMILIES.map(
    (f, fi) => `<li><a href="/styles/${slug(f.label)}/">${h(f.label)}</a> : ${STRUCTURES[fi]?.genres.length ?? 0} genres</li>`
  ).join('')}</ul>`,
  jsonld: [filAriane([{ nom: 'Atlas', href: '/styles/' }])],
});

for (const s of styles) {
  const famille = FAMILIES[s.fi];
  const struct = STRUCTURES[s.fi];
  if (!famille || !struct) continue;
  const cheminFamille = `/styles/${slug(famille.label)}/`;
  if (s.gl === null) {
    const desc = (famille.description ?? '').trim();
    ecrire({
      chemin: s.chemin,
      hash: s.hash,
      titre: `${famille.label} : les ${struct.genres.length} genres, leur histoire et comment les produire · SONAA`,
      description: couper(desc || `La famille ${famille.label} de la musique électronique : ${struct.genres.length} genres, avec leur histoire, leurs morceaux et un cours de production pour chacun.`, 158),
      corps: `${entete([{ nom: 'Atlas', href: '/styles/' }, { nom: famille.label, href: cheminFamille }])}<h1>${h(famille.label)}</h1>${desc ? `<p>${h(desc)}</p>` : ''}<h2>Les genres</h2><ul>${struct.genres
        .map((g) => `<li><a href="${cheminDuGenre.get(g.id) ?? '#'}">${h(g.label)}</a>${g.annee > 0 ? ` (${g.annee})` : ''}${g.description ? ` : ${h(couper(g.description, 160))}` : ''}</li>`)
        .join('')}</ul>`,
      jsonld: [filAriane([{ nom: 'Atlas', href: '/styles/' }, { nom: famille.label, href: cheminFamille }])],
    });
    continue;
  }
  const g = struct.genres[s.gl] as Genre;
  const cours = COURS[g.id];
  const artistes = ARTISTES[g.id] ?? [];
  const voisins = struct.genres.filter((x) => x.id !== g.id).slice(0, 12);
  /* LA FILIATION, EN LIENS : d'ou le genre vient, ce qu'il a donne. C'est
     le coeur de l'atlas et c'est ce qui relie les pages entre elles. */
  const parentLocal = g.parent >= 0 ? struct.genres[g.parent] : undefined;
  const parents: { label: string; href: string | null }[] = [
    ...(parentLocal ? [{ label: parentLocal.label, href: cheminDuGenre.get(parentLocal.id) ?? null }] : []),
    ...g.externalParents.map((x) => {
      const fam = FAMILIES[x.family];
      const trouve = STRUCTURES[x.family]?.genres.find((y) => y.label === x.label);
      return { label: `${x.label}${fam && fam.label !== x.label ? ` (${fam.label})` : ''}`, href: trouve ? (cheminDuGenre.get(trouve.id) ?? null) : fam ? `/styles/${slug(fam.label)}/` : null };
    }),
  ];
  const enfants = g.children.map((i) => struct.genres[i]).filter((x): x is Genre => !!x);
  const lien = (x: { label: string; href: string | null }) => (x.href ? `<a href="${x.href}">${h(x.label)}</a>` : h(x.label));
  const filiation =
    (parents.length ? `<h3>Vient de</h3><ul>${parents.map((x) => `<li>${lien(x)}</li>`).join('')}</ul>` : '') +
    (enfants.length ? `<h3>A donné</h3><ul>${enfants.map((x) => `<li>${lien({ label: x.label, href: cheminDuGenre.get(x.id) ?? null })}</li>`).join('')}</ul>` : '');
  /* LES QUESTIONS QUE LES GENS TAPENT, avec la reponse courte que la page
     tient deja : c'est la forme que les moteurs reprennent en extrait. */
  const questions: [string, string][] = [];
  if (g.description) questions.push([`Qu’est-ce que le ${g.label} ?`, couper(g.description, 300)]);
  if (g.bpmRange) questions.push([`À quel tempo joue-t-on le ${g.label} ?`, `Entre ${g.bpmRange[0]} et ${g.bpmRange[1]} BPM.${cours ? ` ${couper(cours.tempo, 240)}` : ''}`]);
  if (g.artistesCles.length) questions.push([`Quels sont les artistes clés du ${g.label} ?`, g.artistesCles.join(', ') + '.']);
  if (g.machines.length || cours?.outils?.length)
    questions.push([`Avec quoi produit-on du ${g.label} ?`, [...g.machines, ...(cours?.outils ?? []).map((o) => o.nom)].filter((x, i, a) => a.indexOf(x) === i).slice(0, 10).join(', ') + '.']);
  const faq = questions.length ? `<h2>Questions fréquentes</h2>${questions.map(([q, r]) => `<h3>${h(q)}</h3><p>${h(r)}</p>`).join('')}` : '';
  const faqLd = questions.length
    ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: questions.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })) }
    : null;
  const titre = `${g.label} : histoire, morceaux de référence et cours de production · SONAA`;
  const description = couper(g.description || `${g.label}, un genre de la famille ${famille.label}.`, 158);
  const brut = g.tracks.find((t) => t.cover)?.cover;
  const cover = brut ? (brut.startsWith('http') ? brut : `${ORIGINE}/${brut.replace(/^\/+/, '')}`) : undefined;
  const fiche = [
    g.bpmRange ? `<li>Tempo : ${g.bpmRange[0]} à ${g.bpmRange[1]} BPM</li>` : '',
    g.annee > 0 ? `<li>Apparition : ${g.yearStart ? '' : 'vers '}${g.annee}</li>` : '',
    g.machines.length ? `<li>Machines : ${h(g.machines.join(', '))}</li>` : '',
    g.sonorites.length ? `<li>Le son : ${h(g.sonorites.join(', '))}</li>` : '',
    labelsEnLiens(g) ? `<li>Labels : ${labelsEnLiens(g)}</li>` : '',
    g.artistesCles.length ? `<li>Artistes clés : ${h(g.artistesCles.join(', '))}</li>` : '',
  ].join('');
  const rubriques = cours
    ? (
        [
          ['Tempo et groove', cours.tempo], ['La rythmique', cours.rythme], ['La basse', cours.basse],
          ['Les sons', cours.sons], ['L’arrangement', cours.arrangement], ['Le mix', cours.mix],
        ] as [string, string][]
      )
        .map(([t, x]) => `<h3>${h(t)}</h3><p>${h(x)}</p>`)
        .join('') +
      (cours.outils?.length
        ? `<h3>Les plugins et machines</h3><ul>${cours.outils.map((o) => `<li><strong>${h(o.nom)}</strong> (${h(o.type)}) : ${h(o.pourquoi)}</li>`).join('')}</ul>`
        : '') +
      `<h3>Pour commencer</h3><ol>${cours.etapes.map((e) => `<li>${h(e)}</li>`).join('')}</ol>` +
      `<h3>À écouter en travaillant</h3><ul>${cours.reperes.map((r) => `<li>${h(r)}</li>`).join('')}</ul>` +
      `<p>Sources : ${h([...cours.sources, ...(cours.sourcesOutils ?? [])].filter((x, i, a) => a.indexOf(x) === i).join(' · '))}</p>`
    : '';
  ecrire({
    chemin: s.chemin,
    hash: s.hash,
    titre,
    description,
    image: cover,
    corps:
      `${entete([{ nom: 'Atlas', href: '/styles/' }, { nom: famille.label, href: cheminFamille }, { nom: g.label, href: s.chemin }])}` +
      `<h1>${h(g.label)}</h1>` +
      `<p>${h(famille.label)}${g.annee > 0 ? ` · ${g.annee}` : ''}${g.bpmRange ? ` · ${g.bpmRange[0]} à ${g.bpmRange[1]} BPM` : ''}${g.aliases.length ? ` · aussi appelé ${h(g.aliases.join(', '))}` : ''}</p>` +
      (g.description ? `<p>${h(g.description)}</p>` : '') +
      (g.tracks.length ? `<h2>${g.tracks.length} morceaux de référence</h2><ol>${g.tracks.map((t) => `<li>${h(t.artist)} : ${h(t.title)}${t.year ? ` (${t.year})` : ''}</li>`).join('')}</ol>` : '') +
      (fiche ? `<h2>Fiche technique</h2><ul>${fiche}</ul>` : '') +
      (artistes.length ? `<h2>Artistes du style</h2><p>${h(artistes.slice(0, 30).join(', '))}</p>` : '') +
      (cours ? `<h2>Produire ce style</h2><p>Un cours écrit pour SONAA, en français, à partir des sources citées : un point de départ, pas une recette.</p>${rubriques}` : '') +
      (filiation ? `<h2>La filiation</h2>${filiation}` : '') +
      faq +
      (voisins.length ? `<h2>Dans la même famille</h2><ul>${voisins.map((v) => `<li><a href="${cheminDuGenre.get(v.id) ?? '#'}">${h(v.label)}</a></li>`).join('')}</ul>` : '') +
      `<p><a href="${s.chemin}${s.hash}">Écouter ${h(g.label)} dans l’atlas</a> · <a href="${PREFIXE_ANGLAIS}${s.chemin}" hreflang="en">This page in English</a></p>`,
    alterne: `${PREFIXE_ANGLAIS}${s.chemin}`,
    jsonld: [
      ...(faqLd ? [faqLd] : []),
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `${g.label} : histoire, morceaux et cours de production`,
        description,
        inLanguage: 'fr',
        image: cover ? [cover] : undefined,
        author: { '@type': 'Organization', name: 'SONAA', url: ORIGINE },
        publisher: { '@type': 'Organization', name: 'SONAA', url: ORIGINE },
        mainEntityOfPage: ORIGINE + s.chemin,
        dateModified: aujourdhui,
        about: { '@type': 'MusicGenre', name: g.label },
      },
      filAriane([{ nom: 'Atlas', href: '/styles/' }, { nom: famille.label, href: cheminFamille }, { nom: g.label, href: s.chemin }]),
    ],
  });
}

/* ═══ LES MEMES STYLES EN ANGLAIS ═══ Sous /en/, avec la description et le
   texte de production ecrits en anglais (textes-en.json), les listes qui
   n'ont pas de langue (morceaux, machines, artistes), et le lien vers le
   cours complet, qui reste en francais. */

const EN = JSON.parse(readFileSync(join(RACINE, 'src/data/textes-en.json'), 'utf8')) as Record<string, { description: string; production: string }>;
const enteteEn = (fil: { nom: string; href: string }[]): string =>
  `<nav class="sr-fil" aria-label="Breadcrumb">${[{ nom: 'SONAA', href: '/' }, ...fil].map((x) => `<a href="${h(x.href)}">${h(x.nom)}</a>`).join(' › ')}</nav>`;
const cheminEn = (chemin: string) => `${PREFIXE_ANGLAIS}${chemin}`;

ecrire({
  chemin: cheminEn('/styles/'),
  hash: '#/parcourir',
  langue: 'en',
  alterne: '/styles/',
  titre: 'Electronic music styles: 219 genres in 14 families · SONAA',
  description: 'A family tree of electronic music: 219 genres in 14 families, each with its history, reference tracks, machines and a production guide.',
  corps: `${enteteEn([{ nom: 'Atlas', href: cheminEn('/styles/') }])}<h1>Electronic music styles</h1><p>219 genres, 14 families, written and checked by hand.</p><ul>${FAMILIES.map(
    (f, fi) => `<li><a href="${cheminEn(`/styles/${slug(f.label)}/`)}">${h(f.label)}</a>: ${STRUCTURES[fi]?.genres.length ?? 0} genres</li>`
  ).join('')}</ul>`,
  jsonld: [filAriane([{ nom: 'Atlas', href: cheminEn('/styles/') }])],
});

for (const s of styles) {
  const famille = FAMILIES[s.fi];
  const struct = STRUCTURES[s.fi];
  if (!famille || !struct) continue;
  const cheminFamille = cheminEn(`/styles/${slug(famille.label)}/`);
  if (s.gl === null) {
    ecrire({
      chemin: cheminEn(s.chemin),
      hash: s.hash,
      langue: 'en',
      alterne: s.chemin,
      titre: `${famille.label}: ${struct.genres.length} genres, their history and how to produce them · SONAA`,
      description: `The ${famille.label} family of electronic music: ${struct.genres.length} genres, each with its history, reference tracks and a production guide.`,
      corps: `${enteteEn([{ nom: 'Atlas', href: cheminEn('/styles/') }, { nom: famille.label, href: cheminFamille }])}<h1>${h(famille.label)}</h1><h2>The genres</h2><ul>${struct.genres
        .map((g) => `<li><a href="${cheminEn(cheminDuGenre.get(g.id) ?? '/styles/')}">${h(g.label)}</a>${g.annee > 0 ? ` (${g.annee})` : ''}${EN[g.id] ? `: ${h(couper(EN[g.id]?.description ?? '', 160))}` : ''}</li>`)
        .join('')}</ul>`,
      jsonld: [filAriane([{ nom: 'Atlas', href: cheminEn('/styles/') }, { nom: famille.label, href: cheminFamille }])],
    });
    continue;
  }
  const g = struct.genres[s.gl] as Genre;
  const en = EN[g.id];
  if (!en) continue;
  const artistes = ARTISTES[g.id] ?? [];
  const voisins = struct.genres.filter((x) => x.id !== g.id).slice(0, 12);
  const brut = g.tracks.find((t) => t.cover)?.cover;
  const cover = brut ? (brut.startsWith('http') ? brut : `${ORIGINE}/${brut.replace(/^\/+/, '')}`) : undefined;
  const titre = `${g.label}: history, key tracks and how to produce it · SONAA`;
  const description = couper(en.description, 158);
  const fiche = [
    g.bpmRange ? `<li>Tempo: ${g.bpmRange[0]} to ${g.bpmRange[1]} BPM</li>` : '',
    g.annee > 0 ? `<li>First appeared: ${g.yearStart ? '' : 'around '}${g.annee}</li>` : '',
    g.machines.length ? `<li>Machines: ${h(g.machines.join(', '))}</li>` : '',
    g.sonorites.length ? `<li>The sound: ${h(g.sonorites.join(', '))}</li>` : '',
    labelsEnLiens(g) ? `<li>Labels: ${labelsEnLiens(g)}</li>` : '',
    g.artistesCles.length ? `<li>Key artists: ${h(g.artistesCles.join(', '))}</li>` : '',
  ].join('');
  const questions: [string, string][] = [
    [`What is ${g.label}?`, couper(en.description, 300)],
    ...(g.bpmRange ? [[`What tempo is ${g.label} played at?`, `Between ${g.bpmRange[0]} and ${g.bpmRange[1]} BPM.`] as [string, string]] : []),
    ...(g.artistesCles.length ? [[`Who are the key ${g.label} artists?`, g.artistesCles.join(', ') + '.'] as [string, string]] : []),
  ];
  ecrire({
    chemin: cheminEn(s.chemin),
    hash: s.hash,
    langue: 'en',
    alterne: s.chemin,
    titre,
    description,
    image: cover,
    corps:
      `${enteteEn([{ nom: 'Atlas', href: cheminEn('/styles/') }, { nom: famille.label, href: cheminFamille }, { nom: g.label, href: cheminEn(s.chemin) }])}` +
      `<h1>${h(g.label)}</h1>` +
      `<p>${h(famille.label)}${g.annee > 0 ? ` · ${g.annee}` : ''}${g.bpmRange ? ` · ${g.bpmRange[0]} to ${g.bpmRange[1]} BPM` : ''}${g.aliases.length ? ` · also known as ${h(g.aliases.join(', '))}` : ''}</p>` +
      `<p>${h(en.description)}</p>` +
      (g.tracks.length ? `<h2>${g.tracks.length} reference tracks</h2><ol>${g.tracks.map((t) => `<li>${h(t.artist)}: ${h(t.title)}${t.year ? ` (${t.year})` : ''}</li>`).join('')}</ol>` : '') +
      (fiche ? `<h2>At a glance</h2><ul>${fiche}</ul>` : '') +
      `<h2>Producing ${h(g.label)}</h2><p>${h(en.production)}</p>` +
      (COURS[g.id] ? `<p><a href="${s.chemin}">The full production course, in French</a>: tempo, drums, bass, sounds, arrangement, mix, plugins and machines, and a step by step start.</p>` : '') +
      (artistes.length ? `<h2>Artists</h2><p>${h(artistes.slice(0, 30).join(', '))}</p>` : '') +
      `<h2>Frequently asked</h2>${questions.map(([q, r]) => `<h3>${h(q)}</h3><p>${h(r)}</p>`).join('')}` +
      (voisins.length ? `<h2>In the same family</h2><ul>${voisins.map((v) => `<li><a href="${cheminEn(cheminDuGenre.get(v.id) ?? '/styles/')}">${h(v.label)}</a></li>`).join('')}</ul>` : '') +
      `<p><a href="${cheminEn(s.chemin)}${s.hash}">Listen to ${h(g.label)} in the atlas</a> · <a href="${s.chemin}" hreflang="fr">Cette page en français</a></p>`,
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: questions.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })) },
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `${g.label}: history, key tracks and how to produce it`,
        description,
        inLanguage: 'en',
        image: cover ? [cover] : undefined,
        author: { '@type': 'Organization', name: 'SONAA', url: ORIGINE },
        publisher: { '@type': 'Organization', name: 'SONAA', url: ORIGINE },
        mainEntityOfPage: ORIGINE + cheminEn(s.chemin),
        dateModified: aujourdhui,
        about: { '@type': 'MusicGenre', name: g.label },
      },
      filAriane([{ nom: 'Atlas', href: cheminEn('/styles/') }, { nom: famille.label, href: cheminFamille }, { nom: g.label, href: cheminEn(s.chemin) }]),
    ],
  });
}

/* ═══ LES SOIREES ET LES SETS, DEPUIS LA BASE ═══ */

const SUPABASE_URL = process.env['VITE_SUPABASE_URL'];
const SUPABASE_KEY = process.env['VITE_SUPABASE_ANON_KEY'];

interface Soiree {
  id: string; titre: string; debut: string; fin: string | null; lieu: string | null; adresse: string | null;
  lien: string | null; affiche: string | null; artistes: string[] | null; genres: string[] | null;
  organisateur: string | null; description: string | null; ville_id: string; prix: string | null; created_at: string;
}
interface Ville { id: string; slug: string; name: string; country_code: string; timezone: string }
interface ArtisteDuSite { user_id: string; nom: string; bio: string | null; lieu: string | null; avatar_path: string | null; banniere_path: string | null; liens: Record<string, string> | null; n_sets: number }
interface Set { id: string; user_id: string; titre: string; description: string | null; duree_s: number | null; cover_path: string | null; artiste_nom: string | null; created_at: string; genre_ids: string[] | null }

async function lire<T>(chemin: string): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${chemin}`, { headers: { apikey: SUPABASE_KEY } });
    if (!r.ok) return [];
    return (await r.json()) as T[];
  } catch {
    return [];
  }
}

const quandLisible = (iso: string, fuseau: string): string =>
  new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: fuseau }).format(new Date(iso));

const villesConnues = await lire<Ville>('villes?select=id,slug,name,country_code,timezone&is_active=eq.true');
const dans60Jours = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString();
const soirees = await lire<Soiree>(
  `soirees_manuelles?select=id,titre,debut,fin,lieu,adresse,lien,affiche,artistes,genres,organisateur,description,ville_id,prix,created_at&publiee=eq.true&debut=gte.${new Date().toISOString()}&debut=lte.${dans60Jours}&order=debut.asc&limit=1000`
);
/* LA FAMILLE D'UNE SOIREE, depuis ses styles en texte libre (« HARD TECHNO »,
   « Deep House ») : le meme rangement que pour les artistes. Une soiree peut
   tenir de plusieurs familles ; elle apparait dans chacune. */
const VOC = vocabulaire(STRUCTURES.flatMap((x) => x.genres.map((g) => ({ id: g.id, label: g.label }))), FAMILIES.map((f) => ({ id: f.id, label: f.label })));
const FAMILLE_DU_GENRE = new Map<string, string>();
FAMILIES.forEach((f, fi) => (STRUCTURES[fi]?.genres ?? []).forEach((g) => FAMILLE_DU_GENRE.set(g.id, f.id)));
const famillesDeLaSoiree = (s: Soiree): string[] => {
  const out = new Set<string>();
  for (const nom of s.genres ?? []) {
    const cible = ranger(nom, VOC);
    if (!cible) continue;
    const id = cible.sorte === 'famille' ? cible.id : FAMILLE_DU_GENRE.get(cible.id);
    if (id) out.add(id);
  }
  return [...out];
};

/* CE QUE GOOGLE ATTEND D'UN EVENEMENT, ET QU'ON PEUT DIRE SANS INVENTER.
   Search Console, le 15 septembre 2026 : endDate, organizer, et dans
   l'offre price, priceCurrency et validFrom manquaient. La fin d'une soiree
   qui n'en annonce pas est posee six heures apres le debut, ce qui est une
   nuit de club ; l'organisateur inconnu devient la salle ; l'offre n'existe
   que si un prix se lit, en monnaie du pays. Un prix invente vaudrait
   pire qu'un champ vide. */
const MONNAIE: Record<string, string> = { CA: 'CAD', US: 'USD', GB: 'GBP', CH: 'CHF', MX: 'MXN', BR: 'BRL', JP: 'JPY', AU: 'AUD' };
const monnaieDe = (pays: string): string => MONNAIE[pays] ?? 'EUR';
const prixLisible = (p: string | null): number | null => {
  if (!p) return null;
  if (/gratuit|free|libre/i.test(p)) return 0;
  const m = p.replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};
const finPresumee = (debut: string): string => new Date(new Date(debut).getTime() + 6 * 3600 * 1000).toISOString();
const evenementDe = (s: Soiree, v: Ville, cheminVille: string): unknown => {
  const prix = prixLisible(s.prix);
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: s.titre,
    startDate: s.debut,
    endDate: s.fin ?? finPresumee(s.debut),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: { '@type': 'Place', name: s.lieu ?? v.name, address: s.adresse ?? `${v.name}, ${v.country_code}` },
    image: s.affiche ? [s.affiche] : undefined,
    description: s.description ? couper(s.description, 300) : undefined,
    organizer: { '@type': 'Organization', name: s.organisateur ?? s.lieu ?? v.name, ...(s.lien ? { url: s.lien } : {}) },
    performer: (s.artistes ?? []).length ? (s.artistes ?? []).map((a) => ({ '@type': 'MusicGroup', name: a })) : { '@type': 'MusicGroup', name: s.titre },
    offers:
      prix !== null
        ? {
            '@type': 'Offer',
            price: prix,
            priceCurrency: monnaieDe(v.country_code),
            url: s.lien ?? ORIGINE + `${cheminVille}${s.id}/`,
            availability: 'https://schema.org/InStock',
            validFrom: s.created_at.slice(0, 10),
          }
        : undefined,
    url: ORIGINE + `${cheminVille}${s.id}/`,
  };
};

if (soirees.length > 0) {
  const villesAvecSoirees = villesConnues.filter((v) => soirees.some((s) => s.ville_id === v.id));
  ecrire({
    chemin: '/soirees/',
    hash: '#/calendrier',
    titre: 'Les soirées de musique électronique, ville par ville · SONAA',
    description: `Le calendrier des soirées électroniques dans ${villesAvecSoirees.length} villes : techno, house, drum and bass, trance. Relevé chaque jour, avec la salle, l’heure et les billets.`,
    corps: `${entete([{ nom: 'Soirées', href: '/soirees/' }])}<h1>Les soirées de musique électronique</h1><ul>${villesAvecSoirees
      .map((v) => `<li><a href="/soirees/${v.slug}/">${h(v.name)}</a> : ${soirees.filter((s) => s.ville_id === v.id).length} soirées à venir</li>`)
      .join('')}</ul>`,
    jsonld: [filAriane([{ nom: 'Soirées', href: '/soirees/' }])],
  });
  for (const v of villesConnues) {
    const liste = soirees.filter((s) => s.ville_id === v.id);
    if (liste.length === 0) continue;
    const cheminVille = `/soirees/${v.slug}/`;
    /* UNE PAGE PAR FAMILLE ET PAR VILLE, quand elle a au moins deux dates :
       « soirées techno à Montréal », c'est ce que les gens tapent. */
    const parFamille = new Map<string, Soiree[]>();
    for (const s of liste) for (const f of famillesDeLaSoiree(s)) parFamille.set(f, [...(parFamille.get(f) ?? []), s]);
    const famillesIci = FAMILIES.filter((f) => (parFamille.get(f.id)?.length ?? 0) >= 2);
    const liensFamilles = famillesIci.length
      ? `<h2>Par style</h2><ul>${famillesIci.map((f) => `<li><a href="${cheminVille}${slug(f.label)}/">Soirées ${h(f.label.toLowerCase())} à ${h(v.name)}</a> : ${parFamille.get(f.id)?.length ?? 0}</li>`).join('')}</ul>`
      : '';
    for (const f of famillesIci) {
      const sous = parFamille.get(f.id) ?? [];
      const cheminFamille = `${cheminVille}${slug(f.label)}/`;
      ecrire({
        chemin: cheminFamille,
        hash: `#/calendrier?city=${v.slug}`,
        titre: `Soirées ${f.label.toLowerCase()} à ${v.name} : ${sous.length} dates à venir · SONAA`,
        description: `${sous.length} soirées ${f.label.toLowerCase()} à ${v.name} dans les 60 prochains jours, avec la salle, l’heure, les artistes et les billets. Relevé chaque jour.`,
        image: sous.find((s) => s.affiche)?.affiche ?? undefined,
        corps: `${entete([{ nom: 'Soirées', href: '/soirees/' }, { nom: v.name, href: cheminVille }, { nom: f.label, href: cheminFamille }])}<h1>Soirées ${h(f.label.toLowerCase())} à ${h(v.name)}</h1><p>${sous.length} dates à venir. <a href="/styles/${slug(f.label)}/">Ce qu’est la ${h(f.label.toLowerCase())}</a>, et ses genres.</p><ul>${sous
          .map((s) => `<li><a href="${cheminVille}${s.id}/">${h(s.titre)}</a> : ${h(quandLisible(s.debut, v.timezone))}${s.lieu ? `, ${h(s.lieu)}` : ''}${s.artistes?.length ? `, avec ${h(s.artistes.slice(0, 4).join(', '))}` : ''}</li>`)
          .join('')}</ul><p><a href="${cheminVille}">Toutes les soirées à ${h(v.name)}</a></p>`,
        jsonld: [filAriane([{ nom: 'Soirées', href: '/soirees/' }, { nom: v.name, href: cheminVille }, { nom: f.label, href: cheminFamille }]), ...sous.slice(0, 50).map((s) => evenementDe(s, v, cheminVille))],
      });
    }
    const evenement = (s: Soiree): unknown => evenementDe(s, v, cheminVille);
    ecrire({
      chemin: cheminVille,
      hash: `#/calendrier?city=${v.slug}`,
      titre: `Soirées électroniques à ${v.name} : le calendrier des prochains jours · SONAA`,
      description: `${liste.length} soirées de musique électronique à ${v.name} dans les 60 prochains jours : techno, house, drum and bass, avec la salle, l’heure et les billets.`,
      corps: `${entete([{ nom: 'Soirées', href: '/soirees/' }, { nom: v.name, href: cheminVille }])}<h1>Soirées électroniques à ${h(v.name)}</h1><p>${liste.length} soirées à venir, relevées chaque jour.</p>${liensFamilles}<h2>Toutes les dates</h2><ul>${liste
        .map((s) => `<li><a href="${cheminVille}${s.id}/">${h(s.titre)}</a> : ${h(quandLisible(s.debut, v.timezone))}${s.lieu ? `, ${h(s.lieu)}` : ''}</li>`)
        .join('')}</ul>`,
      jsonld: [filAriane([{ nom: 'Soirées', href: '/soirees/' }, { nom: v.name, href: cheminVille }]), ...liste.slice(0, 50).map(evenement)],
    });
    for (const s of liste) {
      const quand = quandLisible(s.debut, v.timezone);
      ecrire({
        chemin: `${cheminVille}${s.id}/`,
        hash: `#/calendrier?city=${v.slug}`,
        titre: `${s.titre} · ${s.lieu ?? v.name} · ${quand} · SONAA`,
        description: couper(`${s.titre}, ${quand}${s.lieu ? ` à ${s.lieu}` : ''}, ${v.name}.${s.artistes?.length ? ` Avec ${s.artistes.join(', ')}.` : ''}${s.description ? ` ${s.description}` : ''}`, 158),
        image: s.affiche ?? undefined,
        corps:
          `${entete([{ nom: 'Soirées', href: cheminVille }, { nom: v.name, href: cheminVille }, { nom: s.titre, href: `${cheminVille}${s.id}/` }])}<h1>${h(s.titre)}</h1>` +
          `<p>${h(quand)}${s.lieu ? ` · ${h(s.lieu)}` : ''}${s.adresse ? ` · ${h(s.adresse)}` : ''}</p>` +
          (s.artistes?.length ? `<p>Avec ${h(s.artistes.join(', '))}</p>` : '') +
          (s.genres?.length ? `<p>Styles : ${h(s.genres.join(', '))}</p>` : '') +
          (s.description ? `<p>${h(s.description)}</p>` : '') +
          (s.lien ? `<p><a href="${h(s.lien)}" rel="noopener">Billets et détails</a></p>` : '') +
          `<p><a href="${cheminVille}">Toutes les soirées à ${h(v.name)}</a></p>`,
        jsonld: [evenement(s)],
      });
    }
  }
}

const sets = await lire<Set>('sets_publics?select=id,user_id,titre,description,duree_s,cover_path,artiste_nom,created_at,genre_ids&order=created_at.desc&limit=500');
if (sets.length > 0) {
  const pochette = (c: string | null): string | undefined =>
    c ? `${SUPABASE_URL}/storage/v1/object/public/covers/${c}` : undefined;
  const dureeIso = (s: number | null): string | undefined => (s ? `PT${Math.floor(s / 60)}M${s % 60}S` : undefined);

  /* ═══ L'IMAGE DE PARTAGE, EN JPEG ═══ Les pochettes sont deposees en WebP,
     et la documentation de Facebook ne cite que JPEG, PNG et GIF. Mika, le
     27 octobre 2026 : « fais la copie JPEG des pochettes ». Chaque mixtape
     recoit donc une image de 1200 sur 630, le format de l'apercu : la
     pochette entiere au centre, sur un fond fait d'elle-meme, floute et
     assombri, pour qu'aucun cadrage ne coupe son texte. Le nom porte une
     empreinte du chemin de la pochette : une pochette changee change
     d'adresse, et Facebook ne ressert pas l'ancienne de son cache. Si la
     pochette ne se lit pas, la page garde le WebP. */
  const TAILLE_OG = [1200, 630] as const;
  const MARGE_OG = 40;
  /** L'image de partage d'une image source, ecrite sous /og/<dossier>/ ;
      son adresse publique, ou null si la source ne se lit pas. */
  const fabriquerImage = async (source: string, chemin: string, dossier: string, cle: string): Promise<string | null> => {
    try {
      const r = await fetch(source);
      if (!r.ok) return null;
      const brut = Buffer.from(await r.arrayBuffer());
      const [l, ht] = TAILLE_OG;
      const fond = await sharp(brut).resize(l, ht, { fit: 'cover' }).blur(36).modulate({ brightness: 0.4 }).toBuffer();
      const devant = await sharp(brut).resize(l - 2 * MARGE_OG, ht - 2 * MARGE_OG, { fit: 'inside' }).toBuffer();
      const nom = `${cle}-${createHash('sha1').update(chemin).digest('hex').slice(0, 8)}.jpg`;
      mkdirSync(join(DIST, 'og', dossier), { recursive: true });
      await sharp(fond).composite([{ input: devant, gravity: 'center' }]).jpeg({ quality: 84, mozjpeg: true }).toFile(join(DIST, 'og', dossier, nom));
      return `${ORIGINE}/og/${dossier}/${nom}`;
    } catch {
      return null;
    }
  };
  /* Six a la fois : assez pour ne pas attendre, pas assez pour se faire
     refuser par le stockage. */
  const parSix = async <T,>(liste: readonly T[], f: (x: T) => Promise<void>): Promise<void> => {
    for (let i = 0; i < liste.length; i += 6) await Promise.all(liste.slice(i, i + 6).map(f));
  };
  const imagesDePartage = new Map<string, string>();
  await parSix(sets, async (s) => {
    const source = pochette(s.cover_path);
    const image = source && s.cover_path ? await fabriquerImage(source, s.cover_path, 'mixtapes', s.id) : null;
    if (image) imagesDePartage.set(s.id, image);
  });

  /* ═══ MIXTAPES, ET /sons/ QUI Y MENE ═══
   *
   * La section s'appelait Sons jusqu'au 17 septembre 2026. Ses 4 adresses
   * etaient dans le plan du site soumis a Google et a Bing trois jours plus
   * tot. GitHub Pages ne sait pas repondre 301 : la seule redirection
   * possible est une page qui se sert elle-meme et qui DIT, par un
   * canonique, ou est la bonne. C'est ce que fait `jumelle` ci-dessous. Les
   * anciennes adresses restent donc servies, gardent leur contenu lisible
   * pour qui arrive dessus, et sortent du plan du site. */
  const jumelle = (p: Page): void => {
    ecrire(p);
    ecrire({
      ...p,
      chemin: p.chemin.replace('/mixtapes/', '/sons/'),
      canonique: p.chemin,
      /* Le corps porte le lien vers la bonne adresse, en tete : un visiteur
         qui arrive par un vieux lien doit pouvoir cliquer, pas seulement
         etre compris par un robot. */
      corps: `<p><a href="${p.chemin}">${h(p.titre.replace(/ · SONAA$/, ''))}</a></p>${p.corps}`,
    });
  };

  jumelle({
    chemin: '/mixtapes/',
    hash: '#/mixtapes',
    titre: 'Les mixtapes des DJs et producteurs de SONAA · SONAA',
    description: `${sets.length} mixtapes déposées par les membres de SONAA, à écouter en entier, sans perte, classées par style.`,
    corps: `${entete([{ nom: 'Mixtapes', href: '/mixtapes/' }])}<h1>Les mixtapes</h1><ul>${sets.map((s) => `<li><a href="/mixtapes/${s.id}/">${h(s.titre)}</a> par ${h(s.artiste_nom ?? 'sans nom')}</li>`).join('')}</ul>`,
    jsonld: [filAriane([{ nom: 'Mixtapes', href: '/mixtapes/' }])],
  });
  for (const s of sets) {
    const genres = (s.genre_ids ?? []).map((id) => STRUCTURES.flatMap((x) => x.genres).find((x) => x.id === id)?.label ?? id);
    jumelle({
      chemin: `/mixtapes/${s.id}/`,
      hash: `#/mixtapes/${s.id}`,
      titre: `${s.titre} par ${s.artiste_nom ?? 'un membre de SONAA'} : mixtape à écouter · SONAA`,
      description: couper(`${s.titre}, une mixtape de ${s.artiste_nom ?? 'un membre de SONAA'}${s.duree_s ? ` (${Math.round(s.duree_s / 60)} min)` : ''}${genres.length ? `, ${genres.join(', ')}` : ''}.${s.description ? ` ${s.description}` : ''}`, 158),
      image: imagesDePartage.get(s.id) ?? pochette(s.cover_path),
      imageTaille: imagesDePartage.has(s.id) ? TAILLE_OG : undefined,
      corps: `${entete([{ nom: 'Mixtapes', href: '/mixtapes/' }, { nom: s.titre, href: `/mixtapes/${s.id}/` }])}<h1>${h(s.titre)}</h1><p>${h(s.artiste_nom ?? '')}${s.duree_s ? ` · ${Math.round(s.duree_s / 60)} min` : ''}${genres.length ? ` · ${h(genres.join(', '))}` : ''}</p>${s.description ? `<p>${h(s.description)}</p>` : ''}<p><a href="/mixtapes/${s.id}/#/mixtapes/${s.id}">Écouter cette mixtape</a></p>`,
      jsonld: [
        {
          '@context': 'https://schema.org',
          '@type': 'MusicRecording',
          name: s.titre,
          byArtist: { '@type': 'MusicGroup', name: s.artiste_nom ?? 'SONAA' },
          duration: dureeIso(s.duree_s),
          genre: genres,
          image: pochette(s.cover_path),
          datePublished: s.created_at.slice(0, 10),
          url: `${ORIGINE}/mixtapes/${s.id}/`,
        },
      ],
    });
  }
  /* ═══ LES ARTISTES, depuis le 27 octobre 2026 ═══ Mika : « fais pareil
     pour les profils d'artistes ». La page publique d'un artiste vivait
     sous #/mixtapes/a/<compte>, une ancre qu'aucun robot de partage ne lit.
     Elle a maintenant son chemin, /artistes/<compte>/, et son image de
     partage : la banniere si l'artiste en a une, sinon son portrait, sur le
     meme fond floute que les pochettes. */
  const artistes = await lire<ArtisteDuSite>('artistes_publics?select=user_id,nom,bio,lieu,avatar_path,banniere_path,liens,n_sets&order=dernier_set.desc&limit=500');
  const portrait = (c: string | null): string | undefined =>
    c ? `${SUPABASE_URL}/storage/v1/object/public/avatars/${c}` : undefined;
  const imagesDArtistes = new Map<string, string>();
  await parSix(artistes, async (a) => {
    const chemin = a.banniere_path ?? a.avatar_path;
    const source = portrait(chemin);
    const image = source && chemin ? await fabriquerImage(source, chemin, 'artistes', a.user_id) : null;
    if (image) imagesDArtistes.set(a.user_id, image);
  });
  for (const a of artistes) {
    const siens = sets.filter((s) => s.user_id === a.user_id);
    const n = siens.length || a.n_sets;
    const liens = Object.values(a.liens ?? {}).filter((u) => /^https:\/\//.test(u));
    ecrire({
      chemin: `/artistes/${a.user_id}/`,
      hash: `#/mixtapes/a/${a.user_id}`,
      titre: `${a.nom} : ${n > 1 ? `${n} mixtapes` : 'mixtape'} à écouter · SONAA`,
      description: couper(`${a.nom}${a.lieu ? `, ${a.lieu}` : ''}. ${a.bio ? a.bio : `${n > 1 ? `${n} mixtapes` : 'Une mixtape'} à écouter en entier sur SONAA.`}`, 158),
      image: imagesDArtistes.get(a.user_id) ?? portrait(a.banniere_path ?? a.avatar_path),
      imageTaille: imagesDArtistes.has(a.user_id) ? TAILLE_OG : undefined,
      corps:
        `${entete([{ nom: 'Mixtapes', href: '/mixtapes/' }, { nom: a.nom, href: `/artistes/${a.user_id}/` }])}<h1>${h(a.nom)}</h1>` +
        (a.lieu ? `<p>${h(a.lieu)}</p>` : '') +
        (a.bio ? `<p>${h(a.bio)}</p>` : '') +
        (siens.length ? `<h2>Ses mixtapes</h2><ul>${siens.map((s) => `<li><a href="/mixtapes/${s.id}/">${h(s.titre)}</a></li>`).join('')}</ul>` : '') +
        `<p><a href="/artistes/${a.user_id}/#/mixtapes/a/${a.user_id}">Écouter sur SONAA</a></p>`,
      jsonld: [
        filAriane([{ nom: 'Mixtapes', href: '/mixtapes/' }, { nom: a.nom, href: `/artistes/${a.user_id}/` }]),
        {
          '@context': 'https://schema.org',
          '@type': 'MusicGroup',
          name: a.nom,
          ...(a.bio ? { description: a.bio } : {}),
          ...(a.avatar_path ? { image: portrait(a.avatar_path) } : {}),
          ...(liens.length ? { sameAs: liens } : {}),
          url: `${ORIGINE}/artistes/${a.user_id}/`,
        },
      ],
    });
  }
}

/* ═══ LA COUCHE MARCHANDE ═══ Les adresses existent, la vente non.
   Les trois pages legales, elles, sont indexables quoi qu'il arrive : on doit
   pouvoir les trouver depuis un moteur, c'est meme leur premier usage.

   ═══ TRACKS N'EST PLUS INDEXABLE, ET C'EST UN RENVERSEMENT ASSUME ═══

   Le 17 septembre 2026, Tracks etait ecrite indexable avec une raison qui se
   tenait : une adresse apprise aujourd'hui est une adresse deja classee le
   jour de l'ouverture.

   Elle ne tient plus, parce que la vente n'a pas de date. Une page classee
   sur « acheter des tracks » qui ne vend rien pendant des mois deçoit chaque
   visite qu'elle recoit, et un moteur apprend cela aussi. Mika, le
   21 septembre 2026 : « rien n'est indexe aujourd'hui, ne pas laisser de
   trace ». Le mot juste est la : rien n'a encore ete classe, donc il n'y a
   rien a perdre a attendre, et tout a perdre a promettre.

   LES DEUX PAGES RESTENT ECRITES, servies, et portent `noindex, follow`, ce
   qui les sort aussi du plan du site et d'IndexNow (voir le filtre plus bas).
   Le jour ou MARCHAND_ACTIF repasse a `true`, elles reviennent telles
   qu'elles etaient, et une publication suffit a les annoncer. */

ecrire({
  chemin: '/tracks/',
  hash: '#/tracks',
  noindex: !MARCHAND_ACTIF,
  titre: MARCHAND_ACTIF
    ? 'Tracks : les morceaux des artistes de SONAA · SONAA'
    : 'Bientôt · SONAA',
  description: MARCHAND_ACTIF
    ? 'Les morceaux des artistes de SONAA, achetés directement à celles et ceux qui les ont faits. La vente ouvre bientôt.'
    : 'Il n’y a rien à acheter sur SONAA pour l’instant.',
  corps: MARCHAND_ACTIF
    ? `${entete([{ nom: 'Tracks', href: '/tracks/' }])}<h1>Tracks</h1><p>Les morceaux des artistes de SONAA, achetés directement à celles et ceux qui les ont faits.</p><h2>Bientôt</h2><p>La vente ouvre bientôt. Les artistes pourront déposer leurs morceaux, fixer leur prix, et recevoir l’argent sans intermédiaire de plus que la banque.</p><p><a href="/mixtapes/">Les mixtapes, en attendant</a></p>`
    : `${entete([{ nom: 'Bientôt', href: '/tracks/' }])}<h1>Bientôt</h1><p>Il n’y a rien à acheter sur SONAA pour l’instant. Cette adresse restera la même le jour où la vente ouvrira.</p><p><a href="/">Voir les soirées</a></p>`,
  jsonld: MARCHAND_ACTIF ? [filAriane([{ nom: 'Tracks', href: '/tracks/' }])] : [],
});

/* LA PAGE DU MICRO, ET ELLE RESTE INDEXABLE MEME SORTIE DU MENU.

   Elle a quitte la rangee du menu le 21 septembre 2026 ; elle garde son
   adresse, sa page pre-rendue et sa place dans le plan du site. Ce qu'elle
   promet se decrit en trois phrases, et « identifier un style de musique
   electronique » est une chose que les gens cherchent.

   LE LIBELLE VISIBLE EST LA QUESTION, PAS LE NOM DE L'OUTIL, en h1 comme dans
   le fil d'Ariane, exactement comme dans l'application : deux pages qui
   portent deux titres differents pour la meme adresse, c'est un moteur qui
   arbitre a notre place.

   LE MOT « RECONNAITRE » SORT DU TITRE ET « IDENTIFIER » LE REMPLACE. Le
   titre est un libelle, il est lu dans l'onglet et dans les resultats de
   recherche ; la formule cherchee est gardee avec un synonyme plutot que
   perdue. Le modele, lui, ne se telecharge qu'au clic : rien de lourd n'est
   annonce ici. */
ecrire({
  chemin: '/reconnaitre/',
  hash: '#/reconnaitre',
  titre: 'Track ID : identifier un morceau au micro · SONAA',
  description:
    'Faites écouter à SONAA ce qui passe en soirée, à la radio ou dans la pièce : le morceau, son artiste, son label.',
  corps: `${entete([{ nom: 'Track ID', href: '/reconnaitre/' }])}<h1>Track ID</h1><p>Faites écouter à SONAA ce qui passe en soirée, à la radio ou dans la pièce : le morceau, son artiste, son label.</p><h2>Comment ça marche</h2><p>Le micro écoute dix secondes, après votre accord. Le morceau est identifié par AudD, à qui huit secondes de son sont envoyées et qui ne les garde pas.</p><p>Connecté, vous retrouvez vos écoutes d’un appareil à l’autre.</p><p><a href="/styles/">L’atlas des styles</a></p>`,
  jsonld: [filAriane([{ nom: 'Track ID', href: '/reconnaitre/' }])],
});

/* LE PANIER A TOUJOURS ETE HORS INDEX : il est vide pour tout le monde sauf
   pour celui qui l'a rempli. Tant que rien ne se vend, il ne dit meme plus
   qu'il est un panier, il dit qu'il n'y a rien a acheter. */
ecrire({
  chemin: '/panier/',
  hash: '#/panier',
  noindex: true,
  titre: MARCHAND_ACTIF ? 'Panier · SONAA' : 'Bientôt · SONAA',
  description: MARCHAND_ACTIF
    ? 'Votre panier sur SONAA.'
    : 'Il n’y a rien à acheter sur SONAA pour l’instant.',
  corps: MARCHAND_ACTIF
    ? `${entete([{ nom: 'Panier', href: '/panier/' }])}<h1>Panier</h1><p>Votre panier est vide.</p>`
    : `${entete([{ nom: 'Bientôt', href: '/panier/' }])}<h1>Bientôt</h1><p>Il n’y a rien à acheter sur SONAA pour l’instant. Cette adresse restera la même le jour où la vente ouvrira.</p><p><a href="/">Voir les soirées</a></p>`,
  jsonld: [],
});

const LEGALES: readonly { chemin: string; hash: string; titre: string; description: string; sections: readonly (string | { titre: string; corps: string })[] }[] = [
  {
    chemin: '/conditions/',
    hash: '#/conditions',
    titre: 'Conditions d’utilisation · SONAA',
    description: 'Les conditions d’utilisation de SONAA : le service, le compte, ce que vous déposez, la vente, les responsabilités.',
    sections: ['Ce qu’est le service', 'Le compte', 'Ce que vous déposez', 'La vente', 'Responsabilités', 'Droit applicable'],
  },
  {
    chemin: '/confidentialite/',
    hash: '#/confidentialite',
    titre: 'Politique de confidentialité · SONAA',
    description: 'Ce que SONAA collecte, à quoi cela sert, ce qui est partagé, combien de temps, et vos droits.',
    sections: ['Ce qui est collecté', 'À quoi cela sert', 'Ce qui est partagé', 'Combien de temps', 'Vos droits', 'Nous écrire'],
  },
  {
    chemin: '/mentions/',
    hash: '#/mentions',
    titre: 'Mentions légales · SONAA',
    description: 'L’éditeur de SONAA, son hébergement, son contact, ses liens d’affiliation et la propriété intellectuelle.',
    sections: [
      'L’éditeur',
      'L’hébergement',
      'Contact',
      /* LA SECTION DEJA ECRITE, en clair pour les robots aussi : le contrat
         des Partenaires Amazon exige sa phrase sur le site. Meme texte que
         mentionsAffiliationCorps dans src/langue/langue.ts. */
      {
        titre: 'Liens d’affiliation',
        corps:
          'Les liens « Voir chez » des cours et des pages de marques mènent à des boutiques partenaires : Plugin Boutique, Reverb (par le réseau Awin) et Amazon.ca. Un achat fait par eux rapporte une petite commission à SONAA, sans frais pour l’acheteur. En tant que Partenaire Amazon, SONAA réalise un bénéfice sur les achats remplissant les conditions requises.',
      },
      'Propriété intellectuelle',
    ],
  },
];
const EN_REDACTION = 'Texte juridique en rédaction, à recevoir de l’avocat.';
for (const l of LEGALES) {
  ecrire({
    chemin: l.chemin,
    hash: l.hash,
    titre: l.titre,
    description: l.description,
    corps:
      `${entete([{ nom: l.titre.replace(/ · SONAA$/, ''), href: l.chemin }])}<h1>${h(l.titre.replace(/ · SONAA$/, ''))}</h1><p>${EN_REDACTION}</p>` +
      l.sections
        .map((x) => (typeof x === 'string' ? { titre: x, corps: EN_REDACTION } : x))
        .map((x) => `<h2>${h(x.titre)}</h2><p>${h(x.corps)}</p>`)
        .join(''),
    jsonld: [filAriane([{ nom: l.titre.replace(/ · SONAA$/, ''), href: l.chemin }])],
  });
}

/* ═══ LES NEWS, DEPUIS LA MOISSON ═══ Le fichier est refait deux fois par
   jour et le site republie avec : la page change a chaque passe, ce qui est
   exactement ce qu'un moteur aime. */

interface Article { source: string; titre: string; lien: string; date: string | null; image: string | null; resume: string }
/* Les titres restent dans la langue du magazine depuis le 3 octobre 2026. */
const titreFr = (a: Article): string => a.titre;
const resumeFr = (a: Article): string => a.resume;
const cheminNews = join(DIST, 'news.json');
if (existsSync(cheminNews)) {
  const livre = JSON.parse(readFileSync(cheminNews, 'utf8')) as { articles: Article[] };
  const articles = livre.articles.filter((a) => a.image).slice(0, 80);
  ecrire({
    chemin: '/news/',
    hash: '#/news',
    titre: 'News : production musicale, DJing et scène électronique, relues matin et soir · SONAA',
    description: 'Ce qui se dit en ce moment dans la musique électronique : les machines et logiciels qui sortent, les techniques de production, le monde du DJing, la scène. Vingt magazines relus matin et soir.',
    image: articles[0]?.image ?? undefined,
    corps: `${entete([{ nom: 'News', href: '/news/' }])}<h1>News</h1><p>Vingt magazines de la musique électronique, relus matin et soir ; chaque titre mène à son site. Les news de chaque marque et de chaque machine sont <a href="/news/marques/">rangées par marque</a>.</p><ul>${articles
      .map((a) => `<li><a href="${h(a.lien)}" rel="noopener">${h(titreFr(a))}</a>${resumeFr(a) ? ` : ${h(resumeFr(a))}` : ''}</li>`)
      .join('')}</ul>`,
    jsonld: [filAriane([{ nom: 'News', href: '/news/' }])],
  });
}

/* ═══ L'ACCUEIL ═══ La racine garde sa propre tete (index.html) ; elle
   recoit seulement, devant l'ecran de chargement, de quoi lire et suivre :
   un moteur qui arrive par la porte doit trouver les couloirs. */
{
  const familles = FAMILIES.map((f) => `<li><a href="/styles/${slug(f.label)}/">${h(f.label)}</a></li>`).join('');
  const villes = pages
    .filter((p) => /^\/soirees\/[a-z-]+\/$/.test(p.chemin))
    .map((p) => `<li><a href="${p.chemin}">${h(p.titre.replace(/ · SONAA$/, ''))}</a></li>`)
    .join('');
  /* ═══ LES VINGT PROCHAINES SOIREES DE MONTREAL, DANS LE HTML ═══
   *
   * Mika, le 21 septembre 2026 : « a l'arrivee sur la racine, la liste met du
   * temps a apparaitre ». Elle attendait le bundle, puis le montage de React,
   * puis deux allers-retours pour deviner la ville, puis la requete. Ecrite
   * ici, elle est lisible AVANT que la moindre ligne de JavaScript s'execute.
   *
   * MONTREAL SEULEMENT, ET C'EST ASSUME : c'est la ville de loin la plus
   * demandee, et une page statique ne peut pas en servir vingt-trois. Les
   * autres se chargent comme avant, sans rien perdre. */
  const avecSoirees = villesConnues.filter((v) => soirees.some((x) => x.ville_id === v.id));
  const montreal = avecSoirees.find((v) => v.slug === 'montreal-ca') ?? avecSoirees[0];
  const prochaines = montreal
    ? soirees
        .filter((x) => x.ville_id === montreal.id)
        .slice(0, 20)
        .map(
          (x) =>
            `<li><a href="/soirees/${montreal.slug}/${x.id}/">${h(x.titre)}</a> : ${h(quandLisible(x.debut, montreal.timezone))}${x.lieu ? `, ${h(x.lieu)}` : ''}</li>`
        )
        .join('')
    : '';

  /* LE MEME TITRE QUE L'ACCUEIL (src/accueil/Accueil.tsx), depuis le
     8 octobre 2026 : ce bloc se lit avant le script, et l'accueil le
     remplace ensuite. Qu'ils commencent par la meme phrase evite de voir
     une page devenir une autre. */
  const corps =
    `<h1>Ce soir, on sort où ?</h1><p>Les soirées électro de votre ville, et de quoi comprendre ce qu’on y entend : l’histoire des 219 styles de la musique électronique, les sorties des labels, les news du studio, et Track ID pour nommer le morceau qui joue.</p>` +
    (prochaines
      ? `<h2>Les prochaines soirées à ${h(montreal?.name ?? '')}</h2><ul>${prochaines}</ul><p><a href="/soirees/${montreal?.slug ?? ''}/">Tout le calendrier de ${h(montreal?.name ?? '')}</a></p>`
      : '') +
    `<h2>Les soirées ailleurs</h2><ul>${villes}</ul><h2>Les styles</h2><ul><li><a href="/styles/">Tous les styles</a></li>${familles}</ul><h2>Et aussi</h2><ul><li><a href="/mixtapes/">Les mixtapes des DJs</a></li>${MARCHAND_ACTIF ? '<li><a href="/tracks/">Les tracks à acheter</a></li>' : ''}<li><a href="/news/">Les news</a></li><li><a href="/news/marques/">Les news par marque et par machine</a></li><li><a href="${PREFIXE_ANGLAIS}/styles/" hreflang="en">Electronic music styles, in English</a></li></ul>`;

  /* ═══ LA REQUETE PART AVANT LE BUNDLE ═══
   *
   * Elle partait apres : telechargement du bundle, montage de React, deux
   * allers-retours pour deviner la ville, PUIS l'agenda. Mesure le
   * 21 septembre 2026, le premier octet de soiree arrivait a 1584 ms sur une
   * connexion rapide, et l'essentiel de ce delai etait de l'attente.
   *
   * Ce fragment tient dans le HTML, il s'execute donc pendant que le bundle
   * se telecharge, et il range la promesse. `src/lib/agenda.ts` la reprend si
   * l'adresse correspond, et refait une requete normale sinon : une derive
   * entre cette copie et `fenetreDe` coute l'optimisation, jamais un defaut.
   *
   * ZONE 40, MONTREAL, pour la meme raison que la liste ci-dessus. */
  const precharge = `<script>(function(){try{
var p=function(n){return String(n).padStart(2,'0')};
var f=function(d){return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())+'.000'};
var a=new Date();a.setHours(0,0,0,0);
var b=new Date(a);b.setDate(b.getDate()+90);b.setHours(23,59,59,999);
var u='https://sonaa-sets.massivemedias.workers.dev/api/agenda?zone=40&du='+encodeURIComponent(f(a))+'&au='+encodeURIComponent(f(b))+'&pages=8';
window.__precharge={};window.__precharge[u]=fetch(u);
}catch(e){}})();</script>`;

  /* ═══ PAS D'ECRAN DE CHARGEMENT SUR LA RACINE ═══
   *
   * Il couvrait la fenetre entiere, donc la liste ci-dessus, deja ecrite dans
   * le HTML et lisible avant tout JavaScript. Mika, le 21 septembre 2026 :
   * « retire l'ecran de chargement sur la racine ». Un ecran d'attente pose
   * par-dessus un contenu qui est la n'attend plus rien, il le cache.
   *
   * Les autres pages le gardent : leur bloc pre-rendu est un pis-aller pour
   * les moteurs, pas une page presentable, alors que la racine porte une
   * vraie liste de soirees. */
  const ouvre = gabarit.indexOf(CONTENEUR);
  if (ouvre === -1) throw new Error('racine : conteneur introuvable, la decoupe de index.html a change');
  /* ON COMPTE LES BALISES POUR TROUVER LA FERMETURE DU CONTENEUR. L'ecran de
     chargement en contient lui-meme deux ou trois ; couper au premier
     </div> venu laisserait des fragments ouverts dans la page. */
  let profondeur = 1;
  let i = ouvre + CONTENEUR.length;
  while (profondeur > 0 && i < gabarit.length) {
    const prochainOuvre = gabarit.indexOf('<div', i);
    const prochainFerme = gabarit.indexOf('</div>', i);
    if (prochainFerme === -1) break;
    if (prochainOuvre !== -1 && prochainOuvre < prochainFerme) {
      profondeur += 1;
      i = prochainOuvre + 4;
    } else {
      profondeur -= 1;
      i = prochainFerme + 6;
    }
  }
  if (profondeur !== 0) throw new Error('racine : fermeture du conteneur introuvable');
  const racine =
    gabarit.slice(0, ouvre) +
    `${precharge}${CONTENEUR}<main class="prerendu">${corps}</main></div>` +
    gabarit.slice(i);
  writeFileSync(join(DIST, 'index.html'), racine, 'utf8');
}

/* ═══ LES LABELS ═══

   Une vraie page par label, comme pour les styles : un moteur de recherche
   lit le nom, l'histoire, les disques les plus connus et les morceaux que
   l'atlas en contient, sans attendre l'application. Voir LabelPage.tsx et
   scripts/moissonner-labels.ts. En francais seulement pour l'instant. */

/* L'ACTUALITE D'UN LABEL (ses dernieres sorties, les news qui le nomment)
   vit dans son propre fichier, refait plus souvent que la fiche : voir
   scripts/lib/actu-labels.ts. Elle est fondue ici dans la fiche, et la page
   la lit dans fiche.json avec le reste. */
const ACTU_LABELS = existsSync(fileURLToPath(new URL('../src/data/labels-actu.json', import.meta.url)))
  ? (JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/labels-actu.json', import.meta.url)), 'utf8')) as Record<string, ActuDuLabel>)
  : {};
const FICHES_LABELS = existsSync(fileURLToPath(new URL('../src/data/labels.json', import.meta.url)))
  ? (JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/labels.json', import.meta.url)), 'utf8')) as FicheLabel[]).map(
      (f): FicheLabel => ({ ...f, ...actuSansReeditions(ACTU_LABELS[f.slug]) })
    )
  : [];
const morceauxParCle = new Map<string, { titre: string; artiste: string; annee: number | null; genre: string; chemin: string }[]>();
FAMILIES.forEach((f, fi) => {
  STRUCTURES[fi]?.genres.forEach((g) => {
    for (const tr of g.tracks) {
      const l = tr.release?.label;
      if (!l) continue;
      const k = cleDeLabel(l);
      const liste = morceauxParCle.get(k) ?? [];
      if (!liste.some((x) => x.titre === tr.title && x.artiste === tr.artist)) {
        liste.push({ titre: tr.title, artiste: tr.artist, annee: tr.release?.year ?? tr.year, genre: g.label, chemin: `/styles/${slug(f.label)}/${slug(g.label)}/` });
      }
      morceauxParCle.set(k, liste);
    }
  });
});

if (FICHES_LABELS.length > 0) {
  ecrire({
    chemin: '/labels/',
    hash: '#/labels',
    titre: `Les labels de musique électronique : ${FICHES_LABELS.length} labels, leur histoire et leurs disques · SONAA`,
    description: `${FICHES_LABELS.length} labels de musique électronique : leur histoire, leurs disques les plus connus et leurs morceaux dans l’atlas.`,
    corps: `${entete([{ nom: 'Labels', href: '/labels/' }])}<h1>Les labels</h1><ul>${FICHES_LABELS.map((f) => `<li><a href="/labels/${h(f.slug)}/">${h(f.nom)}</a>${f.pays ? `, ${h(f.pays)}` : ''}${f.annee ? `, ${f.annee}` : ''}</li>`).join('')}</ul>`,
    jsonld: [filAriane([{ nom: 'Labels', href: '/labels/' }])],
  });
}

for (const f of FICHES_LABELS) {
  const morceaux = f.cles.flatMap((k) => morceauxParCle.get(k) ?? []);
  const faits = [f.pays, f.annee ? `fondé en ${f.annee}` : null, f.fondateurs.length > 0 ? `par ${f.fondateurs.join(', ')}` : null].filter(Boolean).join(', ');
  const resume = f.resume.fr ?? f.resume.en ?? f.profil ?? '';
  const fil = [
    { nom: 'Labels', href: '/labels/' },
    { nom: f.nom, href: `/labels/${f.slug}/` },
  ];
  const premiere = resume.split(/(?<=\.)\s/)[0] ?? '';
  const page = {
    chemin: `/labels/${f.slug}/`,
    hash: `#/labels/${f.slug}`,
    titre: `${f.nom} : label${f.pays ? ` (${f.pays})` : ''}${f.annee ? `, fondé en ${f.annee}` : ''}, ses disques les plus connus · SONAA`,
    description: couper(premiere || `${f.nom} : son histoire, ses disques les plus connus et ses morceaux dans l’atlas des musiques électroniques.`, 158),
    corps: `${entete(fil)}<h1>${h(f.nom)}</h1>${faits ? `<p>${h(faits)}.</p>` : ''}${resume ? `<p>${h(resume)}</p>` : ''}${
      morceaux.length > 0
        ? `<h2>Dans l’atlas</h2><ul>${morceaux.map((m) => `<li>${h(m.titre)}, ${h(m.artiste)}${m.annee ? ` (${m.annee})` : ''} : <a href="${h(m.chemin)}">${h(m.genre)}</a></li>`).join('')}</ul>`
        : ''
    }${
      (f.recentes?.length ?? 0) > 0
        ? `<h2>Les dernières sorties</h2><ol>${(f.recentes ?? []).map((s) => `<li>${h(s.artiste)}, ${h(s.titre)}${s.annee ? ` (${s.annee})` : ''}</li>`).join('')}</ol>`
        : ''
    }${
      (f.news?.length ?? 0) > 0
        ? `<h2>Dans les news</h2><ul>${(f.news ?? []).map((n) => `<li><a href="${h(n.lien)}" rel="noopener">${h(n.titre)}</a></li>`).join('')}</ul>`
        : ''
    }${
      f.sorties.length > 0
        ? `<h2>Les sorties les plus connues</h2><ol>${f.sorties.map((s) => `<li>${h(s.artiste)}, ${h(s.titre)}${s.annee ? ` (${s.annee})` : ''}</li>`).join('')}</ol>`
        : ''
    }<p><a href="/labels/">Tous les labels</a></p>`,
    jsonld: [
      filAriane(fil),
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: f.nom,
        ...(f.annee ? { foundingDate: String(f.annee) } : {}),
        ...(f.fondateurs.length > 0 ? { founder: f.fondateurs.map((n) => ({ '@type': 'Person', name: n })) } : {}),
        ...(f.site ? { url: f.site } : {}),
        sameAs: [f.wiki.fr, f.wiki.en, f.discogs].filter(Boolean),
      },
    ],
  };
  /* UNE PAGE MINCE NE S'INDEXE PAS. Avec les petits labels, des fiches n'ont
     ni presentation ni sortie connue : un nom et un morceau. Elles restent
     servies, mais un moteur qui en lirait sept cents jugerait le site sur
     elles. */
  ecrire({ ...page, noindex: !resume && f.sorties.length === 0 });
  /* LA FICHE SEULE, A COTE DE SA PAGE. Avec plus de mille labels, le fichier
     entier pese plusieurs mega-octets : la page d'un label ne charge que la
     sienne (voir chargerFiche dans LabelPage.tsx). */
  const json = `${JSON.stringify(f)}\n`;
  const ecrireFiche = (s: string): void => {
    mkdirSync(join(DIST, 'labels', s), { recursive: true });
    writeFileSync(join(DIST, 'labels', s, 'fiche.json'), json, 'utf8');
  };
  ecrireFiche(f.slug);
  /* L'adresse d'une graphie fondue dans ce label reste servie, avec ce
     label pour canonique : un lien deja partage ne tombe pas sur une 404. */
  for (const a of f.anciens ?? []) {
    ecrire({ ...page, chemin: `/labels/${a}/`, canonique: page.chemin });
    ecrireFiche(a);
  }
}

/* ═══ LES NEWS PAR MARQUE ET PAR MACHINE ═══
 *
 * Mika, le 27 octobre 2026, devant le constat que trop peu de monde passe
 * par sonaa.ca : la plus grande reserve de pages utiles du site, c'est
 * l'archive des news par marque (src/data/marques.ts, table actu_marques),
 * refaite deux fois par jour. Chaque marque et chaque machine y gagne une
 * vraie page : quelqu'un qui cherche « Analog Rytm news » ou « Digitakt
 * firmware » tombe sur la sienne, avec les derniers articles, videos et
 * discussions, et l'app prend le relais.
 *
 * UNE PAGE MINCE NE S'ECRIT PAS. Une machine n'a sa page qu'a partir de
 * trois elements ; une marque en dessous de trois reste servie mais hors
 * index, comme les petits labels plus haut. */
interface ActuPrerendu {
  lien: string;
  genre: 'article' | 'video' | 'discussion';
  titre: string;
  source: string;
  date: string | null;
  image: string | null;
  marques: string[];
  produits: string[];
}
const actusMarques: ActuPrerendu[] = [];
for (let depuis = 0; depuis < 50_000; depuis += 1000) {
  const lot = await lire<ActuPrerendu>(
    `actu_marques?select=lien,genre,titre,source,date,image,marques,produits&order=date.desc.nullslast&limit=1000&offset=${depuis}`
  );
  actusMarques.push(...lot);
  if (lot.length < 1000) break;
}

if (actusMarques.length > 0) {
  const NOM_DU_RAYON: Record<GroupeMarque, string> = {
    synthes: 'Synthés, boîtes à rythmes et samplers',
    dj: 'Matériel DJ',
    logiciels: 'Éditeurs de logiciels',
    plugins: 'Plugins',
  };
  const NOM_DU_GENRE = { article: 'article', video: 'vidéo', discussion: 'discussion' } as const;
  const jour = (iso: string | null): string =>
    iso ? new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Toronto' }) : '';
  const ligne = (a: ActuPrerendu): string =>
    `<li><a href="${h(a.lien)}" rel="noopener">${h(a.titre)}</a> (${NOM_DU_GENRE[a.genre]}, ${h(a.source)}${a.date ? `, ${jour(a.date)}` : ''})</li>`;
  const parMarque = new Map<string, ActuPrerendu[]>();
  const parProduit = new Map<string, ActuPrerendu[]>();
  for (const a of actusMarques) {
    for (const m of a.marques) parMarque.set(m, [...(parMarque.get(m) ?? []), a]);
    for (const p of a.produits) parProduit.set(p, [...(parProduit.get(p) ?? []), a]);
  }
  const SEUIL = 3;
  /* « de Korg », mais « d’Elektron » et « d’Arturia ». */
  const de = (nom: string): string => (/^[aeiouyhéèêàâîôû]/i.test(nom) ? `d’${nom}` : `de ${nom}`);
  const filMarques = { nom: 'Marques', href: '/news/marques/' };

  /* L'annuaire. */
  ecrire({
    chemin: '/news/marques/',
    hash: '#/news/marques',
    titre: `News par marque : ${MARQUES.length} constructeurs, éditeurs et fabricants de plugins · SONAA`,
    description: `Les news de ${MARQUES.length} marques de la musique électronique (Elektron, Roland, Korg, Moog, Ableton, FabFilter...) : articles, vidéos et discussions, machine par machine, relus deux fois par jour.`,
    corps: `${entete([{ nom: 'News', href: '/news/' }, filMarques])}<h1>Les news par marque</h1><p>Constructeurs, éditeurs et fabricants de plugins : pour chacun, les articles, les vidéos et les discussions, machine par machine.</p>${(
      Object.keys(NOM_DU_RAYON) as GroupeMarque[]
    )
      .map(
        (g) =>
          `<h2>${NOM_DU_RAYON[g]}</h2><ul>${MARQUES.filter((m) => m.groupe === g)
            .sort((a, b) => a.nom.localeCompare(b.nom))
            .map((m) => `<li><a href="/news/marques/${m.id}/">${h(m.nom)}</a> : ${h(m.produits.slice(0, 5).map((p) => p.nom).join(', '))}</li>`)
            .join('')}</ul>`
      )
      .join('')}`,
    jsonld: [filAriane([{ nom: 'News', href: '/news/' }, filMarques])],
  });

  for (const m of MARQUES) {
    const siennes = parMarque.get(m.id) ?? [];
    const machines = m.produits
      .map((p) => ({ p, actus: parProduit.get(`${m.id}:${p.id}`) ?? [] }))
      .filter((x) => x.actus.length >= SEUIL);
    const filMarque = [{ nom: 'News', href: '/news/' }, filMarques, { nom: m.nom, href: `/news/marques/${m.id}/` }];
    const exemples = (machines.length > 0 ? machines.map((x) => x.p.nom) : m.produits.map((p) => p.nom)).slice(0, 4).join(', ');
    ecrire({
      chemin: `/news/marques/${m.id}/`,
      hash: `#/news/marques/${m.id}`,
      titre: `${m.nom} : news, vidéos et discussions (${exemples}) · SONAA`,
      description: couper(
        `Toutes les news ${m.nom} : ${siennes.length} articles, vidéos et discussions sur ${exemples}, rassemblés depuis les magazines, YouTube et les forums, deux fois par jour.`,
        158
      ),
      image: siennes.find((a) => a.image)?.image ?? undefined,
      corps: `${entete(filMarque)}<h1>${h(m.nom)} : les news</h1><p>${h(NOM_DU_RAYON[m.groupe])}. Les articles, les vidéos et les discussions qui parlent ${h(de(m.nom))}, rassemblés deux fois par jour. <a href="${h(m.site)}" rel="noopener">Site officiel</a>.</p>${
        machines.length > 0
          ? `<h2>Les machines</h2><ul>${machines.map((x) => `<li><a href="/news/marques/${m.id}/${x.p.id}/">${h(m.nom)} ${h(x.p.nom)}</a> (${x.actus.length})</li>`).join('')}</ul>`
          : ''
      }${siennes.length > 0 ? `<h2>Les dernières news</h2><ul>${siennes.slice(0, 40).map(ligne).join('')}</ul>` : ''}<p><a href="/news/marques/">Toutes les marques</a></p>`,
      jsonld: [filAriane(filMarque), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${m.nom} : news`, about: { '@type': 'Brand', name: m.nom, url: m.site } }],
      noindex: siennes.length < SEUIL,
    });

    for (const { p, actus } of machines) {
      const nom = `${m.nom} ${p.nom}`;
      const fil = [...filMarque, { nom: p.nom, href: `/news/marques/${m.id}/${p.id}/` }];
      const genres = (['video', 'article', 'discussion'] as const).map((g) => ({ g, liste: actus.filter((a) => a.genre === g) }));
      ecrire({
        chemin: `/news/marques/${m.id}/${p.id}/`,
        hash: `#/news/marques/${m.id}/${p.id}`,
        titre: `${nom} : news, vidéos, mises à jour et discussions · SONAA`,
        description: couper(
          `Tout sur ${nom} : ${actus.length} articles, vidéos et discussions (mises à jour, tests, astuces, jams), rassemblés depuis les magazines, YouTube et les forums.`,
          158
        ),
        image: actus.find((a) => a.image)?.image ?? undefined,
        corps: `${entete(fil)}<h1>${h(nom)} : les news</h1><p>Les articles, les vidéos et les discussions qui parlent ${h(de(nom))}, rassemblés deux fois par jour.</p>${genres
          .filter((x) => x.liste.length > 0)
          .map(
            (x) =>
              `<h2>${x.g === 'video' ? 'Les vidéos' : x.g === 'article' ? 'Les articles' : 'Les discussions'}</h2><ul>${x.liste.slice(0, 30).map(ligne).join('')}</ul>`
          )
          .join('')}<p><a href="/news/marques/${m.id}/">Toutes les news ${h(m.nom)}</a></p>`,
        jsonld: [filAriane(fil), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${nom} : news`, about: { '@type': 'Thing', name: nom } }],
      });
    }
  }
}

/* ═══ LE PLAN DU SITE ET LES ROBOTS ═══ */

const urls = ['/', ...pages.filter((p) => !p.noindex && !p.canonique).map((p) => p.chemin)].filter(
  (x, i, a) => a.indexOf(x) === i
);
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls
    .map((u) => {
      const page = pages.find((p) => p.chemin === u);
      const alt = page?.alterne
        ? `<xhtml:link rel="alternate" hreflang="${page.langue === 'en' ? 'fr' : 'en'}" href="${h(ORIGINE + page.alterne)}"/><xhtml:link rel="alternate" hreflang="${page.langue === 'en' ? 'en' : 'fr'}" href="${h(ORIGINE + u)}"/>`
        : '';
      return `  <url><loc>${h(ORIGINE + u)}</loc><lastmod>${aujourdhui}</lastmod>${alt}</url>`;
    })
    .join('\n')}\n</urlset>\n`,
  'utf8'
);
/* LA LISTE POUR INDEXNOW : le deploiement la poste a Bing, Yandex, Naver et
   Seznam, qui partagent le protocole, a chaque publication. Google ne le suit
   pas ; lui lit le plan du site. */
writeFileSync(join(DIST, 'indexnow.json'), JSON.stringify({ host: 'sonaa.ca', key: '64a555bdafa38ed40c635a4617d2200c', keyLocation: `${ORIGINE}/64a555bdafa38ed40c635a4617d2200c.txt`, urlList: urls.map((u) => ORIGINE + u) }), 'utf8');
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGINE}/sitemap.xml\n`, 'utf8');

/* ═══ UNE ADRESSE SANS PAGE OUVRE QUAND MEME LE SITE ═══ Depuis le
   27 octobre 2026, la barre d'adresse porte le chemin de la page ouverte
   (chemins.ts). Une mixtape deposee apres la derniere construction n'a pas
   encore sa page : recharger affichait la 404 de GitHub. GitHub sert ce
   fichier a sa place, avec le code 404 que les moteurs doivent lire, et
   l'app traduit le chemin en ancre comme partout ailleurs. La balise
   sonaa-introuvable dit a main.tsx de ne pas prendre /games/ pour un vieux
   service worker, ce qui rechargerait sans fin. */
writeFileSync(
  join(DIST, '404.html'),
  gabarit
    .replace(/<link\s+rel="canonical"[^>]*>\n?/g, '')
    .replace(/<title>[^<]*<\/title>/, (t) => `${t}\n    <meta name="robots" content="noindex" />\n    <meta name="sonaa-introuvable" content="1" />`),
  'utf8'
);

const nStyles = pages.filter((p) => p.chemin.startsWith('/styles/')).length;
const nSoirees = pages.filter((p) => p.chemin.startsWith('/soirees/')).length;
const nMixtapes = pages.filter((p) => p.chemin.startsWith('/mixtapes/')).length;
const nLabels = pages.filter((p) => p.chemin.startsWith('/labels/')).length;
const nImagesOg = pages.filter((p) => /^\/(mixtapes|artistes)\//.test(p.chemin) && p.image?.endsWith('.jpg')).length;
const nArtistes = pages.filter((p) => p.chemin.startsWith('/artistes/')).length;
const nMarques = pages.filter((p) => p.chemin.startsWith('/news/marques/')).length;
console.log(`Pre-rendu : ${pages.length} pages (${nStyles} styles, ${nSoirees} soirees, ${nMixtapes} mixtapes, ${nArtistes} artistes, ${nLabels} labels, ${nMarques} marques et machines), sitemap de ${urls.length} adresses, ${nImagesOg} images de partage en JPEG.`);
if (!SUPABASE_URL || !SUPABASE_KEY) console.log('  (sans base : pas de pages de soirees ni de sets)');
if (!existsSync(join(DIST, 'styles', 'techno', 'dub-techno', 'index.html'))) throw new Error('la page temoin /styles/techno/dub-techno/ manque');
