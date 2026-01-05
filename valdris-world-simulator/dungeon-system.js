const DUNGEON_TYPES = {
    cave: { name: "Cave System", icon: "🕳️", baseMonsters: ["goblins", "kobolds", "giant_spiders"], treasureMultiplier: 0.8 },
    ruins: { name: "Ancient Ruins", icon: "🏚️", baseMonsters: ["undead", "constructs", "cultists"], treasureMultiplier: 1.2 },
    lair: { name: "Monster Lair", icon: "🐉", baseMonsters: ["dragon", "hydra", "chimera"], treasureMultiplier: 1.5 },
    tomb: { name: "Haunted Tomb", icon: "⚰️", baseMonsters: ["undead", "wraiths", "mummies"], treasureMultiplier: 1.3 },
    fortress: { name: "Dark Fortress", icon: "🏰", baseMonsters: ["bandits", "dark_knights", "demons"], treasureMultiplier: 1.1 },
    magical: { name: "Magical Nexus", icon: "✨", baseMonsters: ["elementals", "arcane_constructs", "mages"], treasureMultiplier: 1.4 },
    depths: { name: "Abyssal Depths", icon: "🌊", baseMonsters: ["aberrations", "deep_ones", "kraken"], treasureMultiplier: 1.6 },
    volcanic: { name: "Volcanic Cavern", icon: "🌋", baseMonsters: ["fire_elementals", "salamanders", "dragons"], treasureMultiplier: 1.3 }
};

const THREAT_LEVELS = {
    1: { name: "Trivial", minLevel: 1, maxLevel: 3, goldRange: [50, 200], bossChance: 0.1 },
    2: { name: "Easy", minLevel: 3, maxLevel: 5, goldRange: [200, 500], bossChance: 0.15 },
    3: { name: "Moderate", minLevel: 5, maxLevel: 8, goldRange: [500, 1000], bossChance: 0.2 },
    4: { name: "Challenging", minLevel: 8, maxLevel: 12, goldRange: [1000, 2500], bossChance: 0.25 },
    5: { name: "Hard", minLevel: 12, maxLevel: 15, goldRange: [2500, 5000], bossChance: 0.3 },
    6: { name: "Deadly", minLevel: 15, maxLevel: 18, goldRange: [5000, 10000], bossChance: 0.4 },
    7: { name: "Legendary", minLevel: 18, maxLevel: 20, goldRange: [10000, 25000], bossChance: 0.5 },
    8: { name: "Mythic", minLevel: 20, maxLevel: 25, goldRange: [25000, 50000], bossChance: 0.6 },
    9: { name: "World Threat", minLevel: 25, maxLevel: 30, goldRange: [50000, 100000], bossChance: 0.8 },
    10: { name: "Apocalyptic", minLevel: 30, maxLevel: 40, goldRange: [100000, 500000], bossChance: 1.0 }
};

const MONSTER_TYPES = {
    goblins: { name: "Goblins", baseStrength: 10, traits: ["numerous", "cowardly"] },
    kobolds: { name: "Kobolds", baseStrength: 8, traits: ["trap_makers", "numerous"] },
    undead: { name: "Undead", baseStrength: 15, traits: ["fearless", "tireless"] },
    bandits: { name: "Bandits", baseStrength: 12, traits: ["organized", "ransom"] },
    demons: { name: "Demons", baseStrength: 50, traits: ["magical", "corrupting"] },
    dragon: { name: "Dragon", baseStrength: 100, traits: ["flying", "breath_weapon", "intelligent"] },
    elementals: { name: "Elementals", baseStrength: 30, traits: ["magical", "elemental_immunity"] },
    aberrations: { name: "Aberrations", baseStrength: 40, traits: ["alien", "madness"] }
};

const LOOT_TABLES = {
    common: ["gold_coins", "silver_coins", "copper_coins", "mundane_weapons", "mundane_armor"],
    uncommon: ["gems", "jewelry", "enchanted_weapons", "potions", "scrolls"],
    rare: ["magical_artifacts", "rare_materials", "spellbooks", "legendary_weapons"],
    legendary: ["artifacts_of_power", "divine_relics", "dragon_hoards", "planar_keys"]
};

