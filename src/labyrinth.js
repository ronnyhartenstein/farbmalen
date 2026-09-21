// Strömungslabyrinth (#9): eigener Modus, losgelöst vom Level-System — reine
// Daten/Logik, keine DOM- oder GL-Berührung, testbar wie src/tintenwaechter.js.
//
// Phase 1 (siehe Plan in #9): noch ohne Hindernisse, Level oder Levelauswahl — nur
// Start, Ziel und die Gewinnbedingung, damit sich das Steuerungsgefühl aus dem
// Phase-0-Prototyp (test/stroemungslabyrinth.html) im echten Frame-Loop/Overlay
// prüfen lässt.

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
