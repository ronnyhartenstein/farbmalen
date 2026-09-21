// Alle GLSL-Quellen an einem Ort.
//
// Farbmodell: Das Farbfeld speichert KEIN RGB, sondern optische Dichte. Pigment addiert
// sich, und erst beim Anzeigen wird per Beer-Lambert (rgb = exp(-dichte)) daraus wieder
// Licht. Dadurch ergibt Cyan + Gelb echtes Grün statt trübem Grau — so wie im Tuschkasten
// und nicht wie bei zwei Taschenlampen.

export const baseVertex = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 uTexel;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(uTexel.x, 0.0);
  vR = vUv + vec2(uTexel.x, 0.0);
  vT = vUv + vec2(0.0, uTexel.y);
  vB = vUv - vec2(0.0, uTexel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const kopf = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
`;

export const copyShader = kopf + `
uniform sampler2D uTexture;
void main() {
  fragColor = texture(uTexture, vUv);
}`;

// Druckfeld pro Frame leicht dämpfen — hält den Jacobi-Löser ruhig.
export const clearShader = kopf + `
uniform sampler2D uTexture;
uniform float uValue;
void main() {
  fragColor = uValue * texture(uTexture, vUv);
}`;

// Farbklecks: flacher Teller mit weichem Rand, damit "1 cm" auch wirklich 1 cm misst.
export const splatDyeShader = kopf + `
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;
uniform float uAmount;

// Deckel für die Dichte. Begrenzt wird der VEKTOR, nicht jeder Kanal für sich —
// sonst würde satt aufgetragenes Gelb langsam ins Orange kippen, weil sein
// schwächster Kanal früher anschlägt als die anderen.
const float DECKEL = 4.5;

void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  float f = 1.0 - smoothstep(uRadius * 0.55, uRadius, length(p));
  vec4 basis = texture(uTarget, vUv);
  vec3 pigment = basis.rgb + f * uAmount * uColor;
  float spitze = max(max(pigment.r, pigment.g), pigment.b);
  pigment *= min(1.0, DECKEL / max(spitze, 1e-4));
  float dicke = basis.a + f * uAmount;
  fragColor = vec4(pigment, min(dicke, 2.6));
}`;

// Wasser / Verdünner: zieht Pigment heraus statt welches hinzuzufügen.
export const splatWaterShader = kopf + `
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec2 uPoint;
uniform float uRadius;
uniform float uAmount;
void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  float f = 1.0 - smoothstep(uRadius * 0.55, uRadius, length(p));
  fragColor = texture(uTarget, vUv) * (1.0 - f * uAmount);
}`;

// Gerichteter Schub (Pinsel, Schaber, Rechen).
export const splatVelocityShader = kopf + `
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec2 uPoint;
uniform vec2 uForce;
uniform float uRadius;
void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  float f = exp(-dot(p, p) / uRadius);
  fragColor = vec4(texture(uTarget, vUv).xy + f * uForce, 0.0, 1.0);
}`;

// Radialer Schub nach außen (Gießen, Pusten, Seife) oder nach innen (negatives uStrength).
export const splatRadialShader = kopf + `
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec2 uPoint;
uniform float uRadius;
uniform float uStrength;
void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  float d2 = dot(p, p);
  float f = exp(-d2 / uRadius);
  vec2 richtung = p * inversesqrt(max(d2, 1e-9));
  fragColor = vec4(texture(uTarget, vUv).xy + richtung * uStrength * f, 0.0, 1.0);
}`;

// Wirbel um einen Punkt (Rührer): tangential statt radial.
export const splatVortexShader = kopf + `
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec2 uPoint;
uniform float uRadius;
uniform float uStrength;
void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  float d2 = dot(p, p);
  float f = exp(-d2 / uRadius);
  vec2 tangente = vec2(-p.y, p.x) * inversesqrt(max(d2, 1e-9));
  tangente.x /= uAspect;
  fragColor = vec4(texture(uTarget, vUv).xy + tangente * uStrength * f, 0.0, 1.0);
}`;

// Semi-Lagrange-Transport: schau nach, wo dieses Teilchen vorhin herkam.
export const advectionShader = kopf + `
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uDt;
uniform float uDissipation;
void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexel;
  fragColor = texture(uSource, coord) / (1.0 + uDissipation * uDt);
}`;

// MacCormack-Korrektur für den Farbtransport.
//
// Einfaches Semi-Lagrange-Advektieren verwischt bei jedem Schritt ein bisschen. Nach ein
// paar Sekunden Rühren ist aus kräftiger Farbe pastellfarbener Nebel geworden — genau das,
// was ein Marmorierbild kaputt macht. Hier wird deshalb einmal vorwärts und einmal zurück
// transportiert; die Differenz zum Ausgangswert ist der Fehler, und der wird abgezogen.
// Das `clamp` auf die vier Nachbarn am Rückverfolgungspunkt verhindert, dass die Korrektur
// über das Ziel hinausschießt und Ränder überschwingen.
export const maccormackShader = kopf + `
uniform sampler2D uVelocity;
uniform sampler2D uSource;    // Ausgangszustand
uniform sampler2D uVor;       // einmal vorwärts transportiert
uniform sampler2D uZurueck;   // davon wieder zurück transportiert
uniform vec2 uTexel;       // Strömungsgitter — legt die Rückverfolgung fest
uniform vec2 uQuellTexel;  // Farbgitter — legt die vier Nachbarn fest
uniform float uDt;
void main() {
  vec4 phi   = texture(uSource, vUv);
  vec4 hut   = texture(uVor, vUv);
  vec4 tilde = texture(uZurueck, vUv);
  vec4 wert  = hut + 0.5 * (phi - tilde);

  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexel;
  vec2 st = coord / uQuellTexel - 0.5;
  vec2 basis = (floor(st) + 0.5) * uQuellTexel;
  vec4 a = texture(uSource, basis);
  vec4 b = texture(uSource, basis + vec2(uQuellTexel.x, 0.0));
  vec4 c = texture(uSource, basis + vec2(0.0, uQuellTexel.y));
  vec4 d = texture(uSource, basis + uQuellTexel);

  fragColor = clamp(wert, min(min(a, b), min(c, d)), max(max(a, b), max(c, d)));
}`;

export const divergenceShader = kopf + `
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  // Freie Wände: an den Rändern spiegeln, damit die Farbe in der Wanne bleibt.
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  fragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

