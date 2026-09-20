# Farbmalen

Farbe in eine Wanne gießen, zusehen wie sie zerläuft, mit Rührer und Rechen darin
herumfahren, bis sich alles marmoriert. Kein Wettbewerb, kein Scheitern — aber wer
malt, schaltet nach und nach mehr frei: ein digitaler Marmorierteller zum Spielen,
der mitwächst.

**→ [Jetzt spielen](http://blog.rh-flow.de/farbmalen/)**

## Starten

Es gibt nichts zu installieren und nichts zu bauen. Nur ein Server muss her, weil
der Browser ES-Module nicht von `file://` lädt:

```bash
docker compose up -d      # → http://localhost:8080
# oder ohne Docker:
python3 -m http.server 8080
```

Mit `?debug=1` erscheint eine Anzeige mit Bildrate und Gitterauflösungen.

## Bedienung

| Werkzeug | Was es tut |
|---|---|
| **Gießen** | Klick = ein Klecks von ca. 1 cm. Gedrückt halten schüttet nach: die Pfütze wächst und drückt die Nachbarn weg. |
| **Pinsel** | Zieht Farbe und Strömung entlang des Strichs. Je schneller, desto mehr Schwung. |
| **Wasser** | Verdünnt das Pigment — zum Aufhellen und Wegwischen. |
| **Rechen** | Sieben Zinken quer zur Bewegung — das ergibt das klassische Marmormuster. |
| **Rührer** | Dreht langsam und zieht Farben spiralig ineinander. |
| **Schaber** | Eine breite flache Kante, die Farbe zur Seite schiebt, ohne selbst welche aufzutragen. |
| **Pusten** | Bläst die Farbe nach außen, wie durch einen Strohhalm. |
| **Seife** | Ein Klick, und die Farbe flieht schlagartig. Der Milch-und-Lebensmittelfarbe-Versuch. |

Die ersten drei sind von Anfang an da, die übrigen fünf schalten sich beim Spielen
nach und nach frei (siehe unten). Zifferntasten `1`–`8` wählen das jeweils an dieser
Position **sichtbare** Werkzeug — welches das ist, wächst mit dem Fortschritt mit.

| Taste | Wirkung |
|---|---|
| `Leertaste` | Schütteln — die ganze Wanne schwappt durch |
| `C` | Neues Blatt (mit Rückfrage) |
| `S` | Papier auflegen (Abklatsch in die Galerie) |
| `G` | Galerie auf/zu |
| `F` | Vollbild |
| `M` | Ton an/aus |

Rechts oben außerdem: **Spiegel** macht aus jedem Strich sofort ein Mandala,
**Nässe** stellt ein, wie schnell die Farbe zerläuft, und **Glitzer** streut Partikel
ein, die auf der Strömung mitschwimmen.

## Wie es funktioniert

Kern ist eine echte Strömungssimulation auf der GPU (Stable Fluids nach Jos Stam,
WebGL2). Es gibt genau zwei Felder: **wohin fließt es** und **welches Pigment liegt wo**.
Werkzeuge schreiben ausschließlich in diese beiden Felder — deshalb funktioniert jedes
Werkzeug automatisch mit jeder Farbe und mit jedem anderen Werkzeug zusammen. Der Rührer
rührt, weil die Physik rührt, nicht weil jemand „Rühren" programmiert hat.

Zwei Entscheidungen prägen das Ergebnis:

- **Farbe mischt sich subtraktiv.** Das Farbfeld speichert optische Dichte (`-ln(rgb)`),
  nicht RGB. Beim Anzeigen wird per Beer-Lambert daraus wieder Licht. Dadurch ergibt
  Gelb + Türkis echtes Grün statt trübem Grau — wie im Tuschkasten und nicht wie bei
  zwei Taschenlampen.
- **Transport per MacCormack.** Einfaches Semi-Lagrange-Advektieren verwischt bei jedem
  Schritt; nach ein paar Sekunden Rühren wäre aus kräftiger Farbe Pastellnebel geworden.
  Die Hin-und-zurück-Korrektur hält die Marmorierfäden scharf.

Und `1 cm` ist wörtlich gemeint: Ein verstecktes `<div style="width:1cm">` wird
ausgemessen, alle Werkzeuggrößen sind in Zentimetern definiert. Mit dem Lineal am
Bildschirm nachprüfbar.

## Level & Freischaltungen

Gestartet wird mit Gießen, Pinsel, Wasser und fünf Grundfarben — genug für den
kompletten Mischzyklus. Jeder Tropfen aufgetragener Farbe (nicht Wasser) zählt zu
einer Punktzahl, die über eine Stufentabelle in ein Level übersetzt wird. Bei jedem
Levelaufstieg kommt etwas dazu: ein weiteres Werkzeug, ein bis zwei Farben, später
einstellbare Werkzeug-Parameter (Pinsel-Dicke, Rührer-Tempo).

Noch nicht Freigeschaltetes ist komplett unsichtbar — kein Ausgrauen, kein
Schloss-Symbol. Es taucht beim Freischalten live in der Werkzeugleiste bzw. Palette
auf, mit Toast, Bildschirmblitz und einem aufsteigenden Ton. Der Fortschrittsbalken
über der Farbpalette zeigt das aktuelle Level.

Die Stufentabelle steht in `src/fortschritt.js`, gemessen statt geraten: Erste Stufe
soll nach wenigen Sekunden fallen, nicht nach vielen Minuten — kalibriert über
`test/fortschritt.html` (siehe unten).

## Aufbau

```
index.html            Gerüst, style.css      Oberfläche
src/gl/               WebGL-Unterbau: Kontext, Shader, Renderziele
src/sim/fluid.js      Der Simulationsschritt
src/sim/splat.js      Einzige Stelle, an der Werkzeuge die Simulation berühren (inkl. Spiegelmodus)
src/sim/glitter.js    Glitzerpartikel per Transform Feedback
src/render/present.js Pigment → Licht, Papier, nasser Glanz
src/tools/            Ein Werkzeug = eine Datei mit onDown/tick/onUp
src/fortschritt.js    Stufentabelle: was ab welchem Level frei ist
src/ui/               Werkzeugleiste, Farbpalette, Galerie, Fortschrittsbalken
src/audio/sfx.js      Töne, komplett synthetisch (keine Audio-Dateien)
test/                 Prüfseiten, siehe unten
```

Ein neues Werkzeug braucht eine Datei in `src/tools/`, einen Eintrag in
`src/tools/index.js` (Registry) und einen Platz in `src/fortschritt.js`
(`STARTWERKZEUGE` oder eine Stufe) — sonst bleibt es unsichtbar, weil Leiste und
Tastenbelegung sich aus dem Freischaltstatus ergeben.

## Prüfseiten

Im Browser aufrufen (Server muss laufen), die Ergebnisse stehen als Text auf der Seite:

| Seite | Prüft |
|---|---|
| `test/messung.html` | Klecksbreite in cm, ob Gelb + Türkis grün wird, wie weit ein Klecks in 30 s zerläuft |
| `test/kraefte.html` | Wie weit jedes Werkzeug die Farbe tatsächlich bewegt — die Grundlage der Kraftkonstanten |
| `test/szenen.html` | Fertige Bilder: `?szene=marmor`, `?szene=mandala`, `?szene=werkzeuge` |
| `test/abklatsch.html` | Weg vom Zeichenpuffer in die Galerie samt Speicherüberlauf |
| `test/diagnose.html` | Ob dieser Browser alles kann, was die Simulation braucht — erste Anlaufstelle, wenn es irgendwo schwarz bleibt |
| `test/fortschritt.html` | Nach wie vielen Sekunden welches Level fällt, für verschiedene Spielweisen — Grundlage der Stufentabelle |

Die Seiten takten die Simulation selbst, statt auf `requestAnimationFrame` zu warten —
so laufen sie auch in einem headless gestarteten Browser durch.

## Voraussetzungen

WebGL2 mit Fließkomma-Renderzielen. Das können aktuelle Versionen von Chrome, Firefox
und Safari. Fehlt es, erscheint statt eines schwarzen Bildes ein Hinweis.
