import assert from 'node:assert/strict';
import { sentimentScore, summarize } from '../src/features/npcMemory.js';

const summary = summarize('Thanks for the help at the bridge. The crowd smiled.');
assert.ok(summary.includes('Remembered'), 'Summary should include the memory flair.');

const sentiment = sentimentScore('Thanks for the kind help, no fights today.');
assert.ok(sentiment > 0, 'Sentiment should be positive for positive text.');

console.log('transforms.test.js passed');
