/* VÉRIFICATION VISUELLE PAR LA MACHINE (ADR-048).

   Principe : quand on ne peut pas voir, on MESURE. Quatre contrôles :

   1. MATITÉ DES ÉTEINTS : deux sphères côte à côte dans un canvas de test,
      mêmes couleur et lumière, aExtinct 0 et 1. Lecture des pixels,
      comparaison de saturation et de luminosité aux valeurs du shader :
      -42 % de saturation, -16 % de luminosité. Échec si l'écart est nul
      ou hors tolérance.
   2. RESPIRATION, SURVOL, FLUX : le rayon d'une sphère échantillonné sur
      60 images (amplitude attendue ±2 %) ; le rayon avant et après survol
      simulé (+8 %) ; la luminosité le long d'un lien à deux instants, le
      maximum doit s'être déplacé vers l'enfant.
   3. INTRO : le nombre de sphères visibles à 1, 3 et 5 secondes doit
      croître, sinon la progressivité n'existe pas.
   4. RECOUVREMENT SOUS ROTATION : 12 azimuts x 3 distances en 3D libre,
      les boîtes réelles des labels sont mesurées à chaque pose, le pire
      cas est rendu.

   S'exécute dans le navigateur (l'app ouverte avec ?verify), résultats en
   JSON à l'écran et dans la console. Pas en CI : il faudrait embarquer un
   navigateur headless, décision documentée dans l'ADR. */

import {
  InstancedBufferAttribute,
  BufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three';

import { sphereFrag, sphereVert } from './shaders.ts';

interface AtlasHooks {
  sphereRadius: (i: number) => number;
  sphereBase: (i: number) => number;
  setHovered: (i: number) => void;
  visibleCount: () => number;
  reducedMotion: boolean;
  playIntro: (onEnd?: () => void) => void;
  setOrbit?: (az: number, el: number, dist: number) => void;
  recenter?: () => void;
  framing: () => { atlasDistance: number };
  labelSnapshot?: () => {
    key: string;
    text: string;
    sx: number;
    sy: number;
    w: number;
    h: number;
  }[];
}

const atlas = (): AtlasHooks => (window as unknown as { __atlas: AtlasHooks }).__atlas;

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const frames = (n: number): Promise<void> =>
  new Promise((resolve) => {
    let left = n;
    const tick = (): void => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

// ------------------------------------------------- 1. matité des éteints

interface MatiteResult {
  saturationDeltaPct: number;
  luminositeDeltaPct: number;
  attendu: { saturation: number; luminosite: number };
  verdict: 'ok' | 'echec';
}

const testMatite = (): MatiteResult => {
  const W = 256;
  const H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const renderer = new WebGLRenderer({ canvas, preserveDrawingBuffer: true, alpha: false });
  renderer.setSize(W, H, false);
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, W / H, 0.5, 100);
  camera.position.set(0, 0, 14);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  const quad = new PlaneGeometry(1, 1);
  const geo = new InstancedBufferGeometry();
  geo.setAttribute('position', quad.getAttribute('position') as BufferAttribute);
  geo.setAttribute('uv', quad.getAttribute('uv') as BufferAttribute);
  const idx = quad.getIndex();
  if (idx) geo.setIndex(idx);
  geo.instanceCount = 2;
  geo.setAttribute('aCenter', new InstancedBufferAttribute(new Float32Array([-3.2, 0, 0, 3.2, 0, 0]), 3));
  geo.setAttribute('aRadius', new InstancedBufferAttribute(new Float32Array([2.4, 2.4]), 1));
  geo.setAttribute(
    'aColor',
    new InstancedBufferAttribute(new Float32Array([0.82, 0.32, 0.36, 0.82, 0.32, 0.36]), 3)
  );
  geo.setAttribute(
    'aState',
    new InstancedBufferAttribute(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0]), 4)
  );
  geo.setAttribute('aExtinct', new InstancedBufferAttribute(new Float32Array([0, 1]), 1));

  const material = new ShaderMaterial({
    vertexShader: sphereVert,
    fragmentShader: sphereFrag,
    uniforms: {
      uCameraPos: { value: camera.position },
      uLightDir: { value: new Vector3(0.42, 0.72, 0.55).normalize() },
      uPixelScale: { value: (2 * Math.tan((40 * Math.PI) / 360)) / H },
      uFog: { value: new Vector2(1e5, 2e5) },
      uFogColor: { value: new Vector3(0, 0, 0) }
    },
    transparent: true
  });
  const mesh = new Mesh(geo, material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  renderer.render(scene, camera);

  const gl = renderer.getContext();
  const px = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);

  /* Moyennes sur le corps de chaque sphère : moitié gauche = vivante,
     moitié droite = éteinte, pixels non noirs seulement. */
  const stats = (x0: number, x1: number): { sat: number; lum: number } => {
    let sat = 0;
    let lum = 0;
    let n = 0;
    for (let y = 0; y < H; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const o = (y * W + x) * 4;
        const r = (px[o] ?? 0) / 255;
        const g = (px[o + 1] ?? 0) / 255;
        const b = (px[o + 2] ?? 0) / 255;
        if (r + g + b < 0.06) continue;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        sat += max > 0 ? (max - min) / max : 0;
        lum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        n += 1;
      }
    }
    return n > 0 ? { sat: sat / n, lum: lum / n } : { sat: 0, lum: 0 };
  };
  const alive = stats(0, W / 2);
  const extinct = stats(W / 2, W);
  renderer.dispose();

  const satDelta = alive.sat > 0 ? ((extinct.sat - alive.sat) / alive.sat) * 100 : 0;
  const lumDelta = alive.lum > 0 ? ((extinct.lum - alive.lum) / alive.lum) * 100 : 0;
  const ok =
    Math.abs(satDelta) > 3 &&
    Math.abs(lumDelta) > 3 &&
    Math.abs(satDelta - -42) <= 15 &&
    Math.abs(lumDelta - -16) <= 10;
  return {
    saturationDeltaPct: Math.round(satDelta * 10) / 10,
    luminositeDeltaPct: Math.round(lumDelta * 10) / 10,
    attendu: { saturation: -42, luminosite: -16 },
    verdict: ok ? 'ok' : 'echec'
  };
};

