const OPERATION_TYPES = {
    espionage: {
        name: "Espionage", icon: "🕵️",
        baseCost: 100, baseSuccessRate: 0.6, detectionRisk: 0.3,
        effects: { intelligence: 20, tension: 5 },
        requirements: { spyNetwork: 20 }
    },
    sabotage: {
        name: "Sabotage", icon: "💣",
        baseCost: 200, baseSuccessRate: 0.4, detectionRisk: 0.5,
        effects: { targetEconomy: -15, tension: 20 },
        requirements: { spyNetwork: 40 }
    },
    propaganda: {
        name: "Propaganda", icon: "📢",
        baseCost: 50, baseSuccessRate: 0.7, detectionRisk: 0.2,
        effects: { targetStability: -10, ownInfluence: 10, tension: 5 },
        requirements: { spyNetwork: 10 }
    },
    assassination: {
        name: "Assassination", icon: "🗡️",
        baseCost: 500, baseSuccessRate: 0.2, detectionRisk: 0.7,
        effects: { targetLeadership: -50, tension: 50 },
        requirements: { spyNetwork: 60 }
    },
    economic_warfare: {
        name: "Economic Warfare", icon: "💰",
        baseCost: 300, baseSuccessRate: 0.5, detectionRisk: 0.4,
        effects: { targetWealth: -20, tension: 15 },
        requirements: { spyNetwork: 30 }
    },
    diplomatic_manipulation: {
        name: "Diplomatic Manipulation", icon: "🤝",
        baseCost: 150, baseSuccessRate: 0.55, detectionRisk: 0.35,
        effects: { targetRelations: -25, tension: 10 },
        requirements: { spyNetwork: 25 }
    },
    technology_theft: {
        name: "Technology Theft", icon: "📜",
        baseCost: 250, baseSuccessRate: 0.35, detectionRisk: 0.45,
        effects: { ownTechnology: 15, tension: 25 },
        requirements: { spyNetwork: 45 }
    },
    counter_intelligence: {
        name: "Counter Intelligence", icon: "🛡️",
        baseCost: 100, baseSuccessRate: 0.65, detectionRisk: 0.1,
        effects: { ownSecurity: 20, tension: 0 },
        requirements: { spyNetwork: 15 }
    }
};

const TENSION_LEVELS = {
    peaceful: { name: "Peaceful Coexistence", range: [0, 20], warRisk: 0.01, tradeModifier: 1.2 },
    cool: { name: "Cool Relations", range: [21, 40], warRisk: 0.05, tradeModifier: 1.0 },
    tense: { name: "Tense Relations", range: [41, 60], warRisk: 0.1, tradeModifier: 0.8 },
    hostile: { name: "Hostile Standoff", range: [61, 80], warRisk: 0.2, tradeModifier: 0.5 },
    brink: { name: "Brink of War", range: [81, 100], warRisk: 0.4, tradeModifier: 0.2 }
};

const SPY_NETWORK_LEVELS = {
    none: { name: "No Network", range: [0, 10], operationModifier: 0.5 },
    basic: { name: "Basic Network", range: [11, 30], operationModifier: 0.75 },
    established: { name: "Established Network", range: [31, 50], operationModifier: 1.0 },
    extensive: { name: "Extensive Network", range: [51, 70], operationModifier: 1.25 },
    dominant: { name: "Dominant Network", range: [71, 100], operationModifier: 1.5 }
};

const DEFAULT_TENSIONS = {
    empire_orcs: {
        id: "empire_orcs",
        faction1: "valdric_empire",
        faction2: "orcish_dominion",
        tension: 75,
        spyNetworks: { valdric_empire: 40, orcish_dominion: 20 },
        operations: [],
        incidents: [],
        status: 'active'
    },
    empire_dwarves: {
        id: "empire_dwarves",
        faction1: "valdric_empire",
        faction2: "dwarven_holds",
        tension: 15,
        spyNetworks: { valdric_empire: 25, dwarven_holds: 30 },
        operations: [],
        incidents: [],
        status: 'active'
    },
    elves_orcs: {
        id: "elves_orcs",
        faction1: "sylvan_dominion",
        faction2: "orcish_dominion",
        tension: 60,
        spyNetworks: { sylvan_dominion: 35, orcish_dominion: 15 },
        operations: [],
        incidents: [],
        status: 'active'
    },
    merchants_all: {
        id: "merchants_all",
        faction1: "merchant_league",
        faction2: "valdric_empire",
        tension: 30,
        spyNetworks: { merchant_league: 60, valdric_empire: 35 },
        operations: [],
        incidents: [],
        status: 'active'
    }
};

class ColdWarSystem {
    constructor(stateManager, timeSystem, factionSystem, economySystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.factionSystem = factionSystem;
        this.economySystem = economySystem;
        this.operationTypes = OPERATION_TYPES;
        this.tensionLevels = TENSION_LEVELS;
        this.spyNetworkLevels = SPY_NETWORK_LEVELS;
        this.defaultTensions = DEFAULT_TENSIONS;

        this.timeSystem.onWeekChanged(() => this.weeklyUpdate());
        this.timeSystem.onMonthChanged(() => this.monthlyUpdate());
    }

