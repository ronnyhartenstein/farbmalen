// Shader übersetzen, linken und Uniform-Positionen einmalig merken.

function compile(gl, type, quelle) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, quelle);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    console.error(log, quelle);
    throw new Error('Shader lässt sich nicht übersetzen: ' + log);
  }
  return shader;
}

export class Program {
  // tfVaryings: Namen der Vertex-Ausgaben, die per Transform Feedback zurück in
  // einen Puffer geschrieben werden sollen (für die Glitzerpartikel).
  constructor(gl, vertexQuelle, fragmentQuelle, tfVaryings = null) {
    this.gl = gl;
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexQuelle));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentQuelle));
    if (tfVaryings) {
      gl.transformFeedbackVaryings(program, tfVaryings, gl.SEPARATE_ATTRIBS);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Shader-Programm lässt sich nicht linken: ' + gl.getProgramInfoLog(program));
    }
    this.program = program;

    this.u = {};
    const anzahl = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < anzahl; i++) {
      const name = gl.getActiveUniform(program, i).name.replace(/\[0\]$/, '');
      this.u[name] = gl.getUniformLocation(program, name);
    }
  }

  bind() {
    this.gl.useProgram(this.program);
    return this;
  }
}
