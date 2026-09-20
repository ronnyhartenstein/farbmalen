// Level & Freischaltungen.
//
// Getrennt von den ml-Badges (#11, reine Trophäen ohne Wirkung): Hier schaltet
// Fortschritt tatsächlich etwas frei — Werkzeuge, Farben, Werkzeug-Einstellungen.
// Das Level ergibt sich immer aus der Stufentabelle unten, nicht aus einem
// gespeicherten Level-Wert — so lässt sich die Kurve später nachjustieren, ohne
// bestehende Spielstände zu migrieren.

// Immer frei, von der ersten Sekunde an: genug für den kompletten Grundzyklus
// (auftragen, verteilen, verdünnen).
export const STARTWERKZEUGE = ['giessen', 'pinsel', 'wasser'];

// Indizes in PALETTE (src/palette.js): Zinnoberrot, Sonnengelb, Himmelblau,
// Tiefschwarz, Türkis.
export const STARTFARBEN = [0, 2, 6, 12, 5];

// Startwert, keine Endabnahme — siehe test/fortschritt.html. Grob verdoppelnd,
// damit die erste Stufe nach ein paar Sekunden Malen fällt (niedrige Hürden).
// Rechen zuerst (größter optischer Ertrag), Seife zuletzt (der Knalleffekt als
// Belohnung fürs Durchhalten). Die Werkzeug-Einstellungen kommen erst danach,
// als Spätspiel-Ziel, wenn Werkzeuge und Farben schon komplett sind.
export const STUFEN = [
  { punkte: 8, werkzeug: 'rechen', farben: [1, 3], titel: 'Rechen' },
  { punkte: 20, werkzeug: 'ruehrer', farben: [8, 9], titel: 'Rührer' },
  { punkte: 45, werkzeug: 'schaber', farben: [10, 7], titel: 'Schaber' },
  { punkte: 95, werkzeug: 'pusten', farben: [4, 11], titel: 'Pusten' },
  { punkte: 200, werkzeug: 'seife', farben: [13], titel: 'Seife & Gold' },
  { punkte: 420, einstellung: 'pinselDicke', titel: 'Pinsel-Dicke einstellbar' },
  { punkte: 900, einstellung: 'ruehrerTempo', titel: 'Rührer-Tempo einstellbar' },
];

// Anzeige-/Freischaltreihenfolge der Werkzeuge — bestimmt auch die Zifferntasten
// (Taste N wählt das N-te sichtbare Werkzeug). Abgeleitet, nicht die Registry
// WERKZEUGE aus src/tools/index.js, die bleibt ein reines Nachschlagewerk.
export const WERKZEUG_REIHENFOLGE = [
  ...STARTWERKZEUGE,
  ...STUFEN.filter((s) => s.werkzeug).map((s) => s.werkzeug),
];

// Level, das mit den gegebenen Punkten erreicht ist. 0 = nur der Startzustand.
export function levelVon(punkte) {
  let level = 0;
  for (const stufe of STUFEN) {
    if (punkte < stufe.punkte) break;
    level++;
  }
  return level;
}

// Die Stufe, die mit dem nächsten Levelaufstieg erreicht wird, oder null, wenn
// schon alles freigeschaltet ist.
export function naechsteStufe(level) {
  return STUFEN[level] ?? null;
}

// Alle Werkzeuge/Farben/Einstellungen, die bei genau diesem Level (>= 1) neu
// hinzukommen — leer für Level 0, das ist der Startzustand.
export function stufeVon(level) {
  return level >= 1 ? STUFEN[level - 1] ?? null : null;
}

// Alles, was bis zu (einschließlich) diesem Level insgesamt sichtbar sein soll —
// für den Aufbau beim Laden eines Spielstands, der schon mittendrin steht.
export function werkzeugeBisLevel(level) {
  const ids = [...STARTWERKZEUGE];
  for (let l = 1; l <= level; l++) {
    const stufe = stufeVon(l);
    if (stufe?.werkzeug) ids.push(stufe.werkzeug);
  }
  return ids;
}

export function farbenBisLevel(level) {
  const indizes = [...STARTFARBEN];
  for (let l = 1; l <= level; l++) {
    const stufe = stufeVon(l);
    if (stufe?.farben) indizes.push(...stufe.farben);
  }
  return indizes;
}

export function einstellungenBisLevel(level) {
  const namen = [];
  for (let l = 1; l <= level; l++) {
    const stufe = stufeVon(l);
    if (stufe?.einstellung) namen.push(stufe.einstellung);
  }
  return namen;
}
