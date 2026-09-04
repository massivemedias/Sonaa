// =====================================================================
//  LA SCENE PHASER
//  ---------------------------------------------------------------
//  Ce que le moteur apporte, et qu'il fallait ecrire a la main :
//
//  - WEBGL ET LE LOT PAR ATLAS. Six cents decors etaient six cents
//    drawImage par image, avec un tri en profondeur refait a chaque fois.
//    Phaser les envoie par lots au GPU et cule tout seul ce qui sort du
//    champ.
//  - LA CAMERA. Suivi amorti, bornes, zoom entier, arrondi au pixel :
//    quatre lignes au lieu d'un module.
//  - LES EFFETS. `postFX.addGlow()` fait rayonner le neon du club et les
//    lampes ; a la main, c'etait un flou gaussien a ecrire soi-meme.
//  - LES PARTICULES ET LES TWEENS. Poussiere sur la route, lucioles la
//    nuit, panneau qui s'installe : gratuits.
//
//  Ce qu'il n'apporte PAS, et il faut le dire : un mur plat reste un mur
//  plat. Le moteur affiche des sprites, il n'en dessine aucun.
// =====================================================================
import { City, START, W as CW, H as CH } from '../src/world/city.js';
import { Player } from '../src/game/player.js';
import { toScreen, HW, HH, HU } from '../src/core/iso.js';
import { poseEnseigne, styleDe } from '../src/world/architecture.js';
import { LIGHT, setLight, setTime } from '../src/core/art.js';
import { cuireLeSol, cuireBatiment, cuireDecor, cuirePersonnage } from './atelier.js';

const POLICE = '"Nunito","Helvetica Neue",Arial,sans-serif';
const PROF = (x, y) => (x + y) * 16;      // la cle de profondeur, en entiers

export class Clairiere extends Phaser.Scene {
  constructor() { super('clairiere'); }

  create() {
    setTime(0);
    setLight(10);

    this.city = new City();
    this.player = new Player(START.x, START.y);
    this.heure = 10;

    this.cuireLesTextures();
    this.poserLeMonde();
    this.reglerLaCamera();
    this.brancherLesEntrees();
    this.ambiance();
  }

  // ------------------------------------------------------------ textures
  cuireLesTextures() {
    const t = this.textures;
    const env = { t: 0, night: false, unlocked: true };

    const sol = cuireLeSol(this.city);
    t.addCanvas('sol', sol.canvas);
    this.solOffset = sol;

    this.batTex = new Map();
    for (const b of this.city.buildings) {
      const cuit = cuireBatiment(b, { ...env, unlocked: true });
      t.addCanvas('bat_' + b.id, cuit.canvas);
      this.batTex.set(b.id, cuit);
    }

    /* Un decor par VARIANTE, pas par exemplaire. Cinq cent quatre-vingt-douze
       buissons ne font qu'une trentaine d'images differentes : c'est ce que
       le rendu canvas faisait deja avec son cache, et c'est ce qu'un atlas
       fait naturellement. */
    this.decTex = new Map();
    for (const pr of this.city.props) {
      const cle = pr.type + '|' + (pr.s || 1).toFixed(2) + '|' +
        Math.round(pr.type === 'tree' ? pr.x * 3 + pr.y : pr.type === 'bush' ? pr.x * 5 + pr.y : pr.x + pr.y * 3);
      pr._cle = cle;
      if (this.decTex.has(cle)) continue;
      const cuit = cuireDecor(pr, env);
      t.addCanvas('dec_' + this.decTex.size, cuit.canvas);
      this.decTex.set(cle, { nom: 'dec_' + this.decTex.size, ...cuit });
    }

    this.poses = cuirePersonnage(this.player, this.city);
    for (const [nom, p] of Object.entries(this.poses)) t.addCanvas('h_' + nom, p.canvas);
    this.anims.create({
      key: 'marche_d', frameRate: 9, repeat: -1,
      frames: [0, 1, 2, 3].map(f => ({ key: 'h_marche_d_' + f })),
    });
    this.anims.create({
      key: 'marche_g', frameRate: 9, repeat: -1,
      frames: [0, 1, 2, 3].map(f => ({ key: 'h_marche_g_' + f })),
    });
    this.anims.create({
      key: 'dos', frameRate: 9, repeat: -1,
      frames: [0, 1, 2, 3].map(f => ({ key: 'h_dos_' + f })),
    });
  }

