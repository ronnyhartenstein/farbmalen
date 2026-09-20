# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Was das ist

Farbmalen ist eine Fluid-Marmorier-Simulation im Browser (Stable Fluids nach Jos Stam,
WebGL2, reines Vanilla-JS mit ES-Modulen, kein Framework, kein Build-Schritt). Details zu
Bedienung, Spielmechanik und Physik-Hintergrund stehen ausführlich in `README.md` — dort
nachlesen statt hier duplizieren.

## Starten & Prüfen

Kein `package.json`, kein `npm install`, kein Build. Nur ein Server wird gebraucht, weil
Browser ES-Module nicht von `file://` laden:

```bash
docker compose up -d      # → http://localhost:8080
# oder ohne Docker/node (auf dieser Maschine ist beides ohnehin nicht installiert):
python3 -m http.server 8080
```

Es gibt keine automatisierte Test-Suite. Verifikation läuft über die Prüfseiten unter
`test/*.html`, jeweils im Browser bei laufendem Server aufgerufen — die Ergebnisse stehen
als Text auf der Seite. Die Seiten takten die Simulation selbst statt auf
`requestAnimationFrame` zu warten, laufen also auch in einem headless gestarteten Browser
durch. Übersicht, welche Seite was prüft: siehe Abschnitt „Prüfseiten" in `README.md`.

`?debug=1` an der URL zeigt Bildrate/Gitterauflösung und Level-Sprungknöpfe; über die
Konsole geht das auch gezielt: `farbmalen.fortschritt.testeStufe(3)`.

## Architektur

**Datenfluss der Simulation** (nicht objektorientiert, sondern Funktionsfabriken, die
GL-Zustand kapseln und Plain-Objects mit Methoden zurückgeben):

- `src/sim/fluid.js` — der eigentliche Simulationsschritt (`step(dt, wetness)`): curl +
  vorticity confinement → Divergenz → Druck-Jacobi-Iteration → Gradient-Subtraktion
  (macht das Feld divergenzfrei) → Selbstadvektion der Geschwindigkeit → MacCormack-
  Advektion des Farbfelds. Es gibt genau zwei GPU-Felder: Geschwindigkeit und Pigment
  (als optische Dichte, nicht RGB — Beer-Lambert-Mischung, siehe README).
- `src/sim/splat.js` (`createPinsel`) — **die einzige Stelle**, an der Werkzeuge die
  Simulation berühren (Farbe/Wasser auftragen, Kraft/Wirbel/Radialstoß einspeisen). Hier
  sitzt auch der Spiegelmodus (Mandala): weil er auf der Eingabeseite ansetzt, gilt er
  automatisch für jedes Werkzeug, ohne dass ein Werkzeug davon weiß.
- `src/gl/` — WebGL-Unterbau: `context.js` (Kontext/Fähigkeitscheck), `fbo.js`
  (Framebuffer/Doppelpuffer), `program.js` (Shader-Programme, inkl. Transform Feedback),
  `shaders.js` (alle GLSL-Quellen als Strings).
- `src/render/present.js` — letzter Schritt, Pigmentdichte → sichtbares Licht (Beer-
  Lambert), Papierstruktur, nasser Glanz.
- `src/sim/glitter.js` — Glitzerpartikel als eigener Transform-Feedback-Kreislauf
  (Ping-Pong auf Vertex-Buffern statt Texturen), die auf dem Geschwindigkeitsfeld
  mitschwimmen.
- `src/sim/deckung.js` — Flächenabdeckung messen, ohne die Pipeline mit `readPixels` auf
  dem vollen Dye-Bild abzuwürgen: Downsample auf 24×18 Pixel vor dem Lesen.

**Werkzeuge** (`src/tools/*.js`): ein Werkzeug = eine Datei mit fester Form
(`{ id, name, hinweis, icon, onDown?, tick?, onUp? }`), die ausschließlich über den
`ctx.pinsel`-Kopf aus `splat.js` auf die Simulation wirkt. Registry ist
`src/tools/index.js` — die Array-Reihenfolge dort **ist zugleich** die Tastenbelegung
`1`–`8`. Ein neues Werkzeug braucht: Datei in `src/tools/`, Eintrag in
`src/tools/index.js`, Platz in `src/fortschritt.js` (`STARTWERKZEUGE` oder eine Stufe) —
sonst bleibt es unsichtbar, weil Werkzeugleiste und Tastenbelegung sich aus dem
Freischaltstatus ableiten.

