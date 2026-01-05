const SUCCESSION_LAWS = {
    primogeniture: { name: "Primogeniture", description: "Eldest child inherits", stability: 80, legitimacy: 90 },
    elective: { name: "Elective Monarchy", description: "Nobles elect successor", stability: 50, legitimacy: 70 },
    strength: { name: "Right of Conquest", description: "Strongest claims throne", stability: 30, legitimacy: 40 },
    seniority: { name: "Seniority", description: "Eldest family member inherits", stability: 60, legitimacy: 75 },
    tanistry: { name: "Tanistry", description: "Family council chooses", stability: 55, legitimacy: 65 }
};

const DYNASTY_TRAITS = {
    militaristic: { name: "Militaristic", effects: { armyStrength: 10, diplomacy: -5 } },
    diplomatic: { name: "Diplomatic", effects: { diplomacy: 15, intrigue: -5 } },
    scholarly: { name: "Scholarly", effects: { research: 20, warfare: -10 } },
    mercantile: { name: "Mercantile", effects: { wealth: 15, honor: -5 } },
    pious: { name: "Pious", effects: { divineFavor: 20, intrigue: -10 } },
    cunning: { name: "Cunning", effects: { intrigue: 15, honor: -10 } },
    noble: { name: "Noble", effects: { prestige: 10, commoner_opinion: -5 } },
    populist: { name: "Populist", effects: { commoner_opinion: 15, noble_opinion: -10 } }
};

const DEFAULT_DYNASTIES = {
    house_valdric: {
        id: "house_valdric", name: "House Valdric", faction: "valdric_empire",
        founder: "Valdric the Conqueror", foundedYear: -500,
        currentRuler: "emperor_aldric", successionLaw: "primogeniture",
        prestige: 95, legitimacy: 90, wealth: 85,
        traits: ["militaristic", "noble"],
        members: ["emperor_aldric"],
        heirs: [], marriages: [], rivalries: ["house_bloodfist"],
        history: [{ year: -500, event: "Dynasty founded by Valdric the Conqueror" }]
    },
    house_stonehammer: {
        id: "house_stonehammer", name: "House Stonehammer", faction: "dwarven_holds",
        founder: "Durin Stonehammer", foundedYear: -2000,
        currentRuler: "high_king_thorin", successionLaw: "seniority",
        prestige: 90, legitimacy: 95, wealth: 100,
        traits: ["mercantile", "noble"],
        members: ["high_king_thorin"],
        heirs: [], marriages: [], rivalries: [],
        history: [{ year: -2000, event: "First King under the Mountain" }]
    },
    house_moonwhisper: {
        id: "house_moonwhisper", name: "House Moonwhisper", faction: "sylvan_dominion",
        founder: "Aelindra the First", foundedYear: -3000,
        currentRuler: "lady_aelindra", successionLaw: "tanistry",
        prestige: 85, legitimacy: 85, wealth: 70,
        traits: ["scholarly", "pious"],
        members: ["lady_aelindra"],
        heirs: [], marriages: [], rivalries: [],
        history: [{ year: -3000, event: "Blessed by the Moon Goddess" }]
    },
    house_bloodfist: {
        id: "house_bloodfist", name: "House Bloodfist", faction: "orcish_dominion",
        founder: "Grak Bloodfist", foundedYear: -100,
        currentRuler: "warchief_grommash", successionLaw: "strength",
        prestige: 60, legitimacy: 50, wealth: 40,
        traits: ["militaristic", "cunning"],
        members: ["warchief_grommash"],
        heirs: [], marriages: [], rivalries: ["house_valdric"],
        history: [{ year: -100, event: "United the orc clans through conquest" }]
    },
    house_blackwood: {
        id: "house_blackwood", name: "House Blackwood", faction: "merchant_league",
        founder: "Corvus Blackwood Sr.", foundedYear: -50,
        currentRuler: "guildmaster_corvus", successionLaw: "elective",
        prestige: 70, legitimacy: 60, wealth: 100,
        traits: ["mercantile", "cunning"],
        members: ["guildmaster_corvus"],
        heirs: [], marriages: [], rivalries: [],
        history: [{ year: -50, event: "Rose from merchant to ruler" }]
    }
};

