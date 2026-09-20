// Tintenwächter (#10): eigener Arcade-Modus mit echtem Zeitdruck, losgelöst vom
// Level-System. Eigene, zweite Fluidsimulation (siehe Begründung in src/tintenwaechter.js
// bzw. dem Plan) — das freie Bild bleibt beim Ein-/Aussteigen unangetastet.
//
// Wasser und Schaber (src/tools/wasser.js, src/tools/schaber.js) werden unverändert
// wiederverwendet — ihre tick()-Funktionen brauchen nur ctx.pinsel/ctx.zeiger/
// ctx.state.cmToUv, keine Zeile Tool-Code musste dafür angefasst werden.

import { createFluid } from '../sim/fluid.js';
import { createPinsel } from '../sim/splat.js';
import { createDeckungsMesser } from '../sim/deckung.js';
import { createRandAbfluss } from '../sim/abfluss.js';
import { hexZuPigment } from '../palette.js';
import { wasser } from '../tools/wasser.js';
import { schaber } from '../tools/schaber.js';
import {
  TINTE_HEX,
  RADIUS_CM,
  staerke,
  SCHUB_STAERKE,
  WETNESS,
  VERLUST_SCHWELLE,
  WARN_SCHWELLE,
  RAND_BREITE,
  RAND_ABFLUSS_PRO_S,
  aktiveQuellen,
  schwierigkeitspegel,
} from '../tintenwaechter.js';

// Deckung nicht jedes Bild neu messen — der Downsample-Pass ist zwar winzig, aber
// jedes Bild ist trotzdem unnötig oft.
const MESS_ALLE_N_BILDER = 10;