  // --------------------------------------------------------------- monde
  poserLeMonde() {
    const s = this.solOffset;
    this.add.image(-s.ox, -s.oy, 'sol').setOrigin(0, 0).setDepth(-100000);

    for (const b of this.city.buildings) {
      const c = this.batTex.get(b.id);
      const img = this.add.image(c.dx, c.dy, 'bat_' + b.id).setOrigin(0, 0);
      img.setDepth(PROF(b.x + b.w / 2, b.y + b.d / 2));
      if (b.club) {
        // LE NEON RAYONNE. Une ligne ; a la main c'etait un flou a ecrire.
        img.postFX.addGlow(0xff5cb4, 1.4, 0, false, 0.1, 12);
      }
    }

    for (const pr of this.city.props) {
      const d = this.decTex.get(pr._cle);
      const p = toScreen(pr.x, pr.y, 0);
      const img = this.add.image(Math.floor(p.x) - d.ax, Math.floor(p.y) - d.ay, d.nom).setOrigin(0, 0);
      img.setDepth(PROF(pr.x, pr.y));
      if (pr.type === 'lamp') this.lampes = (this.lampes || []).concat(img);
    }

    /* L'ANCRE DU PERSONNAGE EST DANS SON IMAGE, PAS EN HAUT A GAUCHE.

       Les images sont cuites dans un carre de 96 avec les pieds a (48, 72).
       Posee avec l'origine par defaut, l'image se retrouvait decalee de
       quarante-huit pixels a droite et soixante-douze vers le bas : a
       l'echelle deux, le heros etait cache derriere les batiments du
       sud-est et l'on croyait qu'il ne s'affichait pas. */
    const p0 = toScreen(this.player.x, this.player.y, 0);
    this.heros = this.add.sprite(p0.x, p0.y, 'h_repos_d').setOrigin(48 / 96, 72 / 96);
    this.heros.setDepth(PROF(this.player.x, this.player.y));

    this.enseignes = [];
    for (const b of this.city.buildings) {
      const pose = poseEnseigne(b, styleDe(b));
      if (!pose) continue;
      const p = toScreen(pose.x, pose.y, pose.z);
      const g = this.add.container(Math.round(p.x), Math.round(p.y));
      const corps = 11;
      const txt = this.add.text(0, 0, b.sign, {
        fontFamily: POLICE, fontSize: corps + 'px', fontStyle: '800',
        color: b.club ? '#ff5cb4' : '#3a2a1c',
      }).setOrigin(0.5, 1);
      const lw = Math.ceil(txt.width) + 8, lh = Math.ceil(txt.height) + 5;
      const fond = this.add.rectangle(0, -lh / 2 + 2, lw, lh, b.club ? 0x241b33 : 0xefe0bd)
        .setStrokeStyle(2, b.club ? 0xff5cb4 : 0x4a3324);
      const ombre = this.add.rectangle(1, -lh / 2 + 3, lw, lh, 0x140c1e, 0.42);
      g.add([ombre, fond, txt]);
      txt.setY(-2);
      g.setDepth(PROF(b.x + b.w / 2, b.y + b.d / 2) + 1);
      if (b.club) g.postFX.addGlow(0xff5cb4, 1.1, 0, false, 0.1, 8);
      this.enseignes.push(g);
    }
    /* PAS D'ANIMATION D'ENTREE SUR LES PANNEAUX. Il y en avait une, qui les
       posait a alpha zero puis les faisait grandir. Elle ne partait pas, et
       les dix-sept enseignes restaient donc invisibles : une fioriture qui
       cache le contenu n'est pas une fioriture, c'est une panne. On remettra
       le geste quand il y aura une raison de le regarder. */
  }

  // -------------------------------------------------------------- camera
  reglerLaCamera() {
    const cam = this.cameras.main;
    const k = Math.max(2, Math.min(3, Math.round(Math.min(window.innerWidth, window.innerHeight) / 300)));
    this.k = k;
    cam.setZoom(k);
    cam.setRoundPixels(true);
    cam.startFollow(this.heros, true, 0.14, 0.14);
    // les bornes du monde, pour ne jamais montrer le vide autour
    const gauche = -CH * HW, largeur = (CW + CH) * HW;
    cam.setBounds(gauche - 32, -8 * HU, largeur + 64, (CW + CH) * HH + 12 * HU);
    this.scale.on('resize', () => {
      const n = Math.max(2, Math.min(3, Math.round(Math.min(window.innerWidth, window.innerHeight) / 300)));
      this.k = n; cam.setZoom(n);
    });
  }

