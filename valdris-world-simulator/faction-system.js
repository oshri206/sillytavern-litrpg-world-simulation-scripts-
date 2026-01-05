const DEFAULT_FACTIONS = {
    valdric_empire: {
        id: "valdric_empire", name: "Valdric Empire", shortName: "Empire", type: "nation",
        description: "The dominant human empire, ruled by Emperor Aldric III from the capital Valdris Prime.",
        leader: "Emperor Aldric III", capital: "valdris_prime",
        territory: ["valdric_heartland", "northern_marches", "eastern_provinces"],
        colors: { primary: "#C9A227", secondary: "#1A1A2E" },
        values: ["order", "expansion", "tradition"], government: "monarchy",
        strength: 85, wealth: 80, influence: 90, military: 85, relations: {}
    },
    dwarven_holds: {
        id: "dwarven_holds", name: "Dwarven Holds", shortName: "Dwarves", type: "nation",
        description: "Ancient mountain kingdoms united under the High King, masters of forge and stone.",
        leader: "High King Thorin Stonehammer", capital: "khaz_morath",
        territory: ["dwarven_mountains", "undermountain"],
        colors: { primary: "#8B4513", secondary: "#FFD700" },
        values: ["craft", "honor", "tradition"], government: "monarchy",
        strength: 70, wealth: 90, influence: 60, military: 75, relations: {}
    },
    sylvan_dominion: {
        id: "sylvan_dominion", name: "Sylvan Dominion", shortName: "Sylvans", type: "nation",
        description: "The ancient elven realm within the great forests, guided by the Eternal Council.",
        leader: "High Lady Aelindra", capital: "aelindra",
        territory: ["sylvan_forests", "moonwood"],
        colors: { primary: "#228B22", secondary: "#C0C0C0" },
        values: ["nature", "magic", "patience"], government: "council",
        strength: 60, wealth: 70, influence: 75, military: 55, relations: {}
    },
    orcish_dominion: {
        id: "orcish_dominion", name: "Orcish Dominion", shortName: "Orcs", type: "nation",
        description: "Brutal warlords ruling the wastelands, united only by strength and conquest.",
        leader: "Warchief Grommash", capital: "grakhan",
        territory: ["orcish_wastes", "blighted_lands"],
        colors: { primary: "#8B0000", secondary: "#2F4F4F" },
        values: ["strength", "conquest", "blood"], government: "warlord",
        strength: 75, wealth: 30, influence: 40, military: 90, relations: {}
    },
    merchant_league: {
        id: "merchant_league", name: "Merchant League", shortName: "League", type: "organization",
        description: "Powerful trade consortium controlling commerce across the known world.",
        leader: "Guildmaster Corvus", capital: "freeport",
        territory: ["merchant_coast", "trade_islands"],
        colors: { primary: "#FFD700", secondary: "#191970" },
        values: ["profit", "connections", "neutrality"], government: "plutocracy",
        strength: 50, wealth: 95, influence: 85, military: 40, relations: {}
    },
    church_of_light: {
        id: "church_of_light", name: "Church of the Sacred Light", shortName: "Church", type: "religion",
        description: "Dominant faith across human lands, wielding significant political power.",
        leader: "High Priest Aldwyn", capital: "sanctum_solaris", territory: [],
        colors: { primary: "#FFFFFF", secondary: "#FFD700" },
        values: ["faith", "order", "purity"], government: "theocracy",
        strength: 55, wealth: 70, influence: 80, military: 45, relations: {}
    },
    shadow_syndicate: {
        id: "shadow_syndicate", name: "Shadow Syndicate", shortName: "Syndicate", type: "criminal",
        description: "Underground network of thieves, assassins, and information brokers.",
        leader: "The Whisper", capital: null, territory: [],
        colors: { primary: "#1C1C1C", secondary: "#4B0082" },
        values: ["secrecy", "profit", "survival"], government: "syndicate",
        strength: 40, wealth: 65, influence: 50, military: 35, isHidden: true, relations: {}
    },
    mages_guild: {
        id: "mages_guild", name: "Arcane Conclave", shortName: "Mages", type: "guild",
        description: "Organization of mages dedicated to magical research and regulation.",
        leader: "Archmage Seraphina", capital: "tower_of_stars", territory: [],
        colors: { primary: "#4169E1", secondary: "#9400D3" },
        values: ["knowledge", "power", "caution"], government: "meritocracy",
        strength: 45, wealth: 60, influence: 70, military: 50, relations: {}
    }
};

const INITIAL_RELATIONS = {
    valdric_empire: { dwarven_holds: 60, sylvan_dominion: 30, orcish_dominion: -80, merchant_league: 50, church_of_light: 70, shadow_syndicate: -60, mages_guild: 40 },
    dwarven_holds: { valdric_empire: 60, sylvan_dominion: 20, orcish_dominion: -90, merchant_league: 40, church_of_light: 30, shadow_syndicate: -50, mages_guild: 10 },
    sylvan_dominion: { valdric_empire: 30, dwarven_holds: 20, orcish_dominion: -70, merchant_league: 20, church_of_light: -10, shadow_syndicate: -30, mages_guild: 50 },
    orcish_dominion: { valdric_empire: -80, dwarven_holds: -90, sylvan_dominion: -70, merchant_league: -20, church_of_light: -90, shadow_syndicate: 10, mages_guild: -40 }
};