/* LA RESPIRATION ET LE FLUX NE SONT PLUS TESTES : ILS N'EXISTENT PLUS.

   ADR-065 les a supprimes, mesures a l'appui : ils etaient la cause du
   scintillement. Les tests, eux, sont restes en place et attendaient une
   amplitude de 2 % et une bande lumineuse qui se deplace. Ils rendaient donc
   « echec » sur deux comportements qu'on a retires expres.

   Un controle qui accuse une decision prise n'est pas un controle, c'est du
   bruit qui apprend a ignorer les alertes. Ils partent.

   ------------------------------------------------- 2. survol (moteur vivant) */

interface SurvolResult {
  gainPct: number;
  attenduPct: number;
  verdict: 'ok' | 'echec' | 'coupe par prefers-reduced-motion';
}

const testSurvol = async (): Promise<SurvolResult> => {
  const a = atlas();
  if (a.reducedMotion) return { gainPct: 0, attenduPct: 8, verdict: 'coupe par prefers-reduced-motion' };
  const i = 0;
  a.setHovered(-1);
  await wait(700);
  let before = 0;
  for (let f = 0; f < 20; f += 1) {
    await frames(2);
    before += a.sphereRadius(i);
  }
  before /= 20;
  a.setHovered(i);
  await wait(700);
  let after = 0;
  for (let f = 0; f < 20; f += 1) {
    await frames(2);
    after += a.sphereRadius(i);
  }
  after /= 20;
  a.setHovered(-1);
  const gain = ((after - before) / before) * 100;
  const ok = gain > 3 && Math.abs(gain - 8) <= 4;
  return { gainPct: Math.round(gain * 100) / 100, attenduPct: 8, verdict: ok ? 'ok' : 'echec' };
};

// --------------------------------------------------------- 3. intro

interface IntroResult {
  a1s: number;
  a3s: number;
  a5s: number;
  verdict: 'ok' | 'echec' | 'coupe par prefers-reduced-motion';
}

