// =====================================================================
//  LA VILLE — un îlot flottant, façon diorama
// =====================================================================
export const VOID = 0, PAVE = 1, ROAD = 2, TURF = 3, PLAZA = 4;
// relief : le gazon est surélevé, la rue légèrement creusée
export const TILE_Z = { [PAVE]: 0, [ROAD]: -0.09, [TURF]: 0.07, [PLAZA]: 0.015, [VOID]: 0 };
export const W = 22, H = 22;

export const BUILDINGS = [
  { id:'home',    name:'Ton appart',        sign:'CHEZ TOI',      kind:'home',
    x:1,  y:1,  w:3, d:3, door:{x:2,y:4},  tier:0, style:'house',  hue:'#e08a72', roof:'#4fbf9f' },
  { id:'bar',     name:'Le Sous-Sol',       sign:'LE SOUS-SOL',   kind:'bar',
    x:5,  y:1,  w:4, d:3, door:{x:6,y:4},  tier:0, style:'shop',   hue:'#8f5fc9', roof:'#3fa98c' },
  { id:'snack',   name:'Casse-croûte Marquette', sign:'SNACK',    kind:'snack',
    x:1,  y:5,  w:3, d:3, door:{x:4,y:6},  tier:0, style:'shop',   hue:'#f0b56a', roof:'#e0705c', face:'right' },
  { id:'records', name:'Vinyl Cave',        sign:'VINYL CAVE',    kind:'records',
    x:13, y:1,  w:4, d:3, door:{x:14,y:4}, tier:0, style:'shop',   hue:'#d97a63', roof:'#4fbf9f', van:true },
  { id:'promo',   name:'Radio Machine',     sign:'RADIO',         kind:'promo',
    x:13, y:5,  w:3, d:3, door:{x:16,y:6}, tier:0, style:'tower2', hue:'#6c9fd6', roof:'#e0705c', face:'right', antenna:true },
  { id:'gear',    name:'Massive Machines',  sign:'SYNTHS',        kind:'gear',
    x:17, y:5,  w:4, d:3, door:{x:18,y:8}, tier:0, style:'shop',   hue:'#5ec4a9', roof:'#8f5fc9' },
  { id:'club',    name:'Le Bunker',         sign:'BUNKER',        kind:'club',
    x:1,  y:13, w:4, d:4, door:{x:2,y:17}, tier:0, style:'club',   hue:'#4a3a63', roof:'#2f2545' },
  { id:'studio',  name:'Studio Sonaa',      sign:'STUDIO',        kind:'studio',
    x:6,  y:13, w:3, d:3, door:{x:7,y:16}, tier:2, style:'shop',   hue:'#c96f9e', roof:'#4fbf9f' },
  { id:'press',   name:'Pressage & Distro', sign:'PRESSAGE',      kind:'press',
    x:1,  y:18, w:4, d:3, door:{x:5,y:19}, tier:1, style:'ware',   hue:'#7a8fb0', roof:'#e0705c', face:'right' },
  { id:'label',   name:'Bureau du label',   sign:'SONAA REC.',    kind:'label',
    x:13, y:13, w:4, d:4, door:{x:14,y:17}, tier:3, style:'tower2',hue:'#e08a72', roof:'#4fbf9f' },
  { id:'store',   name:'Ta boutique',       sign:'SONAA SHOP',    kind:'store',
    x:18, y:13, w:3, d:3, door:{x:19,y:16}, tier:5, style:'shop',  hue:'#4fbf9f', roof:'#e0705c' },
  { id:'major',   name:'Tour Major',        sign:'MAJOR',         kind:'major',
    x:14, y:18, w:5, d:4, door:{x:19,y:19}, tier:6, style:'tower', hue:'#b8c6e0', roof:'#8f5fc9', face:'right' },
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
  elev(x, y) { const t = this.tile(x | 0, y | 0); return TILE_Z[t] ?? 0; }
  isWalkable(x, y) {
    x |= 0; y |= 0;
    if (!this.inb(x, y)) return false;
    return this.tiles[this.idx(x, y)] !== VOID && !this.blocked[this.idx(x, y)];
  }
  build() {
    // forme de l'îlot : rectangle aux coins coupés
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const cut = (x + y < 3) || (x - y > W - 4) || (y - x > H - 4) || (x + y > W + H - 5);
      this.tiles[this.idx(x, y)] = cut ? VOID : PAVE;
    }
    // routes en croix
    for (let i = 0; i < W; i++) {
      for (const r of [10, 11]) {
        if (this.tile(i, r) !== VOID) this.tiles[this.idx(i, r)] = ROAD;
        if (this.tile(r, i) !== VOID) this.tiles[this.idx(r, i)] = ROAD;
      }
    }
    // place centrale
    for (let y = 9; y <= 12; y++) for (let x = 9; x <= 12; x++)
      if (this.tile(x, y) !== VOID) this.tiles[this.idx(x, y)] = PLAZA;
    // parcs et parterres
    const parks = [
      [6, 6, 3, 3], [17, 1, 4, 3], [1, 8, 3, 2], [17, 9, 4, 2],
      [6, 17, 3, 3], [12, 6, 2, 2], [8, 12, 2, 2],
    ];
    for (const [px, py, pw, ph] of parks)
      for (let y = py; y < py + ph; y++) for (let x = px; x < px + pw; x++)
        if (this.tile(x, y) === PAVE) this.tiles[this.idx(x, y)] = TURF;
    // quelques touffes éparses, motif déterministe
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (this.tile(x, y) === PAVE && ((x * 7 + y * 13) % 19) < 2)
        this.tiles[this.idx(x, y)] = TURF;
    // parvis de pierre autour de chaque bâtiment, avec de l'herbe qui repasse
    for (const b of this.buildings)
      for (let y = b.y - 1; y <= b.y + b.d; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) {
        if (!this.inb(x, y) || this.tiles[this.idx(x, y)] !== PAVE) continue;
        const corner = (x < b.x || x >= b.x + b.w) && (y < b.y || y >= b.y + b.d);
        if (corner && ((x * 5 + y * 11) % 3)) continue;      // les coins restent verts
        this.tiles[this.idx(x, y)] = PLAZA;
      }

    // bâtiments -> obstacles
    for (const b of this.buildings)
      for (let y = b.y; y < b.y + b.d; y++) for (let x = b.x; x < b.x + b.w; x++)
        if (this.inb(x, y)) { this.blocked[this.idx(x, y)] = 1; this.tiles[this.idx(x, y)] = PAVE; }
    // props bloquants
    this.props = [
      { type:'statue',  x:8.5,  y:8.5 },
      { type:'lamp',    x:9.5,  y:8.5 },
      { type:'lamp',    x:12.5, y:13.5 },
      { type:'lamp',    x:4.5,  y:9.5 },
      { type:'lamp',    x:17.5, y:12.5 },
      { type:'bench',   x:9.2,  y:12.6 },
      { type:'bench',   x:12.6, y:9.2 },
      { type:'plant',   x:4.5,  y:4.5 }, { type:'plant', x:16.5, y:4.5 },
      { type:'plant',   x:5.5,  y:5.5 }, { type:'plant', x:17.5, y:17.5 },
      { type:'plant',   x:5.5,  y:17.5 },{ type:'plant', x:12.5, y:17.5 },
      { type:'crates',  x:16.6, y:8.5 }, { type:'crates', x:8.5, y:16.6 },
      { type:'truck',   x:13.1, y:8.1 },
      { type:'tree',    x:9.4,  y:6.4, s:1.05 },
      { type:'tree',    x:6.4,  y:9.4, s:0.95 },
      { type:'tree',    x:14.4, y:12.4, s:1.1 },
      { type:'tree',    x:12.4, y:15.4, s:0.9 },
      { type:'tree',    x:16.4, y:16.4, s:1.0 },
      { type:'tree',    x:2.4,  y:9.4,  s:1.15 },
      { type:'tree',    x:19.4, y:7.4,  s:1.05 },
      { type:'arch',    x:7.3,  y:12.3 },
      { type:'ruin',    x:12.4, y:5.4 },
      { type:'ruin',    x:4.4,  y:12.4 },
      { type:'ruin',    x:17.4, y:11.4 },
      { type:'bench',   x:12.6, y:8.4 },
      { type:'plant',   x:9.4,  y:13.4 },
      { type:'plant',   x:13.4, y:9.4 },
      { type:'lamp',    x:8.5,  y:14.5 },
    ];
    for (const pr of this.props) pr.z = this.elev(pr.x, pr.y);
    this.blocked[this.idx(8, 8)] = 1; // socle de la statue
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