const DEFAULT_DUNGEONS = {
    shadow_caverns: {
        id: "shadow_caverns", name: "The Shadow Caverns", type: "cave", region: "valdric_heartland",
        threatLevel: 3, status: "active", discoveredAt: null,
        monsters: { primary: "goblins", secondary: "kobolds", boss: null },
        floors: 5, exploredFloors: 0, totalRooms: 25, clearedRooms: 0,
        treasure: { estimated: 2000, looted: 0 }, respawnRate: 7, lastCleared: null
    },
    tomb_of_aelric: {
        id: "tomb_of_aelric", name: "Tomb of King Aelric", type: "tomb", region: "valdric_heartland",
        threatLevel: 5, status: "dormant", discoveredAt: null,
        monsters: { primary: "undead", secondary: "wraiths", boss: "lich_king" },
        floors: 8, exploredFloors: 0, totalRooms: 40, clearedRooms: 0,
        treasure: { estimated: 10000, looted: 0 }, respawnRate: 14, lastCleared: null
    }
};

class DungeonSystem {
    constructor(stateManager, timeSystem, eventSystem, economySystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.eventSystem = eventSystem;
        this.economySystem = economySystem;
        this.dungeonTypes = DUNGEON_TYPES;
        this.threatLevels = THREAT_LEVELS;
        this.monsterTypes = MONSTER_TYPES;
        this.lootTables = LOOT_TABLES;
        this.defaultDungeons = DEFAULT_DUNGEONS;

        this.timeSystem.onWeekChanged(() => this.weeklyUpdate());
        this.timeSystem.onMonthChanged(() => this.monthlyUpdate());
    }

    initialize() {
        const state = this.stateManager.getSection('dungeons');
        if (!state.active || Object.keys(state.active).length === 0) {
            state.active = JSON.parse(JSON.stringify(this.defaultDungeons));
            state.cleared = [];
            state.discovered = [];
            state.expeditions = [];
            state.totalDungeonsCleared = 0;
            state.totalTreasureLooted = 0;
            this.stateManager.updateSection('dungeons', state);
        }
    }

    getDungeon(dungeonId) {
        return this.stateManager.getSection('dungeons').active[dungeonId];
    }

    getAllDungeons() {
        return Object.values(this.stateManager.getSection('dungeons').active);
    }

    getActiveDungeons() {
        return this.getAllDungeons().filter(d => d.status === 'active');
    }

    getDungeonsByRegion(regionId) {
        return this.getAllDungeons().filter(d => d.region === regionId);
    }

    weeklyUpdate() {
        for (const dungeon of this.getAllDungeons()) {
            this.respawnMonsters(dungeon);
            this.updateDungeonThreat(dungeon);
        }
        this.checkForNewDungeons();
    }

    monthlyUpdate() {
        for (const dungeon of this.getAllDungeons()) {
            this.evolveDungeon(dungeon);
        }
        if (Math.random() < 0.15) {
            this.emergeDungeon();
        }
    }

    respawnMonsters(dungeon) {
        if (!dungeon.lastCleared) return;
        const daysSinceCleared = (Date.now() - dungeon.lastCleared) / (24 * 60 * 60 * 1000);
        if (daysSinceCleared >= dungeon.respawnRate) {
            const respawnRate = Math.min(1, daysSinceCleared / (dungeon.respawnRate * 3));
            dungeon.clearedRooms = Math.floor(dungeon.clearedRooms * (1 - respawnRate));
            if (dungeon.clearedRooms < dungeon.totalRooms * 0.5) {
                dungeon.status = 'active';
            }
            this.updateDungeon(dungeon.id, dungeon);
        }
    }

    updateDungeonThreat(dungeon) {
        if (dungeon.status === 'active' && Math.random() < 0.05) {
            const threatChange = Math.random() < 0.3 ? 1 : 0;
            dungeon.threatLevel = Math.max(1, Math.min(10, dungeon.threatLevel + threatChange));
            if (threatChange > 0) {
                dungeon.treasure.estimated = Math.floor(dungeon.treasure.estimated * 1.2);
            }
            this.updateDungeon(dungeon.id, dungeon);
        }
    }

    checkForNewDungeons() {
        const regions = ['valdric_heartland', 'dwarven_mountains', 'sylvan_forests', 'orcish_wastes', 'merchant_coast'];
        for (const region of regions) {
            const regionDungeons = this.getDungeonsByRegion(region);
            if (regionDungeons.length < 2 && Math.random() < 0.1) {
                this.emergeDungeon(region);
            }
        }
    }

