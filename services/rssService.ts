import { Article, FeedSource, RSS2JSONResponse } from '../types';
import { FALLBACK_IMAGES } from '../constants';

const RSS_TO_JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

// 1. GLOBAL EXCLUSIONS
// Keywords to exclude from ALL feeds (guitars, stage lighting, etc.)
const EXCLUDED_KEYWORDS = [
  // --- GUITAR NUCLEAR BAN LIST ---
  // Brands & Models
  'guitar', 'guitare', 'fender', 'gibson', 'stratocaster', 'telecaster', 'strat', 'tele',
  'les paul', 'epiphone', 'squier', 'ibanez', 'marshall', 'gretsch', 'prs', 'jackson',
  'harley benton', 'st-modern', 'st modern', 'jazzmaster', 'jaguar', 'mustang', 
  'revstar', 'pacifica', 'cort', 'esp ltd', 'schecter', 'godin', 'rickenbacker',
  'charvel', 'kramer', 'danelectro', 'yamaha pacifica', 'taylor', 'martin',
  
  // Body Types & Features
  'solid body', 'solid-body', 'hollow body', 'hollow-body', 'semi-hollow', 
  'single cut', 'single-cut', 'double cut', 'double-cut', 'offset body',
  'thinline', 'archtop', 'dreadnought', 'parlor', 'jumbo',

  // Components & Luthier Terms
  'fret', 'frettes', 'frette', 'fretboard', 'touche érable', 'touche palissandre', 
  'neck profile', 'manche collé', 'manche vissé', 'roasted maple', 'rosewood', 
  'pickups', 'pickup', 'micro guitare', 'micros', 'humbucker', 'single coil', 'p90', 
  'single-coil', 'soapbar', 'bridge', 'chevalet', 'sillet', 'nut', 'headstock',
  'tuning pegs', 'mécaniques', 'pickguard', 'truss rod',

  // Hardware & Accessories
  'pedalboard', 'stompbox', 'guitar pedal', 'pédale guitare', 'overdrive', 'distortion', 
  'fuzz', 'wah wah', 'capo', 'plectrum', 'mediator', 'guitar strap', 'sangle guitare',
  'guitar amp', 'ampli guitare', 'combo amp', 'stack amp', 'cabinet', 'baffle',
  'whammy bar', 'vibrato', 'tremolo arm', 'floyd rose',

  // --- BASS GUITARS (Separate to avoid banning "Bass Music") ---
  'basse électrique', 'electric bass', 'jazz bass', 'precision bass', 'p-bass', 'j-bass',
  'basse active', 'basse passive', 'ampli basse', 'bass amp', 'bass guitar', 
  'short scale', 'long scale',

  // --- DRUMS & ACOUSTIC ---
  'drum kit', 'batterie acoustique', 'cymbals', 'cymbale', 'snare drum', 'caisse claire',
  'hi-hat', 'zildjian', 'sabian', 'paiste', 'vic firth', 'tama', 'pearl drums',
  'dw drums', 'ludwig', 'sonor', 'acoustic drum', 'baguette', 'drumsticks',

  // --- WIND, BRASS & ORCHESTRAL ---
  'saxophone', 'sax', 'trumpet', 'trompette', 'clarinet', 'clarinette', 
  'flute', 'flûte', 'violin', 'violon', 'cello', 'violoncelle', 'orchestra',
  'trombone', 'tuba', 'ukulele', 'banjo', 'mandolin', 'harmonica', 'accordéon',
  'accordion', 'grand piano', 'piano à queue', 'piano droit'
];

// 2. BANDCAMP SPECIFIC INCLUSIONS
const BANDCAMP_ELECTRO_KEYWORDS = [
  'electronic', 'synth', 'techno', 'house', 'ambient', 'drone', 'experimental',
  'club', 'dance', 'beat', 'modular', 'eurorack', 'idm', 'jungle', 'drum and bass',
  'dubstep', 'garage', 'electro', 'lo-fi', 'vaporwave', 'techno', 'trance', 'breakbeat'
];

/**
 * Generate a hash code from a string (for consistent but random-looking fallback selection)
 */
const hashCode = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

/**
 * Robustly extracts an image URL from an RSS item using Regex and Key checks.
 */