    initialize() {
        const state = this.stateManager.getSection('coldWar');
        if (!state.tensions || Object.keys(state.tensions).length === 0) {
            state.tensions = JSON.parse(JSON.stringify(this.defaultTensions));
            state.completedOperations = [];
            state.discoveredOperations = [];
            state.warsTrigger = [];
            this.stateManager.updateSection('coldWar', state);
        }
    }

    getTension(tensionId) {
        return this.stateManager.getSection('coldWar').tensions[tensionId];
    }

    getTensionBetween(faction1, faction2) {
        const tensions = Object.values(this.stateManager.getSection('coldWar').tensions);
        return tensions.find(t =>
            (t.faction1 === faction1 && t.faction2 === faction2) ||
            (t.faction1 === faction2 && t.faction2 === faction1)
        );
    }

    getAllTensions() {
        return Object.values(this.stateManager.getSection('coldWar').tensions);
    }

    getActiveTensions() {
        return this.getAllTensions().filter(t => t.status === 'active');
    }

    getTensionLevel(tensionValue) {
        for (const [levelId, level] of Object.entries(this.tensionLevels)) {
            if (tensionValue >= level.range[0] && tensionValue <= level.range[1]) {
                return { id: levelId, ...level };
            }
        }
        return { id: 'brink', ...this.tensionLevels.brink };
    }

    getSpyNetworkLevel(networkValue) {
        for (const [levelId, level] of Object.entries(this.spyNetworkLevels)) {
            if (networkValue >= level.range[0] && networkValue <= level.range[1]) {
                return { id: levelId, ...level };
            }
        }
        return { id: 'dominant', ...this.spyNetworkLevels.dominant };
    }

    weeklyUpdate() {
        for (const tension of this.getActiveTensions()) {
            this.simulateFactionOperations(tension);
            this.processOngoingOperations(tension);
            this.naturalTensionDecay(tension);
        }
    }

    monthlyUpdate() {
        for (const tension of this.getActiveTensions()) {
            this.updateSpyNetworks(tension);
            this.checkWarTrigger(tension);
            this.generateIncidents(tension);
        }
    }

    simulateFactionOperations(tension) {
        const tensionLevel = this.getTensionLevel(tension.tension);
        for (const factionId of [tension.faction1, tension.faction2]) {
            const opponentId = factionId === tension.faction1 ? tension.faction2 : tension.faction1;
            const spyNetwork = tension.spyNetworks[factionId] || 0;
            if (spyNetwork > 20 && Math.random() < 0.2) {
                const availableOps = Object.entries(this.operationTypes)
                    .filter(([_, op]) => spyNetwork >= (op.requirements?.spyNetwork || 0))
                    .map(([id]) => id);
                if (availableOps.length > 0) {
                    const opType = availableOps[Math.floor(Math.random() * availableOps.length)];
                    this.launchOperation(tension.id, factionId, opType);
                }
            }
        }
    }

    launchOperation(tensionId, launchingFaction, operationType) {
        const tension = this.getTension(tensionId);
        if (!tension) return null;
        const opType = this.operationTypes[operationType];
        if (!opType) return null;
        const spyNetwork = tension.spyNetworks[launchingFaction] || 0;
        const networkLevel = this.getSpyNetworkLevel(spyNetwork);
        const successChance = opType.baseSuccessRate * networkLevel.operationModifier;
        const detectionChance = opType.detectionRisk * (1 - networkLevel.operationModifier * 0.3);
        const success = Math.random() < successChance;
        const detected = Math.random() < detectionChance;
        const operation = {
            id: this.generateUUID(),
            tensionId,
            type: operationType,
            launchingFaction,
            targetFaction: launchingFaction === tension.faction1 ? tension.faction2 : tension.faction1,
            success,
            detected,
            cost: opType.baseCost,
            startedAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString(),
            status: 'completed'
        };
        this.applyOperationResults(tension, operation, opType);
        tension.operations.push(operation);
        const state = this.stateManager.getSection('coldWar');
        state.completedOperations.push(operation);
        if (detected) {
            state.discoveredOperations.push(operation);
            window.dispatchEvent(new CustomEvent('vws-operation-discovered', { detail: operation }));
        }
        this.updateTension(tensionId, tension);
        this.stateManager.updateSection('coldWar', state);
        window.dispatchEvent(new CustomEvent('vws-operation-completed', { detail: operation }));
        return operation;
    }

    applyOperationResults(tension, operation, opType) {
        if (operation.success) {
            tension.tension = Math.max(0, Math.min(100, tension.tension + (opType.effects.tension || 0)));
            if (opType.effects.targetEconomy && this.economySystem) {
                // Apply economic effects to target faction's region
            }
            if (opType.effects.ownSecurity) {
                tension.spyNetworks[operation.launchingFaction] = Math.min(100,
                    (tension.spyNetworks[operation.launchingFaction] || 0) + 5);
            }
        }
        if (operation.detected) {
            tension.tension = Math.min(100, tension.tension + 10);
            if (this.factionSystem) {
                this.factionSystem.modifyRelation(operation.launchingFaction, operation.targetFaction, -15);
            }
        }
    }

