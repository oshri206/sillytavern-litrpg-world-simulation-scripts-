import { eventBus, storage } from '../api.js';
import { randomPick, createId, loadJson } from '../utils.js';

let merchantLines = [];
let handlers = [];

async function seedMerchants() {
  const merchants = [
    {
      id: createId('merchant'),
      name: 'Bibble the Barterer',
      inventory: ['rope', 'lantern', 'spice'],
      prices: { rope: 5, lantern: 12, spice: 3 }
    },
    {
      id: createId('merchant'),
      name: 'Sera of Many Hats',
      inventory: ['hat', 'cloak', 'boots'],
      prices: { hat: 7, cloak: 20, boots: 15 }
    }
  ];
  await storage.set('merchants', merchants);
}

async function adjustEconomy(eventText) {
  const merchants = (await storage.get('merchants')) ?? [];
  const updates = merchants.map((merchant) => {
    const next = { ...merchant, prices: { ...merchant.prices } };
    if (eventText.includes('raid') || eventText.includes('bandit')) {
      Object.keys(next.prices).forEach((item) => {
        next.prices[item] = Math.round(next.prices[item] * 1.2);
      });
    }
    if (eventText.includes('festival')) {
      next.inventory = Array.from(new Set([...next.inventory, 'festival-token']));
      next.prices['festival-token'] = 4;
    }
    return next;
  });
  await storage.set('merchants', updates);
  eventBus.emit('economyUpdated', updates);
}

function getMerchantLine() {
  return randomPick(merchantLines);
}

async function init() {
  const data = await loadJson(new URL('../prompts/merchant.json', import.meta.url));
  merchantLines = data.lines;
  const merchants = await storage.get('merchants');
  if (!merchants || !merchants.length) {
    await seedMerchants();
  }
  handlers = [
    eventBus.on('rumorCreated', (rumor) => adjustEconomy(rumor.text)),
    eventBus.on('worldEvent', (event) => adjustEconomy(event.description))
  ];
}

async function tick() {
  const line = getMerchantLine();
  await storage.push('merchantLines', { id: createId('merchant-line'), line });
}

function shutdown() {
  handlers.forEach((off) => off());
  handlers = [];
}

export { init, tick, shutdown, getMerchantLine, adjustEconomy };