export const curlShader = kopf + `
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  fragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

// Vorticity Confinement: hält kleine Wirbel am Leben. Ohne das wird alles nach
// zehn Sekunden zu gleichmäßigem Matsch — das hier ist, was Marmorierung hübsch macht.
export const vorticityShader = kopf + `
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uCurlStaerke;
uniform float uDt;
void main() {
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  vec2 kraft = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  kraft /= length(kraft) + 1e-4;
  kraft *= uCurlStaerke * C;
  kraft.y *= -1.0;
  vec2 v = texture(uVelocity, vUv).xy + kraft * uDt;
  fragColor = vec4(clamp(v, -900.0, 900.0), 0.0, 1.0);
}`;

export const pressureShader = kopf + `
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float div = texture(uDivergence, vUv).x;
  fragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}`;

export const gradientSubtractShader = kopf + `
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  vec2 v = texture(uVelocity, vUv).xy - vec2(R - L, T - B);
  fragColor = vec4(v, 0.0, 1.0);
}`;

// Das langsame Zerlaufen: ein winziger Gauß-Kern, pro Frame ein kleines bisschen.
export const diffuseShader = kopf + `
uniform sampler2D uTexture;
uniform vec2 uTexel;
uniform float uAmount;
void main() {
  vec4 mitte = texture(uTexture, vUv);
  vec4 kanten = texture(uTexture, vL) + texture(uTexture, vR)
              + texture(uTexture, vT) + texture(uTexture, vB);
  vec4 ecken = texture(uTexture, vUv + vec2(-uTexel.x, -uTexel.y))
             + texture(uTexture, vUv + vec2( uTexel.x, -uTexel.y))
             + texture(uTexture, vUv + vec2(-uTexel.x,  uTexel.y))
             + texture(uTexture, vUv + vec2( uTexel.x,  uTexel.y));
  vec4 weich = mitte * 0.25 + kanten * 0.125 + ecken * 0.0625;
  fragColor = mix(mitte, weich, uAmount);
}`;

// Anzeige: Pigment wird zu Licht, Papier drunter, nasser Glanz drauf.
export const displayShader = kopf + `
uniform sampler2D uDye;
uniform vec2 uTexel;
uniform float uGlanz;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec4 d = texture(uDye, vUv);

  // Beer-Lambert: mehr Pigment = tiefere Farbe, niemals außerhalb von [0,1].
  vec3 farbe = exp(-d.rgb);

  // Papier: feines Korn plus ein Hauch Faserstruktur.
  vec2 korn = floor(gl_FragCoord.xy * 0.75);
  float rauschen = hash(korn) * 0.045 + hash(korn * 0.31 + 4.7) * 0.03;
  vec3 papier = vec3(0.981, 0.971, 0.949) - 0.04 + rauschen;
  farbe *= papier;

  // Nasser Glanz: Normale aus dem Gefälle der Farbdicke.
  float hl = texture(uDye, vL).a;
  float hr = texture(uDye, vR).a;
  float ht = texture(uDye, vT).a;
  float hb = texture(uDye, vB).a;
  vec3 n = normalize(vec3((hl - hr) * 2.2, (hb - ht) * 2.2, 0.22));
  vec3 licht = normalize(vec3(-0.45, 0.55, 0.72));
  vec3 halb = normalize(licht + vec3(0.0, 0.0, 1.0));
  float nass = smoothstep(0.04, 0.45, d.a);
  float glanz = pow(max(dot(n, halb), 0.0), 38.0) * nass * uGlanz;

  // Randabsetzung wie bei echter Aquarellfarbe: wo die Dicke stark abfällt, wird es dunkler.
  float gefaelle = length(vec2(hr - hl, ht - hb));
  farbe *= 1.0 - clamp(gefaelle * 1.1, 0.0, 0.22) * nass;

  farbe += glanz;

  // Sanfte Vignette, damit die Wanne wie eine Wanne wirkt.
  float r = length((vUv - 0.5) * vec2(1.0, 1.0));
  farbe *= 1.0 - 0.22 * pow(clamp(r * 1.35, 0.0, 1.0), 3.0);

  fragColor = vec4(farbe, 1.0);
}`;

// Glitzer: Partikel, die per Transform Feedback im Geschwindigkeitsfeld mitschwimmen.
export const glitterUpdateVertex = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec2 aSeed;
uniform sampler2D uVelocity;
uniform vec2 uTexel;
uniform float uDt;
uniform float uZeit;
out vec2 vPos;
out vec2 vSeed;

void main() {
  vec2 v = texture(uVelocity, aPos).xy;
  vec2 p = aPos + v * uTexel * uDt;

  // Wer stehenbleibt, wird irgendwann neu gewürfelt — sonst verklumpt alles in den Ecken.
  float leben = fract(aSeed.y + uZeit * 0.035);
  if (leben < 0.006 || p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) {
    p = fract(vec2(aSeed.x * 7.13 + uZeit * 0.37, aSeed.y * 3.71 + uZeit * 0.29));
  }

  vPos = clamp(p, vec2(0.0), vec2(1.0));
  vSeed = aSeed;
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}`;

