const NPC_TEMPLATE = {
    id: "", name: "", title: "", faction: null, role: "citizen",
    currentLocation: null, homeLocation: null, workplace: null,
    schedule: { morning: null, afternoon: null, evening: null, night: null },
    stats: { health: 100, wealth: 50, influence: 30, happiness: 50 },
    personality: { ambition: 50, loyalty: 50, aggression: 30, greed: 40, honor: 50 },
    goals: [], currentGoal: null,
    relationships: {},
    status: "alive", conditions: [], lifeEvents: [],
    playerRelationship: { met: false, disposition: 0, interactions: 0 }
};

const DEFAULT_NPCS = {
    emperor_aldric: { id: "emperor_aldric", name: "Aldric III", title: "Emperor", faction: "valdric_empire", role: "ruler", currentLocation: "valdris_prime", homeLocation: "imperial_palace", stats: { health: 60, wealth: 100, influence: 100, happiness: 40 }, personality: { ambition: 70, loyalty: 60, aggression: 40, greed: 50, honor: 60 }, goals: ["expand_empire", "secure_succession", "defeat_orcs"] },
    high_king_thorin: { id: "high_king_thorin", name: "Thorin Stonehammer", title: "High King", faction: "dwarven_holds", role: "ruler", currentLocation: "khaz_morath", homeLocation: "throne_hall", stats: { health: 80, wealth: 95, influence: 85, happiness: 55 }, personality: { ambition: 40, loyalty: 80, aggression: 50, greed: 30, honor: 90 }, goals: ["protect_holds", "increase_trade", "reclaim_lost_halls"] },
    lady_aelindra: { id: "lady_aelindra", name: "Aelindra Moonwhisper", title: "High Lady", faction: "sylvan_dominion", role: "ruler", currentLocation: "aelindra", homeLocation: "moonlit_palace", stats: { health: 90, wealth: 70, influence: 80, happiness: 60 }, personality: { ambition: 30, loyalty: 70, aggression: 20, greed: 10, honor: 85 }, goals: ["preserve_forests", "maintain_peace", "advance_magic"] },
    warchief_grommash: { id: "warchief_grommash", name: "Grommash Bloodfist", title: "Warchief", faction: "orcish_dominion", role: "ruler", currentLocation: "grakhan", homeLocation: "war_tent", stats: { health: 95, wealth: 40, influence: 75, happiness: 70 }, personality: { ambition: 90, loyalty: 30, aggression: 95, greed: 60, honor: 40 }, goals: ["conquer_empire", "prove_strength", "unite_clans"] },
    guildmaster_corvus: { id: "guildmaster_corvus", name: "Corvus Blackwood", title: "Guildmaster", faction: "merchant_league", role: "ruler", currentLocation: "freeport", homeLocation: "guild_hall", stats: { health: 70, wealth: 100, influence: 85, happiness: 65 }, personality: { ambition: 80, loyalty: 40, aggression: 30, greed: 90, honor: 30 }, goals: ["maximize_profit", "expand_influence", "eliminate_competition"] },
    grorn_ironhide: { id: "grorn_ironhide", name: "Grorn Ironhide", title: "Blacksmith", faction: "valdric_empire", role: "merchant", currentLocation: "valdris_prime", homeLocation: "ironhide_forge", workplace: "ironhide_forge", schedule: { morning: "open_shop", afternoon: "smithing", evening: "tavern", night: "home" }, stats: { health: 85, wealth: 60, influence: 40, happiness: 55 }, personality: { ambition: 50, loyalty: 70, aggression: 40, greed: 40, honor: 75 }, goals: ["master_craft", "provide_family", "create_masterwork"] },
    sera_nightingale: { id: "sera_nightingale", name: "Sera Nightingale", title: "Information Broker", faction: "shadow_syndicate", role: "criminal", currentLocation: "valdris_prime", homeLocation: "hidden_safehouse", workplace: "various", stats: { health: 75, wealth: 70, influence: 55, happiness: 45 }, personality: { ambition: 70, loyalty: 20, aggression: 30, greed: 60, honor: 10 }, goals: ["gather_secrets", "survive", "gain_power"] }
};

const NPC_GOALS = {
    expand_empire: { name: "Expand Territory", type: "political", difficulty: 80 },
    secure_succession: { name: "Secure Succession", type: "political", difficulty: 60 },
    defeat_enemy: { name: "Defeat Enemy", type: "military", difficulty: 70 },
    maintain_peace: { name: "Maintain Peace", type: "political", difficulty: 50 },
    increase_wealth: { name: "Increase Wealth", type: "economic", difficulty: 40 },
    gain_power: { name: "Gain Power", type: "political", difficulty: 60 },
    find_love: { name: "Find Love", type: "personal", difficulty: 30 },
    master_craft: { name: "Master Craft", type: "personal", difficulty: 50 },
    revenge: { name: "Seek Revenge", type: "personal", difficulty: 70 },
    survive: { name: "Survive", type: "personal", difficulty: 30 }
};

