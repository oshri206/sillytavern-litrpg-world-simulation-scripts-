import { createId, nowIso, randomPick, loadJson } from '../utils.js';

let bus;
let db;
let options = {};
let cooldowns = new Map();
let templates = [];
let ambientTimer;

const rarityCooldowns = {
  common: 10,
  uncommon: 20,
  rare: 40,
  legendary: 80
};

function interpolate(text, context = {}) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = context[key] ?? options[key];
    return value ?? `{{${key}}}`;
  });
}

function getCooldownKey(playerName, rarity) {
  return `${playerName || 'default'}:${rarity}`;
}

function isOnCooldown(playerName, rarity, now = Date.now()) {
  const key = getCooldownKey(playerName, rarity);
  const last = cooldowns.get(key) ?? 0;
  const cooldownSeconds = rarityCooldowns[rarity] ?? rarityCooldowns.common;
  return (now - last) / 1000 < cooldownSeconds;
}

function setCooldown(playerName, rarity, now = Date.now()) {
  const key = getCooldownKey(playerName, rarity);
  cooldowns.set(key, now);
}

function pickLine(rarity, mood) {
  const candidates = templates.filter((line) => {
    if (rarity && line.rarity !== rarity) return false;
    if (mood && line.mood && line.mood !== mood) return false;
    return true;
  });
  return randomPick(candidates.length ? candidates : templates);
}

function getRandomLine(rarity, mood) {
  const line = pickLine(rarity, mood);
  if (!line) return null;
  return line;
}

async function pushMessage({ text, rarity }) {
  const payload = {
    id: createId('vex'),
    text,
    rarity,
    timestamp: nowIso()
  };
  await db.push('vexInbox', payload);
  bus.emit('vexMessage', payload);
  bus.emit('ui:systemMessage', payload);
  return payload;
}

async function emitLine({ rarity, mood, context = {}, now } = {}) {
  const playerName = context.playerName ?? options.playerName;
  const chosen = getRandomLine(rarity, mood);
  if (!chosen) return null;
  const actualRarity = chosen.rarity ?? rarity ?? 'common';
  if (isOnCooldown(playerName, actualRarity, now)) return null;
  const text = interpolate(chosen.text, context);
  setCooldown(playerName, actualRarity, now);
  return pushMessage({ text, rarity: actualRarity });
}

async function init(eventBus, database, initOptions = {}) {
  bus = eventBus;
  db = database;
  options = initOptions;
  const data = await loadJson(new URL('../../prompts/seed_data.json', import.meta.url));
  templates = data.vex_lines.map((line) => ({
    ...line,
    mood: line.mood ?? null
  }));
  bus.on('playerAction', ({ mood, ...context }) => {
    emitLine({ mood, context: { ...context, playerName: options.playerName } });
  });
}

async function scheduleAmbient(intervalSeconds, scheduleOptions = {}) {
  const { simulatedSeconds, mood, rarity } = scheduleOptions;
  const run = async (tickSeconds) => {
    for (let elapsed = 0; elapsed <= tickSeconds; elapsed += intervalSeconds) {
      await emitLine({
        rarity,
        mood,
        context: { playerName: options.playerName },
        now: Date.now() + elapsed * 1000
      });
    }
  };

  if (simulatedSeconds) {
    await run(simulatedSeconds);
    return () => {};
  }

  if (ambientTimer) return () => {};
  ambientTimer = setInterval(() => {
    emitLine({ rarity, mood, context: { playerName: options.playerName } });
  }, intervalSeconds * 1000);
  return () => {
    clearInterval(ambientTimer);
    ambientTimer = undefined;
  };
}

function triggerOnEvent(eventName, context = {}) {
  bus.on(eventName, (payload = {}) => {
    emitLine({ context: { ...context, ...payload } });
  });
}

export {
  init,
  scheduleAmbient,
  triggerOnEvent,
  getRandomLine
};

export async function tick() {
  return emitLine({ context: { playerName: options.playerName } });
}
