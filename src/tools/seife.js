// Seife — der Milch-und-Lebensmittelfarbe-Versuch aus der Schule.
// Ein Tropfen, und die Farbe flieht schlagartig nach außen.

const WUCHT = 5.0;   // darüber bringt es nichts mehr, die Druckkorrektur schluckt den Rest
const RADIUS_CM = 2.4;
const NACHSTOSS = 1.2;
const NACHSTOSS_DAUER_S = 0.45;

export const seife = {
  id: 'seife',
  name: 'Seife',
  hinweis: 'Ein Klick — und die Farbe rennt davon',
  icon: '<circle cx="9.5" cy="14" r="5.5"/><circle cx="17.5" cy="7.5" r="3"/><path d="M7 11.5a3 3 0 0 1 2.5-2.5"/>',

  onDown(ctx) {
    ctx.pinsel.radial(ctx.zeiger.x, ctx.zeiger.y, WUCHT, RADIUS_CM);
    ctx.pinsel.wasser(ctx.zeiger.x, ctx.zeiger.y, RADIUS_CM * 0.35, 0.55);
    ctx.audio?.seife();
  },

  // Kurzer Nachstoß, damit es sich wie ein Aufreißen anfühlt und nicht wie ein Schlag.
  tick(ctx, dt) {
    const z = ctx.zeiger;
    if (!z.gedrueckt || z.haltezeit > NACHSTOSS_DAUER_S) return;
    const abfall = 1 - z.haltezeit / NACHSTOSS_DAUER_S;
    ctx.pinsel.radial(z.x, z.y, NACHSTOSS * abfall * dt * 4, RADIUS_CM);
  },
};
