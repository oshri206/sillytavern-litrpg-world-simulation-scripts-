const DEITIES = {
    aurelia: {
        id: "aurelia", name: "Aurelia", title: "The Radiant Dawn",
        domain: "light", alignment: "lawful_good", icon: "☀️",
        aspects: ["sun", "healing", "truth", "justice"],
        blessings: ["divine_light", "healing_touch", "truth_sight"],
        curses: ["burning_judgment", "blinding_light"],
        favoredRaces: ["humans", "elves"],
        opposedDeities: ["umbra", "nerath"]
    },
    nerath: {
        id: "nerath", name: "Nerath", title: "The Silent Judge",
        domain: "death", alignment: "lawful_neutral", icon: "💀",
        aspects: ["death", "fate", "passage", "souls"],
        blessings: ["death_ward", "speak_with_dead", "fate_glimpse"],
        curses: ["soul_rot", "death_mark"],
        favoredRaces: ["humans", "undead"],
        opposedDeities: ["aurelia", "eirwyn"]
    },
    kael: {
        id: "kael", name: "Kael", title: "The Iron Storm",
        domain: "war", alignment: "chaotic_neutral", icon: "⚔️",
        aspects: ["war", "strength", "valor", "storm"],
        blessings: ["battle_fury", "iron_skin", "storm_strike"],
        curses: ["coward_brand", "weapon_break"],
        favoredRaces: ["orcs", "humans", "dwarves"],
        opposedDeities: ["sylas"]
    },
    sylas: {
        id: "sylas", name: "Sylas", title: "The Trickster",
        domain: "luck", alignment: "chaotic_neutral", icon: "🎲",
        aspects: ["luck", "trickery", "fortune", "chaos"],
        blessings: ["lucky_break", "silver_tongue", "fortune_favor"],
        curses: ["bad_luck", "fool_mark"],
        favoredRaces: ["halflings", "gnomes", "humans"],
        opposedDeities: ["kael"]
    },
    umbra: {
        id: "umbra", name: "Umbra", title: "The Shadow Queen",
        domain: "shadow", alignment: "neutral_evil", icon: "🌑",
        aspects: ["shadow", "secrets", "assassination", "fear"],
        blessings: ["shadow_cloak", "dark_vision", "fear_aura"],
        curses: ["shadow_curse", "nightmare_plague"],
        favoredRaces: ["dark_elves", "assassins"],
        opposedDeities: ["aurelia"]
    },
    eirwyn: {
        id: "eirwyn", name: "Eirwyn", title: "The Wild Mother",
        domain: "nature", alignment: "true_neutral", icon: "🌿",
        aspects: ["nature", "beasts", "seasons", "growth"],
        blessings: ["nature_ward", "beast_speech", "wild_shape"],
        curses: ["nature_wrath", "beast_curse"],
        favoredRaces: ["elves", "druids", "beast_kin"],
        opposedDeities: ["nerath"]
    },
    thorak: {
        id: "thorak", name: "Thorak", title: "The Mountain King",
        domain: "earth", alignment: "lawful_neutral", icon: "⛰️",
        aspects: ["earth", "crafting", "endurance", "wealth"],
        blessings: ["stone_skin", "master_craft", "earth_sense"],
        curses: ["stone_curse", "greed_madness"],
        favoredRaces: ["dwarves"],
        opposedDeities: []
    },
    velara: {
        id: "velara", name: "Velara", title: "The Arcane Weaver",
        domain: "magic", alignment: "true_neutral", icon: "✨",
        aspects: ["magic", "knowledge", "arcane", "stars"],
        blessings: ["arcane_insight", "mana_surge", "spell_shield"],
        curses: ["magic_drain", "arcane_madness"],
        favoredRaces: ["elves", "mages"],
        opposedDeities: []
    }
};