export const glitterUpdateFragment = `#version 300 es
precision highp float;
out vec4 fragColor;
void main() { fragColor = vec4(0.0); }`;

export const glitterDrawVertex = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec2 aSeed;
uniform float uGroesse;
uniform float uZeit;
out float vFunkeln;
void main() {
  gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = uGroesse * (0.6 + aSeed.x * 0.8);
  vFunkeln = 0.45 + 0.55 * sin(uZeit * 5.0 + aSeed.y * 43.0);
}`;

export const glitterDrawFragment = `#version 300 es
precision highp float;
in float vFunkeln;
out vec4 fragColor;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = length(p);
  // Sternchen statt Punkt: runder Kern plus vier Strahlen.
  float kern = smoothstep(0.55, 0.0, d);
  float strahl = smoothstep(0.75, 0.0, abs(p.x) * 6.0 + d) + smoothstep(0.75, 0.0, abs(p.y) * 6.0 + d);
  float a = clamp(kern + strahl * 0.5, 0.0, 1.0) * vFunkeln;
  fragColor = vec4(vec3(1.0, 0.96, 0.82) * a, a);
}`;

// Strömungslabyrinth (#9, Phase 0): wie Glitzer, aber ein einzelnes Partikel mit
// fester Identität statt Zufalls-Respawn — Prototyp, um zu prüfen, ob sich ein
// Objekt im Geschwindigkeitsfeld zielgenau steuern lässt (test/stroemungslabyrinth.html).
export const objektUpdateVertex = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec2 aDir;
uniform sampler2D uVelocity;
uniform vec2 uTexel;
uniform float uDt;
out vec2 vPos;
out vec2 vDir;

// Wie schnell sich die sichtbare Ausrichtung höchstens drehen darf (Radiant/s).
// Ohne Begrenzung dreht sich das Blatt bei kleiner Strömung hektisch hin und
// her: die Wirbeldämpfung (vorticity confinement, CURL_STAERKE in fluid.js)
// hält überall leichte Mini-Wirbel am Leben, deren Richtung ständig etwas
// zittert — normalize() verstärkt jedes Zittern zu vollem Winkel-Jitter.
// Erste Schätzung (180°-Drehung in ~2.5s), kein gemessener Wert.
const float MAX_WINKEL_PRO_S = 1.25;
const float PI = 3.14159265;

void main() {
  vec2 v = texture(uVelocity, aPos).xy;
  vec2 p = aPos + v * uTexel * uDt;
  vPos = clamp(p, vec2(0.0), vec2(1.0));

  // aDir ist die zuletzt gezeichnete (bereits geglättete) Ausrichtung — der
  // Winkel dreht sich davon aus höchstens um MAX_WINKEL_PRO_S * dt in Richtung
  // der aktuellen Strömung, nie in einem Sprung.
  vec2 ziel = length(v) > 1e-8 ? normalize(v) : aDir;
  vec2 bisher = length(aDir) > 1e-8 ? normalize(aDir) : ziel;
  float winkelZiel = atan(ziel.y, ziel.x);
  float winkelBisher = atan(bisher.y, bisher.x);
  float delta = mod(winkelZiel - winkelBisher + PI, 2.0 * PI) - PI;
  float maxSchritt = MAX_WINKEL_PRO_S * uDt;
  delta = clamp(delta, -maxSchritt, maxSchritt);
  float neuerWinkel = winkelBisher + delta;
  vDir = vec2(cos(neuerWinkel), sin(neuerWinkel));

  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}`;

