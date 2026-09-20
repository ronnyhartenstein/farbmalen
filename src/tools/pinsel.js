// Pinsel — zieht Farbe UND Strömung entlang des Strichs.
// Die Wucht hängt am Tempo: langsam malt, schnell schleudert.

const SPUR_CM = 0.3;      // Radius der Spur
const SCHRITT_CM = 0.22;  // Abstand der Stützpunkte, damit der Strich nicht perlt
const MAX_SCHRITTE = 8;
const MENGE_PRO_SCHRITT = 0.4;
const STAND_MENGE_PRO_S = 1.4;
const KRAFT = 16;       // gemessen: Farbe folgt dem Strich etwa 1:1

export const pinsel = {
  id: 'pinsel',
  name: 'Pinsel',
  hinweis: 'Ziehen — je schneller, desto mehr Schwung',
  icon: '<path d="M18 3l3 3-9 9-3-3z"/><path d="M9 12l-4.2 7.2L12 15"/>',

  tick(ctx, dt) {
    const z = ctx.zeiger;
    if (!z.gedrueckt) return;

    // Freischaltbare Einstellung (#12, ab Level 6): 1 = heutige, getunte Dicke.
    const dicke = ctx.state.werkzeugEinstellungen?.pinselDicke ?? 1;
    const spurCm = SPUR_CM * dicke;

    const strecke = Math.hypot(z.dx, z.dy);
    const schritt = ctx.state.cmToUv(SCHRITT_CM);

    if (strecke < schritt * 0.5) {
      // Stehender Pinsel tropft trotzdem.
      ctx.pinsel.farbe(z.x, z.y, ctx.cmy, spurCm, STAND_MENGE_PRO_S * dt);
      return;
    }

    const n = Math.min(Math.ceil(strecke / schritt), MAX_SCHRITTE);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      ctx.pinsel.farbe(
        z.px + z.dx * t,
        z.py + z.dy * t,
        ctx.cmy,
        spurCm,
        MENGE_PRO_SCHRITT
      );
    }
    ctx.pinsel.schub(z.x, z.y, z.dx, z.dy, KRAFT, spurCm * 1.8);
    ctx.audio?.streichen(strecke, dt);
  },
};
