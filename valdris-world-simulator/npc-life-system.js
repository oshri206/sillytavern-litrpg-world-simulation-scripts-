const LIFE_STAGES = {
    child: { name: "Child", ageRange: [0, 12], canWork: false, canMarry: false },
    adolescent: { name: "Adolescent", ageRange: [13, 17], canWork: true, canMarry: false },
    young_adult: { name: "Young Adult", ageRange: [18, 30], canWork: true, canMarry: true },
    adult: { name: "Adult", ageRange: [31, 50], canWork: true, canMarry: true },
    middle_aged: { name: "Middle Aged", ageRange: [51, 65], canWork: true, canMarry: true },
    elderly: { name: "Elderly", ageRange: [66, 80], canWork: false, canMarry: true },
    ancient: { name: "Ancient", ageRange: [81, 150], canWork: false, canMarry: false }
};

const OCCUPATIONS = {
    farmer: { name: "Farmer", income: 5, stability: 90, requirements: { age: 14 } },
    merchant: { name: "Merchant", income: 15, stability: 70, requirements: { age: 18, wealth: 20 } },
    craftsman: { name: "Craftsman", income: 10, stability: 80, requirements: { age: 16 } },
    soldier: { name: "Soldier", income: 8, stability: 60, requirements: { age: 16, health: 70 } },
    scholar: { name: "Scholar", income: 12, stability: 85, requirements: { age: 20 } },
    noble: { name: "Noble", income: 50, stability: 95, requirements: { birthright: true } },
    priest: { name: "Priest", income: 7, stability: 95, requirements: { age: 18 } },
    thief: { name: "Thief", income: 20, stability: 30, requirements: { age: 14 } },
    adventurer: { name: "Adventurer", income: 25, stability: 20, requirements: { age: 16, health: 60 } },
    innkeeper: { name: "Innkeeper", income: 12, stability: 75, requirements: { age: 25, wealth: 30 } }
};

const RELATIONSHIP_TYPES = {
    family: { name: "Family", baseStrength: 80, decay: 0.1 },
    friend: { name: "Friend", baseStrength: 50, decay: 0.5 },
    rival: { name: "Rival", baseStrength: -30, decay: 0.3 },
    enemy: { name: "Enemy", baseStrength: -70, decay: 0.2 },
    lover: { name: "Lover", baseStrength: 70, decay: 1.0 },
    spouse: { name: "Spouse", baseStrength: 85, decay: 0.2 },
    colleague: { name: "Colleague", baseStrength: 30, decay: 0.8 },
    mentor: { name: "Mentor", baseStrength: 60, decay: 0.3 },
    student: { name: "Student", baseStrength: 40, decay: 0.5 }
};

const DAILY_ACTIVITIES = {
    work: { name: "Work", energyCost: 30, incomeMultiplier: 1.0, happinessChange: -5 },
    rest: { name: "Rest", energyCost: -50, incomeMultiplier: 0, happinessChange: 10 },
    socialize: { name: "Socialize", energyCost: 15, incomeMultiplier: 0, happinessChange: 15 },
    train: { name: "Train", energyCost: 40, incomeMultiplier: 0, happinessChange: 0, skillGain: 1 },
    worship: { name: "Worship", energyCost: 10, incomeMultiplier: 0, happinessChange: 5, pietyGain: 1 },
    study: { name: "Study", energyCost: 25, incomeMultiplier: 0, happinessChange: -5, knowledgeGain: 1 },
    crime: { name: "Criminal Activity", energyCost: 35, incomeMultiplier: 2.0, happinessChange: -10, riskLevel: 0.2 }
};

