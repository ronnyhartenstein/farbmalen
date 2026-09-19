// Rechen — der Marmorierkamm. Sieben Zinken quer zur Bewegung, und schon sieht es
// aus wie echtes Marmorpapier (Ebru).

const ZINKEN = 7;
const ABSTAND_CM = 0.8;
const KRAFT = 30;   // schmale Zinken brauchen mehr als breite Werkzeuge
const RADIUS_CM = 0.2;

export const rechen = {
  id: 'rechen',
  name: 'Rechen',
  hinweis: 'Quer durch die Farben ziehen — ergibt Marmormuster',
  icon: '<path d="M3.5 8.5h17"/><path d="M6 8.5v6.5M10 8.5v6.5M14 8.5v6.5M18 8.5v6.5"/>',

  tick(ctx) {
    const z = ctx.zeiger;
    if (!z.gedrueckt) return;

    const strecke = Math.hypot(z.dx, z.dy);
    if (strecke < 1e-5) return;

    const qx = -z.dy / strecke;
    const qy = z.dx / strecke;
    const abstand = ctx.state.cmToUv(ABSTAND_CM);
    const mitte = (ZINKEN - 1) / 2;

    for (let i = 0; i < ZINKEN; i++) {
      const versatz = (i - mitte) * abstand;
      ctx.pinsel.schub(
        z.x + qx * versatz,
        z.y + qy * versatz,
        z.dx,
        z.dy,
        KRAFT,
        RADIUS_CM
      );
    }
    ctx.audio?.schaben(strecke * 0.6);
  },
};