  zoomer(sens) {
    const cam = this.cameras.main;
    const k = Math.max(2, Math.min(6, Math.round(cam.zoom) + (sens > 0 ? 1 : -1)));
    if (k === Math.round(cam.zoom)) return;
    this.k = k;
    this.tweens.add({ targets: cam, zoom: k, duration: 140, ease: 'Sine.out' });
  }

  // ------------------------------------------------------------- entrees
  brancherLesEntrees() {
    this.touches = this.input.keyboard.addKeys('W,A,S,D,Z,Q,UP,DOWN,LEFT,RIGHT');
    this.stick = { x: 0, y: 0 };
    let roule = 0;
    this.input.on('wheel', (p, o, dx, dy) => {
      roule += dy;
      if (roule > 120) { this.zoomer(-1); roule = 0; }
      else if (roule < -120) { this.zoomer(+1); roule = 0; }
    });
    this.input.on('pointerdown', p => {
      const m = this.cameras.main.getWorldPoint(p.x, p.y);
      const w = { x: (m.x / HW + m.y / HH) / 2, y: (m.y / HH - m.x / HW) / 2 };
      this.player.goTo(w.x, w.y, this.city);
    });
  }

  vecteur() {
    const t = this.touches;
    let x = this.stick.x, y = this.stick.y;
    if (t.LEFT.isDown || t.A.isDown || t.Q.isDown) x -= 1;
    if (t.RIGHT.isDown || t.D.isDown) x += 1;
    if (t.UP.isDown || t.W.isDown || t.Z.isDown) y -= 1;
    if (t.DOWN.isDown || t.S.isDown) y += 1;
    const m = Math.hypot(x, y);
    return m > 1 ? { x: x / m, y: y / m } : { x, y };
  }

  // ------------------------------------------------------------ ambiance
  ambiance() {
    /* LA POUSSIERE ET LES LUCIOLES. Un emetteur de particules chacun, une
       douzaine de lignes en tout. C'est le genre de chose qu'on n'ecrit pas
       a la main parce que ca ne vaut pas les deux cents lignes ; avec un
       moteur, ca les vaut. */
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 2, 2);
    g.generateTexture('point', 2, 2); g.destroy();

    this.poussiere = this.add.particles(0, 0, 'point', {
      speed: { min: 4, max: 14 }, lifespan: 900, quantity: 1, frequency: 90,
      alpha: { start: 0.5, end: 0 }, scale: { start: 1, end: 0.4 },
      tint: 0xd9c9a0, emitting: false,
    }).setDepth(999999);

    this.lucioles = this.add.particles(0, 0, 'point', {
      speed: { min: 2, max: 8 }, lifespan: 2600, quantity: 1, frequency: 260,
      alpha: { start: 0, end: 0 }, scale: { start: 1.5, end: 1 },
      tint: 0xffe08a, emitting: false,
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 140) },
    }).setDepth(999999);
    this.lucioles.setAlpha(0.9);

    // la teinte du moment, en un seul rectangle plein ecran
    this.teinte = this.add.rectangle(0, 0, 4000, 4000, 0x1b2b4a, 0)
      .setScrollFactor(0).setDepth(1000000).setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  // --------------------------------------------------------------- boucle
  update(now, dtms) {
    const dt = Math.min(0.05, dtms / 1000);
    setTime(now / 1000);
    const p = this.player;
    p.update(dt, this.city, this.vecteur());

    const s = toScreen(p.x, p.y, 0);
    this.heros.setPosition(Math.round(s.x), Math.round(s.y));
    this.heros.setDepth(PROF(p.x, p.y));

    const cle = p.back ? 'dos' : p.flip > 0 ? 'marche_d' : 'marche_g';
    if (p.moving) { if (this.heros.anims.currentAnim?.key !== cle) this.heros.play(cle); }
    else {
      this.heros.stop();
      this.heros.setTexture(p.back ? 'h_repos_dos' : p.flip > 0 ? 'h_repos_d' : 'h_repos_g');
    }

    this.poussiere.setPosition(Math.round(s.x), Math.round(s.y));
    this.poussiere.emitting = p.moving;
  }
}