const DIVINE_EVENTS = {
    blessing: {
        name: "Divine Blessing", icon: "✨",
        probability: 0.02, favorRequirement: 50,
        effects: { targetBuff: true, duration: 30 }
    },
    curse: {
        name: "Divine Curse", icon: "💀",
        probability: 0.01, favorRequirement: -50,
        effects: { targetDebuff: true, duration: 60 }
    },
    omen: {
        name: "Divine Omen", icon: "🔮",
        probability: 0.05, favorRequirement: 0,
        effects: { prophecy: true }
    },
    miracle: {
        name: "Divine Miracle", icon: "🌟",
        probability: 0.005, favorRequirement: 80,
        effects: { majorBuff: true, worldEvent: true }
    },
    wrath: {
        name: "Divine Wrath", icon: "⚡",
        probability: 0.005, favorRequirement: -80,
        effects: { majorDebuff: true, disaster: true }
    },
    avatar: {
        name: "Avatar Manifestation", icon: "👼",
        probability: 0.001, favorRequirement: 100,
        effects: { avatarSpawn: true, questline: true }
    },
    silence: {
        name: "Divine Silence", icon: "🔇",
        probability: 0.01, favorRequirement: -30,
        effects: { prayerBlocked: true, duration: 14 }
    }
};

const PRAYER_TYPES = {
    worship: { name: "Worship", favorGain: 2, cost: { time: 1, gold: 0 }, cooldown: 0 },
    offering: { name: "Offering", favorGain: 5, cost: { time: 0, gold: 10 }, cooldown: 1 },
    sacrifice: { name: "Sacrifice", favorGain: 15, cost: { time: 1, gold: 50 }, cooldown: 7 },
    pilgrimage: { name: "Pilgrimage", favorGain: 30, cost: { time: 14, gold: 100 }, cooldown: 30 },
    holy_quest: { name: "Holy Quest", favorGain: 50, cost: { time: 30, gold: 0 }, cooldown: 90 }
};

const DEFAULT_DIVINE_STATE = {
    playerFavor: {
        aurelia: 0, nerath: 0, kael: 0, sylas: 0,
        umbra: 0, eirwyn: 0, thorak: 0, velara: 0
    },
    factionPatrons: {
        valdric_empire: "aurelia",
        dwarven_holds: "thorak",
        sylvan_dominion: "eirwyn",
        orcish_dominion: "kael",
        merchant_league: "sylas",
        shadow_syndicate: "umbra"
    },
    activeInterventions: [],
    divineHistory: [],
    holyDays: []
};

class DivineSystem {
    constructor(stateManager, timeSystem, factionSystem, eventSystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.factionSystem = factionSystem;
        this.eventSystem = eventSystem;
        this.deities = DEITIES;
        this.divineEvents = DIVINE_EVENTS;
        this.prayerTypes = PRAYER_TYPES;

        this.timeSystem.onDayChanged(() => this.dailyUpdate());
        this.timeSystem.onWeekChanged(() => this.weeklyUpdate());
        this.timeSystem.onMonthChanged(() => this.monthlyUpdate());
    }

    initialize() {
        const state = this.stateManager.getSection('divine');
        if (!state.playerFavor) {
            Object.assign(state, JSON.parse(JSON.stringify(DEFAULT_DIVINE_STATE)));
            this.stateManager.updateSection('divine', state);
            this.generateHolyDays();
        }
    }

    getDeity(deityId) {
        return this.deities[deityId];
    }

    getAllDeities() {
        return Object.values(this.deities);
    }

    getPlayerFavor(deityId) {
        return this.stateManager.getSection('divine').playerFavor[deityId] || 0;
    }

    getFactionPatron(factionId) {
        const patronId = this.stateManager.getSection('divine').factionPatrons[factionId];
        return patronId ? this.getDeity(patronId) : null;
    }

    dailyUpdate() {
        this.checkHolyDays();
        this.processActiveInterventions();
        this.naturalFavorDecay();
    }

    weeklyUpdate() {
        this.checkForDivineEvents();
    }

    monthlyUpdate() {
        for (const deity of this.getAllDeities()) {
            this.checkDeityActivity(deity);
        }
    }

    checkHolyDays() {
        const state = this.stateManager.getSection('divine');
        const currentDate = this.timeSystem.getCurrentDateString();
        const holyDay = state.holyDays.find(hd => hd.date === currentDate);
        if (holyDay) {
            this.triggerHolyDay(holyDay);
        }
    }

