const CRIMINAL_ORGANIZATIONS = {
    shadow_syndicate: {
        id: "shadow_syndicate", name: "Shadow Syndicate", icon: "🗡️",
        specialty: "assassination", territory: ["valdris_prime", "freeport"],
        influence: 70, heat: 20, wealth: 80,
        operations: ["assassination", "blackmail", "smuggling"],
        rivalry: ["blood_ravens"]
    },
    blood_ravens: {
        id: "blood_ravens", name: "Blood Ravens", icon: "🦅",
        specialty: "theft", territory: ["valdris_prime", "merchant_coast"],
        influence: 55, heat: 35, wealth: 60,
        operations: ["theft", "burglary", "fencing"],
        rivalry: ["shadow_syndicate"]
    },
    smugglers_guild: {
        id: "smugglers_guild", name: "Smuggler's Guild", icon: "📦",
        specialty: "smuggling", territory: ["freeport", "merchant_coast"],
        influence: 45, heat: 25, wealth: 70,
        operations: ["smuggling", "contraband", "bribery"],
        rivalry: []
    },
    thieves_guild: {
        id: "thieves_guild", name: "Thieves Guild", icon: "🎭",
        specialty: "pickpocketing", territory: ["valdris_prime", "khaz_morath"],
        influence: 40, heat: 40, wealth: 50,
        operations: ["pickpocketing", "burglary", "lockpicking"],
        rivalry: ["blood_ravens"]
    },
    black_market: {
        id: "black_market", name: "Black Market Consortium", icon: "💀",
        specialty: "trafficking", territory: ["grakhan", "freeport"],
        influence: 50, heat: 15, wealth: 90,
        operations: ["trafficking", "slavery", "arms_dealing"],
        rivalry: []
    }
};

const CRIME_TYPES = {
    theft: { name: "Theft", severity: "minor", heatGain: 5, baseReward: 20, detectionRisk: 0.3 },
    burglary: { name: "Burglary", severity: "moderate", heatGain: 15, baseReward: 100, detectionRisk: 0.4 },
    pickpocketing: { name: "Pickpocketing", severity: "minor", heatGain: 3, baseReward: 10, detectionRisk: 0.25 },
    smuggling: { name: "Smuggling", severity: "moderate", heatGain: 10, baseReward: 150, detectionRisk: 0.35 },
    assassination: { name: "Assassination", severity: "major", heatGain: 50, baseReward: 500, detectionRisk: 0.5 },
    blackmail: { name: "Blackmail", severity: "moderate", heatGain: 20, baseReward: 200, detectionRisk: 0.2 },
    fencing: { name: "Fencing Goods", severity: "minor", heatGain: 5, baseReward: 30, detectionRisk: 0.15 },
    bribery: { name: "Bribery", severity: "moderate", heatGain: 8, baseReward: 50, detectionRisk: 0.25 },
    contraband: { name: "Contraband Trade", severity: "moderate", heatGain: 12, baseReward: 80, detectionRisk: 0.3 },
    extortion: { name: "Extortion", severity: "major", heatGain: 25, baseReward: 150, detectionRisk: 0.35 },
    kidnapping: { name: "Kidnapping", severity: "major", heatGain: 40, baseReward: 300, detectionRisk: 0.45 },
    counterfeiting: { name: "Counterfeiting", severity: "moderate", heatGain: 15, baseReward: 100, detectionRisk: 0.2 }
};

const HEAT_LEVELS = {
    unknown: { name: "Unknown", range: [0, 10], guardPatrols: 1.0, bountyHunters: false },
    noticed: { name: "Noticed", range: [11, 25], guardPatrols: 1.2, bountyHunters: false },
    wanted: { name: "Wanted", range: [26, 50], guardPatrols: 1.5, bountyHunters: true },
    notorious: { name: "Notorious", range: [51, 75], guardPatrols: 2.0, bountyHunters: true },
    public_enemy: { name: "Public Enemy", range: [76, 100], guardPatrols: 3.0, bountyHunters: true }
};

