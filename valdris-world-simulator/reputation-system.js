const REPUTATION_TITLES = {
    global: [
        { name: "Unknown", minRep: 0, icon: "👤" },
        { name: "Recognized", minRep: 20, icon: "👁️" },
        { name: "Notable", minRep: 35, icon: "⭐" },
        { name: "Famous", minRep: 50, icon: "🌟" },
        { name: "Renowned", minRep: 65, icon: "✨" },
        { name: "Legendary", minRep: 80, icon: "🏆" },
        { name: "Mythical", minRep: 95, icon: "👑" }
    ],
    heroic: [
        { name: "Commoner", minRep: 0 },
        { name: "Helper", minRep: 15 },
        { name: "Defender", minRep: 30 },
        { name: "Champion", minRep: 50 },
        { name: "Hero", minRep: 70 },
        { name: "Savior", minRep: 90 }
    ],
    villainous: [
        { name: "Innocent", minRep: 0 },
        { name: "Troublemaker", minRep: 15 },
        { name: "Criminal", minRep: 30 },
        { name: "Villain", minRep: 50 },
        { name: "Menace", minRep: 70 },
        { name: "Scourge", minRep: 90 }
    ]
};

const DEED_TYPES = {
    heroic_minor: { name: "Minor Heroic Deed", globalGain: 2, heroicGain: 3, category: "heroic" },
    heroic_moderate: { name: "Heroic Deed", globalGain: 5, heroicGain: 8, category: "heroic" },
    heroic_major: { name: "Major Heroic Deed", globalGain: 10, heroicGain: 15, category: "heroic" },
    heroic_legendary: { name: "Legendary Heroic Deed", globalGain: 25, heroicGain: 30, category: "heroic" },
    villainous_minor: { name: "Minor Villainy", globalGain: 1, villainousGain: 3, category: "villainous" },
    villainous_moderate: { name: "Villainous Act", globalGain: 3, villainousGain: 8, category: "villainous" },
    villainous_major: { name: "Major Villainy", globalGain: 8, villainousGain: 15, category: "villainous" },
    villainous_legendary: { name: "Legendary Villainy", globalGain: 20, villainousGain: 30, category: "villainous" },
    notable: { name: "Notable Achievement", globalGain: 5, category: "neutral" },
    discovery: { name: "Great Discovery", globalGain: 8, category: "neutral" },
    political: { name: "Political Achievement", globalGain: 5, category: "political" },
    artistic: { name: "Artistic Achievement", globalGain: 3, category: "cultural" }
};

const LEGEND_TEMPLATES = [
    "The tale of how {player} {action} spread far and wide.",
    "Bards sing of {player}, who {action} against all odds.",
    "In {region}, they speak in hushed tones of {player} and how they {action}.",
    "{player}'s {action} has become the stuff of legend.",
    "Children hear stories of {player}, the one who {action}.",
    "The {faction} will never forget how {player} {action}."
];

const LEGEND_ACTIONS = {
    heroic: [
        "saved an entire village from destruction",
        "defeated a legendary monster single-handedly",
        "brought peace to warring nations",
        "discovered an ancient artifact of power",
        "protected the innocent from tyranny"
    ],
    villainous: [
        "brought ruin to an ancient kingdom",
        "betrayed those who trusted them most",
        "unleashed a terrible curse upon the land",
        "assassinated a beloved ruler",
        "burned cities to ash"
    ],
    neutral: [
        "uncovered secrets long forgotten",
        "changed the course of history",
        "walked paths no mortal had tread",
        "forged alliances thought impossible",
        "survived trials that would break lesser beings"
    ]
};

const DEFAULT_REPUTATION_STATE = {
    global: 0,
    heroic: 0,
    villainous: 0,
    regional: {},
    factional: {},
    legends: [],
    deeds: [],
    titles: [],
    aliases: []
};

class ReputationSystem {
    constructor(stateManager, timeSystem, factionSystem, rumorSystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.factionSystem = factionSystem;
        this.rumorSystem = rumorSystem;
        this.reputationTitles = REPUTATION_TITLES;
        this.deedTypes = DEED_TYPES;
        this.legendTemplates = LEGEND_TEMPLATES;
        this.legendActions = LEGEND_ACTIONS;

        this.timeSystem.onWeekChanged(() => this.weeklyUpdate());
        this.timeSystem.onMonthChanged(() => this.monthlyUpdate());
    }