const LIFE_EVENTS = {
    marriage: { name: "Marriage", requirements: { status: "alive" }, effects: { happiness: 20 }, probability: 0.02 },
    child_born: { name: "Child Born", requirements: { status: "alive", married: true }, effects: { happiness: 15, wealth: -10 }, probability: 0.03 },
    promotion: { name: "Promotion", requirements: { status: "alive" }, effects: { influence: 10, wealth: 15 }, probability: 0.01 },
    illness: { name: "Illness", requirements: { status: "alive" }, effects: { health: -30, happiness: -20 }, probability: 0.02 },
    death: { name: "Death", requirements: { status: "alive" }, effects: { status: "dead" }, probability: 0.005, conditionBased: true }
};

class NPCAutonomySystem {
    constructor(stateManager, timeSystem, factionSystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.factionSystem = factionSystem;
        this.npcTemplate = NPC_TEMPLATE;
        this.defaultNPCs = DEFAULT_NPCS;
        this.npcGoals = NPC_GOALS;
        this.lifeEvents = LIFE_EVENTS;

        this.timeSystem.onHourChanged(() => this.updateNPCLocations());
        this.timeSystem.onDayChanged(() => this.dailyUpdate());
        this.timeSystem.onMonthChanged(() => this.monthlyUpdate());
    }

    initialize() {
        const state = this.stateManager.getSection('npcs');
        if (!state.npcs || Object.keys(state.npcs).length === 0) {
            state.npcs = JSON.parse(JSON.stringify(this.defaultNPCs));
            state.deaths = [];
            state.marriages = [];
            this.stateManager.updateSection('npcs', state);
        }
    }

    getNPC(npcId) { return this.stateManager.getSection('npcs').npcs[npcId]; }
    getAllNPCs() { return Object.values(this.stateManager.getSection('npcs').npcs); }
    getLivingNPCs() { return this.getAllNPCs().filter(n => n.status === 'alive'); }
    getNPCsByFaction(factionId) { return this.getAllNPCs().filter(n => n.faction === factionId); }
    getNPCsByLocation(locationId) { return this.getAllNPCs().filter(n => n.currentLocation === locationId); }

    updateNPC(npcId, updates) {
        const state = this.stateManager.getSection('npcs');
        if (state.npcs[npcId]) {
            state.npcs[npcId] = { ...state.npcs[npcId], ...updates };
            this.stateManager.updateSection('npcs', state);
        }
    }

    updateNPCLocations() {
        const timeOfDay = this.timeSystem.getTimeOfDay();
        const scheduleKey = this.getScheduleKey(timeOfDay);
        for (const npc of this.getLivingNPCs()) {
            if (npc.schedule && npc.schedule[scheduleKey]) {
                const activity = npc.schedule[scheduleKey];
                const location = this.getLocationForActivity(npc, activity);
                if (location && location !== npc.currentLocation) {
                    this.updateNPC(npc.id, { currentLocation: location });
                }
            }
        }
    }

    getScheduleKey(timeOfDay) {
        if (['dawn', 'morning'].includes(timeOfDay)) return 'morning';
        if (['afternoon'].includes(timeOfDay)) return 'afternoon';
        if (['evening'].includes(timeOfDay)) return 'evening';
        return 'night';
    }

    getLocationForActivity(npc, activity) {
        switch (activity) {
            case 'home': return npc.homeLocation;
            case 'work': case 'open_shop': case 'smithing': return npc.workplace;
            case 'tavern': return 'local_tavern';
            case 'market': return 'market_square';
            case 'patrol': return npc.currentLocation;
            default: return null;
        }
    }

    dailyUpdate() {
        for (const npc of this.getLivingNPCs()) {
            this.updateNPCStats(npc);
            this.progressNPCGoals(npc);
            this.checkNPCRelationships(npc);
        }
    }

    monthlyUpdate() {
        for (const npc of this.getLivingNPCs()) {
            this.checkLifeEvents(npc);
        }
    }

    updateNPCStats(npc) {
        let healthChange = 0, happinessChange = 0;
        if (npc.stats.wealth < 20) happinessChange -= 5;
        if (npc.stats.wealth > 80) happinessChange += 2;
        if (npc.stats.health < 100 && npc.stats.health > 30) healthChange += 1;
        this.updateNPC(npc.id, {
            stats: {
                ...npc.stats,
                health: Math.max(0, Math.min(100, npc.stats.health + healthChange)),
                happiness: Math.max(0, Math.min(100, npc.stats.happiness + happinessChange))
            }
        });
    }

    progressNPCGoals(npc) {
        if (!npc.currentGoal && npc.goals?.length > 0) {
            npc.currentGoal = this.selectGoal(npc);
            this.updateNPC(npc.id, { currentGoal: npc.currentGoal });
        }
        if (npc.currentGoal && Math.random() < 0.01) this.completeGoal(npc);
    }

    selectGoal(npc) {
        const validGoals = npc.goals.filter(g => this.npcGoals[g]);
        if (validGoals.length === 0) return null;
        return validGoals[Math.floor(Math.random() * validGoals.length)];
    }

