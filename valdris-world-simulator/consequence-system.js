const CONSEQUENCE_TYPES = {
    kill_npc: {
        name: "Killed NPC", icon: "💀", category: "violence", severity: "major",
        immediateEffects: [
            { type: "npc_death", target: "victim" },
            { type: "reputation", faction: "victim_faction", change: -20 }
        ],
        ripples: [
            { delay: "1d", probability: 0.8, effect: "family_grief", description: "{{victim}}'s family learns of their death" },
            { delay: "3d", probability: 0.6, effect: "revenge_quest", description: "{{victim}}'s allies seek vengeance" },
            { delay: "7d", probability: 0.4, effect: "power_vacuum", description: "{{victim}}'s position creates opportunity" },
            { delay: "30d", probability: 0.3, effect: "legend_grows", description: "Tales of {{victim}}'s death spread" }
        ]
    },
    save_life: {
        name: "Saved a Life", icon: "💖", category: "heroism", severity: "moderate",
        immediateEffects: [
            { type: "reputation", faction: "saved_faction", change: 15 },
            { type: "npc_gratitude", target: "saved", level: "high" }
        ],
        ripples: [
            { delay: "1d", probability: 0.9, effect: "gratitude_reward", description: "{{saved}} expresses gratitude" },
            { delay: "7d", probability: 0.6, effect: "favor_owed", description: "{{saved}} offers a favor" },
            { delay: "30d", probability: 0.4, effect: "lifelong_ally", description: "{{saved}} becomes a loyal ally" }
        ]
    },
    betray_ally: {
        name: "Betrayed Ally", icon: "🗡️", category: "betrayal", severity: "major",
        immediateEffects: [
            { type: "relationship", target: "betrayed", change: -100 },
            { type: "reputation", faction: "betrayed_faction", change: -40 }
        ],
        ripples: [
            { delay: "1d", probability: 1.0, effect: "betrayed_reaction", description: "{{betrayed}} reacts to the betrayal" },
            { delay: "7d", probability: 0.8, effect: "word_spreads", description: "Others learn of player's treachery" },
            { delay: "30d", probability: 0.5, effect: "revenge_plot", description: "{{betrayed}} plots revenge" }
        ]
    },
    save_village: {
        name: "Saved Village", icon: "🏘️", category: "heroism", severity: "major",
        immediateEffects: [
            { type: "reputation", faction: "local", change: 40 },
            { type: "fame", change: 20 }
        ],
        ripples: [
            { delay: "1d", probability: 1.0, effect: "celebration", description: "{{village}} celebrates their savior" },
            { delay: "7d", probability: 0.8, effect: "monument", description: "{{village}} erects monument to player" },
            { delay: "30d", probability: 0.7, effect: "legend_status", description: "Player becomes legend in {{region}}" }
        ]
    },
    major_theft: {
        name: "Major Theft", icon: "💎", category: "crime", severity: "moderate",
        immediateEffects: [
            { type: "reputation", faction: "victim_faction", change: -25 },
            { type: "bounty", amount: "based_on_value" },
            { type: "infamy", change: 10 }
        ],
        ripples: [
            { delay: "1d", probability: 0.9, effect: "investigation", description: "{{faction}} investigates the theft" },
            { delay: "7d", probability: 0.6, effect: "security_increased", description: "Security tightened" }
        ]
    }
};

class ConsequenceSystem {
    constructor(stateManager, timeSystem, eventSystem, factionSystem, npcSystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.eventSystem = eventSystem;
        this.factionSystem = factionSystem;
        this.npcSystem = npcSystem;
        this.consequenceTypes = CONSEQUENCE_TYPES;

        this.timeSystem.onDayChanged(() => this.processScheduledRipples());
    }

    initialize() {
        const state = this.stateManager.getSection('consequences');
        if (!state.active) {
            state.active = [];
            state.pendingRipples = [];
            state.completedRipples = [];
            state.playerStats = { fame: 0, infamy: 0, killCount: 0, savesCount: 0, betrayalCount: 0 };
            state.bounties = [];
            this.stateManager.updateSection('consequences', state);
        }
    }

    registerConsequence(type, context) {
        const consequenceType = this.consequenceTypes[type];
        if (!consequenceType) return null;
        const consequence = {
            id: this.generateUUID(),
            type, category: consequenceType.category, severity: consequenceType.severity,
            context, createdAt: Date.now(), gameDate: this.timeSystem.getCurrentDateString()
        };
        const state = this.stateManager.getSection('consequences');
        state.active.push(consequence);
        this.stateManager.updateSection('consequences', state);
        this.applyImmediateEffects(consequence, consequenceType);
        this.scheduleRipples(consequence, consequenceType);
        return consequence;
    }