const testIntro = async (): Promise<IntroResult> => {
  const a = atlas();
  if (a.reducedMotion) return { a1s: 0, a3s: 0, a5s: 0, verdict: 'coupe par prefers-reduced-motion' };
  a.playIntro();
  await wait(1000);
  const a1s = a.visibleCount();
  await wait(2000);
  const a3s = a.visibleCount();
  await wait(2000);
  const a5s = a.visibleCount();
  const ok = a1s < a3s && a3s < a5s;
  return { a1s, a3s, a5s, verdict: ok ? 'ok' : 'echec' };
};

// -------------------------------------- 4. recouvrement sous rotation

interface RecouvrementResult {
  poses: number;
  pireCas: { azimutDeg: number; distance: number; paires: number; pirePx: number };
  verdict: 'ok' | 'echec' | 'setOrbit indisponible (vue sans moteur ?)';
}

const measureOverlaps = (): { paires: number; pirePx: number } => {
  const els = [...document.querySelectorAll('.atlas-label')].filter((e) => {
    const r = e.getBoundingClientRect();
    if (r.left <= -500 || Number(getComputedStyle(e).opacity) <= 0.05) return false;
    /* LES NOMS FLOUS NE COMPTENT PAS. La regle « deux noms ne se recouvrent
       jamais » protege la LISIBILITE. Un nom d'arriere-plan est illisible par
       construction, c'est le but ; l'exempter de l'arbitrage etait une
       decision (ADR-069), et ce controle le comptait pourtant en faute. Un
       controle qui accuse une decision prise n'est pas un controle. */
    return (e as HTMLElement).dataset['flou'] !== '1';
  });
  const boxes = els.map((e) => e.getBoundingClientRect());
  let paires = 0;
  let pire = 0;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (!a || !b) continue;
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 3 && oy > 3) {
        paires += 1;
        pire = Math.max(pire, Math.min(ox, oy));
      }
    }
  }
  return { paires, pirePx: Math.round(pire) };
};

const testRecouvrement = async (): Promise<RecouvrementResult> => {
  const a = atlas();

  /* CE TEST PORTE SUR LA VUE D'ENSEMBLE, et il faut l'y ramener.

     Le pilote entre dans un genre par un vrai clic avant de lancer la suite,
     pour que le test de focus trouve un mode armé. Celui-ci se retrouvait donc
     à faire tourner l'orbite DANS le mode focus, où la couronne est posée une
     fois pour toutes dans le plan de la caméra d'entrée : la faire pivoter
     l'aplatit en ligne, et les noms se superposent forcément. Il rendait
     « echec » sur une situation que sa règle ne décrit pas.

     On revient donc à la vue d'ensemble avant de mesurer. C'est un préalable
     de mise en place, pas la chose testée. */
  a.recenter?.();
  await wait(1200);

  if (!a.setOrbit) {
    return {
      poses: 0,
      pireCas: { azimutDeg: 0, distance: 0, paires: 0, pirePx: 0 },
      verdict: 'setOrbit indisponible (vue sans moteur ?)'
    };
  }
  const ad = a.framing().atlasDistance;
  const distances = [ad, ad * 0.5, ad * 0.25];
  let worst = { azimutDeg: 0, distance: 0, paires: 0, pirePx: 0 };
  let poses = 0;
  for (const dist of distances) {
    for (let az = 0; az < 360; az += 30) {
      a.setOrbit(az, 11, dist);
      /* 700 ms : les centres de familles convergent en douceur après un
         saut d'orbite, et la passe de labels arbitre sur des positions
         encore mouvantes. On mesure le RÉGIME ÉTABLI ; pendant le
         mouvement, une morsure transitoire reste bornée par la dérive
         entre deux passes (33 ms), c'est documenté. */
      await wait(700);
      const m = measureOverlaps();
      poses += 1;
      if (m.paires > worst.paires || (m.paires === worst.paires && m.pirePx > worst.pirePx)) {
        worst = { azimutDeg: az, distance: Math.round(dist), paires: m.paires, pirePx: m.pirePx };
      }
    }
  }
  return { poses, pireCas: worst, verdict: worst.paires === 0 ? 'ok' : 'echec' };
};

