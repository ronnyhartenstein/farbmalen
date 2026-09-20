// Die Farbkleckse unten.
//
// Level & Freischaltungen (#12): Noch nicht freigeschaltete Farben existieren hier
// schlicht nicht. `zeigeNeueFarbe()` hängt beim Freischalten einen neuen Klecks an.
// Der Würfel würfelt nur unter den aktuell sichtbaren Farben.

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

  // Würfel: eine zufällige Farbe aus dem aktuell Sichtbaren, die nicht die aktuelle ist.
  const wuerfel = document.createElement('button');
  wuerfel.type = 'button';
  wuerfel.className = 'klecks';
  wuerfel.style.background =
    'conic-gradient(#e8322a, #f7d32b, #54b83c, #16b8b8, #2f7fe0, #7c3fb5, #d6219a, #e8322a)';
  wuerfel.title = 'Zufallsfarbe';
  wuerfel.setAttribute('aria-label', 'Zufallsfarbe');
  wuerfel.addEventListener('click', () => {
    if (sichtbar.length < 2) return;
    let i = state.farbe;
    while (i === state.farbe) i = sichtbar[Math.floor(Math.random() * sichtbar.length)];
    waehle(i);
  });
  box.appendChild(wuerfel);

  for (const i of sichtbareIndizes) fuegeHinzu(i);
  for (const b of knoepfe.values()) b.classList.remove('klecks--neu');

  function waehle(i) {
    if (!knoepfe.has(i)) return; // nicht sichtbar/freigeschaltet → ignorieren
    state.farbe = i;
    state.speichern();
    knoepfe.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    aktionen.beiWechsel?.();
  }

  // Alter Spielstand kann auf eine noch nicht sichtbare Farbe zeigen (z. B. Gold
  // von vor #12) — dann auf die erste sichtbare zurückfallen, statt mit einem
  // Pigment zu starten, für das es gar keinen Button gibt.
  const start = knoepfe.has(state.farbe) ? state.farbe : sichtbar[0];
  waehle(start);

  return { waehle, zeigeNeueFarbe: fuegeHinzu };
}
