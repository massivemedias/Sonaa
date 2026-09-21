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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILIES, STRUCTURES, type Genre } from '../src/atlas/structures.ts';
import { ORIGINE, PREFIXE_ANGLAIS, cheminsDesStyles, slug } from '../src/lib/chemins.ts';
import { ranger, vocabulaire } from '../src/lib/correspondance-styles.ts';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const RACINE = fileURLToPath(new URL('..', import.meta.url));
const COURS = JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/cours.json', import.meta.url)), 'utf8')) as Record<string, Cours>;
const ARTISTES = (JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/artistes.json', import.meta.url)), 'utf8')) as { parGenre: Record<string, string[]> }).parGenre;

interface Cours {
  tempo: string; rythme: string; basse: string; sons: string; arrangement: string; mix: string;
  etapes: string[]; reperes: string[]; sources: string[];
  outils?: { nom: string; type: string; pourquoi: string }[]; sourcesOutils?: string[];
}

const gabarit = readFileSync(join(DIST, 'index.html'), 'utf8');
if (!gabarit.includes('<div id="root">')) throw new Error('dist/index.html : conteneur root introuvable');

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
const cheminDuGenre = new Map<string, string>();
for (const s of styles) if (s.gl !== null) cheminDuGenre.set((STRUCTURES[s.fi]?.genres[s.gl] as Genre).id, s.chemin);

ecrire({
  chemin: '/styles/',
  hash: '#/parcourir',
  titre: 'Les styles de musique électronique : 219 genres, 14 familles · SONAA',
  description:
    'Un atlas généalogique des musiques électroniques : 219 genres classés en 14 familles, avec pour chacun son histoire, ses morceaux de référence, ses machines et un cours de production.',
  corps: `${entete([{ nom: 'Styles', href: '/styles/' }])}<h1>Les styles de musique électronique</h1><p>219 genres, 14 familles, écrits et vérifiés à la main.</p><ul>${FAMILIES.map(
    (f, fi) => `<li><a href="/styles/${slug(f.label)}/">${h(f.label)}</a> : ${STRUCTURES[fi]?.genres.length ?? 0} genres</li>`
  ).join('')}</ul><p><a href="/styles/#/index">Index des 219 genres, à plat</a></p>`,
  jsonld: [filAriane([{ nom: 'Styles', href: '/styles/' }])],
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
      corps: `${entete([{ nom: 'Styles', href: '/styles/' }, { nom: famille.label, href: cheminFamille }])}<h1>${h(famille.label)}</h1>${desc ? `<p>${h(desc)}</p>` : ''}<h2>Les genres</h2><ul>${struct.genres
        .map((g) => `<li><a href="${cheminDuGenre.get(g.id) ?? '#'}">${h(g.label)}</a>${g.annee > 0 ? ` (${g.annee})` : ''}${g.description ? ` : ${h(couper(g.description, 160))}` : ''}</li>`)
        .join('')}</ul>`,
      jsonld: [filAriane([{ nom: 'Styles', href: '/styles/' }, { nom: famille.label, href: cheminFamille }])],
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
    g.labelsHistoriques.length ? `<li>Labels : ${h(g.labelsHistoriques.join(', '))}</li>` : '',
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
      `${entete([{ nom: 'Styles', href: '/styles/' }, { nom: famille.label, href: cheminFamille }, { nom: g.label, href: s.chemin }])}` +
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
      filAriane([{ nom: 'Styles', href: '/styles/' }, { nom: famille.label, href: cheminFamille }, { nom: g.label, href: s.chemin }]),
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
  corps: `${enteteEn([{ nom: 'Styles', href: cheminEn('/styles/') }])}<h1>Electronic music styles</h1><p>219 genres, 14 families, written and checked by hand.</p><ul>${FAMILIES.map(
    (f, fi) => `<li><a href="${cheminEn(`/styles/${slug(f.label)}/`)}">${h(f.label)}</a>: ${STRUCTURES[fi]?.genres.length ?? 0} genres</li>`
  ).join('')}</ul>`,
  jsonld: [filAriane([{ nom: 'Styles', href: cheminEn('/styles/') }])],
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
      corps: `${enteteEn([{ nom: 'Styles', href: cheminEn('/styles/') }, { nom: famille.label, href: cheminFamille }])}<h1>${h(famille.label)}</h1><h2>The genres</h2><ul>${struct.genres
        .map((g) => `<li><a href="${cheminEn(cheminDuGenre.get(g.id) ?? '/styles/')}">${h(g.label)}</a>${g.annee > 0 ? ` (${g.annee})` : ''}${EN[g.id] ? `: ${h(couper(EN[g.id]?.description ?? '', 160))}` : ''}</li>`)
        .join('')}</ul>`,
      jsonld: [filAriane([{ nom: 'Styles', href: cheminEn('/styles/') }, { nom: famille.label, href: cheminFamille }])],
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
    g.labelsHistoriques.length ? `<li>Labels: ${h(g.labelsHistoriques.join(', '))}</li>` : '',
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
      `${enteteEn([{ nom: 'Styles', href: cheminEn('/styles/') }, { nom: famille.label, href: cheminFamille }, { nom: g.label, href: cheminEn(s.chemin) }])}` +
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
      filAriane([{ nom: 'Styles', href: cheminEn('/styles/') }, { nom: famille.label, href: cheminFamille }, { nom: g.label, href: cheminEn(s.chemin) }]),
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
interface Set { id: string; titre: string; description: string | null; duree_s: number | null; cover_path: string | null; artiste_nom: string | null; created_at: string; genre_ids: string[] | null }

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

const sets = await lire<Set>('sets_publics?select=id,titre,description,duree_s,cover_path,artiste_nom,created_at,genre_ids&order=created_at.desc&limit=500');
if (sets.length > 0) {
  const pochette = (c: string | null): string | undefined =>
    c ? `${SUPABASE_URL}/storage/v1/object/public/covers/${c}` : undefined;
  const dureeIso = (s: number | null): string | undefined => (s ? `PT${Math.floor(s / 60)}M${s % 60}S` : undefined);

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
      image: pochette(s.cover_path),
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
}

/* ═══ LA COUCHE MARCHANDE ═══ Phase 0 : les adresses existent, la vente non.
   Tracks est une vraie page, indexable, parce qu'une adresse apprise
   aujourd'hui est une adresse deja classee le jour de l'ouverture. Le panier
   est hors index. Les trois pages legales sont indexables : on doit pouvoir
   les trouver depuis un moteur, c'est meme leur premier usage. */

ecrire({
  chemin: '/tracks/',
  hash: '#/tracks',
  titre: 'Tracks : les morceaux des artistes de SONAA · SONAA',
  description:
    'Les morceaux des artistes de SONAA, achetés directement à celles et ceux qui les ont faits. La vente ouvre bientôt.',
  corps: `${entete([{ nom: 'Tracks', href: '/tracks/' }])}<h1>Tracks</h1><p>Les morceaux des artistes de SONAA, achetés directement à celles et ceux qui les ont faits.</p><h2>Bientôt</h2><p>La vente ouvre bientôt. Les artistes pourront déposer leurs morceaux, fixer leur prix, et recevoir l’argent sans intermédiaire de plus que la banque.</p><p><a href="/mixtapes/">Les mixtapes, en attendant</a></p>`,
  jsonld: [filAriane([{ nom: 'Tracks', href: '/tracks/' }])],
});

/* RECONNAITRE A SA PAGE, ET ELLE EST INDEXABLE. Ce qu'elle promet se decrit
   en trois phrases, et « reconnaitre un style de musique electronique » est
   une chose que les gens cherchent. Le modele, lui, ne se telecharge qu'au
   clic : rien de lourd n'est annonce ici. */
ecrire({
  chemin: '/reconnaitre/',
  hash: '#/reconnaitre',
  titre: 'Reconnaître un style de musique électronique par le micro · SONAA',
  description:
    'Faites écouter à SONAA ce qui passe à la radio ou dans la pièce : le style est reconnu sur votre appareil, sans que le son en sorte.',
  corps: `${entete([{ nom: 'Reconnaître', href: '/reconnaitre/' }])}<h1>Reconnaître</h1><p>Faites écouter à SONAA ce qui passe à la radio, à la télé ou dans la pièce. Le style est reconnu sur votre appareil, sans que le son en sorte.</p><h2>Comment ça marche</h2><p>Le micro écoute dix secondes, après votre accord. Un modèle de reconnaissance tourne dans votre navigateur et rend les trois styles les plus probables, rattachés aux 219 genres de l’atlas quand ils y existent. Le son ne part sur aucun serveur.</p><p>Le style est une estimation faite sur dix secondes, pas un verdict : une voix, une publicité ou un enchaînement le trompent.</p><p><a href="/styles/">L’atlas des styles</a></p>`,
  jsonld: [filAriane([{ nom: 'Reconnaître', href: '/reconnaitre/' }])],
});

ecrire({
  chemin: '/panier/',
  hash: '#/panier',
  noindex: true,
  titre: 'Panier · SONAA',
  description: 'Votre panier sur SONAA.',
  corps: `${entete([{ nom: 'Panier', href: '/panier/' }])}<h1>Panier</h1><p>Votre panier est vide.</p>`,
  jsonld: [],
});

const LEGALES: readonly { chemin: string; hash: string; titre: string; description: string; sections: readonly string[] }[] = [
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
    description: 'L’éditeur de SONAA, son hébergement, son contact et la propriété intellectuelle.',
    sections: ['L’éditeur', 'L’hébergement', 'Contact', 'Propriété intellectuelle'],
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
      l.sections.map((x) => `<h2>${h(x)}</h2><p>${EN_REDACTION}</p>`).join(''),
    jsonld: [filAriane([{ nom: l.titre.replace(/ · SONAA$/, ''), href: l.chemin }])],
  });
}

/* ═══ LES NEWS, DEPUIS LA MOISSON ═══ Le fichier est refait toutes les
   quatre heures et le site republie avec : la page change a chaque fois,
   ce qui est exactement ce qu'un moteur aime. */

interface Article { source: string; titre: string; lien: string; date: string | null; image: string | null; resume: string; titre_fr?: string; resume_fr?: string }
/* LA PAGE PRE-RENDUE EST EN FRANCAIS, comme tout ce qui n'est pas sous /en/ :
   elle prend donc la traduction quand la moisson en a posee une, et
   l'original pour les deux magazines francophones comme pour ce qui n'a pas
   pu etre traduit. Voir scripts/lib/traduire.ts. */
const titreFr = (a: Article): string => a.titre_fr ?? a.titre;
const resumeFr = (a: Article): string => (a.titre_fr ? (a.resume_fr ?? '') : a.resume);
const cheminNews = join(DIST, 'news.json');
if (existsSync(cheminNews)) {
  const livre = JSON.parse(readFileSync(cheminNews, 'utf8')) as { articles: Article[] };
  const articles = livre.articles.filter((a) => a.image).slice(0, 80);
  ecrire({
    chemin: '/news/',
    hash: '#/news',
    titre: 'News : production musicale, DJing et scène électronique, relues plusieurs fois par jour · SONAA',
    description: 'Ce qui se dit en ce moment dans la musique électronique : les machines et logiciels qui sortent, les techniques de production, le monde du DJing, la scène. Vingt magazines relus plusieurs fois par jour.',
    image: articles[0]?.image ?? undefined,
    corps: `${entete([{ nom: 'News', href: '/news/' }])}<h1>News</h1><p>Vingt magazines de la musique électronique, relus plusieurs fois par jour ; chaque titre mène à son site.</p><ul>${articles
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

  const corps =
    `<h1>SONAA</h1><p>Le calendrier des soirées électroniques et l’atlas des 219 styles de musique électronique, avec un cours de production par style.</p>` +
    (prochaines
      ? `<h2>Les prochaines soirées à ${h(montreal?.name ?? '')}</h2><ul>${prochaines}</ul><p><a href="/soirees/${montreal?.slug ?? ''}/">Tout le calendrier de ${h(montreal?.name ?? '')}</a></p>`
      : '') +
    `<h2>Les soirées ailleurs</h2><ul>${villes}</ul><h2>Les styles</h2><ul><li><a href="/styles/">Tous les styles</a></li>${familles}</ul><h2>Et aussi</h2><ul><li><a href="/mixtapes/">Les mixtapes des DJs</a></li><li><a href="/tracks/">Les tracks à acheter</a></li><li><a href="/news/">Les news</a></li><li><a href="${PREFIXE_ANGLAIS}/styles/" hreflang="en">Electronic music styles, in English</a></li></ul>`;

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

  writeFileSync(
    join(DIST, 'index.html'),
    gabarit.replace('<div id="root">', `${precharge}<div id="root"><main class="prerendu">${corps}</main>`),
    'utf8'
  );
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

const nStyles = pages.filter((p) => p.chemin.startsWith('/styles/')).length;
const nSoirees = pages.filter((p) => p.chemin.startsWith('/soirees/')).length;
const nMixtapes = pages.filter((p) => p.chemin.startsWith('/mixtapes/')).length;
console.log(`Pre-rendu : ${pages.length} pages (${nStyles} styles, ${nSoirees} soirees, ${nMixtapes} mixtapes), sitemap de ${urls.length} adresses.`);
if (!SUPABASE_URL || !SUPABASE_KEY) console.log('  (sans base : pas de pages de soirees ni de sets)');
if (!existsSync(join(DIST, 'styles', 'techno', 'dub-techno', 'index.html'))) throw new Error('la page temoin /styles/techno/dub-techno/ manque');