export const objektUpdateFragment = `#version 300 es
precision highp float;
out vec4 fragColor;
void main() { fragColor = vec4(0.0); }`;

export const objektDrawVertex = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec2 aDir;
uniform float uGroesse;
out vec2 vDir;
void main() {
  gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = uGroesse;
  vDir = aDir;
}`;

// Politur (#9, Phase 5): Eichenblatt-Silhouette statt Platzhalter-Kreis (siehe Idee
// in #9: "Ein Blatt/Kahn schwimmt im Geschwindigkeitsfeld"). Spindelform (schmal an
// der Basis, spitz an der Spitze), deren Breite sinusförmig moduliert wird — das
// ergibt die charakteristischen, gerundeten Lappen und Buchten am Rand — plus ein
// kurzer Stiel an der Basis und eine dunklere Mittelrippe. Dreht sich mit der
// Strömungsrichtung (vDir aus objektUpdateVertex) statt eine feste Ausrichtung zu
// behalten — die Blattspitze zeigt dadurch in Bewegungsrichtung.
export const objektDrawFragment = `#version 300 es
precision highp float;
in vec2 vDir;
out vec4 fragColor;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float aa = 0.05;

  // vDir kommt aus dem Geschwindigkeitsfeld (uv-Konvention: +y = Bildschirm-oben).
  // gl_PointCoord hat dagegen fest +y = Bildschirm-unten (WebGL-Punkt-Sprite-
  // Konvention, nicht änderbar) — deshalb hier y gespiegelt, sonst zeigt die
  // Spitze verkehrt herum. Ohne Bewegung (Strömung ~0) bleibt die ursprüngliche,
  // feste Ausrichtung als Ruhezustand erhalten.
  vec2 auf = dot(vDir, vDir) > 1e-6 ? normalize(vec2(vDir.x, -vDir.y)) : vec2(0.0, 1.0);
  vec2 seitlich = vec2(-auf.y, auf.x);
  vec2 lokal = vec2(dot(p, seitlich), dot(p, auf));

  // t läuft von 0 (Blattbasis) bis 1 (Blattspitze); darunter (lokal.y < blattStart)
  // sitzt der Stiel.
  float blattStart = -0.62;
  float t = clamp((lokal.y - blattStart) / (1.0 - blattStart), 0.0, 1.0);
  float lappenfaktor = 1.0 + 0.32 * sin(t * 6.0 * 3.14159265);
  float breite = 0.6 * sin(t * 3.14159265) * lappenfaktor;
  float blattForm = abs(lokal.x) - breite;
  float blattKern = clamp(0.5 - blattForm / aa, 0.0, 1.0) * step(blattStart, lokal.y);

  float stielBreite = 0.055;
  float stielForm = max(abs(lokal.x) - stielBreite, lokal.y - (blattStart + 0.05));
  float stielKern = clamp(0.5 - stielForm / aa, 0.0, 1.0);

  float kern = max(blattKern, stielKern);

  float rippenbreite = 0.045;
  float rippenForm = abs(lokal.x) - rippenbreite;
  float rippenKern = clamp(0.5 - rippenForm / aa, 0.0, 1.0) * blattKern;

  vec3 blattfarbe = vec3(0.86, 0.62, 0.22);
  vec3 stielfarbe = vec3(0.5, 0.32, 0.1);
  vec3 farbe = mix(blattfarbe, stielfarbe, max(rippenKern, stielKern));
  fragColor = vec4(farbe, kern);
}`;

// Strömungslabyrinth (#9, Phase 1): Objektposition auslesen, ohne die Pipeline
// abzuwürgen — wie bei der Deckungsmessung unten wird in ein winziges 1×1-
// RGBA8-Renderziel gerendert (uv-Position kodiert in R/G) statt eine Float-Textur
// zu lesen (siehe Begründung in src/sim/deckung.js).
export const objektPositionVertex = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vPos;
void main() {
  vPos = aPos;
  gl_PointSize = 1.0;
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}`;

