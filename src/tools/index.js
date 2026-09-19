// Werkzeugkasten. Die Reihenfolge ist auch die Tastenbelegung 1…8.

import { giessen } from './giessen.js';
import { pinsel } from './pinsel.js';
import { schaber } from './schaber.js';
import { ruehrer } from './ruehrer.js';
import { rechen } from './rechen.js';
import { pusten } from './pusten.js';
import { seife } from './seife.js';
import { wasser } from './wasser.js';

export const WERKZEUGE = [giessen, pinsel, schaber, ruehrer, rechen, pusten, seife, wasser];

export function werkzeugNach(id) {
  return WERKZEUGE.find((w) => w.id === id) || WERKZEUGE[0];
}

// Schütteln (Leertaste): die ganze Wanne einmal durchschwappen lassen.
// Ein paar große, gegenläufige Wirbel sehen lebendiger aus als reiner Zufall.
export function schuetteln(pinselkopf, wucht = 1) {
  const wirbel = 5;
  for (let i = 0; i < wirbel; i++) {
    const x = 0.15 + Math.random() * 0.7;
    const y = 0.15 + Math.random() * 0.7;
    const richtung = i % 2 === 0 ? 1 : -1;
    pinselkopf.wirbel(x, y, 1.2 * wucht * richtung, 2.6);
  }
  for (let i = 0; i < 4; i++) {
    const winkel = Math.random() * Math.PI * 2;
    pinselkopf.schub(
      0.2 + Math.random() * 0.6,
      0.2 + Math.random() * 0.6,
      Math.cos(winkel) * 0.02,
      Math.sin(winkel) * 0.02,
      90 * wucht,
      2.0
    );
  }
}
