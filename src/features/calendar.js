import { eventBus, storage } from '../api.js';
import { loadJson, createId } from '../utils.js';

let festivals = [];
let currentDay = 1;

async function init() {
  const data = await loadJson(new URL('../prompts/festivals.json', import.meta.url));
  festivals = data.festivals;
  await storage.set('festivals', festivals);
  const saved = await storage.get('calendarDay');
  if (saved) currentDay = saved;
}

async function tick() {
  currentDay += 1;
  await storage.set('calendarDay', currentDay);
  const todayFestival = festivals.find((festival) => festival.day === currentDay);
  if (todayFestival) {
    const event = {
      id: createId('festival'),
      type: 'festival',
      description: `${todayFestival.name}: ${todayFestival.tagline}`,
      day: currentDay
    };
    await storage.push('worldEvents', event);
    eventBus.emit('worldEvent', event);
  }
  eventBus.emit('dayTick', { day: currentDay });
  return currentDay;
}

function getDay() {
  return currentDay;
}

function shutdown() {}

export { init, tick, shutdown, getDay };
