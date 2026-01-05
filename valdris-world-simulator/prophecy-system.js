const PROPHECY_TEMPLATES = [
    "When the {omen} rises in the {season}, the {hero} shall {action} and {consequence}.",
    "In the {time_period} of {realm}, a {artifact} will awaken, bringing {outcome} to all who witness.",
    "The {faction} shall {fate} unless the {hero} heeds the call of the {omen}.",
    "Behold, when {number} {creature}s gather at {location}, the {event} shall commence.",
    "The blood of the {lineage} shall flow when {condition}, and {outcome} follows.",
    "From the {direction} comes the {threat}, only the bearer of {artifact} can prevent {disaster}.",
    "Three signs herald the {prophecy_type}: {sign1}, {sign2}, and {sign3}.",
    "In darkness, {hero} shall find {artifact}, and with it, {action} the {enemy}."
];

const PROPHECY_TOKENS = {
    omen: ["crimson star", "ashen moon", "silent bell", "burning sun", "frozen tear", "bleeding sky", "shattered crown"],
    hero: ["lost heir", "silver blade", "wandering mage", "forgotten king", "shadow walker", "chosen one", "broken knight"],
    action: ["restore balance", "break the seal", "banish the shadow", "unite the realms", "forge anew", "reclaim", "destroy"],
    consequence: ["peace shall reign", "darkness shall fall", "the world trembles", "light returns", "chaos ensues", "a new age dawns"],
    season: ["first thaw", "long night", "golden harvest", "winter's grip", "blood moon", "star fall"],
    time_period: ["twilight age", "dawn of reckoning", "era of silence", "age of heroes", "time of trials"],
    realm: ["mortal lands", "shadow realm", "celestial plane", "frozen north", "burning south", "forgotten depths"],
    artifact: ["sunstone", "void key", "ancient crown", "soul blade", "dragon heart", "moon shard", "titan's eye"],
    outcome: ["salvation", "destruction", "transformation", "revelation", "ascension", "doom"],
    faction: ["Valdric Empire", "Sylvan Dominion", "Orcish Dominion", "Dwarven Holds", "Shadow Syndicate"],
    fate: ["fall", "rise", "transform", "unite", "crumble", "transcend"],
    number: ["seven", "three", "thirteen", "nine", "five"],
    creature: ["dragon", "phoenix", "demon", "angel", "elemental", "titan"],
    location: ["ancient temple", "forgotten tomb", "mountain peak", "ocean depths", "world tree"],
    event: ["great awakening", "final battle", "divine judgment", "world's end", "rebirth"],
    lineage: ["ancient kings", "dragon blood", "moon touched", "first mages", "shadow born"],
    condition: ["stars align", "seal breaks", "chosen falls", "artifact wakes", "enemy rises"],
    direction: ["east", "west", "north", "south", "beneath", "above"],
    threat: ["ancient evil", "forgotten god", "demon lord", "dragon king", "shadow emperor"],
    disaster: ["world's end", "eternal darkness", "divine wrath", "planar collapse"],
    prophecy_type: ["doom", "salvation", "transformation", "revelation"],
    sign1: ["ravens flying backward", "rivers running red", "dead trees blooming"],
    sign2: ["moon turning black", "stars falling", "earth trembling"],
    sign3: ["silence of the gods", "waking of the dead", "breaking of the seal"],
    enemy: ["darkness", "ancient evil", "demon horde", "corrupted king", "false god"]
};

const PROPHECY_TYPES = {
    doom: { name: "Prophecy of Doom", rarity: "rare", fulfillmentWindow: 365, consequences: "catastrophic" },
    salvation: { name: "Prophecy of Salvation", rarity: "rare", fulfillmentWindow: 180, consequences: "beneficial" },
    warning: { name: "Warning Prophecy", rarity: "common", fulfillmentWindow: 60, consequences: "moderate" },
    destiny: { name: "Prophecy of Destiny", rarity: "uncommon", fulfillmentWindow: 90, consequences: "personal" },
    revelation: { name: "Divine Revelation", rarity: "legendary", fulfillmentWindow: 365, consequences: "world_changing" }
};

