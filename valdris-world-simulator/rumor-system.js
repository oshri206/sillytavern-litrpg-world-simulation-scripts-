const NEWS_TYPES = {
    official: { name: "Official", accuracy: 100, spreadSpeed: "fast", expiration: 30 },
    major: { name: "Major News", accuracy: 90, spreadSpeed: "medium", expiration: 60 },
    local: { name: "Local News", accuracy: 95, spreadSpeed: "slow", expiration: 14 },
    rumor: { name: "Rumor", accuracy: 60, spreadSpeed: "fast", expiration: 21, canMutate: true },
    gossip: { name: "Gossip", accuracy: 50, spreadSpeed: "fast", expiration: 14, canMutate: true },
    secret: { name: "Secret", accuracy: 80, spreadSpeed: "very_slow", expiration: 90, restricted: true },
    propaganda: { name: "Propaganda", accuracy: 30, spreadSpeed: "fast", expiration: 30 }
};

const RUMOR_MUTATIONS = {
    exaggerate: { probability: 0.3, transform: (text) => text.replace(/some/g, 'many').replace(/few/g, 'several') },
    minimize: { probability: 0.1, transform: (text) => text.replace(/many/g, 'some').replace(/several/g, 'few') },
    vague: { probability: 0.2, transform: (text) => text.replace(/\d+/g, 'several') },
    misattribute: { probability: 0.15 },
    fabricate: { probability: 0.05 }
};

class RumorSystem {
    constructor(stateManager, timeSystem, eventSystem) {
        this.stateManager = stateManager;
        this.timeSystem = timeSystem;
        this.eventSystem = eventSystem;
        this.newsTypes = NEWS_TYPES;

        this.timeSystem.onDayChanged(() => this.dailyUpdate());
        this.eventSystem.onEventStarted((event) => this.generateNewsFromEvent(event));
    }

    initialize() {
        const state = this.stateManager.getSection('rumors');
        if (!state.news) {
            state.news = [];
            state.playerKnowledge = [];
            state.spread = {};
            this.stateManager.updateSection('rumors', state);
        }
    }

    addNews(newsItem) {
        const state = this.stateManager.getSection('rumors');
        state.news.push({
            id: this.generateUUID(),
            ...newsItem,
            originalText: newsItem.text,
            currentText: newsItem.text,
            originalAccuracy: this.newsTypes[newsItem.type]?.accuracy || 100,
            currentAccuracy: this.newsTypes[newsItem.type]?.accuracy || 100,
            mutationCount: 0,
            createdAt: Date.now(),
            gameDate: this.timeSystem.getCurrentDateString(),
            currentSpread: [newsItem.originLocation],
            playerHasHeard: false
        });
        this.stateManager.updateSection('rumors', state);
    }

    generateNewsFromEvent(event) {
        const newsType = event.severity === 'critical' ? 'major' : event.severity === 'major' ? 'major' : 'local';
        this.addNews({
            text: event.description,
            type: newsType,
            category: event.type,
            importance: event.severity,
            sourceEvent: event.id,
            originLocation: event.context?.region || event.context?.location,
            originFaction: event.context?.faction
        });
    }

    dailyUpdate() {
        this.simulateSpread();
        this.expireOldNews();
    }

    simulateSpread() {
        const state = this.stateManager.getSection('rumors');
        for (const news of state.news) {
            const newsType = this.newsTypes[news.type];
            if (!newsType) continue;
            for (const location of news.currentSpread) {
                const neighbors = this.getNeighborLocations(location);
                for (const neighbor of neighbors) {
                    if (!news.currentSpread.includes(neighbor)) {
                        const spreadChance = this.getSpreadChance(newsType.spreadSpeed);
                        if (Math.random() < spreadChance) {
                            news.currentSpread.push(neighbor);
                            if (newsType.canMutate && Math.random() < 0.2) this.mutateNews(news);
                        }
                    }
                }
            }
        }
        this.stateManager.updateSection('rumors', state);
    }

    getNeighborLocations(location) {
        const neighbors = {
            'valdris_prime': ['northern_marches', 'eastern_provinces', 'merchant_coast'],
            'khaz_morath': ['dwarven_mountains', 'valdric_heartland'],
            'aelindra': ['sylvan_forests', 'valdric_heartland'],
            'grakhan': ['orcish_wastes', 'northern_marches']
        };
        return neighbors[location] || [];
    }

    getSpreadChance(speed) {
        const chances = { very_fast: 0.9, fast: 0.6, medium: 0.3, slow: 0.15, very_slow: 0.05 };
        return chances[speed] || 0.3;
    }

    mutateNews(news) {
        const mutations = Object.entries(RUMOR_MUTATIONS);
        for (const [type, mutation] of mutations) {
            if (Math.random() < mutation.probability) {
                if (mutation.transform) news.currentText = mutation.transform(news.currentText);
                news.mutationCount++;
                news.currentAccuracy = Math.max(10, news.currentAccuracy - 10);
                break;
            }
        }
    }

    expireOldNews() {
        const state = this.stateManager.getSection('rumors');
        const now = Date.now();
        state.news = state.news.filter(news => {
            const newsType = this.newsTypes[news.type];
            const expirationDays = newsType?.expiration || 30;
            const daysPassed = (now - news.createdAt) / (24 * 60 * 60 * 1000);
            return daysPassed < expirationDays;
        });
        this.stateManager.updateSection('rumors', state);
    }

    playerHearsNews(newsId) {
        const state = this.stateManager.getSection('rumors');
        const news = state.news.find(n => n.id === newsId);
        if (news && !news.playerHasHeard) {
            news.playerHasHeard = true;
            news.playerHeardAt = Date.now();
            state.playerKnowledge.push(newsId);
            this.stateManager.updateSection('rumors', state);
        }
    }

    getNewsAtLocation(locationId) {
        return this.stateManager.getSection('rumors').news.filter(n => n.currentSpread.includes(locationId));
    }

    getUnheardNews() {
        return this.stateManager.getSection('rumors').news.filter(n => !n.playerHasHeard);
    }

    generateTavernRumors(locationId, count = 3) {
        const localNews = this.getNewsAtLocation(locationId);
        const rumors = localNews.filter(n => ['rumor', 'gossip', 'local'].includes(n.type));
        return rumors.sort(() => Math.random() - 0.5).slice(0, count);
    }

    createRumor(text, type = 'rumor', location = null) {
        this.addNews({ text, type, category: 'custom', importance: 'minor', originLocation: location });
    }

    getNewsForPrompt() {
        const settings = this.stateManager.getSection('rumors').settings || {};
        if (!settings.injectNewsIntoPrompt) return '';
        const recent = this.stateManager.getSection('rumors').news
            .filter(n => n.importance === 'critical' || n.importance === 'major')
            .slice(0, 3);
        if (recent.length === 0) return '';
        return `[News: ${recent.map(n => n.currentText.substring(0, 50)).join('; ')}]`;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}

export { RumorSystem, NEWS_TYPES, RUMOR_MUTATIONS };
