const EVENT_TYPES = {
    political: { name: "Political", icon: "👑", templates: ["succession_crisis", "coup_attempt", "diplomatic_marriage", "treaty_signed", "embargo"] },
    military: { name: "Military", icon: "⚔️", templates: ["war_declared", "battle_fought", "siege_begins", "army_defeated", "peace_treaty"] },
    economic: { name: "Economic", icon: "💰", templates: ["trade_boom", "market_crash", "resource_discovered", "trade_route_disrupted", "famine"] },
    natural: { name: "Natural", icon: "🌋", templates: ["earthquake", "flood", "drought", "plague_outbreak", "volcanic_eruption"] },
    supernatural: { name: "Supernatural", icon: "✨", templates: ["magical_anomaly", "dungeon_emergence", "divine_omen", "undead_rising", "dragon_sighting"] },
    social: { name: "Social", icon: "👥", templates: ["rebellion", "religious_movement", "cultural_festival", "famous_death", "scandal"] }
};

const EVENT_TEMPLATES = {
    succession_crisis: { name: "Succession Crisis", type: "political", severity: "major", description: "{{faction}} faces a disputed succession after {{leader}}'s death", duration: { min: 30, max: 180 }, effects: { faction_stability: -30, relations_nearby: -10 }, followUpEvents: ["civil_war", "new_ruler", "foreign_intervention"] },
    coup_attempt: { name: "Coup Attempt", type: "political", severity: "major", description: "A group attempts to overthrow {{leader}} of {{faction}}", duration: { min: 1, max: 14 }, effects: { faction_stability: -20, military_readiness: -15 }, outcomes: ["coup_success", "coup_failed", "civil_war"] },
    diplomatic_marriage: { name: "Diplomatic Marriage", type: "political", severity: "moderate", description: "{{faction1}} and {{faction2}} seal an alliance through marriage", effects: { relations: 25 }, duration: { min: 1, max: 1 } },
    war_declared: { name: "War Declared", type: "military", severity: "critical", description: "{{attacker}} declares war on {{defender}}", effects: { relations: -100, trade: -50 }, duration: null, triggersWar: true },
    battle_fought: { name: "Major Battle", type: "military", severity: "major", description: "A great battle is fought at {{location}}", effects: { casualties: true, territory_change: true }, duration: { min: 1, max: 3 } },
    siege_begins: { name: "Siege Begins", type: "military", severity: "major", description: "{{attacker}} lays siege to {{settlement}}", effects: { settlement_status: "besieged", trade: -80 }, duration: { min: 14, max: 365 } },
    trade_boom: { name: "Trade Boom", type: "economic", severity: "moderate", description: "Trade flourishes in {{region}}", effects: { prosperity: 20, prices: -10 }, duration: { min: 30, max: 90 } },
    market_crash: { name: "Market Crash", type: "economic", severity: "major", description: "Economic collapse hits {{region}}", effects: { prosperity: -30, prices: 25 }, duration: { min: 30, max: 120 } },
    resource_discovered: { name: "Resource Discovery", type: "economic", severity: "moderate", description: "Rich {{resource}} deposits found near {{location}}", effects: { resource_price: -30, prosperity: 15 }, duration: { min: 90, max: 365 } },
    earthquake: { name: "Earthquake", type: "natural", severity: "major", description: "A devastating earthquake strikes {{region}}", effects: { building_damage: 30, casualties: true, prosperity: -20 }, duration: { min: 1, max: 1 }, aftermathDuration: 60 },
    plague_outbreak: { name: "Plague Outbreak", type: "natural", severity: "critical", description: "A deadly plague spreads through {{region}}", effects: { health: -40, population: -10, trade: -50 }, duration: { min: 30, max: 180 }, canSpread: true },
    drought: { name: "Drought", type: "natural", severity: "moderate", description: "Severe drought affects {{region}}", effects: { food: -30, prosperity: -15 }, duration: { min: 60, max: 180 } },
    magical_anomaly: { name: "Magical Anomaly", type: "supernatural", severity: "moderate", description: "Strange magical phenomena reported near {{location}}", effects: { magic_level: 30, danger: 20 }, duration: { min: 7, max: 60 } },
    dungeon_emergence: { name: "Dungeon Emergence", type: "supernatural", severity: "major", description: "A new dungeon has emerged near {{location}}", effects: { monster_activity: 40, danger: 30, opportunity: 50 }, duration: null },
    undead_rising: { name: "Undead Rising", type: "supernatural", severity: "major", description: "The dead rise from their graves in {{region}}", effects: { danger: 50, fear: 30 }, duration: { min: 7, max: 30 } },
    dragon_sighting: { name: "Dragon Sighting", type: "supernatural", severity: "critical", description: "A dragon has been spotted near {{location}}", effects: { danger: 60, fear: 40 }, duration: null },
    rebellion: { name: "Rebellion", type: "social", severity: "major", description: "The people of {{region}} rise up against {{faction}}", effects: { stability: -40, military_needed: true }, duration: { min: 14, max: 180 } },
    famous_death: { name: "Famous Death", type: "social", severity: "moderate", description: "{{npc}} has died", effects: { morale: -10 }, duration: { min: 1, max: 1 }, triggerSuccession: true }
};

