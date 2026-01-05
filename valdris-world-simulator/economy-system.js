const TRADE_GOODS = {
    grain: { basePrice: 5, unit: "bushel", seasonal: true, demandLevel: "high" },
    meat: { basePrice: 15, unit: "lb", perishable: true, demandLevel: "high" },
    fish: { basePrice: 8, unit: "lb", seasonal: true, perishable: true },
    ale: { basePrice: 3, unit: "pint", demandLevel: "high" },
    wine: { basePrice: 25, unit: "bottle", seasonal: true },
    iron_ore: { basePrice: 20, unit: "lb", producedIn: ["dwarven_mountains"] },
    copper_ore: { basePrice: 15, unit: "lb" },
    gold_ore: { basePrice: 500, unit: "lb", rare: true },
    timber: { basePrice: 10, unit: "log", producedIn: ["sylvan_forests"] },
    leather: { basePrice: 30, unit: "hide" },
    cloth: { basePrice: 20, unit: "bolt" },
    iron_ingot: { basePrice: 50, unit: "ingot" },
    steel_ingot: { basePrice: 100, unit: "ingot" },
    weapons: { basePrice: 150, unit: "piece" },
    armor: { basePrice: 300, unit: "set" },
    silk: { basePrice: 200, unit: "bolt", producedIn: ["sylvan_forests"] },
    spices: { basePrice: 100, unit: "lb", imported: true },
    gems: { basePrice: 500, unit: "piece", producedIn: ["dwarven_mountains"] },
    jewelry: { basePrice: 1000, unit: "piece" },
    herbs: { basePrice: 10, unit: "bundle", seasonal: true },
    potions: { basePrice: 50, unit: "vial" },
    spell_components: { basePrice: 75, unit: "set" },
    enchanted_items: { basePrice: 500, unit: "piece" }
};

const ECONOMIC_REGIONS = {
    valdric_heartland: { wealth: 80, stability: 85, specialization: ["grain", "cloth", "weapons"], imports: ["ore", "luxury", "spices"], taxRate: 0.10 },
    dwarven_mountains: { wealth: 90, stability: 95, specialization: ["ore", "metal", "gems", "weapons", "armor"], imports: ["food", "timber", "cloth"], taxRate: 0.05 },
    sylvan_forests: { wealth: 70, stability: 90, specialization: ["herbs", "timber", "enchanted_items"], imports: ["metal", "cloth"], taxRate: 0.02 },
    merchant_coast: { wealth: 95, stability: 70, specialization: ["trade"], imports: ["everything"], exports: ["everything"], taxRate: 0.15 },
    orcish_wastes: { wealth: 30, stability: 40, specialization: ["weapons", "meat"], imports: ["grain", "ale", "metal"], taxRate: 0.30 }
};

const PRICE_MODIFIERS = {
    war: { weapons: 1.5, armor: 1.5, potions: 1.3, grain: 1.2 },
    plague: { potions: 3.0, herbs: 2.5, food: 0.7 },
    famine: { grain: 3.0, meat: 2.5, fish: 2.0 },
    festival: { ale: 1.3, wine: 1.4, meat: 1.2 },
    trade_disruption: { imports: 1.5 },
    spring: { herbs: 0.8, grain: 1.2 },
    summer: { fish: 0.9, herbs: 0.7 },
    autumn: { grain: 0.7, wine: 0.8, meat: 0.9 },
    winter: { grain: 1.3, meat: 1.2, herbs: 1.5, timber: 1.2 }
};

class EconomySystem {
    constructor(stateManager, timeSystem, eventSystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.eventSystem = eventSystem;
        this.tradeGoods = TRADE_GOODS;
        this.regions = ECONOMIC_REGIONS;
        this.modifiers = PRICE_MODIFIERS;

        this.timeSystem.onDayChanged(() => this.dailyUpdate());
        this.timeSystem.onMonthChanged(() => this.monthlyUpdate());
        this.eventSystem.onEventStarted((event) => this.handleEvent(event));
    }

    initialize() {
        const state = this.stateManager.getSection('economy');
        if (!state.prices) {
            state.prices = {};
            state.priceHistory = {};
            state.activeModifiers = [];
            state.regions = JSON.parse(JSON.stringify(this.regions));
            for (const regionId of Object.keys(this.regions)) {
                state.prices[regionId] = {};
                for (const [goodId, good] of Object.entries(this.tradeGoods)) {
                    state.prices[regionId][goodId] = this.calculateBasePrice(regionId, goodId, good);
                }
            }
            this.stateManager.updateSection('economy', state);
        }
    }

    calculateBasePrice(regionId, goodId, good) {
        let price = good.basePrice;
        const region = this.regions[regionId];
        if (good.producedIn?.includes(regionId) || region.specialization?.includes(goodId)) price *= 0.7;
        if (region.imports?.includes(goodId) || (good.imported && !region.specialization?.includes('trade'))) price *= 1.3;
        return Math.round(price);
    }

