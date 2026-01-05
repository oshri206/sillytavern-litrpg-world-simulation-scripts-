import { tick as calendarTick } from '../features/calendar.js';

let intervalId;

function start({ intervalMs = 180000 } = {}) {
  if (intervalId) return;
  intervalId = setInterval(() => {
    calendarTick();
  }, intervalMs);
}

function stop() {
  if (!intervalId) return;
  clearInterval(intervalId);
  intervalId = undefined;
}

export { start, stop };
