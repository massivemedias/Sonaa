// =====================================================================
//  LA CLAIRIERE
//  ---------------------------------------------------------------
//  Une trouee dans la foret, quadrillee de routes de terre. Les cabanes
//  de disquaire sont dispersees autour de la place centrale, une par
//  style musical.
//
//  LE TERRAIN A DOUBLE. Il faisait 28 sur 26, soit 728 tuiles, et les
//  dix-sept batiments y tenaient en quatre rangees serrees : on voyait la
//  clairiere entiere sans marcher. Il fait 43 sur 38, 1634 tuiles, plus du
//  double. Le sol n'est dessine que dans le champ de la camera et les
//  batiments sont des images en cache, donc l'agrandissement ne coute rien
//  au dessin ; ce qu'il coute, c'est a la recherche de chemin, d'ou le tas
//  binaire plus bas.
//
//  LES BATIMENTS NE SONT PLUS DES CARRES. Chacun porte des AILES : des
//  volumes annexes, en coordonnees de tuile comme le corps, qui bloquent
//  le passage comme lui et se dessinent dans la meme image. Une halle avec
//  son quai, un immeuble avec sa cage d'escalier, une cabane avec son
//  appentis : la silhouette devient reconnaissable de loin, ce qu'un cube
//  ne sera jamais.
// =====================================================================
export const VOID = 0, GRASS = 1, PATH = 2, LUSH = 3, CLEARING = 4, FOREST = 5, WATER = 6, SAND = 7;
export const TILE_Z = { [GRASS]: 0, [PATH]: 0, [LUSH]: 0, [CLEARING]: 0, [FOREST]: 0, [WATER]: 0, [SAND]: 0, [VOID]: 0 };
export const W = 43, H = 38;

// Ou l'on se reveille : sur la route, devant la place centrale.
export const START = { x: 21.5, y: 16.5 };

/* LA TRAME. Cinq colonnes de batiments, quatre rangees, et entre elles des
   routes de deux tuiles. Une seule tuile se lit comme un trait ; deux se
   lisent comme un chemin sur lequel on marche. Les portes donnent toutes
   sur le sud, donc sur une route ou sur la bande d'herbe qui la precede. */
/* PAS DE ROUTE SUR LE POURTOUR. Il y en avait une, un anneau complet le
   long de la lisiere, et le compte des tuiles disait ce que l'oeil sentait
   deja : 634 tuiles de terre battue contre 465 d'herbe, une clairiere
   davantage pavee que verte. Les anneaux exterieurs ne desservaient rien,
   aucune porte n'y donne. Sans eux il reste une prairie entre la derniere
   rangee et les arbres, et l'on entre dans le village au lieu d'en longer
   le mur. */
const ROUTES_X = [
  { v: [10, 11], de: 3, a: 34 },
  { v: [17, 18], de: 3, a: 34 },
  { v: [24, 25], de: 3, a: 23 },   // au-dela, le quart sud-est redevient campagne
  { v: [31, 32], de: 3, a: 23 },   // s'arrete au bord de l'etang
];
const ROUTES_Y = [
  { v: [8, 9],   de: 3, a: 39 },
  { v: [15, 16], de: 3, a: 39 },
  { v: [22, 23], de: 3, a: 39 },
  { v: [30, 31], de: 3, a: 25 },   // dessert la tour, puis cede la place au pre
];

