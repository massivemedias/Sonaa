/* Couche WebGL du prototype. JETABLE.

   Elle ne sert plus QUE l'atlas : quatorze amas de sphères dans l'espace,
   orbitables et zoomables, avec les quatorze noms de familles et rien d'autre.

   Tout ce qui concernait la descente en 3D a été retiré : couronnes, positions
   déployées, cascade de diffusion, focus sur un genre, anneaux indicateurs,
   labels de genres et leur évitement de collision. La hiérarchie se lit
   maintenant dans un arbre 2D, hors de ce fichier.

   Imports nommés uniquement (ADR-019). */

import {
  BufferAttribute,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three';

import {
  ATLAS_CENTER,
  DEFAULT_AZIMUTH,
  DEFAULT_ELEVATION,
  FAMILIES,
  FAMILY_CENTERS,
  FAMILY_LINKS,
  STRUCTURES,
  TOTAL_GENRES
} from './masses.ts';

import {
  backgroundFrag,
  backgroundVert,
  linkFrag,
  linkVert,
  sphereFrag,
  sphereVert
} from './shaders.ts';

// ------------------------------------------------------------------ couleur

const oklchToSrgb = (L: number, C: number, hDeg: number): [number, number, number] => {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
  const gamma = (v: number): number => {
    const c = Math.min(1, Math.max(0, v));
    return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  return [gamma(lin[0] ?? 0), gamma(lin[1] ?? 0), gamma(lin[2] ?? 0)];
};

// ------------------------------------------------------------------ types

export interface ProtoStats {
  fps: number;
  drawCalls: number;
  spheres: number;
  links: number;
  distance: number;
  hoveredFamily: string;
  labelsShown: number;
  reduced: boolean;
  results: ProtoResults | null;
}

export interface ProtoResults {
  backgroundMs: number;
  spheresMs: number;
  linksMs: number;
  totalMs: number;
}

export interface ProtoHandles {
  canvas: HTMLCanvasElement;
  labelLayer: HTMLElement;
  onStats: (stats: ProtoStats) => void;
  /** Clic sur un amas : la famille s'ouvre en arbre 2D, hors de la 3D. */
  onFamily: (familyIndex: number) => void;
  onContextLost: () => void;
}

export interface ProtoApi {
  dispose: () => void;
  runProfile: () => Promise<void>;
  recenter: () => void;
  zoom: (direction: 1 | -1) => void;
  rotate: (direction: 1 | -1) => void;
  flyToFamily: (familyIndex: number) => void;
  setSuspended: (suspended: boolean) => void;
}

const FOV = 40;
const ATLAS_FILL = 0.7;
const LABEL_POOL = 16;
const MIN_DISTANCE = 12;
const MAX_DISTANCE = 520;
// Bornes d'élévation conformes à DESIGN.md section 7 : -10 à +85 degrés.
const ELEVATION_MIN = (-10 * Math.PI) / 180;
const ELEVATION_MAX = (85 * Math.PI) / 180;
const OVERLAP_TOLERANCE = 4;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ------------------------------------------------------------------ init

export const initProto = (handles: ProtoHandles): ProtoApi => {
  const { canvas, labelLayer, onStats, onFamily, onContextLost } = handles;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.info.autoReset = false;
  const gl = renderer.getContext();

  const detectReduced = (): boolean => {
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return true;
    if ((navigator.hardwareConcurrency ?? 8) <= 4) return true;
    return false;
  };
  const reduced = detectReduced();
  const maxPixelRatio = reduced ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));

  const onLost = (event: Event): void => {
    event.preventDefault();
    onContextLost();
  };
  canvas.addEventListener('webglcontextlost', onLost);

  // ---------------------------------------------------------------- fond

  const bgScene = new Scene();
  const bgCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bgUniforms = {
    uResolution: { value: new Vector2(1, 1) },
    uTime: { value: 0 },
    uGrain: { value: 1 }
  };
  bgScene.add(
    new Mesh(
      new PlaneGeometry(2, 2),
      new ShaderMaterial({ vertexShader: backgroundVert, fragmentShader: backgroundFrag, uniforms: bgUniforms, depthTest: false, depthWrite: false })
    )
  );

  // --------------------------------------------------------------- scène

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.5, 4000);
  const cameraPos = new Vector3();
  const fogColor = new Vector3(0.042, 0.047, 0.058);
  const familyCenters = FAMILY_CENTERS.map((c) => new Vector3(c[0], c[1], c[2]));

  // ------------------------------------------------------------ sphères

  const sphereCenters = new Float32Array(TOTAL_GENRES * 3);
  const sphereRadii = new Float32Array(TOTAL_GENRES);
  const sphereColors = new Float32Array(TOTAL_GENRES * 3);
  const sphereState = new Float32Array(TOTAL_GENRES * 2);
  const sphereFamily = new Int16Array(TOTAL_GENRES);
  const sphereWorld: Vector3[] = [];

  {
    let cursor = 0;
    FAMILIES.forEach((family, fi) => {
      const structure = STRUCTURES[fi];
      const center = familyCenters[fi];
      if (!structure || !center) return;

      structure.genres.forEach((genre, li) => {
        const i = cursor + li;
        const [px, py, pz] = genre.packed;
        sphereCenters[i * 3] = center.x + px;
        sphereCenters[i * 3 + 1] = center.y + py;
        sphereCenters[i * 3 + 2] = center.z + pz;
        sphereRadii[i] = genre.sphereRadius;

        const [r, g, b] = oklchToSrgb(genre.lightness, genre.chroma, family.hue);
        sphereColors[i * 3] = r;
        sphereColors[i * 3 + 1] = g;
        sphereColors[i * 3 + 2] = b;

        sphereState[i * 2] = 1;
        sphereState[i * 2 + 1] = 0;

        sphereFamily[i] = fi;
        sphereWorld.push(new Vector3(center.x + px, center.y + py, center.z + pz));
      });
      cursor += structure.genres.length;
    });
  }

  const quad = new PlaneGeometry(1, 1);
  const sphereGeometry = new InstancedBufferGeometry();
  sphereGeometry.setAttribute('position', quad.getAttribute('position') as BufferAttribute);
  sphereGeometry.setAttribute('uv', quad.getAttribute('uv') as BufferAttribute);
  const quadIndex = quad.getIndex();
  if (quadIndex) sphereGeometry.setIndex(quadIndex);
  sphereGeometry.instanceCount = TOTAL_GENRES;

  const sphereStateAttr = new InstancedBufferAttribute(sphereState, 2);
  sphereStateAttr.setUsage(35048);
  sphereGeometry.setAttribute('aCenter', new InstancedBufferAttribute(sphereCenters, 3));
  sphereGeometry.setAttribute('aRadius', new InstancedBufferAttribute(sphereRadii, 1));
  sphereGeometry.setAttribute('aColor', new InstancedBufferAttribute(sphereColors, 3));
  sphereGeometry.setAttribute('aState', sphereStateAttr);

  const sphereUniforms = {
    uCameraPos: { value: cameraPos },
    uLightDir: { value: new Vector3(0.42, 0.72, 0.55).normalize() },
    uPixelScale: { value: 0.001 },
    uFog: { value: new Vector2(190, 620) },
    uFogColor: { value: fogColor }
  };

  const sphereMesh = new Mesh(
    sphereGeometry,
    new ShaderMaterial({
      vertexShader: sphereVert,
      fragmentShader: sphereFrag,
      uniforms: sphereUniforms,
      transparent: true,
      depthTest: true,
      depthWrite: true
    })
  );
  sphereMesh.frustumCulled = false;
  sphereMesh.renderOrder = 1;
  scene.add(sphereMesh);

  // -------------------------------------------------------------- liens

  const LINK_COUNT = FAMILY_LINKS.length;
  const linkP0 = new Float32Array(Math.max(1, LINK_COUNT) * 3);
  const linkP1 = new Float32Array(Math.max(1, LINK_COUNT) * 3);
  const linkC0 = new Float32Array(Math.max(1, LINK_COUNT) * 3);
  const linkC1 = new Float32Array(Math.max(1, LINK_COUNT) * 3);
  const linkMeta = new Float32Array(Math.max(1, LINK_COUNT) * 3);

  FAMILY_LINKS.forEach((link, i) => {
    const a = familyCenters[link.from];
    const b = familyCenters[link.to];
    const fa = FAMILIES[link.from];
    const fb = FAMILIES[link.to];
    if (!a || !b || !fa || !fb) return;
    linkP0.set([a.x, a.y, a.z], i * 3);
    linkP1.set([b.x, b.y, b.z], i * 3);
    linkC0.set(oklchToSrgb(0.68, 0.08, fa.hue), i * 3);
    linkC1.set(oklchToSrgb(0.68, 0.08, fb.hue), i * 3);
    linkMeta[i * 3] = link.weight;
    linkMeta[i * 3 + 1] = 0.1;
    linkMeta[i * 3 + 2] = 1;
  });

  const SEGMENTS = 8;
  const vertCount = (SEGMENTS + 1) * 2;
  const ribbonPos = new Float32Array(vertCount * 3);
  const ribbonT = new Float32Array(vertCount);
  const ribbonSide = new Float32Array(vertCount);
  const ribbonIndex: number[] = [];
  for (let i = 0; i <= SEGMENTS; i += 1) {
    const t = i / SEGMENTS;
    ribbonT[i * 2] = t;
    ribbonT[i * 2 + 1] = t;
    ribbonSide[i * 2] = -1;
    ribbonSide[i * 2 + 1] = 1;
    if (i < SEGMENTS) {
      const a = i * 2;
      ribbonIndex.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const linkGeometry = new InstancedBufferGeometry();
  linkGeometry.setAttribute('position', new Float32BufferAttribute(ribbonPos, 3));
  linkGeometry.setAttribute('aT', new Float32BufferAttribute(ribbonT, 1));
  linkGeometry.setAttribute('aSide', new Float32BufferAttribute(ribbonSide, 1));
  linkGeometry.setIndex(ribbonIndex);
  linkGeometry.instanceCount = LINK_COUNT;
  const linkMetaAttr = new InstancedBufferAttribute(linkMeta, 3);
  linkMetaAttr.setUsage(35048);
  linkGeometry.setAttribute('aP0', new InstancedBufferAttribute(linkP0, 3));
  linkGeometry.setAttribute('aP1', new InstancedBufferAttribute(linkP1, 3));
  linkGeometry.setAttribute('aColor0', new InstancedBufferAttribute(linkC0, 3));
  linkGeometry.setAttribute('aColor1', new InstancedBufferAttribute(linkC1, 3));
  linkGeometry.setAttribute('aMeta', linkMetaAttr);

  const linkUniforms = {
    uCameraPos: { value: cameraPos },
    uPixelScale: { value: 0.001 },
    uMinPixels: { value: 1.1 },
    uWidthWorld: { value: 0.12 },
    uFog: { value: sphereUniforms.uFog.value },
    uFogColor: { value: fogColor }
  };

  const linkMesh = new Mesh(
    linkGeometry,
    new ShaderMaterial({ vertexShader: linkVert, fragmentShader: linkFrag, uniforms: linkUniforms, transparent: true, depthTest: true, depthWrite: false })
  );
  linkMesh.frustumCulled = false;
  linkMesh.renderOrder = 2;
  scene.add(linkMesh);

  // ------------------------------------------------------------- caméra

  const atlasTarget = new Vector3(...ATLAS_CENTER);

  const atlasDistance = (() => {
    const az = DEFAULT_AZIMUTH;
    const el = DEFAULT_ELEVATION;
    const upX = -Math.sin(el) * Math.sin(az);
    const upY = Math.cos(el);
    const upZ = -Math.sin(el) * Math.cos(az);
    let half = 1;
    FAMILY_CENTERS.forEach((c, i) => {
      const dx = c[0] - ATLAS_CENTER[0];
      const dy = c[1] - ATLAS_CENTER[1];
      const dz = c[2] - ATLAS_CENTER[2];
      const along = Math.abs(dx * upX + dy * upY + dz * upZ);
      half = Math.max(half, along + (STRUCTURES[i]?.compactRadius ?? 6));
    });
    return clamp(half / (ATLAS_FILL * Math.tan((FOV * Math.PI) / 360)), MIN_DISTANCE, MAX_DISTANCE);
  })();

  const target = atlasTarget.clone();
  const targetSmooth = target.clone();
  let azimuth = DEFAULT_AZIMUTH;
  let elevation = DEFAULT_ELEVATION;
  let distance = atlasDistance;
  let azVel = 0;
  let elVel = 0;
  let dollyVel = 0;

  const flyFrom = new Vector3();
  const flyTo = new Vector3();
  let flyFromDist = 0;
  let flyToDist = 0;
  let flyStart = -1e9;
  let flying = false;
  const FLY_MS = 600;

  const startFly = (to: Vector3, dist: number, now: number): void => {
    if (reducedMotion) {
      targetSmooth.copy(to);
      target.copy(to);
      distance = dist;
      return;
    }
    flyFrom.copy(targetSmooth);
    flyTo.copy(to);
    flyFromDist = distance;
    flyToDist = dist;
    flyStart = now;
    flying = true;
    azVel = 0;
    elVel = 0;
    dollyVel = 0;
  };

  const familyFrameDistance = (fi: number): number => {
    const r = STRUCTURES[fi]?.compactRadius ?? 6;
    return clamp((r * 3.2) / Math.tan((FOV * Math.PI) / 360), MIN_DISTANCE, MAX_DISTANCE);
  };

  // -------------------------------------------------------------- taille

  let width = 1;
  let height = 1;

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width || window.innerWidth || 1));
    height = Math.max(1, Math.floor(rect.height || window.innerHeight || 1));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    bgUniforms.uResolution.value.set(width, height);
    const pixelScale = (2 * Math.tan((FOV * Math.PI) / 360)) / height;
    sphereUniforms.uPixelScale.value = pixelScale;
    linkUniforms.uPixelScale.value = pixelScale;
  };

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  window.addEventListener('resize', resize);

  // -------------------------------------------------------- interactions

  let suspended = false;
  let interacted = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let moved = 0;
  let hoveredFamily = -1;

  const projected = new Float32Array(TOTAL_GENRES * 3);
  const scratch = new Vector3();

  const onFirstInteraction = (): void => {
    if (interacted) return;
    interacted = true;
    document.documentElement.dataset['protoTouched'] = '1';
  };

  const pickFamily = (clientX: number, clientY: number): number => {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    let best = -1;
    let bestD = 60;
    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      if ((projected[i * 3 + 2] ?? 2) > 1) continue;
      const d = Math.hypot(px - (projected[i * 3] ?? 0), py - (projected[i * 3 + 1] ?? 0));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best >= 0 ? (sphereFamily[best] ?? -1) : -1;
  };

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (suspended) return;
    onFirstInteraction();
    const k = event.ctrlKey ? 0.03 : 0.026;
    dollyVel += event.deltaY * k;
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (suspended) return;
    onFirstInteraction();
    dragging = true;
    moved = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (suspended) return;
    const family = pickFamily(event.clientX, event.clientY);
    if (family !== hoveredFamily) hoveredFamily = family;

    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    azVel -= dx * 0.0026;
    elVel += dy * 0.0026;
    lastX = event.clientX;
    lastY = event.clientY;
  };

  const flyToFamily = (fi: number): void => {
    const c = familyCenters[fi];
    if (!c) return;
    startFly(c, familyFrameDistance(fi), performance.now());
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (dragging && moved < 5 && !suspended) {
      const family = pickFamily(event.clientX, event.clientY);
      if (family >= 0) {
        flyToFamily(family);
        // La suite se passe en 2D : l'arbre de la famille prend la main.
        onFamily(family);
      }
    }
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };

  const recenter = (): void => {
    startFly(atlasTarget, atlasDistance, performance.now());
    azVel = 0;
    elVel = 0;
    dollyVel = 0;
  };

  const onKey = (event: KeyboardEvent): void => {
    if (suspended) return;
    if (event.target instanceof HTMLInputElement) return;
    switch (event.key) {
      case 'ArrowLeft': azVel -= 0.045; break;
      case 'ArrowRight': azVel += 0.045; break;
      case 'ArrowUp': elVel += 0.035; break;
      case 'ArrowDown': elVel -= 0.035; break;
      case '+': case '=': dollyVel -= 5.5; break;
      case '-': case '_': dollyVel += 5.5; break;
      case '0': recenter(); break;
      default: return;
    }
    event.preventDefault();
    onFirstInteraction();
  };

  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('keydown', onKey);

  // ------------------------------------------------------------- labels

  /* Quatorze labels, un par famille. AUCUN label de genre : au niveau atlas on
     ne descend pas encore, et c'est ce qui encombrait la vue. */
  interface LabelSlot {
    el: HTMLSpanElement;
    key: string;
    x: number;
    y: number;
    px: number;
    opacity: number;
    visible: boolean;
  }

  const labelSlots: LabelSlot[] = [];
  for (let i = 0; i < LABEL_POOL; i += 1) {
    const el = document.createElement('span');
    el.className = 'proto-label';
    el.dataset['major'] = '1';
    el.style.transform = 'translate3d(-9999px,-9999px,0)';
    labelLayer.appendChild(el);
    labelSlots.push({ el, key: '', x: -9999, y: -9999, px: 14, opacity: 0, visible: false });
  }

  let labelsShown = 0;
  let lastLabelPass = 0;

  interface Candidate {
    key: string;
    text: string;
    sx: number;
    sy: number;
    depth: number;
    px: number;
    w: number;
    h: number;
  }

  const candidates: Candidate[] = [];
  const placed: Candidate[] = [];

  const overlaps = (a: Candidate, b: Candidate): boolean => {
    const t = OVERLAP_TOLERANCE;
    return a.sx + t < b.sx + b.w && a.sx + a.w - t > b.sx && a.sy + t < b.sy + b.h && a.sy + a.h - t > b.sy;
  };

  const projectLabels = (now: number): void => {
    if (now - lastLabelPass < 33) return;
    lastLabelPass = now;

    candidates.length = 0;
    placed.length = 0;
    const halfW = width / 2;
    const halfH = height / 2;

    FAMILIES.forEach((family, fi) => {
      const world = familyCenters[fi];
      if (!world) return;
      scratch.copy(world).project(camera);
      if (scratch.z > 1) return;
      const sx = scratch.x * halfW + halfW;
      const sy = -scratch.y * halfH + halfH;
      if (sx < -200 || sx > width + 200 || sy < -80 || sy > height + 80) return;

      const depth = camera.position.distanceTo(world);
      const px = clamp((1500 / Math.max(depth, 1)) * 0.8, 11, 22);
      candidates.push({
        key: `f-${family.id}`,
        text: family.label,
        sx,
        sy,
        depth,
        px,
        w: family.label.length * px * 0.62 + px * 0.4,
        h: px * 1.45
      });
    });

    candidates.sort((a, b) => a.depth - b.depth);
    for (const c of candidates) {
      if (placed.some((other) => overlaps(c, other))) continue;
      placed.push(c);
    }
    labelsShown = placed.length;

    for (let i = 0; i < LABEL_POOL; i += 1) {
      const ls = labelSlots[i];
      if (!ls) continue;
      const entry = placed[i];

      if (!entry || suspended) {
        if (ls.visible) {
          ls.el.style.transform = 'translate3d(-9999px,-9999px,0)';
          ls.visible = false;
        }
        continue;
      }

      if (ls.key !== entry.key) {
        ls.key = entry.key;
        ls.el.textContent = entry.text;
      }
      if (Math.abs(entry.px - ls.px) >= 0.4) {
        ls.px = entry.px;
        ls.el.style.fontSize = `${entry.px.toFixed(1)}px`;
      }
      if (Math.abs(entry.sx - ls.x) >= 1 || Math.abs(entry.sy - ls.y) >= 1 || !ls.visible) {
        ls.x = entry.sx;
        ls.y = entry.sy;
        ls.el.style.transform = `translate3d(${entry.sx.toFixed(1)}px, ${entry.sy.toFixed(1)}px, 0)`;
        ls.visible = true;
      }
      if (ls.opacity !== 1) {
        ls.opacity = 1;
        ls.el.style.opacity = '1';
      }
    }
  };

  // --------------------------------------------------------------- rendu

  const renderOnce = (bg: boolean): void => {
    renderer.autoClear = true;
    if (bg) {
      renderer.render(bgScene, bgCamera);
      renderer.autoClear = false;
      renderer.clearDepth();
    }
    renderer.render(scene, camera);
    renderer.autoClear = true;
  };

  const yieldToLoop = (): Promise<void> =>
    new Promise((resolve) => {
      const ch = new MessageChannel();
      ch.port1.onmessage = () => {
        ch.port1.close();
        resolve();
      };
      ch.port2.postMessage(0);
    });

  const timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2') as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;

  const measureGpu = async (opts: { bg: boolean; spheres: boolean; links: boolean }, iterations = 150): Promise<number | null> => {
    if (!timerExt || !('createQuery' in gl)) return null;
    const gl2 = gl as WebGL2RenderingContext;
    const prev = [sphereMesh.visible, linkMesh.visible] as const;
    sphereMesh.visible = opts.spheres;
    linkMesh.visible = opts.links;

    for (let i = 0; i < 6; i += 1) renderOnce(opts.bg);
    const query = gl2.createQuery();
    if (!query) return null;

    gl2.beginQuery(timerExt.TIME_ELAPSED_EXT, query);
    for (let i = 0; i < iterations; i += 1) renderOnce(opts.bg);
    gl2.endQuery(timerExt.TIME_ELAPSED_EXT);
    gl2.flush();

    let nanos: number | null = null;
    const deadline = performance.now() + 6000;
    while (performance.now() < deadline) {
      await yieldToLoop();
      if (gl2.getQueryParameter(query, gl2.QUERY_RESULT_AVAILABLE) === true) {
        if (gl2.getParameter(timerExt.GPU_DISJOINT_EXT) !== true) nanos = gl2.getQueryParameter(query, gl2.QUERY_RESULT) as number;
        break;
      }
    }
    gl2.deleteQuery(query);
    sphereMesh.visible = prev[0];
    linkMesh.visible = prev[1];
    return nanos === null ? null : nanos / 1e6 / iterations;
  };

  let results: ProtoResults | null = null;
  let profiling = false;

  const runProfile = async (): Promise<void> => {
    if (profiling) return;
    profiling = true;
    results = null;
    const bg = (await measureGpu({ bg: true, spheres: false, links: false })) ?? 0;
    const bs = (await measureGpu({ bg: true, spheres: true, links: false })) ?? 0;
    const all = (await measureGpu({ bg: true, spheres: true, links: true })) ?? 0;
    results = { backgroundMs: bg, spheresMs: Math.max(0, bs - bg), linksMs: Math.max(0, all - bs), totalMs: all };
    profiling = false;
  };

  // -------------------------------------------------------------- boucle

  let running = true;
  let frames = 0;
  let fpsWindowStart = performance.now();
  let fps = 60;
  let lastStatsPush = 0;

  const applyCamera = (): void => {
    const cosE = Math.cos(elevation);
    cameraPos.set(
      targetSmooth.x + distance * cosE * Math.sin(azimuth),
      targetSmooth.y + distance * Math.sin(elevation),
      targetSmooth.z + distance * cosE * Math.cos(azimuth)
    );
    camera.position.copy(cameraPos);
    camera.up.set(0, 1, 0);
    camera.lookAt(targetSmooth);
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  };

  const frame = (): void => {
    if (!running) return;
    requestAnimationFrame(frame);
    const now = performance.now();

    if (!reducedMotion) bgUniforms.uTime.value = now / 1000;

    const friction = reducedMotion ? 0 : 0.9;
    azimuth += azVel;
    elevation = clamp(elevation + elVel, ELEVATION_MIN, ELEVATION_MAX);
    distance = clamp(distance * Math.exp(dollyVel * 0.02), MIN_DISTANCE, MAX_DISTANCE);
    azVel *= friction;
    elVel *= friction;
    dollyVel *= friction * 0.96;

    // Le vol se termine même si l'image suivante arrive après son intervalle.
    if (flying) {
      const k = easeInOut(clamp((now - flyStart) / FLY_MS, 0, 1));
      targetSmooth.lerpVectors(flyFrom, flyTo, k);
      distance = flyFromDist + (flyToDist - flyFromDist) * k;
      target.copy(targetSmooth);
      if (k >= 1) flying = false;
    }

    applyCamera();

    if (profiling) return;

    // Les liens ne s'allument que sur la famille survolée.
    for (let i = 0; i < LINK_COUNT; i += 1) {
      const link = FAMILY_LINKS[i];
      if (!link) continue;
      const lit = link.from === hoveredFamily || link.to === hoveredFamily;
      linkMeta[i * 3 + 1] = suspended ? 0 : lit ? 0.9 : 0.1;
    }
    linkMetaAttr.needsUpdate = true;

    // Atténuation générale quand l'arbre 2D est devant.
    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      sphereState[i * 2] = suspended ? 0.28 : 1;
    }
    sphereStateAttr.needsUpdate = true;

    {
      const halfW = width / 2;
      const halfH = height / 2;
      for (let i = 0; i < TOTAL_GENRES; i += 1) {
        const w = sphereWorld[i];
        if (!w) continue;
        scratch.copy(w).project(camera);
        projected[i * 3] = scratch.x * halfW + halfW;
        projected[i * 3 + 1] = -scratch.y * halfH + halfH;
        projected[i * 3 + 2] = scratch.z;
      }
    }

    projectLabels(now);
    renderer.info.reset();
    renderOnce(true);

    frames += 1;
    if (now - fpsWindowStart >= 500) {
      fps = (frames * 1000) / (now - fpsWindowStart);
      frames = 0;
      fpsWindowStart = now;
    }

    if (now - lastStatsPush > 250) {
      lastStatsPush = now;
      onStats({
        fps,
        drawCalls: renderer.info.render.calls,
        spheres: TOTAL_GENRES,
        links: LINK_COUNT,
        distance,
        hoveredFamily: hoveredFamily >= 0 ? (FAMILIES[hoveredFamily]?.label ?? '—') : '—',
        labelsShown,
        reduced,
        results
      });
    }
  };

  applyCamera();
  requestAnimationFrame(frame);
  void runProfile();

  (window as unknown as { __proto?: unknown }).__proto = {
    measureGpu,
    runProfile,
    recenter,
    flyToFamily,
    info: () => ({
      spheres: TOTAL_GENRES,
      links: LINK_COUNT,
      reduced,
      pixelRatio: renderer.getPixelRatio(),
      size: [width, height],
      triangles: renderer.info.render.triangles
    }),
    drawCallsPerFrame: () => {
      renderer.info.reset();
      renderOnce(true);
      return renderer.info.render.calls;
    }
  };

  return {
    dispose: () => {
      running = false;
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      for (const ls of labelSlots) ls.el.remove();
      sphereGeometry.dispose();
      linkGeometry.dispose();
      renderer.dispose();
    },
    runProfile,
    recenter,
    zoom: (direction: 1 | -1) => {
      onFirstInteraction();
      dollyVel += direction === 1 ? -5.5 : 5.5;
    },
    rotate: (direction: 1 | -1) => {
      onFirstInteraction();
      azVel += direction * 0.05;
    },
    flyToFamily,
    setSuspended: (value: boolean) => {
      suspended = value;
    }
  };
};
