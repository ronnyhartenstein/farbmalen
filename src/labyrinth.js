// Strömungslabyrinth (#9): eigener Modus, losgelöst vom Level-System — reine
// Daten/Logik, keine DOM- oder GL-Berührung, testbar wie src/tintenwaechter.js.
//
// Noch ohne Levelformat/Levelauswahl (Phase 4 im Plan) — nur Start, Ziel und
// bislang ein einzelnes Hindernis, um die Phase-2-Technik (weiche Abstoßung statt
// harter Solver-Wand) im echten Modus auszuprobieren.

// Feste Start-/Zielpunkte in UV-Koordinaten (0..1, y von unten wie überall in der
// Sim) — dieselben wie im Phase-0-Prototyp, damit das Steuerungsgefühl vergleichbar
// bleibt.
export const START = { x: 0.15, y: 0.22 };
export const ZIEL = { x: 0.85, y: 0.78 };

// Radius um das Ziel, ab dem eine Runde gewonnen ist (in UV).
export const ZIEL_RADIUS = 0.07;

export function amZiel(x, y) {
  const dx = x - ZIEL.x;
  const dy = y - ZIEL.y;
  return dx * dx + dy * dy <= ZIEL_RADIUS * ZIEL_RADIUS;
}

// Phase 2 (siehe Plan in #9): "Hindernis" testweise als Punkt, der jedes Bild eine
// feste Radial-Abstoßung einspeist (src/ui/labyrinth.js) — keine Änderung an
// fluid.js/shaders.js. Liegt auf der direkten Start-Ziel-Linie, damit man ihm gar
// nicht ausweichen kann, ohne die Abstoßung tatsächlich zu spüren.
//
// staerke/radiusCm sind eine erste Schätzung, keine gemessene Kalibrierung (anders
// als z. B. src/tintenwaechter.js) — hier entscheidet der manuelle Test in #9, ob
// die weiche Abstoßung überhaupt trägt, bevor sich Feintuning lohnt.
export const HINDERNIS = { x: 0.5, y: 0.5, radiusCm: 3.2, staerke: 3.0 };
