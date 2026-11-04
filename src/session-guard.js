export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

// Only controls the page's idle session; server authentication remains CloudBase's responsibility.
export function createIdleGuard({ onExpire, timeoutMs = IDLE_TIMEOUT_MS, now = Date.now,
  setTimer = (fn, delay) => setTimeout(fn, delay), clearTimer = id => clearTimeout(id) }) {
  let last = null, timer = null;
  function stop() { if (timer !== null) clearTimer(timer); timer = null; last = null; }
  function check() {
    if (timer !== null) clearTimer(timer);
    timer = null;
    if (last === null) return false;
    const remaining = timeoutMs - (now() - last);
    if (remaining <= 0) { stop(); onExpire(); return true; }
    timer = setTimer(check, remaining);
    return false;
  }
  function start(since = now()) {
    last = Number.isFinite(since) && since <= now() ? since : now();
    check();
  }
  return { start, touch: () => start(), check, stop };
}
