const CATASTROPHE_TYPES = {
    plague: {
        name: "Plague", icon: "☠️", category: "disease",
        baseSeverity: 70, spreadRate: 0.3, mortalityRate: 0.15,
        duration: { min: 30, max: 180 },
        effects: { population: -0.1, happiness: -30, health: -40, economy: -20 },
        countermeasures: ["quarantine", "healers", "divine_intervention"]
    },
    famine: {
        name: "Famine", icon: "🍂", category: "shortage",
        baseSeverity: 60, spreadRate: 0.1, mortalityRate: 0.08,
        duration: { min: 60, max: 365 },
        effects: { population: -0.05, happiness: -40, health: -20, economy: -30 },
        countermeasures: ["food_imports", "rationing", "migration"]
    },
    earthquake: {
        name: "Earthquake", icon: "🌍", category: "natural",
        baseSeverity: 80, spreadRate: 0, mortalityRate: 0.05,
        duration: { min: 1, max: 3 },
        effects: { infrastructure: -50, population: -0.02, economy: -40 },
        countermeasures: ["rebuilding", "rescue_operations"]
    },
    flood: {
        name: "Great Flood", icon: "🌊", category: "natural",
        baseSeverity: 65, spreadRate: 0.2, mortalityRate: 0.03,
        duration: { min: 7, max: 30 },
        effects: { infrastructure: -30, economy: -25, agriculture: -60 },
        countermeasures: ["drainage", "levees", "evacuation"]
    },
    volcanic_eruption: {
        name: "Volcanic Eruption", icon: "🌋", category: "natural",
        baseSeverity: 90, spreadRate: 0.4, mortalityRate: 0.1,
        duration: { min: 3, max: 14 },
        effects: { population: -0.08, infrastructure: -60, agriculture: -80 },
        countermeasures: ["evacuation", "divine_intervention"]
    },
    magical_catastrophe: {
        name: "Magical Catastrophe", icon: "✨", category: "supernatural",
        baseSeverity: 75, spreadRate: 0.5, mortalityRate: 0.05,
        duration: { min: 7, max: 60 },
        effects: { magic: -50, health: -20, sanity: -30 },
        countermeasures: ["mage_council", "sealing_ritual", "divine_intervention"]
    },
    dragon_attack: {
        name: "Dragon Attack", icon: "🐉", category: "creature",
        baseSeverity: 85, spreadRate: 0.6, mortalityRate: 0.12,
        duration: { min: 1, max: 14 },
        effects: { population: -0.06, infrastructure: -40, fear: 50 },
        countermeasures: ["dragon_slayer", "tribute", "evacuation"]
    },
    undead_rising: {
        name: "Undead Rising", icon: "💀", category: "supernatural",
        baseSeverity: 70, spreadRate: 0.4, mortalityRate: 0.08,
        duration: { min: 14, max: 90 },
        effects: { population: -0.04, fear: 60, faith: -20 },
        countermeasures: ["holy_crusade", "necromancer_hunt", "divine_intervention"]
    },
    blight: {
        name: "Crop Blight", icon: "🌾", category: "disease",
        baseSeverity: 55, spreadRate: 0.3, mortalityRate: 0,
        duration: { min: 60, max: 180 },
        effects: { agriculture: -70, economy: -35, happiness: -25 },
        countermeasures: ["crop_burning", "magical_cleansing", "imports"]
    },
    demon_incursion: {
        name: "Demon Incursion", icon: "👿", category: "supernatural",
        baseSeverity: 95, spreadRate: 0.7, mortalityRate: 0.15,
        duration: { min: 7, max: 60 },
        effects: { population: -0.1, faith: -30, sanity: -40 },
        countermeasures: ["holy_crusade", "sealing_ritual", "divine_intervention"]
    }
};

const SEVERITY_LEVELS = {
    minor: { name: "Minor", range: [0, 30], responseLevel: "local" },
    moderate: { name: "Moderate", range: [31, 50], responseLevel: "regional" },
    major: { name: "Major", range: [51, 70], responseLevel: "national" },
    severe: { name: "Severe", range: [71, 85], responseLevel: "international" },
    apocalyptic: { name: "Apocalyptic", range: [86, 100], responseLevel: "divine" }
};

