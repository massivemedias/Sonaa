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

  /* LE GRAIN A QUITTE CE SHADER. Il etait la cause mesuree du scintillement :
     cellule de 2,74 px de large sur 1,70 de haut, donc lue en colonnes
     verticales, et regeneree VINGT-QUATRE FOIS PAR SECONDE. Il transparaissait
     a travers les spheres translucides, d'ou un code-barres battant sur les
     petites. Il est desormais rendu en passe separee, apres les spheres et
     sous test de profondeur. Voir grainVert et grainFrag. */
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

  /* PAS DE DITHER ICI, ET C'EST UNE CORRECTION D'UNE ERREUR A MOI.

     J'avais ajoute un bruit ordonne pour casser d'eventuelles bandes de
     quantification, en notant qu'ancre sur gl_FragCoord il « ne peut pas
     papilloter par lui-meme ». C'est vrai d'une image isolee et faux des que
     quelque chose bouge : le motif etant FIXE A L'ECRAN, c'est la sphere qui
     glisse dessous, a chaque respiration de 2 % et au moindre mouvement de
     camera. Au centre, ou la couleur est plate et le lisere absent, ce bruit
     etait le seul relief : d'ou le disque granuleux observe sur les grosses
     spheres, la ou le grain du fond ne pouvait rien expliquer.

     Il corrigeait par ailleurs un defaut jamais constate. Une correction
     speculative qui cree un defaut reel doit partir. */
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

// ---------------------------------------------------------------- GRAIN

/* LE GRAIN, EN PASSE SEPAREE ET APRES LES SPHERES.

   Son role n'a pas change : casser les aplats du fond profond, qu'un degrade
   pur fait bander sur huit bits. Trois choses ont change, et chacune repond a
   une cause mesuree du scintillement.

   ISOTROPE. Le « g.x *= 0.62 » etirait la cellule a 2,74 px de large pour
   1,70 de haut, rapport 1,61 : un bruit plus large que haut se lit en
   colonnes, et c'est le motif de code-barres qui a ete observe. La cellule
   est desormais carree.

   PRESQUE FIXE. Le motif etait regenere vingt-quatre fois par seconde, ce qui
   est une animation, pas un artefact. A deux images par seconde, le grain
   respire sans battre. Le rythme reste lie a uTime, lui-meme fige par
   prefers-reduced-motion, donc la reduction des animations l'immobilise
   completement.

   ABSENT DERRIERE LES OBJETS. Le quad est pose a la profondeur 0.999, juste
   devant le plan lointain : le test de profondeur le rejette partout ou une
   sphere a deja ecrit. Le grain ne peut donc plus transparaitre a travers une
   sphere translucide, ce qui reglait le cas des petites, rendues moins opaques
   par la correction sous-pixel.

   L'amplitude passe de 0,020 a 0,012 : le grain se voit moins et suffit
   toujours a casser un aplat. */
export const grainVert = `
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  // Directement en coordonnees ecran, sans matrices : la profondeur 0.999
  // place le quad au fond, ou seules les zones vides le laissent passer.
  gl_Position = vec4(position.xy * 2.0, 0.999, 1.0);
}
`;

export const grainFrag = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform float uGrain;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec2 g = vUv * uResolution / 1.7;
  /* LE GRAIN EST FIGE, et c'est la correction du scintillement.

     MESURE, sur 3 024 000 pixels, camera immobile, en deroulant la scene
     image par image : grain anime, 2 138 150 pixels changent, soit 71 % de
     l'ecran. Grain eteint, 391. Un facteur 5470.

     J'avais deja ralenti ce grain de 24 images par seconde a 2, croyant
     calmer le battement. C'etait pire : a 24 images il se lisait comme un
     gresillement continu, a 2 il devient un CLIGNOTEMENT, l'ecran entier
     basculant deux fois par seconde.

     Un grain n'a aucune raison d'etre anime. Son role est de casser les
     aplats du fond profond, qu'un degrade sur huit bits fait bander : une
     texture fixe le fait aussi bien, et ne bouge pas. */
  float fine = hash21(floor(g));
  // Additif et positif : il eclaircit legerement plutot que d'osciller,
  // ce qui suffit a rompre un aplat sans creer de trous sombres.
  gl_FragColor = vec4(vec3(fine * 0.012 * uGrain), 1.0);
}
`;