    emergeDungeon(region = null) {
        const regions = ['valdric_heartland', 'dwarven_mountains', 'sylvan_forests', 'orcish_wastes', 'merchant_coast'];
        const targetRegion = region || regions[Math.floor(Math.random() * regions.length)];
        const typeKeys = Object.keys(this.dungeonTypes);
        const type = typeKeys[Math.floor(Math.random() * typeKeys.length)];
        const typeData = this.dungeonTypes[type];
        const threatLevel = Math.floor(Math.random() * 5) + 1;
        const threatData = this.threatLevels[threatLevel];
        const dungeon = {
            id: this.generateUUID(),
            name: this.generateDungeonName(type),
            type,
            region: targetRegion,
            threatLevel,
            status: 'active',
            discoveredAt: null,
            monsters: {
                primary: typeData.baseMonsters[0],
                secondary: typeData.baseMonsters[1] || typeData.baseMonsters[0],
                boss: Math.random() < threatData.bossChance ? this.generateBoss(type, threatLevel) : null
            },
            floors: Math.floor(threatLevel * 1.5) + 2,
            exploredFloors: 0,
            totalRooms: (Math.floor(threatLevel * 1.5) + 2) * 5,
            clearedRooms: 0,
            treasure: {
                estimated: Math.floor((threatData.goldRange[0] + threatData.goldRange[1]) / 2 * typeData.treasureMultiplier),
                looted: 0
            },
            respawnRate: 7 + threatLevel,
            lastCleared: null,
            createdAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString()
        };
        const state = this.stateManager.getSection('dungeons');
        state.active[dungeon.id] = dungeon;
        this.stateManager.updateSection('dungeons', state);
        window.dispatchEvent(new CustomEvent('vws-dungeon-emerged', { detail: dungeon }));
        return dungeon;
    }

    generateDungeonName(type) {
        const prefixes = ['Shadow', 'Dark', 'Lost', 'Forgotten', 'Cursed', 'Ancient', 'Haunted', 'Dread'];
        const suffixes = {
            cave: ['Caverns', 'Depths', 'Hollow', 'Tunnels'],
            ruins: ['Ruins', 'Remnants', 'Citadel', 'Temple'],
            lair: ['Lair', 'Den', 'Nest', 'Domain'],
            tomb: ['Tomb', 'Crypt', 'Mausoleum', 'Sepulcher'],
            fortress: ['Fortress', 'Stronghold', 'Bastion', 'Keep'],
            magical: ['Sanctum', 'Nexus', 'Spire', 'Convergence'],
            depths: ['Depths', 'Abyss', 'Chasm', 'Trench'],
            volcanic: ['Caldera', 'Forge', 'Crucible', 'Inferno']
        };
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffixList = suffixes[type] || ['Place'];
        const suffix = suffixList[Math.floor(Math.random() * suffixList.length)];
        return `The ${prefix} ${suffix}`;
    }

    generateBoss(type, threatLevel) {
        const bossNames = ['Dread Lord', 'Ancient One', 'Dark Master', 'Shadow King', 'Cursed Guardian'];
        return {
            name: `${bossNames[Math.floor(Math.random() * bossNames.length)]} of the ${this.dungeonTypes[type].name}`,
            threatLevel: threatLevel + 2,
            defeated: false,
            loot: this.generateBossLoot(threatLevel)
        };
    }

    generateBossLoot(threatLevel) {
        const lootTier = threatLevel >= 7 ? 'legendary' : threatLevel >= 4 ? 'rare' : 'uncommon';
        const lootTable = this.lootTables[lootTier];
        return {
            items: lootTable.slice(0, Math.floor(Math.random() * 3) + 1),
            gold: this.threatLevels[threatLevel].goldRange[1] * 2
        };
    }

    evolveDungeon(dungeon) {
        if (dungeon.status === 'active' && dungeon.clearedRooms === 0) {
            if (Math.random() < 0.1) {
                dungeon.threatLevel = Math.min(10, dungeon.threatLevel + 1);
                dungeon.totalRooms += 5;
                dungeon.floors += 1;
                dungeon.treasure.estimated = Math.floor(dungeon.treasure.estimated * 1.3);
                this.updateDungeon(dungeon.id, dungeon);
                window.dispatchEvent(new CustomEvent('vws-dungeon-evolved', { detail: dungeon }));
            }
        }
    }