const RESPONSE_ACTIONS = {
    quarantine: { name: "Quarantine", cost: 500, effectiveness: 0.3, applicableTo: ["plague", "blight"] },
    evacuation: { name: "Evacuation", cost: 1000, effectiveness: 0.5, applicableTo: ["flood", "volcanic_eruption", "dragon_attack"] },
    divine_intervention: { name: "Divine Intervention", cost: 5000, effectiveness: 0.8, applicableTo: ["all"] },
    rebuilding: { name: "Rebuilding Effort", cost: 2000, effectiveness: 0.4, applicableTo: ["earthquake", "flood"] },
    holy_crusade: { name: "Holy Crusade", cost: 3000, effectiveness: 0.6, applicableTo: ["undead_rising", "demon_incursion"] },
    mage_council: { name: "Mage Council", cost: 2500, effectiveness: 0.5, applicableTo: ["magical_catastrophe"] },
    dragon_slayer: { name: "Dragon Slayer Quest", cost: 4000, effectiveness: 0.7, applicableTo: ["dragon_attack"] }
};

class CatastropheSystem {
    constructor(stateManager, timeSystem, settlementSystem, factionSystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.settlementSystem = settlementSystem;
        this.factionSystem = factionSystem;
        this.catastropheTypes = CATASTROPHE_TYPES;
        this.severityLevels = SEVERITY_LEVELS;
        this.responseActions = RESPONSE_ACTIONS;

        this.timeSystem.onDayChanged(() => this.dailyUpdate());
        this.timeSystem.onWeekChanged(() => this.weeklyUpdate());
        this.timeSystem.onMonthChanged(() => this.monthlyUpdate());
    }

    initialize() {
        const state = this.stateManager.getSection('catastrophe');
        if (!state.active || !Array.isArray(state.active)) {
            state.active = [];
            state.history = [];
            state.responses = [];
            state.totalDeaths = 0;
            state.totalDamage = 0;
            this.stateManager.updateSection('catastrophe', state);
        }
    }

    getActiveCatastrophes() {
        return this.stateManager.getSection('catastrophe').active;
    }

    getCatastrophe(catastropheId) {
        return this.getActiveCatastrophes().find(c => c.id === catastropheId);
    }

    getSeverityLevel(severityValue) {
        for (const [levelId, level] of Object.entries(this.severityLevels)) {
            if (severityValue >= level.range[0] && severityValue <= level.range[1]) {
                return { id: levelId, ...level };
            }
        }
        return { id: 'apocalyptic', ...this.severityLevels.apocalyptic };
    }

    dailyUpdate() {
        this.progressCatastrophes();
        this.spreadCatastrophes();
        this.applyDailyEffects();
    }

    weeklyUpdate() {
        this.checkForNewCatastrophes();
        this.processResponses();
    }

    monthlyUpdate() {
        this.cleanupResolvedCatastrophes();
        this.generateCatastropheReport();
    }

    progressCatastrophes() {
        const state = this.stateManager.getSection('catastrophe');
        for (const catastrophe of state.active) {
            catastrophe.daysActive = (catastrophe.daysActive || 0) + 1;
            catastrophe.currentSeverity = this.calculateCurrentSeverity(catastrophe);
            if (catastrophe.daysActive >= catastrophe.duration) {
                catastrophe.status = 'resolving';
                catastrophe.currentSeverity = Math.max(0, catastrophe.currentSeverity - 5);
            }
            if (catastrophe.currentSeverity <= 0) {
                catastrophe.status = 'resolved';
            }
        }
        this.stateManager.updateSection('catastrophe', state);
    }

