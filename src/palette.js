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

export function hexZuPigment(hex) {
  return hexZuRgb(hex).map((k) => -Math.log(Math.max(k, DUNKELGRENZE)));
}

export function aktuelleFarbe(state) {
  return PALETTE[state.farbe % PALETTE.length];
}
