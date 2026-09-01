// =====================================================================
//  SONAA — point d'entrée
// =====================================================================
import { City } from './world/city.js';
import { Renderer } from './game/render.js';
import { Player } from './game/player.js';
import { Game, newState } from './game/state.js';
import { Input } from './core/input.js';
import { UI } from './ui/ui.js';
import { Music } from './audio/music.js';
import { drawBuilding, drawProp, drawCube } from './world/architecture.js';
import { Life } from './world/life.js';
import { setTime, slab, poly, shade, tree, plant, shadow } from './core/art.js';
import { toScreen } from './core/iso.js';

const $ = s => document.querySelector(s);

const city = new City();
const canvas = $('#stage');
const renderer = new Renderer(canvas, city);
const music = new Music();
const life = new Life(city);
let musicWasOn = false;

let game = new Game(newState());
let player = new Player(11.5, 8.5);

const ui = new UI(game, {
  goto: id => walkTo(city.buildings.find(x => x.id === id)),
  buildings: () => city.buildings,
  music: () => music.toggle(),
  musicOn: () => music.on,
  duck: on => { if (on) { musicWasOn = music.on; music.stop(); } else if (musicWasOn) music.start(); },
  newGame: () => startGame(newState(), true),
});

let goal = null;   // bâtiment dans lequel on entrera en arrivant

function walkTo(b) {
  if (!b) return;
  if (player.goTo(b.door.x + 0.5, b.door.y + 0.5, city)) {
    goal = b;
    game.toast(`En route vers ${b.name}…`, '');
  } else {
    openBuilding(b);   // déjà sur place
  }
}

const input = new Input($('#stick'), $('#stick-knob'), canvas, renderer.cam);
input.onTap((px, py) => {
  if (ui.isOpen) return;
  const w = renderer.cam.unproject(px, py);
  // tap sur un bâtiment (ou sur sa porte) = on y va, et on entre en arrivant
  let b = city.buildingAt(w.x | 0, w.y | 0);
  if (!b) b = city.nearestDoor(w.x, w.y, 1.2);
  if (b) {
    if (Math.hypot(player.x - (b.door.x + .5), player.y - (b.door.y + .5)) < 1.4) openBuilding(b);
    else walkTo(b);
  } else {
    goal = null;
    player.goTo(w.x, w.y, city);
  }
});

// le bandeau d'objectif est cliquable : il emmène au bon endroit
$('#quest').addEventListener('click', () => {
  const t = game.quest && game.quest.step && game.quest.step.target;
  if (t) walkTo(city.buildings.find(b => b.id === t));
});

// ------------------------------------------------------------- bouton action
let nearBuilding = null;
const actionBtn = $('#btn-action'), actionLabel = $('#btn-action-label');
actionBtn.addEventListener('click', () => { if (nearBuilding) openBuilding(nearBuilding); });
$('#btn-menu').addEventListener('click', () => ui.open('menu'));
$('#btn-map').addEventListener('click', () => ui.open('map'));
$('#btn-fin').addEventListener('click', () => ui.open('finance'));

// arrivé à destination : on entre tout seul
function checkArrival() {
  if (!goal || player.path) return;
  const d = Math.hypot(player.x - (goal.door.x + .5), player.y - (goal.door.y + .5));
  const g2 = goal; goal = null;
  if (d < 1.6) openBuilding(g2);
}

function openBuilding(b) {
  if (!game.unlocked(b)) { ui.open('locked', b); return; }
  ui.open(b.kind, b);
}

// --------------------------------------------------------------- démarrage
function startGame(state, fresh) {
  game = new Game(state);
  player = new Player(11.5, 8.5);
  ui.game = game;
  game.on('toast', (m, k) => ui.toast(m, k));
  game.on('change', () => ui.hud());
  game.on('tierup', t => ui.tierUp(t));
  game.on('quest', st => { ui.toast('Objectif : ' + st.goal, 'gold'); ui.hud(); });
  game.on('end', () => ui.ending());
  ui.close();
  $('#title').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  $('#controls').classList.remove('hidden');
  ui.hud();
  // pas de musique de fond : seuls les extraits des disques se font entendre.
  // (elle reste disponible dans le menu ☰ pour qui veut la rallumer)
  music.stop();
  goal = null;
  if (fresh) {
    game.toast('Tape sur un bâtiment pour t’y rendre et y entrer.', 'gold');
    setTimeout(() => game.toast('Objectif : le Vinyl Cave, au nord-est.', 'gold'), 2200);
  }
}

const saved = Game.load();
if (saved) $('#btn-continue').classList.remove('hidden');
$('#btn-new').addEventListener('click', () => startGame(newState(), true));
$('#btn-continue').addEventListener('click', () => startGame(Game.load() || newState(), false));

