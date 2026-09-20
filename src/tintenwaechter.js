// Tintenwächter (#10): eigener Arcade-Modus, losgelöst vom Level-System — reine
// Freizeitidee, kein Zusammenhang mit #12/#11. Böse Tinte quillt aus festen Quellen
// und breitet sich aus; mit Wasser und Schaber muss die Fläche vor dem Überlaufen
// bewahrt werden. Entschieden: echte Herausforderung — auch aktive, beidhändige
// Abwehr hält nicht auf Dauer durch.
//
// Diese Datei ist reine Daten/Logik, keine DOM- oder GL-Berührung — testbar wie
// src/fortschritt.js und src/abzeichen.js.

// Feste Quellpunkte in UV-Koordinaten (0..1, y von unten wie überall in der Sim).
// Zwei von Anfang an, dann alle 40s eine weitere dazu, bis zu fünf — mehr Fronten
// statt nur schnellerer Nachschub, das ist die zweite Eskalationsachse.
export const QUELLEN = [
  { x: 0.22, y: 0.7, abZeit: 0 },
  { x: 0.78, y: 0.7, abZeit: 0 },
  { x: 0.5, y: 0.22, abZeit: 40 },
  { x: 0.15, y: 0.85, abZeit: 80 },
  { x: 0.85, y: 0.85, abZeit: 120 },
];

// Pigment der bösen Tinte — dunkles Violett-Schwarz, kein Teil der normalen Palette.
export const TINTE_HEX = '#1a0f24';

export const RADIUS_CM = 1.2;

// Nachschub pro Quelle und Sekunde, wächst mit der Überlebenszeit — die
// Schwierigkeitskurve. Gemessen über test/tintenwaechter.html: Ohne jede Abwehr
// erreicht Stärke=0.9 (konstant) nach 31s genau die Verlustschwelle — ein glatter,
// nachvollziehbarer Anstieg, kein Sprung. Der Anstieg über die Zeit sorgt dafür,
// dass es auch für aktive Abwehr irgendwann eng wird.
const BASIS_STAERKE = 0.9;
const ANSTIEG_PRO_S = 0.012;
const MAX_STAERKE = 4.5;

export function staerke(ueberlebenszeit) {
  return Math.min(BASIS_STAERKE + ueberlebenszeit * ANSTIEG_PRO_S, MAX_STAERKE);
}

// Schwierigkeitspegel fürs HUD: eine einzige, leicht lesbare Stufe 1..10 aus beiden
// Eskalationsachsen gemittelt (wie stark der Nachschub schon ist, wie viele Quellen
// schon aktiv sind) — reine Anzeige, geht in keine andere Berechnung ein.
export function schwierigkeitspegel(ueberlebenszeit) {
  const anteilStaerke = (staerke(ueberlebenszeit) - BASIS_STAERKE) / (MAX_STAERKE - BASIS_STAERKE);
  const anteilQuellen = (aktiveQuellen(ueberlebenszeit).length - 2) / (QUELLEN.length - 2);
  return 1 + Math.round(((anteilStaerke + anteilQuellen) / 2) * 9);
}

// Radialer Schub pro Quelle und Sekunde — entscheidend dafür, dass sich die Tinte
// überhaupt sichtbar ausbreitet statt nur am Quellpunkt aufzupfützen (gemessen: ohne
// Schub wächst die Deckung in 30s kaum über 3%, mit Schub=0.3 glatt bis 55% in 31s).
export const SCHUB_STAERKE = 0.3;

// Diffusionsstärke fürs Tinten-Fluid — bewusst nah am freien Malen (0.12), da Schub
// den Ausbreitungs-Unterschied macht, nicht Nässe (gemessen: kaum Wirkung).
export const WETNESS = 0.12;

export function aktiveQuellen(ueberlebenszeit) {
  return QUELLEN.filter((q) => ueberlebenszeit >= q.abZeit);
}

// Deckung (0..1), ab der die Runde verloren ist, plus eine Warnschwelle für die
// Anzeige (Balken wird gelb, bevor es kritisch wird).
export const VERLUST_SCHWELLE = 0.55;
export const WARN_SCHWELLE = VERLUST_SCHWELLE * 0.75;

// Randabfluss (src/sim/abfluss.js): ohne ihn kann Tinte, die man mit dem Schaber
// wegschiebt, nirgendwohin verschwinden — die freien Wände der Simulation spiegeln
// sie zurück (richtig fürs freie Bild, wirkungslos hier). RAND_BREITE ist der Abstand
// vom Rand (in UV), ab dem der Abfluss überhaupt greift; RAND_ABFLUSS_PRO_S seine
// Stärke direkt am Rand. Bewusst schmal und moderat: soll dem Schaber eine echte
// Wirkung geben, ohne dass Tinte allein durchs Ausbreiten von selbst verschwindet.
export const RAND_BREITE = 0.05;
export const RAND_ABFLUSS_PRO_S = 3.0;