    triggerHolyDay(holyDay) {
        const deity = this.getDeity(holyDay.deityId);
        if (!deity) return;
        window.dispatchEvent(new CustomEvent('vws-holy-day', { detail: { holyDay, deity } }));
        // Boost favor gains on holy days
        const state = this.stateManager.getSection('divine');
        state.playerFavor[holyDay.deityId] = Math.min(100,
            (state.playerFavor[holyDay.deityId] || 0) + 5);
        this.stateManager.updateSection('divine', state);
    }

    processActiveInterventions() {
        const state = this.stateManager.getSection('divine');
        const now = Date.now();
        state.activeInterventions = state.activeInterventions.filter(intervention => {
            if (intervention.expiresAt && intervention.expiresAt <= now) {
                this.endIntervention(intervention);
                return false;
            }
            return true;
        });
        this.stateManager.updateSection('divine', state);
    }

    endIntervention(intervention) {
        window.dispatchEvent(new CustomEvent('vws-intervention-ended', { detail: intervention }));
    }

    naturalFavorDecay() {
        const state = this.stateManager.getSection('divine');
        for (const deityId of Object.keys(state.playerFavor)) {
            const favor = state.playerFavor[deityId];
            if (favor > 0) {
                state.playerFavor[deityId] = Math.max(0, favor - 0.1);
            } else if (favor < 0) {
                state.playerFavor[deityId] = Math.min(0, favor + 0.05);
            }
        }
        this.stateManager.updateSection('divine', state);
    }

    checkForDivineEvents() {
        for (const deity of this.getAllDeities()) {
            const favor = this.getPlayerFavor(deity.id);
            for (const [eventId, event] of Object.entries(this.divineEvents)) {
                if (Math.random() < event.probability) {
                    const meetsRequirement = event.favorRequirement >= 0
                        ? favor >= event.favorRequirement
                        : favor <= event.favorRequirement;
                    if (meetsRequirement) {
                        this.triggerDivineEvent(deity, eventId, event);
                        break;
                    }
                }
            }
        }
    }

    triggerDivineEvent(deity, eventType, eventData) {
        const event = {
            id: this.generateUUID(),
            deityId: deity.id,
            deityName: deity.name,
            type: eventType,
            description: `${deity.name} ${eventData.name.toLowerCase()}`,
            effects: eventData.effects,
            triggeredAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString()
        };
        if (eventData.effects.duration) {
            event.expiresAt = Date.now() + eventData.effects.duration * 24 * 60 * 60 * 1000;
            const state = this.stateManager.getSection('divine');
            state.activeInterventions.push(event);
            this.stateManager.updateSection('divine', state);
        }
        this.recordDivineEvent(event);
        window.dispatchEvent(new CustomEvent('vws-divine-event', { detail: event }));
        return event;
    }

    checkDeityActivity(deity) {
        // Deities may take action based on world state
        const factions = this.factionSystem?.getAllFactions() || [];
        for (const faction of factions) {
            const patron = this.getFactionPatron(faction.id);
            if (patron && patron.id === deity.id) {
                // Patron deity may intervene for their faction
                if (faction.power < 30 && Math.random() < 0.1) {
                    this.divineIntervention(deity, faction, 'aid');
                }
            }
            // Opposed deities may act against factions
            if (deity.opposedDeities?.includes(this.stateManager.getSection('divine').factionPatrons[faction.id])) {
                if (Math.random() < 0.02) {
                    this.divineIntervention(deity, faction, 'oppose');
                }
            }
        }
    }

    divineIntervention(deity, faction, type) {
        const intervention = {
            id: this.generateUUID(),
            deityId: deity.id,
            factionId: faction.id,
            type,
            description: type === 'aid'
                ? `${deity.name} grants aid to ${faction.name}`
                : `${deity.name} opposes ${faction.name}`,
            triggeredAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString()
        };
        this.recordDivineEvent(intervention);
        window.dispatchEvent(new CustomEvent('vws-divine-intervention', { detail: intervention }));
    }

