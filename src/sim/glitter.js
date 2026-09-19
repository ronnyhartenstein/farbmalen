// Glitzer — Partikel, die im Geschwindigkeitsfeld mitschwimmen.
//
// Die Positionen werden per Transform Feedback auf der GPU fortgeschrieben: Der
// Vertex-Shader liest die Strömung und schreibt die neue Position direkt zurück in
// den Puffer. Wichtig ist, was hier NICHT passiert — kein readPixels pro Bild.
// Ein einziger Rückweg von der GPU würde die Pipeline jedes Frame anhalten.

import { Program } from '../gl/program.js';
import * as S from '../gl/shaders.js';

const ANZAHL = 2200;

export function createGlitzer(gl) {
  const progSchritt = new Program(gl, S.glitterUpdateVertex, S.glitterUpdateFragment, ['vPos']);
  const progZeichnen = new Program(gl, S.glitterDrawVertex, S.glitterDrawFragment);

  const positionen = new Float32Array(ANZAHL * 2);
  const saaten = new Float32Array(ANZAHL * 2);
  for (let i = 0; i < ANZAHL; i++) {
    positionen[i * 2] = Math.random();
    positionen[i * 2 + 1] = Math.random();
    saaten[i * 2] = Math.random();
    saaten[i * 2 + 1] = Math.random();
  }

  const saatPuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, saatPuffer);
  gl.bufferData(gl.ARRAY_BUFFER, saaten, gl.STATIC_DRAW);

  // Zwei Positionspuffer im Wechsel: aus dem einen lesen, in den anderen schreiben.
  const posPuffer = [gl.createBuffer(), gl.createBuffer()];
  const vaos = [gl.createVertexArray(), gl.createVertexArray()];

  for (let i = 0; i < 2; i++) {
    gl.bindBuffer(gl.ARRAY_BUFFER, posPuffer[i]);
    gl.bufferData(gl.ARRAY_BUFFER, positionen, gl.DYNAMIC_COPY);

    gl.bindVertexArray(vaos[i]);
    gl.bindBuffer(gl.ARRAY_BUFFER, posPuffer[i]);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ARRAY_BUFFER, saatPuffer);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);
  }
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  const tf = gl.createTransformFeedback();
  let aktuell = 0;
  let zeit = 0;

  return {
    schritt(velocity, dt) {
      zeit += dt;

      gl.enable(gl.RASTERIZER_DISCARD);
      progSchritt.bind();
      gl.uniform1i(progSchritt.u.uVelocity, velocity.read.attach(0));
      gl.uniform2f(progSchritt.u.uTexel, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1f(progSchritt.u.uDt, dt);
      gl.uniform1f(progSchritt.u.uZeit, zeit);

      gl.bindVertexArray(vaos[aktuell]);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, posPuffer[1 - aktuell]);
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, ANZAHL);
      gl.endTransformFeedback();
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      gl.bindVertexArray(null);
      gl.disable(gl.RASTERIZER_DISCARD);

      aktuell = 1 - aktuell;
    },

    // Kommt nach dem Anzeigepass, additiv direkt auf den Bildschirm.
    zeichnen(groesse) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);

      progZeichnen.bind();
      gl.uniform1f(progZeichnen.u.uGroesse, groesse);
      gl.uniform1f(progZeichnen.u.uZeit, zeit);
      gl.bindVertexArray(vaos[aktuell]);
      gl.drawArrays(gl.POINTS, 0, ANZAHL);
      gl.bindVertexArray(null);

      gl.disable(gl.BLEND);
    },
  };
}
