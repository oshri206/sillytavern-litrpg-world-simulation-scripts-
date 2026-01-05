import { eventBus, storage } from '../api.js';
import { createId, randomPick, nowIso, loadJson } from '../utils.js';

let templates = [];
let handlers = [];

function createRumor(origin = 'market', location = 'Valdris') {
  const text = randomPick(templates);
  return {
    id: createId('rumor'),
    text,
    origin,
    provenance: [origin],
    locations: [location],
    strength: 1,
    createdAt: nowIso()
  };
}

async function spreadRumors(day) {
  const rumors = (await storage.get('rumors')) ?? [];
  const updates = rumors.map((rumor) => {
    const next = { ...rumor };
    if (Math.random() > 0.5) {
      next.locations = Array.from(new Set([...next.locations, randomPick(['Harbor', 'Market', 'Temple', 'Guildhall'])]));
      next.provenance = [...next.provenance, `day-${day}`];
      next.strength = Math.min(5, next.strength + 0.5);
    }
    return next;
  });
  await storage.set('rumors', updates);
  eventBus.emit('rumorSpread', updates);
}

async function init() {
  const data = await loadJson(new URL('../prompts/rumors.json', import.meta.url));
  templates = data.templates;
  handlers = [
    eventBus.on('dayTick', ({ day }) => spreadRumors(day)),
    eventBus.on('rumorSeed', async ({ origin, location }) => {
      const rumor = createRumor(origin, location);
      await storage.push('rumors', rumor);
      eventBus.emit('rumorCreated', rumor);
    })
  ];
}

async function tick(day = 0) {
  if (Math.random() > 0.6) {
    const rumor = createRumor('tavern', 'Valdris');
    await storage.push('rumors', rumor);
    eventBus.emit('rumorCreated', rumor);
  }
  await spreadRumors(day);
}

function shutdown() {
  handlers.forEach((off) => off());
  handlers = [];
}

export { init, tick, shutdown, createRumor };
