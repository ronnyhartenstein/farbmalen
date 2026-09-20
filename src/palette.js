// Die Farbkleckse. Gespeichert wird RGB (fürs Auge in der Leiste),
// in die Simulation geht optische Dichte.

export const PALETTE = [
  { name: 'Zinnoberrot', hex: '#e8322a' },
  { name: 'Orange', hex: '#f07e1a' },
  { name: 'Sonnengelb', hex: '#f7d32b' },
  { name: 'Grasgrün', hex: '#54b83c' },
  { name: 'Tannengrün', hex: '#12764a' },
  { name: 'Türkis', hex: '#16b8b8' },
  { name: 'Himmelblau', hex: '#2f7fe0' },
  { name: 'Ultramarin', hex: '#2b32a8' },
  { name: 'Violett', hex: '#7c3fb5' },
  { name: 'Magenta', hex: '#d6219a' },
  { name: 'Rosa', hex: '#f58aa8' },
  { name: 'Schokobraun', hex: '#7a4a25' },
  { name: 'Tiefschwarz', hex: '#151515' },
  { name: 'Gold', hex: '#d2a13c' },
];

export function hexZuRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Optische Dichte statt naivem "1 - rgb".
//
// Der Anzeige-Shader rechnet Dichte per Beer-Lambert in Licht zurück: rgb = exp(-dichte).
// Also ist die Dichte einer Farbe gerade -ln(rgb). Das hat zwei Folgen, die man sofort
// sieht: Bei Menge 1 kommt exakt der Farbton aus der Leiste heraus, und zwei Pigmente
// addieren sich zu dem, was ein Tuschkasten auch liefert — Gelb + Türkis wird Grün.
// (Mit "1 - rgb" wurde daraus Braun, weil die Farbtöne mit der Menge wegdrifteten.)
const DUNKELGRENZE = 0.035; // sonst wäre Schwarz unendlich dicht

export function rgbZuPigment(rgb) {
  return rgb.map((k) => -Math.log(Math.max(k, DUNKELGRENZE)));
}

export function hexZuPigment(hex) {
  return rgbZuPigment(hexZuRgb(hex));
}

// Für den Regenbogen-Modus (#15): h in Grad [0, 360), s/l in [0, 1].
export function hslZuRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const [r, g, b] =
    hh < 1 ? [c, x, 0] :
    hh < 2 ? [x, c, 0] :
    hh < 3 ? [0, c, x] :
    hh < 4 ? [0, x, c] :
    hh < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

export function hslZuPigment(h, s, l) {
  return rgbZuPigment(hslZuRgb(h, s, l));
}

export function aktuelleFarbe(state) {
  return PALETTE[state.farbe % PALETTE.length];
}