    initialize() {
        const state = this.stateManager.getSection('reputation');
        if (!state.global && state.global !== 0) {
            Object.assign(state, JSON.parse(JSON.stringify(DEFAULT_REPUTATION_STATE)));
            this.stateManager.updateSection('reputation', state);
        }
    }

    getGlobalReputation() {
        return this.stateManager.getSection('reputation').global;
    }

    getHeroicReputation() {
        return this.stateManager.getSection('reputation').heroic;
    }

    getVillainousReputation() {
        return this.stateManager.getSection('reputation').villainous;
    }

    getRegionalReputation(regionId) {
        return this.stateManager.getSection('reputation').regional[regionId] || 0;
    }

    getFactionReputation(factionId) {
        return this.stateManager.getSection('reputation').factional[factionId] || 0;
    }

    getTitle(reputationType = 'global') {
        const state = this.stateManager.getSection('reputation');
        const repValue = state[reputationType] || 0;
        const titles = this.reputationTitles[reputationType] || this.reputationTitles.global;
        return titles.slice().reverse().find(t => repValue >= t.minRep) || titles[0];
    }

    weeklyUpdate() {
        this.spreadReputation();
        this.decayReputation();
    }

    monthlyUpdate() {
        this.generateLegendProgress();
        this.checkForNewTitles();
    }

    spreadReputation() {
        const state = this.stateManager.getSection('reputation');
        if (state.global > 30) {
            for (const deed of state.deeds.slice(-5)) {
                if (deed.location && this.rumorSystem && Math.random() < 0.3) {
                    this.rumorSystem.createRumor(
                        `Tales of ${deed.description} spread through the land.`,
                        'gossip',
                        deed.location
                    );
                }
            }
        }
    }

    decayReputation() {
        const state = this.stateManager.getSection('reputation');
        for (const regionId of Object.keys(state.regional)) {
            if (state.regional[regionId] > 0) {
                state.regional[regionId] = Math.max(0, state.regional[regionId] - 0.5);
            }
        }
        this.stateManager.updateSection('reputation', state);
    }

    generateLegendProgress() {
        const state = this.stateManager.getSection('reputation');
        if (state.global >= 80 && state.legends.length < 5 && Math.random() < 0.2) {
            this.createLegend();
        }
    }

    checkForNewTitles() {
        const state = this.stateManager.getSection('reputation');
        const globalTitle = this.getTitle('global');
        const heroicTitle = this.getTitle('heroic');
        const villainousTitle = this.getTitle('villainous');
        const earnedTitles = [];
        if (globalTitle && !state.titles.includes(globalTitle.name)) {
            state.titles.push(globalTitle.name);
            earnedTitles.push(globalTitle);
        }
        if (state.heroic >= 50 && heroicTitle && !state.titles.includes(heroicTitle.name)) {
            state.titles.push(heroicTitle.name);
            earnedTitles.push(heroicTitle);
        }
        if (state.villainous >= 50 && villainousTitle && !state.titles.includes(villainousTitle.name)) {
            state.titles.push(villainousTitle.name);
            earnedTitles.push(villainousTitle);
        }
        if (earnedTitles.length > 0) {
            this.stateManager.updateSection('reputation', state);
            for (const title of earnedTitles) {
                window.dispatchEvent(new CustomEvent('vws-title-earned', { detail: title }));
            }
        }
    }

    recordDeed(deedType, description, location = null, context = {}) {
        const deed = this.deedTypes[deedType];
        if (!deed) return null;
        const state = this.stateManager.getSection('reputation');
        const deedRecord = {
            id: this.generateUUID(),
            type: deedType,
            description: description || deed.name,
            location,
            context,
            timestamp: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString()
        };
        state.deeds.push(deedRecord);
        state.global = Math.min(100, state.global + deed.globalGain);
        if (deed.heroicGain) {
            state.heroic = Math.min(100, state.heroic + deed.heroicGain);
        }
        if (deed.villainousGain) {
            state.villainous = Math.min(100, state.villainous + deed.villainousGain);
        }
        if (location) {
            state.regional[location] = Math.min(100, (state.regional[location] || 0) + deed.globalGain * 2);
        }
        this.stateManager.updateSection('reputation', state);
        window.dispatchEvent(new CustomEvent('vws-deed-recorded', { detail: deedRecord }));
        if (deed.globalGain >= 10) {
            this.createLegend(deed.category, description);
        }
        return deedRecord;
    }