**Fortschritt/Freischaltung**: `src/fortschritt.js` enthält die Stufentabelle (`STUFEN`)
— welches Werkzeug/welche Farbe/welcher Regler ab welchem Level erscheint. Das Level
selbst wird nie gespeichert, sondern immer aus `state.farbPunkteGesamt` über diese
Tabelle hergeleitet (Kurve bleibt so änderbar, ohne Spielstände zu migrieren). Kalibriert
über `test/fortschritt.html`. `src/abzeichen.js` ist das analoge, aber unabhängige
System für Mengen-Trophäen (verbrauchte Farbe/Wasser lebenslang), kalibriert über
`test/abzeichen.html`.

**Gemeinsamer State**: `src/state.js` — ein einziges Objekt, das UI umstellt und
Werkzeuge lesen (aktuelles Werkzeug, Farbe, Nässe, Symmetrie, Level-Fortschritt,
Werkzeug-Feineinstellungen). Persistiert flach nach `localStorage` über
`state.speichern()`/`state.laden()`. Enthält auch `cmToUv()` — alle Werkzeuggrößen sind
in Zentimetern definiert und werden anhand einer am Bildschirm gemessenen `cssPxProCm`
umgerechnet (kein geschätzter DPI-Wert).

**Arcade-Modus „Tintenwächter"** (`src/tintenwaechter.js` + `src/ui/tintenwaechter.js`):
architektonisches Vorbild für jeden weiteren eigenständigen Spielmodus. Läuft als
zweiter, komplett unabhängiger `createFluid()`-Lauf auf demselben WebGL-Kontext, mit
eigenem `createPinsel()` (Fake-`state`), der bestehende Werkzeuge (`wasser`, `schaber`)
unverändert wiederverwendet. Zwei-Ebenen-Statemachine `aktiv` (Overlay offen) vs.
`laeuft` (Runde tickt); `src/main.js` verzweigt den Frame-Loop und die Tastatur-Behandlung
danach. DOM ist statisch in `index.html` vorgebaut (`hidden`-Toggle), nicht dynamisch
erzeugt. `src/tintenwaechter.js` selbst ist reine Logik ohne DOM/GL-Abhängigkeit und über
`test/tintenwaechter.html` kalibrierbar.

**Einstiegspunkt**: `src/main.js` — `los(gl)` baut einmalig alle Subsysteme
(Fluid, Presenter, Glitzer, Pinselkopf, Zeiger-Input, Audio, Galerie, Tintenwächter,
UI-Leisten) und enthält den Frame-Loop sowie die globale Tastaturbehandlung.

## Wichtig für Änderungen

- Es gibt keine Build-/Lint-/Testautomatisierung in diesem Repo. Verifikation erfolgt
  manuell im Browser über die passende `test/*.html`-Seite oder die laufende App.
- Werkzeuge greifen nie direkt auf `fluid`, GL-Programme oder Shader zu — immer über
  `ctx.pinsel` (`src/sim/splat.js`). Das ist der Grund, warum jedes Werkzeug automatisch
  mit Spiegelmodus, jeder Farbe und jedem anderen Werkzeug zusammenspielt.
- Ein neuer eigenständiger Spielmodus folgt dem Tintenwächter-Muster (zweiter,
  unabhängiger `createFluid()`-Lauf statt Eingriff in die freie Simulation).

## Workflow-Konventionen

- Keine Test-Bots oder Automatisierung bauen. Der User testet neue Features
  ausschließlich selbst manuell im Browser — Automatisierung dafür kostet nur unnötig
  Zeit. Pläne sollen Verifikationsschritte als manuelle Browser-Checks beschreiben,
  nicht als Skripte/Bots.
- Wird ein fertiger, freigegebener Plan in ein bestehendes GitHub-Issue übernommen
  ("Issue-Inhalt ersetzen"), landet der Plan 1:1 zusammen mit dem ursprünglichen
  Original-Prompt/Issue-Text als neuer Issue-Inhalt (nicht nur verlinkt oder
  zusammengefasst).
