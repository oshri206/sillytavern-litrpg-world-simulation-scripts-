import { eventBus, storage } from '../api.js';
import { loadJson, randomPick } from '../utils.js';

let states = [];

async function init() {
  const data = await loadJson(new URL('../prompts/weather.json', import.meta.url));
  states = data.states;
}

async function tick(day = 0) {
  const state = randomPick(states);
  const weather = { day, state, effects: ['markets shift prices', 'mood drifts'] };
  await storage.push('weather', weather);
  eventBus.emit('weatherUpdate', weather);
  return weather;
}

function shutdown() {}

export { init, tick, shutdown };
