// =====================================================================
//  SONAA · point d'entrée
// =====================================================================
import { City, START } from './world/city.js';
import { passantProche } from './world/life.js';
import { Renderer } from './game/render.js';
import { Player } from './game/player.js';
import { Game, newState } from './game/state.js';
import { Input } from './core/input.js';
import { UI } from './ui/ui.js';
import { Music } from './audio/music.js';
import { drawBuilding, drawProp } from './world/architecture.js';
import { Life } from './world/life.js';
import { setTime, setLight, poly, shade, tree, bush, rock, px } from './core/art.js';
import { toScreen } from './core/iso.js';

const $ = s => document.querySelector(s);

const city = new City();
const canvas = $('#stage');
const renderer = new Renderer(canvas, city);
const music = new Music();
const life = new Life(city);
let musicWasOn = false;

let game = new Game(newState());
let player = new Player(START.x, START.y);

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

const input = new Input($('#stick'), $('#stick-knob'), canvas, renderer);
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
let nearPnj = null;          // le passant a portee de voix
const actionBtn = $('#btn-action'), actionLabel = $('#btn-action-label');

// Le bouton fait la chose la plus proche : parler a quelqu'un passe avant
// d'entrer quelque part, parce qu'on le croise en chemin.
function agir() {
  if (nearPnj) { ui.ouvrirDialogue(nearPnj.identite); return; }
  if (nearBuilding) openBuilding(nearBuilding);
}
actionBtn.addEventListener('click', agir);

// la barre espace fait la meme chose au clavier
window.addEventListener('keydown', e => {
  if (e.code !== 'Space' && e.key !== ' ') return;
  const cible = e.target;
  if (cible && /^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(cible.tagName)) return;
  e.preventDefault();
  if (ui.isOpen) return;
  agir();
});
$('#btn-menu').addEventListener('click', () => ui.open('menu'));
$('#btn-map').addEventListener('click', () => ui.open('map'));
$('#btn-fin').addEventListener('click', () => ui.open('finance'));
$('#needs').addEventListener('click', () => ui.open('etat'));
$('#btn-scene').addEventListener('click', () => ui.open('scene'));

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
  player = new Player(START.x, START.y);
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
    setTimeout(() => game.toast('Chaque batiment porte son nom sur son enseigne.', 'gold'), 2200);
  }
}

/* LA DATE DE LA COPIE QUI TOURNE. Voir le commentaire dans index.html : elle
   vient de l'en-tete du fichier lui-meme, jamais d'une constante a tenir a
   jour. Si la requete echoue, on n'ecrit rien : une date fausse serait pire
   que pas de date. */