class EventSystem {
    constructor(stateManager, timeSystem, factionSystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.factionSystem = factionSystem;
        this.eventTypes = EVENT_TYPES;
        this.eventTemplates = EVENT_TEMPLATES;
        this.callbacks = { eventStarted: [], eventEnded: [] };

        this.timeSystem.onDayChanged(() => this.dailyUpdate());
        this.timeSystem.onWeekChanged(() => this.weeklyUpdate());
    }

    initialize() {
        const state = this.stateManager.getSection('events');
        if (!state.activeEvents) {
            state.activeEvents = [];
            state.eventHistory = [];
            state.pendingEvents = [];
            this.stateManager.updateSection('events', state);
        }
    }

    triggerEvent(templateId, context = {}) {
        const template = this.eventTemplates[templateId];
        if (!template) return null;
        const event = {
            id: this.generateUUID(),
            templateId, name: template.name, type: template.type, severity: template.severity,
            description: this.fillTemplate(template.description, context),
            context, effects: { ...template.effects },
            startDate: Date.now(), gameDate: this.timeSystem.getCurrentDateString(),
            duration: template.duration ? Math.floor(Math.random() * (template.duration.max - template.duration.min)) + template.duration.min : null,
            status: 'active'
        };
        const state = this.stateManager.getSection('events');
        state.activeEvents.push(event);
        this.stateManager.updateSection('events', state);
        this.applyEventEffects(event);
        this.triggerCallbacks('eventStarted', event);
        return event;
    }

