// =====================================================================
//  LA VILLE · la scene Phaser
//  ---------------------------------------------------------------
//  Le sol, les batiments, les decors et les personnages sont cuits en
//  canvas par dessin.js, puis affiches ici en WebGL. Phaser apporte la
//  camera, le tri en profondeur, les particules, les tweens et le glow.
// =====================================================================
import { Carte, DEPART, Marcheur, W as CW, H as CH } from '../world/carte.js';
import { versEcran, versMonde, HW, HH, HU, cuireSol, cuireBatiment, cuireDecor, cuirePoses, ENCRE } from '../world/dessin.js';
import { RIVAUX, HABITANTS } from '../data/monde.js';

const PROF = (x, y) => Math.round((x + y) * 64);
const POLICE = '"Nunito","Helvetica Neue",Arial,sans-serif';
const melange = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; };

export class Ville extends Phaser.Scene {
  constructor() { super('ville'); }
  init(data) { this.ctx = data; }

  create() {
    const { carte, jeu } = this.ctx;
    this.carte = carte; this.jeu = jeu;
    if (this.ctx.surScene) this.ctx.surScene(this);
    this.heros = new Marcheur(DEPART.x, DEPART.y, 3.4);
    this.objectif = null;
    this.t = 0;
    this.cuire();
    this.poser();
    this.camera();
    this.entrees();
    this.ambiance();
    this.marqueurs();
    this.jeu.on('niveau', () => this.rafraichirBatiments());
    this.jeu.on('materiel', (m) => { if (m.id === 'casque') this.recuirePersonnage(); });
    this.jeu.on('gain', (n, source) => { if (source !== 'vente') this.pluieDePieces(Math.min(14, 3 + Math.round(Math.sqrt(n)))); });
    this.jeu.on('change', () => this.majBulles());
    this.jeu.on('quete', () => this.majFleche());
    this.majFleche(); this.majBulles();
    this.events.on('shutdown', () => { this.ctx = null; });
  }

  // ------------------------------------------------------------ textures
  cuire() {
    const t = this.textures;
    const sol = cuireSol(this.carte);
    t.addCanvas('sol', sol.canvas); this.sol = sol;
    this.batCuits = new Map();
    for (const b of this.carte.batiments) this.cuireUnBatiment(b);
    this.decTex = new Map();
    for (const d of this.carte.decors) {
      const cle = d.type + '|' + (d.s || 1).toFixed(2) + '|' + (d.teinte || 0).toFixed(1);
      d._cle = cle;
      if (this.decTex.has(cle)) continue;
      const cuit = cuireDecor(d);
      const nom = 'dec_' + this.decTex.size;
      t.addCanvas(nom, cuit.canvas);
      this.decTex.set(cle, { nom, ...cuit });
    }
    this.recuirePersonnage(true);
  }
  cuireUnBatiment(b) {
    const ouvert = this.jeu.ouvert(b);
    const cle = 'bat_' + b.id + (ouvert ? '_o' : '_f');
    if (!this.textures.exists(cle)) {
      const cuit = cuireBatiment(b, ouvert);
      this.textures.addCanvas(cle, cuit.canvas);
      this.batCuits.set(cle, cuit);
    }
    return cle;
  }
  recuirePersonnage(premiere = false) {
    const look = { corps: '#f2b33d', short: '#4a86d9', casque: this.jeu.s.materiel.includes('casque') };
    const { poses } = cuirePoses(look);
    const suffixe = look.casque ? 'c' : 'n';
    for (const [nom, c] of Object.entries(poses)) if (!this.textures.exists('h_' + suffixe + '_' + nom)) this.textures.addCanvas('h_' + suffixe + '_' + nom, c);
    this.prefixeHeros = 'h_' + suffixe + '_';
    if (!this.anims.exists('h_' + suffixe + '_marche_d')) {
      for (const dir of ['marche_d', 'marche_g', 'dos']) {
        this.anims.create({ key: 'h_' + suffixe + '_' + dir, frameRate: 10, repeat: -1, frames: [0, 1, 2, 3].map((f) => ({ key: 'h_' + suffixe + '_' + dir + '_' + f })) });
      }
    }
    if (!premiere && this.spriteHeros) this.spriteHeros.setTexture(this.prefixeHeros + 'repos_d');
  }

