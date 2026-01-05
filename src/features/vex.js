import { eventBus, storage } from '../api.js';
import { createId, randomPick, nowIso, loadJson } from '../utils.js';

const cooldowns = new Map();
let templates = [];
let handlers = [];

function weightedPick(items) {
  const weights = {
    common: 5,
    uncommon: 3,
    rare: 2,
    legendary: 1
  };
  const expanded = items.flatMap((item) =>
    Array(weights[item.rarity] ?? 1).fill(item)
  );
  return randomPick(expanded);
}

function canTrigger(text, cooldownMinutes = 10) {
  const last = cooldowns.get(text);
  if (!last) return true;
  const elapsed = (Date.now() - last) / 1000 / 60;
  return elapsed >= cooldownMinutes;
}

async function emitVex(reason = 'ambient') {
  if (!templates.length) return;
  const pick = weightedPick(templates);
  if (!canTrigger(pick.text)) return;
  cooldowns.set(pick.text, Date.now());
  const message = {
    id: createId('vex'),
    text: pick.text,
    rarity: pick.rarity,
    reason,
    createdAt: nowIso()
  };
  await storage.push('vexInbox', message);
  eventBus.emit('vexMessage', message);
  return message;
}

async function init() {
  const data = await loadJson(new URL('../prompts/vex.json', import.meta.url));
  templates = data.lines;
  handlers = [
    eventBus.on('playerAction', () => emitVex('playerAction')),
    eventBus.on('dayTick', () => emitVex('dayTick'))
  ];
}

async function tick() {
  return emitVex('interval');
}

function shutdown() {
  handlers.forEach((off) => off());
  handlers = [];
}

export { init, tick, shutdown, emitVex };
