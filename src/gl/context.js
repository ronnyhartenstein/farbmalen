// WebGL2-Kontext aufsetzen und prüfen, ob dieser Rechner nasse Farbe rechnen kann.

export function createContext(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });

  if (!gl) {
    return {
      gl: null,
      fehler:
        'Dieser Browser kann kein WebGL2. Probier es mal mit einem aktuellen Chrome, Firefox oder Safari — dann fließt die Farbe.',
    };
  }

  // Ohne float-Renderziele gibt es keine Strömung. In WebGL2 heißt das EXT_color_buffer_float,
  // manche Geräte kennen nur die schmalere half-float-Variante.
  const float = gl.getExtension('EXT_color_buffer_float');
  const halfFloat = gl.getExtension('EXT_color_buffer_half_float');

  if (!float && !halfFloat) {
    return {
      gl: null,
      fehler:
        'Die Grafikkarte kann hier keine Fließkomma-Bilder rechnen (EXT_color_buffer_float fehlt). ' +
        'Auf einem anderen Rechner oder Browser sollte es klappen.',
    };
  }

  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);

  return { gl, fehler: null };
}

export function zeigeHinweis(text) {
  const box = document.getElementById('hinweis');
  document.getElementById('hinweis-text').textContent = text;
  box.hidden = false;
  document.getElementById('wanne').hidden = true;
}