const BLACK_MARKET_GOODS = {
    stolen_weapons: { name: "Stolen Weapons", basePrice: 50, legality: "illegal", demand: "high" },
    poisons: { name: "Poisons", basePrice: 100, legality: "illegal", demand: "medium" },
    forbidden_magic: { name: "Forbidden Scrolls", basePrice: 200, legality: "illegal", demand: "low" },
    contraband_goods: { name: "Contraband", basePrice: 30, legality: "restricted", demand: "high" },
    forged_documents: { name: "Forged Documents", basePrice: 75, legality: "illegal", demand: "medium" },
    slaves: { name: "Slaves", basePrice: 500, legality: "illegal", demand: "low" },
    stolen_artifacts: { name: "Stolen Artifacts", basePrice: 300, legality: "illegal", demand: "medium" }
};

class CrimeSystem {
    constructor(stateManager, timeSystem, factionSystem, settlementSystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.factionSystem = factionSystem;
        this.settlementSystem = settlementSystem;
        this.criminalOrganizations = CRIMINAL_ORGANIZATIONS;
        this.crimeTypes = CRIME_TYPES;
        this.heatLevels = HEAT_LEVELS;
        this.blackMarketGoods = BLACK_MARKET_GOODS;

        this.timeSystem.onDayChanged(() => this.dailyUpdate());
        this.timeSystem.onWeekChanged(() => this.weeklyUpdate());
        this.timeSystem.onMonthChanged(() => this.monthlyUpdate());
    }

    initialize() {
        const state = this.stateManager.getSection('crime');
        if (!state.organizations || Object.keys(state.organizations).length === 0) {
            state.organizations = JSON.parse(JSON.stringify(this.criminalOrganizations));
            state.playerCriminalRecord = {
                heat: 0,
                totalCrimes: 0,
                bounty: 0,
                reputation: {},
                arrests: 0,
                escapes: 0
            };
            state.crimes = [];
            state.turfWars = [];
            state.blackMarket = { available: [], prices: {} };
            this.stateManager.updateSection('crime', state);
            this.refreshBlackMarket();
        }
    }

    getOrganization(orgId) {
        return this.stateManager.getSection('crime').organizations[orgId];
    }

    getAllOrganizations() {
        return Object.values(this.stateManager.getSection('crime').organizations);
    }

    getPlayerHeat() {
        return this.stateManager.getSection('crime').playerCriminalRecord.heat;
    }

    getHeatLevel(heatValue) {
        for (const [levelId, level] of Object.entries(this.heatLevels)) {
            if (heatValue >= level.range[0] && heatValue <= level.range[1]) {
                return { id: levelId, ...level };
            }
        }
        return { id: 'public_enemy', ...this.heatLevels.public_enemy };
    }

    dailyUpdate() {
        this.decayHeat();
        this.processOrganizationActivities();
        this.checkForCrackdowns();
    }

    weeklyUpdate() {
        this.processTurfWars();
        this.updateOrganizationInfluence();
        this.refreshBlackMarket();
    }

    monthlyUpdate() {
        this.generateOrganizationEvents();
        this.updateBounties();
    }

    decayHeat() {
        const state = this.stateManager.getSection('crime');
        if (state.playerCriminalRecord.heat > 0) {
            state.playerCriminalRecord.heat = Math.max(0, state.playerCriminalRecord.heat - 1);
            this.stateManager.updateSection('crime', state);
        }
        for (const org of this.getAllOrganizations()) {
            if (org.heat > 0) {
                org.heat = Math.max(0, org.heat - 0.5);
                this.updateOrganization(org.id, org);
            }
        }
    }

    processOrganizationActivities() {
        for (const org of this.getAllOrganizations()) {
            if (Math.random() < 0.1) {
                const opType = org.operations[Math.floor(Math.random() * org.operations.length)];
                const crime = this.crimeTypes[opType];
                if (crime) {
                    org.wealth += crime.baseReward;
                    org.heat += crime.heatGain * 0.5;
                    this.updateOrganization(org.id, org);
                }
            }
        }
    }

    checkForCrackdowns() {
        for (const org of this.getAllOrganizations()) {
            if (org.heat > 60 && Math.random() < 0.1) {
                this.triggerCrackdown(org);
            }
        }
    }