    getPrice(regionId, goodId) {
        return this.stateManager.getSection('economy').prices[regionId]?.[goodId] || this.tradeGoods[goodId]?.basePrice || 0;
    }

    getPricesInRegion(regionId) {
        return this.stateManager.getSection('economy').prices[regionId] || {};
    }

    dailyUpdate() {
        this.applyDailyFluctuation();
        this.expireModifiers();
    }

    monthlyUpdate() {
        this.applySeasonalChanges();
        this.recordPriceHistory();
    }

    applyDailyFluctuation() {
        const state = this.stateManager.getSection('economy');
        const settings = state.settings || {};
        if (!settings.priceFluctuation) return;
        const fluctuationRange = settings.fluctuationRange || 0.05;
        for (const regionId of Object.keys(state.prices)) {
            for (const goodId of Object.keys(state.prices[regionId])) {
                const currentPrice = state.prices[regionId][goodId];
                const good = this.tradeGoods[goodId];
                const basePrice = this.calculateBasePrice(regionId, goodId, good);
                const fluctuation = 1 + (Math.random() * fluctuationRange * 2 - fluctuationRange);
                let newPrice = currentPrice * fluctuation;
                newPrice = newPrice * 0.95 + basePrice * 0.05;
                for (const mod of state.activeModifiers) {
                    if (mod.goods?.[goodId]) newPrice *= mod.goods[goodId];
                }
                newPrice = Math.max(basePrice * 0.5, Math.min(basePrice * 3, newPrice));
                state.prices[regionId][goodId] = Math.round(newPrice);
            }
        }
        this.stateManager.updateSection('economy', state);
    }

    applySeasonalChanges() {
        const season = this.timeSystem.getSeason();
        const seasonMods = this.modifiers[season];
        if (!seasonMods) return;
        const state = this.stateManager.getSection('economy');
        state.activeModifiers = state.activeModifiers.filter(m => m.type !== 'seasonal');
        state.activeModifiers.push({ type: 'seasonal', season, goods: seasonMods, expires: null });
        this.stateManager.updateSection('economy', state);
    }

    handleEvent(event) {
        const eventMods = this.modifiers[event.templateId];
        if (!eventMods) return;
        const state = this.stateManager.getSection('economy');
        state.activeModifiers.push({
            type: 'event',
            eventId: event.id,
            goods: eventMods,
            expires: event.duration ? Date.now() + event.duration * 24 * 60 * 60 * 1000 : null
        });
        this.stateManager.updateSection('economy', state);
    }

    expireModifiers() {
        const state = this.stateManager.getSection('economy');
        const now = Date.now();
        state.activeModifiers = state.activeModifiers.filter(m => !m.expires || m.expires > now);
        this.stateManager.updateSection('economy', state);
    }

    recordPriceHistory() {
        const state = this.stateManager.getSection('economy');
        const date = this.timeSystem.getCurrentDateString();
        for (const regionId of Object.keys(state.prices)) {
            for (const [goodId, price] of Object.entries(state.prices[regionId])) {
                const key = `${goodId}_${regionId}`;
                if (!state.priceHistory[key]) state.priceHistory[key] = [];
                state.priceHistory[key].push({ date, price });
                if (state.priceHistory[key].length > 12) state.priceHistory[key].shift();
            }
        }
        this.stateManager.updateSection('economy', state);
    }

    findProfitableTrades(fromRegion, toRegion) {
        const fromPrices = this.getPricesInRegion(fromRegion);
        const toPrices = this.getPricesInRegion(toRegion);
        const trades = [];
        for (const goodId of Object.keys(this.tradeGoods)) {
            const buyPrice = fromPrices[goodId] || 0;
            const sellPrice = toPrices[goodId] || 0;
            const profit = sellPrice - buyPrice;
            const profitMargin = profit / buyPrice;
            if (profitMargin > 0.1) {
                trades.push({ good: goodId, buyPrice, sellPrice, profit, profitMargin: Math.round(profitMargin * 100) });
            }
        }
        return trades.sort((a, b) => b.profitMargin - a.profitMargin);
    }

    getEconomyForPrompt() {
        const settings = this.stateManager.getSection('economy').settings || {};
        if (!settings.injectEconomyIntoPrompt) return '';
        const state = this.stateManager.getSection('economy');
        const changes = [];
        for (const regionId of Object.keys(state.prices)) {
            for (const [goodId, price] of Object.entries(state.prices[regionId])) {
                const basePrice = this.tradeGoods[goodId]?.basePrice || price;
                const change = (price - basePrice) / basePrice;
                if (Math.abs(change) > 0.2) {
                    const direction = change > 0 ? '↑' : '↓';
                    changes.push(`${goodId} ${direction} ${Math.round(Math.abs(change) * 100)}%`);
                }
            }
        }
        if (changes.length === 0) return '';
        return `[Economy: ${changes.slice(0, 3).join('; ')}]`;
    }
}

export { EconomySystem, TRADE_GOODS, ECONOMIC_REGIONS, PRICE_MODIFIERS };
