import { tick as vexTick } from '../features/vex.js';

let intervalId;

function start({ intervalMs = 60000 } = {}) {
  if (intervalId) return;
  intervalId = setInterval(() => {
    vexTick();
  }, intervalMs);
}

function stop() {
  if (!intervalId) return;
  clearInterval(intervalId);
  intervalId = undefined;
}

export { start, stop };
