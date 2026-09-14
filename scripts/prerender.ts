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
import { ORIGINE, cheminsDesStyles, slug } from '../src/lib/chemins.ts';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
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
}

const pages: Page[] = [];

function ecrire(p: Page): void {
  const url = ORIGINE + p.chemin;
  const meta = [
    `<title>${h(p.titre)}</title>`,
    `<meta name="description" content="${h(p.description)}" />`,
    `<link rel="canonical" href="${h(url)}" />`,
    `<meta property="og:title" content="${h(p.titre)}" />`,
    `<meta property="og:description" content="${h(p.description)}" />`,
    `<meta property="og:url" content="${h(url)}" />`,
    `<meta property="og:type" content="article" />`,
    p.image ? `<meta property="og:image" content="${h(p.image)}" />` : '',
    `<meta name="twitter:card" content="summary_large_image" />`,
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
  ).join('')}</ul>`,
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
      (voisins.length ? `<h2>Dans la même famille</h2><ul>${voisins.map((v) => `<li><a href="${cheminDuGenre.get(v.id) ?? '#'}">${h(v.label)}</a></li>`).join('')}</ul>` : '') +
      `<p><a href="${s.chemin}${s.hash}">Écouter ${h(g.label)} dans l’atlas</a></p>`,
    jsonld: [
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

/* ═══ LES SOIREES ET LES SETS, DEPUIS LA BASE ═══ */

const SUPABASE_URL = process.env['VITE_SUPABASE_URL'];
const SUPABASE_KEY = process.env['VITE_SUPABASE_ANON_KEY'];

interface Soiree {
  id: string; titre: string; debut: string; fin: string | null; lieu: string | null; adresse: string | null;
  lien: string | null; affiche: string | null; artistes: string[] | null; genres: string[] | null;
  organisateur: string | null; description: string | null; ville_id: string;
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

const villes = await lire<Ville>('villes?select=id,slug,name,country_code,timezone&is_active=eq.true');
const dans60Jours = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString();
const soirees = await lire<Soiree>(
  `soirees_manuelles?select=id,titre,debut,fin,lieu,adresse,lien,affiche,artistes,genres,organisateur,description,ville_id&publiee=eq.true&debut=gte.${new Date().toISOString()}&debut=lte.${dans60Jours}&order=debut.asc&limit=1000`
);
if (soirees.length > 0) {
  for (const v of villes) {
    const liste = soirees.filter((s) => s.ville_id === v.id);
    if (liste.length === 0) continue;
    const cheminVille = `/soirees/${v.slug}/`;
    const evenement = (s: Soiree): unknown => ({
      '@context': 'https://schema.org',
      '@type': 'MusicEvent',
      name: s.titre,
      startDate: s.debut,
      endDate: s.fin ?? undefined,
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', name: s.lieu ?? v.name, address: s.adresse ?? `${v.name}, ${v.country_code}` },
      image: s.affiche ? [s.affiche] : undefined,
      description: s.description ? couper(s.description, 300) : undefined,
      organizer: s.organisateur ? { '@type': 'Organization', name: s.organisateur } : undefined,
      performer: (s.artistes ?? []).map((a) => ({ '@type': 'MusicGroup', name: a })),
      offers: s.lien ? { '@type': 'Offer', url: s.lien, availability: 'https://schema.org/InStock' } : undefined,
      url: ORIGINE + `${cheminVille}${s.id}/`,
    });
    ecrire({
      chemin: cheminVille,
      hash: `#/calendrier?city=${v.slug}`,
      titre: `Soirées électroniques à ${v.name} : le calendrier des prochains jours · SONAA`,
      description: `${liste.length} soirées de musique électronique à ${v.name} dans les 60 prochains jours : techno, house, drum and bass, avec la salle, l’heure et les billets.`,
      corps: `${entete([{ nom: 'Soirées', href: cheminVille }, { nom: v.name, href: cheminVille }])}<h1>Soirées électroniques à ${h(v.name)}</h1><p>${liste.length} soirées à venir, relevées chaque jour.</p><ul>${liste
        .map((s) => `<li><a href="${cheminVille}${s.id}/">${h(s.titre)}</a> : ${h(quandLisible(s.debut, v.timezone))}${s.lieu ? `, ${h(s.lieu)}` : ''}</li>`)
        .join('')}</ul>`,
      jsonld: [filAriane([{ nom: 'Soirées', href: cheminVille }, { nom: v.name, href: cheminVille }]), ...liste.slice(0, 50).map(evenement)],
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
  ecrire({
    chemin: '/sons/',
    hash: '#/sets',
    titre: 'Les sets des DJs et producteurs de SONAA · SONAA',
    description: `${sets.length} sets déposés par les membres de SONAA, à écouter en entier, sans perte, classés par style.`,
    corps: `${entete([{ nom: 'Sons', href: '/sons/' }])}<h1>Les sets</h1><ul>${sets.map((s) => `<li><a href="/sons/${s.id}/">${h(s.titre)}</a> par ${h(s.artiste_nom ?? 'sans nom')}</li>`).join('')}</ul>`,
    jsonld: [filAriane([{ nom: 'Sons', href: '/sons/' }])],
  });
  for (const s of sets) {
    const genres = (s.genre_ids ?? []).map((id) => STRUCTURES.flatMap((x) => x.genres).find((x) => x.id === id)?.label ?? id);
    ecrire({
      chemin: `/sons/${s.id}/`,
      hash: `#/sets/${s.id}`,
      titre: `${s.titre} par ${s.artiste_nom ?? 'un membre de SONAA'} : set à écouter · SONAA`,
      description: couper(`${s.titre}, un set de ${s.artiste_nom ?? 'un membre de SONAA'}${s.duree_s ? ` (${Math.round(s.duree_s / 60)} min)` : ''}${genres.length ? `, ${genres.join(', ')}` : ''}.${s.description ? ` ${s.description}` : ''}`, 158),
      image: pochette(s.cover_path),
      corps: `${entete([{ nom: 'Sons', href: '/sons/' }, { nom: s.titre, href: `/sons/${s.id}/` }])}<h1>${h(s.titre)}</h1><p>${h(s.artiste_nom ?? '')}${s.duree_s ? ` · ${Math.round(s.duree_s / 60)} min` : ''}${genres.length ? ` · ${h(genres.join(', '))}` : ''}</p>${s.description ? `<p>${h(s.description)}</p>` : ''}<p><a href="/sons/${s.id}/#/sets/${s.id}">Écouter ce set</a></p>`,
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
          url: `${ORIGINE}/sons/${s.id}/`,
        },
      ],
    });
  }
}

