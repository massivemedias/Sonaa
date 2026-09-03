// =====================================================================
//  LA CLAIRIERE
//  ---------------------------------------------------------------
//  Une trouee dans la foret, quadrillee de sentiers de terre. Les
//  cabanes de disquaire sont dispersees autour de la place centrale,
//  une par style musical.
// =====================================================================
export const VOID = 0, GRASS = 1, PATH = 2, LUSH = 3, CLEARING = 4, FOREST = 5;
export const TILE_Z = { [GRASS]: 0, [PATH]: 0, [LUSH]: 0, [CLEARING]: 0, [FOREST]: 0, [VOID]: 0 };
export const W = 28, H = 26;

// une cabane par style : le stock du bac depend du genre
export const BUILDINGS = [
  // rangee nord : les disquaires
  { id:'d_techno',  name:'Bunker Techno',   sign:'TECHNO',  kind:'records', genre:'Techno',
    x:3,  y:3,  w:2, d:2, door:{x:3,y:5},   tier:0, bunker:true, roof:'#4a5b8c', wall:'#8f8a94', antenna:true },
  { id:'d_house',   name:'Deep House Club', sign:'HOUSE',   kind:'records', genre:'Deep House',
    x:8,  y:3,  w:2, d:2, door:{x:8,y:5},   tier:0, hut:true, roof:'#d97b4a', wall:'#d9a05e' },
  { id:'d_electro', name:'Circuit Electro', sign:'ELECTRO', kind:'records', genre:'Electro',
    x:13, y:3,  w:2, d:2, door:{x:13,y:5},  tier:0, hut:true, roof:'#5fb8cf', wall:'#c98c4e' },
  { id:'d_acid',    name:'Acid Shack',      sign:'ACID',    kind:'records', genre:'Acid',
    x:18, y:3,  w:2, d:2, door:{x:18,y:5},  tier:0, hut:true, roof:'#c4cf4a', wall:'#d9a05e' },
  { id:'d_idm',     name:'IDM Cabane',      sign:'IDM',     kind:'records', genre:'IDM',
    x:23, y:3,  w:2, d:2, door:{x:23,y:5},  tier:0, hut:true, roof:'#9a6fbf', wall:'#c98c4e' },
  // deuxieme rangee
  { id:'promo',   name:'Radio Machine',     sign:'RADIO',   kind:'promo',
    x:3,  y:8,  w:3, d:3, door:{x:4,y:11},  tier:0, immeuble:true, etages:3, roof:'#6c9fd6', wall:'#b9c4d8', antenna:true },
  { id:'home',    name:'Ta cabane',         sign:'CHEZ TOI',kind:'home',
    x:8,  y:8,  w:3, d:3, door:{x:9,y:11},  tier:0, roof:'#5fa87f', wall:'#d9a05e', chimney:true },
  { id:'bar',     name:'Le Sous-Sol',       sign:'BAR',     kind:'bar',
    x:18, y:8,  w:3, d:3, door:{x:19,y:11}, tier:0, roof:'#8f5fc9', wall:'#c98c4e' },
  { id:'gear',    name:'Massive Machines',  sign:'SYNTHS',  kind:'gear',
    x:23, y:8,  w:3, d:3, door:{x:24,y:11}, tier:0, roof:'#4fbf9f', wall:'#d9a05e' },
  // troisieme rangee
  { id:'snack',   name:'Casse-croute',      sign:'SNACK',   kind:'snack',
    x:3,  y:13, w:3, d:3, door:{x:4,y:16},  tier:0, roof:'#e0705c', wall:'#e8b96a' },
  { id:'studio',  name:'Studio Sonaa',      sign:'STUDIO',  kind:'studio',
    x:8,  y:13, w:3, d:3, door:{x:9,y:16},  tier:2, roof:'#c96f9e', wall:'#c98c4e' },
  { id:'label',   name:'Bureau du label',   sign:'SONAA',   kind:'label',
    x:13, y:13, w:3, d:3, door:{x:14,y:16}, tier:3, immeuble:true, etages:4, roof:'#e08a72', wall:'#d9a05e', antenna:true },
  { id:'press',   name:'Pressage',          sign:'PRESSAGE',kind:'press',
    x:18, y:13, w:3, d:3, door:{x:19,y:16}, tier:1, roof:'#7a8fb0', wall:'#c98c4e', big:true },
  { id:'store',   name:'Ta boutique',       sign:'SHOP',    kind:'store',
    x:23, y:13, w:3, d:3, door:{x:24,y:16}, tier:5, roof:'#4fbf9f', wall:'#e8b96a' },
  // rangee sud
  { id:'club',    name:'Le Bunker',         sign:'BUNKER',  kind:'club',
    x:3,  y:18, w:3, d:3, door:{x:4,y:21},  tier:0, roof:'#3a3350', wall:'#4a4260', club:true },
  { id:'d_ambient', name:'Cabane Ambient',  sign:'AMBIENT', kind:'records', genre:'Ambient',
    x:8,  y:18, w:2, d:2, door:{x:8,y:20},  tier:0, hut:true, roof:'#7fc6a1', wall:'#d9a05e' },
  { id:'major',   name:'Tour Major',        sign:'MAJOR',   kind:'major',
    x:13, y:18, w:4, d:4, door:{x:14,y:22}, tier:6, roof:'#c9a24a', wall:'#b3bcc2', tower:true },
];

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
    return t !== VOID && t !== FOREST && !this.blocked[this.idx(x, y)];
  }

  build() {
    // herbe partout, foret sur le pourtour
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const border = x < 2 || y < 2 || x > W - 3 || y > H - 3;
      this.tiles[this.idx(x, y)] = border ? FOREST : GRASS;
    }
    // sentiers de terre dans les couloirs entre les rangees
    const cols = [6, 11, 16, 21];
    const rows = [6, 11, 16, 22];
    for (let y = 2; y <= H - 3; y++) for (const x of cols) this.tiles[this.idx(x, y)] = PATH;
    for (let x = 2; x <= W - 3; x++) for (const y of rows) this.tiles[this.idx(x, y)] = PATH;
    // la place centrale, tassee
    for (let y = 8; y <= 10; y++) for (let x = 13; x <= 15; x++) this.tiles[this.idx(x, y)] = CLEARING;
    // touffes d'herbe haute
    for (const [x, y] of [[2,2],[3,2],[2,3],[25,2],[25,3],[2,22],[3,23],[25,22],[24,23],[20,6],[7,17],[24,17],[11,22]])
      if (this.tile(x, y) === GRASS) this.tiles[this.idx(x, y)] = LUSH;

    // bâtiments -> obstacles
    for (const b of this.buildings)
      for (let y = b.y; y < b.y + b.d; y++) for (let x = b.x; x < b.x + b.w; x++)
        if (this.inb(x, y)) { this.blocked[this.idx(x, y)] = 1; this.tiles[this.idx(x, y)] = GRASS; }

    this.props = [
      { type:'totem',  x:14.5, y:9.5 },
      { type:'lamp',   x:12.5, y:7.5 }, { type:'lamp', x:16.5, y:11.5 },
      { type:'lamp',   x:6.5,  y:11.5 }, { type:'lamp', x:21.5, y:16.5 },
      { type:'bench',  x:12.6, y:9.5 }, { type:'bench', x:16.4, y:9.5 },
      { type:'truck',  x:16.4, y:6.6 },
      { type:'crates', x:6.6,  y:5.4 }, { type:'crates', x:21.5, y:5.4 },
      { type:'crates', x:16.5, y:12.4 },
    ];
    // arbres, buissons, rochers : la foret et quelques touches dans la clairiere
    const rnd = mulberry(1337);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (this.tile(x, y) !== FOREST) continue;
      const r = rnd();
      if (r < 0.55) this.props.push({ type:'tree', x: x + 0.2 + rnd() * 0.6, y: y + 0.2 + rnd() * 0.6, s: 0.85 + rnd() * 0.35 });
      else if (r < 0.8) this.props.push({ type:'bush', x: x + 0.3 + rnd() * 0.4, y: y + 0.3 + rnd() * 0.4, s: 0.8 + rnd() * 0.4 });
      else this.props.push({ type:'rock', x: x + 0.3 + rnd() * 0.4, y: y + 0.3 + rnd() * 0.4, s: 0.7 + rnd() * 0.5 });
    }
    for (const [x, y, t] of [[7.5,9.5,'bush'],[12.4,5.5,'rock'],[21.6,9.5,'bush'],
                             [7.4,20.5,'rock'],[22.5,20.5,'bush'],[11.5,16.5,'bush'],
                             [17.5,20.5,'rock'],[6.5,15.4,'bush']])
      this.props.push({ type:t, x, y, s: 0.9 });

    for (const pr of this.props) pr.z = 0;
    this.blocked[this.idx(14, 9)] = 1;      // socle du totem
  }

  // --- A* ---
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
    const open = [], key = this.idx(sx, sy), goal = this.idx(tx, ty);
    const hcost = (x, y) => Math.abs(x - tx) + Math.abs(y - ty);
    g[key] = 0; open.push({ i: key, f: hcost(sx, sy) });
    const seen = new Uint8Array(N);
    while (open.length) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift();
      if (cur.i === goal) break;
      if (seen[cur.i]) continue;
      seen[cur.i] = 1;
      const cx = cur.i % W, cy = (cur.i / W) | 0;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!this.isWalkable(nx, ny)) continue;
        if (dx && dy && (!this.isWalkable(cx + dx, cy) || !this.isWalkable(cx, cy + dy))) continue;
        const ni = this.idx(nx, ny), cost = dx && dy ? 1.42 : 1;
        if (g[cur.i] + cost < g[ni]) {
          g[ni] = g[cur.i] + cost; came[ni] = cur.i;
          open.push({ i: ni, f: g[ni] + hcost(nx, ny) });
        }
      }
    }
    if (came[goal] === -1 && goal !== key) return null;
    const out = [];
    let c = goal;
    while (c !== key && c !== -1) { out.push({ x: (c % W) + 0.5, y: ((c / W) | 0) + 0.5 }); c = came[c]; }
    return out.reverse();
  }

  buildingAt(x, y) {
    for (const b of this.buildings)
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.d) return b;
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

// générateur déterministe : la forêt est toujours la même
function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
