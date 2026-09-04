// =====================================================================
//  RENDU PIXEL ART
//  ---------------------------------------------------------------
//  On dessine tout dans un tampon basse resolution, puis on l'agrandit
//  d'un facteur entier sans lissage : c'est ce qui donne des pixels
//  carres et nets, comme dans un jeu de l'epoque 16 bits.
// =====================================================================
import { toScreen, Camera } from '../core/iso.js';
import { drawGround, drawBuilding, drawProp, castBuildingShadow } from '../world/architecture.js';
import { setTime, setLight, LIGHT, px, alpha, pxText, textWidth } from '../core/art.js';

export class Renderer {
  constructor(canvas, city) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.city = city;
    this.cam = new Camera();
    // un facteur entier, sinon chaque pixel du jeu tombe a cheval sur deux pixels d'ecran
    this.dpr = Math.max(1, Math.min(2, Math.round(window.devicePixelRatio || 1)));
    // tampon basse resolution
    this.buf = document.createElement('canvas');
    this.bctx = this.buf.getContext('2d');
    this.stars = Array.from({ length: 60 }, () => ({
      x: Math.random(), y: Math.random(), a: Math.random(),
    }));
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /* ZOOMER, C'EST CHANGER LE FACTEUR D'AGRANDISSEMENT, PAS L'ECHELLE DU
     DESSIN.

     L'ancien zoom multipliait la transformation a l'interieur du tampon
     basse resolution. Le monde y etait deja dessine a un tiers de la taille
     de l'ecran ; le multiplier par 0,5 le ramenait a un sixieme, puis on
     agrandissait le tout : d'ou l'escalier grossier des que l'on dezoomait.

     Ici le monde est TOUJOURS dessine a un pixel de tampon pour un pixel de
     tampon. Ce qui change, c'est de combien on agrandit ce tampon pour
     remplir l'ecran, et ce facteur est entier. A 2, chaque pixel du jeu
     occupe deux pixels d'ecran : les sprites sont petits et fins, on voit
     beaucoup de ville. A 5, ils sont gros et l'on voit un carrefour. Dans
     les deux cas l'image est nette, parce qu'un pixel du tampon ne tombe
     jamais a cheval sur deux pixels d'ecran. */
  bornesK() {
    const w = window.innerWidth, h = window.innerHeight;
    /* Le facteur naturel de cet ecran, celui d'avant : 2 sur telephone,
       3 des que la fenetre depasse neuf cents pixels. */
    const auto = Math.max(2, Math.min(3, Math.round(Math.min(w, h) / 300)));
    /* On s'autorise un cran en dessous et deux au-dessus. En dessous de 2,
       le tampon approche la resolution de l'ecran et le jeu cesse d'etre un
       jeu en pixels ; au-dela de 6 on ne voit plus qu'une porte. */
    return { auto, min: Math.max(2, auto - 1), max: Math.min(6, auto + 2) };
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const b = this.bornesK();
    /* Le choix de la personne est conserve d'un redimensionnement a l'autre,
       ramene dans les bornes du nouvel ecran : faire pivoter son telephone ne
       doit pas rendre son reglage. */
    const k = Math.max(b.min, Math.min(b.max, this.k ?? b.auto));
    this.k = k;
    this.buf.width = Math.ceil(w / k);
    this.buf.height = Math.ceil(h / k);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.cam.w = this.buf.width;
    this.cam.h = this.buf.height;
    this.cam.k = k;
    this.bctx.imageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Un cran de zoom. `sens` vaut +1 pour se rapprocher, -1 pour s'eloigner.
      Rend vrai si quelque chose a change, ce qui evite de redessiner pour
      rien quand on est deja au bout. */
  zoomer(sens) {
    const b = this.bornesK();
    const vise = Math.max(b.min, Math.min(b.max, this.k + (sens > 0 ? 1 : -1)));
    if (vise === this.k) return false;
    this.k = vise;
    this.resize();
    return true;
  }

  frame(game, player, t, life) {
    const ctx = this.bctx;
    const W = this.buf.width, H = this.buf.height;
    setTime(t);
    setLight(game.hour);

    // ---- ciel
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = LIGHT.amb > 0.5 ? '#1b2b4a' : '#0e1730';
    ctx.fillRect(0, 0, W, H);
    if (LIGHT.amb < 0.6) {
      for (const s of this.stars) {
        if (Math.sin(t * 1.2 + s.a * 9) < -0.2) continue;
        px(ctx, s.x * W, s.y * H * 0.7, 1, 1, '#cfd8ff');
      }
    }

    // ---- camera
    this.cam.x += (player.x - this.cam.x) * 0.14;
    this.cam.y += (player.y - this.cam.y) * 0.14;
    this.cam.apply(ctx, 1);

    drawGround(ctx, this.city, this.cam);
    for (const b of this.city.buildings) castBuildingShadow(ctx, b, game.unlocked(b));

    // ---- tri en profondeur
    const ents = [];
    for (const b of this.city.buildings)
      ents.push({ k: b.x + b.w / 2 + b.y + b.d / 2, draw: () => drawBuilding(ctx, b, { t, night: game.isNight, unlocked: game.unlocked(b) }) });
    /* ON NE TRIE NI NE DESSINE CE QUI EST HORS DU CHAMP. La clairiere porte
       pres de six cents decors et la camera en voit rarement le tiers :
       chacun coutait un drawImage de 112 sur 116 pixels, soit sept millions
       de pixels recopies par image pour en afficher deux. La marge de trois
       tuiles couvre un arbre haut dont le tronc est encore hors cadre. */
    const vue = this.champ();
    for (const p of this.city.props) {
      if (p.x < vue.x0 || p.x > vue.x1 || p.y < vue.y0 || p.y > vue.y1) continue;
      ents.push({ k: p.x + p.y, draw: () => drawProp(ctx, p, { t, night: game.isNight }) });
    }
    if (life) for (const e of life.entities(ctx)) ents.push(e);
    ents.push({ k: player.x + player.y, draw: () => player.draw(ctx, t, this.city) });
    ents.sort((a, b) => a.k - b.k);
    for (const e of ents) e.draw();

    if (life) life.drawAbove(ctx, this.city, game.isNight);

    // ---- marqueur de porte
    let best = null, bd = 3.2;
    for (const b of this.city.buildings) {
      const d = Math.hypot(player.x - (b.door.x + .5), player.y - (b.door.y + .5));
      if (d < bd) { bd = d; best = b; }
    }
    if (best) this.marker(ctx, best, t, game.unlocked(best), bd < 1.4);

    // ---- teinte du moment, en aplat
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (LIGHT.tintA > 0.02) {
      ctx.save();
      ctx.globalAlpha = LIGHT.tintA;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = LIGHT.tint;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // ---- agrandissement au pixel pres
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.drawImage(this.buf, 0, 0, W * this.k * this.dpr, H * this.k * this.dpr);
  }

  /** Les bornes du monde visible, en tuiles, avec une marge. */
  champ() {
    const c = this.cam;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [sx, sy] of [[0, 0], [c.w * c.k, 0], [0, c.h * c.k], [c.w * c.k, c.h * c.k]]) {
      const w = c.unproject(sx, sy);
      x0 = Math.min(x0, w.x); x1 = Math.max(x1, w.x);
      y0 = Math.min(y0, w.y); y1 = Math.max(y1, w.y);
    }
    return { x0: x0 - 3, x1: x1 + 3, y0: y0 - 3, y1: y1 + 4 };
  }

  // petite bulle facon jeu 16 bits au-dessus de la porte
  marker(ctx, b, t, unlocked, near) {
    const p = toScreen(b.door.x + .5, b.door.y + .5, 0);
    const label = (unlocked ? '' : '! ') + b.name;
    const tw = textWidth(label, 1, 1);
    const w = tw + 6;
    const bob = Math.round(Math.sin(t * 3) * 2);
    const x = Math.round(p.x - w / 2), y = Math.round(p.y) - 30 + bob;
    const bg = near ? '#f6f0dc' : '#2b2136';
    const fg = near ? '#2b2136' : '#f6f0dc';
    px(ctx, x, y, w, 11, '#151022');
    px(ctx, x + 1, y + 1, w - 2, 9, bg);
    px(ctx, x + Math.round(w / 2) - 2, y + 11, 4, 1, '#151022');
    px(ctx, x + Math.round(w / 2) - 1, y + 12, 2, 1, '#151022');
    pxText(ctx, label, x + 3, y + 3, fg, 1, 1);
  }
}