// -------------------------------------- 5. fidélité des boîtes de labels

/* Le bug des 12 px à 426 px venait d'un décalage CSS que l'arbitrage
   ignorait : la boîte TESTÉE n'était pas la boîte RENDUE. Ce contrôle
   confronte chaque boîte de la dernière passe de placement (crochet
   labelSnapshot des deux moteurs 3D) à la boîte DOM affichée. La position
   doit correspondre au pixel près (hystérésis de rendu : 1 px), et
   l'estimation de taille doit MAJORER la réalité, jamais la sous-estimer.
   La vue Colonnes n'a pas de passe de placement : ses noms
   sont en flux de document, le recouvrement y est impossible par
   construction. */

interface BoitesResult {
  labels: number;
  pireEcartPx: number;
  sousEstimes: number;
  pire: string;
  verdict: 'ok' | 'echec' | 'labelSnapshot indisponible (vue DOM ?)';
}

/* L'ORIGINE DU CANVAS N'EST PLUS CELLE DE LA FENETRE.

   QUATRIEME FAUTE D'INSTRUMENT DE LA SEMAINE, et la plus instructive : elle
   n'a rien casse, elle a seulement commence a MENTIR le jour ou une hypothese
   silencieuse a cesse d'etre vraie.

   Les tests lisent les noms avec getBoundingClientRect, donc en coordonnees
   FENETRE, et les comparent aux dimensions du CANVAS. Tant que le canvas
   remplissait l'ecran, les deux systemes coincidaient et personne ne pouvait
   voir qu'il y en avait deux. Depuis que le canvas mobile commence sous le fil
   d'Ariane et s'arrete au-dessus de la feuille du lecteur, ils different de
   cinquante-quatre pixels en haut et de plusieurs centaines en bas : un nom
   parfaitement place se met alors a « sortir du cadre » aux yeux du test.

   C'est exactement ce qui a fait passer la suite de sept a douze echecs. Les
   cinq nouveaux sont a 390 et 700 px, c'est-a-dire sous le seuil ou le canvas
   est decale, et il n'y en a AUCUN a 1024 px, ou il ne l'est pas. Le produit
   n'a rien perdu, l'instrument a cesse d'etre valide.

   On ramene donc les rectangles DOM dans le repere du canvas. */
const repereCanvas = (): { x: number; y: number } => {
  const c = document.querySelector('canvas.atlas-canvas') ?? document.querySelector('canvas');
  if (!c) return { x: 0, y: 0 };
  const r = c.getBoundingClientRect();
  return { x: r.left, y: r.top };
};

const testBoites = async (): Promise<BoitesResult> => {
  const a = atlas();
  if (!a.labelSnapshot) {
    return {
      labels: 0,
      pireEcartPx: 0,
      sousEstimes: 0,
      pire: '',
      verdict: 'labelSnapshot indisponible (vue DOM ?)'
    };
  }
  await wait(900);
  const snap = a.labelSnapshot();
  const origineB = repereCanvas();
  let labels = 0;
  let pireEcart = 0;
  let sousEstimes = 0;
  let pire = '';
  for (const el of document.querySelectorAll('.atlas-label')) {
    const r = el.getBoundingClientRect();
    if (r.left <= -500 || Number(getComputedStyle(el).opacity) <= 0.05) continue;
    /* Un genre fondateur porte le même nom que sa famille (Disco, Techno…) :
       deux entrées du snapshot partagent alors le texte. On apparie chaque
       label DOM à l'entrée LA PLUS PROCHE parmi les homonymes, sinon le
       test compare le genre à la boîte de la famille et invente un écart. */
    const candidats = snap.filter((s) => s.text === (el.textContent ?? ''));
    if (candidats.length === 0) continue;
    let best = candidats[0];
    let bestEcart = Infinity;
    for (const s of candidats) {
      /* MEME REPERE DES DEUX COTES. L'instantane du moteur est en coordonnees
         CANVAS, le rectangle DOM en coordonnees FENETRE. Ils coincidaient tant
         que le canvas remplissait l'ecran. */
      const ecart = Math.max(
        Math.abs(r.left - origineB.x - s.sx),
        Math.abs(r.top - origineB.y - s.sy)
      );
      if (ecart < bestEcart) {
        bestEcart = ecart;
        best = s;
      }
    }
    if (!best) continue;
    labels += 1;
    if (bestEcart > pireEcart) {
      pireEcart = bestEcart;
      pire = best.text;
    }
    if (r.width > best.w + 1 || r.height > best.h + 1) sousEstimes += 1;
  }
  return {
    labels,
    pireEcartPx: Math.round(pireEcart * 10) / 10,
    sousEstimes,
    pire,
    verdict: labels > 0 && pireEcart <= 1.5 && sousEstimes === 0 ? 'ok' : 'echec'
  };
};

