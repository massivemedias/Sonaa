/* Shaders du prototype. JETABLE.

   Fin du volumétrique diffus. Une famille est une structure de sphères NETTES
   reliées par des liens fins. On doit pouvoir compter les sphères.

   Les sphères sont des imposteurs : un quad face caméra, et la normale est
   reconstruite analytiquement depuis le disque. Aucun raymarching, aucune
   géométrie de sphère, aucun asset. Ombrage lambertien simple plus un liseré,
   sans aucune composante spéculaire : ni chrome, ni vernis, ni plastique. */

// ---------------------------------------------------------------- FOND

export const backgroundVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const backgroundFrag = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform float uGrain;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec3 deep = vec3(0.032, 0.037, 0.048);
  vec3 near = vec3(0.068, 0.075, 0.090);
  float d = distance(vUv, vec2(0.5, 0.5));
  vec3 base = mix(near, deep, smoothstep(0.05, 0.95, d));

  vec2 g = vUv * uResolution / 1.7;
  g.x *= 0.62;
  float fine = hash21(floor(g) + floor(uTime * 24.0) * vec2(37.0, 17.0));
  base += (fine - 0.5) * 0.020 * uGrain;

  gl_FragColor = vec4(base, 1.0);
}
`;

// -------------------------------------------------------------- SPHÈRES

export const sphereVert = `
attribute vec3 aCenter;
attribute float aRadius;
attribute vec3 aColor;
attribute vec4 aState; // x: présence, y: halo, z: dérivés, w: étiquetée
attribute float aExtinct; // 1 : genre éteint, plus aucun label ne le porte

uniform vec3 uCameraPos;

varying vec2 vUv;
varying vec3 vCenter;
varying float vRadius;
varying vec3 vColor;
varying vec4 vState;
varying float vViewDepth;
varying float vExtinct;