const LIFE_EVENTS = {
    birth: { name: "Birth", probability: 0.05, requirements: { married: true, age: [18, 45] } },
    marriage: { name: "Marriage", probability: 0.03, requirements: { single: true, age: [18, 60] } },
    divorce: { name: "Divorce", probability: 0.01, requirements: { married: true } },
    promotion: { name: "Promotion", probability: 0.02, requirements: { employed: true } },
    fired: { name: "Fired", probability: 0.01, requirements: { employed: true } },
    illness: { name: "Illness", probability: 0.03, effects: { health: -20 } },
    recovery: { name: "Recovery", probability: 0.05, requirements: { sick: true }, effects: { health: 30 } },
    inheritance: { name: "Inheritance", probability: 0.005, effects: { wealth: 50 } },
    robbery: { name: "Robbery", probability: 0.02, effects: { wealth: -20, happiness: -15 } },
    windfall: { name: "Windfall", probability: 0.01, effects: { wealth: 30, happiness: 20 } },
    tragedy: { name: "Tragedy", probability: 0.01, effects: { happiness: -40 } },
    achievement: { name: "Achievement", probability: 0.02, effects: { happiness: 25, reputation: 10 } },
    death: { name: "Death", probability: 0.001, conditionBased: true }
};

class NPCLifeSystem {
    constructor(stateManager, timeSystem, npcSystem, economySystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.npcSystem = npcSystem;
        this.economySystem = economySystem;
        this.lifeStages = LIFE_STAGES;
        this.occupations = OCCUPATIONS;
        this.relationshipTypes = RELATIONSHIP_TYPES;
        this.dailyActivities = DAILY_ACTIVITIES;
        this.lifeEvents = LIFE_EVENTS;

        this.timeSystem.onDayChanged(() => this.dailyUpdate());
        this.timeSystem.onWeekChanged(() => this.weeklyUpdate());
        this.timeSystem.onMonthChanged(() => this.monthlyUpdate());
        this.timeSystem.onYearChanged(() => this.yearlyUpdate());
    }

    initialize() {
        const state = this.stateManager.getSection('npcLife');
        if (!state.records || Object.keys(state.records).length === 0) {
            state.records = {};
            state.marriages = [];
            state.births = [];
            state.deaths = [];
            state.socialNetwork = {};
            this.stateManager.updateSection('npcLife', state);
            this.initializeExistingNPCs();
        }
    }

    initializeExistingNPCs() {
        const npcs = this.npcSystem?.getAllNPCs() || [];
        for (const npc of npcs) {
            this.createLifeRecord(npc.id, {
                name: npc.name,
                age: this.estimateAge(npc),
                occupation: npc.role,
                location: npc.currentLocation
            });
        }
    }

    estimateAge(npc) {
        const roleAges = { ruler: 45, noble: 35, merchant: 40, criminal: 30, citizen: 30 };
        return roleAges[npc.role] || 30 + Math.floor(Math.random() * 20);
    }

    createLifeRecord(npcId, data) {
        const record = {
            npcId,
            name: data.name || 'Unknown',
            age: data.age || 25,
            birthYear: this.timeSystem.getCurrentYear() - (data.age || 25),
            occupation: data.occupation || 'unemployed',
            location: data.location || 'unknown',
            wealth: data.wealth || 50,
            health: data.health || 100,
            happiness: data.happiness || 50,
            energy: 100,
            married: false,
            spouse: null,
            children: [],
            parents: data.parents || [],
            relationships: {},
            skills: {},
            conditions: [],
            lifeHistory: [],
            dailySchedule: this.generateDailySchedule(data.occupation)
        };
        const state = this.stateManager.getSection('npcLife');
        state.records[npcId] = record;
        this.stateManager.updateSection('npcLife', state);
        return record;
    }

    generateDailySchedule(occupation) {
        const baseSchedule = {
            morning: 'work',
            afternoon: 'work',
            evening: 'socialize',
            night: 'rest'
        };
        if (occupation === 'scholar') {
            baseSchedule.evening = 'study';
        } else if (occupation === 'priest') {
            baseSchedule.morning = 'worship';
        } else if (occupation === 'thief') {
            baseSchedule.night = 'crime';
            baseSchedule.morning = 'rest';
        }
        return baseSchedule;
    }

