import { stateManager } from './state-manager.js';
import { TimeSystem } from './time-system.js';
import { WeatherSystem } from './weather-system.js';
import { FactionSystem } from './faction-system.js';
import { EventSystem } from './event-system.js';
import { NPCAutonomySystem } from './npc-autonomy.js';
import { RumorSystem } from './rumor-system.js';
import { EconomySystem } from './economy-system.js';
import { ConsequenceSystem } from './consequence-system.js';
import { SettlementSystem } from './settlement-system.js';
import { WarSystem } from './war-system.js';
import { DynastySystem } from './dynasty-system.js';
import { DungeonSystem } from './dungeon-system.js';
import { NPCLifeSystem } from './npc-life-system.js';
import { ColdWarSystem } from './cold-war-system.js';
import { DivineSystem } from './divine-system.js';
import { CrimeSystem } from './crime-system.js';
import { CatastropheSystem } from './catastrophe-system.js';
import { ProphecySystem } from './prophecy-system.js';
import { ReputationSystem } from './reputation-system.js';
import { initValdrisWorldUI } from './ui.js';

class ValdrisWorldSimulator {
    constructor() {
        this.systems = {};
        this.panel = null;
        this.ui = null;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        stateManager.load();
        this.initializeSystems();
        this.initializeAllSystems();
        try {
            this.ui = initValdrisWorldUI(this);
        } catch (e) {
            console.warn('[ValdrisWorldSimulator] UI initialization failed', e);
        }
        this.registerSillyTavernHooks();
        stateManager.startAutoSave(30000);

        this.initialized = true;
        console.log('[ValdrisWorldSimulator] Initialized successfully');
        window.dispatchEvent(new CustomEvent('vws-initialized', { detail: { systems: this.systems } }));
    }

    initializeSystems() {
        const s = this.systems;

        // Phase 1: Core time system (no dependencies)
        s.time = new TimeSystem(stateManager);

        // Phase 2-7: Systems dependent on time
        s.weather = new WeatherSystem(stateManager, s.time);
        s.factions = new FactionSystem(stateManager, s.time);
        s.events = new EventSystem(stateManager, s.time, s.factions);
        s.npcs = new NPCAutonomySystem(stateManager, s.time, s.factions, s.events);
        s.rumors = new RumorSystem(stateManager, s.time, s.events, s.factions);
        s.economy = new EconomySystem(stateManager, s.time, s.factions);

        // Phase 8-10: World systems
        s.settlements = new SettlementSystem(stateManager, s.time, s.events, s.economy);
        s.warfare = new WarSystem(stateManager, s.time, s.factions, s.settlements);
        s.consequences = new ConsequenceSystem(stateManager, s.time, s.events, s.factions, s.npcs);

        // Phase 11-15: Advanced systems
        s.dynasties = new DynastySystem(stateManager, s.time, s.factions, s.npcs);
        s.dungeons = new DungeonSystem(stateManager, s.time, s.events, s.factions);
        s.npcLife = new NPCLifeSystem(stateManager, s.time, s.settlements, s.factions);
        s.coldWar = new ColdWarSystem(stateManager, s.time, s.factions, s.events);
        s.divine = new DivineSystem(stateManager, s.time, s.factions, s.events);

        // Phase 16-19: Additional systems
        s.crime = new CrimeSystem(stateManager, s.time, s.settlements, s.factions, s.npcs);
        s.catastrophe = new CatastropheSystem(stateManager, s.time, s.settlements, s.factions);
        s.prophecy = new ProphecySystem(stateManager, s.time, s.events, s.factions);
        s.reputation = new ReputationSystem(stateManager, s.time, s.factions, s.events);
    }

    initializeAllSystems() {
        for (const [name, system] of Object.entries(this.systems)) {
            if (typeof system.initialize === 'function') {
                try {
                    system.initialize();
                } catch (e) {
                    console.error(`[ValdrisWorldSimulator] Failed to initialize ${name}:`, e);
                }
            }
        }
    }

    registerSillyTavernHooks() {
        const eventSource = window?.eventSource;
        if (!eventSource || typeof eventSource.on !== 'function') {
            console.log('[ValdrisWorldSimulator] SillyTavern event source not found');
            return;
        }

        eventSource.on('message_received', () => {
            this.advanceTime({ hours: 1 });
        });

        eventSource.on('chat_changed', () => {
            this.ui?.updatePanel?.();
        });

        // Inject world context into prompts
        if (window.SillyTavern?.getContext) {
            const originalGetContext = window.SillyTavern.getContext;
            window.SillyTavern.getContext = () => {
                const context = originalGetContext();
                context.worldContext = this.getWorldContext();
                return context;
            };
        }
    }

    advanceTime({ days = 0, hours = 0 } = {}) {
        if (this.systems.time.advanceTime) {
            this.systems.time.advanceTime({ days, hours });
        }
        stateManager.save();
        this.ui?.updatePanel?.();
    }

    handleWorldEvent(event) {
        console.log('[ValdrisWorldSimulator] World event:', event);
    }