// une cabane par style : le stock du bac depend du genre
export const BUILDINGS = [
  // ---------------------------------------------- rangee nord : les disquaires
  { id:'d_techno',  name:'Bunker Techno',   sign:'TECHNO',  kind:'records', genre:'Techno',
    x:5,  y:5,  w:4, d:3, door:{x:7,y:8},   tier:0, bunker:true, roof:'#4a5b8c', wall:'#8f8a94', antenna:true,
    ailes:[{ x:9,  y:5,  w:1, d:3, h:2.5,  type:'silo', col:'#7f7a86' }] },
  { id:'d_house',   name:'Deep House Club', sign:'HOUSE',   kind:'records', genre:'Deep House',
    x:12, y:5,  w:4, d:3, door:{x:14,y:8},  tier:0, hut:true, roof:'#d97b4a', wall:'#d9a05e',
    ailes:[{ x:16, y:6,  w:1, d:2, h:0.9,  type:'appentis' }] },
  { id:'d_electro', name:'Circuit Electro', sign:'ELECTRO', kind:'records', genre:'Electro',
    x:19, y:5,  w:3, d:3, door:{x:20,y:8},  tier:0, hut:true, roof:'#5fb8cf', wall:'#c98c4e',
    ailes:[{ x:22, y:5,  w:2, d:2, h:1.5,  type:'aile' }] },
  { id:'d_acid',    name:'Acid Shack',      sign:'ACID',    kind:'records', genre:'Acid',
    x:26, y:5,  w:4, d:3, door:{x:28,y:8},  tier:0, hut:true, roof:'#c4cf4a', wall:'#d9a05e',
    ailes:[{ x:30, y:6,  w:1, d:2, h:0.9,  type:'appentis' }] },
  { id:'d_idm',     name:'IDM Cabane',      sign:'IDM',     kind:'records', genre:'IDM',
    x:33, y:5,  w:3, d:3, door:{x:34,y:8},  tier:0, hut:true, roof:'#9a6fbf', wall:'#c98c4e',
    ailes:[{ x:36, y:5,  w:2, d:3, h:2.0,  type:'tour' }] },

  // ---------------------------------------------- deuxieme rangee
  { id:'promo',   name:'Radio Machine',     sign:'RADIO',   kind:'promo',
    x:5,  y:11, w:4, d:4, door:{x:7,y:15},  tier:0, immeuble:true, etages:4, roof:'#6c9fd6', wall:'#b9c4d8', antenna:true,
    ailes:[{ x:9,  y:12, w:1, d:3, h:1.3,  type:'appentis' }] },
  { id:'home',    name:'Ta cabane',         sign:'CHEZ TOI',kind:'home',
    x:12, y:11, w:4, d:3, door:{x:14,y:14}, tier:0, roof:'#5fa87f', wall:'#d9a05e', chimney:true,
    ailes:[{ x:16, y:11, w:1, d:2, h:1.0,  type:'appentis' }] },
  { id:'bar',     name:'Le Sous-Sol',       sign:'BAR',     kind:'bar',
    x:26, y:11, w:5, d:4, door:{x:28,y:15}, tier:0, roof:'#8f5fc9', wall:'#c98c4e',
    ailes:[{ x:26, y:10, w:3, d:1, h:1.2,  type:'aile' }] },
  { id:'gear',    name:'Massive Machines',  sign:'SYNTHS',  kind:'gear',
    x:33, y:11, w:4, d:4, door:{x:35,y:15}, tier:0, roof:'#4fbf9f', wall:'#d9a05e',
    ailes:[{ x:37, y:12, w:1, d:2, h:1.1,  type:'appentis' }] },

  // ---------------------------------------------- troisieme rangee
  { id:'snack',   name:'Casse-croute',      sign:'SNACK',   kind:'snack',
    x:5,  y:18, w:4, d:3, door:{x:7,y:21},  tier:0, roof:'#e0705c', wall:'#e8b96a',
    ailes:[{ x:9,  y:19, w:1, d:2, h:0.85, type:'appentis' }] },
  { id:'studio',  name:'Studio Sonaa',      sign:'STUDIO',  kind:'studio',
    x:12, y:18, w:4, d:4, door:{x:14,y:22}, tier:2, roof:'#c96f9e', wall:'#c98c4e',
    ailes:[{ x:16, y:18, w:1, d:3, h:1.6,  type:'aile' },
           { x:12, y:17, w:2, d:1, h:1.3,  type:'aile' }] },
  { id:'label',   name:'Bureau du label',   sign:'SONAA',   kind:'label',
    x:19, y:18, w:4, d:4, door:{x:21,y:22}, tier:3, immeuble:true, etages:5, roof:'#e08a72', wall:'#d9a05e', antenna:true,
    ailes:[{ x:23, y:19, w:1, d:3, h:2.2,  type:'tour' }] },
  { id:'press',   name:'Pressage',          sign:'PRESSAGE',kind:'press',
    x:26, y:18, w:5, d:4, door:{x:28,y:22}, tier:1, roof:'#7a8fb0', wall:'#c98c4e', big:true,
    ailes:[{ x:26, y:17, w:5, d:1, h:0.5,  type:'quai' }] },
  { id:'store',   name:'Ta boutique',       sign:'SHOP',    kind:'store',
    x:33, y:18, w:4, d:3, door:{x:35,y:21}, tier:5, roof:'#4fbf9f', wall:'#e8b96a',
    ailes:[{ x:37, y:18, w:1, d:3, h:1.4,  type:'aile' }] },

  // ---------------------------------------------- rangee sud
  { id:'club',    name:'Le Bunker',         sign:'BUNKER',  kind:'club',
    x:5,  y:25, w:5, d:4, door:{x:7,y:29},  tier:0, roof:'#3a3350', wall:'#4a4260', club:true,
    ailes:[{ x:5,  y:24, w:3, d:1, h:1.0,  type:'aile' }] },
  { id:'d_ambient', name:'Cabane Ambient',  sign:'AMBIENT', kind:'records', genre:'Ambient',
    x:12, y:25, w:3, d:3, door:{x:13,y:28}, tier:0, hut:true, roof:'#7fc6a1', wall:'#d9a05e',
    ailes:[{ x:15, y:26, w:1, d:2, h:0.85, type:'appentis' }] },
  { id:'major',   name:'Tour Major',        sign:'MAJOR',   kind:'major',
    x:19, y:25, w:5, d:5, door:{x:21,y:30}, tier:6, roof:'#c9a24a', wall:'#b3bcc2', tower:true,
    ailes:[{ x:19, y:24, w:5, d:1, h:0.6,  type:'quai' }] },
];