const FULFILLMENT_STAGES = {
    dormant: { name: "Dormant", progress: [0, 20] },
    stirring: { name: "Stirring", progress: [21, 40] },
    awakening: { name: "Awakening", progress: [41, 60] },
    manifesting: { name: "Manifesting", progress: [61, 80] },
    imminent: { name: "Imminent", progress: [81, 99] },
    fulfilled: { name: "Fulfilled", progress: [100, 100] }
};

class ProphecySystem {
    constructor(stateManager, timeSystem, eventSystem, divineSystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.eventSystem = eventSystem;
        this.divineSystem = divineSystem;
        this.prophecyTemplates = PROPHECY_TEMPLATES;
        this.prophecyTokens = PROPHECY_TOKENS;
        this.prophecyTypes = PROPHECY_TYPES;
        this.fulfillmentStages = FULFILLMENT_STAGES;

        this.timeSystem.onDayChanged(() => this.dailyUpdate());
        this.timeSystem.onWeekChanged(() => this.weeklyUpdate());
        this.timeSystem.onMonthChanged(() => this.monthlyUpdate());
    }

    initialize() {
        const state = this.stateManager.getSection('prophecy');
        if (!state.active || !Array.isArray(state.active)) {
            state.active = [];
            state.fulfilled = [];
            state.failed = [];
            state.omens = [];
            state.triggers = {};
            this.stateManager.updateSection('prophecy', state);
        }
    }

    getActiveProphecies() {
        return this.stateManager.getSection('prophecy').active;
    }

    getProphecy(prophecyId) {
        return this.getActiveProphecies().find(p => p.id === prophecyId);
    }

    getFulfillmentStage(progress) {
        for (const [stageId, stage] of Object.entries(this.fulfillmentStages)) {
            if (progress >= stage.progress[0] && progress <= stage.progress[1]) {
                return { id: stageId, ...stage };
            }
        }
        return { id: 'dormant', ...this.fulfillmentStages.dormant };
    }

    dailyUpdate() {
        this.checkOmens();
        this.updateProphecyProgress();
    }

    weeklyUpdate() {
        this.checkTriggerConditions();
        this.generateOmens();
    }

    monthlyUpdate() {
        this.checkForNewProphecies();
        this.cleanupExpiredProphecies();
    }

    checkOmens() {
        const state = this.stateManager.getSection('prophecy');
        for (const omen of state.omens.filter(o => o.status === 'active')) {
            omen.daysActive = (omen.daysActive || 0) + 1;
            if (omen.daysActive >= omen.duration) {
                omen.status = 'expired';
            }
        }
        state.omens = state.omens.filter(o => o.status === 'active');
        this.stateManager.updateSection('prophecy', state);
    }

    updateProphecyProgress() {
        const state = this.stateManager.getSection('prophecy');
        for (const prophecy of state.active) {
            const daysPassed = (Date.now() - prophecy.createdAt) / (24 * 60 * 60 * 1000);
            const baseProgress = (daysPassed / prophecy.fulfillmentWindow) * 30;
            const triggersProgress = (prophecy.triggeredConditions?.length || 0) * 15;
            prophecy.progress = Math.min(99, baseProgress + triggersProgress);
            if (prophecy.progress >= 100) {
                this.fulfillProphecy(prophecy);
            }
        }
        this.stateManager.updateSection('prophecy', state);
    }

    checkTriggerConditions() {
        for (const prophecy of this.getActiveProphecies()) {
            for (const trigger of prophecy.triggers || []) {
                if (this.checkTrigger(trigger) && !prophecy.triggeredConditions?.includes(trigger.id)) {
                    prophecy.triggeredConditions = prophecy.triggeredConditions || [];
                    prophecy.triggeredConditions.push(trigger.id);
                    prophecy.progress = Math.min(99, prophecy.progress + 20);
                    window.dispatchEvent(new CustomEvent('vws-prophecy-trigger', {
                        detail: { prophecy, trigger }
                    }));
                }
            }
        }
    }

