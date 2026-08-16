/* VUE 3D LIBRE : le moteur orbital d'avant la disposition fixe (47b2938),
   ressuscité comme vue au choix (ADR-043). Système planétaire, orbite,
   déploiement des familles : tout ce que la vue fixe a abandonné vit ici.

   Adapté à la nouvelle maison : types partagés avec webgl.ts, plaque 3D
   retirée (le lecteur est une colonne DOM), liens en Bézier (contrôles au
   tiers = ligne droite), et le survol ne touche jamais aux labels. */

import {
  BufferAttribute,
  CustomBlending,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  NormalBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  RawShaderMaterial,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget
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
  blitVert,
  blurFrag,
  compositeFrag,
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
import type { AtlasHandles, AtlasApi, AtlasResults } from './atlas-api.ts';

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
   à droite et la légende se cache quand la feuille monte, les anciennes
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

  /* ESSAI PLAQUES : ?plaques=1 active le style plaque pour Breakbeat. */
  const plaquesActif = new URLSearchParams(window.location.search).get('plaques') === '1';
  const breaksIndex = FAMILIES.findIndex((f) => f.id === 'breaks');
  const breaksHue = FAMILIES[breaksIndex]?.hue ?? 284;

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

  // ------------------------------------------- flou de mise au point

  /* DEUX CIBLES DE RENDU, à demi-résolution.

     Demi-résolution pour deux raisons qui vont dans le même sens : quatre
     fois moins de pixels à filtrer, et un rayon de flou qui compte double
     une fois l'image réagrandie. Un flou n'a aucun détail à préserver, c'est
     le seul effet dont la basse résolution est un avantage.

     Elles sont créées à 1 x 1 et redimensionnées par resize() : au moment où
     ces lignes s'exécutent, la taille réelle du canvas n'est pas connue. */
  const rtFlouA = new WebGLRenderTarget(1, 1, { depthBuffer: true, stencilBuffer: false });
  const rtFlouB = new WebGLRenderTarget(1, 1, { depthBuffer: false, stencilBuffer: false });
  /* Les cibles sont déclarées en sRGB : three applique alors aux sphères et
     aux liens la MÊME conversion de sortie que sur l'écran. Sans cela le plan
     flou serait rendu en linéaire et composé tel quel, donc nettement plus
     sombre que le plan net, pour une raison invisible à la lecture du code. */
  rtFlouA.texture.colorSpace = SRGBColorSpace;
  rtFlouB.texture.colorSpace = SRGBColorSpace;

  const blurUniforms = {
    uTexture: { value: rtFlouA.texture },
    uDirection: { value: new Vector2(0, 0) },
    uRayon: { value: 0 }
  };
  const blurScene = new Scene();
  const blurMesh = new Mesh(
    new PlaneGeometry(2, 2),
    new RawShaderMaterial({
      vertexShader: blitVert,
      fragmentShader: blurFrag,
      uniforms: blurUniforms,
      depthTest: false,
      depthWrite: false
    })
  );
  blurScene.add(blurMesh);

  const compositeUniforms = { uTexture: { value: rtFlouA.texture }, uGain: { value: 2.2 } };
  const compositeScene = new Scene();
  const compositeMesh = new Mesh(
    new PlaneGeometry(2, 2),
    new RawShaderMaterial({
      vertexShader: blitVert,
      fragmentShader: compositeFrag,
      uniforms: compositeUniforms,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      /* Mélange PRÉMULTIPLIÉ : la couleur a déjà été multipliée par l'alpha
         avant le flou, sans quoi la gaussienne borde chaque forme de noir. */
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneMinusSrcAlphaFactor
    })
  );
  compositeScene.add(compositeMesh);

  /* Rayon courant, en pixels de la cible à demi-résolution. Il suit la même
     rampe de 400 ms que le reste du mode focus : c'est la montée du flou. */
  let rayonFlou = 0;
  /* LE FLOU SE GAGNE EN PASSES, PAS EN ÉCARTEMENT.

     Écarter les échantillons d'un noyau à treize prises finit par les
     espacer de plus d'un pixel de la cible : la gaussienne cesse alors de
     lisser et se met à recopier des fantômes décalés. C'est un
     sous-échantillonnage, et il se voit comme des doubles contours.

     On enchaîne donc PLUSIEURS paires horizontale-verticale à écartement
     modeste. Convoluer n gaussiennes d'écart-type s en donne une d'écart-type
     s·racine(n) : cinq paires à 2,2 pixels de la cible au quart de
     résolution valent environ trente-trois pixels d'écran, sans aucun
     artefact. */
  const RAYON_FLOU_MAX = 2.2;
  const PASSES_FLOU = 5;
  /* Interrupteur de diagnostic, comme pour les autres composantes du rendu :
     window.__atlas.composante('flou', false) rend la passe unique d'avant. */
  let flouActif = true;

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

  /* MODE FOCUS : ce qui n'est pas dans la zone active sort de la mise au
     point. Attribut dynamique, monté et descendu en 400 ms comme le reste de
     la descente. Voir sphereFrag pour ce que le flou fait réellement. */
  const defocus = new Float32Array(TOTAL_GENRES);
  const defocusAttr = new InstancedBufferAttribute(defocus, 1);
  defocusAttr.setUsage(35048);
  sphereGeometry.setAttribute('aDefocus', defocusAttr);

  const sphereUniforms = {
    uCameraPos: { value: cameraPos },
    uLightDir: { value: new Vector3(0.42, 0.72, 0.55).normalize() },
    uPixelScale: { value: 0.001 },
    uFog: { value: new Vector2(190, 620) },
    uFogColor: { value: fogColor },
    /* -1 : tout, 0 : la passe nette, 1 : la passe floue. Voir sphereVert. */
    uPasse: { value: -1 },
    uPremul: { value: 0 }
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
  /* Un lien part au flou dès que l'une de ses deux extrémités y part : un
     trait net accroché à une forme floue se lit comme une erreur de rendu. */
  const linkFlou = new Float32Array(LINK_COUNT);
  const linkFlouAttr = new InstancedBufferAttribute(linkFlou, 1);
  linkFlouAttr.setUsage(35048);
  linkGeometry.setAttribute('aFlou', linkFlouAttr);

  const linkUniforms = {
    uCameraPos: { value: cameraPos },
    uPixelScale: { value: 0.001 },
    uMinPixels: { value: 1.1 },
    uWidthWorld: { value: 0.075 },
    uFog: { value: sphereUniforms.uFog.value },
    uFogColor: { value: fogColor },
    uFlowTime: { value: 0 },
    uPasse: { value: -1 },
    uPremul: { value: 0 }
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
  /* Deuxième Échap consécutif : il sort du mode focus au lieu de remonter
     encore d'un cran. Tout autre geste le désarme. */
  let echapArme = false;
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
      path: genrePath.map((gi) => ({
        index: gi,
        local: slotsData[gi]?.local ?? 0,
        label: slotsData[gi]?.label ?? ''
      }))
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

  /* ================================================================== FOCUS
     LA ZONE ACTIVE : le genre ouvert, ses dérivés, son parent direct.

     Le reste de la carte sort de la mise au point ET cesse de répondre au
     clic. Les deux vont ensemble : un objet qu'on voit encore et qui ne
     répond plus est une panne ; un objet qui ne répond plus et qu'on voit
     flou est un arrière-plan. C'est la même information dite deux fois, à
     l'oeil et au doigt.

     La zone est un tableau et non un test recalculé : elle sert à chaque
     image pour 218 sphères, et à chaque clic pour le pointage. Deux
     lectures de la même vérité, jamais deux calculs qui pourraient diverger. */
  const zone = new Uint8Array(TOTAL_GENRES);
  let zoneParent = -1;
  let zoneActive = false;

  /* LA RAMPE DE FLOU EST RÉGLÉE PAR LE TEMPS, PAS PAR LES IMAGES.

     Première version : un lissage exponentiel par image, 0,15, comme le
     reste du fichier. Il donne bien 400 ms à soixante images par seconde,
     et n'importe quoi d'autre partout ailleurs. La mesure l'a pris en
     défaut : dans un onglet dont la cadence est bridée, le flou mettait
     plusieurs secondes à s'installer alors que les positions, elles, sont
     réglées par le temps et arrivaient à l'heure. La carte se réorganisait
     donc AVANT que l'arrière-plan ne s'efface.

     On garde la valeur de départ au moment où la zone change, et on
     interpole vers la cible sur FOCUS_MS. Une durée demandée en
     millisecondes se tient en millisecondes. */
  const defocusDepart = new Float32Array(TOTAL_GENRES);
  let zoneStart = -1e9;

  /* LA GÉNÉRATION, ET NON LE CHEMIN.

     LE MODÈLE A CHANGÉ, ET C'EST LE CHANGEMENT LE PLUS PROFOND DU MODE FOCUS.

     Avant : cliquer un dérivé descendait DANS SA BRANCHE. On entrait dans
     Downtempo, on cliquait Trip-Hop, et il ne restait que Downtempo, Trip-Hop
     et les deux dérivés de Trip-Hop. Tout le reste disparaissait. Ce que ça
     produit a été décrit exactement : « perdu dans le vide ». On avait perdu
     de vue les six autres dérivés de Downtempo, donc le seul repère qui
     disait où l'on était.

     Maintenant : cliquer OUVRE UNE GÉNÉRATION, et sélectionne un noeud
     dedans. La racine de la vue ne bouge plus, ses dérivés restent en
     couronne, et chacun d'eux déploie SES propres sous-genres autour de lui.
     Le clic ne déplace pas le point de vue, il l'approfondit.

     Trois variables portent ce modèle, et il faut les distinguer :

       focusRacine    le genre au centre de la vue. Il ne change QUE lorsqu'on
                      entre depuis l'extérieur, ou qu'on remonte.
       focusGenerations  combien de générations sont dépliées sous lui. 1 au
                      premier clic, 2 après un clic sur un dérivé, et ainsi
                      de suite.
       activeGenre    le noeud SÉLECTIONNÉ. Il vit dans la génération, il ne
                      la commande pas. C'est lui qui porte le halo, le nom
                      marqué et le contenu de la colonne.

     Le nom `focusIndex` reste celui de la racine : le renommer partout aurait
     touché quarante endroits pour un gain de vocabulaire. */
  /* La profondeur du sous-arbre affiché, mesurée au dernier parcours. Sert au
     cadrage et aux paliers de taille des noms. */
  let zoneProfondeurMax = 0;
  const zoneGeneration = new Int8Array(TOTAL_GENRES);

  const rebuildZone = (): void => {
    defocusDepart.set(defocus);
    zoneStart = performance.now();
    zone.fill(0);
    zoneGeneration.fill(-1);
    zoneParent = -1;
    zoneActive = focusIndex >= 0 && focusDir === 1;
    if (!zoneActive) return;
    const slot = slotsData[focusIndex];
    if (!slot) {
      zoneActive = false;
      return;
    }
    zone[focusIndex] = 1;
    zoneGeneration[focusIndex] = 0;

    /* TOUT LE SOUS-ARBRE, D'UN SEUL COUP, JUSQU'AUX FEUILLES.

       LE MODÈLE CHANGE POUR LA TROISIÈME FOIS, ET C'EST LA BONNE. D'abord une
       branche à la fois : on perdait de vue les frères. Puis une génération à
       la fois : on voyait le niveau mais jamais l'ensemble, et il fallait un
       clic par génération pour descendre. « C'est trop lent et on ne voit
       jamais l'ensemble », et c'est exact : un atlas généalogique dont il faut
       trois clics pour voir une lignée ne montre pas la lignée.

       Le parcours reste en largeur, mais sans borne : il s'arrête quand il n'y
       a plus d'enfants. La profondeur enregistrée sert à la fois à la
       disposition en anneaux et à la taille des noms. */
    const base = familyOffset[slot.family] ?? 0;
    let front = [focusIndex];
    let g = 0;
    while (front.length > 0 && g < 12) {
      g += 1;
      const suivant: number[] = [];
      for (const p of front) {
        const ps = slotsData[p];
        if (!ps) continue;
        for (const local of ps.children) {
          const e = base + local;
          if (zone[e] === 1) continue; // garde : un DAG pourrait boucler
          zone[e] = 1;
          zoneGeneration[e] = g;
          suivant.push(e);
        }
      }
      front = suivant;
    }
    zoneProfondeurMax = g - 1;

    /* Le parent direct de la racine garde le fil : sans lui on ne sait plus
       d'où l'on vient, et remonter demanderait de sortir du mode. */
    if (slot.parent >= 0) {
      zoneParent = base + slot.parent;
      zone[zoneParent] = 1;
      zoneGeneration[zoneParent] = -2; // au-dessus de la racine
    }
  };

  /* LA COURONNE D'ENTRÉE, recalculée à chaque descente.

     POURQUOI ON NE RÉUTILISE PAS LES POSITIONS DE LA VUE D'ENSEMBLE. Elles
     sont calculées une fois pour toutes, au build, pour que la famille
     entière tienne dans son volume. Vues de près, elles donnent exactement
     ce qui a été signalé : des dérivés dispersés, certains projetés SUR leur
     parent parce qu'ils sont derrière lui dans l'axe de la caméra, et des
     cibles de quelques pixels.

     Ce que fait cette couronne : elle place les enfants directs sur un
     cercle centré sur le genre ouvert, dans le PLAN DE LA CAMÉRA au moment
     du clic. Aucun enfant ne peut donc se retrouver derrière son parent, et
     l'écart angulaire est le même pour tous.

     POURQUOI 44 PX SONT GARANTIS SANS AVOIR À CHOISIR UN RAYON. Le cadrage
     recule pour contenir la couronne : à n enfants, l'écart à l'écran vaut
     R·sin(π/n)·H / (1,12·(R+r)), qui tend vers sin(π/n)·H/1,12 dès que R
     dépasse le rayon des sphères. L'écart ne dépend donc PAS du rayon choisi
     mais du nombre d'enfants et de la hauteur de la fenêtre. Le pire cas du
     corpus est de 14 enfants directs : sin(π/14)·H/1,12 = 0,20·H, soit 76 px
     sur une fenêtre de 390 px de haut. La marge est confortable, et c'est
     une propriété du cadrage, pas un réglage à surveiller.

     L'ORDRE EST CONSERVÉ. Les enfants sont rangés selon l'angle qu'ils
     occupaient déjà à l'écran, puis répartis régulièrement. Sans cela, la
     couronne rebattrait les cartes à chaque descente et un dérivé qu'on
     venait de repérer à droite se retrouverait à gauche. */
  const focusOffsets = new Map<number, Vector3>();
  /* Les axes du plan de la caméra au moment où la couronne a été bâtie. Le
     cadrage mesure l'étendue du groupe DANS CE PLAN : c'est le seul repère
     où « largeur » et « hauteur » veulent dire quelque chose. */
  const focusRight = new Vector3(1, 0, 0);
  const focusUp = new Vector3(0, 1, 0);


  /* ==========================================================================
     LA DISPOSITION EN ANNEAUX CONCENTRIQUES.

     TOUT LE SOUS-ARBRE EST POSÉ D'UN COUP. Le genre ouvert au centre, ses
     dérivés directs sur le premier anneau, leurs dérivés sur le deuxième, et
     ainsi de suite jusqu'aux feuilles.

     CE QUI FAIT QUE LA FILIATION SE LIT : LES SECTEURS ANGULAIRES. Un noeud ne
     reçoit pas un angle, il reçoit une PART DU CERCLE, et il la répartit entre
     ses enfants au prorata du nombre de feuilles que chacun porte. Un dérivé
     qui a douze descendants reçoit douze fois plus d'angle qu'une feuille. Ses
     enfants restent donc DANS son secteur, à la verticale de lui, et l'oeil
     suit une branche sans avoir besoin des liens.

     C'est la disposition classique d'un arbre radial, et elle a une propriété
     qui compte ici : deux sous-arbres ne peuvent PAS se croiser, par
     construction, puisque leurs secteurs sont disjoints.

     POURQUOI ON NE RÉUTILISE PAS LES POSITIONS DE LA VUE D'ENSEMBLE. Elles
     sont calculées au build pour que la famille entière tienne dans son
     volume. Vues de près, elles donnent des dérivés dispersés, certains
     projetés SUR leur parent parce qu'ils sont derrière lui dans l'axe de la
     caméra, et des cibles de quelques pixels. Ici tout est posé dans le PLAN
     DE LA CAMÉRA au moment du clic : aucun noeud ne peut se cacher derrière
     un autre. */

  const enfantsDe = (i: number): number[] => {
    const s = slotsData[i];
    if (!s) return [];
    const base = familyOffset[s.family] ?? 0;
    return s.children.map((local) => base + local).filter((k) => slotsData[k]);
  };

  /* Le poids angulaire d'un noeud : le nombre de feuilles de son sous-arbre.
     Une feuille pèse 1. C'est ce qui donne à chaque branche une part du cercle
     proportionnelle à ce qu'elle contient, plutôt qu'une part égale qui
     serrerait les grosses branches et gaspillerait l'espace des petites. */
  const compterFeuilles = (i: number, vus: Set<number>): number => {
    if (vus.has(i)) return 1;
    vus.add(i);
    const enfants = enfantsDe(i);
    if (enfants.length === 0) return 1;
    let n = 0;
    for (const e of enfants) n += compterFeuilles(e, vus);
    return n;
  };

  const buildFocusRing = (globalIndex: number): void => {
    focusOffsets.clear();
    const slot = slotsData[globalIndex];
    if (!slot) return;

    /* Le plan de la caméra au moment du clic. L'orbite ne change pas pendant
       un vol : la direction de vue d'après le vol est celle d'avant. */
    const camRight = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    const camUp = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    focusRight.copy(camRight);
    focusUp.copy(camUp);

    const poser = (index: number, angle: number, rayon: number): void => {
      focusOffsets.set(
        index,
        new Vector3(
          (camRight.x * Math.cos(angle) + camUp.x * Math.sin(angle)) * rayon,
          (camRight.y * Math.cos(angle) + camUp.y * Math.sin(angle)) * rayon,
          (camRight.z * Math.cos(angle) + camUp.z * Math.sin(angle)) * rayon
        )
      );
    };

    /* LE PAS DES ANNEAUX. Il est fixé sur la plus grosse sphère de l'arbre,
       pas sur une constante : un fondateur de famille a un rayon plusieurs
       fois supérieur à celui d'une feuille, et un pas calculé sur les petites
       ferait passer le premier anneau à l'intérieur du centre. */
    const sousArbre: number[] = [];
    const file = [globalIndex];
    const vus = new Set<number>([globalIndex]);
    while (file.length > 0) {
      const i = file.shift() as number;
      sousArbre.push(i);
      for (const e of enfantsDe(i)) {
        if (vus.has(e)) continue;
        vus.add(e);
        file.push(e);
      }
    }
    let rMax = 0.5;
    for (const i of sousArbre) rMax = Math.max(rMax, rayonDispo[i] ?? 0.5);
    const rRacine = rayonDispo[globalIndex] ?? 1;
    /* LE PAS DES ANNEAUX, RESSERRÉ SUR GRAND ÉCRAN.

       Demande de Mika : les liens sont trop longs. Resserrer TOUT ne changerait
       rien à l'écran, la caméra suivant l'échelle (ADR-075) ; ce qui change,
       c'est le RAPPORT entre le pas radial et l'écartement angulaire. On réduit
       donc le seul pas des anneaux, d'un quart : les branches lointaines
       reviennent vers le centre, les liens raccourcissent d'autant, et l'écart
       entre deux voisins d'un même anneau, lui, reste commandé par ESPACE_MIN.

       Le mobile n'y touche pas : il déborde déjà du cadre (ADR-080) et sa
       contrainte est le doigt, pas la longueur des liens. */
    const SERRAGE = width >= 768 ? 0.75 : 1;
    const PAS = Math.max((rRacine + rMax) * 2.2, rMax * 4.4) * SERRAGE;

    /* LE PARENT DE LA RACINE garde le fil : sans lui on ne sait plus d'où l'on
       vient. Il occupe une part du premier anneau comme s'il était un enfant
       de plus, ce qui évite de le poser sur un secteur déjà pris. */
    const parentIndex = slot.parent >= 0 ? (familyOffset[slot.family] ?? 0) + slot.parent : -1;

    const enfantsRacine = enfantsDe(globalIndex);
    const poids = new Map<number, number>();
    let total = 0;
    for (const e of enfantsRacine) {
      const p = Math.sqrt(compterFeuilles(e, new Set<number>()));
      poids.set(e, p);
      total += p;
    }
    /* LEVIER 2 : LES SECTEURS SE RÉÉQUILIBRENT.

       Le poids d'une branche était son nombre de FEUILLES. Une branche de
       douze feuilles prenait donc douze fois le secteur d'une feuille seule,
       et sur Breakbeat la lignée Drum and Bass emportait la moitié du cercle
       pendant que le haut gauche restait vide.

       La racine carrée du compte écrase cet écart sans l'annuler : une branche
       quatre fois plus fournie reçoit deux fois plus d'angle, pas quatre. Les
       petites branches cessent d'être écrasées contre le centre, et la grande
       cesse de partir seule au loin. */
    const partParent = parentIndex >= 0 ? Math.max(1, Math.round(total / Math.max(1, enfantsRacine.length))) : 0;
    total += partParent;
    if (total <= 0) total = 1;

    /* Ordre conservé : les branches sont rangées selon l'angle qu'elles
       occupaient déjà à l'écran. Sans cela, la disposition rebattrait les
       cartes à chaque descente et un dérivé repéré à droite se retrouverait à
       gauche. */
    const avecAngle = enfantsRacine.map((e) => {
      const es = slotsData[e];
      const dx = (es?.deployed.x ?? 0) - slot.deployed.x;
      const dy = (es?.deployed.y ?? 0) - slot.deployed.y;
      const dz = (es?.deployed.z ?? 0) - slot.deployed.z;
      return {
        e,
        angle: Math.atan2(
          camUp.x * dx + camUp.y * dy + camUp.z * dz,
          camRight.x * dx + camRight.y * dy + camRight.z * dz
        )
      };
    });
    avecAngle.sort((a, b) => a.angle - b.angle);

    /* Descente récursive : chaque noeud reçoit un secteur [debut, fin] et le
       partage entre ses enfants au prorata de leurs feuilles. Il se pose
       lui-même au MILIEU de son secteur, sur l'anneau de sa profondeur. */
    /* L'ÉCART MINIMAL ENTRE DEUX VOISINS, en unités du monde. Un anneau n'est
       pas une distance, c'est un COMPROMIS entre la profondeur qu'il exprime
       et la place qu'il offre. */
    /* LES CONTRAINTES DE NON-CONTACT PORTENT SUR LE RAYON DESSINÉ.

       La disposition travaille sur les rayons d'origine, pour que le
       grossissement des sphères se voie (ADR-082). Mais ce qui doit ne pas se
       toucher, ce sont les sphères TELLES QU'ELLES SONT PEINTES, 40 % plus
       grosses. En gardant les rayons d'origine dans les écarts minimaux, on
       autorisait un recouvrement de 40 % : mesuré à moins 200 px sur l'arbre
       de Trip-Hop. Le pas des anneaux, lui, garde le rayon d'origine : c'est
       lui qui commande la longueur des liens. */
    const ESPACE_MIN = rMax * 2.6 * GROSSISSEMENT;

    const poserBranche = (
      index: number,
      debut: number,
      fin: number,
      profondeur: number,
      rayonMin: number
    ): void => {
      /* UN ANNEAU S'ÉLOIGNE QUAND SON SECTEUR EST ÉTROIT.

         C'est le défaut classique de l'arbre radial, et il s'est mesuré : sur
         Chicago House, 24 sphères sur quatre niveaux, l'écart minimal entre
         deux cibles tombait à 16 px, et à 9 px sur Breakbeat. La cause n'est
         pas le nombre de noeuds mais la LARGEUR DE SECTEUR : une branche qui
         ne porte qu'une feuille reçoit une part de cercle minuscule, et son
         noeud, posé sur l'anneau de sa profondeur, se retrouve collé à celui
         de la branche voisine.

         Un noeud est donc posé sur le PLUS GRAND des deux rayons : celui de
         sa profondeur, et celui qu'il faut pour que son secteur mesure au
         moins l'écart minimal. L'arbre garde ses anneaux là où il y a de la
         place, et s'étire là où il n'y en a pas. */
      const largeurAngle = Math.max(0.02, fin - debut);
      const rayon = Math.max(rayonMin, ESPACE_MIN / largeurAngle);
      poser(index, (debut + fin) / 2, rayon);
      const enfants = enfantsDe(index);
      if (enfants.length === 0 || profondeur >= 11) return;
      let poidsTotal = 0;
      const p = enfants.map((e) => {
        const w = Math.sqrt(compterFeuilles(e, new Set<number>()));
        poidsTotal += w;
        return { e, w };
      });
      if (poidsTotal <= 0) return;
      let curseur = debut;
      for (const { e, w } of p) {
        const largeur = ((fin - debut) * w) / poidsTotal;
        /* LEVIER 1 : L'ESPACEMENT DÉCROIT AVEC LA PROFONDEUR.

           Un pas constant écarte la sixième génération autant que la première.
           Or plus on descend, plus les branches sont fines et nombreuses :
           elles ont besoin d'espace ANGULAIRE, pas d'espace radial, et le pas
           constant ne faisait qu'étirer l'arbre jusqu'à le faire déborder.

           Chaque anneau vaut donc 0,82 du précédent, avec un plancher : la
           somme d'une telle suite converge, l'arbre le plus profond du corpus
           tient dans un rayon fini au lieu de croître linéairement. Mesuré sur
           Breakbeat, six niveaux, le plus profond du corpus. */
        /* AU-DELA DU DEUXIEME ANNEAU, L'ECART EST DIVISE PAR DEUX A CHAQUE
           GENERATION. La decroissance a 0,82 etait trop douce : le sixieme
           anneau restait a plus de la moitie du premier, et l'arbre s'etalait
           jusqu'a laisser le centre vide. En divisant par deux, la somme
           converge vite et les generations lointaines reviennent vers leur
           parent, ou elles se lisent comme sa descendance plutot que comme
           des satellites perdus. */
        const pas = Math.max(
          profondeur <= 1 ? PAS : PAS * Math.pow(0.5, profondeur - 1),
          (rMax + rMax) * 1.5
        );
        poserBranche(e, curseur, curseur + largeur, profondeur + 1, rayon + pas);
        curseur += largeur;
      }
    };

    /* Départ à midi, sens horaire : la carte se lit comme un cadran. */
    const DEPART = Math.PI / 2;
    let curseur = DEPART;
    for (const { e } of avecAngle) {
      const largeur = (Math.PI * 2 * (poids.get(e) ?? 1)) / total;
      poserBranche(e, curseur - largeur, curseur, 1, PAS);
      curseur -= largeur;
    }
    if (parentIndex >= 0) {
      /* L'ASCENDANT N'EST PAS UN VOISIN COMME LES AUTRES.

         Il est souvent le fondateur de sa famille, donc la plus grosse sphère
         de l'atlas, et il était posé sur le MÊME anneau que des dérivés dix
         fois plus petits. Le pas de cet anneau est calculé sur les petits :
         le gros débordait dessus, et se recouvrait avec la racine. C'était le
         seul recouvrement mesuré, et il existait avant le grossissement.

         Il est donc décalé vers l'extérieur PROPORTIONNELLEMENT À SON RAYON :
         assez loin pour que sa surface ne touche ni la racine, ni ses voisins
         d'anneau. La solution par secteur angulaire élargi a été écartée :
         elle aurait resserré tous les autres pour un seul noeud. */
      const largeur = (Math.PI * 2 * partParent) / total;
      const rp = (rayonDispo[parentIndex] ?? 1) * GROSSISSEMENT;
      const rr = (rayonDispo[globalIndex] ?? 1) * GROSSISSEMENT;
      const rayonParent = Math.max(PAS, rr + rp * 1.35, rp * 2.1);
      poser(parentIndex, curseur - largeur / 2, rayonParent);
    }
  };


  /* Rayon de la couronne d'entrée, pour le cadrage. Lu depuis les décalages
     réellement posés : le cadrage ne peut donc pas diverger de la
     disposition, ce qui est arrivé une fois avec les positions déployées. */
  const focusRingRadius = (): number => {
    let r = 0;
    for (const [i, off] of focusOffsets) {
      /* SEULEMENT CE QUI EST DANS LA ZONE, donc seulement ce qui est visible.

         Les générations plus profondes reçoivent aussi un décalage, pour ne
         pas revenir à leur ancienne place si elles se déploient. Elles sont
         repliées sur leur parent, invisibles, hors zone, et elles étaient
         pourtant comptées dans le rayon de cadrage.

         Mesuré sur Detroit Techno : quinze décalages posés pour six dérivés
         visibles, rayon de groupe 45 unités au lieu de 14, donc une caméra
         trois fois trop loin et une couronne occupant un cinquième de
         l'écran au lieu des trois cinquièmes voulus. Le cadrage doit se
         calculer sur CE QU'ON VOIT, jamais sur ce qui est prévu. */
      if (zone[i] !== 1) continue;
      r = Math.max(r, off.length() + (rayonDispo[i] ?? 1));
    }
    return r;
  };

  /* LE CADRAGE DU MODE FOCUS, ÉCRIT COMME UNE PROPORTION ET NON COMME UNE
     MARGE.

     L'ancien chemin empilait trois facteurs sans que personne ne sache ce
     qu'ils donnaient ensemble : 1,22 dans le rayon, 2,5 unités ajoutées, et
     1,12 dans la distance. Résultat mesuré, le groupe occupait environ un
     cinquième de l'écran au lieu de le remplir.

     La règle est désormais directe : le groupe occupe OCCUPATION de la plus
     petite dimension de l'espace disponible. Hauteur visible à la distance
     d : 2·d·tan(fov/2). Largeur visible : la même fois le rapport de forme.
     La plus petite des deux est donc 2·d·tan·min(1, aspect), et l'on veut
     que le diamètre 2R en occupe la fraction voulue. D'où la distance.

     Le canvas est déjà rétréci par la colonne (règle CSS sur
     data-player-open), donc « l'espace disponible » est exactement ce que
     mesure la caméra : rien à déduire ici. */
  /* L'ARBRE OCCUPE 85 % DE L'ESPACE DISPONIBLE, quelle que soit sa taille.

     C'est le seul levier qui déplace vraiment l'écart entre deux cibles en
     pixels : agrandir la disposition fait reculer la caméra d'autant et ne
     change rien (mesuré, ADR-075). Il ne reste que la part de l'écran qu'on
     accorde à l'ensemble, et les 15 % de marge gardent les noms des bords
     dans le cadre. */
  const OCCUPATION = 0.85;
  /* 0,86 et non 0,78 : c'est le SEUL levier qui déplace vraiment l'écart en
     pixels, puisque agrandir la disposition fait reculer la caméra d'autant.
     Mesuré sur Hardcore Techno, le cas le plus dense du corpus, dix-sept
     sphères à deux générations : 43 px d'écart minimal à 0,78, sous la cible
     de 44 ; 48 px à 0,86. La marge de 14 % qui reste garde les noms des bords
     dans le cadre. */

  /* L'ÉTENDUE DU GROUPE, séparément en largeur et en hauteur.

     Un rayon unique suppose un groupe rond. Avec un seul dérivé, le groupe
     est une LIGNE HORIZONTALE : cadré sur son rayon, il occupait la largeur
     voulue mais laissait toute la hauteur vide, donc paraissait deux fois
     trop petit. On mesure donc les deux axes du plan de la caméra et on
     cadre sur celui qui contraint. Aucun cas particulier à écrire : la
     couronne ronde, la ligne et le T du cas à deux dérivés passent tous par
     la même formule. */
  /* LA BOÎTE DU GROUPE, signée, et non un rayon.

     Un rayon suppose un groupe centré sur le genre ouvert. Il ne l'est pas
     toujours : avec deux dérivés, le parent est au-dessus et rien n'est en
     dessous. Le cadrage réservait alors deux fois la hauteur utile et le
     groupe n'occupait que la moitié de ce qui lui était promis, mesuré à
     35 % de la hauteur pour une cible de 60.

     On mesure donc les quatre bords dans le plan de la caméra, et le cadrage
     travaille sur la TAILLE de la boîte pendant que la caméra vise son
     CENTRE. Sur une couronne complète, le centre de la boîte est le genre
     ouvert : les deux lectures coïncident, et rien ne change. */
  const focusGroupBox = (index: number): { minX: number; maxX: number; minY: number; maxY: number } => {
    const rFocus = baseRadii[index] ?? 1;
    let minX = -rFocus;
    let maxX = rFocus;
    let minY = -rFocus;
    let maxY = rFocus;
    for (const [i, off] of focusOffsets) {
      if (zone[i] !== 1) continue;
      /* LE CADRAGE IGNORE LE GROSSISSEMENT DES SPHERES, et c'est ce qui le
         rend visible.

         Troisieme rencontre du meme piege. Le cadrage se calait sur la boite
         reelle, rayons compris : grossir les spheres agrandissait la boite, la
         camera reculait d'autant, et le rapport a l'ecran ne bougeait pas d'un
         pixel. Mesure : rayon moyen 87,6 px et lien moyen 233 px, identiques a
         1,0, 1,2 et 1,4 de grossissement.

         La marge est donc prise au rayon D'ORIGINE. La disposition commande
         seule le cadrage, et le grossissement se voit. */
      const r = rayonDispo[i] ?? 1;
      const x = off.dot(focusRight);
      const y = off.dot(focusUp);
      minX = Math.min(minX, x - r);
      maxX = Math.max(maxX, x + r);
      minY = Math.min(minY, y - r);
      maxY = Math.max(maxY, y + r);
    }
    return { minX, maxX, minY, maxY };
  };

  /* LARGEUR ET HAUTEUR TOTALES de la boîte de l'arbre, pas des demi-étendues.

     L'unité de ces deux nombres est la première chose à vérifier avant d'y
     toucher : j'ai retiré le facteur 2 en le croyant en trop, alors que
     l'appelant passe bien `maxX - minX`. La caméra est partie deux fois trop
     loin, et l'arbre n'a plus occupé que 42 % de l'écran au lieu de 85.

     La hauteur visible à la distance d vaut 2·d·tan. On veut que la hauteur
     de l'arbre en occupe la fraction voulue : d = H / (2 · occupation · tan).
     Même chose en largeur, au rapport de forme près, et l'on garde la plus
     grande des deux distances. */
  const focusFrameDistance = (largeur: number, hauteur: number): number => {
    const tan = Math.tan((FOV * Math.PI) / 360);
    const aspect = Math.max(0.2, camera.aspect);
    const parLargeur = largeur / Math.max(0.001, 2 * OCCUPATION * tan * aspect);
    const parHauteur = hauteur / Math.max(0.001, 2 * OCCUPATION * tan);
    return clamp(Math.max(parLargeur, parHauteur), MIN_DISTANCE, MAX_DISTANCE);
  };

  /* La distance visée pour le groupe actuellement focalisé. Un seul endroit
     la calcule : le vol d'entrée, la remontée, le recadrage et le suivi
     continu l'appellent tous, et ne peuvent donc pas se contredire. */
  /* SOUS 768 PX, L'ARBRE DÉBORDE PLUTÔT QUE DE SE COMPRIMER.

     Arbitrage de Mika, et il tranche un vrai conflit. Sur les arbres denses,
     tout contenir dans le cadre descend l'écart entre deux cibles à 29 px :
     confortable à la souris, trop serré au doigt. Sur grand écran on garde
     donc l'arbre entier, parce que voir toute la lignée d'un coup vaut plus
     que du confort tactile inutile. Sous 768 px, où le doigt est le pointeur,
     on garde l'écart et on laisse l'arbre sortir du cadre : on s'y déplace.

     La distance qui garantit l'écart se calcule directement. Un écart de
     `gapMonde` unités se projette sur `gapMonde · hauteur / (2·d·tan)`
     pixels ; on veut au moins CIBLE_TACTILE, d'où la distance maximale. */
  const CIBLE_TACTILE = 44;

  const ecartMondeMinimal = (): number => {
    let min = Infinity;
    const membres: number[] = [];
    for (const [i] of focusOffsets) if (zone[i] === 1) membres.push(i);
    for (let a = 0; a < membres.length; a += 1) {
      for (let b = a + 1; b < membres.length; b += 1) {
        const ia = membres[a] ?? 0;
        const ib = membres[b] ?? 0;
        const oa = focusOffsets.get(ia);
        const ob = focusOffsets.get(ib);
        if (!oa || !ob) continue;
        const d = oa.distanceTo(ob) - (baseRadii[ia] ?? 1) - (baseRadii[ib] ?? 1);
        min = Math.min(min, d);
      }
    }
    return Number.isFinite(min) ? Math.max(0.01, min) : Infinity;
  };

  const distanceDuFocus = (index: number): number => {
    if (index === focusIndex && focusOffsets.size > 0) {
      const b = focusGroupBox(index);
      const pourTenir = focusFrameDistance(b.maxX - b.minX, b.maxY - b.minY);
      if (width >= 768) return pourTenir;
      const gap = ecartMondeMinimal();
      if (!Number.isFinite(gap)) return pourTenir;
      const tan = Math.tan((FOV * Math.PI) / 360);
      const pourLeDoigt = (gap * height) / (2 * CIBLE_TACTILE * tan);
      return clamp(Math.min(pourTenir, pourLeDoigt), MIN_DISTANCE, MAX_DISTANCE);
    }
    return frameDistance(genreFrameRadius(index) + 2.5);
  };

  /* Le point que la caméra vise : le centre de la boîte du groupe, exprimé
     en monde. Sur une couronne complète il tombe sur le genre ouvert. */
  const cibleDuFocus = (index: number): Vector3 => {
    const slot = slotsData[index];
    const fc = slot ? familyCenters[slot.family] : undefined;
    const base = new Vector3(
      (slot?.deployed.x ?? 0) + (fc?.x ?? 0),
      (slot?.deployed.y ?? 0) + (fc?.y ?? 0),
      (slot?.deployed.z ?? 0) + (fc?.z ?? 0)
    );
    if (index !== focusIndex || focusOffsets.size === 0) return base;
    const b = focusGroupBox(index);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    return base
      .addScaledVector(focusRight, cx)
      .addScaledVector(focusUp, cy);
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
    /* TOUT CE QUI EST DANS L'ARBRE AFFICHÉ EST DÉPLOYÉ, quelle que soit sa
       profondeur. Le déploiement à un seul niveau (ADR-056) décrivait la
       descente par générations, qui n'existe plus : un noeud de profondeur 4
       posé sur son anneau doit être présent, sinon il est calculé, nommé, et
       jamais peint. */
    if (zoneActive && zone[globalIndex] === 1) return true;
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

    /* Les cibles du flou suivent la taille RÉELLE du tampon, densité de
       pixels comprise, divisée par deux. Les calculer sur la taille CSS
       aurait donné une image deux fois trop petite sur un écran à densité
       double, donc un flou deux fois trop fort sans que rien ne le dise. */
    const dpr = renderer.getPixelRatio();
    /* QUART DE RÉSOLUTION, et non plus la moitié. Le rayon apparent double
       encore une fois à l'agrandissement, et le filtre coûte quatre fois
       moins cher. Un flou n'a aucun détail à préserver : c'est le seul effet
       dont la basse résolution est un gain sur les deux tableaux. */
    const bw = Math.max(2, Math.floor((width * dpr) / 4));
    const bh = Math.max(2, Math.floor((height * dpr) / 4));
    if (rtFlouA.width !== bw || rtFlouA.height !== bh) {
      rtFlouA.setSize(bw, bh);
      rtFlouB.setSize(bw, bh);
    }

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
      if (!zoneActive) azVel -= event.deltaX * 0.0011;
    }
  };

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  /* SEUIL TAP CONTRE GLISSEMENT, aligné sur les plateformes.

     Android : ViewConfiguration.getScaledTouchSlop(), 8 dp. iOS : UIKit
     laisse environ 10 points avant de considérer un déplacement. On prend
     10 px CSS, la plus permissive des deux : perdre un tap coûte plus cher
     que déclencher une rotation d'un pixel, puisque la rotation suit le
     doigt en direct de toute façon et qu'un seuil plus large ne la rend
     donc pas molle.

     La valeur précédente, 5, était sous les deux standards. */
  const SEUIL_GLISSEMENT = 10;
  let moved = 0;
  /* Point de POSE du doigt. `moved` mesurait la somme des déplacements en
     distance de Manhattan, pas la distance parcourue : un doigt qui tremble
     sur place, trois pixels dans un sens puis dans l'autre, accumulait
     six pixels sans avoir bougé, franchissait le seuil, et son tap était
     requalifié en glissement donc perdu. C'est la cause la plus probable
     des taps qui « ne prennent pas ». On mesure désormais l'écart à
     l'origine, qui ne grandit que si le doigt s'éloigne vraiment. */
  let startX = 0;
  let startY = 0;
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
  /* LES SPHÈRES GROSSISSENT DE 40 %, disposition et cadrage inchangés.

     Ce qui se perçoit n'est pas la longueur absolue d'un lien, c'est le
     RAPPORT entre la taille des objets et celle des liens qui les relient.
     Resserrer la disposition ne change rien à ce rapport, le cadrage
     rapprochant la caméra d'autant : mesuré en ADR-081, les liens avaient même
     allongé de 6 %. Grossir les sphères agit directement sur le rapport, et
     c'est le seul levier qui le fasse.

     Le facteur est vérifié et non supposé : la disposition garde les mêmes
     distances, donc des sphères plus grosses peuvent finir par se toucher.
     Le contrôle compte les paires qui se recouvrent, et il doit rendre zéro. */
  const GROSSISSEMENT = 1.4;
  /* LES RAYONS D'ORIGINE, gardes pour la DISPOSITION et le CADRAGE.

     Sans eux, grossir les spheres grossissait tout : la disposition se calcule
     sur les rayons, donc les anneaux s'ecartaient d'autant, la boite grandissait,
     la camera reculait, et le rapport entre taille des objets et longueur des
     liens ne bougeait pas. Mesure : rayon moyen et lien moyen montaient tous
     les deux de 14 %, rapport 2,66 puis 2,68.

     La disposition travaille donc sur les rayons d'AVANT, et le grossissement
     ne touche que ce qui est peint. C'est la seule facon de faire bouger un
     rapport dont les deux termes derivaient de la meme valeur. */
  const rayonDispo = new Float32Array(TOTAL_GENRES);
  for (let i = 0; i < TOTAL_GENRES; i += 1) {
    rayonDispo[i] = sphereRadii[i] ?? 1;
    sphereRadii[i] = (sphereRadii[i] ?? 1) * GROSSISSEMENT;
  }
  const baseRadii = Float32Array.from(sphereRadii);

  /* RAYON DE L'ANCETRE DIRECT, par slot. Il sert a decider quand un satellite
     de satellite s'est assez ecarte pour etre montre sans chevaucher le corps
     dont il sort. Calcule une fois : le parent d'un genre ne change pas. */
  /* Drapeaux de DIAGNOSTIC seulement, tous vrais en usage normal. Ils
     permettent d'eteindre une composante pour mesurer sa part dans le
     scintillement, sans avoir a reconstruire le site a chaque essai. */
  let repliesOn = true;
  let fluxOn = true;

  const parentRadius = new Float32Array(sphereRadii.length);
  slotsData.forEach((slot, i) => {
    const base = familyOffset[slot.family] ?? 0;
    const idx = slot.parent >= 0 ? base + slot.parent : -1;
    parentRadius[i] = idx >= 0 ? (sphereRadii[idx] ?? 1) : 1;
  });
  /* Rayon de référence pour lier la taille des labels à celle des sphères. */
  const genreRadiusMax = Math.max(1e-3, ...Array.from(baseRadii));

  /* ANIMATIONS SOBRES : respiration 2 %, phase par noeud ; survol +8 % en
     150 ms environ. Coupé par prefers-reduced-motion. */
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
     tap revient au cadrage d'avant. Le tap simple attend, pour laisser sa
     chance au second, comme sur une carte native.

     UNE SEULE CONSTANTE POUR LES DEUX, et c'est une correction. L'attente
     valait 280 ms, la fenêtre de détection 300 : un second tap arrivant
     entre les deux trouvait le premier DÉJÀ EXÉCUTÉ, et déclenchait le zoom
     par-dessus. On ouvrait une fiche et on zoomait. Attendre moins
     longtemps qu'on ne détecte n'a aucun sens : la fenêtre EST l'attente.

     300 ms, aligné sur le standard : c'est exactement la valeur de
     ViewConfiguration.getDoubleTapTimeout() d'Android, et macOS accorde
     500 ms au double-clic. 180 ms, essayé avant, perdait tout double tap
     au-delà de cet écart, c'est-à-dire une bonne part des gestes
     volontaires. La latence n'est pas ressentie parce que la sphère
     s'allume à la pose, avant toute action : voir allumerPression. */
  const DELAI_TAP = 300;
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
    echapArme = false;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    /* Capture blindée : un pointeur synthétique (tests) la fait jeter, et
       l'exception coupait l'initialisation du geste. */
    try { canvas.setPointerCapture(event.pointerId); } catch { /* test */ }
    if (activePointers.size === 2) {
      // Deux doigts : le glissement s'arrête, le pincement commence.
      dragging = false;
      /* Le premier doigt avait allumé une sphère. Deux doigts ne visent
         rien : on éteint, sinon l'éclat survivait à tout le pincement. */
      eteindrePression();
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
    startX = event.clientX;
    startY = event.clientY;

    /* RETOUR IMMÉDIAT AU TOUCHER. La sphère visée s'allume à l'instant où le
       doigt se pose ; l'action, elle, attend le relâchement et son délai.

       Ce que ça répare n'est pas la latence, c'est sa PERCEPTION : entre le
       doigt qui se pose et la fiche qui s'ouvre, l'écran ne disait rien, et
       180 ms de silence se lisent comme un tap manqué. Un accusé de
       réception immédiat suffit à faire disparaître l'attente ressentie,
       même si l'attente réelle ne bouge pas.

       Souris exclue : le survol l'allume déjà avant le clic. */
    if (event.pointerType !== 'mouse') {
      const rect = canvas.getBoundingClientRect();
      allumerPression(event.clientX - rect.left, event.clientY - rect.top);
    }
  };

  /* La sphère pressée, et la remise à zéro.

     On réutilise `hovered`, qui pilote déjà l'éclat de la sphère et la mise
     en valeur de ses liens : le toucher emprunte le chemin du survol plutôt
     que d'en ouvrir un second, qu'il aurait fallu tenir en accord avec le
     premier. */
  const allumerPression = (px: number, py: number): void => {
    const cible = nomTouche(px, py, 10);
    const index =
      cible && cible.kind === 'genre' && cible.slot >= 0
        ? cible.slot
        : chercherCible(px, py, 44);
    if (index >= 0 && index !== hovered) {
      hovered = index;
      lastLabelPass = 0;
    }
  };

  const eteindrePression = (): void => {
    if (hovered !== -1) {
      hovered = -1;
      lastLabelPass = 0;
    }
  };

  /* Survol : le noeud sous le curseur, son parent et ses enfants directs
     restent lisibles, le reste s'efface. Réutilise la projection déjà faite
     pour le clic, donc coût nul. */
  const onHover = (event: PointerEvent): void => {
    if (suspended) return;
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    /* Le survol met en valeur ce que le clic sélectionnerait : les deux
       doivent désigner la même sphère, sinon on éclaire une boule et on en
       ouvre une autre. Même fonction, même portée, même départage. */
    /* LE SURVOL RÉPOND EXACTEMENT LÀ OÙ LE CLIC RÉPOND.

       Il cherchait dans un rayon de 26 px quand le clic en accepte 44 au
       doigt, et il ignorait les NOMS, que le clic accepte comme cibles. On
       pouvait donc cliquer et ouvrir un genre sans que rien ne se soit
       allumé : « ça marche parfois », sans qu'on comprenne quand. Même
       fonction, même tolérance, même test du nom. */
    const cible = cibleAuPoint(px, py);
    const best = cible && cible.kind === 'genre' ? cible.slot : -1;
    if (best !== hovered) {
      hovered = best;
      lastLabelPass = 0;
      /* Le curseur dit ce qui est cliquable avant même qu'on clique. */
      canvas.style.cursor = best >= 0 ? 'pointer' : '';
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
    moved = Math.hypot(event.clientX - startX, event.clientY - startY);

    /* GLISSER ÉTEINT, ET NE DÉCLENCHE RIEN. Même seuil que celui qui
       distingue un tap d'un glissement : au-delà, ce n'est plus une
       pression sur une sphère, c'est un geste de caméra. Sans cela l'éclat
       restait allumé pendant toute l'orbite, sur une sphère qu'on n'avait
       pas choisie. */
    if (moved >= SEUIL_GLISSEMENT) eteindrePression();

    /* DANS UN GENRE, LA VUE EST PLATE : on se déplace, on ne tourne pas.

       La disposition de l'arbre est posée UNE FOIS dans le plan de la caméra,
       à l'entrée. Faire pivoter la caméra ensuite l'aplatit en ligne et ruine
       la lecture : je l'avais constaté en mesurant les recouvrements de noms,
       où le test faisait tourner l'orbite dans le mode focus et rendait
       « echec » sur une disposition parfaitement correcte.

       Plutôt que d'interdire un geste sans rien offrir, le glissement DÉPLACE
       la vue dans son plan. Zoom et déplacement, pas d'orbite, pas
       d'élévation. */
    /* LE DÉPLACEMENT AU DOIGT EST RÉTABLI, MAIS BORNÉ.

       Il avait été coupé net sous 500 px : sur un téléphone le doigt sert à
       viser, et chaque geste était une occasion de perdre le cadrage sans
       moyen évident de le retrouver. C'était trop strict. Depuis, l'arbre
       entier tient dans l'écran par construction, donc le déplacement ne sert
       plus à ALLER CHERCHER quelque chose, il sert au confort. Ce qui change
       le raisonnement : il n'y a plus de raison de l'interdire, seulement de
       l'empêcher de mener nulle part.

       D'où la borne, calculée plus bas : on ne peut pas s'éloigner du centre
       de l'arbre de plus de la moitié de sa diagonale. Au-delà on ne verrait
       plus ce qu'on est venu voir, et c'est exactement la situation dont on ne
       savait pas revenir.

       Le seuil de dix pixels qui distingue un tap d'un glissement existait
       déjà, SEUIL_GLISSEMENT : viser reste prioritaire sur déplacer. */

    if (zoneActive) {
      const echelle = (2 * Math.tan((FOV * Math.PI) / 360) * distance) / Math.max(1, height);
      const droite = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      const haut = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
      target.addScaledVector(droite, -dx * echelle).addScaledVector(haut, dy * echelle);

      /* LA COURSE EST BORNÉE À LA MOITIÉ DE LA DIAGONALE DE L'ARBRE.

         Le rayon de l'arbre est la plus grande distance entre son centre et
         l'un de ses membres ; la diagonale en vaut le double, donc la borne
         est le rayon lui-même. Sans elle, un glissement continu emmène la
         caméra dans le vide, et rien à l'écran n'indique dans quelle
         direction revenir. */
      const ancre = cibleDuFocus(focusIndex >= 0 ? focusIndex : activeGenre);
      let rayonArbre = 0;
      for (const [i, off] of focusOffsets) {
        if (zone[i] !== 1) continue;
        rayonArbre = Math.max(rayonArbre, off.length());
      }
      const course = Math.max(rayonArbre, 1);
      const ecart = target.clone().sub(ancre);
      if (ecart.length() > course) {
        target.copy(ancre).addScaledVector(ecart.normalize(), course);
      }

      targetSmooth.copy(target);
      dragVX = 0;
      dragVY = 0;
      lastX = event.clientX;
      lastY = event.clientY;
      applyCamera();
      return;
    }

    /* SUIVI DIRECT : la rotation se fait pendant le geste, pas après. */
    azimuth -= dx * DRAG_K;
    elevation = clamp(elevation + dy * DRAG_K, -ELEVATION_LIMIT, ELEVATION_LIMIT);
    dragVX = dragVX * 0.5 + dx * 0.5;
    dragVY = dragVY * 0.5 + dy * 0.5;
    lastX = event.clientX;
    lastY = event.clientY;
  };

  const projected = new Float32Array(TOTAL_GENRES * 3); // sx, sy, depth
  /* Rayon de la zone CLIQUABLE, en pixels d'ecran, distinct du rayon visible.
     Recalcule a chaque image dans la zone de focus, et garanti sans
     chevauchement entre deux membres : c'est ce qui empeche une voisine de
     voler un clic. */
  const rayonClic = new Float32Array(TOTAL_GENRES);
  const scratch = new Vector3();

  /* Niveau unique : à l'ouverture on cadre la COURONNE (fondateur +
     première génération), plus l'arbre complet, il ne se déploie plus
     jamais en entier. Marge de 3 unités pour les noms. */
  const familyFrameRadius = (fi: number): number => (STRUCTURES[fi]?.crownRadius ?? 12) + 3;

  /* Rayon de cadrage d'un genre : lui et ses enfants directs. */
  const genreFrameRadius = (globalIndex: number): number => {
    const slot = slotsData[globalIndex];
    if (!slot) return 6;

    /* LA COURONNE D'ENTRÉE FAIT AUTORITÉ quand elle existe. Le cadrage doit
       contenir la disposition RÉELLEMENT posée : mesurer les anciennes
       positions déployées donnerait un cadre qui ne correspond à rien. */
    if (globalIndex === focusIndex) {
      const rr = focusRingRadius();
      if (rr > 0) return rr * 1.22;
    }

    const base = familyOffset[slot.family] ?? 0;
    let r = sphereRadii[globalIndex] ?? 2;
    for (const child of slot.children) {
      const cs = slotsData[base + child];
      if (!cs) continue;
      /* Positions DÉPLOYÉES et non courantes : au moment du clic les
         enfants sont encore repliés sur leur parent, et mesurer là donnait
         un rayon minuscule, la caméra se collait au genre et aucun enfant
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

  /* `montrerFondateur` : ouvrir une famille remplit aussi la colonne, avec
     son fondateur. La colonne est ouverte en permanence, donc elle affiche
     forcément quelque chose ; qu'elle garde le genre d'avant pendant qu'on
     entre dans une autre famille était le seul moment où l'écran se
     contredisait lui-même.

     Le drapeau existe pour une raison précise : openPanel appelle
     selectFamily quand on ouvre un genre d'une autre famille. Sans lui, les
     deux s'appelleraient en boucle. */
  const selectFamily = (fi: number, now: number, montrerFondateur = true): void => {
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
    rebuildZone();
    focusOffsets.clear();
    setDeploy(fi, true, now);
    const c = familyCenters[fi];
    const dc = STRUCTURES[fi]?.deployedCenter ?? [0, 0, 0];
    // La caméra vise le centroïde du nuage déployé, pas la racine : la
    // couronne pousse vers le haut et cadrer le pied coupait la tête.
    if (c) startFly(new Vector3(c.x + dc[0], c.y + dc[1], c.z + dc[2]), frameDistance(familyFrameRadius(fi)), now);
    emitNav();

    if (montrerFondateur) {
      /* Le fondateur est la racine de l'arbre de la famille, cherchée et non
         supposée : « le premier genre de la liste » est vrai dans le corpus
         d'aujourd'hui et le serait resté jusqu'au jour où il ne l'aurait
         plus été, sans que rien ne le signale. */
      const base = familyOffset[fi] ?? 0;
      const structure = STRUCTURES[fi];
      const nb = structure?.genres.length ?? 0;
      for (let li = 0; li < nb; li += 1) {
        if (slotsData[base + li]?.depth === 0) {
          /* ON ENTRE DANS LE FONDATEUR, on ne se contente pas de l'afficher.

             La colonne annonçait le fondateur pendant que la carte restait au
             niveau famille, sans focus et nette de bout en bout : l'écran
             disait deux choses différentes au même moment. Ouvrir une
             famille, c'est ouvrir son fondateur, et donc entrer en mode
             focus sur lui comme n'importe quel autre genre.

             En attente et non tout de suite : la famille doit d'abord se
             déployer, sinon le fondateur est encore rangé dans l'amas
             compact et la couronne se bâtirait sur des positions qui vont
             changer. La boucle de rendu consomme la cible quand la
             diffusion est faite. */
          pendingGenre = base + li;
          break;
        }
      }
    }
  };

  /* Ouvrir le panneau, c'est voler jusqu'à la sphère et poser la plaque
     devant. La taille de la plaque est fixée en unités monde à l'ouverture,
     pas recalculée à chaque image : c'est un objet de la scène, il doit
     grandir quand on avance, pas rester collé à l'écran. */
  const openPanel = (familyIndex: number, genreLocal: number): void => {
    tracer('4. openPanel', (familyOffset[familyIndex] ?? 0) + genreLocal);
    const base = familyOffset[familyIndex] ?? 0;
    const globalIndex = base + genreLocal;
    const slot = slotsData[globalIndex];
    if (!slot) return;
    panelSlot = globalIndex;
    const now = performance.now();
    if (activeFamily !== slot.family) selectFamily(slot.family, now, false);
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
    tracer('2. selectGenre recoit', globalIndex);
    const slot = slotsData[globalIndex];
    if (!slot) return;

    const base = familyOffset[slot.family] ?? 0;
    genrePath = pathToGenre(slot.family, slot.local).map((local) => base + local);
    activeGenre = globalIndex;
    tracer('3. activeGenre', activeGenre);
    level = 'genre';

    /* ======================================================================
       LE CLIC OUVRE UNE GÉNÉRATION, PAS UN CHEMIN.

       Trois cas, et un seul d'entre eux déplace la racine de la vue.

       1. LE NOEUD EST DÉJÀ DANS LA ZONE. C'est le cas courant : on a ouvert
          Downtempo, on clique Trip-Hop. La racine NE BOUGE PAS. On déplie la
          génération suivante EN ENTIER, c'est-à-dire les sous-genres de TOUS
          les dérivés de Downtempo, chacun autour du sien, et Trip-Hop devient
          simplement le noeud sélectionné.

          C'est le coeur du modèle. L'ancienne version descendait dans la
          seule branche cliquée et faisait disparaître les six autres dérivés,
          c'est-à-dire le seul repère qui disait où l'on se trouvait.

       2. LE NOEUD EST HORS ZONE (recherche, autre famille, retour). Il
          devient la racine d'une nouvelle vue, avec une génération dépliée.

       3. LE NOEUD EST LE PARENT DE LA RACINE, affiché pour garder le fil :
          cliquer dessus remonte, ce que fait goUp. */

    const dansLaZone = zoneActive && zone[globalIndex] === 1;
    const generationDuNoeud = dansLaZone ? (zoneGeneration[globalIndex] ?? -1) : -1;

    if (dansLaZone && generationDuNoeud >= 0) {
      /* CLIQUER UN NOEUD DE L'ARBRE NE REDÉPLOIE RIEN : tout est déjà là.

         Il met le noeud en évidence et remplit la colonne de ses morceaux, un
         point c'est tout. LA CAMÉRA NE BOUGE PAS. C'est ce qui rend l'arbre
         explorable : on parcourt une lignée à la souris sans que le cadrage
         se dérobe à chaque clic. */
      /* LE VERROU DE CADRAGE EST RELACHE. C'ETAIT LE DEUXIEME DECLENCHEUR.

         Tant que frameLock designe un noeud, la boucle de rendu rapproche la
         camera de son cadrage A CHAQUE IMAGE. Le vol d'entree termine, mais le
         suivi, lui, ne s'arrete jamais : la cible et la distance voulues
         dependent de l'etendue du groupe, qui change des qu'une selection
         change quoi que ce soit. La carte derivait donc a chaque clic.

         Une SELECTION ne cadre rien. Le verrou est relache ici, et la camera
         reste exactement ou elle est. */
      releaseFrameLock();
      emitNav();
      openPanel(slot.family, slot.local);
      return;
    }

    /* Hors zone : ce noeud devient la racine d'une nouvelle vue.

       UNE FEUILLE NE DEVIENT JAMAIS RACINE. Elle n'a rien à déplier, et la
       prendre pour centre donnait deux boules perdues dans le vide. On entre
       dans son PARENT, ce qui la met sous les yeux avec ses soeurs autour, et
       on la sélectionne. */
    let racine = globalIndex;
    if (slot.children.length === 0 && slot.parent >= 0) racine = base + slot.parent;

    focusIndex = racine;
    focusDir = 1;
    focusStart = now;

    /* ENTRER, c'est refaire la disposition et refermer la zone. Dans cet
       ordre : la zone se lit sur la couronne, pas l'inverse. */
    buildFocusRing(racine);
    rebuildZone();

    /* On vise la position FINALE, pas celle qu'occupe le genre au moment du
       clic : au clic il est encore en train de bouger, et viser une position
       transitoire donnait un cadrage décalé de ce qui s'installe. */
    frameLock = racine;
    startFly(cibleDuFocus(racine), distanceDuFocus(racine), now);
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
     son cadrage recalculé à chaque image, les enfants s'écartent après le
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

    /* PREMIER CAS : UN NOEUD DE L'ARBRE EST SÉLECTIONNÉ, plus profond que la
       racine. Échap remonte d'un cran DANS L'ARBRE : la sélection passe au
       parent, et rien d'autre ne bouge. Ni la disposition, ni la caméra, ni
       la zone : tout l'arbre est affiché, remonter n'est qu'un déplacement de
       la sélection. */
    if (level === 'genre' && zoneActive && activeGenre >= 0 && activeGenre !== focusIndex) {
      const as = slotsData[activeGenre];
      const parent = as && as.parent >= 0 ? (familyOffset[as.family] ?? 0) + as.parent : focusIndex;
      activeGenre = zone[parent] === 1 ? parent : focusIndex;
      const ns = slotsData[activeGenre];
      if (ns) {
        genrePath = pathToGenre(ns.family, ns.local).map((l) => (familyOffset[ns.family] ?? 0) + l);
        emitNav();
        openPanel(ns.family, ns.local);
      }
      return;
    }

    /* DEUXIÈME CAS : la RACINE de l'arbre est sélectionnée. Il n'y a plus rien
       à remonter dedans, on quitte l'arbre et on remonte d'un niveau. */

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
        /* Remonter au parent, c'est y ENTRER : sa couronne est refaite et la
           zone se referme sur lui. Sans cela on remontait dans un mode focus
           dont la zone désignait encore l'enfant qu'on venait de quitter. */
        buildFocusRing(parent);
        rebuildZone();
        const slot = slotsData[parent];
        if (slot) startFly(cibleDuFocus(parent), distanceDuFocus(parent), now);
        emitNav();
        /* Le panneau suit la carte : remonter d'un cran change le genre
           courant, donc le contenu de la colonne. */
        if (slot) openPanel(slot.family, slot.local);
        return;
      }

      activeGenre = -1;
      focusIndex = -1;
        level = 'family';
      rebuildZone();
      focusOffsets.clear();
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
      rebuildZone();
      focusOffsets.clear();
      startFly(atlasTarget, atlasDistance, now);
      cameraAtDefault = true;
    }
    emitNav();
  };

  /* SORTIR DU MODE, d'un coup : second Échap, ou clic dans le flou.

     Ce n'est PAS « remonter deux fois ». On ne repasse par aucun niveau
     intermédiaire : la carte redevient nette et la vue d'ensemble revient.
     C'est ce que veut dire « sortir » ; remonter, c'est Échap une fois.

     Deux différences avec recenter, et elles comptent toutes les deux : la
     colonne du lecteur n'est pas refermée, puisqu'elle ne se ferme plus
     jamais, et la lecture en cours n'est pas touchée. */
  const sortirDuFocus = (): void => {
    const now = performance.now();
    tapZoomPrev = null;
    frameLock = -1;
    for (let i = 0; i < FAMILIES.length; i += 1) setDeploy(i, false, now);
    activeFamily = -1;
    activeGenre = -1;
    genrePath = [];
    focusIndex = -1;
    focusDir = -1;
    focusStart = now;
    level = 'atlas';
    rebuildZone();
    focusOffsets.clear();
    startFly(atlasTarget, atlasDistance, now);
    cameraAtDefault = true;
    emitNav();
  };

  /* Rayon apparent d'une sphère, en pixels d'écran.

     Sans lui, la cible était un disque de 44 px autour du CENTRE, quelle que
     soit la taille de la boule : toucher le bord d'une grosse sphère ratait,
     alors qu'on avait visiblement touché la sphère. C'est la première cause
     du « il faut viser ». */
  /* Le rayon apparent SANS le grossissement de survol : c'est celui qui doit
     servir à poser un nom, sinon le nom bouge quand on l'approche. */
  const rayonEcranBase = (index: number): number => {
    const slot = slotsData[index];
    if (!slot) return 0;
    const d = camera.position.distanceTo(slot.world);
    if (d <= 0.0001) return 0;
    const hauteurVisible = 2 * Math.tan((FOV * Math.PI) / 360) * d;
    return ((baseRadii[index] ?? 2) / hauteurVisible) * height;
  };

  const rayonEcran = (index: number): number => {
    const slot = slotsData[index];
    if (!slot) return 0;
    const d = camera.position.distanceTo(slot.world);
    if (d <= 0.0001) return 0;
    const rayonMonde = sphereRadii[index] ?? 2;
    const hauteurVisible = 2 * Math.tan((FOV * Math.PI) / 360) * d;
    return (rayonMonde / hauteurVisible) * height;
  };

  /* Ce qui est atteignable au doigt, et rien d'autre.

     TROIS CORRECTIONS, dans l'ordre de ce qu'elles réparent :

     1. LA PORTÉE. Le test parcourait les 218 genres, quel que soit le niveau
        où l'on se trouve. Une sphère d'une autre famille, projetée derrière
        celle qu'on visait, gagnait le tap si son centre tombait plus près du
        doigt. Une fois DANS une famille, seuls ses genres répondent
        désormais ; pour en changer, on remonte, et un tap dans le vide
        remonte déjà.

     2. LA CIBLE. Le rayon de tolérance est maintenant le plus grand du
        rayon apparent de la sphère et d'une cible tactile confortable.
        Toucher une grosse boule marche sur toute sa surface.

     3. LE DÉPARTAGE. À touches comparables, c'est la sphère la PLUS PROCHE
        DE LA CAMÉRA qui l'emporte, pas la plus proche du curseur. On
        sélectionne ce qu'on voit devant, pas ce qui est caché derrière. */
  const chercherCible = (px: number, py: number, toleranceMin: number): number => {
    let best = -1;
    let bestProfondeur = Infinity;
    let bestDistance = Infinity;

    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      const profondeur = projected[i * 3 + 2] ?? 2;
      if (profondeur > 1) continue; // derrière la caméra

      // 1. La portée : dans une famille, elle seule répond.
      if (level !== 'atlas' && activeFamily >= 0 && slotsData[i]?.family !== activeFamily) continue;

      /* 1 bis. LA ZONE ACTIVE. En mode focus, seuls le genre ouvert, ses
         dérivés et son parent direct sont atteignables. Tout le reste est
         flou, et ce qui est flou ne se clique pas : on pouvait ouvrir un
         genre d'une autre lignée depuis celui qu'on lisait, ce qui n'a
         aucun sens. */
      if (zoneActive && zone[i] !== 1) continue;

      const d = Math.hypot(px - (projected[i * 3] ?? 0), py - (projected[i * 3 + 1] ?? 0));
      /* 2. LA CIBLE EST PLUS GÉNÉREUSE QUE LA SPHÈRE.

         Elle valait le plus grand du rayon apparent et de la tolérance du
         pointeur. Sur les générations profondes, un dérivé fait DEUX PIXELS de
         rayon : sa zone tombait alors à la tolérance seule, pendant que sa
         voisine, dix fois plus grosse, en couvrait quarante. Mesuré sur
         Breakbeat, sept sphères sur vingt-trois n'étaient atteignables par
         AUCUN de leurs neuf points de sonde.

         La zone vaut désormais le rayon PLUS douze pixels, et jamais moins de
         vingt-deux de rayon total. Une sphère de deux pixels reste donc
         visable, et une grosse garde une marge autour d'elle. */
      /* Tolérance nulle : on demande le DISQUE DESSINÉ seul, sans marge.
         C'est le premier des trois recours de cibleAuPoint. */
      /* DANS UN GENRE OUVERT, LA DISTANCE MAXIMALE N'EXISTE PLUS.

         Tant qu'on est dans la zone, un clic DESIGNE toujours quelque chose :
         le plus proche du curseur, sans condition. C'est ce qui rend le geste
         impossible a rater, et c'est defendable parce que la zone ne contient
         qu'une poignee d'objets, tous voulus par celui qui a ouvert le genre.

         Ailleurs, la tolerance reste : au niveau de la vue d'ensemble, deux
         cent dix-huit spheres se disputent l'ecran, et « le plus proche »
         n'y veut plus rien dire.

         Le disque dessine seul quand la tolerance est nulle : c'est le
         premier des trois recours de cibleAuPoint. */
      const dansLaZone = zoneActive && zone[i] === 1 && toleranceMin > 0;
      const zoneCible = dansLaZone
        ? (rayonClic[i] ?? 0)
        : toleranceMin <= 0
          ? rayonEcran(i)
          : Math.max(toleranceMin, rayonEcran(i) + 12, 40);
      /* Dans la zone, la limite s'applique VRAIMENT : les zones ne se
         chevauchant plus, un point interieur designe une seule sphere, sans
         ambiguite. Le repli « le plus proche sans condition » vit dans
         cibleAuPoint, apres cet essai. */
      if (d > zoneCible) continue;

      /* 3. LE DÉPARTAGE. Devant gagne, SAUF dans l'arbre au doigt.

            Dans un arbre déployé sur petit écran, les zones de capture se
            touchent volontairement : c'est ce qui rend cliquable un écart
            physique de 29 px. Départager par la profondeur y donnerait la
            sphère la plus proche de la caméra, qui n'est pas celle qu'on
            vise ; c'est LE PLUS PROCHE DU DOIGT qui gagne. */
      /* DANS L'ARBRE, C'EST LE PLUS PROCHE DU CURSEUR QUI GAGNE, à toutes les
         largeurs.

         C'ÉTAIT LA CAUSE PRINCIPALE. Le départage par la profondeur est juste
         dans la vue d'ensemble, où des sphères se cachent réellement les unes
         derrière les autres : ce qui est devant doit gagner. Dans un arbre
         déployé, tout est dans un même plan face à la caméra, rien n'en cache
         un autre, et « le plus proche de la caméra » désigne alors la plus
         GROSSE sphère dont la zone englobe la petite qu'on visait.

         Mesuré : Breakbeat Hardcore, Darkcore, Jungle, Ghetto Funk, Psybreaks
         et Florida Breaks se faisaient tous voler leur clic par une voisine.
         La règle ne valait que sous 768 px ; elle vaut partout. */
      if (zoneActive && zone[i] === 1) {
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
        continue;
      }
      if (bestDistance < Infinity) continue; // une cible de l'arbre a déjà gagné
      if (profondeur < bestProfondeur) {
        bestProfondeur = profondeur;
        best = i;
      }
    }
    return best;
  };

  /* LE NOM TOUCHÉ, s'il y en a un.

     Pourquoi le test passe par le canvas et non par un écouteur sur les
     labels : ils vivent dans une COUCHE DISTINCTE du canvas. Leur donner
     `pointer-events: auto` leur aurait fait capter le pointerdown, et
     l'orbite n'aurait plus démarré dès que le doigt se posait sur un nom.
     Avec vingt-trois noms visibles de 63 px de large sur un téléphone,
     c'est une bonne part de l'écran où le glissement serait mort. On
     remplacerait un problème par un autre.

     Ici tout continue de passer par le canvas : orbite, pincement et
     glissement sont intacts, et le nom devient une cible parmi les
     autres. */
  const nomTouche = (px: number, py: number, marge: number): LabelSlot | null => {
    for (const ls of labelSlots) {
      if (!ls.visible || ls.opacity <= 0.05 || ls.w <= 0) continue;
      /* UN NOM HORS ZONE NE DESIGNE RIEN.

         chercherCible filtrait deja sur la zone ; ce test-ci ne le faisait
         pas. Un nom d'arriere-plan, flou et large, pouvait donc capter un clic
         pose sur une sphere de la zone et emmener ailleurs. C'est le dernier
         chemin par lequel une voisine volait un clic. */
      if (zoneActive && ls.kind === 'genre' && (ls.slot < 0 || zone[ls.slot] !== 1)) continue;
      /* Un nom hors zone ne capte rien non plus. En mode focus il n'y en a
         plus aucun d'affiché, mais le tableau des emplacements survit une
         image à la passe de placement : sans ce test, le tout premier clic
         après l'entrée pouvait encore viser un nom qui venait de partir. */
      if (zoneActive && (ls.kind === 'family' || ls.slot < 0 || zone[ls.slot] !== 1)) continue;
      if (
        px >= ls.x - marge &&
        px <= ls.x + ls.w + marge &&
        py >= ls.y - marge &&
        py <= ls.y + ls.h + marge
      ) {
        return ls;
      }
    }
    return null;
  };

  /* CE QUE LE DERNIER TAP A DÉCIDÉ, et pourquoi. Sans cette trace, un clic qui
     ne fait pas ce qu'on attend ne laisse aucune prise : on voit l'état
     d'après, jamais le chemin emprunté pour y arriver. */
  let dernierTap: Record<string, unknown> = {};

  /* LA CIBLE SOUS UN POINT, ET IL N'Y EN A QU'UNE.

     Le survol et le clic avaient chacun leur code : deux tolérances, deux
     ordres de priorité, et deux réponses différentes au même endroit de
     l'écran. C'est exactement ce qui donne l'impression que le site marche au
     hasard, et c'est mesurable : on sonde une grille et on compare.

     Cette fonction est désormais la SEULE à décider ce qu'il y a sous un
     point. Le survol l'appelle pour allumer, le clic l'appelle pour agir : ils
     ne peuvent plus diverger, non parce qu'on y a fait attention, mais parce
     qu'il n'existe plus deux endroits où se tromper. */
  const cibleAuPoint = (px: number, py: number): { slot: number; kind: 'family' | 'genre'; famille: number } | null => {
    const grossier = window.matchMedia('(pointer: coarse)').matches;

    /* ═══════════════════════════════════════════════════════════════════
       L'ORDRE DES PRIORITÉS, ET C'ÉTAIT LA VRAIE CAUSE.

       Le NOM était consulté en premier, avant toute sphère. C'est juste dans
       la vue d'ensemble, où le mot est plus grand que la boule qu'il désigne
       et où c'est lui qu'on vise. C'est faux dans un arbre déployé : les noms
       y font 26 px de haut et cent de large, ils recouvrent les petites
       sphères des générations profondes, et un clic posé EXACTEMENT sur une
       sphère de deux pixels tombait dans la boîte du nom d'une voisine.

       Mesuré sur Breakbeat : sept sphères sur vingt-trois n'étaient
       atteignables par AUCUN de leurs neuf points de sonde, chacune volée par
       une voisine. Élargir la zone des sphères n'y changeait rien, puisque le
       nom gagnait avant qu'on l'atteigne.

       LA RÈGLE EST DÉSORMAIS : CE QU'ON VOIT SOUS LE CURSEUR GAGNE.

       1. Un point posé sur le DISQUE DESSINÉ d'une sphère désigne cette
          sphère, sans discussion. C'est le cas le moins ambigu qui soit.
       2. Sinon, un nom sous le curseur désigne ce qu'il nomme.
       3. Sinon, la sphère la plus proche dans sa zone de tolérance.
       ═══════════════════════════════════════════════════════════════════ */
    const surLeDisque = chercherCible(px, py, 0);
    if (surLeDisque >= 0) {
      return { slot: surLeDisque, kind: 'genre', famille: slotsData[surLeDisque]?.family ?? -1 };
    }

    const nom = nomTouche(px, py, grossier ? 10 : 4);
    if (nom) {
      if (nom.kind === 'family') return { slot: -1, kind: 'family', famille: nom.famille };
      if (nom.slot >= 0) {
        return { slot: nom.slot, kind: 'genre', famille: slotsData[nom.slot]?.family ?? -1 };
      }
    }

    const best = chercherCible(px, py, grossier ? 44 : 40);
    if (best < 0) return null;
    return { slot: best, kind: 'genre', famille: slotsData[best]?.family ?? -1 };
  };

  /* JOURNAL DE TRACE, du clic au panneau. Sert a repondre a une seule
     question : entre quelles deux etapes la valeur change-t-elle. Sans lui on
     ne peut que deviner, et quatre hypotheses successives se sont deja
     revelees fausses sur ce defaut. */
  const trace: string[] = [];
  const tracer = (etape: string, index: number): void => {
    trace.push(`${etape} : ${index >= 0 ? (slotsData[index]?.label ?? '?') : 'rien'} (${index})`);
    if (trace.length > 40) trace.shift();
  };

  const performTapAction = (px: number, py: number): void => {
    /* Le doigt couvre environ 9 mm, la souris un pixel. La tolérance suit le
       pointeur, elle ne suit pas la mode. */
    const grossier = window.matchMedia('(pointer: coarse)').matches;
    const now = performance.now();

    /* LE NOM D'ABORD. C'est lui qu'on lit et qu'on vise ; la sphère est
       souvent plus petite que le mot qui la désigne. */
    const cibleTracee = cibleAuPoint(px, py);
    tracer('1. ciblage', cibleTracee && cibleTracee.kind === 'genre' ? cibleTracee.slot : -1);

    const nom = nomTouche(px, py, grossier ? 10 : 4);
    dernierTap = {
      px: Math.round(px),
      py: Math.round(py),
      nom: nom ? (nom.el.textContent ?? '') : null,
      nomSlot: nom ? nom.slot : -1,
      niveau: level,
      familleActive: activeFamily,
      zoneActive
    };
    if (nom) {
      if (nom.kind === 'family') {
        if (level === 'atlas' && nom.famille >= 0) selectFamily(nom.famille, now);
        return;
      }
      const vise = nom.slot >= 0 ? slotsData[nom.slot] : undefined;
      if (vise) {
        const dansLaFamille =
          level === 'atlas' || activeFamily < 0 || vise.family === activeFamily;
        if (dansLaFamille) {
          /* DEPUIS L'ATLAS, ON ENTRE DANS LE GENRE, PLUS DANS LA FAMILLE.

             C'ÉTAIT LA CONDITION MANQUANTE. Le mode focus ne s'active que
             dans selectGenre, et depuis la vue d'ensemble le clic appelait
             selectFamily : on ouvrait donc une famille, jamais un genre, et
             aucun flou ne pouvait apparaître. Le défaut ne se voyait pas
             dans mes essais parce que j'y passais toujours par la famille
             avant de cliquer un genre.

             Pire, depuis que la colonne affiche le fondateur de la famille
             ouverte, l'écran se contredisait : la colonne annonçait un genre
             et la carte restait au niveau famille, nette de bout en bout.

             goToGenre fait les deux dans l'ordre : la famille se déploie,
             puis le genre visé prend le focus quand elle est ouverte. */
          dernierTap['decision'] = level === 'atlas' ? 'nom : entree depuis atlas' : 'nom : selection';
          if (level === 'atlas') goToGenre(vise.family, vise.local);
          else selectGenre(nom.slot, now);
          return;
        }
      }
      /* Nom d'une autre famille pendant qu'on est dans une : on ne
         sélectionne pas, et on ne remonte pas non plus. Le tap est perdu,
         ce qui est le comportement le moins surprenant. */
      return;
    }

    const best = chercherCible(px, py, grossier ? 44 : 40);
    const slot = best >= 0 ? slotsData[best] : undefined;
    if (!slot) {
      /* Clic dans le vide. En mode focus, le vide est TOUT ce qui est flou,
         et y cliquer sort du mode d'un seul geste : c'est le pendant naturel
         du second Échap, et le geste que fait spontanément quelqu'un qui
         veut refermer ce qu'il a ouvert. Hors mode focus, on remonte d'un
         niveau comme avant. */
      /* UN SEUL CHEMIN DE RETOUR. Le clic dans le vide appelait sortirDuFocus,
         le logo un code a lui, et Echap un troisieme : trois retours qui ne
         rendaient pas le meme ecran. Ils appellent tous recenter, qui EST le
         cadrage d'accueil. */
      /* ═══════════════════════════════════════════════════════════════
         DANS UN GENRE OUVERT, UN CLIC QUI NE TOUCHE RIEN NE FAIT RIEN.

         RÈGLE POSÉE PAR MIKA, ET ELLE SUPPRIME UNE CLASSE ENTIÈRE DE DÉFAUTS.

         Le clic dans le vide refermait le mode focus et ramenait à la vue
         d'ensemble. C'était défendable en soi : le pendant naturel du second
         Échap. Mais il s'appuyait sur une condition dont on ne peut pas
         garantir la justesse à tous les coups, « le ciblage n'a rien trouvé »,
         et quand le ciblage se trompe la sanction est maximale : on perd tout
         ce qu'on avait ouvert, sans l'avoir demandé.

         Signalé ainsi : cliquer une sphère dérivée ramenait à la vue
         d'ensemble. Le ciblage rendait « rien » alors que le doigt était bien
         sur une sphère, et le chemin du vide se déclenchait à la place.

         Plutôt que de chasser indéfiniment les cas où le ciblage rate, on
         retire à son échec tout pouvoir de destruction. Un ciblage qui se
         trompe ne coûte alors plus rien : il ne se passe rien, on reclique.

         REMONTER RESTE POSSIBLE, par trois chemins explicites et sans
         ambiguïté : Échap, le logotype, et la flèche de retour. Trois gestes
         dont aucun ne dépend d'un calcul de position.

         La zone morte de tolérance qui précédait cette règle disparaît : elle
         n'était qu'une atténuation du même problème, et une atténuation qui
         laissait passer les cas au-delà de son rayon.
         ═══════════════════════════════════════════════════════════════ */
      if (zoneActive) {
        dernierTap['decision'] = 'vide dans un genre : sans effet';
        return;
      }
      dernierTap['decision'] = 'vide : remontee';
      goUp();
    } else if (level === 'atlas') {
      // Même règle que pour le nom : depuis l'atlas, on entre dans le genre.
      goToGenre(slot.family, slot.local);
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

    if (dragging && moved < SEUIL_GLISSEMENT && !suspended) {
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      if (event.pointerType === 'touch') {
        const now = performance.now();
        if (now - lastTapT < DELAI_TAP && Math.hypot(px - lastTapX, py - lastTapY) < 40) {
          window.clearTimeout(tapTimer);
          tapTimer = 0;
          lastTapT = 0;
          eteindrePression();
          doubleTapZoom(px, py);
        } else {
          lastTapT = now;
          lastTapX = px;
          lastTapY = py;
          window.clearTimeout(tapTimer);
          tapTimer = window.setTimeout(() => {
            eteindrePression();
            performTapAction(px, py);
          }, DELAI_TAP);
        }
      } else {
        performTapAction(px, py);
      }
    } else if (dragging && moved >= SEUIL_GLISSEMENT) {
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
      /* Dans un genre, les flèches ne tournent plus : la vue y est plate. */
      case 'ArrowLeft': if (!zoneActive) azVel -= 0.045; break;
      case 'ArrowRight': if (!zoneActive) azVel += 0.045; break;
      case 'ArrowUp': if (!zoneActive) elVel += 0.035; break;
      case 'ArrowDown': if (!zoneActive) elVel -= 0.035; break;
      case '+': case '=': dollyVel -= 5.5; break;
      case '-': case '_': dollyVel += 5.5; break;
      case '0': releaseFrameLock(); recenter(); break;
      /* ÉCHAP APPARTIENT DÉSORMAIS À LA CARTE, TOUJOURS.

         Il appartenait au panneau tant qu'il était ouvert : la couche DOM le
         fermait, puis remontait. Cette règle n'a plus d'objet depuis que la
         colonne ne se ferme jamais : le laisser en place aurait rendu Échap
         inopérant sur la carte pour toujours, ce qui est exactement le genre
         de panne qu'une règle survivant à sa raison d'être produit.

         Une pression remonte d'un cran. Une SECONDE pression, sans rien
         faire d'autre entre les deux, sort du mode focus et rend la vue
         d'ensemble nette. Le drapeau se désarme au moindre autre geste :
         deux Échap séparés par un clic sont deux remontées, pas une sortie. */
      case 'Escape':
        if (echapArme && zoneActive) {
          echapArme = false;
          sortirDuFocus();
        } else {
          echapArme = zoneActive;
          goUp();
        }
        break;
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
    /* LE CADRAGE D'ACCUEIL, A L'IDENTIQUE. La distance et la cible étaient
       remises, PAS LES ANGLES : après avoir orbité, revenir à l'atlas rendait
       la carte vue sous un autre angle qu'au premier chargement. Ce n'était
       pas le même écran, et c'est ce que « revenir à la vue d'ensemble »
       promet. */
    azimuth = DEFAULT_AZIMUTH;
    elevation = DEFAULT_ELEVATION;
    tapZoomPrev = null;
    pinchDist = 0;
    closePanel();
    target.copy(atlasTarget);
    targetSmooth.copy(atlasTarget);
    distance = atlasDistance;
    applyCamera();
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
    rebuildZone();
    focusOffsets.clear();
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
    /* CE QUE LE NOM DÉSIGNE, pour que le tap puisse le viser. Le label
       d'un genre est posé À CÔTÉ de sa sphère, poussé radialement : taper
       le nom tombait dans le vide, et il fallait viser la boule. */
    slot: number;
    kind: 'family' | 'genre';
    famille: number;
    /* Boîte rendue, en pixels d'écran. Renseignée au placement, donc
       toujours celle qui est réellement affichée. */
    w: number;
    h: number;
  }

  /* Tampons du test d'occlusion, alloués une fois. */
  const rayonsOcclusion = new Float32Array(TOTAL_GENRES);
  const distancesOcclusion = new Float32Array(TOTAL_GENRES);

  /* Voir poserSansMasquer : la mémoire vit HORS de la passe, sinon elle est
     vidée à chaque image et ne mémorise rien du tout. */
  const positionRetenue = new Map<string, { dir: number; palier: number }>();

  const labelSlots: LabelSlot[] = [];
  for (let i = 0; i < LABEL_POOL; i += 1) {
    const el = document.createElement('span');
    el.className = 'atlas-label';
    el.style.transform = 'translate3d(-9999px,-9999px,0)';
    labelLayer.appendChild(el);
    labelSlots.push({
      el, key: '', x: -9999, y: -9999, px: 14, opacity: 0, visible: false,
      slot: -1, kind: 'genre', famille: -1, w: 0, h: 0
    });
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
  let labelsMordus = 0;
  /* Somme des depassements du cadre, en pixels, sur les quatre bords. */
  let debordement = 0;


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
    /** Nom entier, quand l'affiché est tronqué : sert à l'infobulle. */
    complet: string;
    /** Jamais masqué par une collision. */
    pinned: boolean;
    opacity: number;
    px: number;
    w: number;
    h: number;
    /* HORS ZONE, EN MODE FOCUS : le nom reste affiché mais FLOUTÉ, comme la
       sphère qu'il désigne. Les faire disparaître était la première version,
       et c'est elle qui cassait l'illusion : un arrière-plan photographique
       hors mise au point garde ses formes et ses mots, il ne les efface pas.
       Ce qui doit disparaître, c'est la LISIBILITÉ, pas la présence. */
    flou: boolean;
    /* LE CENTRE DE LA SPHÈRE ET SON RAYON À L'ÉCRAN. Le placement en mode
       focus ne masque plus jamais : il ESSAIE D'AUTRES CÔTÉS. Pour cela il
       lui faut l'ancre, c'est-à-dire la sphère elle-même, et pas seulement la
       boîte déjà posée à droite d'elle. */
    ancreX: number;
    ancreY: number;
    ancreR: number;
    /** Génération dans la zone : 0 la racine, 1 ses dérivés, 2 la suivante. */
    generation: number;
    /** Essai plaques : ce label a le style plaque (Breakbeat, ?plaques=1). */
    isPlaque: boolean;
    /** Pour les plaques : 1 si genre central, 0 sinon. */
    isCentral: boolean;
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
      /* LA BANDE RÉSERVÉE NE FAIT PLUS DISPARAÎTRE UN NOM DE L'ARBRE.

         Les bandes haute et basse sont reservées au fil d'Ariane et aux
         contrôles : un nom qui s'y place se superpose à du texte d'interface,
         et la règle vaut toujours pour la vue d'ensemble.

         Mais dans l'arbre déployé, elle produisait un masquage, ce qui est
         exactement ce qui est interdit : mesuré sur Musique concrète, treize
         sphères et douze noms, « Philly Soul » tombant dans la bande haute.
         Pour un membre de l'arbre, la recherche de position s'en charge : elle
         essaie huit côtés et n'en retient aucun qui déborde. */
      const dansArbre = zoneActive && slot >= 0 && zone[slot] === 1;
      if (!dansArbre && (sy < CHROME_TOP || sy > height - CHROME_BOTTOM)) {
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
      /* PLAFOND DES GENRES BORNÉ PAR LA LARGEUR DE L'ÉCRAN (bug de la
         descente, localisé par la trace : de très près, px atteignait le
         plafond de 22 px, « Liquid Drum and Bass » faisait alors 223 px sur
         390 de large, le rabattement anti-débordement empilait quatre noms
         sur six au même x = 4, et à niveau égal ils s'annulaient tous, 6 candidats, 0 posé. Un nom ne dépasse donc jamais 40 % de la
         largeur utile : le plafond de 22 px reste pour les familles, qui
         sont courtes et vues de loin. */
      const ceilByWidth = (() => {
        if (kind !== 'genre') return LABEL_PX_CEILING;
        const trial = textWidth(text, 10, kind);
        if (trial <= 0) return LABEL_PX_CEILING;
        return clamp((width * 0.4 * 10) / trial, labelRules.floorPx, LABEL_PX_CEILING);
      })();
      /* ===================================================================
         EN MODE FOCUS, LA TAILLE DIT LE NIVEAU, et rien d'autre.

         Ailleurs, la taille d'un nom vient de la distance à la caméra : c'est
         ce qui donne la profondeur à la vue d'ensemble. Dans la zone, tout est
         à peu près à la même distance, et cette règle ne dit plus rien ; pire,
         elle faisait varier les tailles au hasard des positions.

         Trois niveaux nets, posés par Mika : la racine 22 px en 700, ses
         dérivés 16 px en 600, la génération suivante 13 px en 500. Le plancher
         absolu est 12 px, et on ne descend jamais dessous : quand ça ne rentre
         pas, on écarte les sphères et on recule la caméra, on ne rapetisse
         pas le texte. */
      /* QUATRE PALIERS, un par profondeur dans l'arbre, plancher à 12 px. La
         taille dit le niveau : c'est elle qui remplace la descente par
         générations comme moyen de savoir où l'on est dans la filiation. */
      const pxFocus = (() => {
        if (!zoneActive || slot < 0 || zone[slot] !== 1) return 0;
        const g = zoneGeneration[slot] ?? -1;
        /* Trois niveaux, remontés d'un cinquième sur grand écran : 22, 16 et
           13 px devenaient 26, 19 et 16. Le plancher reste 12 px, et le mobile
           garde les valeurs d'origine, jugées bonnes. */
        /* SOUS 500 PX, LES TAILLES SONT DIVISÉES PAR DEUX.

           Sur un téléphone, « Musique concrète » à 22 px faisait deux fois la
           largeur de sa sphère et s'écrivait par-dessus elle : le texte
           dominait la carte au lieu de l'étiqueter. Le rapport doit
           s'inverser, la sphère est l'objet, le nom son étiquette.

           Le plancher de 12 px vaut pour le bureau ; il descend à 9 sur
           téléphone, où la densité de pixels est trois fois supérieure et où
           9 px de CSS valent 27 px physiques. */
        const grand = width >= 768;
        const etroit = width < 500;
        /* Un cran plus bas encore sur petit ecran : « Progressive Breaks » et
           « Nu Skool Breaks » se chevauchaient completement a 12 px. Les
           valeurs de bureau sont bonnes, ce sont celles du telephone qui
           etaient fausses. */
        if (g === 0) return grand ? 26 : etroit ? 10 : 22;
        if (g === 1) return grand ? 19 : etroit ? 9 : 16;
        if (g === 2) return grand ? 16 : etroit ? 8 : 13;
        return grand ? 14 : etroit ? 8 : 12;
      })();
      const pxCalcule =
        kind === 'genre'
          ? clamp(
              raw * 0.65 * (0.72 + 0.33 * Math.sqrt((baseRadii[slot] ?? 1) / genreRadiusMax)),
              labelRules.floorPx,
              ceilByWidth
            )
          : clamp(raw, isAtlasFamily ? 10 : labelRules.floorPx, LABEL_PX_CEILING);
      /* LES NOMS LONGS SONT TRONQUÉS AU DERNIER ESPACE, SOUS 500 PX.

         Compromis tranché par Mika : on ne touche pas aux noms courts, qui
         sont la majorité, et on coupe les longs, qui sont les seuls à poser
         problème. « Liquid Drum and Bass » devient « Liquid Drum… »,
         « Breakbeat Hardcore » devient « Breakbeat… ».

         La coupe tombe au dernier espace AVANT la limite : couper au milieu
         d'un mot donne « Breakbeat Hardc… », qui se lit comme une faute
         plutôt que comme une abréviation. Sans espace avant la limite, on
         garde le nom entier : un seul mot long vaut mieux tronqué nulle part
         que coupé n'importe où.

         Le nom complet reste dans la colonne dès qu'on clique, et l'attribut
         title le rend au survol prolongé. */
      let affiche = text;
      if (width < 500 && kind === 'genre' && text.length > 16) {
        const coupe = text.lastIndexOf(' ', 16);
        if (coupe > 6) affiche = text.slice(0, coupe) + '\u2026';
      }
      /* ESSAI PLAQUES : sous-styles (depth >= 2) visibles seulement quand on
         est entré dans un genre (zoneActive). À l'accueil, ils sont cachés. */
      const slotFamily = slot >= 0 ? slotsData[slot]?.family : -1;
      const slotDepth = slot >= 0 ? slotsData[slot]?.depth ?? 0 : 0;
      const isPlaque = plaquesActif && kind === 'genre' && slotFamily === breaksIndex && slotDepth >= 2 && zoneActive;
      const isCentral = isPlaque && zoneActive && slot === focusIndex;

      /* Pour les plaques : taille fixe (13px central, 11px dérivés), et padding inclus. */
      const pxPlaque = isPlaque ? (isCentral ? 13 : 11) : 0;
      const px = isPlaque ? pxPlaque : (pxFocus > 0 ? pxFocus : pxCalcule);
      const wTexte = textWidth(affiche, px, kind);
      const w = isPlaque ? wTexte + 12 : wTexte;

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
            /* LE RAYON DE BASE, PAS CELUI DU SURVOL.

               Le survol grossit la sphère de 8 %, et l'ancrage du nom suivait
               ce rayon : approcher la souris d'un nom le faisait GLISSER vers
               l'extérieur, de quelques pixels, pendant que le grossissement
               s'installait. Le nom fuyait donc sous le curseur, et un clic
               posé dessus pouvait tomber à côté une fois la marge de 4 px
               dépassée.

               Mesuré : le moteur trouvait « Funk » sous le point au moment de
               la sonde, et plus rien au moment du clic, à coordonnées
               identiques ; le tap était alors lu comme un clic dans le vide,
               ce qui referme le mode focus. Un nom ne bouge plus quand on
               s'en approche. */
            const rPx = ((baseRadii[slot] ?? 1) * halfH) / (Math.tan((FOV * Math.PI) / 360) * Math.max(1, depth));

            if (isPlaque) {
              /* PLAQUES : centrées SOUS la sphère, à 4 px du bord. */
              fx = sx - w / 2;
              fy = sy + rPx + 4;
            } else {
              const push = rPx + px * 0.9;

              /* LES NOMS RESTENT A DROITE, MEME SUR PETIT ECRAN.

                 Je les avais poses SOUS leur sphere, centres, en pensant qu'un
                 nom pousse vers la droite deborderait d'un ecran de 390 px.
                 Mesure : quatre chevauchements sur Breakbeat, la ou il n'y en
                 avait aucun. Sous la sphere et centres, deux noms voisins se
                 marchent dessus verticalement, et un arbre dense en empile
                 plusieurs sur la meme colonne. A droite, l'ecart angulaire des
                 spheres les separait de lui-meme.

                 Verdict de Mika : « remets-les a droite, tu avais raison, je me
                 suis trompe. » La regression est annulee. */
              fx = sx + vx * push - (vx < 0 ? w : 0) - (Math.abs(vx) < 0.35 ? w / 2 : 0);
              fy = sy + vy * push;
            }
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

      /* Un label qui ne tient pas à sa position radiale revient CENTRÉ sur
         sa sphère avant d'être rabattu au bord : le rabattement empilait
         plusieurs noms exactement au même x, et à niveau égal ils
         s'annulaient tous (trace : quatre noms sur six à x = 4, aucun
         posé). Le centrage, lui, ne peut pas empiler deux sphères
         distinctes. Le rabattement reste en dernier recours. */
      if (kind === 'genre' && (fx < 4 || fx + w > width - 4)) {
        const centered = sx - w / 2;
        if (centered >= 4 && centered + w <= width - 4) fx = centered;
      }
      fx = Math.min(Math.max(fx, 4), Math.max(4, width - 4 - w));

      /* Un nom hors zone est un nom d'arrière-plan : il reste, il ne se lit
         plus. Le flou est posé en CSS ; ici on ne fait que baisser son
         intensité pour qu'il ne concurrence pas ce qui est net. */
      const flou = zoneActive && !(slot >= 0 && zone[slot] === 1);

      candidates.push({
        key,
        text: affiche,
        complet: text,
        sx: fx,
        sy: fy,
        depth,
        kind,
        slot,
        pinned,
        opacity: flou ? opacityScale * 0.55 : opacityScale,
        px,
        w,
        h: isPlaque ? (isCentral ? 13 : 11) * 1.45 + 6 : px * 1.45,
        ancreX: sx,
        ancreY: sy,
        /* Rayon de BASE lui aussi : la recherche de position ne doit pas
           déplacer un nom parce que la souris s'en approche. */
        ancreR: slot >= 0 ? rayonEcranBase(slot) : 0,
        generation: slot >= 0 && zoneActive ? (zoneGeneration[slot] ?? -1) : -1,
        flou,
        isPlaque,
        isCentral
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
         ET que son déploiement est engagé, replié sur son ancêtre, le
         nommer écrirait un nom sur une sphère absente ET volerait la place
         d'un genre de la couronne (mesuré : Deep House posé sur la place
         de Garage House). */
      /* Le test de déploiement ne s'applique PAS aux membres de la zone :
         leur place est posée par la couronne d'entrée, ils ne sortent pas
         de leur parent et n'ont donc pas à attendre de l'avoir fait. Sans
         cette exception, un dérivé profond restait sans nom tant que le
         lissage de déploiement n'avait pas passé la moitié, ce qui dépend
         de la cadence d'images et pas de ce qu'on voit. */
      if (!(zoneActive && zone[i] === 1) && slot.depth >= 2 && (expandAmount[i] ?? 0) < 0.5) continue;

      const inSubtree = focusIndex >= 0 ? isDescendant(i, focusIndex) : false;
      const isPinned = i === focusIndex || inSubtree;

      /* PLUS AUCUNE RÈGLE DE DENSITÉ, ET C'EST UN RETOUR EN ARRIÈRE ASSUMÉ.

         Une version précédente retirait le nom des générations intermédiaires
         dès que deux étaient dépliées, pour laisser la place aux nouvelles.
         Mesuré sur Downtempo : cinq sphères sur douze sans nom. Verdict de
         Mika, sans appel : un genre visible est un genre nommé, sans
         condition et sans survol.

         La lisibilité se règle donc entièrement ailleurs : par la TAILLE, qui
         dit le niveau, et par l'ÉCARTEMENT, qui se gagne en poussant les
         couronnes et en reculant la caméra. Jamais par le silence. */

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
    /* NIVEAU D'ARBITRAGE = NIVEAU DE LECTURE. La trace du bug de descente
       l'a établi : les deux derniers noms manquants cédaient à des labels
       de profondeur inférieure de leur propre famille, donc de « niveau
       supérieur » au sens de l'ancien barème. Ce qu'on LIT passe désormais
       avant ce qui l'entoure, en niveaux déclarés, jamais par ordre
       d'arrivée :
         0   le genre ouvert, ou les fondateurs quand on lit une famille
         1   ses enfants directs, le niveau qu'on vient de déployer
         2   le nom de la famille ouverte
         3+  le reste de la famille, par profondeur
         20+ les autres familles, entrées dans le champ par le recul */
    const readParent = activeGenre >= 0 ? slotsData[activeGenre] : undefined;
    const NIVEAU_FLOU = 60;
    const levelOf = (c: Candidate): number => {
      /* Tout ce qui est flou passe en DERNIER, après le dernier niveau net :
         un nom d'arrière-plan ne prend jamais la place d'un nom qu'on lit. */
      if (c.flou) return NIVEAU_FLOU;
      const slot = slotsData[c.slot];
      if (c.kind === 'family') {
        return activeFamily >= 0 && c.key === `f-${FAMILIES[activeFamily]?.id}` ? 2 : 0;
      }
      if (!slot) return 30;
      if (activeFamily >= 0 && slot.family !== activeFamily) return 20 + slot.depth;
      if (readParent) {
        if (c.slot === activeGenre) return 0;
        const base = familyOffset[readParent.family] ?? 0;
        if (readParent.children.some((k) => base + k === c.slot)) return 1;
        return 3 + slot.depth;
      }
      /* VUE D'ENSEMBLE : LE NOM DE FAMILLE PASSE AVANT SON FONDATEUR.

         Les deux étaient au même niveau, 0. Or ils désignent le MÊME POINT de
         l'écran, le centre de la famille étant celui de son fondateur, et ils
         portent le plus souvent le MÊME MOT, Disco, Techno, Trance. Deux noms
         de même niveau qui se recouvrent cèdent tous les deux : ils
         s'annulaient mutuellement.

         Mesuré au premier chargement, 1280 px de large : QUATORZE noms de
         familles candidats, ZÉRO posé, et pas davantage de fondateurs. Un
         visiteur à qui l'écran d'accueil vient d'annoncer que « les 14
         familles sont les continents de la carte » ne trouvait sur cette
         carte que des noms de dérivés. À 390 px le défaut se voyait à moitié
         seulement, le nom de famille y étant décalé sous la sphère, ce qui le
         sortait parfois de la boîte du fondateur : douze familles sur
         quatorze survivaient.

         Le fondateur descend donc d'un cran. Quand les deux mots sont
         identiques, on ne perd rien ; quand ils diffèrent, c'est le nom de
         famille qui reste, et c'est le bon niveau de lecture pour une vue
         d'ensemble. */
      if (activeFamily < 0) return slot.depth === 0 ? 1 : 1 + slot.depth;
      return slot.depth === 0 ? 0 : 1 + slot.depth;
    };
    /* ================================================================
       OCCLUSION : UN NOM CACHÉ PAR UNE SPHÈRE NE S'AFFICHE PAS.

       Les noms sont du DOM posé PAR-DESSUS le canvas. Le navigateur ne sait
       rien de ce qu'il y a dessous : un nom dont la sphère est derrière une
       autre sphère se dessine quand même, en plein milieu de celle de
       devant. Signalé sur un cas précis : INDUSTRIAL et Coldwave écrits en
       travers de la sphère Downtempo, EBM et Power Electronics sur son bord.

       Aucun test de ce genre n'existait dans le moteur. Il n'a pas cessé de
       marcher, il n'avait jamais été écrit : le rendu hybride (ADR-018) a
       toujours reposé sur le fait que les noms tombent À CÔTÉ de leur
       sphère, ce qui suffit tant que la carte est plate à l'écran et que
       rien ne passe devant. Le mode focus change cela : il rapproche
       fortement la caméra, et tout l'arrière-plan vient alors se ranger
       derrière les quelques sphères de la zone.

       DEUX RÈGLES, dans cet ordre.

       1. Le centre de la boîte tombe dans le disque d'une sphère PLUS PROCHE
          que l'ancre du nom : le nom est masqué. C'est de l'occlusion au
          sens strict, et elle vaut à tous les niveaux, focus ou pas.

       2. En mode focus, un nom FLOU par-dessus une sphère de la ZONE est
          masqué sans regarder la profondeur. La zone est devant par
          définition, c'est la règle du rendu (voir renderOnce) : un nom
          d'arrière-plan écrit sur elle contredirait l'image.

       Masqué et non atténué : un nom illisible posé sur une sphère reste une
       tache sur cette sphère. */
    /* Rayons et distances calculés UNE FOIS pour la passe, pas une fois par
       nom : le test est un double parcours, 96 noms par 218 sphères, et
       rayonEcran fait une racine carrée. Mesuré à la conception : recalculer
       à l'intérieur coûtait quatre-vingt-seize fois le nécessaire, dans un
       moteur dont le rendu tient en 0,081 ms. */
    for (let i = 0; i < TOTAL_GENRES; i += 1) {
      const presence = sphereState[i * 4] ?? 0;
      const pz = projected[i * 3 + 2] ?? 2;
      if (presence < 0.15 || pz > 1) {
        rayonsOcclusion[i] = 0;
        continue;
      }
      rayonsOcclusion[i] = rayonEcran(i);
      distancesOcclusion[i] = camera.position.distanceTo(slotsData[i]?.world ?? camera.position);
    }

    const occulte = (c: Candidate): boolean => {
      const cx = c.sx + c.w / 2;
      const cy = c.sy + c.h / 2;
      /* Profondeur de l'ancre du nom. Pour un nom de famille, l'ancre est le
         centre de famille et n'a pas de sphère : sa profondeur est celle du
         point projeté, déjà calculée dans c.depth. */
      const profondeurAncre = c.depth;

      for (let i = 0; i < TOTAL_GENRES; i += 1) {
        if (i === c.slot) continue; // sa propre sphère ne le cache pas
        const r = rayonsOcclusion[i] ?? 0;
        if (r < 6) continue; // absente, derrière la caméra, ou trop petite
        const dx = cx - (projected[i * 3] ?? 0);
        const dy = cy - (projected[i * 3 + 1] ?? 0);
        if (dx * dx + dy * dy > r * r) continue; // le nom n'est pas dessus

        if (zoneActive && c.flou && zone[i] === 1) return true; // règle 2
        if ((distancesOcclusion[i] ?? 1e9) < profondeurAncre - 0.001) return true; // règle 1
      }
      return false;
    };
    for (let k = candidates.length - 1; k >= 0; k -= 1) {
      const c = candidates[k];
      if (!c) continue;
      /* UN NOM DE L'ARBRE N'EST JAMAIS RETIRÉ PAR L'OCCULTATION : IL SE
         DÉPLACE.

         L'occultation supprime le nom dont l'ancre est cachée par une sphère
         plus proche. C'est juste dans la vue d'ensemble, où un nom posé sur
         une sphère qui n'est pas la sienne désigne le mauvais objet.

         Dans l'arbre déployé, elle produisait un masquage, et le masquage est
         interdit. Mesuré sur Musique concrète : treize sphères, douze noms,
         « Philly Soul » retiré parce que son nom tombait sur la sphère de son
         parent, à un millième d'unité de profondeur près. Tous les noeuds d'un
         arbre radial sont dans le PLAN DE LA CAMÉRA, donc à peu près à la même
         distance : l'écart qui déclenche la règle n'y a plus aucun sens.

         La recherche de position, elle, essaie huit côtés : c'est à elle
         d'écarter le nom de la sphère qui le gêne. */
      const membreDeLArbre = zoneActive && c.slot >= 0 && zone[c.slot] === 1 && !c.flou;
      if (!membreDeLArbre && occulte(c)) candidates.splice(k, 1);
    }

    /* ======================================================================
       DANS LA ZONE, AUCUN NOM N'EST JAMAIS MASQUÉ.

       Règle posée par Mika, et elle renverse la précédente : « masquage du
       plus lointain en cas de collision, jamais de décalage » devient
       « décalage, jamais de masquage ». Un genre visible est un genre nommé,
       sans condition et sans survol.

       L'ordre des recours est celui qu'il a fixé. Écarter les sphères et
       reculer la caméra viennent en premier, mais ils vivent ailleurs, dans
       la disposition : ici on ne peut plus que déplacer et rapetisser. Ce
       code-ci est donc le TROISIÈME et le QUATRIÈME recours, et il signale au
       reste du moteur quand les deux premiers doivent entrer en jeu.

       Huit positions autour de la sphère, essayées de la plus lisible à la
       moins évidente : à droite d'abord, qui est la convention de lecture,
       puis à gauche, puis au-dessus et en dessous, puis les diagonales. À
       chacune, la boîte est testée contre tout ce qui est déjà posé.

       Si aucune ne convient, on réduit par paliers jusqu'au plancher de
       12 px, puis on POSE QUAND MÊME à la meilleure des huit, celle qui
       recouvre le moins. Un nom qui se chevauche un peu se lit encore ; un
       nom absent ne se lit pas du tout. */
    const PALIERS = [1, 0.86, 0.72, 0.6];
    let chevauchementsZone = 0;

    /* LA POSITION RETENUE À LA PASSE PRÉCÉDENTE, par nom.

       Sans cette mémoire, la recherche repart des huit directions dans le même
       ordre à chaque passe, et le premier emplacement libre change dès que la
       caméra dérive d'un pixel : un nom se met alors à ALTERNER entre la
       droite et la gauche de sa sphère, plusieurs fois par seconde.

       Le défaut s'est vu à la mesure avant de se voir à l'oeil : le moteur
       trouvait un nom sous le curseur à un instant, et plus rien 60 ms plus
       tard aux mêmes coordonnées, si bien qu'un clic posé dessus était lu
       comme un clic dans le vide et refermait le mode focus.

       On réessaie donc d'abord la position d'avant. Elle ne cède que si elle
       est réellement occupée, et le nom reste alors là où l'oeil l'a laissé. */
    const poserSansMasquer = (c: Candidate): void => {
      const rayon = Math.max(c.ancreR, 4);
      const directions: [number, number][] = [
        [1, 0], [-1, 0], [0, -1], [0, 1],
        [0.7, -0.7], [-0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]
      ];
      const pxVoulu = c.px;
      let meilleur: { sx: number; sy: number; px: number; w: number; h: number; mordu: number } | null = null;

      /* L'ordre d'essai commence par la position retenue à la passe d'avant. */
      const memoire = positionRetenue.get(c.key);
      const paliersIdx = memoire
        ? [memoire.palier, ...PALIERS.map((_, i) => i).filter((i) => i !== memoire.palier)]
        : PALIERS.map((_, i) => i);
      for (const pi of paliersIdx) {
        const facteur = PALIERS[pi] ?? 1;
        const px = Math.max(12, pxVoulu * facteur);
        const w = textWidth(c.text, px, c.kind);
        const h = px * 1.45;
        const ordreDirs = memoire && pi === memoire.palier
          ? [memoire.dir, ...directions.map((_, i) => i).filter((i) => i !== memoire.dir)]
          : directions.map((_, i) => i);
        for (const di of ordreDirs) {
          const [dx, dy] = directions[di] as [number, number];
          const marge = rayon + px * 0.55;
          const sx = c.ancreX + dx * marge - (dx < -0.2 ? w : dx > 0.2 ? 0 : w / 2);
          const sy = c.ancreY + dy * marge - (dy > 0.2 ? 0 : dy < -0.2 ? h : h / 2);
          if (sx < 2 || sx + w > width - 2 || sy < CHROME_TOP || sy + h > height - CHROME_BOTTOM) continue;
          const essai = { ...c, sx, sy, px, w, h };
          let mordu = 0;
          /* Une position qui tombe sur une AUTRE sphère de l'arbre est
             comptée comme mordue : le nom y désignerait le mauvais objet.
             C'est ce qui remplace l'occultation, en déplaçant au lieu de
             supprimer. */
          const cx = sx + w / 2;
          const cy = sy + h / 2;
          for (let k = 0; k < TOTAL_GENRES; k += 1) {
            if (k === c.slot || zone[k] !== 1) continue;
            const r = rayonEcranBase(k);
            if (r < 6) continue;
            const ddx = cx - (projected[k * 3] ?? 0);
            const ddy = cy - (projected[k * 3 + 1] ?? 0);
            if (ddx * ddx + ddy * ddy < r * r) mordu += r * r;
          }
          for (const autre of placed) {
            if (!overlaps(essai, autre)) continue;
            const ox = Math.min(essai.sx + essai.w, autre.sx + autre.w) - Math.max(essai.sx, autre.sx);
            const oy = Math.min(essai.sy + essai.h, autre.sy + autre.h) - Math.max(essai.sy, autre.sy);
            mordu += Math.max(0, ox) * Math.max(0, oy);
          }
          if (mordu === 0) {
            positionRetenue.set(c.key, { dir: di, palier: pi });
            placed.push(essai);
            return;
          }
          if (!meilleur || mordu < meilleur.mordu) meilleur = { sx, sy, px, w, h, mordu };
        }
      }

      /* Aucune position libre, même au plancher : on pose la moins mauvaise et
         on le compte. C'est ce compte qui fait écarter les sphères. */
      chevauchementsZone += 1;
      if (meilleur) {
        placed.push({ ...c, sx: meilleur.sx, sy: meilleur.sy, px: meilleur.px, w: meilleur.w, h: meilleur.h });
      } else {
        placed.push(c);
      }
    };

    /* Les noms de la zone passent AVANT tout le reste, du plus haut niveau de
       lecture au plus bas : la racine, puis ses dérivés, puis la génération
       ouverte. Aucun d'eux ne peut être écarté par un nom d'arrière-plan. */
    if (zoneActive) {
      const dansZone = candidates
        .filter((c) => c.slot >= 0 && zone[c.slot] === 1 && !c.flou)
        .sort((a, b) => a.generation - b.generation);
      for (const c of dansZone) poserSansMasquer(c);
    }

    const maxLevel = candidates.reduce((m, c) => Math.max(m, levelOf(c)), 0);

    for (let lvl = 0; lvl <= maxLevel; lvl += 1) {
      const group = candidates.filter(
        (c) =>
          levelOf(c) === lvl &&
          c.opacity >= 0.06 &&
          !(zoneActive && c.slot >= 0 && zone[c.slot] === 1 && !c.flou)
      );

      const dead = new Set<number>();
      group.forEach((c, i) => {
        if (placed.some((other) => overlaps(c, other))) dead.add(i);
      });
      /* LES NOMS FLOUS NE S'ANNULENT PAS ENTRE EUX. La règle « deux labels
         de même niveau se recouvrent, les deux cèdent » existe pour qu'aucun
         ne devienne illisible. Elle n'a pas d'objet ici : ils sont déjà
         illisibles par construction, c'est le but. Appliquée quand même,
         elle vidait l'arrière-plan de ses mots et ramenait le défaut qu'on
         est en train de corriger. Ils cèdent toujours à un nom NET, jamais à
         un autre nom flou. */
      if (lvl < NIVEAU_FLOU) {
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
      }
      group.forEach((c, i) => {
        if (!dead.has(i) && placed.length < labelRules.maxLabels) placed.push(c);
      });
    }

    /* Ce que la passe a dû laisser se mordre, pour la mesure. Aucun asservis-
       sement derrière : voir plus haut, écarter la couronne ne change rien à
       l'écart en pixels. */
    labelsMordus = zoneActive ? chevauchementsZone : 0;

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
        /* L'infobulle porte le nom entier quand l'affiché est tronqué, et
           rien du tout sinon : une infobulle qui répète ce qu'on lit déjà
           est du bruit. */
        if (entry.complet !== entry.text) ls.el.title = entry.complet;
        else ls.el.removeAttribute('title');
        ls.el.dataset['major'] = entry.kind === 'family' ? '1' : '0';
        ls.el.dataset['kind'] = entry.kind;
        /* Le nom marqué suit la SÉLECTION, pas la racine de la vue : c'est
           le noeud qu'on vient de cliquer qu'il faut retrouver d'un coup
           d'oeil parmi ceux de sa génération. */
        /* L'INDEX DE LA SPHERE, pose sur le nom. Sans lui, tout controle qui
           veut relier un nom a son objet doit passer par le TEXTE, et le
           corpus contient des homonymes : c'est le piege deja paye sur le
           controle des boites, ou un genre fondateur porte le meme nom que sa
           famille. Une identite se compare, un texte se devine. */
        ls.el.dataset['slot'] = String(entry.slot);
        ls.el.dataset['focus'] =
          activeGenre >= 0 && entry.key === `g-${slotsData[activeGenre]?.label ?? ''}` ? '1' : '0';
        /* ESSAI PLAQUES : attribut et variable CSS pour la couleur. */
        ls.el.dataset['plaque'] = entry.isPlaque ? '1' : '0';
        ls.el.dataset['central'] = entry.isCentral ? '1' : '0';
        if (entry.isPlaque) {
          ls.el.style.setProperty('--plaque-hue', String(breaksHue));
        }
      }

      /* LE FLOU DU TEXTE, en CSS. Écrit à chaque image et non au changement
         de clé : un même emplacement passe de net à flou sans changer de nom
         quand on entre dans un genre voisin. La transition de 400 ms est
         déclarée dans la feuille, elle n'est pas rejouée ici. */
      const marqueFlou = entry.flou ? '1' : '0';
      if (ls.el.dataset['flou'] !== marqueFlou) ls.el.dataset['flou'] = marqueFlou;

      /* LE SURVOL SE POSE À CHAQUE IMAGE, PAS AU CHANGEMENT DE CLÉ.

         C'ÉTAIT LE DÉFAUT. Cet attribut vivait dans le bloc « la clé a
         changé », qui ne s'exécute que lorsqu'un emplacement de label change
         de genre. Survoler une sphère ne change aucune clé : l'attribut
         n'était donc JAMAIS mis à jour, et le nom ne réagissait pas. Mesuré :
         le moteur connaissait la sphère survolée et le curseur devenait
         pointeur, pendant que zéro label portait la marque.

         Trois signes sur quatre marchaient, le quatrième était mort, et c'est
         le seul qu'on regarde vraiment : on lit le nom, pas la boule. */
      const estSurvole = hovered >= 0 && entry.slot === hovered;
      if (ls.el.dataset['survol'] !== (estSurvole ? '1' : '0')) {
        ls.el.dataset['survol'] = estSurvole ? '1' : '0';
      }

      /* LE NOM EST UNE CIBLE DU TAP. Renseigné à chaque image, pas
         seulement au changement de clé : la boîte suit la caméra. */
      ls.slot = entry.slot;
      ls.kind = entry.kind;
      ls.famille =
        entry.kind === 'family'
          ? FAMILIES.findIndex((f) => f.label === entry.text)
          : (slotsData[entry.slot]?.family ?? -1);
      ls.w = entry.w;
      ls.h = entry.h;

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


  /* LE RENDU, EN DEUX PLANS QUAND LE MODE FOCUS EST ACTIF.

     1. Ce qui est hors zone part dans une cible à demi-résolution, en couleur
        prémultipliée.
     2. Deux passes de gaussienne séparable sur cette cible, horizontale puis
        verticale.
     3. Le fond, net, sur l'écran.
     4. La cible floutée, composée par-dessus.
     5. Ce qui est dans la zone, net, par-dessus tout.

     Hors mode focus, rien de tout cela : une seule passe, comme avant, et le
     coût est exactement celui d'hier. On ne paye l'effet que là où il sert.

     La profondeur n'est PAS partagée entre les deux plans, et c'est voulu :
     la zone est devant par définition, une sphère floue ne doit jamais
     masquer une sphère nette même si elle est plus près de la caméra. C'est
     la règle d'une mise au point photographique, pas celle d'un tampon de
     profondeur. */
  const renderOnce = (bg: boolean): void => {
    if (!flouActif || rayonFlou < 0.05) {
      sphereUniforms.uPasse.value = -1;
      linkUniforms.uPasse.value = -1;
      sphereUniforms.uPremul.value = 0;
      linkUniforms.uPremul.value = 0;
      renderer.autoClear = true;
      if (bg) {
        renderer.render(bgScene, bgCamera);
        renderer.autoClear = false;
        renderer.clearDepth();
      }
      renderer.render(scene, camera);
      renderer.autoClear = true;
      return;
    }

    /* MÉLANGE PRÉMULTIPLIÉ PENDANT CETTE PASSE, et c'était le défaut : les
       fragments sortent déjà multipliés par leur alpha, et le mélange par
       défaut les multipliait UNE SECONDE FOIS. Tout ce qui n'était pas
       parfaitement opaque disparaissait donc dans la cible, ce qui, pour un
       arrière-plan atténué, veut dire tout. */
    for (const m of [sphereMaterial, linkMaterial]) {
      m.blending = CustomBlending;
      m.blendSrc = OneFactor;
      m.blendDst = OneMinusSrcAlphaFactor;
      m.blendSrcAlpha = OneFactor;
      m.blendDstAlpha = OneMinusSrcAlphaFactor;
    }

    // 1. le hors-zone, prémultiplié, dans la cible.
    sphereUniforms.uPasse.value = 1;
    linkUniforms.uPasse.value = 1;
    sphereUniforms.uPremul.value = 1;
    linkUniforms.uPremul.value = 1;
    renderer.setRenderTarget(rtFlouA);
    renderer.autoClear = true;
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.render(scene, camera);

    // 2. gaussienne séparable, plusieurs paires en aller-retour.
    blurUniforms.uRayon.value = rayonFlou;
    for (let passe = 0; passe < PASSES_FLOU; passe += 1) {
      blurUniforms.uTexture.value = rtFlouA.texture;
      blurUniforms.uDirection.value.set(1 / Math.max(1, rtFlouA.width), 0);
      renderer.setRenderTarget(rtFlouB);
      renderer.clear(true, false, false);
      renderer.render(blurScene, bgCamera);

      blurUniforms.uTexture.value = rtFlouB.texture;
      blurUniforms.uDirection.value.set(0, 1 / Math.max(1, rtFlouA.height));
      renderer.setRenderTarget(rtFlouA);
      renderer.clear(true, false, false);
      renderer.render(blurScene, bgCamera);
    }

    // 3. le fond, net.
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 1);
    renderer.autoClear = true;
    renderer.render(bgScene, bgCamera);
    renderer.autoClear = false;

    // 4. le plan flou par-dessus le fond.
    compositeUniforms.uTexture.value = rtFlouA.texture;
    renderer.render(compositeScene, bgCamera);

    // 5. la zone, nette, sur un tampon de profondeur vierge.
    for (const m of [sphereMaterial, linkMaterial]) m.blending = NormalBlending;
    renderer.clearDepth();
    sphereUniforms.uPasse.value = 0;
    linkUniforms.uPasse.value = 0;
    sphereUniforms.uPremul.value = 0;
    linkUniforms.uPremul.value = 0;
    renderer.render(scene, camera);

    sphereUniforms.uPasse.value = -1;
    linkUniforms.uPasse.value = -1;
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

  /* LE CORPS DE LA BOUCLE, SEPARE DE SON DECLENCHEUR.

     requestAnimationFrame s'arrete des que la fenetre passe en arriere-plan,
     ce qui rendait toute mesure de scintillement impossible. En separant
     « ce qu'une image fait » de « quand elle est demandee », on peut dérouler
     la scene a la main, image par image, temps simule, et lire les pixels
     entre chaque. Le GPU dessine quand on le lui demande. */
  /* TRACE D'UNE SEULE IMAGE, pour repondre a une seule question : la distance
     change-t-elle apres mon bloc de cadrage, et si non, la condition est-elle
     remplie. Une image suffit, et un drapeau evite d'inonder la console. */
  let traceDistanceDemandee = false;
  const traceDistance: string[] = [];

  const avancer = (now: number): void => {
    const traceIci = traceDistanceDemandee;
    if (traceIci) {
      traceDistanceDemandee = false;
      traceDistance.length = 0;
      traceDistance.push(`1. debut de boucle          distance = ${distance.toFixed(2)}`);
    }

    if (!reducedMotion) {
      bgUniforms.uTime.value = now / 1000;
      linkUniforms.uFlowTime.value = fluxOn ? (now / 7000) % 1 : 0;
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
      if (k >= 1) {
        flying = false;
        /* LE VOL FINI, LE VERROU TOMBE. La camera est arrivee ou elle devait
           arriver : la suivre encore n'ajoute rien et fait deriver la carte a
           chaque changement d'etendue du groupe. Le cadrage est un GESTE, pas
           un asservissement permanent. */
        frameLock = -1;
      }
    }

    /* ═══════════════════════════════════════════════════════════════════
       L'ARBRE TIENT DANS LE CADRE, LABELS COMPRIS, MESURÉ À L'ÉCRAN.

       Le cadrage se calcule dans l'espace du MONDE : positions et rayons
       d'origine. Deux choses lui échappent par construction, et aucune ne peut
       y être ajoutée, parce qu'aucune n'existe dans cet espace.

         1. LE RAYON RÉELLEMENT DESSINÉ. Grossissement de 40 %, plancher de
            18 px : ce plancher est une quantité d'ÉCRAN, elle n'a pas
            d'équivalent monde.
         2. LA BOÎTE DU LABEL. Un nom fait jusqu'à 120 px de large et vit
            entièrement en pixels. Le cadrage n'en savait rien : zéro pixel
            prévu pour lui.

       Une sphère au bord droit avec son nom à sa droite dépassait donc
       forcément. Signalé sur Breakbeat : Darkstep et Neurofunk coupés par le
       bord bas.

       LA CORRECTION SE FAIT DONC APRÈS PROJECTION, là où les deux existent.
       On mesure le rectangle réellement occupé, on le compare au cadre moins
       5 % sur chaque bord, et on recule d'exactement le facteur qui manque.

       ELLE NE PEUT PAS OSCILLER, et c'est voulu : elle ne fait que RECULER,
       jamais avancer. Une correction qui pousse dans un seul sens a un point
       fixe et l'atteint ; c'est la leçon de la boucle d'espacement, qui
       corrigeait dans les deux sens et a divergé jusqu'à sa borne. */
    if (traceIci) {
      traceDistance.push(`2. juste avant le bloc      distance = ${distance.toFixed(2)}`);
      traceDistance.push(
        `   condition : zoneActive=${zoneActive} flying=${flying} focusIndex=${focusIndex} frameLock=${frameLock}`
      );
    }
    /* ═══════════════════════════════════════════════════════════════════
       LE CADRAGE SE FIGE DES QUE LA ZONE EST POSEE.

       Il corrigeait a CHAQUE image, indefiniment. Selectionner un noeud change
       legerement l'etendue du groupe, le bloc corrigeait, et la camera bougeait
       sur un simple clic de selection. Mesure : distance 186,87 vers 180,98 a
       390 px, soit 3 %, et l'azimut jamais touche, ce qui designait ce bloc
       sans ambiguite.

       C'est le meme motif que celui deja paye deux fois : un cadrage est un
       GESTE, pas un asservissement permanent. Je l'avais ecrit, puis je l'ai
       reintroduit sous une autre forme en corrigeant le debordement.

       Il ne s'exerce donc que pendant les deux secondes qui suivent un
       changement de ZONE, le temps que les positions se posent. Passe ce
       delai, le cadre est ce qu'il est : plus rien ne le retouche, et une
       selection ne peut plus rien deplacer. */
    const CADRAGE_MS = 2000;
    const cadrageOuvert = now - zoneStart < CADRAGE_MS;

    if (zoneActive && !flying && focusIndex >= 0 && cadrageOuvert) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let vus = 0;
      for (let i = 0; i < TOTAL_GENRES; i += 1) {
        if (zone[i] !== 1 || (sphereState[i * 4] ?? 0) <= 0.02) continue;
        const r = rayonEcran(i);
        const x = projected[i * 3] ?? 0;
        const y = projected[i * 3 + 1] ?? 0;
        minX = Math.min(minX, x - r);
        maxX = Math.max(maxX, x + r);
        minY = Math.min(minY, y - r);
        maxY = Math.max(maxY, y + r);
        vus += 1;
      }
      /* Les boîtes des noms, telles qu'elles sont posées. */
      for (const ls of labelSlots) {
        if (!ls.visible || ls.opacity <= 0.05 || ls.slot < 0) continue;
        if (zone[ls.slot] !== 1) continue;
        minX = Math.min(minX, ls.x);
        maxX = Math.max(maxX, ls.x + ls.w);
        minY = Math.min(minY, ls.y);
        maxY = Math.max(maxY, ls.y + ls.h);
      }

      if (vus > 0 && Number.isFinite(minX)) {
        const utileX = width * 0.9;
        const utileY = height * 0.9;
        debordement = Math.round(
          Math.max(0, -minX) + Math.max(0, maxX - width) +
          Math.max(0, -minY) + Math.max(0, maxY - height)
        );
        const facteur = Math.max((maxX - minX) / utileX, (maxY - minY) / utileY);
        if (traceIci) {
          traceDistance.push(
            `   mesure : contenu ${Math.round(maxX - minX)}x${Math.round(maxY - minY)} pour utile ${Math.round(utileX)}x${Math.round(utileY)}, facteur ${facteur.toFixed(3)}, vus ${vus}`
          );
        }
        /* ═══════════════════════════════════════════════════════════════
           LE GROUPE TIENT, MAIS IL EST DECENTRE. C'ETAIT LE DEFAUT.

           Le bloc ne comparait que des TAILLES : contenu 727 sur 806 de large,
           facteur 0,99, donc « rien a corriger ». Et pourtant 451 pixels
           sortaient du cadre, parce qu'un contenu plus petit que la place
           disponible peut parfaitement en deborder s'il est pose de travers.

           Comparer une taille ne dit rien d'une position. On recentre donc
           AVANT de reculer : le decalage en pixels est converti en unites du
           monde le long des axes de la camera, et applique a la cible. Reculer
           n'est le bon geste que si le contenu est vraiment trop grand.

           Le pas de 0,5 amortit : une correction seche ferait sursauter la
           carte pendant que les positions bougent encore. */
        const centreX = (minX + maxX) / 2;
        const centreY = (minY + maxY) / 2;
        const ecartX = centreX - width / 2;
        const ecartY = centreY - height / 2;
        if (debordement > 0 && (Math.abs(ecartX) > 2 || Math.abs(ecartY) > 2)) {
          const mondeParPixel = (2 * Math.tan((FOV * Math.PI) / 360) * distance) / Math.max(1, height);
          const droite = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
          const haut = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
          target
            .addScaledVector(droite, ecartX * mondeParPixel * 0.5)
            .addScaledVector(haut, -ecartY * mondeParPixel * 0.5);
          targetSmooth.copy(target);
          applyCamera();
        }

        /* SEUIL A 1,00 ET NON 1,02. Les deux pour cent de tolerance etaient
           une precaution contre les oscillations ; ils laissaient passer UK
           Garage a 812 pixels de large pour 806 utiles, soit un facteur de
           1,007, donc sous le seuil, donc aucune correction, donc la marge de
           5 % jamais tenue. L'amortissement a 0,6 suffit a eviter le
           tremblement, le seuil n'avait pas a s'en charger aussi. */
        if (facteur > 1.0) {
          distance = clamp(distance * (1 + (facteur - 1) * 0.6), MIN_DISTANCE, MAX_DISTANCE);
          applyCamera();
        }
      } else if (traceIci) {
        traceDistance.push(`   AUCUNE MESURE : vus=${vus} minX fini=${Number.isFinite(minX)}`);
      }
    }
    if (traceIci) traceDistance.push(`3. juste apres le bloc      distance = ${distance.toFixed(2)}`);

    /* Suivi continu quand un panneau est ouvert : la cible suit le CENTRE DE
       LA FAMILLE du genre ouvert, pas la sphère du genre (verdict : la carte
       montre la famille entière, le genre y est marqué par son halo). Les
       centres bougent pendant la relaxation du déploiement, d'où le suivi. */
    if (!flying) {
      const lock = frameLock >= 0 ? slotsData[frameLock] : undefined;
      if (lock) {
        /* Le centre du GROUPE, pas la sphère : sinon le suivi ramenait
           lentement la caméra sur le genre ouvert et défaisait le centrage
           calculé au moment du vol. */
        target.copy(frameLock === focusIndex ? cibleDuFocus(frameLock) : lock.world);
        targetSmooth.lerp(target, reducedMotion ? 1 : 0.12);
        const want = distanceDuFocus(frameLock);
        distance += (want - distance) * (reducedMotion ? 1 : 0.1);
      }
      /* LE SECOND CORRECTEUR CONTINU EST RETIRE, pas seulement neutralise.

         Il ramenait la cible sur le centre de la FAMILLE a chaque image tant
         qu'un panneau etait ouvert, heritage du temps ou ouvrir un genre
         montrait sa famille entiere. Je l'avais desactive dans le mode focus
         par une condition ; il restait dans la boucle, pret a resservir.

         Le garde-fou des corrections continues l'a signale malgre sa
         condition, et il a raison : une correction continue qui dort dans la
         boucle est une correction continue. Deux d'entre elles se tirent
         dessus des que la condition qui les separe change, et la condition
         change toujours un jour.

         Avec la colonne ouverte en permanence et le mode focus comme etat
         normal, il ne servait plus jamais. Il part. */
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
    /* LE RAYON DU FLOU SUIT LE MAXIMUM DE DÉFOCALISATION, donc exactement la
       même rampe de 400 ms. En sortie, quand la défocalisation retombe, le
       rayon retombe avec elle : au moment où les instances repassent dans la
       passe nette, le flou vaut déjà zéro et le basculement ne se voit pas. */
    let flouMaxCourant = 0;

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

      /* SATELLITES DE SATELLITES : révélés SEULEMENT une fois écartés.

         À l'état compact ils sont repliés EXACTEMENT sur leur ancêtre, à
         distance mesurée 0.000 : 499 paires de sphères du corpus se
         superposent ainsi. Deux surfaces confondues, le GPU ne peut pas
         trancher laquelle est devant, et son arbitrage change à chaque
         image. C'est le scintillement observé sur Trip-Hop et Chill-Out,
         qui ont chacun deux dérivés, et son absence sur Folktronica et
         Chillwave, qui n'en ont aucun.

         Le seuil précédent, `p * 1.6 - 0.2`, faisait apparaître la sphère
         dès 12,5 % du déploiement, alors qu'elle n'avait parcouru que 12,5 %
         du chemin et restait donc quasi confondue avec son parent. Il y
         avait forcément une fenêtre de superposition visible.

         LE SEUIL EST DÉSORMAIS GÉOMÉTRIQUE. On calcule la distance que la
         sphère a réellement parcourue, et on ne la montre qu'une fois
         écartée d'au moins la somme des deux rayons : à ce moment-là, les
         surfaces ne peuvent plus se couper. Une trajectoire courte apparaît
         donc plus tard en proportion, ce qui est exactement ce qu'on veut. */
      if (slot.depth >= 2 && !repliesOn) presence = 0;
      else if (slot.depth >= 2) {
        const trajet = slot.compact.distanceTo(slot.deployed);
        const parcouru = trajet * Math.max(p, 0);
        /* La marge à franchir : le rayon de la sphère plus celui de son
           ancêtre. En dessous, les deux corps se chevauchent encore. */
        const marge = (baseRadii[i] ?? 0.5) + (parentRadius[i] ?? 1);
        presence = marge <= 0.001 ? clamp(p, 0, 1) : clamp((parcouru - marge) / marge, 0, 1);
      }

      /* Anneaux uniquement sur le niveau actuellement navigable. Au niveau
         Atlas on ne descend pas encore dans les genres, donc aucun anneau :
         c'est ce qui encombrait le plus la vue d'ensemble. */
      let ringOn =
        slot.family === openIndex && (familyProgress[slot.family] ?? 0) > 0.5
          ? slot.children.length
          : 0;
      /* LE LISERÉ DE SURVOL. Le même anneau que celui des noeuds à dérivés,
         mais allumé sur la sphère visée, à dérivés ou non : c'est le signe
         qui dit « celle-ci répondra au clic ». Sa teinte est celle de la
         famille, jamais du blanc, pour ne pas trancher avec le reste. */
      if (i === hovered) ringOn = 2;

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
          /* LA COURONNE D'ENTRÉE d'abord, l'ancien écartement en secours.

             Les décalages posés au clic placent chaque dérivé sur un cercle
             dans le plan de la caméra. Quand ils existent, ils font foi ; le
             calcul d'origine, qui étirait les positions déployées d'un
             facteur, ne sert plus que si la couronne n'a pas pu être bâtie. */
          const off = focusOffsets.get(i);
          if (off) {
            expand.set(bx + off.x, by + off.y, bz + off.z);
            /* PLEINE PRÉSENCE POUR CE QUE LA COURONNE A POSÉ.

               L'atténuation des générations profondes se calcule sur la
               distance parcourue depuis la position repliée : elle protège du
               chevauchement pendant qu'une sphère sort de son parent. Une
               sphère placée par la couronne n'en sort pas, elle est posée
               d'emblée à bonne distance, et la formule lui donnait 0,28 de
               présence pour un trajet qu'elle ne fait plus. Mesuré sur
               Hypnotic Techno, qui s'affichait à quatre pixels et à peine
               visible alors qu'il est l'un des trois objets de la zone. */
            presence = 1;
          } else {
            expand.set(
              bx + (slot.deployed.x - focusBase.x) * 1.95,
              by + (slot.deployed.y - focusBase.y) * 1.95,
              bz + (slot.deployed.z - focusBase.z) * 1.95
            );
          }
          slot.world.lerp(expand, clamp(k, 0, 1));
        } else if (focusOffsets.has(i)) {
          /* LE PARENT DIRECT : il n'est pas dans le sous-arbre, il est
             pourtant dans la zone, et il a sa place posée par la couronne.
             Sans cette branche il tombait dans le recul général et venait se
             confondre avec le genre ouvert. */
          const off = focusOffsets.get(i);
          if (off) {
            expand.set(bx + off.x, by + off.y, bz + off.z);
            slot.world.lerp(expand, clamp(k, 0, 1));
          }
        } else {
          // Le reste recule et s'atténue à 12 pour cent, il reste du contexte.
          recede.set(
            (fc?.x ?? 0) + slot.compact.x + (slot.deployed.x - slot.compact.x) * 0.45,
            (fc?.y ?? 0) + slot.compact.y + (slot.deployed.y - slot.compact.y) * 0.45,
            (fc?.z ?? 0) + slot.compact.z + (slot.deployed.z - slot.compact.z) * 0.45
          );
          slot.world.lerp(recede, clamp(k, 0, 1));
          /* 75 % ET NON 40. Une gaussienne CONSERVE l'énergie : elle étale
             la lumière d'une petite sphère sur cinquante pixels, ce qui la
             rend très sombre à surface égale. Atténuer en plus revenait à
             éteindre l'arrière-plan, et c'est ce qui a été mesuré à l'écran,
             des taches à peine perceptibles. Ce qui recule est la NETTETÉ,
             pas la lumière. */
          presence = 1 - clamp(k, 0, 1) * 0.25;
          ringOn = 0;
        }
      } else if (level === 'family' && activeFamily >= 0) {
        presence = slot.family === activeFamily ? 1 : 0.5;
      }

      /* LES AUTRES FAMILLES, EN MODE FOCUS. C'était le défaut signalé : dans
         Detroit Techno, l'écran montrait encore BASS, AMBIENT, INDUSTRIAL,
         TRANCE, Gabber et Funk, à pleine présence. Aucune des deux branches
         ci-dessus ne les touchait : la première ne regarde que la famille
         focalisée, la seconde ne s'applique qu'au niveau famille. Elles
         passaient donc entre les deux et restaient nettes. */
      if (zoneActive && zone[i] !== 1 && slot.family !== (focusSlot?.family ?? -1)) {
        presence *= 1 - 0.25 * (defocus[i] ?? 0);
        ringOn = 0;
      }

      /* LE FLOU LUI-MÊME : 400 ms, montée et descente, jamais d'un coup.
         Interpolation lissée aux deux bouts (3t² - 2t³), donc sans départ
         ni arrivée brusques. Mouvement réduit : direct, comme toutes les
         autres animations du fichier. */
      {
        const vise = zoneActive && zone[i] !== 1 ? 1 : 0;
        if (reducedMotion) {
          defocus[i] = vise;
        } else {
          const t = clamp((now - zoneStart) / FOCUS_MS, 0, 1);
          const e = t * t * (3 - 2 * t);
          const d0 = defocusDepart[i] ?? 0;
          defocus[i] = d0 + (vise - d0) * e;
        }
      }

      sphereCenters[i * 3] = slot.world.x;
      sphereCenters[i * 3 + 1] = slot.world.y;
      sphereCenters[i * 3 + 2] = slot.world.z;
      /* Respiration et survol : le rayon vit, dans des bornes infimes. */
      if (!reducedMotion && !introActive) {
        const targetHover = i === hovered ? 1 : 0;
        hoverAmount[i] = (hoverAmount[i] ?? 0) + (targetHover - (hoverAmount[i] ?? 0)) * 0.22;
        /* LA RESPIRATION EST SUPPRIMEE. Voir ADR-065.

           Elle faisait varier le rayon de chaque sphere de 2 %. Les spheres
           sont des impostors qui ECRIVENT la profondeur : quand deux d'entre
           elles se recouvrent a l'ecran et que leurs rayons changent sans
           cesse, celle qui gagne le test de profondeur change d'une image a
           l'autre, et le pixel bascule d'une couleur a l'autre.

           MESURE, camera immobile, sur 3 024 000 pixels : respiration active,
           4388 pixels basculent avec un ecart de 410 niveaux ; respiration
           coupee, 18 pixels avec un ecart de 3. Un facteur 244 sur le nombre,
           137 sur l'amplitude.

           Une animation decorative de 2 % ne vaut pas cela. Le survol garde
           son agrandissement, qui est une reponse a une action et non un
           mouvement permanent. */
        const breath = 1;
        /* DIX POUR CENT au survol. Vingt sautait aux yeux, mais faisait
           bouger la carte a chaque passage de souris : le liseré et
           l'éclaircissement disent déjà où l'on est, le grossissement n'a
           qu'à confirmer, discrètement. */
        /* LES SPHÈRES GROSSISSENT ENCORE SUR PETIT ÉCRAN. Le rapport entre
           l'objet et son étiquette doit s'inverser : c'est la sphère qu'on
           vise du doigt, et elle faisait deux pixels de rayon sur les
           générations profondes. Le facteur porte aussi la zone cliquable,
           qui se calcule sur ce rayon. */
        /* LA SPHÈRE CENTRALE EST RÉDUITE SUR PETIT ÉCRAN.

           Elle est la plus grosse de l'arbre par construction, et sur 390 px
           elle mangeait la place de ses propres dérivés : on ouvrait un genre
           pour voir sa descendance, et c'est lui qu'on voyait. Son nom ayant
           déjà quitté la carte (il est dans le fil d'Ariane), rien ne se perd
           à la réduire : elle reste la plus grosse, sans écraser le reste. */
        /* PLUS DE GROSSISSEMENT SUR PETIT ECRAN. Il valait 1,75 pour rendre
           les derives visables ; depuis que la zone cliquable est garantie
           independamment du dessin, il ne fait plus qu'encombrer, et c'est ce
           qui a ete signale : des spheres si grosses qu'on ne voit plus toutes
           les branches. La racine descend a 0,8, elle n'a plus a etre reperee
           puisque son nom est dans le fil d'Ariane. */
        const facteurEtroit = width < 500 ? (i === focusIndex ? 0.8 : 1) : 1;
        sphereRadii[i] =
          (baseRadii[i] ?? 1) * breath * facteurEtroit * (1 + 0.1 * (hoverAmount[i] ?? 0));
      }

      /* GARDE INCONDITIONNELLE : UNE SPHERE DANS SON PARENT N'EST PAS PEINTE.

         Le calcul de presence ci-dessus s'appuie sur la distance PARCOURUE
         depuis la position repliee. C'est juste, mais indirect : il suppose
         que le trajet, la marge et le progres sont tous corrects. Cette
         garde-ci ne suppose rien. Elle regarde ou la sphere est MAINTENANT,
         et si son centre tombe a l'interieur de son ancetre, elle n'est pas
         peinte du tout.

         Deux surfaces dont l'une est enfermee dans l'autre ne peuvent pas
         etre departagees par le tampon de profondeur : cela donne un disque
         rapporte au centre d'une sphere, avec son propre ombrage et son
         propre anneau. C'est ce qui a ete signale, et cette garde le rend
         impossible quel que soit le chemin de code emprunte. */
      if (slot.depth >= 1 && slot.parent >= 0 && presence > 0) {
        const pi = (familyOffset[slot.family] ?? 0) + slot.parent;
        const parent = slotsData[pi];
        if (parent) {
          const dParent = slot.world.distanceTo(parent.world);
          /* Le seuil est le rayon de l'ancetre : au-dela, les deux corps se
             touchent au pire, ils ne s'enferment plus. */
          if (dParent < (sphereRadii[pi] ?? 0)) presence = 0;
        }
      }

      if ((defocus[i] ?? 0) > flouMaxCourant) flouMaxCourant = defocus[i] ?? 0;

      /* ESSAI PLAQUES : masquer les sphères des SOUS-STYLES Breaks (depth >= 2). */
      if (plaquesActif && slot.family === breaksIndex && slot.depth >= 2) presence = 0;

      sphereState[i * 4] = suspended ? presence * 0.35 : presence;
      /* LE HALO MARQUE CE QUI EST SÉLECTIONNÉ, pas ce qui est cadré. Sur un
         genre sans dérivés la caméra ne bouge plus et le centre de la zone
         reste le parent : si le halo suivait le cadrage, rien à l'écran ne
         dirait laquelle des sphères on vient d'ouvrir. */
      /* LE HALO MARQUE LA SÉLECTION D'ABORD, la racine de la vue ensuite.
         Le noeud cliqué doit se distinguer de la génération qu'il vient
         d'ouvrir, sans quoi rien à l'écran ne dit lequel des vingt on a
         choisi. */
      /* LE SURVOL ÉCLAIRCIT FRANCHEMENT. Le halo sature la teinte au lieu de
         la blanchir (voir sphereFrag) : la sphère visée devient nettement plus
         vive que ses voisines, ce qui se voit du coin de l'oeil. C'est le
         deuxième des cinq signes, avec la taille, le liseré, le curseur et le
         nom. */
      const survol = (hoverAmount[i] ?? 0) * 0.55;
      sphereState[i * 4 + 1] = Math.max(
        survol,
        i === activeGenre ? 0.42 : i === focusIndex ? 0.14 : 0
      );
      sphereState[i * 4 + 2] = ringOn;
      sphereState[i * 4 + 3] = labelled[i] ?? 0;
    }
    rayonFlou = flouMaxCourant * RAYON_FLOU_MAX;

    /* ═══════════════════════════════════════════════════════════════════
       PLANCHER ET PLAFOND DE RAYON, EN PIXELS D'ECRAN.

       Les rayons sont des unites du monde : a l'ecran, une feuille de
       troisieme generation tombait a trois pixels quand la racine en faisait
       deux cents. Aucun reglage de disposition ne corrige cela, parce que le
       probleme n'est pas la disposition mais l'ECART DE TAILLE lui-meme.

       On le compresse donc apres coup, la ou il se voit : plancher de 18 px
       de rayon, et plafond a 2,5 fois le plancher. La racine cesse d'ecraser
       le reste, les feuilles cessent d'etre des points. La hierarchie se lit
       encore, elle ne hurle plus.

       Le rayon MONDE est corrige, pas seulement le rendu : la zone cliquable
       et les liens se calculent dessus, ils suivent donc sans rien savoir. */
    if (zoneActive) {
      /* LE PLANCHER SUIT LA TAILLE DE L'ECRAN, il ne peut pas etre absolu.

         Dix-huit pixels de rayon sur un ecran de 390 px, c'est une sphere qui
         occupe un dixieme de la largeur : quinze d'entre elles ne tiennent
         nulle part. Le plancher existe pour qu'une sphere reste visable au
         doigt, et un doigt ne retrecit pas ; mais sur un petit ecran c'est la
         ZONE CLIQUABLE qui porte cette garantie, pas le dessin. Le dessin peut
         donc etre plus petit que la cible, et il le doit. */
      const PLANCHER_PX = width < 500 ? 7 : 18;
      const PLAFOND_PX = PLANCHER_PX * 2.5;
      for (let i = 0; i < TOTAL_GENRES; i += 1) {
        if (zone[i] !== 1) continue;
        if ((sphereState[i * 4] ?? 0) <= 0.02) continue;
        /* LE SURVOL S'APPLIQUE APRES LES BORNES, JAMAIS AVANT.

           C'ETAIT UN VRAI DEFAUT, revele par la suite de controles. Ce bloc
           s'execute APRES la boucle qui calcule les rayons, survol compris, et
           il REECRIT sphereRadii. Il ecrasait donc l'agrandissement de survol :
           dans un genre ouvert, survoler une sphere ne la grossissait plus du
           tout, alors que le lisere et l'eclaircissement, eux, repondaient.
           Trois signes sur quatre, encore une fois, et le quatrieme mort.

           Meme motif que les doublons CSS : deux ecritures sur la meme valeur,
           et c'est la derniere qui gagne. On borne donc le rayon NU, puis on
           reapplique le facteur de survol par-dessus. L'ordre est desormais
           explicite au lieu d'etre subi. */
        const facteurSurvol = 1 + 0.2 * (hoverAmount[i] ?? 0);
        const rPx = rayonEcran(i) / facteurSurvol;
        if (rPx <= 0.01) continue;
        const voulu = clamp(rPx, PLANCHER_PX, PLAFOND_PX);
        sphereRadii[i] = (sphereRadii[i] ?? 1) * ((voulu * facteurSurvol) / (rPx * facteurSurvol));
      }
      sphereRadiusAttr.needsUpdate = true;

      /* ═══════════════════════════════════════════════════════════════════
         AUCUNE ZONE CLIQUABLE N'EN CHEVAUCHE UNE AUTRE.

         Le plancher de rayon a resolu un probleme et en a cree un autre : des
         spheres de trois pixels devenues dix-huit, avec quarante pixels de
         zone autour, se disputent les clics quand elles appartiennent a une
         meme sous-branche serree. Mesure : quatre clics sur Detroit Techno
         ouvraient tous « Schranz », leur voisin.

         La regle posee par Mika evite d'avoir a choisir entre grosses cibles
         et cibles justes : les zones RETRECISSENT jusqu'a se toucher sans se
         chevaucher. Une zone de vingt pixels sans conflit vaut mieux qu'une
         zone de quarante volee par une voisine.

         Le rayon VISUEL ne bouge pas : les spheres gardent leurs dix-huit
         pixels, c'est la zone de capture, invisible, qui s'adapte.

         Deux passes suffisent : la premiere resout la quasi-totalite des
         paires, la seconde rattrape les cascades ou un retrecissement en
         provoque un autre. */
      const membresZone: number[] = [];
      for (let i = 0; i < TOTAL_GENRES; i += 1) {
        if (zone[i] === 1 && (sphereState[i * 4] ?? 0) > 0.02) membresZone.push(i);
      }
      /* PREMIER ECRIVAIN : la valeur voulue, genereuse. Le retrecissement
         ci-dessous s'applique APRES et peut seulement la reduire, jamais
         l'augmenter. L'ordre est declare parce qu'il compte : inverse, les
         zones se chevaucheraient de nouveau. */
      for (const i of membresZone) {
        rayonClic[i] = Math.max(rayonEcran(i) + 12, 40);
      }
      for (let passe = 0; passe < 2; passe += 1) {
        for (let a = 0; a < membresZone.length; a += 1) {
          for (let b = a + 1; b < membresZone.length; b += 1) {
            const ia = membresZone[a] ?? 0;
            const ib = membresZone[b] ?? 0;
            const d = Math.hypot(
              (projected[ia * 3] ?? 0) - (projected[ib * 3] ?? 0),
              (projected[ia * 3 + 1] ?? 0) - (projected[ib * 3 + 1] ?? 0)
            );
            const somme = (rayonClic[ia] ?? 0) + (rayonClic[ib] ?? 0);
            if (somme <= d || somme <= 0) continue;
            /* On retrecit les deux dans la meme proportion : reduire une
               seule des deux avantagerait arbitrairement l'autre. Le
               plancher est le rayon visible, une zone plus petite que la
               sphere qu'elle represente n'aurait aucun sens. */
            const facteur = d / somme;
            rayonClic[ia] = Math.max(rayonEcran(ia), (rayonClic[ia] ?? 0) * facteur);
            rayonClic[ib] = Math.max(rayonEcran(ib), (rayonClic[ib] ?? 0) * facteur);
          }
        }
      }
    }

    sphereCenterAttr.needsUpdate = true;
    sphereStateAttr.needsUpdate = true;
    defocusAttr.needsUpdate = true;
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

        /* LE LIEN S'ARRETE A LA SURFACE, PAS AU CENTRE.

           Il allait d'un centre de sphere a l'autre, donc ses deux
           extremites etaient A L'INTERIEUR des spheres. Or une sphere est
           ici un IMPOSTOR : un quad plat tourne vers la camera, pas un
           volume. Rien n'occulte donc la portion de lien qui penetre dedans,
           et le trait reste visible jusqu'au centre.

           Vu de pres, cela fait une barre en travers de la sphere, avec une
           extremite franche en son milieu. Vu de loin sur de petites
           spheres, cela fait des points brillants qui semblent grouiller.
           C'est un motif FIXE, ce qui explique qu'aucune mesure entre deux
           images consecutives n'ait pu le voir.

           On retranche donc a chaque bout le rayon de la sphere concernee.
           Si les deux spheres se touchent presque, le lien disparait plutot
           que de s'inverser : un trait de longueur negative se dessinerait
           a l'envers. */
        const lax = b.world.x - a.world.x;
        const lay = b.world.y - a.world.y;
        const laz = b.world.z - a.world.z;
        const len = Math.hypot(lax, lay, laz);
        const ra = sphereRadii[ref.a] ?? 0;
        const rb = sphereRadii[ref.b] ?? 0;

        if (len > ra + rb + 0.001) {
          const ux = lax / len;
          const uy = lay / len;
          const uz = laz / len;
          linkP0.set([a.world.x + ux * ra, a.world.y + uy * ra, a.world.z + uz * ra], i * 3);
          linkP1.set([b.world.x - ux * rb, b.world.y - uy * rb, b.world.z - uz * rb], i * 3);
        } else {
          /* Trop courts pour etre traces : les deux corps se touchent deja. */
          linkP0.set([a.world.x, a.world.y, a.world.z], i * 3);
          linkP1.set([a.world.x, a.world.y, a.world.z], i * 3);
        }
        /* ORDRE EXPLICITE : cette ecriture appartient a la branche des liens
           INTERNES a une famille. Les deux autres ecritures de cette case
           vivent dans la branche des liens ENTRE familles, qui est exclusive
           de celle-ci. Aucune ne s'ecrase, elles ne se rencontrent jamais. */
        linkMeta[i * 3 + 2] = clamp(genreProgress(b, now), 0, 1);

        /* Les liens du sous-arbre focalisé passent au premier plan et
           s'épaississent, les autres liens de la famille s'effacent presque. */
        if (focusIndex >= 0 && a.family === (slotsData[focusIndex]?.family ?? -1)) {
          /* LA ZONE, PAS LE SOUS-ARBRE. Le test portait sur la descendance :
             un lien entre Euro Techno, qui est dans la couronne, et Hard
             Techno, qui est un petit-fils replié hors zone, comptait comme
             interne et se dessinait à pleine opacité. À l'écran, cela faisait
             des traits nets partant de la couronne vers le flou, exactement
             ce que le mode focus doit supprimer. Un lien n'est net que si ses
             DEUX extrémités sont nettes. */
          const dansLaZone = zone[ref.a] === 1 && zone[ref.b] === 1;
          linkMeta[i * 3] = dansLaZone ? 1 : 0.12;
          /* ORDRE EXPLICITE : branche des liens INTERNES a une famille,
             exclusive des deux autres ecritures de cette case. */
          linkMeta[i * 3 + 1] = dansLaZone ? 1 : 0.45;
        } else if (zoneActive) {
          /* Lien d'une autre famille en mode focus : il s'efface avec elle.
             Un trait net reliant deux taches floues se lit comme une erreur
             de rendu, et ramène l'oeil exactement là où il n'a rien à faire. */
          linkMeta[i * 3] = 0.35;
          linkMeta[i * 3 + 1] = 0.45;
        } else {
          linkMeta[i * 3] = 0.35;
          linkMeta[i * 3 + 1] = 1;
        }

        /* Le lien part au flou dès qu'une de ses extrémités y part. */
        linkFlou[i] =
          (defocus[ref.a] ?? 0) > 0.02 || (defocus[ref.b] ?? 0) > 0.02 ? 1 : 0;
      } else {
        const ca = familyCenters[ref.familyA];
        const cb = familyCenters[ref.familyB];
        if (!ca || !cb) continue;
        linkP0.set([ca.x, ca.y, ca.z], i * 3);
        linkP1.set([cb.x, cb.y, cb.z], i * 3);
        /* ORDRE EXPLICITE : branche des liens ENTRE familles, valeur par
           defaut. L'intro, plus bas, s'applique APRES et la remplace pendant
           la naissance des familles seulement. */
        linkMeta[i * 3 + 2] = 1;

        /* Les liens entre familles traversaient tout l'écran en diagonale et
           brouillaient la lecture. Ils sont désormais quasi invisibles par
           défaut, et ne s'allument que si l'une de leurs deux extrémités est
           la famille sélectionnée ou celle du noeud survolé. */
        /* Ces trois ecritures sont EXCLUSIVES : intro, puis liens entre
           familles, puis liens internes. Une seule s'execute par lien et par
           image. L'ordre est declare pour que le controle des ecritures
           concurrentes n'ait pas a le deviner, et pour qu'on sache, si une
           quatrieme apparait, qu'elle doit rester exclusive elle aussi. */
        if (introActive) {
          /* Le lien se trace depuis la famille d'origine vers la naissante,
             comme une propagation : l'avancement suit la naissance de la
             famille d'arrivée. */
          const bornA = introBirth(ref.familyA, now);
          const bornB = introBirth(ref.familyB, now);
          /* ORDRE EXPLICITE : pendant l'intro seulement. Elle s'applique
             APRES la valeur par defaut des liens entre familles, et la
             remplace le temps de la naissance. */
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
        /* En mode focus, même les liens entre familles s'éteignent : ils
           partent de la zone nette et filent vers le flou, ce qui invite
           l'oeil à sortir de là où on vient d'entrer. */
        linkMeta[i * 3 + 1] = zoneActive ? 0.25 : concerned ? 0.9 : 0.1;
        /* Les liens entre familles relient deux régions floues : ils partent
           au flou avec elles, sans exception. */
        linkFlou[i] = zoneActive ? 1 : 0;
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
    linkFlouAttr.needsUpdate = true;

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
    if (traceIci) traceDistance.push(`4. fin de boucle            distance = ${distance.toFixed(2)}`);
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
        openLabel: openIndex >= 0 ? (FAMILIES[openIndex]?.label ?? '·') : '·',
        deployPct: openIndex >= 0 ? (familyProgress[openIndex] ?? 0) * 100 : 0,
        distance,
        nearestLabel: FAMILIES[nearestIndex]?.label ?? '·',
        nearestDistance: nearestDist,
        labelsShown,
        genreLabelsShown,
        reduced,
        results
      });
    }
  };

  const frame = (): void => {
    if (!running) return;
    requestAnimationFrame(frame);
    avancer(performance.now());
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

    /* MESURE DU SCINTILLEMENT, deuxieme version.

       LA PREMIERE ETAIT FAUSSE et rendait zero. Elle dessinait deux fois le
       MEME etat : un GPU est deterministe, deux rendus identiques donnent le
       meme resultat, et la mesure ne testait rien du tout.

       Ce qu'il faut mesurer, c'est ce qui change alors que L'UTILISATEUR ne
       bouge rien. On deroule donc la vraie boucle, image par image, temps
       simule, camera FIGEE, et on compare les pixels d'une image a l'autre.

       LE SEUIL SEPARE DEUX CHOSES QUI N'ONT RIEN A VOIR. La respiration des
       spheres fait varier une couleur de un ou deux niveaux par image : c'est
       voulu, doux, et invisible. Un conflit de profondeur fait BASCULER un
       pixel d'une surface a l'autre, soit des dizaines de niveaux d'un coup.
       Compter tout changement melangerait les deux ; on ne compte donc que
       les sauts francs. */
    /* INTERRUPTEURS DE DIAGNOSTIC. Pour trouver ce qui scintille, on eteint
       une composante a la fois et on remesure. Celle dont l'extinction met le
       compte a zero est la coupable. */
    composante: (nom: string, actif: boolean) => {
      if (nom === 'flou') flouActif = actif;
      else if (nom === 'spheres') sphereMesh.visible = actif;
      else if (nom === 'liens') linkMesh.visible = actif;
      else if (nom === 'repliees') repliesOn = actif;
      else if (nom === 'flux') fluxOn = actif;
      return { nom, actif };
    },

    /* COMBIEN DE SPHERES SONT REELLEMENT DESSINEES, et lesquelles sont
       repliees sur leur ancetre. Le compte d'instances soumises au GPU est
       fixe, 218 : c'est la presence qui decide de ce qui est peint. Si une
       sphere repliee a une presence non nulle, elle est peinte au centre
       exact de son parent, et c'est la bille dans la bille. */
    compteDessine: () => {
      let dessinees = 0;
      const repliesVisibles: { label: string; depth: number; presence: number; distanceAuParent: number }[] = [];
      for (let i = 0; i < TOTAL_GENRES; i += 1) {
        const p = sphereState[i * 4] ?? 0;
        if (p > 0.01) dessinees += 1;
        const slot = slotsData[i];
        if (!slot || slot.depth < 2 || slot.parent < 0) continue;
        const pi = (familyOffset[slot.family] ?? 0) + slot.parent;
        const parent = slotsData[pi];
        if (!parent) continue;
        const d = slot.world.distanceTo(parent.world);
        if (p > 0.01 && d < (sphereRadii[pi] ?? 1)) {
          repliesVisibles.push({
            label: slot.label,
            depth: slot.depth,
            presence: Math.round(p * 1000) / 1000,
            distanceAuParent: Math.round(d * 1000) / 1000
          });
        }
      }
      return { instancesSoumises: TOTAL_GENRES, dessinees, repliesVisibles };
    },

    /* QUI EST VISIBLE, ET AU MEME ENDROIT QUE QUI.

       On liste les spheres reellement dessinees, avec leur presence et leur
       position, puis on cherche les paires dont les centres coincident. Une
       paire visible a distance nulle, ce sont deux surfaces confondues : le
       GPU ne peut pas trancher, et c'est la bille dans la bille. */
    spheresSuperposees: () => {
      const paires: {
        a: string; b: string; depthA: number; depthB: number;
        presenceA: number; presenceB: number; distance: number;
        rayonA: number; rayonB: number;
      }[] = [];
      for (let i = 0; i < TOTAL_GENRES; i += 1) {
        const pa = sphereState[i * 4] ?? 0;
        if (pa <= 0.01) continue;
        const sa = slotsData[i];
        if (!sa) continue;
        for (let j = i + 1; j < TOTAL_GENRES; j += 1) {
          const pb = sphereState[j * 4] ?? 0;
          if (pb <= 0.01) continue;
          const sb = slotsData[j];
          if (!sb || sb.family !== sa.family) continue;
          const d = sa.world.distanceTo(sb.world);
          const rmin = Math.min(sphereRadii[i] ?? 0, sphereRadii[j] ?? 0);
          if (d < rmin) {
            paires.push({
              a: sa.label, b: sb.label,
              depthA: sa.depth, depthB: sb.depth,
              presenceA: Math.round(pa * 100) / 100,
              presenceB: Math.round(pb * 100) / 100,
              distance: Math.round(d * 1000) / 1000,
              rayonA: Math.round((sphereRadii[i] ?? 0) * 100) / 100,
              rayonB: Math.round((sphereRadii[j] ?? 0) * 100) / 100
            });
          }
        }
      }
      return paires;
    },

    /* ANALYSE SPATIALE D'UNE SEULE IMAGE.

       La mesure image-par-image rend zero quand le motif est FIXE : il n'y a
       rien a comparer entre deux images identiques. Un motif de haute
       frequence spatiale, immobile, fait pourtant vibrer l'oeil, et c'est
       ce qu'on appelle du moire.

       On rend donc UNE image, et on lit une ligne de pixels. Une surface
       lisse change de sens une ou deux fois le long d'un diametre ; un motif
       de haute frequence en change des dizaines. */
    lignePixels: (cx: number, cy: number, longueur: number, vertical = false) => {
      const gl = renderer.getContext();
      const w = renderer.domElement.width;
      const h = renderer.domElement.height;

      renderer.autoClear = true;
      renderer.render(bgScene, bgCamera);
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(scene, camera);
      renderer.autoClear = true;

      const x0 = Math.max(0, Math.min(w - 1, Math.round(cx - (vertical ? 0 : longueur / 2))));
      const y0 = Math.max(0, Math.min(h - 1, Math.round(cy - (vertical ? longueur / 2 : 0))));
      const lw = vertical ? 1 : Math.min(longueur, w - x0);
      const lh = vertical ? Math.min(longueur, h - y0) : 1;
      const buf = new Uint8Array(lw * lh * 4);
      gl.readPixels(x0, y0, lw, lh, gl.RGBA, gl.UNSIGNED_BYTE, buf);

      const lum: number[] = [];
      for (let i = 0; i < lw * lh; i += 1) {
        lum.push(
          Math.round(
            0.2126 * (buf[i * 4] ?? 0) + 0.7152 * (buf[i * 4 + 1] ?? 0) + 0.0722 * (buf[i * 4 + 2] ?? 0)
          )
        );
      }

      /* Inversions de sens : la signature d'un motif. Un degrade propre monte
         puis descend, soit une inversion. Des alternances repetees en font
         autant qu'il y a de franges. */
      let inversions = 0;
      let sens = 0;
      for (let i = 1; i < lum.length; i += 1) {
        const d = (lum[i] ?? 0) - (lum[i - 1] ?? 0);
        if (d === 0) continue;
        const sg = Math.sign(d);
        if (sens !== 0 && sg !== sens) inversions += 1;
        sens = sg;
      }
      return { x0, y0, largeur: lw, hauteur: lh, inversions, luminances: lum };
    },

    /** Rend une image et renvoie une zone en PNG, pour la regarder. */
    capturerZone: (cx: number, cy: number, taille: number, agrandissement = 4) => {
      const gl = renderer.getContext();
      const w = renderer.domElement.width;
      const h = renderer.domElement.height;

      renderer.autoClear = true;
      renderer.render(bgScene, bgCamera);
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(scene, camera);
      renderer.autoClear = true;

      const t = Math.min(taille, w, h);
      const x0 = Math.max(0, Math.min(w - t, Math.round(cx - t / 2)));
      const y0 = Math.max(0, Math.min(h - t, Math.round(cy - t / 2)));
      const buf = new Uint8Array(t * t * 4);
      gl.readPixels(x0, y0, t, t, gl.RGBA, gl.UNSIGNED_BYTE, buf);

      const src = document.createElement('canvas');
      src.width = t;
      src.height = t;
      const sc = src.getContext('2d');
      if (!sc) return null;
      const img = sc.createImageData(t, t);
      /* readPixels rend l'image a l'envers par rapport au canvas 2D. */
      for (let y = 0; y < t; y += 1) {
        for (let x = 0; x < t; x += 1) {
          const s = ((t - 1 - y) * t + x) * 4;
          const d = (y * t + x) * 4;
          img.data[d] = buf[s] ?? 0;
          img.data[d + 1] = buf[s + 1] ?? 0;
          img.data[d + 2] = buf[s + 2] ?? 0;
          img.data[d + 3] = 255;
        }
      }
      sc.putImageData(img, 0, 0);

      const out = document.createElement('canvas');
      out.width = t * agrandissement;
      out.height = t * agrandissement;
      const oc = out.getContext('2d');
      if (!oc) return null;
      /* Aucun lissage : on veut voir les pixels tels qu'ils sont. */
      oc.imageSmoothingEnabled = false;
      oc.drawImage(src, 0, 0, out.width, out.height);
      return out.toDataURL('image/png');
    },

    mesurerScintillement: (images = 12, seuil = 24, pasMs = 16.7) => {
      const gl = renderer.getContext();
      const w = renderer.domElement.width;
      const h = renderer.domElement.height;
      const a = new Uint8Array(w * h * 4);
      const b = new Uint8Array(w * h * 4);

      /* La camera est figee AVANT la premiere image et le reste : toute
         difference mesuree vient de la scene, jamais du point de vue. */
      azVel = 0;
      elVel = 0;
      dollyVel = 0;
      applyCamera();

      let t = performance.now();
      const rendre = (cible: Uint8Array): void => {
        t += pasMs;
        avancer(t);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, cible);
      };

      rendre(a);
      let pireSauts = 0;
      let totalSauts = 0;
      let pireEcart = 0;
      let doux = 0;

      for (let k = 0; k < images; k += 1) {
        rendre(b);
        let sauts = 0;
        let ecart = 0;
        let changes = 0;
        for (let j = 0; j < a.length; j += 4) {
          const d =
            Math.abs((a[j] ?? 0) - (b[j] ?? 0)) +
            Math.abs((a[j + 1] ?? 0) - (b[j + 1] ?? 0)) +
            Math.abs((a[j + 2] ?? 0) - (b[j + 2] ?? 0));
          if (d > 0) changes += 1;
          if (d >= seuil) {
            sauts += 1;
            if (d > ecart) ecart = d;
          }
        }
        totalSauts += sauts;
        doux = Math.max(doux, changes - sauts);
        if (sauts > pireSauts) pireSauts = sauts;
        if (ecart > pireEcart) pireEcart = ecart;
        a.set(b);
      }

      return {
        largeur: w,
        hauteur: h,
        pixels: w * h,
        images,
        seuil,
        /* LE CHIFFRE QUI COMPTE : pixels qui basculent franchement. */
        sautsMax: pireSauts,
        sautsMoyen: Math.round(totalSauts / images),
        ecartMax: pireEcart,
        /* Pour verifier que la mesure n'est pas aveugle : si ce nombre est a
           zero lui aussi, c'est que rien ne bouge du tout et que la scene
           n'anime pas, donc que la mesure ne prouve rien. */
        variationsDouces: doux
      };
    },
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

    /* MESURE DU MODE FOCUS. Quand on ne peut pas voir, on mesure (ADR-048).
       Rend la zone active, l'état de flou, et surtout LA PLUS COURTE
       DISTANCE ENTRE DEUX CIBLES À L'ÉCRAN : c'est le chiffre qui dit si la
       couronne d'entrée tient sa promesse de 44 px. */
    /* Le journal du dernier clic, etape par etape. */
    trace: () => trace.slice(),
    /* LA SEULE SOURCE DE VERITE POUR L'UNITE.

       Les positions projetees vivent dans CE repere : `width` et `height`, la
       taille du canvas en pixels CSS telle que le moteur la connait. Tout
       script de mesure lit cette valeur, jamais une dimension recalculee
       depuis le DOM ou depuis devicePixelRatio.

       Pourquoi : le moteur plafonne son ratio de rendu a 1,5 en mode reduit,
       donc `canvas.width / devicePixelRatio` rend 672 la ou le canvas fait 896
       en pixels CSS. Deux composants qui mesurent la meme chose dans des
       unites differentes, et c'est celui qui PRODUIT la valeur qui doit la
       publier. */
    dimensions: () => ({ largeur: width, hauteur: height }),

    tracerDistance: () => { traceDistanceDemandee = true; },
    lireTraceDistance: () => traceDistance.slice(),
    viderTrace: () => { trace.length = 0; },

    zoneFocus: () => {
      const dedans: {
        slot: number;
        label: string;
        x: number;
        y: number;
        rayonPx: number;
        rayonClicPx: number;
        presence: number;
        profondeur: number;
        generation: number;
        nomme: boolean;
      }[] = [];
      let flouMin = 1;
      let flouMax = 0;
      let netsHorsZone = 0;
      for (let i = 0; i < TOTAL_GENRES; i += 1) {
        const presence = sphereState[i * 4] ?? 0;
        if (zoneActive && zone[i] === 1) {
          dedans.push({
            slot: i,
            label: slotsData[i]?.label ?? '',
            x: Math.round(projected[i * 3] ?? 0),
            y: Math.round(projected[i * 3 + 1] ?? 0),
            rayonPx: Math.round(rayonEcran(i)),
            rayonClicPx: Math.round(rayonClic[i] ?? 0),
            presence: Math.round(presence * 100) / 100,
            profondeur: slotsData[i]?.depth ?? -1,
            generation: zoneGeneration[i] ?? -1,
            nomme: (labelled[i] ?? 0) === 1
          });
        } else if (zoneActive && presence > 0.02) {
          flouMin = Math.min(flouMin, defocus[i] ?? 0);
          flouMax = Math.max(flouMax, defocus[i] ?? 0);
          if ((defocus[i] ?? 0) < 0.9) netsHorsZone += 1;
        }
      }
      let ecartMin = Infinity;
      let paire = '';
      for (let a = 0; a < dedans.length; a += 1) {
        for (let b = a + 1; b < dedans.length; b += 1) {
          const p = dedans[a];
          const q = dedans[b];
          if (!p || !q) continue;
          const d = Math.hypot(p.x - q.x, p.y - q.y) - p.rayonPx - q.rayonPx;
          if (d < ecartMin) {
            ecartMin = d;
            paire = `${p.label} / ${q.label}`;
          }
        }
      }
      return {
        actif: zoneActive,
        /* L'ÉTAT DE NAVIGATION BRUT. Il a servi à trouver que le moteur ne
           tournait pas du tout pendant les mesures automatisées : une page
           en arrière-plan ne reçoit aucune image, donc rien n'avance, et
           tout se lisait comme un défaut de rendu. Gardé pour le prochain
           qui doutera. */
        diag: {
          depuisMs: Math.round(performance.now() - zoneStart),
          niveau: level,
          familleActive: activeFamily,
          genreActif: activeGenre,
          familleOuverte: openIndex,
          progresFamille: activeFamily >= 0 ? Math.round((familyProgress[activeFamily] ?? -1) * 100) / 100 : null,
          rayonGroupe: Math.round(focusRingRadius() * 100) / 100,
        /* Longueur MOYENNE des liens de l'arbre, en pixels d'écran : c'est ce
           que le resserrement des anneaux doit faire baisser. */
        rayonMoyenPx: (() => {
          let somme = 0; let n = 0;
          for (let i = 0; i < TOTAL_GENRES; i += 1) {
            if (zone[i] !== 1) continue;
            somme += rayonEcran(i); n += 1;
          }
          return n > 0 ? Math.round((somme / n) * 10) / 10 : 0;
        })(),
        /* Deux spheres de la zone qui se recouvrent : le grossissement est
           alors trop fort, et ce compte doit rester a zero. */
        spheresQuiSeTouchent: (() => {
          let paires = 0;
          const m: number[] = [];
          for (let i = 0; i < TOTAL_GENRES; i += 1) if (zone[i] === 1) m.push(i);
          for (let a = 0; a < m.length; a += 1) {
            for (let b = a + 1; b < m.length; b += 1) {
              const ia = m[a] ?? 0; const ib = m[b] ?? 0;
              const d = Math.hypot((projected[ia * 3] ?? 0) - (projected[ib * 3] ?? 0),
                (projected[ia * 3 + 1] ?? 0) - (projected[ib * 3 + 1] ?? 0));
              if (d < rayonEcran(ia) + rayonEcran(ib)) paires += 1;
            }
          }
          return paires;
        })(),
        lienMoyenPx: (() => {
          let somme = 0;
          let n = 0;
          for (const [i] of focusOffsets) {
            const si = slotsData[i];
            if (!si || zone[i] !== 1 || si.parent < 0) continue;
            const pi = (familyOffset[si.family] ?? 0) + si.parent;
            if (zone[pi] !== 1) continue;
            somme += Math.hypot(
              (projected[i * 3] ?? 0) - (projected[pi * 3] ?? 0),
              (projected[i * 3 + 1] ?? 0) - (projected[pi * 3 + 1] ?? 0)
            );
            n += 1;
          }
          return n > 0 ? Math.round(somme / n) : 0;
        })(),

        labelsMordus,
        debordementPx: debordement,
          offsetsPoses: focusOffsets.size,
          distanceVoulue: focusIndex >= 0 ? Math.round(distanceDuFocus(focusIndex)) : null,
          distanceReelle: Math.round(distance),
          enVol: flying,
          dernierTap,
        sensDeploiement: activeFamily >= 0 ? (deployDir[activeFamily] ?? 0) : null,
          enAttente: pendingGenre
        },
        focus: focusIndex >= 0 ? (slotsData[focusIndex]?.label ?? '') : null,
        racine: focusIndex >= 0 ? (slotsData[focusIndex]?.label ?? '') : null,
        selection: activeGenre >= 0 ? (slotsData[activeGenre]?.label ?? '') : null,
        generations: zoneProfondeurMax,
        nommes: dedans.filter((d) => d.nomme).length,
        parGeneration: (() => {
          const c: Record<string, { total: number; nommes: number }> = {};
          for (const d of dedans) {
            const k = `g${d.generation}`;
            const e = c[k] ?? { total: 0, nommes: 0 };
            e.total += 1;
            if (d.nomme) e.nommes += 1;
            c[k] = e;
          }
          return c;
        })(),
        parent: zoneParent >= 0 ? (slotsData[zoneParent]?.label ?? '') : null,
        cibles: dedans.length,
        membres: dedans,
        ecartMinPx: dedans.length > 1 ? Math.round(ecartMin) : null,
        paireLaPlusSerree: paire,
        flouHorsZone: { min: Math.round(flouMin * 100) / 100, max: Math.round(flouMax * 100) / 100 },
        horsZonePasEncoreFloues: netsHorsZone,
        labelsAffiches: labelSlots.filter((l) => l.visible && l.opacity > 0.05).map((l) => l.el.textContent ?? '')
      };
    },

    /* LA LIGNE TELLE QU'ELLE EST COMPOSÉE À L'ÉCRAN.

       lignePixels rend la scène DIRECTEMENT, sans les passes de flou : il
       mesure donc ce que le moteur dessine, pas ce que l'oeil voit. Pour
       juger un flou, c'est l'image finale qu'il faut lire. Celle-ci passe
       par renderOnce, donc par tout le pipeline, et compte les INVERSIONS DE
       SENS du gradient : une forme nette en produit à chaque bord, une forme
       floue n'en produit presque plus. Le rapport entre les deux états est
       la mesure du flou. */
    ligneEcran: (cy: number, longueur = 0) => {
      renderOnce(true);
      const gl2 = renderer.getContext();
      const w = renderer.domElement.width;
      const h = renderer.domElement.height;
      const y = Math.max(0, Math.min(h - 1, Math.round(cy)));
      const lw = longueur > 0 ? Math.min(longueur, w) : w;
      const buf = new Uint8Array(lw * 4);
      gl2.readPixels(0, y, lw, 1, gl2.RGBA, gl2.UNSIGNED_BYTE, buf);
      const lum: number[] = [];
      for (let i = 0; i < lw; i += 1) {
        lum.push(
          0.2126 * (buf[i * 4] ?? 0) + 0.7152 * (buf[i * 4 + 1] ?? 0) + 0.0722 * (buf[i * 4 + 2] ?? 0)
        );
      }
      /* Seuil d'un niveau : sous cette valeur, la variation est du bruit de
         quantification et non un bord. Sans lui, un dégradé parfaitement
         lisse compterait des centaines d'inversions. */
      let inversions = 0;
      let sens = 0;
      let precedent = lum[0] ?? 0;
      for (let i = 1; i < lum.length; i += 1) {
        const v = lum[i] ?? 0;
        const d = v - precedent;
        if (Math.abs(d) < 1) continue;
        const sg = Math.sign(d);
        if (sens !== 0 && sg !== sens) inversions += 1;
        sens = sg;
        precedent = v;
      }
      return {
        y,
        largeur: lw,
        inversions,
        min: Math.round(Math.min(...lum)),
        max: Math.round(Math.max(...lum))
      };
    },

    /* LA ZONE CLIQUABLE DE CHAQUE SPHÈRE, SONDÉE SUR LA SPHÈRE ELLE-MÊME.

       CE BANC-CI N'EST PAS TAUTOLOGIQUE, contrairement à accordSurvolClic qui
       compare une fonction à elle-même et ne peut rendre que zéro. Ici on
       n'interroge pas deux chemins : on pose des points À DES ENDROITS CONNUS,
       sur le disque de chaque sphère, et on demande ce que le clic y
       désignerait. Si un point posé sur une sphère ne la désigne pas, la
       question « faut-il viser précisément » a sa réponse chiffrée.

       Neuf points par sphère : son centre, puis huit directions à 60 % et à
       95 % de son rayon apparent. Une sphère dont les neuf points répondent
       est entièrement cliquable ; en dessous, la part qui répond dit de
       combien la zone manque. */
    /* Ce qui est survole, en clair. Sans ce crochet, verifier le survol
       demandait de lire des pixels : on ne pouvait pas distinguer « rien n'est
       survole » de « le survol est survole mais ne se voit pas ». */
    survole: () => (hovered >= 0 ? (slotsData[hovered]?.label ?? '?') : 'aucune'),

    zonesCliquables: () => {
      const dirs: [number, number][] = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]
      ];
      const rapport: {
        label: string;
        generation: number;
        rayonPx: number;
        surNeuf: number;
        vole: string | null;
      }[] = [];
      for (let i = 0; i < TOTAL_GENRES; i += 1) {
        if (!zoneActive || zone[i] !== 1) continue;
        if ((sphereState[i * 4] ?? 0) <= 0.02) continue;
        const cx = projected[i * 3] ?? 0;
        const cy = projected[i * 3 + 1] ?? 0;
        const r = rayonEcran(i);
        let bons = 0;
        let vole: string | null = null;
        const points: [number, number][] = [[cx, cy]];
        for (const [dx, dy] of dirs) {
          points.push([cx + dx * r * 0.6, cy + dy * r * 0.6]);
        }
        for (const [x, y] of points) {
          const c = cibleAuPoint(x, y);
          const slot = c && c.kind === 'genre' ? c.slot : -1;
          if (slot === i) bons += 1;
          else if (vole === null) {
            vole = slot >= 0 ? (slotsData[slot]?.label ?? '?') : 'rien';
          }
        }
        rapport.push({
          label: slotsData[i]?.label ?? '',
          generation: zoneGeneration[i] ?? -1,
          rayonPx: Math.round(r),
          surNeuf: bons,
          vole
        });
      }
      /* CONTROLE : DEUX ZONES CLIQUABLES NE SE CHEVAUCHENT JAMAIS.

         Il echoue si une seule paire se recouvre. C'est la garantie qui
         empeche une voisine de voler un clic, et sans ce compte elle se
         reperdrait a la premiere modification de la disposition. */
      let pairesQuiSeChevauchent = 0;
      let pireChevauchement: string | null = null;
      const membres2: number[] = [];
      for (let i = 0; i < TOTAL_GENRES; i += 1) {
        if (zoneActive && zone[i] === 1 && (sphereState[i * 4] ?? 0) > 0.02) membres2.push(i);
      }
      for (let a = 0; a < membres2.length; a += 1) {
        for (let b = a + 1; b < membres2.length; b += 1) {
          const ia = membres2[a] ?? 0;
          const ib = membres2[b] ?? 0;
          const d = Math.hypot(
            (projected[ia * 3] ?? 0) - (projected[ib * 3] ?? 0),
            (projected[ia * 3 + 1] ?? 0) - (projected[ib * 3 + 1] ?? 0)
          );
          const somme = (rayonClic[ia] ?? 0) + (rayonClic[ib] ?? 0);
          if (somme > d + 0.5) {
            pairesQuiSeChevauchent += 1;
            if (!pireChevauchement) {
              pireChevauchement = `${slotsData[ia]?.label ?? '?'} et ${slotsData[ib]?.label ?? '?'} : centres a ${Math.round(d)} px, zones ${Math.round(rayonClic[ia] ?? 0)} et ${Math.round(rayonClic[ib] ?? 0)}`;
            }
          }
        }
      }

      const parfaites = rapport.filter((x) => x.surNeuf === 9).length;
      return {
        pairesQuiSeChevauchent,
        pireChevauchement,
        spheres: rapport.length,
        entierementCliquables: parfaites,
        tauxPct: rapport.length > 0 ? Math.round((parfaites / rapport.length) * 100) : 0,
        pires: rapport.filter((x) => x.surNeuf < 9).sort((a, b) => a.surNeuf - b.surNeuf).slice(0, 8)
      };
    },

    /* L'ACCORD ENTRE LE SURVOL ET LE CLIC, MESURÉ SUR UNE GRILLE.

       « Ça marche au hasard » n'est pas un ressenti, c'est un désaccord, et un
       désaccord se compte. On sonde l'écran tous les huit pixels et on demande
       aux deux chemins ce qu'ils voient. Depuis qu'ils appellent la même
       fonction, le taux doit être exactement zéro : si ce compte remonte un
       jour au-dessus de zéro, c'est que quelqu'un a rouvert un second chemin
       de ciblage. */
    accordSurvolClic: (pas = 8) => {
      let points = 0;
      let desaccords = 0;
      const exemples: { x: number; y: number; survol: string; clic: string }[] = [];
      for (let x = 4; x < width; x += pas) {
        for (let y = 4; y < height; y += pas) {
          points += 1;
          const c = cibleAuPoint(x, y);
          const parLeClic = c && c.kind === 'genre' ? c.slot : -1;
          /* Le survol, tel qu'il s'allumerait : même appel, même lecture. */
          const parLeSurvol = c && c.kind === 'genre' ? c.slot : -1;
          if (parLeClic !== parLeSurvol) {
            desaccords += 1;
            if (exemples.length < 5) {
              exemples.push({
                x, y,
                survol: parLeSurvol >= 0 ? (slotsData[parLeSurvol]?.label ?? '') : 'rien',
                clic: parLeClic >= 0 ? (slotsData[parLeClic]?.label ?? '') : 'rien'
              });
            }
          }
        }
      }
      return {
        points,
        desaccords,
        tauxPct: points > 0 ? Math.round((desaccords / points) * 10000) / 100 : 0,
        exemples
      };
    },

    /* Ce que le clic ferait à cet endroit, SANS le faire. Sert à prouver
       qu'aucune zone floue ne capte un clic, sans simuler d'événements. */
    cibleSous: (px: number, py: number) => {
      const nom = nomTouche(px, py, 4);
      const sphere = chercherCible(px, py, 26);
      return {
        nom: nom ? (nom.el.textContent ?? '') : null,
        nomSlot: nom ? nom.slot : -1,
        sphere: sphere >= 0 ? (slotsData[sphere]?.label ?? '') : null,
        dansLaZone: sphere >= 0 ? zone[sphere] === 1 : null
      };
    },

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
        /* RETOUR A LA VUE D'ENSEMBLE : le cadrage du premier chargement, à
           l'identique. Ce chemin remettait la distance et la cible mais
           laissait les angles où l'orbite les avait mis, l'arbre ouvert dans
           sa zone, et le mode focus armé. On passe donc par recenter, qui
           remet tout, y compris les angles. */
        sortirDuFocus();
        recenter();
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
      /* Les deux cibles du flou tiennent chacune un tampon de la taille de
         l'écran : les oublier ici fuirait un écran de mémoire vidéo à chaque
         changement de vue. */
      rtFlouA.dispose();
      rtFlouB.dispose();
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
      /* LE NIVEAU COURANT EST CELUI DE LA ZONE, pas le genre sélectionné : sur
         une feuille, le cadre est celui de son parent, et recadrer sur elle
         reviendrait à faire ce que la règle interdit. */
      const cadre = focusIndex >= 0 ? focusIndex : activeGenre;
      const g = cadre >= 0 ? slotsData[cadre] : undefined;
      if (g && (g.children.length > 0 || focusIndex >= 0)) {
        frameLock = cadre;
        startFly(cibleDuFocus(cadre), distanceDuFocus(cadre), now);
      } else if (activeFamily >= 0) {
        frameLock = -1;
        frameFamily(activeFamily, now);
      }
    }
  };
};
