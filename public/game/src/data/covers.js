// =====================================================================
//  POCHETTES + EXTRAITS AUDIO
//  ---------------------------------------------------------------
//  On ne stocke aucune image dans le projet : les pochettes et les
//  extraits de 30 s viennent de l'API publique d'Apple (aucune clé,
//  JSONP donc pas de souci de CORS), et chaque disque garde un lien
//  « écouter sur YouTube » vers la recherche du morceau.
//  Tout est mis en cache dans le navigateur pour ne chercher qu'une fois.
// =====================================================================
const KEY = 'sonaa.covers.v1';
const TTL = 1000 * 60 * 60 * 24 * 30;   // un mois

let cache = {};
try { cache = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { cache = {}; }
const pending = new Map();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { }
}

function jsonp(url, timeout = 7000) {
  return new Promise((resolve, reject) => {
    const cb = '__sonaaCb' + Math.random().toString(36).slice(2, 9);
    const script = document.createElement('script');
    let done = false;
    const cleanup = () => {
      if (done) return; done = true;
      delete window[cb]; clearTimeout(timer);
      script.remove();
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, timeout);
    window[cb] = data => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error('network')); };
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    document.head.appendChild(script);
  });
}

const norm = s => (s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// On n'accepte un résultat que si le TITRE colle. Sinon on retomberait sur
// un autre disque du même artiste, ce qui est pire que pas de pochette du tout.
function titleOk(res, rec) {
  const t = norm(res.trackName || res.collectionName), rt = norm(rec.title);
  if (!t || !rt) return false;
  if (t === rt || t.includes(rt) || rt.includes(t)) return true;
  const words = rt.split(' ').filter(w => w.length > 2);
  if (!words.length) return false;
  return words.filter(w => t.includes(w)).length / words.length >= 0.75;
}
function artistOk(res, rec) {
  const a = norm(res.artistName), ra = norm(rec.artist);
  if (!a || !ra) return false;
  if (a === ra || a.includes(ra) || ra.includes(a)) return true;
  const words = ra.split(' ').filter(w => w.length > 2);
  return words.length ? words.every(w => a.includes(w)) : false;
}
function score(res, rec) {
  if (!titleOk(res, rec) || !artistOk(res, rec)) return -1;
  let s = 4;
  if (norm(res.artistName) === norm(rec.artist)) s += 3;
  if (norm(res.trackName || res.collectionName) === norm(rec.title)) s += 3;
  if (res.previewUrl) s += 2;
  if (res.artworkUrl100) s += 1;
  return s;
}

function big(url, px = 600) {
  return url ? url.replace(/\/\d+x\d+bb\.(jpg|png)/, `/${px}x${px}bb.$1`) : null;
}

export function youtubeLink(rec) {
  return 'https://www.youtube.com/results?search_query=' +
    encodeURIComponent(`${rec.artist} ${rec.title}`);
}

// ce qu'on connaît déjà, sans réseau
export function cover(rec) {
  const e = cache[rec.id];
  if (!e || Date.now() - e.at > TTL) return null;
  return e.found ? e : null;
}
export function isPending(rec) { return pending.has(rec.id); }
export function isMissed(rec) {
  const e = cache[rec.id];
  if (!e || e.found) return false;
  // un échec réseau n'est retenu que quelques minutes ; un vrai « pas trouvé »
  // est retenu pour un mois.
  return Date.now() - e.at < (e.soft ? 1000 * 60 * 3 : TTL);
}

// va chercher la pochette et l'extrait ; résout à null si rien de probant
const API = (term, entity, limit) =>
  `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${entity}&limit=${limit}&country=CA`;

function best(list, rec, min) {
  let win = null, top = min;
  for (const r of list || []) {
    const sc = score(r, rec);
    if (sc > top) { top = sc; win = r; }
  }
  return win;
}

export function fetchCover(rec) {
  const known = cover(rec);
  if (known) return Promise.resolve(known);
  if (isMissed(rec)) return Promise.resolve(null);
  if (pending.has(rec.id)) return pending.get(rec.id);

  const p = (async () => {
    const tries = [
      // 1. artiste + titre, ce qui marche dans la plupart des cas
      { url: API(rec.search || `${rec.artist} ${rec.title}`, 'song', 15), min: 3 },
      // 2. le catalogue de l'artiste, au cas où la recherche combinée échoue
      { url: API(rec.artist, 'song', 40), min: 3 },
      // 3. l'album ou l'EP qui porte le nom du morceau
      { url: API(`${rec.artist} ${rec.title}`, 'album', 10), min: 3 },
    ];
    let answered = false;
    for (const t of tries) {
      let data = null;
      try { data = await jsonp(t.url); answered = true; }
      catch (e) { continue; }                       // réseau : on tente la suivante
      const hit = best(data && data.results, rec, t.min);
      if (!hit) {
        // l'API a répondu mais rien ne colle : inutile d'insister si elle n'a
        // rien du tout sur cet artiste
        if (!data.resultCount) break;
        continue;
      }
      const entry = {
        found: true, at: Date.now(),
        art: big(hit.artworkUrl100),
        thumb: big(hit.artworkUrl100, 160),
        preview: hit.previewUrl || null,
        album: hit.collectionName || null,
        source: hit.trackViewUrl || hit.collectionViewUrl || null,
      };
      cache[rec.id] = entry; persist();
      return entry;
    }
    if (!answered) { cache[rec.id] = { found: false, at: Date.now(), soft: true }; persist(); return null; }
    cache[rec.id] = { found: false, at: Date.now() };
    persist();
    return null;
  })().finally(() => pending.delete(rec.id));

  pending.set(rec.id, p);
  return p;
}

// ------------------------------------------------------------ lecteur
let audio = null, currentId = null;
const listeners = [];
export function onAudio(fn) { listeners.push(fn); }
function emit() { for (const f of listeners) f(currentId); }

export function playing() { return currentId; }

export function togglePreview(rec, entry) {
  if (!entry || !entry.preview) return false;
  if (currentId === rec.id) { stopPreview(); return false; }
  if (!audio) {
    audio = new Audio();
    audio.addEventListener('ended', () => { currentId = null; emit(); });
    audio.addEventListener('error', () => { currentId = null; emit(); });
  }
  audio.src = entry.preview;
  audio.volume = 0.9;
  audio.play().catch(() => { currentId = null; emit(); });
  currentId = rec.id;
  emit();
  return true;
}

export function stopPreview() {
  if (audio) { audio.pause(); audio.currentTime = 0; }
  currentId = null;
  emit();
}
