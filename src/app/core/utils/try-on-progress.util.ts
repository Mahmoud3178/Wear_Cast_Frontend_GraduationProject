/** Drives try-on progress linearly from elapsed time vs API estimated seconds. */
export type TryOnProgressTimer = { stop: () => void };

export function startTryOnEtaProgressTimer(
  estimatedSeconds: number,
  onTick: (percent: number, secondsRemaining: number) => void,
  options?: { startPercent?: number; capPercent?: number; intervalMs?: number }
): TryOnProgressTimer {
  const totalSec = Math.max(1, estimatedSeconds);
  const start = options?.startPercent ?? 10;
  const cap = options?.capPercent ?? 95;
  const intervalMs = options?.intervalMs ?? 200;
  const t0 = Date.now();

  const tick = (): void => {
    const elapsedSec = (Date.now() - t0) / 1000;
    const t = Math.min(1, elapsedSec / totalSec);
    const pct = Math.round(start + (cap - start) * t);
    const remaining = Math.max(0, Math.ceil(totalSec - elapsedSec));
    onTick(pct, remaining);
  };

  tick();
  const id = window.setInterval(tick, intervalMs);
  return {
    stop: () => clearInterval(id)
  };
}
