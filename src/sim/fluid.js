// Die Strömungssimulation (Stable Fluids nach Jos Stam) auf der GPU.
//
// Zwei Felder tragen alles: `velocity` (wohin fließt es) und `dye` (welches Pigment liegt wo).
// Werkzeuge schreiben ausschließlich in diese beiden Felder. Deshalb funktioniert jedes
// Werkzeug automatisch mit jeder Farbe und mit jedem anderen Werkzeug zusammen.

import { Program } from '../gl/program.js';
import { createFBO, createDoubleFBO, clearFBO } from '../gl/fbo.js';
import * as S from '../gl/shaders.js';

const SIM_RES = 256;   // Auflösung der Strömung
const DYE_RES = 1024;  // Auflösung der Farbe (darf feiner sein, das sieht man)

const JACOBI = 24;
const DRUCK_DAEMPFUNG = 0.8;
const VELOCITY_DISSIPATION = 0.28;
const CURL_STAERKE = 22.0;

function aufloesung(gl, basis) {
  let seite = gl.drawingBufferWidth / gl.drawingBufferHeight;
  if (seite < 1) seite = 1 / seite;
  const klein = Math.round(basis);
  const gross = Math.round(basis * seite);
  return gl.drawingBufferWidth > gl.drawingBufferHeight
    ? { width: gross, height: klein }
    : { width: klein, height: gross };
}

