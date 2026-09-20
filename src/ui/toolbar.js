// Werkzeugleiste links und Reglerblock rechts oben.
//
// Level & Freischaltungen (#12): Noch nicht freigeschaltete Werkzeuge existieren
// hier schlicht nicht — kein Ausgrauen, kein Schloss-Symbol. `zeigeNeuesWerkzeug()`
// hängt beim Freischalten einen neuen Button ans Ende an. Die Zifferntasten zeigen
// deshalb auf die aktuell SICHTBARE Reihenfolge, nicht auf die statische Registry
// WERKZEUGE aus tools/index.js (die bleibt ein reines Nachschlagewerk).

import { werkzeugNach } from '../tools/index.js';

const SPIEGELSTUFEN = [1, 2, 4, 6];

export function createToolbar(state, aktionen, sichtbareIds) {
  const leiste = document.getElementById('werkzeuge');
  const hinweis = document.getElementById('werkzeughinweis');
  const knoepfe = new Map();
  const sichtbar = []; // Ids in Anzeigereihenfolge — bestimmt die Zifferntasten.

  function bauKnopf(w, i) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'werkzeug werkzeug--neu';
    b.setAttribute('aria-pressed', 'false');
    b.title = `${w.name} (Taste ${i + 1})`;
    b.innerHTML =
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ` +
      `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${w.icon}</svg>` +
      `<span>${w.name}</span>`;
    b.addEventListener('click', () => waehle(w.id));
    leiste.appendChild(b);
    knoepfe.set(w.id, b);
    setTimeout(() => b.classList.remove('werkzeug--neu'), 500);
    return b;
  }

  function fuegeHinzu(id) {
    const w = werkzeugNach(id);
    if (!w || knoepfe.has(id)) return;
    sichtbar.push(id);
    bauKnopf(w, sichtbar.length - 1);
    aktualisiereTastenTitel();
  }

  // Tastenhinweis im Tooltip neu nummerieren, falls sich die sichtbare Reihenfolge
  // ändert (passiert nur beim allerersten Aufbau — Freischaltungen hängen nur an).
  function aktualisiereTastenTitel() {
    sichtbar.forEach((id, i) => {
      const w = werkzeugNach(id);
      const b = knoepfe.get(id);
      if (b && w) b.title = `${w.name} (Taste ${i + 1})`;
    });
  }

  for (const id of sichtbareIds) fuegeHinzu(id);
  // Die Startwerkzeuge müssen nicht "neu auftauchen" — schon beim ersten Bild da.
  for (const b of knoepfe.values()) b.classList.remove('werkzeug--neu');

  function waehle(id) {
    const w = werkzeugNach(id);
    if (!w || !knoepfe.has(id)) return; // nicht sichtbar/freigeschaltet → ignorieren
    state.werkzeug = id;
    for (const [k, b] of knoepfe) b.setAttribute('aria-pressed', String(k === id));
    hinweis.textContent = w.hinweis;
    aktionen.beiWechsel?.();
  }

  // Taste N wählt das N-te SICHTBARE Werkzeug, nicht WERKZEUGE[N].
  function waehleIndex(i) {
    if (sichtbar[i]) waehle(sichtbar[i]);
  }

  waehle(state.werkzeug);
  return { waehle, waehleIndex, zeigeNeuesWerkzeug: fuegeHinzu };
}

export function createRegler(state, aktionen) {
  const box = document.getElementById('regler');

  // Level & Freischaltungen (#12): Nässe, Spiegel, Glitzer und Abklatsch/Galerie
  // sind Spielinhalt und starten hinter `hidden`, genau wie die Werkzeug-
  // Einstellungen weiter unten — `zeigeBlock()`/`zeigeEinstellung()` heben es beim
  // Freischalten auf. Ton, Neues Blatt und Vollbild sind reine Bedienelemente und
  // bleiben immer da, sonst könnte ein Kind nicht mal eben den Ton abstellen oder
  // ein misslungenes Bild wegwischen — deshalb auch ohne Info-Knopf, selbsterklärend.
  //
  // Jeder Inhalts-Regler bekommt ein kleines "i" mit `data-info`-Erklärtext,
  // aufklappbar per infoPopover() weiter unten.
  box.innerHTML = `
    <div id="r-block-spiegel" class="regler-einstellung" hidden>
      <p class="regler-titel">Spiegel
        <button class="info-knopf" type="button" aria-label="Was macht Spiegel?"
          data-info="Spiegelt jeden Strich mehrfach um die Mitte — aus jedem Klecks wird ein Muster wie im Kaleidoskop.">i</button>
      </p>
      <div class="knopfreihe" id="r-spiegel"></div>
    </div>

    <div id="r-block-naesse" class="regler-einstellung" hidden>
      <p class="regler-titel">Nässe
        <button class="info-knopf" type="button" aria-label="Was macht Nässe?"
          data-info="Wie nass die Farbe ist: rechts läuft sie schneller ineinander, links bleibt sie länger so, wie sie ist.">i</button>
      </p>
      <input id="r-naesse" type="range" min="0" max="100" step="1" aria-label="Nässe">
    </div>

    <div id="r-block-glitzer" class="regler-einstellung" hidden>
      <p class="regler-titel">Glitzer
        <button class="info-knopf" type="button" aria-label="Was macht Glitzer?"
          data-info="Streut glitzernde Punkte in die Farbe, die mit der Strömung mitschwimmen.">i</button>
      </p>
      <button id="r-glitzer" class="knopf knopf-breit" type="button" aria-pressed="false">An/Aus</button>
    </div>

    <div id="r-block-abklatsch" class="regler-einstellung" hidden>
      <p class="regler-titel">Abklatsch
        <button class="info-knopf" type="button" aria-label="Was macht Papier auflegen?"
          data-info="„Papier auflegen” hält dein Bild fest und legt es in die Galerie — dort kannst du es dir später wieder ansehen.">i</button>
      </p>
      <button id="r-abklatsch" class="knopf knopf-breit" type="button">Papier auflegen</button>
      <button id="r-galerie" class="knopf knopf-breit" type="button">Galerie</button>
    </div>

    <div id="r-einstellung-pinselDicke" class="regler-einstellung" hidden>
      <p class="regler-titel">Pinsel-Dicke
        <button class="info-knopf" type="button" aria-label="Was macht Pinsel-Dicke?"
          data-info="Wie breit der Pinsel malt.">i</button>
      </p>
      <input id="r-pinselDicke" type="range" min="40" max="220" step="5" aria-label="Pinsel-Dicke">
    </div>

    <div id="r-einstellung-ruehrerTempo" class="regler-einstellung" hidden>
      <p class="regler-titel">Rührer-Tempo
        <button class="info-knopf" type="button" aria-label="Was macht Rührer-Tempo?"
          data-info="Wie schnell sich der Rührer dreht.">i</button>
      </p>
      <input id="r-ruehrerTempo" type="range" min="40" max="220" step="5" aria-label="Rührer-Tempo">
    </div>

    <button id="r-ton" class="knopf knopf-breit" type="button" aria-pressed="true">Ton</button>

    <div class="regler-einstellung">
      <p id="r-abzeichen-zeile" class="regler-abzeichen-zeile">Farbe 0 ml · Wasser 0 ml</p>
      <button id="r-abzeichen" class="knopf knopf-breit" type="button">Abzeichen</button>
    </div>

    <button id="r-tintenwaechter" class="knopf knopf-breit" type="button">Tintenwächter</button>

    <button id="r-neu" class="knopf knopf-breit" type="button">Neues Blatt</button>
    <button id="r-vollbild" class="knopf knopf-breit" type="button">Vollbild</button>
  `;

  // --- Info-Popover: ein "i" zeigt eine kurze Erklärung, Klick woanders schließt sie. ---
  const infoPopover = document.getElementById('info-popover');
  let offenerInfoKnopf = null;

  function zeigeInfo(knopf) {
    infoPopover.textContent = knopf.dataset.info;
    infoPopover.hidden = false;
    const r = knopf.getBoundingClientRect();
    const breite = 220;
    const links = Math.min(Math.max(12, r.left), window.innerWidth - breite - 12);
    infoPopover.style.left = `${links}px`;
    infoPopover.style.top = `${r.bottom + 8}px`;
    offenerInfoKnopf = knopf;
  }

  function versteckeInfo() {
    infoPopover.hidden = true;
    offenerInfoKnopf = null;
  }

  box.addEventListener('click', (ev) => {
    const knopf = ev.target.closest('.info-knopf');
    if (!knopf) return;
    ev.stopPropagation();
    if (offenerInfoKnopf === knopf) versteckeInfo();
    else zeigeInfo(knopf);
  });
  document.addEventListener('click', versteckeInfo);
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') versteckeInfo(); });

  const spiegelBox = box.querySelector('#r-spiegel');
  const spiegelKnoepfe = SPIEGELSTUFEN.map((n) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'knopf';
    b.textContent = n === 1 ? 'aus' : String(n);
    b.title = n === 1 ? 'Ohne Spiegelung' : `${n}-fach gespiegelt`;
    b.addEventListener('click', () => setzeSpiegel(n));
    spiegelBox.appendChild(b);
    return { n, b };
  });

  function setzeSpiegel(n) {
    state.symmetrie = n;
    state.speichern();
    for (const s of spiegelKnoepfe) s.b.setAttribute('aria-pressed', String(s.n === n));
    aktionen.beiWechsel?.();
  }

  const naesse = box.querySelector('#r-naesse');
  naesse.addEventListener('input', () => {
    // Regler ist gefühlt linear, die Diffusion darunter wächst quadratisch.
    const t = Number(naesse.value) / 100;
    state.naesse = 0.02 + t * t * 0.55;
    state.speichern();
  });

  // Freischaltbare Werkzeug-Einstellungen (#12): Regler in Prozent (40–220 %),
  // Grundzustand = 100 % = heutiges getuntes Verhalten.
  function bindeEinstellung(name, eingabeId) {
    const eingabe = box.querySelector(`#${eingabeId}`);
    eingabe.value = String(Math.round((state.werkzeugEinstellungen[name] ?? 1) * 100));
    eingabe.addEventListener('input', () => {
      state.werkzeugEinstellungen[name] = Number(eingabe.value) / 100;
      state.speichern();
    });
  }
  bindeEinstellung('pinselDicke', 'r-pinselDicke');
  bindeEinstellung('ruehrerTempo', 'r-ruehrerTempo');

  function zeigeEinstellung(name) {
    const block = box.querySelector(`#r-einstellung-${name}`);
    if (block) block.hidden = false;
  }

  // Für reglerBloecke aus der Stufentabelle: nimmt die DOM-Id direkt entgegen
  // (kein Namens-Präfix wie bei zeigeEinstellung), damit fortschritt.js nicht
  // wissen muss, wie die Regler-Ids intern aufgebaut sind.
  function zeigeBlock(id) {
    const el = box.querySelector(`#${id}`);
    if (el) el.hidden = false;
  }

  const glitzer = box.querySelector('#r-glitzer');
  glitzer.addEventListener('click', () => {
    state.glitzer = !state.glitzer;
    glitzer.setAttribute('aria-pressed', String(state.glitzer));
    state.speichern();
    aktionen.beiWechsel?.();
  });

  const ton = box.querySelector('#r-ton');
  ton.addEventListener('click', () => {
    state.ton = !state.ton;
    ton.setAttribute('aria-pressed', String(state.ton));
    state.speichern();
    if (state.ton) aktionen.beiWechsel?.();
  });

  box.querySelector('#r-abklatsch').addEventListener('click', () => aktionen.abklatsch?.());
  box.querySelector('#r-galerie').addEventListener('click', () => aktionen.galerie?.());
  box.querySelector('#r-abzeichen').addEventListener('click', () => aktionen.abzeichen?.());
  box.querySelector('#r-tintenwaechter').addEventListener('click', () => aktionen.tintenwaechter?.());
  box.querySelector('#r-neu').addEventListener('click', () => aktionen.neuesBlatt?.());
  box.querySelector('#r-vollbild').addEventListener('click', () => aktionen.vollbild?.());

  // Anfangszustand aus dem gespeicherten state spiegeln.
  setzeSpiegel(state.symmetrie);
  naesse.value = String(Math.round(Math.sqrt(Math.max(state.naesse - 0.02, 0) / 0.55) * 100));
  glitzer.setAttribute('aria-pressed', String(state.glitzer));
  ton.setAttribute('aria-pressed', String(state.ton));

  return { setzeSpiegel, zeigeEinstellung, zeigeBlock };
}
