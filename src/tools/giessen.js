// Gießen — das Grundwerkzeug. Klick = ein Klecks von ca. 1 cm.
// Gedrückt halten schüttet weiter nach: die Pfütze wächst und drückt die Nachbarn weg.

const RADIUS_CM = 0.5;          // halber Zentimeter Radius = 1 cm Durchmesser
const WACHSTUM_CM_PRO_S = 0.25; // wie schnell die Pfütze beim Halten breiter wird
const MAX_ZUWACHS_CM = 0.85;
const KLECKS_MENGE = 1.3;       // Pigment beim ersten Klick — ein Klecks soll satt aussehen
const NACHSCHUB_PRO_S = 1.1;    // Pigment pro Sekunde beim Halten
const STOSS = 0.8;              // kleiner Druckimpuls, damit der Klecks Platz macht
const STOSS_PRO_S = 1.5;

export const giessen = {
  id: 'giessen',
  name: 'Gießen',
  hinweis: 'Klicken für einen Klecks — halten schüttet mehr nach',
  icon: '<path d="M12 3c2.6 4.2 4.2 6.5 4.2 8.5a4.2 4.2 0 0 1-8.4 0C7.8 9.5 9.4 7.2 12 3z"/><path d="M4 19.5c3 1.4 13 1.4 16 0"/>',

  onDown(ctx) {
    ctx.pinsel.farbe(ctx.zeiger.x, ctx.zeiger.y, ctx.cmy, RADIUS_CM, KLECKS_MENGE);
    ctx.pinsel.radial(ctx.zeiger.x, ctx.zeiger.y, STOSS, RADIUS_CM * 1.6);
    ctx.audio?.plopp();
  },

  tick(ctx, dt) {
    const z = ctx.zeiger;
    if (!z.gedrueckt) return;
    const radius = RADIUS_CM + Math.min(z.haltezeit * WACHSTUM_CM_PRO_S, MAX_ZUWACHS_CM);
    ctx.pinsel.farbe(z.x, z.y, ctx.cmy, radius, NACHSCHUB_PRO_S * dt);
    ctx.pinsel.radial(z.x, z.y, STOSS_PRO_S * dt, radius * 1.4);
    ctx.audio?.giessen(dt);
  },
};
