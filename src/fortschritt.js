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

// Startwert, keine Endabnahme — siehe test/fortschritt.html. Das allererste Gießen
// (Level 1) darf ruhig etwas dauern, damit die erste Freischaltung sich verdient
// anfühlt; danach wächst die Kurve bewusst FLACHER als eine Verdopplung — die
// Schrittweite steigt nur noch mild (30, 40, 50, 70, 100, 140), nicht mehr
// multiplikativ. Sonst würden spätere Level unverhältnismäßig lang dauern.
// Rechen zuerst (größter optischer Ertrag), Seife zuletzt (der Knalleffekt als
// Belohnung fürs Durchhalten). Die Werkzeug-Einstellungen kommen erst danach,
// als Spätspiel-Ziel, wenn Werkzeuge und Farben schon komplett sind.
//
// reglerBloecke: DOM-Ids im rechten Reglerblock, die bei dieser Stufe sichtbar
// werden (Ton, Neues Blatt und Vollbild bleiben dagegen immer da — reine
// Bedienelemente, kein Spielinhalt). Auf die ersten vier Werkzeug-Stufen verteilt,
// damit alles Inhaltliche innerhalb weniger Minuten frei ist.
// text: kurzer Erklärsatz fürs Levelaufstieg-Popup (was ist neu, wofür ist es gut).
export const STUFEN = [
  {
    punkte: 30, werkzeug: 'rechen', farben: [1, 3], reglerBloecke: ['r-block-naesse'],
    titel: 'Rechen',
    text: 'Zieh den Rechen quer durch die Farben — das ergibt echtes Marmormuster. Und die Nässe lässt sich jetzt einstellen.',
  },
  {
    punkte: 60, werkzeug: 'ruehrer', farben: [8, 9], reglerBloecke: ['r-block-abklatsch'],
    titel: 'Rührer',
    text: 'Der Rührer dreht Farben spiralig ineinander. Und du kannst jetzt Papier auflegen, um dein Bild in der Galerie zu sammeln.',
  },
  {
    punkte: 100, werkzeug: 'schaber', farben: [10, 7], reglerBloecke: ['r-block-spiegel'],
    titel: 'Schaber',
    text: 'Der Schaber schiebt Farbe zur Seite, ohne neue aufzutragen. Und der Spiegel macht aus jedem Strich ein Mandala.',
  },
  {
    punkte: 150, werkzeug: 'pusten', farben: [4, 11], reglerBloecke: ['r-glitzer'],
    titel: 'Pusten',
    text: 'Pusten bläst die Farbe nach außen, wie durch einen Strohhalm. Und Glitzer schwimmt jetzt mit der Strömung.',
  },
  {
    punkte: 220, werkzeug: 'seife', farben: [13],
    titel: 'Seife & Gold',
    text: 'Ein Klick mit der Seife, und die Farbe flieht schlagartig! Dazu gibt es jetzt Gold in der Palette.',
  },
  {
    punkte: 320, einstellung: 'pinselDicke',
    titel: 'Pinsel-Dicke einstellbar',
    text: 'Du kannst jetzt einstellen, wie dick der Pinsel malt.',
  },
  {
    punkte: 460, einstellung: 'ruehrerTempo',
    titel: 'Rührer-Tempo einstellbar',
    text: 'Du kannst jetzt einstellen, wie schnell der Rührer dreht.',
  },
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

export function reglerBloeckeBisLevel(level) {
  const ids = [];
  for (let l = 1; l <= level; l++) {
    const stufe = stufeVon(l);
    if (stufe?.reglerBloecke) ids.push(...stufe.reglerBloecke);
  }
  return ids;
}