// ----------------------------------------------- 6. mode focus (ADR-072)

/* CE QUE CE TEST VERIFIE, et pourquoi il ne peut pas s'armer tout seul.

   Le mode focus doit etre DEJA actif quand ce test tourne : c'est le pilote
   qui l'arme, par un VRAI clic sur la carte. Regle 3 des quatre regles de
   verification, en tete de HANDOFF.md : piloter l'application par ses
   fonctions internes ne prouve rien sur ce que vit quelqu'un, et c'est
   exactement ainsi que le defaut « le flou ne s'applique pas depuis la vue
   d'ensemble » a traverse toutes les verifications precedentes.

   Sans focus arme, le test rend « non arme » et non « ok » : un test qui
   passe parce qu'il n'a rien trouve a tester est un mensonge. */

interface FocusResult {
  zone: number;
  ecartMinPx: number | null;
  flouMin: number;
  netsHorsZone: number;
  nomsSurSphereNette: number;
  /* Distance maximale entre un nom et le BORD de la sphère qu'il désigne.
     Au-delà de 40 px, on ne fait plus le rapprochement : le nom paraît
     flotter dans le vide, et sur une capture il a même été attribué à la
     sphère d'un autre noeud. */
  nomLoinDeSaSpherePx: number;
  nomLePlusLoin: string;
  detailNoms: string[];
  ciblesHorsZone: number;
  verdict: 'ok' | 'echec' | 'non arme, aucun genre ouvert';
}

