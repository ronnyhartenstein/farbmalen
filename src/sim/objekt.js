// Strömungslabyrinth (#9, Phase 0): ein einzelnes Testobjekt, das im Geschwindigkeitsfeld
// mitschwimmt — der "Ein-Partikel-Sonderfall" der Glitzer-Technik (src/sim/glitter.js),
// aber mit fester Identität statt Zufalls-Respawn. Reiner Prototyp zum Prüfen der
// Steuerbarkeit (test/stroemungslabyrinth.html), kein Bestandteil des freien Malens.

import { Program } from '../gl/program.js';
import { createFBO } from '../gl/fbo.js';
import * as S from '../gl/shaders.js';

export function createObjekt(gl, startX = 0.5, startY = 0.5) {
  // vDir wird zusätzlich zur Position per Transform Feedback mitgeschrieben — nur
  // fürs Drehen des Sprites in Bewegungsrichtung (objektDrawVertex/Fragment),
  // ping-ponged genau wie die Position selbst (siehe dirPuffer unten).
  const progSchritt = new Program(gl, S.objektUpdateVertex, S.objektUpdateFragment, ['vPos', 'vDir']);
  const progZeichnen = new Program(gl, S.objektDrawVertex, S.objektDrawFragment);
  const progPosition = new Program(gl, S.objektPositionVertex, S.objektPositionFragment);
  const posZiel = createFBO(gl, 1, 1, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.NEAREST);
  const posPixel = new Uint8Array(4);

  const posPuffer = [gl.createBuffer(), gl.createBuffer()];
  const dirPuffer = [gl.createBuffer(), gl.createBuffer()];
  const vaos = [gl.createVertexArray(), gl.createVertexArray()];

  function fuellen(x, y) {
    const daten = new Float32Array([x, y]);
    for (let i = 0; i < 2; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, posPuffer[i]);
      gl.bufferData(gl.ARRAY_BUFFER, daten, gl.DYNAMIC_COPY);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  fuellen(startX, startY);

  // Startrichtung (0,0) — der Fragment-Shader erkennt das und fällt auf eine feste
  // Ruhe-Ausrichtung zurück, statt durch normalize(0,0) NaN zu erzeugen.
  function fuellenRichtung() {
    const daten = new Float32Array([0, 0]);
    for (let i = 0; i < 2; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, dirPuffer[i]);
      gl.bufferData(gl.ARRAY_BUFFER, daten, gl.DYNAMIC_COPY);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  fuellenRichtung();

  for (let i = 0; i < 2; i++) {
    gl.bindVertexArray(vaos[i]);
    gl.bindBuffer(gl.ARRAY_BUFFER, posPuffer[i]);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ARRAY_BUFFER, dirPuffer[i]);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);
  }
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  const tf = gl.createTransformFeedback();
  let aktuell = 0;

  return {
    // Ein Bild weiter im Geschwindigkeitsfeld treiben lassen — sonst nichts.
    // Ziel-/Kollisionserkennung ist für Phase 0 bewusst ausgeklammert.
    schritt(velocity, dt) {
      gl.enable(gl.RASTERIZER_DISCARD);
      progSchritt.bind();
      gl.uniform1i(progSchritt.u.uVelocity, velocity.read.attach(0));
      gl.uniform2f(progSchritt.u.uTexel, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1f(progSchritt.u.uDt, dt);

      gl.bindVertexArray(vaos[aktuell]);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, posPuffer[1 - aktuell]);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, dirPuffer[1 - aktuell]);
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, 1);
      gl.endTransformFeedback();
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      gl.bindVertexArray(null);
      gl.disable(gl.RASTERIZER_DISCARD);

      aktuell = 1 - aktuell;
    },

    // Direkt auf den Bildschirm, nach dem Anzeigepass. Blending MUSS an sein: ein
    // Punkt-Sprite ist intern immer ein Quadrat, erst der Alpha-Kanal aus dem
    // Fragment-Shader (objektDrawFragment) schneidet die Blatt/Kahn-Form heraus —
    // ohne Blending würde das ganze Quadrat blickdicht eingefärbt.
    zeichnen(groesse) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      progZeichnen.bind();
      gl.uniform1f(progZeichnen.u.uGroesse, groesse);
      gl.bindVertexArray(vaos[aktuell]);
      gl.drawArrays(gl.POINTS, 0, 1);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    },

    // Zurück auf eine feste Position setzen, ohne die Puffer neu anzulegen.
    reset(x = startX, y = startY) {
      fuellen(x, y);
      fuellenRichtung();
      aktuell = 0;
    },

    // Aktuelle Position von der GPU lesen — für Ziel-/Kollisionserkennung. Wie bei
    // src/sim/deckung.js entscheidet die aufrufende Stelle über die Häufigkeit
    // (nicht jedes Bild nötig), hier wird nur der eigentliche Lesevorgang gekapselt.
    position() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, posZiel.fbo);
      gl.viewport(0, 0, 1, 1);
      progPosition.bind();
      gl.bindVertexArray(vaos[aktuell]);
      gl.drawArrays(gl.POINTS, 0, 1);
      gl.bindVertexArray(null);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, posPixel);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { x: posPixel[0] / 255, y: posPixel[1] / 255 };
    },
  };
}