export function createTintenwaechter(gl, blit, presenter, zeiger, state, { audio }) {
  const overlay = document.getElementById('tintenwaechter');
  const startScreen = document.getElementById('tw-start');
  const hud = document.getElementById('tw-hud');
  const endeScreen = document.getElementById('tw-ende');
  const bestzeitStart = document.getElementById('tw-bestzeit-start');
  const timerEl = document.getElementById('tw-timer');
  const pegelEl = document.getElementById('tw-pegel');
  const deckungFuellung = document.getElementById('tw-deckung-fuellung');
  const endeZeit = document.getElementById('tw-ende-zeit');
  const endeRekord = document.getElementById('tw-ende-rekord');
  const wasserKnopf = document.getElementById('tw-wasser');
  const schaberKnopf = document.getElementById('tw-schaber');

  // Die freie Werkzeugleiste/Palette/Regler bleiben sonst sichtbar und klickbar
  // unter dem HUD (das selbst keinen deckenden Hintergrund hat) — während
  // Tintenwächter aktiv ist, haben sie hier nichts verloren.
  const freieChrome = [
    document.getElementById('werkzeuge'),
    document.getElementById('regler'),
    document.querySelector('.unten'),
  ];

  const tintePigment = hexZuPigment(TINTE_HEX);

  // Eigene, zweite Fluidsimulation — bleibt über mehrere Runden bestehen (nur
  // fluid.neuesBlatt() bei jedem Neustart), keine neuen Texturen pro Runde nötig.
  const inkFluid = createFluid(gl, blit);
  const messeDeckung = createDeckungsMesser(gl, blit);
  const randAbfluss = createRandAbfluss(gl, blit);

  // Minimaler eigener Zustand fürs Tintenwächter-Pinsel: Spiegelmodus ergibt hier
  // keinen Sinn, die cm-Kalibrierung kommt vom echten state (gleicher Bildschirm).
  const tintenState = { symmetrie: 1, cmToUv: (cm) => state.cmToUv(cm) };
  const inkPinsel = createPinsel(inkFluid, tintenState);

  let aktiv = false; // Overlay überhaupt offen (Start/HUD/Ende)
  let laeuft = false; // eine Runde läuft gerade (nur dann zählt/rendert/reagiert es)
  let ueberlebenszeit = 0;
  let werkzeug = 'wasser';
  let deckung = 0;
  let bildZaehler = 0;

  function formatZeit(sek) {
    return `${Math.floor(sek)}s`;
  }

  function bestzeit() {
    return state.tintenwaechterBestzeit ?? 0;
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
    bestzeitStart.textContent = formatZeit(bestzeit());
    zeigeScreen('start');
  }

  function verlassen() {
    aktiv = false;
    laeuft = false;
    overlay.hidden = true;
    for (const el of freieChrome) if (el) el.hidden = false;
  }

  function waehleWerkzeug(name) {
    werkzeug = name;
    wasserKnopf.setAttribute('aria-pressed', String(name === 'wasser'));
    schaberKnopf.setAttribute('aria-pressed', String(name === 'schaber'));
  }

  function neueRunde() {
    inkFluid.neuesBlatt();
    ueberlebenszeit = 0;
    deckung = 0;
    bildZaehler = 0;
    waehleWerkzeug('wasser');
    aktualisiereHud();
    laeuft = true;
    zeigeScreen('hud');
    audio?.aufwecken?.();
  }

  function beenden() {
    laeuft = false;
    const neuerRekord = ueberlebenszeit > bestzeit();
    if (neuerRekord) {
      state.tintenwaechterBestzeit = ueberlebenszeit;
      state.speichern();
      audio?.levelAuf?.();
    } else {
      audio?.klick?.();
    }
    endeZeit.textContent = `Du hast ${formatZeit(ueberlebenszeit)} überlebt.`;
    endeRekord.hidden = !neuerRekord;
    zeigeScreen('ende');
  }

  function aktualisiereHud() {
    timerEl.textContent = formatZeit(ueberlebenszeit);
    pegelEl.textContent = `Stufe ${schwierigkeitspegel(ueberlebenszeit)}`;
    const anteil = Math.min(deckung / VERLUST_SCHWELLE, 1) * 100;
    deckungFuellung.style.width = `${anteil}%`;
    deckungFuellung.classList.toggle('tw-warnung', deckung >= WARN_SCHWELLE && deckung < VERLUST_SCHWELLE);
    deckungFuellung.classList.toggle('tw-gefahr', deckung >= VERLUST_SCHWELLE * 0.92);
  }

  wasserKnopf.addEventListener('click', () => waehleWerkzeug('wasser'));
  schaberKnopf.addEventListener('click', () => waehleWerkzeug('schaber'));
  document.getElementById('tw-los').addEventListener('click', neueRunde);
  document.getElementById('tw-nochmal').addEventListener('click', neueRunde);
  document.getElementById('tw-verlassen-start').addEventListener('click', verlassen);
  document.getElementById('tw-verlassen-ende').addEventListener('click', verlassen);
  document.getElementById('tw-aufhoeren').addEventListener('click', verlassen);

  // Läuft jedes Bild, auch wenn der Modus gar nicht aktiv ist — no-op dank der
  // Wächter oben, spart main.js eine eigene Fallunterscheidung.
  function tick(dt) {
    if (!laeuft) return;
    ueberlebenszeit += dt;

    for (const q of aktiveQuellen(ueberlebenszeit)) {
      inkPinsel.farbe(q.x, q.y, tintePigment, RADIUS_CM, staerke(ueberlebenszeit) * dt);
      inkPinsel.radial(q.x, q.y, SCHUB_STAERKE * dt, RADIUS_CM * 2.2);
    }

    if (zeiger.gedrueckt) {
      const ctx = { pinsel: inkPinsel, zeiger, state: tintenState, audio };
      (werkzeug === 'wasser' ? wasser : schaber).tick(ctx, dt);
    }

    inkFluid.step(dt, WETNESS);
    randAbfluss(inkFluid.dye, RAND_BREITE, RAND_ABFLUSS_PRO_S * dt);

    bildZaehler++;
    if (bildZaehler % MESS_ALLE_N_BILDER === 0) {
      deckung = messeDeckung(inkFluid.dye.read);
      if (deckung >= VERLUST_SCHWELLE) beenden();
    }

    aktualisiereHud();
  }

  function render() {
    if (!laeuft) return;
    presenter.render(inkFluid.dye.read, 1.0);
  }

  return {
    betreten,
    tick,
    render,
    resize: () => inkFluid.resize(),
    get aktiv() { return aktiv; },
    get laeuft() { return laeuft; },
  };
}