    checkTrigger(trigger) {
        switch (trigger.type) {
            case 'time':
                return this.timeSystem.getCurrentSeason() === trigger.value;
            case 'event':
                return this.eventSystem?.hasEventOccurred(trigger.value);
            case 'death':
                return false;
            case 'artifact':
                return false;
            default:
                return Math.random() < 0.1;
        }
    }

    generateOmens() {
        if (Math.random() < 0.1) {
            const omenTypes = [
                { type: 'celestial', description: 'Strange lights appear in the night sky' },
                { type: 'natural', description: 'Animals behave erratically' },
                { type: 'supernatural', description: 'Whispers heard in empty places' },
                { type: 'divine', description: 'Temple statues weep blood' },
                { type: 'arcane', description: 'Magic behaves unpredictably' }
            ];
            const omenType = omenTypes[Math.floor(Math.random() * omenTypes.length)];
            this.createOmen(omenType.type, omenType.description);
        }
    }

    createOmen(type, description) {
        const state = this.stateManager.getSection('prophecy');
        const omen = {
            id: this.generateUUID(),
            type,
            description,
            status: 'active',
            daysActive: 0,
            duration: 7 + Math.floor(Math.random() * 14),
            createdAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString()
        };
        state.omens.push(omen);
        this.stateManager.updateSection('prophecy', state);
        for (const prophecy of this.getActiveProphecies()) {
            if (prophecy.associatedOmens?.includes(type)) {
                prophecy.progress = Math.min(99, prophecy.progress + 5);
            }
        }
        window.dispatchEvent(new CustomEvent('vws-omen-appeared', { detail: omen }));
        return omen;
    }

    checkForNewProphecies() {
        if (this.getActiveProphecies().length < 3 && Math.random() < 0.2) {
            this.generate();
        }
    }

    cleanupExpiredProphecies() {
        const state = this.stateManager.getSection('prophecy');
        const now = Date.now();
        for (const prophecy of state.active) {
            const daysPassed = (now - prophecy.createdAt) / (24 * 60 * 60 * 1000);
            if (daysPassed > prophecy.fulfillmentWindow && prophecy.progress < 100) {
                prophecy.status = 'failed';
                state.failed.push(prophecy);
                window.dispatchEvent(new CustomEvent('vws-prophecy-failed', { detail: prophecy }));
            }
        }
        state.active = state.active.filter(p => p.status !== 'failed');
        this.stateManager.updateSection('prophecy', state);
    }

    generate(type = null) {
        const state = this.stateManager.getSection('prophecy');
        const prophecyType = type || this.selectProphecyType();
        const typeData = this.prophecyTypes[prophecyType];
        const template = this.prophecyTemplates[Math.floor(Math.random() * this.prophecyTemplates.length)];
        const text = this.fillTemplate(template);
        const prophecy = {
            id: this.generateUUID(),
            type: prophecyType,
            text,
            originalText: text,
            status: 'active',
            progress: 0,
            triggers: this.generateTriggers(prophecyType),
            triggeredConditions: [],
            associatedOmens: this.generateAssociatedOmens(),
            fulfillmentWindow: typeData.fulfillmentWindow,
            consequences: typeData.consequences,
            createdAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString(),
            revealedTo: [],
            interpretations: []
        };
        state.active.push(prophecy);
        this.stateManager.updateSection('prophecy', state);
        window.dispatchEvent(new CustomEvent('vws-prophecy-generated', { detail: prophecy }));
        return prophecy;
    }

    selectProphecyType() {
        const weights = {
            warning: 40,
            destiny: 30,
            doom: 15,
            salvation: 10,
            revelation: 5
        };
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        for (const [type, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) return type;
        }
        return 'warning';
    }

    fillTemplate(template) {
        return template.replace(/\{(\w+)\}/g, (_, key) => {
            const options = this.prophecyTokens[key] || ['mystery'];
            return options[Math.floor(Math.random() * options.length)];
        });
    }