    adjustGlobalReputation(amount) {
        const state = this.stateManager.getSection('reputation');
        state.global = Math.max(0, Math.min(100, state.global + amount));
        this.stateManager.updateSection('reputation', state);
    }

    adjustRegionalReputation(regionId, amount) {
        const state = this.stateManager.getSection('reputation');
        state.regional[regionId] = Math.max(0, Math.min(100, (state.regional[regionId] || 0) + amount));
        this.stateManager.updateSection('reputation', state);
    }

    adjustFactionReputation(factionId, amount) {
        const state = this.stateManager.getSection('reputation');
        state.factional[factionId] = Math.max(-100, Math.min(100, (state.factional[factionId] || 0) + amount));
        this.stateManager.updateSection('reputation', state);
        if (this.factionSystem) {
            this.factionSystem.modifyPlayerReputation(factionId, amount);
        }
    }

    createLegend(category = 'neutral', customAction = null) {
        const state = this.stateManager.getSection('reputation');
        const template = this.legendTemplates[Math.floor(Math.random() * this.legendTemplates.length)];
        const actions = this.legendActions[category] || this.legendActions.neutral;
        const action = customAction || actions[Math.floor(Math.random() * actions.length)];
        let legendText = template
            .replace('{player}', 'the adventurer')
            .replace('{action}', action)
            .replace('{region}', 'the realm')
            .replace('{faction}', 'the people');
        const legend = {
            id: this.generateUUID(),
            text: legendText,
            category,
            createdAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString(),
            spread: 1
        };
        state.legends.push(legend);
        state.global = Math.min(100, state.global + 5);
        this.stateManager.updateSection('reputation', state);
        window.dispatchEvent(new CustomEvent('vws-legend-created', { detail: legend }));
        if (this.rumorSystem) {
            this.rumorSystem.createRumor(legendText, 'major');
        }
        return legend;
    }

    addAlias(alias, context = null) {
        const state = this.stateManager.getSection('reputation');
        if (!state.aliases.find(a => a.name === alias)) {
            state.aliases.push({
                name: alias,
                context,
                earnedAt: Date.now(),
                gameDate: this.timeSystem.getCurrentDateString()
            });
            this.stateManager.updateSection('reputation', state);
            window.dispatchEvent(new CustomEvent('vws-alias-earned', { detail: { alias, context } }));
        }
    }

    getLegends() {
        return this.stateManager.getSection('reputation').legends;
    }

    getDeeds() {
        return this.stateManager.getSection('reputation').deeds;
    }

    getTitles() {
        return this.stateManager.getSection('reputation').titles;
    }

    getAliases() {
        return this.stateManager.getSection('reputation').aliases;
    }

    getReputationSummary() {
        const state = this.stateManager.getSection('reputation');
        return {
            global: state.global,
            globalTitle: this.getTitle('global'),
            heroic: state.heroic,
            heroicTitle: state.heroic >= 30 ? this.getTitle('heroic') : null,
            villainous: state.villainous,
            villainousTitle: state.villainous >= 30 ? this.getTitle('villainous') : null,
            legends: state.legends.length,
            deeds: state.deeds.length,
            titles: state.titles,
            aliases: state.aliases.map(a => a.name)
        };
    }

    getReputationForPrompt() {
        const settings = this.stateManager.getSection('reputation').settings || {};
        if (!settings.injectReputationIntoPrompt) return '';
        const state = this.stateManager.getSection('reputation');
        const title = this.getTitle('global');
        const parts = [];
        if (state.global >= 20) {
            parts.push(`Fame: ${title.name}`);
        }
        if (state.heroic >= 50) {
            parts.push(`Hero: ${this.getTitle('heroic').name}`);
        }
        if (state.villainous >= 50) {
            parts.push(`Villain: ${this.getTitle('villainous').name}`);
        }
        if (state.legends.length > 0) {
            parts.push(`Legends: ${state.legends.length}`);
        }
        return parts.length > 0 ? `[Reputation: ${parts.join(', ')}]` : '';
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}

export { ReputationSystem, REPUTATION_TITLES, DEED_TYPES, LEGEND_TEMPLATES, LEGEND_ACTIONS, DEFAULT_REPUTATION_STATE };