    triggerCrackdown(org) {
        const damage = Math.floor(Math.random() * 20) + 10;
        org.influence = Math.max(0, org.influence - damage);
        org.wealth = Math.max(0, org.wealth - damage * 10);
        org.heat = Math.max(0, org.heat - 30);
        this.updateOrganization(org.id, org);
        window.dispatchEvent(new CustomEvent('vws-crime-crackdown', { detail: org }));
    }

    processTurfWars() {
        const state = this.stateManager.getSection('crime');
        for (const war of state.turfWars.filter(w => w.status === 'active')) {
            this.resolveTurfWarRound(war);
        }
        this.stateManager.updateSection('crime', state);
    }

    resolveTurfWarRound(war) {
        const org1 = this.getOrganization(war.attacker);
        const org2 = this.getOrganization(war.defender);
        if (!org1 || !org2) return;
        const attackerPower = org1.influence + org1.wealth / 10;
        const defenderPower = org2.influence + org2.wealth / 10;
        const attackerWins = Math.random() < attackerPower / (attackerPower + defenderPower);
        if (attackerWins) {
            org1.influence += 5;
            org2.influence -= 5;
            war.attackerWins = (war.attackerWins || 0) + 1;
        } else {
            org2.influence += 5;
            org1.influence -= 5;
            war.defenderWins = (war.defenderWins || 0) + 1;
        }
        org1.heat += 10;
        org2.heat += 10;
        war.rounds = (war.rounds || 0) + 1;
        if (war.rounds >= 5) {
            war.status = 'resolved';
            war.winner = (war.attackerWins || 0) > (war.defenderWins || 0) ? war.attacker : war.defender;
            if (war.winner === war.attacker) {
                org1.territory.push(war.territory);
                org2.territory = org2.territory.filter(t => t !== war.territory);
            }
            window.dispatchEvent(new CustomEvent('vws-turf-war-ended', { detail: war }));
        }
        this.updateOrganization(org1.id, org1);
        this.updateOrganization(org2.id, org2);
    }

    updateOrganizationInfluence() {
        for (const org of this.getAllOrganizations()) {
            let influenceChange = 0;
            if (org.wealth > 70) influenceChange += 2;
            if (org.wealth < 30) influenceChange -= 2;
            if (org.heat > 50) influenceChange -= 1;
            org.influence = Math.max(0, Math.min(100, org.influence + influenceChange));
            this.updateOrganization(org.id, org);
        }
    }

    refreshBlackMarket() {
        const state = this.stateManager.getSection('crime');
        state.blackMarket.available = [];
        state.blackMarket.prices = {};
        for (const [goodId, good] of Object.entries(this.blackMarketGoods)) {
            if (Math.random() < 0.7) {
                state.blackMarket.available.push(goodId);
                const demandMultiplier = good.demand === 'high' ? 1.3 : good.demand === 'low' ? 0.7 : 1.0;
                const variance = 0.8 + Math.random() * 0.4;
                state.blackMarket.prices[goodId] = Math.floor(good.basePrice * demandMultiplier * variance);
            }
        }
        this.stateManager.updateSection('crime', state);
    }

    generateOrganizationEvents() {
        for (const org of this.getAllOrganizations()) {
            if (Math.random() < 0.2) {
                const events = [
                    { type: 'expansion', effect: () => { org.influence += 10; org.wealth -= 20; } },
                    { type: 'betrayal', effect: () => { org.influence -= 15; } },
                    { type: 'heist', effect: () => { org.wealth += 50; org.heat += 20; } },
                    { type: 'recruitment', effect: () => { org.influence += 5; } }
                ];
                const event = events[Math.floor(Math.random() * events.length)];
                event.effect();
                this.updateOrganization(org.id, org);
                window.dispatchEvent(new CustomEvent('vws-crime-org-event', { detail: { org, event: event.type } }));
            }
        }
    }

    updateBounties() {
        const state = this.stateManager.getSection('crime');
        if (state.playerCriminalRecord.heat > 50) {
            state.playerCriminalRecord.bounty += Math.floor(state.playerCriminalRecord.heat * 2);
        }
        this.stateManager.updateSection('crime', state);
    }

