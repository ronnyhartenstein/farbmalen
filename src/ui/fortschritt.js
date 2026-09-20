// Der Fortschrittsbalken: zeigt das aktuelle Level und erkennt Levelaufstiege.
//
// Prüft jedes Bild, ob state.farbPunkteGesamt eine neue Stufe überschritten hat
// (levelVon() ist rein aus der Punktzahl abgeleitet, kein gespeicherter Zustand).
// Bei einem Aufstieg: Toast, Bildschirmblitz, Ton, und die neu freigeschalteten
// Werkzeuge/Farben/Einstellungen live nachreichen — ganz ohne Neuladen.

import { levelVon, naechsteStufe, stufeVon } from '../fortschritt.js';

export function createFortschritt(state, { melde, blitzen, audio, toolbar, palette, regler }) {
  const box = document.getElementById('fortschritt');
  const fuellung = document.getElementById('fortschritt-fuellung');
  const beschriftung = document.getElementById('fortschritt-text');

  let letztesLevel = levelVon(state.farbPunkteGesamt);

  function anzeigen(level, punkte) {
    const stufe = naechsteStufe(level);
    if (!stufe) {
      fuellung.style.width = '100%';
      beschriftung.textContent = `Level ${level} — alles freigeschaltet`;
      return;
    }
    const vorherigeSchwelle = level >= 1 ? naechsteStufe(level - 1)?.punkte ?? 0 : 0;
    const anteil = (punkte - vorherigeSchwelle) / (stufe.punkte - vorherigeSchwelle);
    fuellung.style.width = `${Math.max(0, Math.min(1, anteil)) * 100}%`;
    beschriftung.textContent = `Level ${level}`;
  }

  function freischalten(stufe) {
    if (stufe.werkzeug) toolbar.zeigeNeuesWerkzeug(stufe.werkzeug);
    for (const i of stufe.farben ?? []) palette.zeigeNeueFarbe(i);
    if (stufe.einstellung) regler.zeigeEinstellung(stufe.einstellung);
  }

  function pruefeLevelaufstieg() {
    const level = levelVon(state.farbPunkteGesamt);
    if (level === letztesLevel) {
      anzeigen(level, state.farbPunkteGesamt);
      return;
    }
    // Mehrere Stufen auf einmal sind selten, aber möglich (z. B. ein sehr großer
    // Pinselzug) — jede einzeln freischalten, damit nichts übersprungen wird.
    for (let l = letztesLevel + 1; l <= level; l++) {
      const stufe = stufeVon(l);
      if (!stufe) continue;
      freischalten(stufe);
      melde(`Level ${l}! ${stufe.titel} freigeschaltet`);
    }
    blitzen();
    audio?.levelAuf();
    letztesLevel = level;
    anzeigen(level, state.farbPunkteGesamt);
    state.speichern();
  }

  anzeigen(letztesLevel, state.farbPunkteGesamt);
  box.hidden = false;

  return { pruefeLevelaufstieg };
}
