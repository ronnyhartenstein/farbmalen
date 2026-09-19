// Pusten — wie durch einen Strohhalm auf nasse Farbe blasen.

const STAERKE_PRO_S = 3.0;
const RADIUS_CM = 2.0;

export const pusten = {
  id: 'pusten',
  name: 'Pusten',
  hinweis: 'Gedrückt halten — bläst die Farbe nach außen',
  icon: '<path d="M3 8.5h9.5a3 3 0 1 0-3-3"/><path d="M3 13.5h12.5a3 3 0 1 1-3 3"/><path d="M3 18.5h6"/>',

  tick(ctx, dt) {
    const z = ctx.zeiger;
    if (!z.gedrueckt) return;
    ctx.pinsel.radial(z.x, z.y, STAERKE_PRO_S * dt, RADIUS_CM);
    ctx.audio?.pusten(dt);
  },
};