const testFocus = (): FocusResult => {
  const a = atlas() as unknown as {
    zoneFocus?: () => {
      actif: boolean;
      cibles: number;
      ecartMinPx: number | null;
      membres: { slot: number; label: string; x: number; y: number; rayonPx: number }[];
      flouHorsZone: { min: number; max: number };
      horsZonePasEncoreFloues: number;
    };
    cibleSous?: (x: number, y: number) => { sphere: string | null; dansLaZone: boolean | null };
    info?: () => { size: [number, number] };
  };
  const vide: FocusResult = {
    zone: 0,
    ecartMinPx: null,
    flouMin: 0,
    netsHorsZone: 0,
    nomsSurSphereNette: 0,
    nomLoinDeSaSpherePx: 0,
    nomLePlusLoin: '',
    detailNoms: [],
    ciblesHorsZone: 0,
    verdict: 'non arme, aucun genre ouvert'
  };
  if (!a.zoneFocus || !a.cibleSous || !a.info) return vide;
  const z = a.zoneFocus();
  if (!z.actif) return vide;

  /* Aucun nom pose sur la sphere D'UN AUTRE : c'est le defaut signale, des
     noms ecrits en travers de la sphere ouverte.

     SA PROPRE SPHERE NE COMPTE PAS, et c'est une correction de ce controle,
     pas du produit : le nom du genre ouvert est pose SUR sa sphere par
     construction, le shader assombrit meme la zone du texte pour qu'il tienne
     (voir sphereFrag, uniforme labelled). Le premier jet comptait « Disco sur
     Disco » comme une faute aux quatre largeurs. Un controle qui accuse un
     comportement voulu apprend a ignorer les alertes. */
  let nomsSurSphereNette = 0;
  const detailNoms: string[] = [];
  for (const el of document.querySelectorAll('.atlas-label')) {
    const r = el.getBoundingClientRect();
    if (r.left <= -500 || Number(getComputedStyle(el).opacity) <= 0.05) continue;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    for (const m of z.membres) {
      if (m.label === (el.textContent ?? '')) continue; // son propre nom
      if (Math.hypot(cx - m.x, cy - m.y) < m.rayonPx) {
        nomsSurSphereNette += 1;
        detailNoms.push(
          `${el.textContent ?? ''} [${(el as HTMLElement).dataset['flou'] === '1' ? 'flou' : 'net'}] sur ${m.label}`
        );
        break;
      }
    }
  }

  /* CHAQUE NOM RESTE PRÈS DE SA SPHÈRE. On compare le nom au membre de la
     zone qui PORTE ce nom, jamais au plus proche : c'est exactement l'erreur
     qu'on cherche, un nom posé à côté de la sphère d'un autre. */
  let nomLoinDeSaSpherePx = 0;
  let nomLePlusLoin = '';
  for (const el of document.querySelectorAll('.atlas-label')) {
    const r = el.getBoundingClientRect();
    if (r.left <= -500 || Number(getComputedStyle(el).opacity) <= 0.05) continue;
    if ((el as HTMLElement).dataset['flou'] === '1') continue;
    /* APPARIEMENT PAR IDENTITE, jamais par texte. Le corpus contient des
       homonymes, et un controle voisin s'y etait deja fait prendre : il
       comparait alors un genre a la boite d'un AUTRE et inventait un ecart. */
    const slot = Number((el as HTMLElement).dataset['slot'] ?? -1);
    const sien = z.membres.find((m) => m.slot === slot);
    if (!sien) continue;
    /* LA DISTANCE SE MESURE DU BORD DE LA SPHERE AU POINT LE PLUS PROCHE DE
       LA BOITE, jamais a son centre.

       Mesurer au centre penalise la LONGUEUR du nom : « Indie Dance » a
       dix-neuf pixels fait cent pixels de large, son centre est donc a
       cinquante pixels de son bord gauche, et le controle comptait cinquante
       pixels d'eloignement pour un nom parfaitement colle a sa sphere. Ce
       n'est pas ce que l'oeil fait : il rattache un nom a un objet quand leur
       BORDS se touchent, quelle que soit la longueur du mot.

       Premiere version, au centre : 53, 51, 59 et 64 px. Meme placement,
       mesure au bord : voir ci-dessous. */
    const px2 = Math.max(r.left, Math.min(sien.x, r.right));
    const py2 = Math.max(r.top, Math.min(sien.y, r.bottom));
    const auBord = Math.max(0, Math.hypot(px2 - sien.x, py2 - sien.y) - sien.rayonPx);
    if (auBord > nomLoinDeSaSpherePx) {
      nomLoinDeSaSpherePx = Math.round(auBord);
      nomLePlusLoin = `${el.textContent ?? ''} a ${Math.round(auBord)} px de sa sphere`;
    }
  }

  /* Aucune cible cliquable hors zone : on sonde la carte en grille plutot
     que de faire confiance a la lecture du code. */
  const [w, h] = a.info().size;
  let ciblesHorsZone = 0;
  for (let x = 10; x < w; x += 16) {
    for (let y = 10; y < h; y += 16) {
      const c = a.cibleSous(x, y);
      if (c.sphere !== null && c.dansLaZone !== true) ciblesHorsZone += 1;
    }
  }

  const ok =
    z.cibles > 0 &&
    z.flouHorsZone.min > 0.9 &&
    z.horsZonePasEncoreFloues === 0 &&
    nomsSurSphereNette === 0 &&
    nomLoinDeSaSpherePx <= 40 &&
    ciblesHorsZone === 0 &&
    (z.ecartMinPx === null || z.ecartMinPx >= 44);

  return {
    zone: z.cibles,
    ecartMinPx: z.ecartMinPx,
    flouMin: z.flouHorsZone.min,
    netsHorsZone: z.horsZonePasEncoreFloues,
    nomsSurSphereNette,
    nomLoinDeSaSpherePx,
    nomLePlusLoin,
    detailNoms,
    ciblesHorsZone,
    verdict: ok ? 'ok' : 'echec'
  };
};

