// Randabfluss (Tintenwächter, #10): gibt Schaber eine echte Wirkung.
//
// Die freie Maltoy spiegelt Farbe an den Wänden zurück (siehe Kommentar beim
// advectionShader) — richtig fürs freie Bild, aber dadurch kann in dieser zweiten,
// unabhängigen Simulation nichts, was dorthin gedrängt wird, je verschwinden.
// Dieser Pass schreibt direkt in dasselbe Dye-Doppel-FBO wie fluid.step() und tauscht
// danach genauso — kein Zugriff auf fluid.js nötig, dye.swap() ist bereits Teil des
// von createFluid() zurückgegebenen dye-Objekts.

import { Program } from '../gl/program.js';
import { baseVertex, abflussShader } from '../gl/shaders.js';

export function createRandAbfluss(gl, blit) {
  const prog = new Program(gl, baseVertex, abflussShader);

  return function wende(dyeFeld, randbreite, staerke) {
    prog.bind();
    gl.uniform2f(prog.u.uTexel, dyeFeld.texelSizeX, dyeFeld.texelSizeY);
    gl.uniform1i(prog.u.uTarget, dyeFeld.read.attach(0));
    gl.uniform1f(prog.u.uRandbreite, randbreite);
    gl.uniform1f(prog.u.uStaerke, staerke);
    blit(dyeFeld.write);
    dyeFeld.swap();
  };
}
