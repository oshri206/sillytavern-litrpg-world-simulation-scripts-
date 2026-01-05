import { eventBus, storage } from '../api.js';
import { createId } from '../utils.js';

const hints = {
  ranger: 'The reeds by the river keep bowstring secrets.',
  mage: 'The library lamps flicker when a spell is near.',
  rogue: 'Locks in Valdris prefer polite introductions.',
  cleric: 'The bell tower hums when help is needed.',
  warrior: 'Sparring rings are busy after storms.'
};

let handlers = [];

async function init() {
  handlers = [
    eventBus.on('playerClass', async ({ className }) => {
      const hint = hints[className] ?? 'The city itself leans toward your next lesson.';
      await storage.push('classHints', { id: createId('hint'), hint });
      eventBus.emit('classHint', hint);
    })
  ];
}

async function tick() {}

function shutdown() {
  handlers.forEach((off) => off());
  handlers = [];
}

export { init, tick, shutdown };
