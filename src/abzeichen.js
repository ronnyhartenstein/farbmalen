// Volumenzähler mit Badges (#11) — reine Trophäen ohne Spielauswirkung, anders als
// die Level-Freischaltungen in src/fortschritt.js. Beide speisen sich aus derselben
// Grundlage (Farb-/Wasserverbrauch), zählen aber getrennt aus.
//
// Für Farbe wird state.farbPunkteGesamt wiederverwendet, das #12 schon lebenslang
// mitzählt (siehe pinsel.farbe() in src/sim/splat.js) — kein zweiter, identisch
// wachsender Zähler nötig. Wasser hat noch keinen: state.wasserEinheitenGesamt.
//
// Die "amount"-Einheit der Simulation ist dimensionslose Pigmentdichte, kein echtes
// Volumen — die Umrechnung in ml ist zwangsläufig eine erfundene, aber konsistente
// Fun-Zahl. Kalibriert (siehe test/abzeichen.html) danach, dass das erste Abzeichen
// in einer normalen Spielsitzung fällt und die späteren mehrere Sitzungen brauchen.
export const ML_PRO_EINHEIT = 2;

export const FARBE_ABZEICHEN = [
  { ml: 250, titel: 'Erster Tropfen' },
  { ml: 1_000, titel: 'Farbeimer' },
  { ml: 5_000, titel: 'Kleiner Farbwasserfall' },
  { ml: 20_000, titel: 'Fassweise' },
  { ml: 100_000, titel: 'Farbbadewanne' },
];

export const WASSER_ABZEICHEN = [
  { ml: 1_000, titel: 'Erster Schluck' },
  { ml: 10_000, titel: 'Gießkanne' },
  { ml: 50_000, titel: 'Regenschauer' },
  { ml: 200_000, titel: 'Kleiner Teich' },
];

export function einheitenZuMl(einheiten) {
  return einheiten * ML_PRO_EINHEIT;
}

// Anzahl der bereits erreichten Abzeichen einer Liste, absteigend sortiert erwartet.
export function anzahlErreicht(ml, liste) {
  let n = 0;
  for (const a of liste) {
    if (ml >= a.ml) n++;
    else break;
  }
  return n;
}

export function formatiereMl(ml) {
  if (ml >= 1000) {
    const liter = ml / 1000;
    return `${liter.toLocaleString('de-DE', { maximumFractionDigits: liter < 10 ? 1 : 0 })} l`;
  }
  return `${Math.round(ml)} ml`;
}
