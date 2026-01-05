import { tick as rumorTick } from '../features/rumors.js';

let intervalId;

function start({ intervalMs = 90000 } = {}) {
  if (intervalId) return;
  intervalId = setInterval(() => {
    rumorTick();
  }, intervalMs);
}

function stop() {
  if (!intervalId) return;
  clearInterval(intervalId);
  intervalId = undefined;
}

export { start, stop };
