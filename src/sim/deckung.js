// Flächenabdeckung messen (#10) — klein rendern statt groß lesen.
//
// Ein `readPixels` auf dem vollen Dye-Bild würde die Pipeline abwürgen (siehe
// Kommentar in src/sim/glitter.js). Stattdessen rendert der Deckungsshader jedes
// Bild in ein winziges Renderziel (BREITE×HOEHE), das gelesen wird — bei 24×18 sind
// das 1728 Byte statt mehrerer Megabyte.
//
// Bewusst RGBA8/UNSIGNED_BYTE statt eines Float-Renderziels: readPixels auf
// UNSIGNED_BYTE ist überall garantiert lesbar, dieselbe Technik wie in jeder
// test/*.html-Seite dieses Projekts. Für eine 0/1-Mittelung über ein 4×4-Raster
// reicht die Präzision bequem.

import { Program } from '../gl/program.js';
import { createFBO } from '../gl/fbo.js';
import { baseVertex, deckungsShader } from '../gl/shaders.js';

const BREITE = 24;
const HOEHE = 18;

// Dye-Dicke (Alpha), ab der ein Texel als "mit Tinte bedeckt" zählt.
const SCHWELLE = 0.12;

export function createDeckungsMesser(gl, blit) {
  const prog = new Program(gl, baseVertex, deckungsShader);
  const ziel = createFBO(gl, BREITE, HOEHE, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.NEAREST);
  const puffer = new Uint8Array(BREITE * HOEHE * 4);

  // Liefert die Deckung als Zahl 0..1.
  return function messeDeckung(dyeFeld) {
    prog.bind();
    gl.uniform2f(prog.u.uTexel, ziel.texelSizeX, ziel.texelSizeY);
    gl.uniform1i(prog.u.uDye, dyeFeld.attach(0));
    gl.uniform1f(prog.u.uSchwelle, SCHWELLE);
    blit(ziel);

    gl.bindFramebuffer(gl.FRAMEBUFFER, ziel.fbo);
    gl.readPixels(0, 0, BREITE, HOEHE, gl.RGBA, gl.UNSIGNED_BYTE, puffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    let summe = 0;
    for (let i = 0; i < BREITE * HOEHE; i++) summe += puffer[i * 4];
    return summe / (BREITE * HOEHE * 255);
  };
}