const CRISIS_TYPES = {
    succession_dispute: { name: "Succession Dispute", severity: "major", duration: { min: 30, max: 180 }, effects: { stability: -30, legitimacy: -20 } },
    pretender_claim: { name: "Pretender's Claim", severity: "moderate", duration: { min: 60, max: 365 }, effects: { stability: -15, legitimacy: -10 } },
    civil_war: { name: "Civil War", severity: "critical", duration: { min: 180, max: 730 }, effects: { stability: -50, wealth: -30 } },
    regency: { name: "Regency Council", severity: "minor", duration: { min: 365, max: 1825 }, effects: { legitimacy: -5, intrigue: 20 } },
    extinction: { name: "Dynasty Extinction", severity: "critical", duration: { min: 1, max: 30 }, effects: { stability: -60, legitimacy: -50 } }
};

class DynastySystem {
    constructor(stateManager, timeSystem, factionSystem, npcSystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.factionSystem = factionSystem;
        this.npcSystem = npcSystem;
        this.successionLaws = SUCCESSION_LAWS;
        this.dynastyTraits = DYNASTY_TRAITS;
        this.defaultDynasties = DEFAULT_DYNASTIES;
        this.crisisTypes = CRISIS_TYPES;

        this.timeSystem.onMonthChanged(() => this.monthlyUpdate());
        this.timeSystem.onYearChanged(() => this.yearlyUpdate());
    }

    initialize() {
        const state = this.stateManager.getSection('dynasties');
        if (!state.houses || Object.keys(state.houses).length === 0) {
            state.houses = JSON.parse(JSON.stringify(this.defaultDynasties));
            state.crises = [];
            state.extinctDynasties = [];
            state.successionEvents = [];
            this.stateManager.updateSection('dynasties', state);
        }
    }

    getDynasty(dynastyId) {
        return this.stateManager.getSection('dynasties').houses[dynastyId];
    }

    getAllDynasties() {
        return Object.values(this.stateManager.getSection('dynasties').houses);
    }

    getDynastyByFaction(factionId) {
        return this.getAllDynasties().find(d => d.faction === factionId);
    }

    monthlyUpdate() {
        for (const dynasty of this.getAllDynasties()) {
            this.updateDynastyPrestige(dynasty);
            this.checkForIntrigue(dynasty);
            this.updateActiveCrises(dynasty);
        }
    }

    yearlyUpdate() {
        for (const dynasty of this.getAllDynasties()) {
            this.generateHeirs(dynasty);
            this.checkMarriageOpportunities(dynasty);
            this.updateDynastyWealth(dynasty);
            this.checkRulerHealth(dynasty);
        }
    }

    updateDynastyPrestige(dynasty) {
        let prestigeChange = 0;
        const faction = this.factionSystem?.getFaction(dynasty.faction);
        if (faction) {
            if (faction.power > 70) prestigeChange += 1;
            if (faction.power < 30) prestigeChange -= 1;
        }
        for (const trait of dynasty.traits || []) {
            const traitData = this.dynastyTraits[trait];
            if (traitData?.effects?.prestige) prestigeChange += traitData.effects.prestige / 12;
        }
        dynasty.prestige = Math.max(0, Math.min(100, dynasty.prestige + prestigeChange));
        this.updateDynasty(dynasty.id, dynasty);
    }

    checkForIntrigue(dynasty) {
        if (dynasty.legitimacy < 50 && Math.random() < 0.05) {
            this.triggerCrisis(dynasty, 'pretender_claim');
        }
        for (const rivalId of dynasty.rivalries || []) {
            const rival = this.getDynasty(rivalId);
            if (rival && Math.random() < 0.02) {
                this.generateIntrigueEvent(dynasty, rival);
            }
        }
    }