    calculateCurrentSeverity(catastrophe) {
        const catType = this.catastropheTypes[catastrophe.type];
        let severity = catastrophe.currentSeverity || catType.baseSeverity;
        if (catastrophe.responseEffectiveness) {
            severity *= (1 - catastrophe.responseEffectiveness);
        }
        if (catastrophe.daysActive > catastrophe.duration * 0.5) {
            severity *= 0.95;
        }
        return Math.max(0, Math.min(100, severity));
    }

    spreadCatastrophes() {
        const state = this.stateManager.getSection('catastrophe');
        for (const catastrophe of state.active.filter(c => c.status === 'active')) {
            const catType = this.catastropheTypes[catastrophe.type];
            if (catType.spreadRate > 0 && Math.random() < catType.spreadRate * 0.1) {
                const newLocations = this.getSpreadTargets(catastrophe);
                for (const location of newLocations) {
                    if (!catastrophe.affectedLocations.includes(location)) {
                        catastrophe.affectedLocations.push(location);
                        window.dispatchEvent(new CustomEvent('vws-catastrophe-spread', {
                            detail: { catastrophe, newLocation: location }
                        }));
                    }
                }
            }
        }
        this.stateManager.updateSection('catastrophe', state);
    }

    getSpreadTargets(catastrophe) {
        const neighbors = {
            'valdris_prime': ['northern_marches', 'eastern_provinces'],
            'khaz_morath': ['dwarven_mountains', 'valdric_heartland'],
            'aelindra': ['sylvan_forests'],
            'grakhan': ['orcish_wastes'],
            'freeport': ['merchant_coast']
        };
        const targets = [];
        for (const location of catastrophe.affectedLocations) {
            const locationNeighbors = neighbors[location] || [];
            targets.push(...locationNeighbors);
        }
        return [...new Set(targets)];
    }

    applyDailyEffects() {
        for (const catastrophe of this.getActiveCatastrophes().filter(c => c.status === 'active')) {
            const catType = this.catastropheTypes[catastrophe.type];
            const severity = catastrophe.currentSeverity / 100;
            for (const location of catastrophe.affectedLocations) {
                const settlement = this.settlementSystem?.getSettlement(location);
                if (settlement) {
                    if (catType.mortalityRate > 0) {
                        const deaths = Math.floor(settlement.population.current * catType.mortalityRate * severity / 365);
                        settlement.population.current = Math.max(0, settlement.population.current - deaths);
                        catastrophe.totalDeaths = (catastrophe.totalDeaths || 0) + deaths;
                    }
                    if (catType.effects.happiness) {
                        settlement.conditions.happiness = Math.max(0, settlement.conditions.happiness + catType.effects.happiness * severity / 30);
                    }
                    if (catType.effects.health) {
                        settlement.conditions.health = Math.max(0, settlement.conditions.health + catType.effects.health * severity / 30);
                    }
                    this.settlementSystem.updateSettlement(location, settlement);
                }
            }
        }
    }

    checkForNewCatastrophes() {
        const regions = ['valdris_prime', 'khaz_morath', 'aelindra', 'grakhan', 'freeport'];
        for (const region of regions) {
            if (Math.random() < 0.02) {
                const catTypes = Object.keys(this.catastropheTypes);
                const randomType = catTypes[Math.floor(Math.random() * catTypes.length)];
                this.trigger(randomType, region);
            }
        }
    }

    processResponses() {
        const state = this.stateManager.getSection('catastrophe');
        for (const response of state.responses.filter(r => r.status === 'active')) {
            response.progress = (response.progress || 0) + 0.1;
            if (response.progress >= 1) {
                this.applyResponseEffect(response);
                response.status = 'completed';
            }
        }
        this.stateManager.updateSection('catastrophe', state);
    }

    applyResponseEffect(response) {
        const catastrophe = this.getCatastrophe(response.catastropheId);
        if (catastrophe) {
            const responseType = this.responseActions[response.type];
            catastrophe.responseEffectiveness = (catastrophe.responseEffectiveness || 0) + responseType.effectiveness;
            catastrophe.responseEffectiveness = Math.min(0.9, catastrophe.responseEffectiveness);
        }
    }

