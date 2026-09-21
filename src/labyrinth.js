// Strömungslabyrinth (#9): eigener Modus, losgelöst vom Level-System — reine
// Daten/Logik, keine DOM- oder GL-Berührung, testbar wie src/tintenwaechter.js.
//
// Hindernisse UND Meiden-Zonen nutzen dieselbe Technik: weiche, dauerhafte
// Radial-Abstoßung statt einer harten Solver-Wand (Phase 2 im Plan, manuell
// bestätigt in #9 — das Objekt weicht glaubwürdig aus und lässt sich nicht
// durchdrücken). Der Unterschied ist nur die Auslegung: Hindernisse sind stark
// genug, um praktisch als Wand zu wirken; Meiden-Zonen sind schwächer und größer
// gedacht — eher eine Warnung als eine echte Sperre (die "Seifen"-Zonen aus der
// ursprünglichen Idee in #9).
//
// staerke/radiusCm sind eine erste Schätzung, keine gemessene Kalibrierung (anders
// als z. B. src/tintenwaechter.js) — Feintuning ist manueller Test in #9.

export const ZIEL_RADIUS = 0.07;

export const LEVEL = [
  {
    id: 'erste-welle',
    name: 'Erste Welle',
    start: { x: 0.15, y: 0.22 },
    ziel: { x: 0.85, y: 0.78 },
    hindernisse: [{ x: 0.5, y: 0.5, radiusCm: 3.2, staerke: 3.0 }],
    meidenZonen: [],
  },
  {
    id: 'engpass',
    name: 'Engpass',
    start: { x: 0.12, y: 0.5 },
    ziel: { x: 0.88, y: 0.5 },
    hindernisse: [
      { x: 0.42, y: 0.32, radiusCm: 2.6, staerke: 3.0 },
      { x: 0.42, y: 0.68, radiusCm: 2.6, staerke: 3.0 },
      { x: 0.66, y: 0.5, radiusCm: 2.2, staerke: 3.0 },
    ],
    meidenZonen: [],
  },
  {
    id: 'seifenpfad',
    name: 'Seifenpfad',
    start: { x: 0.15, y: 0.85 },
    ziel: { x: 0.85, y: 0.15 },
    hindernisse: [{ x: 0.55, y: 0.55, radiusCm: 2.6, staerke: 3.0 }],
    meidenZonen: [{ x: 0.3, y: 0.35, radiusCm: 4.5, staerke: 1.1 }],
  },
];

export function amZiel(level, x, y) {
  const dx = x - level.ziel.x;
  const dy = y - level.ziel.y;
  return dx * dx + dy * dy <= ZIEL_RADIUS * ZIEL_RADIUS;
}