(async () => {
  try {
    /* LE CACHE PAR DEFAUT, SURTOUT PAS `no-store`, et c'est tout l'interet.

       `no-store` irait demander la date au serveur. Elle serait donc
       toujours celle du dernier deploiement, y compris pendant qu'on joue
       une copie vieille de deux jours servie par un cache : l'indicateur
       dirait exactement le contraire de ce qu'on lui demande. Avec les
       regles normales, la reponse vient d'ou vient le module lui-meme,
       cache HTTP ou service worker compris, et sa date est celle de la copie
       qui tourne. C'est cette date-la qui sert a quelque chose. */
    const r = await fetch('src/main.js', { method: 'HEAD' });
    const lm = r.headers.get('last-modified');
    if (!lm) return;
    const d = new Date(lm);
    if (isNaN(d)) return;
    const sous = $('.logo-sub');
    if (!sous) return;
    const el = document.createElement('div');
    el.className = 'logo-ver';
    el.id = 'version';
    el.textContent = 'version du ' + d.toLocaleString('fr-CA', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
    sous.insertAdjacentElement('afterend', el);
  } catch (e) { /* hors ligne : l'ecran titre se passe tres bien de la date */ }
})();

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

    // quelqu'un a portee de voix ?
    const p = passantProche(life, player.x, player.y, 1.5);
    if (p !== nearPnj) {
      nearPnj = p;
      if (p) {
        actionBtn.classList.remove('hidden');
        actionLabel.textContent = 'Parler · ' + p.identite.nom;
      }
    }

    // détection de porte
    const b = city.nearestDoor(player.x, player.y, 1.4);
    if (b !== nearBuilding) {
      nearBuilding = b;
      actionBtn.classList.toggle('hidden', !b && !nearPnj);
      if (b && !nearPnj) actionLabel.textContent = game.unlocked(b) ? 'Entrer · ' + b.name : 'Fermé';
    }
  } else {
    titleFrame(t);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// -------------------------------------------------------- écran d'accueil
// Meme principe que le jeu : on dessine petit, puis on agrandit au pixel pres.
const tCanvas = document.createElement('canvas');
$('#title-art').appendChild(tCanvas);
const tctx = tCanvas.getContext('2d');
const tBuf = document.createElement('canvas');
const tbc = tBuf.getContext('2d');
const demoHut = {
  /* PAS D'ENSEIGNE ICI. Le diorama du titre est une composition, pas une
     rue : le cageot du premier plan passe devant le panneau et en mange le
     milieu. Les enseignes servent a se reperer dans la clairiere ; sur
     l'ecran titre il n'y a nulle part ou aller. */
  id: 'demo', name: 'Bunker Techno', sign: null, kind: 'records',
  x: 1.6, y: 1.2, w: 2, d: 2, door: { x: 1, y: 3 }, tier: 0,
  hut: true, roof: '#4a5b8c', wall: '#c98c4e',
};

function titleFrame(time) {
  const r = $('#title-art').getBoundingClientRect();
  if (!r.width) return;
  const k = 3;
  const bw = Math.round(r.width / k), bh = Math.round(r.height / k);
  if (tBuf.width !== bw) { tBuf.width = bw; tBuf.height = bh; }
  if (tCanvas.width !== bw * k) { tCanvas.width = bw * k; tCanvas.height = bh * k; }
  setTime(time);
  setLight(13);

  tbc.setTransform(1, 0, 0, 1, 0, 0);
  tbc.clearRect(0, 0, bw, bh);
  const bob = Math.round(Math.sin(time * 1.1) * 2);
  tbc.setTransform(1, 0, 0, 1, Math.round(bw / 2), Math.round(bh * 0.34) + bob);

  // petit ilot 5x4
  const W = 5, D = 4, TH = 26;
  const P2 = (x, y, z) => toScreen(x, y, z);
  const GRASS_TOP = ['#4e8f35', '#5a9e3e', '#6aad48'];
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
    const c = GRASS_TOP[(x * 3 + y * 5) % 3];
    poly(tbc, [P2(x, y, 0), P2(x + 1, y, 0), P2(x + 1, y + 1, 0), P2(x, y + 1, 0)], c);
  }
  // flancs de terre
  for (let y = 0; y < D; y++) {
    const a = P2(W, y, 0), b = P2(W, y + 1, 0);
    poly(tbc, [a, b, { x: b.x, y: b.y + TH }, { x: a.x, y: a.y + TH }], '#a3814f');
    poly(tbc, [a, b, { x: b.x, y: b.y + 3 }, { x: a.x, y: a.y + 3 }], '#7a5f39');
  }
  for (let x = 0; x < W; x++) {
    const a = P2(x, D, 0), b = P2(x + 1, D, 0);
    poly(tbc, [a, b, { x: b.x, y: b.y + TH }, { x: a.x, y: a.y + TH }], '#8f7044');
    poly(tbc, [a, b, { x: b.x, y: b.y + 3 }, { x: a.x, y: a.y + 3 }], '#6b5232');
  }
  const tip = P2(W, D, 0);
  tbc.fillStyle = '#5c4630';
  tbc.beginPath();
  tbc.moveTo(tip.x - 14, tip.y + TH - 4);
  tbc.lineTo(tip.x, tip.y + TH + 12);
  tbc.lineTo(tip.x + 14, tip.y + TH - 4);
  tbc.closePath(); tbc.fill();

  drawBuilding(tbc, demoHut, { t: time, night: false, unlocked: true });
  tree(tbc, 4.3, 1.4, 0, 0.95, 1.4);
  bush(tbc, 0.6, 3.3, 0, 0.9, 2.2);
  rock(tbc, 4.4, 3.4, 0, 0.8, 3.1);
  drawProp(tbc, { type: 'crates', x: 0.7, y: 1.5, z: 0 }, { t: time, night: false });

  tctx.setTransform(1, 0, 0, 1, 0, 0);
  tctx.imageSmoothingEnabled = false;
  tctx.clearRect(0, 0, tCanvas.width, tCanvas.height);
  tctx.drawImage(tBuf, 0, 0, bw * k, bh * k);
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
// monde -> pixel CSS, l'inverse exact de cam.unproject (utile pour les tests)
function screenOf(wx, wy) {
  const cam = renderer.cam;
  const o = toScreen(cam.x, cam.y, 0);
  const p = toScreen(wx, wy, 0);
  return [
    (p.x - o.x + cam.w / 2) * cam.k,
    (p.y - o.y + cam.h / 2) * cam.k,
  ];
}

// pause de la musique quand l'onglet est caché
document.addEventListener('visibilitychange', () => {
  if (document.hidden && music.on) music.stop();
});
window.addEventListener('beforeunload', () => { if (game) game.save(); });
