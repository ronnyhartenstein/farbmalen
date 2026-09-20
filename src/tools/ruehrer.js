// Rührer — dreht auf niedriger Geschwindigkeit. Solange gedrückt wird, wirbelt es.

const STAERKE_PRO_S = 1.5;    // gemessen: gut 45° Drehung pro Sekunde — gemächlich, aber sichtbar
const ANLAUF_S = 0.6;         // kommt sanft auf Touren
const RADIUS_CM = 1.3;
const SOG = 0.8;              // zieht ein wenig zusammen, sonst franst der Wirbel aus

export const ruehrer = {
  id: 'ruehrer',
  name: 'Rührer',
  hinweis: 'Gedrückt halten — dreht langsam und zieht Farben spiralig ineinander',
  icon: '<path d="M20.5 12a8.5 8.5 0 1 1-3.2-6.6"/><path d="M20.5 3.8v5.2h-5.2"/><circle cx="12" cy="12" r="1.6"/>',

  tick(ctx, dt) {
    const z = ctx.zeiger;
    if (!z.gedrueckt) return;
    // Freischaltbare Einstellung (#12, ab Level 7): 1 = heutiges, getuntes Tempo.
    const tempo = ctx.state.werkzeugEinstellungen?.ruehrerTempo ?? 1;
    const anlauf = Math.min(z.haltezeit / ANLAUF_S, 1);
    ctx.pinsel.wirbel(z.x, z.y, STAERKE_PRO_S * tempo * anlauf * dt, RADIUS_CM);
    ctx.pinsel.radial(z.x, z.y, -SOG * anlauf * dt, RADIUS_CM);
    ctx.audio?.ruehren(dt);
  },
};