    discoverDungeon(dungeonId) {
        const dungeon = this.getDungeon(dungeonId);
        if (dungeon && !dungeon.discoveredAt) {
            dungeon.discoveredAt = Date.now();
            const state = this.stateManager.getSection('dungeons');
            state.discovered.push(dungeonId);
            this.updateDungeon(dungeonId, dungeon);
            this.stateManager.updateSection('dungeons', state);
            window.dispatchEvent(new CustomEvent('vws-dungeon-discovered', { detail: dungeon }));
        }
    }

    startExpedition(dungeonId, party) {
        const dungeon = this.getDungeon(dungeonId);
        if (!dungeon) return null;
        const expedition = {
            id: this.generateUUID(),
            dungeonId,
            party,
            status: 'in_progress',
            startedAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString(),
            floorsExplored: 0,
            roomsCleared: 0,
            lootGained: 0,
            casualties: []
        };
        const state = this.stateManager.getSection('dungeons');
        state.expeditions.push(expedition);
        this.stateManager.updateSection('dungeons', state);
        window.dispatchEvent(new CustomEvent('vws-expedition-started', { detail: expedition }));
        return expedition;
    }

    resolveExpedition(expeditionId) {
        const state = this.stateManager.getSection('dungeons');
        const expedition = state.expeditions.find(e => e.id === expeditionId);
        if (!expedition) return null;
        const dungeon = this.getDungeon(expedition.dungeonId);
        if (!dungeon) return null;
        const threatData = this.threatLevels[dungeon.threatLevel];
        const partyStrength = expedition.party.length * 20;
        const dungeonStrength = dungeon.threatLevel * 15;
        const successChance = partyStrength / (partyStrength + dungeonStrength);
        const success = Math.random() < successChance;
        if (success) {
            const roomsCleared = Math.floor(Math.random() * 10) + 5;
            const lootGained = Math.floor((threatData.goldRange[0] + Math.random() * (threatData.goldRange[1] - threatData.goldRange[0])) * (roomsCleared / dungeon.totalRooms));
            expedition.roomsCleared = roomsCleared;
            expedition.lootGained = lootGained;
            expedition.floorsExplored = Math.ceil(roomsCleared / 5);
            expedition.status = 'success';
            dungeon.clearedRooms += roomsCleared;
            dungeon.exploredFloors = Math.max(dungeon.exploredFloors, expedition.floorsExplored);
            dungeon.treasure.looted += lootGained;
            if (dungeon.clearedRooms >= dungeon.totalRooms) {
                dungeon.status = 'cleared';
                dungeon.lastCleared = Date.now();
                state.totalDungeonsCleared++;
            }
            state.totalTreasureLooted += lootGained;
        } else {
            expedition.status = 'failed';
            expedition.casualties = expedition.party.slice(0, Math.floor(Math.random() * expedition.party.length));
        }
        expedition.completedAt = Date.now();
        this.updateDungeon(dungeon.id, dungeon);
        this.stateManager.updateSection('dungeons', state);
        window.dispatchEvent(new CustomEvent('vws-expedition-completed', { detail: expedition }));
        return expedition;
    }

    updateDungeon(dungeonId, data) {
        const state = this.stateManager.getSection('dungeons');
        state.active[dungeonId] = { ...state.active[dungeonId], ...data };
        this.stateManager.updateSection('dungeons', state);
    }

    getDungeonsForPrompt() {
        const settings = this.stateManager.getSection('dungeons').settings || {};
        if (!settings.injectDungeonsIntoPrompt) return '';
        const activeDungeons = this.getActiveDungeons().filter(d => d.threatLevel >= 5).slice(0, 3);
        if (activeDungeons.length === 0) return '';
        return `[Dungeons: ${activeDungeons.map(d => `${d.name} (Threat ${d.threatLevel})`).join(', ')}]`;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}

export { DungeonSystem, DUNGEON_TYPES, THREAT_LEVELS, MONSTER_TYPES, LOOT_TABLES, DEFAULT_DUNGEONS };
