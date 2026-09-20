// Der Fortschrittsbalken: zeigt das aktuelle Level und erkennt Levelaufstiege.
//
// Prüft jedes Bild, ob state.farbPunkteGesamt eine neue Stufe überschritten hat
// (levelVon() ist rein aus der Punktzahl abgeleitet, kein gespeicherter Zustand).
//
// Ein Levelaufstieg wird nicht sofort "ausgeliefert": Der Balken springt zwar direkt
// auf das neue Level, aber die eigentliche Freischaltung (neuer Werkzeug-Button,
// neue Farben, neuer Regler) wartet auf das Popup — erst wenn draufgeklickt wird,
// poppt der neue Button sichtbar in der Leiste auf, während man zur Leinwand
// zurückkommt. Mehrere Stufen auf einmal (seltener großer Sprung) werden nacheinander
// gezeigt, eine Warteschlange.

import { levelVon, naechsteStufe, stufeVon } from '../fortschritt.js';
import { werkzeugNach } from '../tools/index.js';
import { PALETTE } from '../palette.js';

const KLICK_WOERTER = ['Wohoo!', 'Yeah!', 'Klasse!'];

export function createFortschritt(state, { melde, blitzen, audio, toolbar, palette, regler }) {
  const box = document.getElementById('fortschritt');
  const fuellung = document.getElementById('fortschritt-fuellung');
  const beschriftung = document.getElementById('fortschritt-text');

  const popup = document.getElementById('levelup');
  const popupLevel = document.getElementById('levelup-level');
  const popupWerkzeugBlock = document.getElementById('levelup-werkzeug');
  const popupIcon = document.getElementById('levelup-icon');
  const popupWerkzeugName = document.getElementById('levelup-werkzeugname');
  const popupText = document.getElementById('levelup-text');
  const popupFarben = document.getElementById('levelup-farben');
  const popupKnopf = document.getElementById('levelup-knopf');

  let letztesLevel = levelVon(state.farbPunkteGesamt);
  const warteschlange = []; // { level, stufe } — noch nicht per Klick bestätigt

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

  // Macht das, was die Stufe verspricht, tatsächlich sichtbar — erst hier, nicht
  // schon beim Erkennen des Levelaufstiegs.
  function freischalten(stufe) {
    if (stufe.werkzeug) toolbar.zeigeNeuesWerkzeug(stufe.werkzeug);
    for (const i of stufe.farben ?? []) palette.zeigeNeueFarbe(i);
    if (stufe.einstellung) regler.zeigeEinstellung(stufe.einstellung);
    for (const id of stufe.reglerBloecke ?? []) regler.zeigeBlock(id);
  }

  function zeigePopup(level, stufe) {
    popupLevel.textContent = String(level);
    popupText.textContent = stufe.text ?? '';

    if (stufe.werkzeug) {
      const w = werkzeugNach(stufe.werkzeug);
      popupIcon.innerHTML = w.icon;
      popupWerkzeugName.textContent = w.name;
      popupWerkzeugBlock.hidden = false;
    } else {
      popupWerkzeugBlock.hidden = true;
    }

    popupFarben.innerHTML = '';
    for (const i of stufe.farben ?? []) {
      const farbe = PALETTE[i];
      const k = document.createElement('span');
      k.className = 'levelup-klecks';
      k.style.background = farbe.hex;
      k.title = farbe.name;
      popupFarben.appendChild(k);
    }

    popupKnopf.textContent = KLICK_WOERTER[Math.floor(Math.random() * KLICK_WOERTER.length)];
    popup.hidden = false;

    // Der Tada-Moment ist das Erscheinen, nicht das Bestätigen — der Klick
    // danach ist nur noch eine ruhige, leise Zustimmung.
    blitzen();
    audio?.levelAuf();
  }

  popupKnopf.addEventListener('click', () => {
    const eintrag = warteschlange.shift();
    if (eintrag) {
      freischalten(eintrag.stufe);
      audio?.klick();
      melde(`Level ${eintrag.level}! ${eintrag.stufe.titel} freigeschaltet`);
      state.speichern();
    }
    if (warteschlange.length > 0) {
      const naechster = warteschlange[0];
      zeigePopup(naechster.level, naechster.stufe);
    } else {
      popup.hidden = true;
    }
  });

  function pruefeLevelaufstieg() {
    const level = levelVon(state.farbPunkteGesamt);
    if (level !== letztesLevel) {
      const warSchonOffen = warteschlange.length > 0;
      for (let l = letztesLevel + 1; l <= level; l++) {
        const stufe = stufeVon(l);
        if (stufe) warteschlange.push({ level: l, stufe });
      }
      letztesLevel = level;
      if (!warSchonOffen && warteschlange.length > 0) {
        zeigePopup(warteschlange[0].level, warteschlange[0].stufe);
      }
    }
    anzeigen(level, state.farbPunkteGesamt);
  }

  // Nur zum Testen (?debug=1): springt wirklich auf diese Stufe — setzt die echten
  // Punkte auf ihre Schwelle, holt übersprungene Zwischenstufen still nach (wie beim
  // Laden eines weit fortgeschrittenen Spielstands, ohne deren Popups zu zeigen) und
  // stößt dann den echten Levelaufstieg an. Der Klick auf "Wohoo!" schaltet also
  // wirklich frei und speichert — kein reiner Anschauknopf. Geht nur vorwärts: schon
  // erreichte Stufen werden nicht rückgängig gemacht, ein zweiter Klick auf eine
  // längst bestandene Stufe zeigt daher nichts noch mal an.
  function testeStufe(level) {
    const stufe = stufeVon(level);
    if (!stufe || state.farbPunkteGesamt >= stufe.punkte) return;
    for (let l = letztesLevel + 1; l < level; l++) {
      const zwischenstufe = stufeVon(l);
      if (zwischenstufe) freischalten(zwischenstufe);
    }
    letztesLevel = level - 1;
    state.farbPunkteGesamt = stufe.punkte;
    state.speichern();
    pruefeLevelaufstieg();
  }

  anzeigen(letztesLevel, state.farbPunkteGesamt);
  box.hidden = false;

  return { pruefeLevelaufstieg, testeStufe };
}
