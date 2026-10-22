/**
 * A two-tone ring generated with Web Audio, so there's no audio file to ship. Browsers may block
 * sound until the user has interacted with the page; in that case the ring is silent.
 * Returns a function that stops it.
 */
export function playRingtone(): () => void {
  let ctx: AudioContext;
  try {
    ctx = new AudioContext();
  } catch {
    return () => {};
  }

  const ring = () => {
    const start = ctx.currentTime;
    for (const [offset, freq] of [[0, 880], [0.4, 660]] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.15, start + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.4);
    }
  };

  ctx.resume().catch(() => {});
  ring();
  const timer = setInterval(ring, 2000);
  return () => {
    clearInterval(timer);
    ctx.close().catch(() => {});
  };
}
