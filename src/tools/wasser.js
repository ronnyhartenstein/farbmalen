// Wasser — verdünnt das Pigment. Der Radiergummi dieses Spiels.
//
// (Warum kein weißer Farbtopf? Weil Farbe hier subtraktiv gerechnet wird: Weiß auf
// weißem Papier wäre schlicht unsichtbar. Wegnehmen ist das ehrliche Weiß.)

const RADIUS_CM = 0.7;
const STAERKE_PRO_S = 2.2;

export const wasser = {
  id: 'wasser',
  name: 'Wasser',
  hinweis: 'Verdünnt die Farbe — zum Aufhellen und Wegwischen',
  icon: '<path d="M12 3.2c0 0 6.2 7.2 6.2 11.1a6.2 6.2 0 0 1-12.4 0C5.8 10.4 12 3.2 12 3.2z"/><path d="M9.2 14.8a2.8 2.8 0 0 0 2.8 2.8"/>',

  tick(ctx, dt) {
    const z = ctx.zeiger;
    if (!z.gedrueckt) return;
    ctx.pinsel.wasser(z.x, z.y, RADIUS_CM, STAERKE_PRO_S * dt);
    ctx.pinsel.schub(z.x, z.y, z.dx, z.dy, 18, RADIUS_CM);
    ctx.audio?.wasser(dt);
  },
};
