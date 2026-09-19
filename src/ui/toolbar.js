// Werkzeugleiste links und Reglerblock rechts oben.
// Beides aus dem Datenmodell erzeugt, damit ein neues Werkzeug nur in tools/index.js
// eingetragen werden muss und hier nichts anzupassen ist.

import { WERKZEUGE } from '../tools/index.js';

const SPIEGELSTUFEN = [1, 2, 4, 6];

export function createToolbar(state, aktionen) {
  const leiste = document.getElementById('werkzeuge');
  const hinweis = document.getElementById('werkzeughinweis');
  const knoepfe = new Map();

  WERKZEUGE.forEach((w, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'werkzeug';
    b.setAttribute('aria-pressed', 'false');
    b.title = `${w.name} (Taste ${i + 1})`;
    b.innerHTML =
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ` +
      `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${w.icon}</svg>` +
      `<span>${w.name}</span>`;
    b.addEventListener('click', () => waehle(w.id));
    leiste.appendChild(b);
    knoepfe.set(w.id, b);
  });

  function waehle(id) {
    const w = WERKZEUGE.find((x) => x.id === id);
    if (!w) return;
    state.werkzeug = id;
    for (const [k, b] of knoepfe) b.setAttribute('aria-pressed', String(k === id));
    hinweis.textContent = w.hinweis;
    aktionen.beiWechsel?.();
  }

  function waehleIndex(i) {
    if (WERKZEUGE[i]) waehle(WERKZEUGE[i].id);
  }

  waehle(state.werkzeug);
  return { waehle, waehleIndex };
}

export function createRegler(state, aktionen) {
  const box = document.getElementById('regler');

  box.innerHTML = `
    <p class="regler-titel">Spiegel</p>
    <div class="knopfreihe" id="r-spiegel"></div>

    <p class="regler-titel">Nässe</p>
    <input id="r-naesse" type="range" min="0" max="100" step="1" aria-label="Nässe">

    <div class="knopfreihe">
      <button id="r-glitzer" class="knopf" type="button" aria-pressed="false">Glitzer</button>
      <button id="r-ton" class="knopf" type="button" aria-pressed="true">Ton</button>
    </div>

    <button id="r-abklatsch" class="knopf knopf-breit" type="button">Papier auflegen</button>
    <button id="r-galerie" class="knopf knopf-breit" type="button">Galerie</button>
    <button id="r-neu" class="knopf knopf-breit" type="button">Neues Blatt</button>
    <button id="r-vollbild" class="knopf knopf-breit" type="button">Vollbild</button>
  `;

  const spiegelBox = box.querySelector('#r-spiegel');
  const spiegelKnoepfe = SPIEGELSTUFEN.map((n) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'knopf';
    b.textContent = n === 1 ? 'aus' : String(n);
    b.title = n === 1 ? 'Ohne Spiegelung' : `${n}-fach gespiegelt`;
    b.addEventListener('click', () => setzeSpiegel(n));
    spiegelBox.appendChild(b);
    return { n, b };
  });

  function setzeSpiegel(n) {
    state.symmetrie = n;
    state.speichern();
    for (const s of spiegelKnoepfe) s.b.setAttribute('aria-pressed', String(s.n === n));
    aktionen.beiWechsel?.();
  }

  const naesse = box.querySelector('#r-naesse');
  naesse.addEventListener('input', () => {
    // Regler ist gefühlt linear, die Diffusion darunter wächst quadratisch.
    const t = Number(naesse.value) / 100;
    state.naesse = 0.02 + t * t * 0.55;
    state.speichern();
  });

  const glitzer = box.querySelector('#r-glitzer');
  glitzer.addEventListener('click', () => {
    state.glitzer = !state.glitzer;
    glitzer.setAttribute('aria-pressed', String(state.glitzer));
    state.speichern();
    aktionen.beiWechsel?.();
  });

  const ton = box.querySelector('#r-ton');
  ton.addEventListener('click', () => {
    state.ton = !state.ton;
    ton.setAttribute('aria-pressed', String(state.ton));
    state.speichern();
    if (state.ton) aktionen.beiWechsel?.();
  });

  box.querySelector('#r-abklatsch').addEventListener('click', () => aktionen.abklatsch?.());
  box.querySelector('#r-galerie').addEventListener('click', () => aktionen.galerie?.());
  box.querySelector('#r-neu').addEventListener('click', () => aktionen.neuesBlatt?.());
  box.querySelector('#r-vollbild').addEventListener('click', () => aktionen.vollbild?.());

  // Anfangszustand aus dem gespeicherten state spiegeln.
  setzeSpiegel(state.symmetrie);
  naesse.value = String(Math.round(Math.sqrt(Math.max(state.naesse - 0.02, 0) / 0.55) * 100));
  glitzer.setAttribute('aria-pressed', String(state.glitzer));
  ton.setAttribute('aria-pressed', String(state.ton));

  return { setzeSpiegel };
}
