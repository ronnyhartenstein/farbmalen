// Töne komplett synthetisch — kein einziges Audio-File muss geladen werden.
// Alles bewusst leise: das Spiel soll nebenbei laufen können, ohne zu nerven.

export function createAudio(state) {
  let ctx = null;
  let master = null;
  let rauschPuffer = null;

  // Dauerkanäle für Werkzeuge, die halten statt klicken.
  let schleife = null;

  function start() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);

    const laenge = ctx.sampleRate * 2;
    rauschPuffer = ctx.createBuffer(1, laenge, ctx.sampleRate);
    const daten = rauschPuffer.getChannelData(0);
    for (let i = 0; i < laenge; i++) daten[i] = Math.random() * 2 - 1;

    return ctx;
  }

  function an() {
    if (!state.ton) return null;
    const c = start();
    if (c && c.state === 'suspended') c.resume();
    return c;
  }

  function rauschQuelle() {
    const q = ctx.createBufferSource();
    q.buffer = rauschPuffer;
    q.loop = true;
    return q;
  }

  // Ein Dauergeräusch, das Werkzeuge pro Frame nur noch "nachfüttern".
  function halteKanal(typ, frequenz, q, lautstaerke) {
    if (!schleife || schleife.typ !== typ) {
      stoppSchleife();
      const quelle = rauschQuelle();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = frequenz;
      filter.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      quelle.connect(filter).connect(gain).connect(master);
      quelle.start();
      schleife = { typ, quelle, gain, filter, leerlauf: 0 };
    }
    schleife.leerlauf = 0;
    const ziel = Math.min(lautstaerke, 0.25);
    schleife.gain.gain.setTargetAtTime(ziel, ctx.currentTime, 0.08);
  }

  function stoppSchleife() {
    if (!schleife) return;
    const s = schleife;
    s.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    setTimeout(() => {
      try { s.quelle.stop(); } catch { /* schon gestoppt */ }
    }, 400);
    schleife = null;
  }

  return {
    // Muss aus einer Nutzergeste heraus passieren, sonst blockt der Browser.
    aufwecken() { an(); },

    // Wird jedes Bild aufgerufen: Dauerton ausblenden, wenn niemand mehr rührt.
    tick(dt) {
      if (!schleife || !ctx) return;
      schleife.leerlauf += dt;
      if (schleife.leerlauf > 0.12) {
        schleife.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
      }
      if (schleife.leerlauf > 2) stoppSchleife();
    },

    plopp() {
      const c = an();
      if (!c) return;
      const osz = c.createOscillator();
      const gain = c.createGain();
      osz.type = 'sine';
      osz.frequency.setValueAtTime(420 + Math.random() * 140, c.currentTime);
      osz.frequency.exponentialRampToValueAtTime(95, c.currentTime + 0.16);
      gain.gain.setValueAtTime(0.0001, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.22);
      osz.connect(gain).connect(master);
      osz.start();
      osz.stop(c.currentTime + 0.25);
    },

    giessen(dt) {
      const c = an();
      if (!c) return;
      halteKanal('giessen', 900, 1.4, 0.10);
    },

    ruehren(dt) {
      const c = an();
      if (!c) return;
      halteKanal('ruehren', 380, 2.2, 0.09);
    },

    streichen(strecke) {
      const c = an();
      if (!c) return;
      halteKanal('streichen', 1500, 1.1, Math.min(strecke * 14, 0.16));
    },

    schaben(strecke) {
      const c = an();
      if (!c) return;
      halteKanal('schaben', 2600, 0.8, Math.min(strecke * 18, 0.18));
    },

    pusten() {
      const c = an();
      if (!c) return;
      halteKanal('pusten', 700, 0.5, 0.14);
    },

    wasser() {
      const c = an();
      if (!c) return;
      halteKanal('wasser', 2000, 1.6, 0.08);
    },

    seife() {
      const c = an();
      if (!c) return;
      const quelle = rauschQuelle();
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, c.currentTime);
      filter.frequency.exponentialRampToValueAtTime(320, c.currentTime + 0.5);
      filter.Q.value = 0.7;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.35, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.55);
      quelle.connect(filter).connect(gain).connect(master);
      quelle.start();
      quelle.stop(c.currentTime + 0.6);
    },

    klick() {
      const c = an();
      if (!c) return;
      const osz = c.createOscillator();
      const gain = c.createGain();
      osz.type = 'triangle';
      osz.frequency.setValueAtTime(880, c.currentTime);
      gain.gain.setValueAtTime(0.0001, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.22, c.currentTime + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.09);
      osz.connect(gain).connect(master);
      osz.start();
      osz.stop(c.currentTime + 0.1);
    },

    // Levelaufstieg (#12): ein aufsteigender Dreiklang — das Gegenstück zum
    // fallenden plopp() beim Gießen.
    levelAuf() {
      const c = an();
      if (!c) return;
      const start = c.currentTime;
      [523.25, 659.25, 783.99].forEach((frequenz, i) => {
        const osz = c.createOscillator();
        const gain = c.createGain();
        osz.type = 'triangle';
        osz.frequency.setValueAtTime(frequenz, start);
        const beginn = start + i * 0.09;
        gain.gain.setValueAtTime(0.0001, beginn);
        gain.gain.exponentialRampToValueAtTime(0.3, beginn + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, beginn + 0.35);
        osz.connect(gain).connect(master);
        osz.start(beginn);
        osz.stop(beginn + 0.4);
      });
    },

    schuetteln() {
      const c = an();
      if (!c) return;
      const quelle = rauschQuelle();
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(240, c.currentTime);
      filter.frequency.linearRampToValueAtTime(900, c.currentTime + 0.3);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.28, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.7);
      quelle.connect(filter).connect(gain).connect(master);
      quelle.start();
      quelle.stop(c.currentTime + 0.75);
    },
  };
}
