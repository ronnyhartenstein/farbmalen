// Die Abzeichen-Übersicht (#11): zwei Spalten (Farbe/Wasser), je mit Gesamtmenge
// und einer Liste aus erreichten und noch gesperrten Abzeichen. Reine Trophäen ohne
// Spielauswirkung — anders als src/ui/fortschritt.js, das schaltet echt etwas frei.

import {
  FARBE_ABZEICHEN,
  WASSER_ABZEICHEN,
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

  let farbeErreicht = anzahlErreicht(einheitenZuMl(state.farbPunkteGesamt), FARBE_ABZEICHEN);
  let wasserErreicht = anzahlErreicht(einheitenZuMl(state.wasserEinheitenGesamt), WASSER_ABZEICHEN);

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

  function aktualisieren() {
    const mlFarbe = einheitenZuMl(state.farbPunkteGesamt);
    const mlWasser = einheitenZuMl(state.wasserEinheitenGesamt);
    farbeGesamtEl.textContent = formatiereMl(mlFarbe);
    wasserGesamtEl.textContent = formatiereMl(mlWasser);
    baueListe(farbeListeEl, FARBE_ABZEICHEN, mlFarbe);
    baueListe(wasserListeEl, WASSER_ABZEICHEN, mlWasser);
  }

  function oeffnen() {
    aktualisieren();
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
    const neueFarbe = anzahlErreicht(einheitenZuMl(state.farbPunkteGesamt), FARBE_ABZEICHEN);
    const neuesWasser = anzahlErreicht(einheitenZuMl(state.wasserEinheitenGesamt), WASSER_ABZEICHEN);
    if (neueFarbe === farbeErreicht && neuesWasser === wasserErreicht) return;

    for (let i = farbeErreicht; i < neueFarbe; i++) melden(FARBE_ABZEICHEN[i].titel);
    for (let i = wasserErreicht; i < neuesWasser; i++) melden(WASSER_ABZEICHEN[i].titel);
    farbeErreicht = neueFarbe;
    wasserErreicht = neuesWasser;
    state.speichern();
    if (!overlay.hidden) aktualisieren();
  }

  return {
    pruefeAbzeichen,
    oeffnen,
    schliessen,
    get offen() { return !overlay.hidden; },
  };
}