/* ═══ LES NEWS, DEPUIS LA MOISSON ═══ Le fichier est refait toutes les
   quatre heures et le site republie avec : la page change a chaque fois,
   ce qui est exactement ce qu'un moteur aime. */

interface Article { source: string; titre: string; lien: string; date: string | null; image: string | null; resume: string }
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
      .map((a) => `<li><a href="${h(a.lien)}" rel="noopener">${h(a.titre)}</a>${a.resume ? ` : ${h(a.resume)}` : ''}</li>`)
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
  const corps = `<h1>SONAA</h1><p>Le calendrier des soirées électroniques et l’atlas des 219 styles de musique électronique, avec un cours de production par style.</p><h2>Les soirées</h2><ul>${villes}</ul><h2>Les styles</h2><ul><li><a href="/styles/">Tous les styles</a></li>${familles}</ul><h2>Et aussi</h2><ul><li><a href="/sons/">Les sets des DJs</a></li><li><a href="/news/">Les news</a></li></ul>`;
  writeFileSync(join(DIST, 'index.html'), gabarit.replace('<div id="root">', `<div id="root"><main class="prerendu">${corps}</main>`), 'utf8');
}

/* ═══ LE PLAN DU SITE ET LES ROBOTS ═══ */

const urls = ['/', ...pages.map((p) => p.chemin)].filter((x, i, a) => a.indexOf(x) === i);
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${h(ORIGINE + u)}</loc><lastmod>${aujourdhui}</lastmod></url>`)
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
const nSons = pages.filter((p) => p.chemin.startsWith('/sons/')).length;
console.log(`Pre-rendu : ${pages.length} pages (${nStyles} styles, ${nSoirees} soirees, ${nSons} sons), sitemap de ${urls.length} adresses.`);
if (!SUPABASE_URL || !SUPABASE_KEY) console.log('  (sans base : pas de pages de soirees ni de sets)');
if (!existsSync(join(DIST, 'styles', 'techno', 'dub-techno', 'index.html'))) throw new Error('la page temoin /styles/techno/dub-techno/ manque');