const extractImage = (item: any, feedImage: string | undefined): string | null => {
  const candidates: string[] = [];

  // 1. Try RSS Enclosure (Standard)
  if (item.enclosure && item.enclosure.link) {
    // Check if it's actually an image type
    const type = item.enclosure.type || '';
    // Some feeds have type="image/jpeg", others just link to .jpg
    if (type.startsWith('image') || item.enclosure.link.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
         candidates.push(item.enclosure.link);
    }
  }

  // 2. Try rss2json 'thumbnail' field
  if (item.thumbnail && item.thumbnail.length > 5) {
    candidates.push(item.thumbnail);
  }

  // 3. Regex HTML Inspection (Content & Description)
  // Look for both src and data-src/data-lazy-src which many blogs use
  const htmlSources = [item.description, item.content];
  
  // Regex to find all img tags and capture src or data-src
  // Matches: <img ... src="url" ...> OR <img ... data-src="url" ...>
  // We grab all matches to filter them later
  const imgRegex = /<img[^>]+(?:data-src|data-lazy-src|src)=["']([^"']+)["']/gi;

  htmlSources.forEach(html => {
    if (!html) return;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      if (match[1]) {
        candidates.push(match[1]);
      }
    }
  });

  // 4. Filter Candidates
  // This is critical to avoid "Same Image" bug where we pick up a tracking pixel or social icon
  const BAD_PATTERNS = [
      'feeds.feedburner.com', '~r/', 
      'doubleclick.net', 
      'gravatar.com', 
      'emoji', 
      'facebook.com/tr',
      'pixel', 'blank.gif', 'spacer.gif', '1x1',
      'share-icon', 'button', 'avatar',
      'logo', 'icon', 'author'
  ];

  const cleanFeedImage = feedImage ? feedImage.split('?')[0].toLowerCase() : '';

  for (const url of candidates) {
      if (!url) continue;
      const lowerUrl = url.toLowerCase();

      // RULE 1: Filter out bad patterns (junk, ads, pixels)
      if (BAD_PATTERNS.some(pattern => lowerUrl.includes(pattern))) continue;

      // RULE 2: Ignore if it matches the Feed Logo (check strict and fuzzy)
      if (feedImage && url === feedImage) continue;
      if (cleanFeedImage && lowerUrl.includes(cleanFeedImage)) continue; // Fuzzy logo match

      // RULE 3: Length check (too short = likely icon or junk)
      if (url.length < 20) continue;

      // If we survived the filters, this is a likely valid article image.
      return url;
  }

  return null;
};

export const fetchFeedArticles = async (source: FeedSource): Promise<Article[]> => {
  try {
    const response = await fetch(`${RSS_TO_JSON_API}${encodeURIComponent(source.rssUrl)}`);
    const data: RSS2JSONResponse = await response.json();

    if (data.status !== 'ok') {
      console.warn(`Failed to fetch RSS for ${source.name}`);
      return [];
    }

    const feedLogo = data.feed.image;

    return data.items.map((item, index) => {
      // Improved Image Extraction
      let imageUrl = extractImage(item, feedLogo);
      
      // If no valid image found, use a deterministic fallback based on title hash
      // This ensures variety instead of using the same fallback for everyone
      if (!imageUrl) {
         const hash = hashCode(item.title);
         imageUrl = FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
      }

      // Special handling for YouTube images to get higher quality
      // (rss2json often returns mqdefault or hqdefault, maxresdefault is best if available but risky, hq is safe)
      if (source.isVideoSource && imageUrl.includes('default.jpg')) {
          if (imageUrl.includes('hqdefault')) {
              // keep it
          } else if (imageUrl.includes('mqdefault')) {
               imageUrl = imageUrl.replace('mqdefault', 'hqdefault');
          }
      }

      // Clean HTML tags from description
      const tempDiv = document.createElement('div');
      // Some feeds put summary in description, others in content. Prefer description for snippet.
      tempDiv.innerHTML = item.description || item.content; 
      const cleanDescription = tempDiv.textContent || tempDiv.innerText || "";
      
      const maxLength = source.isVideoSource ? 100 : 150;
      const truncatedDesc = cleanDescription.length > maxLength 
        ? cleanDescription.substring(0, maxLength) + "..." 
        : cleanDescription;

      return {
        id: item.guid || item.link,
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        contentSnippet: truncatedDesc,
        thumbnail: imageUrl,
        sourceTitle: source.name,
        sourceIcon: data.feed.image,
        categories: item.categories || [],
        isVideo: source.isVideoSource
      };
    });
  } catch (error) {
    console.error(`Error fetching feed ${source.name}:`, error);
    return [];
  }
};

// Helper function to shuffle array (Fisher-Yates)
const shuffleArray = (array: Article[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const fetchAllFeeds = async (sources: FeedSource[]): Promise<Article[]> => {
  const activeSources = sources.filter(s => s.isActive);
  const promises = activeSources.map(source => fetchFeedArticles(source));
  const results = await Promise.all(promises);
  
  let pool: Article[] = [];

  // 1. Process each feed individually first
  results.forEach((feedArticles, index) => {
    const source = activeSources[index];
    let filteredFeed = feedArticles;

    // Special filtering for Bandcamp: Must contain electronic keywords
    if (source.id === 'bandcamp-daily') {
        filteredFeed = filteredFeed.filter(article => {
            const content = (article.title + ' ' + article.categories.join(' ') + ' ' + article.contentSnippet).toLowerCase();
            return BANDCAMP_ELECTRO_KEYWORDS.some(k => content.includes(k));
        });
    }

    // Sort by date to get the absolute latest from this specific source
    const sortedFeed = filteredFeed.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    // Limits: Video (2), Standard (5)
    const limit = source.isVideoSource ? 2 : 5;
    const topItems = sortedFeed.slice(0, limit);
    
    pool.push(...topItems);
  });

  // 2. Global Filter: Exclude keywords (Nuclear Guitar Option)
  pool = pool.filter(article => {
    // Check title, categories, AND snippet for forbidden words
    const text = (article.title + ' ' + article.categories.join(' ') + ' ' + article.contentSnippet).toLowerCase();
    
    const hasExcludedKeyword = EXCLUDED_KEYWORDS.some(k => text.includes(k));
    
    return !hasExcludedKeyword;
  });

  // 3. Shuffle the final pool
  return shuffleArray(pool);
};