// ------------------ 7. la camera ne bouge pas sur un clic de selection

/* GARDE-FOU : SELECTIONNER N'EST PAS CADRER.

   Deux fois, la carte s'est deplacee a chaque clic sur un derive. La cause
   etait un suivi continu, invisible a la lecture, et il a fallu six tours pour
   la trouver. Ce controle la rend impossible a reintroduire sans qu'on le
   sache : on releve la camera, on clique un membre de la zone, on la releve a
   nouveau. Les trois valeurs doivent etre identiques.

   Le controle statique check:camera attrape le motif dans le code ; celui-ci
   attrape son EFFET, quelle que soit la forme qu'il prendrait. Les deux sont
   utiles : l'un ne remplace pas l'autre. */

interface CameraResult {
  clics: number;
  deplacements: number;
  detail: string[];
  verdict: 'ok' | 'echec' | 'non arme, aucun genre ouvert';
}

const testCameraFixe = async (): Promise<CameraResult> => {
  const a = atlas() as unknown as {
    zoneFocus?: () => { actif: boolean; membres: { label: string; x: number; y: number }[] };
    framing: () => { azimuth: number; elevation: number; distance: number };
  };
  const vide: CameraResult = { clics: 0, deplacements: 0, detail: [], verdict: 'non arme, aucun genre ouvert' };
  if (!a.zoneFocus) return vide;
  const z = a.zoneFocus();
  if (!z.actif || z.membres.length < 2) return vide;

  const canvas = document.querySelector('canvas.atlas-canvas');
  if (!canvas) return vide;

  const releve = (): string => {
    const f = a.framing();
    return `${f.azimuth.toFixed(4)}|${f.elevation.toFixed(4)}|${f.distance.toFixed(2)}`;
  };

  let deplacements = 0;
  const detail: string[] = [];
  let clics = 0;

  /* Trois membres suffisent : si un suivi continu existe, il se voit des le
     premier clic. On evite d'en faire quinze pour ne pas allonger la suite. */
  /* LES DERIVES SEULEMENT, JAMAIS LA RACINE. Cliquer la racine peut
     legitimement rouvrir la zone, donc refaire le cadrage, donc deplacer la
     camera : ce n'est pas une selection, c'est une entree. Le controle
     accusait le produit sur un geste qui a le droit de bouger la vue. */
  const derives = z.membres.filter((m) => (m as { generation?: number }).generation !== 0);
  for (const m of derives.slice(0, 3)) {
    const avant = releve();
    const commun = { bubbles: true, clientX: m.x, clientY: m.y, pointerId: 1, isPrimary: true };
    canvas.dispatchEvent(new PointerEvent('pointerdown', commun));
    canvas.dispatchEvent(new PointerEvent('pointerup', commun));
    clics += 1;
    await wait(1400);
    const apres = releve();
    if (avant !== apres) {
      deplacements += 1;
      detail.push(`${m.label} : ${avant} devient ${apres}`);
    }
  }

  return { clics, deplacements, detail, verdict: deplacements === 0 ? 'ok' : 'echec' };
};

// ------------------ 8. rien ne sort du cadre

/* GARDE-FOU : AUCUN NOEUD VISIBLE NI SON NOM NE SORT DU VIEWPORT.

   L'arbre debordait par le bas et par la droite, et le cadrage ne s'en
   apercevait pas : il ne comparait que des TAILLES, jamais des POSITIONS. Un
   groupe plus petit que la place disponible en deborde parfaitement s'il est
   pose de travers.

   LES DIMENSIONS VIENNENT DU MOTEUR, jamais du DOM ni de devicePixelRatio :
   c'est celui qui produit les positions qui publie l'unite dans laquelle elles
   vivent. Une dimension recalculee ailleurs est une seconde source de verite,
   donc une occasion de divergence, et elle a deja rendu 672 la ou le canvas
   fait 896. */

interface CadreResult {
  membres: number;
  debordementPx: number;
  pires: string[];
  verdict: 'ok' | 'echec' | 'non arme, aucun genre ouvert';
}

