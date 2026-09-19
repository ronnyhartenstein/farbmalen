// Der gemeinsame Zustand. Alles, was die UI umstellt und die Werkzeuge lesen.

const GESPEICHERT = 'farbmalen.einstellungen';

export const state = {
  werkzeug: 'giessen',
  farbe: 0,              // Index in der Palette
  naesse: 0.12,          // Stärke des Zerlaufens
  symmetrie: 1,          // 1 = aus, sonst Anzahl der Drehungen (zusätzlich gespiegelt)
  glitzer: false,
  ton: true,

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