class FactionSystem {
    constructor(stateManager, timeSystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.defaultFactions = DEFAULT_FACTIONS;
        this.initialRelations = INITIAL_RELATIONS;

        this.timeSystem.onWeekChanged(() => this.weeklyUpdate());
        this.timeSystem.onMonthChanged(() => this.monthlyUpdate());
    }

    initialize() {
        const state = this.stateManager.getSection('factions');
        if (!state.factions || Object.keys(state.factions).length === 0) {
            state.factions = JSON.parse(JSON.stringify(this.defaultFactions));
            state.relations = JSON.parse(JSON.stringify(this.initialRelations));
            state.activeEvents = [];
            state.playerReputation = {};
            this.stateManager.updateSection('factions', state);
        }
    }

    getFaction(factionId) { return this.stateManager.getSection('factions').factions[factionId]; }
    getAllFactions() { return Object.values(this.stateManager.getSection('factions').factions); }
    getVisibleFactions() { return this.getAllFactions().filter(f => !f.isHidden); }

    getRelation(faction1, faction2) {
        const relations = this.stateManager.getSection('factions').relations;
        return relations[faction1]?.[faction2] ?? 0;
    }

    setRelation(faction1, faction2, value) {
        const state = this.stateManager.getSection('factions');
        if (!state.relations[faction1]) state.relations[faction1] = {};
        if (!state.relations[faction2]) state.relations[faction2] = {};
        const clamped = Math.max(-100, Math.min(100, value));
        state.relations[faction1][faction2] = clamped;
        state.relations[faction2][faction1] = clamped;
        this.stateManager.updateSection('factions', state);
        return clamped;
    }

    modifyRelation(faction1, faction2, change) {
        const current = this.getRelation(faction1, faction2);
        return this.setRelation(faction1, faction2, current + change);
    }

    getRelationshipLevel(value) {
        if (value >= 80) return { level: "allied", name: "Allied", color: "#27ae60" };
        if (value >= 50) return { level: "friendly", name: "Friendly", color: "#2ecc71" };
        if (value >= 20) return { level: "cordial", name: "Cordial", color: "#3498db" };
        if (value >= -20) return { level: "neutral", name: "Neutral", color: "#95a5a6" };
        if (value >= -50) return { level: "unfriendly", name: "Unfriendly", color: "#e67e22" };
        if (value >= -80) return { level: "hostile", name: "Hostile", color: "#e74c3c" };
        return { level: "war", name: "At War", color: "#c0392b" };
    }

    getPlayerReputation(factionId) { return this.stateManager.getSection('factions').playerReputation[factionId] ?? 0; }

    modifyPlayerReputation(factionId, change) {
        const state = this.stateManager.getSection('factions');
        const current = state.playerReputation[factionId] ?? 0;
        state.playerReputation[factionId] = Math.max(-100, Math.min(100, current + change));
        this.stateManager.updateSection('factions', state);
        return state.playerReputation[factionId];
    }

    getEnemies(factionId) { return this.getAllFactions().filter(f => f.id !== factionId && this.getRelation(factionId, f.id) < -50); }
    getAllies(factionId) { return this.getAllFactions().filter(f => f.id !== factionId && this.getRelation(factionId, f.id) > 50); }

    weeklyUpdate() {
        const state = this.stateManager.getSection('factions');
        for (const [f1, relations] of Object.entries(state.relations)) {
            for (const [f2, value] of Object.entries(relations)) {
                if (Math.abs(value) > 20 && Math.abs(value) < 80) {
                    state.relations[f1][f2] = value + (value > 0 ? -1 : 1);
                }
            }
        }
        this.stateManager.updateSection('factions', state);
    }

    monthlyUpdate() {
        const factions = this.getAllFactions();
        for (const f1 of factions) {
            for (const f2 of factions) {
                if (f1.id >= f2.id) continue;
                this.checkFactionInteraction(f1, f2);
            }
        }
    }

    checkFactionInteraction(f1, f2) {
        const relation = this.getRelation(f1.id, f2.id);
        if (relation > 50 && Math.random() < 0.1) this.modifyRelation(f1.id, f2.id, 5);
        if (relation < -50 && Math.random() < 0.15) this.modifyRelation(f1.id, f2.id, -5);
    }

    updateFaction(factionId, updates) {
        const state = this.stateManager.getSection('factions');
        if (state.factions[factionId]) {
            state.factions[factionId] = { ...state.factions[factionId], ...updates };
            this.stateManager.updateSection('factions', state);
        }
    }

    getFactionsForPrompt() {
        const settings = this.stateManager.getSection('factions').settings || {};
        if (!settings.injectFactionsIntoPrompt) return '';
        const tensions = [];
        const factions = this.getAllFactions();
        for (const f1 of factions) {
            for (const f2 of factions) {
                if (f1.id >= f2.id) continue;
                const rel = this.getRelation(f1.id, f2.id);
                if (rel < -70) tensions.push(`${f1.shortName} vs ${f2.shortName}`);
            }
        }
        return tensions.length > 0 ? `[Tensions: ${tensions.join(', ')}]` : '';
    }
}

export { FactionSystem, DEFAULT_FACTIONS, INITIAL_RELATIONS };
