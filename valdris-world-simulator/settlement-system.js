const SETTLEMENT_TYPES = {
    hamlet: { name: "Hamlet", icon: "🏚️", populationRange: [10, 100], canUpgradeTo: "village" },
    village: { name: "Village", icon: "🏘️", populationRange: [100, 1000], canUpgradeTo: "town" },
    town: { name: "Town", icon: "🏙️", populationRange: [1000, 10000], canUpgradeTo: "city" },
    city: { name: "City", icon: "🏰", populationRange: [10000, 100000], canUpgradeTo: "metropolis" },
    metropolis: { name: "Metropolis", icon: "🌆", populationRange: [100000, 500000] },
    capital: { name: "Capital", icon: "👑", populationRange: [50000, 1000000], bonuses: { prosperity: 10 } }
};

const SETTLEMENT_PROBLEMS = {
    crime_wave: { name: "Crime Wave", icon: "🔪", effects: { safety: -20, happiness: -10 }, duration: { min: 14, max: 60 } },
    plague: { name: "Plague Outbreak", icon: "☠️", effects: { health: -40, population: -10 }, duration: { min: 30, max: 90 } },
    food_shortage: { name: "Food Shortage", icon: "🍞", effects: { happiness: -25, health: -10 }, duration: { min: 30, max: 120 } },
    famine: { name: "Famine", icon: "💀", effects: { happiness: -50, population: -5, health: -30 }, duration: { min: 60, max: 180 } },
    unrest: { name: "Civil Unrest", icon: "😠", effects: { order: -25, safety: -15 }, duration: { min: 14, max: 60 } },
    riots: { name: "Riots", icon: "🔥", effects: { order: -40, safety: -30, prosperity: -20 }, duration: { min: 3, max: 14 } },
    siege: { name: "Under Siege", icon: "⚔️", effects: { trade: -90, food: -50 }, duration: { min: 14, max: 365 } }
};

const DEFAULT_SETTLEMENTS = {
    valdris_prime: { id: "valdris_prime", name: "Valdris Prime", type: "capital", region: "valdric_heartland", faction: "valdric_empire", population: { current: 150000, capacity: 200000, growth: 0.02 }, economy: { prosperity: 80, wealth: 85, tradeVolume: 90 }, infrastructure: { walls: { exists: true, condition: 90, level: "fortified" } }, conditions: { safety: 75, health: 70, happiness: 65, order: 80, problems: [] } },
    khaz_morath: { id: "khaz_morath", name: "Khaz'Morath", type: "city", region: "dwarven_mountains", faction: "dwarven_holds", population: { current: 45000, capacity: 60000, growth: 0.01 }, economy: { prosperity: 85, wealth: 90, specialization: "mining" }, infrastructure: { walls: { exists: true, condition: 95, level: "fortified" } }, conditions: { safety: 90, health: 75, happiness: 70, order: 85, problems: [] } },
    aelindra: { id: "aelindra", name: "Aelindra", type: "city", region: "sylvan_forests", faction: "sylvan_dominion", population: { current: 25000, capacity: 30000, growth: 0.005 }, economy: { prosperity: 75, wealth: 70, specialization: "magic" }, infrastructure: { walls: { exists: true, level: "magical" } }, conditions: { safety: 85, health: 90, happiness: 80, order: 75, problems: [] } },
    grakhan: { id: "grakhan", name: "Grakhan", type: "town", region: "orcish_wastes", faction: "orcish_dominion", population: { current: 8000, capacity: 15000, growth: 0.03 }, economy: { prosperity: 35, wealth: 30, specialization: "raiding" }, infrastructure: { walls: { exists: true, condition: 60, level: "wooden" } }, conditions: { safety: 40, health: 45, happiness: 50, order: 60, problems: [] } },
    freeport: { id: "freeport", name: "Freeport", type: "city", region: "merchant_coast", faction: "merchant_league", population: { current: 60000, capacity: 80000, growth: 0.025 }, economy: { prosperity: 90, wealth: 95, specialization: "trade" }, infrastructure: { walls: { exists: true, condition: 70, level: "stone" } }, conditions: { safety: 60, health: 65, happiness: 70, order: 55, problems: [] } }
};

class SettlementSystem {
    constructor(stateManager, timeSystem, eventSystem, economySystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.eventSystem = eventSystem;
        this.economySystem = economySystem;
        this.settlementTypes = SETTLEMENT_TYPES;
        this.problems = SETTLEMENT_PROBLEMS;
        this.defaultSettlements = DEFAULT_SETTLEMENTS;

        this.timeSystem.onDayChanged(() => this.dailyUpdate());
        this.timeSystem.onMonthChanged(() => this.monthlyUpdate());
    }

    initialize() {
        const state = this.stateManager.getSection('settlements');
        if (!state.locations || Object.keys(state.locations).length === 0) {
            state.locations = JSON.parse(JSON.stringify(this.defaultSettlements));
            state.global = { totalPopulation: 0, averageProsperity: 0, settlementsInCrisis: 0 };
            this.stateManager.updateSection('settlements', state);
            this.updateGlobalStats();
        }
    }

    getSettlement(id) { return this.stateManager.getSection('settlements').locations[id]; }
    getAllSettlements() { return Object.values(this.stateManager.getSection('settlements').locations); }
    getSettlementsByFaction(factionId) { return this.getAllSettlements().filter(s => s.faction === factionId); }

