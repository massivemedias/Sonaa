/* VUE 3D LIBRE : le moteur orbital d'avant la disposition fixe (47b2938),
   ressuscité comme vue au choix (ADR-043). Système planétaire, orbite,
   déploiement des familles : tout ce que la vue fixe a abandonné vit ici.

   Adapté à la nouvelle maison : types partagés avec webgl.ts, plaque 3D
   retirée (le lecteur est une colonne DOM), liens en Bézier (contrôles au
   tiers = ligne droite), et le survol ne touche jamais aux labels. */

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
  FAMILIES,
  FAMILY_LINKS,
  STRUCTURES,
  TOTAL_GENRES,
  TOTAL_INTERNAL_LINKS,
  FAMILY_CENTERS,
  FAMILY_MARGIN,
  DEFAULT_AZIMUTH,
  DEFAULT_ELEVATION,
  familyRadius,
  ATLAS_CENTER,
  pathToGenre
} from './structures.ts';

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

// Types partagés : la vue libre expose exactement la même API que la fixe.
import type { AtlasHandles, AtlasApi, AtlasResults } from './webgl.ts';

const FOV = 40;
const LABEL_POOL = 96;
/* Amplitude de dolly large : on doit pouvoir arriver assez près pour qu'une
   sphère occupe la moitié de la hauteur de l'écran. À 40 degrés de champ, cela
   demande une distance d'environ 5,7 fois le rayon, soit 6 unités pour une
   petite sphère. On descend nettement en dessous pour garder de la marge. */
const MIN_DISTANCE = 3;
/* 1200 et non 520 : sur un écran étroit en portrait, cadrer l'atlas entier
   demande environ 800 unités de recul. L'ancien plafond bloquait le cadrage
   par défaut du mobile, la scène restait coupée quel que soit le calcul. */
const MAX_DISTANCE = 1200;

/* Taille des labels : plancher et plafond stricts. Jamais de texte à 8 px
   parce qu'un noeud est loin, jamais de titre géant parce qu'il est proche. */
const LABEL_PX_CEILING = 22;

/* Hauteur du bandeau d'interface en haut et en bas, en pixels. Le fil d'Ariane
   passe sur deux lignes quand le chemin est long, d'où la marge généreuse. */
/* Bandes réservées AMINCIES (ADR-056) : les contrôles sont partis en haut
   à droite et la légende se cache quand la feuille monte — les anciennes
   bandes pleine largeur mangeaient la moitié d'une couronne à 390 px. Le
   fil d'Ariane garde sa ligne, le pied sa marge. */
const CHROME_TOP = 44;
const CHROME_BOTTOM = 36;
/* Les noms sont toujours candidats : le plafond monte au niveau du pool.
   Sur mobile on reste plus bas, l'écran n'a pas la place de toute façon. */
/* Plancher abaissé de 11 à 9 px (verdict : les labels dominaient la carte
   et forçaient le masquage). */
const DESKTOP = { maxLabels: 96, floorPx: 9 };
const MOBILE = { maxLabels: 44, floorPx: 9 };


/* La diffusion. Rapide et énergique : c'est l'animation signature. */
const OPEN_MS = 480;
const OPEN_DELAY_MS = 40;
const CLOSE_MS = 300;
const CLOSE_DELAY_MS = 22;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/* Easing avec léger dépassement. Un ease-out mou donnerait un fondu, pas une
   propagation : le dépassement est ce qui met de l'énergie dans le geste. */
const backOut = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
};

// ------------------------------------------------------------------ init

