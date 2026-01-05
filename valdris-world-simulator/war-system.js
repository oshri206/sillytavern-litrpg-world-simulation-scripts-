const ARMY_TEMPLATE = {
    id: "", name: "", faction: "", warId: null, commander: null, commanderSkill: 50,
    troops: { infantry: 0, cavalry: 0, archers: 0, siege: 0, mages: 0 },
    totalStrength: 0, morale: 75, supplies: 100, experience: 50,
    status: "idle", condition: "fresh",
    currentLocation: null, targetLocation: null, movementProgress: 0,
    battlesWon: 0, battlesLost: 0, casualties: 0
};

const DEFAULT_ARMIES = {
    imperial_first: { id: "imperial_first", name: "1st Imperial Legion", faction: "valdric_empire", troops: { infantry: 8000, cavalry: 2000, archers: 3000, siege: 300, mages: 100 }, experience: 70, currentLocation: "valdris_prime" },
    imperial_second: { id: "imperial_second", name: "2nd Imperial Legion", faction: "valdric_empire", troops: { infantry: 6000, cavalry: 1500, archers: 2500, siege: 200, mages: 50 }, experience: 55, currentLocation: "valdris_prime" },
    dwarven_ironguard: { id: "dwarven_ironguard", name: "Ironguard Host", faction: "dwarven_holds", troops: { infantry: 5000, cavalry: 0, archers: 1000, siege: 500, mages: 20 }, experience: 85, currentLocation: "khaz_morath" },
    sylvan_wardens: { id: "sylvan_wardens", name: "Sylvan Wardens", faction: "sylvan_dominion", troops: { infantry: 2000, cavalry: 500, archers: 4000, siege: 0, mages: 200 }, experience: 60, currentLocation: "aelindra" },
    orcish_horde: { id: "orcish_horde", name: "Bloodfist Horde", faction: "orcish_dominion", troops: { infantry: 10000, cavalry: 3000, archers: 1000, siege: 100, mages: 10 }, experience: 50, currentLocation: "grakhan" },
    merchant_guard: { id: "merchant_guard", name: "Golden Company", faction: "merchant_league", troops: { infantry: 3000, cavalry: 1000, archers: 1500, siege: 100, mages: 30 }, experience: 65, currentLocation: "freeport" }
};

const WAR_GOALS = {
    conquest: { name: "Conquest", warScoreToWin: 100, peaceDemands: ["cede_territory"] },
    subjugation: { name: "Subjugation", warScoreToWin: 100, peaceDemands: ["become_vassal"] },
    humiliation: { name: "Humiliation", warScoreToWin: 75, peaceDemands: ["gold", "prestige_loss"] },
    defense: { name: "Defense", warScoreToWin: 50, peaceDemands: ["status_quo"] },
    revenge: { name: "Revenge", warScoreToWin: 60, peaceDemands: ["gold", "territory"] }
};

class WarSystem {
    constructor(stateManager, timeSystem, factionSystem, settlementSystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.factionSystem = factionSystem;
        this.settlementSystem = settlementSystem;
        this.defaultArmies = DEFAULT_ARMIES;
        this.warGoals = WAR_GOALS;

        this.timeSystem.onDayChanged(() => this.dailyUpdate());
        this.timeSystem.onWeekChanged(() => this.weeklyUpdate());
    }

    initialize() {
        const state = this.stateManager.getSection('warfare');
        if (!state.armies || Object.keys(state.armies).length === 0) {
            state.wars = {};
            state.armies = JSON.parse(JSON.stringify(this.defaultArmies));
            state.battles = [];
            state.sieges = {};
            this.stateManager.updateSection('warfare', state);
        }
    }

    declareWar(attackerFaction, defenderFaction, warGoal, options = {}) {
        const war = {
            id: this.generateUUID(),
            name: options.name || `${attackerFaction} - ${defenderFaction} War`,
            sides: {
                attacker: { faction: attackerFaction, allies: options.attackerAllies || [], warGoal, warScore: 0 },
                defender: { faction: defenderFaction, allies: options.defenderAllies || [], warGoal: 'defense', warScore: 0 }
            },
            status: 'active', phase: 'early',
            startDate: Date.now(), gameDate: this.timeSystem.getCurrentDateString(),
            armies: [], battles: [], sieges: [],
            morale: { attacker: 70, defender: 80 },
            exhaustion: { attacker: 0, defender: 0 }
        };
        const state = this.stateManager.getSection('warfare');
        state.wars[war.id] = war;
        this.stateManager.updateSection('warfare', state);
        this.factionSystem.setRelation(attackerFaction, defenderFaction, -100);
        this.mobilizeArmies(war);
        window.dispatchEvent(new CustomEvent('vws-war-declared', { detail: war }));
        return war;
    }

