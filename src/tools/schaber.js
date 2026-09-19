// Schaber — eine breite flache Kante, die Farbe zur Seite schiebt. Trägt selbst nichts auf.

const BREITE_CM = 2.4;
const KANTEN = 7;
const KRAFT = 18;
const RADIUS_CM = 0.42;

export const schaber = {
  id: 'schaber',
  name: 'Schaber',
  hinweis: 'Schiebt Farbe zur Seite, ohne neue aufzutragen',
  icon: '<path d="M3.5 15.5h11.5l4.5-9H8z"/><path d="M3.5 19.5h17"/>',

  tick(ctx) {
    const z = ctx.zeiger;
    if (!z.gedrueckt) return;

    const strecke = Math.hypot(z.dx, z.dy);
    if (strecke < 1e-5) return;

    // Quer zur Bewegung aufspannen — das ist die Klinge.
    const qx = -z.dy / strecke;
    const qy = z.dx / strecke;
    const halbe = ctx.state.cmToUv(BREITE_CM) / 2;

    for (let i = 0; i < KANTEN; i++) {
      const t = KANTEN === 1 ? 0 : (i / (KANTEN - 1)) * 2 - 1;
      ctx.pinsel.schub(
        z.x + qx * halbe * t,
        z.y + qy * halbe * t,
        z.dx,
        z.dy,
        KRAFT,
        RADIUS_CM
      );
    }
    ctx.audio?.schaben(strecke);
  },
};
