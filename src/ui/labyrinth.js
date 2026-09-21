// Strömungslabyrinth (#9): eigener Modus, noch ohne Hindernisse (Phase 1 aus dem
// Plan) — prüft, ob sich das Steuerungsgefühl aus dem Phase-0-Prototyp
// (test/stroemungslabyrinth.html) im echten Frame-Loop/Overlay hält, mit einer
// eigenen, zweiten Fluidsimulation nach dem Vorbild von src/ui/tintenwaechter.js.
//
// Rührer und Pusten (src/tools/ruehrer.js, src/tools/pusten.js) werden unverändert
// wiederverwendet. Schaber (src/tools/schaber.js) ebenfalls, aber mit einem
// Grundfaktor gedämpft — Befund aus der Phase-0-Testrunde: funktioniert, ist im
// Vergleich zu Rührer/Pusten aber deutlich zu stark. Nicht in schaber.js selbst
// geändert, damit freies Malen und Tintenwächter unangetastet bleiben.

import { createFluid } from '../sim/fluid.js';
import { createPinsel } from '../sim/splat.js';
import { createObjekt } from '../sim/objekt.js';
import { ruehrer } from '../tools/ruehrer.js';
import { pusten } from '../tools/pusten.js';
import { schaber } from '../tools/schaber.js';
import { START, ZIEL, amZiel } from '../labyrinth.js';

const WERKZEUGE = { ruehrer, pusten, schaber };
const SCHABER_FAKTOR = 0.4;

// Zielerreichung nicht jedes Bild neu messen — der Lesevorgang ist zwar winzig
// (1×1-readPixels, siehe src/sim/objekt.js), aber trotzdem unnötig oft.
const MESS_ALLE_N_BILDER = 6;