    generateIntrigueEvent(dynasty, rival) {
        const events = [
            { type: "assassination_attempt", target: dynasty, aggressor: rival, success: Math.random() < 0.2 },
            { type: "spy_discovered", target: rival, aggressor: dynasty, success: Math.random() < 0.4 },
            { type: "scandal", target: dynasty, aggressor: rival, success: Math.random() < 0.3 }
        ];
        const event = events[Math.floor(Math.random() * events.length)];
        window.dispatchEvent(new CustomEvent('vws-dynasty-intrigue', { detail: event }));
    }

    updateActiveCrises(dynasty) {
        const state = this.stateManager.getSection('dynasties');
        const activeCrises = state.crises.filter(c => c.dynastyId === dynasty.id && c.status === 'active');
        for (const crisis of activeCrises) {
            crisis.daysActive = (crisis.daysActive || 0) + 30;
            const crisisType = this.crisisTypes[crisis.type];
            if (crisisType && crisis.daysActive >= crisisType.duration.min) {
                if (Math.random() < 0.2 || crisis.daysActive >= crisisType.duration.max) {
                    this.resolveCrisis(crisis);
                }
            }
        }
        this.stateManager.updateSection('dynasties', state);
    }

    triggerCrisis(dynasty, crisisType) {
        const state = this.stateManager.getSection('dynasties');
        const crisis = {
            id: this.generateUUID(),
            dynastyId: dynasty.id,
            type: crisisType,
            status: 'active',
            startedAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString(),
            daysActive: 0
        };
        state.crises.push(crisis);
        const crisisData = this.crisisTypes[crisisType];
        if (crisisData?.effects) {
            if (crisisData.effects.legitimacy) dynasty.legitimacy = Math.max(0, dynasty.legitimacy + crisisData.effects.legitimacy);
            if (crisisData.effects.wealth) dynasty.wealth = Math.max(0, dynasty.wealth + crisisData.effects.wealth);
        }
        this.updateDynasty(dynasty.id, dynasty);
        this.stateManager.updateSection('dynasties', state);
        window.dispatchEvent(new CustomEvent('vws-succession-crisis', { detail: { dynasty, crisis } }));
    }

    resolveCrisis(crisis) {
        crisis.status = 'resolved';
        crisis.resolvedAt = Date.now();
        const dynasty = this.getDynasty(crisis.dynastyId);
        if (dynasty) {
            dynasty.legitimacy = Math.min(100, dynasty.legitimacy + 10);
            this.updateDynasty(dynasty.id, dynasty);
        }
        window.dispatchEvent(new CustomEvent('vws-crisis-resolved', { detail: crisis }));
    }

    generateHeirs(dynasty) {
        if (dynasty.heirs.length < 3 && Math.random() < 0.1) {
            const heir = {
                id: this.generateUUID(),
                name: this.generateHeirName(dynasty),
                birthYear: this.timeSystem.getCurrentYear(),
                age: 0,
                legitimacy: dynasty.legitimacy,
                traits: [],
                claim: dynasty.heirs.length === 0 ? 100 : 100 - dynasty.heirs.length * 20
            };
            dynasty.heirs.push(heir);
            this.updateDynasty(dynasty.id, dynasty);
            window.dispatchEvent(new CustomEvent('vws-heir-born', { detail: { dynasty, heir } }));
        }
        for (const heir of dynasty.heirs) {
            heir.age++;
        }
    }

