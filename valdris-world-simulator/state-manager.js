const STORAGE_KEY = 'valdris-world-sim-state';

const defaultState = {
  time: {
    year: 1,
    month: 1,
    day: 1,
    hour: 6,
    climateZone: 'temperate'
  },
  weather: {
    current: 'clear',
    visibility: 1,
    travelSpeed: 1,
    combatMod: 0
  },
  factions: {
    relations: {},
    reputation: {}
  },
  events: {
    active: [],
    history: []
  },
  npcs: {
    roster: []
  },
  rumors: {
    items: []
  },
  economy: {
    prices: {},
    regions: {}
  },
  consequence: {
    actions: [],
    fame: 0,
    infamy: 0,
    bounty: 0
  },
  settlements: {
    list: []
  },
  wars: {
    active: []
  },
  dynasties: {
    houses: []
  },
  dungeons: {
    active: []
  },
  npcLife: {
    records: []
  },
  coldWar: {
    tensions: []
  },
  divine: {
    favor: {}
  },
  crime: {
    heat: 0,
    turf: {}
  },
  catastrophe: {
    active: []
  },
  prophecy: {
    active: []
  },
  reputation: {
    global: 0,
    regional: {}
  },
  meta: {
    lastUpdated: Date.now()
  }
};

function deepMerge(target, source) {
  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], sourceValue);
    } else if (target[key] === undefined) {
      target[key] = sourceValue;
    }
  });
  return target;
}

export const stateManager = {
  state: null,
  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const merged = deepMerge(parsed, structuredClone(defaultState));
    this.state = merged;
    return merged;
  },
  save() {
    if (!this.state) {
      return;
    }
    this.state.meta.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  },
  getState() {
    if (!this.state) {
      return this.load();
    }
    return this.state;
  },
  reset() {
    this.state = structuredClone(defaultState);
    this.save();
    return this.state;
  }
};