    getLifeRecord(npcId) {
        return this.stateManager.getSection('npcLife').records[npcId];
    }

    getAllLifeRecords() {
        return Object.values(this.stateManager.getSection('npcLife').records);
    }

    getLifeStage(age) {
        for (const [stageId, stage] of Object.entries(this.lifeStages)) {
            if (age >= stage.ageRange[0] && age <= stage.ageRange[1]) {
                return { id: stageId, ...stage };
            }
        }
        return { id: 'ancient', ...this.lifeStages.ancient };
    }

    dailyUpdate() {
        for (const record of this.getAllLifeRecords()) {
            this.processDay(record);
        }
    }

    processDay(record) {
        const timeOfDay = this.timeSystem.getTimeOfDay();
        const scheduleKey = this.getScheduleKey(timeOfDay);
        const activity = record.dailySchedule[scheduleKey];
        this.performActivity(record, activity);
        this.updateEnergy(record);
        this.checkHealthConditions(record);
    }

    getScheduleKey(timeOfDay) {
        if (['dawn', 'morning'].includes(timeOfDay)) return 'morning';
        if (['afternoon'].includes(timeOfDay)) return 'afternoon';
        if (['evening'].includes(timeOfDay)) return 'evening';
        return 'night';
    }

    performActivity(record, activityId) {
        const activity = this.dailyActivities[activityId];
        if (!activity) return;
        record.energy = Math.max(0, Math.min(100, record.energy - activity.energyCost));
        record.happiness = Math.max(0, Math.min(100, record.happiness + activity.happinessChange));
        if (activity.incomeMultiplier > 0) {
            const occupation = this.occupations[record.occupation];
            if (occupation) {
                record.wealth += Math.floor(occupation.income * activity.incomeMultiplier / 30);
            }
        }
        if (activity.riskLevel && Math.random() < activity.riskLevel) {
            this.triggerCaughtInCrime(record);
        }
        this.updateLifeRecord(record.npcId, record);
    }

    triggerCaughtInCrime(record) {
        record.conditions.push('wanted');
        record.happiness -= 20;
        this.addLifeHistoryEvent(record, 'Caught committing a crime');
    }

    updateEnergy(record) {
        const timeOfDay = this.timeSystem.getTimeOfDay();
        if (timeOfDay === 'night') {
            record.energy = Math.min(100, record.energy + 30);
        }
    }

    checkHealthConditions(record) {
        if (record.health < 30 && !record.conditions.includes('sick')) {
            record.conditions.push('sick');
        }
        if (record.health > 70 && record.conditions.includes('sick')) {
            record.conditions = record.conditions.filter(c => c !== 'sick');
        }
    }

    weeklyUpdate() {
        for (const record of this.getAllLifeRecords()) {
            this.updateRelationships(record);
            this.checkRandomLifeEvents(record);
        }
    }

    updateRelationships(record) {
        for (const [otherId, relationship] of Object.entries(record.relationships)) {
            const relType = this.relationshipTypes[relationship.type];
            if (relType) {
                relationship.strength = Math.max(-100, Math.min(100, relationship.strength - relType.decay));
                if (Math.abs(relationship.strength) < 5 && relationship.type !== 'family') {
                    delete record.relationships[otherId];
                }
            }
        }
        this.updateLifeRecord(record.npcId, record);
    }

    checkRandomLifeEvents(record) {
        for (const [eventId, event] of Object.entries(this.lifeEvents)) {
            if (Math.random() < event.probability) {
                if (this.checkEventRequirements(record, event)) {
                    this.triggerLifeEvent(record, eventId, event);
                }
            }
        }
    }

