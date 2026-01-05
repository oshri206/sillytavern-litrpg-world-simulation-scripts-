type SpreadEntry = {
  npc: string;
  location: string;
  timestamp: string;
};

type Rumor = {
  id: string;
  text: string;
  topic: string;
  truth_score: number;
  tags: string[];
  origin_npc: string;
  locations: string[];
  spread_history: SpreadEntry[];
};

const rumors = new Map<string, Rumor>();

const tagMap: Record<string, string[]> = {
  merchant: ['merchant', 'market', 'baker', 'stall', 'trade'],
  politics: ['guild', 'council', 'captain', 'ledger'],
  monster: ['mermaid', 'beast', 'dragon', 'ghost'],
  romance: ['love', 'crush', 'heart'],
  religion: ['temple', 'bell', 'prayer']
};

const nouns = [
  'lantern',
  'bridge',
  'market',
  'ghost',
  'mermaid',
  'baker',
  'statue',
  'bell',
  'storm',
  'fox',
  'tavern',
  'guild'
];

function createId(prefix = 'rumor') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function inferTags(topic: string): string[] {
  const lower = topic.toLowerCase();
  const tags = Object.entries(tagMap)
    .filter(([, keywords]) => keywords.some((keyword) => lower.includes(keyword)))
    .map(([tag]) => tag);
  return tags.length ? tags : ['general'];
}

function mutateText(text: string): string {
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const replacement = nouns[Math.floor(Math.random() * nouns.length)];
  if (text.includes(noun)) {
    return text.replace(noun, replacement);
  }
  return `${text.replace('.', '')} (attributed to ${replacement} gossip).`;
}

export function createRumor(originNpcId: string, topic: string, truthScore: number): Rumor {
  const rumor: Rumor = {
    id: createId(),
    text: `They say ${topic}.`,
    topic,
    truth_score: Math.max(0, Math.min(1, truthScore)),
    tags: inferTags(topic),
    origin_npc: originNpcId,
    locations: [],
    spread_history: []
  };
  rumors.set(rumor.id, rumor);
  return rumor;
}

export function mutateRumor(rumorId: string): Rumor | null {
  const rumor = rumors.get(rumorId);
  if (!rumor) return null;
  const updated: Rumor = {
    ...rumor,
    text: mutateText(rumor.text),
    truth_score: Math.max(0, Number((rumor.truth_score - 0.1).toFixed(2)))
  };
  rumors.set(rumorId, updated);
  return updated;
}

export function spreadRumor(rumorId: string, fromLocation: string, toLocation: string): Rumor | null {
  const rumor = rumors.get(rumorId);
  if (!rumor) return null;
  const mutationChance = 0.15 + Math.random() * 0.2;
  let updated = { ...rumor };
  if (Math.random() < mutationChance) {
    updated = {
      ...updated,
      text: mutateText(updated.text),
      truth_score: Math.max(0, Number((updated.truth_score - 0.05).toFixed(2)))
    };
  }
  const nextLocations = new Set([...updated.locations, fromLocation, toLocation]);
  const historyEntry: SpreadEntry = {
    npc: updated.origin_npc,
    location: toLocation,
    timestamp: nowIso()
  };
  const next = {
    ...updated,
    locations: Array.from(nextLocations),
    spread_history: [...updated.spread_history, historyEntry]
  };
  rumors.set(rumorId, next);
  return next;
}

export function getRumorsForLocation(location: string, limit = 10): Rumor[] {
  const list = Array.from(rumors.values()).filter((rumor) =>
    rumor.locations.includes(location)
  );
  return list.slice(0, limit);
}

export function tagFilter(tag: string): Rumor[] {
  return Array.from(rumors.values()).filter((rumor) => rumor.tags.includes(tag));
}

export function seedRumors(seed: Rumor[]): void {
  seed.forEach((rumor) => rumors.set(rumor.id, rumor));
}

export type { Rumor, SpreadEntry };
