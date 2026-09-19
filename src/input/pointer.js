// Zeigereingabe in etwas übersetzen, mit dem Werkzeuge arbeiten können:
// Position in uv (0..1, y von unten), Bewegung seit dem letzten Bild, Haltedauer.
//
// Bewusst bildweise statt eventweise: Werkzeuge bekommen pro Frame genau einen
// sauberen Strichabschnitt, egal wie viele Events der Browser dazwischen feuert.

export function createZeiger(canvas) {
  const z = {
    x: 0.5,
    y: 0.5,
    px: 0.5,
    py: 0.5,
    dx: 0,
    dy: 0,
    tempo: 0,
    gedrueckt: false,
    neuGedrueckt: false,
    losgelassen: false,
    haltezeit: 0,
    imBild: false,
  };

  let zielX = 0.5;
  let zielY = 0.5;
  let downAusstehend = false;
  let upAusstehend = false;

  function zuUv(ev) {
    const r = canvas.getBoundingClientRect();
    zielX = (ev.clientX - r.left) / r.width;
    zielY = 1 - (ev.clientY - r.top) / r.height;
  }

  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    // Bei synthetischen Events (Tests) gibt es keine echte pointerId — nicht daran scheitern.
    try { canvas.setPointerCapture(ev.pointerId); } catch { /* egal */ }
    zuUv(ev);
    // Beim Aufsetzen keinen Sprung erzeugen.
    z.x = z.px = zielX;
    z.y = z.py = zielY;
    downAusstehend = true;
    z.imBild = true;
  });

  canvas.addEventListener('pointermove', (ev) => {
    zuUv(ev);
    z.imBild = true;
  });

  const beenden = (ev) => {
    try {
      if (canvas.hasPointerCapture?.(ev.pointerId)) canvas.releasePointerCapture(ev.pointerId);
    } catch { /* egal */ }
    upAusstehend = true;
  };
  canvas.addEventListener('pointerup', beenden);
  canvas.addEventListener('pointercancel', beenden);
  canvas.addEventListener('pointerleave', () => { z.imBild = false; });

  return {
    zeiger: z,

    // Alles in einem Rutsch am Bildanfang: Werkzeuge sehen im selben Frame
    // ein konsistentes Bild aus Position, Bewegung und Zustandswechseln.
    frameBeginn(dt) {
      z.neuGedrueckt = false;
      z.losgelassen = false;

      if (downAusstehend) {
        downAusstehend = false;
        z.gedrueckt = true;
        z.neuGedrueckt = true;
        z.haltezeit = 0;
      }

      z.px = z.x;
      z.py = z.y;
      z.x = zielX;
      z.y = zielY;
      z.dx = z.x - z.px;
      z.dy = z.y - z.py;
      z.tempo = Math.hypot(z.dx, z.dy) / Math.max(dt, 1e-4);

      if (z.gedrueckt) z.haltezeit += dt;

      // Ein Klick, der im selben Frame beginnt und endet, soll trotzdem beides auslösen.
      if (upAusstehend) {
        upAusstehend = false;
        z.gedrueckt = false;
        z.losgelassen = true;
        z.haltezeit = 0;
      }
    },
  };
}
