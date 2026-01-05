const WEATHER_TYPES = {
    clear: { name: "Clear", icon: "☀️", visibility: 100, travelMod: 1.0, combatMod: 1.0, moodMod: 5 },
    partly_cloudy: { name: "Partly Cloudy", icon: "⛅", visibility: 90, travelMod: 1.0, combatMod: 1.0, moodMod: 0 },
    cloudy: { name: "Cloudy", icon: "☁️", visibility: 80, travelMod: 1.0, combatMod: 1.0, moodMod: -5 },
    overcast: { name: "Overcast", icon: "🌥️", visibility: 70, travelMod: 0.95, combatMod: 0.95, moodMod: -10 },
    light_rain: { name: "Light Rain", icon: "🌦️", visibility: 60, travelMod: 0.9, combatMod: 0.9, moodMod: -10 },
    rain: { name: "Rain", icon: "🌧️", visibility: 40, travelMod: 0.7, combatMod: 0.8, moodMod: -15 },
    heavy_rain: { name: "Heavy Rain", icon: "⛈️", visibility: 20, travelMod: 0.5, combatMod: 0.6, moodMod: -25 },
    thunderstorm: { name: "Thunderstorm", icon: "🌩️", visibility: 15, travelMod: 0.3, combatMod: 0.5, moodMod: -30, dangerous: true },
    light_snow: { name: "Light Snow", icon: "🌨️", visibility: 50, travelMod: 0.8, combatMod: 0.85, moodMod: -10, temperature: -10 },
    snow: { name: "Snow", icon: "❄️", visibility: 30, travelMod: 0.5, combatMod: 0.7, moodMod: -20, temperature: -15 },
    blizzard: { name: "Blizzard", icon: "🌬️", visibility: 5, travelMod: 0.1, combatMod: 0.3, moodMod: -40, dangerous: true, temperature: -25 },
    fog: { name: "Fog", icon: "🌫️", visibility: 10, travelMod: 0.6, combatMod: 0.7, moodMod: -15 },
    hail: { name: "Hail", icon: "🧊", visibility: 30, travelMod: 0.4, combatMod: 0.5, moodMod: -25, dangerous: true },
    sandstorm: { name: "Sandstorm", icon: "🏜️", visibility: 5, travelMod: 0.2, combatMod: 0.4, moodMod: -35, dangerous: true, terrain: ["desert"] },
    hurricane: { name: "Hurricane", icon: "🌀", visibility: 5, travelMod: 0.0, combatMod: 0.2, moodMod: -50, dangerous: true, extreme: true }
};

const SEASON_WEATHER = {
    spring: { clear: 25, partly_cloudy: 25, cloudy: 15, light_rain: 20, rain: 10, thunderstorm: 5 },
    summer: { clear: 40, partly_cloudy: 25, cloudy: 10, light_rain: 10, rain: 5, thunderstorm: 10 },
    autumn: { clear: 20, partly_cloudy: 20, cloudy: 25, light_rain: 15, rain: 15, fog: 5 },
    winter: { clear: 15, partly_cloudy: 15, cloudy: 20, overcast: 15, light_snow: 15, snow: 15, blizzard: 5 }
};

const CLIMATE_TYPES = {
    temperate: { name: "Temperate", tempRange: { summer: [15, 30], winter: [-5, 10] }, precipMod: 1.0 },
    tropical: { name: "Tropical", tempRange: { summer: [25, 40], winter: [20, 30] }, precipMod: 1.5, noSnow: true },
    arctic: { name: "Arctic", tempRange: { summer: [-5, 10], winter: [-40, -10] }, precipMod: 0.5, alwaysSnow: true },
    desert: { name: "Desert", tempRange: { summer: [30, 50], winter: [5, 20] }, precipMod: 0.1, sandstorms: true },
    mountain: { name: "Mountain", tempRange: { summer: [5, 20], winter: [-20, 0] }, precipMod: 1.2 },
    coastal: { name: "Coastal", tempRange: { summer: [18, 28], winter: [5, 15] }, precipMod: 1.3, foggy: true }
};

class WeatherSystem {
    constructor(stateManager, timeSystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.weatherTypes = WEATHER_TYPES;
        this.seasonWeather = SEASON_WEATHER;
        this.climateTypes = CLIMATE_TYPES;

        this.timeSystem.onDayChanged(() => this.updateWeather());
        this.timeSystem.onHourChanged(() => this.checkWeatherChange());
    }

    initialize() {
        const state = this.stateManager.getSection('weather');
        if (!state.current) {
            state.current = { type: 'clear', temperature: 20, wind: 5, humidity: 50 };
            state.forecast = [];
            state.climate = 'temperate';
            state.regions = {};
            this.stateManager.updateSection('weather', state);
            this.generateForecast();
        }
    }

    getCurrentWeather(regionId = null) {
        const state = this.stateManager.getSection('weather');
        if (regionId && state.regions[regionId]) return state.regions[regionId];
        return state.current;
    }

    getWeatherType(typeId) { return this.weatherTypes[typeId]; }