    getWorldContext() {
        const parts = [];

        // Time and weather
        if (this.systems.time?.getTimeForPrompt) {
            const timePrompt = this.systems.time.getTimeForPrompt();
            if (timePrompt) parts.push(timePrompt);
        }

        if (this.systems.weather?.getWeatherForPrompt) {
            const weatherPrompt = this.systems.weather.getWeatherForPrompt();
            if (weatherPrompt) parts.push(weatherPrompt);
        }

        // Active world state
        if (this.systems.warfare?.getWarfareForPrompt) {
            const warPrompt = this.systems.warfare.getWarfareForPrompt();
            if (warPrompt) parts.push(warPrompt);
        }

        if (this.systems.dynasties?.getDynastiesForPrompt) {
            const dynastyPrompt = this.systems.dynasties.getDynastiesForPrompt();
            if (dynastyPrompt) parts.push(dynastyPrompt);
        }

        if (this.systems.catastrophe?.getCatastrophesForPrompt) {
            const catPrompt = this.systems.catastrophe.getCatastrophesForPrompt();
            if (catPrompt) parts.push(catPrompt);
        }

        if (this.systems.prophecy?.getPropheciesForPrompt) {
            const prophPrompt = this.systems.prophecy.getPropheciesForPrompt();
            if (prophPrompt) parts.push(prophPrompt);
        }

        if (this.systems.coldWar?.getColdWarForPrompt) {
            const coldWarPrompt = this.systems.coldWar.getColdWarForPrompt();
            if (coldWarPrompt) parts.push(coldWarPrompt);
        }

        if (this.systems.settlements?.getSettlementsForPrompt) {
            const settlementPrompt = this.systems.settlements.getSettlementsForPrompt();
            if (settlementPrompt) parts.push(settlementPrompt);
        }

        if (this.systems.economy?.getEconomyForPrompt) {
            const econPrompt = this.systems.economy.getEconomyForPrompt();
            if (econPrompt) parts.push(econPrompt);
        }

        if (this.systems.reputation?.getReputationForPrompt) {
            const repPrompt = this.systems.reputation.getReputationForPrompt();
            if (repPrompt) parts.push(repPrompt);
        }

        if (this.systems.consequences?.getConsequencesForPrompt) {
            const consPrompt = this.systems.consequences.getConsequencesForPrompt();
            if (consPrompt) parts.push(consPrompt);
        }

        if (this.systems.divine?.getDivineForPrompt) {
            const divinePrompt = this.systems.divine.getDivineForPrompt();
            if (divinePrompt) parts.push(divinePrompt);
        }

        if (this.systems.crime?.getCrimeForPrompt) {
            const crimePrompt = this.systems.crime.getCrimeForPrompt();
            if (crimePrompt) parts.push(crimePrompt);
        }

        if (this.systems.rumors?.getRumorsForPrompt) {
            const rumorPrompt = this.systems.rumors.getRumorsForPrompt();
            if (rumorPrompt) parts.push(rumorPrompt);
        }

        if (this.systems.dungeons?.getDungeonsForPrompt) {
            const dungeonPrompt = this.systems.dungeons.getDungeonsForPrompt();
            if (dungeonPrompt) parts.push(dungeonPrompt);
        }

        return parts.filter(p => p).join(' ');
    }

    getSystem(name) {
        return this.systems[name];
    }

    getAllSystems() {
        return this.systems;
    }
}

// Initialize and expose globally
const simulator = new ValdrisWorldSimulator();

// [VWS] Defensive shims for missing globals and error capture.
const vwsErrorBuffer = [];
const MAX_VWS_ERRORS = 10;
const recordVwsError = (error) => {
    const message = error?.message || error?.reason || error?.toString?.() || String(error);
    vwsErrorBuffer.push(message);
    if (vwsErrorBuffer.length > MAX_VWS_ERRORS) vwsErrorBuffer.shift();
};

try {
    window.addEventListener('error', (event) => recordVwsError(event));
    window.addEventListener('unhandledrejection', (event) => recordVwsError(event));
} catch (e) {
    console.warn('[VWS] Error capture setup failed', e);
}

function ensureVMasterTracker() {
    try {
        window.VMasterTracker = window.VMasterTracker || {};
        const tracker = window.VMasterTracker;

        if (!tracker.advance) {
            tracker.advance = (delta = {}) => {
                try {
                    if (simulator?.advanceTime) {
                        simulator.advanceTime(delta);
                        return true;
                    }
                    console.warn('[VWS] advance fallback: simulator missing');
                    return false;
                } catch (e) {
                    console.warn('[VWS] advance failed', e);
                    return false;
                }
            };
        }

        if (!tracker.advanceDay) {
            tracker.advanceDay = () => tracker.advance({ days: 1 });
        }

        if (!tracker.advanceWeek) {
            tracker.advanceWeek = () => tracker.advance({ days: 7 });
        }

        if (!tracker.setEnabled) {
            tracker.setEnabled = (enabled) => {
                try {
                    console.log('[VWS] setEnabled called', Boolean(enabled));
                    return true;
                } catch (e) {
                    console.warn('[VWS] setEnabled failed', e);
                    return false;
                }
            };
        }

        if (!tracker.smokeTest) {
            tracker.smokeTest = () => {
                try {
                    return {
                        panelExists: Boolean(document.getElementById('valdris-world-sim-panel')),
                        apiMethods: Object.keys(tracker).sort(),
                        lastConsoleErrors: [...vwsErrorBuffer]
                    };
                } catch (e) {
                    console.warn('[VWS] smokeTest failed', e);
                    return { panelExists: false, apiMethods: [], lastConsoleErrors: [...vwsErrorBuffer] };
                }
            };
        }
    } catch (e) {
        console.warn('[VWS] ensureVMasterTracker failed', e);
    }
}

function init() {
    simulator.initialize();

    // Expose globally for external access
    window.ValdrisWorldSimulator = simulator;
    window.getWorldContext = () => simulator.getWorldContext();
    ensureVMasterTracker();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { ValdrisWorldSimulator, simulator };