    completeGoal(npc) {
        const goal = this.npcGoals[npc.currentGoal];
        if (!goal) return;
        this.addLifeEvent(npc, { type: 'goal_completed', goal: npc.currentGoal, name: goal.name });
        const goals = npc.goals.filter(g => g !== npc.currentGoal);
        this.updateNPC(npc.id, { goals, currentGoal: null });
    }

    checkNPCRelationships(npc) {
        const nearbyNPCs = this.getNPCsByLocation(npc.currentLocation);
        for (const other of nearbyNPCs) {
            if (other.id === npc.id) continue;
            const currentRel = npc.relationships[other.id] || 0;
            if (npc.faction === other.faction && currentRel < 50) {
                this.modifyRelationship(npc.id, other.id, 1);
            }
        }
    }

    modifyRelationship(npc1Id, npc2Id, change) {
        const npc1 = this.getNPC(npc1Id);
        const npc2 = this.getNPC(npc2Id);
        if (!npc1 || !npc2) return;
        const newRel1 = Math.max(-100, Math.min(100, (npc1.relationships[npc2Id] || 0) + change));
        const newRel2 = Math.max(-100, Math.min(100, (npc2.relationships[npc1Id] || 0) + change));
        this.updateNPC(npc1Id, { relationships: { ...npc1.relationships, [npc2Id]: newRel1 } });
        this.updateNPC(npc2Id, { relationships: { ...npc2.relationships, [npc1Id]: newRel2 } });
    }

    checkLifeEvents(npc) {
        for (const [eventId, event] of Object.entries(this.lifeEvents)) {
            if (Math.random() < event.probability) {
                if (this.checkEventRequirements(npc, event)) {
                    this.triggerLifeEvent(npc, eventId, event);
                }
            }
        }
    }

    checkEventRequirements(npc, event) {
        const reqs = event.requirements;
        if (reqs.status && npc.status !== reqs.status) return false;
        if (reqs.married && !npc.spouse) return false;
        return true;
    }

    triggerLifeEvent(npc, eventId, event) {
        const updates = {};
        if (event.effects.health) updates.stats = { ...npc.stats, health: npc.stats.health + event.effects.health };
        if (event.effects.happiness) updates.stats = { ...(updates.stats || npc.stats), happiness: npc.stats.happiness + event.effects.happiness };
        if (event.effects.status) updates.status = event.effects.status;
        this.updateNPC(npc.id, updates);
        this.addLifeEvent(npc, { type: eventId, name: event.name });
        if (eventId === 'death') this.handleNPCDeath(npc);
        if (eventId === 'marriage') this.handleNPCMarriage(npc);
    }

    addLifeEvent(npc, event) {
        const lifeEvents = [...(npc.lifeEvents || []), { ...event, date: Date.now(), gameDate: this.timeSystem.getCurrentDateString() }];
        this.updateNPC(npc.id, { lifeEvents });
    }

    handleNPCDeath(npc, cause = 'natural') {
        this.updateNPC(npc.id, { status: 'dead' });
        const state = this.stateManager.getSection('npcs');
        state.deaths.push({ npcId: npc.id, name: npc.name, cause, date: Date.now(), gameDate: this.timeSystem.getCurrentDateString() });
        this.stateManager.updateSection('npcs', state);
        if (npc.role === 'ruler') this.triggerSuccession(npc);
        window.dispatchEvent(new CustomEvent('vws-npc-death', { detail: npc }));
    }

    handleNPCMarriage(npc) {
        const candidates = this.getLivingNPCs().filter(n => n.id !== npc.id && !n.spouse && n.faction === npc.faction && (npc.relationships[n.id] || 0) > 30);
        if (candidates.length === 0) return;
        const spouse = candidates[Math.floor(Math.random() * candidates.length)];
        this.updateNPC(npc.id, { spouse: spouse.id });
        this.updateNPC(spouse.id, { spouse: npc.id });
        const state = this.stateManager.getSection('npcs');
        state.marriages.push({ npc1: npc.id, npc2: spouse.id, date: Date.now(), gameDate: this.timeSystem.getCurrentDateString() });
        this.stateManager.updateSection('npcs', state);
    }

    triggerSuccession(deadRuler) {
        const faction = this.factionSystem.getFaction(deadRuler.faction);
        if (!faction) return;
        const potentialHeirs = this.getNPCsByFaction(deadRuler.faction).filter(n => n.status === 'alive' && n.role === 'noble');
        if (potentialHeirs.length > 0) {
            const heir = potentialHeirs[0];
            this.updateNPC(heir.id, { role: 'ruler', title: deadRuler.title });
            this.factionSystem.updateFaction(deadRuler.faction, { leader: heir.name });
        } else {
            window.dispatchEvent(new CustomEvent('vws-succession-crisis', { detail: { faction: deadRuler.faction } }));
        }
    }

    createNPC(data) {
        const npc = { ...this.npcTemplate, ...data, id: data.id || this.generateUUID() };
        const state = this.stateManager.getSection('npcs');
        state.npcs[npc.id] = npc;
        this.stateManager.updateSection('npcs', state);
        return npc;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}

export { NPCAutonomySystem, NPC_TEMPLATE, DEFAULT_NPCS, NPC_GOALS, LIFE_EVENTS };