  // ---------------------------------------------------------------- monde
  poser() {
    this.add.image(-this.sol.ox, -this.sol.oy, 'sol').setOrigin(0, 0).setDepth(-1e6);
    this.imagesBat = new Map();
    for (const b of this.carte.batiments) {
      const cle = this.cuireUnBatiment(b);
      const c = this.batCuits.get(cle);
      const img = this.add.image(c.dx, c.dy, cle).setOrigin(0, 0).setDepth(PROF(b.x + b.w * 0.5, b.y + b.d * 0.5));
      img.setInteractive({ useHandCursor: true });
      this.imagesBat.set(b.id, img);
      if ((b.style === 'club' || b.style === 'bar') && this.jeu.ouvert(b) && img.postFX) img.postFX.addGlow(0xff5cb4, 1.2, 0, false, 0.1, 10);
    }
    for (const d of this.carte.decors) {
      const t = this.decTex.get(d._cle);
      const p = versEcran(d.x, d.y, 0);
      const img = this.add.image(Math.round(p.x) - t.ax, Math.round(p.y) - t.ay, t.nom).setOrigin(0, 0).setDepth(PROF(d.x, d.y));
      if (d.type === 'lampe') (this.lampes ||= []).push(img);
      if (d.type === 'arbre' || d.type === 'buisson') {
        this.tweens.add({ targets: img, angle: { from: -0.8, to: 0.8 }, duration: 1800 + Math.random() * 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        img.setOrigin(t.ax / img.width, t.ay / img.height); img.setPosition(Math.round(p.x), Math.round(p.y));
      }
    }
    const p0 = versEcran(this.heros.x, this.heros.y, 0);
    this.spriteHeros = this.add.sprite(p0.x, p0.y, this.prefixeHeros + 'repos_d').setOrigin(48 / 96, 100 / 110).setDepth(PROF(this.heros.x, this.heros.y));

    /* LES PASSANTS : les rivaux et les habitants, chacun dans sa couleur. */
    this.passants = [];
    const cast = melange([...RIVAUX.map((r) => ({ ...r, nom: r.name, rival: true })), ...HABITANTS.map((h) => ({ ...h, rival: false }))]).slice(0, 8);
    for (const id of cast) {
      const look = { corps: id.corps, short: id.short };
      const { poses } = cuirePoses(look);
      const pre = 'p_' + id.id + '_';
      for (const [nom, c] of Object.entries(poses)) if (!this.textures.exists(pre + nom)) this.textures.addCanvas(pre + nom, c);
      for (const dir of ['marche_d', 'marche_g', 'dos']) if (!this.anims.exists(pre + dir)) this.anims.create({ key: pre + dir, frameRate: 9, repeat: -1, frames: [0, 1, 2, 3].map((f) => ({ key: pre + dir + '_' + f })) });
      const pos = this.carte.pointLibre();
      const m = new Marcheur(pos.x, pos.y, 1.2 + Math.random() * 0.9);
      const sp = this.add.sprite(0, 0, pre + 'repos_d').setOrigin(48 / 96, 100 / 110).setScale(0.86);
      this.passants.push({ m, sp, pre, identite: id, attente: Math.random() * 3 });
    }
  }
  rafraichirBatiments() {
    for (const b of this.carte.batiments) {
      const img = this.imagesBat.get(b.id);
      const cle = this.cuireUnBatiment(b);
      if (img.texture.key !== cle) {
        const c = this.batCuits.get(cle);
        img.setTexture(cle); img.setPosition(c.dx, c.dy);
        /* Le lieu qui s'ouvre saute de joie, et une pluie de confettis. */
        this.tweens.add({ targets: img, scaleY: { from: 0.7, to: 1 }, scaleX: { from: 1.15, to: 1 }, duration: 520, ease: 'Back.out' });
        img.setOrigin(0.5, 1); img.setPosition(c.dx + img.width / 2, c.dy + img.height);
        const p = versEcran(b.x + b.w / 2, b.y + b.d / 2, 2);
        this.confettis.explode(60, p.x, p.y);
        if ((b.style === 'club' || b.style === 'bar') && img.postFX) img.postFX.addGlow(0xff5cb4, 1.2, 0, false, 0.1, 10);
      }
    }
  }

  // --------------------------------------------------------------- camera
  camera() {
    const cam = this.cameras.main;
    this.zoomBase();
    cam.startFollow(this.spriteHeros, true, 0.12, 0.12);
    const gauche = -CH * HW, largeur = (CW + CH) * HW;
    cam.setBounds(gauche - 60, -HU * 6, largeur + 120, (CW + CH) * HH + HU * 8);
    this.scale.on('resize', () => this.zoomBase());
  }
  zoomBase() {
    const w = this.scale.width, h = this.scale.height;
    const k = Math.max(0.9, Math.min(1.6, Math.min(w, h) / 520));
    this.cameras.main.setZoom(k);
  }
  zoomer(sens) {
    const cam = this.cameras.main;
    const k = Math.max(0.7, Math.min(2.2, cam.zoom + sens * 0.2));
    this.tweens.add({ targets: cam, zoom: k, duration: 160, ease: 'Sine.out' });
  }

  // -------------------------------------------------------------- entrees
  entrees() {
    this.touches = this.input.keyboard.addKeys('W,A,S,D,Z,Q,UP,DOWN,LEFT,RIGHT');
    this.input.on('wheel', (p, o, dx, dy) => this.zoomer(dy > 0 ? -1 : 1));
    let debut = null;
    this.input.on('pointerdown', (p) => { debut = { x: p.x, y: p.y, t: performance.now() }; });
    this.input.on('pointerup', (p) => {
      if (!debut) return;
      const d = Math.hypot(p.x - debut.x, p.y - debut.y), dt = performance.now() - debut.t;
      debut = null;
      if (d > 14 || dt > 500) return;          // c'etait un glissement
      if (this.ctx.ui.estOuvert) return;
      this.tap(p);
    });
    /* Glisser deplace la camera ; le suivi reprend au prochain tap. */
    this.input.on('pointermove', (p) => {
      if (!p.isDown || !debut) return;
      if (Math.hypot(p.x - debut.x, p.y - debut.y) < 14) return;
      const cam = this.cameras.main;
      cam.stopFollow();
      cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
      cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
    });
    /* Pincer zoome. */
    this.input.addPointer(1);
    let pince = null;
    this.input.on('pointermove', () => {
      const p1 = this.input.pointer1, p2 = this.input.pointer2;
      if (p1.isDown && p2.isDown) {
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (pince) { const cam = this.cameras.main; cam.setZoom(Math.max(0.7, Math.min(2.2, cam.zoom * d / pince))); }
        pince = d;
      } else pince = null;
    });
  }
  tap(p) {
    const cam = this.cameras.main;
    cam.startFollow(this.spriteHeros, true, 0.12, 0.12);
    const m = cam.getWorldPoint(p.x, p.y);
    /* On teste d'abord les images de batiments (qui debordent de leur
       emprise au sol), puis la tuile. */
    let cible = null;
    for (const b of this.carte.batiments) {
      const img = this.imagesBat.get(b.id);
      if (img.getBounds().contains(m.x, m.y)) {
        // le point touche doit etre au-dessus de la porte, pas dans l'herbe devant
        const w = versMonde(m.x, m.y);
        const facade = versEcran(b.x + b.w, b.y + b.d / 2, 0);
        if (m.y <= facade.y + 6 || (w.x >= b.x && w.x < b.x + b.w && w.y >= b.y && w.y < b.y + b.d)) { cible = b; break; }
      }
    }
    if (!cible) { const w = versMonde(m.x, m.y); cible = this.carte.batimentA(w.x | 0, w.y | 0) || this.carte.porteProche(w.x, w.y, 1.2); }
    if (cible) { this.allerA(cible); return; }
    const w = versMonde(m.x, m.y);
    this.objectif = null;
    this.heros.allerA(w.x, w.y, this.carte);
    this.marqueSol(w.x, w.y);
  }
  allerA(b) {
    if (!b) return;
    const d = Math.hypot(this.heros.x - (b.door.x + 0.5), this.heros.y - (b.door.y + 0.5));
    if (d < 1.5) { this.ctx.surEntrer(b); return; }
    if (this.heros.allerA(b.door.x + 0.5, b.door.y + 0.5, this.carte)) {
      this.objectif = b;
      this.marqueSol(b.door.x + 0.5, b.door.y + 0.5);
    }
  }
  marqueSol(x, y) {
    const p = versEcran(x, y, 0);
    const r = this.add.ellipse(p.x, p.y, 40, 20).setStrokeStyle(3, 0xffffff, 0.9).setDepth(-1e5);
    this.tweens.add({ targets: r, scaleX: 0.3, scaleY: 0.3, alpha: 0, duration: 420, ease: 'Sine.out', onComplete: () => r.destroy() });
  }
  vecteur() {
    const t = this.touches;
    let x = 0, y = 0;
    if (t.LEFT.isDown || t.A.isDown || t.Q.isDown) x -= 1;
    if (t.RIGHT.isDown || t.D.isDown) x += 1;
    if (t.UP.isDown || t.W.isDown || t.Z.isDown) y -= 1;
    if (t.DOWN.isDown || t.S.isDown) y += 1;
    const m = Math.hypot(x, y);
    return m > 1 ? { x: x / m, y: y / m } : { x, y };
  }

  // ------------------------------------------------------------- ambiance
  ambiance() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 3, 3); g.generateTexture('point', 3, 3);
    g.clear(); g.fillStyle(0xffd23d, 1); g.fillCircle(5, 5, 5); g.lineStyle(2, 0x2a1d33, 1); g.strokeCircle(5, 5, 5); g.generateTexture('piece', 11, 11);
    g.clear(); g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 6, 4); g.generateTexture('confetti', 6, 4);
    g.destroy();
    this.poussiere = this.add.particles(0, 0, 'point', {
      speed: { min: 6, max: 18 }, lifespan: 700, quantity: 1, frequency: 80,
      alpha: { start: 0.6, end: 0 }, scale: { start: 1, end: 0.3 }, tint: 0xf2e2c4, emitting: false,
    }).setDepth(1e6);
    this.pieces = this.add.particles(0, 0, 'piece', {
      speed: { min: 80, max: 200 }, angle: { min: 230, max: 310 }, gravityY: 500, lifespan: 900, quantity: 1,
      scale: { start: 1.2, end: 0.6 }, alpha: { start: 1, end: 0.6 }, emitting: false, rotate: { min: 0, max: 360 },
    }).setDepth(1e6 + 1);
    this.confettis = this.add.particles(0, 0, 'confetti', {
      speed: { min: 60, max: 260 }, angle: { min: 200, max: 340 }, gravityY: 400, lifespan: 1400, quantity: 1,
      tint: [0xff5cb4, 0xffd23d, 0x5fd6c8, 0x4fe08a, 0xff8a3d], rotate: { min: 0, max: 360 }, scale: { start: 1.3, end: 0.5 }, emitting: false,
    }).setDepth(1e6 + 2);
    this.lucioles = this.add.particles(0, 0, 'point', {
      speed: { min: 2, max: 8 }, lifespan: 2600, quantity: 1, frequency: 220,
      alpha: { start: 0, end: 0 }, scale: { start: 1.5, end: 1 }, tint: 0xffe08a, emitting: false,
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 160) },
    }).setDepth(1e6);
    this.teinte = this.add.rectangle(0, 0, 8000, 8000, 0x1b2b4a, 0).setScrollFactor(0).setDepth(2e6).setBlendMode(Phaser.BlendModes.MULTIPLY);
    // les nuages, en dessin, qui derivent au-dessus de la ville
    this.nuages = [];
    for (let i = 0; i < 6; i++) {
      const n = this.add.container(Math.random() * 1600 - 800, Math.random() * 900 - 200).setDepth(3e6).setAlpha(0.75);
      for (const [dx, dy, r] of [[0, 0, 26], [-24, 6, 18], [26, 4, 20], [8, -12, 16]]) n.add(this.add.ellipse(dx, dy, r * 2, r * 1.3, 0xffffff));
      n.vitesse = 6 + Math.random() * 8;
      this.nuages.push(n);
    }
  }
  pluieDePieces(n) {
    const p = versEcran(this.heros.x, this.heros.y, 1.2);
    this.pieces.explode(n, p.x, p.y);
  }
  celebrer() {
    const p = versEcran(this.heros.x, this.heros.y, 1.5);
    this.confettis.explode(90, p.x, p.y);
  }
  positionEcranHeros() {
    const cam = this.cameras.main;
    const p = versEcran(this.heros.x, this.heros.y, 1.4);
    return { x: (p.x - cam.worldView.x) * cam.zoom, y: (p.y - cam.worldView.y) * cam.zoom };
  }

  // ------------------------------------------------------------ marqueurs
  marqueurs() {
    /* La fleche d'objectif : un chevron dore qui rebondit au-dessus du lieu
       de la quete. Les bulles « ! » signalent ce qu'on peut faire. */
    this.fleche = this.add.container(0, 0).setDepth(4e6).setVisible(false);
    const tri = this.add.triangle(0, 0, -16, -26, 16, -26, 0, 0, 0xffd23d).setStrokeStyle(3, 0x2a1d33);
    const rond = this.add.circle(0, -44, 17, 0xffd23d).setStrokeStyle(3, 0x2a1d33);
    const txt = this.add.text(0, -44, '!', { fontFamily: POLICE, fontSize: '22px', fontStyle: '900', color: '#2a1d33' }).setOrigin(0.5);
    this.fleche.add([tri, rond, txt]);
    this.tweens.add({ targets: this.fleche, y: '-=12', duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.bulles = new Map();
  }
  majFleche() {
    const e = this.jeu.etape;
    const b = e && e.cible ? this.carte.batiments.find((x) => x.id === e.cible) : null;
    if (!b) { this.fleche.setVisible(false); return; }
    const p = versEcran(b.x + b.w / 2, b.y + b.d / 2, (b.style === 'tour' ? 9 : b.style === 'bureau' ? 5 : 3.2));
    this.fleche.setPosition(p.x, p.y).setVisible(true);
    this.fleche.setDepth(4e6);
  }
  majBulles() {
    const j = this.jeu, s = j.s;
    const voulues = {};
    if (j.dateCeSoir) voulues.home = { txt: '🎧', couleur: 0xff5cb4 };
    else if (s.offres.some((o) => !o.prise && j.kitComplet && s.hype >= o.hypeMin)) voulues.home = { txt: '📅', couleur: 0x5fd6c8 };
    const piece = j.prochainePiece;
    if (piece && s.cash >= piece.prix) voulues.gear = { txt: '$', couleur: 0x4fe08a };
    if (s.label.niveau > 0 && j.artistesSignables().some((a) => !a.pris && s.cash >= a.advance) && s.roster.length < (j.palierLabel?.artistes || 0)) voulues.label = { txt: '✍', couleur: 0xffd23d };
    if (s.energie < 30) voulues.snack = { txt: '🍟', couleur: 0xff8a3d };
    for (const [id, bulle] of this.bulles) if (!voulues[id]) { bulle.destroy(); this.bulles.delete(id); }
    for (const [id, v] of Object.entries(voulues)) {
      if (this.bulles.has(id)) continue;
      const b = this.carte.batiments.find((x) => x.id === id);
      if (!b || !j.ouvert(b)) continue;
      const p = versEcran(b.x + b.w * 0.8, b.y + b.d * 0.2, 2.6);
      const c = this.add.container(p.x, p.y).setDepth(4e6 - 1);
      c.add(this.add.circle(0, 0, 16, v.couleur).setStrokeStyle(3, 0x2a1d33));
      c.add(this.add.text(0, 0, v.txt, { fontFamily: POLICE, fontSize: '17px', fontStyle: '900', color: '#2a1d33' }).setOrigin(0.5));
      this.tweens.add({ targets: c, scale: { from: 0, to: 1 }, duration: 320, ease: 'Back.out' });
      this.tweens.add({ targets: c, y: '-=6', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 320 });
      this.bulles.set(id, c);
    }
  }

  // ---------------------------------------------------------------- boucle
  update(now, dtms) {
    if (!this.ctx) return;
    const dt = Math.min(0.05, dtms / 1000);
    this.t += dt;
    const ui = this.ctx.ui;
    const h = this.heros;
    if (!ui.estOuvert) {
      h.update(dt, this.carte, this.vecteur());
      if (h.bouge) this.jeu.tick(dt);
      for (const p of this.passants) {
        if (p.attente > 0) { p.attente -= dt; p.m.bouge = false; }
        else if (!p.m.chemin) { const c = this.carte.pointLibre(); p.m.allerA(c.x, c.y, this.carte); p.attente = 0; if (!p.m.chemin) p.attente = 1; }
        p.m.update(dt, this.carte, null);
        if (!p.m.chemin && !p.attente) p.attente = 1 + Math.random() * 3;
      }
    }
    const s = versEcran(h.x, h.y, 0);
    this.spriteHeros.setPosition(Math.round(s.x), Math.round(s.y)).setDepth(PROF(h.x, h.y));
    const cle = this.prefixeHeros + (h.dos ? 'dos' : h.sens > 0 ? 'marche_d' : 'marche_g');
    if (h.bouge) { if (this.spriteHeros.anims.currentAnim?.key !== cle || !this.spriteHeros.anims.isPlaying) this.spriteHeros.play(cle); }
    else { this.spriteHeros.stop(); this.spriteHeros.setTexture(this.prefixeHeros + (h.dos ? 'repos_dos' : h.sens > 0 ? 'repos_d' : 'repos_g')); }
    for (const p of this.passants) {
      const q = versEcran(p.m.x, p.m.y, 0);
      p.sp.setPosition(Math.round(q.x), Math.round(q.y)).setDepth(PROF(p.m.x, p.m.y));
      const k = p.pre + (p.m.dos ? 'dos' : p.m.sens > 0 ? 'marche_d' : 'marche_g');
      if (p.m.bouge) { if (p.sp.anims.currentAnim?.key !== k || !p.sp.anims.isPlaying) p.sp.play(k); }
      else { p.sp.stop(); p.sp.setTexture(p.pre + (p.m.dos ? 'repos_dos' : p.m.sens > 0 ? 'repos_d' : 'repos_g')); }
    }
    this.poussiere.setPosition(s.x, s.y); this.poussiere.emitting = h.bouge && !ui.estOuvert;
    this.lucioles.setPosition(s.x, s.y - 30);

    // arrivee devant une porte
    if (this.objectif && !h.chemin) {
      const b = this.objectif; this.objectif = null;
      if (Math.hypot(h.x - (b.door.x + 0.5), h.y - (b.door.y + 0.5)) < 1.7) this.ctx.surEntrer(b);
    }
    const proche = this.carte.porteProche(h.x, h.y, 1.5);
    if (proche !== this.porteProche) { this.porteProche = proche; this.ctx.surPorte(proche); }

    // le jour et la nuit
    const heure = this.jeu.heure % 24;
    const nuit = heure >= 20 ? Math.min(1, (heure - 20) / 2.5) : heure < 7 ? 1 - Math.max(0, (heure - 5) / 2) : 0;
    const soir = heure >= 17 && heure < 20 ? (heure - 17) / 3 : 0;
    this.teinte.setFillStyle(nuit > 0 ? 0x2b3a80 : 0xffb46b, nuit > 0 ? nuit * 0.7 : soir * 0.25);
    this.lucioles.emitting = nuit > 0.5 && !ui.estOuvert;
    if (this.lampes) for (const l of this.lampes) l.setTint(nuit > 0.3 ? 0xffe27a : 0xffffff);
    for (const n of this.nuages) { n.x += n.vitesse * dt; if (n.x > 1400) n.x = -900; }
  }
}