    cleanupResolvedCatastrophes() {
        const state = this.stateManager.getSection('catastrophe');
        const resolved = state.active.filter(c => c.status === 'resolved');
        for (const catastrophe of resolved) {
            state.history.push({
                ...catastrophe,
                resolvedAt: Date.now(),
                resolvedGameDate: this.timeSystem.getCurrentDateString()
            });
            state.totalDeaths += catastrophe.totalDeaths || 0;
            state.totalDamage += catastrophe.totalDamage || 0;
        }
        state.active = state.active.filter(c => c.status !== 'resolved');
        state.responses = state.responses.filter(r => r.status !== 'completed');
        this.stateManager.updateSection('catastrophe', state);
    }

    generateCatastropheReport() {
        const active = this.getActiveCatastrophes();
        if (active.length > 0) {
            window.dispatchEvent(new CustomEvent('vws-catastrophe-report', {
                detail: {
                    active: active.length,
                    mostSevere: active.reduce((max, c) => c.currentSeverity > (max?.currentSeverity || 0) ? c : max, null)
                }
            }));
        }
    }

    trigger(type, location) {
        const catType = this.catastropheTypes[type];
        if (!catType) return null;
        const state = this.stateManager.getSection('catastrophe');
        const catastrophe = {
            id: this.generateUUID(),
            type,
            name: catType.name,
            status: 'active',
            affectedLocations: [location],
            initialSeverity: catType.baseSeverity + Math.floor(Math.random() * 20) - 10,
            currentSeverity: catType.baseSeverity,
            duration: catType.duration.min + Math.floor(Math.random() * (catType.duration.max - catType.duration.min)),
            daysActive: 0,
            totalDeaths: 0,
            totalDamage: 0,
            responseEffectiveness: 0,
            startedAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString()
        };
        catastrophe.currentSeverity = catastrophe.initialSeverity;
        state.active.push(catastrophe);
        this.stateManager.updateSection('catastrophe', state);
        window.dispatchEvent(new CustomEvent('vws-catastrophe-started', { detail: catastrophe }));
        return catastrophe;
    }

    respondToCatastrophe(catastropheId, responseType) {
        const catastrophe = this.getCatastrophe(catastropheId);
        if (!catastrophe) return null;
        const responseAction = this.responseActions[responseType];
        if (!responseAction) return null;
        const catType = this.catastropheTypes[catastrophe.type];
        if (!responseAction.applicableTo.includes('all') && !responseAction.applicableTo.includes(catastrophe.type)) {
            return { success: false, reason: 'Response not applicable to this catastrophe type' };
        }
        const state = this.stateManager.getSection('catastrophe');
        const response = {
            id: this.generateUUID(),
            catastropheId,
            type: responseType,
            cost: responseAction.cost,
            status: 'active',
            progress: 0,
            startedAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString()
        };
        state.responses.push(response);
        this.stateManager.updateSection('catastrophe', state);
        window.dispatchEvent(new CustomEvent('vws-catastrophe-response', { detail: response }));
        return { success: true, response };
    }

    resolve(catastropheId) {
        const state = this.stateManager.getSection('catastrophe');
        const catastrophe = state.active.find(c => c.id === catastropheId);
        if (catastrophe) {
            catastrophe.status = 'resolved';
            this.stateManager.updateSection('catastrophe', state);
            window.dispatchEvent(new CustomEvent('vws-catastrophe-resolved', { detail: catastrophe }));
        }
    }

    getCatastropheForPrompt() {
        const settings = this.stateManager.getSection('catastrophe').settings || {};
        if (!settings.injectCatastropheIntoPrompt) return '';
        const active = this.getActiveCatastrophes().filter(c => c.status === 'active');
        if (active.length === 0) return '';
        return `[Catastrophes: ${active.map(c => `${c.name} (${this.getSeverityLevel(c.currentSeverity).name})`).join(', ')}]`;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}

export { CatastropheSystem, CATASTROPHE_TYPES, SEVERITY_LEVELS, RESPONSE_ACTIONS };