// Le pourtour d'un batiment, ailes comprises : ce qu'il occupe vraiment.
export function emprise(b) {
  let x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.d;
  for (const a of b.ailes || []) {
    x0 = Math.min(x0, a.x); y0 = Math.min(y0, a.y);
    x1 = Math.max(x1, a.x + a.w); y1 = Math.max(y1, a.y + a.d);
  }
  return { x: x0, y: y0, w: x1 - x0, d: y1 - y0 };
}

export class City {
  constructor() {
    this.w = W; this.h = H;
    this.tiles = new Uint8Array(W * H);
    this.blocked = new Uint8Array(W * H);
    this.buildings = BUILDINGS;
    this.build();
  }
  idx(x, y) { return y * W + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
  tile(x, y) { return this.inb(x, y) ? this.tiles[this.idx(x, y)] : VOID; }
  elev() { return 0; }
  isWalkable(x, y) {
    x |= 0; y |= 0;
    if (!this.inb(x, y)) return false;
    const t = this.tiles[this.idx(x, y)];
    return t !== VOID && t !== FOREST && t !== WATER && !this.blocked[this.idx(x, y)];
  }

  build() {
    // herbe partout, foret sur le pourtour
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const border = x < 3 || y < 3 || x > W - 4 || y > H - 4;
      this.tiles[this.idx(x, y)] = border ? FOREST : GRASS;
    }
    // routes de terre
    for (const r of ROUTES_X)
      for (let y = r.de; y <= r.a; y++) for (let x = r.v[0]; x <= r.v[1]; x++) this.tiles[this.idx(x, y)] = PATH;
    for (const r of ROUTES_Y)
      for (let x = r.de; x <= r.a; x++) for (let y = r.v[0]; y <= r.v[1]; y++) this.tiles[this.idx(x, y)] = PATH;

    /* LA PLACE CENTRALE occupe l'emplacement laisse vide au milieu de la
       deuxieme rangee. Cinq colonnes sur quatre rangees font vingt places
       pour dix-sept batiments : les trois vides ne sont pas des oublis, ce
       sont la place, l'etang et le bosquet. */
    for (let y = 10; y <= 14; y++) for (let x = 19; x <= 23; x++) this.tiles[this.idx(x, y)] = CLEARING;

    /* L'ETANG, dans la case libre du sud.

       UNE ELLIPSE NETTE RESSEMBLE A UN LOSANGE. En isometrie, un ensemble
       de tuiles carrees se lit comme un rhombe : trace au cordeau, l'etang
       avait l'air d'une piscine. Le rayon est donc bruite tuile par tuile,
       avec une graine fixe, la meme rive a chaque partie, et il est
       entoure de deux couronnes, le sable puis l'herbe grasse. Ce sont les
       couronnes qui font la berge : sans elles, l'eau touche la pelouse par
       une arete franche, ce qui n'existe nulle part. */
    const ex = 30.0, ey = 28.5, erx = 5.4, ery = 4.2;
    for (let y = 24; y <= 34; y++) for (let x = 24; x <= 37; x++) {
      if (!this.inb(x, y) || this.tiles[this.idx(x, y)] === PATH) continue;
      const dx = (x + 0.5 - ex) / erx, dy = (y + 0.5 - ey) / ery;
      const r2 = (dx * dx + dy * dy) * (0.84 + 0.3 * bruit(x, y, 7));
      if (r2 <= 0.58) this.tiles[this.idx(x, y)] = WATER;
      else if (r2 <= 0.85) this.tiles[this.idx(x, y)] = SAND;
      else if (r2 <= 1.05) this.tiles[this.idx(x, y)] = LUSH;
    }

    // touffes d'herbe haute, surtout le long des lisieres
    const rnd = mulberry(1337);
    for (let y = 3; y <= H - 4; y++) for (let x = 3; x <= W - 4; x++) {
      if (this.tile(x, y) !== GRASS) continue;
      const lisiere = x <= 4 || y <= 4 || x >= W - 5 || y >= H - 5;
      if (rnd() < (lisiere ? 0.22 : 0.05)) this.tiles[this.idx(x, y)] = LUSH;
    }

    // bâtiments et leurs ailes -> obstacles
    for (const b of this.buildings) {
      const zones = [{ x: b.x, y: b.y, w: b.w, d: b.d }, ...(b.ailes || [])];
      for (const z of zones)
        for (let y = z.y; y < z.y + z.d; y++) for (let x = z.x; x < z.x + z.w; x++)
          if (this.inb(x, y)) { this.blocked[this.idx(x, y)] = 1; this.tiles[this.idx(x, y)] = GRASS; }
    }

    this.props = [
      { type:'totem',  x:21.5, y:12.5 },
      { type:'bench',  x:19.6, y:12.5 }, { type:'bench', x:23.4, y:12.5 },
      { type:'bench',  x:21.5, y:10.6 },
      { type:'truck',  x:27.4, y:16.6 },
      { type:'ponton', x:29.5, y:25.4 },
      // lanternes aux carrefours
      { type:'lamp', x:10.5, y:8.5  }, { type:'lamp', x:17.5, y:8.5  },
      { type:'lamp', x:24.5, y:8.5  }, { type:'lamp', x:31.5, y:8.5  },
      { type:'lamp', x:10.5, y:15.5 }, { type:'lamp', x:17.5, y:15.5 },
      { type:'lamp', x:24.5, y:15.5 }, { type:'lamp', x:31.5, y:15.5 },
      { type:'lamp', x:10.5, y:22.5 }, { type:'lamp', x:17.5, y:22.5 },
      { type:'lamp', x:24.5, y:22.5 }, { type:'lamp', x:31.5, y:22.5 },
      { type:'lamp', x:10.5, y:30.5 }, { type:'lamp', x:17.5, y:30.5 },
      { type:'lamp', x:24.5, y:30.5 }, { type:'lamp', x:31.5, y:30.5 },
      // bacs devant les disquaires
      { type:'crates', x:11.4, y:6.4  }, { type:'crates', x:25.4, y:6.4  },
      { type:'crates', x:32.4, y:6.4  }, { type:'crates', x:16.4, y:26.4 },
      { type:'crates', x:32.4, y:19.4 },
    ];

    /* LA FORET. Un decor par tuile boisee, tire d'une graine fixe : la meme
       foret a chaque partie, ce qui permet de s'y reperer. */
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (this.tile(x, y) !== FOREST) continue;
      const r = rnd();
      if (r < 0.55) this.props.push({ type:'tree', x: x + 0.2 + rnd() * 0.6, y: y + 0.2 + rnd() * 0.6, s: 0.85 + rnd() * 0.35 });
      else if (r < 0.8) this.props.push({ type:'bush', x: x + 0.3 + rnd() * 0.4, y: y + 0.3 + rnd() * 0.4, s: 0.8 + rnd() * 0.4 });
      else this.props.push({ type:'rock', x: x + 0.3 + rnd() * 0.4, y: y + 0.3 + rnd() * 0.4, s: 0.7 + rnd() * 0.5 });
    }

