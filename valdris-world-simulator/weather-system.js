const weatherTypes = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'blizzard', 'fog'];

const seasonWeights = {
  winter: { clear: 2, cloudy: 3, rain: 1, storm: 1, snow: 4, blizzard: 2, fog: 1 },
  spring: { clear: 3, cloudy: 3, rain: 4, storm: 2, snow: 1, blizzard: 0, fog: 2 },
  summer: { clear: 5, cloudy: 2, rain: 2, storm: 1, snow: 0, blizzard: 0, fog: 1 },
  autumn: { clear: 2, cloudy: 4, rain: 3, storm: 2, snow: 1, blizzard: 0, fog: 3 }
};

const climateModifiers = {
  temperate: { snow: -1, blizzard: -1, rain: 1 },
  tropical: { clear: 1, rain: 2, storm: 2, snow: -5, blizzard: -5 },
  arctic: { snow: 3, blizzard: 3, clear: -1 },
  desert: { clear: 3, rain: -2, storm: 0, fog: -1 },
  mountain: { storm: 1, snow: 2, blizzard: 1 },
  coastal: { fog: 2, storm: 1, rain: 1 }
};

const weatherEffects = {
  clear: { visibility: 1, travelSpeed: 1, combatMod: 0 },
  cloudy: { visibility: 0.9, travelSpeed: 0.95, combatMod: 0 },
  rain: { visibility: 0.7, travelSpeed: 0.8, combatMod: -1 },
  storm: { visibility: 0.5, travelSpeed: 0.6, combatMod: -2 },
  snow: { visibility: 0.6, travelSpeed: 0.7, combatMod: -1 },
  blizzard: { visibility: 0.3, travelSpeed: 0.4, combatMod: -3 },
  fog: { visibility: 0.4, travelSpeed: 0.9, combatMod: -1 }
};

function weightedPick(weights) {
  const entries = Object.entries(weights).filter(([, value]) => value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let roll = Math.random() * total;
  for (const [key, value] of entries) {
    roll -= value;
    if (roll <= 0) {
      return key;
    }
  }
  return entries[0]?.[0] || 'clear';
}

export function createWeatherSystem(state, timeSystem) {
  const weatherState = state.weather;

  function generateWeather() {
    const season = timeSystem.getSeason();
    const base = { ...seasonWeights[season] };
    const climate = climateModifiers[state.time.climateZone] || {};
    Object.keys(climate).forEach((key) => {
      base[key] = Math.max(0, (base[key] || 0) + climate[key]);
    });
    const selected = weightedPick(base);
    const effects = weatherEffects[selected];
    weatherState.current = selected;
    weatherState.visibility = effects.visibility;
    weatherState.travelSpeed = effects.travelSpeed;
    weatherState.combatMod = effects.combatMod;
    return selected;
  }

  function getSummary() {
    return `${weatherState.current} (vis ${weatherState.visibility.toFixed(2)}, travel x${weatherState.travelSpeed.toFixed(2)}, combat ${weatherState.combatMod})`;
  }

  return {
    weatherTypes,
    generateWeather,
    getSummary,
    getEffects: () => ({ ...weatherState })
  };
}
