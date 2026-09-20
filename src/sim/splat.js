// Der "Pinselkopf": die einzige Stelle, an der Werkzeuge die Simulation berühren.
//
// Hier sitzt auch der Spiegelmodus. Weil er auf der EINGABESEITE ansetzt, gilt er
// automatisch für jedes Werkzeug — kein Werkzeug muss davon wissen.
//
// Fallstrick, der hier gelöst wird: Beim Spiegeln muss der Geschwindigkeits-VEKTOR
// mitgedreht werden, nicht nur die Position. Sonst ziehen die gespiegelten Striche
// in die falsche Richtung. Und ein gespiegelter Wirbel dreht andersherum.

export function createPinsel(fluid, state) {
  // Liefert alle Kopien eines Eingriffs: k Drehungen, jeweils zusätzlich gespiegelt.
  function kopien(x, y, vx, vy, list) {
    list.length = 0;
    const k = state.symmetrie;
    if (k <= 1) {
      list.push({ x, y, vx, vy, spiegel: false });
      return list;
    }
    const a = fluid.aspect;
    // In aspektkorrigierten Koordinaten drehen, sonst wird aus dem Mandala eine Ellipse.
    const px = (x - 0.5) * a;
    const py = y - 0.5;
    for (let i = 0; i < k; i++) {
      const w = (2 * Math.PI * i) / k;
      const c = Math.cos(w);
      const s = Math.sin(w);
      list.push({
        x: 0.5 + (px * c - py * s) / a,
        y: 0.5 + (px * s + py * c),
        vx: vx * c - vy * s,
        vy: vx * s + vy * c,
        spiegel: false,
      });
      // Gespiegelte Kopie: erst an der Waagerechten spiegeln, dann dieselbe Drehung.
      list.push({
        x: 0.5 + (px * c + py * s) / a,
        y: 0.5 + (px * s - py * c),
        vx: vx * c + vy * s,
        vy: vx * s - vy * c,
        spiegel: true,
      });
    }
    return list;
  }

  const puffer = [];

  return {
    // Farbe auftragen. radius in cm, amount = Pigmentmenge.
    //
    // Zählt nebenbei für Level-Freischaltungen (#12) und Abzeichen (#11) mit — diese
    // Funktion ist die einzige Stelle, an der Werkzeuge Farbe auftragen. wasser()
    // unten bleibt für #12 bewusst unangetastet: Wasser zählt nicht zum Fortschritt.
    //
    // zaehlgewicht (#18): visuelle Menge und gezählte Menge sind absichtlich getrennt.
    // Der Pinsel trägt beim Ziehen pro Bild mehrere Kleckse auf (bis zu MAX_SCHRITTE),
    // Gießen dagegen eine feste Rate pro Sekunde — ungewichtet zählte Pinsel dadurch
    // um ein Vielfaches schneller hoch, obwohl visuell nur mehr Fläche bemalt wird,
    // nicht mehr "Fortschritt" gemacht wird. Default 1 lässt Gießen (und jedes
    // künftige Werkzeug) unverändert.
    farbe(x, y, cmy, radiusCm, amount, zaehlgewicht = 1) {
      const r = state.cmToUv(radiusCm);
      for (const k of kopien(x, y, 0, 0, puffer)) {
        fluid.splatDye(k.x, k.y, cmy, r, amount);
      }
      state.farbPunkteGesamt += amount * zaehlgewicht;
    },

    // Verdünnen: zieht Pigment heraus.
    //
    // Zählt für den Volumenzähler (#11) mit — analog zu farbe() oben, aber ohne
    // Auswirkung auf die Level-Freischaltungen (#12), die bewusst nur Farbe zählen.
    wasser(x, y, radiusCm, amount) {
      const r = state.cmToUv(radiusCm);
      for (const k of kopien(x, y, 0, 0, puffer)) {
        fluid.splatWater(k.x, k.y, r, amount);
      }
      state.wasserEinheitenGesamt += amount;
    },

    // Gerichteter Schub. dx/dy ist eine Bewegung in uv, kraft skaliert sie.
    schub(x, y, dx, dy, kraft, radiusCm) {
      const r = state.cmToUv(radiusCm);
      const fx = dx * fluid.velocity.width * kraft;
      const fy = dy * fluid.velocity.height * kraft;
      for (const k of kopien(x, y, fx, fy, puffer)) {
        fluid.splatVelocity(k.x, k.y, k.vx, k.vy, r);
      }
    },

    // Radial nach außen (positiv) oder nach innen (negativ).
    radial(x, y, staerke, radiusCm) {
      const r = state.cmToUv(radiusCm);
      const s = staerke * fluid.velocity.height;
      for (const k of kopien(x, y, 0, 0, puffer)) {
        fluid.splatRadial(k.x, k.y, s, r);
      }
    },

    // Drehung um den Punkt. Gespiegelte Kopien drehen andersherum.
    wirbel(x, y, staerke, radiusCm) {
      const r = state.cmToUv(radiusCm);
      const s = staerke * fluid.velocity.height;
      for (const k of kopien(x, y, 0, 0, puffer)) {
        fluid.splatVortex(k.x, k.y, k.spiegel ? -s : s, r);
      }
    },
  };
}
