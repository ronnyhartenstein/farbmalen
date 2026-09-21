// Strömungslabyrinth (#9): eigener Modus mit Levelauswahl und mehreren Levels
// (Phase 4 aus dem Plan) — eigene, zweite Fluidsimulation nach dem Vorbild von
// src/ui/tintenwaechter.js.
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
import { LEVEL, amZiel } from '../labyrinth.js';

const WERKZEUGE = { ruehrer, pusten, schaber };
const SCHABER_FAKTOR = 0.4;

// Zielerreichung nicht jedes Bild neu messen — der Lesevorgang ist zwar winzig
// (1×1-readPixels, siehe src/sim/objekt.js), aber trotzdem unnötig oft.
const MESS_ALLE_N_BILDER = 6;

export function createStroemungslabyrinth(gl, blit, presenter, zeiger, state, { audio } = {}) {
  const overlay = document.getElementById('labyrinth');
  const auswahlScreen = document.getElementById('lab-auswahl');
  const hud = document.getElementById('lab-hud');
  const endeScreen = document.getElementById('lab-ende');
  const levelListe = document.getElementById('lab-level-liste');
  const markerSchicht = document.getElementById('lab-marker-schicht');
  const timerEl = document.getElementById('lab-timer');
  const endeZeit = document.getElementById('lab-ende-zeit');
  const werkzeugKnoepfe = {
    ruehrer: document.getElementById('lab-ruehrer'),
    pusten: document.getElementById('lab-pusten'),
    schaber: document.getElementById('lab-schaber'),
  };

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
  const objekt = createObjekt(gl, 0.5, 0.5);

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

  let aktiv = false; // Overlay überhaupt offen (Auswahl/HUD/Ende)
  let laeuft = false; // eine Runde läuft gerade
  let levelIndex = 0;
  let zeit = 0;
  let bildZaehler = 0;
  let zonenMarker = []; // { el, radiusCm } — für Größenupdate bei resize()

  function formatZeit(sek) {
    return `${sek.toFixed(1)}s`;
  }

  function bestzeit(level) {
    return state.labyrinthBestzeiten?.[level.id] ?? 0;
  }

  function zeigeScreen(name) {
    auswahlScreen.hidden = name !== 'auswahl';
    hud.hidden = name !== 'hud';
    endeScreen.hidden = name !== 'ende';
  }

  function baueLevelListe() {
    levelListe.innerHTML = '';
    LEVEL.forEach((level, i) => {
      const bz = bestzeit(level);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'knopf knopf-breit lab-level-knopf';
      b.innerHTML = `<span>${level.name}</span><span class="lab-level-bestzeit">${bz ? formatZeit(bz) : '–'}</span>`;
      b.addEventListener('click', () => neueRunde(i));
      levelListe.appendChild(b);
    });
  }

  // Ein Marker-Element anlegen und in die Marker-Schicht hängen. Anders als in
  // Phase 1/2 (feste Start-/Ziel-/Hindernispunkte) müssen die Marker jetzt pro
  // Level neu gebaut werden, weil sich Anzahl und Position ändern.
  function neuerMarker(klasse, punkt, label) {
    const el = document.createElement('div');
    el.className = `lab-marker ${klasse}`;
    el.dataset.label = label;
    el.style.left = `${punkt.x * 100}%`;
    el.style.top = `${(1 - punkt.y) * 100}%`;
    markerSchicht.appendChild(el);
    return el;
  }

  // Zonen-Durchmesser in echten cm (wie jede Werkzeuggröße im Projekt) — rein zur
  // Anzeige, die Abstoßung selbst nutzt state.cmToUv() direkt in tick(). cssPxProCm
  // ist bereits "wie viele CSS-Pixel sind 1 cm", also reicht das ohne Umweg über
  // die Bildschirmhöhe.
  function skaliereZone(el, radiusCm) {
    const durchmesser = 2 * radiusCm * state.cssPxProCm;
    el.style.width = `${durchmesser}px`;
    el.style.height = `${durchmesser}px`;
    el.style.marginLeft = `${-durchmesser / 2}px`;
    el.style.marginTop = `${-durchmesser / 2}px`;
  }

  function skaliereMarker() {
    for (const { el, radiusCm } of zonenMarker) skaliereZone(el, radiusCm);
  }

  function baueMarker(level) {
    markerSchicht.innerHTML = '';
    zonenMarker = [];
    neuerMarker('lab-marker-start', level.start, 'Start');
    neuerMarker('lab-marker-ziel', level.ziel, 'Ziel');
    for (const h of level.hindernisse) {
      zonenMarker.push({ el: neuerMarker('lab-marker-hindernis', h, 'Hindernis'), radiusCm: h.radiusCm });
    }
    for (const z of level.meidenZonen) {
      zonenMarker.push({ el: neuerMarker('lab-marker-meiden', z, 'Meiden'), radiusCm: z.radiusCm });
    }
    skaliereMarker();
  }

  function betreten() {
    aktiv = true;
    overlay.hidden = false;
    for (const el of freieChrome) if (el) el.hidden = true;
    baueLevelListe();
    zeigeScreen('auswahl');
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

  function neueRunde(index) {
    levelIndex = index;
    const level = LEVEL[levelIndex];
    labFluid.neuesBlatt();
    objekt.reset(level.start.x, level.start.y);
    baueMarker(level);
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
    const level = LEVEL[levelIndex];
    const alteBestzeit = bestzeit(level);
    const neuerRekord = !alteBestzeit || zeit < alteBestzeit;
    if (neuerRekord) {
      state.labyrinthBestzeiten = { ...state.labyrinthBestzeiten, [level.id]: zeit };
      state.speichern();
      audio?.levelAuf?.();
    } else {
      audio?.klick?.();
    }
    endeZeit.textContent =
      `${level.name} geschafft in ${formatZeit(zeit)}.` + (neuerRekord ? ' Neue Bestzeit!' : '');
    zeigeScreen('ende');
  }

  for (const [name, knopf] of Object.entries(werkzeugKnoepfe)) {
    knopf?.addEventListener('click', () => waehleWerkzeug(name));
  }
  document.getElementById('lab-nochmal')?.addEventListener('click', () => neueRunde(levelIndex));
  document.getElementById('lab-andere-level')?.addEventListener('click', () => {
    baueLevelListe();
    zeigeScreen('auswahl');
  });
  document.getElementById('lab-verlassen-auswahl')?.addEventListener('click', verlassen);
  document.getElementById('lab-verlassen-ende')?.addEventListener('click', verlassen);
  document.getElementById('lab-aufhoeren')?.addEventListener('click', verlassen);

  // Läuft jedes Bild, auch wenn der Modus gar nicht aktiv ist — no-op dank der
  // Wächter oben, spart main.js eine eigene Fallunterscheidung.
  function tick(dt) {
    if (!laeuft) return;
    zeit += dt;

    // Hindernisse und Meiden-Zonen als weiche, dauerhafte Radial-Abstoßung statt
    // einer harten Solver-Wand (Phase 2 im Plan) — läuft unabhängig davon, welches
    // Werkzeug gerade gedrückt ist, wie die Tinten-Quellen bei Tintenwächter.
    const level = LEVEL[levelIndex];
    for (const h of level.hindernisse) basisPinsel.radial(h.x, h.y, h.staerke * dt, h.radiusCm);
    for (const z of level.meidenZonen) basisPinsel.radial(z.x, z.y, z.staerke * dt, z.radiusCm);

    if (zeiger.gedrueckt) {
      const ctx = { pinsel: labPinsel, zeiger, state: labState, audio };
      WERKZEUGE[werkzeugName].tick?.(ctx, dt);
    }

    labFluid.step(dt, 0);
    objekt.schritt(labFluid.velocity, dt);

    bildZaehler++;
    if (bildZaehler % MESS_ALLE_N_BILDER === 0) {
      const p = objekt.position();
      if (amZiel(level, p.x, p.y)) beenden();
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
    resize: () => {
      labFluid.resize();
      skaliereMarker();
    },
    get aktiv() {
      return aktiv;
    },
    get laeuft() {
      return laeuft;
    },
  };
}
