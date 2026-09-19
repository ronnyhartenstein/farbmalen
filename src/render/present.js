// Der letzte Pass: aus Pigment wird Licht, aus Zahlen wird nasses Papier.

import { Program } from '../gl/program.js';
import { baseVertex, displayShader } from '../gl/shaders.js';

export function createPresenter(gl, blit) {
  const anzeige = new Program(gl, baseVertex, displayShader);

  return {
    render(dye, glanz = 1.0) {
      anzeige.bind();
      gl.uniform2f(anzeige.u.uTexel, dye.texelSizeX, dye.texelSizeY);
      gl.uniform1i(anzeige.u.uDye, dye.attach(0));
      gl.uniform1f(anzeige.u.uGlanz, glanz);
      blit(null);
    },
  };
}