    mobilizeArmies(war) {
        const state = this.stateManager.getSection('warfare');
        const attackerArmies = Object.values(state.armies).filter(a => a.faction === war.sides.attacker.faction);
        const defenderArmies = Object.values(state.armies).filter(a => a.faction === war.sides.defender.faction);
        for (const army of [...attackerArmies, ...defenderArmies]) {
            army.warId = war.id;
            army.status = 'mobilized';
        }
        war.armies = [...attackerArmies.map(a => a.id), ...defenderArmies.map(a => a.id)];
        this.stateManager.updateSection('warfare', state);
    }

    dailyUpdate() {
        const state = this.stateManager.getSection('warfare');
        for (const war of Object.values(state.wars)) {
            if (war.status !== 'active') continue;
            this.updateArmyMovement(war);
            this.checkForBattles(war);
            this.updateSieges(war);
            this.updateWarExhaustion(war);
        }
        this.stateManager.updateSection('warfare', state);
    }

    weeklyUpdate() {
        const state = this.stateManager.getSection('warfare');
        for (const war of Object.values(state.wars)) {
            if (war.status !== 'active') continue;
            this.checkWarEnding(war);
            this.simulateArmyActions(war);
        }
        this.stateManager.updateSection('warfare', state);
    }

    updateArmyMovement(war) {
        const state = this.stateManager.getSection('warfare');
        for (const armyId of war.armies) {
            const army = state.armies[armyId];
            if (!army || army.status !== 'marching') continue;
            army.movementProgress = (army.movementProgress || 0) + 10;
            if (army.movementProgress >= 100) {
                army.currentLocation = army.targetLocation;
                army.targetLocation = null;
                army.movementProgress = 0;
                army.status = 'idle';
            }
        }
    }

    checkForBattles(war) {
        const state = this.stateManager.getSection('warfare');
        const locations = {};
        for (const armyId of war.armies) {
            const army = state.armies[armyId];
            if (!army || army.status === 'defeated') continue;
            const loc = army.currentLocation;
            if (!locations[loc]) locations[loc] = { attacker: [], defender: [] };
            const side = army.faction === war.sides.attacker.faction ? 'attacker' : 'defender';
            locations[loc][side].push(army);
        }
        for (const [location, forces] of Object.entries(locations)) {
            if (forces.attacker.length > 0 && forces.defender.length > 0) {
                this.initiateBattle(war, forces.attacker, forces.defender, location);
            }
        }
    }

    initiateBattle(war, attackerArmies, defenderArmies, location) {
        const battle = {
            id: this.generateUUID(), warId: war.id, name: `Battle of ${location}`, location,
            attacker: { armies: attackerArmies.map(a => a.id), totalStrength: attackerArmies.reduce((sum, a) => sum + this.calculateArmyStrength(a), 0) },
            defender: { armies: defenderArmies.map(a => a.id), totalStrength: defenderArmies.reduce((sum, a) => sum + this.calculateArmyStrength(a), 0) },
            status: 'ongoing', startDate: Date.now(), gameDate: this.timeSystem.getCurrentDateString()
        };
        this.simulateBattle(battle, attackerArmies, defenderArmies);
        const state = this.stateManager.getSection('warfare');
        state.battles.push(battle);
        war.battles.push(battle.id);
        this.stateManager.updateSection('warfare', state);
        window.dispatchEvent(new CustomEvent('vws-battle-fought', { detail: battle }));
    }

    calculateArmyStrength(army) {
        const troops = army.troops || {};
        let strength = (troops.infantry || 0) * 1.0 + (troops.cavalry || 0) * 2.0 + (troops.archers || 0) * 1.2 + (troops.siege || 0) * 0.5 + (troops.mages || 0) * 5.0;
        strength *= (army.morale || 75) / 100;
        strength *= 0.5 + ((army.experience || 50) / 100) * 0.5;
        return Math.floor(strength);
    }

