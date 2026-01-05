import { storage } from '../api.js';
import { createId, clamp, nowIso } from '../utils.js';

const positive = ['thanks', 'kind', 'help', 'smile', 'gift', 'laugh'];
const negative = ['angry', 'steal', 'hurt', 'lie', 'grim', 'fight'];

function sentimentScore(text) {
  const lower = text.toLowerCase();
  let score = 0;
  positive.forEach((word) => {
    if (lower.includes(word)) score += 0.2;
  });
  negative.forEach((word) => {
    if (lower.includes(word)) score -= 0.2;
  });
  return clamp(score, -1, 1);
}

function summarize(text) {
  const trimmed = text.trim().split(/\s+/).slice(0, 24).join(' ');
  return `${trimmed}${trimmed.endsWith('.') ? '' : '...'} Remembered with a crooked grin.`;
}

async function recordMemory(npc, text) {
  const summary = summarize(text);
  const memory = {
    id: createId('memory'),
    npc,
    summary,
    sentiment: sentimentScore(text),
    createdAt: nowIso()
  };
  await storage.push('npcMemories', memory);
  await storage.update(
    'npcRelations',
    (relations) => ({
      ...relations,
      [npc]: clamp((relations?.[npc] ?? 0) + memory.sentiment, -5, 5)
    }),
    {}
  );
  return memory;
}

async function init() {}

async function tick() {}

function shutdown() {}

export { init, tick, shutdown, recordMemory, sentimentScore, summarize };
