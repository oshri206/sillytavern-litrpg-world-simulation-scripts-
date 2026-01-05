import { tick as weatherTick } from '../features/weather.js';

let intervalId;
let day = 1;

function start({ intervalMs = 120000 } = {}) {
  if (intervalId) return;
  intervalId = setInterval(() => {
    weatherTick(day);
    day += 1;
  }, intervalMs);
}

function stop() {
  if (!intervalId) return;
  clearInterval(intervalId);
  intervalId = undefined;
}

export { start, stop };
