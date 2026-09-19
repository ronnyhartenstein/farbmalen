// Die Farbkleckse unten.

import { PALETTE } from '../palette.js';

export function createPalette(state, aktionen) {
  const box = document.getElementById('palette');
  const knoepfe = [];

  PALETTE.forEach((farbe, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'klecks';
    b.style.background = farbe.hex;
    b.title = farbe.name;
    b.setAttribute('aria-label', farbe.name);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => waehle(i));
    box.appendChild(b);
    knoepfe.push(b);
  });

  // Würfel: eine zufällige Farbe, die nicht die aktuelle ist.
  const wuerfel = document.createElement('button');
  wuerfel.type = 'button';
  wuerfel.className = 'klecks';
  wuerfel.style.background =
    'conic-gradient(#e8322a, #f7d32b, #54b83c, #16b8b8, #2f7fe0, #7c3fb5, #d6219a, #e8322a)';
  wuerfel.title = 'Zufallsfarbe';
  wuerfel.setAttribute('aria-label', 'Zufallsfarbe');
  wuerfel.addEventListener('click', () => {
    let i = state.farbe;
    while (i === state.farbe) i = Math.floor(Math.random() * PALETTE.length);
    waehle(i);
  });
  box.appendChild(wuerfel);

  function waehle(i) {
    state.farbe = i;
    state.speichern();
    knoepfe.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    aktionen.beiWechsel?.();
  }

  waehle(state.farbe % PALETTE.length);
  return { waehle };
}
