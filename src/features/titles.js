import { eventBus, storage } from '../api.js';
import { createId, randomPick, loadJson } from '../utils.js';

let titlePool = [];
let handlers = [];

async function awardTitle(day) {
  const name = randomPick(titlePool);
  const title = { id: createId('title'), name, earnedOn: day };
  await storage.push('titles', title);
  await storage.update('reputation', (value) => (value ?? 0) + 2, 0);
  const titles = (await storage.get('titles')) ?? [];
  await storage.set('npcDialogContext', {
    titles: titles.map((entry) => entry.name)
  });
  eventBus.emit('titleAwarded', title);
  return title;
}

async function init() {
  const data = await loadJson(new URL('../prompts/titles.json', import.meta.url));
  titlePool = data.titles;
  handlers = [
    eventBus.on('worldEvent', async (event) => {
      if (event.type === 'festival') {
        await awardTitle(event.day);
      }
    })
  ];
}

async function tick(day = 0) {
  if (Math.random() > 0.8) {
    await awardTitle(day);
  }
}

function shutdown() {
  handlers.forEach((off) => off());
  handlers = [];
}

export { init, tick, shutdown, awardTitle };