void main() {
  vUv = uv;
  vCenter = aCenter;
  vRadius = aRadius;
  vColor = aColor;
  vState = aState;
  vExtinct = aExtinct;

  vec3 toCam = normalize(uCameraPos - aCenter);
  vec3 seed = abs(toCam.y) > 0.94 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 right = normalize(cross(seed, toCam));
  vec3 up = cross(toCam, right);

  // 1.05 de marge : le liseré a besoin d'un peu de place hors silhouette.
  // Marge élargie : l'anneau indicateur vit hors de la silhouette.
  vec3 world = aCenter + (right * position.x + up * position.y) * (aRadius * 2.66);

  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  vViewDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const sphereFrag = `
precision highp float;

varying vec2 vUv;
varying vec3 vCenter;
varying float vRadius;
varying vec3 vColor;
varying vec4 vState;
varying float vViewDepth;
varying float vExtinct;

uniform vec3 uCameraPos;
uniform vec3 uLightDir;
uniform float uPixelScale;
uniform vec2 uFog;
uniform vec3 uFogColor;

void main() {
  float presence = vState.x;
  if (presence < 0.01) discard;

  vec2 p = (vUv * 2.0 - 1.0) * 1.33;
  float r2 = dot(p, p);
  if (r2 > 1.7689) discard;

  float r = sqrt(r2);

  // Antialiasing exact : la largeur du bord se déduit du monde par pixel à
  // cette profondeur, jamais d'une dérivée.
  float pixelWorld = uPixelScale * vViewDepth;
  float aa = clamp(pixelWorld / max(vRadius, 0.001), 0.004, 0.5);
  float body = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);

  /* Anneau indicateur. Il doit se remarquer quand on le cherche, pas encadrer
     la sphère : trois fois plus fin qu'avant, dans la teinte de la famille et
     non en blanc, et plafonné à 35 pour cent d'opacité. */
  float hasKids = step(0.5, vState.z);
  float ringW = max(aa * 0.9, 0.009);
  float ring = (smoothstep(1.185 - ringW, 1.185, r) - smoothstep(1.212, 1.212 + ringW, r)) * hasKids;

  /* PAPILLOTEMENT DES SPHERES SOUS-PIXEL.

     Les genres sont disposes sur des orbites concentriques, et la
     perspective les resserre vers le centre de chaque famille : ce sont de
     VRAIES spheres, pas un motif procedural. Aucune fonction periodique du
     rayon n'existe dans ce shader, il n'y a donc pas de moire a filtrer.

     Le scintillement vient de l'echantillonnage. Le terme aa est plafonne
     a 0.5 : sous le pixel, une sphere gardait une intensite pleine en son
     centre et apparaissait ou disparaissait selon l'endroit ou le pixel
     tombait, a chaque image, avec la respiration et le moindre mouvement.

     La correction conserve l'ENERGIE plutot que l'intensite : une sphere qui
     couvre un quart de pixel doit peser un quart, de facon stable. C'est
     l'equivalent, pour une geometrie, du filtrage par la derivee qu'on
     applique a un motif procedural, et il ne demande pas fwidth, qui rend
     zero sur le chemin GLSL 1.0 (voir ARCHITECTURE.md, pieges GLSL). */
  float rayonPx = vRadius / max(pixelWorld, 1e-6);
  float couverture = clamp(rayonPx * rayonPx, 0.0, 1.0);

  float alpha = (body + ring * 0.35) * presence * couverture;
  if (alpha < 0.02) discard;

  // Normale analytique du disque : c'est une sphère sans géométrie de sphère.
  float nz = sqrt(max(0.0, 1.0 - min(r2, 1.0)));
  vec3 toCam = normalize(uCameraPos - vCenter);
  vec3 seed = abs(toCam.y) > 0.94 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 right = normalize(cross(seed, toCam));
  vec3 up = cross(toCam, right);
  vec3 n = normalize(right * p.x + up * p.y + toCam * nz);

  // Lambert seul. Aucune spéculaire : pas de chrome, pas de vernis.
  float lambert = 0.30 + 0.70 * max(dot(n, uLightDir), 0.0);
  float rim = pow(1.0 - nz, 3.0);

  /* GENRE ÉTEINT : la sphère est plus MATE et moins lumineuse, discrètement.
     Le liseré lumineux s'éteint presque, la couleur se désature et baisse
     d'un cran : on voit d'un coup d'oeil ce qui vit encore, sans marquage
     brutal. */
  /* Coefficients CALIBRÉS par verify:visual, pas déduits : le liseré réduit
     pèse déjà douze points de luminosité, l'assombrissement direct n'a
     besoin que de quatre pour atteindre -16 % au total, et la désaturation
     réelle à l'écran demande 0.64 de mélange pour mesurer -42 %. */
  float rimAmount = 0.55 * (1.0 - vExtinct * 0.72);
  vec3 col = vColor * lambert + vColor * rim * rimAmount;
  float grey = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, vec3(grey), vExtinct * 0.64);
  col *= 1.0 - vExtinct * 0.04;
  // Anneau dans la teinte, à peine plus clair que le corps.
  col = mix(col, clamp(vColor * 1.15, 0.0, 1.0), clamp(ring, 0.0, 1.0));

  /* Assombrissement local sous le texte. Le label est posé à droite du centre
     de la sphère : quand la sphère est étiquetée, on baisse légèrement sa
     moitié droite pour que le blanc tienne, dans le shader et non par un
     rectangle DOM. */
  float labelled = vState.w;
  col *= mix(1.0, mix(1.0, 0.62, smoothstep(-0.15, 0.75, p.x)), labelled);

  // Halo : il sature, il ne blanchit pas.
  float glow = vState.y;
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 hot = clamp(mix(vec3(lum), col, 2.0), 0.0, 1.0);
  col = mix(col, hot, min(1.0, glow)) * (1.0 + glow * 0.4);

  float fog = smoothstep(uFog.x, uFog.y, vViewDepth);
  col = mix(col, uFogColor, fog * 0.55);

  /* BANDES CONCENTRIQUES. La couleur d'une sphere est un degrade radial,
     lambert et lisere combines. Quantifie sur huit bits, un degrade doux
     produit des paliers visibles, et sur un degrade RADIAL ces paliers sont
     des anneaux concentriques.

     Un bruit ordonne d'un demi-niveau, ajoute avant la sortie, repartit
     l'erreur d'arrondi et fait disparaitre les paliers. C'est la correction
     standard du banding, et elle est ancree sur gl_FragCoord : le motif est
     FIXE a l'ecran, il ne peut donc pas papilloter par lui-meme.

     A NE PAS CONFONDRE avec la cause du scintillement, qui reste a
     etablir : ceci corrige les anneaux, pas leur battement. Le test qui
     tranche est a portee de main sans code : activer la reduction des
     animations du systeme coupe la respiration de 2 % des spheres. Si le
     battement cesse, c'est elle. */
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (dither - 0.5) / 255.0;

  gl_FragColor = vec4(col, alpha);
}
`;

// ---------------------------------------------------------------- LIENS

/* Ruban élargi en espace monde, perpendiculairement à la tangente.
   aMeta.z porte l'avancement du tracé : le lien se dessine du parent vers
   l'enfant, ce qui donne la lecture de propagation.

   COURBES, plus des segments : la disposition fixe se lit de gauche à
   droite, et un lien est un S propre entre la colonne du parent et celle de
   l'enfant. Bézier cubique par instance, deux points de contrôle calculés
   côté CPU au moment de la mise en page. */
export const linkVert = `
attribute float aT;
attribute float aSide;

attribute vec3 aP0;
attribute vec3 aP1;
attribute vec3 aCtrl0;
attribute vec3 aCtrl1;
attribute vec3 aColor0;
attribute vec3 aColor1;
attribute vec3 aMeta; // x: poids, y: présence, z: avancement du tracé

uniform vec3 uCameraPos;
uniform float uPixelScale;
uniform float uMinPixels;
uniform float uWidthWorld;

varying float vT;
varying float vSide;
varying vec3 vColor0;
varying vec3 vColor1;
varying vec3 vMeta;
varying float vHalfPx;
varying float vViewDepth;

void main() {
  vT = aT;
  vSide = aSide;
  vColor0 = aColor0;
  vColor1 = aColor1;
  vMeta = aMeta;

  float t = aT;
  float mt = 1.0 - t;
  vec3 pos = mt * mt * mt * aP0
           + 3.0 * mt * mt * t * aCtrl0
           + 3.0 * mt * t * t * aCtrl1
           + t * t * t * aP1;
  vec3 deriv = 3.0 * mt * mt * (aCtrl0 - aP0)
             + 6.0 * mt * t * (aCtrl1 - aCtrl0)
             + 3.0 * t * t * (aP1 - aCtrl1);

  float len = length(deriv);
  vec3 tangent = len > 1e-5 ? deriv / len : vec3(0.0, 1.0, 0.0);

  vec3 toCam = normalize(uCameraPos - pos);
  vec3 rawSide = cross(tangent, toCam);
  float sideLen = length(rawSide);
  vec3 side = sideLen > 1e-4 ? rawSide / sideLen : vec3(1.0, 0.0, 0.0);

  float viewDepth = -(modelViewMatrix * vec4(pos, 1.0)).z;
  float worldPerPixel = uPixelScale * max(viewDepth, 0.001);

  /* Effilement : le lien est plus épais au départ du parent qu'à l'arrivée sur
     l'enfant. La direction de la filiation se lit sans flèche. */
  float taper = mix(1.0, 0.42, aT);
  float nominal = uWidthWorld * (0.55 + aMeta.x * 0.8) * taper;
  float halfW = max(uMinPixels * worldPerPixel * taper, nominal);
  vHalfPx = halfW / worldPerPixel;

  vec3 world = pos + side * (aSide * halfW);
  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  vViewDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const linkFrag = `
precision highp float;
varying float vT;
varying float vSide;
varying vec3 vColor0;
varying vec3 vColor1;
varying vec3 vMeta;
varying float vHalfPx;
varying float vViewDepth;

uniform vec2 uFog;
uniform vec3 uFogColor;
uniform float uFlowTime;

void main() {
  // Le lien n'existe que jusqu'au front de propagation.
  float reveal = vMeta.z;
  if (vT > reveal) discard;

  // Couverture analytique, jamais fwidth : voir ARCHITECTURE.md, pièges GLSL.
  float edge = clamp((1.0 - abs(vSide)) * vHalfPx, 0.0, 1.0);

  vec3 rgb = mix(vColor0, vColor1, vT);

  // Tête de propagation : un peu plus vive juste derrière le front.
  float head = smoothstep(reveal - 0.18, reveal, vT) * step(vT, reveal);
  rgb *= 0.72 + head * 0.9;

  /* Flux lumineux LENT le long des liens du chemin actif (poids plein) :
     une bande douce qui descend du parent vers l'enfant. Coupé quand
     uFlowTime reste à zéro (prefers-reduced-motion). */
  float onPath = step(0.95, vMeta.x);
  float band = fract(vT - uFlowTime);
  float flow = smoothstep(0.0, 0.12, band) * (1.0 - smoothstep(0.12, 0.3, band));
  rgb *= 1.0 + onPath * flow * 0.55 * step(0.001, uFlowTime);

  float fog = smoothstep(uFog.x, uFog.y, vViewDepth);
  rgb = mix(rgb, uFogColor, fog * 0.55);

  float alpha = edge * (0.5 + vMeta.x * 0.35) * vMeta.y * (1.0 - fog * 0.4);
  if (alpha < 0.004) discard;

  gl_FragColor = vec4(rgb, alpha);
}
`;
