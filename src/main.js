// Farbmalen — Aufbau und Bildschleife.

import { createContext, zeigeHinweis } from './gl/context.js';
import { createBlitter } from './gl/fbo.js';
import { createFluid } from './sim/fluid.js';
import { createPinsel } from './sim/splat.js';
import { createGlitzer } from './sim/glitter.js';
import { createPresenter } from './render/present.js';
import { createZeiger } from './input/pointer.js';
import { createAudio } from './audio/sfx.js';
import { state } from './state.js';
import { PALETTE, hexZuPigment, hslZuPigment } from './palette.js';
import { WERKZEUGE, werkzeugNach, schuetteln } from './tools/index.js';
import { createToolbar, createRegler } from './ui/toolbar.js';
import { createPalette } from './ui/palette.js';
import { createGalerie } from './ui/gallery.js';
import { createFortschritt } from './ui/fortschritt.js';
import { createAbzeichenUI } from './ui/abzeichen.js';
import { FARBE_ABZEICHEN, WASSER_ABZEICHEN } from './abzeichen.js';
import {
  levelVon,
  werkzeugeBisLevel,
  farbenBisLevel,
  einstellungenBisLevel,
  reglerBloeckeBisLevel,
  STUFEN,
} from './fortschritt.js';

state.laden();

const canvas = document.getElementById('wanne');
const { gl, fehler } = createContext(canvas);

if (!gl) {
  zeigeHinweis(fehler);
} else {
  los(gl);
}

