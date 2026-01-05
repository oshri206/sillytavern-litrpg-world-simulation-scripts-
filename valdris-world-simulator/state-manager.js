const STORAGE_KEY = 'valdris-world-sim-state';

const DEFAULT_STATE = {
    time: {},
    weather: {},
    factions: {},
    events: {},
    npcs: {},
    rumors: {},
    economy: {},
    consequences: {},
    settlements: {},
    warfare: {},
    dynasties: {},
    dungeons: {},
    npcLife: {},
    coldWar: {},
    divine: {},
    crime: {},
    catastrophe: {},
    prophecy: {},
    reputation: {},
    meta: {
        lastUpdated: null,
        version: '1.0.0'
    }
};

function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        const sourceValue = source[key];
        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            deepMerge(target[key], sourceValue);
        } else if (target[key] === undefined) {
            target[key] = sourceValue;
        }
    }
    return target;
}

class StateManager {
    constructor() {
        this.state = null;
        this.listeners = new Map();
        this.autoSaveInterval = null;
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            this.state = deepMerge(parsed, JSON.parse(JSON.stringify(DEFAULT_STATE)));
        } catch (e) {
            console.error('[StateManager] Failed to load state:', e);
            this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        }
        return this.state;
    }

    save() {
        if (!this.state) return;
        try {
            this.state.meta.lastUpdated = Date.now();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) {
            console.error('[StateManager] Failed to save state:', e);
        }
    }

    getState() {
        if (!this.state) {
            this.load();
        }
        return this.state;
    }

    getSection(sectionName) {
        const state = this.getState();
        if (!state[sectionName]) {
            state[sectionName] = {};
        }
        return state[sectionName];
    }

    updateSection(sectionName, data) {
        const state = this.getState();
        state[sectionName] = data;
        this.notifyListeners(sectionName, data);
        this.save();
    }

    subscribe(sectionName, callback) {
        if (!this.listeners.has(sectionName)) {
            this.listeners.set(sectionName, new Set());
        }
        this.listeners.get(sectionName).add(callback);
        return () => this.listeners.get(sectionName).delete(callback);
    }

    notifyListeners(sectionName, data) {
        const sectionListeners = this.listeners.get(sectionName);
        if (sectionListeners) {
            for (const callback of sectionListeners) {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`[StateManager] Listener error for ${sectionName}:`, e);
                }
            }
        }
    }

    reset() {
        this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this.save();
        window.dispatchEvent(new CustomEvent('vws-state-reset'));
        return this.state;
    }

    startAutoSave(intervalMs = 30000) {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.autoSaveInterval = setInterval(() => this.save(), intervalMs);
    }

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    exportState() {
        return JSON.stringify(this.getState(), null, 2);
    }

    importState(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.state = deepMerge(imported, JSON.parse(JSON.stringify(DEFAULT_STATE)));
            this.save();
            window.dispatchEvent(new CustomEvent('vws-state-imported'));
            return true;
        } catch (e) {
            console.error('[StateManager] Failed to import state:', e);
            return false;
        }
    }
}

const stateManager = new StateManager();

export { StateManager, stateManager, DEFAULT_STATE };
