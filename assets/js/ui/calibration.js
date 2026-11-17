// Guided latency calibration.
//   Audio test: clicks only, nothing moves on screen. Measures how late the player taps after
//               each click: audio output delay + input delay. Applied to note judgement.
//   Video test: a silent marker crosses a line. Measures display delay + input delay.
//               Applied to drawing only, so the highway lines up with judgement.
// All times are milliseconds on the performance.now() timeline.

export const CAL_BEATS = 16;
export const CAL_PERIOD_MS = 600;
export const CAL_WARMUP = 4;     // taps on the first beats are ignored while the player finds the pulse
export const CAL_MIN_TAPS = 6;

export function latencyFromTaps(beats, taps, { period = CAL_PERIOD_MS, warmup = CAL_WARMUP, minTaps = CAL_MIN_TAPS } = {}) {
  const deltas = [];
  for (const tap of taps) {
    let bestIndex = -1, best = Infinity;
    beats.forEach((b, i) => { if (Math.abs(tap - b) < Math.abs(best)) { best = tap - b; bestIndex = i; } });
    if (bestIndex < warmup || Math.abs(best) > period * 0.4) continue;
    deltas.push(best);
  }
  if (deltas.length < minTaps) return null;
  deltas.sort((a, b) => a - b);
  const mid = deltas.length >> 1;
  const median = deltas.length % 2 ? deltas[mid] : (deltas[mid - 1] + deltas[mid]) / 2;
  return Math.round(median / 5) * 5;
}

export function createCalibration({ canvas, status, onResult, perf = () => performance.now() }) {
  const ctx = canvas.getContext('2d');
  let run = null;

  function stop() {
    if (!run) return;
    cancelAnimationFrame(run.raf);
    run.audio?.close?.().catch?.(() => {});
    run = null;
  }

  async function start(kind) {
    stop();
    const t0 = perf() + 1200;
    const beats = Array.from({ length: CAL_BEATS }, (_, i) => t0 + i * CAL_PERIOD_MS);
    run = { kind, beats, taps: [], raf: 0, audio: null };
    const current = run;
    if (kind === 'audio') {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { status.textContent = 'Este navegador não gera áudio para o teste.'; run = null; return; }
      const audio = new AC();
      current.audio = audio;
      try { await audio.resume(); } catch (e) { /* resumes on the click that started the test */ }
      if (run !== current) return;
      // Clicks are scheduled on the audio clock without output-latency correction, like the
      // song's media clock, so the measured delay includes what the speakers add.
      const ctxNow = audio.currentTime, perfNow = perf();
      const toCtx = ms => ctxNow + (ms - perfNow) / 1000;
      beats.forEach((b, i) => {
        const at = toCtx(b), osc = audio.createOscillator(), gain = audio.createGain();
        osc.frequency.value = i % 4 === 0 ? 1320 : 880;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.5, at + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
        osc.connect(gain).connect(audio.destination);
        osc.start(at); osc.stop(at + 0.1);
      });
    }
    status.textContent = kind === 'audio'
      ? 'Ouça os cliques e toque junto com cada um (qualquer tecla, botão ou toque na área).'
      : 'Sem som: toque quando a marca cruzar a linha.';
    const draw = () => {
      if (run !== current) return;
      paint(current);
      const end = current.beats[current.beats.length - 1] + CAL_PERIOD_MS;
      if (perf() >= end) return finish(current);
      current.raf = requestAnimationFrame(draw);
    };
    current.raf = requestAnimationFrame(draw);
  }

  function paint(r) {
    const W = canvas.width, H = canvas.height, now = perf(), lineX = W * 0.75;
    ctx.fillStyle = '#120d10'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e9be72'; ctx.fillRect(lineX - 2, 10, 4, H - 20);
    const done = r.beats.filter(b => b <= now).length;
    ctx.fillStyle = '#bbab98'; ctx.font = '14px Impact, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${Math.min(done, CAL_BEATS)} / ${CAL_BEATS} · toques ${r.taps.length}`, 12, 22);
    if (r.kind === 'video') {
      // The marker travels one period and reaches the line exactly on the beat.
      const next = r.beats.find(b => b >= now - 60);
      if (next !== undefined) {
        const p = 1 - (next - now) / CAL_PERIOD_MS;
        const x = lineX - (1 - p) * (lineX - 30);
        ctx.fillStyle = '#e34a49'; ctx.beginPath(); ctx.arc(x, H / 2, 16, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (const tap of r.taps) {
      const age = now - tap;
      if (age > 250) continue;
      ctx.globalAlpha = 1 - age / 250; ctx.fillStyle = '#f5efdf'; ctx.fillRect(lineX - 30, H - 22, 60, 8); ctx.globalAlpha = 1;
    }
  }

  function finish(r) {
    run = null;
    r.audio?.close?.().catch?.(() => {});
    const ms = latencyFromTaps(r.beats, r.taps);
    if (ms === null) {
      status.textContent = 'Poucos toques no ritmo. Tente de novo, tocando junto com cada batida.';
      onResult(r.kind, null);
      return;
    }
    status.textContent = (r.kind === 'audio' ? 'Atraso do áudio: ' : 'Atraso do vídeo: ') + ms + ' ms. Valor salvo.';
    onResult(r.kind, ms);
  }

  return {
    start,
    stop,
    tap(timestamp) { if (run) run.taps.push(Number.isFinite(timestamp) && timestamp > 0 ? timestamp : perf()); },
    get running() { return !!run; },
  };
}