export function createStroemungslabyrinth(gl, blit, presenter, zeiger, state, { audio } = {}) {
  const overlay = document.getElementById('labyrinth');
  const startScreen = document.getElementById('lab-start');
  const hud = document.getElementById('lab-hud');
  const endeScreen = document.getElementById('lab-ende');
  const timerEl = document.getElementById('lab-timer');
  const endeZeit = document.getElementById('lab-ende-zeit');
  const werkzeugKnoepfe = {
    ruehrer: document.getElementById('lab-ruehrer'),
    pusten: document.getElementById('lab-pusten'),
    schaber: document.getElementById('lab-schaber'),
  };

  // Start-/Zielmarker sind reine Deko (siehe style.css) — feste Position, solange
  // es noch kein Levelformat gibt (Phase 4 im Plan).
  function setzeMarker(id, punkt) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.left = `${punkt.x * 100}%`;
    el.style.top = `${(1 - punkt.y) * 100}%`;
  }
  setzeMarker('lab-marker-start', START);
  setzeMarker('lab-marker-ziel', ZIEL);

  // Die freie Werkzeugleiste/Palette/Regler bleiben sonst sichtbar und klickbar
  // unter dem HUD — analog src/ui/tintenwaechter.js.
  const freieChrome = [
    document.getElementById('werkzeuge'),
    document.getElementById('regler'),
    document.querySelector('.unten'),
  ];

  // Eigene, zweite Fluidsimulation — bleibt über mehrere Runden bestehen (nur
  // fluid.neuesBlatt() bei jedem Neustart).
  const labFluid = createFluid(gl, blit);
  const labState = { symmetrie: 1, cmToUv: (cm) => state.cmToUv(cm) };
  const basisPinsel = createPinsel(labFluid, labState);
  const objekt = createObjekt(gl, START.x, START.y);

  // Schaber-Dämpfung sitzt hier im Pinselkopf, nicht im Werkzeug selbst — siehe
  // Modul-Kommentar oben.
  let werkzeugName = 'ruehrer';
  const labPinsel = {
    farbe: (...a) => basisPinsel.farbe(...a),
    wasser: (...a) => basisPinsel.wasser(...a),
    schub: (x, y, dx, dy, kraft, r) =>
      basisPinsel.schub(x, y, dx, dy, kraft * (werkzeugName === 'schaber' ? SCHABER_FAKTOR : 1), r),
    radial: (x, y, staerke, r) =>
      basisPinsel.radial(x, y, staerke * (werkzeugName === 'schaber' ? SCHABER_FAKTOR : 1), r),
    wirbel: (x, y, staerke, r) =>
      basisPinsel.wirbel(x, y, staerke * (werkzeugName === 'schaber' ? SCHABER_FAKTOR : 1), r),
  };

  let aktiv = false; // Overlay überhaupt offen (Start/HUD/Ende)
  let laeuft = false; // eine Runde läuft gerade
  let zeit = 0;
  let bildZaehler = 0;

  function formatZeit(sek) {
    return `${sek.toFixed(1)}s`;
  }

  function zeigeScreen(name) {
    startScreen.hidden = name !== 'start';
    hud.hidden = name !== 'hud';
    endeScreen.hidden = name !== 'ende';
  }

  function betreten() {
    aktiv = true;
    overlay.hidden = false;
    for (const el of freieChrome) if (el) el.hidden = true;
    zeigeScreen('start');
  }

  function verlassen() {
    aktiv = false;
    laeuft = false;
    overlay.hidden = true;
    for (const el of freieChrome) if (el) el.hidden = false;
  }

  function waehleWerkzeug(name) {
    werkzeugName = name;
    for (const [id, b] of Object.entries(werkzeugKnoepfe)) {
      b?.setAttribute('aria-pressed', String(id === name));
    }
  }

  function neueRunde() {
    labFluid.neuesBlatt();
    objekt.reset(START.x, START.y);
    zeit = 0;
    bildZaehler = 0;
    waehleWerkzeug('ruehrer');
    timerEl.textContent = formatZeit(zeit);
    laeuft = true;
    zeigeScreen('hud');
    audio?.aufwecken?.();
  }

  function beenden() {
    laeuft = false;
    endeZeit.textContent = `Geschafft in ${formatZeit(zeit)}.`;
    audio?.levelAuf?.();
    zeigeScreen('ende');
  }

  for (const [name, knopf] of Object.entries(werkzeugKnoepfe)) {
    knopf?.addEventListener('click', () => waehleWerkzeug(name));
  }
  document.getElementById('lab-los')?.addEventListener('click', neueRunde);
  document.getElementById('lab-nochmal')?.addEventListener('click', neueRunde);
  document.getElementById('lab-verlassen-start')?.addEventListener('click', verlassen);
  document.getElementById('lab-verlassen-ende')?.addEventListener('click', verlassen);
  document.getElementById('lab-aufhoeren')?.addEventListener('click', verlassen);

  // Läuft jedes Bild, auch wenn der Modus gar nicht aktiv ist — no-op dank der
  // Wächter oben, spart main.js eine eigene Fallunterscheidung.
  function tick(dt) {
    if (!laeuft) return;
    zeit += dt;

    if (zeiger.gedrueckt) {
      const ctx = { pinsel: labPinsel, zeiger, state: labState, audio };
      WERKZEUGE[werkzeugName].tick?.(ctx, dt);
    }

    labFluid.step(dt, 0);
    objekt.schritt(labFluid.velocity, dt);

    bildZaehler++;
    if (bildZaehler % MESS_ALLE_N_BILDER === 0) {
      const p = objekt.position();
      if (amZiel(p.x, p.y)) beenden();
    }

    timerEl.textContent = formatZeit(zeit);
  }

  function render() {
    if (!laeuft) return;
    presenter.render(labFluid.dye.read, 1.0);
    // gl_PointSize ist in physischen Pixeln — auf Retina sonst halb so groß wie
    // gedacht (dieselbe Überlegung wie beim dpr-Faktor für glitzer.zeichnen() in
    // main.js, hier lokal statt durchgereicht, da dprGrenze=2 dort nicht exportiert wird).
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    objekt.zeichnen(28 * dpr);
  }

  return {
    betreten,
    tick,
    render,
    resize: () => labFluid.resize(),
    get aktiv() {
      return aktiv;
    },
    get laeuft() {
      return laeuft;
    },
  };
}