    fillTemplate(template, context) {
        let result = template;
        for (const [key, value] of Object.entries(context)) {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        return result;
    }

    applyEventEffects(event) {
        const effects = event.effects;
        const context = event.context;
        if (effects.relations && context.faction1 && context.faction2) {
            this.factionSystem.modifyRelation(context.faction1, context.faction2, effects.relations);
        }
        if (effects.faction_stability && context.faction) {
            const faction = this.factionSystem.getFaction(context.faction);
            if (faction) this.factionSystem.updateFaction(context.faction, { stability: (faction.stability || 50) + effects.faction_stability });
        }
    }

    dailyUpdate() { this.checkEventExpiration(); this.checkEventProgression(); }
    weeklyUpdate() { this.generateRandomEvents(); }

    checkEventExpiration() {
        const state = this.stateManager.getSection('events');
        const now = Date.now();
        for (const event of state.activeEvents) {
            if (event.duration) {
                const daysPassed = Math.floor((now - event.startDate) / (24 * 60 * 60 * 1000));
                if (daysPassed >= event.duration) this.endEvent(event.id);
            }
        }
    }

    checkEventProgression() {
        const state = this.stateManager.getSection('events');
        for (const event of state.activeEvents) {
            if (event.canEscalate && Math.random() < 0.1) this.escalateEvent(event);
        }
    }

    generateRandomEvents() {
        const settings = this.stateManager.getSection('events').settings || {};
        if (!settings.generateRandomEvents) return;
        if (Math.random() < 0.15) this.generateEconomicEvent();
        if (Math.random() < 0.05) this.generateNaturalEvent();
        if (Math.random() < 0.08) this.generatePoliticalEvent();
        if (Math.random() < 0.03) this.generateSupernaturalEvent();
    }

    generateEconomicEvent() {
        const templates = ['trade_boom', 'market_crash', 'resource_discovered'];
        const regions = ['valdric_heartland', 'dwarven_mountains', 'merchant_coast'];
        this.triggerEvent(templates[Math.floor(Math.random() * templates.length)], { region: regions[Math.floor(Math.random() * regions.length)] });
    }

    generateNaturalEvent() {
        const templates = ['earthquake', 'drought', 'plague_outbreak'];
        const regions = ['valdric_heartland', 'dwarven_mountains', 'sylvan_forests'];
        this.triggerEvent(templates[Math.floor(Math.random() * templates.length)], { region: regions[Math.floor(Math.random() * regions.length)] });
    }

    generatePoliticalEvent() {
        const factions = this.factionSystem.getAllFactions().filter(f => f.type === 'nation');
        if (factions.length < 2) return;
        const f1 = factions[Math.floor(Math.random() * factions.length)];
        let f2 = factions[Math.floor(Math.random() * factions.length)];
        while (f2.id === f1.id) f2 = factions[Math.floor(Math.random() * factions.length)];
        const relation = this.factionSystem.getRelation(f1.id, f2.id);
        if (relation > 30) this.triggerEvent('diplomatic_marriage', { faction1: f1.name, faction2: f2.name, faction1Id: f1.id, faction2Id: f2.id });
    }

    generateSupernaturalEvent() {
        const templates = ['magical_anomaly', 'dungeon_emergence', 'undead_rising'];
        const locations = ['Ancient Ruins', 'Dark Forest', 'Abandoned Mine', 'Old Battlefield'];
        this.triggerEvent(templates[Math.floor(Math.random() * templates.length)], { location: locations[Math.floor(Math.random() * locations.length)], region: 'valdric_heartland' });
    }

    endEvent(eventId) {
        const state = this.stateManager.getSection('events');
        const eventIndex = state.activeEvents.findIndex(e => e.id === eventId);
        if (eventIndex >= 0) {
            const event = state.activeEvents[eventIndex];
            event.status = 'ended';
            event.endDate = Date.now();
            state.eventHistory.push(event);
            state.activeEvents.splice(eventIndex, 1);
            this.stateManager.updateSection('events', state);
            this.triggerCallbacks('eventEnded', event);
        }
    }

    escalateEvent(event) {
        const template = this.eventTemplates[event.templateId];
        if (template.followUpEvents?.length > 0) {
            const followUp = template.followUpEvents[Math.floor(Math.random() * template.followUpEvents.length)];
            this.triggerEvent(followUp, event.context);
        }
    }

    getActiveEvents() { return this.stateManager.getSection('events').activeEvents; }
    getEventsByType(type) { return this.getActiveEvents().filter(e => e.type === type); }
    getEventsBySeverity(severity) { return this.getActiveEvents().filter(e => e.severity === severity); }

    onEventStarted(callback) { this.callbacks.eventStarted.push(callback); }
    onEventEnded(callback) { this.callbacks.eventEnded.push(callback); }

    triggerCallbacks(event, data) {
        for (const cb of this.callbacks[event] || []) {
            try { cb(data); } catch (e) { console.error(e); }
        }
    }

    getEventsForPrompt() {
        const settings = this.stateManager.getSection('events').settings || {};
        if (!settings.injectEventsIntoPrompt) return '';
        const critical = this.getActiveEvents().filter(e => e.severity === 'critical' || e.severity === 'major').slice(0, 3);
        if (critical.length === 0) return '';
        return `[Events: ${critical.map(e => e.name).join(', ')}]`;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}

export { EventSystem, EVENT_TYPES, EVENT_TEMPLATES };