    updateWeather() {
        const state = this.stateManager.getSection('weather');
        const season = this.timeSystem.getSeason();
        if (state.forecast.length > 0) { state.current = state.forecast.shift(); }
        else { state.current = this.generateWeatherForDay(season, state.climate); }
        state.forecast.push(this.generateWeatherForDay(season, state.climate));
        this.stateManager.updateSection('weather', state);
        this.updateRegionalWeather();
    }

    generateWeatherForDay(season, climate) {
        const weights = this.seasonWeather[season] || this.seasonWeather.summer;
        const climateData = this.climateTypes[climate] || this.climateTypes.temperate;
        const weatherType = this.weightedRandom(weights);
        const weatherData = this.weatherTypes[weatherType];
        const tempRange = climateData.tempRange[season] || climateData.tempRange.summer;
        const baseTemp = tempRange[0] + Math.random() * (tempRange[1] - tempRange[0]);
        return {
            type: weatherType,
            temperature: Math.round(baseTemp + (weatherData.temperature || 0)),
            wind: Math.floor(Math.random() * 30) + (weatherData.dangerous ? 20 : 0),
            humidity: Math.floor(Math.random() * 60) + (weatherType.includes('rain') ? 30 : 10)
        };
    }

    weightedRandom(weights) {
        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * total;
        for (const [key, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) return key;
        }
        return Object.keys(weights)[0];
    }

    generateForecast() {
        const state = this.stateManager.getSection('weather');
        const season = this.timeSystem.getSeason();
        state.forecast = [];
        for (let i = 0; i < 7; i++) { state.forecast.push(this.generateWeatherForDay(season, state.climate)); }
        this.stateManager.updateSection('weather', state);
    }

    checkWeatherChange() {
        if (Math.random() < 0.1) this.shiftWeather();
    }

    shiftWeather() {
        const state = this.stateManager.getSection('weather');
        const current = state.current.type;
        const transitions = {
            clear: ['clear', 'partly_cloudy'],
            partly_cloudy: ['clear', 'partly_cloudy', 'cloudy'],
            cloudy: ['partly_cloudy', 'cloudy', 'overcast', 'light_rain'],
            overcast: ['cloudy', 'overcast', 'light_rain', 'rain'],
            light_rain: ['cloudy', 'light_rain', 'rain'],
            rain: ['light_rain', 'rain', 'heavy_rain', 'thunderstorm'],
            heavy_rain: ['rain', 'heavy_rain', 'thunderstorm'],
            thunderstorm: ['heavy_rain', 'thunderstorm', 'rain'],
            light_snow: ['cloudy', 'light_snow', 'snow'],
            snow: ['light_snow', 'snow', 'blizzard'],
            blizzard: ['snow', 'blizzard'],
            fog: ['fog', 'cloudy', 'clear']
        };
        const options = transitions[current] || ['clear', 'partly_cloudy'];
        const newType = options[Math.floor(Math.random() * options.length)];
        if (newType !== current) {
            state.current.type = newType;
            state.current.temperature += (this.weatherTypes[newType].temperature || 0);
            this.stateManager.updateSection('weather', state);
        }
    }

    updateRegionalWeather() {
        const state = this.stateManager.getSection('weather');
        const baseWeather = state.current;
        const regions = ['valdric_heartland', 'dwarven_mountains', 'sylvan_forests', 'orcish_wastes'];
        const climates = ['temperate', 'mountain', 'temperate', 'desert'];
        regions.forEach((region, i) => {
            state.regions[region] = this.generateRegionalVariation(baseWeather, climates[i]);
        });
        this.stateManager.updateSection('weather', state);
    }

    generateRegionalVariation(baseWeather, climate) {
        const climateData = this.climateTypes[climate];
        let type = baseWeather.type;
        let tempMod = 0;
        if (climateData.alwaysSnow && !type.includes('snow') && !type.includes('blizzard')) {
            type = Math.random() < 0.5 ? 'light_snow' : 'snow';
        }
        if (climateData.noSnow && (type.includes('snow') || type === 'blizzard')) type = 'rain';
        if (climate === 'mountain') tempMod = -10;
        if (climate === 'desert') tempMod = 10;
        return {
            type,
            temperature: baseWeather.temperature + tempMod + Math.floor(Math.random() * 6) - 3,
            wind: baseWeather.wind + Math.floor(Math.random() * 10) - 5,
            humidity: baseWeather.humidity + Math.floor(Math.random() * 20) - 10
        };
    }

    getWeatherForPrompt() {
        const settings = this.stateManager.getSection('weather').settings || {};
        if (!settings.injectWeatherIntoPrompt) return '';
        const weather = this.getCurrentWeather();
        const weatherData = this.weatherTypes[weather.type];
        return `[Weather: ${weatherData.icon} ${weatherData.name}, ${weather.temperature}°C]`;
    }

    getWeatherEffects() {
        const weather = this.getCurrentWeather();
        const data = this.weatherTypes[weather.type];
        return { visibility: data.visibility, travelMod: data.travelMod, combatMod: data.combatMod, moodMod: data.moodMod, dangerous: data.dangerous || false };
    }
}

export { WeatherSystem, WEATHER_TYPES, SEASON_WEATHER, CLIMATE_TYPES };