    simulateBattle(battle, attackerArmies, defenderArmies) {
        const attackerStrength = battle.attacker.totalStrength;
        const defenderStrength = battle.defender.totalStrength;
        const ratio = attackerStrength / (attackerStrength + defenderStrength);
        const roll = Math.random();
        const attackerWins = roll < ratio + 0.1;
        battle.victor = attackerWins ? 'attacker' : 'defender';
        battle.status = 'concluded';
        battle.endDate = Date.now();
        const loserCasualtyRate = 0.3;
        const winnerCasualtyRate = 0.1;
        for (const army of attackerArmies) {
            const rate = attackerWins ? winnerCasualtyRate : loserCasualtyRate;
            this.applyCasualties(army, rate);
            if (!attackerWins) army.status = 'retreating';
            else army.battlesWon++;
        }
        for (const army of defenderArmies) {
            const rate = attackerWins ? loserCasualtyRate : winnerCasualtyRate;
            this.applyCasualties(army, rate);
            if (attackerWins) army.status = 'retreating';
            else army.battlesWon++;
        }
        battle.casualties = {
            attacker: Math.floor(attackerStrength * (attackerWins ? winnerCasualtyRate : loserCasualtyRate)),
            defender: Math.floor(defenderStrength * (attackerWins ? loserCasualtyRate : winnerCasualtyRate))
        };
    }

    applyCasualties(army, rate) {
        for (const troopType of Object.keys(army.troops)) {
            army.troops[troopType] = Math.floor(army.troops[troopType] * (1 - rate));
        }
        army.morale = Math.max(10, army.morale - 15);
        army.casualties = (army.casualties || 0) + Math.floor(this.calculateArmyStrength(army) * rate);
        const totalTroops = Object.values(army.troops).reduce((a, b) => a + b, 0);
        if (totalTroops < 100) army.status = 'defeated';
    }

    updateSieges(war) {
        const state = this.stateManager.getSection('warfare');
        for (const siegeId of war.sieges) {
            const siege = state.sieges[siegeId];
            if (!siege || siege.status !== 'ongoing') continue;
            siege.progress = (siege.progress || 0) + 1;
            siege.defenderSupplies = Math.max(0, (siege.defenderSupplies || 100) - 2);
            if (siege.defenderSupplies <= 0 || siege.progress >= 100) {
                siege.status = 'fallen';
                window.dispatchEvent(new CustomEvent('vws-siege-ended', { detail: siege }));
            }
        }
    }

    updateWarExhaustion(war) {
        const daysSinceStart = (Date.now() - war.startDate) / (24 * 60 * 60 * 1000);
        war.exhaustion.attacker = Math.min(100, daysSinceStart * 0.5);
        war.exhaustion.defender = Math.min(100, daysSinceStart * 0.4);
    }

    simulateArmyActions(war) {
        const state = this.stateManager.getSection('warfare');
        for (const armyId of war.armies) {
            const army = state.armies[armyId];
            if (!army || army.status !== 'idle') continue;
            if (Math.random() < 0.3) {
                const enemyLocations = this.getEnemyLocations(war, army.faction);
                if (enemyLocations.length > 0) {
                    army.targetLocation = enemyLocations[Math.floor(Math.random() * enemyLocations.length)];
                    army.status = 'marching';
                }
            }
        }
        this.stateManager.updateSection('warfare', state);
    }

    getEnemyLocations(war, factionId) {
        const isAttacker = factionId === war.sides.attacker.faction;
        const enemyFaction = isAttacker ? war.sides.defender.faction : war.sides.attacker.faction;
        return this.settlementSystem.getSettlementsByFaction(enemyFaction).map(s => s.id);
    }

    checkWarEnding(war) {
        if (war.exhaustion.attacker >= 100 || war.exhaustion.defender >= 100) {
            this.endWar(war.id, 'white_peace');
        }
    }

    endWar(warId, resolution) {
        const state = this.stateManager.getSection('warfare');
        const war = state.wars[warId];
        if (!war) return;
        war.status = 'ended';
        war.endDate = Date.now();
        war.resolution = resolution;
        for (const armyId of war.armies) {
            const army = state.armies[armyId];
            if (army) {
                army.warId = null;
                army.status = 'idle';
            }
        }
        if (resolution === 'white_peace') {
            this.factionSystem.modifyRelation(war.sides.attacker.faction, war.sides.defender.faction, 50);
        }
        this.stateManager.updateSection('warfare', state);
        window.dispatchEvent(new CustomEvent('vws-war-ended', { detail: war }));
    }

    getActiveWars() {
        return Object.values(this.stateManager.getSection('warfare').wars).filter(w => w.status === 'active');
    }

    getWarfareForPrompt() {
        const settings = this.stateManager.getSection('warfare').settings || {};
        if (!settings.injectWarIntoPrompt) return '';
        const activeWars = this.getActiveWars();
        if (activeWars.length === 0) return '';
        return `[Wars: ${activeWars.map(w => w.name).join(', ')}]`;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}

export { WarSystem, ARMY_TEMPLATE, DEFAULT_ARMIES, WAR_GOALS };