export const initAtlasOrbit = (handles: AtlasHandles): AtlasApi => {
  const { canvas, labelLayer, onStats, onNavigate, onTracks, onPanel, onContextLost } =
    handles;
  /* Vrai une fois la caméra et les cibles construites : le resize d'init ne
     peut pas encore mesurer, il repasse une fois le moteur debout. */
  let engineReady = false;
  /** Vrai tant que la caméra est au cadrage par défaut de l'atlas. */
  let cameraAtDefault = true;
  let framingDiag: Record<string, number> | null = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.info.autoReset = false;
  const gl = renderer.getContext();

  const detectReduced = (): boolean => {
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return true;
    if ((navigator.hardwareConcurrency ?? 8) <= 4) return true;
    try {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL: number } | null;
      const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
      if (/Adreno|Mali|PowerVR|Apple A\d|SwiftShader|llvmpipe/i.test(name)) return true;
    } catch {
      // Extension absente : on reste en mode complet.
    }
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
  const bgMesh = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({ vertexShader: backgroundVert, fragmentShader: backgroundFrag, uniforms: bgUniforms, depthTest: false, depthWrite: false })
  );
  bgScene.add(bgMesh);

  // --------------------------------------------------------------- scène

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.5, 4000);
  const cameraPos = new Vector3();
  /* En portrait, l'atlas s'étale VERTICALEMENT : les positions tournent de
     90 degrés dans le plan de l'écran à l'angle par défaut. C'est une rotation
     exacte, les distances et donc la séparation garantie sont conservées. */
  const familyBaseLandscape = FAMILY_CENTERS.map((c) => new Vector3(c[0], c[1], c[2]));
  const familyBase = familyBaseLandscape.map((v) => v.clone());
  let portraitApplied = false;
  let stretchApplied = 1;

  /* `stretch` étire l'axe vertical de l'écran en portrait : après pivot,
     l'atlas reste presque carré alors que l'écran est deux fois plus haut que
     large, et la moitié de la hauteur restait vide. L'étirement ne fait
     qu'AUGMENTER les séparations, la garantie de non-chevauchement tient. */
  const applyOrientation = (portrait: boolean, stretch = 1): void => {
    if (portrait === portraitApplied && stretch === stretchApplied) return;
    portraitApplied = portrait;
    stretchApplied = stretch;
    const az = DEFAULT_AZIMUTH;
    const el = DEFAULT_ELEVATION;
    const right = new Vector3(Math.cos(az), 0, -Math.sin(az));
    const up = new Vector3(-Math.sin(el) * Math.sin(az), Math.cos(el), -Math.sin(el) * Math.cos(az));
    const fwd = new Vector3().crossVectors(right, up).negate();
    const centerV = new Vector3(...ATLAS_CENTER);
    familyBase.forEach((v, i) => {
      const base = familyBaseLandscape[i];
      if (!base) return;
      if (!portrait) {
        v.copy(base);
        return;
      }
      const rel = base.clone().sub(centerV);
      const h = rel.dot(right);
      const vv = rel.dot(up);
      const d = rel.dot(fwd);
      v.copy(centerV)
        .addScaledVector(right, vv)
        .addScaledVector(up, h * stretch)
        .addScaledVector(fwd, d);
    });
  };
  const fogColor = new Vector3(0.042, 0.047, 0.058);

  // ------------------------------------------------------------ sphères

  /* Toutes les familles à plat dans un seul tampon : un appel de dessin pour
     les 204 sphères de l'atlas. */
  const sphereCenters = new Float32Array(TOTAL_GENRES * 3);
  const sphereRadii = new Float32Array(TOTAL_GENRES);
  const sphereColors = new Float32Array(TOTAL_GENRES * 3);
  const sphereState = new Float32Array(TOTAL_GENRES * 4);
  /* Mis à jour par la passe de labels, consommé par le shader à l'image
     suivante : 33 ms de retard, invisible. */
  const labelled = new Uint8Array(TOTAL_GENRES);

  interface Slot {
    family: number;
    local: number;
    parent: number;
    major: boolean;
    children: number[];
    depth: number;
    label: string;
    bpm: number;
    compact: Vector3;
    deployed: Vector3;
    world: Vector3;
  }

  const slotsData: Slot[] = [];
  const familyOffset: number[] = [];

  {
    let cursor = 0;
    FAMILIES.forEach((family, fi) => {
      familyOffset[fi] = cursor;
      const structure = STRUCTURES[fi];
      if (!structure) return;
      const [cx, cy, cz] = FAMILY_CENTERS[fi] ?? family.center;

      structure.genres.forEach((genre, li) => {
        const i = cursor + li;
        sphereRadii[i] = genre.radius;
        const [r, g, b] = oklchToSrgb(genre.lightness, genre.chroma, family.hue);
        sphereColors[i * 3] = r;
        sphereColors[i * 3 + 1] = g;
        sphereColors[i * 3 + 2] = b;
        sphereState[i * 4] = 1;
        sphereState[i * 4 + 1] = 0;
        sphereState[i * 4 + 2] = genre.children.length;
        sphereState[i * 4 + 3] = 0;

        slotsData.push({
          family: fi,
          local: li,
          depth: genre.depth,
          label: genre.label,
          bpm: genre.bpm,
          children: genre.children,
          parent: genre.parent,
          major: genre.major,
          // Offsets RELATIFS au centre de famille : le centre bouge quand une
          // famille se déploie et pousse les autres.
          compact: new Vector3(...genre.compact),
          deployed: new Vector3(...genre.deployed),
          world: new Vector3(cx + genre.compact[0], cy + genre.compact[1], cz + genre.compact[2])
        });
      });
      cursor += structure.genres.length;
    });
  }

  const quad = new PlaneGeometry(1, 1);
  const quadPosition = quad.getAttribute('position') as BufferAttribute;
  const quadUv = quad.getAttribute('uv') as BufferAttribute;
  const quadIndex = quad.getIndex();

  const sphereGeometry = new InstancedBufferGeometry();
  sphereGeometry.setAttribute('position', quadPosition);
  sphereGeometry.setAttribute('uv', quadUv);
  if (quadIndex) sphereGeometry.setIndex(quadIndex);
  sphereGeometry.instanceCount = TOTAL_GENRES;

  const sphereCenterAttr = new InstancedBufferAttribute(sphereCenters, 3);
  const sphereStateAttr = new InstancedBufferAttribute(sphereState, 4);
  sphereCenterAttr.setUsage(35048);
  sphereStateAttr.setUsage(35048);
  sphereGeometry.setAttribute('aCenter', sphereCenterAttr);
  const sphereRadiusAttr = new InstancedBufferAttribute(sphereRadii, 1);
  sphereRadiusAttr.setUsage(35048);
  sphereGeometry.setAttribute('aRadius', sphereRadiusAttr);
  sphereGeometry.setAttribute('aColor', new InstancedBufferAttribute(sphereColors, 3));
  sphereGeometry.setAttribute('aState', sphereStateAttr);
  /* Genre ÉTEINT : labelsActuels existe et est vide, c'est une information
     éditoriale du corpus, pas une déduction. Attribut statique. */
  {
    const extinct = new Float32Array(TOTAL_GENRES);
    let cursor = 0;
    STRUCTURES.forEach((structure) => {
      structure.genres.forEach((genre, li) => {
        extinct[cursor + li] =
          genre.labelsActuels !== null && genre.labelsActuels.length === 0 ? 1 : 0;
      });
      cursor += structure.genres.length;
    });
    sphereGeometry.setAttribute('aExtinct', new InstancedBufferAttribute(extinct, 1));
  }

  const sphereUniforms = {
    uCameraPos: { value: cameraPos },
    uLightDir: { value: new Vector3(0.42, 0.72, 0.55).normalize() },
    uPixelScale: { value: 0.001 },
    uFog: { value: new Vector2(190, 620) },
    uFogColor: { value: fogColor }
  };

  const sphereMaterial = new ShaderMaterial({
    vertexShader: sphereVert,
    fragmentShader: sphereFrag,
    uniforms: sphereUniforms,
    transparent: true,
    // Les sphères écrivent la profondeur : l'occultation entre corps est
    // correcte sans aucun tri par instance.
    depthTest: true,
    depthWrite: true
  });

  const sphereMesh = new Mesh(sphereGeometry, sphereMaterial);
  sphereMesh.frustumCulled = false;
  sphereMesh.renderOrder = 1;
  scene.add(sphereMesh);

  // -------------------------------------------------------------- liens

  const LINK_COUNT = TOTAL_INTERNAL_LINKS + FAMILY_LINKS.length;
  const linkP0 = new Float32Array(LINK_COUNT * 3);
  const linkP1 = new Float32Array(LINK_COUNT * 3);
  /* Le shader des liens est désormais une Bézier cubique (vue fixe). La vue
     libre veut des segments droits : contrôles posés au tiers, recalculés à
     chaque mise à jour des extrémités. */
  const linkCtrlA = new Float32Array(LINK_COUNT * 3);
  const linkCtrlB = new Float32Array(LINK_COUNT * 3);
  const linkC0 = new Float32Array(LINK_COUNT * 3);
  const linkC1 = new Float32Array(LINK_COUNT * 3);
  const linkMeta = new Float32Array(LINK_COUNT * 3);

  interface LinkRef {
    a: number; // index global de sphère, ou -1 pour un lien de famille
    b: number;
    familyA: number;
    familyB: number;
    internal: boolean;
  }

  const linkRefs: LinkRef[] = [];

  {
    let cursor = 0;
    FAMILIES.forEach((family, fi) => {
      const structure = STRUCTURES[fi];
      const base = familyOffset[fi] ?? 0;
      if (!structure) return;
      for (const link of structure.links) {
        const gi = base + link.from;
        const gj = base + link.to;
        const ci = oklchToSrgb(0.7, 0.07, family.hue);
        linkC0.set(ci, cursor * 3);
        linkC1.set(ci, cursor * 3);
        linkMeta[cursor * 3] = 0.35;
        linkMeta[cursor * 3 + 1] = 1;
        linkMeta[cursor * 3 + 2] = 0;
        linkRefs.push({ a: gi, b: gj, familyA: fi, familyB: fi, internal: true });
        cursor += 1;
      }
    });

    for (const link of FAMILY_LINKS) {
      const fa = FAMILIES[link.from];
      const fb = FAMILIES[link.to];
      if (!fa || !fb) continue;
      linkC0.set(oklchToSrgb(0.66, 0.06, fa.hue), cursor * 3);
      linkC1.set(oklchToSrgb(0.66, 0.06, fb.hue), cursor * 3);
      linkMeta[cursor * 3] = link.weight;
      linkMeta[cursor * 3 + 1] = 1;
      linkMeta[cursor * 3 + 2] = 1;
      linkRefs.push({ a: -1, b: -1, familyA: link.from, familyB: link.to, internal: false });
      cursor += 1;
    }
  }

  const SEGMENTS = 12;
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

  const linkP0Attr = new InstancedBufferAttribute(linkP0, 3);
  const linkP1Attr = new InstancedBufferAttribute(linkP1, 3);
  const linkCtrlAAttr = new InstancedBufferAttribute(linkCtrlA, 3);
  const linkCtrlBAttr = new InstancedBufferAttribute(linkCtrlB, 3);
  const linkMetaAttr = new InstancedBufferAttribute(linkMeta, 3);
  for (const a of [linkP0Attr, linkP1Attr, linkCtrlAAttr, linkCtrlBAttr, linkMetaAttr]) a.setUsage(35048);
  linkGeometry.setAttribute('aP0', linkP0Attr);
  linkGeometry.setAttribute('aP1', linkP1Attr);
  linkGeometry.setAttribute('aCtrl0', linkCtrlAAttr);
  linkGeometry.setAttribute('aCtrl1', linkCtrlBAttr);
  linkGeometry.setAttribute('aColor0', new InstancedBufferAttribute(linkC0, 3));
  linkGeometry.setAttribute('aColor1', new InstancedBufferAttribute(linkC1, 3));
  linkGeometry.setAttribute('aMeta', linkMetaAttr);

  const linkUniforms = {
    uCameraPos: { value: cameraPos },
    uPixelScale: { value: 0.001 },
    uMinPixels: { value: 1.1 },
    uWidthWorld: { value: 0.075 },
    uFog: { value: sphereUniforms.uFog.value },
    uFogColor: { value: fogColor },
    uFlowTime: { value: 0 }
  };

  const linkMaterial = new ShaderMaterial({
    vertexShader: linkVert,
    fragmentShader: linkFrag,
    uniforms: linkUniforms,
    transparent: true,
    depthTest: true,
    depthWrite: false
  });

  const linkMesh = new Mesh(linkGeometry, linkMaterial);
  linkMesh.frustumCulled = false;
  linkMesh.renderOrder = 2;
  scene.add(linkMesh);

  // Plus de plaque : le lecteur vit en DOM, le moteur signale juste l'état.
  let panelSlot = -1;

  // ------------------------------------------------------------- caméra

  const atlasTarget = new Vector3(...ATLAS_CENTER);

  /* Cadrage de l'atlas mesuré, pas déduit d'une sphère englobante. Celle-ci
     est presque vide : deux familles excentrées en fixent le rayon alors que
     les douze autres se concentrent au centre, et la scène apparaissait deux
     fois trop petite. On mesure l'étendue VERTICALE réelle en espace caméra,
     qui ne dépend pas de la distance, et on résout. */
  /* Cadrage de l'atlas. On mesure l'étendue réelle dans les DEUX axes de la
     caméra, pas seulement la verticale : sur une fenêtre en portrait, c'est la
     largeur qui déborde, et deux familles sur six sortaient de l'écran. */
  /* Le cadrage tient TOUT : sphères ET labels, sur les deux axes, avec 8 %
     de marge. Les labels comptent en pixels : un nom de famille centré sous
     sa sphère ajoute environ 120 px de large et 40 px de haut, et le cadrage
     qui les ignorait coupait BASS et DOWNTEMPO sur mobile. */
  /* Sur mobile les noms de familles sont centrés SOUS la sphère : la
     demi-largeur d'un nom suffit. 120 px de chaque côté mangeaient 61 % d'un
     écran de 390 px et l'atlas devenait minuscule. */
  let analyticDiag: { byHeight: number; byWidth: number } | null = null;
  const LABEL_PAD_X = 70;
  /* 48 et non 96 : un label pend d'environ 30 px sous sa sphère. 96 px pris
     deux fois sur un téléphone en paysage (390 px de haut) laissaient moins de
     la moitié de l'écran à la scène. */
  const LABEL_PAD_Y = 48;

  const effectiveFill = (px: number, pad: number): number =>
    clamp(0.92 * (1 - (2 * pad) / Math.max(240, px)), 0.4, 0.92);

  const atlasDistanceFor = (aspect: number, widthPx = 1200, heightPx = 800): number => {
    const az = DEFAULT_AZIMUTH;
    const el = DEFAULT_ELEVATION;
    // Axe vertical de la caméra pour cette orientation d'orbite.
    const upX = -Math.sin(el) * Math.sin(az);
    const upY = Math.cos(el);
    const upZ = -Math.sin(el) * Math.cos(az);
    // Axe horizontal : perpendiculaire à la direction de vue, dans le plan.
    const rightX = Math.cos(az);
    const rightZ = -Math.sin(az);

    /* familyBase et non FAMILY_CENTERS : en portrait l'atlas a pivoté de 90
       degrés dans le plan de l'écran, et mesurer les positions d'origine
       cadrait le fantôme de la version paysage. */
    let halfV = 1;
    let halfH = 1;
    familyBase.forEach((c, i) => {
      const dx = c.x - ATLAS_CENTER[0];
      const dy = c.y - ATLAS_CENTER[1];
      const dz = c.z - ATLAS_CENTER[2];
      const r = STRUCTURES[i]?.compactRadius ?? 6;
      halfV = Math.max(halfV, Math.abs(dx * upX + dy * upY + dz * upZ) + r);
      halfH = Math.max(halfH, Math.abs(dx * rightX + dz * rightZ) + r);
    });

    /* En portrait, c'est la largeur qui contraint : l'atlas est large et plat.
       Le remplir à 70 pour cent de la largeur laissait alors les deux tiers de
       la hauteur vides et des amas minuscules. On remplit davantage quand
       l'écran est plus haut que large. */
    const tan = Math.tan((FOV * Math.PI) / 360);
    const fillY = effectiveFill(heightPx, LABEL_PAD_Y);
    const fillX = effectiveFill(widthPx, LABEL_PAD_X);
    const byHeight = halfV / (fillY * tan);
    const byWidth = halfH / (fillX * tan * Math.max(0.2, aspect));
    analyticDiag = { byHeight, byWidth };
    return clamp(Math.max(byHeight, byWidth), MIN_DISTANCE, MAX_DISTANCE);
  };

  let atlasDistance = atlasDistanceFor(1);

  const target = atlasTarget.clone();
  const targetSmooth = target.clone();
  let azimuth = DEFAULT_AZIMUTH;
  let elevation = DEFAULT_ELEVATION;
  let distance = atlasDistance;
  let azVel = 0;
  let elVel = 0;
  let dollyVel = 0;
  const ELEVATION_LIMIT = (82 * Math.PI) / 180;

  // ------------------------------------------------------- état déploiement

  const deployStart = new Float32Array(FAMILIES.length).fill(-1e9);
  const deployDir = new Int8Array(FAMILIES.length); // 1 ouverture, -1 fermeture
  const familyProgress = new Float32Array(FAMILIES.length);
  let openIndex = -1;
  let nearestIndex = 0;
  let nearestDist = 0;

  /* Trois niveaux de descente. Le niveau ne change jamais sans vol de caméra :
     on ne doit pas pouvoir se retrouver ailleurs sans avoir vu le trajet. */
  type Level = 'atlas' | 'family' | 'genre';
  let level: Level = 'atlas';
  let activeFamily = -1;
  /* Chemin de descente : Atlas puis famille puis genre puis sous-genre. Le fil
     d'Ariane en est la lecture directe, et chaque clic le recalcule depuis la
     racine, donc il ne peut jamais mentir. */
  let genrePath: number[] = [];
  let activeGenre = -1;

  // Animation de descente, distincte de la diffusion de famille.
  let focusStart = -1e9;
  let focusIndex = -1;
  let focusDir = 0; // 1 on descend, -1 on remonte
  const FOCUS_MS = 400;
  const FOCUS_DELAY_MS = 45;

  // Vol de caméra : cible et distance interpolées, easing doux.
  const flyFrom = new Vector3();
  const flyTo = new Vector3();
  let flyFromDist = 0;
  let flyToDist = 0;
  let flyStart = -1e9;
  let flying = false;
  const FLY_MS = 850;

  // Sortie douce cubique : part vite, se pose lentement, aucun rebond.
  const easeInOut = (t: number): number => 1 - Math.pow(1 - t, 3);

  /* Cadrage serré. Le facteur précédent, 1.7, laissait l'amas occuper à peine
     un quart de l'écran : six labels ne pouvaient pas y tenir sans se marcher
     dessus, et l'évitement de collision en supprimait la moitié. Le vrai levier
     de lisibilité était le cadrage, pas la largeur des plaques. */
  /* Le cadrage tient dans les DEUX axes. Le champ de vision de la caméra est
     vertical : en fenêtre plus haute que large, une sphère cadrée sur la
     hauteur déborde des côtés. Même correction que le cadrage de l'atlas. */
  const frameDistance = (radius: number): number => {
    const tan = Math.tan((FOV * Math.PI) / 360);
    const byHeight = (radius * 1.12) / tan;
    const byWidth = (radius * 1.12) / (tan * Math.max(0.2, camera.aspect));
    return clamp(Math.max(byHeight, byWidth), MIN_DISTANCE, MAX_DISTANCE);
  };

  const startFly = (to: Vector3, dist: number, now: number): void => {
    cameraAtDefault = false;
    if (reducedMotion) {
      targetSmooth.copy(to);
      target.copy(to);
      distance = dist;
      applyCamera();
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

  const emitNav = (): void => {
    const fam = activeFamily >= 0 ? FAMILIES[activeFamily] : undefined;
    const gen = activeGenre >= 0 ? slotsData[activeGenre] : undefined;
    onNavigate({
      level,
      familyIndex: activeFamily,
      familyLabel: fam?.label ?? '',
      genreIndex: activeGenre,
      genreLabel: gen?.label ?? '',
      genreHasChildren: (gen?.children.length ?? 0) > 0,
      path: genrePath.map((gi) => ({ index: gi, label: slotsData[gi]?.label ?? '' }))
    });
  };

  /* Un noeud descend-il du noeud focalisé ? Profondeur maximale de 4, donc la
     remontée de parents est négligeable, et ça évite de matérialiser des
     ensembles à chaque image. */
  const isDescendant = (globalIndex: number, ancestor: number): boolean => {
    if (ancestor < 0) return false;
    const anc = slotsData[ancestor];
    if (!anc) return false;
    const base = familyOffset[anc.family] ?? 0;
    let cursor: number = globalIndex;
    let guard = 0;
    while (cursor >= 0 && guard < 8) {
      if (cursor === ancestor) return true;
      const node: Slot | undefined = slotsData[cursor];
      if (!node || node.family !== anc.family) return false;
      cursor = node.parent >= 0 ? base + node.parent : -1;
      guard += 1;
    }
    return false;
  };

  const setDeploy = (familyIndex: number, open: boolean, now: number): void => {
    if (familyIndex < 0) return;
    const dir = open ? 1 : -1;

    /* Une seule famille déployée à la fois. Au niveau Atlas, toutes sont
       compactes ; ouvrir l'une referme l'autre, sans exception. */
    if (open) {
      for (let i = 0; i < FAMILIES.length; i += 1) {
        if (i !== familyIndex && deployDir[i] === 1) {
          deployDir[i] = -1;
          deployStart[i] = now;
        }
      }
    }

    if (deployDir[familyIndex] === dir) return;
    deployDir[familyIndex] = dir;
    deployStart[familyIndex] = now;
    if (open) openIndex = familyIndex;
    else if (openIndex === familyIndex) openIndex = -1;
  };

  /* Avancement d'un genre : la cascade descend le long de la filiation, chaque
     niveau décalé de quelques dizaines de millisecondes. À la fermeture, la
     cascade s'inverse, les plus profonds partent en premier. */
  /* UN SEUL NIVEAU DÉPLOYÉ À LA FOIS (ADR-056) : un satellite de deuxième
     génération et plus ne se déploie que si son PARENT est sur le chemin
     ouvert (le genre cliqué et sa lignée). Sinon il reste replié sur son
     ancêtre, signalé par l'anneau du parent et le compteur de la fiche.
     C'est ce qui rend le nommage de 100 % des enfants directs possible :
     l'écran ne contient plus jamais tout l'arbre d'une famille. */
  const parentExpanded = (slot: Slot, globalIndex: number): boolean => {
    if (slot.depth <= 1 || slot.parent < 0) return true;
    /* Un genre SUR le chemin ouvert reste toujours déployé : sinon le genre
       cliqué lui-même disparaissait quand il vivait en profondeur 2 ou plus
       (mesuré : Drum and Bass absent de son propre niveau). */
    if (globalIndex === activeGenre || genrePath.includes(globalIndex)) return true;
    const pg = (familyOffset[slot.family] ?? 0) + slot.parent;
    return pg === activeGenre || genrePath.includes(pg);
  };
  const expandAmount = new Float32Array(TOTAL_GENRES);

  const genreProgress = (slot: Slot, now: number): number => {
    if (reducedMotion) return deployDir[slot.family] === 1 ? 1 : 0;

    const dir = deployDir[slot.family] ?? 0;
    const start = deployStart[slot.family] ?? -1e9;
    const opening = dir === 1;
    const duration = opening ? OPEN_MS : CLOSE_MS;
    const delay = (opening ? OPEN_DELAY_MS : CLOSE_DELAY_MS) * slot.depth;
    const elapsed = now - start - (opening ? delay : 0);

    const raw = clamp(elapsed / duration, 0, 1);
    if (opening) return backOut(raw);
    return 1 - backOut(clamp((now - start - CLOSE_DELAY_MS * (6 - Math.min(slot.depth, 6))) / duration, 0, 1));
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

    // Le cadrage de l'atlas dépend du format de la fenêtre : on le refait,
    // et le portrait fait pivoter l'atlas pour occuper la hauteur.
    const portrait = camera.aspect < 0.9;
    applyOrientation(portrait);
    /* Drapeau EXPLICITE et non heuristique : deux versions ont essayé de
       reconnaître le cadrage par défaut en comparant des distances, et les
       deux ont échoué sur l'ordre d'initialisation. La caméra sait si elle
       est au cadrage par défaut ; l'utilisateur l'en sort en zoomant ou en
       volant, recentrer l'y ramène. */
    atlasDistance = atlasDistanceFor(camera.aspect, width, height);

    /* Étalement vertical en portrait : on étire l'axe vertical jusqu'à ce que
       la hauteur contraigne autant que la largeur. Le rapport byWidth/byHeight
       est exactement ce facteur, borné pour ne pas produire une colonne
       filiforme sur les écrans très hauts. */
    if (portrait && analyticDiag) {
      const stretch = clamp(
        analyticDiag.byWidth / Math.max(1, analyticDiag.byHeight),
        1,
        2.2
      );
      if (stretch > 1.02) {
        applyOrientation(portrait, stretch);
        atlasDistance = atlasDistanceFor(camera.aspect, width, height);
      }
    }

    /* Correction MESURÉE : les axes analytiques accumulent les approximations
       (pivot portrait, relief, rayons). On pose la caméra, on projette
       réellement les quatorze familles avec leur rayon, et on corrige la
       distance d'un facteur en une itération : la projection est quasi
       linéaire en profondeur, une passe suffit.

       Seulement quand le moteur est prêt : au premier resize de
       l'initialisation, la caméra n'existe pas encore plus bas dans le
       fichier, et trois versions de ce code ont trébuché sur cette zone
       morte temporelle. */
    if (engineReady) {
      const savedDistance = distance;
      const savedTarget = targetSmooth.clone();
      distance = atlasDistance;
      targetSmooth.set(...ATLAS_CENTER);
      applyCamera();

      const fillY = effectiveFill(height, LABEL_PAD_Y);
      const fillX = effectiveFill(width, LABEL_PAD_X);
      let maxDx = 0;
      let maxDy = 0;
      const probe = new Vector3();
      familyBase.forEach((c, i) => {
        const r = STRUCTURES[i]?.compactRadius ?? 6;
        for (const [ox, oy] of [[r, 0], [-r, 0], [0, r], [0, -r]] as const) {
          probe.set(c.x + ox, c.y + oy, c.z).project(camera);
          maxDx = Math.max(maxDx, Math.abs(probe.x));
          maxDy = Math.max(maxDy, Math.abs(probe.y));
        }
      });
      const over = Math.max(maxDx / fillX, maxDy / fillY);
      framingDiag = { analytic: atlasDistance, over, maxDx, maxDy, fillX, fillY };
      if (Number.isFinite(over) && over > 0.01) {
        atlasDistance = clamp(atlasDistance * over, MIN_DISTANCE, MAX_DISTANCE);
      }
      distance = savedDistance;
      targetSmooth.copy(savedTarget);
      applyCamera();
    }

    if (cameraAtDefault) {
      distance = atlasDistance;
      targetSmooth.set(...ATLAS_CENTER);
      target.copy(targetSmooth);
    }
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

  /* Molette : avancer et reculer. Constantes DIVISÉES PAR DEUX (verdict :
     trop nerveux, on perd le contrôle). */
  const onWheel = (event: WheelEvent): void => {
    cameraAtDefault = false;
    releaseFrameLock();
    event.preventDefault();
    if (suspended) return;
    const k = event.ctrlKey ? 0.015 : 0.013;
    dollyVel += event.deltaY * k;
    // Un glissement horizontal franc au trackpad fait quand même tourner.
    if (!event.ctrlKey && Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.5) {
      dollyVel -= event.deltaY * k;
      azVel -= event.deltaX * 0.0011;
    }
  };

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let moved = 0;
  let suspended = false;
  let interacted = false;

  /* L'INTRO : la naissance des familles. Expansion RADIALE depuis le centre,
     jamais un déroulé. Chaque famille apparaît en point à sa position finale
     atteinte en s'éloignant du centre, éclate au-delà de sa taille, se
     stabilise, et le lien se trace depuis la famille dont elle descend.

     L'ordre est chronologique et VÉRIFIÉ CONTRE LE CORPUS : les notes datent
     l'Ambient de 1978, Music for Airports, donc il naît avant l'Electro (1982)
     et la House (1984), contrairement à la liste de départ. Le reste suit.

     6 secondes, 350 ms par famille, chevauchement par pop de 700 ms. Aucune
     caméra : elle est au cadrage par défaut du début à la fin, l'intro montre
     cet espace en train de se peupler. Interruptible par n'importe quel clic
     ou touche, jouée une fois, coupée par prefers-reduced-motion. */
  const INTRO_ORDER = [
    'roots', 'disco', 'industrial', 'ambient', 'electro', 'house', 'techno',
    'breaks', 'trance', 'hardcore', 'minimal', 'downtempo', 'psy', 'bass'
  ].map((id) => FAMILIES.findIndex((f) => f.id === id));
  const INTRO_STEP_MS = 350;
  const INTRO_POP_MS = 700;

  let introActive = false;
  let introStart = 0;
  let introDone: (() => void) | null = null;
  const baseRadii = Float32Array.from(sphereRadii);
  /* Rayon de référence pour lier la taille des labels à celle des sphères. */
  const genreRadiusMax = Math.max(1e-3, ...Array.from(baseRadii));

  /* ANIMATIONS SOBRES : respiration 2 %, phase par noeud ; survol +8 % en
     150 ms environ. Coupé par prefers-reduced-motion. */
  const breathPhase = Float32Array.from({ length: TOTAL_GENRES }, (_, i) => (i * 2.399963) % 6.2832);
  const hoverAmount = new Float32Array(TOTAL_GENRES);

  const introBirth = (fi: number, now: number): number => {
    const rank = INTRO_ORDER.indexOf(fi);
    if (rank < 0) return 1;
    return clamp((now - introStart - rank * INTRO_STEP_MS) / INTRO_POP_MS, 0, 1);
  };

  /** Point, éclatement au-delà de la taille finale, stabilisation. */
  const popScale = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : backOut(t) * (1 + 0.3 * Math.sin(t * Math.PI)));

  const finishIntro = (): void => {
    if (!introActive) return;
    introActive = false;
    sphereRadii.set(baseRadii);
    sphereRadiusAttr.needsUpdate = true;
    try { localStorage.setItem('sonaa-intro-seen', '1'); } catch { /* stockage privé */ }
    introDone?.();
    introDone = null;
  };

  const playIntro = (onEnd?: () => void): void => {
    if (reducedMotion) { onEnd?.(); return; }
    introDone = onEnd ?? null;
    introStart = performance.now();
    introActive = true;
  };

  const onFirstInteraction = (): void => {
    if (introActive) finishIntro();
    if (interacted) return;
    interacted = true;
    document.documentElement.dataset['atlasTouched'] = '1';
  };

  /* --- Gestes tactiles : le doigt commande, la carte suit -----------------

     Le glissement et le pincement sont en SUIVI DIRECT : la carte bouge avec
     le doigt pendant le geste, l'inertie n'existe qu'au relâchement, courte
     et vite amortie. L'ancien modèle accumulait de la vélocité à chaque
     mouvement : la carte dépassait le doigt, c'était nerveux (verdict).

     Le pincement dolly autour du MILIEU des deux doigts : le point du monde
     sous ce milieu reste sous ce milieu, comme le zoom d'une photo. */
  const activePointers = new Map<number, { x: number; y: number }>();
  let pinchDist = 0;
  let pinchLogRate = 0; // ln(distance)/ms récent, pour l'inertie au relâchement
  let pinchLastT = 0;
  const DRAG_K = 0.013; // rad/px, la moitié du gain effectif d'avant
  let dragVX = 0; // vitesse lissée du doigt, px/événement, pour l'inertie
  let dragVY = 0;

  /* Double tap (tactile seulement) : zoom sur le point touché, second double
     tap revient au cadrage d'avant. Le tap simple est retardé de 280 ms pour
     laisser sa chance au second tap, comme sur une carte native. */
  let lastTapT = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  let tapTimer = 0;
  let tapZoomPrev: { target: Vector3; distance: number } | null = null;

  const pinchAnchor = new Vector3();
  const pinchRay = new Vector3();

  /** Point du monde sous un point écran, sur le plan de la cible face caméra. */
  const worldUnder = (px: number, py: number, out: Vector3): Vector3 => {
    pinchRay.set((px / width) * 2 - 1, -(py / height) * 2 + 1, 0.5).unproject(camera);
    pinchRay.sub(camera.position).normalize();
    const viewDir = out.copy(targetSmooth).sub(camera.position);
    const depth = viewDir.length();
    viewDir.normalize();
    const along = pinchRay.dot(viewDir);
    return out.copy(camera.position).addScaledVector(pinchRay, along > 0.0001 ? depth / along : depth);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (suspended) return;
    onFirstInteraction();
    releaseFrameLock();
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    /* Capture blindée : un pointeur synthétique (tests) la fait jeter, et
       l'exception coupait l'initialisation du geste. */
    try { canvas.setPointerCapture(event.pointerId); } catch { /* test */ }
    if (activePointers.size === 2) {
      // Deux doigts : le glissement s'arrête, le pincement commence.
      dragging = false;
      const [a, b] = [...activePointers.values()];
      if (a && b) pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      pinchLogRate = 0;
      pinchLastT = performance.now();
      return;
    }
    dragging = true;
    moved = 0;
    dragVX = 0;
    dragVY = 0;
    lastX = event.clientX;
    lastY = event.clientY;
  };

  /* Survol : le noeud sous le curseur, son parent et ses enfants directs
     restent lisibles, le reste s'efface. Réutilise la projection déjà faite
     pour le clic, donc coût nul. */
  const onHover = (event: PointerEvent): void => {
    if (suspended) return;
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    let best = -1;
    let bestD = 34;
    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      if ((projected[i * 3 + 2] ?? 2) > 1) continue;
      const d = Math.hypot(px - (projected[i * 3] ?? 0), py - (projected[i * 3 + 1] ?? 0));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best !== hovered) {
      hovered = best;
      lastLabelPass = 0;
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    onHover(event);
    if (suspended) return;
    const entry = activePointers.get(event.pointerId);
    if (entry) {
      entry.x = event.clientX;
      entry.y = event.clientY;
    }

    /* PINCEMENT : suivi continu, pas de paliers. La distance caméra suit le
       rapport d'écartement des doigts (sensibilité réduite de moitié par
       l'exposant), et la cible glisse pour que le point sous le milieu des
       doigts y reste. */
    if (activePointers.size >= 2) {
      const [a, b] = [...activePointers.values()];
      if (!a || !b || pinchDist <= 0) return;
      const rect = canvas.getBoundingClientRect();
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d <= 0) return;
      const factor = Math.pow(pinchDist / d, 0.55);
      const before = distance;
      distance = clamp(distance * factor, MIN_DISTANCE, MAX_DISTANCE);
      const applied = distance / before;
      const midX = (a.x + b.x) / 2 - rect.left;
      const midY = (a.y + b.y) / 2 - rect.top;
      worldUnder(midX, midY, pinchAnchor);
      // cible' = ancre + (cible - ancre) × rapport : l'ancre reste sous les doigts.
      target.sub(pinchAnchor).multiplyScalar(applied).add(pinchAnchor);
      targetSmooth.copy(target);
      const now = performance.now();
      const dt = Math.max(1, now - pinchLastT);
      pinchLogRate = pinchLogRate * 0.5 + (Math.log(applied) / dt) * 0.5;
      pinchLastT = now;
      pinchDist = d;
      flying = false;
      cameraAtDefault = false;
      return;
    }

    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    /* SUIVI DIRECT : la rotation se fait pendant le geste, pas après. */
    azimuth -= dx * DRAG_K;
    elevation = clamp(elevation + dy * DRAG_K, -ELEVATION_LIMIT, ELEVATION_LIMIT);
    dragVX = dragVX * 0.5 + dx * 0.5;
    dragVY = dragVY * 0.5 + dy * 0.5;
    lastX = event.clientX;
    lastY = event.clientY;
  };

  const projected = new Float32Array(TOTAL_GENRES * 3); // sx, sy, depth
  const scratch = new Vector3();

  /* Niveau unique : à l'ouverture on cadre la COURONNE (fondateur +
     première génération), plus l'arbre complet — il ne se déploie plus
     jamais en entier. Marge de 3 unités pour les noms. */
  const familyFrameRadius = (fi: number): number => (STRUCTURES[fi]?.crownRadius ?? 12) + 3;

  /* Rayon de cadrage d'un genre : lui et ses enfants directs. */
  const genreFrameRadius = (globalIndex: number): number => {
    const slot = slotsData[globalIndex];
    if (!slot) return 6;
    const base = familyOffset[slot.family] ?? 0;
    let r = sphereRadii[globalIndex] ?? 2;
    for (const child of slot.children) {
      const cs = slotsData[base + child];
      if (!cs) continue;
      /* Positions DÉPLOYÉES et non courantes : au moment du clic les
         enfants sont encore repliés sur leur parent, et mesurer là donnait
         un rayon minuscule — la caméra se collait au genre et aucun enfant
         n'était nommé (mesuré : 0 sur 6 pour Drum and Bass). */
      r = Math.max(r, slot.deployed.distanceTo(cs.deployed) + (sphereRadii[base + child] ?? 2));
    }
    return r * 1.35;
  };

  /* Cadrer la famille entière SANS toucher à la sélection : sert au vol du
     clic sur un genre, et au recadrage quand la feuille mobile ou la colonne
     changent la zone visible (le cadrage se recalcule sur le viewport réel). */
  const frameFamily = (fi: number, now: number): void => {
    const c = familyCenters[fi];
    const dc = STRUCTURES[fi]?.deployedCenter ?? [0, 0, 0];
    if (c) startFly(new Vector3(c.x + dc[0], c.y + dc[1], c.z + dc[2]), frameDistance(familyFrameRadius(fi)), now);
  };

  const selectFamily = (fi: number, now: number): void => {
    tapZoomPrev = null;
    frameLock = -1;
    if (activeFamily >= 0 && activeFamily !== fi) setDeploy(activeFamily, false, now);
    activeFamily = fi;
    activeGenre = -1;
    genrePath = [];
    focusIndex = -1;
    focusDir = -1;
    focusStart = now;
    level = 'family';
    setDeploy(fi, true, now);
    const c = familyCenters[fi];
    const dc = STRUCTURES[fi]?.deployedCenter ?? [0, 0, 0];
    // La caméra vise le centroïde du nuage déployé, pas la racine : la
    // couronne pousse vers le haut et cadrer le pied coupait la tête.
    if (c) startFly(new Vector3(c.x + dc[0], c.y + dc[1], c.z + dc[2]), frameDistance(familyFrameRadius(fi)), now);
    emitNav();
  };

  /* Ouvrir le panneau, c'est voler jusqu'à la sphère et poser la plaque
     devant. La taille de la plaque est fixée en unités monde à l'ouverture,
     pas recalculée à chaque image : c'est un objet de la scène, il doit
     grandir quand on avance, pas rester collé à l'écran. */
  const openPanel = (familyIndex: number, genreLocal: number): void => {
    const base = familyOffset[familyIndex] ?? 0;
    const globalIndex = base + genreLocal;
    const slot = slotsData[globalIndex];
    if (!slot) return;
    panelSlot = globalIndex;
    const now = performance.now();
    if (activeFamily !== slot.family) selectFamily(slot.family, now);
    onTracks(familyIndex, genreLocal);
    onPanel({ familyIndex, genreLocal });
  };

  const closePanel = (): void => {
    if (panelSlot < 0) return;
    panelSlot = -1;
    onPanel(null);
  };

  /* LE CLIC OUVRE DIRECTEMENT LES TRACKS (mission clic direct). Plus de
     fiche flottante : la colonne s'ouvre, prête à jouer. Un genre à dérivés
     déploie son sous-arbre sur la carte EN MÊME TEMPS : ouvrir les tracks
     n'empêche jamais de descendre. */
  const selectGenre = (globalIndex: number, now: number): void => {
    const slot = slotsData[globalIndex];
    if (!slot) return;

    const base = familyOffset[slot.family] ?? 0;
    genrePath = pathToGenre(slot.family, slot.local).map((local) => base + local);
    activeGenre = globalIndex;
    level = 'genre';
    focusIndex = globalIndex;
    focusDir = 1;
    focusStart = now;

    /* NIVEAU UNIQUE (ADR-056) : cliquer un genre à dérivés descend d'un
       cran — ses enfants se déploient et la caméra cadre CE sous-anneau,
       la génération du dessus se resserre et s'estompe (grammaire de focus
       existante). Une feuille garde le cadrage du niveau où elle vit. */
    if (slot.children.length > 0) {
      frameLock = globalIndex;
      startFly(slot.world, frameDistance(genreFrameRadius(globalIndex) + 2.5), now);
    } else {
      frameLock = -1;
    }
    emitNav();
    openPanel(slot.family, slot.local);
  };

  /* Aller sur un genre nommé, depuis la recherche ou depuis la fiche.

     Sa famille doit d'abord se déployer : tant qu'elle est compacte, la sphère
     visée est encore rangée dans l'amas et le cadrage calculé sur cette
     position colle la caméra à quelques unités du noeud. On mémorise donc la
     cible et la boucle de rendu la consomme quand la diffusion est faite. */
  let pendingGenre = -1;

  /* PRIORITÉ TRANCHÉE (ADR-057) : le VOL DE DESCENTE gagne toujours. Le
     suivi de cible ne s'applique QUE hors vol, et il reprend LA NOUVELLE
     cible : le verrou nomme le niveau courant, et la caméra converge vers
     son cadrage recalculé à chaque image — les enfants s'écartent après le
     clic, un cadrage figé au moment du clic collait la caméra au genre.
     Toute interaction lâche le verrou : la main passe avant la machine. */
  let frameLock = -1;
  const releaseFrameLock = (): void => {
    frameLock = -1;
  };

  const goToGenre = (familyIndex: number, genreLocal: number): void => {
    const now = performance.now();
    const base = familyOffset[familyIndex] ?? 0;
    const target = base + genreLocal;

    if (activeFamily === familyIndex && (familyProgress[familyIndex] ?? 0) > 0.9) {
      selectGenre(target, now);
      return;
    }
    selectFamily(familyIndex, now);
    pendingGenre = target;
  };

  const consumePendingGenre = (now: number): void => {
    if (pendingGenre < 0) return;
    const slot = slotsData[pendingGenre];
    if (!slot) {
      pendingGenre = -1;
      return;
    }
    if ((familyProgress[slot.family] ?? 0) < 0.9) return;
    const target = pendingGenre;
    pendingGenre = -1;
    selectGenre(target, now);
  };

  const goUp = (): void => {
    const now = performance.now();
    if (level === 'genre') {
      /* On remonte d'un cran dans le chemin, pas directement à la famille :
         Atlas > Bass > UK Garage > 2-step doit revenir sur UK Garage. */
      genrePath = genrePath.slice(0, -1);
      const parent = genrePath[genrePath.length - 1];
      focusDir = -1;
      focusStart = now;

      if (parent !== undefined) {
        activeGenre = parent;
        focusIndex = parent;
        focusDir = 1;
        const slot = slotsData[parent];
        if (slot) startFly(slot.world, frameDistance(genreFrameRadius(parent)), now);
        emitNav();
        return;
      }

      activeGenre = -1;
      focusIndex = -1;
      level = 'family';
      const c = activeFamily >= 0 ? familyCenters[activeFamily] : undefined;
      const dc = STRUCTURES[activeFamily]?.deployedCenter ?? [0, 0, 0];
      if (c) startFly(new Vector3(c.x + dc[0], c.y + dc[1], c.z + dc[2]), frameDistance(familyFrameRadius(activeFamily)), now);
    } else if (level === 'family') {
      if (activeFamily >= 0) setDeploy(activeFamily, false, now);
      activeFamily = -1;
      activeGenre = -1;
      genrePath = [];
      focusIndex = -1;
      focusDir = -1;
      focusStart = now;
      level = 'atlas';
      startFly(atlasTarget, atlasDistance, now);
      cameraAtDefault = true;
    }
    emitNav();
  };

  const performTapAction = (px: number, py: number): void => {
    let best = -1;
    let bestD = 44;
    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      if ((projected[i * 3 + 2] ?? 2) > 1) continue;
      const d = Math.hypot(px - (projected[i * 3] ?? 0), py - (projected[i * 3 + 1] ?? 0));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    const now = performance.now();
    const slot = best >= 0 ? slotsData[best] : undefined;
    if (!slot) {
      // Clic dans le vide : on remonte d'un niveau.
      goUp();
    } else if (level === 'atlas' || slot.family !== activeFamily) {
      selectFamily(slot.family, now);
    } else {
      selectGenre(best, now);
    }
  };

  const doubleTapZoom = (px: number, py: number): void => {
    const now = performance.now();
    if (tapZoomPrev) {
      // Second double tap : retour au cadrage d'avant.
      startFly(tapZoomPrev.target, tapZoomPrev.distance, now);
      tapZoomPrev = null;
      return;
    }
    tapZoomPrev = { target: target.clone(), distance };
    worldUnder(px, py, pinchAnchor);
    startFly(pinchAnchor.clone(), Math.max(MIN_DISTANCE, distance * 0.45), now);
  };

  const onPointerUp = (event: PointerEvent): void => {
    const wasPinching = pinchDist > 0 && activePointers.size >= 2;
    activePointers.delete(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);

    if (wasPinching && activePointers.size < 2) {
      /* Fin du pincement : inertie légère dans le sens du geste, l'arrêt
         doux vient de l'amortissement de la boucle de rendu. */
      pinchDist = 0;
      dollyVel = clamp((pinchLogRate * (1000 / 60)) / 0.02, -6, 6) * 0.6;
      pinchLogRate = 0;
      // Le doigt restant reprend un glissement propre, sans saut ni clic.
      const rest = [...activePointers.values()][0];
      if (rest) {
        dragging = true;
        lastX = rest.x;
        lastY = rest.y;
        moved = 999;
        dragVX = 0;
        dragVY = 0;
      }
      return;
    }

    if (dragging && moved < 5 && !suspended) {
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      if (event.pointerType === 'touch') {
        const now = performance.now();
        if (now - lastTapT < 300 && Math.hypot(px - lastTapX, py - lastTapY) < 40) {
          window.clearTimeout(tapTimer);
          tapTimer = 0;
          lastTapT = 0;
          doubleTapZoom(px, py);
        } else {
          lastTapT = now;
          lastTapX = px;
          lastTapY = py;
          window.clearTimeout(tapTimer);
          tapTimer = window.setTimeout(() => performTapAction(px, py), 280);
        }
      } else {
        performTapAction(px, py);
      }
    } else if (dragging && moved >= 5) {
      /* Inertie de glissement : courte, vite amortie. */
      azVel = -dragVX * DRAG_K * 0.35;
      elVel = dragVY * DRAG_K * 0.35;
    }
    dragging = false;
  };

  /* Clavier : flèches pour tourner, plus et moins pour zoomer, 0 pour
     recentrer, Échap pour remonter. La navigation ne dépend pas d'un geste
     trackpad que personne ne devine. */
  const onKey = (event: KeyboardEvent): void => {
    if (introActive) { finishIntro(); return; }
    if (event.target instanceof HTMLInputElement) return;
    switch (event.key) {
      case 'ArrowLeft': azVel -= 0.045; break;
      case 'ArrowRight': azVel += 0.045; break;
      case 'ArrowUp': elVel += 0.035; break;
      case 'ArrowDown': elVel -= 0.035; break;
      case '+': case '=': dollyVel -= 5.5; break;
      case '-': case '_': dollyVel += 5.5; break;
      case '0': releaseFrameLock(); recenter(); break;
      /* Échap appartient au panneau tant qu'il est ouvert : c'est la couche
         DOM qui le ferme puis remonte, sinon on remonterait deux fois. */
      case 'Escape': if (panelSlot < 0) goUp(); break;
      default: return;
    }
    event.preventDefault();
    onFirstInteraction();
  };
  window.addEventListener('keydown', onKey);

  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  /* Recentrer, c'est revenir à l'atlas, pas seulement replacer la caméra.
     Sans remise à zéro de la navigation, le fil d'Ariane continuait d'annoncer
     une famille sélectionnée qu'on ne voyait plus. */
  const recenter = (): void => {
    cameraAtDefault = true;
    tapZoomPrev = null;
    pinchDist = 0;
    closePanel();
    target.copy(atlasTarget);
    targetSmooth.copy(atlasTarget);
    distance = atlasDistance;
    azVel = 0;
    elVel = 0;
    dollyVel = 0;
    for (let i = 0; i < FAMILIES.length; i += 1) setDeploy(i, false, performance.now());
    activeFamily = -1;
    activeGenre = -1;
    genrePath = [];
    focusIndex = -1;
    focusDir = -1;
    focusStart = performance.now();
    level = 'atlas';
    emitNav();
  };

  // ------------------------------------------------------------- labels

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
    el.className = 'atlas-label';
    el.style.transform = 'translate3d(-9999px,-9999px,0)';
    labelLayer.appendChild(el);
    labelSlots.push({ el, key: '', x: -9999, y: -9999, px: 14, opacity: 0, visible: false });
  }

  const touch = window.matchMedia('(pointer: coarse), (max-width: 767px)').matches;
  const labelRules = touch ? MOBILE : DESKTOP;

  let labelCpuAccum = 0;
  let labelCpuFrames = 0;
  let lastLabelPass = 0;
  /* Instantané en lecture seule de la dernière passe de placement, pour
     verify:visual : les boîtes que l'arbitrage a réellement testées, à
     confronter aux boîtes DOM mesurées. */
  let lastPlacedSnapshot: {
    key: string;
    text: string;
    sx: number;
    sy: number;
    w: number;
    h: number;
    px: number;
    opacity: number;
  }[] = [];
  let labelsShown = 0;
  let genreLabelsShown = 0;
  let hovered = -1;

  interface Candidate {
    key: string;
    text: string;
    sx: number;
    sy: number;
    depth: number;
    kind: 'family' | 'genre';
    /** Index global de la sphère, ou -1 pour un label de famille. */
    slot: number;
    /** Jamais masqué par une collision. */
    pinned: boolean;
    opacity: number;
    px: number;
    w: number;
    h: number;
  }

  const candidates: Candidate[] = [];
  const placed: Candidate[] = [];

  /* Largeur RÉELLE du texte, mesurée avec la fonte chargée : l'estimation
     au glyphe moyen sous-estimait largement les capitales espacées des
     familles, et des noms se chevauchaient malgré le filet. Mesure canvas
     2D, déterministe à fonte égale ; l'interlettrage s'ajoute à la main. */
  const measureCtx = document.createElement('canvas').getContext('2d');
  const textWidth = (text: string, px: number, kind: string): number => {
    const upper = kind !== 'genre';
    if (!measureCtx) return text.length * px * (upper ? 0.85 : 0.58) + px * 0.4;
    measureCtx.font = `${upper ? 700 : 600} ${px}px Inter, sans-serif`;
    let w = measureCtx.measureText(upper ? text.toUpperCase() : text).width;
    w += text.length * px * (upper ? 0.14 : 0.01);
    // +8 et non +6 : le rendu sous-pixel laissait une paire se mordre de
    // 3 px sous un azimut sur trente-six (mesuré par verify:visual).
    return w + 8;
  };

