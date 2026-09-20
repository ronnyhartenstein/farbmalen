// Die Abzeichen-Übersicht (#11): zwei Spalten (Farbe/Wasser), je mit Gesamtmenge
// und einer Liste aus erreichten und noch gesperrten Abzeichen. Reine Trophäen ohne
// Spielauswirkung — anders als src/ui/fortschritt.js, das schaltet echt etwas frei.
// Dazu eine kleine Dauer-Anzeige im Reglerblock, die immer (nicht erst im Overlay)
// die aktuelle Gesamtmenge zeigt.

import {
  FARBE_ABZEICHEN,
  WASSER_ABZEICHEN,
  ML_PRO_EINHEIT,
  einheitenZuMl,
  anzahlErreicht,
  formatiereMl,
} from '../abzeichen.js';

export function createAbzeichenUI(state, { melde, audio }) {
  const overlay = document.getElementById('abzeichen');
  const farbeGesamtEl = document.getElementById('abzeichen-farbe-gesamt');
  const wasserGesamtEl = document.getElementById('abzeichen-wasser-gesamt');
  const farbeListeEl = document.getElementById('abzeichen-farbe-liste');
  const wasserListeEl = document.getElementById('abzeichen-wasser-liste');
  const zeileEl = document.getElementById('r-abzeichen-zeile');

  let farbeErreicht = anzahlErreicht(einheitenZuMl(state.farbPunkteGesamt), FARBE_ABZEICHEN);
  let wasserErreicht = anzahlErreicht(einheitenZuMl(state.wasserEinheitenGesamt), WASSER_ABZEICHEN);
  let letzteZeile = '';

  function baueListe(el, liste, ml) {
    el.innerHTML = '';
    for (const a of liste) {
      const erreicht = ml >= a.ml;
      const li = document.createElement('li');
      li.className = `abzeichen-eintrag${erreicht ? ' abzeichen-erreicht' : ''}`;
      li.innerHTML =
        `<span class="abzeichen-marke" aria-hidden="true">${erreicht ? '✓' : '🔒'}</span>` +
        `<span class="abzeichen-titel">${a.titel}</span>` +
        `<span class="abzeichen-schwelle">${formatiereMl(a.ml)}</span>`;
      el.appendChild(li);
    }
  }

  function aktualisiereOverlay(mlFarbe, mlWasser) {
    farbeGesamtEl.textContent = formatiereMl(mlFarbe);
    wasserGesamtEl.textContent = formatiereMl(mlWasser);
    baueListe(farbeListeEl, FARBE_ABZEICHEN, mlFarbe);
    baueListe(wasserListeEl, WASSER_ABZEICHEN, mlWasser);
  }

  // Läuft jedes Bild (billig: zwei Umrechnungen + ein textContent, nur bei
  // tatsächlicher Änderung geschrieben) — die Zeile im Reglerblock soll live
  // mitlaufen, nicht erst beim Öffnen des Overlays aktuell werden.
  function aktualisiereZeile(mlFarbe, mlWasser) {
    const zeile = `Farbe ${formatiereMl(mlFarbe)} · Wasser ${formatiereMl(mlWasser)}`;
    if (zeile !== letzteZeile) {
      zeileEl.textContent = zeile;
      letzteZeile = zeile;
    }
  }

  function oeffnen() {
    aktualisiereOverlay(einheitenZuMl(state.farbPunkteGesamt), einheitenZuMl(state.wasserEinheitenGesamt));
    overlay.hidden = false;
  }

  function schliessen() {
    overlay.hidden = true;
  }

  document.getElementById('abzeichen-zu').addEventListener('click', schliessen);

  function melden(titel) {
    melde(`Abzeichen: ${titel}!`);
    audio?.abzeichen();
  }

  function pruefeAbzeichen() {
    const mlFarbe = einheitenZuMl(state.farbPunkteGesamt);
    const mlWasser = einheitenZuMl(state.wasserEinheitenGesamt);
    aktualisiereZeile(mlFarbe, mlWasser);

    const neueFarbe = anzahlErreicht(mlFarbe, FARBE_ABZEICHEN);
    const neuesWasser = anzahlErreicht(mlWasser, WASSER_ABZEICHEN);
    if (neueFarbe === farbeErreicht && neuesWasser === wasserErreicht) return;

    for (let i = farbeErreicht; i < neueFarbe; i++) melden(FARBE_ABZEICHEN[i].titel);
    for (let i = wasserErreicht; i < neuesWasser; i++) melden(WASSER_ABZEICHEN[i].titel);
    farbeErreicht = neueFarbe;
    wasserErreicht = neuesWasser;
    state.speichern();
    if (!overlay.hidden) aktualisiereOverlay(mlFarbe, mlWasser);
  }

  // Nur zum Testen (?debug=1): setzt den jeweiligen Zähler auf mindestens die
  // Schwelle dieses Abzeichens und löst die normale Prüfung aus — Toast, Ton und
  // Dauer-Anzeige laufen exakt wie im echten Spiel. Geht nur vorwärts, wie
  // fortschritt.js' testeStufe().
  function testeFarbe(index) {
    const ziel = FARBE_ABZEICHEN[index].ml / ML_PRO_EINHEIT;
    if (ziel > state.farbPunkteGesamt) state.farbPunkteGesamt = ziel;
    pruefeAbzeichen();
  }

  function testeWasser(index) {
    const ziel = WASSER_ABZEICHEN[index].ml / ML_PRO_EINHEIT;
    if (ziel > state.wasserEinheitenGesamt) state.wasserEinheitenGesamt = ziel;
    pruefeAbzeichen();
  }

  aktualisiereZeile(einheitenZuMl(state.farbPunkteGesamt), einheitenZuMl(state.wasserEinheitenGesamt));

  return {
    pruefeAbzeichen,
    oeffnen,
    schliessen,
    testeFarbe,
    testeWasser,
    get offen() { return !overlay.hidden; },
  };
}