    applyImmediateEffects(consequence, consequenceType) {
        for (const effect of consequenceType.immediateEffects || []) {
            this.applyEffect(effect, consequence.context);
        }
    }

    applyEffect(effect, context) {
        switch (effect.type) {
            case 'npc_death':
                if (context.victim && this.npcSystem) this.npcSystem.handleNPCDeath({ id: context.victim }, 'player_action');
                break;
            case 'reputation':
                let factionId = effect.faction;
                if (factionId === 'victim_faction') factionId = context.victimFaction;
                if (factionId === 'saved_faction') factionId = context.savedFaction;
                if (factionId && this.factionSystem) this.factionSystem.modifyPlayerReputation(factionId, effect.change);
                break;
            case 'fame': this.modifyPlayerStat('fame', effect.change); break;
            case 'infamy': this.modifyPlayerStat('infamy', effect.change); break;
            case 'bounty': this.addBounty(context.victimFaction, context.value || 100, context.reason); break;
        }
    }

    modifyPlayerStat(stat, amount) {
        const state = this.stateManager.getSection('consequences');
        state.playerStats[stat] = Math.max(0, Math.min(100, (state.playerStats[stat] || 0) + amount));
        this.stateManager.updateSection('consequences', state);
    }

    addBounty(faction, amount, reason) {
        const state = this.stateManager.getSection('consequences');
        state.bounties.push({ id: this.generateUUID(), faction, amount, reason, active: true, createdAt: Date.now() });
        this.stateManager.updateSection('consequences', state);
    }

    scheduleRipples(consequence, consequenceType) {
        const state = this.stateManager.getSection('consequences');
        for (const ripple of consequenceType.ripples || []) {
            if (Math.random() > ripple.probability) continue;
            const delayMs = this.parseDelay(ripple.delay);
            state.pendingRipples.push({
                id: this.generateUUID(),
                consequenceId: consequence.id,
                ripple,
                triggersAt: Date.now() + delayMs,
                context: consequence.context,
                status: 'pending'
            });
        }
        this.stateManager.updateSection('consequences', state);
    }

    parseDelay(delayStr) {
        const match = delayStr.match(/(\d+)([dhm])/);
        if (!match) return 0;
        const amount = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 'd': return amount * 24 * 60 * 60 * 1000;
            case 'h': return amount * 60 * 60 * 1000;
            case 'm': return amount * 60 * 1000;
            default: return 0;
        }
    }

    processScheduledRipples() {
        const state = this.stateManager.getSection('consequences');
        const now = Date.now();
        const dueRipples = state.pendingRipples.filter(r => r.status === 'pending' && r.triggersAt <= now);
        for (const pending of dueRipples) {
            this.executeRipple(pending);
            pending.status = 'completed';
            state.completedRipples.push({ ...pending, completedAt: now });
        }
        state.pendingRipples = state.pendingRipples.filter(r => r.status === 'pending');
        this.stateManager.updateSection('consequences', state);
    }

    executeRipple(pending) {
        const description = this.fillTemplate(pending.ripple.description, pending.context);
        window.dispatchEvent(new CustomEvent('vws-consequence-ripple', { detail: { ripple: pending.ripple, description, context: pending.context } }));
    }

    fillTemplate(template, context) {
        let filled = template;
        for (const [key, value] of Object.entries(context)) {
            filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        return filled;
    }

    playerKilledNPC(victimId, victimName, victimFaction) {
        return this.registerConsequence('kill_npc', { victim: victimId, victimName, victimFaction });
    }

    playerSavedNPC(savedId, savedName, savedFaction) {
        return this.registerConsequence('save_life', { saved: savedId, savedName, savedFaction });
    }

    playerBetrayedNPC(betrayedId, betrayedName, betrayedFaction) {
        return this.registerConsequence('betray_ally', { betrayed: betrayedId, betrayedName, betrayedFaction });
    }

    getPlayerStats() { return this.stateManager.getSection('consequences').playerStats; }
    getActiveBounties() { return this.stateManager.getSection('consequences').bounties.filter(b => b.active); }

    getConsequencesForPrompt() {
        const settings = this.stateManager.getSection('consequences').settings || {};
        if (!settings.injectConsequencesIntoPrompt) return '';
        const stats = this.getPlayerStats();
        const parts = [];
        if (stats.fame > 30) parts.push(`Fame: ${stats.fame}`);
        if (stats.infamy > 30) parts.push(`Infamy: ${stats.infamy}`);
        const bounties = this.getActiveBounties();
        if (bounties.length > 0) {
            const total = bounties.reduce((sum, b) => sum + b.amount, 0);
            parts.push(`Bounty: ${total}g`);
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

export { ConsequenceSystem, CONSEQUENCE_TYPES };