    checkEventRequirements(record, event) {
        const reqs = event.requirements || {};
        if (reqs.married !== undefined && record.married !== reqs.married) return false;
        if (reqs.single !== undefined && record.married === reqs.single) return false;
        if (reqs.employed !== undefined && (record.occupation !== 'unemployed') !== reqs.employed) return false;
        if (reqs.sick !== undefined && record.conditions.includes('sick') !== reqs.sick) return false;
        if (reqs.age) {
            if (record.age < reqs.age[0] || record.age > reqs.age[1]) return false;
        }
        return true;
    }

    triggerLifeEvent(record, eventId, event) {
        if (event.effects) {
            if (event.effects.health) record.health = Math.max(0, Math.min(100, record.health + event.effects.health));
            if (event.effects.wealth) record.wealth = Math.max(0, record.wealth + event.effects.wealth);
            if (event.effects.happiness) record.happiness = Math.max(0, Math.min(100, record.happiness + event.effects.happiness));
        }
        this.addLifeHistoryEvent(record, event.name);
        switch (eventId) {
            case 'birth':
                this.handleBirth(record);
                break;
            case 'marriage':
                this.handleMarriage(record);
                break;
            case 'divorce':
                this.handleDivorce(record);
                break;
            case 'death':
                this.handleDeath(record);
                break;
        }
        this.updateLifeRecord(record.npcId, record);
        window.dispatchEvent(new CustomEvent('vws-life-event', { detail: { record, event: eventId } }));
    }

    handleBirth(record) {
        const child = {
            id: this.generateUUID(),
            name: this.generateChildName(record),
            parents: [record.npcId, record.spouse],
            birthYear: this.timeSystem.getCurrentYear()
        };
        record.children.push(child.id);
        const state = this.stateManager.getSection('npcLife');
        state.births.push({ ...child, date: Date.now(), gameDate: this.timeSystem.getCurrentDateString() });
        this.stateManager.updateSection('npcLife', state);
        this.createLifeRecord(child.id, {
            name: child.name,
            age: 0,
            parents: child.parents,
            location: record.location
        });
    }

    generateChildName(parent) {
        const names = ['Aldric', 'Elara', 'Thorin', 'Sera', 'Grorn', 'Lyra', 'Corvus', 'Mira'];
        return names[Math.floor(Math.random() * names.length)];
    }

    handleMarriage(record) {
        const candidates = this.getAllLifeRecords().filter(r =>
            r.npcId !== record.npcId &&
            !r.married &&
            r.location === record.location &&
            this.getLifeStage(r.age).canMarry
        );
        if (candidates.length === 0) return;
        const spouse = candidates[Math.floor(Math.random() * candidates.length)];
        record.married = true;
        record.spouse = spouse.npcId;
        spouse.married = true;
        spouse.spouse = record.npcId;
        record.relationships[spouse.npcId] = { type: 'spouse', strength: 80 };
        spouse.relationships[record.npcId] = { type: 'spouse', strength: 80 };
        const state = this.stateManager.getSection('npcLife');
        state.marriages.push({
            spouse1: record.npcId,
            spouse2: spouse.npcId,
            date: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString()
        });
        this.updateLifeRecord(spouse.npcId, spouse);
        this.stateManager.updateSection('npcLife', state);
    }

    handleDivorce(record) {
        if (!record.spouse) return;
        const exSpouse = this.getLifeRecord(record.spouse);
        if (exSpouse) {
            exSpouse.married = false;
            exSpouse.spouse = null;
            delete exSpouse.relationships[record.npcId];
            this.updateLifeRecord(exSpouse.npcId, exSpouse);
        }
        record.married = false;
        record.spouse = null;
    }

    handleDeath(record) {
        record.conditions.push('deceased');
        const state = this.stateManager.getSection('npcLife');
        state.deaths.push({
            npcId: record.npcId,
            name: record.name,
            age: record.age,
            date: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString()
        });
        this.stateManager.updateSection('npcLife', state);
        if (this.npcSystem) {
            this.npcSystem.handleNPCDeath({ id: record.npcId }, 'natural_causes');
        }
    }