    commitCrime(crimeType, location = null) {
        const crime = this.crimeTypes[crimeType];
        if (!crime) return null;
        const state = this.stateManager.getSection('crime');
        const detected = Math.random() < crime.detectionRisk;
        const crimeRecord = {
            id: this.generateUUID(),
            type: crimeType,
            location,
            detected,
            reward: crime.baseReward,
            timestamp: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString()
        };
        state.crimes.push(crimeRecord);
        state.playerCriminalRecord.totalCrimes++;
        if (detected) {
            state.playerCriminalRecord.heat += crime.heatGain;
            state.playerCriminalRecord.bounty += crime.baseReward * 2;
        } else {
            state.playerCriminalRecord.heat += Math.floor(crime.heatGain * 0.2);
        }
        this.stateManager.updateSection('crime', state);
        window.dispatchEvent(new CustomEvent('vws-crime-committed', { detail: crimeRecord }));
        return crimeRecord;
    }

    joinOrganization(orgId) {
        const state = this.stateManager.getSection('crime');
        state.playerCriminalRecord.organization = orgId;
        state.playerCriminalRecord.reputation[orgId] = (state.playerCriminalRecord.reputation[orgId] || 0) + 20;
        this.stateManager.updateSection('crime', state);
    }

    startTurfWar(attackerId, defenderId, territory) {
        const state = this.stateManager.getSection('crime');
        const war = {
            id: this.generateUUID(),
            attacker: attackerId,
            defender: defenderId,
            territory,
            status: 'active',
            rounds: 0,
            attackerWins: 0,
            defenderWins: 0,
            startedAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString()
        };
        state.turfWars.push(war);
        this.stateManager.updateSection('crime', state);
        window.dispatchEvent(new CustomEvent('vws-turf-war-started', { detail: war }));
        return war;
    }

    payBounty() {
        const state = this.stateManager.getSection('crime');
        const bounty = state.playerCriminalRecord.bounty;
        state.playerCriminalRecord.bounty = 0;
        state.playerCriminalRecord.heat = Math.max(0, state.playerCriminalRecord.heat - 30);
        this.stateManager.updateSection('crime', state);
        return bounty;
    }

    getArrested() {
        const state = this.stateManager.getSection('crime');
        state.playerCriminalRecord.arrests++;
        state.playerCriminalRecord.heat = Math.max(0, state.playerCriminalRecord.heat - 50);
        this.stateManager.updateSection('crime', state);
        window.dispatchEvent(new CustomEvent('vws-player-arrested', { detail: state.playerCriminalRecord }));
    }

    escapeArrest() {
        const state = this.stateManager.getSection('crime');
        state.playerCriminalRecord.escapes++;
        state.playerCriminalRecord.heat += 20;
        this.stateManager.updateSection('crime', state);
    }

    updateOrganization(orgId, data) {
        const state = this.stateManager.getSection('crime');
        state.organizations[orgId] = { ...state.organizations[orgId], ...data };
        this.stateManager.updateSection('crime', state);
    }

    getCrimeForPrompt() {
        const settings = this.stateManager.getSection('crime').settings || {};
        if (!settings.injectCrimeIntoPrompt) return '';
        const playerRecord = this.stateManager.getSection('crime').playerCriminalRecord;
        const heatLevel = this.getHeatLevel(playerRecord.heat);
        const parts = [];
        if (heatLevel.id !== 'unknown') parts.push(`Status: ${heatLevel.name}`);
        if (playerRecord.bounty > 0) parts.push(`Bounty: ${playerRecord.bounty}g`);
        const activeTurfWars = this.stateManager.getSection('crime').turfWars.filter(w => w.status === 'active');
        if (activeTurfWars.length > 0) parts.push(`Turf Wars: ${activeTurfWars.length}`);
        return parts.length > 0 ? `[Crime: ${parts.join(', ')}]` : '';
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}

export { CrimeSystem, CRIMINAL_ORGANIZATIONS, CRIME_TYPES, HEAT_LEVELS, BLACK_MARKET_GOODS };
