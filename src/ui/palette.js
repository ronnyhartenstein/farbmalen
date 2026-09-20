// Die Farbkleckse unten.
//
// Level & Freischaltungen (#12): Noch nicht freigeschaltete Farben existieren hier
// schlicht nicht. `zeigeNeueFarbe()` hängt beim Freischalten einen neuen Klecks an.
//
// Regenbogen-Modus (#15): Der Würfel ist kein Einmal-Reroll mehr, sondern eine echte
// Auswahl wie jede andere Farbe — ausgewählt bleibt er ausgewählt (dreht sichtbar
// durch den Farbkreis), bis eine feste Farbe geklickt wird. Was der Modus konkret tut
// (langsam durch den Farbkreis gleiten, solange geschüttet wird), steckt in
// src/main.js — hier wird nur der An/Aus-Zustand verwaltet und angezeigt.

import { PALETTE } from '../palette.js';

export function createPalette(state, aktionen, sichtbareIndizes) {
  const box = document.getElementById('palette');
  const knoepfe = new Map(); // Index → Button
  const sichtbar = []; // Indizes in Anzeigereihenfolge

  function bauKnopf(i) {
    const farbe = PALETTE[i];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'klecks klecks--neu';
    b.style.background = farbe.hex;
    b.title = farbe.name;
    b.setAttribute('aria-label', farbe.name);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => waehle(i));
    // Vor dem Würfel einfügen, der soll immer der letzte Klecks bleiben.
    box.insertBefore(b, wuerfel);
    knoepfe.set(i, b);
    setTimeout(() => b.classList.remove('klecks--neu'), 500);
  }

  function fuegeHinzu(i) {
    if (knoepfe.has(i)) return;
    sichtbar.push(i);
    bauKnopf(i);
  }

  const wuerfel = document.createElement('button');
  wuerfel.type = 'button';
  wuerfel.className = 'klecks klecks-regenbogen';
  wuerfel.title = 'Regenbogen — gleitet beim Schütten durch den Farbkreis';
  wuerfel.setAttribute('aria-label', 'Regenbogen-Farbe');
  wuerfel.setAttribute('aria-pressed', 'false');
  wuerfel.addEventListener('click', waehleRegenbogen);
  box.appendChild(wuerfel);

  for (const i of sichtbareIndizes) fuegeHinzu(i);
  for (const b of knoepfe.values()) b.classList.remove('klecks--neu');

  function waehle(i) {
    if (!knoepfe.has(i)) return; // nicht sichtbar/freigeschaltet → ignorieren
    state.farbe = i;
    state.regenbogenAktiv = false;
    state.speichern();
    knoepfe.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    wuerfel.setAttribute('aria-pressed', 'false');
    aktionen.beiWechsel?.();
  }

  function waehleRegenbogen() {
    state.regenbogenAktiv = true;
    state.speichern();
    knoepfe.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    wuerfel.setAttribute('aria-pressed', 'true');
    aktionen.beiWechsel?.();
  }

  // Alter Spielstand kann auf eine noch nicht sichtbare Farbe zeigen (z. B. Gold
  // von vor #12) — dann auf die erste sichtbare zurückfallen, statt mit einem
  // Pigment zu starten, für das es gar keinen Button gibt.
  if (state.regenbogenAktiv) {
    wuerfel.setAttribute('aria-pressed', 'true');
  } else {
    const start = knoepfe.has(state.farbe) ? state.farbe : sichtbar[0];
    waehle(start);
  }

  return { waehle, zeigeNeueFarbe: fuegeHinzu };
}