    dailyUpdate() {
        for (const settlement of this.getAllSettlements()) this.updateSettlementDaily(settlement);
        this.updateGlobalStats();
    }

    updateSettlementDaily(settlement) {
        this.consumeResources(settlement);
        this.checkProblemTriggers(settlement);
        this.updateConditions(settlement);
        this.updateSettlement(settlement.id, settlement);
    }

    consumeResources(settlement) {
        if (settlement.economy.resources?.food < 20) this.addProblem(settlement, 'food_shortage');
    }

    checkProblemTriggers(settlement) {
        if (settlement.conditions.safety < 40 && Math.random() < 0.05) this.addProblem(settlement, 'crime_wave');
        if (settlement.conditions.health < 30 && Math.random() < 0.03) this.addProblem(settlement, 'plague');
        if (settlement.conditions.happiness < 30 && Math.random() < 0.04) this.addProblem(settlement, 'unrest');
    }

    updateConditions(settlement) {
        let safety = 50, health = 50, happiness = 50, order = 50;
        if (settlement.infrastructure?.walls?.exists) safety += 10;
        const prosperity = settlement.economy?.prosperity || 50;
        happiness += (prosperity - 50) * 0.3;
        for (const problemId of settlement.conditions.problems || []) {
            const problem = this.problems[problemId];
            if (problem?.effects) {
                safety += problem.effects.safety || 0;
                health += problem.effects.health || 0;
                happiness += problem.effects.happiness || 0;
                order += problem.effects.order || 0;
            }
        }
        settlement.conditions.safety = Math.max(0, Math.min(100, safety));
        settlement.conditions.health = Math.max(0, Math.min(100, health));
        settlement.conditions.happiness = Math.max(0, Math.min(100, happiness));
        settlement.conditions.order = Math.max(0, Math.min(100, order));
    }

    monthlyUpdate() {
        for (const settlement of this.getAllSettlements()) {
            this.updatePopulation(settlement);
            this.resolveProblemProgress(settlement);
        }
    }

    updatePopulation(settlement) {
        const baseGrowth = settlement.population?.growth || 0.02;
        let growthModifier = 1.0;
        if (settlement.conditions.health < 40) growthModifier *= 0.5;
        if (settlement.conditions.happiness < 40) growthModifier *= 0.7;
        if (settlement.conditions.problems?.includes('plague')) growthModifier *= -2;
        if (settlement.conditions.problems?.includes('famine')) growthModifier *= -1;
        const monthlyGrowth = (baseGrowth / 12) * growthModifier;
        const change = Math.floor(settlement.population.current * monthlyGrowth);
        settlement.population.current = Math.max(0, Math.min(settlement.population.capacity, settlement.population.current + change));
        this.updateSettlement(settlement.id, settlement);
    }

    resolveProblemProgress(settlement) {
        const toRemove = [];
        for (const problemId of settlement.conditions.problems || []) {
            const problemData = settlement.problemData?.[problemId];
            if (!problemData) continue;
            problemData.daysActive = (problemData.daysActive || 0) + 30;
            const problem = this.problems[problemId];
            if (problem && problemData.daysActive >= (problem.duration?.min || 14)) {
                if (Math.random() < 0.3) toRemove.push(problemId);
            }
        }
        for (const problemId of toRemove) this.removeProblem(settlement, problemId);
    }

    addProblem(settlement, problemId) {
        if (settlement.conditions.problems?.includes(problemId)) return;
        settlement.conditions.problems = settlement.conditions.problems || [];
        settlement.conditions.problems.push(problemId);
        settlement.problemData = settlement.problemData || {};
        settlement.problemData[problemId] = { startedAt: Date.now(), daysActive: 0 };
        this.updateSettlement(settlement.id, settlement);
    }

    removeProblem(settlement, problemId) {
        settlement.conditions.problems = (settlement.conditions.problems || []).filter(p => p !== problemId);
        delete settlement.problemData?.[problemId];
        this.updateSettlement(settlement.id, settlement);
    }

    updateSettlement(id, data) {
        const state = this.stateManager.getSection('settlements');
        state.locations[id] = { ...state.locations[id], ...data };
        this.stateManager.updateSection('settlements', state);
    }

    updateGlobalStats() {
        const state = this.stateManager.getSection('settlements');
        const settlements = Object.values(state.locations);
        state.global.totalPopulation = settlements.reduce((sum, s) => sum + (s.population?.current || 0), 0);
        state.global.averageProsperity = settlements.reduce((sum, s) => sum + (s.economy?.prosperity || 0), 0) / settlements.length;
        state.global.settlementsInCrisis = settlements.filter(s => (s.conditions.problems?.length || 0) > 2).length;
        this.stateManager.updateSection('settlements', state);
    }

    getSettlementsForPrompt() {
        const settings = this.stateManager.getSection('settlements').settings || {};
        if (!settings.injectSettlementsIntoPrompt) return '';
        const crisisSettlements = this.getAllSettlements().filter(s => s.conditions.problems?.length > 0).slice(0, 3);
        if (crisisSettlements.length === 0) return '';
        return `[Settlements: ${crisisSettlements.map(s => `${s.name}: ${s.conditions.problems.join(', ')}`).join('; ')}]`;
    }
}

export { SettlementSystem, SETTLEMENT_TYPES, SETTLEMENT_PROBLEMS, DEFAULT_SETTLEMENTS };