function los(gl) {
  const dprGrenze = 2;
  let dpr = 1;

  function kalibriere() {
    // Ein echter Zentimeter auf diesem Bildschirm, gemessen statt geraten.
    const lineal = document.getElementById('cm-ruler').getBoundingClientRect().width;
    state.cssPxProCm = lineal > 4 ? lineal : 37.8;
    state.wanneHoehePx = canvas.clientHeight || 800;
  }

  function passeGroesseAn(fluid) {
    dpr = Math.min(window.devicePixelRatio || 1, dprGrenze);
    const b = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width === b && canvas.height === h) return false;
    canvas.width = b;
    canvas.height = h;
    kalibriere();
    fluid?.resize();
    return true;
  }

  passeGroesseAn(null);
  kalibriere();

  const blit = createBlitter(gl);
  const fluid = createFluid(gl, blit);
  const presenter = createPresenter(gl, blit);
  const glitzer = createGlitzer(gl);
  const pinsel = createPinsel(fluid, state);
  const eingabe = createZeiger(canvas);
  const zeiger = eingabe.zeiger;
  const audio = createAudio(state);
  const galerie = createGalerie();

  let abklatschAusstehend = false;

  // --- Rückmeldungen ---
  // Weiter oben als früher: Level & Freischaltungen (#12) brauchen melde()/blitzen()
  // schon beim Aufbau der Werkzeugleiste/Palette/Regler weiter unten.

  const toast = document.getElementById('toast');
  let toastTimer = 0;
  function melde(text) {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 1600);
  }

  const blitzEl = document.getElementById('blitz');
  function blitzen() {
    blitzEl.hidden = true;
    void blitzEl.offsetWidth; // Animation neu starten
    blitzEl.hidden = false;
    setTimeout(() => { blitzEl.hidden = true; }, 340);
  }

  const aktionen = {
    beiWechsel: () => audio.klick(),
    abklatsch: () => { audio.aufwecken(); abklatschAusstehend = true; },
    galerie: () => (galerie.offen ? galerie.schliessen() : galerie.oeffnen()),
    abzeichen: () => (abzeichenUI.offen ? abzeichenUI.schliessen() : abzeichenUI.oeffnen()),
    neuesBlatt: () => {
      if (!confirm('Alles wegwischen und neu anfangen?')) return;
      fluid.neuesBlatt();
      melde('Frisches Blatt');
    },
    vollbild: () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    },
  };

  // Level & Freischaltungen (#12): Werkzeugleiste/Palette zeigen beim Aufbau nur,
  // was bis zum gespeicherten Level schon freigeschaltet ist — wichtig für
  // wiederkehrende Spielstände, die schon mittendrin stehen.
  const startLevel = levelVon(state.farbPunkteGesamt);

  const toolbar = createToolbar(state, aktionen, werkzeugeBisLevel(startLevel));
  const regler = createRegler(state, aktionen);
  const palette = createPalette(state, aktionen, farbenBisLevel(startLevel));
  for (const name of einstellungenBisLevel(startLevel)) regler.zeigeEinstellung(name);
  for (const id of reglerBloeckeBisLevel(startLevel)) regler.zeigeBlock(id);

  const fortschritt = createFortschritt(state, { melde, blitzen, audio, toolbar, palette, regler });
  // Braucht #r-abzeichen-zeile aus dem Reglerblock — deshalb erst nach createRegler().
  const abzeichenUI = createAbzeichenUI(state, { melde, audio });

  // --- Tastatur ---

  window.addEventListener('keydown', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const taste = ev.key.toLowerCase();

    if (taste === 'escape' && galerie.offen) { galerie.schliessen(); return; }

    const ziffer = Number(ev.key);
    if (Number.isInteger(ziffer) && ziffer >= 1 && ziffer <= WERKZEUGE.length) {
      toolbar.waehleIndex(ziffer - 1);
      ev.preventDefault();
      return;
    }

    if (taste === ' ') {
      audio.aufwecken();
      schuetteln(pinsel);
      audio.schuetteln();
      ev.preventDefault();
    } else if (taste === 'c') {
      aktionen.neuesBlatt();
    } else if (taste === 's') {
      aktionen.abklatsch();
    } else if (taste === 'g') {
      aktionen.galerie();
    } else if (taste === 'f') {
      aktionen.vollbild();
    } else if (taste === 'm') {
      state.ton = !state.ton;
      state.speichern();
      document.getElementById('r-ton')?.setAttribute('aria-pressed', String(state.ton));
      melde(state.ton ? 'Ton an' : 'Ton aus');
    }
  });

  // --- Ein Willkommensbild, damit die Wanne nicht leer dasteht ---

  function willkommen() {
    const farben = [0, 5, 2, 9, 6];
    farben.forEach((f, i) => {
      const w = (i / farben.length) * Math.PI * 2 + 0.4;
      const x = 0.5 + Math.cos(w) * 0.16;
      const y = 0.5 + Math.sin(w) * 0.16;
      fluid.splatDye(x, y, hexZuPigment(PALETTE[f].hex), state.cmToUv(0.9), 1.1);
      fluid.splatRadial(x, y, 2.0 * fluid.velocity.height, state.cmToUv(1.2));
    });
    fluid.splatVortex(0.5, 0.5, 1.2 * fluid.velocity.height, state.cmToUv(4));
  }
  willkommen();

  // --- Bildschleife ---

  const debugEl = document.getElementById('debug');
  const debugAn = new URLSearchParams(location.search).has('debug');
  if (debugAn) {
    debugEl.hidden = false;
    // Innenleben zum Nachmessen und für skriptgesteuerte Tests.
    window.farbmalen = { fluid, pinsel, state, canvas, toolbar, palette, regler, fortschritt, abzeichenUI, galerie, melde };

    // Ein Knopf pro Stufe, um wirklich dorthin zu springen (echte Punkte, echte
    // Freischaltung beim Klick auf "Wohoo!") — ohne dafür wirklich malen zu müssen.
    // Auch per Konsole: farbmalen.fortschritt.testeStufe(3).
    const stufenBox = document.getElementById('debug-stufen');
    stufenBox.hidden = false;
    STUFEN.forEach((stufe, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `Test L${i + 1}`;
      b.title = stufe.titel;
      b.addEventListener('click', () => fortschritt.testeStufe(i + 1));
      stufenBox.appendChild(b);
    });

    // Ein Knopf pro Abzeichen (#11) — setzt den Zähler auf die jeweilige Schwelle,
    // löst Toast/Ton/Anzeige wie im echten Spiel aus. Auch per Konsole:
    // farbmalen.abzeichenUI.testeFarbe(0) / .testeWasser(0).
    const abzeichenBox = document.getElementById('debug-abzeichen');
    abzeichenBox.hidden = false;
    FARBE_ABZEICHEN.forEach((a, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `F${i + 1}`;
      b.title = a.titel;
      b.addEventListener('click', () => abzeichenUI.testeFarbe(i));
      abzeichenBox.appendChild(b);
    });
    WASSER_ABZEICHEN.forEach((a, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `W${i + 1}`;
      b.title = a.titel;
      b.addEventListener('click', () => abzeichenUI.testeWasser(i));
      abzeichenBox.appendChild(b);
    });
  }

  let letzte = performance.now();
  let fpsGlatt = 60;

  // Regenbogen-Modus (#15): dreht sich nur, solange tatsächlich geschüttet wird —
  // ein voller Farbkreis dauert REGENBOGEN_SEKUNDEN Sekunden Dauermalen. Bewusst
  // nicht in `state`: reine Laufzeit-Deko, muss nicht gespeichert werden.
  const REGENBOGEN_SEKUNDEN = 10;
  let regenbogenPhase = 0;

  function frame(jetzt) {
    const roh = (jetzt - letzte) / 1000;
    letzte = jetzt;
    // Nie größere Zeitschritte als 1/60 s — sonst wird die Simulation instabil,
    // etwa wenn der Tab im Hintergrund war.
    const dt = Math.min(Math.max(roh, 1 / 240), 1 / 60);

    passeGroesseAn(fluid);

    eingabe.frameBeginn(dt);

    const werkzeug = werkzeugNach(state.werkzeug);

    let cmy;
    if (state.regenbogenAktiv) {
      if (zeiger.gedrueckt) regenbogenPhase = (regenbogenPhase + dt / REGENBOGEN_SEKUNDEN) % 1;
      cmy = hslZuPigment(regenbogenPhase * 360, 0.85, 0.5);
    } else {
      cmy = hexZuPigment(PALETTE[state.farbe % PALETTE.length].hex);
    }

    const ctx = { pinsel, zeiger, state, audio, cmy };

    if (zeiger.neuGedrueckt) {
      audio.aufwecken();
      werkzeug.onDown?.(ctx);
    }
    werkzeug.tick?.(ctx, dt);
    if (zeiger.losgelassen) werkzeug.onUp?.(ctx);

    // Level & Freischaltungen (#12) und Abzeichen (#11): direkt nach dem Werkzeug-
    // Tick, damit Punkte aus diesem Bild sofort zählen.
    fortschritt.pruefeLevelaufstieg();
    abzeichenUI.pruefeAbzeichen();

    fluid.step(dt, state.naesse);
    if (state.glitzer) glitzer.schritt(fluid.velocity, dt);

    presenter.render(fluid.dye.read, 1.0);
    if (state.glitzer) glitzer.zeichnen(3.2 * dpr);

    // Muss im selben Bild passieren, solange der Zeichenpuffer noch steht.
    if (abklatschAusstehend) {
      abklatschAusstehend = false;
      galerie.abklatschen(canvas);
      blitzen();
      audio.klick();
      melde('Abgeklatscht! Liegt in der Galerie.');
    }

    audio.tick(dt);

    if (debugAn) {
      fpsGlatt += (1 / Math.max(roh, 1e-4) - fpsGlatt) * 0.08;
      debugEl.textContent =
        `${fpsGlatt.toFixed(0)} fps\n` +
        `Wanne  ${canvas.width}×${canvas.height} @${dpr}\n` +
        `Farbe  ${fluid.dye.width}×${fluid.dye.height}\n` +
        `Fluss  ${fluid.velocity.width}×${fluid.velocity.height}\n` +
        `1 cm   ${state.cssPxProCm.toFixed(1)} px`;
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