export const objektPositionFragment = `#version 300 es
precision highp float;
in vec2 vPos;
out vec4 fragColor;
void main() { fragColor = vec4(vPos, 0.0, 1.0); }`;

// Tintenwächter (#10): Flächenabdeckung messen, ohne die Pipeline abzuwürgen. Statt
// das volle Dye-Bild zu lesen, wird hier klein gerendert (winziges Renderziel, siehe
// src/sim/deckung.js) — jeder Ausgabetexel mittelt ein RASTER×RASTER-Raster aus der
// Dye-Dicke (Alpha) seiner Zielfläche zu einem 0/1-Anteil "mit Tinte bedeckt".
export const deckungsShader = kopf + `
uniform sampler2D uDye;
uniform vec2 uTexel;
uniform float uSchwelle;
void main() {
  const int RASTER = 4;
  float summe = 0.0;
  for (int y = 0; y < RASTER; y++) {
    for (int x = 0; x < RASTER; x++) {
      vec2 versatz = (vec2(float(x), float(y)) + 0.5) / float(RASTER) - 0.5;
      float dicke = texture(uDye, vUv + versatz * uTexel).a;
      summe += dicke > uSchwelle ? 1.0 : 0.0;
    }
  }
  float anteil = summe / float(RASTER * RASTER);
  fragColor = vec4(anteil, anteil, anteil, 1.0);
}`;

// Randabfluss (Tintenwächter, #10): Die freien Wände oben (advectionShader-Kommentar
// "an den Rändern spiegeln, damit die Farbe in der Wanne bleibt") halten in der freien
// Maltoy zu Recht jede Farbe fest — Schaber verschiebt Tinte dadurch aber nur, statt sie
// je verschwinden zu lassen. Damit "wegschieben" hier eine echte Wirkung hat, rinnt
// Tinte, die nah genug an den Rand gedrängt wurde, dort ab: derselbe Verdünnungstrick
// wie im Wasser-Shader (ganzer Vektor multipliziert, nicht nur die Dicke), aber über
// einen schmalen Randstreifen statt eines Punkts.
export const abflussShader = kopf + `
uniform sampler2D uTarget;
uniform float uRandbreite;
uniform float uStaerke;
void main() {
  vec2 d = min(vUv, 1.0 - vUv);
  float naehe = 1.0 - smoothstep(0.0, uRandbreite, min(d.x, d.y));
  fragColor = texture(uTarget, vUv) * (1.0 - naehe * uStaerke);
}`;