const testCadre = (): CadreResult => {
  const a = atlas() as unknown as {
    zoneFocus?: () => { actif: boolean; membres: { label: string; x: number; y: number; rayonPx: number }[] };
    dimensions?: () => { largeur: number; hauteur: number };
  };
  const vide: CadreResult = { membres: 0, debordementPx: 0, pires: [], verdict: 'non arme, aucun genre ouvert' };
  if (!a.zoneFocus || !a.dimensions) return vide;
  const z = a.zoneFocus();
  if (!z.actif) return vide;
  const { largeur, hauteur } = a.dimensions();

  let debordement = 0;
  const pires: string[] = [];

  const compter = (nom: string, x0: number, y0: number, x1: number, y1: number): void => {
    const sortie =
      Math.max(0, -x0) + Math.max(0, x1 - largeur) + Math.max(0, -y0) + Math.max(0, y1 - hauteur);
    if (sortie <= 0) return;
    debordement += sortie;
    if (pires.length < 6) pires.push(`${nom} sort de ${Math.round(sortie)} px`);
  };

  for (const m of z.membres) {
    compter(m.label, m.x - m.rayonPx, m.y - m.rayonPx, m.x + m.rayonPx, m.y + m.rayonPx);
  }
  const origine = repereCanvas();
  for (const el of document.querySelectorAll('.atlas-label')) {
    const r = el.getBoundingClientRect();
    if (r.left <= -500 || Number(getComputedStyle(el).opacity) <= 0.05) continue;
    if ((el as HTMLElement).dataset['flou'] === '1') continue;
    compter(
      `nom ${el.textContent ?? ''}`,
      r.left - origine.x,
      r.top - origine.y,
      r.right - origine.x,
      r.bottom - origine.y
    );
  }

  return {
    membres: z.membres.length,
    debordementPx: Math.round(debordement),
    pires,
    verdict: debordement === 0 ? 'ok' : 'echec'
  };
};

// ------------------------------------------------------------- exécution

export interface VisualReport {
  matite: MatiteResult;
  survol: SurvolResult;
  intro: IntroResult;
  recouvrement: RecouvrementResult;
  boites: BoitesResult;
  focus: FocusResult;
  cadre: CadreResult;
  cameraFixe: CameraResult;
}

export const runVisualVerification = async (): Promise<VisualReport> => {
  /* L'ORDRE COMPTE, et il a deja menti une fois.

     testRecouvrement fait tourner l'orbite sur trente-six poses et laisse la
     camera sur la derniere. Lance apres lui, le test de focus mesurait donc
     une couronne vue de biais, ecart minimal 5 px au lieu de 113, et rendait
     « echec » sur un cadrage parfaitement correct.

     Le focus passe donc EN PREMIER, tant que la camera est encore la ou le
     clic l'a mise. Les tests qui deplacent la camera viennent apres. */
  const focus = testFocus();
  /* Le cadre AVANT tout ce qui bouge la camera, comme le focus. */
  const cadre = testCadre();
  const cameraFixe = await testCameraFixe();
  const matite = testMatite();
  const boites = await testBoites();
  const survol = await testSurvol();
  const recouvrement = await testRecouvrement();
  // L'intro en dernier : elle remet les rayons en scène.
  const intro = await testIntro();
  return { matite, survol, intro, recouvrement, boites, focus, cadre, cameraFixe };
};

/** Auto-exécution quand l'URL porte ?verify : JSON à l'écran et en console. */
export const runAndDisplay = async (): Promise<void> => {
  const report = await runVisualVerification();
  console.log('verify:visual', JSON.stringify(report, null, 2));
  const pre = document.createElement('pre');
  pre.id = 'verify-visual-report';
  pre.style.cssText =
    'position:fixed;inset:auto 12px 12px 12px;max-height:50vh;overflow:auto;z-index:99;' +
    'background:rgba(10,12,16,.96);color:#cdd3e0;font:11px/1.5 monospace;padding:12px;' +
    'border:1px solid #2a3040;white-space:pre-wrap;';
  pre.textContent = JSON.stringify(report, null, 2);
  document.body.appendChild(pre);
};
