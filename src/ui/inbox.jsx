import { createPanel, renderList } from './shared.js';

function createInboxPanel() {
  const panel = createPanel('valdris-inbox', 'Vex Inbox');
  return {
    panel,
    update(messages) {
      renderList(panel, messages.map((msg) => `${msg.text} (${msg.rarity})`));
    }
  };
}

export { createInboxPanel };
