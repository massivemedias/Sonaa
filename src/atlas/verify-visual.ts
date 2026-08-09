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
  Float32BufferAttribute,
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

import { linkFrag, linkVert, sphereFrag, sphereVert } from './shaders.ts';

interface AtlasHooks {
  sphereRadius: (i: number) => number;
  sphereBase: (i: number) => number;
  setHovered: (i: number) => void;
  visibleCount: () => number;
  reducedMotion: boolean;
  playIntro: (onEnd?: () => void) => void;
  setOrbit?: (az: number, el: number, dist: number) => void;
  framing: () => { atlasDistance: number };
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

// -------------------------------- 2a. respiration, 2b. survol (moteur vivant)

interface RespirationResult {
  amplitudePct: number;
  attenduPct: number;
  verdict: 'ok' | 'echec' | 'coupe par prefers-reduced-motion';
}

const testRespiration = async (): Promise<RespirationResult> => {
  const a = atlas();
  if (a.reducedMotion) return { amplitudePct: 0, attenduPct: 2, verdict: 'coupe par prefers-reduced-motion' };
  a.setHovered(-1);
  const i = 0;
  const base = a.sphereBase(i) || 1;
  /* La respiration a une période d'environ 14 s : une fenêtre courte ne
     voit qu'une fraction de l'amplitude (première version du test : 2 s,
     0,13 % mesuré, faux échec). 60 échantillons espacés de 140 ms couvrent
     une demi-période. */
  let min = Infinity;
  let max = -Infinity;
  for (let f = 0; f < 60; f += 1) {
    await wait(140);
    const r = a.sphereRadius(i);
    min = Math.min(min, r);
    max = Math.max(max, r);
  }
  const amplitude = ((max - min) / 2 / base) * 100;
  const ok = amplitude >= 0.5 && Math.abs(amplitude - 2) <= 1.5;
  return { amplitudePct: Math.round(amplitude * 100) / 100, attenduPct: 2, verdict: ok ? 'ok' : 'echec' };
};

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

// ------------------------------------------ 2c. flux le long d'un lien

interface FluxResult {
  positionMax1: number;
  positionMax2: number;
  deplacementPx: number;
  verdict: 'ok' | 'echec';
}

const testFlux = (): FluxResult => {
  const W = 512;
  const H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const renderer = new WebGLRenderer({ canvas, preserveDrawingBuffer: true, alpha: false });
  renderer.setSize(W, H, false);
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, W / H, 0.5, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  const SEG = 32;
  const count = (SEG + 1) * 2;
  const pos = new Float32Array(count * 3);
  const t = new Float32Array(count);
  const side = new Float32Array(count);
  const index: number[] = [];
  for (let i = 0; i <= SEG; i += 1) {
    const tt = i / SEG;
    t[i * 2] = tt;
    t[i * 2 + 1] = tt;
    side[i * 2] = -1;
    side[i * 2 + 1] = 1;
    if (i < SEG) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new InstancedBufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('aT', new Float32BufferAttribute(t, 1));
  geo.setAttribute('aSide', new Float32BufferAttribute(side, 1));
  geo.setIndex(index);
  geo.instanceCount = 1;
  geo.setAttribute('aP0', new InstancedBufferAttribute(new Float32Array([-6, 0, 0]), 3));
  geo.setAttribute('aP1', new InstancedBufferAttribute(new Float32Array([6, 0, 0]), 3));
  geo.setAttribute('aCtrl0', new InstancedBufferAttribute(new Float32Array([-2, 0, 0]), 3));
  geo.setAttribute('aCtrl1', new InstancedBufferAttribute(new Float32Array([2, 0, 0]), 3));
  geo.setAttribute('aColor0', new InstancedBufferAttribute(new Float32Array([0.8, 0.8, 0.9]), 3));
  geo.setAttribute('aColor1', new InstancedBufferAttribute(new Float32Array([0.8, 0.8, 0.9]), 3));
  geo.setAttribute('aMeta', new InstancedBufferAttribute(new Float32Array([1, 1, 1]), 3));

  const uniforms = {
    uCameraPos: { value: camera.position },
    uPixelScale: { value: (2 * Math.tan((40 * Math.PI) / 360)) / H },
    uMinPixels: { value: 2 },
    uWidthWorld: { value: 0.4 },
    uFog: { value: new Vector2(1e5, 2e5) },
    uFogColor: { value: new Vector3(0, 0, 0) },
    uFlowTime: { value: 0.15 }
  };
  const mesh = new Mesh(
    geo,
    new ShaderMaterial({ vertexShader: linkVert, fragmentShader: linkFrag, uniforms, transparent: true })
  );
  mesh.frustumCulled = false;
  scene.add(mesh);

  /* La tête de propagation (fixe et brillante) masquait la bande du flux :
     le max global ne bougeait pas et le test concluait à tort que l'effet
     n'existe pas. On lit un profil de RÉFÉRENCE sans flux, et on cherche le
     max de la DIFFÉRENCE : c'est la bande, rien qu'elle. */
  const readRow = (): number[] => {
    renderer.render(scene, camera);
    const gl = renderer.getContext();
    const px = new Uint8Array(W * 4);
    gl.readPixels(0, Math.floor(H / 2), W, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const row: number[] = [];
    for (let x = 0; x < W; x += 1) {
      const o = x * 4;
      row.push((px[o] ?? 0) + (px[o + 1] ?? 0) + (px[o + 2] ?? 0));
    }
    return row;
  };
  const argmaxDiff = (row: number[], ref: number[]): number => {
    let bestX = 0;
    let best = -1;
    for (let x = 0; x < W; x += 1) {
      const d = (row[x] ?? 0) - (ref[x] ?? 0);
      if (d > best) {
        best = d;
        bestX = x;
      }
    }
    return bestX;
  };

  uniforms.uFlowTime.value = 0;
  const ref = readRow();
  uniforms.uFlowTime.value = 0.15;
  const x1 = argmaxDiff(readRow(), ref);
  uniforms.uFlowTime.value = 0.45;
  const x2 = argmaxDiff(readRow(), ref);
  renderer.dispose();

  const deplacement = x2 - x1;
  return {
    positionMax1: x1,
    positionMax2: x2,
    deplacementPx: deplacement,
    verdict: deplacement > 20 ? 'ok' : 'echec'
  };
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
  verdict: 'ok' | 'echec' | 'setOrbit indisponible (vue fixe ?)';
}

const measureOverlaps = (): { paires: number; pirePx: number } => {
  const els = [...document.querySelectorAll('.atlas-label')].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.left > -500 && Number(getComputedStyle(e).opacity) > 0.05;
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
  if (!a.setOrbit) {
    return {
      poses: 0,
      pireCas: { azimutDeg: 0, distance: 0, paires: 0, pirePx: 0 },
      verdict: 'setOrbit indisponible (vue fixe ?)'
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

// ------------------------------------------------------------- exécution

export interface VisualReport {
  matite: MatiteResult;
  respiration: RespirationResult;
  survol: SurvolResult;
  flux: FluxResult;
  intro: IntroResult;
  recouvrement: RecouvrementResult;
}

export const runVisualVerification = async (): Promise<VisualReport> => {
  const matite = testMatite();
  const flux = testFlux();
  const respiration = await testRespiration();
  const survol = await testSurvol();
  const recouvrement = await testRecouvrement();
  // L'intro en dernier : elle remet les rayons en scène.
  const intro = await testIntro();
  return { matite, respiration, survol, flux, intro, recouvrement };
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
