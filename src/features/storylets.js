import { eventBus, storage } from '../api.js';
import { createId, randomPick } from '../utils.js';

const storylets = [
  'A street performer juggles glowing stones and asks for a name in return.',
  'A baker insists their bread predicts the weather, loudly and incorrectly.',
  'An alley cat offers a side quest in exchange for compliments.'
];

let handlers = [];

async function init() {
  handlers = [
    eventBus.on('dayTick', async () => {
      const storylet = {
        id: createId('storylet'),
        text: randomPick(storylets)
      };
      await storage.push('storylets', storylet);
      eventBus.emit('storylet', storylet);
    })
  ];
}

async function tick() {}

function shutdown() {
  handlers.forEach((off) => off());
  handlers = [];
}

export { init, tick, shutdown };