    /* LE BOSQUET, dans la derniere case libre du sud : un morceau de foret
       tombe au milieu de la clairiere, pour que le sud-est ne soit pas une
       pelouse vide. Rien n'y est bloque, on se promene entre les troncs. */
    for (let y = 24; y <= 34; y++) for (let x = 35; x <= 39; x++) {
      const t = this.tile(x, y);
      if (t !== GRASS && t !== LUSH) continue;
      const r = rnd();
      if (r < 0.34) this.props.push({ type:'tree', x: x + 0.25 + rnd() * 0.5, y: y + 0.25 + rnd() * 0.5, s: 0.9 + rnd() * 0.3 });
      else if (r < 0.5) this.props.push({ type:'bush', x: x + 0.3 + rnd() * 0.4, y: y + 0.3 + rnd() * 0.4, s: 0.85 });
    }

    /* LE SEMIS. Quarante-six tentatives suffisaient sur 728 tuiles ; sur
       1634, dont la plupart tombent sur une route ou sous un batiment et
       sont donc rejetees, elles laissaient des pelouses nues. On en tente
       trois cents, et l'on accepte ce qui tombe bien. */
    for (let i = 0; i < 300; i++) {
      const x = 3 + rnd() * (W - 7), y = 3 + rnd() * (H - 7);
      const t = this.tile(x | 0, y | 0);
      if ((t !== GRASS && t !== LUSH) || this.blocked[this.idx(x | 0, y | 0)]) continue;
      const r = rnd();
      this.props.push({ type: r < 0.5 ? 'bush' : r < 0.78 ? 'rock' : 'tree',
        x, y, s: (r < 0.78 ? 0.7 : 0.85) + rnd() * 0.35 });
    }
    // roseaux : partout ou le sable touche l'herbe grasse
    for (let y = 23; y <= 35; y++) for (let x = 24; x <= 38; x++) {
      if (this.tile(x, y) !== LUSH) continue;
      let bord = false;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]])
        if (this.tile(x + dx, y + dy) === SAND) bord = true;
      if (bord && rnd() < 0.7)
        this.props.push({ type:'bush', x: x + 0.25 + rnd() * 0.5, y: y + 0.25 + rnd() * 0.5, s: 0.5 + rnd() * 0.3 });
    }

    for (const pr of this.props) pr.z = 0;
    this.blocked[this.idx(21, 12)] = 1;      // socle du totem
  }

  /* --- A* ---
     LE TAS BINAIRE remplace un tri du tableau ouvert a chaque tour. Sur 728
     tuiles le tri passait inapercu ; sur 1634, avec huit passants qui se
     redonnent une destination a l'autre bout de la clairiere, il devenait la
     depense la plus chere d'une image. Meme resultat, meme chemin. */
  path(sx, sy, tx, ty) {
    sx |= 0; sy |= 0; tx |= 0; ty |= 0;
    if (!this.isWalkable(tx, ty)) {
      let best = null, bd = 1e9;
      for (let r = 1; r <= 3 && !best; r++)
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const nx = tx + dx, ny = ty + dy;
          if (!this.isWalkable(nx, ny)) continue;
          const d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = [nx, ny]; }
        }
      if (!best) return null;
      tx = best[0]; ty = best[1];
    }
    if (sx === tx && sy === ty) return [];
    const N = W * H, g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1);
    const key = this.idx(sx, sy), goal = this.idx(tx, ty);
    const hcost = (x, y) => Math.abs(x - tx) + Math.abs(y - ty);
    const tas = new Tas();
    g[key] = 0; tas.push(key, hcost(sx, sy));
    const seen = new Uint8Array(N);
    while (tas.taille) {
      const i = tas.pop();
      if (i === goal) break;
      if (seen[i]) continue;
      seen[i] = 1;
      const cx = i % W, cy = (i / W) | 0;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!this.isWalkable(nx, ny)) continue;
        if (dx && dy && (!this.isWalkable(cx + dx, cy) || !this.isWalkable(cx, cy + dy))) continue;
        const ni = this.idx(nx, ny), cost = dx && dy ? 1.42 : 1;
        if (g[i] + cost < g[ni]) {
          g[ni] = g[i] + cost; came[ni] = i;
          tas.push(ni, g[ni] + hcost(nx, ny));
        }
      }
    }
    if (came[goal] === -1 && goal !== key) return null;
    const out = [];
    let c = goal;
    while (c !== key && c !== -1) { out.push({ x: (c % W) + 0.5, y: ((c / W) | 0) + 0.5 }); c = came[c]; }
    return out.reverse();
  }

  // Le corps ET les ailes : toucher le quai du pressage, c'est toucher le
  // pressage. Sinon la moitie d'un batiment ne repond pas au doigt.
  buildingAt(x, y) {
    for (const b of this.buildings) {
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.d) return b;
      for (const a of b.ailes || [])
        if (x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.d) return b;
    }
    return null;
  }
  nearestDoor(px, py, maxDist = 1.5) {
    let best = null, bd = maxDist;
    for (const b of this.buildings) {
      const d = Math.hypot(px - (b.door.x + 0.5), py - (b.door.y + 0.5));
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
}

// Tas binaire minimal : pousser, retirer le plus petit. Rien d'autre.
class Tas {
  constructor() { this.n = []; this.f = []; }
  get taille() { return this.n.length; }
  push(i, f) {
    const n = this.n, F = this.f;
    n.push(i); F.push(f);
    let k = n.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (F[p] <= F[k]) break;
      [n[p], n[k]] = [n[k], n[p]]; [F[p], F[k]] = [F[k], F[p]];
      k = p;
    }
  }
  pop() {
    const n = this.n, F = this.f, top = n[0];
    const li = n.pop(), lf = F.pop();
    if (n.length) {
      n[0] = li; F[0] = lf;
      let k = 0;
      for (;;) {
        const a = k * 2 + 1, b = a + 1;
        let m = k;
        if (a < n.length && F[a] < F[m]) m = a;
        if (b < n.length && F[b] < F[m]) m = b;
        if (m === k) break;
        [n[m], n[k]] = [n[k], n[m]]; [F[m], F[k]] = [F[k], F[m]];
        k = m;
      }
    }
    return top;
  }
}

/* Un bruit fixe, tuile par tuile : la meme rive a chaque partie. */
function bruit(x, y, g = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(g, 2246822519);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}

// générateur déterministe : la forêt est toujours la même
function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
