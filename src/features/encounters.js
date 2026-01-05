import { eventBus, storage } from '../api.js';
import { loadJson, randomPick, createId } from '../utils.js';

let templates = [];

async function init() {
  const data = await loadJson(new URL('../prompts/encounters.json', import.meta.url));
  templates = data.templates;
}

async function generateEncounter() {
  const pick = randomPick(templates);
  const encounter = {
    id: createId('encounter'),
    scene: pick.scene,
    outcomes: pick.outcomes
  };
  await storage.push('encounters', encounter);
  eventBus.emit('encounter', encounter);
  return encounter;
}

async function tick() {
  if (Math.random() > 0.7) {
    return generateEncounter();
  }
  return null;
}

function shutdown() {}

export { init, tick, shutdown, generateEncounter };