export function createFluid(gl, blit) {
  const p = {
    copy: new Program(gl, S.baseVertex, S.copyShader),
    clear: new Program(gl, S.baseVertex, S.clearShader),
    splatDye: new Program(gl, S.baseVertex, S.splatDyeShader),
    splatWater: new Program(gl, S.baseVertex, S.splatWaterShader),
    splatVelocity: new Program(gl, S.baseVertex, S.splatVelocityShader),
    splatRadial: new Program(gl, S.baseVertex, S.splatRadialShader),
    splatVortex: new Program(gl, S.baseVertex, S.splatVortexShader),
    advection: new Program(gl, S.baseVertex, S.advectionShader),
    divergence: new Program(gl, S.baseVertex, S.divergenceShader),
    curl: new Program(gl, S.baseVertex, S.curlShader),
    vorticity: new Program(gl, S.baseVertex, S.vorticityShader),
    pressure: new Program(gl, S.baseVertex, S.pressureShader),
    gradient: new Program(gl, S.baseVertex, S.gradientSubtractShader),
    diffuse: new Program(gl, S.baseVertex, S.diffuseShader),
    maccormack: new Program(gl, S.baseVertex, S.maccormackShader),
  };

  let dye, velocity, pressure, divergence, curl;
  // Zwischenablagen für den Hin- und Rückweg der MacCormack-Korrektur.
  let dyeVor, dyeZurueck;

  function felderAnlegen() {
    const sim = aufloesung(gl, SIM_RES);
    const farbe = aufloesung(gl, DYE_RES);
    const L = gl.LINEAR;
    const N = gl.NEAREST;

    const altesDye = dye;
    const alteHilfe = [dyeVor, dyeZurueck].filter(Boolean);

    dye = createDoubleFBO(gl, farbe.width, farbe.height, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, L);
    velocity = createDoubleFBO(gl, sim.width, sim.height, gl.RG16F, gl.RG, gl.HALF_FLOAT, L);
    pressure = createDoubleFBO(gl, sim.width, sim.height, gl.R16F, gl.RED, gl.HALF_FLOAT, N);
    divergence = createFBO(gl, sim.width, sim.height, gl.R16F, gl.RED, gl.HALF_FLOAT, N);
    curl = createFBO(gl, sim.width, sim.height, gl.R16F, gl.RED, gl.HALF_FLOAT, N);
    dyeVor = createFBO(gl, farbe.width, farbe.height, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, L);
    dyeZurueck = createFBO(gl, farbe.width, farbe.height, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, L);

    // Beim Fenstergrößenändern das gemalte Bild mitnehmen.
    if (altesDye) {
      p.copy.bind();
      gl.uniform2f(p.copy.u.uTexel, dye.texelSizeX, dye.texelSizeY);
      gl.uniform1i(p.copy.u.uTexture, altesDye.read.attach(0));
      blit(dye.write);
      dye.swap();
      gl.deleteTexture(altesDye.read.texture);
      gl.deleteTexture(altesDye.write.texture);
      gl.deleteFramebuffer(altesDye.read.fbo);
      gl.deleteFramebuffer(altesDye.write.fbo);
    }
    for (const h of alteHilfe) {
      gl.deleteTexture(h.texture);
      gl.deleteFramebuffer(h.fbo);
    }
  }

  felderAnlegen();

  function step(dt, wetness) {
    gl.disable(gl.BLEND);

    // 1. Wirbel am Leben halten
    p.curl.bind();
    gl.uniform2f(p.curl.u.uTexel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(p.curl.u.uVelocity, velocity.read.attach(0));
    blit(curl);

    p.vorticity.bind();
    gl.uniform2f(p.vorticity.u.uTexel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(p.vorticity.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(p.vorticity.u.uCurl, curl.attach(1));
    gl.uniform1f(p.vorticity.u.uCurlStaerke, CURL_STAERKE);
    gl.uniform1f(p.vorticity.u.uDt, dt);
    blit(velocity.write);
    velocity.swap();

    // 2. Strömung inkompressibel machen
    p.divergence.bind();
    gl.uniform2f(p.divergence.u.uTexel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(p.divergence.u.uVelocity, velocity.read.attach(0));
    blit(divergence);

    p.clear.bind();
    gl.uniform2f(p.clear.u.uTexel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(p.clear.u.uTexture, pressure.read.attach(0));
    gl.uniform1f(p.clear.u.uValue, DRUCK_DAEMPFUNG);
    blit(pressure.write);
    pressure.swap();

    p.pressure.bind();
    gl.uniform2f(p.pressure.u.uTexel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(p.pressure.u.uDivergence, divergence.attach(0));
    for (let i = 0; i < JACOBI; i++) {
      gl.uniform1i(p.pressure.u.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    p.gradient.bind();
    gl.uniform2f(p.gradient.u.uTexel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(p.gradient.u.uPressure, pressure.read.attach(0));
    gl.uniform1i(p.gradient.u.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    // 3. Transport — erst die Strömung selbst, dann die Farbe darin
    p.advection.bind();
    gl.uniform2f(p.advection.u.uTexel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1f(p.advection.u.uDt, dt);

    const v = velocity.read.attach(0);
    gl.uniform1i(p.advection.u.uVelocity, v);
    gl.uniform1i(p.advection.u.uSource, v);
    gl.uniform1f(p.advection.u.uDissipation, VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    // Farbe per MacCormack transportieren: hin, zurück, Fehler abziehen.
    gl.uniform1f(p.advection.u.uDissipation, 0.0);
    gl.uniform1i(p.advection.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(p.advection.u.uSource, dye.read.attach(1));
    blit(dyeVor);

    gl.uniform1f(p.advection.u.uDt, -dt);
    gl.uniform1i(p.advection.u.uSource, dyeVor.attach(1));
    blit(dyeZurueck);
    gl.uniform1f(p.advection.u.uDt, dt);

    p.maccormack.bind();
    gl.uniform2f(p.maccormack.u.uTexel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform2f(p.maccormack.u.uQuellTexel, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1f(p.maccormack.u.uDt, dt);
    gl.uniform1i(p.maccormack.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(p.maccormack.u.uSource, dye.read.attach(1));
    gl.uniform1i(p.maccormack.u.uVor, dyeVor.attach(2));
    gl.uniform1i(p.maccormack.u.uZurueck, dyeZurueck.attach(3));
    blit(dye.write);
    dye.swap();

    // 4. Das eigentliche Zerlaufen
    if (wetness > 0.0001) {
      p.diffuse.bind();
      gl.uniform2f(p.diffuse.u.uTexel, dye.texelSizeX, dye.texelSizeY);
      gl.uniform1i(p.diffuse.u.uTexture, dye.read.attach(0));
      gl.uniform1f(p.diffuse.u.uAmount, Math.min(wetness * dt * 60.0, 1.0));
      blit(dye.write);
      dye.swap();
    }
  }

  // --- Werkzeug-Schnittstelle: alle Größen in uv, Radius in Einheiten der Bildhöhe ---

  function splatDye(x, y, cmy, radius, amount) {
    p.splatDye.bind();
    gl.uniform2f(p.splatDye.u.uTexel, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(p.splatDye.u.uTarget, dye.read.attach(0));
    gl.uniform1f(p.splatDye.u.uAspect, dye.width / dye.height);
    gl.uniform2f(p.splatDye.u.uPoint, x, y);
    gl.uniform3f(p.splatDye.u.uColor, cmy[0], cmy[1], cmy[2]);
    gl.uniform1f(p.splatDye.u.uRadius, radius);
    gl.uniform1f(p.splatDye.u.uAmount, amount);
    blit(dye.write);
    dye.swap();
  }

  function splatWater(x, y, radius, amount) {
    p.splatWater.bind();
    gl.uniform2f(p.splatWater.u.uTexel, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(p.splatWater.u.uTarget, dye.read.attach(0));
    gl.uniform1f(p.splatWater.u.uAspect, dye.width / dye.height);
    gl.uniform2f(p.splatWater.u.uPoint, x, y);
    gl.uniform1f(p.splatWater.u.uRadius, radius);
    gl.uniform1f(p.splatWater.u.uAmount, Math.min(amount, 1.0));
    blit(dye.write);
    dye.swap();
  }

  function splatVelocity(x, y, fx, fy, radius) {
    p.splatVelocity.bind();
    gl.uniform2f(p.splatVelocity.u.uTexel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(p.splatVelocity.u.uTarget, velocity.read.attach(0));
    gl.uniform1f(p.splatVelocity.u.uAspect, velocity.width / velocity.height);
    gl.uniform2f(p.splatVelocity.u.uPoint, x, y);
    gl.uniform2f(p.splatVelocity.u.uForce, fx, fy);
    gl.uniform1f(p.splatVelocity.u.uRadius, radius * radius);
    blit(velocity.write);
    velocity.swap();
  }

  function splatRadial(x, y, staerke, radius) {
    p.splatRadial.bind();
    gl.uniform2f(p.splatRadial.u.uTexel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(p.splatRadial.u.uTarget, velocity.read.attach(0));
    gl.uniform1f(p.splatRadial.u.uAspect, velocity.width / velocity.height);
    gl.uniform2f(p.splatRadial.u.uPoint, x, y);
    gl.uniform1f(p.splatRadial.u.uStrength, staerke);
    gl.uniform1f(p.splatRadial.u.uRadius, radius * radius);
    blit(velocity.write);
    velocity.swap();
  }

  function splatVortex(x, y, staerke, radius) {
    p.splatVortex.bind();
    gl.uniform2f(p.splatVortex.u.uTexel, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(p.splatVortex.u.uTarget, velocity.read.attach(0));
    gl.uniform1f(p.splatVortex.u.uAspect, velocity.width / velocity.height);
    gl.uniform2f(p.splatVortex.u.uPoint, x, y);
    gl.uniform1f(p.splatVortex.u.uStrength, staerke);
    gl.uniform1f(p.splatVortex.u.uRadius, radius * radius);
    blit(velocity.write);
    velocity.swap();
  }

  function neuesBlatt() {
    clearFBO(gl, dye.read);
    clearFBO(gl, dye.write);
    clearFBO(gl, velocity.read);
    clearFBO(gl, velocity.write);
    clearFBO(gl, pressure.read);
    clearFBO(gl, pressure.write);
  }

  return {
    step,
    splatDye,
    splatWater,
    splatVelocity,
    splatRadial,
    splatVortex,
    neuesBlatt,
    resize: felderAnlegen,
    get dye() { return dye; },
    get velocity() { return velocity; },
    get aspect() { return dye.width / dye.height; },
  };
}
