// =====================================================================
//  RENDU PIXEL ART
//  ---------------------------------------------------------------
//  On dessine tout dans un tampon basse resolution, puis on l'agrandit
//  d'un facteur entier sans lissage : c'est ce qui donne des pixels
//  carres et nets, comme dans un jeu de l'epoque 16 bits.
// =====================================================================
import { toScreen, Camera } from '../core/iso.js';
import { drawGround, drawBuilding, drawProp, castBuildingShadow, poseEnseigne, styleDe } from '../world/architecture.js';
import { setTime, setLight, LIGHT, px, alpha, time as artTime } from '../core/art.js';

/* La meme pile que le HTML : le jeu n'a plus qu'une police. Le repli est
   nomme explicitement car un canvas ne connait pas la cascade CSS. */
const POLICE = '"Nunito","Helvetica Neue",Arial,sans-serif';

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

    // ---- et par-dessus, le texte, a la definition de l'ecran
    this.calqueDuTexte(c, game, player, t);
  }

  /* ================================================================
     LE CALQUE DU TEXTE
     ---------------------------------------------------------------
     Tout ce qui est ECRIT dans le monde se peint ici, apres
     l'agrandissement, donc a la definition reelle de l'ecran et non a
     celle du tampon. C'est la seule facon d'y mettre une vraie police.

     POURQUOI PAS DANS LE TAMPON. Le monde est dessine dans une image trois
     fois plus petite que l'ecran, puis agrandie sans lissage. Une lettre y
     ferait six pixels de haut avant d'etre triplee : Nunito rendue a six
     pixels puis agrandie au plus proche voisin ne donne pas une lettre,
     elle donne trois taches. C'est precisement pour cela que le texte du
     canvas etait une police bitmap dessinee a la main — le seul alphabet
     qui survive a ce traitement, au prix de trois pixels de large par
     lettre et d'aucun accent possible.

     Ici, une lettre fait trente pixels d'ecran et se dessine comme dans une
     page. Le monde reste du pixel art net ; le texte redevient du texte.
     Les deux calques ne se melangent pas, et c'est ce qui permet aux deux
     d'etre justes en meme temps.

     TOUT EST EN PIXELS CSS : on pose la transformation a dpr, et l'on
     multiplie les coordonnees du tampon par k. Le decalage de la camera
     vient de cam.offset(), le meme que celui du monde, arrondi au pixel
     entier du tampon — sinon l'enseigne glisserait sur son toit des que
     la camera bouge. */
  calqueDuTexte(c, game, player, t) {
    const k = this.k, dpr = this.dpr, cam = this.cam;
    const { tx, ty } = cam.offset();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.imageSmoothingEnabled = true;
    c.textBaseline = 'top';
    // monde -> pixel CSS
    const proj = (wx, wy, wz) => {
      const p = toScreen(wx, wy, wz);
      return { x: (p.x + tx) * k, y: (p.y + ty) * k };
    };
    const vue = this.champ();

    // ---- les enseignes des batiments
    for (const b of this.city.buildings) {
      if (b.x + b.w < vue.x0 || b.x > vue.x1 || b.y + b.d < vue.y0 || b.y > vue.y1) continue;
      const unlocked = game.unlocked(b);
      const pose = poseEnseigne(b, unlocked ? styleDe(b) : 'chantier');
      if (!pose) continue;
      const p = proj(pose.x, pose.y, pose.z);
      const neon = b.club;
      const on = neon ? Math.sin(artTime() * 3.4) > -0.75 : true;
      this.panneau(c, p.x, p.y, b.sign, k, {
        mat: pose.mat,
        bg: neon ? '#241b33' : (game.isNight ? '#ffdc8a' : '#f6f0dc'),
        fg: neon ? (on ? '#ff5cb4' : '#7a2a58') : '#2b2136',
        bord: neon ? (on ? '#ff5cb4' : '#3d2b44') : '#2b2136',
        accent: neon ? null : (b.roof || '#c9924e'),
      });
    }

    // ---- la bulle au-dessus de la porte la plus proche
    let best = null, bd = 3.2;
    for (const b of this.city.buildings) {
      const d = Math.hypot(player.x - (b.door.x + .5), player.y - (b.door.y + .5));
      if (d < bd) { bd = d; best = b; }
    }
    if (best) {
      const unlocked = game.unlocked(best);
      const pres = bd < 1.4;
      const p = proj(best.door.x + .5, best.door.y + .5, 0);
      const bob = Math.sin(t * 3) * 2;
      this.bulle(c, p.x, p.y - 30 * (k / 3) + bob, (unlocked ? '' : '! ') + best.name, k, pres);
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* Un panneau : le cadre, la bande de couleur du toit, le nom, le mat.
     Le corps suit le facteur d'agrandissement, donc l'enseigne garde la
     meme taille apparente que le batiment a tous les niveaux de zoom. */
  panneau(c, cx, cy, texte, k, o) {
    /* LE CORPS, MESURE PLUTOT QUE CHOISI. L'ancienne police bitmap donnait
       des capitales de cinq pixels de tampon, doublees, soit dix pixels de
       tampon de haut. La hauteur de capitale de Nunito vaut environ 0,71 du
       corps : pour retrouver la meme taille apparente il faut donc un corps
       d'a peu pres quatorze pixels de tampon. On en prend onze — Nunito se
       lit mieux a hauteur egale, et le panneau reste plus etroit que
       l'ancien, ce qui evite qu'il deborde des petites cabanes. */
    const corps = Math.round(10 * k);
    const bord = Math.max(1, Math.round(k / 2));
    c.font = `800 ${corps}px ${POLICE}`;
    const tw = c.measureText(texte).width;
    const w = Math.round(tw + 6 * k), h = Math.round(corps + 4 * k);
    const x = Math.round(cx - w / 2), y = Math.round(cy - h);
    if (o.mat) {
      const mw = Math.max(2, Math.round(k * 0.8));
      c.fillStyle = '#6b4426';
      c.fillRect(Math.round(cx - mw / 2), y + h, mw, Math.round(o.mat * 16 * k));
    }
    c.fillStyle = o.bord;
    c.fillRect(x, y, w, h);
    c.fillStyle = o.bg;
    c.fillRect(x + bord, y + bord, w - bord * 2, h - bord * 2);
    if (o.accent) {
      c.fillStyle = o.accent;
      c.fillRect(x + bord, y + bord, w - bord * 2, Math.max(1, Math.round(k * 0.7)));
    }
    c.fillStyle = o.fg;
    c.textAlign = 'center';
    c.fillText(texte, Math.round(cx), y + Math.round(h / 2 - corps * 0.62));
    c.textAlign = 'left';
  }

  /* La bulle de porte : meme fabrique, plus un ergot en dessous qui la
     rattache a l'entree. C'est l'ergot qui dit DE QUELLE porte on parle. */
  bulle(c, cx, cy, texte, k, pres) {
    const corps = Math.round(8 * k);
    const bord = Math.max(1, Math.round(k / 2));
    c.font = `700 ${corps}px ${POLICE}`;
    const tw = c.measureText(texte).width;
    const w = Math.round(tw + 5 * k), h = Math.round(corps + 3.5 * k);
    const x = Math.round(cx - w / 2), y = Math.round(cy - h);
    const bg = pres ? '#f6f0dc' : '#2b2136';
    const fg = pres ? '#2b2136' : '#f6f0dc';
    c.fillStyle = '#151022';
    c.fillRect(x, y, w, h);
    c.fillStyle = bg;
    c.fillRect(x + bord, y + bord, w - bord * 2, h - bord * 2);
    c.fillStyle = '#151022';
    const e = Math.round(k * 1.4);
    c.fillRect(Math.round(cx - e / 2), y + h, e, Math.round(k * 1.2));
    c.fillStyle = fg;
    c.textAlign = 'center';
    c.fillText(texte, Math.round(cx), y + Math.round(h / 2 - corps * 0.62));
    c.textAlign = 'left';
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

}
