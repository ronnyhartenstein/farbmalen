// Der gemeinsame Zustand. Alles, was die UI umstellt und die Werkzeuge lesen.

const GESPEICHERT = 'farbmalen.einstellungen';

export const state = {
  werkzeug: 'giessen',
  farbe: 0,              // Index in der Palette
  naesse: 0.12,          // Stärke des Zerlaufens
  symmetrie: 1,          // 1 = aus, sonst Anzahl der Drehungen (zusätzlich gespiegelt)
  glitzer: false,
  ton: true,

  // Regenbogen-Modus (#15): statt einer festen Palettenfarbe gleitet die Farbe beim
  // Schütten langsam durch den Farbkreis. `farbe` bleibt dabei unverändert als
  // "letzte echte Farbe", auf die zurückgefallen wird, sobald der Modus wieder
  // ausgeschaltet wird.
  regenbogenAktiv: false,

  // Level & Freischaltungen (#12): Lebenslange Summe aus verbrauchter Farbe
  // (nicht Wasser) — siehe src/sim/splat.js. Das Level selbst wird nie gespeichert,
  // sondern immer aus dieser Zahl über die Stufentabelle in src/fortschritt.js
  // hergeleitet, damit sich die Kurve später anpassen lässt, ohne Spielstände zu
  // migrieren.
  farbPunkteGesamt: 0,

  // Volumenzähler mit Badges (#11): Wasser hat noch keinen eigenen Zähler — Farbe
  // nutzt farbPunkteGesamt oben mit, da beide dieselbe Summe wären. Siehe
  // src/abzeichen.js für die Stufen und die Umrechnung in ml.
  wasserEinheitenGesamt: 0,

  // Tintenwächter (#10): beste Überlebenszeit in Sekunden, eigener Arcade-Modus,
  // losgelöst vom Level-System.
  tintenwaechterBestzeit: 0,

  // Strömungslabyrinth (#9): Bestzeit in Sekunden je Level, nach Level-Id aus
  // src/labyrinth.js (LEVEL[].id) — nicht nach Index, damit sich die Reihenfolge
  // später ändern lässt, ohne bestehende Bestzeiten falsch zuzuordnen. Ebenfalls
  // losgelöst vom Level-System.
  labyrinthBestzeiten: {},

  // Werkzeug-Einstellungen, die sich freischalten lassen. Multiplikatoren auf die
  // Werkzeugkonstanten, 1 = heutiges (getuntes) Verhalten.
  werkzeugEinstellungen: {
    pinselDicke: 1,
    ruehrerTempo: 1,
  },

  // Bildschirm-Kalibrierung: wie viele CSS-Pixel sind ein echter Zentimeter,
  // und wie hoch ist die Wanne. Daraus wird jede Werkzeuggröße berechnet.
  cssPxProCm: 37.8,
  wanneHoehePx: 800,

  cmToUv(cm) {
    return (cm * this.cssPxProCm) / this.wanneHoehePx;
  },

  speichern() {
    try {
      localStorage.setItem(
        GESPEICHERT,
        JSON.stringify({
          naesse: this.naesse,
          symmetrie: this.symmetrie,
          glitzer: this.glitzer,
          ton: this.ton,
          farbe: this.farbe,
          regenbogenAktiv: this.regenbogenAktiv,
          farbPunkteGesamt: this.farbPunkteGesamt,
          wasserEinheitenGesamt: this.wasserEinheitenGesamt,
          tintenwaechterBestzeit: this.tintenwaechterBestzeit,
          labyrinthBestzeiten: this.labyrinthBestzeiten,
          werkzeugEinstellungen: this.werkzeugEinstellungen,
        })
      );
    } catch {
      // Privates Fenster o. ä. — dann eben ohne Merken.
    }
  },

  laden() {
    try {
      const roh = localStorage.getItem(GESPEICHERT);
      if (!roh) return;
      Object.assign(this, JSON.parse(roh));
    } catch {
      // Kaputte Daten ignorieren.
    }
  },
};
