import { createPanel, renderList } from './shared.js';

function createJournalPanel() {
  const panel = createPanel('valdris-journal', 'Personal Journal');
  return {
    panel,
    update(entries) {
      renderList(panel, entries.map((entry) => `Day ${entry.day}: ${entry.summary}`));
    }
  };
}

export { createJournalPanel };