    generateHeirName(dynasty) {
        const prefixes = ['Prince', 'Princess', 'Lord', 'Lady'];
        const names = ['Aldric', 'Cassian', 'Elara', 'Thorin', 'Aelindra', 'Grommash', 'Corvus', 'Sera'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const name = names[Math.floor(Math.random() * names.length)];
        return `${prefix} ${name} of ${dynasty.name}`;
    }

    checkMarriageOpportunities(dynasty) {
        if (Math.random() < 0.05) {
            const otherDynasties = this.getAllDynasties().filter(d => d.id !== dynasty.id && !dynasty.rivalries?.includes(d.id));
            if (otherDynasties.length > 0) {
                const partner = otherDynasties[Math.floor(Math.random() * otherDynasties.length)];
                this.proposeDynasticMarriage(dynasty, partner);
            }
        }
    }

    proposeDynasticMarriage(dynasty1, dynasty2) {
        const accepted = Math.random() < 0.4;
        if (accepted) {
            const marriage = {
                id: this.generateUUID(),
                dynasty1: dynasty1.id,
                dynasty2: dynasty2.id,
                date: Date.now(),
                gameDate: this.timeSystem.getCurrentDateString()
            };
            dynasty1.marriages.push(marriage);
            dynasty2.marriages.push(marriage);
            dynasty1.prestige += 5;
            dynasty2.prestige += 5;
            if (dynasty1.rivalries?.includes(dynasty2.id)) {
                dynasty1.rivalries = dynasty1.rivalries.filter(r => r !== dynasty2.id);
                dynasty2.rivalries = dynasty2.rivalries?.filter(r => r !== dynasty1.id) || [];
            }
            this.updateDynasty(dynasty1.id, dynasty1);
            this.updateDynasty(dynasty2.id, dynasty2);
            window.dispatchEvent(new CustomEvent('vws-dynastic-marriage', { detail: marriage }));
        }
    }

    updateDynastyWealth(dynasty) {
        const faction = this.factionSystem?.getFaction(dynasty.faction);
        if (faction) {
            dynasty.wealth = Math.max(0, Math.min(100, dynasty.wealth + (faction.economy - 50) / 10));
            this.updateDynasty(dynasty.id, dynasty);
        }
    }

    checkRulerHealth(dynasty) {
        const ruler = this.npcSystem?.getNPC(dynasty.currentRuler);
        if (ruler && ruler.status === 'dead') {
            this.handleRulerDeath(dynasty);
        }
    }

    handleRulerDeath(dynasty) {
        const law = this.successionLaws[dynasty.successionLaw];
        let successor = null;
        let crisisChance = 1 - (law?.stability || 50) / 100;
        switch (dynasty.successionLaw) {
            case 'primogeniture':
                successor = dynasty.heirs.find(h => h.age >= 16);
                break;
            case 'seniority':
                successor = dynasty.members.find(m => m !== dynasty.currentRuler);
                break;
            case 'elective':
                crisisChance += 0.2;
                successor = dynasty.heirs[Math.floor(Math.random() * dynasty.heirs.length)];
                break;
            case 'strength':
                crisisChance += 0.3;
                successor = null;
                break;
            case 'tanistry':
                successor = dynasty.heirs[0];
                break;
        }
        if (!successor || Math.random() < crisisChance) {
            this.triggerCrisis(dynasty, 'succession_dispute');
        } else {
            dynasty.currentRuler = successor.id || successor;
            dynasty.heirs = dynasty.heirs.filter(h => h.id !== successor.id);
            this.updateDynasty(dynasty.id, dynasty);
            window.dispatchEvent(new CustomEvent('vws-succession', { detail: { dynasty, successor } }));
        }
        const state = this.stateManager.getSection('dynasties');
        state.successionEvents.push({
            dynastyId: dynasty.id,
            date: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString(),
            successor: successor?.id || null,
            crisis: !successor
        });
        this.stateManager.updateSection('dynasties', state);
    }

    updateDynasty(dynastyId, data) {
        const state = this.stateManager.getSection('dynasties');
        state.houses[dynastyId] = { ...state.houses[dynastyId], ...data };
        this.stateManager.updateSection('dynasties', state);
    }

    getDynastiesForPrompt() {
        const settings = this.stateManager.getSection('dynasties').settings || {};
        if (!settings.injectDynastiesIntoPrompt) return '';
        const crises = this.stateManager.getSection('dynasties').crises.filter(c => c.status === 'active');
        if (crises.length === 0) return '';
        return `[Dynasty Crises: ${crises.map(c => `${this.getDynasty(c.dynastyId)?.name}: ${c.type}`).join(', ')}]`;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}

export { DynastySystem, SUCCESSION_LAWS, DYNASTY_TRAITS, DEFAULT_DYNASTIES, CRISIS_TYPES };
