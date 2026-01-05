import { eventBus, storage } from '../api.js';
import { createId } from '../utils.js';

const shifts = [
  { npc: 'Mira', job: 'Lantern Keeper', shift: 'dawn' },
  { npc: 'Thorn', job: 'Harbor Watch', shift: 'day' },
  { npc: 'Pip', job: 'Market Runner', shift: 'midday' },
  { npc: 'Lysa', job: 'Tavern Storyteller', shift: 'evening' }
];

let handlers = [];

async function init() {
  await storage.set('npcJobs', shifts);
  handlers = [
    eventBus.on('dayTick', async ({ day }) => {
      const today = shifts.map((job) => ({ ...job, day }));
      await storage.set('npcJobsToday', today);
      eventBus.emit('jobsScheduled', today);
    })
  ];
}

async function tick() {}

function shutdown() {
  handlers.forEach((off) => off());
  handlers = [];
}

export { init, tick, shutdown };
