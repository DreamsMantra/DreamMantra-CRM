/** Short Web Audio beep + optional vibration when duplicate leads are detected. */
export function playDuplicateBuzz() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime;
      osc.start(t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.stop(t + 0.2);
      osc.onended = () => ctx.close?.();
    }
  } catch {
    /* ignore audio failures */
  }
  try {
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
  } catch {
    /* ignore vibrate failures */
  }
}