// ------------------------------------------------------------------ boucle
let last = performance.now(), t = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; t += dt;

  const running = $('#title').classList.contains('hidden');
  if (running) {
    if (!ui.isOpen) {
      player.update(dt, city, input.vector());
      life.update(dt);
      game.tick(dt);
    }
    renderer.frame(game, player, t, life);

    checkArrival();

    // détection de porte
    const b = city.nearestDoor(player.x, player.y, 1.4);
    if (b !== nearBuilding) {
      nearBuilding = b;
      actionBtn.classList.toggle('hidden', !b);
      if (b) actionLabel.textContent = game.unlocked(b) ? 'Entrer — ' + b.name : 'Fermé';
    }
  } else {
    titleFrame(t);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// -------------------------------------------------------- écran d'accueil
const tCanvas = document.createElement('canvas');
$('#title-art').appendChild(tCanvas);
const tctx = tCanvas.getContext('2d');
const demoBuilding = {
  id: 'demo', name: 'Vinyl Cave', sign: 'VINYL CAVE', kind: 'records',
  x: 0.55, y: 0.5, w: 4, d: 3, door: { x: 1, y: 3 }, tier: 0,
  style: 'shop', hue: '#d97a63', roof: '#4fbf9f',
};
function titleFrame(time) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = $('#title-art').getBoundingClientRect();
  if (!r.width) return;
  if (tCanvas.width !== Math.round(r.width * dpr)) {
    tCanvas.width = Math.round(r.width * dpr);
    tCanvas.height = Math.round(r.height * dpr);
  }
  setTime(time);
  const w = tCanvas.width, h = tCanvas.height;
  tctx.setTransform(1, 0, 0, 1, 0, 0);
  tctx.clearRect(0, 0, w, h);
  const zoom = Math.min(w / (10 * 64), h / (10 * 32)) * 1.42;
  const bob = Math.sin(time * 1.1) * 5;
  tctx.setTransform(zoom, 0, 0, zoom, w / 2 + 34 * zoom, h * 0.40 + bob);

  // socle flottant 6x5
  const W = 6, D = 5, TH = 1.9;
  const P2 = (x, y, z) => toScreen(x, y, z);
  const GRASS = [[0, 3], [1, 4], [4, 0], [5, 3], [2, 4], [5, 4]];
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
    const g = GRASS.some(([gx, gy]) => gx === x && gy === y);
    const top = g ? ((x + y) % 2 ? '#96e46f' : '#8bdb64') : ((x + y) % 2 ? '#f7ecd2' : '#f1e4c4');
    drawCube(tctx, x, y, g ? 0.18 : 0, top, g ? '#b57b42' : '#dda765');
  }
  // flancs du socle
  poly(tctx, [P2(W, 0, -0.3), P2(W, D, -0.3), P2(W, D, -TH), P2(W, 0, -TH)],
    lg(tctx, P2(W, 0, -0.3), P2(W, 0, -TH), '#d99a54', '#5b3a52'));
  poly(tctx, [P2(0, D, -0.3), P2(W, D, -0.3), P2(W, D, -TH), P2(0, D, -TH)],
    lg(tctx, P2(0, D, -0.3), P2(0, D, -TH), '#c78c4c', '#4e3247'));
  const tip = P2(W, D, -TH);
  tctx.beginPath();
  tctx.moveTo(tip.x - 26, tip.y - 6); tctx.quadraticCurveTo(tip.x, tip.y + 34, tip.x + 26, tip.y - 6);
  tctx.closePath(); tctx.fillStyle = '#5b3a52'; tctx.fill();

  drawProp(tctx, { type: 'crates', x: 5.3, y: 0.7 }, { t: time, night: false });
  drawBuilding(tctx, demoBuilding, { t: time, night: false, unlocked: true });
  tree(tctx, 5.3, 3.1, 0, 0.9, 1.4);
  plant(tctx, 0.7, 4.3, 0, 0.85, '#9b6bd6', '#e08a72', 2.2);
  drawProp(tctx, { type: 'bench', x: 2.6, y: 4.4 }, { t: time, night: false });
}
function lg(ctx, a, b, c0, c1) {
  const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  return g;
}

// poignée de debug
window.__sonaa = {
  get game() { return game; }, get player() { return player; },
  ui, city, renderer, music, input, life,
  // pas de simulation manuel (utile pour les tests hors rAF)
  step(dt = 1 / 60, n = 1) {
    for (let i = 0; i < n; i++) {
      player.update(dt, city, { x: 0, y: 0 });
      life.update(dt);
      game.tick(dt);
      checkArrival();
    }
  },
  tapWorld(wx, wy) { input.fireTap(...screenOf(wx, wy)); },
};
function screenOf(wx, wy) {
  const cam = renderer.cam;
  const o = { x: (cam.x - cam.y) * 32, y: (cam.x + cam.y) * 16 };
  const p = { x: (wx - wy) * 32, y: (wx + wy) * 16 };
  return [(p.x - o.x) * cam.zoom + cam.w / 2, (p.y - o.y) * cam.zoom + cam.h / 2];
}

// pause de la musique quand l'onglet est caché
document.addEventListener('visibilitychange', () => {
  if (document.hidden && music.on) music.stop();
});
window.addEventListener('beforeunload', () => { if (game) game.save(); });
