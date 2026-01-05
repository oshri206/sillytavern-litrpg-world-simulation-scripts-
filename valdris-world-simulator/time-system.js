const CALENDAR_CONFIG = {
    monthsPerYear: 12,
    daysPerMonth: 30,
    daysPerWeek: 7,
    hoursPerDay: 24,
    minutesPerHour: 60,

    months: [
        { name: "Frostmoon", season: "winter", index: 0 },
        { name: "Snowveil", season: "winter", index: 1 },
        { name: "Thawbreak", season: "spring", index: 2 },
        { name: "Rainbloom", season: "spring", index: 3 },
        { name: "Greenleaf", season: "spring", index: 4 },
        { name: "Sunsheight", season: "summer", index: 5 },
        { name: "Highsun", season: "summer", index: 6 },
        { name: "Goldenharvest", season: "summer", index: 7 },
        { name: "Amberfall", season: "autumn", index: 8 },
        { name: "Redleaf", season: "autumn", index: 9 },
        { name: "Mistwalker", season: "autumn", index: 10 },
        { name: "Darknight", season: "winter", index: 11 }
    ],

    weekdays: ["Moonday", "Tideday", "Windday", "Earthday", "Fireday", "Lightday", "Starday"],

    timeOfDay: {
        dawn: { start: 5, end: 7, name: "Dawn" },
        morning: { start: 7, end: 12, name: "Morning" },
        afternoon: { start: 12, end: 17, name: "Afternoon" },
        evening: { start: 17, end: 20, name: "Evening" },
        night: { start: 20, end: 24, name: "Night" },
        lateNight: { start: 0, end: 5, name: "Late Night" }
    },

    startingDate: { year: 1247, month: 5, day: 15, hour: 10, minute: 0 }
};

const FESTIVALS = {
    new_year: { month: 0, day: 1, name: "New Year's Dawn", duration: 3, effects: { happiness: 10, trade: 20 } },
    spring_equinox: { month: 2, day: 15, name: "Verdant Festival", duration: 2, effects: { fertility: 20 } },
    midsummer: { month: 6, day: 15, name: "Midsummer Blaze", duration: 5, effects: { happiness: 15, magic: 10 } },
    harvest_festival: { month: 8, day: 20, name: "Harvest Bounty", duration: 4, effects: { food: 30, trade: 15 } },
    autumn_equinox: { month: 9, day: 15, name: "Ancestor's Night", duration: 2, effects: { undead: 20, magic: 15 } },
    winter_solstice: { month: 11, day: 21, name: "Long Night", duration: 3, effects: { cold: 20, happiness: -10 } },
    founders_day: { month: 4, day: 10, name: "Founders Day", duration: 1, faction: "valdric_empire", effects: { loyalty: 10 } }
};

class TimeSystem {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.config = CALENDAR_CONFIG;
        this.festivals = FESTIVALS;
        this.callbacks = { dayChanged: [], weekChanged: [], monthChanged: [], yearChanged: [], hourChanged: [] };
    }

    initialize() {
        const state = this.stateManager.getSection('time');
        if (!state.currentDate) {
            state.currentDate = { ...this.config.startingDate };
            state.totalDaysPassed = 0;
            state.activeFestivals = [];
            this.stateManager.updateSection('time', state);
        }
    }

    getCurrentDate() { return this.stateManager.getSection('time').currentDate; }

    getCurrentDateString() {
        const d = this.getCurrentDate();
        const month = this.config.months[d.month];
        const weekday = this.getWeekday();
        return `${weekday}, ${d.day} ${month.name}, Year ${d.year}`;
    }

    getCurrentTimeString() {
        const d = this.getCurrentDate();
        return `${d.hour.toString().padStart(2, '0')}:${d.minute.toString().padStart(2, '0')}`;
    }

    getWeekday() {
        const state = this.stateManager.getSection('time');
        return this.config.weekdays[state.totalDaysPassed % 7];
    }

    getSeason() {
        return this.config.months[this.getCurrentDate().month].season;
    }

    getTimeOfDay() {
        const hour = this.getCurrentDate().hour;
        for (const [key, time] of Object.entries(this.config.timeOfDay)) {
            if (hour >= time.start && hour < time.end) return key;
            if (time.start > time.end && (hour >= time.start || hour < time.end)) return key;
        }
        return 'night';
    }

    advanceTime(minutes) {
        const state = this.stateManager.getSection('time');
        const d = state.currentDate;

        d.minute += minutes;
        while (d.minute >= 60) { d.minute -= 60; d.hour++; this.triggerCallbacks('hourChanged'); }
        while (d.hour >= 24) { d.hour -= 24; d.day++; state.totalDaysPassed++; this.triggerCallbacks('dayChanged'); this.checkFestivals(); }
        while (d.day > this.config.daysPerMonth) { d.day -= this.config.daysPerMonth; d.month++; this.triggerCallbacks('monthChanged'); }
        while (d.month >= this.config.monthsPerYear) { d.month -= this.config.monthsPerYear; d.year++; this.triggerCallbacks('yearChanged'); }

        this.stateManager.updateSection('time', state);
        return d;
    }

    advanceHours(hours) { return this.advanceTime(hours * 60); }
    advanceDays(days) { return this.advanceTime(days * 24 * 60); }

    checkFestivals() {
        const d = this.getCurrentDate();
        const state = this.stateManager.getSection('time');
        state.activeFestivals = [];
        for (const [id, fest] of Object.entries(this.festivals)) {
            if (d.month === fest.month && d.day >= fest.day && d.day < fest.day + fest.duration) {
                state.activeFestivals.push({ id, ...fest });
            }
        }
        this.stateManager.updateSection('time', state);
    }

    getActiveFestivals() { return this.stateManager.getSection('time').activeFestivals || []; }

    onDayChanged(callback) { this.callbacks.dayChanged.push(callback); }
    onWeekChanged(callback) { this.callbacks.weekChanged.push(callback); }
    onMonthChanged(callback) { this.callbacks.monthChanged.push(callback); }
    onYearChanged(callback) { this.callbacks.yearChanged.push(callback); }
    onHourChanged(callback) { this.callbacks.hourChanged.push(callback); }

    triggerCallbacks(event) {
        for (const cb of this.callbacks[event] || []) {
            try { cb(this.getCurrentDate()); } catch (e) { console.error(e); }
        }
    }

    getTimeForPrompt() {
        const settings = this.stateManager.getSection('time').settings || {};
        if (!settings.injectTimeIntoPrompt) return '';
        const parts = [`[${this.getCurrentDateString()}, ${this.getCurrentTimeString()}]`];
        parts.push(`[${this.getTimeOfDay()}, ${this.getSeason()}]`);
        const festivals = this.getActiveFestivals();
        if (festivals.length > 0) parts.push(`[Festival: ${festivals.map(f => f.name).join(', ')}]`);
        return parts.join(' ');
    }
}

export { TimeSystem, CALENDAR_CONFIG, FESTIVALS };