    generateTriggers(prophecyType) {
        const triggers = [];
        const numTriggers = prophecyType === 'doom' || prophecyType === 'revelation' ? 3 : 2;
        const triggerTypes = ['time', 'event', 'omen'];
        for (let i = 0; i < numTriggers; i++) {
            const type = triggerTypes[Math.floor(Math.random() * triggerTypes.length)];
            triggers.push({
                id: this.generateUUID(),
                type,
                value: this.generateTriggerValue(type),
                triggered: false
            });
        }
        return triggers;
    }

    generateTriggerValue(type) {
        switch (type) {
            case 'time':
                return ['spring', 'summer', 'autumn', 'winter'][Math.floor(Math.random() * 4)];
            case 'event':
                return ['war', 'death', 'birth', 'discovery'][Math.floor(Math.random() * 4)];
            case 'omen':
                return ['celestial', 'natural', 'supernatural', 'divine'][Math.floor(Math.random() * 4)];
            default:
                return 'unknown';
        }
    }

    generateAssociatedOmens() {
        const omenTypes = ['celestial', 'natural', 'supernatural', 'divine', 'arcane'];
        const numOmens = Math.floor(Math.random() * 3) + 1;
        const omens = [];
        for (let i = 0; i < numOmens; i++) {
            omens.push(omenTypes[Math.floor(Math.random() * omenTypes.length)]);
        }
        return [...new Set(omens)];
    }

    fulfillProphecy(prophecy) {
        prophecy.status = 'fulfilled';
        prophecy.progress = 100;
        prophecy.fulfilledAt = Date.now();
        prophecy.fulfilledGameDate = this.timeSystem.getCurrentDateString();
        const state = this.stateManager.getSection('prophecy');
        state.fulfilled.push(prophecy);
        state.active = state.active.filter(p => p.id !== prophecy.id);
        this.stateManager.updateSection('prophecy', state);
        this.applyProphecyConsequences(prophecy);
        window.dispatchEvent(new CustomEvent('vws-prophecy-fulfilled', { detail: prophecy }));
    }

    applyProphecyConsequences(prophecy) {
        switch (prophecy.consequences) {
            case 'catastrophic':
                break;
            case 'beneficial':
                break;
            case 'world_changing':
                break;
        }
    }

    revealProphecy(prophecyId, toWhom = 'player') {
        const prophecy = this.getProphecy(prophecyId);
        if (prophecy && !prophecy.revealedTo.includes(toWhom)) {
            prophecy.revealedTo.push(toWhom);
            window.dispatchEvent(new CustomEvent('vws-prophecy-revealed', { detail: { prophecy, toWhom } }));
        }
    }

    addInterpretation(prophecyId, interpretation, source) {
        const prophecy = this.getProphecy(prophecyId);
        if (prophecy) {
            prophecy.interpretations.push({
                text: interpretation,
                source,
                addedAt: Date.now()
            });
        }
    }

    advanceProphecy(prophecyId, amount = 10) {
        const prophecy = this.getProphecy(prophecyId);
        if (prophecy) {
            prophecy.progress = Math.min(99, prophecy.progress + amount);
            if (prophecy.progress >= 100) {
                this.fulfillProphecy(prophecy);
            }
            return prophecy;
        }
        return null;
    }

    getProphecyForPrompt() {
        const settings = this.stateManager.getSection('prophecy').settings || {};
        if (!settings.injectProphecyIntoPrompt) return '';
        const active = this.getActiveProphecies().filter(p => p.revealedTo.includes('player'));
        const omens = this.stateManager.getSection('prophecy').omens.filter(o => o.status === 'active');
        const parts = [];
        if (active.length > 0) {
            const mostAdvanced = active.reduce((max, p) => p.progress > max.progress ? p : max, active[0]);
            parts.push(`Prophecy: ${this.getFulfillmentStage(mostAdvanced.progress).name}`);
        }
        if (omens.length > 0) {
            parts.push(`Omens: ${omens.length}`);
        }
        return parts.length > 0 ? `[${parts.join(', ')}]` : '';
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}

export { ProphecySystem, PROPHECY_TEMPLATES, PROPHECY_TOKENS, PROPHECY_TYPES, FULFILLMENT_STAGES };