    pray(deityId, prayerType = 'worship') {
        const deity = this.getDeity(deityId);
        if (!deity) return null;
        const prayer = this.prayerTypes[prayerType];
        if (!prayer) return null;
        const state = this.stateManager.getSection('divine');
        const favorGain = prayer.favorGain;
        state.playerFavor[deityId] = Math.max(-100, Math.min(100,
            (state.playerFavor[deityId] || 0) + favorGain));
        // Opposing deities lose favor
        for (const opposedId of deity.opposedDeities || []) {
            state.playerFavor[opposedId] = Math.max(-100, Math.min(100,
                (state.playerFavor[opposedId] || 0) - favorGain * 0.5));
        }
        this.stateManager.updateSection('divine', state);
        window.dispatchEvent(new CustomEvent('vws-prayer', { detail: { deity, prayerType, favorGain } }));
        return { deity, favorGain, newFavor: state.playerFavor[deityId] };
    }

    requestBlessing(deityId) {
        const deity = this.getDeity(deityId);
        if (!deity) return null;
        const favor = this.getPlayerFavor(deityId);
        if (favor < 50) {
            return { success: false, reason: 'Insufficient favor' };
        }
        const blessing = deity.blessings[Math.floor(Math.random() * deity.blessings.length)];
        const state = this.stateManager.getSection('divine');
        state.playerFavor[deityId] -= 30;
        const blessingEvent = {
            id: this.generateUUID(),
            deityId: deity.id,
            type: 'blessing',
            blessing,
            duration: 7,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
            triggeredAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString()
        };
        state.activeInterventions.push(blessingEvent);
        this.stateManager.updateSection('divine', state);
        window.dispatchEvent(new CustomEvent('vws-blessing-granted', { detail: blessingEvent }));
        return { success: true, blessing: blessingEvent };
    }

    adjustFavor(deityId, amount) {
        const state = this.stateManager.getSection('divine');
        state.playerFavor[deityId] = Math.max(-100, Math.min(100,
            (state.playerFavor[deityId] || 0) + amount));
        this.stateManager.updateSection('divine', state);
    }

    recordDivineEvent(event) {
        const state = this.stateManager.getSection('divine');
        state.divineHistory.push(event);
        if (state.divineHistory.length > 100) {
            state.divineHistory = state.divineHistory.slice(-100);
        }
        this.stateManager.updateSection('divine', state);
    }

    generateHolyDays() {
        const state = this.stateManager.getSection('divine');
        state.holyDays = [];
        for (const deity of this.getAllDeities()) {
            const month = Math.floor(Math.random() * 12) + 1;
            const day = Math.floor(Math.random() * 28) + 1;
            state.holyDays.push({
                deityId: deity.id,
                name: `${deity.title}'s Day`,
                month,
                day,
                date: `${day}/${month}`
            });
        }
        this.stateManager.updateSection('divine', state);
    }

    getActiveBlessing() {
        const state = this.stateManager.getSection('divine');
        return state.activeInterventions.filter(i => i.type === 'blessing');
    }

    getActiveCurses() {
        const state = this.stateManager.getSection('divine');
        return state.activeInterventions.filter(i => i.type === 'curse');
    }

    getDivineForPrompt() {
        const settings = this.stateManager.getSection('divine').settings || {};
        if (!settings.injectDivineIntoPrompt) return '';
        const blessings = this.getActiveBlessing();
        const curses = this.getActiveCurses();
        const parts = [];
        if (blessings.length > 0) parts.push(`Blessings: ${blessings.map(b => b.blessing).join(', ')}`);
        if (curses.length > 0) parts.push(`Curses: ${curses.length}`);
        const highFavor = Object.entries(this.stateManager.getSection('divine').playerFavor)
            .filter(([_, v]) => v >= 50)
            .map(([k]) => this.getDeity(k)?.name);
        if (highFavor.length > 0) parts.push(`Favored by: ${highFavor.join(', ')}`);
        return parts.length > 0 ? `[Divine: ${parts.join('; ')}]` : '';
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}

export { DivineSystem, DEITIES, DIVINE_EVENTS, PRAYER_TYPES, DEFAULT_DIVINE_STATE };