/* Tolérance de chevauchement : deux plaques peuvent se toucher sur 4 pixels
   avant qu'on masque la plus lointaine. Sans elle, l'évitement est si strict
   qu'il supprime des labels qui se frôlent à peine. */
/* 1 px et non 4 : avec les noms toujours visibles, la tolérance de 4 px
   laissait des paires se mordre visiblement. Se toucher, oui ; se
   recouvrir, jamais. */
const OVERLAP_TOLERANCE = 1;

  const overlaps = (a: Candidate, b: Candidate): boolean => {
    const t = OVERLAP_TOLERANCE;
    return (
      a.sx + t < b.sx + b.w &&
      a.sx + a.w - t > b.sx &&
      a.sy + t < b.sy + b.h &&
      a.sy + a.h - t > b.sy
    );
  };

  const projectLabels = (now: number): void => {
    if (now - lastLabelPass < 33) return;
    lastLabelPass = now;
    const start = performance.now();

    candidates.length = 0;
    placed.length = 0;
    const halfW = width / 2;
    const halfH = height / 2;

    let nearest = Infinity;

    const add = (
      key: string,
      text: string,
      world: Vector3,
      kind: 'family' | 'genre',
      pinned: boolean,
      opacityScale: number,
      slot = -1
    ): void => {
      scratch.copy(world).project(camera);
      if (scratch.z > 1) return;
      const sx = scratch.x * halfW + halfW;
      const sy = -scratch.y * halfH + halfH;
      if (sx < -200 || sx > width + 200 || sy < -80 || sy > height + 80) return;
      /* Bande haute réservée au fil d'Ariane, bande basse aux contrôles et à
         la ligne d'aide : un label qui s'y place se superpose à du texte
         d'interface. */
      if (sy < CHROME_TOP || sy > height - CHROME_BOTTOM) {
        return;
      }

      const depth = camera.position.distanceTo(world);
      nearest = Math.min(nearest, depth);

      /* Compensation de distance, bornée. La formule seule donnerait 5 px au
         loin et 60 px au premier plan : le plancher et le plafond sont ce qui
         rend l'ensemble lisible à tous les zooms. */
      /* Les noms de familles sont plus petits que les noms de genres au niveau
         Atlas : sinon le texte fait la largeur de l'amas qu'il désigne. Ils
         grandissent normalement quand on approche. */
      const isAtlasFamily = kind === 'family' && level === 'atlas';
      const raw = (1500 / Math.max(depth, 1)) * (isAtlasFamily ? 0.72 : 1);
      /* GENRES RÉDUITS de ~35 % et LIÉS À LEUR SPHÈRE (verdict : le texte
         dominait la carte) : un satellite lointain porte un nom plus petit
         qu'un fondateur. Racine carrée pour ne pas écraser les petits.
         Les familles gardent leur taille : l'écart de niveaux se lit. */
      const px =
        kind === 'genre'
          ? clamp(
              raw * 0.65 * (0.72 + 0.33 * Math.sqrt((baseRadii[slot] ?? 1) / genreRadiusMax)),
              labelRules.floorPx,
              LABEL_PX_CEILING
            )
          : clamp(raw, isAtlasFamily ? 10 : labelRules.floorPx, LABEL_PX_CEILING);
      const w = textWidth(text, px, kind);

      /* Écran étroit : le nom de famille passe DESSOUS la sphère et centré.
         Ce décalage vivait dans le CSS (translate -50% 1.35rem sur
         data-major) et l'arbitrage n'en savait rien : la boîte testée
         n'était pas la boîte affichée, et des paires famille/genre se
         mordaient de 12 px à 426 px de large (mesuré par verify:visual).
         Le décalage se fait ICI, avant l'arbitrage : la boîte testée est la
         boîte rendue, par construction. Même seuil que le gabarit mobile. */
      let fx = sx;
      let fy = sy;
      /* LABELS DE GENRES POSÉS VERS L'EXTÉRIEUR DE LEUR ANNEAU (ADR-056) :
         centrés sur la sphère, les huit noms d'une couronne se battaient au
         centre contre le fondateur et six sur huit tombaient (mesuré). En
         les repoussant radialement depuis le centre de leur système, leur
         écart angulaire les sépare de lui-même. Le décalage vaut le rayon
         projeté de la sphère plus une demi-boîte. */
      if (kind === 'genre' && slot >= 0) {
        const parentSlot = slotsData[slot];
        const anchor = parentSlot ? familyCenters[parentSlot.family] : undefined;
        if (anchor) {
          scratch.copy(anchor).project(camera);
          const ax = scratch.x * halfW + halfW;
          const ay = -scratch.y * halfH + halfH;
          let vx = sx - ax;
          let vy = sy - ay;
          const len = Math.hypot(vx, vy);
          if (len > 2) {
            vx /= len;
            vy /= len;
            const rPx = ((sphereRadii[slot] ?? 1) * halfH) / (Math.tan((FOV * Math.PI) / 360) * Math.max(1, depth));
            const push = rPx + px * 0.9;
            fx = sx + vx * push - (vx < 0 ? w : 0) - (Math.abs(vx) < 0.35 ? w / 2 : 0);
            fy = sy + vy * push;
          }
        }
      }

      /* AUCUN LABEL COUPÉ PAR LE BORD (verdict, « Breakstep » coupé à
         droite) : un genre qui déborde bascule du côté libre de sa sphère,
         puis tout label reste dans le cadre. La boîte testée par
         l'arbitrage est la boîte déplacée : rendu et test restent un. */
      if (kind === 'genre' && fx + w > width - 4) {
        fx = sx - w;
      }
      /* Le nom de la famille OUVERTE descend SOUS son système déployé :
         posé au centre, il écrasait systématiquement le FONDATEUR
         (mesuré : Chicago House et Breakbeat toujours masqués). Décalage =
         rayon déployé projeté en pixels, borné au tiers de l'écran. */
      if (kind === 'family' && activeFamily >= 0 && text === FAMILIES[activeFamily]?.label) {
        const rPx = (familyFrameRadius(activeFamily) * (height / 2)) / (Math.tan((FOV * Math.PI) / 360) * Math.max(1, depth));
        fy += Math.min(height * 0.34, rPx + 14);
        fx -= w / 2;
      } else if (kind === 'family' && width <= 700) {
        fx -= w / 2;
        fy += 21.6;
        // La boîte décalée respecte la même bande basse que l'originale.
        if (fy > height - CHROME_BOTTOM) {
          return;
        }
      }
      fy = Math.min(fy, height - CHROME_BOTTOM - 2);

      fx = Math.min(Math.max(fx, 4), Math.max(4, width - 4 - w));

      candidates.push({
        key,
        text,
        sx: fx,
        sy: fy,
        depth,
        kind,
        slot,
        pinned,
        opacity: opacityScale,
        px,
        w,
        h: px * 1.45
      });
    };

    /* Le survol ne touche JAMAIS aux labels (règle, quatrième
       signalement) : il met la sphère en valeur, rien d'autre. */

    /* PLUS AUCUNE PORTE DE ZOOM (verdict de Mika) : familles ET genres
       visibles sont toujours candidats. Le placement arbitre par
       proximité, jamais par superposition. */
    /* Plus de grands ensembles (ADR-053) : au premier affichage, les
       quatorze familles sont le premier niveau, directement nommées. */
    FAMILIES.forEach((family, fi) => {
      // Intro : le nom apparaît à l'éclatement, environ 40 % du pop, et reste.
      if (introActive && introBirth(fi, performance.now()) < 0.4) return;
      const isCurrent = fi === activeFamily;
      add(
        `f-${family.id}`,
        family.label,
        familyCenters[fi] ?? new Vector3(),
        'family',
        isCurrent,
        1
      );
    });

    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      const slot = slotsData[i];
      if (!slot) continue;
      if (introActive && introBirth(slot.family, performance.now()) < 0.75) continue;

      /* RÈGLE (durcie par Mika) : tout ce qui est VISIBLE est nommé, sans
         zoomer. NIVEAU UNIQUE (ADR-056) : un satellite de génération 2 et
         plus n'existe à l'écran que si son parent est sur le chemin ouvert
         ET que son déploiement est engagé — replié sur son ancêtre, le
         nommer écrirait un nom sur une sphère absente ET volerait la place
         d'un genre de la couronne (mesuré : Deep House posé sur la place
         de Garage House). */
      if (slot.depth >= 2 && (expandAmount[i] ?? 0) < 0.5) continue;

      const inSubtree = focusIndex >= 0 ? isDescendant(i, focusIndex) : false;
      const isPinned = i === focusIndex || inSubtree;

      /* Le label ne porte QUE le nom du genre.

         Il portait un suffixe compact, « · 3 » pour le nombre de dérivés et
         « ♪ » pour une feuille, censé dire avant le clic si l'on descend ou si
         l'on écoute. Deux raisons de le retirer. La première est qu'il se lisait
         comme une partie du nom : « Minimal Tech · 1 » a été lu « minimal-1 »,
         donc pris pour un identifiant technique resté d'un jeu de données
         factice. La seconde est qu'il n'a plus d'objet : le clic ouvre toujours
         la fiche, et c'est la fiche qui nomme les dérivés un par un, ce qui vaut
         mieux qu'un compte. L'anneau autour de la sphère porte déjà le signe. */
      add(`g-${slot.label}`, slot.label, slot.world, 'genre', isPinned, 1, i);
    }

    /* Atténuation des lointains : plus on s'approche, plus l'arrière-plan
       s'efface, pour que le premier plan gagne en contraste. */
    const fadeFar = nearest * 4 + 90;
    for (const c of candidates) {
      c.opacity *= clamp(1.15 - c.depth / fadeFar, 0, 1);
    }

    /* Placement. Les épinglés d'abord, puis les familles, puis les genres, du
       plus proche au plus lointain. En cas de collision, on masque le plus
       lointain : on ne décale JAMAIS un label, sinon il ne désigne plus rien. */
    /* Deux règles absolues, dans cet ordre.

       1. Le nom de FAMILLE passe avant tout, même avant un genre épinglé : il
          est l'ancre de lecture, il ne passe jamais sous un genre.
       2. Deux labels ne se recouvrent JAMAIS. L'épinglage donnait un passe-
          droit sur le test de chevauchement, et sur une capture « Disco » et
          « Spacesynth » se recouvraient : tous les deux épinglés par le focus,
          tous les deux dispensés du test. L'épinglage ne donne plus que la
          priorité d'ordre ; le chevauchement, lui, masque toujours. */
    /* PLACEMENT PAR NIVEAUX (ADR-045). Vérifié : la boucle gourmande
       masquait un nom parce que son voisin était passé AVANT lui, la logique
       refusée. Deux causes de masquage, seulement :
       1. chevaucher un NIVEAU SUPÉRIEUR déjà posé : la sphère plus petite
          cède à l'objet de lecture plus grand ;
       2. chevaucher un nom de MÊME niveau : LES DEUX cèdent, personne ne
          gagne par ordre d'arrivée.
       Plus d'exception : les grands ensembles ont disparu (ADR-053). */
    const levelOf = (c: Candidate): number => {
      if (c.kind === 'family') return 0;
      const slot = slotsData[c.slot];
      const base = 1 + (slot?.depth ?? 0);
      /* La famille OUVERTE est l'objet de lecture : ses genres passent
         avant ceux des familles fermées entrées dans le champ quand la
         caméra recule. C'est un niveau déclaré, pas un ordre d'arrivée. */
      return activeFamily >= 0 && slot?.family !== activeFamily ? base + 10 : base;
    };
    const maxLevel = candidates.reduce((m, c) => Math.max(m, levelOf(c)), 0);

    for (let lvl = 0; lvl <= maxLevel; lvl += 1) {
      const group = candidates.filter((c) => levelOf(c) === lvl && c.opacity >= 0.06);

      const dead = new Set<number>();
      group.forEach((c, i) => {
        if (placed.some((other) => overlaps(c, other))) dead.add(i);
      });
      for (let i = 0; i < group.length; i += 1) {
        for (let j = i + 1; j < group.length; j += 1) {
          if (dead.has(i) || dead.has(j)) continue;
          const a = group[i];
          const b = group[j];
          if (a && b && overlaps(a, b)) {
            dead.add(i);
            dead.add(j);
          }
        }
      }
      group.forEach((c, i) => {
        if (!dead.has(i) && placed.length < labelRules.maxLabels) placed.push(c);
      });
    }

    labelsShown = placed.length;
    genreLabelsShown = placed.filter((c) => c.kind === 'genre').length;
    lastPlacedSnapshot = placed.map((c) => ({
      key: c.key,
      text: c.text,
      sx: c.sx,
      sy: c.sy,
      w: c.w,
      h: c.h,
      px: c.px,
      opacity: c.opacity
    }));

    labelled.fill(0);
    for (const c of placed) {
      if (c.slot >= 0) labelled[c.slot] = 1;
    }

    for (let i = 0; i < LABEL_POOL; i += 1) {
      const ls = labelSlots[i];
      if (!ls) continue;

      const entry = placed[i];
      if (!entry) {
        if (ls.visible) {
          ls.el.style.transform = 'translate3d(-9999px,-9999px,0)';
          ls.visible = false;
        }
        continue;
      }

      if (ls.key !== entry.key) {
        ls.key = entry.key;
        ls.el.textContent = entry.text;
        ls.el.dataset['major'] = entry.kind === 'family' ? '1' : '0';
        ls.el.dataset['kind'] = entry.kind;
        ls.el.dataset['kind'] = entry.kind;
        ls.el.dataset['focus'] = entry.key === `g-${slotsData[focusIndex]?.label ?? ''}` ? '1' : '0';
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

      if (Math.abs(entry.opacity - ls.opacity) >= 0.04) {
        ls.opacity = entry.opacity;
        ls.el.style.opacity = entry.opacity.toFixed(2);
      }
    }

    labelCpuAccum += performance.now() - start;
    labelCpuFrames += 1;
  };

  /* Centres de familles dynamiques. `base` vient de la relaxation qui garantit
     la séparation à l'état compact. Quand une famille s'ouvre, les autres sont
     poussées radialement pour lui laisser la place réellement occupée par son
     déploiement, et rejoignent leur cible avec amortissement. */

  const familyTarget = familyBase.map((c) => c.clone());
  const familyCenters = familyBase.map((c) => c.clone());
  const pushDir = new Vector3();

  const updateFamilyCenters = (): void => {
    const open = openIndex;
    const progress = open >= 0 ? clamp(familyProgress[open] ?? 0, 0, 1) : 0;

    for (let i = 0; i < familyBase.length; i += 1) {
      const base = familyBase[i];
      const target = familyTarget[i];
      if (!base || !target) continue;

      if (open < 0 || i === open || progress <= 0.001) {
        target.copy(base);
      } else {
        const origin = familyBase[open];
        if (!origin) continue;
        pushDir.copy(base).sub(origin);
        const dist = pushDir.length() || 0.001;
        pushDir.divideScalar(dist);

        const needed =
          familyRadius(open, true) * progress + familyRadius(i, false) + FAMILY_MARGIN;
        target.copy(origin).addScaledVector(pushDir, Math.max(dist, needed));
      }
    }

    const k = reducedMotion ? 1 : 0.12;
    for (let i = 0; i < familyCenters.length; i += 1) {
      const c = familyCenters[i];
      const t = familyTarget[i];
      if (c && t) c.lerp(t, k);
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

  const measureLabels = (iterations = 200): number => {
    const t0 = performance.now();
    for (let i = 0; i < iterations; i += 1) {
      lastLabelPass = 0;
      projectLabels(performance.now());
    }
    return (performance.now() - t0) / iterations;
  };

  let results: AtlasResults | null = null;
  let profiling = false;

  const runProfile = async (): Promise<void> => {
    if (profiling) return;
    profiling = true;
    results = null;
    const bg = (await measureGpu({ bg: true, spheres: false, links: false })) ?? 0;
    const bs = (await measureGpu({ bg: true, spheres: true, links: false })) ?? 0;
    const all = (await measureGpu({ bg: true, spheres: true, links: true })) ?? 0;
    results = {
      backgroundMs: bg,
      spheresMs: Math.max(0, bs - bg),
      linksMs: Math.max(0, all - bs),
      totalMs: all,
      labelCpuMs: measureLabels(150)
    };
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

  const expand = new Vector3();
  const recede = new Vector3();

  const frame = (): void => {
    if (!running) return;
    requestAnimationFrame(frame);
    const now = performance.now();

    if (!reducedMotion) {
      bgUniforms.uTime.value = now / 1000;
      linkUniforms.uFlowTime.value = (now / 7000) % 1;
    }

    const friction = reducedMotion ? 0 : 0.9;
    azimuth += azVel;
    elevation = clamp(elevation + elVel, -ELEVATION_LIMIT, ELEVATION_LIMIT);
    distance = clamp(distance * Math.exp(dollyVel * 0.02), MIN_DISTANCE, MAX_DISTANCE);
    azVel *= friction;
    elVel *= friction;
    dollyVel *= friction * 0.96;

    /* Vol de caméra : on ne change jamais de niveau sans voir le trajet.
       Le vol doit se TERMINER même si l'image suivante arrive après la fin de
       l'intervalle : sinon, sur une machine lente ou un onglet en arrière-plan,
       la caméra n'atteint jamais sa destination. */
    if (flying) {
      const k = easeInOut(clamp((now - flyStart) / FLY_MS, 0, 1));
      targetSmooth.lerpVectors(flyFrom, flyTo, k);
      distance = flyFromDist + (flyToDist - flyFromDist) * k;
      target.copy(targetSmooth);
      if (k >= 1) flying = false;
    }

    /* Suivi continu quand un panneau est ouvert : la cible suit le CENTRE DE
       LA FAMILLE du genre ouvert, pas la sphère du genre (verdict : la carte
       montre la famille entière, le genre y est marqué par son halo). Les
       centres bougent pendant la relaxation du déploiement, d'où le suivi. */
    if (!flying) {
      const lock = frameLock >= 0 ? slotsData[frameLock] : undefined;
      if (lock) {
        target.copy(lock.world);
        targetSmooth.lerp(target, reducedMotion ? 1 : 0.12);
        const want = frameDistance(genreFrameRadius(frameLock) + 2.5);
        distance += (want - distance) * (reducedMotion ? 1 : 0.1);
      } else if (panelSlot >= 0) {
        const slot = slotsData[panelSlot];
        const c = slot ? familyCenters[slot.family] : undefined;
        if (c) {
          target.set(c.x, c.y, c.z);
          targetSmooth.lerp(target, reducedMotion ? 1 : 0.12);
        }
      }
    }

    applyCamera();

    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < familyCenters.length; i += 1) {
      const c = familyCenters[i];
      if (!c) continue;
      const d = cameraPos.distanceTo(c);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    nearestIndex = best;
    nearestDist = bestDist;

    // Les autres familles s'écartent avant qu'on calcule les positions.
    updateFamilyCenters();

    // Positions : interpolation compacte vers déployée, en cascade.
    for (let fi = 0; fi < FAMILIES.length; fi += 1) familyProgress[fi] = 1;

    const focusSlot = focusIndex >= 0 ? slotsData[focusIndex] : undefined;
    const focusBase = focusSlot ? focusSlot.deployed : null;

    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      const slot = slotsData[i];
      if (!slot) continue;

      let p = clamp(genreProgress(slot, now), -0.2, 1.2);
      if (slot.depth >= 2) {
        // Niveau unique : le repli comme le déploiement sont lissés.
        const want = parentExpanded(slot, i) ? 1 : 0;
        expandAmount[i] = (expandAmount[i] ?? 0) + (want - (expandAmount[i] ?? 0)) * (reducedMotion ? 1 : 0.14);
        p *= expandAmount[i] ?? 0;
      }
      const center = familyCenters[slot.family];
      slot.world.lerpVectors(slot.compact, slot.deployed, p);
      if (center) slot.world.add(center);

      /* Le progrès de famille se mesure sur la COURONNE (depth <= 1) :
         avec le niveau unique, les générations profondes sont repliées
         volontairement et cloueraient le progrès à zéro. */
      if (slot.depth <= 1) {
        const fp = familyProgress[slot.family] ?? 1;
        familyProgress[slot.family] = Math.min(fp, clamp(p, 0, 1));
      }

      /* Descente : le sous-arbre du noeud focalisé s'écarte de lui, en cascade
         par génération, tandis que le reste de la famille se replie. C'est la
         même grammaire que la diffusion de famille, un cran plus bas. */
      let presence = 1;

      /* Intro : la famille non née est absente, la naissante gonfle et éclate.
         La position s'éloigne du centre de l'atlas vers sa place finale. */
      if (introActive) {
        const birth = introBirth(slot.family, now);
        const sc = popScale(birth);
        sphereRadii[i] = (baseRadii[i] ?? 1) * sc;
        presence = sc <= 0.02 ? 0 : Math.min(1, sc);
        const e = 1 - Math.pow(1 - birth, 3);
        slot.world.set(
          atlasTarget.x + (slot.world.x - atlasTarget.x) * e,
          atlasTarget.y + (slot.world.y - atlasTarget.y) * e,
          atlasTarget.z + (slot.world.z - atlasTarget.z) * e
        );
      }

      /* Satellites de satellites : révélés au déploiement seulement. À l'état
         compact ils sont repliés sur leur ancêtre de première génération ; les
         afficher là ferait des sphères doubles. Ils surgissent avec la cascade,
         chacun au rythme de sa propre génération. */
      if (slot.depth >= 2) presence = clamp(p * 1.6 - 0.2, 0, 1);

      /* Anneaux uniquement sur le niveau actuellement navigable. Au niveau
         Atlas on ne descend pas encore dans les genres, donc aucun anneau :
         c'est ce qui encombrait le plus la vue d'ensemble. */
      let ringOn =
        slot.family === openIndex && (familyProgress[slot.family] ?? 0) > 0.5
          ? slot.children.length
          : 0;

      if (focusSlot && focusBase && slot.family === focusSlot.family) {
        const fc = familyCenters[slot.family];
        const bx = focusBase.x + (fc?.x ?? 0);
        const by = focusBase.y + (fc?.y ?? 0);
        const bz = focusBase.z + (fc?.z ?? 0);
        const inSubtree = isDescendant(i, focusIndex);
        const generation = Math.max(0, slot.depth - focusSlot.depth);
        const delay = focusDir === 1 ? FOCUS_DELAY_MS * generation : 0;
        const raw = clamp((now - focusStart - delay) / FOCUS_MS, 0, 1);
        const k = focusDir === 1 ? backOut(raw) : 1 - raw;

        if (inSubtree) {
          // On écarte le sous-arbre depuis le noeud focalisé.
          expand.set(
            bx + (slot.deployed.x - focusBase.x) * 1.95,
            by + (slot.deployed.y - focusBase.y) * 1.95,
            bz + (slot.deployed.z - focusBase.z) * 1.95
          );
          slot.world.lerp(expand, clamp(k, 0, 1));
        } else {
          // Le reste recule et s'atténue à 12 pour cent, il reste du contexte.
          recede.set(
            (fc?.x ?? 0) + slot.compact.x + (slot.deployed.x - slot.compact.x) * 0.45,
            (fc?.y ?? 0) + slot.compact.y + (slot.deployed.y - slot.compact.y) * 0.45,
            (fc?.z ?? 0) + slot.compact.z + (slot.deployed.z - slot.compact.z) * 0.45
          );
          slot.world.lerp(recede, clamp(k, 0, 1));
          presence = 1 - clamp(k, 0, 1) * 0.88;
          ringOn = 0;
        }
      } else if (level === 'family' && activeFamily >= 0) {
        presence = slot.family === activeFamily ? 1 : 0.5;
      }

      sphereCenters[i * 3] = slot.world.x;
      sphereCenters[i * 3 + 1] = slot.world.y;
      sphereCenters[i * 3 + 2] = slot.world.z;
      /* Respiration et survol : le rayon vit, dans des bornes infimes. */
      if (!reducedMotion && !introActive) {
        const targetHover = i === hovered ? 1 : 0;
        hoverAmount[i] = (hoverAmount[i] ?? 0) + (targetHover - (hoverAmount[i] ?? 0)) * 0.22;
        const breath = 1 + 0.02 * Math.sin(now / 2300 + (breathPhase[i] ?? 0));
        sphereRadii[i] = (baseRadii[i] ?? 1) * breath * (1 + 0.08 * (hoverAmount[i] ?? 0));
      }

      sphereState[i * 4] = suspended ? presence * 0.35 : presence;
      sphereState[i * 4 + 1] = i === focusIndex ? 0.22 : 0;
      sphereState[i * 4 + 2] = ringOn;
      sphereState[i * 4 + 3] = labelled[i] ?? 0;
    }
    sphereCenterAttr.needsUpdate = true;
    sphereStateAttr.needsUpdate = true;
    if (!reducedMotion) sphereRadiusAttr.needsUpdate = true;
    if (introActive) {
      sphereRadiusAttr.needsUpdate = true;
      const last = INTRO_ORDER.length * INTRO_STEP_MS + INTRO_POP_MS + 400;
      if (now - introStart > last) finishIntro();
    }

    // Liens : extrémités suivies, tracé du parent vers l'enfant.
    for (let i = 0; i < LINK_COUNT; i += 1) {
      const ref = linkRefs[i];
      if (!ref) continue;
      if (ref.internal) {
        const a = slotsData[ref.a];
        const b = slotsData[ref.b];
        if (!a || !b) continue;
        linkP0.set([a.world.x, a.world.y, a.world.z], i * 3);
        linkP1.set([b.world.x, b.world.y, b.world.z], i * 3);
        linkMeta[i * 3 + 2] = clamp(genreProgress(b, now), 0, 1);

        /* Les liens du sous-arbre focalisé passent au premier plan et
           s'épaississent, les autres liens de la famille s'effacent presque. */
        if (focusIndex >= 0 && a.family === (slotsData[focusIndex]?.family ?? -1)) {
          const inSubtree = isDescendant(ref.b, focusIndex) && isDescendant(ref.a, focusIndex);
          linkMeta[i * 3] = inSubtree ? 1 : 0.12;
          linkMeta[i * 3 + 1] = inSubtree ? 1 : 0.1;
        } else {
          linkMeta[i * 3] = 0.35;
          linkMeta[i * 3 + 1] = 1;
        }
      } else {
        const ca = familyCenters[ref.familyA];
        const cb = familyCenters[ref.familyB];
        if (!ca || !cb) continue;
        linkP0.set([ca.x, ca.y, ca.z], i * 3);
        linkP1.set([cb.x, cb.y, cb.z], i * 3);
        linkMeta[i * 3 + 2] = 1;

        /* Les liens entre familles traversaient tout l'écran en diagonale et
           brouillaient la lecture. Ils sont désormais quasi invisibles par
           défaut, et ne s'allument que si l'une de leurs deux extrémités est
           la famille sélectionnée ou celle du noeud survolé. */
        if (introActive) {
          /* Le lien se trace depuis la famille d'origine vers la naissante,
             comme une propagation : l'avancement suit la naissance de la
             famille d'arrivée. */
          const bornA = introBirth(ref.familyA, now);
          const bornB = introBirth(ref.familyB, now);
          linkMeta[i * 3 + 1] = bornA > 0.5 ? 0.55 : 0;
          linkMeta[i * 3 + 2] = clamp(bornB * 1.4, 0, 1);
          continue;
        }
        const hoveredFamily = hovered >= 0 ? (slotsData[hovered]?.family ?? -1) : -1;
        const concerned =
          ref.familyA === activeFamily ||
          ref.familyB === activeFamily ||
          ref.familyA === hoveredFamily ||
          ref.familyB === hoveredFamily;
        linkMeta[i * 3 + 1] = concerned ? 0.9 : 0.1;
      }
    }
    // Contrôles au tiers : la Bézier dégénère en segment droit.
    for (let i = 0; i < LINK_COUNT; i += 1) {
      const x0 = linkP0[i * 3] ?? 0;
      const y0 = linkP0[i * 3 + 1] ?? 0;
      const z0 = linkP0[i * 3 + 2] ?? 0;
      const x1 = linkP1[i * 3] ?? 0;
      const y1 = linkP1[i * 3 + 1] ?? 0;
      const z1 = linkP1[i * 3 + 2] ?? 0;
      linkCtrlA[i * 3] = x0 + (x1 - x0) / 3;
      linkCtrlA[i * 3 + 1] = y0 + (y1 - y0) / 3;
      linkCtrlA[i * 3 + 2] = z0 + (z1 - z0) / 3;
      linkCtrlB[i * 3] = x0 + ((x1 - x0) * 2) / 3;
      linkCtrlB[i * 3 + 1] = y0 + ((y1 - y0) * 2) / 3;
      linkCtrlB[i * 3 + 2] = z0 + ((z1 - z0) * 2) / 3;
    }
    linkP0Attr.needsUpdate = true;
    linkP1Attr.needsUpdate = true;
    linkCtrlAAttr.needsUpdate = true;
    linkCtrlBAttr.needsUpdate = true;
    linkMetaAttr.needsUpdate = true;

    if (profiling) return;

    // Projection des sphères, réutilisée par le clic et par les labels.
    {
      const halfW = width / 2;
      const halfH = height / 2;
      for (let i = 0; i < TOTAL_GENRES; i += 1) {
        const slot = slotsData[i];
        if (!slot) continue;
        scratch.copy(slot.world).project(camera);
        projected[i * 3] = scratch.x * halfW + halfW;
        projected[i * 3 + 1] = -scratch.y * halfH + halfH;
        projected[i * 3 + 2] = scratch.z;
      }
    }

    consumePendingGenre(now);
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
        openLabel: openIndex >= 0 ? (FAMILIES[openIndex]?.label ?? '—') : '—',
        deployPct: openIndex >= 0 ? (familyProgress[openIndex] ?? 0) * 100 : 0,
        distance,
        nearestLabel: FAMILIES[nearestIndex]?.label ?? '—',
        nearestDistance: nearestDist,
        labelsShown,
        genreLabelsShown,
        reduced,
        results
      });
    }
  };

  applyCamera();
  engineReady = true;
  resize();
  requestAnimationFrame(frame);
  void runProfile();

  (window as unknown as { __atlas?: unknown }).__atlas = {
    /* Crochets de MESURE pour npm run verify:visual : quand on ne peut pas
       voir, on mesure. Lecture seule sauf setHovered, qui simule le survol. */
    frameFamily: (fi: number) => frameFamily(fi, performance.now()),
    orbit: () => ({ azimuth, elevation, distance }),
    sphereRadius: (i: number) => sphereRadii[i] ?? 0,
    sphereBase: (i: number) => baseRadii[i] ?? 0,
    setHovered: (i: number) => {
      hovered = i;
    },
    visibleCount: () => {
      let n = 0;
      for (let i = 0; i < TOTAL_GENRES; i += 1) {
        if ((sphereRadii[i] ?? 0) > (baseRadii[i] ?? 1) * 0.05) n += 1;
      }
      return n;
    },
    reducedMotion,
    framing: () => ({
      distance,
      atlasDistance,
      cameraAtDefault,
      width,
      height,
      aspect: camera.aspect,
      introActive,
      azimuth,
      elevation,
      defaults: [DEFAULT_AZIMUTH, DEFAULT_ELEVATION],
      portraitApplied,
      diag: framingDiag,
      analytic: analyticDiag
    }),
    measureGpu,
    measureLabels,
    runProfile,
    recenter,
    openPanel,
    closePanel,
    goToGenre,
    playIntro,
    open: (familyIndex: number) => setDeploy(familyIndex, true, performance.now()),
    close: (familyIndex: number) => setDeploy(familyIndex, false, performance.now()),
    setOrbit: (az: number, el: number, dist: number) => {
      azimuth = (az * Math.PI) / 180;
      elevation = clamp((el * Math.PI) / 180, -ELEVATION_LIMIT, ELEVATION_LIMIT);
      distance = clamp(dist, MIN_DISTANCE, MAX_DISTANCE);
      azVel = 0;
      elVel = 0;
      dollyVel = 0;
      applyCamera();
    },
    info: () => ({
      spheres: TOTAL_GENRES,
      links: LINK_COUNT,
      reduced,
      pixelRatio: renderer.getPixelRatio(),
      size: [width, height],
      triangles: renderer.info.render.triangles
    }),
    labelSnapshot: () => lastPlacedSnapshot,
    drawCallsPerFrame: () => {
      renderer.info.reset();
      renderOnce(true);
      return renderer.info.render.calls;
    }
  };

  emitNav();

  return {
    zoom: (direction: 1 | -1) => {
      onFirstInteraction();
      dollyVel += direction === 1 ? -5.5 : 5.5;
    },
    /* En vue libre, le pan horizontal TOURNE l'orbite : c'est le geste
       équivalent, et l'API reste la même que la vue fixe. */
    pan: (dx: number, dy: number) => {
      onFirstInteraction();
      azVel += dx * 0.05;
      elVel -= dy * 0.035;
    },
    goUp,
    goToFamily: (familyIndex: number) => {
      if (familyIndex < 0) {
        const now = performance.now();
        if (activeFamily >= 0) setDeploy(activeFamily, false, now);
        activeFamily = -1;
        activeGenre = -1;
        level = 'atlas';
        startFly(atlasTarget, atlasDistance, now);
        emitNav();
      } else {
        selectFamily(familyIndex, performance.now());
      }
    },
    openPanel,
    closePanel,
    goToGenre,
    playIntro,
    setSuspended: (value: boolean) => {
      suspended = value;
    },
    dispose: () => {
      running = false;
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKey);
      for (const ls of labelSlots) ls.el.remove();
      sphereGeometry.dispose();
      linkGeometry.dispose();
      sphereMaterial.dispose();
      linkMaterial.dispose();
      renderer.dispose();
    },
    runProfile,
    recenter,
    labelSnapshot: () => lastPlacedSnapshot,
    frameFamily: (fi: number) => frameFamily(fi, performance.now()),
    /* Recadre le NIVEAU COURANT : couronne au niveau famille, sous-anneau
       en descente. C'est ce que la coquille appelle quand la zone visible
       change (colonne, feuille) : re-cadrer la famille écrasait le cadrage
       de descente (mesuré : 0 enfant de Drum and Bass nommé à 390 px). */
    frameCurrent: () => {
      const now = performance.now();
      const g = activeGenre >= 0 ? slotsData[activeGenre] : undefined;
      if (g && g.children.length > 0) {
        frameLock = activeGenre;
        startFly(g.world, frameDistance(genreFrameRadius(activeGenre) + 2.5), now);
      } else if (activeFamily >= 0) {
        frameLock = -1;
        frameFamily(activeFamily, now);
      }
    }
  };
};
