const tradeGoods = ['grain', 'ore', 'weapons', 'luxury items', 'potions'];

const regionProfiles = {
  Highlands: { export: ['ore', 'weapons'], import: ['grain', 'luxury items'] },
  Lowlands: { export: ['grain'], import: ['ore', 'weapons'] },
  Coastal: { export: ['luxury items', 'potions'], import: ['grain', 'ore'] }
};

function basePrices() {
  return {
    grain: 10,
    ore: 18,
    weapons: 30,
    'luxury items': 45,
    potions: 40
  };
}

export function createEconomySystem(state) {
  const economyState = state.economy;

  function init() {
    if (Object.keys(economyState.prices).length === 0) {
      economyState.prices = basePrices();
    }
    if (Object.keys(economyState.regions).length === 0) {
      economyState.regions = structuredClone(regionProfiles);
    }
  }

  function adjustPrices(modifier = 0) {
    tradeGoods.forEach((good) => {
      const base = economyState.prices[good] ?? 10;
      const change = base * (Math.random() * 0.1 - 0.05) + modifier;
      economyState.prices[good] = Math.max(1, Math.round(base + change));
    });
  }

  function applySeasonalModifier(season) {
    if (season === 'winter') {
      economyState.prices.grain += 3;
    }
    if (season === 'summer') {
      economyState.prices.grain = Math.max(1, economyState.prices.grain - 2);
    }
  }

  function applyEventModifier(event) {
    if (!event) {
      return;
    }
    if (event.key === 'plague') {
      economyState.prices.potions += 5;
    }
    if (event.key === 'war_declared') {
      economyState.prices.weapons += 4;
    }
  }

  function getSummary() {
    return tradeGoods
      .map((good) => `${good}: ${economyState.prices[good]}`)
      .join(', ');
  }

  init();

  return {
    tradeGoods,
    regionProfiles,
    init,
    adjustPrices,
    applySeasonalModifier,
    applyEventModifier,
    getSummary
  };
}
