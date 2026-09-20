// Strömungslabyrinth (#9, Phase 0): ein einzelnes Testobjekt, das im Geschwindigkeitsfeld
// mitschwimmt — der "Ein-Partikel-Sonderfall" der Glitzer-Technik (src/sim/glitter.js),
// aber mit fester Identität statt Zufalls-Respawn. Reiner Prototyp zum Prüfen der
// Steuerbarkeit (test/stroemungslabyrinth.html), kein Bestandteil des freien Malens.

import { Program } from '../gl/program.js';
import * as S from '../gl/shaders.js';

export function createObjekt(gl, startX = 0.5, startY = 0.5) {
  const progSchritt = new Program(gl, S.objektUpdateVertex, S.objektUpdateFragment, ['vPos']);
  const progZeichnen = new Program(gl, S.objektDrawVertex, S.objektDrawFragment);

  const posPuffer = [gl.createBuffer(), gl.createBuffer()];
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

  for (let i = 0; i < 2; i++) {
    gl.bindVertexArray(vaos[i]);
    gl.bindBuffer(gl.ARRAY_BUFFER, posPuffer[i]);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
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
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, 1);
      gl.endTransformFeedback();
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      gl.bindVertexArray(null);
      gl.disable(gl.RASTERIZER_DISCARD);

      aktuell = 1 - aktuell;
    },

    // Direkt additiv auf den Bildschirm, nach dem Anzeigepass.
    zeichnen(groesse) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      progZeichnen.bind();
      gl.uniform1f(progZeichnen.u.uGroesse, groesse);
      gl.bindVertexArray(vaos[aktuell]);
      gl.drawArrays(gl.POINTS, 0, 1);
      gl.bindVertexArray(null);
    },

    // Zurück auf eine feste Position setzen, ohne die Puffer neu anzulegen.
    reset(x = startX, y = startY) {
      fuellen(x, y);
      aktuell = 0;
    },
  };
}
