import assert from 'node:assert/strict';
import { init, scheduleAmbient } from '../src/features/vex.js';

function createBus() {
  const listeners = new Map();
  return {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
    },
    emit(event, payload) {
      const handlers = listeners.get(event);
      if (!handlers) return;
      handlers.forEach((handler) => handler(payload));
    }
  };
}

function createDb() {
  const store = new Map();
  return {
    async get(key) {
      return store.get(key);
    },
    async set(key, value) {
      store.set(key, value);
    },
    async push(key, value) {
      const current = store.get(key) ?? [];
      store.set(key, [...current, value]);
    }
  };
}

const bus = createBus();
const db = createDb();
let emitted = 0;

bus.on('ui:systemMessage', () => {
  emitted += 1;
});

await db.set('playerName', 'Testy');
await init(bus, db, { playerName: 'Testy', location: 'Market' });

await scheduleAmbient(10, { simulatedSeconds: 60, rarity: 'common' });

assert.ok(emitted >= 3, `Expected at least 3 messages, got ${emitted}`);
console.log('vex.test.js passed');
