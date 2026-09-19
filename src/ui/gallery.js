// Abklatsch und Galerie.
//
// Wie beim echten Ebru-Marmorieren legt man ein Blatt Papier auf und zieht den
// Moment ab. Die Vollauflösung bleibt als Blob in dieser Sitzung liegen, in den
// localStorage wandert nur ein kleines Vorschaubild — sonst ist die Quota nach
// drei Bildern voll.

const SCHLUESSEL = 'farbmalen.galerie';
const MAX_BILDER = 8;
const THUMB_BREITE = 420;

export function createGalerie() {
  const overlay = document.getElementById('galerie');
  const liste = document.getElementById('galerie-liste');
  const leer = document.getElementById('galerie-leer');
  document.getElementById('galerie-zu').addEventListener('click', schliessen);

  // Volle Auflösung nur für diese Sitzung — die passt in keinen localStorage.
  const vollbilder = new Map();

  function laden() {
    try {
      return JSON.parse(localStorage.getItem(SCHLUESSEL) || '[]');
    } catch {
      return [];
    }
  }

  function sichern(eintraege) {
    // Bei vollem Speicher das älteste Bild opfern, statt das Spiel abstürzen zu lassen.
    let rest = eintraege.slice(-MAX_BILDER);
    while (rest.length) {
      try {
        localStorage.setItem(SCHLUESSEL, JSON.stringify(rest));
        return rest;
      } catch {
        rest = rest.slice(1);
      }
    }
    try { localStorage.removeItem(SCHLUESSEL); } catch { /* egal */ }
    return [];
  }

  function zeichneListe() {
    const eintraege = laden();
    liste.innerHTML = '';
    leer.hidden = eintraege.length > 0;

    for (const e of eintraege.slice().reverse()) {
      const karte = document.createElement('div');
      karte.className = 'abklatsch';

      const bild = document.createElement('img');
      bild.src = e.thumb;
      bild.alt = `Abklatsch vom ${new Date(e.zeit).toLocaleString('de-DE')}`;
      karte.appendChild(bild);

      const knoepfe = document.createElement('div');
      knoepfe.className = 'abklatsch-knoepfe';

      const speichern = document.createElement('button');
      speichern.type = 'button';
      speichern.className = 'knopf';
      speichern.textContent = vollbilder.has(e.id) ? 'Speichern' : 'Vorschau speichern';
      speichern.addEventListener('click', () => herunterladen(e));
      knoepfe.appendChild(speichern);

      const weg = document.createElement('button');
      weg.type = 'button';
      weg.className = 'knopf';
      weg.textContent = 'Weg damit';
      weg.addEventListener('click', () => {
        sichern(laden().filter((x) => x.id !== e.id));
        vollbilder.delete(e.id);
        zeichneListe();
      });
      knoepfe.appendChild(weg);

      karte.appendChild(knoepfe);
      liste.appendChild(karte);
    }
  }

  function herunterladen(eintrag) {
    const name = `farbmalen-${new Date(eintrag.zeit).toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
    const blob = vollbilder.get(eintrag.id);
    const a = document.createElement('a');
    if (blob) {
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.png`;
    } else {
      a.href = eintrag.thumb;
      a.download = `${name}.jpg`;
    }
    a.click();
    if (blob) setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function oeffnen() {
    zeichneListe();
    overlay.hidden = false;
  }

  function schliessen() {
    overlay.hidden = true;
  }

  return {
    oeffnen,
    schliessen,
    get offen() { return !overlay.hidden; },

    // Wird direkt nach dem Zeichnen aufgerufen, solange der Bildpuffer noch steht.
    abklatschen(canvas) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const zeit = Date.now();

      const massstab = Math.min(THUMB_BREITE / canvas.width, 1);
      const klein = document.createElement('canvas');
      klein.width = Math.max(1, Math.round(canvas.width * massstab));
      klein.height = Math.max(1, Math.round(canvas.height * massstab));
      klein.getContext('2d').drawImage(canvas, 0, 0, klein.width, klein.height);
      const thumb = klein.toDataURL('image/jpeg', 0.72);

      canvas.toBlob((blob) => {
        if (blob) vollbilder.set(id, blob);
        if (!overlay.hidden) zeichneListe();
      }, 'image/png');

      sichern([...laden(), { id, zeit, thumb }]);
      return id;
    },
  };
}
