import { createPanel, renderList } from './shared.js';

function createTitleboardPanel() {
  const panel = createPanel('valdris-titleboard', 'Titleboard');
  return {
    panel,
    update(titles, reputation = 0) {
      const rows = [
        `Reputation: ${reputation}`,
        ...titles.map((title) => `${title.name} (Day ${title.earnedOn})`)
      ];
      renderList(panel, rows);
    }
  };
}

export { createTitleboardPanel };
