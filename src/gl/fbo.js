// Renderziele (Texturen mit Framebuffer) plus der Vollbild-Blit, der jeden Pass zeichnet.

export function createBlitter(gl) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  const index = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

  gl.bindVertexArray(null);

  return function blit(ziel) {
    if (ziel == null) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, ziel.fbo);
      gl.viewport(0, 0, ziel.width, ziel.height);
    }
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  };
}

export function createFBO(gl, width, height, internalFormat, format, type, filter) {
  gl.activeTexture(gl.TEXTURE0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return {
    texture,
    fbo,
    width,
    height,
    texelSizeX: 1 / width,
    texelSizeY: 1 / height,
    attach(einheit) {
      gl.activeTexture(gl.TEXTURE0 + einheit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return einheit;
    },
  };
}

// Zwei Texturen im Wechsel: aus `read` lesen, nach `write` schreiben, dann tauschen.
export function createDoubleFBO(gl, width, height, internalFormat, format, type, filter) {
  return {
    read: createFBO(gl, width, height, internalFormat, format, type, filter),
    write: createFBO(gl, width, height, internalFormat, format, type, filter),
    width,
    height,
    texelSizeX: 1 / width,
    texelSizeY: 1 / height,
    swap() {
      const tmp = this.read;
      this.read = this.write;
      this.write = tmp;
    },
  };
}

export function clearFBO(gl, ziel) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, ziel.fbo);
  gl.viewport(0, 0, ziel.width, ziel.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