    processOngoingOperations(tension) {
        // Process any long-running operations
        const ongoingOps = tension.operations.filter(op => op.status === 'ongoing');
        for (const op of ongoingOps) {
            const daysSinceStart = (Date.now() - op.startedAt) / (24 * 60 * 60 * 1000);
            if (daysSinceStart >= (op.duration || 7)) {
                op.status = 'completed';
            }
        }
    }

    naturalTensionDecay(tension) {
        if (tension.tension > 0 && Math.random() < 0.3) {
            tension.tension = Math.max(0, tension.tension - 1);
            this.updateTension(tension.id, tension);
        }
    }

    updateSpyNetworks(tension) {
        for (const factionId of [tension.faction1, tension.faction2]) {
            const currentNetwork = tension.spyNetworks[factionId] || 0;
            const faction = this.factionSystem?.getFaction(factionId);
            let networkChange = 0;
            if (faction) {
                if (faction.economy > 70) networkChange += 2;
                if (faction.military > 70) networkChange += 1;
            }
            networkChange += Math.floor(Math.random() * 3) - 1;
            tension.spyNetworks[factionId] = Math.max(0, Math.min(100, currentNetwork + networkChange));
        }
        this.updateTension(tension.id, tension);
    }

    checkWarTrigger(tension) {
        const tensionLevel = this.getTensionLevel(tension.tension);
        if (Math.random() < tensionLevel.warRisk) {
            this.triggerWar(tension);
        }
    }

    triggerWar(tension) {
        const state = this.stateManager.getSection('coldWar');
        tension.status = 'war';
        state.warsTrigger.push({
            tensionId: tension.id,
            faction1: tension.faction1,
            faction2: tension.faction2,
            triggeredAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString(),
            finalTension: tension.tension
        });
        this.updateTension(tension.id, tension);
        this.stateManager.updateSection('coldWar', state);
        window.dispatchEvent(new CustomEvent('vws-cold-war-escalated', { detail: tension }));
    }

    generateIncidents(tension) {
        const tensionLevel = this.getTensionLevel(tension.tension);
        if (Math.random() < 0.1 + tension.tension / 200) {
            const incidents = [
                { type: 'border_skirmish', tensionChange: 15, description: 'Border skirmish between patrols' },
                { type: 'diplomatic_incident', tensionChange: 10, description: 'Diplomatic incident at embassy' },
                { type: 'trade_dispute', tensionChange: 5, description: 'Trade dispute escalates' },
                { type: 'refugee_crisis', tensionChange: 8, description: 'Refugee crisis creates tension' },
                { type: 'assassination_attempt', tensionChange: 25, description: 'Assassination attempt on official' },
                { type: 'peace_talks', tensionChange: -20, description: 'Peace talks reduce tension' }
            ];
            const incident = incidents[Math.floor(Math.random() * incidents.length)];
            tension.tension = Math.max(0, Math.min(100, tension.tension + incident.tensionChange));
            tension.incidents.push({
                ...incident,
                date: Date.now(),
                gameDate: this.timeSystem.getCurrentDateString()
            });
            this.updateTension(tension.id, tension);
            window.dispatchEvent(new CustomEvent('vws-cold-war-incident', { detail: { tension, incident } }));
        }
    }

    addTension(faction1, faction2, initialTension = 50) {
        const tensionId = `${faction1}_${faction2}`;
        const existing = this.getTensionBetween(faction1, faction2);
        if (existing) return existing;
        const newTension = {
            id: tensionId,
            faction1,
            faction2,
            tension: initialTension,
            spyNetworks: { [faction1]: 20, [faction2]: 20 },
            operations: [],
            incidents: [],
            status: 'active'
        };
        const state = this.stateManager.getSection('coldWar');
        state.tensions[tensionId] = newTension;
        this.stateManager.updateSection('coldWar', state);
        return newTension;
    }

    modifyTension(faction1, faction2, change) {
        const tension = this.getTensionBetween(faction1, faction2);
        if (tension) {
            tension.tension = Math.max(0, Math.min(100, tension.tension + change));
            this.updateTension(tension.id, tension);
        }
    }

    updateTension(tensionId, data) {
        const state = this.stateManager.getSection('coldWar');
        state.tensions[tensionId] = { ...state.tensions[tensionId], ...data };
        this.stateManager.updateSection('coldWar', state);
    }

    getColdWarForPrompt() {
        const settings = this.stateManager.getSection('coldWar').settings || {};
        if (!settings.injectColdWarIntoPrompt) return '';
        const highTensions = this.getActiveTensions().filter(t => t.tension >= 60);
        if (highTensions.length === 0) return '';
        return `[Tensions: ${highTensions.map(t => `${t.faction1} vs ${t.faction2}: ${this.getTensionLevel(t.tension).name}`).join('; ')}]`;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}

export { ColdWarSystem, OPERATION_TYPES, TENSION_LEVELS, SPY_NETWORK_LEVELS, DEFAULT_TENSIONS };
