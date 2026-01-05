import { eventBus, storage } from '../api.js';
import { createId, loadJson } from '../utils.js';

let template = '';
let handlers = [];

function summarize(events = []) {
  const highlights = events.slice(-3).map((event) => event.description).join(' ');
  return `${highlights} The city giggled through it all.`.trim();
}

async function createEntry(day) {
  const events = (await storage.get('worldEvents')) ?? [];
  const summary = summarize(events);
  const entry = { id: createId('journal'), day, summary, prompt: template };
  await storage.push('journal', entry);
  eventBus.emit('journalEntry', entry);
  return entry;
}

async function init() {
  const data = await loadJson(new URL('../prompts/journal.json', import.meta.url));
  template = data.template;
  handlers = [
    eventBus.on('dayTick', async ({ day }) => {
      if (day % 2 === 0) {
        await createEntry(day);
      }
    })
  ];
}

async function tick(day = 0) {
  if (day % 3 === 0) {
    await createEntry(day);
  }
}

function shutdown() {
  handlers.forEach((off) => off());
  handlers = [];
}

export { init, tick, shutdown, summarize };
