import assert from 'node:assert/strict';
import * as ambientScheduler from '../src/schedulers/ambient.js';

ambientScheduler.start({ intervalMs: 5 });
ambientScheduler.stop();

assert.ok(true, 'Schedulers start and stop without throwing.');
console.log('scheduler.test.js passed');