    monthlyUpdate() {
        for (const record of this.getAllLifeRecords()) {
            this.processMonthlyExpenses(record);
            this.checkCareerProgression(record);
        }
    }

    processMonthlyExpenses(record) {
        const expenses = Math.floor(record.wealth * 0.1);
        record.wealth = Math.max(0, record.wealth - expenses);
        if (record.wealth < 10) {
            record.happiness = Math.max(0, record.happiness - 10);
            record.conditions.push('impoverished');
        }
        this.updateLifeRecord(record.npcId, record);
    }

    checkCareerProgression(record) {
        const occupation = this.occupations[record.occupation];
        if (occupation && Math.random() < 0.05) {
            record.wealth += occupation.income;
            this.addLifeHistoryEvent(record, 'Career advancement');
            this.updateLifeRecord(record.npcId, record);
        }
    }

    yearlyUpdate() {
        for (const record of this.getAllLifeRecords()) {
            this.ageNPC(record);
            this.checkMortalityRisk(record);
        }
    }

    ageNPC(record) {
        record.age++;
        const stage = this.getLifeStage(record.age);
        if (stage.id === 'elderly' || stage.id === 'ancient') {
            record.health = Math.max(0, record.health - 5);
        }
        this.updateLifeRecord(record.npcId, record);
    }

    checkMortalityRisk(record) {
        const stage = this.getLifeStage(record.age);
        let deathChance = 0.001;
        if (stage.id === 'elderly') deathChance = 0.02;
        if (stage.id === 'ancient') deathChance = 0.1;
        if (record.health < 30) deathChance *= 3;
        if (record.conditions.includes('sick')) deathChance *= 2;
        if (Math.random() < deathChance) {
            this.triggerLifeEvent(record, 'death', this.lifeEvents.death);
        }
    }

    addLifeHistoryEvent(record, description) {
        record.lifeHistory.push({
            description,
            date: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString(),
            age: record.age
        });
    }

    updateLifeRecord(npcId, data) {
        const state = this.stateManager.getSection('npcLife');
        state.records[npcId] = { ...state.records[npcId], ...data };
        this.stateManager.updateSection('npcLife', state);
    }

    socialInteraction(npc1Id, npc2Id, interactionType = 'neutral') {
        const record1 = this.getLifeRecord(npc1Id);
        const record2 = this.getLifeRecord(npc2Id);
        if (!record1 || !record2) return;
        let strengthChange = interactionType === 'positive' ? 5 : interactionType === 'negative' ? -5 : 1;
        if (!record1.relationships[npc2Id]) {
            record1.relationships[npc2Id] = { type: 'colleague', strength: 0 };
        }
        if (!record2.relationships[npc1Id]) {
            record2.relationships[npc1Id] = { type: 'colleague', strength: 0 };
        }
        record1.relationships[npc2Id].strength = Math.max(-100, Math.min(100, record1.relationships[npc2Id].strength + strengthChange));
        record2.relationships[npc1Id].strength = Math.max(-100, Math.min(100, record2.relationships[npc1Id].strength + strengthChange));
        this.updateLifeRecord(npc1Id, record1);
        this.updateLifeRecord(npc2Id, record2);
    }

    getNPCLifeForPrompt() {
        const settings = this.stateManager.getSection('npcLife').settings || {};
        if (!settings.injectNPCLifeIntoPrompt) return '';
        const recentEvents = this.stateManager.getSection('npcLife').births.concat(
            this.stateManager.getSection('npcLife').deaths,
            this.stateManager.getSection('npcLife').marriages
        ).slice(-5);
        if (recentEvents.length === 0) return '';
        return `[Life Events: ${recentEvents.length} recent]`;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}

export { NPCLifeSystem, LIFE_STAGES, OCCUPATIONS, RELATIONSHIP_TYPES, DAILY_ACTIVITIES, LIFE_EVENTS };
